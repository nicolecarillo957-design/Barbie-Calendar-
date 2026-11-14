import React, { useEffect, useRef, useState } from 'react';
import { User } from 'firebase/auth';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import {
  CREATOR_ADMIN_EMAIL,
  db,
  handleFirestoreError,
  OperationType,
  replyToFeedbackMessage,
  sendFeedbackMessage,
} from '../firebase';
import { FeedbackCategory, FeedbackMessage } from '../types/calendar';
import { cuteSound } from '../utils/cuteSound';
import {
  MessageCircleHeart,
  Send,
  X,
  Sparkles,
  Reply,
  Inbox,
  CheckCircle2,
  User as UserIcon,
} from 'lucide-react';

interface FeedbackChatBoxProps {
  currentUser: User;
}

const CATEGORY_OPTIONS: { id: FeedbackCategory; label: string; emoji: string }[] = [
  { id: 'feedback', label: 'Feedback', emoji: '💬' },
  { id: 'idea', label: 'Idea', emoji: '💡' },
  { id: 'praise', label: 'Love It', emoji: '💖' },
  { id: 'bug', label: 'Issue', emoji: '🐛' },
];

export const FeedbackChatBox: React.FC<FeedbackChatBoxProps> = ({ currentUser }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<FeedbackMessage[]>([]);
  const [text, setText] = useState('');
  const [category, setCategory] = useState<FeedbackCategory>('feedback');
  const [isSending, setIsSending] = useState(false);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [sentNotice, setSentNotice] = useState(false);

  const listEndRef = useRef<HTMLDivElement>(null);

  const isCreator =
    (currentUser.email || '').toLowerCase() === CREATOR_ADMIN_EMAIL.toLowerCase();

  // Real-time listener on feedback_messages
  useEffect(() => {
    if (!currentUser) return;

    const colRef = collection(db, 'feedback_messages');
    // Creator sees all feedback messages; regular users see their own feedback chat
    const q = isCreator
      ? query(colRef, orderBy('createdAt', 'asc'))
      : query(colRef, where('senderUid', '==', currentUser.uid));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loaded: FeedbackMessage[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          const createdAtMs =
            data.createdAt && typeof data.createdAt.toMillis === 'function'
              ? data.createdAt.toMillis()
              : Date.now();
          return {
            id: docSnap.id,
            senderUid: data.senderUid,
            senderName: data.senderName,
            senderEmail: data.senderEmail,
            senderPhotoUrl: data.senderPhotoUrl,
            recipientEmail: data.recipientEmail,
            category: data.category || 'feedback',
            text: data.text,
            replyText: data.replyText,
            replyByEmail: data.replyByEmail,
            createdAtMs,
          };
        });
        loaded.sort((a, b) => (a.createdAtMs || 0) - (b.createdAtMs || 0));
        setMessages(loaded);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'feedback_messages');
      }
    );

    return () => unsubscribe();
  }, [currentUser, isCreator]);

  useEffect(() => {
    if (isOpen && listEndRef.current) {
      listEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, isOpen]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || isSending) return;

    setIsSending(true);
    try {
      await sendFeedbackMessage(currentUser, text, category);
      setText('');
      cuteSound.playSparkle();
      setSentNotice(true);
      setTimeout(() => setSentNotice(false), 3000);
    } finally {
      setIsSending(false);
    }
  };

  const handleSendReply = async (messageId: string) => {
    const draft = replyDrafts[messageId];
    if (!draft?.trim() || !currentUser.email) return;

    setReplyingId(messageId);
    try {
      await replyToFeedbackMessage(messageId, draft, currentUser.email);
      setReplyDrafts((prev) => ({ ...prev, [messageId]: '' }));
      cuteSound.playSparkle();
    } finally {
      setReplyingId(null);
    }
  };

  const unrepliedCount = isCreator
    ? messages.filter((m) => !m.replyText).length
    : messages.filter((m) => !!m.replyText).length;

  return (
    <>
      {/* Floating Chat Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true);
            cuteSound.playCutePop();
          }}
          className="fixed bottom-20 md:bottom-5 right-4 z-40 px-3.5 py-2.5 bg-gradient-to-r from-pink-500 via-rose-500 to-fuchsia-600 hover:from-pink-600 hover:to-rose-600 text-white rounded-2xl shadow-xl shadow-pink-300/60 border-2 border-white flex items-center gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer"
          title="Chat or leave feedback for the app creator"
        >
          <MessageCircleHeart className="w-4 h-4 fill-white/20" />
          <span className="text-xs font-extrabold">
            {isCreator ? 'Creator Feedback Inbox' : 'Feedback Chat'}
          </span>
          {unrepliedCount > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] font-black rounded-full bg-amber-300 text-pink-950 font-mono">
              {unrepliedCount}
            </span>
          )}
        </button>
      )}

      {/* Expanded Chat Box Panel */}
      {isOpen && (
        <div className="fixed bottom-20 md:bottom-5 right-3 sm:right-5 z-50 w-[calc(100vw-24px)] max-w-sm bg-white rounded-3xl shadow-2xl border-2 border-pink-300 overflow-hidden flex flex-col max-h-[75vh] animate-in slide-in-from-bottom-4 duration-200 text-pink-950">
          {/* Header */}
          <div className="p-3.5 bg-gradient-to-r from-pink-500 via-rose-500 to-fuchsia-600 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shrink-0">
                {isCreator ? (
                  <Inbox className="w-5 h-5 text-white" />
                ) : (
                  <MessageCircleHeart className="w-5 h-5 text-white" />
                )}
              </div>
              <div className="min-w-0">
                <h3 className="text-xs sm:text-sm font-black flex items-center gap-1 truncate">
                  <span>{isCreator ? 'Creator Feedback Inbox' : 'App Feedback & Chat'}</span>
                  <Sparkles className="w-3.5 h-3.5 text-yellow-300 shrink-0" />
                </h3>
                <p className="text-[10px] text-pink-100 truncate font-medium">
                  {isCreator
                    ? `Viewing all user feedback (${messages.length} messages)`
                    : `Sent directly to creator (${CREATOR_ADMIN_EMAIL})`}
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 hover:bg-white/20 rounded-xl text-white transition-colors shrink-0"
              title="Minimize chat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-pink-50/40 min-h-[220px]">
            {messages.length === 0 ? (
              <div className="py-10 text-center space-y-2 px-3">
                <div className="w-12 h-12 mx-auto rounded-full bg-pink-100 flex items-center justify-center text-pink-500">
                  <MessageCircleHeart className="w-6 h-6" />
                </div>
                <p className="text-xs font-extrabold text-pink-950">
                  {isCreator
                    ? 'No user feedback messages yet'
                    : 'Leave your thoughts or feedback!'}
                </p>
                <p className="text-[11px] text-pink-600 leading-relaxed">
                  {isCreator
                    ? 'When students or teachers send feedback from the chat box, it will appear right here with their Gmail address.'
                    : `Anything you write here goes straight to the app creator (${CREATOR_ADMIN_EMAIL}). Tell us what you love or what we can improve!`}
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const catEmoji =
                  CATEGORY_OPTIONS.find((c) => c.id === msg.category)?.emoji || '💬';
                const timeStr = msg.createdAtMs
                  ? new Date(msg.createdAtMs).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Just now';

                return (
                  <div
                    key={msg.id}
                    className="bg-white rounded-2xl border border-pink-200 p-3 shadow-2xs space-y-2"
                  >
                    {/* Sender Info Row */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {msg.senderPhotoUrl ? (
                          <img
                            src={msg.senderPhotoUrl}
                            alt={msg.senderName}
                            className="w-6 h-6 rounded-full border border-pink-200 shrink-0"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center shrink-0">
                            <UserIcon className="w-3.5 h-3.5" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-[11px] font-black text-pink-950 truncate">
                            {msg.senderName}
                          </p>
                          <p className="text-[9px] text-pink-500 font-mono truncate">
                            {msg.senderEmail}
                          </p>
                        </div>
                      </div>

                      <span className="px-2 py-0.5 rounded-full bg-pink-100 text-pink-800 text-[10px] font-bold shrink-0">
                        {catEmoji} {msg.category}
                      </span>
                    </div>

                    {/* User's Feedback Body */}
                    <p className="text-xs text-pink-900 bg-pink-50/50 rounded-xl p-2.5 border border-pink-100 leading-relaxed whitespace-pre-wrap">
                      {msg.text}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-pink-400">
                      <span>{timeStr}</span>
                      <span className="text-emerald-600 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Delivered to creator
                      </span>
                    </div>

                    {/* Creator Reply if exists */}
                    {msg.replyText && (
                      <div className="mt-2 p-2.5 rounded-xl bg-gradient-to-r from-fuchsia-50 to-pink-50 border border-fuchsia-200 space-y-1">
                        <p className="text-[10px] font-black text-fuchsia-800 uppercase tracking-wider flex items-center gap-1">
                          <Reply className="w-3 h-3" />
                          <span>Creator Reply ({msg.replyByEmail || CREATOR_ADMIN_EMAIL})</span>
                        </p>
                        <p className="text-xs text-fuchsia-950 font-medium leading-snug">
                          {msg.replyText}
                        </p>
                      </div>
                    )}

                    {/* Inline Reply Box for Creator */}
                    {isCreator && (
                      <div className="pt-1.5 border-t border-pink-100 flex items-center gap-1.5">
                        <input
                          type="text"
                          value={replyDrafts[msg.id] || ''}
                          onChange={(e) =>
                            setReplyDrafts((prev) => ({
                              ...prev,
                              [msg.id]: e.target.value,
                            }))
                          }
                          placeholder={msg.replyText ? 'Update reply...' : 'Reply to user...'}
                          className="flex-1 text-[11px] px-2.5 py-1.5 bg-pink-50/60 border border-pink-200 rounded-lg text-pink-950 placeholder:text-pink-400 focus:outline-none focus:ring-1 focus:ring-pink-400"
                        />
                        <button
                          type="button"
                          onClick={() => handleSendReply(msg.id)}
                          disabled={replyingId === msg.id || !replyDrafts[msg.id]?.trim()}
                          className="px-2.5 py-1.5 bg-pink-500 hover:bg-pink-600 disabled:opacity-50 text-white text-[11px] font-bold rounded-lg transition-colors"
                        >
                          Reply
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
            <div ref={listEndRef} />
          </div>

          {/* Input Composer */}
          <form onSubmit={handleSend} className="p-3 bg-white border-t border-pink-200 space-y-2 shrink-0">
            {/* Category Selector */}
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
              {CATEGORY_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setCategory(opt.id)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors shrink-0 ${
                    category === opt.id
                      ? 'bg-pink-500 text-white border-pink-500'
                      : 'bg-pink-50 text-pink-700 border-pink-200 hover:bg-pink-100'
                  }`}
                >
                  {opt.emoji} {opt.label}
                </button>
              ))}
            </div>

            {sentNotice && (
              <p className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Feedback sent to creator ({CREATOR_ADMIN_EMAIL})! 💖</span>
              </p>
            )}

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={1000}
                placeholder="Share your thoughts or feedback..."
                className="flex-1 text-xs px-3 py-2 bg-pink-50/60 border border-pink-200 rounded-xl text-pink-950 placeholder:text-pink-400 focus:outline-none focus:ring-1 focus:ring-pink-400"
              />
              <button
                type="submit"
                disabled={isSending || !text.trim()}
                className="p-2.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 disabled:opacity-50 text-white rounded-xl shadow-xs transition-transform active:scale-95"
                title="Send feedback to creator"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
};
