/**
 * An original line drawing of a campus skyline: arcades, a bell tower, a domed hall and palms.
 * Not a USC mark or photo. It draws itself in once (.draw in globals.css).
 */
const P = { pathLength: 1 } as const;

export function Skyline({ className = "", color = "#BDE6D9", opacity = 0.35 }: { className?: string; color?: string; opacity?: number }) {
  return (
    <svg viewBox="0 0 1200 240" preserveAspectRatio="xMidYMax slice" aria-hidden="true" className={`draw pointer-events-none ${className}`}>
      <g fill="none" stroke={color} strokeOpacity={opacity} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line {...P} x1="0" y1="236" x2="1200" y2="236" />
        {/* Left arcade hall */}
        <path {...P} d="M40 236V150h250v86M30 150l135-38 135 38M60 236v-50a18 18 0 0 1 36 0v50M110 236v-50a18 18 0 0 1 36 0v50M160 236v-50a18 18 0 0 1 36 0v50M210 236v-50a18 18 0 0 1 36 0v50" />
        {/* Bell tower */}
        <path {...P} d="M330 236V96h64v140M322 96h80M330 96l32-40 32 40M362 56V36M346 132a16 16 0 0 1 32 0v26h-32zM346 190h32v46h-32z" />
        {/* Domed library */}
        <path {...P} d="M440 236V140h300v96M430 140h320M500 140v-24h180v24M520 116a70 70 0 0 1 140 0M590 46v-16M470 236v-58a22 22 0 0 1 44 0v58M546 236v-70a44 44 0 0 1 88 0v70M666 236v-58a22 22 0 0 1 44 0v58" />
        {/* Right hall with a rose window */}
        <path {...P} d="M790 236V160h220v76M780 160l120-44 120 44M900 150m-18 0a18 18 0 1 0 36 0a18 18 0 1 0 -36 0M820 236v-40h30v40M950 236v-40h30v40" />
        {/* Palms */}
        <path {...P} d="M1060 236c4-50 2-96-6-132M1054 104c-20-6-40 2-52 16M1054 104c-6-18-24-28-44-26M1054 104c10-18 30-24 50-18M1054 104c20-2 36 10 44 26M1054 104c2-20 14-34 30-40" />
        <path {...P} d="M1140 236c-2-40 0-74 8-104M1148 132c-16-8-34-4-46 8M1148 132c8-16 26-22 44-16M1148 132c-2-18 8-32 22-38M1148 132c16 2 28 14 32 30" />
        <path {...P} d="M10 236c2-36 0-66-6-92M4 144c14-8 30-6 42 4M4 144c-4-16 2-30 14-38" />
      </g>
    </svg>
  );
}
