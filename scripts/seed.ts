/**
 * Seed script for SURDI Peta Lokasi.
 *
 * 1. Pushes the Prisma schema to SQLite.
 * 2. Creates default ADMIN and USER accounts (idempotent).
 * 3. Bulk-imports all archive rows from scripts/lokasi.json (extracted from
 *    db_surdi.xlsx).
 * 4. Auto-assigns latitude/longitude based on the BPS province mentioned in
 *    `jalanMasuk` so the map view has markers from day one.
 *
 * Run:  bun run scripts/seed.ts
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import * as fs from "fs";
import * as path from "path";

const db = new PrismaClient();

// ─────────────────────────────────────────────────────────────────────────────
// 1) Indonesian provincial capitals — used to geocode BPS office locations.
//    The `jalanMasuk` pattern "BPS Provinsi DI Aceh - Aceh Selatan" lets us
//    extract the province name and resolve it to its capital's coordinates.
// ─────────────────────────────────────────────────────────────────────────────
type ProvCoord = { name: string; lat: number; lng: number };
const PROV_COORDS: ProvCoord[] = [
  { name: "DI ACEH", lat: 5.5483, lng: 95.3238 },
  { name: "SUMATERA UTARA", lat: 3.5952, lng: 98.6722 },
  { name: "SUMATERA BARAT", lat: -0.9471, lng: 100.4172 },
  { name: "RIAU", lat: 0.5134, lng: 101.4478 },
  { name: "JAMBI", lat: -1.6101, lng: 103.6131 },
  { name: "SUMATERA SELATAN", lat: -2.9909, lng: 104.7566 },
  { name: "BENGKULU", lat: -3.8004, lng: 102.2655 },
  { name: "LAMPUNG", lat: -5.4291, lng: 105.2621 },
  { name: "KEPULAUAN BANGKA BELITUNG", lat: -2.5, lng: 106.0 },
  { name: "KEPULAUAN RIAU", lat: 3.9457, lng: 108.1429 },
  { name: "DKI JAKARTA", lat: -6.2088, lng: 106.8456 },
  { name: "JAWA BARAT", lat: -6.9175, lng: 107.6191 },
  { name: "JAWA TENGAH", lat: -6.9667, lng: 110.4167 },
  { name: "DI YOGYAKARTA", lat: -7.7956, lng: 110.3695 },
  { name: "JAWA TIMUR", lat: -7.2575, lng: 112.7521 },
  { name: "BANTEN", lat: -6.4058, lng: 106.0642 },
  { name: "BALI", lat: -8.3405, lng: 115.092 },
  { name: "NUSA TENGGARA BARAT", lat: -8.65, lng: 116.325 },
  { name: "NUSA TENGGARA TIMUR", lat: -10.1822, lng: 123.6097 },
  { name: "KALIMANTAN BARAT", lat: -0.0263, lng: 109.3425 },
  { name: "KALIMANTAN TENGAH", lat: -1.6815, lng: 113.3824 },
  { name: "KALIMANTAN SELATAN", lat: -3.0926, lng: 115.2838 },
  { name: "KALIMANTAN TIMUR", lat: -0.5022, lng: 117.1537 },
  { name: "KALIMANTAN UTARA", lat: 3.0731, lng: 116.7194 },
  { name: "SULAWESI UTARA", lat: 1.4748, lng: 124.8421 },
  { name: "SULAWESI TENGAH", lat: -0.5413, lng: 119.8802 },
  { name: "SULAWESI SELATAN", lat: -3.6687, lng: 119.9738 },
  { name: "SULAWESI TENGGARA", lat: -4.0014, lng: 122.5212 },
  { name: "GORONTALO", lat: 0.5435, lng: 123.0568 },
  { name: "SULAWESI BARAT", lat: -2.6689, lng: 118.9532 },
  { name: "MALUKU", lat: -3.6953, lng: 128.1814 },
  { name: "MALUKU UTARA", lat: 0.7991, lng: 127.4186 },
  { name: "PAPUA BARAT", lat: -0.8694, lng: 134.063 },
  { name: "PAPUA", lat: -4.2699, lng: 138.0804 },
];

// Build a lookup map for fast matching
const PROV_LOOKUP = new Map<string, ProvCoord>();
for (const p of PROV_COORDS) {
  PROV_LOOKUP.set(p.name, p);
  // Also add common short forms
  if (p.name.startsWith("DI ")) PROV_LOOKUP.set(p.name.slice(3), p);
  if (p.name.startsWith("DKI ")) PROV_LOOKUP.set(p.name.slice(4), p);
  if (p.name.startsWith("KEPULAUAN ")) PROV_LOOKUP.set(p.name.slice(10), p);
}

/**
 * Try to extract a province name from a `jalanMasuk` string and return
 * matching coordinates. Returns null if no match.
 *
 * Examples handled:
 *   "BPS Provinsi DI Aceh - Aceh Selatan"  → Aceh capital
 *   "BPS Provinsi Jawa Barat"               → Bandung
 *   "BPS Provinsi D.I. Yogyakarta"          → Yogyakarta
 */
