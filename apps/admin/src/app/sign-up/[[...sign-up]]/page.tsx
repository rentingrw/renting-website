import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <SignUp
        signInUrl="/sign-in"
        fallbackRedirectUrl="/en"
        forceRedirectUrl="/en"
      />
    </main>
  );
}
