import React from 'react';
import { CalendarThemeId, THEME_CONFIGS } from '../types/theme';
import { cuteSound } from '../utils/cuteSound';
import { X, Check, Sparkles, Palette } from 'lucide-react';

interface ThemeSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: CalendarThemeId;
  onSelectTheme: (theme: CalendarThemeId) => void;
}

const THEME_LIST: CalendarThemeId[] = [
  'pink',
  'blue',
  'red',
  'orange',
  'black',
  'yellow',
  'white',
  'green',
  'purple',
  'rainbow',
];

export const ThemeSelectorModal: React.FC<ThemeSelectorModalProps> = ({
  isOpen,
  onClose,
  currentTheme,
  onSelectTheme,
}) => {
  if (!isOpen) return null;

  const activeConfig = THEME_CONFIGS[currentTheme];

  const handleChoose = (themeId: CalendarThemeId) => {
    cuteSound.playCelebrationFanfare();
    onSelectTheme(themeId);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl border-2 border-pink-300 overflow-hidden text-slate-900 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-pink-500 via-purple-500 to-sky-500 text-white flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-white/20 rounded-xl text-lg">🎨</span>
            <div>
              <h3 className="text-base font-black tracking-tight flex items-center gap-1.5">
                <span>Choose Calendar Color Theme</span>
                <Sparkles className="w-3.5 h-3.5 fill-yellow-300 text-yellow-200" />
              </h3>
              <p className="text-[11px] text-white/90 font-medium">
                Choose your favorite aesthetic: Pink, Blue, Red, Orange, Black, Yellow, White, Green, Purple, or Rainbow!
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/90 hover:text-white hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Active Preview Banner */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span
              className="w-5 h-5 rounded-full border shadow-xs shrink-0"
              style={{
                background: activeConfig.swatch,
                borderColor: activeConfig.swatchBorder,
              }}
            />
            <span className="text-xs font-black text-slate-800">
              Active: <span className="capitalize">{activeConfig.name}</span>
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-semibold">
            {activeConfig.badge}
          </span>
        </div>

        {/* 10 Color Theme Grid */}
        <div className="p-5 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2.5 flex-1 bg-slate-50/50">
          {THEME_LIST.map((themeId) => {
            const config = THEME_CONFIGS[themeId];
            const isSelected = currentTheme === themeId;

            return (
              <button
                key={themeId}
                onClick={() => handleChoose(themeId)}
                className={`p-3.5 rounded-2xl border-2 text-left transition-all flex items-start gap-3 relative group overflow-hidden ${
                  isSelected
                    ? 'bg-white border-pink-500 ring-2 ring-pink-400 shadow-md scale-[1.01]'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs hover:bg-white'
                }`}
              >
                {/* Large Color Swatch circle / gradient */}
                <div
                  className="w-10 h-10 rounded-2xl border-2 shadow-xs shrink-0 flex items-center justify-center text-lg transition-transform group-hover:scale-110"
                  style={{
                    background: config.swatch,
                    borderColor: config.swatchBorder,
                  }}
                >
                  <span className="drop-shadow-xs">{config.emoji}</span>
                </div>

                {/* Theme Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-slate-900 group-hover:text-pink-600 transition-colors truncate">
                      {config.name}
                    </h4>
                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-pink-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-2 leading-relaxed">
                    {config.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-medium">
            ✨ Changes apply instantly and save automatically!
          </span>
          <button
            onClick={() => {
              cuteSound.playSparkle();
              onClose();
            }}
            className="px-5 py-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-extrabold text-xs rounded-xl shadow-xs transition-transform active:scale-95"
          >
            Done 💖
          </button>
        </div>
      </div>
    </div>
  );
};
