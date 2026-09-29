import React, { useState } from 'react';
import { DollOutfitState } from '../types/doll';
import { BarbieDollSvg } from './BarbieDollSvg';
import { cuteSound } from '../utils/cuteSound';
import { Sparkles, X, Heart, MessageCircle } from 'lucide-react';

interface FloatingBarbieCompanionProps {
  isVisible: boolean;
  onOpenDressUp: () => void;
  onDismiss: () => void;
  dollState: DollOutfitState;
}

const IDLE_MESSAGES = [
  "Bored? Let's switch my outfit! 👗✨",
  "You're doing amazing, babe! 💖",
  "Need a quick 5-min brain break? 🌸",
  "Barbie says: You got this! 👑",
  "Fashion emergency? Tap me to dress up! 👠",
];

export const FloatingBarbieCompanion: React.FC<FloatingBarbieCompanionProps> = ({
  isVisible,
  onOpenDressUp,
  onDismiss,
  dollState,
}) => {
  const [isSpeechOpen, setIsSpeechOpen] = useState(true);
  const [speechIdx, setSpeechIdx] = useState(0);

  if (!isVisible) return null;

  const handleDollClick = () => {
    cuteSound.playCutePop();
    setSpeechIdx((prev) => (prev + 1) % IDLE_MESSAGES.length);
    setIsSpeechOpen(true);
  };

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 z-40 flex flex-col items-end pointer-events-none select-none">
      {/* Dynamic Speech Bubble */}
      {isSpeechOpen && (
        <div className="pointer-events-auto mb-2 max-w-[200px] bg-white/95 backdrop-blur-md border-2 border-pink-300 rounded-2xl p-2.5 shadow-xl text-center animate-in fade-in slide-in-from-bottom-2 duration-200 relative group">
          <button
            onClick={() => setIsSpeechOpen(false)}
            className="absolute -top-1.5 -left-1.5 w-4 h-4 bg-pink-100 hover:bg-pink-200 text-pink-700 rounded-full flex items-center justify-center text-[10px]"
            title="Dismiss bubble"
          >
            ×
          </button>

          <p className="text-[11px] font-extrabold text-pink-900 leading-snug">
            {IDLE_MESSAGES[speechIdx]}
          </p>

          <button
            onClick={() => {
              cuteSound.playCelebrationFanfare();
              onOpenDressUp();
            }}
            className="mt-2 w-full py-1 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-black text-[10px] rounded-lg shadow-xs transition-transform active:scale-95 flex items-center justify-center gap-1"
          >
            <Sparkles className="w-2.5 h-2.5" />
            <span>Dress Up Doll 👗</span>
          </button>

          {/* Pointer tail */}
          <div className="absolute -bottom-1.5 right-6 w-3 h-3 bg-white border-r-2 border-b-2 border-pink-300 rotate-45" />
        </div>
      )}

      {/* Floating Barbie Doll Avatar */}
      <div className="pointer-events-auto relative group">
        <button
          onClick={handleDollClick}
          onDoubleClick={onOpenDressUp}
          className="relative w-16 h-22 sm:w-20 sm:h-28 bg-white/90 hover:bg-pink-50/95 border-2 border-pink-300 hover:border-pink-400 rounded-2xl p-1 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 active:scale-95 flex items-center justify-center overflow-hidden"
          title="Click to chat or double-click to dress up!"
        >
          <BarbieDollSvg state={dollState} size="full" showBackground={false} />
          
          {/* Sparkle badge */}
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-tr from-pink-500 to-rose-500 text-white rounded-full flex items-center justify-center text-[10px] shadow-xs">
            ✨
          </span>
        </button>

        {/* Small Close Companion Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-2 -left-2 w-5 h-5 bg-pink-600 hover:bg-pink-700 text-white rounded-full flex items-center justify-center text-[10px] shadow-xs"
          title="Hide companion (You can turn it back on in Dress Up)"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
