import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const [total, mapped] = await Promise.all([
  db.location.count(),
  db.location.count({ where: { NOT: [{ latitude: null }, { longitude: null }] } }),
]);
console.log(`Total: ${total}, Mapped: ${mapped}, Unmapped: ${total - mapped}`);
await db.$disconnect();
