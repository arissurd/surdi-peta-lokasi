import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import xlsx from "node-xlsx";

export const runtime = "nodejs";

/**
 * POST /api/locations/import
 * Admin-only. Multipart form with:
 *   - file: the .xlsx file (single sheet, header row required)
 *   - mode (optional): "append" | "replace" — default "append".
 *       append: skip rows whose lokasi+jalanMasuk already exist (no dedupe — just inserts all).
 *       replace: DELETE all existing Location rows first, then insert.
 *
 * The xlsx must have a header row with at least these columns
 * (case-insensitive, underscores or spaces allowed):
 *   provenance, jalan_masuk, periode, lokasi, jenis, media,
 *   nomor_jumlah, bagian, p_akuisisi, p_pengolahan, p_digitalisasi,
 *   p_restorasi, no_inventaris
 *
 * Returns: { ok, imported, skipped, errors: [{row, msg}] }
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Akses admin diperlukan untuk import" },
      { status: 403 }
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Request harus multipart/form-data" },
      { status: 400 }
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Field 'file' wajib diisi dengan file .xlsx" },
      { status: 400 }
    );
  }
  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    return NextResponse.json(
      { error: "File harus berekstensi .xlsx" },
      { status: 400 }
    );
  }
  if (file.size > 50 * 1024 * 1024) {
    return NextResponse.json(
      { error: "Ukuran file melebihi batas 50 MB" },
      { status: 413 }
    );
  }

  const mode = (formData.get("mode") as string | null) === "replace" ? "replace" : "append";

  // Parse the xlsx
  let sheets: any[];
  try {
    const buf = Buffer.from(await file.arrayBuffer());
    sheets = xlsx.parse(buf);
  } catch (e: any) {
    return NextResponse.json(
      { error: "Gagal membaca file xlsx: " + (e?.message || "unknown error") },
      { status: 400 }
    );
  }
  if (!sheets.length || !sheets[0].data || sheets[0].data.length < 2) {
    return NextResponse.json(
      { error: "Sheet kosong atau tidak memiliki data" },
      { status: 400 }
    );
  }

  const sheet = sheets[0];
  const headerRow: any[] = sheet.data[0] || [];
  // Build column-index map by normalized header name
  const norm = (s: any) =>
    String(s || "")
      .toLowerCase()
      .replace(/[\s-]+/g, "_")
      .trim();
  const colMap: Record<string, number> = {};
  headerRow.forEach((h, i) => {
    colMap[norm(h)] = i;
  });

  const required = [
    "provenance", "jalan_masuk", "periode", "lokasi", "jenis", "media",
    "nomor_jumlah", "bagian", "p_akuisisi", "p_pengolahan",
    "p_digitalisasi", "p_restorasi", "no_inventaris",
  ];
  const missing = required.filter((k) => !(k in colMap));
  if (missing.length > 0) {
    return NextResponse.json(
      {
        error: `Kolom berikut tidak ditemukan di header: ${missing.join(", ")}`,
        detectedColumns: Object.keys(colMap),
      },
      { status: 400 }
    );
  }

  // Convert each data row to a Prisma-shaped object
  const cellToStr = (v: any): string | null => {
    if (v === null || v === undefined) return null;
    const s = String(v).trim();
    if (s === "" || s.toLowerCase() === "none" || s.toLowerCase() === "null") return null;
    return s;
  };

  const toInsert: any[] = [];
  const errors: { row: number; msg: string }[] = [];
  let skipped = 0;

  for (let i = 1; i < sheet.data.length; i++) {
    const row: any[] = sheet.data[i];
    if (!row || row.every((c) => c === null || c === undefined || c === "")) {
      skipped++;
      continue;
    }
    try {
      const rec: any = {
        provenance: cellToStr(row[colMap["provenance"]]),
        jalanMasuk: cellToStr(row[colMap["jalan_masuk"]]),
        periode: cellToStr(row[colMap["periode"]]),
        lokasi: cellToStr(row[colMap["lokasi"]]),
        jenis: cellToStr(row[colMap["jenis"]]),
        media: cellToStr(row[colMap["media"]]),
        nomorJumlah: cellToStr(row[colMap["nomor_jumlah"]]),
        bagian: cellToStr(row[colMap["bagian"]]),
        pAkuisisi: cellToStr(row[colMap["p_akuisisi"]]),
        pPengolahan: cellToStr(row[colMap["p_pengolahan"]]),
        pDigitalisasi: cellToStr(row[colMap["p_digitalisasi"]]),
        pRestorasi: cellToStr(row[colMap["p_restorasi"]]),
        noInventaris: cellToStr(row[colMap["no_inventaris"]]),
      };
      // Skip rows where all fields are null
      if (Object.values(rec).every((v) => v === null)) {
        skipped++;
        continue;
      }
      toInsert.push(rec);
    } catch (e: any) {
      errors.push({ row: i + 1, msg: e?.message || "parse error" });
    }
  }

  if (toInsert.length === 0) {
    return NextResponse.json({
      ok: false,
      error: "Tidak ada baris valid untuk diimport",
      imported: 0,
      skipped,
      errors,
    }, { status: 400 });
  }

  // Replace mode: clear the table first
  if (mode === "replace") {
    await db.location.deleteMany({});
  }

  // Bulk insert in batches of 1000
  const BATCH = 1000;
  let imported = 0;
  for (let i = 0; i < toInsert.length; i += BATCH) {
    const slice = toInsert.slice(i, i + BATCH);
    try {
      await db.location.createMany({ data: slice });
      imported += slice.length;
    } catch (e: any) {
      errors.push({
        row: i + 2,
        msg: `Batch insert failed: ${e?.message || "unknown"}`,
      });
    }
  }

  return NextResponse.json({
    ok: true,
    mode,
    imported,
    skipped,
    errors: errors.slice(0, 50), // cap errors in response
    totalErrors: errors.length,
  });
}
