import React from 'react';
import { AppNotification } from '../types/calendar';
import { 
  Bell, 
  Check, 
  Clock, 
  Sparkles, 
  X, 
  Heart,
  RotateCcw
} from 'lucide-react';

interface CuteToastContainerProps {
  toasts: AppNotification[];
  onDismiss: (id: string) => void;
  onSnooze: (id: string, minutes: number) => void;
  onAction?: (toast: AppNotification) => void;
}

export const CuteToastContainer: React.FC<CuteToastContainerProps> = ({
  toasts,
  onDismiss,
  onSnooze,
  onAction,
}) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none select-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto bg-gradient-to-r from-pink-50 via-rose-50 to-pink-50/95 border-2 border-pink-300/90 rounded-2xl p-4 shadow-xl shadow-pink-200/50 transform transition-all duration-300 ease-out animate-in slide-in-from-top-4 fade-in"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-pink-200/80 text-pink-600 flex items-center justify-center shrink-0 shadow-xs border border-pink-300">
                <Bell className="w-4 h-4 fill-pink-500 text-pink-600 animate-bounce" />
              </span>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                    toast.type === 'cycle_morning'
                      ? 'text-rose-700 bg-rose-100 border-rose-300'
                      : 'text-pink-600 bg-pink-100/90 border-pink-200'
                  }`}>
                    <Sparkles className="w-2.5 h-2.5 text-pink-500 fill-pink-400" />
                    {toast.type === 'cycle_morning' ? 'Morning Cycle Glow 🌸' : 'Reminder 🎀'}
                  </span>
                  <span className="text-[10px] text-pink-400 font-mono">Just now</span>
                </div>
                <h4 className="text-sm font-bold text-pink-950 mt-1 leading-snug">
                  {toast.title}
                </h4>
              </div>
            </div>

            <button
              onClick={() => onDismiss(toast.id)}
              className="p-1 text-pink-400 hover:text-pink-700 hover:bg-pink-100 rounded-full transition-colors"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Message body */}
          <p className="text-xs text-pink-800/90 mt-2 pl-10 leading-relaxed font-medium">
            {toast.message}
          </p>

          {/* Cute Action Buttons */}
          <div className="flex items-center justify-end gap-2 mt-3 pt-2.5 border-t border-pink-200/70">
            <button
              onClick={() => onSnooze(toast.id, 5)}
              className="px-2.5 py-1 text-xs font-semibold text-pink-700 bg-white/90 hover:bg-pink-100/80 border border-pink-200 rounded-lg flex items-center gap-1 transition-colors shadow-2xs"
            >
              <RotateCcw className="w-3 h-3 text-pink-500" />
              <span>Snooze 5m</span>
            </button>

            <button
              onClick={() => onSnooze(toast.id, 15)}
              className="px-2.5 py-1 text-xs font-semibold text-pink-700 bg-white/90 hover:bg-pink-100/80 border border-pink-200 rounded-lg flex items-center gap-1 transition-colors shadow-2xs"
            >
              <Clock className="w-3 h-3 text-pink-500" />
              <span>15m</span>
            </button>

            <button
              onClick={() => onDismiss(toast.id)}
              className="px-3 py-1 text-xs font-bold text-white bg-pink-500 hover:bg-pink-600 rounded-lg shadow-sm flex items-center gap-1 transition-colors"
            >
              <Heart className="w-3 h-3 fill-current" />
              <span>Got it!</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
