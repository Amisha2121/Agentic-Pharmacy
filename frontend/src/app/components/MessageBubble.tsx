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
      <div 
        className="w-6 h-6 rounded-full flex items-center justify-center bg-[#16a34a] flex-shrink-0"
        style={{ borderRadius: '999px' }}
      >
        <div className="w-2 h-2 rounded-full bg-white" />
      </div>
      <div className="flex flex-col items-start">
        <div className="rounded-[16px] px-6 py-4 bg-white border-2 border-[#0F172A]">
          <div className="flex items-center gap-2">
            {[0, 1, 2].map(i => (
              <span
                key={i}
                className="w-2.5 h-2.5 rounded-full bg-[#16a34a]"
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
      {/* Avatar - only for AI messages */}
      {!isUser && (
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center bg-[#16a34a] flex-shrink-0"
          style={{ borderRadius: '999px' }}
        >
          <div className="w-2 h-2 rounded-full bg-white" />
        </div>
      )}

      {/* Bubble + actions */}
      <div className={`flex flex-col max-w-[70%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`relative px-6 py-3 transition-all duration-200 ${
            isUser
              ? 'bg-[#16a34a] text-white font-bold border-2 border-[#16a34a] rounded-[18px]'
              : 'bg-white text-[#0F172A] border-2 border-[#E2E8F0] rounded-[18px]'
          }`}
        >
          {/* Title row */}
          {title && (
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-[#0F172A]">
              {success && <CheckCircle2 className="w-4 h-4 text-[#16a34a]" />}
              {warning && !success && <XCircle className="w-4 h-4 text-[#EF4444]" />}
              <span className="font-black text-[#0F172A] text-sm uppercase tracking-wide">{title}</span>
            </div>
          )}

          {/* Body */}
          <div className={`leading-relaxed ${isUser ? 'text-[14px]' : 'text-[14px]'}`}>
            <ReactMarkdown
              components={{
                p: ({ children }) => <p className="mb-2 last:mb-0 whitespace-pre-wrap">{children}</p>,
                strong: ({ children }) => (
                  <strong className={`font-black ${isUser ? 'text-white' : 'text-[#0F172A]'}`}>{children}</strong>
                ),
                em: ({ children }) => <em className="italic text-[#64748B]">{children}</em>,
                ul: ({ children }) => <ul className="list-disc list-inside space-y-1 my-2 ml-2">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 my-2 ml-2">{children}</ol>,
                li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                h1: ({ children }) => <h1 className="text-base font-black mb-2 uppercase tracking-wide">{children}</h1>,
                h2: ({ children }) => <h2 className="text-sm font-black mb-1 uppercase tracking-wide">{children}</h2>,
                h3: ({ children }) => <h3 className="text-xs font-black mb-1 text-[#64748B] uppercase tracking-widest">{children}</h3>,
                code: ({ children }) => (
                  <code className="px-2 py-1 rounded text-xs font-mono bg-[#F8FAFC] border border-[#E2E8F0] text-[#16a34a]">
                    {children}
                  </code>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-[#16a34a] pl-3 my-2 italic text-[#64748B]">
                    {children}
                  </blockquote>
                ),
                hr: () => <hr className="my-3 border-[#E2E8F0]" />,
              }}
            >
              {content}
            </ReactMarkdown>
          </div>

          {/* Warning block */}
          {warning && (
            <div className="mt-3 p-3 bg-[#FEE2E2] rounded-xl flex items-start gap-2.5 border-2 border-[#EF4444]">
              <AlertTriangle className="w-4 h-4 text-[#EF4444] flex-shrink-0 mt-0.5" />
              <p className="text-xs text-[#DC2626] font-bold leading-snug">{warning}</p>
            </div>
          )}
        </div>

        {/* Below-bubble row: timestamp + copy */}
        <div className={`flex items-center gap-3 mt-2 px-1 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
          {timestamp && (
            <span className="text-[10px] text-[#64748B] font-medium">{timestamp}</span>
          )}
          {!isUser && (
            <button
              onClick={handleCopy}
              className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[10px] text-[#64748B] hover:text-[#0F172A] font-medium"
              title="Copy message"
            >
              {copied
                ? <><Check className="w-3 h-3 text-[#16a34a]" /><span className="text-[#16a34a]">Copied</span></>
                : <><Copy className="w-3 h-3" />Copy</>
              }
            </button>
          )}
        </div>
      </div>
    </div>
  );
}