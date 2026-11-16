import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CREATOR_ADMIN_EMAIL,
  PortalUser,
  markFeedbackMessagesSeen,
  replyToFeedbackMessage,
  sendFeedbackMessage,
  subscribeFeedbackMessages,
  subscribePortalUsers,
  syncPortalNow,
} from '../localPortal';
import {
  FeedbackCategory,
  FeedbackMessage,
  FeedbackReply,
  UserProfileDoc,
} from '../types/calendar';
import { cuteSound } from '../utils/cuteSound';
import {
  MessageCircleHeart,
  Send,
  X,
  Sparkles,
  Inbox,
  CheckCircle2,
  User as UserIcon,
  RefreshCw,
  UserPlus,
} from 'lucide-react';

interface FeedbackChatBoxProps {
  currentUser: PortalUser;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface ChatBubble {
  id: string;
  senderName: string;
  senderEmail: string;
  isCreator: boolean;
  category?: FeedbackCategory;
  text: string;
  createdAtMs: number;
}

const CATEGORY_OPTIONS: { id: FeedbackCategory; label: string; emoji: string }[] = [
  { id: 'feedback', label: 'Chat', emoji: '💬' },
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
        senderName: 'Creator (Nicole)',
        senderEmail: msg.replyByEmail || CREATOR_ADMIN_EMAIL,
        isCreator: true,
        text: msg.replyText,
        createdAtMs: msg.replyAtMs || msg.createdAtMs || Date.now(),
      },
    ];
  }
  return [];
}

function getPeerEmailForCreator(msg: FeedbackMessage): string {
  const sender = (msg.senderEmail || '').trim().toLowerCase();
  const recipient = (msg.recipientEmail || '').trim().toLowerCase();
  const creator = CREATOR_ADMIN_EMAIL.toLowerCase();
  if (sender === creator) {
    return recipient && recipient !== creator ? recipient : '';
  }
  return sender;
}

function flattenToBubbles(threads: FeedbackMessage[]): ChatBubble[] {
  const creatorEmail = CREATOR_ADMIN_EMAIL.toLowerCase();
  const bubbles: ChatBubble[] = [];
  for (const msg of threads) {
    const senderEmail = (msg.senderEmail || '').trim().toLowerCase();
    bubbles.push({
      id: `msg_${msg.id}`,
      senderName: msg.senderName || senderEmail.split('@')[0] || 'User',
      senderEmail,
      isCreator: senderEmail === creatorEmail,
      category: msg.category,
      text: msg.text,
      createdAtMs: msg.createdAtMs || 0,
    });
    for (const rep of getThreadReplies(msg)) {
      bubbles.push({
        id: `rep_${rep.id}`,
        senderName:
          rep.senderName ||
          (rep.isCreator ? 'Nicole (Maker)' : (rep.senderEmail || 'User').split('@')[0]),
        senderEmail: (rep.senderEmail || '').trim().toLowerCase(),
        isCreator: Boolean(rep.isCreator),
        text: rep.text,
        createdAtMs: rep.createdAtMs || 0,
      });
    }
  }
  return bubbles.sort((a, b) => a.createdAtMs - b.createdAtMs);
}

