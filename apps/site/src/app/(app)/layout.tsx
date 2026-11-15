"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ErrorBox, Loading } from "@/components/bits";
import { api } from "@/lib/api";
import { seenAlerts } from "@/lib/seen";
import { useStudent } from "@/lib/student";
import { Footer, TopNav } from "@site/components/Shell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { ready, card, error } = useStudent();
  const [unseen, setUnseen] = useState(0);

  useEffect(() => {
    if (ready && !card && !error) router.replace("/");
  }, [ready, card, error, router]);

  useEffect(() => {
    if (!card) return;
    api.alerts(card.id).then((a) => { const seen = seenAlerts(card.id); setUnseen(a.alerts.filter((x) => !seen.has(x.key)).length); }).catch(() => {});
  }, [card, children]);

  return (
    <div className="flex min-h-dvh flex-col">
      <TopNav unseen={unseen} />
      <div className="paper-grain relative flex flex-1 flex-col">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[900px] overflow-hidden">
          <div className="absolute -left-40 top-40 h-[520px] w-[520px] rounded-full bg-cardinal opacity-[.07] blur-[110px]" />
          <div className="absolute -right-32 top-[420px] h-[560px] w-[560px] rounded-full bg-gold opacity-[.16] blur-[120px]" />
        </div>
        <div className="relative flex flex-1 flex-col">
          {error ? <div className="mx-auto w-full max-w-xl py-16"><ErrorBox message={`Can't reach the Unclaimed API (${error}). Start it with make admin.`} /></div>
            : !ready || !card ? <div className="py-24"><Loading /></div>
            : children}
        </div>
      </div>
      <Footer />
    </div>
  );
}
