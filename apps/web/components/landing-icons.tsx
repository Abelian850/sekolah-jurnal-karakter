/**
 * Ikon garis sederhana (inline SVG) untuk landing & login — tanpa
 * dependensi ikon tambahan.
 */
type P = { className?: string };

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export const IconPencil = ({ className = "h-5 w-5" }: P) => (
  <svg {...base} className={className}>
    <path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3z" />
    <path d="M13.5 8.5l2 2" />
  </svg>
);

export const IconBadgeCheck = ({ className = "h-5 w-5" }: P) => (
  <svg {...base} className={className}>
    <path d="M12 3l2.4 1.6 2.9-.2.9 2.8 2.3 1.8-1 2.7 1 2.7-2.3 1.8-.9 2.8-2.9-.2L12 21l-2.4-1.6-2.9.2-.9-2.8-2.3-1.8 1-2.7-1-2.7 2.3-1.8.9-2.8 2.9.2z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

export const IconChart = ({ className = "h-5 w-5" }: P) => (
  <svg {...base} className={className}>
    <path d="M4 20V4" />
    <path d="M4 20h16" />
    <path d="M8 16v-5M12 16V8M16 16v-3" />
  </svg>
);

export const IconChat = ({ className = "h-5 w-5" }: P) => (
  <svg {...base} className={className}>
    <path d="M5 18l-1 3 3.5-1.5A8.5 8.5 0 1 0 4 12c0 2.2.8 4.2 2.2 5.7" />
    <path d="M9 11h6M9 14h4" />
  </svg>
);

export const IconSliders = ({ className = "h-5 w-5" }: P) => (
  <svg {...base} className={className}>
    <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
    <circle cx="16" cy="7" r="2" />
    <circle cx="10" cy="17" r="2" />
  </svg>
);

export const IconCamera = ({ className = "h-4 w-4" }: P) => (
  <svg {...base} className={className}>
    <path d="M4 8h3l1.5-2h7L17 8h3v11H4z" />
    <circle cx="12" cy="13" r="3.2" />
  </svg>
);

export const IconCheck = ({ className = "h-4 w-4" }: P) => (
  <svg {...base} strokeWidth={2.4} className={className}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);

export const IconChevron = ({ className = "h-4 w-4" }: P) => (
  <svg {...base} strokeWidth={2} className={className}>
    <path d="M6 9l6 6 6-6" />
  </svg>
);

export const IconSun = ({ className = "h-5 w-5" }: P) => (
  <svg {...base} className={className}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);

export const IconMoon = ({ className = "h-5 w-5" }: P) => (
  <svg {...base} className={className}>
    <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
  </svg>
);
