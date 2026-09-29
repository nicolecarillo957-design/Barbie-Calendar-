import React, { useState } from 'react';
import { AppNotification, CalendarEvent, UnscheduledTask } from '../types/calendar';
import { cuteSound } from '../utils/cuteSound';
import { 
  Bell, 
  Check, 
  Clock, 
  Heart, 
  RotateCcw, 
  Sparkles, 
  Trash2, 
  Volume2, 
  VolumeX, 
  X,
  Calendar,
  Layers
} from 'lucide-react';

interface CuteNotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  upcomingEvents: CalendarEvent[];
  upcomingTasks: UnscheduledTask[];
  onDismiss: (id: string) => void;
  onClearAll: () => void;
  onSnooze: (id: string, minutes: number) => void;
  onTriggerTestReminder: () => void;
  onTriggerCycleMorningNotification?: () => void;
  onSelectEvent: (event: CalendarEvent) => void;
}

export const CuteNotificationCenter: React.FC<CuteNotificationCenterProps> = ({
  isOpen,
  onClose,
  notifications,
  upcomingEvents,
  upcomingTasks,
  onDismiss,
  onClearAll,
  onSnooze,
  onTriggerTestReminder,
  onTriggerCycleMorningNotification,
  onSelectEvent,
}) => {
  const [activeTab, setActiveTab] = useState<'alerts' | 'upcoming'>('alerts');
  const [soundOn, setSoundOn] = useState(cuteSound.isSoundEnabled());

  if (!isOpen) return null;

  const handleToggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    cuteSound.setSoundEnabled(next);
    if (next) {
      cuteSound.playSparkle();
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-2xs flex justify-end">
      {/* Click outside to close */}
      <div className="flex-1" onClick={onClose} />

      {/* Drawer */}
      <div className="w-full max-w-md bg-pink-50/95 border-l-2 border-pink-200 h-full flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-right duration-200 text-slate-800">
        {/* Pink Cutesy Header */}
        <div className="p-4 bg-gradient-to-r from-pink-200 via-rose-100 to-pink-200 border-b border-pink-300 flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-white text-pink-600 flex items-center justify-center shadow-xs border border-pink-300">
              <Bell className="w-4 h-4 fill-pink-400 text-pink-600 animate-wiggle" />
            </span>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-pink-950 tracking-tight flex items-center gap-1">
                  Cute Reminders 🎀
                </h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-pink-600 text-white rounded-full font-mono shadow-xs">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <p className="text-[11px] text-pink-700 font-medium">
                Sweet alerts for your day ✨
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleToggleSound}
              className={`p-1.5 rounded-lg border transition-colors ${
                soundOn
                  ? 'bg-pink-100 border-pink-300 text-pink-700 hover:bg-pink-200'
                  : 'bg-white/80 border-slate-200 text-slate-400 hover:bg-slate-100'
              }`}
              title={soundOn ? 'Sound alerts enabled' : 'Sound alerts muted'}
            >
              {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-pink-700 hover:text-pink-900 hover:bg-pink-200/80 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Test & Helper Bar */}
        <div className="px-4 py-2.5 bg-pink-100/60 border-b border-pink-200 flex items-center justify-between text-xs flex-wrap gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => {
                cuteSound.playCuteChime();
                onTriggerTestReminder();
              }}
              className="px-2.5 py-1 font-semibold text-pink-800 bg-white hover:bg-pink-50 border border-pink-300 rounded-lg shadow-2xs flex items-center gap-1 transition-colors text-[11px]"
            >
              <Sparkles className="w-3 h-3 text-pink-500 fill-pink-300" />
              <span>Test Chime 🌸</span>
            </button>

            {onTriggerCycleMorningNotification && (
              <button
                onClick={() => {
                  onTriggerCycleMorningNotification();
                }}
                className="px-2.5 py-1 font-semibold text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-300 rounded-lg shadow-2xs flex items-center gap-1 transition-colors text-[11px]"
                title="Trigger today's cycle-synced morning encouragement message"
              >
                <span>👑</span>
                <span>Morning Glow Check-in</span>
              </button>
            )}
          </div>

          {notifications.length > 0 && (
            <button
              onClick={onClearAll}
              className="text-pink-600 hover:text-pink-800 font-medium flex items-center gap-1 text-[11px]"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear all</span>
            </button>
          )}
        </div>

        {/* Segmented Tab Controls */}
        <div className="p-2 border-b border-pink-200/80 bg-white/70">
          <div className="flex items-center gap-1 bg-pink-100/60 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('alerts')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === 'alerts'
                  ? 'bg-white text-pink-900 shadow-xs'
                  : 'text-pink-700 hover:text-pink-950'
              }`}
            >
              <Heart className="w-3 h-3 fill-pink-400 text-pink-500" />
              <span>Alerts ({notifications.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('upcoming')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === 'upcoming'
                  ? 'bg-white text-pink-900 shadow-xs'
                  : 'text-pink-700 hover:text-pink-950'
              }`}
            >
              <Clock className="w-3 h-3 text-pink-500" />
              <span>Upcoming Today</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Recent Alerts */}
        {activeTab === 'alerts' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {notifications.length === 0 ? (
              <div className="text-center py-12 text-pink-400">
                <Heart className="w-10 h-10 mx-auto mb-2 text-pink-300 fill-pink-100" />
                <p className="text-sm font-bold text-pink-800">All caught up! 💖</p>
                <p className="text-xs text-pink-500 mt-1 max-w-xs mx-auto">
                  When a scheduled reminder fires, you'll hear a cute melody and see your reminder here!
                </p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-3.5 rounded-xl border shadow-xs transition-all group ${
                    notif.type === 'cycle_morning'
                      ? 'bg-gradient-to-r from-rose-50/90 via-pink-50/90 to-rose-50/90 border-rose-300 hover:border-rose-400'
                      : 'bg-white border-pink-200 hover:border-pink-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border ${
                        notif.type === 'cycle_morning'
                          ? 'bg-rose-100 text-rose-600 border-rose-300'
                          : 'bg-pink-100 text-pink-600 border-pink-200'
                      }`}>
                        {notif.type === 'cycle_morning' ? (
                          <span className="text-xs">🌸</span>
                        ) : (
                          <Sparkles className="w-3 h-3 fill-pink-300 text-pink-600" />
                        )}
                      </span>
                      <div>
                        {notif.type === 'cycle_morning' && (
                          <span className="text-[9px] uppercase tracking-wider font-extrabold text-rose-700 bg-white/80 px-1.5 py-0.5 rounded-md border border-rose-200 inline-block mb-0.5">
                            Daily Cycle Encouragement
                          </span>
                        )}
                        <h4 className="text-xs font-bold text-pink-950">
                          {notif.title}
                        </h4>
                      </div>
                    </div>

                    <button
                      onClick={() => onDismiss(notif.id)}
                      className="text-pink-400 hover:text-pink-700 p-0.5 rounded transition-colors"
                      title="Dismiss"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <p className="text-xs text-pink-800/90 mt-1.5 pl-8 leading-snug">
                    {notif.message}
                  </p>

                  <div className="flex items-center justify-between text-[11px] mt-2.5 pt-2 border-t border-pink-100 pl-8">
                    <span className="text-pink-400 font-mono text-[10px]">
                      {notif.timestamp}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onSnooze(notif.id, 5)}
                        className="px-2 py-0.5 text-[11px] font-semibold text-pink-700 bg-pink-50 hover:bg-pink-100 rounded border border-pink-200 flex items-center gap-1"
                      >
                        <RotateCcw className="w-2.5 h-2.5" />
                        <span>5m</span>
                      </button>

                      <button
                        onClick={() => onSnooze(notif.id, 15)}
                        className="px-2 py-0.5 text-[11px] font-semibold text-pink-700 bg-pink-50 hover:bg-pink-100 rounded border border-pink-200 flex items-center gap-1"
                      >
                        <Clock className="w-2.5 h-2.5" />
                        <span>15m</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 2: Upcoming Reminders for Today */}
        {activeTab === 'upcoming' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-pink-700 mb-1">
              Events Scheduled with Reminders
            </h4>

            {upcomingEvents.length === 0 ? (
              <div className="text-center py-8 text-pink-400">
                <Calendar className="w-8 h-8 mx-auto mb-2 text-pink-300" />
                <p className="text-xs text-pink-600">No events today with active reminders</p>
              </div>
            ) : (
              upcomingEvents.map((ev) => (
                <div
                  key={ev.id}
                  onClick={() => onSelectEvent(ev)}
                  className="p-3 bg-white rounded-xl border border-pink-200 shadow-2xs hover:shadow-xs transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-pink-950 truncate">
                      {ev.title}
                    </span>
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-pink-100 text-pink-700 border border-pink-200 shrink-0">
                      {ev.startTime}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-1.5 text-[11px] text-pink-600">
                    <Bell className="w-3 h-3 text-pink-500" />
                    <span>
                      {ev.reminders && ev.reminders.length > 0
                        ? ev.reminders.map((r) => r.label || `${r.minutesBefore}m before`).join(', ')
                        : '15m before (Default)'}
                    </span>
                  </div>
                </div>
              ))
            )}

            {/* Upcoming Tasks */}
            {upcomingTasks.length > 0 && (
              <div className="pt-3">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-pink-700 mb-2">
                  Backlog Tasks with Reminders
                </h4>
                <div className="space-y-2">
                  {upcomingTasks.map((t) => (
                    <div
                      key={t.id}
                      className="p-2.5 bg-white rounded-lg border border-pink-200 text-xs flex items-center justify-between"
                    >
                      <span className="font-medium text-pink-950 truncate">
                        {t.title}
                      </span>
                      <span className="text-[10px] font-mono text-pink-600 bg-pink-50 px-2 py-0.5 rounded border border-pink-200">
                        {t.reminderMinutesBefore ? `${t.reminderMinutesBefore}m before` : 'Active'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer info */}
        <div className="p-3 bg-pink-100/50 border-t border-pink-200 text-center text-[11px] text-pink-700 font-medium">
          🌸 Reminders play sweet chimes and show cute pink notifications
        </div>
      </div>
    </div>
  );
};
