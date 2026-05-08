// src/components/ShipSVG.jsx
// Low poly industrial vehicle ship sprites

export default function ShipSVG({ size, isHorizontal = true, hit = false, sunk = false }) {
  const color = sunk ? '#E8622A' : hit ? '#EF4444' : '#F5A623';
  const dark = sunk ? '#8B2E0A' : hit ? '#991B1B' : '#B87B00';
  const steel = '#4A6FA5';
  const steelDark = '#2D4A7A';

  if (size === 1) {
    return (
      <svg viewBox="0 0 40 40" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        {/* Compact bulldozer / mini tank */}
        <polygon points="4,28 36,28 34,16 6,16" fill={steel} />
        <polygon points="6,16 34,16 30,10 10,10" fill={color} />
        <polygon points="10,10 30,10 28,6 12,6" fill={dark} />
        {/* Tracks */}
        <rect x="4" y="28" width="32" height="6" rx="3" fill={steelDark} />
        <rect x="6" y="29" width="4" height="4" rx="1" fill="#888" />
        <rect x="12" y="29" width="4" height="4" rx="1" fill="#888" />
        <rect x="18" y="29" width="4" height="4" rx="1" fill="#888" />
        <rect x="24" y="29" width="4" height="4" rx="1" fill="#888" />
        <rect x="30" y="29" width="4" height="4" rx="1" fill="#888" />
        {/* Cockpit */}
        <rect x="14" y="8" width="12" height="6" rx="1" fill="#1a1a2e" opacity="0.7" />
      </svg>
    );
  }

  if (size === 2) {
    return isHorizontal ? (
      <svg viewBox="0 0 88 40" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        {/* Dump truck - horizontal */}
        {/* Body */}
        <polygon points="4,30 84,30 80,18 8,18" fill={steel} />
        {/* Cab */}
        <polygon points="8,18 28,18 26,8 10,8" fill={color} />
        <polygon points="10,8 26,8 24,4 12,4" fill={dark} />
        {/* Dump bed */}
        <polygon points="30,18 80,18 78,10 32,10" fill={color} />
        <polygon points="78,10 80,18 84,18 82,8" fill={dark} />
        {/* Tracks */}
        <rect x="4" y="30" width="84" height="6" rx="3" fill={steelDark} />
        {[6,14,22,30,38,46,54,62,70,78].map((x, i) => (
          <rect key={i} x={x} y="31" width="5" height="4" rx="1" fill="#888" />
        ))}
        {/* Windows */}
        <rect x="12" y="7" width="10" height="7" rx="1" fill="#1a1a2e" opacity="0.7" />
        {/* Hydraulic arm */}
        <rect x="76" y="8" width="4" height="12" rx="1" fill={steelDark} />
      </svg>
    ) : (
      <svg viewBox="0 0 40 88" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        {/* Dump truck - vertical */}
        <polygon points="4,8 36,8 34,80 6,80" fill={steel} />
        <polygon points="6,8 34,8 30,4 10,4" fill={color} />
        <polygon points="4,40 36,40 36,55 4,55" fill={color} />
        <polygon points="4,55 36,55 38,80 2,80" fill={dark} />
        {/* Tracks */}
        <rect x="2" y="4" width="6" height="82" rx="3" fill={steelDark} />
        <rect x="32" y="4" width="6" height="82" rx="3" fill={steelDark} />
        {/* Windows */}
        <rect x="12" y="10" width="16" height="10" rx="1" fill="#1a1a2e" opacity="0.7" />
      </svg>
    );
  }

  if (size === 3) {
    return isHorizontal ? (
      <svg viewBox="0 0 136 40" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        {/* Crane / artillery - horizontal */}
        {/* Main hull */}
        <polygon points="4,30 132,30 128,20 8,20" fill={steel} />
        {/* Cab section */}
        <polygon points="8,20 30,20 28,10 10,10" fill={color} />
        <polygon points="10,10 28,10 26,5 12,5" fill={dark} />
        {/* Mid section */}
        <polygon points="32,20 90,20 88,12 34,12" fill={color} />
        {/* Turret/crane base */}
        <polygon points="92,20 128,20 126,12 94,12" fill={dark} />
        {/* Crane arm */}
        <polygon points="100,12 126,12 130,4 110,4" fill={color} />
        <rect x="128" y="4" width="4" height="8" rx="1" fill={steelDark} />
        {/* Barrel */}
        <rect x="110" y="6" width="24" height="4" rx="2" fill={steelDark} />
        {/* Tracks */}
        <rect x="4" y="30" width="132" height="7" rx="3" fill={steelDark} />
        {[6,14,22,30,38,46,54,62,70,78,86,94,102,110,118,126].map((x, i) => (
          <rect key={i} x={x} y="31" width="5" height="5" rx="1" fill="#888" />
        ))}
        {/* Windows */}
        <rect x="13" y="8" width="11" height="8" rx="1" fill="#1a1a2e" opacity="0.7" />
        {/* Exhaust */}
        <rect x="28" y="8" width="3" height="12" rx="1" fill={steelDark} />
        <rect x="34" y="6" width="3" height="14" rx="1" fill={steelDark} />
      </svg>
    ) : (
      <svg viewBox="0 0 40 136" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        {/* Crane - vertical */}
        <polygon points="6,4 34,4 36,132 4,132" fill={steel} />
        <polygon points="4,4 36,4 34,2 6,2" fill={dark} />
        {/* Cab */}
        <polygon points="8,4 32,4 30,32 10,32" fill={color} />
        {/* Mid platform */}
        <polygon points="4,50 36,50 36,70 4,70" fill={dark} />
        {/* Bottom crane section */}
        <polygon points="6,72 34,72 36,128 4,128" fill={color} />
        {/* Arm */}
        <rect x="16" y="2" width="8" height="30" rx="2" fill={steelDark} />
        {/* Tracks */}
        <rect x="2" y="4" width="6" height="132" rx="3" fill={steelDark} />
        <rect x="32" y="4" width="6" height="132" rx="3" fill={steelDark} />
        {/* Windows */}
        <rect x="10" y="8" width="20" height="12" rx="1" fill="#1a1a2e" opacity="0.7" />
      </svg>
    );
  }

  return null;
}
