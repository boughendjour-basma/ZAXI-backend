import { PrismaClient, Role } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import argon2 from 'argon2';
import dotenv from 'dotenv';

// Load environment variables for the Prisma seed script
dotenv.config();

// Create a Prisma client with the pg adapter for the seed script
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting database seed...');

  // ─── Read driver credentials from environment variables ────────────
  const driverPassword = process.env.DRIVER_PASSWORD;
  const driverName = process.env.DRIVER_NAME;
  const driverPhone = process.env.DRIVER_PHONE;

  if (!driverPassword || !driverName || !driverPhone) {
    throw new Error(
      'Missing required environment variables for driver seed.\n' +
        'Please set DRIVER_PASSWORD, DRIVER_NAME, and DRIVER_PHONE in your .env file.'
    );
  }

  // ─── Hash the driver password with Argon2 ──────────────────────────
  const hashedPassword = await argon2.hash(driverPassword);

  // ─── Upsert the driver account (idempotent) ────────────────────────
  // Using upsert ensures that:
  // - If the driver account doesn't exist, it gets created.
  // - If the driver account already exists (matched by phone), it gets updated.
  // - Running this seed multiple times will never create duplicate accounts.
  const driver = await prisma.user.upsert({
    where: { phone: driverPhone },
    update: {
      name: driverName,
      passwordHash: hashedPassword,
      role: Role.DRIVER,
    },
    create: {
      passwordHash: hashedPassword,
      name: driverName,
      phone: driverPhone,
      role: Role.DRIVER,
    },
  });

  console.log(`✅ Driver account seeded successfully:`);
  console.log(`   ID:    ${driver.id}`);
  console.log(`   Name:  ${driver.name}`);
  console.log(`   Phone: ${driver.phone}`);
  console.log(`   Role:  ${driver.role}`);

  // ─── Upsert default PricingSettings ────────────────────────────────
  const pricingSettings = await prisma.pricingSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      cityFlatFare: 150,
      outsideRatePerKm: 40,
    },
  });

  console.log(`✅ Pricing settings seeded successfully:`);
  console.log(`   City Flat Fare: ${pricingSettings.cityFlatFare} DA`);
  console.log(`   Outside Rate:    ${pricingSettings.outsideRatePerKm} DA/km`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
    console.log('🌱 Seed completed.');
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });
