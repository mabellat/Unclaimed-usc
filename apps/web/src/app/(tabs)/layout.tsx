"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ErrorBox, Loading } from "@/components/bits";
import { TabBar } from "@/components/TabBar";
import { api } from "@/lib/api";
import { seenAlerts } from "@/lib/seen";
import { useStudent } from "@/lib/student";

export default function TabsLayout({ children }: { children: React.ReactNode }) {
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

  if (error) return <ErrorBox message={`Can't reach the Unclaimed API (${error}). Start it with make admin.`} />;
  if (!ready || !card) return <Loading />;
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="flex flex-1 flex-col">{children}</div>
      <TabBar badges={{ "/alerts": unseen }} />
    </div>
  );
}
