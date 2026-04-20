import { redirect } from 'next/navigation';

type CarsPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function CarsPage({ params }: CarsPageProps) {
  const { locale } = await params;
  redirect(`/${locale}/app?section=cars`);
}
