import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CREATOR_ADMIN_EMAIL,
  PortalUser,
  markFeedbackMessagesSeen,
  replyToFeedbackMessage,
  sendFeedbackMessage,
  subscribeFeedbackMessages,
  syncPortalNow,
} from '../localPortal';
import { FeedbackCategory, FeedbackMessage, FeedbackReply } from '../types/calendar';
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
  RefreshCw,
} from 'lucide-react';

interface FeedbackChatBoxProps {
  currentUser: PortalUser;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const CATEGORY_OPTIONS: { id: FeedbackCategory; label: string; emoji: string }[] = [
  { id: 'feedback', label: 'Feedback', emoji: '💬' },
  { id: 'idea', label: 'Idea', emoji: '💡' },
  { id: 'praise', label: 'Love It', emoji: '💖' },
  { id: 'bug', label: 'Issue', emoji: '🐛' },
];

function getThreadReplies(msg: FeedbackMessage): FeedbackReply[] {
  if (Array.isArray(msg.replies) && msg.replies.length > 0) {
    return msg.replies;
  }
  if (msg.replyText) {
    return [
      {
        id: `legacy_${msg.id}`,
        senderName: 'Creator',
        senderEmail: msg.replyByEmail || CREATOR_ADMIN_EMAIL,
        isCreator: true,
        text: msg.replyText,
        createdAtMs: msg.replyAtMs || msg.createdAtMs || Date.now(),
      },
    ];
  }
  return [];
}

function formatMsgTime(ms?: number): string {
  if (!ms) return 'Just now';
  return new Date(ms).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const FeedbackChatBox: React.FC<FeedbackChatBoxProps> = ({
  currentUser,
  isOpen: controlledOpen,
  onOpenChange,
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = (next: boolean) => {
    if (onOpenChange) onOpenChange(next);
    else setInternalOpen(next);
  };

  const [messages, setMessages] = useState<FeedbackMessage[]>([]);
  const [text, setText] = useState('');
  const [category, setCategory] = useState<FeedbackCategory>('feedback');
  const [isSending, setIsSending] = useState(false);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [sentNotice, setSentNotice] = useState(false);
  const [creatorFilter, setCreatorFilter] = useState<'all' | 'needs_reply' | 'unread'>('all');
  const [selectedSenderEmail, setSelectedSenderEmail] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const listEndRef = useRef<HTMLDivElement>(null);

  const isCreator =
    (currentUser.email || '').trim().toLowerCase() === CREATOR_ADMIN_EMAIL.toLowerCase();

  // Real-time listener on synced feedback messages store
  useEffect(() => {
    if (!currentUser) return;
    return subscribeFeedbackMessages(currentUser, isCreator, setMessages);
  }, [currentUser, isCreator]);

  // Mark visible messages/replies seen & pull latest when opened
  useEffect(() => {
    if (!isOpen || !currentUser?.email) return;
    void syncPortalNow();
    if (messages.length === 0) return;

    const toMark = isCreator
      ? messages.filter((m) => m.seenByCreator !== true).map((m) => m.id)
      : messages.filter((m) => m.seenBySender === false).map((m) => m.id);

    if (toMark.length > 0) {
      void markFeedbackMessagesSeen(toMark, currentUser.email);
    }
  }, [isOpen, messages, isCreator, currentUser?.email]);

  useEffect(() => {
    if (isOpen && listEndRef.current) {
      listEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, isOpen, selectedSenderEmail]);

  const userThreads = useMemo(() => {
    const map = new Map<
      string,
      { email: string; name: string; count: number; unread: number; latestMs: number }
    >();
    messages.forEach((m) => {
      const email = (m.senderEmail || '').trim().toLowerCase();
      if (!email || email === CREATOR_ADMIN_EMAIL.toLowerCase()) return;
      const existing = map.get(email);
      const isUnread = m.seenByCreator === false || (m.seenByCreator === undefined && !m.replyText);
      const latestMs = m.createdAtMs || 0;
      if (!existing) {
        map.set(email, {
          email,
          name: m.senderName || email.split('@')[0] || 'User',
          count: 1,
          unread: isUnread ? 1 : 0,
          latestMs,
        });
      } else {
        existing.count += 1;
        if (isUnread) existing.unread += 1;
        if (latestMs > existing.latestMs) existing.latestMs = latestMs;
      }
    });
    return Array.from(map.values()).sort((a, b) => b.latestMs - a.latestMs);
  }, [messages]);

  const filteredMessages = useMemo(() => {
    return messages.filter((m) => {
      if (isCreator && selectedSenderEmail !== 'all') {
        if ((m.senderEmail || '').trim().toLowerCase() !== selectedSenderEmail) return false;
      }
      if (isCreator && creatorFilter === 'needs_reply') {
        const replies = getThreadReplies(m);
        const lastReply = replies[replies.length - 1];
        const waitingOnCreator = replies.length === 0 || (lastReply && !lastReply.isCreator);
        if (!waitingOnCreator) return false;
      }
      if (isCreator && creatorFilter === 'unread') {
        const unread = m.seenByCreator === false || (m.seenByCreator === undefined && !m.replyText);
        if (!unread) return false;
      }
      return true;
    });
  }, [messages, isCreator, selectedSenderEmail, creatorFilter]);

  const needsReplyCount = useMemo(
    () =>
      messages.filter((m) => {
        const replies = getThreadReplies(m);
        const last = replies[replies.length - 1];
        return replies.length === 0 || (last && !last.isCreator);
      }).length,
    [messages]
  );

  const unreadBadgeCount = useMemo(() => {
    if (isCreator) {
      return messages.filter(
        (m) => m.seenByCreator === false || (m.seenByCreator === undefined && !m.replyText)
      ).length;
    }
    return messages.filter((m) => m.seenBySender === false).length;
  }, [messages, isCreator]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || isSending) return;

    // If Creator is inside a specific user's conversation, reply directly to their latest message thread!
    if (isCreator && selectedSenderEmail !== 'all' && filteredMessages.length > 0) {
      const targetMsg = filteredMessages[filteredMessages.length - 1];
      setIsSending(true);
      try {
        await replyToFeedbackMessage(targetMsg.id, text, currentUser.email, {
          senderName: currentUser.displayName || 'Creator (Nicole)',
          senderUid: currentUser.uid,
          isCreator: true,
        });
        setText('');
        cuteSound.playSparkle();
        setSentNotice(true);
        setTimeout(() => setSentNotice(false), 2500);
      } finally {
        setIsSending(false);
      }
      return;
    }

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
    if (!draft?.trim() || !currentUser.email || replyingId === messageId) return;

    setReplyingId(messageId);
    try {
      await replyToFeedbackMessage(messageId, draft, currentUser.email, {
        senderName: isCreator
          ? currentUser.displayName || 'Creator (Nicole)'
          : currentUser.displayName || currentUser.email.split('@')[0] || 'User',
        senderUid: currentUser.uid,
        isCreator,
      });
      setReplyDrafts((prev) => ({ ...prev, [messageId]: '' }));
      cuteSound.playSparkle();
    } finally {
      setReplyingId(null);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await syncPortalNow();
      cuteSound.playCutePop();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <>
      {/* Floating Chat Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => {
            setOpen(true);
            cuteSound.playCutePop();
          }}
          className="fixed bottom-20 md:bottom-5 right-3 sm:right-4 z-40 px-3 sm:px-3.5 py-2.5 bg-gradient-to-r from-pink-500 via-rose-500 to-fuchsia-600 hover:from-pink-600 hover:to-rose-600 text-white rounded-full sm:rounded-2xl shadow-xl shadow-pink-300/60 border-2 border-white flex items-center gap-1.5 sm:gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer"
          title={
            isCreator
              ? `Creator Inbox (${CREATOR_ADMIN_EMAIL})`
              : `Message or send feedback to ${CREATOR_ADMIN_EMAIL}`
          }
        >
          <MessageCircleHeart className="w-4 h-4 fill-white/20 shrink-0" />
          <span className="hidden sm:inline text-xs font-extrabold">
            {isCreator ? 'Creator Inbox' : 'Message & Feedback'}
          </span>
          <span className="sm:hidden text-[11px] font-extrabold">
            {isCreator ? 'Inbox' : 'Chat'}
          </span>
          {unreadBadgeCount > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] font-black rounded-full bg-amber-300 text-pink-950 font-mono">
              {unreadBadgeCount}
            </span>
          )}
        </button>
      )}

      {/* Expanded Chat Box / Creator Inbox Panel */}
      {isOpen && (
        <div className="fixed bottom-20 md:bottom-5 inset-x-3 sm:inset-x-auto sm:right-5 z-50 sm:w-[27rem] bg-white rounded-3xl shadow-2xl border-2 border-pink-300 overflow-hidden flex flex-col max-h-[78dvh] animate-in slide-in-from-bottom-4 duration-200 text-pink-950">
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
                  <span>{isCreator ? 'Creator Feedback Inbox' : 'Message & Feedback Chat'}</span>
                  <Sparkles className="w-3.5 h-3.5 text-yellow-300 shrink-0" />
                </h3>
                <p className="text-[10px] text-pink-100 truncate font-medium">
                  {isCreator
                    ? `${messages.length} thread${messages.length === 1 ? '' : 's'} • Inbox for ${CREATOR_ADMIN_EMAIL}`
                    : `Direct to: ${CREATOR_ADMIN_EMAIL}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={handleRefresh}
                className="p-1.5 hover:bg-white/20 rounded-xl text-white transition-colors"
                title="Refresh messages"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1.5 hover:bg-white/20 rounded-xl text-white transition-colors"
                title="Minimize chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Creator Inbox Filter & User Thread Selector */}
          {isCreator && (
            <div className="px-3 py-2 bg-pink-50/90 border-b border-pink-200 space-y-2 shrink-0">
              <div className="flex items-center gap-1.5">
                {(
                  [
                    { id: 'all', label: `All (${messages.length})` },
                    { id: 'needs_reply', label: `Needs Reply (${needsReplyCount})` },
                    { id: 'unread', label: `Unread (${unreadBadgeCount})` },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setCreatorFilter(tab.id)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-extrabold transition-colors ${
                      creatorFilter === tab.id
                        ? 'bg-pink-600 text-white shadow-2xs'
                        : 'bg-white text-pink-700 border border-pink-200 hover:bg-pink-100'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {userThreads.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                  <button
                    type="button"
                    onClick={() => setSelectedSenderEmail('all')}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold border shrink-0 transition-colors ${
                      selectedSenderEmail === 'all'
                        ? 'bg-fuchsia-600 text-white border-fuchsia-600'
                        : 'bg-white text-pink-800 border-pink-200 hover:bg-pink-100'
                    }`}
                  >
                    All Users ({userThreads.length})
                  </button>
                  {userThreads.map((t) => (
                    <button
                      key={t.email}
                      type="button"
                      onClick={() => setSelectedSenderEmail(t.email)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold border shrink-0 flex items-center gap-1 transition-colors ${
                        selectedSenderEmail === t.email
                          ? 'bg-fuchsia-600 text-white border-fuchsia-600'
                          : 'bg-white text-pink-800 border-pink-200 hover:bg-pink-100'
                      }`}
                      title={t.email}
                    >
                      <span className="truncate max-w-[110px]">{t.name}</span>
                      <span className="opacity-75 font-mono">({t.count})</span>
                      {t.unread > 0 && (
                        <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-pink-50/40 min-h-[220px]">
            {filteredMessages.length === 0 ? (
              <div className="py-10 text-center space-y-2 px-3">
                <div className="w-12 h-12 mx-auto rounded-full bg-pink-100 flex items-center justify-center text-pink-500">
                  <MessageCircleHeart className="w-6 h-6" />
                </div>
                <p className="text-xs font-extrabold text-pink-950">
                  {isCreator
                    ? messages.length === 0
                      ? 'No user messages yet'
                      : 'No messages match this filter'
                    : `Message ${CREATOR_ADMIN_EMAIL}`}
                </p>
                <p className="text-[11px] text-pink-600 leading-relaxed">
                  {isCreator
                    ? 'When students or teachers send feedback or a message, their email and conversation will appear right here so you can reply back!'
                    : `Anything you send here goes straight to the app maker (${CREATOR_ADMIN_EMAIL}), and their replies will pop right back here!`}
                </p>
              </div>
            ) : (
              filteredMessages.map((msg) => {
                const catEmoji =
                  CATEGORY_OPTIONS.find((c) => c.id === msg.category)?.emoji || '💬';
                const threadReplies = getThreadReplies(msg);

                return (
                  <div
                    key={msg.id}
                    className="bg-white rounded-2xl border border-pink-200 p-3 shadow-2xs space-y-2.5"
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
                            {msg.senderEmail} → {msg.recipientEmail || CREATOR_ADMIN_EMAIL}
                          </p>
                        </div>
                      </div>

                      <span className="px-2 py-0.5 rounded-full bg-pink-100 text-pink-800 text-[10px] font-bold shrink-0">
                        {catEmoji} {msg.category}
                      </span>
                    </div>

                    {/* Initial Message Bubble */}
                    <div className="bg-pink-50/70 rounded-xl p-2.5 border border-pink-100 space-y-1">
                      <p className="text-xs text-pink-950 leading-relaxed whitespace-pre-wrap">
                        {msg.text}
                      </p>
                      <div className="flex items-center justify-between text-[9.5px] text-pink-400">
                        <span>{formatMsgTime(msg.createdAtMs)}</span>
                        <span className="text-emerald-600 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Sent to {CREATOR_ADMIN_EMAIL}
                        </span>
                      </div>
                    </div>

                    {/* Two-Way Conversation Thread Replies */}
                    {threadReplies.length > 0 && (
                      <div className="space-y-1.5 pl-2 border-l-2 border-fuchsia-200">
                        {threadReplies.map((rep) => (
                          <div
                            key={rep.id}
                            className={`p-2 rounded-xl border space-y-0.5 ${
                              rep.isCreator
                                ? 'bg-gradient-to-r from-fuchsia-50 to-pink-50 border-fuchsia-200'
                                : 'bg-white border-pink-200'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p
                                className={`text-[10px] font-black flex items-center gap-1 truncate ${
                                  rep.isCreator ? 'text-fuchsia-800' : 'text-pink-800'
                                }`}
                              >
                                <Reply className="w-2.5 h-2.5 shrink-0" />
                                <span className="truncate">
                                  {rep.isCreator
                                    ? `App Maker (${rep.senderEmail || CREATOR_ADMIN_EMAIL})`
                                    : `${rep.senderName} (${rep.senderEmail})`}
                                </span>
                              </p>
                              <span className="text-[9px] text-pink-400 shrink-0">
                                {formatMsgTime(rep.createdAtMs)}
                              </span>
                            </div>
                            <p className="text-xs text-pink-950 font-medium leading-snug whitespace-pre-wrap">
                              {rep.text}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Inline Reply Box (Creator can always reply back; User can continue conversation!) */}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        void handleSendReply(msg.id);
                      }}
                      className="pt-1.5 border-t border-pink-100 flex items-center gap-1.5"
                    >
                      <input
                        type="text"
                        value={replyDrafts[msg.id] || ''}
                        onChange={(e) =>
                          setReplyDrafts((prev) => ({
                            ...prev,
                            [msg.id]: e.target.value,
                          }))
                        }
                        placeholder={
                          isCreator
                            ? `Message ${msg.senderName} back...`
                            : 'Reply in this thread...'
                        }
                        className="flex-1 text-[11px] px-2.5 py-1.5 bg-pink-50/60 border border-pink-200 rounded-lg text-pink-950 placeholder:text-pink-400 focus:outline-none focus:ring-1 focus:ring-pink-400"
                      />
                      <button
                        type="submit"
                        disabled={replyingId === msg.id || !replyDrafts[msg.id]?.trim()}
                        className="px-2.5 py-1.5 bg-pink-500 hover:bg-pink-600 disabled:opacity-50 text-white text-[11px] font-bold rounded-lg transition-colors shrink-0"
                      >
                        {isCreator ? 'Reply' : 'Send'}
                      </button>
                    </form>
                  </div>
                );
              })
            )}
            <div ref={listEndRef} />
          </div>

          {/* Bottom Composer */}
          <form onSubmit={handleSend} className="p-3 bg-white border-t border-pink-200 space-y-2 shrink-0">
            {(!isCreator || selectedSenderEmail === 'all') && (
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
            )}

            {sentNotice && (
              <p className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>
                  {isCreator && selectedSenderEmail !== 'all'
                    ? `Reply sent directly to ${selectedSenderEmail}! 💖`
                    : `Message delivered to ${CREATOR_ADMIN_EMAIL}! 💖`}
                </span>
              </p>
            )}

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={1000}
                placeholder={
                  isCreator && selectedSenderEmail !== 'all'
                    ? `Reply directly to ${selectedSenderEmail}...`
                    : `Message ${CREATOR_ADMIN_EMAIL}...`
                }
                className="flex-1 text-xs px-3 py-2 bg-pink-50/60 border border-pink-200 rounded-xl text-pink-950 placeholder:text-pink-400 focus:outline-none focus:ring-1 focus:ring-pink-400"
              />
              <button
                type="submit"
                disabled={isSending || !text.trim()}
                className="p-2.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 disabled:opacity-50 text-white rounded-xl shadow-xs transition-transform active:scale-95"
                title={
                  isCreator && selectedSenderEmail !== 'all'
                    ? `Send reply to ${selectedSenderEmail}`
                    : `Send message to ${CREATOR_ADMIN_EMAIL}`
                }
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
