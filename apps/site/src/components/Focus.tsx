import { WRAP } from "./Shell";

/** A centered panel for step-by-step flows (build, claim, packet) reused from the phone app. */
export function Focus({ children, width = 760 }: { children: React.ReactNode; width?: number }) {
  return (
    <div className={`${WRAP} py-10`}>
      <div className="mx-auto overflow-clip rounded-3xl bg-paper shadow-[0_2px_0_#D9E3DD,0_24px_60px_rgba(60,20,10,.14)]" style={{ maxWidth: width }}>
        {children}
      </div>
    </div>
  );
}
