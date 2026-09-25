export type UserRole = 'admin' | 'member';
export type UserStatus = 'approved' | 'pending' | 'rejected';

export interface User {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  status: UserStatus;
  email?: string;
  department: string;
  position?: string;
  avatarUrl?: string;
  password?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  driveFileId: string;
  driveFolderId?: string;
  downloadUrl: string;
  viewUrl: string;
  previewType: 'pdf' | 'image' | 'doc' | 'spreadsheet' | 'presentation' | 'other';
  previewContent?: string; // Embedded base64 or mock preview content
  fileDataUrl?: string; // Real binary data URL for 100% authentic original file download
  uploadedAt: string;
}

export interface Assignment {
  id: string;
  title: string;
  description: string;
  dueDateStart: string; // YYYY-MM-DD
  dueDateEnd: string;   // YYYY-MM-DD
  academicYear: string;
  term: string;
  createdBy: string;
  createdByName: string;
  driveFolderId: string;
  driveFolderName: string;
  status: 'open' | 'closed';
  type: 'assignment' | 'announcement';
  allowedFileTypes?: string[];
  maxFileSizeMb?: number;
  isMarkedCompleted?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Submission {
  id: string;
  assignmentId: string;
  assignmentTitle: string;
  memberId: string;
  memberName: string;
  memberAvatar?: string;
  department: string;
  files: UploadedFile[];
  note?: string;
  submissionDate: string; // YYYY-MM-DD
  status: 'submitted' | 'late' | 'reviewed';
  feedback?: string;
  score?: number;
  createdAt: string;
  updatedAt: string;
}

export type DocumentCategory = 'sample' | 'order' | 'general';

export interface DocumentItem {
  id: string;
  title: string;
  category: DocumentCategory;
  description?: string;
  docNumber?: string;
  issueDate: string;
  file: UploadedFile;
  uploaderId: string;
  uploaderName: string;
  downloadCount: number;
  isPinned?: boolean;
  pinnedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  type: 'deadline' | 'general' | 'urgent'; // red vs yellow
  date: string;
  dateStart?: string;
  dateEnd?: string;
  assignmentId?: string;
  authorName: string;
  isUrgent?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SchoolProfile {
  id: string;
  name: string;
  subName: string;
  masterAdminName: string;
  logoUrl: string;
  primaryDriveFolderId: string;
  academicYear: string;
  semester: string;
  updatedAt: string;
}

export interface RecommendedWebsite {
  id: string;
  title: string;
  description: string;
  url: string;
  imageUrl?: string;
  driveFileId?: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export type ActiveTab = 'dashboard' | 'assignments' | 'tracking' | 'documents' | 'websites' | 'settings' | 'developer';
export type NavTab = ActiveTab;
