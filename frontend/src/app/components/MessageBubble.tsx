import { useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Copy, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface MessageBubbleProps {
  type: 'user' | 'system';
  icon: React.ReactNode;
  iconColor: string;
  content: string;
  title?: string;
  warning?: string;
  success?: boolean;
  timestamp?: string;
}

export function TypingIndicator() {
  return (
    <div className="flex items-start gap-4 w-full flex-row">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#18181B] border border-[#27272A] shadow-lg flex-shrink-0">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="1.8">
          <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"/>
          <path d="M8 12h.01M12 12h.01M16 12h.01"/>
        </svg>
      </div>
      <div className="flex flex-col items-start">
        <div className="rounded-2xl rounded-tl-sm px-5 py-4 bg-[#111113] border border-[#27272A]">
          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map(i => (
              <span
                key={i}
                className="w-2 h-2 rounded-full bg-[#3B82F6]"
                style={{ animation: `bounce 1.2s ${i * 0.2}s ease-in-out infinite` }}
              />
            ))}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40%            { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export function MessageBubble({
  type,
  icon,
  iconColor,
  content,
  title,
  warning,
  success,
  timestamp,
}: MessageBubbleProps) {
  const isUser = type === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  return (
    <div className={`flex items-start gap-4 w-full ${isUser ? 'flex-row-reverse' : 'flex-row'} group`}>
      {/* Avatar */}
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0 ${
          isUser ? 'bg-[#3B82F6] shadow-[#3B82F6]/20' : 'bg-[#18181B] border border-[#27272A] shadow-black/20'
        }`}
        style={{ color: isUser ? '#fff' : iconColor }}
      >
        {icon}
      </div>

      {/* Bubble + actions */}
      <div className={`flex flex-col max-w-[78%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`relative rounded-2xl px-5 py-4 shadow-lg border transition-all duration-200 ${
            isUser
              ? 'bg-[#1A2E4A] text-[#E2E8F0] border-[#1E3A5F] rounded-tr-sm'
              : 'bg-[#111113] text-[#E4E4E7] border-[#27272A] rounded-tl-sm'
          }`}
          style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
        >
          {/* Title row */}
          {title && (
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-white/10">
              {success && <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />}
              {warning && !success && <XCircle className="w-4 h-4 text-[#EF4444]" />}
              <span className="font-semibold text-[#F4F4F5] text-sm">{title}</span>
            </div>
          )}

          {/* Body */}
          <div className="leading-relaxed text-[14.5px]">
            <ReactMarkdown
              components={{
                p: ({ children }) => <p className="mb-2 last:mb-0 whitespace-pre-wrap">{children}</p>,
                strong: ({ children }) => (
                  <strong className={`font-semibold ${isUser ? 'text-[#93C5FD]' : 'text-[#F4F4F5]'}`}>{children}</strong>
                ),
                em: ({ children }) => <em className="italic text-[#A1A1AA]">{children}</em>,
                ul: ({ children }) => <ul className="list-disc list-inside space-y-1 my-2 ml-2 text-[#D4D4D8]">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 my-2 ml-2 text-[#D4D4D8]">{children}</ol>,
                li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                h1: ({ children }) => <h1 className="text-base font-bold mb-2 text-[#F4F4F5]">{children}</h1>,
                h2: ({ children }) => <h2 className="text-sm font-bold mb-1 text-[#F4F4F5]">{children}</h2>,
                h3: ({ children }) => <h3 className="text-xs font-bold mb-1 text-[#A1A1AA] uppercase tracking-wide">{children}</h3>,
                code: ({ children }) => (
                  <code className="px-1.5 py-0.5 rounded text-xs font-mono bg-[#18181B] border border-[#27272A] text-[#60A5FA]">
                    {children}
                  </code>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-2 border-[#3B82F6]/40 pl-3 my-2 italic text-[#71717A]">
                    {children}
                  </blockquote>
                ),
                hr: () => <hr className="my-3 border-[#27272A]" />,
              }}
            >
              {content}
            </ReactMarkdown>
          </div>

          {/* Warning block */}
          {warning && (
            <div className="mt-3 p-3 bg-[#1A0000] rounded-xl flex items-start gap-2.5 border border-[#991B1B]">
              <AlertTriangle className="w-4 h-4 text-[#EF4444] flex-shrink-0 mt-0.5" />
              <p className="text-xs text-[#FCA5A5] font-medium leading-snug">{warning}</p>
            </div>
          )}
        </div>

        {/* Below-bubble row: timestamp + copy */}
        <div className={`flex items-center gap-3 mt-1.5 px-1 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
          {timestamp && (
            <span className="text-[10px] text-[#3F3F46]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>{timestamp}</span>
          )}
          {!isUser && (
            <button
              onClick={handleCopy}
              className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[10px] text-[#52525B] hover:text-[#A1A1AA]"
              style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
              title="Copy message"
            >
              {copied
                ? <><Check className="w-3 h-3 text-[#22C55E]" /><span className="text-[#22C55E]">Copied</span></>
                : <><Copy className="w-3 h-3" />Copy</>
              }
            </button>
          )}
        </div>
      </div>
    </div>
  );
}