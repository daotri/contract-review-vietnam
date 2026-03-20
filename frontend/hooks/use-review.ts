'use client';
// State machine: idle → uploading → analyzing → done | error
import { useState, useCallback } from 'react';
import { reviewContract } from '@/lib/api-client';
import type { ContractReview, ReviewState } from '@/lib/types';

interface UseReviewReturn {
  state: ReviewState;
  result: ContractReview | null;
  error: string | null;
  submit: (file: File) => Promise<void>;
  reset: () => void;
}

export function useReview(): UseReviewReturn {
  const [state, setState] = useState<ReviewState>('idle');
  const [result, setResult] = useState<ContractReview | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async (file: File) => {
    setState('uploading');
    setError(null);
    setResult(null);

    try {
      // Short delay to show uploading state before switching to analyzing
      setState('analyzing');
      const review = await reviewContract(file);
      setResult(review);
      setState('done');
    } catch (err) {
      setError((err as Error).message || 'Đã xảy ra lỗi. Vui lòng thử lại.');
      setState('error');
    }
  }, []);

  const reset = useCallback(() => {
    setState('idle');
    setResult(null);
    setError(null);
  }, []);

  return { state, result, error, submit, reset };
}
