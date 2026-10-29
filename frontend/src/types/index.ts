export type Verdict =
  | 'known_malicious'
  | 'high_risk'
  | 'suspicious'
  | 'no_known_threat'
  | 'unable_to_verify';

export type Severity = 'info' | 'low' | 'medium' | 'high' | 'critical';

export type ScanType = 'url' | 'batch' | 'file';

export type ScanStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'user' | 'admin';
  is_active: boolean;
  email_verified: boolean;
  created_at: string;
}

export interface ScanFinding {
  id: string;
  scan_id?: string;
  category: string;
  title: string;
  description: string;
  severity: Severity;
  source: string;
  created_at: string;
}

export interface Scan {
  id: string;
  url: string;
  hostname?: string;
  status: ScanStatus;
  verdict: Verdict;
  risk_score: number; // 0 - 100
  scan_type: ScanType;
  model_confidence?: number; // 0.0 - 1.0 or 0 - 100
  scan_duration_ms?: number;
  findings: ScanFinding[];
  redirect_chain?: string[];
  created_at: string;
  completed_at?: string;
}

export interface RiskDistribution {
  safe: number;
  suspicious: number;
  high_risk: number;
  malicious: number;
  unable_to_verify?: number;
}

export interface DashboardStats {
  total_scans: number;
  suspicious_count: number;
  malicious_count: number;
  safe_count: number;
  recent_scans: Scan[];
  risk_distribution: RiskDistribution;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
  remember_me?: boolean;
}

export interface SignupData {
  full_name: string;
  email: string;
  password: string;
  confirm_password?: string;
}

export interface BatchScanRequest {
  urls: string[];
}

export interface BatchScanResult {
  total: number;
  scanned: number;
  results: Scan[];
}

export interface FileScanResult {
  file_name: string;
  extracted_urls_count: number;
  urls: string[];
  results: Scan[];
}

export interface FeedbackRequest {
  scan_id: string;
  rating?: number;
  is_accurate: boolean;
  comment?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  verdict?: string;
  start_date?: string;
  end_date?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}
