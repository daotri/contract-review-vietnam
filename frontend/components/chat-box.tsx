'use client';
// Floating chat panel — hidden by default, toggled via floating button bottom-right
import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2, Bot, User, X, MessageCircle } from 'lucide-react';
import { useChat } from '@/hooks/use-chat';
import type { ContractReview } from '@/lib/types';

interface ChatBoxProps {
  review: ContractReview;
}

export function ChatBox({ review }: ChatBoxProps) {
  const { messages, loading, error, sendMessage } = useChat();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, open]);

  async function handleSend() {
    const q = input.trim();
    if (!q || loading) return;
    setInput('');
    const contractContext = review.clauses.map(c => c.clause_text).join('\n\n');
    await sendMessage(contractContext, q);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <>
      {/* Floating toggle button */}
      <button
        onClick={() => setOpen(v => !v)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-purple-600 hover:bg-purple-700 px-4 py-3 text-sm font-medium text-white shadow-lg shadow-purple-900/40 transition-colors"
        aria-label="Hỏi đáp về hợp đồng"
      >
        <MessageCircle className="w-4 h-4" aria-hidden="true" />
        <span className="hidden sm:inline">Hỏi đáp về hợp đồng</span>
      </button>

      {/* Slide-in panel from right */}
      {open && (
        <div className="fixed inset-0 z-40 flex justify-end" role="dialog" aria-modal="true" aria-label="Chat hỏi đáp">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />

          {/* Panel */}
          <div className="relative z-10 flex flex-col w-full max-w-sm h-full bg-card shadow-2xl border-l border-border">
            {/* Header */}
            <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Bot className="w-4 h-4 text-primary" />
                  Hỏi đáp về hợp đồng
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">Đặt câu hỏi về nội dung hợp đồng này</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Đóng">
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-6">
                    Chưa có câu hỏi nào. Hãy bắt đầu đặt câu hỏi về hợp đồng.
                  </p>
                )}
                {messages.map((msg, i) => (
                  <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'assistant' && <Bot className="w-5 h-5 text-primary shrink-0 mt-0.5" />}
                    <div className={[
                      'max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed',
                      msg.role === 'user' ? 'bg-purple-600/20 text-foreground' : 'bg-white/5 text-foreground',
                    ].join(' ')}>
                      {msg.content}
                    </div>
                    {msg.role === 'user' && <User className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />}
                  </div>
                ))}
                {loading && (
                  <div className="flex gap-2 justify-start">
                    <Bot className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <div className="bg-muted rounded-lg px-3 py-2">
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    </div>
                  </div>
                )}
                {error && <p className="text-xs text-destructive text-center">{error}</p>}
                <div ref={bottomRef} />
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="border-t p-3 flex gap-2">
              <Textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Nhập câu hỏi... (Enter để gửi)"
                className="resize-none min-h-[60px] text-sm"
                disabled={loading}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                size="icon"
                className="shrink-0 self-end h-10 w-10"
                aria-label="Gửi câu hỏi"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
