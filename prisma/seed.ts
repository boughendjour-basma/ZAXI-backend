import { PrismaClient, Role } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import argon2 from 'argon2';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting database seed...');

  const driverName = process.env.DRIVER_NAME || 'ZAXI Driver';
  const driverPhone = process.env.DRIVER_PHONE || '+213555000000';
  const rawPassword = process.env.DRIVER_PASSWORD || 'super-secure-password';

  const passwordHash = await argon2.hash(rawPassword);

  const driver = await prisma.user.upsert({
    where: { phone: driverPhone },
    update: {
      name: driverName,
      passwordHash,
      dateOfBirth: new Date('1990-01-01'),
      role: Role.DRIVER,
      phoneVerified: true,
    },
    create: {
      name: driverName,
      phone: driverPhone,
      passwordHash,
      dateOfBirth: new Date('1990-01-01'),
      role: Role.DRIVER,
      phoneVerified: true,
    },
  });

  console.log(`✅ Driver account seeded successfully:`);
  console.log(`   ID:    ${driver.id}`);
  console.log(`   Name:  ${driver.name}`);
  console.log(`   Phone: ${driver.phone}`);
  console.log(`   Role:  ${driver.role}`);
  // Sync driver settings
  await prisma.driverSettings.upsert({
    where: { id: 1 },
    update: {
      driverName,
      phoneNumber: driverPhone,
    },
    create: {
      id: 1,
      driverName,
      phoneNumber: driverPhone,
      isOnline: true,
    },
  });
  console.log(`✅ Driver settings synced with ${driverPhone}`);
  const pricingSettings = await prisma.pricingSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      cityFlatFare: 150,
      outsideRatePerKm: 40,
    },
  });

  console.log(`✅ Pricing settings seeded:`);
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
