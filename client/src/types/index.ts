// User types
export interface User {
  id: string;
  email: string;
  name: string;
  fullName?: string;
  role: 'admin' | 'user';
  profilePhotoUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

// Job types
export interface Job {
  _id: string;
  title: string;
  company: string;
  location: string;
  department: string;
  type: 'full-time' | 'part-time' | 'contract' | 'internship';
  description: string;
  requirements: string[];
  responsibilities: string[];
  salary?: {
    min: number;
    max: number;
    currency: string;
  };
  status: 'open' | 'closed' | 'draft';
  postedBy: string;
  postedDate: string;
  deadline?: string;
  applicantsCount?: number;
  createdAt: string;
  updatedAt: string;
}

// Application types
export interface Application {
  _id: string;
  jobId: string;
  userId: string;
  userName: string;
  userEmail: string;
  status: 'pending' | 'reviewing' | 'shortlisted' | 'rejected' | 'accepted';
  resume: string;
  coverLetter?: string;
  appliedDate: string;
  updatedAt: string;
  job?: Job;
}

// Dashboard types
export interface DashboardMetrics {
  totalJobs: number;
  activeJobs: number;
  totalApplications: number;
  pendingApplications: number;
  acceptedApplications: number;
  rejectedApplications: number;
}

export interface RecentActivity {
  id: string;
  type: 'application' | 'job' | 'status_change';
  title: string;
  description: string;
  timestamp: string;
  status?: string;
}

export interface JobStatusData {
  name: string;
  value: number;
  color: string;
}

// Filter types
export interface JobFilters {
  status: string;
  department: string;
  location: string;
  type?: string;
}

export interface ApplicationFilters {
  status: string;
  jobId?: string;
}

// Form types
export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface JobFormData {
  title: string;
  company: string;
  location: string;
  department: string;
  type: 'full-time' | 'part-time' | 'contract' | 'internship';
  description: string;
  requirements: string[];
  responsibilities: string[];
  salary?: {
    min: number;
    max: number;
    currency: string;
  };
  status: 'open' | 'closed' | 'draft';
  deadline?: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Context types
export interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  setIsAuthenticated: (value: boolean) => void;
  setUser: (user: User | null) => void;
  logout: () => void;
}

export interface DashboardContextType {
  refreshTrigger: number;
  triggerRefresh: () => void;
  triggerDashboardRefresh?: () => void; // Legacy support
}

// Component prop types
export interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

export interface JobCardProps {
  job: Job;
  isAdmin?: boolean;
}

export interface ApplicantsListProps {
  jobId: string;
}

export interface FilterPanelProps {
  filters: JobFilters;
  onFilterChange: (filters: JobFilters) => void;
  isOpen: boolean;
  onClose: () => void;
}

export interface MetricCardProps {
  title: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  description?: string;
}
