import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import * as fs from "fs";
import * as path from "path";

/**
 * DELETE /api/denah/<building>
 * Admin-only: removes the floor plan SVG for the given building code.
 * Built-in floor plans (shipped in /public/denah/) cannot be deleted — only
 * admin-uploaded SVGs that match the building code pattern are removable.
 * In practice we allow deletion of any file in /public/denah/, but warn if
 * the file is one of the defaults.
 */
type Ctx = { params: Promise<{ building: string }> };

const DEFAULT_BUILDINGS = ["E5", "F2", "F5", "F6", "G2", "G3", "G4", "G5", "G6", "G7", "G8"];

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Akses admin diperlukan untuk menghapus denah" },
      { status: 403 }
    );
  }

  const { building } = await params;
  const code = building.trim().toUpperCase();
  if (!/^[A-Z]\d+$/.test(code)) {
    return NextResponse.json(
      { error: "Kode gedung tidak valid" },
      { status: 400 }
    );
  }

  const fileName = `denah_${code.toLowerCase()}.svg`;
  const fullPath = path.join(process.cwd(), "public", "denah", fileName);

  if (!fs.existsSync(fullPath)) {
    return NextResponse.json(
      { error: `Denah untuk gedung ${code} tidak ditemukan` },
      { status: 404 }
    );
  }

  try {
    fs.unlinkSync(fullPath);
    return NextResponse.json({
      ok: true,
      building: code,
      fileName,
      isDefault: DEFAULT_BUILDINGS.includes(code),
      message: `Denah ${code} berhasil dihapus`,
    });
  } catch (e: any) {
    console.error("[/api/denah/[building]] Delete failed:", e);
    return NextResponse.json(
      { error: e?.message || "Gagal menghapus file denah" },
      { status: 500 }
    );
  }
}
