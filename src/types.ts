export interface UserProfile {
  id: string;
  username: string;
  role: "admin" | "editor" | "viewer" | "pending";
  unit?: string;
  full_name: string;
  created_at: string;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string;
    email: string;
    emailVerified: boolean;
    isAnonymous: boolean;
    tenantId: string;
    providerInfo: {
      providerId: string;
      displayName: string;
      email: string;
      photoUrl: string;
    }[];
  }
}

export interface NewsItem {
  id: string;
  title: string;
  title_fr?: string;
  content: string;
  content_fr?: string;
  summary?: string;
  summary_fr?: string;
  image_url?: string;
  category: string;
  author: string;
  created_at: string;
  updated_at: string;
}

export interface EventItem {
  id: string;
  title: string;
  title_fr?: string;
  description: string;
  description_fr?: string;
  event_date: string;
  location?: string;
  location_fr?: string;
  event_type: string;
  category?: string;
  image_url?: string;
  created_by: string;
  created_at: string;
}

export interface GalleryImage {
  id: string;
  title: string;
  description?: string;
  names?: string;
  image_url: string;
  category: string;
  uploaded_by: string;
  created_at: string;
}

export interface Message {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: 'unread' | 'read';
  created_at: string;
}

export interface DocumentItem {
  id: string;
  title: string;
  category: 'SOP' | 'Manual' | 'Directive' | 'Report';
  file_url: string;
  uploaded_by: string;
  created_at: string;
}

export interface ChatLog {
  user_id: string;
  user_name: string;
  user_unit: string;
  question: string;
  answer: string;
  created_at: string;
}

export interface InternalMail {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_unit: string;
  receiver_id?: string;
  receiver_unit?: string;
  subject: string;
  body: string;
  is_read: boolean;
  attachments?: string[];
  created_at: string;
}

export interface ChronicleRecord {
  id: string;
  name: string;
  unit: 'MHQ' | 'FHQ' | 'SENBAT' | 'NIGCOY' | 'GHANCOY' | 'SENFPU';
  years: string;
  image_url?: string;
  created_at: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
}

export interface Leader {
  id: string;
  name: string;
  title: string;
  position: string;
  unit?: string;
  image_url?: string;
  bio?: string;
  order: number;
}
