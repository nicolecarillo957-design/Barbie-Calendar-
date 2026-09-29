import React, { useRef } from 'react';
import { CalendarEvent, UnscheduledTask } from '../types/calendar';
import { downloadFile, exportToIcs } from '../utils/dateUtils';
import { 
  Download, 
  Upload, 
  RotateCcw, 
  Check, 
  X,
  Sliders,
  Sparkles,
  Heart
} from 'lucide-react';
import { cuteSound } from '../utils/cuteSound';

import { CalendarThemeId, THEME_CONFIGS } from '../types/theme';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  events: CalendarEvent[];
  tasks: UnscheduledTask[];
  onResetData: () => void;
  onImportJson: (data: { events: CalendarEvent[]; tasks: UnscheduledTask[] }) => void;
  currentTheme?: CalendarThemeId;
  onSelectTheme?: (theme: CalendarThemeId) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  events,
  tasks,
  onResetData,
  onImportJson,
  currentTheme = 'pink',
  onSelectTheme,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleExportIcs = () => {
    cuteSound.playSparkle();
    const icsContent = exportToIcs(events);
    downloadFile(icsContent, 'barbie-calendar-schedule.ics', 'text/calendar;charset=utf-8');
  };

  const handleExportJson = () => {
    cuteSound.playSparkle();
    const backup = JSON.stringify({ events, tasks, exportedAt: new Date().toISOString() }, null, 2);
    downloadFile(backup, 'barbie-calendar-backup.json', 'application/json');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.events && Array.isArray(parsed.events)) {
          onImportJson({
            events: parsed.events,
            tasks: parsed.tasks || [],
          });
          cuteSound.playCelebrationFanfare();
          onClose();
        } else {
          alert('Invalid backup format. Missing events array.');
        }
      } catch (err) {
        alert('Could not parse JSON file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 bg-pink-950/50 backdrop-blur-2xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border-2 border-pink-300 overflow-hidden text-pink-950 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-pink-200 via-rose-100 to-pink-200 border-b border-pink-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-white text-pink-600 flex items-center justify-center shadow-xs border border-pink-300">
              <Sliders className="w-4 h-4 text-pink-600" />
            </span>
            <div>
              <h3 className="text-sm font-extrabold text-pink-950 flex items-center gap-1.5">
                <span>Barbie Settings & Sync</span>
                <span>🎀</span>
              </h3>
              <p className="text-[11px] text-pink-700 font-medium">Manage calendar export & backup</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-pink-700 hover:text-pink-900 hover:bg-pink-200/70 rounded-xl transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Section 0: Calendar Color Theme Customizer */}
          {onSelectTheme && (
            <div className="p-4 bg-pink-50/70 border border-pink-200 rounded-2xl">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 text-pink-900 font-extrabold text-xs uppercase tracking-wider">
                  <span>🎨</span>
                  <h4>Calendar Color Theme</h4>
                </div>
                <span className="text-[11px] font-extrabold text-pink-700 capitalize">
                  {THEME_CONFIGS[currentTheme]?.name.split(' ')[0]} Active
                </span>
              </div>
              <p className="text-xs text-pink-700 mb-3 font-medium">
                Choose your personal calendar aesthetic: Pink, Blue, Red, Orange, Black, Yellow, White, Green, Purple, or Rainbow!
              </p>

              <div className="grid grid-cols-5 gap-2">
                {(
                  [
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
                  ] as const
                ).map((themeId) => {
                  const cfg = THEME_CONFIGS[themeId];
                  const isSelected = currentTheme === themeId;
                  return (
                    <button
                      key={themeId}
                      onClick={() => {
                        cuteSound.playCelebrationFanfare();
                        onSelectTheme(themeId);
                      }}
                      className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                        isSelected
                          ? 'border-pink-500 bg-white ring-2 ring-pink-400 shadow-sm'
                          : 'border-pink-200 hover:border-pink-300 bg-white/70 hover:bg-white'
                      }`}
                      title={cfg.name}
                    >
                      <span
                        className="w-6 h-6 rounded-full border shadow-2xs flex items-center justify-center text-xs"
                        style={{ background: cfg.swatch, borderColor: cfg.swatchBorder }}
                      >
                        {isSelected ? '✓' : ''}
                      </span>
                      <span className="text-[10px] font-black text-slate-800 capitalize truncate w-full text-center">
                        {themeId}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 1: Standard iCal Export */}
          <div className="p-4 bg-pink-50/70 border border-pink-200 rounded-2xl">
            <div className="flex items-center gap-1.5 mb-1 text-pink-900 font-extrabold text-xs uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-pink-500 fill-pink-300" />
              <h4>Google Calendar & iCal Export 💖</h4>
            </div>
            <p className="text-xs text-pink-700 mb-3 font-medium">
              Export your Barbie timeboxes into a standard <span className="font-mono bg-pink-100 px-1 py-0.5 rounded text-pink-800 font-bold">.ics</span> file that easily imports into Google Calendar, Apple Calendar, or Outlook.
            </p>
            <button
              onClick={handleExportIcs}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-extrabold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition-transform active:scale-98"
            >
              <Download className="w-4 h-4" />
              Download Barbie iCalendar (.ics) File ({events.length} blocks) ✨
            </button>
          </div>

          {/* Section 2: Full Workspace Backup & Restore */}
          <div className="p-4 bg-pink-50/70 border border-pink-200 rounded-2xl">
            <div className="flex items-center gap-1.5 mb-1 text-pink-900 font-extrabold text-xs uppercase tracking-wider">
              <Heart className="w-3.5 h-3.5 text-pink-500 fill-pink-300" />
              <h4>Backup & Restore 🌸</h4>
            </div>
            <p className="text-xs text-pink-700 mb-3 font-medium">
              Save a full backup of all scheduled events, reminders, checklists, and backlog tasks, or restore your previous schedule anytime.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleExportJson}
                className="py-2 px-3 bg-white hover:bg-pink-100 text-pink-800 font-bold text-xs rounded-xl border border-pink-300 flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-pink-600" />
                Backup to JSON 🎀
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="py-2 px-3 bg-white hover:bg-pink-100 text-pink-800 font-bold text-xs rounded-xl border border-pink-300 flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
              >
                <Upload className="w-3.5 h-3.5 text-pink-600" />
                Restore JSON ✨
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Section 3: Clear Schedule & Start Fresh */}
          <div className="p-4 bg-rose-50/60 border border-rose-200 rounded-2xl">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-rose-800 mb-1 flex items-center gap-1">
              <span>Clear Schedule & Start Fresh</span>
              <span>🧁</span>
            </h4>
            <p className="text-xs text-rose-700 mb-3 font-medium">
              Remove all calendar events so you can plan your own custom schedule from scratch.
            </p>
            <button
              onClick={() => {
                onResetData();
                cuteSound.playCelebrationFanfare();
                onClose();
              }}
              className="py-2 px-3.5 text-rose-700 hover:text-white hover:bg-rose-500 bg-white text-xs font-bold rounded-xl border border-rose-300 transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Clear Schedule (Start Fresh) 🌸
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-pink-100/50 border-t border-pink-200 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-extrabold text-xs rounded-xl shadow-xs transition-colors"
          >
            Done 💖
          </button>
        </div>
      </div>
    </div>
  );
};
