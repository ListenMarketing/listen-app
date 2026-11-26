/** Colori e font del canvas «Listen · app». */
export const colors = {
  bg: '#0B0F2B',
  card: '#141A3D',
  text: '#F4F5FA',
  textSoft: '#C3C7DE',
  muted: '#A6ABC8',
  accent: '#E9FF5A',
  onAccent: '#0B0F2B',
  green: '#5EE39B',
  red: '#FF8A80',
  violet: '#710BFF',
  violetSoft: '#C9B3FF',
  border: 'rgba(255,255,255,0.14)',
  borderSoft: 'rgba(255,255,255,0.08)',
  accentSoft: 'rgba(233,255,90,0.10)',
  greenSoft: 'rgba(94,227,155,0.12)',
  redSoft: 'rgba(255,138,128,0.12)',
  disabledBg: '#2A3058',
  disabledText: '#A6ABC8',
} as const;

export const fonts = {
  title: 'SpaceGrotesk_700Bold',
  titleMedium: 'SpaceGrotesk_500Medium',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemi: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
} as const;

export const radius = { sm: 12, md: 16, lg: 20 } as const;
export const space = { page: 20 } as const;
