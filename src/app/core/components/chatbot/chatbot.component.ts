import { CommonModule } from '@angular/common';
import { Component, ChangeDetectorRef, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';

import { STORED_KEYS } from '../../constants/Stored_keys';
import { ScheduleService } from '../../../features/schedule/schedule.service';
import {
  AiConversationMetadata,
  ChatbotService,
  RetrievedConversationResponse,
  SavedConversationItem,
} from './chatbot.service';

export interface ActivityItem {
  id: number;
  title: string;
  city?: string;
  category?: string;
  price?: string;
  imageUrl?: string;
  link?: string;
}

interface ChatMessage {
  sender: 'bot' | 'user';
  text: string;
  activities?: ActivityItem[];
}

interface ConversationItem {
  conversationId: string;
  title: string;
  updatedAt?: string;
  isLoading?: boolean;
}

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './chatbot.component.html',
})
export class ChatbotComponent implements OnInit {
  private readonly chatbotService = inject(ChatbotService);
  private readonly scheduleService = inject(ScheduleService);
  private readonly toastr = inject(ToastrService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly router = inject(Router);

  // Schedule modal state
  selectedActivityForPlan: ActivityItem | null = null;
  planDate = '';
  planTime = '10:00';
  isAddingToSchedule = false;

  readonly fallbackImage = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100%" height="100%" fill="%231b1915"/><path d="M50 20 L80 80 L20 80 Z" fill="none" stroke="%23eab308" stroke-width="4"/><circle cx="50" cy="55" r="10" fill="%23eab308"/></svg>';

  onImageError(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (target) {
      target.onerror = null;
      target.src = this.fallbackImage;
    }
  }

  isOpen = false;
  isSending = false;
  isHistoryOpen = false;
  isLoadingConversations = false;
  isLoadingConversation = false;

  messageText = '';
  errorMessage = '';

  currentConversationId = '';
  savedConversations: ConversationItem[] = [];
  messages: ChatMessage[] = [];

  ngOnInit(): void {
    this.loadSavedConversations();
  }

  toggleChat(): void {
    this.isOpen = !this.isOpen;

    if (this.isOpen) {
      this.loadSavedConversations();
    }

    this.cdr.detectChanges();
  }

  closeChat(): void {
    this.isOpen = false;
    this.cdr.detectChanges();
  }

  toggleHistory(): void {
    this.isHistoryOpen = !this.isHistoryOpen;

    if (this.isHistoryOpen) {
      this.loadSavedConversations();
    }

    this.cdr.detectChanges();
  }

  startNewChat(): void {
    this.currentConversationId = '';
    this.messages = [];
    this.errorMessage = '';
    this.isHistoryOpen = false;
    this.cdr.detectChanges();
  }

  sendMessage(): void {
    const text = this.messageText.trim();

    if (!text || this.isSending) return;

    this.messages.push({
      sender: 'user',
      text,
    });

    this.messageText = '';
    this.errorMessage = '';
    this.isSending = true;
    this.cdr.detectChanges();

    if (!this.currentConversationId) {
      this.createConversationThenSend(text);
      return;
    }

    this.sendMessageToConversation(text, this.currentConversationId);
  }

  openConversation(conversationId: string): void {
    if (!conversationId || this.isLoadingConversation) return;

    this.errorMessage = '';
    this.isLoadingConversation = true;
    this.currentConversationId = conversationId;
    this.isHistoryOpen = false;
    this.cdr.detectChanges();

    this.chatbotService
      .retrieveConversation(conversationId)
      .pipe(
        finalize(() => {
          this.isLoadingConversation = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          this.messages = this.mapRetrievedHistoryToMessages(response);
          this.updateConversationTitleFromRetrievedHistory(response);
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Retrieve conversation error:', error);
          this.errorMessage = 'Failed to load this conversation.';
          this.cdr.detectChanges();
        },
      });
  }

  deleteConversation(event: MouseEvent, conversationId: string): void {
    event.stopPropagation();

    if (!conversationId) return;

    this.chatbotService.deleteConversation(conversationId).subscribe({
      next: () => {
        this.savedConversations = this.savedConversations.filter(
          (item) => item.conversationId !== conversationId
        );

        if (this.currentConversationId === conversationId) {
          this.startNewChat();
        }

        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Delete conversation error:', error);
        this.errorMessage = 'Failed to delete conversation.';
        this.cdr.detectChanges();
      },
    });
  }

  private createConversationThenSend(text: string): void {
    this.chatbotService.createAiConversation().subscribe({
      next: (response) => {
        const conversationId = response.conversation_id;

        if (!conversationId) {
          this.isSending = false;
          this.errorMessage = 'Failed to create conversation.';
          this.cdr.detectChanges();
          return;
        }

        this.currentConversationId = conversationId;

        this.chatbotService.saveConversationForUser(conversationId).subscribe({
          next: () => {
            this.addConversationToList(conversationId, text);
            this.sendMessageToConversation(text, conversationId);
          },
          error: (error) => {
            console.error('Save conversation error:', error);

            this.addConversationToList(conversationId, text);
            this.sendMessageToConversation(text, conversationId);
          },
        });
      },
      error: (error) => {
        console.error('Create conversation error:', error);

        this.errorMessage = 'Failed to start a new conversation.';
        this.isSending = false;
        this.cdr.detectChanges();
      },
    });
  }

  private sendMessageToConversation(
    text: string,
    conversationId: string
  ): void {
    this.chatbotService
      .sendMessage(text, conversationId)
      .pipe(
        finalize(() => {
          this.isSending = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          const activities: ActivityItem[] = [];
          const seenIds = new Set<number>();

          if (response.sources && Array.isArray(response.sources)) {
            for (const src of response.sources) {
              const id = Number(src.activity_id);
              if (id && !seenIds.has(id)) {
                seenIds.add(id);
                activities.push({
                  id,
                  title: src.title || `نشاط ${id}`,
                  city: src.city || undefined,
                  category: src.category || undefined,
                  price: src.price || undefined,
                  imageUrl: src.image_url || '/Photo/Aswan.png',
                  link: src.link || `/activities/${id}`,
                });
              }
            }
          }

          if (response.answer?.trim()) {
            this.messages.push({
              sender: 'bot',
              text: response.answer.trim(),
              activities: activities.slice(0, 3),
            });
          }

          this.updateLocalConversationTitle(conversationId, text);
          this.refreshConversationMetadata();
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Chatbot API error:', error);
          this.errorMessage = 'Connection error. Please try again.';
          this.cdr.detectChanges();
        },
      });
  }


  openScheduleModal(act: ActivityItem): void {
    this.selectedActivityForPlan = act;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    this.planDate = tomorrow.toISOString().split('T')[0];
    this.planTime = '10:00';
    this.cdr.detectChanges();
  }

  closeScheduleModal(): void {
    this.selectedActivityForPlan = null;
    this.cdr.detectChanges();
  }

  confirmAddToSchedule(): void {
    const token = localStorage.getItem(STORED_KEYS.USER_TOKEN);
    if (!token) {
      this.toastr.warning('يرجى تسجيل الدخول أولاً لإضافة الأنشطة إلى جدولك');
      try {
        sessionStorage.setItem(
          'pending_schedule_activity',
          JSON.stringify({
            activity: this.selectedActivityForPlan,
            planDate: this.planDate,
            planTime: this.planTime,
          })
        );
      } catch {}
      this.closeScheduleModal();
      this.closeChat();
      this.router.navigate(['/auth/login'], {
        queryParams: { returnUrl: '/activities' },
      });
      return;
    }

    if (!this.selectedActivityForPlan || !this.planDate || !this.planTime) {
      this.toastr.error('يرجى تحديد التاريخ والوقت');
      return;
    }

    this.isAddingToSchedule = true;
    this.cdr.detectChanges();

    const activity = this.selectedActivityForPlan;
    const scheduledDate = this.planDate;
    const startTime = `${this.planTime}:00`;

    this.scheduleService
      .addToSchedule({
        activityId: activity.id,
        scheduledDate,
        startTime,
      })
      .subscribe({
        next: () => {
          this.isAddingToSchedule = false;
          this.toastr.success(`تمت إضافة "${activity.title}" إلى جدول رحلتك بنجاح!`);
          this.closeScheduleModal();
          this.messages.push({
            sender: 'bot',
            text: `✅ تمت إضافة "${activity.title}" إلى جدولك في تاريخ ${scheduledDate} الساعة ${this.planTime}!
يمكنك تصفح وتعديل جدولك من صفحة الجدول.`,
          });
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.isAddingToSchedule = false;
          const msg = err.error?.message || 'تعذر إضافة النشاط إلى الجدول';
          this.toastr.error(msg);
          this.cdr.detectChanges();
        },
      });
  }

  askBotToPlan(act: ActivityItem): void {
    this.messageText = `اعملي جدول لرحلة يتضمن نشاط "${act.title}"`;
    this.sendMessage();
  }

  private loadSavedConversations(): void {
    if (this.isLoadingConversations) return;

    this.isLoadingConversations = true;
    this.cdr.detectChanges();

    this.chatbotService
      .getSavedConversations()
      .pipe(
        finalize(() => {
          this.isLoadingConversations = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (items) => {
          const uniqueItems = this.getUniqueSavedConversations(items);

          this.savedConversations = uniqueItems.map((item, index) => ({
            conversationId: item.conversationId,
            title:
              item.title?.trim() ||
              `Conversation ${index + 1}`,
            updatedAt: item.updatedAt,
          }));

          this.loadConversationMetadata(
            uniqueItems.map((item) => item.conversationId)
          );

          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Load saved conversations error:', error);
          this.savedConversations = [];
          this.cdr.detectChanges();
        },
      });
  }

  private getUniqueSavedConversations(
    items: SavedConversationItem[]
  ): SavedConversationItem[] {
    const map = new Map<string, SavedConversationItem>();

    items.forEach((item) => {
      if (!item.conversationId) return;

      if (!map.has(item.conversationId)) {
        map.set(item.conversationId, item);
      }
    });

    return Array.from(map.values());
  }

  private loadConversationMetadata(conversationIds: string[]): void {
    const ids = Array.from(
      new Set(
        conversationIds
          .map((id) => id.trim())
          .filter((id) => id.length > 0)
      )
    );

    if (!ids.length) return;

    this.chatbotService.getAiConversationsByIds(ids).subscribe({
      next: (metadataList) => {
        this.applyConversationMetadata(metadataList);
        this.fillMissingTitlesFromHistory();
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Load conversation metadata error:', error);
        this.fillMissingTitlesFromHistory();
        this.cdr.detectChanges();
      },
    });
  }

  private refreshConversationMetadata(): void {
    const ids = this.savedConversations.map((item) => item.conversationId);
    this.loadConversationMetadata(ids);
  }

  private applyConversationMetadata(
    metadataList: AiConversationMetadata[]
  ): void {
    const metadataMap = new Map(
      metadataList.map((item) => [item.conversation_id.trim(), item])
    );

    this.savedConversations = this.savedConversations
      .map((item, index) => {
        const metadata = metadataMap.get(item.conversationId.trim());
        const metadataTitle = metadata?.title?.trim();

        return {
          ...item,
          title: metadataTitle
            ? this.truncateTitle(metadataTitle)
            : item.title || `Conversation ${index + 1}`,
          updatedAt: metadata?.updated_at || item.updatedAt,
        };
      })
      .sort((a, b) => {
        const firstDate = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const secondDate = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;

        return secondDate - firstDate;
      });
  }

  private fillMissingTitlesFromHistory(): void {
    const missingTitleItems = this.savedConversations.filter((item) =>
      item.title.startsWith('Conversation ')
    );

    if (!missingTitleItems.length) return;

    const requests = missingTitleItems.map((item) =>
      this.chatbotService.retrieveConversation(item.conversationId).pipe(
        catchError(() => of(null))
      )
    );

    forkJoin(requests).subscribe({
      next: (responses) => {
        responses.forEach((response, index) => {
          if (!response) return;

          const conversationId = missingTitleItems[index].conversationId;
          const itemIndex = this.savedConversations.findIndex(
            (item) => item.conversationId === conversationId
          );

          if (itemIndex === -1) return;

          this.savedConversations[itemIndex] = {
            ...this.savedConversations[itemIndex],
            title: this.getConversationTitleFromHistory(response, itemIndex),
            updatedAt:
              response.updated_at ||
              this.savedConversations[itemIndex].updatedAt,
          };
        });

        this.cdr.detectChanges();
      },
    });
  }

  private mapRetrievedHistoryToMessages(
    response: RetrievedConversationResponse
  ): ChatMessage[] {
    return (response.history ?? [])
      .map((item) => {
        if (item.role === 'user') {
          return {
            sender: 'user' as const,
            text: item.content,
          };
        }

        const activities: ActivityItem[] = [];
        const seenIds = new Set<number>();
        if (item.sources && Array.isArray(item.sources)) {
          for (const src of item.sources) {
            const id = Number(src.activity_id);
            if (id && !seenIds.has(id)) {
              seenIds.add(id);
              activities.push({
                id,
                title: src.title || `نشاط ${id}`,
                city: src.city || undefined,
                category: src.category || undefined,
                price: src.price || undefined,
                imageUrl: src.image_url || this.fallbackImage,
                link: src.link || `/activities/${id}`,
              });
            }
          }
        }

        return {
          sender: 'bot' as const,
          text: item.content,
          activities: activities.length > 0 ? activities.slice(0, 3) : undefined,
        };
      })
      .filter((message) => !!message.text?.trim());
  }

  private updateConversationTitleFromRetrievedHistory(
    response: RetrievedConversationResponse
  ): void {
    const index = this.savedConversations.findIndex(
      (item) => item.conversationId === response.conversation_id
    );

    if (index === -1) return;

    const current = this.savedConversations[index];

    if (current.title && !current.title.startsWith('Conversation ')) {
      return;
    }

    this.savedConversations[index] = {
      ...current,
      title: this.getConversationTitleFromHistory(response, index),
      updatedAt: response.updated_at,
    };
  }

  private getConversationTitleFromHistory(
    response: RetrievedConversationResponse,
    index: number
  ): string {
    const firstUserMessage = response.history?.find(
      (item) => item.role === 'user' && item.content?.trim()
    );

    if (!firstUserMessage) {
      return `Conversation ${index + 1}`;
    }

    return this.truncateTitle(firstUserMessage.content);
  }

  private updateLocalConversationTitle(
    conversationId: string,
    fallbackText: string
  ): void {
    const index = this.savedConversations.findIndex(
      (item) => item.conversationId === conversationId
    );

    if (index === -1) {
      this.addConversationToList(conversationId, fallbackText);
      return;
    }

    const current = this.savedConversations[index];

    if (current.title.startsWith('Conversation ')) {
      this.savedConversations[index] = {
        ...current,
        title: this.truncateTitle(fallbackText),
      };
    }
  }

  private addConversationToList(
    conversationId: string,
    firstMessage: string
  ): void {
    const exists = this.savedConversations.some(
      (item) => item.conversationId === conversationId
    );

    if (exists) return;

    this.savedConversations = [
      {
        conversationId,
        title: this.truncateTitle(firstMessage),
      },
      ...this.savedConversations,
    ];
  }

  private truncateTitle(value: string): string {
    const clean = value.replace(/\s+/g, ' ').trim();

    if (clean.length <= 38) {
      return clean;
    }

    return `${clean.slice(0, 38)}...`;
  }
}