import { useState, useEffect, useRef } from 'react';
import { Plus, Mic, ArrowUp, Paperclip, Menu, History, Bot, User, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MessageBubble, TypingIndicator } from './MessageBubble';
import { useAuth } from '../context/AuthContext';
import { authenticatedFetch } from '../utils/api';

interface Message {
  id: string;
  type: 'user' | 'system';
  icon: React.ReactNode;
  iconColor: string;
  content: string;
  warning?: string;
  timestamp?: string;
}

interface BarcodeResult {
  found: boolean;
  barcode_type?: string;
  batch_number?: string;
  expiry_date?: string;
  gtin?: string;
  quantity?: number;
  path: string;
  filename: string;
}

interface ChatAreaProps {
  selectedChat: string | null;
  isSidebarClosed: boolean;
  isHistoryClosed: boolean;
  onOpenSidebar: () => void;
  onOpenHistory: () => void;
  threadId: string;
  onNewMessage: (messages: Message[]) => void;
  initialMessages: Message[];
  onNewChat: () => void;
}

export function BoldChatArea({
  isSidebarClosed,
  isHistoryClosed,
  onOpenSidebar,
  onOpenHistory,
  threadId,
  onNewMessage,
  initialMessages,
  onNewChat,
}: ChatAreaProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [hitlPending, setHitlPending] = useState<Record<string, unknown> | null>(null);
  const [attachedImage, setAttachedImage] = useState<{ path: string; name: string } | null>(null);
  const [barcodeResult, setBarcodeResult] = useState<BarcodeResult | null>(null);
  const [uploading, setUploading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startListening = () => {
    // @ts-expect-error Web Speech API vendor prefixes
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Microphone access is not supported in this browser.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setMessage((prev) => (prev ? prev + ' ' : '') + transcript);
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    
    recognition.start();
  };

  useEffect(() => {
    setMessages(initialMessages);
    setHitlPending(null);
    setAttachedImage(null);
    setBarcodeResult(null);
  }, [threadId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const appendMessage = (msg: Message) => {
    setMessages((prev) => {
      const next = [...prev, msg];
      onNewMessage(next);
      return next;
    });
  };

  const handleImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setScanning(true);
    setBarcodeResult(null);
    setAttachedImage(null);

    try {
      const scanFormData = new FormData();
      scanFormData.append('file', file);
      const scanRes = await authenticatedFetch('/api/scan-barcode', { method: 'POST', body: scanFormData });
      const scanData: BarcodeResult = await scanRes.json();
      setBarcodeResult(scanData);
      setAttachedImage({ path: scanData.path, name: file.name });
    } catch {
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await authenticatedFetch('/api/upload-image', { method: 'POST', body: formData });
        const data = await res.json();
        setAttachedImage({ path: data.path, name: file.name });
      } catch {
        appendMessage({ id: Date.now().toString(), type: 'system', icon: <XCircle className="w-5 h-5" />, iconColor: '#ef4444', content: 'Image upload failed. Try again.' });
      }
    } finally {
      setUploading(false);
      setScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSend = async () => {
    const text = message.trim();
    if ((!text && !attachedImage) || isLoading) return;
    setMessage('');

    const imagePaths = attachedImage ? [attachedImage.path] : [];
    const userContent = text || (attachedImage ? `File attached: ${attachedImage.name}` : '');
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    appendMessage({ id: Date.now().toString(), type: 'user', icon: <User className="w-5 h-5" />, iconColor: '#16a34a', content: userContent, timestamp: now });
    setAttachedImage(null);
    setBarcodeResult(null);
    setIsLoading(true);

    try {
      const res = await authenticatedFetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thread_id: threadId, message: text || 'Scan this image and identify the product.', image_paths: imagePaths }),
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = JSON.parse(line.slice(6));
          if (payload.type === 'done') {
            const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            appendMessage({ id: Date.now().toString(), type: 'system', icon: <Bot className="w-5 h-5" />, iconColor: '#16a34a', content: payload.content, timestamp: ts });
          } else if (payload.type === 'hitl') {
            setHitlPending(payload.product as Record<string, unknown>);
            const ts2 = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            appendMessage({ id: Date.now().toString(), type: 'system', icon: <AlertCircle className="w-5 h-5" />, iconColor: '#ef4444', content: `HITL Checkpoint: expired medication detected — **${payload.product?.name ?? '?'}**. Please approve or reject below.`, timestamp: ts2 });
          } else if (payload.type === 'error') {
            const ts3 = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            appendMessage({ id: Date.now().toString(), type: 'system', icon: <XCircle className="w-5 h-5" />, iconColor: '#ef4444', content: `Error: ${payload.content}`, timestamp: ts3 });
          }
        }
      }
    } catch (err) {
      appendMessage({ id: Date.now().toString(), type: 'system', icon: <XCircle className="w-5 h-5" />, iconColor: '#ef4444', content: `Network error: ${err}` });
    } finally {
      setIsLoading(false);
    }
  };

  const handleHitl = async (decision: 'approve' | 'reject') => {
    setHitlPending(null);
    setIsLoading(true);
    try {
      const res = await authenticatedFetch('/api/chat/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thread_id: threadId, decision }),
      });
      const data = await res.json();
      const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      appendMessage({ id: Date.now().toString(), type: 'system', icon: <CheckCircle className="w-5 h-5" />, iconColor: '#16a34a', content: data.content ?? 'Done.', timestamp: ts });
    } catch (err) {
      appendMessage({ id: Date.now().toString(), type: 'system', icon: <XCircle className="w-5 h-5" />, iconColor: '#ef4444', content: `Resume error: ${err}` });
    } finally {
      setIsLoading(false);
    }
  };

  const quickActions = [
    { label: 'Add New Stock', sub: 'Log medicine to inventory', path: '/sales', prompt: 'I want to add new stock to the inventory' },
    { label: 'Drug Interaction', sub: 'Check safety between drugs', path: null, prompt: 'Check drug interaction between:' },
    { label: 'View Inventory', sub: "See what's in stock", path: '/inventory', prompt: 'Show me the current inventory' },
    { label: 'Scan a Label', sub: 'Upload a medicine photo', path: null, prompt: null },
    { label: 'Low Stock Check', sub: 'What needs reordering?', path: '/reorder', prompt: 'Show me all low stock items' },
    { label: 'Expiry Report', sub: 'Items expiring soon', path: '/expired', prompt: 'Show me medicines expiring soon' },
  ];

  return (
    <div className="flex-1 flex flex-col h-screen w-full relative z-10 bg-[#F8FAFC] overflow-hidden">
      {/* Top bar with menu buttons */}
      <div className="flex items-center justify-between p-4 bg-transparent absolute top-0 w-full z-20">
        <div className="flex items-center">
          {isSidebarClosed && (
            <button 
              onClick={onOpenSidebar} 
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white border-2 border-[#0F172A] text-[#0F172A] hover:bg-[#F0FDF4] transition-all"
            >
              <Menu className="w-5 h-5" strokeWidth={2.5} />
            </button>
          )}
        </div>
        <div className="flex items-center">
          {isHistoryClosed && (
            <button 
              onClick={onOpenHistory} 
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white border-2 border-[#0F172A] text-[#0F172A] hover:bg-[#F0FDF4] transition-all"
            >
              <History className="w-5 h-5" strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col pt-20 px-8 pb-6 max-w-7xl mx-auto w-full overflow-y-auto" style={{ 
        scrollbarWidth: 'thin',
        scrollbarColor: '#CBD5E1 transparent'
      }}>
        {messages.length === 0 && !isLoading && !hitlPending ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-[14px] text-[#64748B] font-medium text-center">
              Select a conversation or start a new one
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto mb-4 px-4 space-y-8 min-h-0 scroll-smooth">
            {messages.map((msg) => (
              <MessageBubble 
                key={msg.id} 
                type={msg.type} 
                icon={msg.icon} 
                iconColor={msg.iconColor} 
                content={msg.content} 
                warning={msg.warning} 
                timestamp={msg.timestamp} 
              />
            ))}
            {isLoading && <TypingIndicator />}
            {hitlPending && (
              <div className="flex gap-3 justify-center">
                <button 
                  onClick={() => handleHitl('approve')} 
                  className="bg-[#16a34a] hover:bg-[#15803d] text-white px-6 py-3 font-black uppercase text-sm tracking-wide transition-all"
                  style={{ borderRadius: '999px' }}
                >
                  Approve
                </button>
                <button 
                  onClick={() => handleHitl('reject')} 
                  className="bg-[#0F172A] hover:bg-[#1e293b] text-white px-6 py-3 font-black uppercase text-sm tracking-wide transition-all"
                  style={{ borderRadius: '999px' }}
                >
                  Reject
                </button>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleImagePick} />

        {/* Input Bar - Always Visible */}
        <div className="relative group mx-4 shrink-0 mt-auto">
          <div 
            className="relative bg-white p-4 flex items-center gap-3 border-2 border-[#0F172A] focus-within:shadow-[0_0_0_3px_#DCFCE7] transition-all"
            style={{ 
              height: '56px',
              borderRadius: '999px'
            }}
          >
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-10 h-10 rounded-full flex items-center justify-center text-[#94A3B8] hover:text-[#0F172A] transition-colors"
            >
              <Plus className="w-5 h-5" strokeWidth={2.5} />
            </button>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask anything — inventory, drug interactions, expiry dates..."
              className="flex-1 bg-transparent px-4 outline-none text-[#0F172A] placeholder:text-[#94A3B8] font-medium text-[14px]"
              disabled={isLoading}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-10 h-10 rounded-full flex items-center justify-center text-[#94A3B8] hover:text-[#0F172A] transition-colors"
            >
              <Paperclip className="w-5 h-5" strokeWidth={2.5} />
            </button>
            <button
              onClick={isListening ? undefined : startListening}
              className="w-10 h-10 rounded-full flex items-center justify-center text-[#94A3B8] hover:text-[#0F172A] transition-colors"
            >
              <Mic className="w-5 h-5" strokeWidth={2.5} />
            </button>
            <button
              onClick={handleSend}
              disabled={isLoading || scanning || (!message.trim() && !attachedImage)}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
                (message.trim() || attachedImage) && !isLoading && !scanning
                  ? 'bg-[#16a34a] hover:bg-[#15803d] text-white'
                  : 'bg-[#E2E8F0] text-[#94A3B8] cursor-not-allowed'
              }`}
              style={{ 
                borderRadius: '999px',
                opacity: (message.trim() || attachedImage) && !isLoading && !scanning ? 1 : 0.4
              }}
            >
              <ArrowUp className="w-5 h-5" strokeWidth={3} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
