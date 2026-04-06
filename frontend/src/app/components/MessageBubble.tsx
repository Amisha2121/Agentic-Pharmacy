import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

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
          <p className={`whitespace-pre-wrap leading-relaxed text-[15px] ${isUser ? 'text-gray-100' : 'text-gray-700'}`}>
            {content}
          </p>
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