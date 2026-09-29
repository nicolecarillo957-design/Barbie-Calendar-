import React, { useState, useEffect } from 'react';
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
  SceneId,
  OutfitPreset,
  BarbieQuote
} from '../types/doll';
import { BarbieDollSvg } from './BarbieDollSvg';
import { cuteSound } from '../utils/cuteSound';
import { 
  X, 
  Sparkles, 
  Dices, 
  Camera, 
  Heart, 
  Palette, 
  Eye, 
  RotateCw,
  Layers
} from 'lucide-react';

interface BarbieDressUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  dollState: DollOutfitState;
  onUpdateDollState: (newState: DollOutfitState) => void;
  isCompanionActive: boolean;
  onToggleCompanion: () => void;
}

const BLYTHE_QUOTES: BarbieQuote[] = [
  { quote: "Big eyes, big dreams! You can conquer anything today, babe! 💖", category: 'motivation' },
  { quote: "Bored? A fresh pair of denim jeans and vintage lace cures everything! 👗👖", category: 'glam' },
  { quote: "Every Blythe doll is unique — just like your fabulous schedule! ✨", category: 'motivation' },
  { quote: "Pull my string to see my eyes change color! 👁️✨", category: 'fun' },
  { quote: "Take a sip of water, relax your shoulders, and keep slaying! 🌸", category: 'rest' },
  { quote: "Streetwear, dresses, or double denim? The world is your runway! 👑", category: 'glam' },
];

const PRESETS: OutfitPreset[] = [
  // GIRL PRESETS
  {
    id: 'vintage-blythe-girl',
    name: 'Vintage Lace Doll 🎀',
    gender: 'girl',
    description: 'Victorian pink lace dress, heavy blunt bangs & glossy Mary Janes.',
    badge: 'Classic Blythe',
    state: {
      gender: 'girl',
      skinTone: 'porcelain-fair',
      eyeColor: 'sapphire-blue',
      eyeGaze: 'front',
      hairstyle: 'blythe-signature-bangs',
      outfit: 'vintage-lace-dress',
      shoes: 'mary-jane-lace',
      accessory: 'oversized-bow',
      scene: 'dollhouse-room',
    },
  },
  {
    id: 'y2k-flare-jeans',
    name: 'Y2K Flare Jeans & Halter 👖',
    gender: 'girl',
    description: 'Dark blue vintage bell-bottom jeans with hot pink halter & wire glasses.',
    badge: 'Denim Queen',
    state: {
      gender: 'girl',
      skinTone: 'peach-tan',
      eyeColor: 'ruby-pink',
      eyeGaze: 'right',
      hairstyle: 'twin-doll-braids',
      outfit: 'flare-jeans-croptop',
      shoes: 'canvas-sneakers',
      accessory: 'wire-glasses',
      scene: 'skate-park',
    },
  },
  {
    id: 'distressed-boyfriend-girl',
    name: 'Baggy Denim & Baby Tee 🛹',
    gender: 'girl',
    description: 'Light-wash distressed baggy jeans with cropped tee & teddy bear.',
    badge: 'Comfy Streetwear',
    state: {
      gender: 'girl',
      skinTone: 'warm-honey',
      eyeColor: 'emerald-green',
      eyeGaze: 'left',
      hairstyle: 'space-buns-pink',
      outfit: 'distressed-boyfriend-jeans',
      shoes: 'chunky-doc-boots',
      accessory: 'plushie-bear',
      scene: 'pastel-cafe',
    },
  },
  {
    id: 'goth-lolita-girl',
    name: 'Goth Lolita Victorian 🖤',
    gender: 'girl',
    description: 'Midnight navy lace corseted bell skirt with chunky combat boots.',
    badge: 'Dark Cute',
    state: {
      gender: 'girl',
      skinTone: 'porcelain-fair',
      eyeColor: 'violet-dream',
      eyeGaze: 'front',
      hairstyle: 'fluffy-bubble-curls',
      outfit: 'goth-lolita-dress',
      shoes: 'chunky-doc-boots',
      accessory: 'cat-ear-beanie',
      scene: 'vintage-garden',
    },
  },

  // BOY PRESETS
  {
    id: 'skater-denim-boy',
    name: 'Skater Boy Cargo Denim 🛹',
    gender: 'boy',
    description: 'Baggy skater cargo jeans with striped tee, wallet chain & skater sneakers.',
    badge: 'Skater Boy',
    state: {
      gender: 'boy',
      skinTone: 'peach-tan',
      eyeColor: 'sapphire-blue',
      eyeGaze: 'right',
      hairstyle: 'boy-shaggy-tousled',
      outfit: 'skater-cargo-denim',
      shoes: 'denim-skater-shoes',
      accessory: 'cat-ear-beanie',
      scene: 'skate-park',
    },
  },
  {
    id: 'double-denim-boy',
    name: 'Vintage Double Denim 👖',
    gender: 'boy',
    description: 'Blue wash denim jacket over white tee with straight blue jeans & camera.',
    badge: 'Vintage Boy',
    state: {
      gender: 'boy',
      skinTone: 'warm-honey',
      eyeColor: 'golden-hazel',
      eyeGaze: 'front',
      hairstyle: 'boy-middle-part',
      outfit: 'denim-jacket-jeans',
      shoes: 'canvas-sneakers',
      accessory: 'polaroid-camera',
      scene: 'pastel-cafe',
    },
  },
  {
    id: 'streetwear-hoodie-boy',
    name: 'Oversized Hoodie & Jeans 🎧',
    gender: 'boy',
    description: 'Charcoal oversized streetwear hoodie with ripped black denim & doc boots.',
    badge: 'Indie Streetwear',
    state: {
      gender: 'boy',
      skinTone: 'deep-espresso',
      eyeColor: 'emerald-green',
      eyeGaze: 'left',
      hairstyle: 'boy-undercut-cool',
      outfit: 'streetwear-hoodie-jeans',
      shoes: 'chunky-doc-boots',
      accessory: 'wire-glasses',
      scene: 'dollhouse-room',
    },
  },
  {
    id: 'preppy-cardigan-boy',
    name: 'Preppy Cardigan & Trousers ☕',
    gender: 'boy',
    description: 'Mint buttoned knit cardigan over collared shirt with denim trousers.',
    badge: 'Soft Boy',
    state: {
      gender: 'boy',
      skinTone: 'porcelain-fair',
      eyeColor: 'golden-hazel',
      eyeGaze: 'front',
      hairstyle: 'boy-curly-mop',
      outfit: 'preppy-cardigan-khakis',
      shoes: 'mary-jane-lace',
      accessory: 'iced-boba',
      scene: 'vintage-garden',
    },
  },
];

