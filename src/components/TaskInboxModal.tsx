import React, { useState } from 'react';
import { UnscheduledTask, EventCategory } from '../types/calendar';
import { CATEGORY_LIST, getCategoryConfig } from '../utils/categories';
import { cuteSound } from '../utils/cuteSound';
import { 
  X, 
  Plus, 
  Check, 
  Trash2, 
  CalendarPlus, 
  Bell, 
  Clock, 
  Sparkles,
  Inbox
} from 'lucide-react';

interface TaskInboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: UnscheduledTask[];
  onAddTask: (task: Omit<UnscheduledTask, 'id' | 'completed'>) => void;
  onToggleTaskComplete: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onScheduleTask: (task: UnscheduledTask) => void;
  onToggleTaskReminder?: (taskId: string) => void;
}

export const TaskInboxModal: React.FC<TaskInboxModalProps> = ({
  isOpen,
  onClose,
  tasks,
  onAddTask,
  onToggleTaskComplete,
  onDeleteTask,
  onScheduleTask,
  onToggleTaskReminder,
}) => {
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskCategory, setTaskCategory] = useState<EventCategory>('deep_work');
  const [taskMinutes, setTaskMinutes] = useState(45);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('pending');

  if (!isOpen) return null;

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    onAddTask({
      title: taskTitle.trim(),
      category: taskCategory,
      estimatedMinutes: taskMinutes,
      priority: 'medium',
    });

    setTaskTitle('');
    setIsAddingTask(false);
    cuteSound.playSparkle();
  };

  const filteredTasks = tasks.filter((t) => {
    if (filter === 'pending') return !t.completed;
    if (filter === 'completed') return t.completed;
    return true;
  });

  const pendingCount = tasks.filter((t) => !t.completed).length;

  return (
    <div className="fixed inset-0 z-50 bg-pink-950/50 backdrop-blur-2xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl border-t-2 sm:border-2 border-pink-300 overflow-hidden flex flex-col max-h-[88vh] text-pink-950 animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-pink-200 via-rose-100 to-pink-200 border-b border-pink-300 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-white text-pink-600 flex items-center justify-center shadow-xs border border-pink-300">
              <Inbox className="w-4 h-4 text-pink-600" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold text-pink-950">
                  Inbox & Task Backlog
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-500 text-white font-bold font-mono">
                  {pendingCount} open
                </span>
              </div>
              <p className="text-[11px] text-pink-700 font-medium">Capture ideas & drop them onto your calendar</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                setIsAddingTask(true);
                cuteSound.playCutePop();
              }}
              className="p-1.5 bg-white text-pink-600 hover:text-pink-900 border border-pink-300 rounded-xl shadow-2xs transition-colors flex items-center gap-1 text-xs font-bold"
              title="Add new task"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span className="hidden sm:inline">Add Task</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-pink-700 hover:text-pink-900 hover:bg-pink-300/50 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="px-4 py-2 bg-pink-50/70 border-b border-pink-200 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-1 bg-white/80 p-0.5 rounded-xl border border-pink-200">
            <button
              onClick={() => setFilter('pending')}
              className={`px-3 py-1 rounded-lg font-bold text-xs transition-colors ${
                filter === 'pending'
                  ? 'bg-pink-500 text-white shadow-2xs'
                  : 'text-pink-700 hover:bg-pink-100'
              }`}
            >
              Pending ({pendingCount})
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-lg font-bold text-xs transition-colors ${
                filter === 'all'
                  ? 'bg-pink-500 text-white shadow-2xs'
                  : 'text-pink-700 hover:bg-pink-100'
              }`}
            >
              All ({tasks.length})
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-3 py-1 rounded-lg font-bold text-xs transition-colors ${
                filter === 'completed'
                  ? 'bg-pink-500 text-white shadow-2xs'
                  : 'text-pink-700 hover:bg-pink-100'
              }`}
            >
              Done ({tasks.length - pendingCount})
            </button>
          </div>
        </div>

        {/* Task Quick Creator Form */}
        {isAddingTask && (
          <form onSubmit={handleCreateTask} className="p-3.5 bg-pink-100/80 border-b border-pink-200 shrink-0">
            <input
              type="text"
              placeholder="What needs to be scheduled? ✨"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              autoFocus
              className="w-full text-xs px-3 py-2 bg-white border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400 mb-2.5 text-pink-950 placeholder:text-pink-400"
            />
            <div className="flex items-center gap-2 mb-2.5">
              <select
                value={taskCategory}
                onChange={(e) => setTaskCategory(e.target.value as EventCategory)}
                className="text-xs bg-white border border-pink-200 rounded-xl px-2.5 py-1.5 text-pink-900 flex-1 focus:outline-none"
              >
                {CATEGORY_LIST.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
              <select
                value={taskMinutes}
                onChange={(e) => setTaskMinutes(Number(e.target.value))}
                className="text-xs bg-white border border-pink-200 rounded-xl px-2.5 py-1.5 text-pink-900 w-24 focus:outline-none font-mono"
              >
                <option value={15}>15 mins</option>
                <option value={30}>30 mins</option>
                <option value={45}>45 mins</option>
                <option value={60}>1 hour</option>
                <option value={90}>1.5 hrs</option>
                <option value={120}>2 hours</option>
              </select>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddingTask(false)}
                className="px-3 py-1.5 text-xs text-pink-700 hover:text-pink-900 font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!taskTitle.trim()}
                className="px-4 py-1.5 text-xs bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-extrabold rounded-xl disabled:opacity-50 transition-colors shadow-2xs"
              >
                Save to Inbox 💖
              </button>
            </div>
          </form>
        )}

        {/* Task List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 min-h-[160px]">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-12 text-pink-400">
              <Sparkles className="w-10 h-10 mx-auto mb-2 text-pink-300" />
              <p className="text-sm font-bold text-pink-800">
                {filter === 'completed' ? 'No completed tasks yet 🌸' : 'Your inbox is clear! 💖'}
              </p>
              <p className="text-xs text-pink-500 mt-1">Tap "+ Add Task" to capture your next to-do</p>
            </div>
          ) : (
            filteredTasks.map((task) => {
              const catConfig = getCategoryConfig(task.category);
              return (
                <div
                  key={task.id}
                  className={`group relative p-3 rounded-2xl border transition-all ${
                    task.completed
                      ? 'bg-pink-50/50 border-pink-200/50 opacity-60'
                      : 'bg-white border-pink-200 hover:border-pink-300 shadow-2xs'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <button
                      onClick={() => onToggleTaskComplete(task.id)}
                      className={`mt-0.5 w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${
                        task.completed
                          ? 'bg-pink-500 border-pink-500 text-white'
                          : 'border-pink-300 hover:border-pink-500 bg-white'
                      }`}
                    >
                      {task.completed && <Check className="w-3 h-3 stroke-[3]" />}
                    </button>

                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-xs sm:text-sm font-semibold leading-snug ${
                          task.completed ? 'line-through text-pink-400' : 'text-pink-950'
                        }`}
                      >
                        {task.title}
                      </p>

                      <div className="flex items-center gap-2 mt-2 text-[11px] text-pink-600 flex-wrap">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: catConfig.color }}
                        />
                        <span className="font-bold">{catConfig.label}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono flex items-center gap-1 shrink-0 font-bold">
                          <Clock className="w-3 h-3 text-pink-500" />
                          {task.estimatedMinutes}m
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions row */}
                  <div className="mt-3 pt-2.5 border-t border-pink-100 flex items-center justify-between gap-2">
                    {!task.completed ? (
                      <button
                        onClick={() => {
                          onScheduleTask(task);
                          onClose();
                        }}
                        className="text-xs font-extrabold text-white bg-pink-500 hover:bg-pink-600 px-3 py-1 rounded-xl flex items-center gap-1.5 shadow-2xs active:scale-95 transition-transform"
                        title="Schedule onto calendar"
                      >
                        <CalendarPlus className="w-3.5 h-3.5" />
                        <span>Schedule on Calendar 🎀</span>
                      </button>
                    ) : (
                      <span className="text-[11px] font-bold text-pink-400">Completed ✨</span>
                    )}

                    <div className="flex items-center gap-1.5 ml-auto">
                      {!task.completed && (
                        <button
                          onClick={() => onToggleTaskReminder && onToggleTaskReminder(task.id)}
                          className={`text-xs font-semibold px-2 py-1 rounded-xl flex items-center gap-1 transition-colors border ${
                            task.reminderMinutesBefore
                              ? 'bg-pink-100 text-pink-700 border-pink-300'
                              : 'bg-white text-slate-400 hover:text-pink-600 border-pink-200'
                          }`}
                          title="Toggle reminder"
                        >
                          <Bell className={`w-3.5 h-3.5 ${task.reminderMinutesBefore ? 'fill-pink-400 text-pink-600' : ''}`} />
                          <span className="hidden sm:inline">
                            {task.reminderMinutesBefore ? `${task.reminderMinutesBefore}m` : 'Remind'}
                          </span>
                        </button>
                      )}

                      <button
                        onClick={() => onDeleteTask(task.id)}
                        className="text-slate-400 hover:text-rose-600 p-1.5 rounded-xl hover:bg-rose-50 transition-colors"
                        title="Delete task"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-pink-100/60 border-t border-pink-200 flex items-center justify-between text-xs shrink-0">
          <button
            onClick={() => {
              setIsAddingTask(true);
              cuteSound.playCutePop();
            }}
            className="text-pink-700 hover:text-pink-900 font-bold flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>New Task</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-pink-300 rounded-xl font-bold text-pink-800 hover:bg-pink-50 shadow-2xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
