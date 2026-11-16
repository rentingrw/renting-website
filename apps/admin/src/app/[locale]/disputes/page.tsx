import { redirect } from 'next/navigation';

export default function DisputesRedirectPage({ params }: { params: { locale: string } }) {
  redirect(`/${params.locale}/complaints?tab=bookings`);
}