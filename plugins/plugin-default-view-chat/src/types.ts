export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  error?: boolean;
}

export interface ChatSession {
  paneId: string;
  messages: Message[];
  isStreaming: boolean;
  currentStreamingMessageId?: string;
}

export interface SendMessagePayload {
  paneId: string;
  content: string;
}

export interface StreamChunkPayload {
  paneId: string;
  messageId: string;
  chunk: string;
}

export interface StreamCompletePayload {
  paneId: string;
  messageId: string;
}

export interface StreamErrorPayload {
  paneId: string;
  messageId: string;
  error: string;
}

export interface LoadHistoryPayload {
  paneId: string;
}

export interface ClearHistoryPayload {
  paneId: string;
}

export interface ChatHistoryResponse {
  messages: Message[];
}
