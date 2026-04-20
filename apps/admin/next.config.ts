import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  serverExternalPackages: ['@prisma/client'],
  images: {
    domains: ['res.cloudinary.com'],
  },
};

export default withNextIntl(nextConfig);
