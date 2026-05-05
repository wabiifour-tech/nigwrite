/**
 * NigWrite — Auth Guard Helper
 * Created by: Wabi The Tech Nurse
 *
 * Utility for protecting API routes. Use in server-side API handlers
 * to ensure the caller is authenticated.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

interface AuthResult {
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
  } | null;
  error: Response | null;
}

export async function getAuthenticatedUser(request: NextRequest): Promise<AuthResult> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return {
        user: null,
        error: NextResponse.json(
          { success: false, error: 'Authentication required. Please sign in.' },
          { status: 401 }
        ),
      };
    }

    const user = session.user;
    return {
      user: {
        id: (user as { userId?: string }).userId || '',
        email: user.email || '',
        name: user.name || null,
        role: (user as { role?: string }).role || 'student',
      },
      error: null,
    };
  } catch {
    return {
      user: null,
      error: NextResponse.json(
        { success: false, error: 'Authentication check failed.' },
        { status: 500 }
      ),
    };
  }
}
