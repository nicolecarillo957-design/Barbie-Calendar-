export type DollGender = 'girl' | 'boy';

export type SkinToneId = 
  | 'porcelain-fair' 
  | 'peach-tan' 
  | 'warm-honey' 
  | 'deep-espresso';

export type EyeColorId = 
  | 'sapphire-blue' 
  | 'emerald-green' 
  | 'ruby-pink' 
  | 'golden-hazel' 
  | 'violet-dream';

export type EyeGazeId = 'front' | 'left' | 'right';

export type HairstyleId = 
  // Girl Styles
  | 'blythe-signature-bangs' 
  | 'twin-doll-braids' 
  | 'fluffy-bubble-curls' 
  | 'space-buns-pink'
  // Boy Styles
  | 'boy-shaggy-tousled' 
  | 'boy-curly-mop' 
  | 'boy-middle-part' 
  | 'boy-undercut-cool';

export type OutfitCategory = 'all' | 'dresses' | 'jeans' | 'streetwear';

export type OutfitId = 
  // Dresses
  | 'vintage-lace-dress' 
  | 'gingham-pinafore' 
  | 'goth-lolita-dress' 
  | 'daisy-sundress'
  // Denim & Jeans
  | 'distressed-boyfriend-jeans' 
  | 'flare-jeans-croptop' 
  | 'denim-jacket-jeans' 
  | 'streetwear-hoodie-jeans' 
  | 'preppy-cardigan-khakis' 
  | 'skater-cargo-denim';

export type ShoesId = 
  | 'mary-jane-lace' 
  | 'chunky-doc-boots' 
  | 'canvas-sneakers' 
  | 'denim-skater-shoes' 
  | 'furry-bear-slippers';

export type AccessoryId = 
  | 'beret-hat' 
  | 'cat-ear-beanie' 
  | 'oversized-bow' 
  | 'wire-glasses' 
  | 'polaroid-camera' 
  | 'plushie-bear' 
  | 'iced-boba' 
  | 'none';

export type SceneId = 
  | 'dollhouse-room' 
  | 'pastel-cafe' 
  | 'vintage-garden' 
  | 'skate-park' 
  | 'dream-closet';

export interface DollOutfitState {
  gender: DollGender;
  skinTone: SkinToneId;
  eyeColor: EyeColorId;
  eyeGaze: EyeGazeId;
  hairstyle: HairstyleId;
  outfit: OutfitId;
  shoes: ShoesId;
  accessory: AccessoryId;
  scene: SceneId;
}

export interface OutfitPreset {
  id: string;
  name: string;
  gender: DollGender;
  description: string;
  badge: string;
  state: DollOutfitState;
}

export interface BarbieQuote {
  quote: string;
  category: 'motivation' | 'fun' | 'glam' | 'rest';
}