function geocode(jalanMasuk: string | null | undefined): {
  latitude: number;
  longitude: number;
  address: string;
} | null {
  if (!jalanMasuk) return null;
  // Normalize: uppercase, strip dots/extra spaces
  const norm = jalanMasuk
    .toUpperCase()
    .replace(/\./g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Try matching each known province name
  for (const [key, coord] of PROV_LOOKUP) {
    // Match patterns like "PROVINSI DI ACEH", "PROVINSI DIACEH",
    // "PROVINSI ACEH", or just "DI ACEH"
    const variants = [
      `PROVINSI ${key}`,
      `PROV ${key}`,
      `PROV ${key.replace(/\s+/g, "")}`,
      key,
    ];
    for (const v of variants) {
      if (norm.includes(v)) {
        return {
          latitude: coord.lat,
          longitude: coord.lng,
          address: jalanMasuk,
        };
      }
    }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2) Default accounts
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_ADMIN = {
  email: "admin@surdi.go.id",
  password: "admin123",
  name: "Administrator SURDI",
  role: "ADMIN" as const,
};

const DEFAULT_USER = {
  email: "user@surdi.go.id",
  password: "user123",
  name: "Pengguna Umum",
  role: "USER" as const,
};

async function seedUsers() {
  console.log("[SEED] Creating default users...");
  for (const u of [DEFAULT_ADMIN, DEFAULT_USER]) {
    const existing = await db.user.findUnique({ where: { email: u.email } });
    if (existing) {
      console.log(`[SEED]  ✓ ${u.email} already exists`);
      continue;
    }
    const hash = await bcrypt.hash(u.password, 10);
    await db.user.create({
      data: { email: u.email, password: hash, name: u.name, role: u.role },
    });
    console.log(`[SEED]  ✓ Created ${u.email} (${u.role})`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3) Import archive rows from JSON
// ─────────────────────────────────────────────────────────────────────────────
type Row = {
  provenance: string | null;
  jalanMasuk: string | null;
  periode: string | null;
  lokasi: string | null;
  jenis: string | null;
  media: string | null;
  nomorJumlah: string | null;
  bagian: string | null;
  pAkuisisi: string | null;
  pPengolahan: string | null;
  pDigitalisasi: string | null;
  pRestorasi: string | null;
  noInventaris: string | null;
};

async function seedLocations() {
  const jsonPath = path.join(__dirname, "lokasi.json");
  if (!fs.existsSync(jsonPath)) {
    console.warn(`[SEED] !! ${jsonPath} not found — skipping location import.`);
    console.warn("[SEED]    Run `python3 scripts/extract_excel.py` first.");
    return;
  }

  // If locations already exist, skip
  const existing = await db.location.count();
  if (existing > 0) {
    console.log(`[SEED] Locations already populated (${existing} rows). Skipping.`);
    return;
  }

  console.log("[SEED] Loading JSON...");
  const rows: Row[] = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
  console.log(`[SEED] Loaded ${rows.length} rows`);

  // Geocode each row and transform to Prisma shape
  let geoCount = 0;
  const prepared = rows.map((r) => {
    const geo = geocode(r.jalanMasuk);
    if (geo) geoCount++;
    return {
      provenance: r.provenance,
      jalanMasuk: r.jalanMasuk,
      periode: r.periode,
      lokasi: r.lokasi,
      jenis: r.jenis,
      media: r.media,
      nomorJumlah: r.nomorJumlah,
      bagian: r.bagian,
      pAkuisisi: r.pAkuisisi,
      pPengolahan: r.pPengolahan,
      pDigitalisasi: r.pDigitalisasi,
      pRestorasi: r.pRestorasi,
      noInventaris: r.noInventaris,
      latitude: geo?.latitude ?? null,
      longitude: geo?.longitude ?? null,
      address: geo?.address ?? r.jalanMasuk ?? null,
    };
  });

  console.log(`[SEED] Geocoded ${geoCount}/${rows.length} rows`);

  // Batch insert in chunks of 1000
  const BATCH = 1000;
  for (let i = 0; i < prepared.length; i += BATCH) {
    const slice = prepared.slice(i, i + BATCH);
    await db.location.createMany({ data: slice });
    process.stdout.write(
      `\r[SEED] Inserted ${Math.min(i + BATCH, prepared.length)}/${prepared.length}`
    );
  }
  console.log("\n[SEED] Location import complete.");
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log("══════════════════════════════════════════════════");
  console.log("  SURDI Peta Lokasi — Database Seed");
  console.log("══════════════════════════════════════════════════");
  await seedUsers();
  await seedLocations();
  console.log("\n[SEED] Done.");
  console.log("\n[SEED] Default accounts:");
  console.log(`  Admin : ${DEFAULT_ADMIN.email} / ${DEFAULT_ADMIN.password}`);
  console.log(`  User  : ${DEFAULT_USER.email} / ${DEFAULT_USER.password}`);
}

main()
  .catch((e) => {
    console.error("[SEED] Fatal:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
