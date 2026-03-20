// Proxy route: forwards multipart file upload to FastAPI POST /api/review
import { NextRequest, NextResponse } from 'next/server';

// Server-side uses BACKEND_URL (internal Docker network), not NEXT_PUBLIC_API_URL
const BACKEND_URL = process.env.BACKEND_URL || 'http://backend:8000';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120_000);

    let res: Response;
    try {
      res = await fetch(`${BACKEND_URL}/api/review`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }

    return NextResponse.json(data);
  } catch (err) {
    const message = (err as Error).name === 'AbortError'
      ? 'Yêu cầu hết thời gian chờ'
      : (err as Error).message || 'Lỗi máy chủ';
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
