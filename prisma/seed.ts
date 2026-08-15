import { PrismaClient, Role } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import argon2 from 'argon2';
import dotenv from 'dotenv';

dotenv.config();

const adapter = new PrismaBetterSqlite3({ url: 'dev.db' });
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

  const customerPhone = process.env.CUSTOMER_PHONE || '+213666000000';
  const customerPassword = process.env.CUSTOMER_PASSWORD || 'password123';
  const customerPasswordHash = await argon2.hash(customerPassword);

  const customer = await prisma.user.upsert({
    where: { phone: customerPhone },
    update: {
      name: 'Client Test',
      passwordHash: customerPasswordHash,
      dateOfBirth: new Date('1995-05-15'),
      role: Role.CUSTOMER,
      phoneVerified: true,
    },
    create: {
      name: 'Client Test',
      phone: customerPhone,
      passwordHash: customerPasswordHash,
      dateOfBirth: new Date('1995-05-15'),
      role: Role.CUSTOMER,
      phoneVerified: true,
    },
  });

  console.log(`✅ Customer account seeded successfully:`);
  console.log(`   ID:    ${customer.id}`);
  console.log(`   Name:  ${customer.name}`);
  console.log(`   Phone: ${customer.phone}`);
  console.log(`   Role:  ${customer.role}`);

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
    console.log('🌱 Seed completed.');
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
