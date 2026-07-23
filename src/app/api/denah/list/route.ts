import { NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";

/**
 * GET /api/denah/list
 * Returns an alphabetically-sorted list of building codes that currently
 * have a floor plan SVG in /public/denah/. This includes both the shipped
 * defaults and any admin-uploaded files.
 */
export async function GET() {
  const denahDir = path.join(process.cwd(), "public", "denah");
  const buildings: string[] = [];

  try {
    if (fs.existsSync(denahDir)) {
      const files = fs.readdirSync(denahDir);
      for (const f of files) {
        // Match denah_<code>.svg where code is e.g. "g2", "e5", "f4"
        const m = f.match(/^denah_([a-z]\d+)\.svg$/i);
        if (m) buildings.push(m[1].toUpperCase());
      }
    }
  } catch (e) {
    // Fall back to empty list — the client will use DEFAULT_BUILDINGS
    console.error("[/api/denah/list] Failed to read dir:", e);
  }

  buildings.sort();
  return NextResponse.json({ buildings, count: buildings.length });
}
