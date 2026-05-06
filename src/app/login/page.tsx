/**
 * NigWrite — Login Page
 * Created by: Wabi The Tech Nurse
 *
 * Server Component that renders a Client Component login form.
 */

import { Suspense } from 'react';
import { LoginForm } from './LoginForm';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-[#008751]/5 to-background px-4">
      <Suspense fallback={<div className="text-muted-foreground">Loading...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
