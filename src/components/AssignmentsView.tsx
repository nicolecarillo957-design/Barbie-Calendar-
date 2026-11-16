import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarEvent,
  EventCategory,
  Priority,
  TaskEvidence,
  UnscheduledTask,
} from '../types/calendar';
import { CATEGORY_LIST, getCategoryConfig } from '../utils/categories';
import { cuteSound } from '../utils/cuteSound';
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  CalendarPlus,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  Edit3,
  GripVertical,
  Layers,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
  AlertCircle,
  Trophy,
} from 'lucide-react';

interface AssignmentsViewProps {
  events: CalendarEvent[];
  tasks: UnscheduledTask[];
  studentName: string;
  totalPoints: number;
  readOnly?: boolean;
  onAddTask: (task: Omit<UnscheduledTask, 'id' | 'completed'>) => void;
  onUpdateTask: (task: UnscheduledTask) => void;
  onDeleteTask: (taskId: string) => void;
  onToggleTaskComplete: (taskId: string) => void;
  onScheduleTask: (task: UnscheduledTask) => void;
  onSaveEvent: (event: CalendarEvent) => void;
  onDeleteEvent: (eventId: string) => void;
  onToggleEventComplete: (eventId: string) => void;
  onBatchReorder?: (updates: { tasks: UnscheduledTask[]; events: CalendarEvent[] }) => Promise<void> | void;
  onOpenTeacherMonitor?: () => void;
}

interface UnifiedAssignment {
  key: string;
  sourceType: 'task' | 'event';
  id: string;
  title: string;
  subject: string;
  description?: string;
  priority: Priority;
  dueDate?: string; // YYYY-MM-DD
  dueTime?: string; // HH:mm
  points: number;
  completed: boolean;
  category: EventCategory;
  order?: number;
  evidence?: TaskEvidence;
  rawTask?: UnscheduledTask;
  rawEvent?: CalendarEvent;
}

const SUBJECT_PRESETS = [
  'General Physics',
  'Gen Math',
  'Oral Comm',
  'Biology',
  'Chemistry',
  'Literature',
  'History',
  'Computer Science',
];

const POINT_PRESETS = [5, 10, 25, 40, 50];

function formatTime12h(hhmm?: string): string {
  if (!hhmm || !hhmm.includes(':')) return '';
  const [hStr, mStr] = hhmm.split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

function formatDueDisplay(dueDate?: string, dueTime?: string): string {
  if (!dueDate) {
    return dueTime ? `Due at ${formatTime12h(dueTime)}` : 'No due date set';
  }
  const parts = dueDate.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    return dueTime ? `Due: ${dueDate}, ${formatTime12h(dueTime)}` : `Due: ${dueDate}`;
  }
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  const monthDay = d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
  const timePart = formatTime12h(dueTime);
  return timePart ? `Due: ${monthDay}, ${timePart}` : `Due: ${monthDay}`;
}

function getDueSortTimestamp(dueDate?: string, dueTime?: string): number {
  if (!dueDate) return Number.MAX_SAFE_INTEGER;
  const parts = dueDate.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return Number.MAX_SAFE_INTEGER;
  let hours = 23;
  let mins = 59;
  if (dueTime && dueTime.includes(':')) {
    const [h, m] = dueTime.split(':').map(Number);
    if (!Number.isNaN(h) && !Number.isNaN(m)) {
      hours = h;
      mins = m;
    }
  }
  return new Date(parts[0], parts[1] - 1, parts[2], hours, mins).getTime();
}

function getPriorityWeight(p: Priority): number {
  if (p === 'high') return 3;
  if (p === 'medium') return 2;
  return 1;
}

