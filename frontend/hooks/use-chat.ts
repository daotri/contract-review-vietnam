'use client';
// Chat state management for Q&A about current contract
import { useState, useCallback } from 'react';
import { chatAboutContract } from '@/lib/api-client';
import type { ChatMessage } from '@/lib/types';

interface UseChatReturn {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  sendMessage: (contractText: string, question: string) => Promise<void>;
  clearHistory: () => void;
}

export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (contractText: string, question: string) => {
    if (!question.trim()) return;

    const userMsg: ChatMessage = { role: 'user', content: question };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    setError(null);

    try {
      const response = await chatAboutContract(contractText, question, messages);
      const assistantMsg: ChatMessage = { role: 'assistant', content: response.answer };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      setError((err as Error).message || 'Không thể gửi tin nhắn. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [messages]);

  const clearHistory = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return { messages, loading, error, sendMessage, clearHistory };
}
