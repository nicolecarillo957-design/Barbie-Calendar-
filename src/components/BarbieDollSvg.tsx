import React from 'react';
import { 
  DollOutfitState, 
  DollGender,
  SkinToneId, 
  EyeColorId,
  EyeGazeId,
  HairstyleId, 
  OutfitId, 
  ShoesId, 
  AccessoryId, 
  SceneId 
} from '../types/doll';

interface BarbieDollSvgProps {
  state: DollOutfitState;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showBackground?: boolean;
  className?: string;
}

// Blythe Skin Tones (porcelain doll finishes)
const SKIN_COLORS: Record<SkinToneId, { body: string; shadow: string; blush: string; lips: string }> = {
  'porcelain-fair': { body: '#FFF0EA', shadow: '#F3D2C5', blush: '#FF99B8', lips: '#F43F5E' },
  'peach-tan': { body: '#FCD7C1', shadow: '#E9B397', blush: '#FB7185', lips: '#E11D48' },
  'warm-honey': { body: '#DC9D6C', shadow: '#BE7E4C', blush: '#D9778A', lips: '#BE123C' },
  'deep-espresso': { body: '#7C482C', shadow: '#582E19', blush: '#9F485B', lips: '#881337' },
};

// Blythe Eye Colors (glass eye-chips)
const EYE_COLORS: Record<EyeColorId, { main: string; dark: string; light: string }> = {
  'sapphire-blue': { main: '#0284C7', dark: '#0369A1', light: '#7DD3FC' },
  'emerald-green': { main: '#059669', dark: '#047857', light: '#6EE7B7' },
  'ruby-pink': { main: '#E11D48', dark: '#BE123C', light: '#FDA4AF' },
  'golden-hazel': { main: '#D97706', dark: '#B45309', light: '#FDE68A' },
  'violet-dream': { main: '#7C3AED', dark: '#6D28D9', light: '#C4B5FD' },
};

// Hair Palettes
const HAIR_COLORS: Record<HairstyleId, { main: string; highlight: string; shadow: string }> = {
  // Girl styles
  'blythe-signature-bangs': { main: '#FDE047', highlight: '#FEF9C3', shadow: '#CA8A04' },
  'twin-doll-braids': { main: '#4A2810', highlight: '#78431E', shadow: '#2E1505' },
  'fluffy-bubble-curls': { main: '#C2410C', highlight: '#FDBA74', shadow: '#7C2D12' },
  'space-buns-pink': { main: '#F472B6', highlight: '#FCE7F3', shadow: '#DB2777' },
  // Boy styles
  'boy-shaggy-tousled': { main: '#1E293B', highlight: '#475569', shadow: '#0F172A' },
  'boy-curly-mop': { main: '#78350F', highlight: '#D97706', shadow: '#451A03' },
  'boy-middle-part': { main: '#EAB308', highlight: '#FEF08A', shadow: '#A16207' },
  'boy-undercut-cool': { main: '#334155', highlight: '#64748B', shadow: '#1E293B' },
};

