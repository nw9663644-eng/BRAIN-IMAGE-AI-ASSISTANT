export enum UserRole {
  DOCTOR = 'DOCTOR',
  PATIENT = 'PATIENT',
  NONE = 'NONE'
}

export type Gender = '男' | '女';

export interface UserProfile {
  id: string; // 身份证号 (18位) 或 工号 (10位)
  role: UserRole;
  name: string;
  password?: string; // In a real app, never store plain text
  gender?: Gender;
  age?: number;
  phone?: string;
  department?: string; // For doctors
  title?: string; // NEW: 职称 (e.g. 主任医师)
  hospital?: string; // NEW: 医院 (e.g. 北京第一人民医院)
  specialties?: string; // NEW: 擅长项目
  registrationDate: string;
}

export interface AnalysisResult {
  riskScore: number; // 0-100
  dominantRegion: string;
  diagnosisSuggestion: string;
  geneCount: number;
}

export interface CellClusterData {
  name: string;
  supercluster: string;
  enrichmentScore: number; // Simulated -log10(P)
  isSignificant: boolean;
  category: 'Psychiatric' | 'Neurological' | 'Structural' | 'Control';
}

export interface BrainRegion {
  id: string;
  name: string;
  description: string;
  associatedDisorders: string[];
  connectivityScore: number; // Simulated Feature Importance
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

// New Interface for Doctor-Patient Chat within a Case
export interface CaseMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  text: string;
  timestamp: string;
}

export interface MedicalCase {
  id: string;
  patientId: string;
  patientName: string;
  imageUrl: string | null;
  description: string;
  timestamp: string; // Real timestamp string
  status: 'pending' | 'completed'; // Simplified status
  doctorFeedback?: string; // Doctor's official diagnosis
  doctorName?: string; // Who replied
  replyTimestamp?: string; // When replied
  messages: CaseMessage[]; // Chat history for this case
  hasUnreadForDoctor: boolean; // Notification flag
  hasUnreadForPatient: boolean; // Notification flag
  modality?: 'CT' | 'MRI' | 'X-Ray' | 'Ultrasound' | 'Other'; // NEW: Image classification
  tags?: string[]; // NEW: Preliminary tags (e.g. "Brain", "Tumor suspected")
}

// NEW: Interfaces for AI Deep Analysis
export interface AIRegionRisk {
  name: string;
  description: string;
  score: number; // 0 to 1
  level: 'Low' | 'Moderate' | 'High Risk';
}

export interface AIAnalysisReport {
  summary: string;
  detailedFindings: string;
  regions: AIRegionRisk[];
  recommendation: string;
}