import { useState, useEffect, useRef } from 'react';
import { Plus, Mic, ArrowUp, Paperclip, Menu, History, X, ImageIcon, ScanLine, Bot, User, CheckCircle, AlertCircle, XCircle, Pill, PlusCircle, Search, ClipboardList, Camera, AlertTriangle, Clock } from 'lucide-react';
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
      const scanRes = await authenticatedFetch('/api/scan-barcode', { method: 'POST', body: scanFormData });
      const scanData: BarcodeResult = await scanRes.json();
      setBarcodeResult(scanData);
      setAttachedImage({ path: scanData.path, name: file.name });
    } catch {
      // Fallback: plain upload without barcode scan
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
    appendMessage({ id: Date.now().toString(), type: 'user', icon: <User className="w-5 h-5" />, iconColor: '#3B82F6', content: userContent, timestamp: now });
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
            appendMessage({ id: Date.now().toString(), type: 'system', icon: <Bot className="w-5 h-5" />, iconColor: '#3B82F6', content: payload.content, timestamp: ts });
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
      appendMessage({ id: Date.now().toString(), type: 'system', icon: <CheckCircle className="w-5 h-5" />, iconColor: '#22C55E', content: data.content ?? 'Done.', timestamp: ts });
    } catch (err) {
      appendMessage({ id: Date.now().toString(), type: 'system', icon: <XCircle className="w-5 h-5" />, iconColor: '#ef4444', content: `Resume error: ${err}` });
    } finally {
      setIsLoading(false);
    }
  };

  const renderBarcodeDetails = () => {
    if (scanning) {
      return (
        <div className="mt-2 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs text-[#22C55E] font-semibold animate-pulse tracking-wide uppercase" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
            <ScanLine className="w-4 h-4 animate-spin-slow" />
            <span>Analyzing Image & Scanning Barcodes...</span>
          </div>
          <div className="w-full h-1 bg-[#F3F4F6] rounded-full overflow-hidden relative">
            <div className="absolute top-0 left-0 h-full bg-[#22C55E] w-1/3 rounded-full animate-scanner-pan"></div>
          </div>
        </div>
      );
    }
    if (!barcodeResult) return null;
    
    if (barcodeResult.found) {
      return (
        <div className="mt-3 flex flex-col gap-3 p-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-[#22C55E] opacity-5 rounded-full blur-xl pointer-events-none" />
          
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-[#ECFDF5] flex items-center justify-center border border-[#A7F3D0]">
                <CheckCircle className="w-3.5 h-3.5 text-[#22C55E]" />
              </div>
              <span className="text-sm font-semibold text-[#16A34A]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                Barcode Detected
              </span>
            </div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#22C55E] bg-[#ECFDF5] px-2 py-0.5 rounded" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
              {barcodeResult.barcode_type ?? 'Format'}
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-2 mt-1 relative z-10">
            {barcodeResult.batch_number && (
              <div className="bg-white rounded border border-[#E5E7EB] p-2 flex flex-col">
                <span className="text-[10px] text-[#6B7280] uppercase font-semibold mb-0.5" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Batch Number</span>
                <span className="text-xs font-mono text-[#111827] truncate" title={barcodeResult.batch_number}>{barcodeResult.batch_number}</span>
              </div>
            )}
            {barcodeResult.expiry_date && (
              <div className="bg-white rounded border border-[#E5E7EB] p-2 flex flex-col">
                <span className="text-[10px] text-[#6B7280] uppercase font-semibold mb-0.5" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Expiry Date</span>
                <span className="text-xs font-semibold text-[#111827]">{barcodeResult.expiry_date}</span>
              </div>
            )}
            {barcodeResult.gtin && (
              <div className="bg-white rounded border border-[#E5E7EB] p-2 flex flex-col col-span-full">
                <span className="text-[10px] text-[#6B7280] uppercase font-semibold mb-0.5" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>GTIN</span>
                <span className="text-xs font-mono text-[#111827]">{barcodeResult.gtin}</span>
              </div>
            )}
          </div>
        </div>
      );
    }
    
    return (
      <div className="mt-3 flex items-start gap-2 p-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg">
        <AlertCircle className="w-4 h-4 text-[#6B7280] shrink-0 mt-0.5" />
        <div className="flex flex-col">
          <span className="text-xs font-medium text-[#111827]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>No Standard Barcode Found</span>
          <span className="text-[11px] text-[#6B7280] mt-0.5" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>The AI will extract details visually from the label text instead.</span>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full w-full relative z-10">
      <div className="flex items-center justify-between p-4 bg-transparent absolute top-0 w-full z-20">
        <div className="flex items-center">
          {isSidebarClosed && (
            <button onClick={onOpenSidebar} className="w-9 h-9 flex items-center justify-center rounded-lg bg-white border border-[#E5E7EB] text-[#6B7280] hover:text-[#111827] hover:bg-[#F9FAFB] transition-all">
              <Menu className="w-5 h-5" />
            </button>
          )}
        </div>
        <div className="flex items-center">
          {isHistoryClosed && (
            <button onClick={onOpenHistory} className="w-9 h-9 flex items-center justify-center rounded-lg bg-white border border-[#E5E7EB] text-[#6B7280] hover:text-[#111827] hover:bg-[#F9FAFB] transition-all">
              <History className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col pt-20 px-4 sm:px-8 pb-6 max-w-5xl mx-auto w-full min-h-0">
        {messages.length === 0 && !isLoading && !hitlPending ? (
          <div className="flex-1 flex flex-col items-center justify-center pb-10 select-none">

            {/* ── Animated glow orb ── */}
            <div className="relative mb-8" style={{ animation: 'floatOrb 4s ease-in-out infinite' }}>
              <div style={{
                width: 96, height: 96, borderRadius: '50%',
                background: 'radial-gradient(circle at 35% 35%, #86EFAC, #22C55E 50%, #16A34A)',
                boxShadow: '0 0 60px rgba(34,197,94,0.4), 0 0 120px rgba(34,197,94,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff',
              }}><Pill size={38} strokeWidth={1.5} /></div>
              {/* Orbiting ring */}
              <div style={{
                position: 'absolute', inset: -10, borderRadius: '50%',
                border: '1.5px solid rgba(34,197,94,0.3)',
                animation: 'spinRing 8s linear infinite',
              }} />
              <div style={{
                position: 'absolute', inset: -20, borderRadius: '50%',
                border: '1px solid rgba(34,197,94,0.12)',
                animation: 'spinRing 14s linear infinite reverse',
              }} />
            </div>

            {/* ── Greeting ── */}
            <h1 style={{
              fontFamily: 'DM Sans, sans-serif', fontSize: 'clamp(28px,4vw,42px)',
              fontWeight: 700, color: '#111827', letterSpacing: '-0.5px',
              margin: '0 0 8px', textAlign: 'center',
              animation: 'fadeUp 0.6s ease both',
            }}>
              What can I help you with?
            </h1>
            <p style={{
              fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 16,
              color: '#6B7280', margin: '0 0 36px', textAlign: 'center',
              animation: 'fadeUp 0.6s 0.1s ease both', opacity: 0,
              animationFillMode: 'forwards',
            }}>
              Your AI pharmacy assistant is ready
            </p>

            {/* ── Quick-action cards ── */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 12, width: '100%', maxWidth: 680,
            }}>
              {([
                { icon: <PlusCircle size={18} />, color: '#22C55E', bg: '#ECFDF5', label: 'Add new stock',    sub: 'Log medicine to inventory',    prompt: 'Add ' },
                { icon: <Search size={18} />,     color: '#8B5CF6', bg: '#F5F3FF', label: 'Drug interaction', sub: 'Check safety between drugs',    prompt: 'Can a patient take ' },
                { icon: <ClipboardList size={18} />, color: '#22C55E', bg: '#ECFDF5', label: 'View inventory',   sub: "See what's in stock",           prompt: 'Show me the current inventory' },
                { icon: <Camera size={18} />,     color: '#F59E0B', bg: '#FEF3C7', label: 'Scan a label',      sub: 'Upload a medicine photo',      prompt: null },
                { icon: <AlertTriangle size={18} />, color: '#EF4444', bg: '#FEE2E2', label: 'Low stock check',  sub: 'What needs reordering?',       prompt: 'Which medicines are running low?' },
                { icon: <Clock size={18} />,      color: '#3B82F6', bg: '#DBEAFE', label: 'Expiry report',     sub: 'Items expiring soon',          prompt: 'Which medicines are expiring soon?' },
              ] as const).map(({ icon, color, bg, label, sub, prompt }, i) => (
                <button
                  key={label}
                  onClick={() => {
                    if (prompt) setMessage(prompt);
                    else fileInputRef.current?.click();
                  }}
                  style={{
                    background: '#FFFFFF', border: '1px solid #E5E7EB',
                    borderRadius: 14, padding: '14px 16px',
                    textAlign: 'left', cursor: 'pointer', display: 'flex',
                    alignItems: 'flex-start', gap: 12,
                    transition: 'all 0.2s ease',
                    animation: `fadeUp 0.5s ${0.15 + i * 0.07}s ease both`,
                    opacity: 0, animationFillMode: 'forwards',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = '#F9FAFB';
                    (e.currentTarget as HTMLButtonElement).style.borderColor = color;
                    (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 8px 24px ${color}15`;
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = '#FFFFFF';
                    (e.currentTarget as HTMLButtonElement).style.borderColor = '#E5E7EB';
                    (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
                  }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0, marginTop: 1 }}>
                    {icon}
                  </div>
                  <div>
                    <p style={{ margin: 0, fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 13, fontWeight: 600, color: '#111827', lineHeight: 1.3 }}>{label}</p>
                    <p style={{ margin: '3px 0 0', fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 11.5, color: '#6B7280', lineHeight: 1.4 }}>{sub}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Keyframe styles injected inline */}
            <style>{`
              @keyframes floatOrb {
                0%, 100% { transform: translateY(0px); }
                50% { transform: translateY(-10px); }
              }
              @keyframes spinRing {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
              @keyframes fadeUp {
                from { opacity: 0; transform: translateY(12px); }
                to   { opacity: 1; transform: translateY(0); }
              }
              @keyframes scannerPan {
                0% { left: -30%; }
                100% { left: 130%; }
              }
              .animate-scanner-pan {
                animation: scannerPan 1.5s ease-in-out infinite;
              }
              .animate-spin-slow {
                animation: spin 3s linear infinite;
              }
            `}</style>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto mb-4 px-4 space-y-8 min-h-0 scroll-smooth [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:transparent [&::-webkit-scrollbar-thumb]:bg-[#22C55E]/20 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-[#22C55E]/40">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} type={msg.type} icon={msg.icon} iconColor={msg.iconColor} content={msg.content} warning={msg.warning} timestamp={msg.timestamp} />
          ))}
          {isLoading && <TypingIndicator />}
          {hitlPending && (
            <div className="flex gap-3 justify-center">
              <button onClick={() => handleHitl('approve')} className="bg-[#16A34A] hover:bg-[#15803D] text-white px-6 py-2.5 rounded-lg font-semibold text-sm transition-all hover:scale-105 shadow" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
                Approve — Move to Quarantine
              </button>
              <button onClick={() => handleHitl('reject')} className="bg-[#DC2626] hover:bg-[#B91C1C] text-white px-6 py-2.5 rounded-lg font-semibold text-sm transition-all hover:scale-105 shadow" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
                Reject — Discard
              </button>
            </div>
          )}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Attached image preview with live barcode details */}
        {(attachedImage || scanning) && (
          <div className="mx-4 mb-4 flex flex-col bg-white border border-[#E5E7EB] shadow-lg rounded-xl p-4 animate-in slide-in-from-bottom-2 fade-in duration-300 relative overflow-hidden">
            {/* Background glow when scanning */}
            {scanning && <div className="absolute inset-0 bg-[#22C55E]/5 animate-pulse pointer-events-none" />}
            
            <div className="flex items-center gap-3 relative z-10">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors ${scanning ? 'bg-[#22C55E]/20 border border-[#22C55E]/40 text-[#16A34A]' : 'bg-[#ECFDF5] border border-[#22C55E]/30 text-[#22C55E]'}`}>
                {scanning ? <ScanLine className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
              </div>
              <div className="flex-1 min-w-0 flex flex-col">
                <span className="text-sm font-semibold text-[#111827] truncate" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
                  {attachedImage?.name ?? 'Processing Image…'}
                </span>
                <span className="text-xs text-[#6B7280]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
                  {attachedImage ? 'Ready to analyze' : 'Extracting data...'}
                </span>
              </div>
              {attachedImage && !scanning && (
                <button 
                  onClick={() => { setAttachedImage(null); setBarcodeResult(null); }} 
                  className="w-8 h-8 flex items-center justify-center rounded-md bg-[#F9FAFB] border border-[#E5E7EB] text-[#6B7280] hover:text-[#EF4444] hover:bg-[#FEE2E2] hover:border-[#EF4444]/30 transition-all ml-2"
                  title="Remove attachment"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            
            <div className="w-full relative z-10">
              {renderBarcodeDetails()}
            </div>
          </div>
        )}

        <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleImagePick} />

        <div className={`relative group mx-4 shrink-0 ${messages.length > 0 ? "mt-auto" : "max-w-3xl mx-auto w-full"}`}>
          <div className="relative bg-white backdrop-blur-sm rounded-xl shadow-lg p-3 flex items-center gap-3 border border-[#E5E7EB]">
            <button
              onClick={() => fileInputRef.current?.click()}
              data-tour="attach-btn"
              className="w-11 h-11 rounded-lg bg-[#F3F4F6] hover:bg-[#22C55E] text-[#6B7280] hover:text-white flex items-center justify-center transition-all duration-300 transform hover:scale-105 shrink-0"
              title="Attach File"
            >
              <Plus className="w-5 h-5" />
            </button>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              data-tour="chat-input"
              placeholder={attachedImage ? 'Describe the file or press send to scan…' : 'Type your message, attach labels/PDFs or ask a question...'}
              className="flex-1 bg-transparent px-3 py-3 outline-none text-[#111827] placeholder:text-[#9CA3AF] font-normal text-[15px]"
              style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
              disabled={isLoading}
            />
            <div className="flex items-center gap-2 pr-1 shrink-0">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || scanning}
                className={`w-11 h-11 rounded-lg flex items-center justify-center transition-colors ${
                  scanning
                    ? 'bg-[#FEF3C7] text-[#F59E0B] animate-pulse'
                    : attachedImage
                    ? 'bg-[#ECFDF5] text-[#22C55E]'
                    : 'hover:bg-[#F3F4F6] text-[#6B7280] hover:text-[#111827]'
                } ${uploading ? 'animate-pulse' : ''}`}
                title={scanning ? 'Scanning...' : 'Attach image or PDF for scanning'}
              >
                {scanning ? <ScanLine className="w-5 h-5" /> : <Paperclip className="w-5 h-5" />}
              </button>
              <button
                onClick={isListening ? undefined : startListening}
                title="Voice Input"
                className={`w-11 h-11 rounded-lg flex items-center justify-center transition-colors ${
                  isListening ? 'bg-[#FEE2E2] text-[#EF4444] animate-pulse' : 'hover:bg-[#F3F4F6] text-[#6B7280] hover:text-[#111827]'
                }`}
              >
                <Mic className="w-5 h-5" />
              </button>
              <button
                onClick={handleSend}
                disabled={isLoading || scanning || (!message.trim() && !attachedImage)}
                className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all duration-300 transform ${
                  (message.trim() || attachedImage) && !isLoading && !scanning
                    ? 'bg-[#22C55E] hover:scale-105 text-white shadow-lg shadow-[#22C55E]/30'
                    : 'bg-[#F3F4F6] text-[#D1D5DB] cursor-not-allowed'
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