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
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    const email = typeof payload.email === 'string' ? payload.email : '';
    const role = typeof payload.role === 'string' ? payload.role : 'admin';
    return NextResponse.json({ token, email, role });
  } catch {
    return NextResponse.json({ message: 'Session expired.' }, { status: 401 });
  }
}
