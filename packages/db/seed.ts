import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Open-source images from Unsplash (https://unsplash.com/license)
const STOCK_IMAGES = {
  cars: {
    sedan: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&auto=format&fit=crop',
    suv: 'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=800&auto=format&fit=crop',
  },
  drivers: [
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop',
  ],
};

async function main() {
  const { carIds, driverIds } = await prisma.$transaction(
    async (tx) => {
    const admin = await tx.user.create({
      data: {
        clerkId: 'clerk_admin_placeholder',
        email: 'admin@rentingi.rw',
        fullName: 'Admin Rentingi',
        primaryRole: 'renter',
        languagePreference: 'en',
        status: 'active',
      },
    });

    const ownerOne = await tx.user.create({
      data: {
        email: 'jean-pierre.habimana@rentingi.rw',
        fullName: 'Jean-Pierre Habimana',
        primaryRole: 'car_owner',
        languagePreference: 'rw',
        status: 'active',
      },
    });

    const ownerTwo = await tx.user.create({
      data: {
        email: 'claudine.uwimana@rentingi.rw',
        fullName: 'Claudine Uwimana',
        primaryRole: 'car_owner',
        languagePreference: 'fr',
        status: 'active',
      },
    });

    const driverOne = await tx.user.create({
      data: {
        email: 'emmanuel.nkurunziza@rentingi.rw',
        fullName: 'Emmanuel Nkurunziza',
        primaryRole: 'driver',
        languagePreference: 'rw',
        status: 'active',
        avatarUrl: STOCK_IMAGES.drivers[0],
      },
    });

    const driverTwo = await tx.user.create({
      data: {
        email: 'diane.mukamana@rentingi.rw',
        fullName: 'Diane Mukamana',
        primaryRole: 'driver',
        languagePreference: 'en',
        status: 'active',
        avatarUrl: STOCK_IMAGES.drivers[1],
      },
    });

    const renterOne = await tx.user.create({
      data: {
        email: 'patrick.nzeyimana@rentingi.rw',
        fullName: 'Patrick Nzeyimana',
        primaryRole: 'renter',
        languagePreference: 'rw',
        status: 'active',
      },
    });

    const renterTwo = await tx.user.create({
      data: {
        email: 'solange.ingabire@rentingi.rw',
        fullName: 'Solange Ingabire',
        primaryRole: 'renter',
        languagePreference: 'fr',
        status: 'active',
      },
    });

    const users = [admin, ownerOne, ownerTwo, driverOne, driverTwo, renterOne, renterTwo];

    await tx.userRole.createMany({
      data: users.map((user) => ({
        userId: user.id,
        role: user.primaryRole,
      })),
    });

    const ownerOneProfile = await tx.carOwnerProfile.create({
      data: {
        userId: ownerOne.id,
        nationalIdNumber: '1199080012345678',
        tinNumber: '100245678',
        companyName: 'Habimana Mobility',
      },
    });

    await tx.carOwnerProfile.create({
      data: {
        userId: ownerTwo.id,
        nationalIdNumber: '1199010098765432',
        tinNumber: '100334455',
        companyName: 'Uwimana Rides',
      },
    });

      const car1 = await tx.carListing.create({
      data: {
        ownerId: ownerOne.id,
        title: 'Toyota RAV4 2021 - Kacyiru',
          description: 'Comfortable SUV ideal for Kigali and weekend upcountry trips.',
          vehicleType: 'suv',
          serviceType: 'self_drive',
          brand: 'Toyota',
          model: 'RAV4',
          year: 2021,
          seats: 5,
          transmission: 'Automatic',
          fuelType: 'Petrol',
          dailyRateKigaliRwf: 85000,
          dailyRateCountrysideRwf: 95000,
          locationText: 'KG 7 Ave, Kacyiru, Kigali',
          photos: [STOCK_IMAGES.cars.suv],
          features: ['AC', 'Bluetooth', 'Backup Camera'],
          status: 'active',
      },
      });

      const car2 = await tx.carListing.create({
      data: {
        ownerId: ownerOne.id,
        title: 'Hyundai Tucson 2019 - Kimihurura',
          description: 'Reliable SUV for city and family travel.',
          vehicleType: 'suv',
          serviceType: 'with_driver',
          brand: 'Hyundai',
          model: 'Tucson',
          year: 2019,
          seats: 5,
          transmission: 'Automatic',
          fuelType: 'Petrol',
          dailyRateKigaliRwf: 70000,
          dailyRateCountrysideRwf: 80000,
          locationText: 'KN 5 Rd, Kimihurura, Kigali',
          photos: [STOCK_IMAGES.cars.suv],
          features: ['AC', 'GPS'],
          status: 'active',
      },
      });

      const car3 = await tx.carListing.create({
      data: {
        ownerId: ownerTwo.id,
        title: 'Toyota Corolla 2020 - Nyarutarama',
          description: 'Fuel-efficient sedan for business and city movement.',
          vehicleType: 'sedan',
          serviceType: 'self_drive',
          brand: 'Toyota',
          model: 'Corolla',
          year: 2020,
          seats: 5,
          transmission: 'Automatic',
          fuelType: 'Petrol',
          dailyRateKigaliRwf: 55000,
          dailyRateCountrysideRwf: 65000,
          locationText: 'KG 9 Ave, Nyarutarama, Kigali',
          photos: [STOCK_IMAGES.cars.sedan],
          features: ['AC', 'USB Charging'],
          status: 'active',
      },
      });

      await tx.subscription.create({
      data: {
        userId: ownerOne.id,
        carOwnerProfileId: ownerOneProfile.id,
        tier: 'premium',
        status: 'active',
        amountRwf: 15000,
        paymentMethod: 'momo',
        startsAt: new Date(),
        renewsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      });

      const dp1 = await tx.driverProfile.create({
      data: {
        userId: driverOne.id,
        driverCategory: 'city',
        yearsExperience: 6,
        biography: 'Professional city and airport transfer driver based in Kigali.',
        dailyRateRwf: 45000,
        hourlyRateRwf: 7000,
        primaryCity: 'Kigali',
        languages: ['rw', 'en'],
        categories: ['city', 'airport'],
        vehicleTypes: ['sedan', 'suv'],
        certifications: ['defensive_driving'],
        serviceAreas: ['Kigali', 'Musanze'],
        availabilityCalendar: { weekdays: '06:00-21:00', weekend: '08:00-20:00' },
        completedTrips: 120,
      },
      });

      const dp2 = await tx.driverProfile.create({
      data: {
        userId: driverTwo.id,
        driverCategory: 'chauffeur',
        yearsExperience: 4,
        biography: 'Experienced private chauffeur for corporate and family bookings.',
        dailyRateRwf: 50000,
        hourlyRateRwf: 8000,
        primaryCity: 'Kigali',
        languages: ['rw', 'fr', 'en'],
        categories: ['chauffeur', 'outstation'],
        vehicleTypes: ['sedan', 'van'],
        certifications: ['vip_protocol'],
        serviceAreas: ['Kigali', 'Musanze'],
        availabilityCalendar: { weekdays: '07:00-22:00', weekend: '09:00-19:00' },
        completedTrips: 89,
      },
      });

      return {
        carIds: [
          [car1.id, 30.0869, -1.9487],
          [car2.id, 30.0892, -1.9536],
          [car3.id, 30.1100, -1.9500],
        ] as [string, number, number][],
        driverIds: [dp1.id, dp2.id] as string[],
      };
    },
    { timeout: 15000 },
  );

  // Update pickup_location and primary_city_location outside transaction (avoids timeout with remote DB)
  for (const [id, lng, lat] of carIds) {
    await prisma.$executeRaw(
      Prisma.sql`UPDATE car_listings SET pickup_location = ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography WHERE id = ${id}::uuid`,
    );
  }
  const kigaliLng = 30.0606;
  const kigaliLat = -1.9536;
  for (const dpId of driverIds) {
    await prisma.$executeRaw(
      Prisma.sql`UPDATE driver_profiles SET primary_city_location = ST_SetSRID(ST_MakePoint(${kigaliLng}, ${kigaliLat}), 4326)::geography WHERE id = ${dpId}::uuid`,
    );
  }

  console.log('Seed complete. Featured cars and drivers ready for Kigali search.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
