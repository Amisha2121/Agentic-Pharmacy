import { useState, useCallback } from 'react';
import { useOutletContext } from 'react-router';
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
    setActiveMessages(messages);
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

    try {
      await authenticatedFetch(`/api/sessions/${threadId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, title: autoTitle }),
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