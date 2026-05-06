# Task 3 — Complete Authentication System Implementation

## Agent: Super Z (Main Agent)
## Task: Implement complete authentication system with next-auth

### Files Created/Modified

#### New Files Created:
1. **`src/lib/auth.ts`** — NextAuth v4 configuration
   - CredentialsProvider (email + password)
   - JWT strategy with session maxAge 30 days
   - JWT callback: adds userId and role to token
   - Session callback: adds userId and role to session
   - Custom signIn page path (/login)
   - Secret from env or fallback

2. **`src/lib/auth-guard.ts`** — Protected API helper
   - `getAuthenticatedUser(request)` function
   - Returns `{ user, error: null }` or `{ user: null, error: Response }`
   - Uses getServerSession with authOptions

3. **`src/app/api/auth/register/route.ts`** — Registration API
   - POST handler accepting { name, email, password }
   - Zod validation (name min 2, email valid, password min 8)
   - Duplicate email check
   - bcryptjs hashing (12 salt rounds)
   - Creates user with role "student"
   - Returns user data excluding password

4. **`src/app/api/auth/[...nextauth]/route.ts`** — NextAuth API route
   - Exports GET and POST from NextAuth(authOptions)

5. **`src/components/SessionProvider.tsx`** — Client component wrapper
   - Wraps children with NextAuth SessionProvider

6. **`src/app/login/page.tsx`** — Login page (Server Component)
   - Renders LoginForm client component
   - Centered layout with gradient background

7. **`src/app/login/LoginForm.tsx`** — Login form (Client Component)
   - Email + password inputs with shadcn/ui components
   - Green (#008751) primary button
   - Error display from URL params (CredentialsSignin handling)
   - Link to signup page
   - Loading state with spinner
   - Auto-redirect to / on success

8. **`src/app/signup/page.tsx`** — Signup page (Server Component)
   - Renders SignupForm client component
   - Centered layout with gradient background

9. **`src/app/signup/SignupForm.tsx`** — Signup form (Client Component)
   - Name, Email, Password, Confirm Password inputs
   - Password requirement indicators (min 8 chars, passwords match)
   - Zod validation via API
   - Auto sign-in after successful registration
   - Fallback to /login if auto-sign-in fails
   - Loading state with spinner

#### Files Modified:
10. **`prisma/schema.prisma`** — Added `password` field to User model
11. **`src/app/layout.tsx`** — Wrapped children with SessionProvider
12. **`src/components/Navbar.tsx`** — Added auth state
    - Shows user name/email + dropdown menu when logged in
    - Shows "Sign In" button when not logged in
    - Dropdown has Dashboard link and Sign Out action
    - Uses LogIn icon (corrected from SignIn which doesn't exist in this lucide version)
13. **`src/components/Footer.tsx`** — Added Sign In link for unauthenticated users
14. **`src/app/page.tsx`** — Added auth CTA section on home page
    - Shows "Sign in to get started" card when not authenticated
    - Links to /login and /signup
    - Imported useSession from next-auth/react

### Verification:
- ✅ `bun run lint` passes clean (no errors)
- ✅ Dev server compiles successfully
- ✅ `/` returns 200
- ✅ `/login` returns 200
- ✅ `/signup` returns 200
- ✅ Database pushed with new password field
- ✅ All imports resolved correctly (fixed `SignIn` → `LogIn` for lucide-react)