export const AssignmentsView: React.FC<AssignmentsViewProps> = ({
  events,
  tasks,
  studentName,
  totalPoints,
  readOnly = false,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onToggleTaskComplete,
  onScheduleTask,
  onSaveEvent,
  onDeleteEvent,
  onToggleEventComplete,
  onBatchReorder,
  onOpenTeacherMonitor,
}) => {
  const hasSavedCustomOrder = useMemo(
    () =>
      tasks.some((t) => typeof t.order === 'number') ||
      events.some((e) => typeof e.order === 'number'),
    [tasks, events]
  );

  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | Priority>('all');
  const [sortBy, setSortBy] = useState<'manual' | 'priority' | 'due' | 'points'>(() =>
    hasSavedCustomOrder ? 'manual' : 'priority'
  );
  const [searchTerm, setSearchTerm] = useState('');

  // Drag & Drop State
  const [draggedKey, setDraggedKey] = useState<string | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const [dragOverPriority, setDragOverPriority] = useState<Priority | null>(null);

  // Add / Edit Assignment Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<UnifiedAssignment | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formSubject, setFormSubject] = useState('General Physics');
  const [formPriority, setFormPriority] = useState<Priority>('high');
  const [formDueDate, setFormDueDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formDueTime, setFormDueTime] = useState('17:00');
  const [formPoints, setFormPoints] = useState<number>(25);
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState<EventCategory>('deep_work');
  const [alsoScheduleOnCalendar, setAlsoScheduleOnCalendar] = useState(false);

  // Proof inspection preview modal
  const [proofPreviewItem, setProofPreviewItem] = useState<UnifiedAssignment | null>(null);

  // Micro-interaction animation for newly completed assignments
  const prevCompletedMapRef = useRef<Map<string, boolean> | null>(null);
  const [justCompletedKeys, setJustCompletedKeys] = useState<Set<string>>(() => new Set());

  // Combine Unscheduled Tasks & Scheduled Calendar Events into one clean Assignments list
  const unifiedAssignments = useMemo<UnifiedAssignment[]>(() => {
    const scheduledTaskIds = new Set(
      events.map((ev) => ev.sourceTaskId).filter((id): id is string => Boolean(id))
    );

    const taskItems: UnifiedAssignment[] = tasks
      .filter((t) => !scheduledTaskIds.has(t.id))
      .map((t) => {
        const cat = getCategoryConfig(t.category);
        return {
          key: `task_${t.id}`,
          sourceType: 'task',
          id: t.id,
          title: t.title,
          subject:
            (t.subject || '').trim() ||
            cat.label.replace(/\s*[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]+\s*/gu, '').trim() ||
            'Study Task',
          description: t.description,
          priority: t.priority || 'medium',
          dueDate: t.dueDate,
          dueTime: t.dueTime,
          points: t.evidence?.pointsEarned || t.pointsValue || (t.priority === 'high' ? 25 : 10),
          completed: t.completed,
          category: t.category,
          order: t.order,
          evidence: t.evidence,
          rawTask: t,
        };
      });

    const eventItems: UnifiedAssignment[] = events.map((ev) => {
      const cat = getCategoryConfig(ev.category);
      const fallbackPts = ev.category === 'deep_work' || ev.category === 'planning' ? 10 : 5;
      return {
        key: `event_${ev.id}`,
        sourceType: 'event',
        id: ev.id,
        title: ev.title,
        subject:
          (ev.subject || '').trim() ||
          cat.label.replace(/\s*[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]+\s*/gu, '').trim() ||
          'Calendar Activity',
        description: ev.description,
        priority: ev.priority || 'medium',
        dueDate: ev.date,
        dueTime: ev.endTime || ev.startTime,
        points: ev.evidence?.pointsEarned || ev.pointsValue || fallbackPts,
        completed: ev.isCompleted,
        category: ev.category,
        order: ev.order,
        evidence: ev.evidence,
        rawEvent: ev,
      };
    });

    return [...taskItems, ...eventItems];
  }, [tasks, events]);

  useEffect(() => {
    const nextMap = new Map<string, boolean>();
    const newlyCompleted: string[] = [];

    unifiedAssignments.forEach((item) => {
      nextMap.set(item.key, item.completed);
      if (prevCompletedMapRef.current) {
        const wasCompleted = prevCompletedMapRef.current.get(item.key);
        if (wasCompleted === false && item.completed) {
          newlyCompleted.push(item.key);
        }
      }
    });

    prevCompletedMapRef.current = nextMap;

    if (newlyCompleted.length > 0) {
      cuteSound.playSparkle();
      setJustCompletedKeys((prev) => {
        const next = new Set(prev);
        newlyCompleted.forEach((k) => next.add(k));
        return next;
      });

      const timer = window.setTimeout(() => {
        setJustCompletedKeys((prev) => {
          const next = new Set(prev);
          newlyCompleted.forEach((k) => next.delete(k));
          return next;
        });
      }, 1700);

      return () => window.clearTimeout(timer);
    }
  }, [unifiedAssignments]);

  const availableSubjects = useMemo(() => {
    const set = new Set<string>();
    unifiedAssignments.forEach((item) => {
      if (item.subject) set.add(item.subject);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [unifiedAssignments]);

  const filteredAssignments = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return unifiedAssignments
      .filter((item) => {
        if (statusFilter === 'pending' && item.completed) return false;
        if (statusFilter === 'completed' && !item.completed) return false;
        if (subjectFilter !== 'all' && item.subject !== subjectFilter) return false;
        if (priorityFilter !== 'all' && item.priority !== priorityFilter) return false;
        if (q) {
          const matches =
            item.title.toLowerCase().includes(q) ||
            item.subject.toLowerCase().includes(q) ||
            (item.description || '').toLowerCase().includes(q);
          if (!matches) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (a.completed !== b.completed) {
          return a.completed ? 1 : -1;
        }
        if (sortBy === 'manual') {
          const orderA = typeof a.order === 'number' ? a.order : Number.MAX_SAFE_INTEGER;
          const orderB = typeof b.order === 'number' ? b.order : Number.MAX_SAFE_INTEGER;
          if (orderA !== orderB) return orderA - orderB;
          const pDiff = getPriorityWeight(b.priority) - getPriorityWeight(a.priority);
          if (pDiff !== 0) return pDiff;
          return getDueSortTimestamp(a.dueDate, a.dueTime) - getDueSortTimestamp(b.dueDate, b.dueTime);
        }
        if (sortBy === 'priority') {
          const diff = getPriorityWeight(b.priority) - getPriorityWeight(a.priority);
          if (diff !== 0) return diff;
          const orderA = typeof a.order === 'number' ? a.order : Number.MAX_SAFE_INTEGER;
          const orderB = typeof b.order === 'number' ? b.order : Number.MAX_SAFE_INTEGER;
          if (orderA !== orderB) return orderA - orderB;
          return getDueSortTimestamp(a.dueDate, a.dueTime) - getDueSortTimestamp(b.dueDate, b.dueTime);
        }
        if (sortBy === 'points') {
          const diff = b.points - a.points;
          if (diff !== 0) return diff;
          return getDueSortTimestamp(a.dueDate, a.dueTime) - getDueSortTimestamp(b.dueDate, b.dueTime);
        }
        // 'due': earliest due date first, then priority descending
        const timeDiff =
          getDueSortTimestamp(a.dueDate, a.dueTime) - getDueSortTimestamp(b.dueDate, b.dueTime);
        if (timeDiff !== 0) return timeDiff;
        return getPriorityWeight(b.priority) - getPriorityWeight(a.priority);
      });
  }, [unifiedAssignments, statusFilter, subjectFilter, priorityFilter, sortBy, searchTerm]);

  const stats = useMemo(() => {
    const pending = unifiedAssignments.filter((i) => !i.completed);
    const completed = unifiedAssignments.filter((i) => i.completed);
    const availablePoints = pending.reduce((sum, i) => sum + i.points, 0);
    return {
      total: unifiedAssignments.length,
      pendingCount: pending.length,
      completedCount: completed.length,
      availablePoints,
    };
  }, [unifiedAssignments]);

  const nowMs = Date.now();

  const persistOrderedItems = async (orderedSubset: UnifiedAssignment[]) => {
    const subsetKeys = new Set(orderedSubset.map((i) => i.key));
    const remaining = unifiedAssignments
      .filter((i) => !subsetKeys.has(i.key))
      .sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER));
    const fullList = [...orderedSubset, ...remaining];

    const updatedTasks: UnscheduledTask[] = [];
    const updatedEvents: CalendarEvent[] = [];

    fullList.forEach((item, index) => {
      if (item.sourceType === 'task' && item.rawTask) {
        updatedTasks.push({
          ...item.rawTask,
          priority: item.priority,
          order: index,
        });
      } else if (item.sourceType === 'event' && item.rawEvent) {
        updatedEvents.push({
          ...item.rawEvent,
          priority: item.priority,
          order: index,
        });
      }
    });

    if (onBatchReorder) {
      await onBatchReorder({ tasks: updatedTasks, events: updatedEvents });
    } else {
      updatedTasks.forEach((t) => onUpdateTask(t));
      updatedEvents.forEach((e) => onSaveEvent(e));
    }
  };

  const handleReorderDrop = async (sourceKey: string, targetKey: string) => {
    if (readOnly || !sourceKey || !targetKey || sourceKey === targetKey) return;

    const currentList = [...filteredAssignments];
    const fromIdx = currentList.findIndex((i) => i.key === sourceKey);
    const toIdx = currentList.findIndex((i) => i.key === targetKey);
    if (fromIdx === -1 || toIdx === -1) return;

    const draggedItem = currentList[fromIdx];
    const targetItem = currentList[toIdx];

    // Update priority to match the dropped tier when in priority sort or moving across priorities
    const nextPriority =
      sortBy === 'priority' ? targetItem.priority : draggedItem.priority;

    const nextList = [...currentList];
    const [removed] = nextList.splice(fromIdx, 1);
    nextList.splice(toIdx, 0, { ...removed, priority: nextPriority });

    if (sortBy !== 'manual' && sortBy !== 'priority') {
      setSortBy('manual');
    }

    cuteSound.playCutePop();
    await persistOrderedItems(nextList);
  };

  const handleDropOnPriorityZone = async (sourceKey: string, targetPriority: Priority) => {
    if (readOnly || !sourceKey) return;
    const currentList = [...filteredAssignments];
    const fromIdx = currentList.findIndex((i) => i.key === sourceKey);
    if (fromIdx === -1) return;

    const [removed] = currentList.splice(fromIdx, 1);
    const updatedItem: UnifiedAssignment = { ...removed, priority: targetPriority };

    // Insert at the top of the matching priority tier (or top of pending list if high)
    let insertIdx = currentList.findIndex(
      (i) => !i.completed && getPriorityWeight(i.priority) <= getPriorityWeight(targetPriority)
    );
    if (insertIdx === -1) {
      const firstCompleted = currentList.findIndex((i) => i.completed);
      insertIdx = firstCompleted === -1 ? currentList.length : firstCompleted;
    }

    currentList.splice(insertIdx, 0, updatedItem);
    cuteSound.playSparkle();
    await persistOrderedItems(currentList);
  };

  const handleMoveStep = async (itemKey: string, direction: 'up' | 'down') => {
    if (readOnly) return;
    const currentList = [...filteredAssignments];
    const idx = currentList.findIndex((i) => i.key === itemKey);
    if (idx === -1) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= currentList.length) return;

    await handleReorderDrop(itemKey, currentList[swapIdx].key);
  };

  const handleTouchMoveGrip = (e: React.TouchEvent) => {
    if (readOnly || !draggedKey || e.touches.length === 0) return;
    const touch = e.touches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement | null;
    const cardEl = el?.closest('[data-assignment-key]') as HTMLElement | null;
    const prioEl = el?.closest('[data-priority-drop]') as HTMLElement | null;

    if (prioEl) {
      const prio = prioEl.getAttribute('data-priority-drop') as Priority | null;
      setDragOverPriority(prio);
      setDragOverKey(null);
    } else if (cardEl) {
      const key = cardEl.getAttribute('data-assignment-key');
      setDragOverKey(key);
      setDragOverPriority(null);
    }
  };

  const handleTouchEndGrip = async () => {
    if (draggedKey && dragOverPriority) {
      await handleDropOnPriorityZone(draggedKey, dragOverPriority);
    } else if (draggedKey && dragOverKey && draggedKey !== dragOverKey) {
      await handleReorderDrop(draggedKey, dragOverKey);
    }
    setDraggedKey(null);
    setDragOverKey(null);
    setDragOverPriority(null);
  };

  const openCreateModal = () => {
    if (readOnly) return;
    setEditingItem(null);
    setFormTitle('');
    setFormSubject('General Physics');
    setFormPriority('high');
    setFormDueDate(new Date().toISOString().split('T')[0]);
    setFormDueTime('17:00');
    setFormPoints(25);
    setFormDescription('');
    setFormCategory('deep_work');
    setAlsoScheduleOnCalendar(false);
    setIsModalOpen(true);
    cuteSound.playCutePop();
  };

  const openEditModal = (item: UnifiedAssignment) => {
    if (readOnly) return;
    setEditingItem(item);
    setFormTitle(item.title);
    setFormSubject(item.subject);
    setFormPriority(item.priority);
    setFormDueDate(item.dueDate || new Date().toISOString().split('T')[0]);
    setFormDueTime(item.dueTime || '17:00');
    setFormPoints(item.points);
    setFormDescription(item.description || '');
    setFormCategory(item.category);
    setAlsoScheduleOnCalendar(item.sourceType === 'event');
    setIsModalOpen(true);
    cuteSound.playCutePop();
  };

  const handleSaveAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || readOnly) return;

    const cleanPoints = Math.max(1, Math.min(100, Math.round(formPoints || 10)));
    const cleanSubject = formSubject.trim() || 'Study Task';

    if (editingItem) {
      if (editingItem.sourceType === 'task' && editingItem.rawTask) {
        onUpdateTask({
          ...editingItem.rawTask,
          title: formTitle.trim(),
          subject: cleanSubject,
          priority: formPriority,
          dueDate: formDueDate || undefined,
          dueTime: formDueTime || undefined,
          pointsValue: cleanPoints,
          description: formDescription.trim() || undefined,
          category: formCategory,
        });
      } else if (editingItem.sourceType === 'event' && editingItem.rawEvent) {
        onSaveEvent({
          ...editingItem.rawEvent,
          title: formTitle.trim(),
          subject: cleanSubject,
          priority: formPriority,
          date: formDueDate || editingItem.rawEvent.date,
          endTime: formDueTime || editingItem.rawEvent.endTime,
          pointsValue: cleanPoints,
          description: formDescription.trim() || undefined,
          category: formCategory,
        });
      }
    } else if (alsoScheduleOnCalendar && formDueDate) {
      const startHour = formDueTime ? Math.max(6, Number(formDueTime.split(':')[0]) - 1) : 16;
      const startMin = formDueTime ? Number(formDueTime.split(':')[1] || 0) : 0;
      const startStr = `${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`;
      const endStr = formDueTime || `${String(startHour + 1).padStart(2, '0')}:00`;

      onSaveEvent({
        id: `evt_${Date.now()}`,
        title: formTitle.trim(),
        subject: cleanSubject,
        description: formDescription.trim() || undefined,
        category: formCategory,
        date: formDueDate,
        startTime: startStr,
        endTime: endStr,
        isCompleted: false,
        priority: formPriority,
        pointsValue: cleanPoints,
      });
    } else {
      onAddTask({
        title: formTitle.trim(),
        subject: cleanSubject,
        category: formCategory,
        estimatedMinutes: 45,
        priority: formPriority,
        dueDate: formDueDate || undefined,
        dueTime: formDueTime || undefined,
        pointsValue: cleanPoints,
        description: formDescription.trim() || undefined,
      });
    }

    cuteSound.playSparkle();
    setIsModalOpen(false);
    setEditingItem(null);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-b from-pink-50/60 via-white to-rose-50/40 p-3 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-5">
        {/* Top Portal Header matching Screenshot's Compiled Academic Activities */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-500 to-fuchsia-600 text-white flex items-center justify-center shadow-sm shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-black text-pink-950 tracking-tight">
                  Compiled Academic Activities
                </h1>
                <span className="text-xs font-bold text-pink-500 tabular-nums">
                  · {filteredAssignments.length}{' '}
                  {filteredAssignments.length === 1 ? 'Activity' : 'Activities'}
                </span>
              </div>
              <p className="text-xs text-pink-700 font-medium mt-0.5">
                {readOnly
                  ? `Monitoring ${studentName}'s assignments, due dates, priorities, and earned points.`
                  : `Track every subject, priority, due date, and reward point in one cute checklist.`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {readOnly && onOpenTeacherMonitor && (
              <button
                type="button"
                onClick={onOpenTeacherMonitor}
                className="px-3.5 py-2 text-xs font-extrabold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-sm transition-colors flex items-center gap-1.5 whitespace-nowrap"
              >
                <Camera className="w-4 h-4" />
                <span>Review Proofs</span>
              </button>
            )}
            {!readOnly && (
              <button
                type="button"
                onClick={openCreateModal}
                className="px-4 py-2 text-xs font-extrabold text-white bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 rounded-xl shadow-md shadow-pink-300/50 transition-transform active:scale-95 flex items-center gap-1.5 whitespace-nowrap"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Add Assignment</span>
              </button>
            )}
          </div>
        </div>

        {/* Clean Summary Strip (60-30-10 & tabular-nums) */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="bg-white rounded-2xl border border-pink-200/80 p-3 sm:px-4 sm:py-3 shadow-2xs">
            <p className="text-[11px] font-bold text-pink-600">To Do</p>
            <p className="text-lg sm:text-xl font-black text-pink-950 tabular-nums mt-0.5">
              {stats.pendingCount}
            </p>
            <p className="text-[11px] text-pink-500 tabular-nums truncate">
              +{stats.availablePoints} pts waiting
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-pink-200/80 p-3 sm:px-4 sm:py-3 shadow-2xs">
            <p className="text-[11px] font-bold text-emerald-700">Completed</p>
            <p className="text-lg sm:text-xl font-black text-emerald-700 tabular-nums mt-0.5">
              {stats.completedCount}
              <span className="text-xs font-bold text-pink-400"> / {stats.total}</span>
            </p>
            <p className="text-[11px] text-emerald-600 font-medium truncate">
              {stats.total > 0
                ? `${Math.round((stats.completedCount / stats.total) * 100)}% finished`
                : 'Ready to start'}
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-amber-200 p-3 sm:px-4 sm:py-3 shadow-2xs">
            <p className="text-[11px] font-bold text-amber-800">Total Points</p>
            <p className="text-lg sm:text-xl font-black text-amber-700 tabular-nums mt-0.5 flex items-center gap-1">
              <Trophy className="w-4 h-4 text-amber-500 shrink-0" />
              <span>{totalPoints} pts</span>
            </p>
            <p className="text-[11px] text-amber-700/80 font-medium truncate">
              Priority Task System
            </p>
          </div>
        </div>

        {/* Filter & Sort Controls */}
        <div className="bg-white rounded-2xl border border-pink-200/80 p-3 shadow-2xs flex flex-col gap-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Segmented Status Tabs */}
            <div className="flex items-center gap-1 bg-pink-50 p-1 rounded-xl border border-pink-200/70">
              {(
                [
                  { id: 'all', label: `All (${stats.total})` },
                  { id: 'pending', label: `To Do (${stats.pendingCount})` },
                  { id: 'completed', label: `Done (${stats.completedCount})` },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 py-1.5 text-xs font-extrabold rounded-lg transition-colors whitespace-nowrap ${
                    statusFilter === tab.id
                      ? 'bg-pink-500 text-white shadow-2xs'
                      : 'text-pink-800 hover:bg-pink-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative flex-1 min-w-[180px] sm:max-w-xs">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-pink-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search subject or task..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-pink-50/50 border border-pink-200 rounded-xl text-pink-950 placeholder:text-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {/* Subject Filter */}
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              aria-label="Filter by subject"
              className="text-xs font-semibold bg-pink-50/60 border border-pink-200 rounded-xl px-3 py-2 text-pink-950 focus:outline-none focus:ring-2 focus:ring-pink-400"
            >
              <option value="all">All Subjects ({availableSubjects.length})</option>
              {availableSubjects.map((subj) => (
                <option key={subj} value={subj}>
                  {subj}
                </option>
              ))}
            </select>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as 'all' | Priority)}
              aria-label="Filter by priority"
              className="text-xs font-semibold bg-pink-50/60 border border-pink-200 rounded-xl px-3 py-2 text-pink-950 focus:outline-none focus:ring-2 focus:ring-pink-400"
            >
              <option value="all">All Priorities</option>
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </select>

            {/* Sort Selector */}
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as 'manual' | 'priority' | 'due' | 'points')
              }
              aria-label="Sort assignments"
              className="text-xs font-semibold bg-pink-50/60 border border-pink-200 rounded-xl px-3 py-2 text-pink-950 focus:outline-none focus:ring-2 focus:ring-pink-400"
            >
              <option value="priority">Sort: Priority Tier (Drag &amp; Drop)</option>
              <option value="manual">Sort: Custom Priority Order (Drag &amp; Drop)</option>
              <option value="due">Sort: Earliest Due Date</option>
              <option value="points">Sort: Most Points</option>
            </select>
          </div>
        </div>

        {/* Drag-and-Drop Priority Drop Zones Bar */}
        {!readOnly && filteredAssignments.length > 0 && (
          <div className="bg-white/95 rounded-2xl border border-pink-200/90 p-2.5 sm:p-3 shadow-2xs space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-[11px] font-bold text-pink-800 flex items-center gap-1.5">
                <GripVertical className="w-3.5 h-3.5 text-pink-500 shrink-0" />
                <span>
                  {draggedKey
                    ? 'Drop onto another card to reorder, or drop onto a Priority tier below!'
                    : 'Drag cards by the grip handle (or use arrows) to reorder by priority'}
                </span>
              </span>
              {sortBy !== 'manual' && sortBy !== 'priority' && (
                <button
                  type="button"
                  onClick={() => setSortBy('manual')}
                  className="text-[10px] font-extrabold text-pink-700 bg-pink-100 hover:bg-pink-200 px-2.5 py-1 rounded-lg transition-colors"
                >
                  Use Custom Order
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              {(
                [
                  {
                    id: 'high' as const,
                    label: 'High Priority',
                    dot: 'bg-rose-500',
                    idle: 'bg-rose-50/70 border-rose-200 text-rose-800',
                    active: 'bg-rose-500 border-rose-600 text-white scale-[1.02] shadow-md',
                  },
                  {
                    id: 'medium' as const,
                    label: 'Medium Priority',
                    dot: 'bg-amber-500',
                    idle: 'bg-amber-50/70 border-amber-200 text-amber-800',
                    active: 'bg-amber-500 border-amber-600 text-white scale-[1.02] shadow-md',
                  },
                  {
                    id: 'low' as const,
                    label: 'Low Priority',
                    dot: 'bg-emerald-500',
                    idle: 'bg-emerald-50/70 border-emerald-200 text-emerald-800',
                    active: 'bg-emerald-500 border-emerald-600 text-white scale-[1.02] shadow-md',
                  },
                ]
              ).map((zone) => {
                const isOver = dragOverPriority === zone.id;
                return (
                  <div
                    key={zone.id}
                    data-priority-drop={zone.id}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOverPriority(zone.id);
                      setDragOverKey(null);
                    }}
                    onDragLeave={() => {
                      if (dragOverPriority === zone.id) setDragOverPriority(null);
                    }}
                    onDrop={async (e) => {
                      e.preventDefault();
                      const key = draggedKey || e.dataTransfer.getData('text/plain');
                      setDragOverPriority(null);
                      setDraggedKey(null);
                      setDragOverKey(null);
                      if (key) await handleDropOnPriorityZone(key, zone.id);
                    }}
                    className={`px-2 py-1.5 rounded-xl border-2 border-dashed text-[10px] sm:text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all ${
                      isOver ? zone.active : zone.idle
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        isOver ? 'bg-white' : zone.dot
                      }`}
                    />
                    <span className="truncate">
                      {draggedKey ? `Drop → ${zone.label}` : zone.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Assignment Cards List (Clean white cards inspired by the screenshot) */}
        {filteredAssignments.length === 0 ? (
          <div className="bg-white rounded-3xl border border-pink-200 p-8 sm:p-12 text-center shadow-2xs">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-pink-100 text-pink-600 flex items-center justify-center mb-3">
              <Sparkles className="w-7 h-7" />
            </div>
            <h3 className="text-base font-black text-pink-950">
              {stats.total === 0
                ? 'No schoolwork or assignments yet!'
                : 'No activities match your current filters'}
            </h3>
            <p className="text-xs text-pink-700 mt-1 max-w-md mx-auto">
              {stats.total === 0
                ? 'Add your first assignment with subject, priority, due date, and reward points to start tracking.'
                : 'Try switching back to "All" or clearing your subject/search filter.'}
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              {!readOnly && (
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="px-4 py-2 text-xs font-extrabold text-white bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 rounded-xl shadow-sm flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Add First Assignment</span>
                </button>
              )}
              {(statusFilter !== 'all' || subjectFilter !== 'all' || priorityFilter !== 'all' || searchTerm) && (
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('all');
                    setSubjectFilter('all');
                    setPriorityFilter('all');
                    setSearchTerm('');
                  }}
                  className="px-4 py-2 text-xs font-bold text-pink-700 bg-pink-50 hover:bg-pink-100 border border-pink-200 rounded-xl"
                >
                  Reset Filters
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3.5 pb-6">
            {filteredAssignments.map((item) => {
              const dueTs = getDueSortTimestamp(item.dueDate, item.dueTime);
              const isOverdue = !item.completed && item.dueDate && dueTs < nowMs;

              const priorityConfig =
                item.priority === 'high'
                  ? {
                      label: 'High Priority',
                      bg: 'bg-rose-50 text-rose-700 border-rose-200',
                      dot: 'bg-rose-500',
                    }
                  : item.priority === 'medium'
                  ? {
                      label: 'Medium Priority',
                      bg: 'bg-amber-50 text-amber-800 border-amber-200',
                      dot: 'bg-amber-500',
                    }
                  : {
                      label: 'Low Priority',
                      bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                      dot: 'bg-emerald-500',
                    };

              const isDraggingThis = draggedKey === item.key;
              const isDropTarget = dragOverKey === item.key && draggedKey !== item.key;
              const isCelebratingCompletion = justCompletedKeys.has(item.key);

              return (
                <article
                  key={item.key}
                  data-assignment-key={item.key}
                  draggable={!readOnly}
                  onDragStart={(e) => {
                    if (readOnly) return;
                    setDraggedKey(item.key);
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', item.key);
                  }}
                  onDragOver={(e) => {
                    if (readOnly || !draggedKey || draggedKey === item.key) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    setDragOverKey(item.key);
                    setDragOverPriority(null);
                  }}
                  onDragLeave={() => {
                    if (dragOverKey === item.key) setDragOverKey(null);
                  }}
                  onDrop={async (e) => {
                    if (readOnly) return;
                    e.preventDefault();
                    const sourceKey = draggedKey || e.dataTransfer.getData('text/plain');
                    setDraggedKey(null);
                    setDragOverKey(null);
                    setDragOverPriority(null);
                    if (sourceKey && sourceKey !== item.key) {
                      await handleReorderDrop(sourceKey, item.key);
                    }
                  }}
                  onDragEnd={() => {
                    setDraggedKey(null);
                    setDragOverKey(null);
                    setDragOverPriority(null);
                  }}
                  className={`relative bg-white rounded-2xl border transition-all p-4 sm:p-5 shadow-2xs hover:shadow-md ${
                    isCelebratingCompletion
                      ? 'animate-task-complete border-emerald-400 ring-2 ring-emerald-300 bg-gradient-to-r from-emerald-50/75 via-white to-pink-50/75 shadow-lg shadow-emerald-200/60'
                      : isDraggingThis
                      ? 'opacity-50 scale-[0.98] border-pink-400 ring-2 ring-pink-300 cursor-grabbing'
                      : isDropTarget
                      ? 'border-pink-500 ring-2 ring-pink-400 bg-pink-50/40 -translate-y-0.5 shadow-md'
                      : item.completed
                      ? 'border-pink-200/70 bg-white/85'
                      : isOverdue
                      ? 'border-rose-300'
                      : 'border-pink-200/90 hover:border-pink-300'
                  }`}
                >
                  {/* Shimmer sweep & Floating Sparkles Burst on Task Completion */}
                  {isCelebratingCompletion && (
                    <>
                      <div
                        className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl z-0"
                        aria-hidden="true"
                      >
                        <div className="animate-completion-shimmer absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-emerald-200/50 to-transparent" />
                      </div>
                      <div
                        className="pointer-events-none absolute inset-0 overflow-visible z-10"
                        aria-hidden="true"
                      >
                        <span className="animate-sparkle-a absolute -top-2 left-5 text-base">
                          ✨
                        </span>
                        <span className="animate-sparkle-c absolute -top-3 left-1/3 text-sm">
                          🌟
                        </span>
                        <span className="animate-sparkle-b absolute -top-2 right-12 text-base">
                          💖
                        </span>
                        <span className="animate-sparkle-a absolute bottom-2 right-6 text-sm">
                          ✨
                        </span>
                      </div>
                    </>
                  )}

                  {/* Row 1: Drag Handle + Subject Tag (left) + Priority Tag (right) */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {!readOnly && (
                        <div className="flex items-center gap-0.5 mr-0.5">
                          <span
                            onTouchStart={() => setDraggedKey(item.key)}
                            onTouchMove={handleTouchMoveGrip}
                            onTouchEnd={handleTouchEndGrip}
                            title="Drag to reorder by priority"
                            aria-label={`Drag ${item.title} to reorder`}
                            className="p-1 text-pink-400 hover:text-pink-700 hover:bg-pink-100 rounded-lg cursor-grab active:cursor-grabbing touch-none"
                          >
                            <GripVertical className="w-4 h-4" />
                          </span>
                          <button
                            type="button"
                            onClick={() => handleMoveStep(item.key, 'up')}
                            title="Move up in priority order"
                            aria-label={`Move ${item.title} up`}
                            className="p-0.5 text-pink-400 hover:text-pink-700 hover:bg-pink-100 rounded"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveStep(item.key, 'down')}
                            title="Move down in priority order"
                            aria-label={`Move ${item.title} down`}
                            className="p-0.5 text-pink-400 hover:text-pink-700 hover:bg-pink-100 rounded"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>
                      )}

                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100 text-xs font-bold">
                        <BookOpen className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span>{item.subject}</span>
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={readOnly}
                      onClick={() => {
                        if (readOnly) return;
                        const nextPrio: Priority =
                          item.priority === 'high'
                            ? 'medium'
                            : item.priority === 'medium'
                            ? 'low'
                            : 'high';
                        void handleDropOnPriorityZone(item.key, nextPrio);
                      }}
                      title={readOnly ? priorityConfig.label : 'Click or drop into zone to change priority'}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold transition-transform ${
                        !readOnly ? 'hover:scale-105 cursor-pointer' : ''
                      } ${priorityConfig.bg}`}
                    >
                      <span className={`w-2 h-2 rounded-full ${priorityConfig.dot}`} aria-hidden="true" />
                      <span>{priorityConfig.label}</span>
                    </button>
                  </div>

                  {/* Row 2: Completion Checkbox + Task Title + Description */}
                  <div className="mt-3 flex items-start gap-3">
                    <button
                      type="button"
                      disabled={readOnly}
                      onClick={() => {
                        if (readOnly) return;
                        if (item.sourceType === 'task') {
                          onToggleTaskComplete(item.id);
                        } else {
                          onToggleEventComplete(item.id);
                        }
                      }}
                      title={
                        readOnly
                          ? 'View-only monitoring mode'
                          : item.completed
                          ? 'Mark as pending'
                          : 'Complete & upload picture proof to claim points'
                      }
                      aria-label={item.completed ? 'Mark assignment pending' : 'Complete assignment'}
                      className={`mt-0.5 w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${
                        item.completed
                          ? `bg-emerald-500 border-emerald-500 text-white shadow-2xs ${
                              isCelebratingCompletion ? 'animate-check-pop' : ''
                            }`
                          : readOnly
                          ? 'border-pink-200 bg-pink-50/40 cursor-not-allowed'
                          : 'border-pink-300 bg-white hover:border-pink-500 hover:bg-pink-50 active:scale-95'
                      }`}
                    >
                      {item.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </button>

                    <div className="flex-1 min-w-0">
                      <h3
                        className={`text-sm sm:text-base font-extrabold leading-snug flex items-center gap-2 flex-wrap ${
                          item.completed
                            ? 'line-through text-pink-900/50 decoration-2'
                            : 'text-pink-950'
                        }`}
                      >
                        <span>{item.title}</span>
                        {isCelebratingCompletion && (
                          <span className="no-underline inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-black shadow-xs animate-bounce">
                            Done! ✨
                          </span>
                        )}
                      </h3>

                      {item.description ? (
                        <p className="text-xs sm:text-sm text-pink-800/75 mt-1 leading-relaxed">
                          {item.description}
                        </p>
                      ) : (
                        <p className="text-xs text-pink-500/80 mt-1">
                          {item.sourceType === 'event'
                            ? 'Scheduled calendar study block'
                            : 'Schoolwork task — tap checkbox to upload proof and earn points'}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Row 3: Due Date/Time (left) + Points & Quick Actions (right) */}
                  <div className="mt-3.5 pt-3 border-t border-pink-100 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-pink-700 font-medium tabular-nums">
                      <span
                        className={`inline-flex items-center gap-1.5 ${
                          isOverdue ? 'text-rose-600 font-bold' : 'text-pink-700'
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        <span>{formatDueDisplay(item.dueDate, item.dueTime)}</span>
                      </span>

                      {isOverdue && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600">
                          <AlertCircle className="w-3 h-3" />
                          <span>Overdue</span>
                        </span>
                      )}

                      <span className="text-pink-300" aria-hidden="true">
                        ·
                      </span>
                      <span className="text-[11px] text-pink-500">
                        {item.sourceType === 'event' ? 'On Calendar' : 'Assignment List'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 ml-auto">
                      <span
                        className={`text-sm font-black tabular-nums ${
                          item.completed ? 'text-emerald-600' : 'text-emerald-600'
                        }`}
                      >
                        +{item.points} pts
                      </span>

                      {item.evidence && (
                        <button
                          type="button"
                          onClick={() => setProofPreviewItem(item)}
                          className="px-2.5 py-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg flex items-center gap-1 transition-colors"
                          title="View submitted picture proof"
                        >
                          <Camera className="w-3 h-3" />
                          <span>Proof</span>
                        </button>
                      )}

                      {!readOnly && !item.completed && (
                        <button
                          type="button"
                          onClick={() =>
                            item.sourceType === 'task'
                              ? onToggleTaskComplete(item.id)
                              : onToggleEventComplete(item.id)
                          }
                          className="px-2.5 py-1 text-[11px] font-extrabold text-white bg-pink-500 hover:bg-pink-600 rounded-lg flex items-center gap-1 transition-colors shadow-2xs"
                          title="Finish and upload picture proof"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Done</span>
                        </button>
                      )}

                      {!readOnly && item.sourceType === 'task' && !item.completed && item.rawTask && (
                        <button
                          type="button"
                          onClick={() => onScheduleTask(item.rawTask!)}
                          className="p-1.5 text-pink-600 hover:text-pink-900 hover:bg-pink-100 rounded-lg transition-colors"
                          title="Schedule onto calendar"
                        >
                          <CalendarPlus className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {!readOnly && (
                        <>
                          <button
                            type="button"
                            onClick={() => openEditModal(item)}
                            className="p-1.5 text-pink-600 hover:text-pink-900 hover:bg-pink-100 rounded-lg transition-colors"
                            title="Edit assignment"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (item.sourceType === 'task') {
                                onDeleteTask(item.id);
                              } else {
                                onDeleteEvent(item.id);
                              }
                            }}
                            className="p-1.5 text-pink-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete assignment"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Cute Footer Summary matching the screenshot */}
        <div className="pt-2 pb-4 border-t border-pink-200/80 text-center space-y-0.5">
          <p className="text-xs font-semibold text-pink-600">
            EduTrack Calendar &amp; Reward Portal · Priority Task System
          </p>
          <p className="text-xs font-extrabold text-pink-900 tabular-nums">
            Total Earned Points: <span className="text-indigo-700">{totalPoints} pts</span>
          </p>
        </div>
      </div>

      {/* Add / Edit Assignment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-pink-950/50 backdrop-blur-2xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border-2 border-pink-300 overflow-hidden max-h-[92dvh] flex flex-col text-pink-950">
            <div className="p-4 bg-gradient-to-r from-pink-200 via-rose-100 to-pink-200 border-b border-pink-300 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-white text-pink-600 flex items-center justify-center border border-pink-300 shadow-2xs">
                  <BookOpen className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-sm font-black text-pink-950">
                    {editingItem ? 'Edit Assignment' : 'Add New Assignment'} ✨
                  </h3>
                  <p className="text-[11px] text-pink-700 font-medium">
                    Set subject, priority, due date, and reward points
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-pink-700 hover:text-pink-950 hover:bg-pink-200/70 rounded-xl transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAssignment} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
              {/* Task Name */}
              <div>
                <label className="block text-xs font-bold text-pink-900 mb-1">
                  Assignment / Task Name *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  maxLength={200}
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Physics Lab: Projectile Motion Calculation"
                  className="w-full text-sm px-3.5 py-2.5 bg-pink-50/50 border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400 focus:bg-white text-pink-950 font-semibold placeholder:text-pink-300"
                />
              </div>

              {/* Subject + Quick Chips */}
              <div>
                <label className="block text-xs font-bold text-pink-900 mb-1">
                  Subject / Course *
                </label>
                <input
                  type="text"
                  required
                  maxLength={80}
                  value={formSubject}
                  onChange={(e) => setFormSubject(e.target.value)}
                  placeholder="e.g. General Physics, Gen Math, Oral Comm"
                  className="w-full text-xs px-3 py-2 bg-pink-50/50 border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400 focus:bg-white text-pink-950 font-semibold"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {SUBJECT_PRESETS.map((subj) => (
                    <button
                      key={subj}
                      type="button"
                      onClick={() => {
                        setFormSubject(subj);
                        cuteSound.playCutePop();
                      }}
                      className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-colors ${
                        formSubject === subj
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-indigo-50/70 text-indigo-800 border-indigo-200 hover:bg-indigo-100'
                      }`}
                    >
                      {subj}
                    </button>
                  ))}
                </div>
              </div>

              {/* Priority & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-pink-900 mb-1">
                    Priority
                  </label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as Priority)}
                    className="w-full text-xs px-3 py-2 bg-pink-50/50 border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400 text-pink-950 font-semibold"
                  >
                    <option value="high">High Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="low">Low Priority</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-pink-900 mb-1">
                    Calendar Category
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as EventCategory)}
                    className="w-full text-xs px-3 py-2 bg-pink-50/50 border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400 text-pink-950 font-semibold"
                  >
                    {CATEGORY_LIST.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Due Date & Due Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-pink-900 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-pink-50/50 border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400 text-pink-950 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-pink-900 mb-1">
                    Due Time
                  </label>
                  <input
                    type="time"
                    value={formDueTime}
                    onChange={(e) => setFormDueTime(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-pink-50/50 border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400 text-pink-950 font-mono"
                  />
                </div>
              </div>

              {/* Points Value */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-pink-900">
                    Reward Points
                  </label>
                  <span className="text-xs font-black text-emerald-700 tabular-nums">
                    +{formPoints} pts
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {POINT_PRESETS.map((pts) => (
                    <button
                      key={pts}
                      type="button"
                      onClick={() => {
                        setFormPoints(pts);
                        cuteSound.playCutePop();
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border tabular-nums transition-colors ${
                        formPoints === pts
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                      }`}
                    >
                      +{pts} pts
                    </button>
                  ))}
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={formPoints}
                    onChange={(e) =>
                      setFormPoints(Math.max(1, Math.min(100, Number(e.target.value) || 5)))
                    }
                    className="w-20 text-xs px-2.5 py-1.5 bg-white border border-pink-200 rounded-xl text-pink-950 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-pink-400"
                    aria-label="Custom points value"
                  />
                </div>
              </div>

              {/* Description / Instructions */}
              <div>
                <label className="block text-xs font-bold text-pink-900 mb-1">
                  Instructions / Notes
                </label>
                <textarea
                  rows={2}
                  maxLength={2000}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="e.g. Solve problems 1–15 in Chapter 3 and upload photo proof."
                  className="w-full text-xs px-3 py-2 bg-pink-50/50 border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400 focus:bg-white text-pink-950 resize-none placeholder:text-pink-300"
                />
              </div>

              {/* Option to schedule directly on calendar when adding */}
              {!editingItem && (
                <label className="flex items-center gap-2 p-2.5 bg-pink-50/80 border border-pink-200 rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={alsoScheduleOnCalendar}
                    onChange={(e) => setAlsoScheduleOnCalendar(e.target.checked)}
                    className="w-4 h-4 rounded accent-pink-500"
                  />
                  <span className="text-xs font-bold text-pink-900">
                    Also block time for this assignment on my Calendar
                  </span>
                </label>
              )}

              <div className="pt-3 border-t border-pink-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-pink-700 hover:text-pink-950"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-extrabold text-white bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 rounded-xl shadow-md shadow-pink-300/60 transition-transform active:scale-95"
                >
                  {editingItem ? 'Save Changes 💖' : 'Save Assignment 🎀'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Picture Proof Quick Preview Modal */}
      {proofPreviewItem && proofPreviewItem.evidence && (
        <div className="fixed inset-0 z-50 bg-pink-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border-2 border-pink-300 shadow-2xl overflow-hidden text-pink-950">
            <div className="p-4 bg-gradient-to-r from-emerald-50 to-pink-50 border-b border-pink-200 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-black text-pink-950">
                  {proofPreviewItem.title}
                </h4>
                <p className="text-[11px] text-emerald-700 font-bold">
                  Completed · +{proofPreviewItem.evidence.pointsEarned} pts ·{' '}
                  {proofPreviewItem.evidence.completedTimeFormatted}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setProofPreviewItem(null)}
                className="p-1.5 text-pink-600 hover:bg-pink-100 rounded-xl"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <img
                src={proofPreviewItem.evidence.photoUrl}
                alt={`Proof for ${proofPreviewItem.title}`}
                className="w-full max-h-72 object-cover rounded-2xl border border-pink-200"
              />
              {proofPreviewItem.evidence.notes && (
                <p className="text-xs text-pink-900 bg-pink-50 p-2.5 rounded-xl border border-pink-200">
                  {proofPreviewItem.evidence.notes}
                </p>
              )}
              {proofPreviewItem.evidence.teacherFeedback && (
                <p className="text-xs text-purple-900 bg-purple-50 p-2.5 rounded-xl border border-purple-200 font-semibold">
                  Teacher Feedback: {proofPreviewItem.evidence.teacherFeedback}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
