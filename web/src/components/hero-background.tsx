// Layered hero background: masked blueprint grid + film grain + one status-green glow.
// Pure CSS/SVG, near-zero weight. Not the AI-purple mesh — structural and calm.
export function HeroBackground() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {/* blueprint grid, radial-masked so it fades at the edges */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(to right, var(--fg) 1px, transparent 1px), linear-gradient(to bottom, var(--fg) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          opacity: 0.04,
          maskImage: "radial-gradient(ellipse 70% 60% at 50% 32%, black 40%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 32%, black 40%, transparent 100%)",
        }}
      />
      {/* single soft status-green light source behind the product */}
      <div
        className="ef-hero-glow absolute left-1/2 top-[30%] h-[420px] w-[720px] -translate-x-1/2 rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(46,125,79,0.18), transparent 70%)",
          filter: "blur(40px)",
        }}
      />
      {/* film grain overlay */}
      <div
        className="absolute inset-0 opacity-[0.035] mix-blend-multiply"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
    </div>
  );
}
