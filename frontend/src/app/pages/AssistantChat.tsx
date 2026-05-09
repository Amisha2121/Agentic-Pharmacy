import { useState, useCallback } from 'react';
import { useOutletContext } from 'react-router';
import { Bot, User, AlertCircle, XCircle, CheckCircle } from 'lucide-react';
import { ChatArea } from '../components/ChatArea';
import { ChatHistory } from '../components/ChatHistory';
import { authenticatedFetch } from '../utils/api';

interface ContextType {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
}

function generateThreadId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// Firestore strips React elements to plain objects when messages are serialised.
// This reconstructs a valid icon + color from the stored type/role/content.
function rebuildIcon(msg: Record<string, unknown>): { icon: React.ReactNode; iconColor: string } {
  const storedColor = (msg.iconColor as string) || '#3B82F6';
  const type = String(msg.type ?? msg.role ?? 'system');
  if (type === 'user') return { icon: <User className="w-5 h-5" />, iconColor: storedColor };
  const content = String(msg.content ?? '');
  if (content.startsWith('Error:') || content.startsWith('Network error') || content.startsWith('⚠️'))
    return { icon: <XCircle className="w-5 h-5" />, iconColor: '#ef4444' };
  if (content.includes('HITL') || content.includes('expired medication'))
    return { icon: <AlertCircle className="w-5 h-5" />, iconColor: '#ef4444' };
  if (content.startsWith('✅'))
    return { icon: <CheckCircle className="w-5 h-5" />, iconColor: '#22C55E' };
  return { icon: <Bot className="w-5 h-5" />, iconColor: storedColor };
}

export function AssistantChat() {
  const [isHistoryOpen, setIsHistoryOpen] = useState(true);
  const [threadId, setThreadId] = useState(() => generateThreadId());
  const [activeMessages, setActiveMessages] = useState<unknown[]>([]);
  const [sessionRefreshKey, setSessionRefreshKey] = useState(0);
  const { isSidebarOpen, setIsSidebarOpen } = useOutletContext<ContextType>();

  const handleNewChat = useCallback(() => {
    setThreadId(generateThreadId());
    setActiveMessages([]);
  }, []);

  const handleSelectChat = useCallback((tid: string, messages: unknown[]) => {
    setThreadId(tid);
    // Firestore loses React elements — rebuild icons from stored type/role
    const repaired = (messages as Record<string, unknown>[]).map((msg, i) => ({
      id: String(msg.id ?? i),
      type: (String(msg.type ?? msg.role ?? 'system') === 'user' ? 'user' : 'system') as 'user' | 'system',
      content: String(msg.content ?? ''),
      warning: msg.warning as string | undefined,
      ...rebuildIcon(msg),
    }));
    setActiveMessages(repaired);
  }, []);

  const handleDeleteChat = useCallback((tid: string) => {
    if (tid === threadId) {
      setThreadId(generateThreadId());
      setActiveMessages([]);
    }
  }, [threadId]);

  const handleNewMessage = useCallback(async (messages: unknown[]) => {
    // Derive a title from the first user message so new chats are named automatically
    const firstUserMsg = (messages as { role?: string; type?: string; content?: string }[])
      .find((m) => m.role === 'user' || m.type === 'user');
    const autoTitle = firstUserMsg?.content?.trim().slice(0, 60) ?? '';

    // Strip non-serialisable React icon elements before saving to Firestore
    const serialisable = (messages as Record<string, unknown>[]).map(
      ({ icon: _icon, ...rest }) => rest
    );

    try {
      await authenticatedFetch(`/api/sessions/${threadId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: serialisable, title: autoTitle }),
      });
      // Trigger ChatHistory to re-fetch so the title appears immediately
      setSessionRefreshKey((k) => k + 1);
    } catch { /* ignore */ }
  }, [threadId]);

  return (
    <>
      <ChatArea
        selectedChat={threadId}
        isSidebarClosed={!isSidebarOpen}
        isHistoryClosed={!isHistoryOpen}
        onOpenSidebar={() => setIsSidebarOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        threadId={threadId}
        onNewMessage={handleNewMessage}
        initialMessages={activeMessages as never[]}
      />
      <ChatHistory
        isOpen={isHistoryOpen}
        onToggle={() => setIsHistoryOpen(!isHistoryOpen)}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        currentThreadId={threadId}
        onDeleteChat={handleDeleteChat}
        refreshKey={sessionRefreshKey}
      />
    </>
  );
}