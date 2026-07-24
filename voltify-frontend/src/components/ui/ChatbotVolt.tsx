// src/components/ui/ChatbotVolt.tsx
import { useState, useEffect, useRef } from 'react';
import { Send, X, ChevronDown } from 'lucide-react';
import { apiService } from '../../lib/api';
import { toast } from 'react-toastify';

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const WELCOME: Message = {
  role: 'assistant',
  content: "Hey! I'm Volt, your personal energy coach. ⚡ Ask me anything — BEE settings, bill forecasts, or appliance tips.",
};

export default function ChatbotVolt() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) setTimeout(scrollToBottom, 80);
  }, [isOpen, messages]);

  // Auto-focus input box whenever chatbot finishes thinking (loading becomes false)
  useEffect(() => {
    if (!loading && isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [loading, isOpen]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || loading) return;

    const userText = inputMessage.trim();
    setInputMessage('');
    const updatedHistory: Message[] = [...messages, { role: 'user', content: userText }];
    setMessages(updatedHistory);
    setLoading(true);

    try {
      const res = await apiService.chatWithVolt(
        updatedHistory.map((m) => ({ role: m.role, content: m.content }))
      );
      if (res.success && res.reply) {
        setMessages((prev) => [...prev, { role: 'assistant', content: res.reply }]);
      }
    } catch (err: any) {
      console.error('Volt Chatbot failed:', err);
      toast.error('Failed to receive response from Volt');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* ── Floating trigger button ── */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Open Volt AI Energy Coach"
          className="fixed bottom-6 right-6 z-50 group cursor-pointer"
        >
          {/* Ping ring */}
          <span className="absolute inset-0 rounded-full border border-primary/40 animate-ping opacity-70 pointer-events-none" />

          {/* Button body */}
          <span className="relative flex size-16 items-center justify-center rounded-full bg-slate-900 border-2 border-primary/60 shadow-[0_0_20px_rgba(0,229,255,0.35)] hover:border-primary hover:shadow-[0_0_25px_rgba(0,229,255,0.5)] transition-all duration-300 group-hover:scale-105">
            {/* GIF logo as avatar */}
            <img
              src="/logo.gif"
              alt="Volt"
              className="size-9 object-contain"
            />
            {/* Online dot */}
            <span className="absolute bottom-0.5 right-0.5 size-3 rounded-full bg-emerald-500 border-2 border-slate-900" />
          </span>

          {/* Tooltip */}
          <span className="absolute right-20 top-1/2 -translate-y-1/2 scale-0 group-hover:scale-100 origin-right bg-slate-950 border border-primary/30 px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider text-primary transition-all duration-200 shadow-2xl pointer-events-none whitespace-nowrap">
            Ask Volt ⚡
          </span>
        </button>
      )}

      {/* ── Chat panel ── */}
      {isOpen && (
        <div
          className="fixed inset-0 md:inset-auto md:bottom-6 md:right-6 md:w-[360px] md:h-[540px] z-50 flex flex-col animate-slide-up
                     bg-[#0d0d0d] border border-[#333333] rounded-none md:rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.7)] overflow-hidden"
        >
          {/* ── Header ── */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#1f1f1f] bg-[#111111] shrink-0">
            <div className="flex items-center gap-3">
              {/* Logo avatar */}
              <div className="relative shrink-0">
                <div className="size-9 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center overflow-hidden">
                  <img src="/logo.gif" alt="Volt" className="size-7 object-contain" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-500 border-2 border-[#111111]" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="font-display font-semibold text-sm text-white tracking-tight">Volt</span>
                  <span className="text-[9px] font-mono uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                    online
                  </span>
                </div>
                <p className="text-[10px] text-[#666666] font-sans mt-0.5">AI Energy Coach · Powered by Groq</p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              aria-label="Close chat"
              className="p-1.5 rounded-lg text-[#666666] hover:text-white hover:bg-[#1a1a1a] border border-transparent hover:border-[#2a2a2a] transition-all cursor-pointer"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* ── Messages ── */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 font-sans" style={{ scrollbarWidth: 'none' }}>
            {messages.map((m, i) => {
              const isUser = m.role === 'user';
              return (
                <div key={i} className={`flex ${isUser ? 'justify-end' : 'justify-start'} items-end gap-2`}>
                  {/* Bot avatar beside message */}
                  {!isUser && (
                    <div className="size-6 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center shrink-0 mb-0.5">
                      <img src="/logo.gif" alt="Volt" className="size-5 object-contain" />
                    </div>
                  )}

                  <div
                    className={`max-w-[78%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                      isUser
                        ? 'bg-primary text-white font-medium rounded-br-sm shadow-[0_2px_12px_rgba(0,112,243,0.2)]'
                        : 'bg-[#1a1a1a] border border-[#2a2a2a] text-[#cccccc] rounded-bl-sm'
                    }`}
                  >
                    {!isUser && (
                      <span className="block text-[9px] font-mono font-bold uppercase tracking-widest text-primary mb-1 opacity-70">
                        Volt
                      </span>
                    )}
                    {m.content}
                  </div>
                </div>
              );
            })}

            {/* Typing indicator */}
            {loading && (
              <div className="flex items-end gap-2 justify-start">
                <div className="size-6 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center shrink-0">
                  <img src="/logo.gif" alt="Volt" className="size-5 object-contain" />
                </div>
                <div className="bg-[#1a1a1a] border border-[#2a2a2a] px-4 py-3 rounded-2xl rounded-bl-sm flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                  <span className="size-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                  <span className="size-1.5 rounded-full bg-primary animate-bounce" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* ── Input ── */}
          <form
            onSubmit={handleSendMessage}
            className="flex items-center gap-2 px-4 py-3 border-t border-[#1f1f1f] bg-[#111111] shrink-0"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask about energy savings..."
              disabled={loading}
              className="flex-1 bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-xs text-white placeholder-[#555555] focus:outline-none focus:border-primary/60 transition-colors font-sans"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || loading}
              aria-label="Send message"
              className="size-9 shrink-0 rounded-xl bg-primary text-white flex items-center justify-center hover:opacity-90 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <Send className="size-3.5" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
export { ChatbotVolt };
