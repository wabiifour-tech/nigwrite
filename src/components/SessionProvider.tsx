/**
 * NigWrite — Session Provider Component
 * Created by: Wabi The Tech Nurse
 *
 * Client component wrapper for NextAuth session provider.
 * Must wrap the application to enable useSession, signIn, signOut hooks.
 */

'use client';

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';

interface SessionProviderProps {
  children: React.ReactNode;
}

export function SessionProvider({ children }: SessionProviderProps) {
  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>;
}
