import { redirect } from 'next/navigation';

type SubscriptionPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function SubscriptionPage({ params }: SubscriptionPageProps) {
  const { locale } = await params;
  redirect(`/${locale}/app?section=subscription`);
}
