/* ─────────────────────────────────────────────
   Minimal SVG icon library — 20×20 viewBox
   Usage: <Icon name="check" size={16} color="white" />
───────────────────────────────────────────── */

interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: React.CSSProperties;
}

const defaults = { size: 18, color: "currentColor", sw: 1.8 };

/* ── individual paths ── */
export function IconCheck({ size = defaults.size, color = defaults.color, strokeWidth = defaults.sw, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" style={style}>
      <path d="M4 10.5 L8 14.5 L16 6.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconX({ size = defaults.size, color = defaults.color, strokeWidth = defaults.sw, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" style={style}>
      <path d="M5 5 L15 15 M15 5 L5 15" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  );
}

export function IconArrowRight({ size = defaults.size, color = defaults.color, strokeWidth = defaults.sw, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" style={style}>
      <path d="M3 10 H17 M17 10 L11 4 M17 10 L11 16" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconArrowLeft({ size = defaults.size, color = defaults.color, strokeWidth = defaults.sw, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" style={style}>
      <path d="M17 10 H3 M3 10 L9 4 M3 10 L9 16" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconPlus({ size = defaults.size, color = defaults.color, strokeWidth = defaults.sw, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" style={style}>
      <path d="M10 4 V16 M4 10 H16" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  );
}

export function IconDollar({ size = defaults.size, color = defaults.color, strokeWidth = defaults.sw, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" style={style}>
      <path d="M10 3 V17 M7 6.5 C7 5.1 8.3 4 10 4 C11.7 4 13 5.1 13 6.5 C13 7.9 11.7 8.8 10 9 C8.1 9.2 6.5 10.2 6.5 11.8 C6.5 13.3 8.1 14.5 10 14.5 C11.9 14.5 13.5 13.3 13.5 11.8"
        stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  );
}

export function IconAlertTriangle({ size = defaults.size, color = defaults.color, strokeWidth = defaults.sw, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" style={style}>
      <path d="M10 3 L18 16 H2 Z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <line x1="10" y1="9" x2="10" y2="12.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <circle cx="10" cy="14.5" r="0.6" fill={color} />
    </svg>
  );
}

export function IconFileText({ size = defaults.size, color = defaults.color, strokeWidth = defaults.sw, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" style={style}>
      <rect x="4" y="2" width="12" height="16" rx="2" stroke={color} strokeWidth={strokeWidth} />
      <line x1="7" y1="7" x2="13" y2="7" stroke={color} strokeWidth={strokeWidth - 0.3} strokeLinecap="round" />
      <line x1="7" y1="10.5" x2="13" y2="10.5" stroke={color} strokeWidth={strokeWidth - 0.3} strokeLinecap="round" />
      <line x1="7" y1="14" x2="10" y2="14" stroke={color} strokeWidth={strokeWidth - 0.3} strokeLinecap="round" />
    </svg>
  );
}

export function IconShield({ size = defaults.size, color = defaults.color, strokeWidth = defaults.sw, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" style={style}>
      <path d="M10 2 L17 5 L17 10 C17 14 13.5 17.5 10 18 C6.5 17.5 3 14 3 10 L3 5 Z"
        stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
      <path d="M7 10 L9 12 L13 8" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconLink({ size = defaults.size, color = defaults.color, strokeWidth = defaults.sw, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" style={style}>
      <path d="M8 12.5 C6.2 12.5 4 11 4 8.5 C4 6 6.2 4.5 8 4.5 L11 4.5"
        stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <path d="M12 7.5 C13.8 7.5 16 9 16 11.5 C16 14 13.8 15.5 12 15.5 L9 15.5"
        stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1="7.5" y1="10" x2="12.5" y2="10" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  );
}

export function IconSparkle({ size = defaults.size, color = defaults.color, strokeWidth = defaults.sw, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" style={style}>
      <path d="M10 2 L11.5 8.5 L18 10 L11.5 11.5 L10 18 L8.5 11.5 L2 10 L8.5 8.5 Z"
        stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
    </svg>
  );
}

export function IconGlobe({ size = defaults.size, color = defaults.color, strokeWidth = defaults.sw, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" style={style}>
      <circle cx="10" cy="10" r="7.5" stroke={color} strokeWidth={strokeWidth} />
      <path d="M10 2.5 C8 5 7 7.5 7 10 C7 12.5 8 15 10 17.5 M10 2.5 C12 5 13 7.5 13 10 C13 12.5 12 15 10 17.5"
        stroke={color} strokeWidth={strokeWidth} />
      <line x1="2.5" y1="10" x2="17.5" y2="10" stroke={color} strokeWidth={strokeWidth} />
      <line x1="3.5" y1="7" x2="16.5" y2="7" stroke={color} strokeWidth={strokeWidth - 0.3} strokeOpacity={0.6} />
      <line x1="3.5" y1="13" x2="16.5" y2="13" stroke={color} strokeWidth={strokeWidth - 0.3} strokeOpacity={0.6} />
    </svg>
  );
}

export function IconWallet({ size = defaults.size, color = defaults.color, strokeWidth = defaults.sw, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" style={style}>
      <rect x="2" y="5" width="16" height="12" rx="2.5" stroke={color} strokeWidth={strokeWidth} />
      <path d="M2 8.5 H18" stroke={color} strokeWidth={strokeWidth - 0.2} />
      <path d="M14 4 L16 6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <circle cx="15" cy="12" r="1.5" fill={color} fillOpacity={0.7} />
    </svg>
  );
}

export function IconUpload({ size = defaults.size, color = defaults.color, strokeWidth = defaults.sw, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" style={style}>
      <path d="M10 13 V4 M6.5 7.5 L10 4 L13.5 7.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 14 V16 C4 17.1 4.9 18 6 18 H14 C15.1 18 16 17.1 16 16 V14"
        stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  );
}

export function IconCopy({ size = defaults.size, color = defaults.color, strokeWidth = defaults.sw, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" style={style}>
      <rect x="7" y="7" width="10" height="11" rx="2" stroke={color} strokeWidth={strokeWidth} />
      <path d="M7 7 V4.5 C7 3.4 7.9 2.5 9 2.5 H15.5 C16.6 2.5 17.5 3.4 17.5 4.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  );
}

export function IconExternalLink({ size = defaults.size, color = defaults.color, strokeWidth = defaults.sw, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" style={style}>
      <path d="M11 4 H16 V9" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 4 L9 11" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <path d="M8 5 H5 C3.9 5 3 5.9 3 7 V15 C3 16.1 3.9 17 5 17 H13 C14.1 17 15 16.1 15 15 V12"
        stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  );
}

export function IconInfo({ size = defaults.size, color = defaults.color, strokeWidth = defaults.sw, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" style={style}>
      <circle cx="10" cy="10" r="7.5" stroke={color} strokeWidth={strokeWidth} />
      <line x1="10" y1="9.5" x2="10" y2="14" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <circle cx="10" cy="7" r="0.7" fill={color} />
    </svg>
  );
}

export function IconCheckCircle({ size = defaults.size, color = defaults.color, strokeWidth = defaults.sw, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" style={style}>
      <circle cx="10" cy="10" r="7.5" stroke={color} strokeWidth={strokeWidth} />
      <path d="M6.5 10 L9 12.5 L13.5 7.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconXCircle({ size = defaults.size, color = defaults.color, strokeWidth = defaults.sw, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" style={style}>
      <circle cx="10" cy="10" r="7.5" stroke={color} strokeWidth={strokeWidth} />
      <path d="M7 7 L13 13 M13 7 L7 13" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  );
}

export function IconLoader({ size = defaults.size, color = defaults.color, strokeWidth = defaults.sw, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none"
      style={{ animation: "spinRing 1s linear infinite", ...style }}>
      <circle cx="10" cy="10" r="7" stroke={color} strokeWidth={strokeWidth} strokeOpacity={0.15} />
      <path d="M10 3 A7 7 0 0 1 17 10" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  );
}

export function IconSolana({ size = defaults.size, color = defaults.color, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" style={style}>
      <path d="M3 5.5 H14.5 L17 8 H5.5 Z" fill={color} fillOpacity={0.85} />
      <path d="M3 9.5 H14.5 L17 12 H5.5 Z" fill={color} fillOpacity={0.70} />
      <path d="M5.5 13.5 H17 L14.5 16 H3 Z" fill={color} fillOpacity={0.55} />
    </svg>
  );
}

export function IconDocument({ size = defaults.size, color = defaults.color, strokeWidth = defaults.sw, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" style={style}>
      <path d="M5 2 H12 L17 7 V18 H5 V2 Z" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
      <path d="M12 2 V7 H17" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
      <line x1="8" y1="11" x2="14" y2="11" stroke={color} strokeWidth={strokeWidth - 0.2} strokeLinecap="round" />
      <line x1="8" y1="14" x2="12" y2="14" stroke={color} strokeWidth={strokeWidth - 0.2} strokeLinecap="round" />
    </svg>
  );
}

export function IconStar({ size = defaults.size, color = defaults.color, strokeWidth = defaults.sw, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" style={style}>
      <path d="M10 2 L12.2 7.6 L18.2 8.2 L14 12.1 L15.3 18 L10 14.9 L4.7 18 L6 12.1 L1.8 8.2 L7.8 7.6 Z"
        stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
    </svg>
  );
}
