import { PLATFORM_ASPECT } from "@/lib/constants";

type Props = {
  platform: string;
  mediaUrl: string;
  caption?: string | null;
  handle?: string;
  mediaType?: string; // "image" | "video"
  posterUrl?: string | null;
  fit?: "cover" | "contain"; // how media sits in the platform frame
  safeZones?: boolean; // overlay the platform's UI-safe area
  children?: React.ReactNode; // optional overlay (e.g. comment pins)
};

const VERTICAL = new Set(["INSTAGRAM_REEL", "INSTAGRAM_STORY", "YOUTUBE_SHORTS"]);

// Renders content inside a realistic, platform-specific chrome so a post looks
// like a real post — not a bare image. Presentational only.
export function PlatformPreview({
  platform, mediaUrl, caption, handle = "engageflow.media",
  mediaType = "image", posterUrl, fit = "cover", safeZones = false, children,
}: Props) {
  const aspect = PLATFORM_ASPECT[platform] ?? 1;
  const fitClass = fit === "contain" ? "object-contain" : "object-cover";

  const media = (
    <div className="relative w-full overflow-hidden bg-black" style={{ aspectRatio: String(aspect) }}>
      {mediaType === "video" ? (
        <video
          src={mediaUrl}
          poster={posterUrl ?? undefined}
          controls
          muted
          playsInline
          className={`h-full w-full ${fitClass}`}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={mediaUrl} alt={caption ?? "content preview"} className={`h-full w-full ${fitClass}`} />
      )}
      {safeZones && VERTICAL.has(platform) && (
        <div className="pointer-events-none absolute inset-0">
          {/* top status area */}
          <div className="absolute inset-x-0 top-0 h-[12%] bg-[repeating-linear-gradient(45deg,rgba(192,68,46,0.18),rgba(192,68,46,0.18)_6px,transparent_6px,transparent_12px)]" />
          {/* bottom caption / CTA area */}
          <div className="absolute inset-x-0 bottom-0 h-[24%] bg-[repeating-linear-gradient(45deg,rgba(192,68,46,0.18),rgba(192,68,46,0.18)_6px,transparent_6px,transparent_12px)]" />
          {/* right action rail */}
          <div className="absolute bottom-[10%] right-0 h-[45%] w-[16%] bg-[repeating-linear-gradient(45deg,rgba(192,68,46,0.18),rgba(192,68,46,0.18)_6px,transparent_6px,transparent_12px)]" />
        </div>
      )}
      {children}
    </div>
  );

  if (platform === "INSTAGRAM_POST") {
    return (
      <Frame width={380}>
        <IgHeader handle={handle} />
        {media}
        <IgActions />
        {caption && (
          <p className="px-3 pb-3 text-sm">
            <span className="font-semibold">{handle}</span> {caption}
          </p>
        )}
      </Frame>
    );
  }

  if (platform === "INSTAGRAM_REEL" || platform === "INSTAGRAM_STORY" || platform === "YOUTUBE_SHORTS") {
    return (
      <Frame width={300} rounded>
        <div className="relative">
          {media}
          <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-3 text-white">
            <div className="flex items-center gap-2 text-sm font-medium drop-shadow">
              <span className="h-7 w-7 rounded-full bg-white/30" /> {handle}
            </div>
            {caption && <p className="text-sm drop-shadow max-w-[80%]">{caption}</p>}
          </div>
        </div>
      </Frame>
    );
  }

  if (platform === "LINKEDIN") {
    return (
      <Frame width={420}>
        <div className="flex items-center gap-2 p-3">
          <span className="h-10 w-10 rounded-full bg-[#0a66c2]/15" />
          <div>
            <p className="text-sm font-semibold">EngageFlow</p>
            <p className="text-xs text-[var(--muted)]">2,143 followers · Promoted</p>
          </div>
        </div>
        {caption && <p className="px-3 pb-2 text-sm">{caption}</p>}
        {media}
        <div className="flex gap-6 px-3 py-2 text-xs text-[var(--muted)]">
          <span>Like</span><span>Comment</span><span>Repost</span><span>Send</span>
        </div>
      </Frame>
    );
  }

  if (platform === "X") {
    return (
      <Frame width={420}>
        <div className="flex gap-3 p-3">
          <span className="h-10 w-10 shrink-0 rounded-full bg-[var(--surface-2)]" />
          <div className="min-w-0 flex-1">
            <p className="text-sm"><span className="font-semibold">EngageFlow</span> <span className="text-[var(--muted)]">@engageflow · 1h</span></p>
            {caption && <p className="mt-1 text-sm">{caption}</p>}
            <div className="mt-2 overflow-hidden rounded-2xl border">{media}</div>
          </div>
        </div>
      </Frame>
    );
  }

  if (platform === "YOUTUBE" || platform === "WEBSITE" || platform === "FACEBOOK") {
    return (
      <Frame width={480}>
        {media}
        {caption && (
          <div className="p-3">
            <p className="text-sm font-semibold leading-snug">{caption}</p>
            <p className="mt-1 text-xs text-[var(--muted)]">EngageFlow</p>
          </div>
        )}
      </Frame>
    );
  }

  return <Frame width={400}>{media}</Frame>;
}

function Frame({ children, width, rounded }: { children: React.ReactNode; width: number; rounded?: boolean }) {
  return (
    <div
      className="mx-auto overflow-hidden border bg-[var(--bg)] shadow-sm"
      style={{ width, maxWidth: "100%", borderRadius: rounded ? 22 : "var(--radius-card)" }}
    >
      {children}
    </div>
  );
}

function IgHeader({ handle }: { handle: string }) {
  return (
    <div className="flex items-center gap-2 p-3">
      <span className="h-8 w-8 rounded-full bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7]" />
      <span className="text-sm font-semibold">{handle}</span>
      <span className="ml-auto text-[var(--muted)]">···</span>
    </div>
  );
}

function IgActions() {
  return (
    <div className="flex items-center gap-4 px-3 pt-2 text-[var(--fg)]">
      <span className="text-lg">♡</span>
      <span className="text-lg">💬</span>
      <span className="text-lg">➤</span>
      <span className="ml-auto text-lg">🔖</span>
    </div>
  );
}
