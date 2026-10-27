/**
 * Seed script for SURDI Peta Lokasi (MySQL version).
 * Creates default admin+user accounts and imports all archive rows from
 * scripts/lokasi.json (extracted from db_surdi.xlsx).
 *
 * Run:  bun run scripts/seed.ts
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import * as fs from "fs";
import * as path from "path";

const db = new PrismaClient();

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

  const existing = await db.location.count();
  if (existing > 0) {
    console.log(`[SEED] Locations already populated (${existing} rows). Skipping.`);
    return;
  }

  console.log("[SEED] Loading JSON...");
  const rows: Row[] = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
  console.log(`[SEED] Loaded ${rows.length} rows`);

  const prepared = rows.map((r) => ({
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
  }));

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

async function main() {
  console.log("══════════════════════════════════════════════════");
  console.log("  SURDI Peta Lokasi — Database Seed (MySQL)");
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
