'use client';

import { SessionProvider } from 'next-auth/react';
import { PropsWithChildren } from 'react';

export default function Providers({ children }: PropsWithChildren) {
  // SessionProvider enables useSession() inside client components like ChatWidget
  return <SessionProvider>{children}</SessionProvider>;
}
