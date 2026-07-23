import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
// Get sample lokasi values to understand patterns
const sample = await db.location.findMany({
  where: { lokasi: { not: null } },
  select: { lokasi: true },
  distinct: ["lokasi"],
  take: 30,
});
console.log("Sample lokasi values:");
for (const r of sample) console.log(" ", r.lokasi);

// Count by building prefix
const g2 = await db.location.count({ where: { lokasi: { contains: "G2" } } });
const g3 = await db.location.count({ where: { lokasi: { contains: "G3" } } });
const g4 = await db.location.count({ where: { lokasi: { contains: "G4" } } });
const g5 = await db.location.count({ where: { lokasi: { contains: "G5" } } });
console.log(`\nG2: ${g2}, G3: ${g3}, G4: ${g4}, G5: ${g5}`);

// Get distinct buildings (first segment of lokasi before .)
const allLokasi = await db.location.findMany({
  where: { lokasi: { not: null } },
  select: { lokasi: true },
  distinct: ["lokasi"],
});
const buildings = new Map<string, number>();
for (const r of allLokasi) {
  const m = r.lokasi?.match(/^([A-Z]\d+)/i);
  if (m) buildings.set(m[1].toUpperCase(), (buildings.get(m[1].toUpperCase()) || 0) + 1);
}
console.log("\nAll building prefixes:");
for (const [b, c] of Array.from(buildings.entries()).sort()) {
  console.log(`  ${b}: ${c} unique lokasi codes`);
}
await db.$disconnect();
