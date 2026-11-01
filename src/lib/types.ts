export interface Profile {
  id: string;
  email: string;
  role: 'user' | 'admin';
  created_at: string;
}

export interface Assistant {
  id: string;
  user_id: string;
  name: string;
  welcome_message: string;
  instructions: string;
  primary_color: string;
  language: 'ar' | 'en';
  direction: 'rtl' | 'ltr';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeSource {
  id: string;
  assistant_id: string;
  user_id: string;
  title: string;
  content: string;
  source_type: 'text' | 'qa';
  question: string | null;
  created_at: string;
}

export interface Conversation {
  id: string;
  assistant_id: string;
  visitor_id: string;
  visitor_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface UsageLog {
  id: string;
  assistant_id: string;
  user_id: string;
  visitor_id: string | null;
  conversation_id: string | null;
  tokens_used: number;
  created_at: string;
}

export interface ConversationWithMessages extends Conversation {
  messages: Message[];
  message_count?: number;
  last_message?: string;
}