function formatMsgTime(ms?: number): string {
  if (!ms) return 'Just now';
  return new Date(ms).toLocaleTimeString('en-US', {
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
  const [portalUsers, setPortalUsers] = useState<UserProfileDoc[]>([]);
  const [text, setText] = useState('');
  const [category, setCategory] = useState<FeedbackCategory>('feedback');
  const [isSending, setIsSending] = useState(false);
  const [sentNotice, setSentNotice] = useState('');
  const [creatorTab, setCreatorTab] = useState<'chats' | 'needs_reply' | 'directory'>('chats');
  const [selectedPeerEmail, setSelectedPeerEmail] = useState<string>('');
  const [customPeerInput, setCustomPeerInput] = useState('');
  const [showNewChatInput, setShowNewChatInput] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const listEndRef = useRef<HTMLDivElement>(null);

  const isCreator =
    (currentUser.email || '').trim().toLowerCase() === CREATOR_ADMIN_EMAIL.toLowerCase();

  // Real-time messages & registered users listeners
  useEffect(() => {
    if (!currentUser) return;
    return subscribeFeedbackMessages(currentUser, isCreator, setMessages);
  }, [currentUser, isCreator]);

  useEffect(() => {
    if (!currentUser || !isCreator) return;
    return subscribePortalUsers(setPortalUsers);
  }, [currentUser, isCreator]);

  // Pull latest sync once when opened
  useEffect(() => {
    if (!isOpen) return;
    void syncPortalNow();
  }, [isOpen]);

  // Build peer conversation summaries for the Maker Inbox
  const peerConversations = useMemo(() => {
    if (!isCreator) return [];
    const map = new Map<
      string,
      {
        email: string;
        name: string;
        photoURL?: string;
        threads: FeedbackMessage[];
        unreadCount: number;
        needsReply: boolean;
        lastActivityMs: number;
        lastPreview: string;
      }
    >();

    // Seed from existing chats
    for (const msg of messages) {
      const peerEmail = getPeerEmailForCreator(msg);
      if (!peerEmail) continue;

      const replies = getThreadReplies(msg);
      const lastRep = replies[replies.length - 1];
      const latestMs = Math.max(msg.createdAtMs || 0, lastRep?.createdAtMs || 0);
      const latestText = lastRep ? lastRep.text : msg.text;
      const isUnread =
        (msg.senderEmail || '').trim().toLowerCase() !== CREATOR_ADMIN_EMAIL.toLowerCase() &&
        (msg.seenByCreator === false || (msg.seenByCreator === undefined && replies.length === 0));
      const waitingOnCreator = lastRep
        ? !lastRep.isCreator
        : (msg.senderEmail || '').trim().toLowerCase() !== CREATOR_ADMIN_EMAIL.toLowerCase();

      const existing = map.get(peerEmail);
      const profileMatch = portalUsers.find(
        (u) => u.email.trim().toLowerCase() === peerEmail
      );
      const displayName =
        ((msg.senderEmail || '').trim().toLowerCase() !== CREATOR_ADMIN_EMAIL.toLowerCase()
          ? msg.senderName
          : profileMatch?.displayName) ||
        profileMatch?.displayName ||
        peerEmail.split('@')[0] ||
        'User';

      if (!existing) {
        map.set(peerEmail, {
          email: peerEmail,
          name: displayName,
          photoURL: msg.senderPhotoUrl || profileMatch?.photoURL,
          threads: [msg],
          unreadCount: isUnread ? 1 : 0,
          needsReply: waitingOnCreator,
          lastActivityMs: latestMs,
          lastPreview: latestText,
        });
      } else {
        existing.threads.push(msg);
        if (isUnread) existing.unreadCount += 1;
        if (waitingOnCreator) existing.needsReply = true;
        if (latestMs >= existing.lastActivityMs) {
          existing.lastActivityMs = latestMs;
          existing.lastPreview = latestText;
        }
      }
    }

    return Array.from(map.values()).sort((a, b) => b.lastActivityMs - a.lastActivityMs);
  }, [isCreator, messages, portalUsers]);

  // Auto-select the most recent conversation for the Maker if none is selected yet
  useEffect(() => {
    if (!isCreator) return;
    if (selectedPeerEmail) return;
    if (peerConversations.length > 0) {
      const unreadFirst = peerConversations.find((c) => c.unreadCount > 0);
      setSelectedPeerEmail((unreadFirst || peerConversations[0]).email);
    } else if (portalUsers.length > 0) {
      setSelectedPeerEmail(portalUsers[0].email.trim().toLowerCase());
    }
  }, [isCreator, selectedPeerEmail, peerConversations, portalUsers]);

  const activeThreads = useMemo(() => {
    if (!isCreator) return messages;
    if (!selectedPeerEmail) return [];
    const target = selectedPeerEmail.trim().toLowerCase();
    return messages.filter((m) => getPeerEmailForCreator(m) === target);
  }, [isCreator, messages, selectedPeerEmail]);

  const activeBubbles = useMemo(() => flattenToBubbles(activeThreads), [activeThreads]);

  // Mark currently viewed threads as seen cleanly
  useEffect(() => {
    if (!isOpen || !currentUser?.email || activeThreads.length === 0) return;

    const toMark = isCreator
      ? activeThreads.filter((m) => m.seenByCreator !== true).map((m) => m.id)
      : activeThreads.filter((m) => m.seenBySender === false).map((m) => m.id);

    if (toMark.length > 0) {
      void markFeedbackMessagesSeen(toMark, currentUser.email);
    }
  }, [isOpen, activeThreads, isCreator, currentUser?.email]);

  useEffect(() => {
    if (isOpen && listEndRef.current) {
      listEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeBubbles.length, isOpen, selectedPeerEmail]);

  const unreadBadgeCount = useMemo(() => {
    if (isCreator) {
      return messages.filter(
        (m) =>
          (m.senderEmail || '').trim().toLowerCase() !== CREATOR_ADMIN_EMAIL.toLowerCase() &&
          (m.seenByCreator === false ||
            (m.seenByCreator === undefined && getThreadReplies(m).length === 0))
      ).length;
    }
    return messages.filter((m) => m.seenBySender === false).length;
  }, [messages, isCreator]);

  const needsReplyCount = useMemo(
    () => peerConversations.filter((c) => c.needsReply).length,
    [peerConversations]
  );

  const selectedPeerProfile = useMemo(() => {
    if (!selectedPeerEmail) return null;
    const conv = peerConversations.find((c) => c.email === selectedPeerEmail);
    const prof = portalUsers.find((u) => u.email.trim().toLowerCase() === selectedPeerEmail);
    return {
      email: selectedPeerEmail,
      name: conv?.name || prof?.displayName || selectedPeerEmail.split('@')[0] || 'User',
      photoURL: conv?.photoURL || prof?.photoURL,
    };
  }, [selectedPeerEmail, peerConversations, portalUsers]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = text.trim();
    if (!clean || isSending) return;

    if (isCreator) {
      if (!selectedPeerEmail) return;
      setIsSending(true);
      try {
        if (activeThreads.length > 0) {
          const latestThread = activeThreads[activeThreads.length - 1];
          await replyToFeedbackMessage(latestThread.id, clean, currentUser.email, {
            senderName: currentUser.displayName || 'Nicole (Maker)',
            senderUid: currentUser.uid,
            isCreator: true,
          });
        } else {
          await sendFeedbackMessage(currentUser, clean, 'feedback', selectedPeerEmail);
        }
        setText('');
        cuteSound.playSparkle();
        setSentNotice(`Sent to ${selectedPeerEmail}`);
        setTimeout(() => setSentNotice(''), 2500);
      } finally {
        setIsSending(false);
      }
      return;
    }

    // Regular User (Student or Teacher) chatting with Maker (nicolecarillo957@gmail.com)
    setIsSending(true);
    try {
      if (activeThreads.length > 0) {
        const latestThread = activeThreads[activeThreads.length - 1];
        await replyToFeedbackMessage(latestThread.id, clean, currentUser.email, {
          senderName: currentUser.displayName || currentUser.email.split('@')[0] || 'User',
          senderUid: currentUser.uid,
          isCreator: false,
        });
      } else {
        await sendFeedbackMessage(currentUser, clean, category, CREATOR_ADMIN_EMAIL);
      }
      setText('');
      cuteSound.playSparkle();
      setSentNotice(`Delivered to ${CREATOR_ADMIN_EMAIL}`);
      setTimeout(() => setSentNotice(''), 2500);
    } finally {
      setIsSending(false);
    }
  };

  const handleStartCustomChat = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = customPeerInput.trim().toLowerCase();
    if (!clean || !clean.includes('@')) return;
    setSelectedPeerEmail(clean);
    setCreatorTab('chats');
    setCustomPeerInput('');
    setShowNewChatInput(false);
    cuteSound.playCutePop();
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

  const visiblePeers = useMemo(() => {
    if (creatorTab === 'needs_reply') {
      return peerConversations.filter((c) => c.needsReply);
    }
    return peerConversations;
  }, [creatorTab, peerConversations]);

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
              ? `Maker Chat Inbox (${CREATOR_ADMIN_EMAIL})`
              : `Chat live with App Maker (${CREATOR_ADMIN_EMAIL})`
          }
        >
          <MessageCircleHeart className="w-4 h-4 fill-white/20 shrink-0" />
          <span className="hidden sm:inline text-xs font-extrabold">
            {isCreator ? 'Maker Inbox' : 'Chat with Maker'}
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

      {/* Expanded Live Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-20 md:bottom-5 inset-x-3 sm:inset-x-auto sm:right-5 z-50 sm:w-[27rem] bg-white rounded-3xl shadow-2xl border-2 border-pink-300 overflow-hidden flex flex-col max-h-[80dvh] animate-in slide-in-from-bottom-4 duration-200 text-pink-950">
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
                <h3 className="text-xs sm:text-sm font-black flex items-center gap-1.5 truncate">
                  <span>{isCreator ? 'Maker Chat Inbox' : 'Chat with App Maker'}</span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-400/25 border border-emerald-200/60 text-[9px] font-extrabold text-emerald-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                    Live
                  </span>
                </h3>
                <p className="text-[10px] text-pink-100 truncate font-medium">
                  {isCreator
                    ? selectedPeerProfile
                      ? `Chatting with ${selectedPeerProfile.name} (${selectedPeerProfile.email})`
                      : `Signed in as ${CREATOR_ADMIN_EMAIL}`
                    : `Direct 1-on-1 chat with ${CREATOR_ADMIN_EMAIL}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={handleRefresh}
                className="p-1.5 hover:bg-white/20 rounded-xl text-white transition-colors"
                title="Sync messages now"
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

          {/* Maker Conversation Switcher & User Picker */}
          {isCreator && (
            <div className="px-3 py-2 bg-pink-50/90 border-b border-pink-200 space-y-2 shrink-0">
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCreatorTab('chats')}
                    className={`px-2 py-1 rounded-lg text-[10px] font-extrabold transition-colors ${
                      creatorTab === 'chats'
                        ? 'bg-pink-600 text-white shadow-2xs'
                        : 'bg-white text-pink-700 border border-pink-200 hover:bg-pink-100'
                    }`}
                  >
                    Chats ({peerConversations.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreatorTab('needs_reply')}
                    className={`px-2 py-1 rounded-lg text-[10px] font-extrabold transition-colors ${
                      creatorTab === 'needs_reply'
                        ? 'bg-pink-600 text-white shadow-2xs'
                        : 'bg-white text-pink-700 border border-pink-200 hover:bg-pink-100'
                    }`}
                  >
                    Needs Reply ({needsReplyCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreatorTab('directory')}
                    className={`px-2 py-1 rounded-lg text-[10px] font-extrabold transition-colors ${
                      creatorTab === 'directory'
                        ? 'bg-pink-600 text-white shadow-2xs'
                        : 'bg-white text-pink-700 border border-pink-200 hover:bg-pink-100'
                    }`}
                  >
                    All Users ({portalUsers.length})
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowNewChatInput((v) => !v)}
                  className="p-1.5 rounded-lg bg-white hover:bg-pink-100 border border-pink-200 text-pink-700 transition-colors"
                  title="Start chat by user email"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                </button>
              </div>

              {showNewChatInput && (
                <form onSubmit={handleStartCustomChat} className="flex items-center gap-1.5">
                  <input
                    type="email"
                    value={customPeerInput}
                    onChange={(e) => setCustomPeerInput(e.target.value)}
                    placeholder="Enter student/teacher email to message..."
                    className="flex-1 text-[11px] px-2.5 py-1.5 bg-white border border-pink-200 rounded-lg text-pink-950 placeholder:text-pink-400 focus:outline-none focus:ring-1 focus:ring-pink-400"
                  />
                  <button
                    type="submit"
                    className="px-2.5 py-1.5 bg-fuchsia-600 hover:bg-fuchsia-700 text-white text-[10px] font-extrabold rounded-lg shrink-0"
                  >
                    Open Chat
                  </button>
                </form>
              )}

              {/* Clickable Conversation / User Chips */}
              {creatorTab === 'directory' ? (
                portalUsers.length > 0 ? (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                    {portalUsers.map((u) => {
                      const email = u.email.trim().toLowerCase();
                      const active = selectedPeerEmail === email;
                      return (
                        <button
                          key={u.uid}
                          type="button"
                          onClick={() => {
                            setSelectedPeerEmail(email);
                            setCreatorTab('chats');
                          }}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold border shrink-0 flex items-center gap-1 transition-colors ${
                            active
                              ? 'bg-fuchsia-600 text-white border-fuchsia-600'
                              : 'bg-white text-pink-800 border-pink-200 hover:bg-pink-100'
                          }`}
                          title={email}
                        >
                          <span className="truncate max-w-[110px]">
                            {u.displayName || email.split('@')[0]}
                          </span>
                          <span className="text-[9px] opacity-75">
                            {u.role === 'teacher' ? '👩‍🏫' : '🎓'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[10px] text-pink-600">No other users signed in yet.</p>
                )
              ) : visiblePeers.length > 0 ? (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                  {visiblePeers.map((c) => {
                    const active = selectedPeerEmail === c.email;
                    return (
                      <button
                        key={c.email}
                        type="button"
                        onClick={() => setSelectedPeerEmail(c.email)}
                        className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border shrink-0 flex items-center gap-1.5 transition-colors ${
                          active
                            ? 'bg-fuchsia-600 text-white border-fuchsia-600 shadow-2xs'
                            : 'bg-white text-pink-900 border-pink-200 hover:bg-pink-100'
                        }`}
                        title={`${c.email}: ${c.lastPreview}`}
                      >
                        <span className="truncate max-w-[110px]">{c.name}</span>
                        {c.unreadCount > 0 && (
                          <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-pink-950 font-mono text-[9px] font-black">
                            {c.unreadCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[10px] text-pink-600">
                  {creatorTab === 'needs_reply'
                    ? 'Every user message has been replied to!'
                    : 'No conversations yet — tap "All Users" or + to message someone first.'}
                </p>
              )}
            </div>
          )}

          {/* Chat Timeline */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 bg-gradient-to-b from-pink-50/50 to-white min-h-[240px]">
            {isCreator && !selectedPeerEmail ? (
              <div className="py-10 text-center space-y-2 px-3">
                <div className="w-12 h-12 mx-auto rounded-full bg-pink-100 flex items-center justify-center text-pink-500">
                  <Inbox className="w-6 h-6" />
                </div>
                <p className="text-xs font-extrabold text-pink-950">
                  Maker Chat Inbox ({CREATOR_ADMIN_EMAIL})
                </p>
                <p className="text-[11px] text-pink-600 leading-relaxed">
                  Messages from students and teachers appear right here in real time. Tap &quot;All Users&quot; or the + icon above to start chatting with any user!
                </p>
              </div>
            ) : activeBubbles.length === 0 ? (
              <div className="py-10 text-center space-y-2 px-3">
                <div className="w-12 h-12 mx-auto rounded-full bg-pink-100 flex items-center justify-center text-pink-500">
                  <Sparkles className="w-6 h-6" />
                </div>
                <p className="text-xs font-extrabold text-pink-950">
                  {isCreator
                    ? `Start chatting with ${selectedPeerProfile?.name || selectedPeerEmail}`
                    : `Say hi to ${CREATOR_ADMIN_EMAIL}!`}
                </p>
                <p className="text-[11px] text-pink-600 leading-relaxed">
                  {isCreator
                    ? `Type below to send a direct message to ${selectedPeerEmail}. They will receive it right away!`
                    : `Anything you send here goes straight to the app maker (${CREATOR_ADMIN_EMAIL}), and their replies appear live right here.`}
                </p>
              </div>
            ) : (
              activeBubbles.map((b) => {
                const isMine = isCreator ? b.isCreator : !b.isCreator;
                return (
                  <div
                    key={b.id}
                    className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3 py-2 shadow-2xs space-y-1 ${
                        isMine
                          ? 'bg-gradient-to-br from-pink-500 to-rose-500 text-white rounded-br-sm'
                          : 'bg-white border border-pink-200 text-pink-950 rounded-bl-sm'
                      }`}
                    >
                      <div
                        className={`flex items-center gap-1.5 text-[9.5px] font-black ${
                          isMine ? 'text-pink-100' : 'text-fuchsia-700'
                        }`}
                      >
                        <UserIcon className="w-2.5 h-2.5 shrink-0" />
                        <span className="truncate">
                          {b.isCreator
                            ? `App Maker (${CREATOR_ADMIN_EMAIL})`
                            : `${b.senderName} (${b.senderEmail})`}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed whitespace-pre-wrap break-words">
                        {b.text}
                      </p>
                      <div
                        className={`text-[9px] text-right ${
                          isMine ? 'text-pink-100/90' : 'text-pink-400'
                        }`}
                      >
                        {formatMsgTime(b.createdAtMs)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={listEndRef} />
          </div>

          {/* Bottom Composer */}
          <form onSubmit={handleSend} className="p-3 bg-white border-t border-pink-200 space-y-2 shrink-0">
            {!isCreator && activeThreads.length === 0 && (
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
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{sentNotice} 💖</span>
              </p>
            )}

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={isCreator && !selectedPeerEmail}
                maxLength={1000}
                placeholder={
                  isCreator
                    ? selectedPeerEmail
                      ? `Reply to ${selectedPeerProfile?.name || selectedPeerEmail}...`
                      : 'Select a user above to start chatting...'
                    : `Message ${CREATOR_ADMIN_EMAIL}...`
                }
                className="flex-1 text-xs px-3 py-2 bg-pink-50/60 border border-pink-200 rounded-xl text-pink-950 placeholder:text-pink-400 focus:outline-none focus:ring-1 focus:ring-pink-400 disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={isSending || !text.trim() || (isCreator && !selectedPeerEmail)}
                className="p-2.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 disabled:opacity-50 text-white rounded-xl shadow-xs transition-transform active:scale-95"
                title={
                  isCreator
                    ? `Send message to ${selectedPeerEmail || 'selected user'}`
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
