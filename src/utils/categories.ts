import { CategoryConfig, EventCategory } from '../types/calendar';

export const CATEGORIES: Record<EventCategory, CategoryConfig> = {
  deep_work: {
    id: 'deep_work',
    label: 'Deep Focus 💖',
    color: '#ec4899', // Hot Pink
    bgClass: 'bg-pink-50/90 hover:bg-pink-100 text-pink-950 border-pink-300 shadow-2xs',
    textClass: 'text-pink-700',
    borderClass: 'border-l-pink-500',
    badgeBg: 'bg-pink-100 text-pink-800',
    weeklyTargetHours: 20,
    description: 'Uninterrupted problem solving, creation, designing, building',
  },
  meetings: {
    id: 'meetings',
    label: 'Meet & Chat 🌸',
    color: '#f43f5e', // Rose Coral
    bgClass: 'bg-rose-50/90 hover:bg-rose-100 text-rose-950 border-rose-300 shadow-2xs',
    textClass: 'text-rose-700',
    borderClass: 'border-l-rose-500',
    badgeBg: 'bg-rose-100 text-rose-800',
    weeklyTargetHours: 8,
    description: '1:1s, team syncs, huddles, coffee chats, interviews',
  },
  planning: {
    id: 'planning',
    label: 'Dream & Plan ✨',
    color: '#d946ef', // Fuchsia Sparkle
    bgClass: 'bg-fuchsia-50/90 hover:bg-fuchsia-100 text-fuchsia-950 border-fuchsia-300 shadow-2xs',
    textClass: 'text-fuchsia-700',
    borderClass: 'border-l-fuchsia-500',
    badgeBg: 'bg-fuchsia-100 text-fuchsia-800',
    weeklyTargetHours: 4,
    description: 'Goal setting, weekly retro, prioritizing, daily timeboxing',
  },
  health: {
    id: 'health',
    label: 'Glow & Beauty 🎀',
    color: '#fb7185', // Soft Rose
    bgClass: 'bg-pink-100/60 hover:bg-pink-100 text-pink-950 border-pink-300 shadow-2xs',
    textClass: 'text-pink-600',
    borderClass: 'border-l-pink-400',
    badgeBg: 'bg-pink-200/80 text-pink-900',
    weeklyTargetHours: 6,
    description: 'Pilates, gym, skincare, walking breaks, nutritious treats',
  },
  personal: {
    id: 'personal',
    label: 'Fun & Self-Care 💄',
    color: '#c084fc', // Lilac Dream
    bgClass: 'bg-purple-50/90 hover:bg-purple-100 text-purple-950 border-purple-300 shadow-2xs',
    textClass: 'text-purple-700',
    borderClass: 'border-l-purple-400',
    badgeBg: 'bg-purple-100 text-purple-800',
    weeklyTargetHours: 8,
    description: 'Friends, shopping, reading, hobbies, adventures, glam',
  },
  admin: {
    id: 'admin',
    label: 'Boss Babe Tasks 👑',
    color: '#db2777', // Magenta Pink
    bgClass: 'bg-rose-100/60 hover:bg-rose-100 text-rose-950 border-rose-300 shadow-2xs',
    textClass: 'text-rose-800',
    borderClass: 'border-l-pink-600',
    badgeBg: 'bg-rose-200/80 text-rose-900',
    weeklyTargetHours: 5,
    description: 'Email zero, logistics, scheduling, catching up, finances',
  },
};

export const CATEGORY_LIST = Object.values(CATEGORIES);

export function getCategoryConfig(category: EventCategory): CategoryConfig {
  return CATEGORIES[category] || CATEGORIES.admin;
}
