import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface MessageBubbleProps {
  type: 'user' | 'system';
  icon: string;
  iconColor: string;
  content: string;
  title?: string;
  warning?: string;
  success?: boolean;
}

export function MessageBubble({
  type,
  icon,
  iconColor,
  content,
  title,
  warning,
  success,
}: MessageBubbleProps) {
  const isUser = type === 'user';
  
  return (
    <div className={`flex items-start gap-4 w-full ${isUser ? 'flex-row-reverse' : 'flex-row'} group`}>
      {/* Icon */}
      <div
        className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0 transition-transform duration-300 group-hover:scale-110 ${
          isUser ? 'bg-[#1E4A4C] shadow-[#1E4A4C]/20' : 'bg-white shadow-gray-200/50'
        }`}
      >
        <span className="text-xl">{icon}</span>
      </div>

      {/* Content */}
      <div className={`flex flex-col max-w-[75%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div 
          className={`rounded-3xl p-5 shadow-lg backdrop-blur-md border transition-all duration-300 ${
            isUser 
              ? 'bg-[#1E4A4C] text-white border-[#2B5B5C] rounded-tr-sm hover:shadow-[#1E4A4C]/20' 
              : 'bg-white/95 text-gray-800 border-white/60 rounded-tl-sm hover:shadow-gray-200/50'
          }`}
        >
          {title && (
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-opacity-20 border-current">
              {success && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
              {warning && <XCircle className="w-5 h-5 text-rose-500" />}
              <span className={`font-bold tracking-wide ${isUser ? 'text-white' : 'text-[#1E4A4C]'}`}>
                {title}
              </span>
            </div>
          )}
          <div className={`leading-relaxed text-[15px] ${isUser ? 'text-gray-100' : 'text-gray-700'}`}>
            <ReactMarkdown
              components={{
                p: ({ children }) => (
                  <p className="mb-2 last:mb-0 whitespace-pre-wrap">{children}</p>
                ),
                strong: ({ children }) => (
                  <strong className={`font-semibold ${isUser ? 'text-white' : 'text-[#1E4A4C]'}`}>{children}</strong>
                ),
                em: ({ children }) => <em className="italic">{children}</em>,
                ul: ({ children }) => (
                  <ul className="list-disc list-inside space-y-1 my-2 ml-2">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-inside space-y-1 my-2 ml-2">{children}</ol>
                ),
                li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                h1: ({ children }) => (
                  <h1 className={`text-lg font-bold mb-2 ${isUser ? 'text-white' : 'text-[#1E4A4C]'}`}>{children}</h1>
                ),
                h2: ({ children }) => (
                  <h2 className={`text-base font-bold mb-1 ${isUser ? 'text-white' : 'text-[#1E4A4C]'}`}>{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 className={`text-sm font-bold mb-1 ${isUser ? 'text-white' : 'text-[#1E4A4C]'}`}>{children}</h3>
                ),
                code: ({ children }) => (
                  <code className={`px-1.5 py-0.5 rounded text-xs font-mono ${isUser ? 'bg-white/20 text-green-200' : 'bg-gray-100 text-[#1E4A4C]'}`}>
                    {children}
                  </code>
                ),
                blockquote: ({ children }) => (
                  <blockquote className={`border-l-4 pl-3 my-2 italic ${isUser ? 'border-white/40 text-gray-200' : 'border-[#1E4A4C]/30 text-gray-600'}`}>
                    {children}
                  </blockquote>
                ),
                hr: () => <hr className={`my-3 ${isUser ? 'border-white/20' : 'border-gray-200'}`} />,
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
          {warning && (
            <div className="mt-4 p-4 bg-rose-50/80 rounded-2xl flex items-start gap-3 border border-rose-100">
              <AlertTriangle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-rose-800 font-medium leading-snug">{warning}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}