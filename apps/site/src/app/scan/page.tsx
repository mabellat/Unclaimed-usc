"use client";

import ScanRules from "@/app/scan/page";

export default function Scan() {
  return (
    <div className="relative overflow-hidden bg-cardinal-dark">
      <svg width="900" height="900" viewBox="0 0 900 900" aria-hidden="true" className="pointer-events-none absolute -right-[300px] -top-[300px]">
        <g fill="none" stroke="#FFCC00" strokeOpacity="0.14" strokeWidth="2">{[110, 180, 250, 320, 390].map((r) => <circle key={r} cx="450" cy="450" r={r} />)}</g>
      </svg>
      <div className="relative mx-auto max-w-[680px]"><ScanRules /></div>
    </div>
  );
}
