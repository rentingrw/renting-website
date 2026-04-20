import { findCarListingsWithinRadius, prisma } from './index';

async function main() {
  const rows = await findCarListingsWithinRadius({
    latitude: -1.9441,
    longitude: 30.0619,
    radiusMeters: 5000,
    limit: 10,
  });

  console.log(`Geo smoke query returned ${rows.length} listing(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