type WardrobeTab = 'gender-skin' | 'outfits' | 'eyes' | 'hair' | 'shoes' | 'accessories' | 'scene' | 'presets' | 'polaroid';

export const BarbieDressUpModal: React.FC<BarbieDressUpModalProps> = ({
  isOpen,
  onClose,
  dollState,
  onUpdateDollState,
  isCompanionActive,
  onToggleCompanion,
}) => {
  const [activeTab, setActiveTab] = useState<WardrobeTab>('outfits');
  const [outfitFilter, setOutfitFilter] = useState<'all' | 'dresses' | 'jeans'>('all');
  const [currentQuoteIdx, setCurrentQuoteIdx] = useState(0);
  const [isPhotoFlashing, setIsPhotoFlashing] = useState(false);
  const [polaroidCaption, setPolaroidCaption] = useState("My Blythe Doll Slay ✨");

  useEffect(() => {
    if (isOpen) {
      cuteSound.playSparkle();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentQuote = BLYTHE_QUOTES[currentQuoteIdx];

  const handleNextQuote = () => {
    cuteSound.playCutePop();
    setCurrentQuoteIdx((prev) => (prev + 1) % BLYTHE_QUOTES.length);
  };

  const updateItem = <K extends keyof DollOutfitState>(key: K, value: DollOutfitState[K]) => {
    cuteSound.playOutfitWhoosh();
    onUpdateDollState({
      ...dollState,
      [key]: value,
    });
  };

  // Pull Blythe Eye String Mechanism
  const handlePullEyeString = () => {
    cuteSound.playCameraClick();
    const colors: EyeColorId[] = ['sapphire-blue', 'emerald-green', 'ruby-pink', 'golden-hazel', 'violet-dream'];
    const gazes: EyeGazeId[] = ['front', 'left', 'right'];

    // Next color
    const nextColorIdx = (colors.indexOf(dollState.eyeColor) + 1) % colors.length;
    // Random or cycle gaze
    const nextGazeIdx = (gazes.indexOf(dollState.eyeGaze) + 1) % gazes.length;

    onUpdateDollState({
      ...dollState,
      eyeColor: colors[nextColorIdx],
      eyeGaze: gazes[nextGazeIdx],
    });
  };

  const handleGenderToggle = (newGender: DollGender) => {
    cuteSound.playCelebrationFanfare();
    // Default appropriate hair & outfit when switching
    if (newGender === 'boy') {
      onUpdateDollState({
        ...dollState,
        gender: 'boy',
        hairstyle: 'boy-shaggy-tousled',
        outfit: 'skater-cargo-denim',
        shoes: 'denim-skater-shoes',
      });
    } else {
      onUpdateDollState({
        ...dollState,
        gender: 'girl',
        hairstyle: 'blythe-signature-bangs',
        outfit: 'distressed-boyfriend-jeans',
        shoes: 'mary-jane-lace',
      });
    }
  };

  const handleRandomize = () => {
    const genders: DollGender[] = ['girl', 'boy'];
    const skinTones: SkinToneId[] = ['porcelain-fair', 'peach-tan', 'warm-honey', 'deep-espresso'];
    const eyeColors: EyeColorId[] = ['sapphire-blue', 'emerald-green', 'ruby-pink', 'golden-hazel', 'violet-dream'];
    const eyeGazes: EyeGazeId[] = ['front', 'left', 'right'];

    const pickedGender = genders[Math.floor(Math.random() * genders.length)];

    const girlHairs: HairstyleId[] = ['blythe-signature-bangs', 'twin-doll-braids', 'fluffy-bubble-curls', 'space-buns-pink'];
    const boyHairs: HairstyleId[] = ['boy-shaggy-tousled', 'boy-curly-mop', 'boy-middle-part', 'boy-undercut-cool'];

    const outfits: OutfitId[] = [
      'vintage-lace-dress',
      'gingham-pinafore',
      'goth-lolita-dress',
      'daisy-sundress',
      'distressed-boyfriend-jeans',
      'flare-jeans-croptop',
      'denim-jacket-jeans',
      'streetwear-hoodie-jeans',
      'preppy-cardigan-khakis',
      'skater-cargo-denim',
    ];

    const shoes: ShoesId[] = ['mary-jane-lace', 'chunky-doc-boots', 'canvas-sneakers', 'denim-skater-shoes', 'furry-bear-slippers'];
    const accessories: AccessoryId[] = ['beret-hat', 'cat-ear-beanie', 'oversized-bow', 'wire-glasses', 'polaroid-camera', 'plushie-bear', 'iced-boba'];
    const scenes: SceneId[] = ['dollhouse-room', 'pastel-cafe', 'vintage-garden', 'skate-park', 'dream-closet'];

    const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

    cuteSound.playCelebrationFanfare();
    onUpdateDollState({
      gender: pickedGender,
      skinTone: pick(skinTones),
      eyeColor: pick(eyeColors),
      eyeGaze: pick(eyeGazes),
      hairstyle: pickedGender === 'boy' ? pick(boyHairs) : pick(girlHairs),
      outfit: pick(outfits),
      shoes: pick(shoes),
      accessory: pick(accessories),
      scene: pick(scenes),
    });
  };

  const handleApplyPreset = (preset: OutfitPreset) => {
    cuteSound.playCelebrationFanfare();
    onUpdateDollState(preset.state);
  };

  const handleSnapPolaroid = () => {
    cuteSound.playCameraClick();
    setIsPhotoFlashing(true);
    setTimeout(() => {
      setIsPhotoFlashing(false);
      setActiveTab('polaroid');
    }, 250);
  };

  const isDress = (id: OutfitId) => ['vintage-lace-dress', 'gingham-pinafore', 'goth-lolita-dress', 'daisy-sundress'].includes(id);
  const isJeans = (id: OutfitId) => ['distressed-boyfriend-jeans', 'flare-jeans-croptop', 'denim-jacket-jeans', 'streetwear-hoodie-jeans', 'preppy-cardigan-khakis', 'skater-cargo-denim'].includes(id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-pink-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Camera Shutter Flash */}
      {isPhotoFlashing && (
        <div className="fixed inset-0 z-60 bg-white pointer-events-none animate-out fade-out duration-300" />
      )}

      <div className="bg-white border-2 border-pink-300 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-pink-950">
        {/* 1. Header with Blythe Doll Branding */}
        <div className="p-3.5 sm:p-4 bg-gradient-to-r from-pink-500 via-rose-500 to-pink-500 text-white flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-white/20 rounded-xl text-lg">🎀</span>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-1.5">
                <span>Blythe Doll Styling Studio</span>
                <span className="text-yellow-200 text-xs font-bold uppercase tracking-wider px-2 py-0.5 bg-white/20 rounded-full">
                  Boy & Girl Dolls ✨
                </span>
              </h2>
              <p className="text-[11px] text-pink-100 font-medium">
                Style your oversized-eyed Blythe doll with dresses, jeans, customizable skin tones, and changing glass eyes!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleRandomize}
              className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-extrabold rounded-xl transition-all flex items-center gap-1.5 active:scale-95 shadow-2xs"
              title="Surprise Random Blythe Look!"
            >
              <Dices className="w-4 h-4 animate-spin-slow" />
              <span className="hidden sm:inline">Surprise Me! 🎲</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-white/90 hover:text-white hover:bg-white/20 rounded-full transition-colors"
              title="Close Dressing Room"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2. Main Studio Body */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0 bg-pink-50/30">
          {/* Left Stage: Live Blythe Doll Viewport */}
          <div className="md:w-80 lg:w-96 p-4 border-b md:border-b-0 md:border-r border-pink-200/80 bg-gradient-to-b from-white/90 to-pink-100/50 flex flex-col items-center justify-between shrink-0">
            {/* Model Gender Switcher (Boy vs Girl) */}
            <div className="w-full flex items-center justify-center p-1 bg-pink-200/70 rounded-2xl mb-2 gap-1">
              <button
                onClick={() => handleGenderToggle('girl')}
                className={`flex-1 py-1.5 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  dollState.gender === 'girl'
                    ? 'bg-white text-pink-700 shadow-sm'
                    : 'text-pink-900 hover:text-pink-950'
                }`}
              >
                <span>👧</span>
                <span>Girl Blythe</span>
              </button>
              <button
                onClick={() => handleGenderToggle('boy')}
                className={`flex-1 py-1.5 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  dollState.gender === 'boy'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-pink-900 hover:text-pink-950'
                }`}
              >
                <span>👦</span>
                <span>Boy Blythe</span>
              </button>
            </div>

            {/* Blythe Dynamic Speech Bubble */}
            <div 
              onClick={handleNextQuote}
              className="w-full relative bg-white/95 border-2 border-pink-300 rounded-2xl p-2.5 shadow-sm text-center cursor-pointer hover:border-pink-400 transition-all group mb-2"
              title="Click doll for a cute quote! 💖"
            >
              <p className="text-xs font-extrabold text-pink-900 group-hover:text-pink-600 transition-colors">
                "{currentQuote.quote}"
              </p>
              <span className="text-[10px] text-pink-400 font-bold block mt-0.5">
                (Tap doll for pep-talk 🌸)
              </span>
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-pink-300" />
            </div>

            {/* The Live Interactive SVG Blythe Doll */}
            <div className="relative w-full flex-1 flex items-center justify-center min-h-[250px] max-h-[330px]">
              <BarbieDollSvg state={dollState} size="full" />

              {/* Instant Camera Snap Floating Button */}
              <button
                onClick={handleSnapPolaroid}
                className="absolute bottom-2 right-2 p-2.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-full shadow-lg transition-transform active:scale-90 flex items-center gap-1"
                title="Take Runway Polaroid Photo!"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>

            {/* Blythe Pull-String Eye Changer & Gaze Control */}
            <div className="mt-2.5 w-full bg-white/90 p-2.5 rounded-2xl border border-pink-300 shadow-xs flex items-center justify-between gap-2">
              <button
                onClick={handlePullEyeString}
                className="flex-1 py-1.5 px-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white text-xs font-black rounded-xl shadow-xs transition-transform active:scale-95 flex items-center justify-center gap-1.5"
                title="Pull Blythe string to change eye color and direction!"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Pull Eye String 🪢</span>
              </button>

              <div className="flex items-center gap-1 text-[11px] font-bold text-pink-800">
                <span className="capitalize">{dollState.eyeColor.split('-')[0]}</span>
                <span className="text-[10px] text-pink-500">({dollState.eyeGaze})</span>
              </div>
            </div>

            {/* Screen Companion Toggle */}
            <div className="mt-2 w-full flex items-center justify-between px-2 py-1.5 bg-rose-50/80 border border-rose-200 rounded-xl">
              <span className="text-[11px] font-extrabold text-rose-900 flex items-center gap-1">
                <span>Floating Companion</span>
                <span>🎀</span>
              </span>
              <button
                onClick={() => {
                  cuteSound.playCutePop();
                  onToggleCompanion();
                }}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors ${
                  isCompanionActive
                    ? 'bg-rose-500 text-white shadow-xs'
                    : 'bg-white text-rose-600 border border-rose-300 hover:bg-rose-100'
                }`}
              >
                {isCompanionActive ? 'Visible on Screen 💖' : 'Turn On ✨'}
              </button>
            </div>
          </div>

          {/* Right Stage: Wardrobe Dressing Closet */}
          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            {/* Category Selector Tabs */}
            <div className="flex items-center gap-1 p-2 bg-pink-100/60 border-b border-pink-200/80 overflow-x-auto whitespace-nowrap scrollbar-none">
              {(
                [
                  { id: 'gender-skin', label: 'Skin & Gender', icon: '🎨' },
                  { id: 'outfits', label: 'Outfits & Jeans', icon: '👗' },
                  { id: 'eyes', label: 'Blythe Eyes', icon: '👁️' },
                  { id: 'hair', label: 'Hairstyles', icon: '💇' },
                  { id: 'shoes', label: 'Shoes', icon: '👠' },
                  { id: 'accessories', label: 'Accessories', icon: '💎' },
                  { id: 'scene', label: 'Backdrops', icon: '🌴' },
                  { id: 'presets', label: 'Curated Fits', icon: '✨' },
                  { id: 'polaroid', label: 'Polaroid Studio', icon: '📸' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    cuteSound.playCutePop();
                    setActiveTab(tab.id);
                  }}
                  className={`px-3 py-1.5 text-xs font-extrabold rounded-xl transition-all flex items-center gap-1.5 shrink-0 ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-xs'
                      : 'bg-white/80 hover:bg-pink-100/80 text-pink-700'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Wardrobe Items Scrollable Area */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {/* TAB 1: GENDER & SKIN COLOR SELECTION */}
              {activeTab === 'gender-skin' && (
                <div className="space-y-4">
                  {/* Gender Selector */}
                  <div>
                    <h3 className="text-xs font-black text-pink-900 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <span>Choose Doll Model</span>
                      <span>✨</span>
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => handleGenderToggle('girl')}
                        className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                          dollState.gender === 'girl'
                            ? 'bg-pink-100 border-pink-500 ring-2 ring-pink-400 shadow-sm'
                            : 'bg-white border-pink-200 hover:bg-pink-50'
                        }`}
                      >
                        <span className="text-2xl">👧</span>
                        <div>
                          <h4 className="text-xs font-black text-pink-950">Girl Blythe Doll</h4>
                          <p className="text-[11px] text-pink-700 mt-0.5">Classic doll bangs, braids, sweet lip gloss & dresses</p>
                        </div>
                      </button>

                      <button
                        onClick={() => handleGenderToggle('boy')}
                        className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                          dollState.gender === 'boy'
                            ? 'bg-indigo-100 border-indigo-500 ring-2 ring-indigo-400 shadow-sm'
                            : 'bg-white border-pink-200 hover:bg-pink-50'
                        }`}
                      >
                        <span className="text-2xl">👦</span>
                        <div>
                          <h4 className="text-xs font-black text-indigo-950">Boy Blythe Doll</h4>
                          <p className="text-[11px] text-indigo-700 mt-0.5">Cool skater cuts, oversized hoodies, jackets & baggy jeans</p>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Skin Tone Selector */}
                  <div>
                    <h3 className="text-xs font-black text-pink-900 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <span>Choose Doll Skin Tone</span>
                      <span>🎨</span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {(
                        [
                          {
                            id: 'porcelain-fair',
                            label: 'Porcelain White',
                            desc: 'Classic vintage Blythe milky porcelain complexion',
                            color: '#FFF0EA',
                          },
                          {
                            id: 'peach-tan',
                            label: 'Rosy Peach Tan',
                            desc: 'Warm sun-kissed peach with soft blush cheeks',
                            color: '#FCD7C1',
                          },
                          {
                            id: 'warm-honey',
                            label: 'Warm Caramel Honey',
                            desc: 'Luminous golden honey doll skin tone',
                            color: '#DC9D6C',
                          },
                          {
                            id: 'deep-espresso',
                            label: 'Deep Espresso Bronze',
                            desc: 'Rich deep melanin doll skin tone',
                            color: '#7C482C',
                          },
                        ] as const
                      ).map((skin) => (
                        <button
                          key={skin.id}
                          onClick={() => updateItem('skinTone', skin.id)}
                          className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                            dollState.skinTone === skin.id
                              ? 'bg-pink-100 border-pink-500 ring-2 ring-pink-400 shadow-sm'
                              : 'bg-white border-pink-200 hover:bg-pink-50'
                          }`}
                        >
                          <span
                            className="w-8 h-8 rounded-full border-2 border-black/10 shadow-xs shrink-0"
                            style={{ backgroundColor: skin.color }}
                          />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h4 className="text-xs font-black text-pink-950">{skin.label}</h4>
                              {dollState.skinTone === skin.id && (
                                <span className="text-pink-600 font-bold text-xs">✓ Selected</span>
                              )}
                            </div>
                            <p className="text-[11px] text-pink-700 mt-0.5">{skin.desc}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: OUTFITS & JEANS */}
              {activeTab === 'outfits' && (
                <div className="space-y-3">
                  {/* Sub-Filter Buttons */}
                  <div className="flex items-center gap-1.5 p-1 bg-pink-100/70 rounded-xl w-fit">
                    <button
                      onClick={() => setOutfitFilter('all')}
                      className={`px-3 py-1 text-xs font-extrabold rounded-lg transition-colors ${
                        outfitFilter === 'all' ? 'bg-white text-pink-700 shadow-xs' : 'text-pink-600 hover:text-pink-800'
                      }`}
                    >
                      All Outfits
                    </button>
                    <button
                      onClick={() => setOutfitFilter('dresses')}
                      className={`px-3 py-1 text-xs font-extrabold rounded-lg transition-colors flex items-center gap-1 ${
                        outfitFilter === 'dresses' ? 'bg-white text-pink-700 shadow-xs' : 'text-pink-600 hover:text-pink-800'
                      }`}
                    >
                      <span>👗</span>
                      <span>Dresses</span>
                    </button>
                    <button
                      onClick={() => setOutfitFilter('jeans')}
                      className={`px-3 py-1 text-xs font-extrabold rounded-lg transition-colors flex items-center gap-1 ${
                        outfitFilter === 'jeans' ? 'bg-white text-pink-700 shadow-xs' : 'text-pink-600 hover:text-pink-800'
                      }`}
                    >
                      <span>👖</span>
                      <span>Jeans & Denim</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {(
                      [
                        // DRESSES
                        {
                          id: 'vintage-lace-dress',
                          name: 'Vintage Lace Doll Dress 🎀',
                          desc: 'Victorian Peter Pan collar, lace bib & tiered pink ruffle skirt',
                          badge: 'Classic Blythe Dress',
                          category: 'dresses',
                        },
                        {
                          id: 'gingham-pinafore',
                          name: 'Pink Gingham Pinafore 🌸',
                          desc: 'Puffed doll blouse with pink check pinafore swing skirt',
                          badge: 'Pinafore Dress',
                          category: 'dresses',
                        },
                        {
                          id: 'goth-lolita-dress',
                          name: 'Goth Lolita Victorian Dress 🖤',
                          desc: 'Midnight lace corset lacing with tiered gothic bell skirt',
                          badge: 'Lolita Dress',
                          category: 'dresses',
                        },
                        {
                          id: 'daisy-sundress',
                          name: 'Daisy Floral Sundress 🌼',
                          desc: 'Sunny yellow sundress dotted with daisies & ruffled tier',
                          badge: 'Summer Dress',
                          category: 'dresses',
                        },
                        // JEANS & DENIM
                        {
                          id: 'distressed-boyfriend-jeans',
                          name: 'Distressed Baggy Boyfriend Jeans 👖',
                          desc: 'Light-wash baggy rolled-up denim jeans with cropped baby tee & belt',
                          badge: 'Baggy Jeans',
                          category: 'jeans',
                        },
                        {
                          id: 'flare-jeans-croptop',
                          name: '70s High-Waist Flare Jeans 👖✨',
                          desc: 'Dark blue bell-bottom denim flares with contrast stitching & halter',
                          badge: 'Flare Jeans',
                          category: 'jeans',
                        },
                        {
                          id: 'denim-jacket-jeans',
                          name: 'Double Denim Jacket & Jeans 🧥👖',
                          desc: 'Blue wash denim jacket over white tee with straight blue denim jeans',
                          badge: 'Double Denim',
                          category: 'jeans',
                        },
                        {
                          id: 'skater-cargo-denim',
                          name: 'Skater Wide-Leg Cargo Denim 🛹',
                          desc: 'Baggy cargo denim jeans with pockets, chain & striped skater tee',
                          badge: 'Cargo Jeans',
                          category: 'jeans',
                        },
                        {
                          id: 'streetwear-hoodie-jeans',
                          name: 'Streetwear Hoodie & Ripped Jeans 🎧',
                          desc: 'Oversized hoodie with kangaroo pocket and distressed dark denim',
                          badge: 'Street Jeans',
                          category: 'jeans',
                        },
                        {
                          id: 'preppy-cardigan-khakis',
                          name: 'Preppy Knit Cardigan & Jeans ☕',
                          desc: 'Buttoned pastel knit cardigan over collared shirt with relaxed denim',
                          badge: 'Preppy Denim',
                          category: 'jeans',
                        },
                      ] as const
                    )
                      .filter((item) => {
                        if (outfitFilter === 'dresses') return item.category === 'dresses';
                        if (outfitFilter === 'jeans') return item.category === 'jeans';
                        return true;
                      })
                      .map((item) => (
                        <button
                          key={item.id}
                          onClick={() => updateItem('outfit', item.id)}
                          className={`p-3 text-left rounded-2xl border transition-all relative overflow-hidden group ${
                            dollState.outfit === item.id
                              ? 'bg-pink-100/90 border-pink-500 ring-2 ring-pink-400 shadow-sm'
                              : 'bg-white border-pink-200 hover:border-pink-300 hover:bg-pink-50/60'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-pink-950 group-hover:text-pink-600 transition-colors">
                              {item.name}
                            </span>
                            {dollState.outfit === item.id && (
                              <span className="w-5 h-5 rounded-full bg-pink-500 text-white flex items-center justify-center text-[10px] font-bold">
                                ✓
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-pink-700 mt-1 leading-snug">{item.desc}</p>
                          <span className="inline-block mt-2 px-2 py-0.5 bg-pink-200/60 text-pink-800 text-[10px] font-extrabold rounded-md uppercase">
                            {item.badge}
                          </span>
                        </button>
                      ))}
                  </div>
                </div>
              )}

              {/* TAB 3: BLYTHE EYE COLOR & DIRECTION */}
              {activeTab === 'eyes' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xs font-black text-pink-900 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <span>Blythe Glass Eye Chips (Pull String Colors)</span>
                      <span>👁️</span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {(
                        [
                          { id: 'sapphire-blue', name: 'Sapphire Aqua Blue 💎', desc: 'Classic piercing aquatic glass eyes', color: '#0284C7' },
                          { id: 'emerald-green', name: 'Emerald Forest Green 🌲', desc: 'Enchanting radiant jewel green eyes', color: '#059669' },
                          { id: 'ruby-pink', name: 'Ruby Doll Pink 🌸', desc: 'Anime doll iridescent ruby pink eyes', color: '#E11D48' },
                          { id: 'golden-hazel', name: 'Golden Honey Hazel 🍯', desc: 'Warm glowing golden hazel chips', color: '#D97706' },
                          { id: 'violet-dream', name: 'Dreamy Amethyst Violet 🔮', desc: 'Mystical deep violet glass chips', color: '#7C3AED' },
                        ] as const
                      ).map((eye) => (
                        <button
                          key={eye.id}
                          onClick={() => updateItem('eyeColor', eye.id)}
                          className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                            dollState.eyeColor === eye.id
                              ? 'bg-pink-100 border-pink-500 ring-2 ring-pink-400 shadow-sm'
                              : 'bg-white border-pink-200 hover:bg-pink-50'
                          }`}
                        >
                          <span
                            className="w-7 h-7 rounded-full border-2 border-white shadow-sm shrink-0 flex items-center justify-center text-white text-[10px] font-bold"
                            style={{ backgroundColor: eye.color }}
                          >
                            👁️
                          </span>
                          <div>
                            <div className="flex items-center gap-1">
                              <h4 className="text-xs font-black text-pink-950">{eye.name}</h4>
                              {dollState.eyeColor === eye.id && (
                                <span className="text-pink-600 font-bold text-xs">✓</span>
                              )}
                            </div>
                            <p className="text-[11px] text-pink-700 mt-0.5">{eye.desc}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Eye Gaze Direction */}
                  <div>
                    <h3 className="text-xs font-black text-pink-900 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <span>Blythe Eye Gaze Direction</span>
                      <span>👀</span>
                    </h3>
                    <div className="grid grid-cols-3 gap-2">
                      {(
                        [
                          { id: 'left', label: 'Glance Left 👈' },
                          { id: 'front', label: 'Front Stare 👁️' },
                          { id: 'right', label: 'Glance Right 👉' },
                        ] as const
                      ).map((gaze) => (
                        <button
                          key={gaze.id}
                          onClick={() => updateItem('eyeGaze', gaze.id)}
                          className={`p-2.5 rounded-xl border text-center font-extrabold text-xs transition-all ${
                            dollState.eyeGaze === gaze.id
                              ? 'bg-pink-500 text-white shadow-xs'
                              : 'bg-white border-pink-200 text-pink-800 hover:bg-pink-50'
                          }`}
                        >
                          {gaze.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: HAIRSTYLES */}
              {activeTab === 'hair' && (
                <div>
                  <h3 className="text-xs font-black text-pink-900 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <span>{dollState.gender === 'boy' ? 'Boy Hairstyles' : 'Girl Hairstyles'}</span>
                    <span>💇</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {(dollState.gender === 'boy'
                      ? [
                          {
                            id: 'boy-shaggy-tousled',
                            name: 'Tousled Skater Shag 🛹',
                            desc: 'Textured anime/skater hair with side-swept bangs',
                          },
                          {
                            id: 'boy-curly-mop',
                            name: 'Curly Mop Fringe 🍫',
                            desc: 'Soft voluminous curls covering the forehead',
                          },
                          {
                            id: 'boy-middle-part',
                            name: '90s Middle-Part Curtains 🌟',
                            desc: 'Classic boyband curtain bangs with center part',
                          },
                          {
                            id: 'boy-undercut-cool',
                            name: 'Modern Textured Undercut ⚡',
                            desc: 'Clean sides with high styled textured crown',
                          },
                        ]
                      : [
                          {
                            id: 'blythe-signature-bangs',
                            name: 'Blythe Heavy Blunt Bangs 🎀',
                            desc: 'The iconic thick straight doll bangs and long locks',
                          },
                          {
                            id: 'twin-doll-braids',
                            name: 'Twin Doll Braids with Bows 👧',
                            desc: 'Braided pigtails tied with cute ribbon bows',
                          },
                          {
                            id: 'fluffy-bubble-curls',
                            name: 'Fluffy Bubble Ringlets 🧡',
                            desc: 'Romantic bouncy doll curls with fringe bangs',
                          },
                          {
                            id: 'space-buns-pink',
                            name: 'Pastel Pink Space Buns 🍬',
                            desc: 'High twin buns with face-framing pastel tendrils',
                          },
                        ]
                    ).map((hair) => (
                      <button
                        key={hair.id}
                        onClick={() => updateItem('hairstyle', hair.id as HairstyleId)}
                        className={`p-3 text-left rounded-2xl border transition-all ${
                          dollState.hairstyle === hair.id
                            ? 'bg-pink-100/90 border-pink-500 ring-2 ring-pink-400 shadow-sm'
                            : 'bg-white border-pink-200 hover:bg-pink-50/60'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-pink-950">{hair.name}</span>
                          {dollState.hairstyle === hair.id && (
                            <span className="text-pink-600 font-black text-xs">✓</span>
                          )}
                        </div>
                        <p className="text-[11px] text-pink-700 mt-1">{hair.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 5: SHOES */}
              {activeTab === 'shoes' && (
                <div>
                  <h3 className="text-xs font-black text-pink-900 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <span>Doll Footwear Collection</span>
                    <span>👠</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {(
                      [
                        {
                          id: 'mary-jane-lace',
                          name: 'Patent Mary Janes & Lace Socks 🎀',
                          desc: 'Glossy doll shoes with scalloped white lace ruffle socks',
                        },
                        {
                          id: 'chunky-doc-boots',
                          name: 'Chunky Platform Combat Boots 🥾',
                          desc: 'Black leather lace-up platform boots with yellow stitching',
                        },
                        {
                          id: 'canvas-sneakers',
                          name: 'Pastel Canvas High-Tops 👟',
                          desc: 'Classic retro skate high tops with white rubber toe caps',
                        },
                        {
                          id: 'denim-skater-shoes',
                          name: 'Chunky 90s Skater Shoes 🛹',
                          desc: 'Padded skate sneakers with chunky soles',
                        },
                        {
                          id: 'furry-bear-slippers',
                          name: 'Fluffy Teddy Bear Slippers 🧸',
                          desc: 'Soft plush pink bear head lounge slippers',
                        },
                      ] as const
                    ).map((shoe) => (
                      <button
                        key={shoe.id}
                        onClick={() => updateItem('shoes', shoe.id)}
                        className={`p-3 text-left rounded-2xl border transition-all ${
                          dollState.shoes === shoe.id
                            ? 'bg-pink-100/90 border-pink-500 ring-2 ring-pink-400 shadow-sm'
                            : 'bg-white border-pink-200 hover:bg-pink-50/60'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-pink-950">{shoe.name}</span>
                          {dollState.shoes === shoe.id && (
                            <span className="text-pink-600 font-black text-xs">✓</span>
                          )}
                        </div>
                        <p className="text-[11px] text-pink-700 mt-1">{shoe.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 6: ACCESSORIES */}
              {activeTab === 'accessories' && (
                <div>
                  <h3 className="text-xs font-black text-pink-900 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <span>Statement Accessories</span>
                    <span>💎</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {(
                      [
                        {
                          id: 'beret-hat',
                          name: 'Wool Doll Beret 🥐',
                          desc: 'Vintage French red beret with pearl pin',
                        },
                        {
                          id: 'cat-ear-beanie',
                          name: 'Cat-Ear Knit Beanie 🐱',
                          desc: 'Black cozy beanie with adorable pink cat ears',
                        },
                        {
                          id: 'oversized-bow',
                          name: 'Giant Silk Ribbon Bow 🎀',
                          desc: 'The iconic oversized hair bow for Blythe dolls',
                        },
                        {
                          id: 'wire-glasses',
                          name: 'Round Vintage Wire Glasses 👓',
                          desc: 'Golden circular spectacles highlighting the huge eyes',
                        },
                        {
                          id: 'polaroid-camera',
                          name: 'Pastel Polaroid Camera 📷',
                          desc: 'Miniature camera slung casually across the body',
                        },
                        {
                          id: 'plushie-bear',
                          name: 'Mini Plushie Teddy Bear 🧸',
                          desc: 'A cuddly little companion tucked under the arm',
                        },
                        {
                          id: 'iced-boba',
                          name: 'Iced Pink Boba Cup 🧋',
                          desc: 'Drink tumbler with heart straw',
                        },
                        {
                          id: 'none',
                          name: 'Minimal / No Accessories 🌸',
                          desc: 'Clean, simple doll look',
                        },
                      ] as const
                    ).map((acc) => (
                      <button
                        key={acc.id}
                        onClick={() => updateItem('accessory', acc.id)}
                        className={`p-3 text-left rounded-2xl border transition-all ${
                          dollState.accessory === acc.id
                            ? 'bg-pink-100/90 border-pink-500 ring-2 ring-pink-400 shadow-sm'
                            : 'bg-white border-pink-200 hover:bg-pink-50/60'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-pink-950">{acc.name}</span>
                          {dollState.accessory === acc.id && (
                            <span className="text-pink-600 font-black text-xs">✓</span>
                          )}
                        </div>
                        <p className="text-[11px] text-pink-700 mt-1">{acc.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 7: BACKDROP SCENES */}
              {activeTab === 'scene' && (
                <div>
                  <h3 className="text-xs font-black text-pink-900 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <span>Doll Backdrops</span>
                    <span>🌴</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {(
                      [
                        {
                          id: 'dollhouse-room',
                          name: 'Vintage Dollhouse Bedroom 🎀',
                          desc: 'Pastel wallpaper, mini bunting banner & hardwood dollhouse floor',
                        },
                        {
                          id: 'skate-park',
                          name: 'Sunset Skate Park 🛹',
                          desc: 'Sunset gradient with neon ramp and road markings',
                        },
                        {
                          id: 'pastel-cafe',
                          name: 'Parisian Pastel Cafe ☕',
                          desc: 'Checkerboard floor with soft ambient cafe lights',
                        },
                        {
                          id: 'vintage-garden',
                          name: 'Rose Garden Sanctuary 🌸',
                          desc: 'Lush rose vines, green lawn & warm sunshine',
                        },
                        {
                          id: 'dream-closet',
                          name: 'Glam Pink Walk-in Closet ✨',
                          desc: 'Velvet backdrop with golden dressing room mirror',
                        },
                      ] as const
                    ).map((sc) => (
                      <button
                        key={sc.id}
                        onClick={() => updateItem('scene', sc.id)}
                        className={`p-3 text-left rounded-2xl border transition-all ${
                          dollState.scene === sc.id
                            ? 'bg-pink-100/90 border-pink-500 ring-2 ring-pink-400 shadow-sm'
                            : 'bg-white border-pink-200 hover:bg-pink-50/60'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-pink-950">{sc.name}</span>
                          {dollState.scene === sc.id && (
                            <span className="text-pink-600 font-black text-xs">✓</span>
                          )}
                        </div>
                        <p className="text-[11px] text-pink-700 mt-1">{sc.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 8: CURATED PRESETS */}
              {activeTab === 'presets' && (
                <div>
                  <h3 className="text-xs font-black text-pink-900 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <span>Curated Boy & Girl Fits</span>
                    <span>👑</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {PRESETS.map((preset) => (
                      <div
                        key={preset.id}
                        className="p-3.5 bg-white border border-pink-200 hover:border-pink-300 rounded-2xl shadow-2xs flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-black text-pink-950 flex items-center gap-1">
                              <span>{preset.gender === 'boy' ? '👦' : '👧'}</span>
                              <span>{preset.name}</span>
                            </h4>
                            <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-md ${
                              preset.gender === 'boy' ? 'bg-indigo-100 text-indigo-800' : 'bg-pink-100 text-pink-800'
                            }`}>
                              {preset.badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-pink-700 mt-1 leading-snug">{preset.description}</p>
                        </div>
                        <button
                          onClick={() => handleApplyPreset(preset)}
                          className="mt-3 w-full py-1.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-extrabold text-xs rounded-xl shadow-xs transition-transform active:scale-95 flex items-center justify-center gap-1.5"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Wear This Look 💖</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 9: POLAROID BOOTH */}
              {activeTab === 'polaroid' && (
                <div className="flex flex-col items-center justify-center p-2">
                  <div className="w-64 bg-white p-4 pb-6 rounded-2xl shadow-xl border border-pink-200/90 rotate-[-1deg] hover:rotate-0 transition-transform">
                    {/* Polaroid Photo Frame */}
                    <div className="w-full aspect-[4/5] bg-pink-100 rounded-xl overflow-hidden shadow-inner border border-pink-200 flex items-center justify-center relative">
                      <BarbieDollSvg state={dollState} size="full" />
                    </div>

                    {/* Polaroid Bottom Caption Area */}
                    <div className="mt-3 text-center">
                      <input
                        type="text"
                        value={polaroidCaption}
                        onChange={(e) => setPolaroidCaption(e.target.value)}
                        className="w-full text-center font-serif italic text-sm font-bold text-pink-900 border-b border-pink-200 focus:outline-none focus:border-pink-500 bg-transparent px-1 py-0.5"
                        placeholder="Type Polaroid Caption..."
                      />
                      <span className="text-[10px] font-mono text-pink-400 block mt-1">
                        {dollState.gender === 'boy' ? 'Boy Blythe' : 'Girl Blythe'} · {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-4">
                    <button
                      onClick={handleSnapPolaroid}
                      className="px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-bold text-xs rounded-xl shadow-xs transition-transform active:scale-95 flex items-center gap-1.5"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Take Another Snap 📸</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 3. Footer Bar */}
        <div className="p-3.5 bg-pink-50/90 border-t border-pink-200 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-pink-800">
            <span>Styling:</span>
            <span className="px-2 py-0.5 bg-white border border-pink-300 rounded-lg text-pink-600 font-extrabold capitalize">
              {dollState.gender} · {dollState.outfit.replace(/-/g, ' ')}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                cuteSound.playCelebrationFanfare();
                onClose();
              }}
              className="px-5 py-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-black text-xs rounded-xl shadow-sm transition-transform active:scale-95 flex items-center gap-1.5"
            >
              <Heart className="w-3.5 h-3.5 fill-current" />
              <span>Save Blythe Look! 💖</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
