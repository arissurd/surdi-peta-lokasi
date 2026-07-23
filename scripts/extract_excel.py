"""
Extract tb_lokasi sheet from db_surdi.xlsx into a compact JSON file
that the Prisma seed script can consume.

Output: /home/z/my-project/scripts/lokasi.json
Schema per row:
  provenance, jalanMasuk, periode, lokasi, jenis, media,
  nomorJumlah, bagian, pAkuisisi, pPengolahan, pDigitalisasi,
  pRestorasi, noInventaris
"""
import json
import os
import sys
from pathlib import Path

import openpyxl

XLSX = "/home/z/my-project/upload/db_surdi.xlsx"
OUT = "/home/z/my-project/scripts/lokasi.json"

HEADERS = [
    "id",
    "provenance",
    "jalanMasuk",
    "periode",
    "lokasi",
    "jenis",
    "media",
    "nomorJumlah",
    "bagian",
    "pAkuisisi",
    "pPengolahan",
    "pDigitalisasi",
    "pRestorasi",
    "noInventaris",
]


def cell_to_str(v):
    if v is None:
        return None
    s = str(v).strip()
    if s == "" or s.lower() == "none":
        return None
    return s


def main():
    if not os.path.exists(XLSX):
        print(f"[ERROR] Excel not found: {XLSX}", file=sys.stderr)
        sys.exit(1)

    print(f"[INFO] Loading workbook: {XLSX}")
    wb = openpyxl.load_workbook(XLSX, read_only=True, data_only=True)
    ws = wb["tb_lokasi"]

    rows = []
    skipped = 0
    header_seen = False

    for idx, row in enumerate(ws.iter_rows(values_only=True)):
        # Skip the header row
        if not header_seen:
            header_seen = True
            # Verify it matches expected headers
            if row and str(row[0]).strip().lower() == "id":
                continue

        # Map row -> dict using HEADERS position
        # If row is shorter than HEADERS, pad with None
        padded = list(row) + [None] * (len(HEADERS) - len(row))
        rec = {}
        for i, key in enumerate(HEADERS):
            if key == "id":
                continue  # skip the original id (let Prisma generate)
            rec[key] = cell_to_str(padded[i])

        # Skip totally empty rows
        if not any(v for v in rec.values()):
            skipped += 1
            continue

        rows.append(rec)

        if (idx + 1) % 5000 == 0:
            print(f"[INFO] ...processed {idx + 1} rows")

    print(f"[INFO] Total rows extracted: {len(rows)} (skipped empty: {skipped})")

    Path(OUT).parent.mkdir(parents=True, exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(rows, f, ensure_ascii=False)

    size_mb = os.path.getsize(OUT) / (1024 * 1024)
    print(f"[INFO] Wrote: {OUT} ({size_mb:.2f} MB)")

    # Sample preview
    print("[INFO] First 3 records:")
    for r in rows[:3]:
        print(" ", json.dumps(r, ensure_ascii=False))


if __name__ == "__main__":
    main()