export const BarbieDollSvg: React.FC<BarbieDollSvgProps> = ({
  state,
  size = 'md',
  showBackground = true,
  className = '',
}) => {
  const { gender, skinTone, eyeColor, eyeGaze, hairstyle, outfit, shoes, accessory, scene } = state;
  const skin = SKIN_COLORS[skinTone] || SKIN_COLORS['porcelain-fair'];
  const eyes = EYE_COLORS[eyeColor] || EYE_COLORS['sapphire-blue'];
  const hair = HAIR_COLORS[hairstyle] || (gender === 'boy' ? HAIR_COLORS['boy-shaggy-tousled'] : HAIR_COLORS['blythe-signature-bangs']);

  const sizeClasses = {
    sm: 'w-24 h-32',
    md: 'w-44 h-60',
    lg: 'w-64 h-88',
    xl: 'w-80 h-112',
    full: 'w-full h-full',
  }[size];

  // Eye Gaze Shift Coordinates (signature Blythe eye mechanism)
  const gazeOffset = eyeGaze === 'left' ? -3.5 : eyeGaze === 'right' ? 3.5 : 0;

  return (
    <div className={`relative flex items-center justify-center select-none ${sizeClasses} ${className}`}>
      <svg
        viewBox="0 0 320 440"
        className="w-full h-full drop-shadow-md overflow-hidden rounded-2xl"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Gradients */}
          <linearGradient id="blytheHeadGlow" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.0" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.1" />
          </linearGradient>

          {/* Denim Textures */}
          <linearGradient id="blueDenimWash" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="50%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#1D4ED8" />
          </linearGradient>

          <linearGradient id="lightDenim" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#93C5FD" />
            <stop offset="50%" stopColor="#60A5FA" />
            <stop offset="100%" stopColor="#3B82F6" />
          </linearGradient>

          <linearGradient id="darkDenim" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1E3A8A" />
            <stop offset="100%" stopColor="#0F172A" />
          </linearGradient>

          {/* Eye Chip Gradient */}
          <radialGradient id="blytheIrisGradient" cx="45%" cy="45%" r="50%">
            <stop offset="0%" stopColor={eyes.light} />
            <stop offset="55%" stopColor={eyes.main} />
            <stop offset="90%" stopColor={eyes.dark} />
            <stop offset="100%" stopColor="#0F172A" />
          </radialGradient>

          {/* Gingham Pattern */}
          <pattern id="dollGingham" width="14" height="14" patternUnits="userSpaceOnUse">
            <rect width="14" height="14" fill="#F43F5E" />
            <rect width="7" height="7" fill="#FFFFFF" opacity="0.8" />
            <rect x="7" y="7" width="7" height="7" fill="#FFFFFF" opacity="0.8" />
            <rect width="7" height="7" fill="#FB7185" opacity="0.4" />
          </pattern>

          {/* Scene Gradients */}
          <linearGradient id="dollhouseWallpaper" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FCE7F3" />
            <stop offset="60%" stopColor="#FBCFE8" />
            <stop offset="100%" stopColor="#FED7AA" />
          </linearGradient>

          <linearGradient id="pastelCafeScene" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#E0E7FF" />
            <stop offset="60%" stopColor="#FCE7F3" />
            <stop offset="100%" stopColor="#FEF08A" />
          </linearGradient>

          <linearGradient id="vintageGardenScene" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#DCFCE7" />
            <stop offset="60%" stopColor="#A7F3D0" />
            <stop offset="100%" stopColor="#FEF3C7" />
          </linearGradient>

          <linearGradient id="skateParkScene" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#C084FC" />
            <stop offset="50%" stopColor="#FB7185" />
            <stop offset="100%" stopColor="#FBBF24" />
          </linearGradient>

          <linearGradient id="dreamClosetScene" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#831843" />
            <stop offset="60%" stopColor="#BE185D" />
            <stop offset="100%" stopColor="#FDA4AF" />
          </linearGradient>

          <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* 1. SCENE BACKGROUND */}
        {showBackground && (
          <g id="sceneBackground">
            {scene === 'dollhouse-room' && (
              <g>
                <rect width="320" height="440" fill="url(#dollhouseWallpaper)" />
                {/* Vintage floral stripes */}
                <line x1="40" y1="0" x2="40" y2="440" stroke="#F472B6" strokeWidth="1" strokeDasharray="6 4" opacity="0.4" />
                <line x1="80" y1="0" x2="80" y2="440" stroke="#F472B6" strokeWidth="1" strokeDasharray="6 4" opacity="0.4" />
                <line x1="240" y1="0" x2="240" y2="440" stroke="#F472B6" strokeWidth="1" strokeDasharray="6 4" opacity="0.4" />
                <line x1="280" y1="0" x2="280" y2="440" stroke="#F472B6" strokeWidth="1" strokeDasharray="6 4" opacity="0.4" />
                {/* Dollhouse Baseboard & Wooden Floor */}
                <rect y="380" width="320" height="60" fill="#E2BA96" />
                <rect y="375" width="320" height="7" fill="#FFFFFF" />
                <line x1="0" y1="410" x2="320" y2="410" stroke="#CA966E" strokeWidth="1.5" />
                {/* Cute mini bunting banner */}
                <path d="M10,25 Q80,50 160,25 Q240,50 310,25" stroke="#F472B6" strokeWidth="1.5" fill="none" />
                <polygon points="50,33 60,35 55,48" fill="#F43F5E" />
                <polygon points="90,40 100,41 95,54" fill="#38BDF8" />
                <polygon points="130,34 140,33 135,46" fill="#FACC15" />
                <polygon points="180,33 190,34 185,47" fill="#4ADE80" />
                <polygon points="220,40 230,39 225,52" fill="#EC4899" />
                <polygon points="260,33 270,31 265,44" fill="#A855F7" />
              </g>
            )}

            {scene === 'pastel-cafe' && (
              <g>
                <rect width="320" height="440" fill="url(#pastelCafeScene)" />
                <rect y="340" width="320" height="100" fill="#CBD5E1" opacity="0.5" />
                <circle cx="60" cy="80" r="35" fill="#FFFFFF" opacity="0.3" />
                <circle cx="260" cy="110" r="28" fill="#FFFFFF" opacity="0.3" />
                {/* Checkerboard cafe floor */}
                <path d="M0,380 L320,380 M0,410 L320,410" stroke="#FFFFFF" strokeWidth="1.5" opacity="0.7" />
                <line x1="80" y1="340" x2="40" y2="440" stroke="#FFFFFF" strokeWidth="1.5" opacity="0.7" />
                <line x1="160" y1="340" x2="140" y2="440" stroke="#FFFFFF" strokeWidth="1.5" opacity="0.7" />
                <line x1="240" y1="340" x2="240" y2="440" stroke="#FFFFFF" strokeWidth="1.5" opacity="0.7" />
              </g>
            )}

            {scene === 'vintage-garden' && (
              <g>
                <rect width="320" height="440" fill="url(#vintageGardenScene)" />
                <circle cx="280" cy="50" r="35" fill="#FEF08A" opacity="0.6" filter="url(#softGlow)" />
                {/* Flowers & Vines */}
                <path d="M0,0 Q30,120 0,220 M320,0 Q290,120 320,220" stroke="#15803D" strokeWidth="3" fill="none" opacity="0.5" />
                <circle cx="25" cy="60" r="8" fill="#FB7185" />
                <circle cx="20" cy="140" r="9" fill="#F472B6" />
                <circle cx="300" cy="90" r="8" fill="#FB7185" />
                <circle cx="295" cy="170" r="9" fill="#F472B6" />
                {/* Grass lawn */}
                <rect y="370" width="320" height="70" fill="#86EFAC" />
                <path d="M0,370 Q80,360 160,370 T320,370 L320,440 L0,440 Z" fill="#4ADE80" />
              </g>
            )}

            {scene === 'skate-park' && (
              <g>
                <rect width="320" height="440" fill="url(#skateParkScene)" />
                <rect y="350" width="320" height="90" fill="#334155" />
                <line x1="0" y1="370" x2="320" y2="370" stroke="#F59E0B" strokeWidth="3" strokeDasharray="16 10" />
                <polygon points="20,120 40,80 70,110 50,150" fill="#FFFFFF" opacity="0.15" />
                <polygon points="250,80 280,50 300,90 280,120" fill="#FFFFFF" opacity="0.15" />
              </g>
            )}

            {scene === 'dream-closet' && (
              <g>
                <rect width="320" height="440" fill="url(#dreamClosetScene)" />
                <rect x="25" y="25" width="270" height="390" rx="16" fill="#FCE7F3" opacity="0.15" stroke="#FDE047" strokeWidth="2.5" />
                <circle cx="160" cy="40" r="14" fill="#FDE047" opacity="0.8" />
              </g>
            )}
          </g>
        )}

        {/* 2. DOLL BACK HAIR LAYER (Behind shoulders) */}
        {gender === 'girl' && hairstyle === 'blythe-signature-bangs' && (
          <path
            d="M85,130 C65,180 60,260 75,340 C85,365 110,360 120,320 C105,260 100,190 105,150 Z 
               M235,130 C255,180 260,260 245,340 C235,365 210,360 200,320 C215,260 220,190 215,150 Z"
            fill={hair.shadow}
          />
        )}

        {gender === 'girl' && hairstyle === 'twin-doll-braids' && (
          <path
            d="M80,140 C65,200 65,300 75,370 C80,385 105,380 100,340 C95,280 95,200 105,150 Z 
               M240,140 C255,200 255,300 245,370 C240,385 215,380 220,340 C225,280 225,200 215,150 Z"
            fill={hair.shadow}
          />
        )}

        {gender === 'girl' && hairstyle === 'fluffy-bubble-curls' && (
          <path
            d="M75,130 C50,190 50,290 70,350 C90,370 115,340 115,300 C95,240 95,180 105,150 Z 
               M245,130 C270,190 270,290 250,350 C230,370 205,340 205,300 C225,240 225,180 215,150 Z"
            fill={hair.shadow}
          />
        )}

        {/* 3. BLYTHE DOLL BODY FOUNDATION */}
        {/* Blythe has a dainty petite body with poseable legs & cute small hands */}
        <g id="blytheBody">
          {/* Slender Legs */}
          {/* Left Leg */}
          <path
            d="M142,260 C140,290 138,335 140,385 C141,396 138,406 136,416 L148,416 C151,406 151,396 150,385 C152,335 152,290 153,260 Z"
            fill={skin.body}
          />
          {/* Right Leg */}
          <path
            d="M167,260 C168,290 168,335 170,385 C169,396 170,406 174,416 L186,416 C183,406 182,396 183,385 C185,335 180,290 178,260 Z"
            fill={skin.body}
          />

          {/* Dainty Torso */}
          <path
            d="M136,170 C136,155 184,155 184,170 C188,190 180,215 176,235 C172,250 182,265 180,275 L140,275 C138,265 148,250 144,235 C140,215 132,190 136,170 Z"
            fill={skin.body}
          />

          {/* Petite Doll Neck */}
          <path d="M153,138 L153,165 Q160,168 167,165 L167,138 Z" fill={skin.body} />

          {/* Arms */}
          {/* Left Arm (Posed gracefully) */}
          <path
            d="M136,170 C124,190 114,215 118,238 C120,248 130,242 136,234 L140,242 C128,254 112,252 108,238 C104,210 118,182 132,166 Z"
            fill={skin.body}
          />
          <circle cx="137" cy="240" r="5" fill={skin.body} />

          {/* Right Arm */}
          <path
            d="M184,170 C196,190 206,215 204,238 C202,248 192,242 186,234 L182,242 C194,254 210,252 214,238 C218,210 204,182 190,166 Z"
            fill={skin.body}
          />
          <circle cx="184" cy="240" r="5" fill={skin.body} />
        </g>

        {/* 4. OUTFITS LAYER (DRESSES, JEANS, STREETWEAR) */}
        <g id="outfits">
          {/* 1. Vintage Lace Blythe Dress */}
          {outfit === 'vintage-lace-dress' && (
            <g id="outfit-vintage-lace">
              {/* Victorian doll dress with lace bib and Peter Pan collar */}
              <path
                d="M136,168 L184,168 L188,230 L132,230 Z"
                fill="#F472B6"
                stroke="#DB2777"
                strokeWidth="1.2"
              />
              {/* White Lace Bib */}
              <path d="M144,168 Q160,188 176,168 L170,205 Q160,215 150,205 Z" fill="#FFFFFF" stroke="#FBCFE8" strokeWidth="1" />
              {/* Little pink ribbon bow */}
              <circle cx="160" cy="174" r="3" fill="#E11D48" />
              <path d="M156,174 L152,184 M164,174 L168,184" stroke="#E11D48" strokeWidth="1.5" />
              {/* Tiered Doll Skirt with Lace Trim */}
              <path
                d="M132,230 C114,260 98,300 102,325 C125,332 195,332 218,325 C222,300 206,260 188,230 Z"
                fill="#F472B6"
                stroke="#DB2777"
                strokeWidth="1.5"
              />
              <path
                d="M102,325 Q118,332 134,326 Q150,333 166,327 Q182,333 198,326 Q214,332 218,325"
                stroke="#FFFFFF"
                strokeWidth="4"
                strokeLinecap="round"
                fill="none"
              />
            </g>
          )}

          {/* 2. Pink Gingham Pinafore Dress */}
          {outfit === 'gingham-pinafore' && (
            <g id="outfit-gingham-pinafore">
              {/* White puffed doll blouse under pinafore */}
              <path d="M134,165 L186,165 L186,195 L134,195 Z" fill="#FFFFFF" />
              <ellipse cx="128" cy="175" rx="8" ry="10" fill="#FFFFFF" />
              <ellipse cx="192" cy="175" rx="8" ry="10" fill="#FFFFFF" />
              {/* Gingham Pinafore straps & bib */}
              <rect x="144" y="165" width="32" height="40" fill="url(#dollGingham)" stroke="#E11D48" strokeWidth="1" />
              <line x1="148" y1="165" x2="148" y2="205" stroke="#FFFFFF" strokeWidth="2" />
              <line x1="172" y1="165" x2="172" y2="205" stroke="#FFFFFF" strokeWidth="2" />
              {/* Full Swing Pinafore Skirt */}
              <path
                d="M136,205 C118,245 102,285 106,315 C130,322 190,322 214,315 C218,285 202,245 184,205 Z"
                fill="url(#dollGingham)"
                stroke="#E11D48"
                strokeWidth="1.5"
              />
              {/* Scallop ruffle hem */}
              <path
                d="M106,315 Q120,323 134,316 Q148,323 160,317 Q172,323 186,316 Q200,323 214,315"
                stroke="#FFFFFF"
                strokeWidth="4"
                strokeLinecap="round"
                fill="none"
              />
            </g>
          )}

          {/* 3. Goth Lolita Victorian Doll Dress */}
          {outfit === 'goth-lolita-dress' && (
            <g id="outfit-goth-lolita">
              <path
                d="M136,168 L184,168 L186,225 L134,225 Z"
                fill="#1E1B4B"
                stroke="#312E81"
                strokeWidth="1.5"
              />
              {/* Pink corset lacing */}
              <line x1="152" y1="175" x2="168" y2="185" stroke="#F43F5E" strokeWidth="1.8" />
              <line x1="168" y1="175" x2="152" y2="185" stroke="#F43F5E" strokeWidth="1.8" />
              <line x1="152" y1="190" x2="168" y2="200" stroke="#F43F5E" strokeWidth="1.8" />
              <line x1="168" y1="190" x2="152" y2="200" stroke="#F43F5E" strokeWidth="1.8" />
              {/* Layered Gothic Bell Skirt */}
              <path
                d="M134,225 C112,260 92,305 96,330 C122,338 198,338 224,330 C228,305 208,260 186,225 Z"
                fill="#1E1B4B"
                stroke="#312E81"
                strokeWidth="1.5"
              />
              <path d="M96,330 Q160,345 224,330" stroke="#F43F5E" strokeWidth="3" fill="none" />
              <path d="M106,290 Q160,305 214,290" stroke="#FFFFFF" strokeWidth="2" strokeDasharray="3 3" fill="none" />
            </g>
          )}

          {/* 4. Daisy Sundress */}
          {outfit === 'daisy-sundress' && (
            <g id="outfit-daisy-dress">
              <path
                d="M140,170 L180,170 L184,220 L136,220 Z"
                fill="#FEF08A"
                stroke="#EAB308"
                strokeWidth="1.2"
              />
              {/* Daisies */}
              <circle cx="152" cy="190" r="3" fill="#FFFFFF" />
              <circle cx="152" cy="190" r="1.2" fill="#F59E0B" />
              <circle cx="168" cy="180" r="3" fill="#FFFFFF" />
              <circle cx="168" cy="180" r="1.2" fill="#F59E0B" />
              {/* Sundress flared skirt */}
              <path
                d="M136,220 C118,255 106,295 110,320 C130,326 190,326 210,320 C214,295 202,255 184,220 Z"
                fill="#FEF08A"
                stroke="#EAB308"
                strokeWidth="1.5"
              />
              <circle cx="130" cy="270" r="3.5" fill="#FFFFFF" />
              <circle cx="130" cy="270" r="1.5" fill="#F59E0B" />
              <circle cx="170" cy="280" r="3.5" fill="#FFFFFF" />
              <circle cx="170" cy="280" r="1.5" fill="#F59E0B" />
              <circle cx="190" cy="260" r="3.5" fill="#FFFFFF" />
              <circle cx="190" cy="260" r="1.5" fill="#F59E0B" />
            </g>
          )}

          {/* 5. Distressed Boyfriend Jeans & Cropped Graphic Tee */}
          {outfit === 'distressed-boyfriend-jeans' && (
            <g id="outfit-boyfriend-jeans">
              {/* Cropped Baby Tee */}
              <path d="M136,168 L184,168 L184,202 L136,202 Z" fill="#FDF2F8" stroke="#F472B6" strokeWidth="1.2" />
              <text x="160" y="190" fontSize="8" fill="#EC4899" fontWeight="bold" textAnchor="middle">ANGEL</text>
              <line x1="136" y1="202" x2="184" y2="202" stroke="#EC4899" strokeWidth="2" />
              {/* Baggy Distressed Light Wash Jeans */}
              <path
                d="M136,210 L184,210 L190,375 C176,378 168,370 164,310 L160,245 L156,310 C152,370 144,378 130,375 Z"
                fill="url(#lightDenim)"
                stroke="#2563EB"
                strokeWidth="1.5"
              />
              {/* Rips & distressing on knees */}
              <line x1="140" y1="290" x2="152" y2="290" stroke="#FFFFFF" strokeWidth="2" />
              <line x1="141" y1="294" x2="149" y2="294" stroke="#FFFFFF" strokeWidth="1.5" />
              <line x1="168" y1="310" x2="180" y2="310" stroke="#FFFFFF" strokeWidth="2" />
              {/* Black Leather Belt with Silver Buckle */}
              <rect x="136" y="208" width="48" height="5" fill="#1E293B" />
              <rect x="156" y="206" width="8" height="9" rx="1.5" fill="#CBD5E1" stroke="#475569" strokeWidth="0.8" />
              {/* Rolled cuffs at ankles */}
              <rect x="127" y="370" width="18" height="8" rx="2" fill="#DBEAFE" stroke="#3B82F6" strokeWidth="1" />
              <rect x="175" y="370" width="18" height="8" rx="2" fill="#DBEAFE" stroke="#3B82F6" strokeWidth="1" />
            </g>
          )}

          {/* 6. High-Waisted Flare Denim Jeans & Halter Top */}
          {outfit === 'flare-jeans-croptop' && (
            <g id="outfit-flare-jeans">
              {/* Hot Pink Halter Top */}
              <path d="M148,162 L172,162 L180,195 L140,195 Z" fill="#FF1493" stroke="#DB2777" strokeWidth="1.2" />
              <circle cx="160" cy="180" r="3" fill="#FDE047" />
              {/* High-Waist Vintage Dark Blue Flare Jeans */}
              <path
                d="M138,198 L182,198 L198,380 C182,382 170,370 164,300 L160,240 L156,300 C150,370 138,382 122,380 Z"
                fill="url(#blueDenimWash)"
                stroke="#1D4ED8"
                strokeWidth="1.5"
              />
              {/* Orange contrast jeans stitching */}
              <line x1="140" y1="202" x2="180" y2="202" stroke="#F59E0B" strokeWidth="1" />
              <path d="M150,220 Q160,226 170,220" stroke="#F59E0B" strokeWidth="1" fill="none" />
              <path d="M136,340 Q130,375 125,380" stroke="#F59E0B" strokeWidth="1.2" fill="none" />
              <path d="M184,340 Q190,375 195,380" stroke="#F59E0B" strokeWidth="1.2" fill="none" />
            </g>
          )}

          {/* 7. Cool Denim Jacket & Straight Denim Jeans (Double Denim!) */}
          {outfit === 'denim-jacket-jeans' && (
            <g id="outfit-denim-jacket">
              {/* White crewneck tee under jacket */}
              <rect x="150" y="168" width="20" height="40" fill="#FFFFFF" />
              {/* Denim Jacket */}
              <path
                d="M132,164 L188,164 L186,215 L166,215 L160,180 L154,215 L134,215 Z"
                fill="url(#blueDenimWash)"
                stroke="#1E40AF"
                strokeWidth="1.5"
              />
              {/* Jacket Lapels */}
              <polygon points="138,164 148,195 156,175" fill="#60A5FA" />
              <polygon points="182,164 172,195 164,175" fill="#60A5FA" />
              {/* Jacket Sleeves */}
              <path d="M132,164 L114,205 L124,208 L136,175 Z" fill="url(#blueDenimWash)" />
              <path d="M188,164 L206,205 L196,208 L184,175 Z" fill="url(#blueDenimWash)" />
              {/* Straight Blue Denim Jeans */}
              <path
                d="M136,215 L184,215 L186,375 L168,375 L160,250 L152,375 L134,375 Z"
                fill="url(#blueDenimWash)"
                stroke="#1E40AF"
                strokeWidth="1.5"
              />
            </g>
          )}

          {/* 8. Streetwear Oversized Hoodie & Ripped Jeans */}
          {outfit === 'streetwear-hoodie-jeans' && (
            <g id="outfit-streetwear-hoodie">
              {/* Big Cozy Hoodie */}
              <path
                d="M128,162 Q160,158 192,162 L188,230 L132,230 Z"
                fill={gender === 'boy' ? '#0F172A' : '#F43F5E'}
                stroke={gender === 'boy' ? '#334155' : '#E11D48'}
                strokeWidth="1.5"
              />
              {/* Kangaroo pocket */}
              <path
                d="M142,205 L178,205 L174,228 L146,228 Z"
                fill={gender === 'boy' ? '#1E293B' : '#FB7185'}
              />
              {/* Hoodie Sleeves */}
              <path d="M128,162 L108,215 L120,220 L134,175 Z" fill={gender === 'boy' ? '#0F172A' : '#F43F5E'} />
              <path d="M192,162 L212,215 L200,220 L186,175 Z" fill={gender === 'boy' ? '#0F172A' : '#F43F5E'} />
              {/* Hoodie strings */}
              <line x1="154" y1="168" x2="154" y2="195" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />
              <line x1="166" y1="168" x2="166" y2="195" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />
              {/* Dark Wash Jeans */}
              <path
                d="M136,230 L184,230 L186,375 L168,375 L160,255 L152,375 L134,375 Z"
                fill="url(#darkDenim)"
                stroke="#334155"
                strokeWidth="1.5"
              />
              {/* Knee Rips */}
              <line x1="140" y1="300" x2="150" y2="300" stroke="#94A3B8" strokeWidth="2" />
              <line x1="170" y1="315" x2="180" y2="315" stroke="#94A3B8" strokeWidth="2" />
            </g>
          )}

          {/* 9. Preppy Cardigan & Denim Trousers */}
          {outfit === 'preppy-cardigan-khakis' && (
            <g id="outfit-preppy-cardigan">
              {/* Collared Shirt */}
              <path d="M148,165 L172,165 L172,215 L148,215 Z" fill="#FFFFFF" />
              <polygon points="152,165 160,175 156,165" fill="#E2E8F0" />
              <polygon points="168,165 160,175 164,165" fill="#E2E8F0" />
              {/* Mint / Lilac Knit Cardigan */}
              <path
                d="M132,165 L188,165 L184,225 L168,225 L160,185 L152,225 L136,225 Z"
                fill={gender === 'boy' ? '#0D9488' : '#C084FC'}
                stroke={gender === 'boy' ? '#115E59' : '#9333EA'}
                strokeWidth="1.5"
              />
              {/* Buttons */}
              <circle cx="160" cy="195" r="2" fill="#FDE047" />
              <circle cx="160" cy="208" r="2" fill="#FDE047" />
              <circle cx="160" cy="220" r="2" fill="#FDE047" />
              {/* Relaxed Denim Trousers */}
              <path
                d="M136,225 L184,225 L188,375 L168,375 L160,250 L152,375 L132,375 Z"
                fill="url(#blueDenimWash)"
                stroke="#1E40AF"
                strokeWidth="1.5"
              />
            </g>
          )}

          {/* 10. Baggy Skater Cargo Denim */}
          {outfit === 'skater-cargo-denim' && (
            <g id="outfit-skater-cargo">
              {/* Striped Skater Tee */}
              <path d="M134,166 L186,166 L186,215 L134,215 Z" fill="#FFFFFF" stroke="#000000" strokeWidth="1" />
              <line x1="134" y1="178" x2="186" y2="178" stroke="#000000" strokeWidth="3" />
              <line x1="134" y1="192" x2="186" y2="192" stroke="#000000" strokeWidth="3" />
              <line x1="134" y1="206" x2="186" y2="206" stroke="#000000" strokeWidth="3" />
              {/* Wide-Leg Cargo Denim with Pockets & Chain */}
              <path
                d="M134,215 L186,215 L192,375 L168,375 L160,250 L152,375 L128,375 Z"
                fill="url(#lightDenim)"
                stroke="#1D4ED8"
                strokeWidth="1.5"
              />
              {/* Cargo Pockets */}
              <rect x="130" y="275" width="14" height="20" rx="3" fill="#60A5FA" stroke="#1D4ED8" strokeWidth="1" />
              <rect x="176" y="275" width="14" height="20" rx="3" fill="#60A5FA" stroke="#1D4ED8" strokeWidth="1" />
              {/* Skater Wallet Chain */}
              <path d="M142,218 Q140,245 152,242" stroke="#CBD5E1" strokeWidth="1.5" fill="none" />
            </g>
          )}
        </g>

        {/* 5. SHOES LAYER */}
        <g id="shoes">
          {shoes === 'mary-jane-lace' && (
            <g id="mary-jane">
              {/* Scalloped lace white socks */}
              <rect x="133" y="380" width="17" height="28" fill="#FFFFFF" rx="2" />
              <rect x="170" y="380" width="17" height="28" fill="#FFFFFF" rx="2" />
              <path d="M133,380 Q141,374 150,380 M170,380 Q178,374 187,380" stroke="#F472B6" strokeWidth="1.5" fill="none" />
              {/* Shiny Black / Pink Mary Jane Shoes */}
              <path d="M130,404 L148,404 L150,422 L126,422 Z" fill="#0F172A" />
              <path d="M172,404 L190,404 L194,422 L170,422 Z" fill="#0F172A" />
              <line x1="131" y1="410" x2="147" y2="410" stroke="#CBD5E1" strokeWidth="2" />
              <line x1="173" y1="410" x2="189" y2="410" stroke="#CBD5E1" strokeWidth="2" />
              <circle cx="147" cy="410" r="1.5" fill="#FDE047" />
              <circle cx="173" cy="410" r="1.5" fill="#FDE047" />
            </g>
          )}

          {shoes === 'chunky-doc-boots' && (
            <g id="doc-boots">
              <path d="M128,378 L150,378 L151,424 L124,424 Z" fill="#0F172A" stroke="#1E293B" strokeWidth="1" />
              <line x1="132" y1="388" x2="146" y2="388" stroke="#FDE047" strokeWidth="1.5" />
              <line x1="132" y1="396" x2="146" y2="396" stroke="#FDE047" strokeWidth="1.5" />
              <line x1="132" y1="404" x2="146" y2="404" stroke="#FDE047" strokeWidth="1.5" />
              <rect x="122" y="420" width="30" height="5" rx="1.5" fill="#334155" />

              <path d="M170,378 L192,378 L196,424 L169,424 Z" fill="#0F172A" stroke="#1E293B" strokeWidth="1" />
              <line x1="174" y1="388" x2="188" y2="388" stroke="#FDE047" strokeWidth="1.5" />
              <line x1="174" y1="396" x2="188" y2="396" stroke="#FDE047" strokeWidth="1.5" />
              <line x1="174" y1="404" x2="188" y2="404" stroke="#FDE047" strokeWidth="1.5" />
              <rect x="168" y="420" width="30" height="5" rx="1.5" fill="#334155" />
            </g>
          )}

          {shoes === 'canvas-sneakers' && (
            <g id="canvas-sneakers">
              <rect x="126" y="392" width="24" height="26" rx="4" fill="#F43F5E" />
              <ellipse cx="134" cy="418" rx="8" ry="4" fill="#FFFFFF" />
              <line x1="130" y1="400" x2="146" y2="400" stroke="#FFFFFF" strokeWidth="1.5" />
              <line x1="130" y1="406" x2="146" y2="406" stroke="#FFFFFF" strokeWidth="1.5" />

              <rect x="170" y="392" width="24" height="26" rx="4" fill="#F43F5E" />
              <ellipse cx="186" cy="418" rx="8" ry="4" fill="#FFFFFF" />
              <line x1="174" y1="400" x2="190" y2="400" stroke="#FFFFFF" strokeWidth="1.5" />
              <line x1="174" y1="406" x2="190" y2="406" stroke="#FFFFFF" strokeWidth="1.5" />
            </g>
          )}

          {shoes === 'denim-skater-shoes' && (
            <g id="skate-shoes">
              <rect x="124" y="400" width="28" height="20" rx="5" fill="#1E293B" stroke="#60A5FA" strokeWidth="1.5" />
              <rect x="122" y="415" width="30" height="5" fill="#FFFFFF" />
              <rect x="168" y="400" width="28" height="20" rx="5" fill="#1E293B" stroke="#60A5FA" strokeWidth="1.5" />
              <rect x="168" y="415" width="30" height="5" fill="#FFFFFF" />
            </g>
          )}

          {shoes === 'furry-bear-slippers' && (
            <g id="bear-slippers">
              <ellipse cx="138" cy="412" rx="16" ry="10" fill="#FBCFE8" stroke="#F472B6" strokeWidth="1.5" />
              <circle cx="128" cy="404" r="4.5" fill="#F472B6" />
              <circle cx="148" cy="404" r="4.5" fill="#F472B6" />
              <circle cx="138" cy="412" r="3" fill="#FFFFFF" />
              <circle cx="138" cy="411" r="1.2" fill="#000000" />

              <ellipse cx="182" cy="412" rx="16" ry="10" fill="#FBCFE8" stroke="#F472B6" strokeWidth="1.5" />
              <circle cx="172" cy="404" r="4.5" fill="#F472B6" />
              <circle cx="192" cy="404" r="4.5" fill="#F472B6" />
              <circle cx="182" cy="412" r="3" fill="#FFFFFF" />
              <circle cx="182" cy="411" r="1.2" fill="#000000" />
            </g>
          )}
        </g>

        {/* 6. ICONIC BLYTHE DOLL HEAD & FACE */}
        {/* The defining Blythe dome head: wide forehead, delicate jawline, glowing porcelain */}
        <g id="blytheHead">
          {/* Big Blythe Head Base */}
          <ellipse cx="160" cy="85" rx="54" ry="50" fill={skin.body} />
          {/* Porcelain Gloss Highlight on Forehead */}
          <ellipse cx="160" cy="62" rx="34" ry="16" fill="url(#blytheHeadGlow)" />

          {/* Rosy Soft Airbrush Cheek Blush */}
          <ellipse cx="132" cy="100" rx="14" ry="8" fill={skin.blush} opacity="0.6" filter="url(#softGlow)" />
          <ellipse cx="188" cy="100" rx="14" ry="8" fill={skin.blush} opacity="0.6" filter="url(#softGlow)" />

          {/* Petite Dainty Blythe Nose */}
          <path d="M160,88 Q162,94 158,95" stroke={skin.shadow} strokeWidth="1.5" strokeLinecap="round" fill="none" />

          {/* Glossy Pouty Blythe Lips */}
          <path
            d="M152,108 C155,105 165,105 168,108 C165,116 155,116 152,108 Z"
            fill={skin.lips}
          />
          {/* Upper Lip Bow definition */}
          <path d="M152,108 Q157,106 160,108 Q163,106 168,108" stroke={skin.shadow} strokeWidth="0.8" fill="none" />
          {/* Lip Gloss Shimmer */}
          <ellipse cx="160" cy="111" rx="4" ry="1.5" fill="#FFFFFF" opacity="0.8" />

          {/* 7. SIGNATURE ENORMOUS BLYTHE GLASS EYES */}
          {/* Left Eye Socket */}
          <ellipse cx="134" cy="82" rx="20" ry="17" fill="#FFFFFF" stroke="#334155" strokeWidth="1.2" />
          {/* Left Glass Iris with Gaze Shift */}
          <g transform={`translate(${gazeOffset}, 0)`}>
            <circle cx="134" cy="82" r="14" fill="url(#blytheIrisGradient)" />
            {/* Pupil */}
            <circle cx="134" cy="82" r="6.5" fill="#0A0A0A" />
            {/* Signature Glass Reflections */}
            <ellipse cx="130" cy="76" rx="4" ry="3" fill="#FFFFFF" opacity="0.95" />
            <circle cx="138" cy="86" r="1.8" fill="#FFFFFF" opacity="0.85" />
          </g>
          {/* Left Upper Eyelid crease */}
          <path d="M112,74 Q134,60 156,74" stroke="#94A3B8" strokeWidth="1.2" fill="none" />
          {/* Heavy Fluttery Doll Upper Lashes */}
          <path d="M114,80 Q134,64 154,80" stroke="#0F172A" strokeWidth="3" fill="none" strokeLinecap="round" />
          <line x1="118" y1="76" x2="114" y2="70" stroke="#0F172A" strokeWidth="1.8" strokeLinecap="round" />
          <line x1="126" y1="72" x2="124" y2="65" stroke="#0F172A" strokeWidth="1.8" strokeLinecap="round" />
          <line x1="134" y1="71" x2="134" y2="64" stroke="#0F172A" strokeWidth="1.8" strokeLinecap="round" />
          <line x1="142" y1="72" x2="144" y2="65" stroke="#0F172A" strokeWidth="1.8" strokeLinecap="round" />
          <line x1="150" y1="76" x2="154" y2="70" stroke="#0F172A" strokeWidth="1.8" strokeLinecap="round" />
          {/* Delicate Lower Lashes */}
          <line x1="128" y1="99" x2="126" y2="103" stroke="#475569" strokeWidth="1" strokeLinecap="round" />
          <line x1="134" y1="100" x2="134" y2="104" stroke="#475569" strokeWidth="1" strokeLinecap="round" />
          <line x1="140" y1="99" x2="142" y2="103" stroke="#475569" strokeWidth="1" strokeLinecap="round" />

          {/* Right Eye Socket */}
          <ellipse cx="186" cy="82" rx="20" ry="17" fill="#FFFFFF" stroke="#334155" strokeWidth="1.2" />
          {/* Right Glass Iris with Gaze Shift */}
          <g transform={`translate(${gazeOffset}, 0)`}>
            <circle cx="186" cy="82" r="14" fill="url(#blytheIrisGradient)" />
            {/* Pupil */}
            <circle cx="186" cy="82" r="6.5" fill="#0A0A0A" />
            {/* Signature Glass Reflections */}
            <ellipse cx="182" cy="76" rx="4" ry="3" fill="#FFFFFF" opacity="0.95" />
            <circle cx="190" cy="86" r="1.8" fill="#FFFFFF" opacity="0.85" />
          </g>
          {/* Right Upper Eyelid crease */}
          <path d="M164,74 Q186,60 208,74" stroke="#94A3B8" strokeWidth="1.2" fill="none" />
          {/* Heavy Fluttery Doll Upper Lashes */}
          <path d="M166,80 Q186,64 206,80" stroke="#0F172A" strokeWidth="3" fill="none" strokeLinecap="round" />
          <line x1="170" y1="76" x2="166" y2="70" stroke="#0F172A" strokeWidth="1.8" strokeLinecap="round" />
          <line x1="178" y1="72" x2="176" y2="65" stroke="#0F172A" strokeWidth="1.8" strokeLinecap="round" />
          <line x1="186" y1="71" x2="186" y2="64" stroke="#0F172A" strokeWidth="1.8" strokeLinecap="round" />
          <line x1="194" y1="72" x2="196" y2="65" stroke="#0F172A" strokeWidth="1.8" strokeLinecap="round" />
          <line x1="202" y1="76" x2="206" y2="70" stroke="#0F172A" strokeWidth="1.8" strokeLinecap="round" />
          {/* Delicate Lower Lashes */}
          <line x1="180" y1="99" x2="178" y2="103" stroke="#475569" strokeWidth="1" strokeLinecap="round" />
          <line x1="186" y1="100" x2="186" y2="104" stroke="#475569" strokeWidth="1" strokeLinecap="round" />
          <line x1="192" y1="99" x2="194" y2="103" stroke="#475569" strokeWidth="1" strokeLinecap="round" />

          {/* Arched Blythe Eyebrows */}
          <path
            d="M120,64 Q134,54 148,62"
            stroke={hair.shadow}
            strokeWidth={gender === 'boy' ? '2.5' : '1.8'}
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M172,62 Q186,54 200,64"
            stroke={hair.shadow}
            strokeWidth={gender === 'boy' ? '2.5' : '1.8'}
            strokeLinecap="round"
            fill="none"
          />
        </g>

        {/* 8. HAIRSTYLES FRONT LAYER */}
        <g id="hairFront">
          {/* GIRL: Signature Blythe Straight Hair with Heavy Blunt Doll Bangs */}
          {hairstyle === 'blythe-signature-bangs' && (
            <g id="hair-blythe-bangs">
              {/* Crown Volume */}
              <path
                d="M106,85 C98,35 145,25 160,25 C175,25 222,35 214,85 C210,55 190,40 160,40 C130,40 110,55 106,85 Z"
                fill={hair.main}
              />
              {/* Iconic Blunt Heavy Bangs */}
              <path
                d="M112,65 Q160,60 208,65 L208,70 Q160,74 112,70 Z"
                fill={hair.main}
                stroke={hair.shadow}
                strokeWidth="1"
              />
              {/* Bangs highlight */}
              <line x1="125" y1="67" x2="195" y2="67" stroke={hair.highlight} strokeWidth="1.5" />
              {/* Side framing hair tendrils */}
              <path d="M106,80 C100,120 102,180 110,240 C114,210 112,140 114,90 Z" fill={hair.main} />
              <path d="M214,80 C220,120 218,180 210,240 C206,210 208,140 206,90 Z" fill={hair.main} />
            </g>
          )}

          {/* GIRL: Twin Doll Braids */}
          {hairstyle === 'twin-doll-braids' && (
            <g id="hair-twin-braids">
              <path
                d="M106,80 C100,35 145,26 160,26 C175,26 220,35 214,80 C210,55 190,42 160,42 C130,42 110,55 106,80 Z"
                fill={hair.main}
              />
              <path d="M112,65 Q160,60 208,65 L208,70 Q160,74 112,70 Z" fill={hair.main} />
              {/* Big Red/Pink Bows on braids */}
              <circle cx="86" cy="180" r="5" fill="#F43F5E" />
              <polygon points="86,180 76,172 76,188" fill="#F43F5E" />
              <polygon points="86,180 96,172 96,188" fill="#F43F5E" />

              <circle cx="234" cy="180" r="5" fill="#F43F5E" />
              <polygon points="234,180 224,172 224,188" fill="#F43F5E" />
              <polygon points="234,180 244,172 244,188" fill="#F43F5E" />
            </g>
          )}

          {/* GIRL: Fluffy Bubble Ringlets */}
          {hairstyle === 'fluffy-bubble-curls' && (
            <g id="hair-fluffy-curls">
              <path
                d="M104,80 C95,30 145,22 160,22 C175,22 225,30 216,80 C212,50 190,38 160,38 C130,38 108,50 104,80 Z"
                fill={hair.main}
              />
              {/* Curly fringe bangs */}
              <circle cx="125" cy="62" r="8" fill={hair.main} />
              <circle cx="140" cy="58" r="9" fill={hair.main} />
              <circle cx="160" cy="56" r="9" fill={hair.main} />
              <circle cx="180" cy="58" r="9" fill={hair.main} />
              <circle cx="195" cy="62" r="8" fill={hair.main} />
            </g>
          )}

          {/* GIRL: Space Buns Pink */}
          {hairstyle === 'space-buns-pink' && (
            <g id="hair-space-buns">
              {/* Twin high buns */}
              <circle cx="106" cy="30" r="18" fill={hair.main} stroke={hair.shadow} strokeWidth="1.5" />
              <circle cx="214" cy="30" r="18" fill={hair.main} stroke={hair.shadow} strokeWidth="1.5" />
              <circle cx="106" cy="30" r="7" fill={hair.highlight} opacity="0.6" />
              <circle cx="214" cy="30" r="7" fill={hair.highlight} opacity="0.6" />
              {/* Bangs */}
              <path d="M116,65 Q160,60 204,65 L204,70 Q160,74 116,70 Z" fill={hair.main} />
            </g>
          )}

          {/* BOY: Shaggy Tousled Anime/Skater Hair */}
          {hairstyle === 'boy-shaggy-tousled' && (
            <g id="hair-boy-shaggy">
              <path
                d="M104,85 C95,35 140,24 160,24 C180,24 225,35 216,85 C208,60 195,45 160,42 C125,45 112,60 104,85 Z"
                fill={hair.main}
              />
              {/* Spiky textured side-swept bangs */}
              <polygon points="112,65 125,76 130,62" fill={hair.main} />
              <polygon points="128,62 145,82 150,60" fill={hair.main} />
              <polygon points="148,60 168,84 175,58" fill={hair.main} />
              <polygon points="172,58 195,78 202,62" fill={hair.main} />
              <polygon points="200,62 214,75 216,85" fill={hair.main} />
              <path d="M130,48 Q160,38 185,48" stroke={hair.highlight} strokeWidth="2.5" fill="none" />
            </g>
          )}

          {/* BOY: Curly Mop Fringe */}
          {hairstyle === 'boy-curly-mop' && (
            <g id="hair-boy-curly">
              <circle cx="115" cy="50" r="15" fill={hair.main} />
              <circle cx="135" cy="42" r="16" fill={hair.main} />
              <circle cx="160" cy="38" r="18" fill={hair.main} />
              <circle cx="185" cy="42" r="16" fill={hair.main} />
              <circle cx="205" cy="50" r="15" fill={hair.main} />
              {/* Curly bangs over forehead */}
              <circle cx="125" cy="65" r="9" fill={hair.main} />
              <circle cx="145" cy="66" r="10" fill={hair.main} />
              <circle cx="165" cy="64" r="10" fill={hair.main} />
              <circle cx="185" cy="66" r="9" fill={hair.main} />
            </g>
          )}

          {/* BOY: 90s Middle-Part Curtain Bangs */}
          {hairstyle === 'boy-middle-part' && (
            <g id="hair-boy-middle">
              <path
                d="M106,85 C98,35 140,26 160,28 C180,26 222,35 214,85 C208,60 195,45 160,42 C125,45 112,60 106,85 Z"
                fill={hair.main}
              />
              {/* Left curtain bang */}
              <path d="M160,42 Q140,50 120,74 Q135,62 155,50 Z" fill={hair.main} />
              {/* Right curtain bang */}
              <path d="M160,42 Q180,50 200,74 Q185,62 165,50 Z" fill={hair.main} />
            </g>
          )}

          {/* BOY: Cool Undercut Top */}
          {hairstyle === 'boy-undercut-cool' && (
            <g id="hair-boy-undercut">
              {/* Buzzed sides */}
              <rect x="106" y="65" width="8" height="25" rx="3" fill="#1E293B" opacity="0.8" />
              <rect x="206" y="65" width="8" height="25" rx="3" fill="#1E293B" opacity="0.8" />
              {/* Voluminous styled textured top */}
              <path
                d="M114,65 C110,30 150,20 160,20 C170,20 210,30 206,65 L195,68 Q160,55 125,68 Z"
                fill={hair.main}
                stroke={hair.shadow}
                strokeWidth="1.2"
              />
            </g>
          )}
        </g>

        {/* 9. STATEMENT ACCESSORIES */}
        <g id="accessories">
          {accessory === 'beret-hat' && (
            <g id="acc-beret">
              <ellipse cx="160" cy="34" rx="52" ry="16" fill="#F43F5E" stroke="#BE123C" strokeWidth="1.5" transform="rotate(-6 160 34)" />
              <circle cx="160" cy="22" r="3" fill="#F43F5E" />
              <circle cx="130" cy="36" r="3" fill="#FDE047" stroke="#CA8A04" strokeWidth="0.8" />
            </g>
          )}

          {accessory === 'cat-ear-beanie' && (
            <g id="acc-cat-beanie">
              <path
                d="M110,55 C110,25 130,22 160,22 C190,22 210,25 210,55 Z"
                fill="#1E293B"
                stroke="#0F172A"
                strokeWidth="1.5"
              />
              {/* Cat Ears */}
              <polygon points="112,35 120,12 136,25" fill="#1E293B" />
              <polygon points="116,33 122,18 132,26" fill="#F43F5E" />
              <polygon points="208,35 200,12 184,25" fill="#1E293B" />
              <polygon points="204,33 198,18 188,26" fill="#F43F5E" />
            </g>
          )}

          {accessory === 'oversized-bow' && (
            <g id="acc-bow">
              <circle cx="160" cy="28" r="6" fill="#E11D48" />
              <polygon points="160,28 125,12 130,42" fill="#F43F5E" stroke="#BE123C" strokeWidth="1" />
              <polygon points="160,28 195,12 190,42" fill="#F43F5E" stroke="#BE123C" strokeWidth="1" />
            </g>
          )}

          {accessory === 'wire-glasses' && (
            <g id="acc-glasses">
              {/* Round wire glasses over big Blythe eyes */}
              <circle cx="134" cy="82" r="21" fill="none" stroke="#F59E0B" strokeWidth="2.5" />
              <circle cx="186" cy="82" r="21" fill="none" stroke="#F59E0B" strokeWidth="2.5" />
              <line x1="155" y1="82" x2="165" y2="82" stroke="#F59E0B" strokeWidth="2.5" />
              <line x1="113" y1="82" x2="105" y2="80" stroke="#F59E0B" strokeWidth="2" />
              <line x1="207" y1="82" x2="215" y2="80" stroke="#F59E0B" strokeWidth="2" />
            </g>
          )}

          {accessory === 'polaroid-camera' && (
            <g id="acc-camera">
              {/* Strap across body */}
              <line x1="130" y1="165" x2="198" y2="235" stroke="#94A3B8" strokeWidth="2" />
              {/* Pastel Camera */}
              <rect x="180" y="215" width="28" height="20" rx="4" fill="#38BDF8" stroke="#0284C7" strokeWidth="1.2" />
              <circle cx="194" cy="225" r="6" fill="#0F172A" stroke="#FFFFFF" strokeWidth="1.5" />
              <circle cx="185" cy="219" r="2" fill="#FACC15" />
            </g>
          )}

          {accessory === 'plushie-bear' && (
            <g id="acc-plushie">
              {/* Teddy Bear tucked under left arm */}
              <ellipse cx="118" cy="232" rx="14" ry="16" fill="#D97706" />
              <circle cx="118" cy="214" r="10" fill="#D97706" />
              <circle cx="110" cy="207" r="3.5" fill="#B45309" />
              <circle cx="126" cy="207" r="3.5" fill="#B45309" />
              <circle cx="115" cy="213" r="1.5" fill="#000000" />
              <circle cx="121" cy="213" r="1.5" fill="#000000" />
              <ellipse cx="118" cy="217" rx="3" ry="2" fill="#FEF3C7" />
              <circle cx="118" cy="216" r="1" fill="#000000" />
            </g>
          )}

          {accessory === 'iced-boba' && (
            <g id="acc-boba">
              <path d="M188,218 L198,218 L196,238 L190,238 Z" fill="#FCE7F3" stroke="#F472B6" strokeWidth="1.2" />
              <line x1="193" y1="218" x2="198" y2="206" stroke="#F43F5E" strokeWidth="2" strokeLinecap="round" />
              <circle cx="192" cy="234" r="1.5" fill="#475569" />
              <circle cx="195" cy="234" r="1.5" fill="#475569" />
              <circle cx="193" cy="230" r="1.5" fill="#475569" />
            </g>
          )}
        </g>
      </svg>
    </div>
  );
};
