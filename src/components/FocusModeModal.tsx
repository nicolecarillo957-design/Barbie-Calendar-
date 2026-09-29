import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { CalendarEvent } from '../types/calendar';
import { cuteSound } from '../utils/cuteSound';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Check, 
  X, 
  Volume2, 
  VolumeX, 
  Sparkles,
  Heart,
  FileText
} from 'lucide-react';

interface FocusModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeEvent?: CalendarEvent | null;
  onCompleteEvent?: (eventId: string) => void;
}

export const FocusModeModal: React.FC<FocusModeModalProps> = ({
  isOpen,
  onClose,
  activeEvent,
  onCompleteEvent,
}) => {
  const [durationMinutes, setDurationMinutes] = useState(25);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [customTitle, setCustomTitle] = useState('');
  const [distractionText, setDistractionText] = useState('');
  const [distractions, setDistractions] = useState<string[]>([]);
  const [isFinished, setIsFinished] = useState(false);

  // Sync with active event if provided
  useEffect(() => {
    if (activeEvent) {
      setCustomTitle(activeEvent.title);
      // Calculate remaining or planned minutes
      const [startH, startM] = activeEvent.startTime.split(':').map(Number);
      const [endH, endM] = activeEvent.endTime.split(':').map(Number);
      const diffMin = Math.max(15, (endH * 60 + endM) - (startH * 60 + startM));
      const capped = Math.min(90, diffMin);
      setDurationMinutes(capped);
      setSecondsLeft(capped * 60);
    } else {
      setCustomTitle('Barbie Glam Focus Session 💖');
      setDurationMinutes(25);
      setSecondsLeft(25 * 60);
    }
    setIsRunning(false);
    setIsFinished(false);
  }, [activeEvent, isOpen]);

  // Timer interval
  useEffect(() => {
    let interval: any = null;
    if (isRunning && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setIsRunning(false);
            setIsFinished(true);
            if (audioEnabled) {
              cuteSound.playCelebrationFanfare();
            }
            confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 },
              colors: ['#ec4899', '#f43f5e', '#fb7185', '#f472b6', '#fbcfe8', '#ffd1dc']
            });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, secondsLeft, audioEnabled]);

  if (!isOpen) return null;

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const progressPercent = ((durationMinutes * 60 - secondsLeft) / (durationMinutes * 60)) * 100;

  const handleAddDistraction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!distractionText.trim()) return;
    setDistractions([...distractions, distractionText.trim()]);
    setDistractionText('');
    cuteSound.playCutePop();
  };

  const handleFinishAndMarkDone = () => {
    if (activeEvent && onCompleteEvent) {
      onCompleteEvent(activeEvent.id);
    }
    cuteSound.playSparkle();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-pink-950/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-gradient-to-b from-white via-pink-50/95 to-pink-100/90 border-2 border-pink-300 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl shadow-pink-300/50 text-pink-950 animate-in zoom-in-95 duration-200">
        {/* Header Bar */}
        <div className="p-4 bg-gradient-to-r from-pink-200 via-rose-100 to-pink-200 border-b border-pink-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-pink-500 animate-pulse shadow-xs" />
            <span className="text-xs font-extrabold uppercase tracking-wider text-pink-800 flex items-center gap-1.5">
              <span>Barbie Focus Sanctuary</span>
              <Sparkles className="w-3.5 h-3.5 text-pink-600 fill-pink-400" />
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                const next = !audioEnabled;
                setAudioEnabled(next);
                if (next) cuteSound.playSparkle();
              }}
              className="p-1.5 text-pink-600 hover:text-pink-900 hover:bg-pink-200/70 rounded-xl transition-colors"
              title={audioEnabled ? 'Mute chimes' : 'Enable chimes'}
            >
              {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-pink-600 hover:text-pink-900 hover:bg-pink-200/70 rounded-xl transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-7 flex flex-col items-center text-center">
          {/* Active Target Title */}
          <div className="mb-5 max-w-md w-full">
            <input
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              className="text-lg md:text-xl font-extrabold text-center bg-transparent border-b-2 border-pink-200 hover:border-pink-300 focus:border-pink-500 focus:outline-none w-full text-pink-950 pb-1"
              placeholder="What are you focusing on?"
            />
            {activeEvent && (
              <p className="text-xs text-pink-600 mt-1 font-mono font-medium">
                {activeEvent.startTime} – {activeEvent.endTime} ({activeEvent.date})
              </p>
            )}
          </div>

          {/* Big Pink Circular Countdown */}
          <div className="relative w-60 h-60 flex flex-col items-center justify-center mb-6">
            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
              {/* Background ring */}
              <circle
                cx="50"
                cy="50"
                r="44"
                className="text-pink-200/80"
                strokeWidth="5"
                stroke="currentColor"
                fill="transparent"
              />
              {/* Progress ring */}
              <circle
                cx="50"
                cy="50"
                r="44"
                className="text-pink-500 transition-all duration-500 ease-linear"
                strokeWidth="5"
                strokeDasharray={276.46}
                strokeDashoffset={276.46 - (276.46 * progressPercent) / 100}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
              />
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-5xl font-mono font-black tracking-tight text-pink-950">
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </span>
              <span className="text-xs text-pink-600 font-bold mt-1 flex items-center gap-1">
                {isRunning ? (
                  <>
                    <span className="animate-spin text-pink-500">✨</span>
                    <span>Glam flow active</span>
                  </>
                ) : isFinished ? (
                  <>
                    <Heart className="w-3.5 h-3.5 fill-pink-500 text-pink-600" />
                    <span>Barbie session completed!</span>
                  </>
                ) : (
                  <span>Ready to glow ✨</span>
                )}
              </span>
            </div>
          </div>

          {/* Controls: Play/Pause, Reset, Quick adjustments */}
          <div className="flex items-center gap-3 mb-5">
            <button
              onClick={() => {
                setSecondsLeft(durationMinutes * 60);
                setIsRunning(false);
                setIsFinished(false);
                cuteSound.playCutePop();
              }}
              className="p-3 bg-white hover:bg-pink-100 text-pink-600 rounded-2xl border border-pink-300 shadow-2xs transition-colors"
              title="Reset"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            <button
              onClick={() => {
                const next = !isRunning;
                setIsRunning(next);
                if (next) {
                  cuteSound.playCutePop();
                }
              }}
              className="px-7 py-3 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-extrabold rounded-2xl flex items-center gap-2 shadow-lg shadow-pink-300/60 transition-transform active:scale-95 text-sm"
            >
              {isRunning ? (
                <>
                  <Pause className="w-5 h-5" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-current" />
                  <span>{secondsLeft === durationMinutes * 60 ? 'Start Glow Session 💖' : 'Resume'}</span>
                </>
              )}
            </button>

            <button
              onClick={() => {
                setSecondsLeft((prev) => prev + 300);
                setDurationMinutes((prev) => prev + 5);
                cuteSound.playSparkle();
              }}
              className="px-3 py-3 bg-white hover:bg-pink-100 text-pink-700 text-xs font-mono font-bold rounded-2xl border border-pink-300 shadow-2xs transition-colors"
              title="Add 5 minutes"
            >
              +5m
            </button>
          </div>

          {/* Quick presets when stopped */}
          {!isRunning && !isFinished && (
            <div className="flex items-center gap-2 mb-5">
              {[15, 25, 45, 60].map((mins) => (
                <button
                  key={mins}
                  onClick={() => {
                    setDurationMinutes(mins);
                    setSecondsLeft(mins * 60);
                    cuteSound.playCutePop();
                  }}
                  className={`px-3.5 py-1 text-xs font-mono font-bold rounded-xl border transition-all ${
                    durationMinutes === mins
                      ? 'bg-pink-500 text-white border-pink-500 shadow-xs'
                      : 'bg-white/80 text-pink-700 border-pink-200 hover:bg-pink-100'
                  }`}
                >
                  {mins}m
                </button>
              ))}
            </div>
          )}

          {/* Distraction Parking Lot / Scratchpad */}
          <div className="w-full text-left bg-white/90 rounded-2xl p-3.5 border border-pink-200 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-extrabold text-pink-800 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-pink-500" />
                Sparkle Notes & Brain Drops 🎀
              </span>
              <span className="text-[10px] text-pink-500 font-medium">
                Park thoughts to protect your flow
              </span>
            </div>

            <form onSubmit={handleAddDistraction} className="flex gap-2 mb-2">
              <input
                type="text"
                placeholder="Jot down a stray thought or cute idea..."
                value={distractionText}
                onChange={(e) => setDistractionText(e.target.value)}
                className="flex-1 bg-pink-50/60 border border-pink-200 rounded-xl px-3 py-1.5 text-xs text-pink-950 placeholder:text-pink-400 focus:outline-none focus:border-pink-500 focus:bg-white"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-pink-500 hover:bg-pink-600 text-xs font-bold rounded-xl text-white shadow-2xs transition-colors"
              >
                Park 🌸
              </button>
            </form>

            {distractions.length > 0 && (
              <ul className="space-y-1.5 max-h-24 overflow-y-auto">
                {distractions.map((item, idx) => (
                  <li key={idx} className="text-xs text-pink-900 flex items-center gap-2 py-0.5 font-medium">
                    <Heart className="w-2.5 h-2.5 text-pink-400 fill-pink-300 shrink-0" />
                    <span className="truncate">{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Completion Celebration Footer */}
          {isFinished && (
            <div className="mt-5 w-full p-4 bg-gradient-to-r from-pink-100 via-rose-50 to-pink-100 border-2 border-pink-300 rounded-2xl flex items-center justify-between">
              <div className="text-left">
                <h4 className="text-sm font-extrabold text-pink-950 flex items-center gap-1">
                  <span>Session Completed!</span>
                  <span>🎉💖</span>
                </h4>
                <p className="text-xs text-pink-700">Fabulous focus glow. Ready to record?</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="px-3 py-1.5 text-xs font-medium text-pink-600 hover:text-pink-900"
                >
                  Close
                </button>
                <button
                  onClick={handleFinishAndMarkDone}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-bold text-xs rounded-xl flex items-center gap-1 shadow-sm transition-transform active:scale-95"
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  Mark Complete 🎀
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
