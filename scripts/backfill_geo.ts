/**
 * Backfill geocoding for existing Location rows.
 *
 * Reads all rows where latitude/longitude are NULL, parses the BPS province
 * name from `jalanMasuk`, and writes matching coordinates.
 *
 * Run:  bun run scripts/backfill_geo.ts
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

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

const PROV_LOOKUP = new Map<string, ProvCoord>();
for (const p of PROV_COORDS) {
  PROV_LOOKUP.set(p.name, p);
  if (p.name.startsWith("DI ")) PROV_LOOKUP.set(p.name.slice(3), p);
  if (p.name.startsWith("DKI ")) PROV_LOOKUP.set(p.name.slice(4), p);
  if (p.name.startsWith("KEPULAUAN ")) PROV_LOOKUP.set(p.name.slice(10), p);
}

function geocode(jalanMasuk: string | null | undefined) {
  if (!jalanMasuk) return null;
  const norm = jalanMasuk
    .toUpperCase()
    .replace(/\./g, " ")
    .replace(/\s+/g, " ")
    .trim();
  for (const [key, coord] of PROV_LOOKUP) {
    const variants = [
      `PROVINSI ${key}`,
      `PROV ${key}`,
      `PROV ${key.replace(/\s+/g, "")}`,
      key,
    ];
    for (const v of variants) {
      if (norm.includes(v)) {
        return { latitude: coord.lat, longitude: coord.lng, address: jalanMasuk };
      }
    }
  }
  return null;
}

async function main() {
  console.log("[GEO] Fetching unmapped rows...");
  const unmapped = await db.location.findMany({
    where: { OR: [{ latitude: null }, { longitude: null }] },
    select: { id: true, jalanMasuk: true },
  });
  console.log(`[GEO] ${unmapped.length} rows to backfill`);

  // Group by jalanMasuk to reduce work — many rows share the same address
  const byAddr = new Map<string, string[]>();
  for (const r of unmapped) {
    const k = r.jalanMasuk ?? "";
    if (!byAddr.has(k)) byAddr.set(k, []);
    byAddr.get(k)!.push(r.id);
  }
  console.log(`[GEO] ${byAddr.size} unique addresses`);

  let matched = 0;
  let updatedRows = 0;
  let batch = 0;
  for (const [addr, ids] of byAddr) {
    const geo = geocode(addr);
    if (!geo) continue;
    matched++;
    const res = await db.location.updateMany({
      where: { id: { in: ids } },
      data: { latitude: geo.latitude, longitude: geo.longitude, address: geo.address },
    });
    updatedRows += res.count;
    if (++batch % 50 === 0) {
      process.stdout.write(
        `\r[GEO] Processed ${batch}/${byAddr.size} addrs, ${updatedRows} rows updated`
      );
    }
  }
  console.log(`\n[GEO] Done. Matched ${matched}/${byAddr.size} addresses, updated ${updatedRows} rows.`);
}

main()
  .catch((e) => {
    console.error("[GEO] Fatal:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
