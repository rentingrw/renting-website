import { redirect } from 'next/navigation';

type MessagesPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function MessagesPage({ params }: MessagesPageProps) {
  const { locale } = await params;
  redirect(`/${locale}/app?section=messages`);
}
