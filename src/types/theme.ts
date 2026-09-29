export type CalendarThemeId = 
  | 'pink' 
  | 'blue' 
  | 'red' 
  | 'orange' 
  | 'black' 
  | 'yellow' 
  | 'white' 
  | 'green' 
  | 'purple' 
  | 'rainbow';

export interface ThemeConfig {
  id: CalendarThemeId;
  name: string;
  emoji: string;
  badge: string;
  description: string;
  swatch: string; // CSS color or gradient
  swatchBorder: string;
  
  // Tailwind utility classes for components
  appBg: string;
  surfaceBg: string;
  borderBase: string;
  borderStrong: string;
  textHeading: string;
  textBody: string;
  textMuted: string;
  
  // Primary gradient & buttons
  primaryGradient: string;
  primaryHoverGradient: string;
  primaryBtnText: string;
  primarySolid: string;
  
  // Header & Accents
  headerBg: string;
  headerBorder: string;
  accentSubtle: string;
  accentSubtleHover: string;
  accentSubtleText: string;
  
  // Time Indicator / Today Highlight
  todayHighlightBg: string;
  todayHighlightText: string;
  currentTimeLine: string;
  slotHover: string;
}

export const THEME_CONFIGS: Record<CalendarThemeId, ThemeConfig> = {
  pink: {
    id: 'pink',
    name: 'Barbie Pink 🎀',
    emoji: '💖',
    badge: 'Original Barbie',
    description: 'Iconic bubblegum pink, rose accents & sweet sparkle energy',
    swatch: '#EC4899',
    swatchBorder: '#DB2777',
    appBg: 'bg-pink-50/25',
    surfaceBg: 'bg-white',
    borderBase: 'border-pink-200/80',
    borderStrong: 'border-pink-300',
    textHeading: 'text-pink-950',
    textBody: 'text-pink-900',
    textMuted: 'text-pink-600',
    primaryGradient: 'from-pink-500 via-rose-500 to-pink-500',
    primaryHoverGradient: 'hover:from-pink-600 hover:to-rose-600',
    primaryBtnText: 'text-white',
    primarySolid: 'bg-pink-500',
    headerBg: 'bg-gradient-to-r from-pink-100/90 via-rose-50/80 to-pink-100/90',
    headerBorder: 'border-pink-200/90',
    accentSubtle: 'bg-pink-100/70',
    accentSubtleHover: 'hover:bg-pink-200/70',
    accentSubtleText: 'text-pink-700',
    todayHighlightBg: 'bg-pink-500',
    todayHighlightText: 'text-white',
    currentTimeLine: 'border-pink-500',
    slotHover: 'hover:bg-pink-100/40',
  },

  blue: {
    id: 'blue',
    name: 'Malibu Ocean Blue 🌊',
    emoji: '💙',
    badge: 'Malibu Sky',
    description: 'Refreshing ocean blue, clear sky gradients & cool coastal breeze',
    swatch: '#3B82F6',
    swatchBorder: '#2563EB',
    appBg: 'bg-blue-50/25',
    surfaceBg: 'bg-white',
    borderBase: 'border-blue-200/80',
    borderStrong: 'border-blue-300',
    textHeading: 'text-blue-950',
    textBody: 'text-blue-900',
    textMuted: 'text-blue-600',
    primaryGradient: 'from-blue-500 via-sky-500 to-blue-600',
    primaryHoverGradient: 'hover:from-blue-600 hover:to-sky-600',
    primaryBtnText: 'text-white',
    primarySolid: 'bg-blue-500',
    headerBg: 'bg-gradient-to-r from-blue-100/90 via-sky-50/80 to-blue-100/90',
    headerBorder: 'border-blue-200/90',
    accentSubtle: 'bg-blue-100/70',
    accentSubtleHover: 'hover:bg-blue-200/70',
    accentSubtleText: 'text-blue-700',
    todayHighlightBg: 'bg-blue-600',
    todayHighlightText: 'text-white',
    currentTimeLine: 'border-blue-600',
    slotHover: 'hover:bg-blue-100/40',
  },

  red: {
    id: 'red',
    name: 'Cherry Crimson Red 🍒',
    emoji: '❤️',
    badge: 'Bold Glam',
    description: 'Vibrant cherry red, ruby elegance & striking power presence',
    swatch: '#EF4444',
    swatchBorder: '#DC2626',
    appBg: 'bg-red-50/25',
    surfaceBg: 'bg-white',
    borderBase: 'border-red-200/80',
    borderStrong: 'border-red-300',
    textHeading: 'text-red-950',
    textBody: 'text-red-900',
    textMuted: 'text-red-600',
    primaryGradient: 'from-red-500 via-rose-600 to-red-600',
    primaryHoverGradient: 'hover:from-red-600 hover:to-rose-700',
    primaryBtnText: 'text-white',
    primarySolid: 'bg-red-500',
    headerBg: 'bg-gradient-to-r from-red-100/90 via-rose-50/80 to-red-100/90',
    headerBorder: 'border-red-200/90',
    accentSubtle: 'bg-red-100/70',
    accentSubtleHover: 'hover:bg-red-200/70',
    accentSubtleText: 'text-red-700',
    todayHighlightBg: 'bg-red-600',
    todayHighlightText: 'text-white',
    currentTimeLine: 'border-red-600',
    slotHover: 'hover:bg-red-100/40',
  },

  orange: {
    id: 'orange',
    name: 'Sunset Tangerine Orange 🍊',
    emoji: '🧡',
    badge: 'Sunset Glow',
    description: 'Warm coral, ripe tangerine & golden hour radiance',
    swatch: '#F97316',
    swatchBorder: '#EA580C',
    appBg: 'bg-orange-50/25',
    surfaceBg: 'bg-white',
    borderBase: 'border-orange-200/80',
    borderStrong: 'border-orange-300',
    textHeading: 'text-orange-950',
    textBody: 'text-orange-900',
    textMuted: 'text-orange-600',
    primaryGradient: 'from-orange-500 via-amber-500 to-orange-600',
    primaryHoverGradient: 'hover:from-orange-600 hover:to-amber-600',
    primaryBtnText: 'text-white',
    primarySolid: 'bg-orange-500',
    headerBg: 'bg-gradient-to-r from-orange-100/90 via-amber-50/80 to-orange-100/90',
    headerBorder: 'border-orange-200/90',
    accentSubtle: 'bg-orange-100/70',
    accentSubtleHover: 'hover:bg-orange-200/70',
    accentSubtleText: 'text-orange-800',
    todayHighlightBg: 'bg-orange-500',
    todayHighlightText: 'text-white',
    currentTimeLine: 'border-orange-500',
    slotHover: 'hover:bg-orange-100/40',
  },

  black: {
    id: 'black',
    name: 'Midnight Noir Black 🖤',
    emoji: '🖤',
    badge: 'Gothic Chic',
    description: 'Sophisticated onyx, obsidian slate & luxury dark modernism',
    swatch: '#0F172A',
    swatchBorder: '#334155',
    appBg: 'bg-slate-900 text-slate-100',
    surfaceBg: 'bg-slate-800/95 text-slate-100',
    borderBase: 'border-slate-700/80',
    borderStrong: 'border-slate-600',
    textHeading: 'text-white',
    textBody: 'text-slate-100',
    textMuted: 'text-slate-400',
    primaryGradient: 'from-slate-700 via-slate-800 to-black',
    primaryHoverGradient: 'hover:from-slate-600 hover:to-slate-900',
    primaryBtnText: 'text-white',
    primarySolid: 'bg-slate-800',
    headerBg: 'bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950',
    headerBorder: 'border-slate-800',
    accentSubtle: 'bg-slate-800',
    accentSubtleHover: 'hover:bg-slate-700',
    accentSubtleText: 'text-slate-200',
    todayHighlightBg: 'bg-white',
    todayHighlightText: 'text-black font-black',
    currentTimeLine: 'border-rose-500',
    slotHover: 'hover:bg-slate-800/50',
  },

  yellow: {
    id: 'yellow',
    name: 'Sunshine Buttercup Yellow 🌻',
    emoji: '💛',
    badge: 'Solar Daisy',
    description: 'Cheerful golden sunshine, warm honeycomb & cheerful optimism',
    swatch: '#EAB308',
    swatchBorder: '#CA8A04',
    appBg: 'bg-amber-50/25',
    surfaceBg: 'bg-white',
    borderBase: 'border-amber-200/80',
    borderStrong: 'border-amber-300',
    textHeading: 'text-amber-950',
    textBody: 'text-amber-900',
    textMuted: 'text-amber-700',
    primaryGradient: 'from-amber-400 via-yellow-500 to-amber-500',
    primaryHoverGradient: 'hover:from-amber-500 hover:to-yellow-600',
    primaryBtnText: 'text-amber-950 font-black',
    primarySolid: 'bg-amber-400',
    headerBg: 'bg-gradient-to-r from-amber-100/90 via-yellow-50/80 to-amber-100/90',
    headerBorder: 'border-amber-200/90',
    accentSubtle: 'bg-amber-100/80',
    accentSubtleHover: 'hover:bg-amber-200/80',
    accentSubtleText: 'text-amber-900',
    todayHighlightBg: 'bg-amber-400',
    todayHighlightText: 'text-amber-950 font-black',
    currentTimeLine: 'border-amber-500',
    slotHover: 'hover:bg-amber-100/40',
  },

  white: {
    id: 'white',
    name: 'Pure Pearl Cloud White 🤍',
    emoji: '🤍',
    badge: 'Minimal Pearl',
    description: 'Crisp clean aesthetic, silver frost accents & modern minimalism',
    swatch: '#FFFFFF',
    swatchBorder: '#CBD5E1',
    appBg: 'bg-slate-50',
    surfaceBg: 'bg-white',
    borderBase: 'border-slate-200',
    borderStrong: 'border-slate-300',
    textHeading: 'text-slate-900',
    textBody: 'text-slate-800',
    textMuted: 'text-slate-500',
    primaryGradient: 'from-slate-700 via-slate-800 to-slate-900',
    primaryHoverGradient: 'hover:from-slate-800 hover:to-slate-950',
    primaryBtnText: 'text-white',
    primarySolid: 'bg-slate-800',
    headerBg: 'bg-white border-b border-slate-200 shadow-2xs',
    headerBorder: 'border-slate-200',
    accentSubtle: 'bg-slate-100',
    accentSubtleHover: 'hover:bg-slate-200',
    accentSubtleText: 'text-slate-700',
    todayHighlightBg: 'bg-slate-900',
    todayHighlightText: 'text-white',
    currentTimeLine: 'border-slate-900',
    slotHover: 'hover:bg-slate-100/60',
  },

  green: {
    id: 'green',
    name: 'Mint Emerald Green 🍃',
    emoji: '💚',
    badge: 'Fresh Sage',
    description: 'Invigorating mint, lush forest emerald & soothing botanical calm',
    swatch: '#10B981',
    swatchBorder: '#059669',
    appBg: 'bg-emerald-50/25',
    surfaceBg: 'bg-white',
    borderBase: 'border-emerald-200/80',
    borderStrong: 'border-emerald-300',
    textHeading: 'text-emerald-950',
    textBody: 'text-emerald-900',
    textMuted: 'text-emerald-700',
    primaryGradient: 'from-emerald-500 via-teal-500 to-emerald-600',
    primaryHoverGradient: 'hover:from-emerald-600 hover:to-teal-600',
    primaryBtnText: 'text-white',
    primarySolid: 'bg-emerald-500',
    headerBg: 'bg-gradient-to-r from-emerald-100/90 via-teal-50/80 to-emerald-100/90',
    headerBorder: 'border-emerald-200/90',
    accentSubtle: 'bg-emerald-100/70',
    accentSubtleHover: 'hover:bg-emerald-200/70',
    accentSubtleText: 'text-emerald-800',
    todayHighlightBg: 'bg-emerald-600',
    todayHighlightText: 'text-white',
    currentTimeLine: 'border-emerald-600',
    slotHover: 'hover:bg-emerald-100/40',
  },

  purple: {
    id: 'purple',
    name: 'Royal Amethyst Purple 🔮',
    emoji: '💜',
    badge: 'Lavender Dream',
    description: 'Enchanting lavender, royal amethyst & mystical violet wonder',
    swatch: '#8B5CF6',
    swatchBorder: '#7C3AED',
    appBg: 'bg-purple-50/25',
    surfaceBg: 'bg-white',
    borderBase: 'border-purple-200/80',
    borderStrong: 'border-purple-300',
    textHeading: 'text-purple-950',
    textBody: 'text-purple-900',
    textMuted: 'text-purple-700',
    primaryGradient: 'from-purple-500 via-indigo-500 to-purple-600',
    primaryHoverGradient: 'hover:from-purple-600 hover:to-indigo-600',
    primaryBtnText: 'text-white',
    primarySolid: 'bg-purple-500',
    headerBg: 'bg-gradient-to-r from-purple-100/90 via-fuchsia-50/80 to-purple-100/90',
    headerBorder: 'border-purple-200/90',
    accentSubtle: 'bg-purple-100/70',
    accentSubtleHover: 'hover:bg-purple-200/70',
    accentSubtleText: 'text-purple-800',
    todayHighlightBg: 'bg-purple-600',
    todayHighlightText: 'text-white',
    currentTimeLine: 'border-purple-600',
    slotHover: 'hover:bg-purple-100/40',
  },

  rainbow: {
    id: 'rainbow',
    name: 'Prismatic Rainbow Magic 🌈',
    emoji: '🌈',
    badge: 'Multi-Chrome',
    description: 'Vibrant iridescent spectrum with dazzling multi-colored sparkles',
    swatch: 'linear-gradient(135deg, #EF4444 0%, #F97316 20%, #EAB308 40%, #10B981 60%, #3B82F6 80%, #8B5CF6 100%)',
    swatchBorder: '#EC4899',
    appBg: 'bg-gradient-to-br from-pink-50/40 via-sky-50/30 to-amber-50/30',
    surfaceBg: 'bg-white/95 backdrop-blur-xs',
    borderBase: 'border-pink-200/80',
    borderStrong: 'border-purple-300',
    textHeading: 'text-purple-950',
    textBody: 'text-slate-900',
    textMuted: 'text-pink-600',
    primaryGradient: 'from-pink-500 via-amber-500 via-emerald-500 to-blue-500',
    primaryHoverGradient: 'hover:opacity-90',
    primaryBtnText: 'text-white font-extrabold',
    primarySolid: 'bg-gradient-to-r from-pink-500 via-yellow-400 to-cyan-400',
    headerBg: 'bg-gradient-to-r from-pink-100/80 via-yellow-100/60 via-emerald-100/60 to-sky-100/80',
    headerBorder: 'border-pink-300/80',
    accentSubtle: 'bg-gradient-to-r from-pink-100/60 to-purple-100/60',
    accentSubtleHover: 'hover:from-pink-200/80 hover:to-purple-200/80',
    accentSubtleText: 'text-purple-900',
    todayHighlightBg: 'bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500',
    todayHighlightText: 'text-white font-extrabold',
    currentTimeLine: 'border-pink-500',
    slotHover: 'hover:bg-gradient-to-r hover:from-pink-50/50 hover:to-sky-50/50',
  },
};
