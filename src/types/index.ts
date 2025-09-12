export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  created_at: string;
}

export type UserRole = 'admin' | 'project_manager' | 'site_engineer' | 'accountant' | 'client';

export interface Project {
  id: string;
  name: string;
  type: string;
  location: string;
  start_date: string;
  end_date: string;
  manager_id: string;
  budget: number;
  status: 'planning' | 'active' | 'completed' | 'on_hold';
  created_at: string;
}

export interface ProjectPhase {
  id: string;
  project_id: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  status: 'not_started' | 'in_progress' | 'completed';
  progress: number;
}

export interface Task {
  id: string;
  phase_id: string;
  name: string;
  description: string;
  assigned_to: string;
  due_date: string;
  status: 'todo' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
}

export interface Expense {
  id: string;
  project_id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  vendor: string;
  invoice_url?: string;
  approved: boolean;
}

export interface Material {
  id: string;
  name: string;
  unit: string;
  cost_per_unit: number;
  vendor_id: string;
  stock_quantity: number;
}

export interface Labour {
  id: string;
  worker_name: string;
  project_id: string;
  hours_worked: number;
  rate_per_hour: number;
  date: string;
  status: 'pending' | 'paid';
}
