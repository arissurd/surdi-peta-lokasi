import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import * as fs from "fs";
import * as path from "path";

/**
 * POST /api/denah/upload
 * Admin-only: accepts a multipart upload containing:
 *   - building: form field with the building code (e.g. "F4", "E3")
 *   - file: the SVG file
 *
 * Saves the SVG to /public/denah/denah_<building>.svg (lowercase), replacing
 * any existing file with the same name.
 *
 * Body size cap: 10 MB (SVGs can be large when they embed base64 PNGs).
 */
export const runtime = "nodejs";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED_BUILDINGS = [
  "E3", "E4", "E5", "E6", "E7",
  "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9",
  "G2", "G3", "G4", "G5", "G6", "G7", "G8",
];

export async function POST(req: NextRequest) {
  // Auth check — admin only
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Akses admin diperlukan untuk mengunggah denah" },
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

  const building = (formData.get("building") as string | null)?.trim().toUpperCase();
  if (!building) {
    return NextResponse.json(
      { error: "Field 'building' wajib diisi (mis. G2, F4, E3)" },
      { status: 400 }
    );
  }
  if (!/^[A-Z]\d+$/.test(building)) {
    return NextResponse.json(
      { error: "Kode gedung tidak valid (format: huruf+angka, mis. G2, F4, E3)" },
      { status: 400 }
    );
  }
  if (!ALLOWED_BUILDINGS.includes(building)) {
    return NextResponse.json(
      { error: `Gedung ${building} tidak dikenali. Yang diperbolehkan: ${ALLOWED_BUILDINGS.join(", ")}` },
      { status: 400 }
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Field 'file' wajib diisi dengan file SVG" },
      { status: 400 }
    );
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "File SVG kosong" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `Ukuran file melebihi batas 10 MB (saat ini ${(file.size / 1024 / 1024).toFixed(2)} MB)` },
      { status: 413 }
    );
  }

  // Basic content sanity-check: must look like SVG
  const text = await file.text();
  if (!text.includes("<svg") && !text.includes("<?xml")) {
    return NextResponse.json(
      { error: "File bukan SVG valid (tidak ditemukan tag <svg>)" },
      { status: 400 }
    );
  }
  // Strip XML declaration if present (it can cause issues when injected inline)
  const cleanedSvg = text.replace(/^\s*<\?xml[^>]*\?>\s*/i, "");

  // Save to /public/denah/denah_<building>.svg
  const denahDir = path.join(process.cwd(), "public", "denah");
  try {
    if (!fs.existsSync(denahDir)) {
      fs.mkdirSync(denahDir, { recursive: true });
    }
    const fileName = `denah_${building.toLowerCase()}.svg`;
    const fullPath = path.join(denahDir, fileName);
    fs.writeFileSync(fullPath, cleanedSvg, "utf-8");
    return NextResponse.json({
      ok: true,
      building,
      fileName,
      sizeBytes: cleanedSvg.length,
      message: `Denah ${building} berhasil diunggah`,
    });
  } catch (e: any) {
    console.error("[/api/denah/upload] Write failed:", e);
    return NextResponse.json(
      { error: e?.message || "Gagal menyimpan file denah" },
      { status: 500 }
    );
  }
}
