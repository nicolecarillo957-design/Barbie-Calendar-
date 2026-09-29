import React, { useState, useEffect } from 'react';
import { CalendarEvent } from '../types/calendar';
import { cuteSound } from '../utils/cuteSound';
import { formatDateKey } from '../utils/dateUtils';
import { 
  Sparkles, 
  Heart, 
  X, 
  Wind, 
  BookOpen, 
  CheckCircle2, 
  RotateCcw, 
  Smile, 
  Layers, 
  Plus, 
  Clock, 
  Brain, 
  Copy, 
  Check, 
  Volume2, 
  VolumeX, 
  Compass,
  Coffee,
  HelpCircle,
  ShieldCheck,
  Send
} from 'lucide-react';

interface CalmSanctuaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDate: Date;
  onScheduleDeStressBlock: (event: Omit<CalendarEvent, 'id'>) => void;
  onAddTaskToBacklog?: (title: string, estimatedMinutes: number) => void;
}

export const CalmSanctuaryModal: React.FC<CalmSanctuaryModalProps> = ({
  isOpen,
  onClose,
  currentDate,
  onScheduleDeStressBlock,
  onAddTaskToBacklog,
}) => {
  const [activeTab, setActiveTab] = useState<'overload' | 'breathing' | 'scripts' | 'grounding'>('overload');

  // Breathing exercise state
  const [isBreathingActive, setIsBreathingActive] = useState(false);
  const [breathPhase, setBreathPhase] = useState<'Inhale' | 'Hold' | 'Exhale' | 'Rest'>('Inhale');
  const [breathCountdown, setBreathCountdown] = useState(4);
  const [breathCyclesCompleted, setBreathCyclesCompleted] = useState(0);

  // Brain dump triage state
  const [brainDumpInput, setBrainDumpInput] = useState('');
  const [brainDumpList, setBrainDumpList] = useState<string[]>([
    'Essay outline for literature',
    'Chemistry lab calculations',
    'Review slides for exam'
  ]);
  const [copiedEmail, setCopiedEmail] = useState(false);

  // Breathing loop
  useEffect(() => {
    let timer: any = null;
    if (isBreathingActive) {
      timer = setInterval(() => {
        setBreathCountdown((prev) => {
          if (prev <= 1) {
            // Transition phase (Box breathing 4-4-4-4)
            if (breathPhase === 'Inhale') {
              setBreathPhase('Hold');
              cuteSound.playCutePop();
              return 4;
            } else if (breathPhase === 'Hold') {
              setBreathPhase('Exhale');
              return 4;
            } else if (breathPhase === 'Exhale') {
              setBreathPhase('Rest');
              return 4;
            } else {
              setBreathPhase('Inhale');
              setBreathCyclesCompleted((c) => c + 1);
              cuteSound.playSparkle();
              return 4;
            }
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isBreathingActive, breathPhase]);

  if (!isOpen) return null;

  const handleStartBreathing = () => {
    setIsBreathingActive(true);
    setBreathPhase('Inhale');
    setBreathCountdown(4);
    cuteSound.playSparkle();
  };

  const handleStopBreathing = () => {
    setIsBreathingActive(false);
    setBreathCountdown(4);
    setBreathPhase('Inhale');
  };

  const handleAddBrainDump = (e: React.FormEvent) => {
    e.preventDefault();
    if (!brainDumpInput.trim()) return;
    setBrainDumpList([...brainDumpList, brainDumpInput.trim()]);
    if (onAddTaskToBacklog) {
      onAddTaskToBacklog(brainDumpInput.trim(), 25);
    }
    setBrainDumpInput('');
    cuteSound.playCutePop();
  };

  const handleConvertDumpToTask = (item: string) => {
    if (onAddTaskToBacklog) {
      onAddTaskToBacklog(item, 25);
      cuteSound.playSparkle();
    }
  };

  const handleCopyEmailTemplate = () => {
    const email = `Dear Professor / Teacher,\n\nI am writing to update you on my progress with [Assignment / Project Name]. I have been working diligently on the material, but I am currently feeling overwhelmed by multiple upcoming deadlines and want to ensure I deliver high-quality work.\n\nCould I please request a short 24-48 hour extension until [Proposed Date], or could we schedule a brief 5-minute chat during office hours to prioritize the key deliverables?\n\nThank you very much for your understanding and guidance.\n\nWarm regards,\n[Your Name]`;
    navigator.clipboard.writeText(email);
    setCopiedEmail(true);
    cuteSound.playSparkle();
    setTimeout(() => setCopiedEmail(false), 2500);
  };

  const handleQuickScheduleReset = (type: 'walk' | 'nap' | 'gentle_study') => {
    let title = 'De-Stress: Fresh Air Walk & Reset 🌿';
    let durationMinutes = 30;
    let description = 'Step away from all screens. Breathe deeply and notice 5 things around you.';

    if (type === 'nap') {
      title = 'De-Stress: 20-Min Power Rest & Hydration 🛌';
      durationMinutes = 25;
      description = 'Eye mask on, phone on do not disturb, soothing music box sounds.';
    } else if (type === 'gentle_study') {
      title = 'Gentle 25m Focus: Just One Micro-Task 🎀';
      durationMinutes = 25;
      description = 'No pressure. Work calmly on just ONE small subtask with music box timer.';
    }

    onScheduleDeStressBlock({
      title,
      category: 'health',
      date: formatDateKey(currentDate),
      startTime: '16:00',
      endTime: durationMinutes === 25 ? '16:25' : '16:30',
      isCompleted: false,
      priority: 'high',
      description,
      reminders: [{ id: `rem-${Date.now()}`, minutesBefore: 5, label: '5m before 💖' }],
    });

    cuteSound.playCelebrationFanfare();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-pink-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border-2 border-pink-300 overflow-hidden my-6 text-pink-950 animate-in zoom-in-95 duration-200">
        {/* Header Bar */}
        <div className="p-4 bg-gradient-to-r from-pink-200 via-rose-100 to-pink-200 border-b border-pink-300 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-full bg-white text-pink-600 flex items-center justify-center shadow-xs border border-pink-300 text-lg">
              🌸
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold text-pink-950 tracking-tight">
                  Barbie Calm & De-Stress Sanctuary
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500 text-white shadow-2xs">
                  Anxiety & Overload SOS
                </span>
              </div>
              <p className="text-[11px] text-pink-700 font-medium">
                Practical, kind, and scientific tools when schoolwork or life feels heavy
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-pink-700 hover:text-pink-900 hover:bg-pink-200/70 rounded-xl transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-3 pb-0 bg-white border-b border-pink-100 flex items-center gap-3 text-xs font-bold overflow-x-auto">
          <button
            onClick={() => setActiveTab('overload')}
            className={`pb-2.5 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'overload'
                ? 'border-pink-500 text-pink-900 font-extrabold'
                : 'border-transparent text-pink-500 hover:text-pink-800'
            }`}
          >
            <Brain className="w-3.5 h-3.5" />
            <span>Schoolwork Overload Triage</span>
          </button>

          <button
            onClick={() => setActiveTab('breathing')}
            className={`pb-2.5 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'breathing'
                ? 'border-pink-500 text-pink-900 font-extrabold'
                : 'border-transparent text-pink-500 hover:text-pink-800'
            }`}
          >
            <Wind className="w-3.5 h-3.5" />
            <span>Box Breathing Bubble</span>
          </button>

          <button
            onClick={() => setActiveTab('grounding')}
            className={`pb-2.5 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'grounding'
                ? 'border-pink-500 text-pink-900 font-extrabold'
                : 'border-transparent text-pink-500 hover:text-pink-800'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>5-4-3-2-1 Sensory Grounding</span>
          </button>

          <button
            onClick={() => setActiveTab('scripts')}
            className={`pb-2.5 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'scripts'
                ? 'border-pink-500 text-pink-900 font-extrabold'
                : 'border-transparent text-pink-500 hover:text-pink-800'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Ask for Extension Template</span>
          </button>
        </div>

        {/* Tab 1: Schoolwork & Life Overload Triage */}
        {activeTab === 'overload' && (
          <div className="p-6 space-y-4 max-h-[440px] overflow-y-auto">
            {/* Encouraging Banner */}
            <div className="p-4 bg-gradient-to-r from-pink-100/90 via-rose-50 to-pink-100/90 rounded-2xl border border-pink-200">
              <h4 className="text-xs font-black text-pink-950 uppercase tracking-tight flex items-center gap-1.5 mb-1">
                <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-300" />
                <span>Take a deep breath. You are not failing—you are just overloaded.</span>
              </h4>
              <p className="text-xs text-pink-800 font-medium leading-relaxed">
                When assignments and deadlines pile up, our nervous system treats it like an emergency. Here is how to dissolve overwhelm step-by-step:
              </p>
            </div>

            {/* 3-Step Strategy Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3.5 bg-pink-50/70 rounded-2xl border border-pink-200 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-pink-900">
                  <span className="w-5 h-5 rounded-full bg-pink-500 text-white flex items-center justify-center font-mono text-[10px]">1</span>
                  <span>The Brain Dump</span>
                </div>
                <p className="text-xs text-pink-800 font-medium leading-relaxed">
                  Get everything out of your head onto paper so your working memory stops screaming.
                </p>
              </div>

              <div className="p-3.5 bg-rose-50/70 rounded-2xl border border-rose-200 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-rose-900">
                  <span className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center font-mono text-[10px]">2</span>
                  <span>The "Rule of 1"</span>
                </div>
                <p className="text-xs text-rose-800 font-medium leading-relaxed">
                  Pick ONE micro-task. You cannot do 5 things at once. Give yourself permission to ignore the rest for 25 mins.
                </p>
              </div>

              <div className="p-3.5 bg-fuchsia-50/70 rounded-2xl border border-fuchsia-200 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-fuchsia-900">
                  <span className="w-5 h-5 rounded-full bg-fuchsia-500 text-white flex items-center justify-center font-mono text-[10px]">3</span>
                  <span>Bite-Sized Action</span>
                </div>
                <p className="text-xs text-fuchsia-800 font-medium leading-relaxed">
                  Don't "study chemistry"—just "solve problems 1 to 3". Momentum cures anxiety.
                </p>
              </div>
            </div>

            {/* Interactive Brain Dump Box */}
            <div className="p-4 bg-white rounded-2xl border border-pink-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <h5 className="text-xs font-extrabold uppercase tracking-wider text-pink-900 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-pink-500" />
                  <span>Unload Your Overload Brain Dump</span>
                </h5>
                <span className="text-[10px] text-pink-500 font-medium">Auto-saves to Backlog</span>
              </div>

              <form onSubmit={handleAddBrainDump} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type an assignment, task, or worry stressing you out..."
                  value={brainDumpInput}
                  onChange={(e) => setBrainDumpInput(e.target.value)}
                  className="flex-1 text-xs px-3 py-2 bg-pink-50/50 border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400 focus:bg-white text-pink-950 placeholder:text-pink-300 font-medium"
                />
                <button
                  type="submit"
                  className="px-3.5 py-2 bg-pink-500 hover:bg-pink-600 text-white text-xs font-bold rounded-xl shadow-2xs transition-colors flex items-center gap-1 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Dump It</span>
                </button>
              </form>

              {brainDumpList.length > 0 && (
                <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                  {brainDumpList.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2 bg-pink-50/60 rounded-xl border border-pink-100 text-xs flex items-center justify-between text-pink-950 font-medium"
                    >
                      <span className="truncate">{item}</span>
                      <button
                        type="button"
                        onClick={() => handleConvertDumpToTask(item)}
                        className="text-[10px] text-pink-600 hover:text-pink-900 font-bold bg-white px-2 py-0.5 rounded-lg border border-pink-200 shadow-2xs shrink-0 ml-2"
                      >
                        + Add to Backlog 🌸
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Instant Rescue Buttons */}
            <div className="pt-2">
              <span className="text-xs font-extrabold text-pink-900 uppercase tracking-wider block mb-2">
                Immediate Calm Rescues (One-Tap Timeboxing) 🎀
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleQuickScheduleReset('walk')}
                  className="p-2.5 bg-pink-50 hover:bg-pink-100 text-pink-800 border border-pink-200 rounded-xl text-left transition-colors shadow-2xs"
                >
                  <span className="text-xs font-bold block">🌿 30m Nature Walk</span>
                  <span className="text-[10px] text-pink-600 block mt-0.5">Reset brain cortisol</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickScheduleReset('nap')}
                  className="p-2.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-xl text-left transition-colors shadow-2xs"
                >
                  <span className="text-xs font-bold block">🛌 25m Power Reset</span>
                  <span className="text-[10px] text-rose-600 block mt-0.5">Restore mental alertness</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickScheduleReset('gentle_study')}
                  className="p-2.5 bg-fuchsia-50 hover:bg-fuchsia-100 text-fuchsia-800 border border-fuchsia-200 rounded-xl text-left transition-colors shadow-2xs"
                >
                  <span className="text-xs font-bold block">🌸 25m Micro-Study</span>
                  <span className="text-[10px] text-fuchsia-600 block mt-0.5">Focus on just 1 page</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Box Breathing Bubble */}
        {activeTab === 'breathing' && (
          <div className="p-6 flex flex-col items-center text-center space-y-5 max-h-[440px] overflow-y-auto">
            <div>
              <h4 className="text-sm font-black text-pink-950 flex items-center justify-center gap-1.5">
                <span>Box Breathing (Navy SEAL & Vagus Nerve Protocol)</span>
                <span>🫧</span>
              </h4>
              <p className="text-xs text-pink-700 font-medium max-w-md mx-auto mt-1">
                4 seconds Inhale · 4 seconds Hold · 4 seconds Exhale · 4 seconds Rest. This immediately slows heart rate and dissolves acute anxiety.
              </p>
            </div>

            {/* Animated Expanding/Contracting Breathing Bubble */}
            <div className="relative w-56 h-56 flex items-center justify-center my-2">
              <div
                className={`absolute rounded-full transition-all duration-1000 ease-in-out ${
                  breathPhase === 'Inhale'
                    ? 'w-52 h-52 bg-pink-300/50 shadow-xl shadow-pink-200'
                    : breathPhase === 'Hold'
                    ? 'w-52 h-52 bg-rose-300/60 shadow-2xl shadow-rose-200'
                    : breathPhase === 'Exhale'
                    ? 'w-28 h-28 bg-pink-200/60'
                    : 'w-24 h-24 bg-pink-100/80'
                }`}
              />

              <div className="relative z-10 flex flex-col items-center justify-center">
                <span className="text-xs uppercase font-extrabold tracking-widest text-pink-600 mb-0.5">
                  {isBreathingActive ? breathPhase : 'Ready'}
                </span>
                <span className="text-5xl font-mono font-black text-pink-950">
                  {isBreathingActive ? breathCountdown : '4'}
                </span>
                <span className="text-[11px] text-pink-500 font-bold mt-1">
                  {isBreathingActive ? `Cycle ${breathCyclesCompleted + 1}` : 'Press Start'}
                </span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3">
              {!isBreathingActive ? (
                <button
                  type="button"
                  onClick={handleStartBreathing}
                  className="px-6 py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-extrabold text-xs rounded-2xl shadow-md shadow-pink-300/60 transition-transform active:scale-95 flex items-center gap-2"
                >
                  <Wind className="w-4 h-4" />
                  <span>Start 2-Minute Breathing Reset ✨</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStopBreathing}
                  className="px-5 py-2 bg-white hover:bg-pink-100 text-pink-700 font-bold text-xs rounded-2xl border border-pink-300 shadow-2xs transition-colors"
                >
                  Pause Breathing
                </button>
              )}
            </div>

            <p className="text-[11px] text-pink-600 font-medium italic">
              "You cannot control the waves of work, but you can always control your breath." 💖
            </p>
          </div>
        )}

        {/* Tab 3: Grounding 5-4-3-2-1 */}
        {activeTab === 'grounding' && (
          <div className="p-6 space-y-4 max-h-[440px] overflow-y-auto">
            <div className="p-3.5 bg-pink-50/70 border border-pink-200 rounded-2xl">
              <h4 className="text-xs font-black text-pink-950 uppercase tracking-tight flex items-center gap-1.5 mb-1">
                <Compass className="w-3.5 h-3.5 text-pink-500" />
                <span>The 5-4-3-2-1 Sensory Grounding Technique</span>
              </h4>
              <p className="text-xs text-pink-800 font-medium leading-relaxed">
                When your brain is spiraling about grades, deadlines, or expectations, this brings your awareness instantly back to the physical room.
              </p>
            </div>

            <div className="space-y-2.5">
              <div className="p-3 bg-white rounded-xl border border-pink-200 shadow-2xs flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center font-mono font-bold text-xs shrink-0">5</span>
                <div>
                  <h5 className="text-xs font-bold text-pink-950">Look around for 5 things you can SEE 👁️</h5>
                  <p className="text-[11px] text-pink-700 font-medium mt-0.5">Notice colors, shadows, a pen, your desk, a cozy sweater.</p>
                </div>
              </div>

              <div className="p-3 bg-white rounded-xl border border-pink-200 shadow-2xs flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-mono font-bold text-xs shrink-0">4</span>
                <div>
                  <h5 className="text-xs font-bold text-pink-950">Find 4 things you can physically TOUCH ✋</h5>
                  <p className="text-[11px] text-pink-700 font-medium mt-0.5">Feel your feet on the floor, the texture of your notebook, your cool water bottle.</p>
                </div>
              </div>

              <div className="p-3 bg-white rounded-xl border border-pink-200 shadow-2xs flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-fuchsia-100 text-fuchsia-600 flex items-center justify-center font-mono font-bold text-xs shrink-0">3</span>
                <div>
                  <h5 className="text-xs font-bold text-pink-950">Listen for 3 distinct sounds you can HEAR 🎵</h5>
                  <p className="text-[11px] text-pink-700 font-medium mt-0.5">A fan humming, birds outside, your own steady breathing.</p>
                </div>
              </div>

              <div className="p-3 bg-white rounded-xl border border-pink-200 shadow-2xs flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-mono font-bold text-xs shrink-0">2</span>
                <div>
                  <h5 className="text-xs font-bold text-pink-950">Notice 2 things you can SMELL ☕</h5>
                  <p className="text-[11px] text-pink-700 font-medium mt-0.5">Your perfume, coffee/tea aroma, or fresh morning air.</p>
                </div>
              </div>

              <div className="p-3 bg-white rounded-xl border border-pink-200 shadow-2xs flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-pink-500 text-white flex items-center justify-center font-mono font-bold text-xs shrink-0">1</span>
                <div>
                  <h5 className="text-xs font-bold text-pink-950">Name 1 thing you appreciate about YOURSELF 💖</h5>
                  <p className="text-[11px] text-pink-700 font-medium mt-0.5">"I am resilient, I am trying my best, and I am worthy of kindness."</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Teacher / Professor Extension Request Script */}
        {activeTab === 'scripts' && (
          <div className="p-6 space-y-4 max-h-[440px] overflow-y-auto">
            <div className="p-3.5 bg-pink-50/70 border border-pink-200 rounded-2xl">
              <h4 className="text-xs font-black text-pink-950 uppercase tracking-tight flex items-center gap-1.5 mb-1">
                <HelpCircle className="w-3.5 h-3.5 text-pink-500" />
                <span>Professional Extension & Support Email Template</span>
              </h4>
              <p className="text-xs text-pink-800 font-medium leading-relaxed">
                Teachers and professors want you to succeed. Asking for help early with a clear, polite proposal shows maturity and responsibility.
              </p>
            </div>

            {/* Email Template Box */}
            <div className="p-4 bg-white rounded-2xl border border-pink-300 font-mono text-xs text-pink-950 space-y-2 relative shadow-2xs">
              <div className="flex items-center justify-between pb-2 border-b border-pink-100 font-sans">
                <span className="text-[11px] font-bold text-pink-700">Subject: Question regarding [Course Name] - [Your Name]</span>
                <button
                  type="button"
                  onClick={handleCopyEmailTemplate}
                  className="px-3 py-1 bg-pink-500 hover:bg-pink-600 text-white text-xs font-sans font-bold rounded-xl shadow-2xs flex items-center gap-1.5 transition-colors"
                >
                  {copiedEmail ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedEmail ? 'Copied to Clipboard! 💖' : 'Copy Email Script'}</span>
                </button>
              </div>

              <div className="whitespace-pre-wrap leading-relaxed text-xs text-pink-900 font-mono pt-1">
{`Dear Professor / Teacher,

I am writing to update you on my progress with [Assignment / Project Name]. I have been working diligently on the material, but I am currently feeling overloaded by multiple overlapping commitments and want to ensure I deliver my highest quality work.

Could I please request a short 24-48 hour extension until [Proposed Date / Time], or could we schedule a brief 5-minute chat during office hours to prioritize the key deliverables?

Thank you very much for your understanding, guidance, and support.

Warm regards,
[Your Name]`}
              </div>
            </div>

            <div className="p-3 bg-pink-100/60 rounded-xl border border-pink-200 text-xs text-pink-800 font-medium">
              💡 <strong>Pro-Tip:</strong> Send this at least 24 hours before the deadline. Teachers almost always say yes when you show care and propose a specific alternate date!
            </div>
          </div>
        )}

        {/* Footer Bar */}
        <div className="p-4 bg-pink-50/80 border-t border-pink-200 flex items-center justify-between">
          <span className="text-xs text-pink-700 font-bold flex items-center gap-1">
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-300" />
            <span>You've got this, darling. One small step at a time.</span>
          </span>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-extrabold text-xs rounded-xl shadow-sm transition-transform active:scale-95"
          >
            I'm Ready 💖
          </button>
        </div>
      </div>
    </div>
  );
};
