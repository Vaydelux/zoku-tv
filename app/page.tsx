"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSessionStore } from "@/stores";
import { Tv } from "lucide-react";

export default function RootPage() {
  const router = useRouter();
  const { user, currentProfile, initializing } = useSessionStore();

  useEffect(() => {
    if (!initializing) {
      if (!user) {
        router.replace("/login");
      } else if (!currentProfile) {
        router.replace("/profiles");
      } else {
        router.replace("/home");
      }
    }
  }, [user, currentProfile, initializing, router]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background text-on-surface">
      <div className="flex flex-col items-center gap-4 animate-pulse">
        <Tv className="h-12 w-12 text-primary" />
        <span className="font-display text-xl font-bold tracking-wider">
          ZOKU<span className="text-primary font-mono text-sm ml-0.5">TV</span>
        </span>
      </div>
    </div>
  );
}
