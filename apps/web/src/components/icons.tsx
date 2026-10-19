// Inline SVG icons. 16-unit viewBox, round stroke, currentColor. Decorative, so aria-hidden.

interface IconProps {
  size?: number;
}

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

export function Logo({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" aria-hidden="true">
      <rect x="1" y="1" width="9" height="9" rx="2.5" className="logo-ink" />
      <rect x="12" y="1" width="9" height="9" rx="2.5" className="logo-blue" />
      <rect
        x="1.75"
        y="12.75"
        width="7.5"
        height="7.5"
        rx="2"
        className="logo-outline"
        strokeWidth="1.5"
      />
      <rect
        x="12.75"
        y="12.75"
        width="7.5"
        height="7.5"
        rx="2"
        className="logo-outline"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function MicIcon({ size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      aria-hidden="true"
      {...stroke}
      strokeWidth="1.5"
    >
      <rect x="5.5" y="1.5" width="5" height="8" rx="2.5" />
      <path d="M3 7.5a5 5 0 0 0 10 0M8 12.5V15" />
    </svg>
  );
}

export function InboxIcon({ size = 22 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      aria-hidden="true"
      {...stroke}
      strokeWidth="1.5"
    >
      <path d="M3.4 2.8h9.2L14.5 9v4.2h-13V9z" />
      <path d="M1.5 9h3.8l1 1.8h3.4l1-1.8h3.8" />
    </svg>
  );
}

export function PencilIcon({ size = 22 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      aria-hidden="true"
      {...stroke}
      strokeWidth="1.5"
    >
      <path d="M2.5 13.5l1-3.6 7.2-7.2a1.4 1.4 0 0 1 2 0l.6.6a1.4 1.4 0 0 1 0 2l-7.2 7.2z" />
      <path d="M9.5 3.9l2.6 2.6" />
    </svg>
  );
}

export function CheckIcon({ size = 18 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      aria-hidden="true"
      {...stroke}
      strokeWidth="2"
    >
      <path d="M3 8.5l3.2 3.2L13 4.8" />
    </svg>
  );
}

export function DesktopIcon({ size = 20 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      aria-hidden="true"
      {...stroke}
      strokeWidth="1.4"
    >
      <rect x="1.5" y="2.5" width="13" height="8.5" rx="1.5" />
      <path d="M5.5 14h5M8 11v3" />
    </svg>
  );
}
