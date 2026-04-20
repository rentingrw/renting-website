import { redirect } from 'next/navigation';

type BookingsPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function BookingsPage({ params }: BookingsPageProps) {
  const { locale } = await params;
  redirect(`/${locale}/app?section=bookings`);
}
