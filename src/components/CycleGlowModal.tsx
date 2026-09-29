import React, { useState } from 'react';
import { CalendarEvent, CyclePhase, CycleSettings } from '../types/calendar';
import { 
  CYCLE_PHASE_CONFIG, 
  DEFAULT_CYCLE_SETTINGS, 
  getCurrentCycleInfo,
  getCycleMorningMessage
} from '../utils/cycleUtils';
import { cuteSound } from '../utils/cuteSound';
import { 
  Sparkles, 
  Heart, 
  X, 
  Calendar, 
  Clock, 
  Zap, 
  Activity, 
  Utensils, 
  Smile, 
  Check, 
  Sliders, 
  Plus,
  ArrowRight,
  Flame,
  Moon,
  Sun,
  ShieldCheck,
  CalendarCheck,
  Bell,
  Send
} from 'lucide-react';
import { formatDateKey } from '../utils/dateUtils';

interface CycleGlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDate: Date;
  settings: CycleSettings;
  onUpdateSettings: (settings: CycleSettings) => void;
  onScheduleSelfCare: (event: Omit<CalendarEvent, 'id'>) => void;
  onTriggerMorningMessage?: () => void;
}

export const CycleGlowModal: React.FC<CycleGlowModalProps> = ({
  isOpen,
  onClose,
  currentDate,
  settings,
  onUpdateSettings,
  onScheduleSelfCare,
  onTriggerMorningMessage,
}) => {
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [lastStart, setLastStart] = useState(settings.lastPeriodStartDate);
  const [cycleLength, setCycleLength] = useState(settings.cycleLengthDays);
  const [periodDuration, setPeriodDuration] = useState(settings.periodDurationDays);
  const [morningNotificationEnabled, setMorningNotificationEnabled] = useState(
    settings.dailyMorningNotificationEnabled !== false
  );
  const [morningNotificationTime, setMorningNotificationTime] = useState(
    settings.morningNotificationTime || '08:00'
  );
  const [activeTab, setActiveTab] = useState<'guidance' | 'phases' | 'settings'>('guidance');

  if (!isOpen) return null;

  const cycleInfo = getCurrentCycleInfo(currentDate, settings);
  const phaseConfig = CYCLE_PHASE_CONFIG[cycleInfo.phase];
  const morningMessage = getCycleMorningMessage(cycleInfo);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      enabled: true,
      lastPeriodStartDate: lastStart,
      cycleLengthDays: Math.max(20, Math.min(45, cycleLength)),
      periodDurationDays: Math.max(2, Math.min(10, periodDuration)),
      dailyMorningNotificationEnabled: morningNotificationEnabled,
      morningNotificationTime: morningNotificationTime,
    });
    setIsEditingSettings(false);
    cuteSound.playSparkle();
  };

  const handleToggleMorningNotification = () => {
    const nextVal = !morningNotificationEnabled;
    setMorningNotificationEnabled(nextVal);
    onUpdateSettings({
      ...settings,
      dailyMorningNotificationEnabled: nextVal,
      morningNotificationTime: morningNotificationTime,
    });
    if (nextVal) {
      cuteSound.playSparkle();
    } else {
      cuteSound.playCutePop();
    }
  };

  const handleLogPeriodStartedToday = () => {
    const todayStr = formatDateKey(currentDate);
    setLastStart(todayStr);
    onUpdateSettings({
      ...settings,
      lastPeriodStartDate: todayStr,
    });
    cuteSound.playCelebrationFanfare();
  };

  const handleAddPhaseTimebox = () => {
    let title = '';
    let category: any = 'health';
    let duration = 45;

    if (cycleInfo.phase === 'menstrual') {
      title = 'Gentle Rest & Self-Care Reset 🩸';
      category = 'health';
    } else if (cycleInfo.phase === 'follicular') {
      title = 'Creative Spark & Project Brainstorming 🌸';
      category = 'deep_work';
      duration = 90;
    } else if (cycleInfo.phase === 'ovulatory') {
      title = 'High-Impact Executive Strategy & Networking 👑';
      category = 'meetings';
      duration = 60;
    } else {
      title = 'Detail Focus & Task Organization 🎀';
      category = 'admin';
      duration = 60;
    }

    onScheduleSelfCare({
      title,
      category,
      date: formatDateKey(currentDate),
      startTime: '15:00',
      endTime: duration === 45 ? '15:45' : duration === 90 ? '16:30' : '16:00',
      isCompleted: false,
      priority: 'high',
      description: `Synchronized with your ${cycleInfo.phaseName}. ${cycleInfo.whatToDoWork}`,
      reminders: [
        { id: `rem-${Date.now()}`, minutesBefore: 15, label: '15m before 💖' }
      ]
    });

    cuteSound.playSparkle();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-pink-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border-2 border-pink-300 overflow-hidden my-6 text-pink-950 animate-in zoom-in-95 duration-200">
        {/* Header Bar */}
        <div className="p-4 bg-gradient-to-r from-pink-200 via-rose-100 to-pink-200 border-b border-pink-300 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-full bg-white text-pink-600 flex items-center justify-center shadow-xs border border-pink-300 text-lg">
              {cycleInfo.icon}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold text-pink-950 tracking-tight">
                  Barbie Cycle & Phase Glow
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-pink-500 text-white shadow-2xs font-mono">
                  Day {cycleInfo.cycleDay} of {cycleInfo.cycleLength}
                </span>
              </div>
              <p className="text-[11px] text-pink-700 font-medium">
                {cycleInfo.seasonName} · Hormonal cadence & body intelligence
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab(activeTab === 'settings' ? 'guidance' : 'settings')}
              className={`p-2 rounded-xl transition-colors ${
                activeTab === 'settings'
                  ? 'bg-pink-500 text-white'
                  : 'text-pink-700 hover:text-pink-900 hover:bg-pink-200/70'
              }`}
              title="Cycle Settings"
            >
              <Sliders className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-pink-700 hover:text-pink-900 hover:bg-pink-200/70 rounded-xl transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Hero Card: Current Phase & Next Period Prediction */}
        <div className="p-6 bg-gradient-to-br from-pink-50 via-rose-50/70 to-pink-100/60 border-b border-pink-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            {/* Cycle Ring / Dial */}
            <div className="flex flex-col items-center justify-center p-3 bg-white/90 rounded-2xl border border-pink-200 shadow-xs">
              <div className="relative w-28 h-28 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    className="text-pink-100"
                    strokeWidth="8"
                    stroke="currentColor"
                    fill="transparent"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    className="text-pink-500 transition-all duration-500"
                    strokeWidth="8"
                    strokeDasharray={251.2}
                    strokeDashoffset={251.2 - (251.2 * (cycleInfo.cycleDay / cycleInfo.cycleLength))}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-xl font-black text-pink-950 font-mono">
                    Day {cycleInfo.cycleDay}
                  </span>
                  <span className="text-[10px] font-bold text-pink-500 uppercase tracking-wider">
                    {cycleInfo.phase}
                  </span>
                </div>
              </div>
              <span className="text-[11px] font-bold text-pink-700 mt-2">
                {cycleInfo.seasonName}
              </span>
            </div>

            {/* Middle: Phase Title & Status */}
            <div className="md:col-span-2 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-black shadow-2xs border ${phaseConfig.badgeClass} flex items-center gap-1.5`}>
                  <span>{phaseConfig.icon}</span>
                  <span>{phaseConfig.name}</span>
                </span>
                {cycleInfo.isPeriod && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500 text-white shadow-xs animate-pulse">
                    🩸 Period Active
                  </span>
                )}
                {cycleInfo.isOvulation && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-fuchsia-500 text-white shadow-xs animate-pulse">
                    ✨ Peak Ovulation
                  </span>
                )}
              </div>

              <h2 className="text-lg font-black text-pink-950 leading-tight">
                {cycleInfo.energyLevel}
              </h2>
              <p className="text-xs text-pink-800 font-medium leading-relaxed">
                {cycleInfo.hormones}
              </p>

              {/* Next Period Prediction Banner */}
              <div className="p-3 bg-white/95 rounded-xl border border-pink-200/90 flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-pink-500" />
                  <div>
                    <span className="text-[11px] font-bold text-pink-900 block">
                      Next Period Expected:
                    </span>
                    <span className="text-xs font-extrabold text-pink-950 font-mono">
                      {cycleInfo.nextPeriodDate}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-pink-500 block">
                    Countdown
                  </span>
                  <span className="text-xs font-extrabold text-pink-600 font-mono">
                    in {cycleInfo.daysUntilNextPeriod} {cycleInfo.daysUntilNextPeriod === 1 ? 'day' : 'days'} 🌸
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-3 pb-0 bg-white border-b border-pink-100 flex items-center gap-4 text-xs font-bold">
          <button
            onClick={() => setActiveTab('guidance')}
            className={`pb-2.5 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'guidance'
                ? 'border-pink-500 text-pink-900 font-extrabold'
                : 'border-transparent text-pink-500 hover:text-pink-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>What You Should Do Today</span>
          </button>

          <button
            onClick={() => setActiveTab('phases')}
            className={`pb-2.5 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'phases'
                ? 'border-pink-500 text-pink-900 font-extrabold'
                : 'border-transparent text-pink-500 hover:text-pink-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>All 4 Cycle Seasons</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`pb-2.5 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'settings'
                ? 'border-pink-500 text-pink-900 font-extrabold'
                : 'border-transparent text-pink-500 hover:text-pink-800'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Edit My Cycle</span>
          </button>
        </div>

        {/* Tab 1: Actionable Guidance ("What they should do") */}
        {activeTab === 'guidance' && (
          <div className="p-6 space-y-4 max-h-[420px] overflow-y-auto">
            {/* Daily Cycle-Synced Morning Encouragement Opt-In Card */}
            <div className="p-4 bg-gradient-to-r from-pink-100/90 via-rose-100/70 to-pink-100/90 rounded-2xl border-2 border-pink-300 shadow-2xs">
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-white text-pink-600 flex items-center justify-center border border-pink-300 shadow-2xs text-xs">
                    <Bell className="w-3.5 h-3.5 fill-pink-400 text-pink-600 animate-wiggle" />
                  </span>
                  <div>
                    <h4 className="text-xs font-black text-pink-950 uppercase tracking-tight flex items-center gap-1.5">
                      <span>Daily Cycle-Synced Morning Encouragement</span>
                      <Sparkles className="w-3 h-3 text-pink-500 fill-pink-300" />
                    </h4>
                    <p className="text-[10px] text-pink-700 font-medium">
                      Gentle, loving message delivered each morning at {morningNotificationTime} AM based on your hormonal phase
                    </p>
                  </div>
                </div>

                {/* Opt-in Toggle */}
                <button
                  type="button"
                  onClick={handleToggleMorningNotification}
                  className={`px-3 py-1.5 rounded-full text-xs font-black transition-all flex items-center gap-1.5 shadow-2xs ${
                    morningNotificationEnabled
                      ? 'bg-pink-500 text-white shadow-xs'
                      : 'bg-white text-pink-700 border border-pink-300 hover:bg-pink-100'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${morningNotificationEnabled ? 'bg-white animate-pulse' : 'bg-pink-300'}`} />
                  <span>{morningNotificationEnabled ? 'Subscribed 💖' : 'Opt In 🌸'}</span>
                </button>
              </div>

              {/* Message Preview Box */}
              <div className="bg-white/95 rounded-xl p-3 border border-pink-200 shadow-2xs">
                <div className="flex items-center justify-between text-[11px] font-bold text-pink-900 mb-1">
                  <span className="flex items-center gap-1 text-pink-800">
                    <span>{morningMessage.icon}</span>
                    <span>Today's Morning Encouragement Preview</span>
                  </span>
                  <span className="font-mono text-[10px] text-pink-500 font-bold">
                    Scheduled: {morningNotificationTime} AM
                  </span>
                </div>
                <h5 className="text-xs font-extrabold text-pink-950 leading-snug">
                  {morningMessage.title}
                </h5>
                <p className="text-xs text-pink-800 font-medium mt-1 leading-relaxed">
                  {morningMessage.message}
                </p>

                {onTriggerMorningMessage && (
                  <div className="mt-2.5 pt-2 border-t border-pink-100 flex items-center justify-between flex-wrap gap-2">
                    <span className="text-[10px] text-pink-600 font-semibold">
                      Want to experience how it sounds and looks?
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        onTriggerMorningMessage();
                        cuteSound.playSparkle();
                      }}
                      className="px-2.5 py-1 bg-pink-100 hover:bg-pink-200 text-pink-800 text-[11px] font-bold rounded-lg border border-pink-300 flex items-center gap-1 transition-colors shadow-2xs"
                    >
                      <Send className="w-3 h-3 text-pink-600" />
                      <span>Send Sample Morning Message Now ✨</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* 4 Recommendations Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* Card 1: Work & Productivity */}
              <div className="p-4 bg-pink-50/70 border border-pink-200 rounded-2xl hover:border-pink-300 transition-all">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-6 h-6 rounded-lg bg-pink-100 text-pink-600 flex items-center justify-center border border-pink-200">
                    <Zap className="w-3.5 h-3.5 fill-pink-300" />
                  </span>
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-pink-900">
                    Work & Timeboxing Focus 💼
                  </h4>
                </div>
                <p className="text-xs text-pink-950 font-medium leading-relaxed pl-8">
                  {cycleInfo.whatToDoWork}
                </p>
              </div>

              {/* Card 2: Movement & Workout */}
              <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-2xl hover:border-rose-300 transition-all">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-6 h-6 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center border border-rose-200">
                    <Activity className="w-3.5 h-3.5" />
                  </span>
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-rose-900">
                    Movement & Fitness 🏃‍♀️
                  </h4>
                </div>
                <p className="text-xs text-pink-950 font-medium leading-relaxed pl-8">
                  {cycleInfo.whatToDoMovement}
                </p>
              </div>

              {/* Card 3: Food & Nourish */}
              <div className="p-4 bg-fuchsia-50/70 border border-fuchsia-200 rounded-2xl hover:border-fuchsia-300 transition-all">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-6 h-6 rounded-lg bg-fuchsia-100 text-fuchsia-600 flex items-center justify-center border border-fuchsia-200">
                    <Utensils className="w-3.5 h-3.5" />
                  </span>
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-fuchsia-900">
                    Nourish & Hydration 🥑
                  </h4>
                </div>
                <p className="text-xs text-pink-950 font-medium leading-relaxed pl-8">
                  {cycleInfo.whatToDoNutrition}
                </p>
              </div>

              {/* Card 4: Self-Care & Recovery */}
              <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-2xl hover:border-purple-300 transition-all">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-6 h-6 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center border border-purple-200">
                    <Smile className="w-3.5 h-3.5" />
                  </span>
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-purple-900">
                    Self-Care Sanctuary 🛁
                  </h4>
                </div>
                <p className="text-xs text-pink-950 font-medium leading-relaxed pl-8">
                  {cycleInfo.whatToDoSelfCare}
                </p>
              </div>
            </div>

            {/* Daily Affirmation */}
            <div className="p-4 bg-gradient-to-r from-pink-100/90 via-rose-100/80 to-pink-100/90 rounded-2xl border border-pink-300 text-center">
              <span className="text-[10px] font-black uppercase tracking-wider text-pink-700 block mb-0.5">
                Daily Barbie Hormone Affirmation 💖
              </span>
              <p className="text-xs font-bold text-pink-950 italic">
                "{cycleInfo.affirmation}"
              </p>
            </div>
          </div>
        )}

        {/* Tab 2: All 4 Phases Overview */}
        {activeTab === 'phases' && (
          <div className="p-6 space-y-3 max-h-[420px] overflow-y-auto">
            {(['menstrual', 'follicular', 'ovulatory', 'luteal'] as CyclePhase[]).map((p) => {
              const cfg = CYCLE_PHASE_CONFIG[p];
              const isCurrent = cycleInfo.phase === p;
              return (
                <div
                  key={p}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    isCurrent
                      ? 'bg-pink-100/70 border-pink-400 shadow-xs'
                      : 'bg-white border-pink-200/80 hover:bg-pink-50/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{cfg.icon}</span>
                      <h4 className="text-xs font-extrabold text-pink-950">
                        {cfg.name}
                      </h4>
                      {isCurrent && (
                        <span className="px-2 py-0.5 text-[9px] font-bold bg-pink-500 text-white rounded-full">
                          You are here ✨
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-bold text-pink-600">
                      {cfg.season}
                    </span>
                  </div>
                  <p className="text-xs text-pink-800/90 pl-7 leading-relaxed font-medium">
                    {cfg.summary}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab 3: Settings Form */}
        {activeTab === 'settings' && (
          <form onSubmit={handleSaveSettings} className="p-6 space-y-4 max-h-[420px] overflow-y-auto">
            <div className="p-4 bg-pink-50/70 border border-pink-200 rounded-2xl space-y-3">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-pink-900 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-pink-500" />
                <span>Personalize Your Cycle & Period Dates</span>
              </h4>

              <div>
                <label className="block text-xs font-bold text-pink-900 mb-1">
                  First Day of Your Last Period:
                </label>
                <input
                  type="date"
                  required
                  value={lastStart}
                  onChange={(e) => setLastStart(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white border border-pink-300 rounded-xl text-pink-950 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-pink-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-pink-900 mb-1">
                    Average Cycle Length:
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="20"
                      max="45"
                      value={cycleLength}
                      onChange={(e) => setCycleLength(parseInt(e.target.value) || 28)}
                      className="w-full text-xs px-3 py-2 bg-white border border-pink-300 rounded-xl text-pink-950 font-mono font-bold focus:outline-none"
                    />
                    <span className="text-xs text-pink-600 font-mono">days</span>
                  </div>
                  <span className="text-[10px] text-pink-500 mt-0.5 block">Usually 28 days</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-pink-900 mb-1">
                    Period Duration:
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="2"
                      max="10"
                      value={periodDuration}
                      onChange={(e) => setPeriodDuration(parseInt(e.target.value) || 5)}
                      className="w-full text-xs px-3 py-2 bg-white border border-pink-300 rounded-xl text-pink-950 font-mono font-bold focus:outline-none"
                    />
                    <span className="text-xs text-pink-600 font-mono">days</span>
                  </div>
                  <span className="text-[10px] text-pink-500 mt-0.5 block">Usually 5 days</span>
                </div>
              </div>

              {/* Daily Morning Cycle Sync Notification Setting */}
              <div className="pt-3 border-t border-pink-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-full bg-white text-pink-600 flex items-center justify-center border border-pink-300 shadow-2xs text-xs">
                      <Bell className="w-3.5 h-3.5 fill-pink-400 text-pink-600" />
                    </span>
                    <div>
                      <span className="text-xs font-bold text-pink-950 block">
                        Daily Cycle-Synced Morning Encouragement 🌸
                      </span>
                      <span className="text-[10px] text-pink-600 font-medium block">
                        Opt-in to daily loving messages based on your hormonal phase
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setMorningNotificationEnabled(!morningNotificationEnabled)}
                    className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
                      morningNotificationEnabled ? 'bg-pink-500' : 'bg-pink-200'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform transform ${
                        morningNotificationEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {morningNotificationEnabled && (
                  <div className="pt-2 border-t border-pink-100 flex items-center justify-between flex-wrap gap-2">
                    <label className="text-xs font-bold text-pink-900">
                      Morning Delivery Time:
                    </label>
                    <div className="flex items-center gap-1.5">
                      {['07:00', '08:00', '09:00'].map((time) => (
                        <button
                          key={time}
                          type="button"
                          onClick={() => setMorningNotificationTime(time)}
                          className={`px-2 py-0.5 rounded-lg text-xs font-mono font-bold border transition-colors ${
                            morningNotificationTime === time
                              ? 'bg-pink-500 text-white border-pink-500 shadow-2xs'
                              : 'bg-white text-pink-700 border-pink-200 hover:bg-pink-100'
                          }`}
                        >
                          {time}
                        </button>
                      ))}
                      <input
                        type="time"
                        value={morningNotificationTime}
                        onChange={(e) => setMorningNotificationTime(e.target.value)}
                        className="text-xs px-2 py-0.5 bg-white border border-pink-200 rounded-lg text-pink-900 font-mono font-bold focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleLogPeriodStartedToday}
                className="px-3.5 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-300 rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs"
              >
                <span>🩸</span>
                <span>Period Started Today!</span>
              </button>

              <button
                type="submit"
                className="px-5 py-2 text-xs font-extrabold text-white bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 rounded-xl shadow-xs transition-transform active:scale-95"
              >
                Save My Cycle Settings 💖
              </button>
            </div>
          </form>
        )}

        {/* Footer Actions */}
        <div className="p-4 bg-pink-50/80 border-t border-pink-200 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={handleAddPhaseTimebox}
            className="px-4 py-2 text-xs font-extrabold text-pink-800 bg-white hover:bg-pink-100 border border-pink-300 rounded-xl shadow-2xs flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-pink-600" />
            <span>Timebox Today's Recommended Phase Activity 🎀</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-extrabold text-xs rounded-xl shadow-sm transition-transform active:scale-95"
          >
            Got It! 💖
          </button>
        </div>
      </div>
    </div>
  );
};
