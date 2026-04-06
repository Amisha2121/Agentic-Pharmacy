import { useState, useEffect } from 'react';
import { X, ChevronRight, Plus, MessageSquare } from 'lucide-react';

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
}

export function ChatHistory({ isOpen, onToggle, onSelectChat, onNewChat, currentThreadId, onDeleteChat }: ChatHistoryProps) {
  const [sessions, setSessions] = useState<Session[]>([]);

  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/sessions');
      const data = await res.json();
      setSessions(data.sessions ?? []);
    } catch { /* ignore in mock mode */ }
  };

  useEffect(() => { fetchSessions(); }, [currentThreadId]);

  const handleSelect = async (threadId: string) => {
    if (threadId === currentThreadId) return;
    try {
      const res = await fetch(`/api/sessions/${threadId}/messages`);
      const data = await res.json();
      onSelectChat(threadId, data.messages ?? []);
    } catch {
      onSelectChat(threadId, []);
    }
  };

  const handleDelete = async (e: React.MouseEvent, threadId: string) => {
    e.stopPropagation();
    try {
      await fetch(`/api/sessions/${threadId}`, { method: 'DELETE' });
      onDeleteChat(threadId);
      setSessions((prev) => prev.filter((s) => s.thread_id !== threadId));
    } catch { /* ignore */ }
  };

  return (
    <div className={`bg-white/40 backdrop-blur-xl border-l border-white/40 flex flex-col shadow-[-10px_0_30px_rgba(0,0,0,0.02)] transition-all duration-300 ease-in-out ${isOpen ? 'w-80 translate-x-0' : 'w-0 translate-x-full overflow-hidden opacity-0'}`}>
      <div className="w-80 flex flex-col h-full">
        <div className="p-6 flex items-center justify-between border-b border-white/40">
          <h3 className="text-sm font-bold text-[#1E4A4C] tracking-widest uppercase flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            History
          </h3>
          <button onClick={onToggle} className="p-2 hover:bg-white/60 rounded-xl transition-all duration-300 text-[#1E4A4C]">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <button onClick={onNewChat} className="w-full bg-gradient-to-r from-[#1E4A4C] to-[#2B5B5C] hover:from-[#2B5B5C] hover:to-[#1E4A4C] text-white rounded-2xl shadow-lg shadow-[#1E4A4C]/20 px-6 py-4 font-semibold transition-all duration-300 flex items-center justify-center gap-2 hover:scale-[1.02]">
            <Plus className="w-5 h-5" />
            New Chat
          </button>

          <div className="space-y-3">
            {sessions.length === 0 && (
              <p className="text-xs text-gray-400 text-center pt-4">No previous chats yet.</p>
            )}
            {sessions.map((session) => {
              const isCurrent = session.thread_id === currentThreadId;
              const title = (session.title ?? '').slice(0, 40) + ((session.title?.length ?? 0) > 40 ? '…' : '');
              return (
                <div
                  key={session.thread_id}
                  className={`rounded-2xl shadow-sm border p-4 hover:shadow-md transition-all cursor-pointer group relative ${isCurrent ? 'bg-[#1E4A4C]/10 border-[#1E4A4C]/30' : 'bg-white/80 border-white/60 hover:bg-white'}`}
                  onClick={() => handleSelect(session.thread_id)}
                >
                  <button
                    className="absolute top-3 right-3 w-7 h-7 rounded-xl hover:bg-red-50 hover:text-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all text-gray-400"
                    onClick={(e) => handleDelete(e, session.thread_id)}
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <h4 className="text-[#1E4A4C] font-semibold mb-1 pr-8 truncate">{title || 'Untitled'}</h4>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{session.updated_at?.slice(0, 10) ?? ''}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}