export interface ExperienceItem {
  title: string;
  company: string;
  duration?: string;
  description?: string;
}

export interface EducationItem {
  school: string;
  degree?: string;
  fieldOfStudy?: string;
}

export interface ProfileDetails {
  name: string;
  headline: string;
  currentPosition?: string;
  company?: string;
  location?: string;
  about?: string;
  experience: ExperienceItem[];
  education: EducationItem[];
  skills: string[];
  certifications?: string[];
  recentPosts?: string[];
}

export type MessageTone = 'Professional' | 'Friendly' | 'Formal' | 'Confident' | 'Warm' | 'Direct' | 'Humble';
export type MessageLength = 'Short' | 'Medium' | 'Long';
export type MessagePurpose = 'Networking' | 'Business' | 'Internship' | 'Mentorship' | 'Recruitment' | 'Sales' | 'General';

export interface UserPreferences {
  openAiKey: string;
  defaultTone: MessageTone;
  defaultLength: MessageLength;
  defaultPurpose: MessagePurpose;
  isPremium: boolean;
}

export interface GenerationRequest {
  type: 'connection' | 'chat';
  profile: ProfileDetails;
  category?: string;       // e.g., "Professional Networking", "Alumni", "Founder"
  customPrompt?: string;   // Optional custom instructions from the user
  chatHistory?: string[];  // Context from chat
  preferences: UserPreferences;
}

export interface GenerationResponse {
  success: boolean;
  suggestions?: string[];
  error?: string;
}

export interface ScheduledMessage {
  id: string;
  recipientName: string;
  conversationUrl: string;
  messageText: string;
  scheduledTime: number; // timestamp
  status: 'pending' | 'sending' | 'sent' | 'failed';
  error?: string;
}
