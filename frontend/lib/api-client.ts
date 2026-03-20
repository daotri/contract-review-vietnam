// Fetch wrapper for backend API calls
import type { ContractReview, ChatMessage, ChatResponse } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Review a contract file — sends to Next.js proxy route which forwards to FastAPI
export async function reviewContract(file: File): Promise<ContractReview> {
  const formData = new FormData();
  formData.append('file', file);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120_000);

  try {
    const res = await fetch('/api/review', {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => 'Lỗi không xác định');
      throw new Error(`Lỗi máy chủ (${res.status}): ${errorText}`);
    }

    return res.json() as Promise<ContractReview>;
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      throw new Error('Yêu cầu hết thời gian chờ (120 giây). Vui lòng thử lại.');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Chat Q&A about current contract — calls FastAPI directly
export async function chatAboutContract(
  contractText: string,
  question: string,
  history: ChatMessage[]
): Promise<ChatResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60_000);

  try {
    const res = await fetch(`${API_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contract_text: contractText, question, history }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => 'Lỗi không xác định');
      throw new Error(`Lỗi trò chuyện (${res.status}): ${errorText}`);
    }

    return res.json() as Promise<ChatResponse>;
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      throw new Error('Yêu cầu hết thời gian chờ. Vui lòng thử lại.');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}
