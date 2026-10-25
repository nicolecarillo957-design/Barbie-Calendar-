import React, { useState, useRef } from 'react';
import { CalendarEvent, TaskEvidence, UnscheduledTask } from '../types/calendar';
import { cuteSound } from '../utils/cuteSound';
import { 
  Camera, 
  Upload, 
  CheckCircle2, 
  X, 
  Sparkles, 
  Clock, 
  Award, 
  Flame, 
  AlertCircle,
  FileText,
  User
} from 'lucide-react';

interface TaskEvidenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetItem: {
    type: 'event' | 'task';
    id: string;
    title: string;
    category?: string;
    pointsValue?: number;
    existingEvidence?: TaskEvidence;
  } | null;
  studentName: string;
  onConfirmCompletionWithEvidence: (evidence: TaskEvidence) => void;
}

export const TaskEvidenceModal: React.FC<TaskEvidenceModalProps> = ({
  isOpen,
  onClose,
  targetItem,
  studentName,
  onConfirmCompletionWithEvidence,
}) => {
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [selectedPoints, setSelectedPoints] = useState<number>(() => {
    return targetItem?.pointsValue || 10;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync existing evidence if inspecting or updating
  React.useEffect(() => {
    if (targetItem?.existingEvidence) {
      setPhotoUrl(targetItem.existingEvidence.photoUrl);
      setNotes(targetItem.existingEvidence.notes || '');
      setSelectedPoints(targetItem.existingEvidence.pointsEarned);
    } else {
      setPhotoUrl('');
      setNotes('');
      setSelectedPoints(targetItem?.pointsValue || 10);
      setErrorMsg('');
    }
  }, [targetItem]);

  if (!isOpen || !targetItem) return null;

  // Real-time local formatted timestamp
  const now = new Date();
  const formattedExactTime = now.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }) + ' at ' + now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select an image file (JPG, PNG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPhotoUrl(reader.result);
        setErrorMsg('');
        cuteSound.playSparkle();
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUseSampleCamera = () => {
    // Generate a cute study desk proof mockup if device camera is unavailable
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Background gradient
      const grad = ctx.createLinearGradient(0, 0, 600, 400);
      grad.addColorStop(0, '#fdf2f8');
      grad.addColorStop(0.5, '#fce7f3');
      grad.addColorStop(1, '#fbcfe8');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 600, 400);

      // Cute notebook frame
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(236, 72, 153, 0.2)';
      ctx.shadowBlur = 15;
      ctx.fillRect(50, 40, 500, 320);

      // Notebook lines
      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = '#fbcfe8';
      ctx.lineWidth = 1.5;
      for (let y = 100; y < 340; y += 28) {
        ctx.beginPath();
        ctx.moveTo(80, y);
        ctx.lineTo(520, y);
        ctx.stroke();
      }

      // Title & Verification Stamp
      ctx.fillStyle = '#db2777';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText('STUDY TASK FINISHED! 💖', 90, 85);

      ctx.fillStyle = '#831843';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText(`Task: ${targetItem.title.substring(0, 38)}`, 90, 130);

      ctx.fillStyle = '#9d174d';
      ctx.font = '14px sans-serif';
      ctx.fillText(`Student: ${studentName || 'Student'}`, 90, 165);
      ctx.fillText(`Timestamp: ${formattedExactTime}`, 90, 195);
      ctx.fillText('Status: Evidence Verified for Teacher Review', 90, 225);

      // Barbie Stamp
      ctx.fillStyle = '#ec4899';
      ctx.beginPath();
      ctx.arc(460, 260, 45, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('VERIFIED', 460, 255);
      ctx.fillText('COMPLETE 🎀', 460, 275);
    }

    setPhotoUrl(canvas.toDataURL('image/jpeg', 0.9));
    setErrorMsg('');
    cuteSound.playSparkle();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoUrl) {
      setErrorMsg('A picture evidence is required to prove task completion and earn points/streak!');
      cuteSound.playCutePop();
      return;
    }

    setIsSubmitting(true);
    const newEvidence: TaskEvidence = {
      id: `evid-${Date.now()}`,
      photoUrl,
      completedAt: new Date().toISOString(),
      completedTimeFormatted: formattedExactTime,
      notes: notes.trim(),
      pointsEarned: selectedPoints,
      studentName: studentName || 'Student',
      teacherVerified: false,
    };

    onConfirmCompletionWithEvidence(newEvidence);
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-pink-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border-2 border-pink-300 overflow-hidden my-auto max-h-[94vh] flex flex-col text-pink-950 animate-in zoom-in-95 duration-200">
        
        {/* Header Bar */}
        <div className="p-4 bg-gradient-to-r from-pink-200 via-rose-100 to-pink-200 border-b border-pink-300 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-full bg-white text-pink-600 flex items-center justify-center shadow-xs border border-pink-300 text-lg shrink-0">
              📸
            </span>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-extrabold text-pink-950 tracking-tight">
                  Proof of Completion
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-2xs font-mono">
                  +{selectedPoints} pts 🔥
                </span>
              </div>
              <p className="text-[11px] text-pink-700 font-medium">
                Upload a picture of your finished work for teacher review & streak!
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          
          {/* Target Task Summary Card */}
          <div className="p-3 bg-pink-50/80 border border-pink-200 rounded-2xl flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold text-pink-500 block">
                Checking Off Task
              </span>
              <h4 className="text-sm font-black text-pink-950 truncate">
                {targetItem.title}
              </h4>
              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-pink-700 font-medium">
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3 text-pink-500" />
                  {studentName || 'Student'}
                </span>
                <span>·</span>
                <span className="flex items-center gap-1 text-pink-600 font-mono">
                  <Clock className="w-3 h-3 text-pink-500" />
                  {formattedExactTime.split(' at ')[1] || 'Right now'}
                </span>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-white border border-pink-200 shadow-2xs shrink-0">
              <Flame className="w-5 h-5 text-amber-500 fill-amber-400 animate-bounce" />
              <span className="text-[10px] font-black text-pink-900 mt-0.5">Streak +1</span>
            </div>
          </div>

          {/* Points Selection (5 pts or 10 pts) */}
          <div>
            <label className="block text-xs font-bold text-pink-900 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-pink-600" />
                <span>Points to Earn for this Task:</span>
              </span>
              <span className="text-[11px] text-pink-600 font-normal">Based on effort</span>
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setSelectedPoints(5);
                  cuteSound.playSparkle();
                }}
                className={`p-2.5 rounded-2xl border text-center transition-all flex items-center justify-center gap-2 ${
                  selectedPoints === 5
                    ? 'bg-pink-500 text-white border-pink-600 shadow-md scale-[1.02]'
                    : 'bg-white text-pink-900 border-pink-200 hover:bg-pink-50'
                }`}
              >
                <span className="text-base font-black">5 Points</span>
                <span className="text-[10px] opacity-80">(Standard Task)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedPoints(10);
                  cuteSound.playSparkle();
                }}
                className={`p-2.5 rounded-2xl border text-center transition-all flex items-center justify-center gap-2 ${
                  selectedPoints === 10
                    ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white border-rose-600 shadow-md scale-[1.02]'
                    : 'bg-white text-pink-900 border-pink-200 hover:bg-pink-50'
                }`}
              >
                <span className="text-base font-black">10 Points</span>
                <span className="text-[10px] opacity-80 font-bold">(Deep Work / Project) ✨</span>
              </button>
            </div>
          </div>

          {/* Picture Upload & Camera Trigger */}
          <div>
            <label className="block text-xs font-bold text-pink-900 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-pink-600" />
                <span>Picture Evidence (Required):</span>
              </span>
              <span className="text-[10px] text-rose-600 font-bold">* Teacher verifies time & work</span>
            </label>

            {/* Hidden native input */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              capture="environment"
              onChange={handleFileUpload}
              className="hidden"
            />

            {/* Photo preview or upload buttons */}
            {photoUrl ? (
              <div className="relative rounded-2xl overflow-hidden border-2 border-pink-300 shadow-md group">
                <img
                  src={photoUrl}
                  alt="Work evidence"
                  className="w-full max-h-56 object-cover bg-slate-100"
                />
                
                {/* Time & Stamp Overlay */}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-pink-950/80 via-pink-950/50 to-transparent p-2.5 text-white flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-pink-300" />
                    <span className="font-mono text-[11px] font-bold">
                      {formattedExactTime}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-pink-500 text-[10px] font-extrabold uppercase">
                    Photo Attached 📸
                  </span>
                </div>

                {/* Change photo button */}
                <button
                  type="button"
                  onClick={() => {
                    setPhotoUrl('');
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="absolute top-2 right-2 p-1.5 bg-pink-950/70 hover:bg-pink-950 text-white rounded-full transition-colors shadow-sm"
                  title="Remove and choose another picture"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="p-4 bg-pink-50/50 rounded-2xl border-2 border-dashed border-pink-300 text-center space-y-3">
                <div className="w-12 h-12 mx-auto rounded-full bg-white text-pink-500 border border-pink-200 flex items-center justify-center shadow-2xs">
                  <Camera className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-pink-950">
                    Take or upload a picture of your finished work
                  </p>
                  <p className="text-[11px] text-pink-600 mt-0.5">
                    Your photo will be stamped with the exact completion time ({formattedExactTime.split(' at ')[1]})
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-2 text-xs font-extrabold text-white bg-pink-500 hover:bg-pink-600 rounded-xl shadow-xs flex items-center gap-1.5 transition-transform active:scale-95"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Picture / Take Photo</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleUseSampleCamera}
                    className="px-3 py-2 text-xs font-bold text-pink-700 bg-white hover:bg-pink-100/70 border border-pink-300 rounded-xl shadow-2xs flex items-center gap-1 transition-colors"
                    title="Generate a student verification snapshot"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-pink-500" />
                    <span>Quick Test Snapshot</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {errorMsg && (
            <div className="p-2.5 bg-rose-50 border border-rose-300 rounded-xl flex items-center gap-2 text-xs font-bold text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Optional Reflection / Student Notes */}
          <div>
            <label className="block text-xs font-bold text-pink-900 mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-pink-600" />
              <span>Notes for the Teacher (Optional):</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Completed questions 1-10 on page 42, took 40 minutes! 💖"
              rows={2}
              className="w-full text-xs p-2.5 bg-white border border-pink-200 rounded-xl text-pink-950 placeholder:text-pink-300 focus:outline-none focus:ring-1 focus:ring-pink-400"
            />
          </div>

          {/* Time & Teacher Transparency Notice */}
          <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-200/80 text-[11px] text-pink-800 leading-snug">
            <span className="font-extrabold text-pink-950 flex items-center gap-1">
              <span>👩‍🏫 Teacher Monitor:</span>
            </span>
            <span>
              Your teacher can see this picture, student name, and the recorded time (<strong>{formattedExactTime}</strong>) to verify your assignment was completed on schedule.
            </span>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-pink-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-pink-700 hover:text-pink-900 hover:bg-pink-100 rounded-xl transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 text-xs font-extrabold text-white bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 rounded-xl shadow-md shadow-pink-300/50 flex items-center gap-2 transition-transform active:scale-95 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
              <span>Finish Task & Claim +{selectedPoints} Pts! 🎀</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
