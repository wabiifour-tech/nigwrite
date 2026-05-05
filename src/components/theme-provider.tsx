'use client';

/**
 * Simple Theme Provider wrapper using next-themes
 * Created by: Wabi The Tech Nurse
 */

import { ThemeProvider as NextThemesProvider } from 'next-themes';

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
