"use strict";

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🧹 Starting database cleanup...\n");

  // 1. Delete child tables first (FK order)
  const auditLogs = await prisma.auditLog.deleteMany({});
  console.log(`🗑  Deleted ${auditLogs.count} audit log(s)`);

  const notifications = await prisma.notification.deleteMany({});
  console.log(`🗑  Deleted ${notifications.count} notification(s)`);

  const ratings = await prisma.rating.deleteMany({});
  console.log(`🗑  Deleted ${ratings.count} rating(s)`);

  const payments = await prisma.payment.deleteMany({});
  console.log(`🗑  Deleted ${payments.count} payment(s)`);

  const driverLocations = await prisma.driverLocation.deleteMany({});
  console.log(`🗑  Deleted ${driverLocations.count} driver location(s)`);

  const bookings = await prisma.booking.deleteMany({});
  console.log(`🗑  Deleted ${bookings.count} booking(s)`);

  const announcements = await prisma.announcement.deleteMany({});
  console.log(`🗑  Deleted ${announcements.count} announcement(s)`);

  const favorites = await prisma.favoriteLocation.deleteMany({});
  console.log(`🗑  Deleted ${favorites.count} favorite location(s)`);

  // 2. Delete all CUSTOMER users only (keep DRIVER accounts)
  const customers = await prisma.user.deleteMany({
    where: { role: "CUSTOMER" },
  });
  console.log(`🗑  Deleted ${customers.count} customer account(s)`);

  console.log("\n✅ Cleanup complete!");
  console.log("   Driver account and pricing settings are untouched.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(async (e) => {
    console.error("❌ Cleanup failed:", e);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });
