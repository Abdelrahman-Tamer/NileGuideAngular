import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, of } from 'rxjs';
import { STORED_KEYS } from '../../constants/Stored_keys';

export interface CreateAiConversationResponse {
  conversation_id: string;
}

export interface ChatRequest {
  text: string;
  limit: number;
  conversation_id: string;
}

export interface ChatSource {
  document_name?: string;
  file_name?: string;
  page?: number;
  text?: string;
  score?: number;
}

export interface ChatResponse {
  signal: string;
  message: string;
  answer: string;
  sources?: ChatSource[];
}

export interface RetrievedHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

export interface RetrievedConversationResponse {
  conversation_id: string;
  history: RetrievedHistoryItem[];
  created_at?: string;
  updated_at?: string;
}

export interface SavedConversationResponse {
  conversationId?: string;
  conversation_id?: string;
  id?: string;
  title?: string;
  updatedAt?: string;
  updated_at?: string;
}

export interface SavedConversationItem {
  conversationId: string;
  title?: string;
  updatedAt?: string;
}

export interface AiConversationMetadata {
  conversation_id: string;
  title?: string;
  updated_at?: string;
}

export interface AiConversationsListResponse {
  conversations?: any[];
  items?: any[];
  data?: any[];
}

@Injectable({
  providedIn: 'root',
})
export class ChatbotService {
  private readonly http = inject(HttpClient);

  private readonly aiBaseUrl = 'http://32.195.230.191:5000/api/v1/nlp';
  private readonly backendChatUrl = `${STORED_KEYS.baseUrl}/chat/conversations`;

  createAiConversation(): Observable<CreateAiConversationResponse> {
    return this.http.post<CreateAiConversationResponse>(
      `${this.aiBaseUrl}/conversation`,
      {}
    );
  }

  sendMessage(text: string, conversationId: string): Observable<ChatResponse> {
    const payload: ChatRequest = {
      text,
      limit: 5,
      conversation_id: conversationId,
    };

    return this.http.post<ChatResponse>(`${this.aiBaseUrl}/chat`, payload);
  }

  retrieveConversation(
    conversationId: string
  ): Observable<RetrievedConversationResponse> {
    return this.http.get<RetrievedConversationResponse>(
      `${this.aiBaseUrl}/conversation/${conversationId}`
    );
  }

  getAiConversationsByIds(
    conversationIds: string[]
  ): Observable<AiConversationMetadata[]> {
    const ids = conversationIds
      .map((id) => id.trim())
      .filter((id) => id.length > 0);

    if (!ids.length) {
      return of([]);
    }

    const params = new HttpParams().set('ids', ids.join(','));

    return this.http
      .get<AiConversationsListResponse>(`${this.aiBaseUrl}/conversations/`, {
        params,
      })
      .pipe(
        map((response) => {
          const list =
            response?.conversations ??
            response?.items ??
            response?.data ??
            [];

          if (!Array.isArray(list)) {
            return [];
          }

          return list
            .map((item: any) => ({
              conversation_id: String(
                item?.conversation_id ??
                  item?.conversationId ??
                  item?.id ??
                  ''
              ).trim(),
              title: String(item?.title ?? '').trim(),
              updated_at: String(
                item?.updated_at ??
                  item?.updatedAt ??
                  item?.modified_at ??
                  item?.modifiedAt ??
                  ''
              ).trim(),
            }))
            .filter((item) => item.conversation_id.length > 0);
        })
      );
  }

  saveConversationForUser(conversationId: string): Observable<void> {
    return this.http.post<void>(this.backendChatUrl, {
      conversationId,
    });
  }

  getSavedConversations(): Observable<SavedConversationItem[]> {
    return this.http
      .get<unknown>(this.backendChatUrl)
      .pipe(map((response) => this.normalizeSavedConversations(response)));
  }

  deleteConversation(conversationId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.backendChatUrl}/${encodeURIComponent(conversationId)}`
    );
  }

  private normalizeSavedConversations(response: unknown): SavedConversationItem[] {
    if (Array.isArray(response)) {
      return response
        .map((item) => this.extractSavedConversation(item))
        .filter((item): item is SavedConversationItem => !!item);
    }

    const anyResponse = response as any;

    const list =
      anyResponse?.items ??
      anyResponse?.data ??
      anyResponse?.conversations ??
      anyResponse?.conversationIds ??
      [];

    if (!Array.isArray(list)) {
      return [];
    }

    return list
      .map((item) => this.extractSavedConversation(item))
      .filter((item): item is SavedConversationItem => !!item);
  }

  private extractSavedConversation(item: unknown): SavedConversationItem | null {
    if (typeof item === 'string') {
      const id = item.trim();

      if (!id) return null;

      return {
        conversationId: id,
      };
    }

    const value = item as SavedConversationResponse;

    const conversationId = String(
      value?.conversationId ||
        value?.conversation_id ||
        value?.id ||
        ''
    ).trim();

    if (!conversationId) {
      return null;
    }

    return {
      conversationId,
      title: value?.title ? String(value.title).trim() : '',
      updatedAt: String(value?.updatedAt || value?.updated_at || '').trim(),
    };
  }
}