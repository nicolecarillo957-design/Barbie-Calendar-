import React, { useState, useEffect } from 'react';
import { 
  CalendarEvent, 
  EventCategory, 
  Priority, 
  ReminderSetting, 
  Subtask 
} from '../types/calendar';
import { CATEGORY_LIST, getCategoryConfig } from '../utils/categories';
import { 
  checkOverlap, 
  formatDuration, 
  minutesToTime, 
  timeToMinutes 
} from '../utils/dateUtils';
import { 
  AlertTriangle, 
  Bell, 
  Check, 
  Copy, 
  Heart, 
  Link as LinkIcon, 
  MapPin, 
  Plus, 
  Sparkles, 
  Trash2, 
  X 
} from 'lucide-react';
import { cuteSound } from '../utils/cuteSound';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventToEdit?: CalendarEvent | null;
  defaultDate?: string;
  defaultTime?: string;
  allEvents: CalendarEvent[];
  onSave: (event: CalendarEvent) => void;
  onDelete?: (eventId: string) => void;
  onDuplicate?: (event: CalendarEvent) => void;
}

export const EventModal: React.FC<EventModalProps> = ({
  isOpen,
  onClose,
  eventToEdit,
  defaultDate,
  defaultTime,
  allEvents,
  onSave,
  onDelete,
  onDuplicate,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<EventCategory>('deep_work');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [priority, setPriority] = useState<Priority>('medium');
  const [location, setLocation] = useState('');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [reminders, setReminders] = useState<ReminderSetting[]>([
    { id: 'rem-default', minutesBefore: 15, label: '15m before 💖' }
  ]);
  const [customReminderMins, setCustomReminderMins] = useState(20);

  // Initialize form state
  useEffect(() => {
    if (eventToEdit) {
      setTitle(eventToEdit.title);
      setDescription(eventToEdit.description || '');
      setCategory(eventToEdit.category);
      setDate(eventToEdit.date);
      setStartTime(eventToEdit.startTime);
      setEndTime(eventToEdit.endTime);
      setPriority(eventToEdit.priority);
      setLocation(eventToEdit.location || '');
      setMeetingUrl(eventToEdit.meetingUrl || '');
      setSubtasks(eventToEdit.subtasks || []);
      setReminders(
        eventToEdit.reminders && eventToEdit.reminders.length > 0
          ? eventToEdit.reminders
          : [{ id: 'rem-15', minutesBefore: 15, label: '15m before 💖' }]
      );
    } else {
      const today = new Date();
      const defaultDateStr = defaultDate || today.toISOString().split('T')[0];
      const defaultStart = defaultTime || '09:00';
      const startMin = timeToMinutes(defaultStart);
      const endStr = minutesToTime(startMin + 60);

      setTitle('');
      setDescription('');
      setCategory('deep_work');
      setDate(defaultDateStr);
      setStartTime(defaultStart);
      setEndTime(endStr);
      setPriority('medium');
      setLocation('');
      setMeetingUrl('');
      setSubtasks([]);
      setReminders([
        { id: 'rem-15', minutesBefore: 15, label: '15m before 💖' }
      ]);
    }
  }, [eventToEdit, defaultDate, defaultTime, isOpen]);

  // Conflict detection
  const conflictingEvents = React.useMemo(() => {
    if (!date || !startTime || !endTime) return [];
    return allEvents.filter((ev) => {
      if (eventToEdit && ev.id === eventToEdit.id) return false;
      if (ev.date !== date) return false;
      return checkOverlap(startTime, endTime, ev.startTime, ev.endTime);
    });
  }, [allEvents, date, startTime, endTime, eventToEdit]);

  if (!isOpen) return null;

  const handleQuickDuration = (minutes: number) => {
    const sMin = timeToMinutes(startTime);
    setEndTime(minutesToTime(sMin + minutes));
    cuteSound.playCutePop();
  };

  const handleAddReminderPreset = (minutes: number, label: string) => {
    if (reminders.some((r) => r.minutesBefore === minutes)) return;
    setReminders([
      ...reminders,
      { id: `rem-${Date.now()}`, minutesBefore: minutes, label }
    ]);
    cuteSound.playCutePop();
  };

  const handleRemoveReminder = (id: string) => {
    setReminders(reminders.filter((r) => r.id !== id));
    cuteSound.playCutePop();
  };

  const handleAddCustomReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (customReminderMins <= 0) return;
    handleAddReminderPreset(customReminderMins, `${customReminderMins}m before ✨`);
  };

  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskText.trim()) return;
    setSubtasks([
      ...subtasks,
      {
        id: `st-${Date.now()}`,
        text: newSubtaskText.trim(),
        completed: false,
      },
    ]);
    setNewSubtaskText('');
    cuteSound.playCutePop();
  };

  const handleToggleSubtask = (id: string) => {
    setSubtasks(
      subtasks.map((st) => (st.id === id ? { ...st, completed: !st.completed } : st))
    );
    cuteSound.playCutePop();
  };

  const handleDeleteSubtask = (id: string) => {
    setSubtasks(subtasks.filter((st) => st.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date || !startTime || !endTime) return;

    const eventData: CalendarEvent = {
      id: eventToEdit ? eventToEdit.id : `evt-${Date.now()}`,
      title: title.trim(),
      description: description.trim() || undefined,
      category,
      date,
      startTime,
      endTime,
      isCompleted: eventToEdit ? eventToEdit.isCompleted : false,
      priority,
      location: location.trim() || undefined,
      meetingUrl: meetingUrl.trim() || undefined,
      subtasks: subtasks.length > 0 ? subtasks : undefined,
      reminders: reminders.length > 0 ? reminders : undefined,
    };

    cuteSound.playSparkle();
    onSave(eventData);
    onClose();
  };

  const activeCatConfig = getCategoryConfig(category);

  return (
    <div className="fixed inset-0 z-50 bg-pink-950/50 backdrop-blur-2xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border-2 border-pink-300 overflow-hidden my-8 text-pink-950 animate-in zoom-in-95 duration-200">
        {/* Top Header */}
        <div className="p-4 bg-gradient-to-r from-pink-200 via-rose-100 to-pink-200 border-b border-pink-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="w-3.5 h-3.5 rounded-full shadow-xs border border-white"
              style={{ backgroundColor: activeCatConfig.color }}
            />
            <h3 className="text-sm font-extrabold text-pink-950 flex items-center gap-1.5">
              <span>{eventToEdit ? 'Edit Glam Timebox' : 'Schedule Barbie Timebox'}</span>
              <span>💖</span>
            </h3>
          </div>

          <div className="flex items-center gap-1">
            {eventToEdit && onDuplicate && (
              <button
                type="button"
                onClick={() => {
                  onDuplicate(eventToEdit);
                  cuteSound.playSparkle();
                  onClose();
                }}
                className="p-1.5 text-pink-600 hover:text-pink-900 hover:bg-pink-200/70 rounded-xl transition-colors"
                title="Duplicate timebox"
              >
                <Copy className="w-4 h-4" />
              </button>
            )}

            {eventToEdit && onDelete && (
              <button
                type="button"
                onClick={() => {
                  onDelete(eventToEdit.id);
                  onClose();
                }}
                className="p-1.5 text-pink-600 hover:text-rose-600 hover:bg-rose-100 rounded-xl transition-colors"
                title="Delete timebox"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-pink-700 hover:text-pink-900 hover:bg-pink-200/70 rounded-xl transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Conflict Warning Banner */}
          {conflictingEvents.length > 0 && (
            <div className="p-3 bg-rose-50 border border-rose-300 rounded-2xl flex items-start gap-2.5 text-xs text-rose-800">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Schedule Overlap Alert 🌸</span>
                <span>
                  Overlaps with {conflictingEvents.map((c) => `"${c.title}" (${c.startTime}–${c.endTime})`).join(', ')}.
                </span>
              </div>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-pink-900 mb-1">
              Timebox Title 🎀
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. Dreamhouse Design & Glam Moodboard"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-sm px-3.5 py-2.5 bg-pink-50/50 border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400 focus:bg-white text-pink-950 font-medium placeholder:text-pink-300"
            />
          </div>

          {/* Category & Priority Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-pink-900 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as EventCategory)}
                className="w-full text-xs px-3 py-2 bg-pink-50/50 border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400 focus:bg-white text-pink-950 font-semibold"
              >
                {CATEGORY_LIST.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-pink-900 mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full text-xs px-3 py-2 bg-pink-50/50 border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400 focus:bg-white text-pink-950 font-semibold"
              >
                <option value="high">High Priority 💖</option>
                <option value="medium">Medium Priority 🌸</option>
                <option value="low">Low Priority ✨</option>
              </select>
            </div>
          </div>

          {/* Date, Start Time, End Time */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-bold text-pink-900 mb-1">
                Date
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full text-xs px-2.5 py-2 bg-pink-50/50 border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400 focus:bg-white text-pink-950 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-pink-900 mb-1">
                Start Time
              </label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full text-xs px-2.5 py-2 bg-pink-50/50 border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400 focus:bg-white text-pink-950 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-pink-900 mb-1">
                End Time
              </label>
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full text-xs px-2.5 py-2 bg-pink-50/50 border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400 focus:bg-white text-pink-950 font-mono"
              />
            </div>
          </div>

          {/* Duration Preset Chips */}
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-pink-600 font-bold">
              Duration: {formatDuration(startTime, endTime)}
            </span>
            <div className="flex items-center gap-1">
              {[30, 45, 60, 90, 120].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => handleQuickDuration(mins)}
                  className="px-2 py-0.5 text-[11px] font-mono font-bold text-pink-700 bg-pink-100 hover:bg-pink-200 rounded-lg transition-colors border border-pink-200"
                >
                  +{mins < 60 ? `${mins}m` : `${mins / 60}h`}
                </button>
              ))}
            </div>
          </div>

          {/* Location & Meeting Link */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-pink-900 mb-1">
                Location 🌴
              </label>
              <div className="relative">
                <MapPin className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-pink-400" />
                <input
                  type="text"
                  placeholder="Dreamhouse, Studio, Spa"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full text-xs pl-8 pr-2.5 py-2 bg-pink-50/50 border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400 focus:bg-white text-pink-950 placeholder:text-pink-300"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-pink-900 mb-1">
                Virtual Link 🌸
              </label>
              <div className="relative">
                <LinkIcon className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-pink-400" />
                <input
                  type="text"
                  placeholder="Google Meet or Zoom"
                  value={meetingUrl}
                  onChange={(e) => setMeetingUrl(e.target.value)}
                  className="w-full text-xs pl-8 pr-2.5 py-2 bg-pink-50/50 border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400 focus:bg-white text-pink-950 placeholder:text-pink-300"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-pink-900 mb-1">
              Objectives & Sparkle Notes ✨
            </label>
            <textarea
              rows={2}
              placeholder="What is your intention or deliverable for this glamorous timebox?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-pink-50/50 border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400 focus:bg-white text-pink-950 resize-none placeholder:text-pink-300"
            />
          </div>

          {/* Subtasks checklist */}
          <div>
            <label className="block text-xs font-bold text-pink-900 mb-1">
              Checklist & Milestones ({subtasks.filter((s) => s.completed).length}/{subtasks.length}) 🎀
            </label>

            {/* List */}
            {subtasks.length > 0 && (
              <div className="space-y-1.5 mb-2 max-h-28 overflow-y-auto pr-1">
                {subtasks.map((st) => (
                  <div
                    key={st.id}
                    className="flex items-center justify-between p-2 bg-pink-50/70 rounded-xl border border-pink-200 text-xs"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <button
                        type="button"
                        onClick={() => handleToggleSubtask(st.id)}
                        className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${
                          st.completed
                            ? 'bg-pink-500 border-pink-500 text-white'
                            : 'border-pink-300 bg-white hover:border-pink-500'
                        }`}
                      >
                        {st.completed && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </button>
                      <span className={`truncate font-medium ${st.completed ? 'line-through text-pink-400' : 'text-pink-950'}`}>
                        {st.text}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteSubtask(st.id)}
                      className="text-pink-400 hover:text-rose-600 p-0.5 rounded"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Subtask row */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add milestone step..."
                value={newSubtaskText}
                onChange={(e) => setNewSubtaskText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSubtask(e);
                  }
                }}
                className="flex-1 text-xs px-3 py-1.5 bg-pink-50/50 border border-pink-200 rounded-xl focus:outline-none focus:border-pink-500 focus:bg-white placeholder:text-pink-300"
              />
              <button
                type="button"
                onClick={handleAddSubtask}
                className="px-3 py-1.5 text-xs font-bold bg-pink-100 hover:bg-pink-200 text-pink-800 rounded-xl border border-pink-300 transition-colors flex items-center gap-1 shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>
          </div>

          {/* Cutesy Pink Reminder Configuration */}
          <div className="p-3.5 bg-pink-50/90 border border-pink-200/90 rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-pink-900 font-extrabold text-xs uppercase tracking-wider">
                <Bell className="w-3.5 h-3.5 fill-pink-400 text-pink-600 animate-wiggle" />
                <label>Sweet Reminders 🎀</label>
              </div>
              <span className="text-[10px] text-pink-600 font-medium">
                Melodic chime & popup
              </span>
            </div>

            {/* Active Reminders List */}
            {reminders.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {reminders.map((rem) => (
                  <span
                    key={rem.id}
                    className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 bg-white border border-pink-300 text-pink-800 rounded-full shadow-2xs"
                  >
                    <span>{rem.label || (rem.minutesBefore === 0 ? 'At start time ⏰' : `${rem.minutesBefore}m before 💖`)}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveReminder(rem.id)}
                      className="text-pink-400 hover:text-pink-700 ml-0.5 rounded-full"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-pink-500 italic">No reminders set for this block</p>
            )}

            {/* Quick Add Preset Buttons */}
            <div className="pt-1.5 border-t border-pink-200/60 flex flex-wrap items-center gap-1">
              <span className="text-[10px] font-bold text-pink-700 mr-1">Add:</span>
              {[
                { m: 0, label: 'At start ⏰' },
                { m: 5, label: '5m 🌸' },
                { m: 10, label: '10m 🎀' },
                { m: 15, label: '15m 💖' },
                { m: 30, label: '30m ☕' },
                { m: 60, label: '1 hour 🧁' },
              ].map((preset) => (
                <button
                  key={preset.m}
                  type="button"
                  onClick={() => handleAddReminderPreset(preset.m, preset.label)}
                  disabled={reminders.some((r) => r.minutesBefore === preset.m)}
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-lg transition-all ${
                    reminders.some((r) => r.minutesBefore === preset.m)
                      ? 'bg-pink-200/60 text-pink-400 cursor-not-allowed'
                      : 'bg-white hover:bg-pink-100 text-pink-700 border border-pink-300 shadow-2xs'
                  }`}
                >
                  +{preset.label}
                </button>
              ))}
            </div>

            {/* Custom Minutes Input */}
            <div className="flex items-center gap-1.5 pt-1">
              <span className="text-[10px] text-pink-700 font-bold">Custom:</span>
              <input
                type="number"
                min="1"
                max="10080"
                value={customReminderMins}
                onChange={(e) => setCustomReminderMins(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-14 text-xs px-2 py-0.5 bg-white border border-pink-300 rounded-lg text-pink-900 font-mono font-bold focus:outline-none focus:border-pink-500"
              />
              <span className="text-[10px] text-pink-700 font-mono">mins before</span>
              <button
                type="button"
                onClick={handleAddCustomReminder}
                className="px-2.5 py-0.5 bg-pink-500 hover:bg-pink-600 text-white text-[11px] font-bold rounded-lg shadow-2xs transition-colors"
              >
                Add ✨
              </button>
            </div>
          </div>

          {/* Form Actions Footer */}
          <div className="pt-3 border-t border-pink-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-pink-700 hover:text-pink-950"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-extrabold text-white bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 rounded-xl shadow-md shadow-pink-300/60 transition-transform active:scale-95 flex items-center gap-1.5"
            >
              <Heart className="w-3.5 h-3.5 fill-current" />
              <span>{eventToEdit ? 'Save Changes 💖' : 'Schedule Timebox 🎀'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
