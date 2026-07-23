import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const [totalLocations, totalUsers, adminUsers] = await Promise.all([
    db.location.count(),
    db.user.count(),
    db.user.count({ where: { role: "ADMIN" } }),
  ]);

  const byJenis = await db.location.groupBy({
    by: ["jenis"],
    _count: { _all: true },
    orderBy: { _count: { jenis: "desc" } },
    take: 12,
  });

  const byProv = await db.location.groupBy({
    by: ["provenance"],
    _count: { _all: true },
    orderBy: { _count: { provenance: "desc" } },
    take: 12,
  });

  const byPeriode = await db.location.groupBy({
    by: ["periode"],
    _count: { _all: true },
    orderBy: { _count: { periode: "desc" } },
    take: 12,
  });

  return NextResponse.json({
    totalLocations,
    totalUsers,
    adminUsers,
    regularUsers: totalUsers - adminUsers,
    byJenis: byJenis.map((r) => ({ name: r.jenis ?? "—", count: r._count._all })),
    byProv: byProv.map((r) => ({ name: r.provenance ?? "—", count: r._count._all })),
    byPeriode: byPeriode.map((r) => ({ name: r.periode ?? "—", count: r._count._all })),
  });
}
