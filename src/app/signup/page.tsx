/**
 * NigWrite — Signup Page
 * Created by: Wabi The Tech Nurse
 *
 * Server Component that renders a Client Component signup form.
 */

import { Suspense } from 'react';
import { SignupForm } from './SignupForm';

export default function SignupPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-[#008751]/5 to-background px-4 py-8">
      <Suspense fallback={<div className="text-muted-foreground">Loading...</div>}>
        <SignupForm />
      </Suspense>
    </div>
  );
}
