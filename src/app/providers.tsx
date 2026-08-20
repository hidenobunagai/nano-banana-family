"use client";

import { MotionConfig } from "framer-motion";
import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <SessionProvider>{children}</SessionProvider>
    </MotionConfig>
  );
}
