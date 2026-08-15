"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables for the Prisma seed script
dotenv_1.default.config();
// Create a Prisma client with the pg adapter for the seed script
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
});
const adapter = new adapter_pg_1.PrismaPg(pool);
const prisma = new client_1.PrismaClient({ adapter });
async function main() {
    console.log('🌱 Starting database seed...');
    // ─── Read driver info from environment variables ────────────────────
    const driverName = process.env.DRIVER_NAME;
    const driverPhone = process.env.DRIVER_PHONE;
    if (!driverName || !driverPhone) {
        throw new Error('Missing required environment variables for driver seed.\n' +
            'Please set DRIVER_NAME and DRIVER_PHONE in your .env file.');
    }
    // ─── Upsert the driver account (idempotent) ────────────────────────
    // The driver authenticates via SMS OTP — no password is stored.
    const driver = await prisma.user.upsert({
        where: { phone: driverPhone },
        update: {
            name: driverName,
            role: client_1.Role.DRIVER,
            phoneVerified: true,
        },
        create: {
            name: driverName,
            phone: driverPhone,
            role: client_1.Role.DRIVER,
            phoneVerified: true,
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
