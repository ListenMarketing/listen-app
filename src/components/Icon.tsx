import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors } from '@/lib/theme';

/** Icone a tratto riprese dal design (nessuna emoji, nessuna libreria di icone). */
export type IconName =
  | 'arrow' | 'back' | 'check' | 'external' | 'heart' | 'play' | 'pause' | 'home' | 'note' | 'trophy' | 'megaphone'
  | 'user' | 'mic' | 'studio' | 'mixer' | 'clock' | 'bell' | 'phone' | 'flag' | 'search' | 'close' | 'upload' | 'lock' | 'chevron';

type Props = { name: IconName; size?: number; color?: string; filled?: boolean; strokeWidth?: number };

export function Icon({ name, size = 20, color = colors.text, filled = false, strokeWidth = 2 }: Props) {
  const common = { stroke: color, strokeWidth, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  const body = (() => {
    switch (name) {
      case 'arrow': return <Path {...common} d="M5 12h14M13 6l6 6-6 6" />;
      case 'back': return <Path {...common} d="M15 6l-6 6 6 6" />;
      case 'chevron': return <Path {...common} d="M9 6l6 6-6 6" />;
      case 'check': return <Path {...common} d="M5 12l5 5L20 7" />;
      case 'external': return <Path {...common} d="M7 17L17 7M9 7h8v8" />;
      case 'heart': return <Path {...common} fill={filled ? color : 'none'} d="M12 21s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.6-7 10-7 10z" />;
      case 'play': return <Path {...common} fill={color} d="M8 5l11 7-11 7z" />;
      case 'pause': return <Path {...common} d="M8 5v14M16 5v14" />;
      case 'home': return <Path {...common} d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />;
      case 'note': return (<><Path {...common} d="M9 18V6l12-2v12" /><Circle {...common} cx={6} cy={18} r={3} /><Circle {...common} cx={18} cy={16} r={3} /></>);
      case 'trophy': return <Path {...common} d="M8 21h8M12 17v4M6 4h12v3a6 6 0 0 1-12 0zM6 6H3v2a3 3 0 0 0 3 3M18 6h3v2a3 3 0 0 1-3 3" />;
      case 'megaphone': return (<><Path {...common} d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1z" /><Path {...common} d="M15 9a4 4 0 0 1 0 6M18 6a8 8 0 0 1 0 12" /></>);
      case 'user': return (<><Circle {...common} cx={12} cy={8} r={4} /><Path {...common} d="M4 21c0-4 3.6-7 8-7s8 3 8 7" /></>);
      case 'mic': return (<><Rect {...common} x={9} y={3} width={6} height={11} rx={3} /><Path {...common} d="M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8" /></>);
      case 'studio': return (<><Path {...common} d="M3 21V8l9-5 9 5v13" /><Path {...common} d="M9 21v-6h6v6" /></>);
      case 'mixer': return (<><Rect {...common} x={3} y={5} width={18} height={14} rx={2} /><Path {...common} d="M7 15V9M11 15v-4M15 15V8M19 15v-2" /></>);
      case 'clock': return (<><Circle {...common} cx={12} cy={12} r={9} /><Path {...common} d="M12 8v4l3 2" /></>);
      case 'bell': return <Path {...common} d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 21h4" />;
      case 'phone': return <Path {...common} d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z" />;
      case 'flag': return <Path {...common} d="M5 21V4M5 4h12l-2 4 2 4H5" />;
      case 'search': return (<><Circle {...common} cx={11} cy={11} r={7} /><Path {...common} d="M20 20l-4-4" /></>);
      case 'close': return <Path {...common} d="M6 6l12 12M18 6L6 18" />;
      case 'upload': return <Path {...common} d="M12 16V4M7 9l5-5 5 5M4 20h16" />;
      case 'lock': return (<><Rect {...common} x={5} y={11} width={14} height={10} rx={2} /><Path {...common} d="M8 11V8a4 4 0 0 1 8 0v3" /></>);
    }
  })();
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {body}
    </Svg>
  );
}
