import React from 'react';
import { X, Keyboard, Sparkles, Heart } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'T', description: 'Jump to today’s schedule 💖' },
    { key: 'W', description: 'Switch to Week view 🌸' },
    { key: 'D', description: 'Switch to Day execution view 🎀' },
    { key: 'M', description: 'Switch to Month overview ✨' },
    { key: 'A', description: 'Switch to Barbie Time Audit & Glow 👑' },
    { key: 'C', description: 'Open Barbie Cycle & Period Glow (if enabled) 🩸' },
    { key: 'S', description: 'Open Barbie De-Stress & Overload SOS 🌸' },
    { key: 'I', description: 'Open Task Inbox & Backlog 📥' },
    { key: 'P', description: 'Choose Calendar Color Theme 🎨' },
    { key: 'N', description: 'Create new scheduled timebox 💅' },
    { key: 'Space', description: 'Open / toggle Barbie Focus Sanctuary 💄' },
    { key: '/', description: 'Focus search bar 🔍' },
    { key: 'Esc', description: 'Close any modal or drawer 🌸' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-pink-950/50 backdrop-blur-2xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border-2 border-pink-300 overflow-hidden text-pink-950 animate-in zoom-in-95 duration-200">
        <div className="p-4 bg-gradient-to-r from-pink-200 via-rose-100 to-pink-200 border-b border-pink-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-white text-pink-600 flex items-center justify-center shadow-xs border border-pink-300">
              <Keyboard className="w-4 h-4 text-pink-600" />
            </span>
            <div>
              <h3 className="text-sm font-extrabold text-pink-950 flex items-center gap-1.5">
                <span>Barbie Keyboard Magic</span>
                <Sparkles className="w-3.5 h-3.5 text-pink-600 fill-pink-300" />
              </h3>
              <p className="text-[11px] text-pink-700 font-medium">Lightning quick navigation shortcuts</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-pink-700 hover:text-pink-900 hover:bg-pink-200/70 rounded-xl transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 divide-y divide-pink-100 bg-pink-50/30">
          {shortcuts.map((sc, i) => (
            <div key={i} className="py-2.5 flex items-center justify-between text-xs">
              <span className="text-pink-900 font-medium">{sc.description}</span>
              <kbd className="px-2.5 py-1 bg-white border-2 border-pink-300 rounded-lg font-mono font-black text-pink-800 text-[11px] shadow-2xs">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="p-3.5 bg-gradient-to-r from-pink-100/70 to-rose-100/70 border-t border-pink-200 text-center text-[11px] font-semibold text-pink-700 flex items-center justify-center gap-1.5">
          <Heart className="w-3 h-3 text-pink-500 fill-pink-400" />
          <span>Pro-tip: Click any open hourly slot to schedule a timebox instantly!</span>
        </div>
      </div>
    </div>
  );
};
