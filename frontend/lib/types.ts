// TypeScript types matching backend Pydantic schemas

export type RiskLevel = 'critical' | 'high' | 'medium' | 'low';

export type ReviewState = 'idle' | 'uploading' | 'analyzing' | 'done' | 'error';

export interface ClauseAnalysis {
  clause_index: number;
  clause_text: string;
  risk_level: RiskLevel;
  issues: string[];
  legal_references: string[];
  suggestion: string | null;
  suggested_text: string | null;
  compliant: boolean;
}

export interface RiskSummary {
  total_clauses: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface ContractReview {
  contract_type: string;
  clauses: ClauseAnalysis[];
  risk_summary: RiskSummary;
  overall_assessment: string;
  missing_mandatory_clauses: string[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  contract_text: string;
  question: string;
  history: ChatMessage[];
}

export interface ChatResponse {
  answer: string;
  references: string[];
}

// --- Admin types ---

export type CrawlStatus = 'idle' | 'running' | 'done' | 'error';
export type ChangeType = 'new' | 'amended' | 'repealed';
