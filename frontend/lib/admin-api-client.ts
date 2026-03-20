// Admin API client — all requests include cookies for session auth
// Handles 401 by redirecting to /admin/login

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function redirectToLogin() {
  if (typeof window !== 'undefined') {
    window.location.href = '/admin/login';
  }
}

async function adminFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (res.status === 401) {
    redirectToLogin();
    throw new Error('Phiên đăng nhập hết hạn');
  }

  if (!res.ok) {
    const text = await res.text().catch(() => 'Lỗi không xác định');
    throw new Error(`Lỗi ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

// Auth
export async function adminLogin(key: string): Promise<void> {
  const res = await fetch(`${API_URL}/admin/login`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key }),
  });
  if (res.status === 401 || res.status === 403) {
    throw new Error('Khóa quản trị không hợp lệ');
  }
  if (!res.ok) {
    throw new Error('Đăng nhập thất bại');
  }
}

export async function adminLogout(): Promise<void> {
  await fetch(`${API_URL}/admin/logout`, {
    method: 'GET',
    credentials: 'include',
  });
}

// Dashboard stats
export interface AdminStats {
  total_laws: number;
  embedded_laws: number;
  total_chunks: number;
  current_model: string;
  last_crawl_at: string | null;
}

export async function getAdminStats(): Promise<AdminStats> {
  return adminFetch<AdminStats>('/admin/stats');
}

// Initial crawl
export interface CrawlProgress {
  status: 'idle' | 'running' | 'done' | 'error';
  laws_crawled: number;
  laws_total: number;
  chunks_embedded: number;
  chunks_total: number;
  message: string;
}

export async function initCrawl(): Promise<void> {
  return adminFetch<void>('/admin/init', { method: 'POST' });
}

export async function getCrawlProgress(): Promise<CrawlProgress> {
  return adminFetch<CrawlProgress>('/admin/init/status');
}

// URL crawl + diff
export interface DiffItem {
  change_type: string;
  article_id: string;
  old_content: string | null;
  new_content: string | null;
}

export interface CrawlDiffResponse {
  law_number: string;
  law_name: string;
  changes: DiffItem[];
}

export async function crawlUrl(url: string): Promise<CrawlDiffResponse> {
  return adminFetch<CrawlDiffResponse>('/admin/crawl', {
    method: 'POST',
    body: JSON.stringify({ url }),
  });
}

export async function confirmCrawl(
  url: string,
  articleIds: string[]
): Promise<void> {
  return adminFetch<void>('/admin/crawl/confirm', {
    method: 'POST',
    body: JSON.stringify({ url, article_ids: articleIds }),
  });
}

// Laws management
export interface LawItem {
  id: string;
  law_number: string;
  law_name: string;
  priority: number | null;
  embedded: boolean;
  version: number;
}

export async function listLaws(): Promise<LawItem[]> {
  return adminFetch<LawItem[]>('/admin/laws');
}

export async function toggleLaw(id: string, isActive: boolean): Promise<void> {
  return adminFetch<void>(`/admin/laws/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ is_active: isActive }),
  });
}

// AI config
export interface AiConfig {
  llm_model: string;
  llm_api_key_masked: string;
  llm_temperature: number;
  embed_model: string;
  embed_dimension: number;
}

export async function getAiConfig(): Promise<AiConfig> {
  return adminFetch<AiConfig>('/admin/ai-config');
}

export async function updateAiConfig(config: {
  llm_model: string;
  llm_api_key: string;
  llm_temperature: number;
}): Promise<void> {
  return adminFetch<void>('/admin/ai-config', {
    method: 'PUT',
    body: JSON.stringify(config),
  });
}

export interface TestResult {
  status: 'ok' | 'error';
  latency_ms?: number;
  error?: string;
  model: string;
}

export async function testAiConfig(): Promise<TestResult> {
  return adminFetch<TestResult>('/admin/ai-config/test', { method: 'POST' });
}
