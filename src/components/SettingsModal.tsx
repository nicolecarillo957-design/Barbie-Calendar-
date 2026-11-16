import React, { useRef, useState } from 'react';
import { CalendarEvent, UnscheduledTask, UserRole } from '../types/calendar';
import { downloadFile, exportToIcs } from '../utils/dateUtils';
import {
  Download,
  Upload,
  RotateCcw,
  X,
  Sliders,
  Sparkles,
  Heart,
  Mail,
  LogOut,
  ShieldCheck,
  BookOpen,
  GraduationCap,
  Copy,
  Check,
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
  studentName?: string;
  onUpdateStudentName?: (name: string) => void;
  onOpenTeacherMonitor?: () => void;
  userEmail?: string;
  teacherEmail?: string;
  onUpdateTeacherEmail?: (email: string) => Promise<void>;
  userRole?: UserRole | null;
  onChangeUserRole?: (role: UserRole) => Promise<void>;
  onSignOut?: () => void;
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
  studentName = 'Student',
  onUpdateStudentName,
  onOpenTeacherMonitor,
  userEmail,
  teacherEmail = '',
  onUpdateTeacherEmail,
  userRole = 'student',
  onChangeUserRole,
  onSignOut,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [localStudentName, setLocalStudentName] = useState(studentName);
  const [localTeacherEmail, setLocalTeacherEmail] = useState(teacherEmail);
  const [savingTeacher, setSavingTeacher] = useState(false);
  const [teacherSavedMsg, setTeacherSavedMsg] = useState(false);
  const [teacherErrorMsg, setTeacherErrorMsg] = useState('');
  const [nameSavedMsg, setNameSavedMsg] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [switchingRole, setSwitchingRole] = useState(false);
  const [copiedTeacherEmail, setCopiedTeacherEmail] = useState(false);
  const isTeacherAccount = userRole === 'teacher';

  React.useEffect(() => {
    setLocalStudentName(studentName);
  }, [studentName]);

  React.useEffect(() => {
    setLocalTeacherEmail(teacherEmail);
  }, [teacherEmail]);

  if (!isOpen) return null;

  const handleExportIcs = () => {
    cuteSound.playSparkle();
    const icsContent = exportToIcs(events);
    downloadFile(icsContent, 'edutrack-calendar-schedule.ics', 'text/calendar;charset=utf-8');
  };

  const handleExportJson = () => {
    cuteSound.playSparkle();
    const backup = JSON.stringify({ events, tasks, exportedAt: new Date().toISOString() }, null, 2);
    downloadFile(backup, 'edutrack-calendar-backup.json', 'application/json');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);

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
          setImportError('Invalid backup format. Missing events array.');
        }
      } catch {
        setImportError('Could not parse JSON backup file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 bg-pink-950/50 backdrop-blur-2xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border-2 border-pink-300 overflow-hidden text-pink-950 animate-in zoom-in-95 duration-200 max-h-[92dvh] flex flex-col">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-pink-200 via-rose-100 to-pink-200 border-b border-pink-300 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-8 h-8 rounded-full bg-white text-pink-600 flex items-center justify-center shadow-xs border border-pink-300 shrink-0">
              <Sliders className="w-4 h-4 text-pink-600" />
            </span>
            <div className="min-w-0">
              <h3 className="text-sm font-extrabold text-pink-950 flex items-center gap-1.5 truncate">
                <span>EduTrack Settings &amp; Sync</span>
                <span>🎀</span>
              </h3>
              <p className="text-[11px] text-pink-700 font-medium truncate">
                Password safety, teacher sync &amp; export
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-pink-700 hover:text-pink-900 hover:bg-pink-200/70 rounded-xl transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-5 flex-1 overflow-y-auto">
          {/* Section 0: Calendar Color Theme Customizer */}
          {onSelectTheme && (
            <div className="p-3.5 sm:p-4 bg-pink-50/70 border border-pink-200 rounded-2xl">
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
                Pick Pink, Blue, Red, Orange, Black, Yellow, White, Green, Purple, or Rainbow!
              </p>

              <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
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
                      type="button"
                      onClick={() => {
                        cuteSound.playCelebrationFanfare();
                        onSelectTheme(themeId);
                      }}
                      className={`p-1.5 sm:p-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                        isSelected
                          ? 'border-pink-500 bg-white ring-2 ring-pink-400 shadow-sm'
                          : 'border-pink-200 hover:border-pink-300 bg-white/70 hover:bg-white'
                      }`}
                      title={cfg.name}
                    >
                      <span
                        className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border shadow-2xs flex items-center justify-center text-[10px] sm:text-xs"
                        style={{ background: cfg.swatch, borderColor: cfg.swatchBorder }}
                      >
                        {isSelected ? '✓' : ''}
                      </span>
                      <span className="text-[9px] sm:text-[10px] font-black text-slate-800 capitalize truncate w-full text-center">
                        {themeId}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 0.1: Google Account & Cloud Sync Security */}
          <div className="p-3.5 sm:p-4 bg-gradient-to-br from-emerald-50/60 to-pink-50/70 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-8 h-8 rounded-full bg-white text-emerald-600 flex items-center justify-center border border-emerald-200 shadow-2xs shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <h4 className="text-xs font-black uppercase tracking-wider text-pink-950">
                  Firebase Cloud Sync Active
                </h4>
                <p className="text-[11px] text-pink-700 font-medium truncate">
                  {userEmail ? `Verified Google session (${userEmail})` : 'Protected by Google Sign-In'}
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold shrink-0 bg-emerald-100 text-emerald-800 border border-emerald-300">
              Verified
            </span>
          </div>

          {/* Section 0.2: Role Switcher & Profile */}
          <div className="p-3.5 sm:p-4 bg-gradient-to-br from-amber-50/60 to-pink-50/70 border border-amber-200/80 rounded-2xl space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-white text-amber-600 flex items-center justify-center border border-amber-300 shadow-2xs text-base shrink-0">
                {isTeacherAccount ? '👩‍🏫' : '🎒'}
              </span>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-pink-950">
                  Account Role &amp; Profile
                </h4>
                <p className="text-[11px] text-pink-700 font-medium">
                  {isTeacherAccount
                    ? 'Teacher mode: monitor assigned student calendars & inspect photo proofs.'
                    : 'Student mode: plan timeboxes, attach photo proof for points, & link a teacher.'}
                </p>
              </div>
            </div>

            {onChangeUserRole && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={switchingRole}
                  onClick={async () => {
                    if (userRole === 'student') return;
                    setSwitchingRole(true);
                    try {
                      await onChangeUserRole('student');
                      cuteSound.playSparkle();
                    } finally {
                      setSwitchingRole(false);
                    }
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2 ${
                    !isTeacherAccount
                      ? 'bg-pink-500 text-white border-pink-600 shadow-xs'
                      : 'bg-white text-pink-950 border-pink-200 hover:bg-pink-50'
                  }`}
                >
                  <BookOpen className="w-4 h-4 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-black">Student</div>
                    <div className={`text-[10px] truncate ${!isTeacherAccount ? 'text-pink-100' : 'text-pink-600'}`}>
                      Planner &amp; Streaks
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  disabled={switchingRole}
                  onClick={async () => {
                    if (userRole === 'teacher') return;
                    setSwitchingRole(true);
                    try {
                      await onChangeUserRole('teacher');
                      cuteSound.playSparkle();
                    } finally {
                      setSwitchingRole(false);
                    }
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2 ${
                    isTeacherAccount
                      ? 'bg-purple-600 text-white border-purple-700 shadow-xs'
                      : 'bg-white text-pink-950 border-pink-200 hover:bg-purple-50'
                  }`}
                >
                  <GraduationCap className="w-4 h-4 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-black">Teacher</div>
                    <div className={`text-[10px] truncate ${isTeacherAccount ? 'text-purple-100' : 'text-purple-700'}`}>
                      Monitor Students
                    </div>
                  </div>
                </button>
              </div>
            )}

            {userEmail && (
              <div className="p-2.5 bg-white/90 rounded-xl border border-pink-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <Mail className="w-3.5 h-3.5 text-pink-500 shrink-0" />
                  <span className="font-bold text-pink-900 truncate">{userEmail}</span>
                </div>
                {onSignOut && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onSignOut();
                    }}
                    className="px-2.5 py-1 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg flex items-center gap-1 shrink-0"
                  >
                    <LogOut className="w-3 h-3" />
                    <span>Sign Out</span>
                  </button>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="text"
                value={localStudentName}
                onChange={(e) => setLocalStudentName(e.target.value)}
                placeholder={isTeacherAccount ? 'Enter Teacher Name (e.g., Ms. Cruz)' : 'Enter Student Name (e.g., Nicole C.)'}
                className="flex-1 text-xs px-3 py-2 bg-white border border-pink-200 rounded-xl text-pink-950 focus:outline-none focus:ring-1 focus:ring-pink-400 font-bold"
              />
              <button
                type="button"
                onClick={() => {
                  if (onUpdateStudentName && localStudentName.trim()) {
                    onUpdateStudentName(localStudentName.trim());
                    cuteSound.playSparkle();
                    setNameSavedMsg(true);
                    setTimeout(() => setNameSavedMsg(false), 2500);
                  }
                }}
                className="px-3 py-2 bg-pink-500 hover:bg-pink-600 text-white font-bold text-xs rounded-xl shadow-2xs transition-colors shrink-0"
              >
                Save Name 💖
              </button>
            </div>
            {nameSavedMsg && (
              <p className="text-[11px] text-emerald-700 font-bold">Display name saved!</p>
            )}

            {isTeacherAccount && userEmail ? (
              <div className="mt-2 pt-2 border-t border-purple-200/70 space-y-1.5">
                <span className="block text-[11px] font-bold text-purple-950">
                  Share this Teacher Gmail with your students so they can link their calendar:
                </span>
                <div className="flex items-center gap-2">
                  <div className="flex-1 text-xs px-3 py-2 bg-white border border-purple-200 rounded-xl font-mono text-purple-950 truncate">
                    {userEmail}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(userEmail);
                      setCopiedTeacherEmail(true);
                      setTimeout(() => setCopiedTeacherEmail(false), 2000);
                    }}
                    className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-2xs flex items-center gap-1 shrink-0"
                  >
                    {copiedTeacherEmail ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedTeacherEmail ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            ) : (
              onUpdateTeacherEmail && (
                <div className="mt-2 pt-2 border-t border-amber-200/70 space-y-1.5">
                  <label className="block text-[11px] font-bold text-amber-950">
                    Assigned Teacher&apos;s Gmail (lets your teacher monitor your calendar &amp; proofs):
                  </label>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <input
                      type="email"
                      value={localTeacherEmail}
                      onChange={(e) => {
                        setLocalTeacherEmail(e.target.value);
                        setTeacherErrorMsg('');
                        setTeacherSavedMsg(false);
                      }}
                      placeholder="teacher@gmail.com"
                      className="flex-1 text-xs px-3 py-2 bg-white border border-amber-200 rounded-xl text-pink-950 focus:outline-none focus:ring-1 focus:ring-amber-400 font-medium"
                    />
                    <button
                      type="button"
                      disabled={savingTeacher}
                      onClick={async () => {
                        setSavingTeacher(true);
                        setTeacherErrorMsg('');
                        try {
                          await onUpdateTeacherEmail(localTeacherEmail.trim().toLowerCase());
                          cuteSound.playSparkle();
                          setTeacherSavedMsg(true);
                          setTimeout(() => setTeacherSavedMsg(false), 3000);
                        } catch (err) {
                          setTeacherErrorMsg(
                            err instanceof Error ? err.message : 'Could not link teacher Gmail.'
                          );
                        } finally {
                          setSavingTeacher(false);
                        }
                      }}
                      className="px-3 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-2xs transition-colors shrink-0"
                    >
                      {savingTeacher ? 'Linking...' : 'Link Teacher 👩‍🏫'}
                    </button>
                  </div>
                  {teacherErrorMsg && (
                    <p className="text-[11px] text-rose-600 font-bold">{teacherErrorMsg}</p>
                  )}
                  {teacherSavedMsg && (
                    <p className="text-[11px] text-emerald-700 font-bold">
                      Teacher Gmail linked! They can now monitor your calendar and photo proofs.
                    </p>
                  )}
                </div>
              )
            )}

            {onOpenTeacherMonitor && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenTeacherMonitor();
                }}
                className="w-full py-2 bg-white hover:bg-amber-50 border border-amber-300 rounded-xl text-xs font-bold text-amber-900 shadow-2xs flex items-center justify-center gap-2 transition-colors"
              >
                <span>👩‍🏫 Open Teacher Monitoring Dashboard</span>
              </button>
            )}
          </div>

          {/* Section 1: Standard iCal Export */}
          <div className="p-3.5 sm:p-4 bg-pink-50/70 border border-pink-200 rounded-2xl">
            <div className="flex items-center gap-1.5 mb-1 text-pink-900 font-extrabold text-xs uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-pink-500 fill-pink-300" />
              <h4>Google Calendar &amp; iCal Export 💖</h4>
            </div>
            <p className="text-xs text-pink-700 mb-3 font-medium">
              Export your timeboxes into a standard <span className="font-mono bg-pink-100 px-1 py-0.5 rounded text-pink-800 font-bold">.ics</span> file for Google Calendar, Apple Calendar, or Outlook.
            </p>
            <button
              type="button"
              onClick={handleExportIcs}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-extrabold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition-transform active:scale-98"
            >
              <Download className="w-4 h-4 shrink-0" />
              <span>Download iCalendar (.ics) ({events.length} blocks) ✨</span>
            </button>
          </div>

          {/* Section 2 & 3: Backup/Restore & Clear Schedule (Student Planner Only) */}
          {!isTeacherAccount && (
            <>
              <div className="p-3.5 sm:p-4 bg-pink-50/70 border border-pink-200 rounded-2xl">
                <div className="flex items-center gap-1.5 mb-1 text-pink-900 font-extrabold text-xs uppercase tracking-wider">
                  <Heart className="w-3.5 h-3.5 text-pink-500 fill-pink-300" />
                  <h4>Backup &amp; Restore 🌸</h4>
                </div>
                <p className="text-xs text-pink-700 mb-3 font-medium">
                  Save a full backup of your scheduled events and tasks, or restore them anytime.
                </p>

                {importError && (
                  <p className="text-xs text-rose-700 font-bold mb-2">{importError}</p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={handleExportJson}
                    className="py-2 px-3 bg-white hover:bg-pink-100 text-pink-800 font-bold text-xs rounded-xl border border-pink-300 flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                  >
                    <Download className="w-3.5 h-3.5 text-pink-600" />
                    Backup to JSON 🎀
                  </button>

                  <button
                    type="button"
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

              <div className="p-3.5 sm:p-4 bg-rose-50/60 border border-rose-200 rounded-2xl">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-rose-800 mb-1 flex items-center gap-1">
                  <span>Clear Schedule &amp; Start Fresh</span>
                  <span>🧁</span>
                </h4>
                <p className="text-xs text-rose-700 mb-3 font-medium">
                  Remove all calendar events so you can plan your own custom schedule from scratch.
                </p>
                <button
                  type="button"
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
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 bg-pink-100/50 border-t border-pink-200 flex items-center justify-end shrink-0">
          <button
            type="button"
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
