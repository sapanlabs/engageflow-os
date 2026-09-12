import Link from "next/link";
import { HeroBackground } from "@/components/hero-background";
import { HeroDemo } from "@/components/hero-demo";
import { Reveal } from "@/components/reveal";
import { PlatformPreview } from "@/components/platform-preview";
import { PricingTable } from "@/components/pricing-table";

export const metadata = {
  title: "EngageFlow — The operating system for creative studios",
  description:
    "Manage clients, content, versions, and approvals in one workspace. Client review to approved, without the email chaos.",
};

export default function LandingPage() {
  return (
    <div className="min-h-dvh">
      {/* nav */}
      <header className="sticky top-0 z-40 border-b bg-[var(--bg)]/80 backdrop-blur">
        <div className="mx-auto flex max-w-[1200px] items-center gap-6 px-6 py-4">
          <Link href="/" className="font-display text-2xl tracking-tight">EngageFlow</Link>
          <nav className="ml-auto hidden items-center gap-6 text-sm text-[var(--muted)] md:flex">
            <a href="#how" className="hover:text-[var(--fg)]">How it works</a>
            <a href="#features" className="hover:text-[var(--fg)]">Features</a>
            <Link href="/pricing" className="hover:text-[var(--fg)]">Pricing</Link>
          </nav>
          <div className="ml-auto flex items-center gap-3 md:ml-0">
            <Link href="/login" className="text-sm text-[var(--muted)] hover:text-[var(--fg)]">Sign in</Link>
            <Link href="/pricing" className="rounded-[var(--radius-input)] bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-fg)] transition-quiet hover:opacity-90">
              Start free
            </Link>
          </div>
        </div>
      </header>

      {/* hero */}
      <section className="relative">
        <HeroBackground />
        <div className="mx-auto grid max-w-[1200px] items-center gap-12 px-6 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:py-28">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
              For creative studios & social teams
            </p>
            <h1 className="font-display mt-4 text-5xl leading-[1.02] tracking-tight md:text-6xl">
              From first draft to client approved, in one place.
            </h1>
            <p className="mt-5 max-w-md text-lg text-[var(--muted)]">
              EngageFlow runs the whole content workflow: versions, platform-true previews,
              pinned feedback, and one-click approval. No more email threads.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/pricing" className="rounded-[var(--radius-input)] bg-[var(--accent)] px-5 py-3 text-sm font-medium text-[var(--accent-fg)] transition-quiet hover:opacity-90 active:scale-[0.98]">
                Start free
              </Link>
              <Link href="/login" className="rounded-[var(--radius-input)] border px-5 py-3 text-sm font-medium transition-quiet hover:bg-[var(--surface-2)]">
                See it live
              </Link>
            </div>
          </div>
          <HeroDemo />
        </div>
      </section>

      {/* trust strip */}
      <div className="border-y">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-center gap-x-10 gap-y-3 px-6 py-6 text-sm text-[var(--muted)]">
          <span className="text-xs uppercase tracking-wide">Built for teams like</span>
          {["Lumen", "Atelier Nine", "Studio Kai", "Field & Form", "Halcyon"].map((b) => (
            <span key={b} className="font-display text-lg text-[var(--fg)]/70">{b}</span>
          ))}
        </div>
      </div>

      {/* how it works */}
      <section id="how" className="mx-auto max-w-[1200px] px-6 py-24">
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">How it works</p>
          <h2 className="font-display mt-3 max-w-2xl text-4xl">The client review loop, closed.</h2>
        </Reveal>
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[
            { n: "01", t: "Create & version", d: "Editors upload content; every revision is a new version, never overwritten." },
            { n: "02", t: "Preview, for real", d: "See it inside the actual Instagram, LinkedIn, or X frame before it ships." },
            { n: "03", t: "Pin feedback", d: "Clients drop comments on the exact spot, Figma-style. No ambiguity." },
            { n: "04", t: "Approve in one click", d: "Amber to green. The status is the source of truth for everyone." },
          ].map((s, i) => (
            <Reveal key={s.n} delay={i * 80}>
              <div className="rounded-[var(--radius-card)] border p-6">
                <p className="font-display text-3xl text-[var(--muted)]">{s.n}</p>
                <p className="mt-3 font-medium">{s.t}</p>
                <p className="mt-1 text-sm text-[var(--muted)]">{s.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* platform previews */}
      <section className="border-t bg-[var(--surface)]">
        <div className="mx-auto max-w-[1200px] px-6 py-24">
          <Reveal>
            <h2 className="font-display max-w-2xl text-4xl">Content that looks like the platform, not a file.</h2>
            <p className="mt-3 max-w-xl text-[var(--muted)]">
              Stop guessing how a post will render. Every piece previews inside a real platform frame.
            </p>
          </Reveal>
          <div className="mt-12 grid items-start gap-8 md:grid-cols-3">
            <Reveal><PlatformPreview platform="INSTAGRAM_POST" mediaUrl="https://picsum.photos/seed/ef-ig/800/800" caption="Every post, previewed before it ships." handle="engageflow.media" /></Reveal>
            <Reveal delay={100}><PlatformPreview platform="LINKEDIN" mediaUrl="https://picsum.photos/seed/ef-li/800/700" caption="One workspace for the whole studio." /></Reveal>
            <Reveal delay={200}><PlatformPreview platform="X" mediaUrl="https://picsum.photos/seed/ef-x/800/500" caption="Client review to approved, in one place." /></Reveal>
          </div>
        </div>
      </section>

      {/* feature bento */}
      <section id="features" className="mx-auto max-w-[1200px] px-6 py-24">
        <Reveal>
          <h2 className="font-display max-w-2xl text-4xl">Everything the studio runs on.</h2>
        </Reveal>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          <Reveal className="md:col-span-2">
            <FeatureCard title="Whiteboard" body="Plan campaigns on an infinite canvas with sticky notes, frames, and references." tall />
          </Reveal>
          <Reveal delay={80}>
            <FeatureCard title="Notes" body="Notion-style briefs, scripts, and strategy, nested under each client." />
          </Reveal>
          <Reveal delay={80}>
            <FeatureCard title="Calendar" body="Schedule publishing across platforms and see the whole month at a glance." />
          </Reveal>
          <Reveal delay={160} className="md:col-span-2">
            <FeatureCard title="Credential vault" body="Store each client's platform logins, encrypted and role-restricted." wide />
          </Reveal>
        </div>
      </section>

      {/* pricing */}
      <section className="border-t bg-[var(--surface)]">
        <div className="mx-auto max-w-[1100px] px-6 py-24">
          <Reveal>
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <h2 className="font-display text-4xl">Simple pricing that scales</h2>
              <p className="mt-3 text-[var(--muted)]">Start solo, grow into an agency. Cancel anytime.</p>
            </div>
          </Reveal>
          <Reveal delay={100}><PricingTable /></Reveal>
        </div>
      </section>

      {/* final CTA */}
      <section className="relative">
        <HeroBackground />
        <div className="mx-auto max-w-[1200px] px-6 py-28 text-center">
          <Reveal>
            <h2 className="font-display mx-auto max-w-2xl text-5xl leading-tight">
              Give your clients a review experience they actually enjoy.
            </h2>
            <div className="mt-8 flex justify-center gap-3">
              <Link href="/pricing" className="rounded-[var(--radius-input)] bg-[var(--accent)] px-6 py-3 text-sm font-medium text-[var(--accent-fg)] transition-quiet hover:opacity-90 active:scale-[0.98]">
                Start free
              </Link>
              <Link href="/login" className="rounded-[var(--radius-input)] border px-6 py-3 text-sm font-medium transition-quiet hover:bg-[var(--surface-2)]">
                Sign in
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* footer */}
      <footer className="border-t">
        <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-3 px-6 py-8 text-sm text-[var(--muted)] sm:flex-row">
          <span className="font-display text-lg text-[var(--fg)]">EngageFlow</span>
          <div className="flex gap-6">
            <Link href="/pricing" className="hover:text-[var(--fg)]">Pricing</Link>
            <Link href="/login" className="hover:text-[var(--fg)]">Sign in</Link>
          </div>
          <span>© {new Date().getFullYear()} EngageFlow Studio</span>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ title, body, tall, wide }: { title: string; body: string; tall?: boolean; wide?: boolean }) {
  return (
    <div
      className={
        "flex h-full flex-col justify-between rounded-[var(--radius-card)] border p-6 " +
        (tall ? "min-h-64 " : "") + (wide ? "min-h-40 " : "")
      }
      style={
        tall || wide
          ? { backgroundImage: "radial-gradient(120% 120% at 100% 0%, rgba(46,125,79,0.10), transparent 60%)" }
          : undefined
      }
    >
      <div>
        <p className="font-display text-2xl">{title}</p>
        <p className="mt-2 max-w-sm text-sm text-[var(--muted)]">{body}</p>
      </div>
    </div>
  );
}
