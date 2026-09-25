import { SignJWT } from 'jose';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const COOKIE_NAME = 'admin_session';
const TOKEN_TTL_SECONDS = 8 * 60 * 60; // 8 hours

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({})) as { email?: string; password?: string };

  const validEmail = process.env.ADMIN_USERNAME;
  const validPassword = process.env.ADMIN_PASSWORD;
  const secret = process.env.ADMIN_JWT_SECRET;

  if (!validEmail || !validPassword || !secret) {
    const missing = [
      !validEmail ? 'ADMIN_USERNAME' : null,
      !validPassword ? 'ADMIN_PASSWORD' : null,
      !secret ? 'ADMIN_JWT_SECRET' : null,
    ].filter(Boolean);
    return NextResponse.json(
      {
        message:
          process.env.NODE_ENV === 'production'
            ? 'Server misconfiguration.'
            : `Server misconfiguration. Missing ${missing.join(', ')} in apps/admin/.env`,
      },
      { status: 500 },
    );
  }

  if (body.email !== validEmail || body.password !== validPassword) {
    return NextResponse.json({ message: 'Invalid credentials.' }, { status: 401 });
  }

  const encodedSecret = new TextEncoder().encode(secret);
  const token = await new SignJWT({ role: 'admin', email: validEmail })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_TTL_SECONDS}s`)
    .sign(encodedSecret);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: TOKEN_TTL_SECONDS,
    path: '/',
  });

  return NextResponse.json({ ok: true });
}
