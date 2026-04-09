import { useState, useEffect, useRef } from 'react';
import { Plus, Mic, ArrowUp, Paperclip, Menu, History, X, ImageIcon, ScanLine } from 'lucide-react';
import { MessageBubble } from './MessageBubble';
import { useAuth } from '../context/AuthContext';

interface Message {
  id: string;
  type: 'user' | 'system';
  icon: string;
  iconColor: string;
  content: string;
  warning?: string;
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
}

export function ChatArea({
  isSidebarClosed,
  isHistoryClosed,
  onOpenSidebar,
  onOpenHistory,
  threadId,
  onNewMessage,
  initialMessages,
}: ChatAreaProps) {
  const { user } = useAuth();
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
      // Scan barcode instantly (also saves the file server-side via /api/scan-barcode)
      const scanFormData = new FormData();
      scanFormData.append('file', file);
      const scanRes = await fetch('/api/scan-barcode', { method: 'POST', body: scanFormData });
      const scanData: BarcodeResult = await scanRes.json();
      setBarcodeResult(scanData);
      setAttachedImage({ path: scanData.path, name: file.name });
    } catch {
      // Fallback: plain upload without barcode scan
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/upload-image', { method: 'POST', body: formData });
        const data = await res.json();
        setAttachedImage({ path: data.path, name: file.name });
      } catch {
        appendMessage({ id: Date.now().toString(), type: 'system', icon: '❌', iconColor: '#ef4444', content: 'Image upload failed. Try again.' });
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
    const userContent = text || (attachedImage ? `📷 Image uploaded: ${attachedImage.name}` : '');
    appendMessage({ id: Date.now().toString(), type: 'user', icon: '🎯', iconColor: '#1E4A4C', content: userContent });
    setAttachedImage(null);
    setBarcodeResult(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
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
            appendMessage({ id: Date.now().toString(), type: 'system', icon: '🤖', iconColor: '#2B5B5C', content: payload.content });
          } else if (payload.type === 'hitl') {
            setHitlPending(payload.product as Record<string, unknown>);
            appendMessage({ id: Date.now().toString(), type: 'system', icon: '⚠️', iconColor: '#ef4444', content: `HITL Checkpoint: expired medication detected — **${payload.product?.name ?? '?'}**. Please approve or reject below.` });
          } else if (payload.type === 'error') {
            appendMessage({ id: Date.now().toString(), type: 'system', icon: '❌', iconColor: '#ef4444', content: `Error: ${payload.content}` });
          }
        }
      }
    } catch (err) {
      appendMessage({ id: Date.now().toString(), type: 'system', icon: '❌', iconColor: '#ef4444', content: `Network error: ${err}` });
    } finally {
      setIsLoading(false);
    }
  };

  const handleHitl = async (decision: 'approve' | 'reject') => {
    setHitlPending(null);
    setIsLoading(true);
    try {
      const res = await fetch('/api/chat/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thread_id: threadId, decision }),
      });
      const data = await res.json();
      appendMessage({ id: Date.now().toString(), type: 'system', icon: '✅', iconColor: '#2B5B5C', content: data.content ?? 'Done.' });
    } catch (err) {
      appendMessage({ id: Date.now().toString(), type: 'system', icon: '❌', iconColor: '#ef4444', content: `Resume error: ${err}` });
    } finally {
      setIsLoading(false);
    }
  };

  const renderBarcodeDetails = () => {
    if (scanning) {
      return (
        <div className="flex items-center gap-2 text-xs text-amber-600 font-medium animate-pulse">
          <ScanLine className="w-3.5 h-3.5" />
          <span>Scanning for barcodes…</span>
        </div>
      );
    }
    if (!barcodeResult) return null;
    if (barcodeResult.found) {
      return (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
            <ScanLine className="w-3 h-3" />
            {barcodeResult.barcode_type ?? 'Barcode'} ✅
          </span>
          {barcodeResult.batch_number && (
            <span className="text-xs text-gray-600">Batch: <strong className="text-gray-800">{barcodeResult.batch_number}</strong></span>
          )}
          {barcodeResult.expiry_date && (
            <span className="text-xs text-gray-600">Exp: <strong className="text-gray-800">{barcodeResult.expiry_date}</strong></span>
          )}
          {barcodeResult.gtin && (
            <span className="text-xs text-gray-500">GTIN: {barcodeResult.gtin}</span>
          )}
        </div>
      );
    }
    return (
      <span className="text-xs text-gray-400 italic">No barcode found — AI will read label visually</span>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full w-full relative z-10">
      <div className="flex items-center justify-between p-4 bg-transparent absolute top-0 w-full z-20">
        <div className="flex items-center">
          {isSidebarClosed && (
            <button onClick={onOpenSidebar} className="w-12 h-12 bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-white/50 flex items-center justify-center text-[#1E4A4C] hover:bg-white hover:shadow-md transition-all duration-300 group">
              <Menu className="w-6 h-6 group-hover:scale-110 transition-transform" />
            </button>
          )}
        </div>
        <div className="flex items-center">
          {isHistoryClosed && (
            <button onClick={onOpenHistory} className="w-12 h-12 bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-white/50 flex items-center justify-center text-[#1E4A4C] hover:bg-white hover:shadow-md transition-all duration-300 group">
              <History className="w-6 h-6 group-hover:scale-110 transition-transform" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col pt-20 px-4 sm:px-8 pb-6 max-w-5xl mx-auto w-full min-h-0">
        {messages.length === 0 && !isLoading && !hitlPending ? (
          <div className="flex-1 flex flex-col items-center justify-center animate-in fade-in slide-in-from-bottom-5 duration-700 pb-16">
            <h1 className="text-4xl sm:text-[42px] font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#1E4A4C] to-[#40aab0] mb-3 tracking-tight">
              ✨ Hi {user?.name || 'Pharmacist'}
            </h1>
            <h2 className="text-3xl sm:text-[38px] font-medium text-gray-700 tracking-tight text-center">
              Where should we start?
            </h2>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto mb-4 px-4 space-y-8 min-h-0 scroll-smooth [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:transparent [&::-webkit-scrollbar-thumb]:bg-[#1E4A4C]/20 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-[#1E4A4C]/40">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} type={msg.type} icon={msg.icon} iconColor={msg.iconColor} content={msg.content} warning={msg.warning} />
          ))}
          {isLoading && (
            <MessageBubble type="system" icon="🤖" iconColor="#2B5B5C" content="Thinking…" />
          )}
          {hitlPending && (
            <div className="flex gap-3 justify-center">
              <button onClick={() => handleHitl('approve')} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-semibold transition-all hover:scale-105 shadow">
                ✅ Approve — Move to Quarantine
              </button>
              <button onClick={() => handleHitl('reject')} className="bg-rose-600 hover:bg-rose-700 text-white px-6 py-3 rounded-xl font-semibold transition-all hover:scale-105 shadow">
                ❌ Reject — Discard
              </button>
            </div>
          )}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Attached image preview with live barcode details */}
        {(attachedImage || scanning) && (
          <div className="mx-4 mb-3 flex flex-col gap-2 bg-[#1E4A4C]/5 border border-[#1E4A4C]/15 rounded-2xl px-4 py-3">
            <div className="flex items-center gap-3">
              <ImageIcon className="w-5 h-5 text-[#1E4A4C] shrink-0" />
              <span className="text-sm font-medium text-[#1E4A4C] flex-1 truncate">
                {attachedImage?.name ?? 'Scanning…'}
              </span>
              {attachedImage && (
                <button onClick={() => { setAttachedImage(null); setBarcodeResult(null); }} className="text-gray-400 hover:text-rose-500 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="pl-8">
              {renderBarcodeDetails()}
            </div>
          </div>
        )}

        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImagePick} />

        <div className={`relative group mx-4 shrink-0 ${messages.length > 0 ? "mt-auto" : "max-w-3xl mx-auto w-full"}`}>
          <div className="absolute -inset-1 bg-gradient-to-r from-[#1E4A4C] to-[#2B5B5C] rounded-[2rem] blur-md opacity-20 group-hover:opacity-30 transition duration-500"></div>
          <div className="relative bg-white/95 backdrop-blur-2xl rounded-[2rem] shadow-xl p-3 flex items-center gap-3 border border-white/80">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-12 h-12 rounded-2xl bg-[#C5D3D3]/40 hover:bg-[#1E4A4C] text-[#1E4A4C] hover:text-white flex items-center justify-center transition-all duration-300 transform hover:scale-105 shrink-0"
              title="Attach File"
            >
              <Plus className="w-6 h-6" />
            </button>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={attachedImage ? 'Describe the image or press send to scan…' : 'Type your message, attach labels or ask a question...'}
              className="flex-1 bg-transparent px-3 py-3 outline-none text-gray-800 placeholder:text-gray-400 font-medium text-[15px]"
              disabled={isLoading}
            />
            <div className="flex items-center gap-2 pr-1 shrink-0">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || scanning}
                className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-colors ${
                  scanning
                    ? 'bg-amber-100 text-amber-500 animate-pulse'
                    : attachedImage
                    ? 'bg-[#1E4A4C]/10 text-[#1E4A4C]'
                    : 'hover:bg-[#C5D3D3]/50 text-gray-500 hover:text-[#1E4A4C]'
                } ${uploading ? 'animate-pulse' : ''}`}
                title={scanning ? 'Scanning barcode…' : 'Attach image for scanning'}
              >
                {scanning ? <ScanLine className="w-5 h-5" /> : <Paperclip className="w-5 h-5" />}
              </button>
              <button
                onClick={isListening ? undefined : startListening}
                title="Voice Input"
                className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-colors ${
                  isListening ? 'bg-rose-100 text-rose-500 animate-pulse' : 'hover:bg-[#C5D3D3]/50 text-gray-500 hover:text-[#1E4A4C]'
                }`}
              >
                <Mic className="w-5 h-5" />
              </button>
              <button
                onClick={handleSend}
                disabled={isLoading || scanning || (!message.trim() && !attachedImage)}
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 transform ${
                  (message.trim() || attachedImage) && !isLoading && !scanning
                    ? 'bg-gradient-to-r from-[#1E4A4C] to-[#2B5B5C] hover:scale-105 text-white shadow-lg shadow-[#1E4A4C]/30'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                <ArrowUp className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}