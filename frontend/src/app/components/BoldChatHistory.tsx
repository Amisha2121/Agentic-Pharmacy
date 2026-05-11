import { useState, useEffect } from 'react';
import { Plus, MoreVertical, X } from 'lucide-react';
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

export function BoldChatHistory({ isOpen, onToggle, onSelectChat, onNewChat, currentThreadId, onDeleteChat, refreshKey }: ChatHistoryProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

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

  // Group sessions by date
  const groupedSessions = sessions.reduce((acc, session) => {
    const date = new Date(session.updated_at);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let label = '';
    if (date.toDateString() === today.toDateString()) {
      label = 'TODAY';
    } else if (date.toDateString() === yesterday.toDateString()) {
      label = 'YESTERDAY';
    } else {
      label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
    }

    if (!acc[label]) acc[label] = [];
    acc[label].push(session);
    return acc;
  }, {} as Record<string, Session[]>);

  return (
    <div className={`bg-white border-l border-[#E2E8F0] flex flex-col transition-all duration-300 ease-in-out z-40 absolute right-0 h-full md:relative ${isOpen ? 'w-[280px] translate-x-0 shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.1)] md:shadow-none' : 'w-0 translate-x-full overflow-hidden opacity-0'}`}>
      <div className="w-[280px] flex flex-col h-full">
        {/* Header */}
        <div className="p-6 flex items-center justify-between border-b border-[#E2E8F0]">
          <h3 
            className="text-[14px] font-black uppercase tracking-widest text-[#0F172A]"
            style={{ letterSpacing: '0.1em' }}
          >
            HISTORY
          </h3>
          <button onClick={onToggle} className="md:hidden text-[#64748B] hover:text-[#0F172A]">
            <X className="w-5 h-5" strokeWidth={2.5} />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-4">
          <button 
            onClick={onNewChat} 
            className="w-full bg-[#16a34a] hover:bg-[#15803d] text-white font-black uppercase text-[13px] tracking-wider py-3 transition-all flex items-center justify-center gap-2"
            style={{ 
              borderRadius: '999px',
              height: '40px'
            }}
          >
            <Plus className="w-5 h-5" strokeWidth={3} />
            NEW CHAT
          </button>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-6" style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#CBD5E1 transparent'
        }}>
          {Object.keys(groupedSessions).length === 0 && (
            <p className="text-xs text-[#64748B] text-center pt-4">No previous chats yet.</p>
          )}
          {Object.entries(groupedSessions).map(([label, groupSessions]) => (
            <div key={label}>
              <div className="mb-3">
                <span 
                  className="text-[10px] font-black uppercase tracking-widest text-[#0F172A]"
                  style={{ letterSpacing: '0.1em' }}
                >
                  {label}
                </span>
              </div>
              <div className="space-y-2">
                {groupSessions.map((session) => {
                  const isCurrent = session.thread_id === currentThreadId;
                  const title = (session.title ?? '').slice(0, 35) + ((session.title?.length ?? 0) > 35 ? '…' : '');
                  return (
                    <div
                      key={session.thread_id}
                      className={`relative px-4 py-3 cursor-pointer transition-all ${
                        isCurrent 
                          ? 'bg-[#F0FDF4] border-l-[3px] border-l-[#16a34a]' 
                          : 'hover:bg-[#F0FDF4]'
                      }`}
                      onClick={() => handleSelect(session.thread_id)}
                      onMouseEnter={() => setHoveredId(session.thread_id)}
                      onMouseLeave={() => setHoveredId(null)}
                      style={{ borderRadius: '8px' }}
                    >
                      <h4 className="text-[13px] font-semibold text-[#0F172A] truncate pr-6">
                        {title || 'Untitled'}
                      </h4>
                      {(hoveredId === session.thread_id || isCurrent) && (
                        <button
                          className="absolute top-3 right-3 w-6 h-6 rounded-full hover:bg-[#DCFCE7] flex items-center justify-center text-[#64748B] hover:text-[#0F172A] transition-all"
                          onClick={(e) => handleDelete(e, session.thread_id)}
                        >
                          <MoreVertical className="w-4 h-4" strokeWidth={2.5} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
