import React, { useState, useEffect, useRef } from 'react';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  getAuth
} from 'firebase/auth';
import { db } from '../supabaseClient';
import { cuteSound } from '../utils/cuteSound';
import { 
  MessageCircleHeart, 
  Send, 
  X, 
  Sparkles, 
  Inbox,
  RefreshCw
} from 'lucide-react';

interface FeedbackChatBoxProps {
  currentUser: { email: string; name?: string };
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  creatorEmail: string;
}

interface ChatMessage {
  id: string;
  text: string;
  senderEmail: string;
  senderName?: string;
  isFromCreator: boolean;
  createdAt: Date;
  category: string;
}

const CATEGORY_OPTIONS = [
  { id: 'feedback', label: 'Feedback', emoji: '💬' },
  { id: 'question', label: 'Question', emoji: '❓' },
  { id: 'praise', label: 'Love It!', emoji: '❤️' },
  { id: 'bug', label: 'Issue', emoji: '⚠️' },
];

export default function FeedbackChatBox({ 
  currentUser, 
  isOpen = false, 
  onOpenChange,
  creatorEmail
}: FeedbackChatBoxProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('feedback');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!isOpen || !currentUser?.email) return;

    const q = query(
      collection(db, 'messages'),
      where('senderEmail', 'in', [currentUser.email, creatorEmail]),
      where('recipientEmail', 'in', [currentUser.email, creatorEmail]),
      orderBy('createdAt', 'asc')
    );

    unsubscribeRef.current = onSnapshot(q, (snapshot) => {
      const msgs: ChatMessage[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          text: data.text,
          senderEmail: data.senderEmail,
          senderName: data.senderName || '',
          isFromCreator: data.senderEmail === creatorEmail,
          createdAt: data.createdAt?.toDate() || new Date(),
          category: data.category || 'feedback'
        };
      });
      setMessages(msgs);
    });

    return () => {
      if (unsubscribeRef.current) unsubscribeRef.current();
    };
  }, [isOpen, currentUser?.email, creatorEmail]);

  const sendMessage = async () => {
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    try {
      await addDoc(collection(db, 'messages'), {
        text: newMessage.trim(),
        senderEmail: currentUser.email,
        senderName: currentUser.name || currentUser.email.split('@')[0],
        recipientEmail: creatorEmail,
        category: selectedCategory,
        createdAt: serverTimestamp()
      });
      
      setNewMessage('');
      cuteSound.play?.();
    } catch (err) {
      console.error('Error sending message:', err);
      alert('Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => onOpenChange?.(true)}
        className="fixed bottom-6 right-6 bg-pink-500 text-white p-4 rounded-full shadow-lg hover:bg-pink-600 transition-all"
      >
        <MessageCircleHeart size={24} />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-pink-100 flex flex-col overflow-hidden z-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-500 to-rose-400 text-white p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={18} />
          <h3 className="font-semibold">Send a Message</h3>
        </div>
        <button
          onClick={() => onOpenChange?.(false)}
          className="hover:bg-white/20 rounded-full p-1 transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Category selector */}
      <div className="px-3 py-2 border-b border-pink-50 flex flex-wrap gap-2">
        {CATEGORY_OPTIONS.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-2 py-1 rounded-full text-xs transition-colors ${
              selectedCategory === cat.id
                ? 'bg-pink-100 text-pink-700 font-medium'
                : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
            }`}
          >
            {cat.emoji} {cat.label}
          </button>
        ))}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[250px] max-h-[350px] bg-pink-50/30">
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            <Inbox size={36} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">No messages yet. Say hello! 👋</p>
          </div>
        ) : (
          messages.map(msg => (
            <div
              key={msg.id}
              className={`flex ${msg.isFromCreator ? 'justify-start' : 'justify-end'}`}
            >
              <div
                className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                  msg.isFromCreator
                    ? 'bg-white border border-pink-100 text-gray-700 rounded-tl-none'
                    : 'bg-pink-500 text-white rounded-tr-none'
                }`}
              >
                <p>{msg.text}</p>
                <p className={`text-xs mt-1 opacity-70 ${msg.isFromCreator ? 'text-gray-400' : 'text-pink-100'}`}>
                  {msg.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="p-3 border-t border-pink-50 bg-white">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type your message..."
            className="flex-1 px-3 py-2 border border-pink-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
            disabled={isSending}
          />
          <button
            onClick={sendMessage}
            disabled={isSending || !newMessage.trim()}
            className="bg-pink-500 text-white p-2 rounded-full hover:bg-pink-600 transition-colors disabled:opacity-50"
          >
            {isSending ? <RefreshCw size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
}
