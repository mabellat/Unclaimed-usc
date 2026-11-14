"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ErrorBox, Loading } from "@/components/bits";
import { useStudent } from "@/lib/student";

// Keep existing scan links working without adding an artificial delay.
export default function Scan() {
  const router = useRouter();
  const { ready, card, match, error } = useStudent();
  useEffect(() => {
    if (!ready || error) return;
    if (!card) router.replace("/");
    else if (match) router.replace("/wallet");
  }, [ready, card, match, error, router]);
  if (error) return <ErrorBox message="We couldn't load your matches. Please refresh to try again." />;
  return <main className="flex min-h-dvh items-center justify-center"><Loading /></main>;
}
