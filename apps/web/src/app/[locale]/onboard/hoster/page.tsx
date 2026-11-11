import { redirect } from 'next/navigation';

type HosterOnboardPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function HosterOnboardPage({ params }: HosterOnboardPageProps) {
  const { locale } = await params;
  redirect(`/${locale}/onboard/car`);
}
