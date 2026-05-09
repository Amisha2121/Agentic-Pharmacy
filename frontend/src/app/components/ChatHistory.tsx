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
    <div className={`bg-white border-l border-[#E5E7EB] flex flex-col shadow-[-10px_0_30px_rgba(0,0,0,0.1)] transition-all duration-300 ease-in-out ${isOpen ? 'w-80 translate-x-0' : 'w-0 translate-x-full overflow-hidden opacity-0'}`}>
      <div className="w-80 flex flex-col h-full">
        <div className="p-6 flex items-center justify-between border-b border-[#E5E7EB]">
          <h3 className="text-[13px] font-medium text-[#6B7280] tracking-[0.8px] uppercase flex items-center gap-2" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
            <MessageSquare className="w-4 h-4" />
            History
          </h3>
          <button onClick={onToggle} className="p-2 hover:bg-[#F3F4F6] rounded-lg transition-all duration-300 text-[#6B7280] hover:text-[#111827]">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <button onClick={onNewChat} className="w-full bg-[#22C55E] hover:bg-[#16A34A] text-white rounded-xl px-6 py-3.5 font-medium transition-all duration-300 flex items-center justify-center gap-2 hover:scale-[1.02]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
            <Plus className="w-5 h-5" />
            New Chat
          </button>

          <div className="space-y-2">
            {sessions.length === 0 && (
              <p className="text-xs text-[#9CA3AF] text-center pt-4" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>No previous chats yet.</p>
            )}
            {sessions.map((session) => {
              const isCurrent = session.thread_id === currentThreadId;
              const title = (session.title ?? '').slice(0, 40) + ((session.title?.length ?? 0) > 40 ? '…' : '');
              return (
                <div
                  key={session.thread_id}
                  className={`rounded-xl border p-4 hover:bg-[#F9FAFB] transition-all cursor-pointer group relative ${isCurrent ? 'bg-[#ECFDF5] border-[#22C55E]' : 'bg-white border-[#E5E7EB]'}`}
                  onClick={() => handleSelect(session.thread_id)}
                >
                  <button
                    className="absolute top-3 right-3 w-7 h-7 rounded-lg hover:bg-[#FEE2E2] hover:text-[#EF4444] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all text-[#9CA3AF]"
                    onClick={(e) => handleDelete(e, session.thread_id)}
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <h4 className="text-[#111827] font-medium mb-1 pr-8 truncate text-sm" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>{title || 'Untitled'}</h4>
                  <p className="text-xs font-normal text-[#6B7280]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>{session.updated_at?.slice(0, 10) ?? ''}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}