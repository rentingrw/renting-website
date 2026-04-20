import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_session')?.value;

  if (!token) {
    return NextResponse.json({ message: 'Not authenticated.' }, { status: 401 });
  }

  const secret = process.env.ADMIN_JWT_SECRET;
  if (!secret) {
    return NextResponse.json({ message: 'Server misconfiguration.' }, { status: 500 });
  }

  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
    return NextResponse.json({ token });
  } catch {
    return NextResponse.json({ message: 'Session expired.' }, { status: 401 });
  }
}
