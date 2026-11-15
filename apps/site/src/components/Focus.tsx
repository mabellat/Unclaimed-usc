import { WRAP } from "./Shell";

/** A centered panel for step-by-step flows (build, claim, packet) reused from the phone app. */
export function Focus({ children, width = 760 }: { children: React.ReactNode; width?: number }) {
  return (
    <div className={`${WRAP} py-10`}>
      <div className="mx-auto overflow-clip rounded-[28px] border border-rule bg-paper shadow-[0_24px_60px_rgba(0,0,0,.08)]" style={{ maxWidth: width }}>
        {children}
      </div>
    </div>
  );
}
