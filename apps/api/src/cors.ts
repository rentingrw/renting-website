import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

const VERCEL_PREVIEW_RE = /^https:\/\/renting(i|rw|-).*\.vercel\.app$/;

const HARDCODED_PRODUCTION_ORIGINS = [
  'https://renting.rw',
  'https://www.renting.rw',
  'https://admin.renting.rw',
];

export function buildCorsOptions(): CorsOptions {
  const allowedOrigins = [
    ...HARDCODED_PRODUCTION_ORIGINS,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_ADMIN_URL,
  ].filter(Boolean) as string[];

  return {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      if (VERCEL_PREVIEW_RE.test(origin)) return callback(null, true);
      callback(null, false);
    },
    credentials: true,
  };
}
