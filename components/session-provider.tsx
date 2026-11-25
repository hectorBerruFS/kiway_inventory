"use client";

import { SessionProvider as NextSessionProvider } from "next-auth/react";
import { SWRConfig } from "swr";

const swrConfig = {
  revalidateOnFocus: false,
  dedupingInterval: 10000,
};

export function SessionProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextSessionProvider refetchOnWindowFocus={false} refetchInterval={0}>
      <SWRConfig value={swrConfig}>{children}</SWRConfig>
    </NextSessionProvider>
  );
}
