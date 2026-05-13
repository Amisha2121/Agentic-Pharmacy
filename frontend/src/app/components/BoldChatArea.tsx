import { useState, useEffect, useRef } from 'react';
import { Plus, Mic, ArrowUp, Paperclip, Menu, History, Bot, User, CheckCircle, AlertCircle, XCircle, FileText, ScanLine, Camera, X, ShieldCheck, ChevronDown } from 'lucide-react';
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
  ndc?: string;
  quantity?: number;
  raw_text?: string;
  is_gs1?: boolean;
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

function MedicalDisclaimer() {
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  if (dismissed) return null;

  return (
    <div
      className="mb-5"
      style={{
        borderRadius: '18px',
        background: '#fff',
        border: '2px solid #E2E8F0',
        borderLeft: '3px solid #16a34a',
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>

        {/* Icon */}
        <div style={{
          flexShrink: 0, marginTop: 2,
          width: 26, height: 26, borderRadius: '50%',
          background: '#f0fdf4',
          border: '1.5px solid #86efac',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <ShieldCheck style={{ width: 13, height: 13, color: '#16a34a' }} strokeWidth={2.5} />
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Top row: label + expand + dismiss */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
              textTransform: 'uppercase', color: '#16a34a',
            }}>
              AI Health Info Notice
            </span>

            <button
              onClick={() => setExpanded(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: 3,
                background: '#f0fdf4', border: '1px solid #bbf7d0',
                borderRadius: 999, padding: '2px 8px', cursor: 'pointer',
                fontSize: 10, color: '#15803d', fontWeight: 600,
              }}
            >
              {expanded ? 'Show less' : 'Learn more'}
              <ChevronDown
                style={{
                  width: 10, height: 10,
                  transition: 'transform 0.2s',
                  transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                }}
              />
            </button>

            <div style={{ flex: 1 }} />

            <button
              onClick={() => setDismissed(true)}
              title="Dismiss"
              style={{
                width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                background: '#f1f5f9', border: '1px solid #E2E8F0',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <X style={{ width: 10, height: 10, color: '#94a3b8' }} strokeWidth={2.5} />
            </button>
          </div>

          {/* Summary line */}
          <p style={{ margin: 0, fontSize: 12, color: '#64748b', lineHeight: 1.55 }}>
            Responses are for{' '}
            <strong style={{ color: '#0f172a', fontWeight: 700 }}>informational purposes only</strong>
            {' '}and may not reflect the latest medical guidance.
          </p>

          {/* Expanded section */}
          {expanded && (
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #E2E8F0' }}>
              <p style={{ margin: '0 0 8px', fontSize: 11, color: '#64748b', lineHeight: 1.6 }}>
                This AI assistant does not diagnose, prescribe, or replace professional medical advice. Information is sourced from:
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {[
                  { label: 'Clinical Database',  bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8' },
                  { label: 'General Knowledge',  bg: '#fefce8', border: '#fde68a', color: '#92400e' },
                  { label: 'Your Inventory',     bg: '#f0fdf4', border: '#bbf7d0', color: '#15803d' },
                ].map(({ label, bg, border, color }) => (
                  <span key={label} style={{
                    display: 'inline-flex', alignItems: 'center',
                    background: bg, border: `1px solid ${border}`,
                    borderRadius: 999, padding: '3px 10px',
                    fontSize: 10, fontWeight: 600, color,
                  }}>
                    {label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
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
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } // Use back camera on mobile
      });
      setStream(mediaStream);
      setShowCamera(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      alert('Camera access denied or not available');
      console.error('Camera error:', err);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0);
    
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      
      stopCamera();
      setUploading(true);
      setScanning(true);
      setBarcodeResult(null);
      setAttachedImage(null);

      try {
        const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' });
        const scanFormData = new FormData();
        scanFormData.append('file', file);
        const scanRes = await authenticatedFetch('/api/scan-barcode', { method: 'POST', body: scanFormData });
        const scanData: BarcodeResult = await scanRes.json();
        setBarcodeResult(scanData);
        setAttachedImage({ path: scanData.path, name: file.name });
      } catch {
        try {
          const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' });
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
      }
    }, 'image/jpeg', 0.95);
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

  useEffect(() => {
    // Cleanup camera on unmount
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

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
      {/* Camera Modal */}
      {showCamera && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-2xl">
            <button
              onClick={stopCamera}
              className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            >
              <X className="w-6 h-6" strokeWidth={2.5} />
            </button>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full rounded-lg"
            />
            <div className="mt-4 flex justify-center gap-4">
              <button
                onClick={capturePhoto}
                className="bg-[#16a34a] hover:bg-[#15803d] text-white px-8 py-4 font-black uppercase text-sm tracking-wide transition-all flex items-center gap-2"
                style={{ borderRadius: '999px' }}
              >
                <Camera className="w-5 h-5" strokeWidth={2.5} />
                Capture Photo
              </button>
            </div>
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}

      {/* Top bar with menu buttons */}
      <div className="flex items-center justify-between p-3 sm:p-4 bg-[#F8FAFC] absolute top-0 w-full z-20 border-b border-gray-200">
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

      <div className="flex-1 flex flex-col pt-16 sm:pt-20 px-4 sm:px-6 lg:px-8 pb-4 sm:pb-6 max-w-7xl mx-auto w-full overflow-hidden">
        {/* Medical Disclaimer Banner */}
        {messages.length > 0 && <MedicalDisclaimer />}
        
        {messages.length === 0 && !isLoading && !hitlPending ? (
          <div className="flex-1 flex items-center justify-center px-4">
            <p className="text-[13px] sm:text-[14px] text-[#64748B] font-medium text-center">
              Select a conversation or start a new one
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto overflow-x-hidden mb-3 sm:mb-4 px-2 sm:px-4 space-y-6 sm:space-y-8 min-h-0">
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
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center">
                <button 
                  onClick={() => handleHitl('approve')} 
                  className="bg-[#16a34a] hover:bg-[#15803d] text-white px-6 py-3 font-black uppercase text-xs sm:text-sm tracking-wide transition-all"
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
          {/* Indicators Container */}
          {(scanning || attachedImage || (barcodeResult && barcodeResult.found)) && (
            <div className="absolute left-0 right-0 flex flex-col items-center justify-center gap-2 mb-4" style={{ bottom: '72px' }}>
              {/* Scanning Animation */}
              {scanning && (
                <div className="bg-white border-2 border-[#0F172A] px-6 py-3 flex items-center gap-3 animate-pulse" style={{ borderRadius: '999px' }}>
                  <ScanLine className="w-5 h-5 text-[#16a34a] animate-bounce" strokeWidth={2.5} />
                  <span className="text-[13px] font-bold text-[#0F172A]">SCANNING BARCODE...</span>
                </div>
              )}

              {/* Barcode Result Indicator */}
              {barcodeResult && barcodeResult.found && !scanning && (
                <div className="bg-[#16a34a] border-2 border-[#0F172A] px-6 py-3 flex flex-col gap-2 max-w-md" style={{ borderRadius: '20px' }}>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-white flex-shrink-0" strokeWidth={2.5} />
                    <span className="text-[13px] font-bold text-white">BARCODE DETECTED</span>
                  </div>
                  <div className="text-[11px] text-white/90 space-y-1 pl-8">
                    {barcodeResult.barcode_type && (
                      <div>Type: {barcodeResult.barcode_type}</div>
                    )}
                    {barcodeResult.ndc && (
                      <div>NDC: {barcodeResult.ndc}</div>
                    )}
                    {barcodeResult.batch_number && (
                      <div>Batch: {barcodeResult.batch_number}</div>
                    )}
                    {barcodeResult.expiry_date && (
                      <div>Expiry: {barcodeResult.expiry_date}</div>
                    )}
                    {barcodeResult.gtin && (
                      <div>GTIN: {barcodeResult.gtin}</div>
                    )}
                    {barcodeResult.raw_text && !barcodeResult.is_gs1 && (
                      <div>Code: {barcodeResult.raw_text.substring(0, 30)}{barcodeResult.raw_text.length > 30 ? '...' : ''}</div>
                    )}
                    {!barcodeResult.batch_number && !barcodeResult.expiry_date && !barcodeResult.ndc && (
                      <div className="text-white/80 italic">Product barcode - will help identify the medicine</div>
                    )}
                  </div>
                </div>
              )}

              {/* Attached File Indicator */}
              {attachedImage && !scanning && (
                <div className="bg-[#16a34a] border-2 border-[#0F172A] px-6 py-3 flex items-center gap-3" style={{ borderRadius: '999px' }}>
                  <FileText className="w-5 h-5 text-white" strokeWidth={2.5} />
                  <span className="text-[13px] font-bold text-white">{attachedImage.name}</span>
                  <button
                    onClick={() => {
                      setAttachedImage(null);
                      setBarcodeResult(null);
                    }}
                    className="w-5 h-5 rounded-full bg-white text-[#16a34a] flex items-center justify-center hover:bg-[#F0FDF4] transition-colors"
                  >
                    <XCircle className="w-4 h-4" strokeWidth={2.5} />
                  </button>
                </div>
              )}
            </div>
          )}

          <div 
            className="relative bg-white p-2 sm:p-4 flex items-center gap-2 sm:gap-3 border-2 border-[#0F172A] focus-within:shadow-[0_0_0_3px_#DCFCE7] transition-all"
            style={{ 
              height: '48px sm:56px',
              borderRadius: '999px'
            }}
          >
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-8 sm:w-10 h-8 sm:h-10 rounded-full flex items-center justify-center text-[#94A3B8] hover:text-[#0F172A] transition-colors flex-shrink-0"
              title="Upload image"
            >
              <Plus className="w-4 sm:w-5 h-4 sm:h-5" strokeWidth={2.5} />
            </button>
            <button
              onClick={startCamera}
              className="w-8 sm:w-10 h-8 sm:h-10 rounded-full flex items-center justify-center text-[#94A3B8] hover:text-[#0F172A] transition-colors flex-shrink-0"
              title="Use camera"
            >
              <Camera className="w-4 sm:w-5 h-4 sm:h-5" strokeWidth={2.5} />
            </button>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask anything..."
              className="flex-1 bg-transparent px-2 sm:px-4 outline-none text-[#0F172A] placeholder:text-[#94A3B8] font-medium text-[13px] sm:text-[14px] min-w-0"
              disabled={isLoading}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="hidden sm:flex w-10 h-10 rounded-full items-center justify-center text-[#94A3B8] hover:text-[#0F172A] transition-colors flex-shrink-0"
            >
              <Paperclip className="w-5 h-5" strokeWidth={2.5} />
            </button>
            <button
              onClick={isListening ? undefined : startListening}
              className="hidden sm:flex w-10 h-10 rounded-full items-center justify-center text-[#94A3B8] hover:text-[#0F172A] transition-colors flex-shrink-0"
            >
              <Mic className="w-5 h-5" strokeWidth={2.5} />
            </button>
            <button
              onClick={handleSend}
              disabled={isLoading || scanning || (!message.trim() && !attachedImage)}
              className={`w-9 sm:w-11 h-9 sm:h-11 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
                (message.trim() || attachedImage) && !isLoading && !scanning
                  ? 'bg-[#16a34a] hover:bg-[#15803d] text-white'
                  : 'bg-[#E2E8F0] text-[#94A3B8] cursor-not-allowed'
              }`}
              style={{ 
                borderRadius: '999px',
                opacity: (message.trim() || attachedImage) && !isLoading && !scanning ? 1 : 0.4
              }}
            >
              <ArrowUp className="w-4 sm:w-5 h-4 sm:h-5" strokeWidth={3} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
