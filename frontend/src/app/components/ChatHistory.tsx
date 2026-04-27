import { useState, useEffect } from 'react';
import { X, ChevronRight, Plus, MessageSquare } from 'lucide-react';
import { authenticatedFetch } from '../utils/api';

interface Session {
  thread_id: string;
  title: string;
  updated_at: string;
}

interface ChatHistoryProps {
  isOpen: boolean;
  onToggle: () => void;
  onSelectChat: (threadId: string, messages: unknown[]) => void;
  onNewChat: () => void;
  currentThreadId: string;
  onDeleteChat: (threadId: string) => void;
  refreshKey?: number;
}

export function ChatHistory({ isOpen, onToggle, onSelectChat, onNewChat, currentThreadId, onDeleteChat, refreshKey }: ChatHistoryProps) {
  const [sessions, setSessions] = useState<Session[]>([]);

  const fetchSessions = async () => {
    try {
      const res = await authenticatedFetch('/api/sessions');
      const data = await res.json();
      setSessions(data.sessions ?? []);
    } catch { /* ignore in mock mode */ }
  };

  useEffect(() => { fetchSessions(); }, [currentThreadId, refreshKey]);

  const handleSelect = async (threadId: string) => {
    if (threadId === currentThreadId) return;
    try {
      const res = await authenticatedFetch(`/api/sessions/${threadId}/messages`);
      const data = await res.json();
      onSelectChat(threadId, data.messages ?? []);
    } catch {
      onSelectChat(threadId, []);
    }
  };

  const handleDelete = async (e: React.MouseEvent, threadId: string) => {
    e.stopPropagation();
    try {
      await authenticatedFetch(`/api/sessions/${threadId}`, { method: 'DELETE' });
      onDeleteChat(threadId);
      setSessions((prev) => prev.filter((s) => s.thread_id !== threadId));
    } catch { /* ignore */ }
  };

  return (
    <div className={`bg-[#18181B] border-l border-[#27272A] flex flex-col shadow-[-10px_0_30px_rgba(0,0,0,0.3)] transition-all duration-300 ease-in-out ${isOpen ? 'w-80 translate-x-0' : 'w-0 translate-x-full overflow-hidden opacity-0'}`}>
      <div className="w-80 flex flex-col h-full">
        <div className="p-6 flex items-center justify-between border-b border-[#27272A]">
          <h3 className="text-[13px] font-medium text-[#A1A1AA] tracking-[0.8px] uppercase flex items-center gap-2" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
            <MessageSquare className="w-4 h-4" />
            History
          </h3>
          <button onClick={onToggle} className="p-2 hover:bg-[#27272A] rounded-lg transition-all duration-300 text-[#71717A] hover:text-[#F4F4F5]">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <button onClick={onNewChat} className="w-full bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-xl px-6 py-3.5 font-medium transition-all duration-300 flex items-center justify-center gap-2 hover:scale-[1.02]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
            <Plus className="w-5 h-5" />
            New Chat
          </button>

          <div className="space-y-2">
            {sessions.length === 0 && (
              <p className="text-xs text-[#52525B] text-center pt-4" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>No previous chats yet.</p>
            )}
            {sessions.map((session) => {
              const isCurrent = session.thread_id === currentThreadId;
              const title = (session.title ?? '').slice(0, 40) + ((session.title?.length ?? 0) > 40 ? '…' : '');
              return (
                <div
                  key={session.thread_id}
                  className={`rounded-xl border p-4 hover:bg-[#1F1F23] transition-all cursor-pointer group relative ${isCurrent ? 'bg-[#1F1F23] border-[#3B82F6]' : 'bg-[#111113] border-[#27272A]'}`}
                  onClick={() => handleSelect(session.thread_id)}
                >
                  <button
                    className="absolute top-3 right-3 w-7 h-7 rounded-lg hover:bg-[#1A0000] hover:text-[#EF4444] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all text-[#52525B]"
                    onClick={(e) => handleDelete(e, session.thread_id)}
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <h4 className="text-[#F4F4F5] font-medium mb-1 pr-8 truncate text-sm" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>{title || 'Untitled'}</h4>
                  <p className="text-xs font-normal text-[#71717A]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>{session.updated_at?.slice(0, 10) ?? ''}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}