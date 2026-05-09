interface LogoMarkProps {
  size?: number;
  id?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function LogoMark({ size = 40, id = "cg", className, style }: LogoMarkProps) {
  const h = Math.round(size * 240 / 200);
  const ck  = `${id}-ck`;
  const cks = `${id}-cks`;
  const cb  = `${id}-cb`;
  const sg  = `${id}-sg`;
  const dsf = `${id}-dsf`;

  return (
    <svg width={size} height={h} viewBox="0 0 200 240" fill="none"
      xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      <defs>
        <linearGradient id={ck} x1="100" y1="12" x2="100" y2="80" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#FFE040"/>
          <stop offset="55%"  stopColor="#FFAA00"/>
          <stop offset="100%" stopColor="#D68000"/>
        </linearGradient>
        <linearGradient id={cks} x1="100" y1="28" x2="100" y2="80" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#FFCC30"/>
          <stop offset="100%" stopColor="#C87800"/>
        </linearGradient>
        <linearGradient id={cb} x1="52" y1="74" x2="148" y2="74" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#A86000"/>
          <stop offset="40%"  stopColor="#F5A200"/>
          <stop offset="60%"  stopColor="#F5A200"/>
          <stop offset="100%" stopColor="#A86000"/>
        </linearGradient>
        <linearGradient id={sg} x1="100" y1="78" x2="100" y2="213" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#FFFFFF" stopOpacity="0.98"/>
          <stop offset="100%" stopColor="#D2D2E6" stopOpacity="0.96"/>
        </linearGradient>
        <filter id={dsf} x="-30%" y="-12%" width="160%" height="140%">
          <feDropShadow dx="2" dy="5" stdDeviation="8" floodColor="rgba(0,0,0,0.22)"/>
        </filter>
      </defs>

      {/* ── Crown: left spike ── */}
      <path d="M62,80 L69,28 L76,80 Z" fill={`url(#${cks})`}/>
      <path d="M69,28 L76,80 L71,80 L69,34 Z" fill="rgba(0,0,0,0.17)"/>
      <path d="M69,28 L62,80 L67,80 L69,34 Z" fill="rgba(255,255,190,0.10)"/>

      {/* ── Crown: centre spike (tallest) ── */}
      <path d="M88,80 L100,12 L100,80 Z" fill={`url(#${ck})`}/>
      <path d="M100,12 L112,80 L100,80 Z" fill="#D07800"/>
      <path d="M100,12 L112,80 L107,80 L100,18 Z" fill="rgba(0,0,0,0.13)"/>

      {/* ── Crown: right spike ── */}
      <path d="M124,80 L131,28 L138,80 Z" fill={`url(#${cks})`}/>
      <path d="M131,28 L138,80 L133,80 L131,34 Z" fill="rgba(0,0,0,0.17)"/>
      <path d="M131,28 L124,80 L129,80 L131,34 Z" fill="rgba(255,255,190,0.10)"/>

      {/* ── Crown band ── */}
      <path d="M52,72 L148,72 L152,84 L48,84 Z" fill={`url(#${cb})`}/>
      <path d="M54,72 L146,72 L148,77 L52,77 Z" fill="rgba(255,232,130,0.28)"/>
      <path d="M50,80 L150,80 L152,84 L48,84 Z" fill="rgba(0,0,0,0.10)"/>

      {/* ── Shield body ── */}
      <path d="M100,78 L158,108 L148,178 L100,213 L52,178 L42,108 Z"
        fill={`url(#${sg})`} filter={`url(#${dsf})`}/>
      <path d="M100,80 L148,108 L140,113 Q120,92 100,88 Q80,92 60,113 L52,108 Z"
        fill="rgba(255,255,255,0.26)"/>
      <path d="M154,112 L158,108 L148,178 L143,172 L152,116 Z" fill="rgba(0,0,0,0.058)"/>
      <path d="M148,178 L100,213 L106,209 L146,174 Z" fill="rgba(0,0,0,0.050)"/>

      {/* ── Inner mark: two rounded peaks ── */}
      <ellipse cx="78"  cy="96" rx="11" ry="7.5" fill="rgba(202,205,232,0.80)"/>
      <ellipse cx="122" cy="96" rx="11" ry="7.5" fill="rgba(202,205,232,0.80)"/>
      <ellipse cx="76"  cy="93" rx="6.5" ry="4"  fill="rgba(242,243,255,0.55)"/>
      <ellipse cx="120" cy="93" rx="6.5" ry="4"  fill="rgba(242,243,255,0.55)"/>

      {/* ── Upper-left arm ── */}
      <path d="M55,104 L100,114 L100,135 L55,126 Z"  fill="rgba(204,207,233,0.86)"/>
      <path d="M55,104 L100,114 L100,121 L55,111 Z"  fill="rgba(244,245,255,0.91)"/>
      <path d="M100,114 L100,135 L95,135 L95,118 Z"  fill="rgba(158,162,198,0.55)"/>

      {/* ── Upper-right arm ── */}
      <path d="M145,104 L100,114 L100,135 L145,126 Z" fill="rgba(204,207,233,0.86)"/>
      <path d="M145,104 L100,114 L100,121 L145,111 Z" fill="rgba(244,245,255,0.91)"/>
      <path d="M100,114 L100,135 L105,135 L105,118 Z" fill="rgba(158,162,198,0.55)"/>

      {/* ── Lower-left arm ── */}
      <path d="M55,127 L100,136 L100,161 L55,150 Z"  fill="rgba(206,209,235,0.83)"/>
      <path d="M55,127 L100,136 L100,143 L55,134 Z"  fill="rgba(242,243,255,0.90)"/>
      <path d="M100,136 L100,161 L95,161 L95,140 Z"  fill="rgba(158,162,198,0.50)"/>

      {/* ── Lower-right arm ── */}
      <path d="M145,127 L100,136 L100,161 L145,150 Z" fill="rgba(206,209,235,0.83)"/>
      <path d="M145,127 L100,136 L100,143 L145,134 Z" fill="rgba(242,243,255,0.90)"/>
      <path d="M100,136 L100,161 L105,161 L105,140 Z" fill="rgba(158,162,198,0.50)"/>

      {/* ── Centre junction ── */}
      <path d="M96,130 L100,134 L104,130 L100,126 Z" fill="rgba(185,190,220,0.92)"/>

      {/* ── Bottom arrow ── */}
      <path d="M80,163 L100,178 L120,163 L100,168 Z" fill="rgba(192,196,224,0.83)"/>
      <path d="M80,163 L120,163 L117,168 L83,168 Z"  fill="rgba(237,239,255,0.88)"/>
    </svg>
  );
}
