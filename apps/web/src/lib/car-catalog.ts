export const MIN_CAR_LISTING_PHOTOS = 1;
export const MAX_CAR_LISTING_PHOTOS = 5;

export const CUSTOM_BRAND = 'Other (type brand)';
export const CUSTOM_MODEL = 'Other (type model)';

export const CAR_COLORS = [
  'White',
  'Black',
  'Silver',
  'Gray',
  'Blue',
  'Red',
  'Green',
  'Brown',
  'Beige',
  'Gold',
  'Orange',
  'Yellow',
  'Purple',
  'Maroon',
  'Champagne',
  'Pearl White',
  'Metallic Gray',
  'Two-tone',
  'Other',
] as const;

export const CAR_BRAND_MODELS: Record<string, readonly string[]> = {
  Toyota: [
    'Corolla',
    'Camry',
    'RAV4',
    'Highlander',
    'Land Cruiser',
    'Prado',
    'Hilux',
    'Fortuner',
    'Yaris',
    'Vitz',
    'Avanza',
    'Rush',
    'Harrier',
    'Alphard',
    'Hiace',
    'Coaster',
    'Probox',
    'Succeed',
    'Noah',
    'Voxy',
  ],
  Nissan: [
    'X-Trail',
    'Patrol',
    'Navara',
    'Juke',
    'Qashqai',
    'Murano',
    'Altima',
    'Sunny',
    'Note',
    'March',
    'Tiida',
    'Serena',
    'Urvan',
    'Caravan',
  ],
  Honda: ['CR-V', 'HR-V', 'Fit', 'Civic', 'Accord', 'Pilot', 'Odyssey', 'City', 'BR-V'],
  Suzuki: ['Swift', 'Vitara', 'Jimny', 'Ertiga', 'Baleno', 'Dzire', 'Alto', 'Celerio', 'Carry'],
  Mitsubishi: ['Pajero', 'Outlander', 'L200', 'ASX', 'Mirage', 'Xpander', 'Canter', 'Fuso'],
  Mazda: ['CX-5', 'CX-3', 'CX-30', 'Mazda3', 'Mazda6', 'BT-50'],
  Subaru: ['Forester', 'Outback', 'XV', 'Impreza', 'Legacy'],
  Isuzu: ['D-Max', 'MU-X', 'N-Series', 'F-Series'],
  Hyundai: ['Tucson', 'Santa Fe', 'Creta', 'Elantra', 'Accent', 'H-1', 'Starex', 'i10', 'i20', 'Kona'],
  Kia: ['Sportage', 'Sorento', 'Picanto', 'Rio', 'Cerato', 'Carnival', 'Seltos', 'Sonet'],
  Ford: ['Ranger', 'Everest', 'EcoSport', 'Explorer', 'F-150', 'Transit'],
  Chevrolet: ['Trailblazer', 'Captiva', 'Spark', 'Cruze', 'Suburban', 'Tahoe'],
  Volkswagen: ['Polo', 'Golf', 'Tiguan', 'Passat', 'Amarok', 'Transporter', 'Caddy'],
  'Mercedes-Benz': ['C-Class', 'E-Class', 'S-Class', 'GLC', 'GLE', 'GLS', 'G-Class', 'Sprinter', 'Vito'],
  BMW: ['3 Series', '5 Series', '7 Series', 'X1', 'X3', 'X5', 'X7'],
  Audi: ['A3', 'A4', 'A6', 'Q3', 'Q5', 'Q7', 'Q8'],
  Lexus: ['RX', 'NX', 'LX', 'ES', 'IS', 'GX'],
  'Land Rover': ['Range Rover', 'Range Rover Sport', 'Discovery', 'Defender', 'Evoque'],
  Jeep: ['Wrangler', 'Grand Cherokee', 'Compass', 'Renegade'],
  Peugeot: ['208', '308', '3008', '5008', 'Partner', 'Boxer'],
  Renault: ['Duster', 'Koleos', 'Megane', 'Clio', 'Kangoo', 'Master'],
  Citroën: ['C3', 'C4', 'C5 Aircross', 'Berlingo'],
  Volvo: ['XC40', 'XC60', 'XC90', 'S60', 'V60'],
  Porsche: ['Cayenne', 'Macan', 'Panamera', '911'],
  Tesla: ['Model 3', 'Model Y', 'Model S', 'Model X'],
  BYD: ['Atto 3', 'Dolphin', 'Seal', 'Tang'],
  Chery: ['Tiggo 4', 'Tiggo 7', 'Tiggo 8'],
  Haval: ['H6', 'Jolion', 'H9'],
  'Great Wall': ['Wingle', 'Poer', 'Steed'],
  Mahindra: ['Scorpio', 'XUV500', 'Bolero', 'Thar'],
  Tata: ['Safari', 'Harrier', 'Xenon', 'LPT'],
  FAW: ['Bestune T77', 'Jiefang'],
  Dongfeng: ['Rich', 'Captain'],
  JAC: ['JS4', 'T8'],
  Geely: ['Coolray', 'Azkarra', 'Emgrand'],
  Infiniti: ['QX50', 'QX60', 'QX80'],
  Mini: ['Cooper', 'Countryman'],
  Fiat: ['500', 'Panda', 'Ducato'],
  Opel: ['Corsa', 'Astra', 'Mokka'],
  Skoda: ['Octavia', 'Superb', 'Kodiaq', 'Kamiq'],
  Seat: ['Ibiza', 'Leon', 'Ateca'],
  'Rolls-Royce': ['Ghost', 'Cullinan', 'Phantom'],
  Bentley: ['Bentayga', 'Continental GT'],
};

export const CAR_BRANDS = [...Object.keys(CAR_BRAND_MODELS).sort(), CUSTOM_BRAND] as const;

export function modelsForBrand(brand: string): string[] {
  if (brand === CUSTOM_BRAND) return [CUSTOM_MODEL];
  const models = CAR_BRAND_MODELS[brand];
  if (!models) return [CUSTOM_MODEL];
  return [...models, CUSTOM_MODEL];
}

export function resolveBrandModel(
  brand: string,
  customBrand: string,
  model: string,
  customModel: string,
): { brand: string; model: string } {
  const resolvedBrand = brand === CUSTOM_BRAND ? customBrand.trim() : brand.trim();
  const resolvedModel = model === CUSTOM_MODEL ? customModel.trim() : model.trim();
  return { brand: resolvedBrand, model: resolvedModel };
}

export const CURRENT_MODEL_YEAR = new Date().getFullYear();

export function yearOptions(fromYear = 1980): number[] {
  return Array.from({ length: CURRENT_MODEL_YEAR + 1 - fromYear }, (_, index) => CURRENT_MODEL_YEAR + 1 - index);
}
