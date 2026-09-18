// Meeting control icons (Feather/Lucide-style, currentColor, stroke 1.8).
type P = { size?: number; className?: string };
const b = (size = 20, className?: string) => ({
  width: size,
  height: size,
  className,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

export function MicIcon({ size, className }: P) {
  return (
    <svg {...b(size, className)}>
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  );
}
export function MicOffIcon({ size, className }: P) {
  return (
    <svg {...b(size, className)}>
      <line x1="2" y1="2" x2="22" y2="22" />
      <path d="M9 9v1a3 3 0 0 0 5.1 2.1M15 9.3V5a3 3 0 0 0-5.9-.7" />
      <path d="M17 10a5 5 0 0 1-.5 2.2M5 10a7 7 0 0 0 10.8 5.9" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  );
}
export function CamIcon({ size, className }: P) {
  return (
    <svg {...b(size, className)}>
      <rect x="1" y="6" width="15" height="12" rx="2" />
      <path d="M23 7l-7 5 7 5V7z" />
    </svg>
  );
}
export function CamOffIcon({ size, className }: P) {
  return (
    <svg {...b(size, className)}>
      <line x1="2" y1="2" x2="22" y2="22" />
      <path d="M16 16H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h1m4 0h5a2 2 0 0 1 2 2v3l4-3v9" />
    </svg>
  );
}
export function ScreenIcon({ size, className }: P) {
  return (
    <svg {...b(size, className)}>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
      <path d="M12 7v5M9.5 9.5 12 7l2.5 2.5" />
    </svg>
  );
}
export function CaptionsIcon({ size, className }: P) {
  return (
    <svg {...b(size, className)}>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M7 12.5a2 2 0 1 0 0-1M15 12.5a2 2 0 1 0 0-1" />
    </svg>
  );
}
export function PeopleIcon({ size, className }: P) {
  return (
    <svg {...b(size, className)}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
export function SettingsIcon({ size, className }: P) {
  return (
    <svg {...b(size, className)}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06-.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
export function CopyIcon({ size, className }: P) {
  return (
    <svg {...b(size, className)}>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}
export function LeaveIcon({ size, className }: P) {
  return (
    <svg {...b(size, className)}>
      <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.29.62A2 2 0 0 1 21.5 16.6v2.79a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.62 1.5h2.79a2 2 0 0 1 2 1.72c.13.83.34 1.65.62 2.42a2 2 0 0 1-.45 2.11L7.9 9.02" />
      <line x1="23" y1="1" x2="1" y2="23" />
    </svg>
  );
}
export function GridIcon({ size, className }: P) {
  return (
    <svg {...b(size, className)}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}
export function SpotlightIcon({ size, className }: P) {
  return (
    <svg {...b(size, className)}>
      <rect x="3" y="3" width="18" height="14" rx="2" />
      <rect x="3" y="19" width="4" height="2" rx="0.5" />
      <rect x="10" y="19" width="4" height="2" rx="0.5" />
      <rect x="17" y="19" width="4" height="2" rx="0.5" />
    </svg>
  );
}
export function ChatIcon({ size, className }: P) {
  return (
    <svg {...b(size, className)}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
export function SendIcon({ size, className }: P) {
  return (
    <svg {...b(size, className)}>
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}
