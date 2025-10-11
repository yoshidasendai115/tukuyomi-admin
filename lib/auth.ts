import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set');
}
const secret = new TextEncoder().encode(process.env.JWT_SECRET);

export interface SessionData {
  userId: string;
  loginId: string;
  displayName: string;
  role: string;
  permissions: any;
  assignedStoreId?: string; // store_ownerロールの場合のみ
  allowedUrl?: string; // store_ownerロールの許可されたURL
}

export async function createSession(data: SessionData) {
  try {
    const token = await new SignJWT(data)
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('24h')
      .setIssuedAt()
      .sign(secret);

    const cookieStore = await cookies();
    cookieStore.set('admin_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });

    return token;
  } catch (error) {
    console.error('Failed to create session:', error);
    throw error;
  }
}

export async function getSession(): Promise<SessionData | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('admin_session');

    if (!token?.value) {
      return null;
    }

    const { payload } = await jwtVerify(token.value, secret);
    return payload as SessionData;
  } catch (error) {
    return null;
  }
}

export async function verifySession(request: NextRequest): Promise<SessionData | null> {
  try {
    const token = request.cookies.get('admin_session')?.value;

    if (!token) {
      return null;
    }

    const { payload } = await jwtVerify(token, secret);
    return payload as SessionData;
  } catch (error) {
    return null;
  }
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete('admin_session');
}

export async function requireAdmin(): Promise<SessionData> {
  const session = await getSession();

  if (!session) {
    throw new Error('Unauthorized');
  }

  // store_ownerロールは管理画面にアクセス不可
  if (session.role === 'store_owner') {
    throw new Error('Forbidden');
  }

  return session;
}