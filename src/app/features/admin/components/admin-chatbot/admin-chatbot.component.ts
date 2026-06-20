import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { finalize, timeout } from 'rxjs';

import {
  AdminChatbotService,
  AiFileAsset,
} from './admin-chatbot.service';

@Component({
  selector: 'app-admin-chatbot',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-chatbot.component.html',
})
export class AdminChatbotComponent {
  private readonly adminChatbotService = inject(AdminChatbotService);
  private readonly cdr = inject(ChangeDetectorRef);

  isOpen = false;
  isDragging = false;

  files: File[] = [];
  uploadedFiles: AiFileAsset[] = [];

  isLoadingFiles = false;
  isUploading = false;

  updatingFileId: string | null = null;
  deletingFileId: string | null = null;

  fileToDelete: AiFileAsset | null = null;

  errorMessage = '';
  successMessage = '';

  togglePanel(): void {
    this.isOpen = !this.isOpen;

    if (this.isOpen) {
      this.loadFiles();
    }
  }

  closePanel(): void {
    this.isOpen = false;
    this.fileToDelete = null;
  }

  loadFiles(): void {
    this.isLoadingFiles = true;
    this.errorMessage = '';

    this.adminChatbotService
      .getFiles()
      .pipe(timeout(15000))
      .subscribe({
        next: (response) => {
          console.log('AI files response:', response);

          this.uploadedFiles = Array.isArray(response?.assets)
            ? response.assets
            : [];

          this.isLoadingFiles = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Failed to load AI files', error);

          this.uploadedFiles = [];
          this.isLoadingFiles = false;

          if (error?.name === 'TimeoutError') {
            this.errorMessage =
              'AI files server is not responding. Please try again.';
          } else {
            this.errorMessage = this.getErrorMessage(
              error,
              'Failed to load files.',
            );
          }

          this.cdr.detectChanges();
        },
      });
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (!input.files?.length) return;

    this.addFiles(input.files);
    input.value = '';
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;

    if (!event.dataTransfer?.files?.length) return;

    this.addFiles(event.dataTransfer.files);
  }

  removeFile(index: number): void {
    this.files = this.files.filter((_, i) => i !== index);
  }

  clearFiles(): void {
    this.files = [];
  }

  confirmFiles(): void {
    if (this.files.length === 0 || this.isUploading) return;

    this.isUploading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.adminChatbotService
      .uploadFiles(this.files)
      .pipe(
        timeout(60000),
        finalize(() => {
          this.isUploading = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: () => {
          this.successMessage = 'Files uploaded successfully.';
          this.files = [];
          this.loadFiles();
        },
        error: (error) => {
          console.error('Failed to upload files', error);

          if (error?.name === 'TimeoutError') {
            this.errorMessage =
              'Upload is taking too long. Please try again.';
          } else {
            this.errorMessage = this.getErrorMessage(
              error,
              'Failed to upload files.',
            );
          }
        },
      });
  }

  onUpdateFileSelected(event: Event, asset: AiFileAsset): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    input.value = '';

    if (!file || this.updatingFileId) return;

    this.updateFile(asset, file);
  }

  openDeleteModal(asset: AiFileAsset): void {
    this.fileToDelete = asset;
    this.errorMessage = '';
    this.successMessage = '';
  }

  closeDeleteModal(): void {
    if (this.deletingFileId) return;

    this.fileToDelete = null;
  }

  confirmDeleteFile(): void {
    if (!this.fileToDelete || this.deletingFileId) return;

    const selectedFile = this.fileToDelete;

    this.deletingFileId = selectedFile.file_id;
    this.errorMessage = '';
    this.successMessage = '';

    this.adminChatbotService
      .deleteFile(selectedFile.file_id)
      .pipe(
        timeout(15000),
        finalize(() => {
          this.deletingFileId = null;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: () => {
          this.successMessage = 'File deleted successfully.';

          this.uploadedFiles = this.uploadedFiles.filter(
            (file) => file.file_id !== selectedFile.file_id,
          );

          this.fileToDelete = null;
        },
        error: (error) => {
          console.error('Failed to delete file', error);

          if (error?.name === 'TimeoutError') {
            this.errorMessage =
              'Delete request is taking too long. Please try again.';
          } else {
            this.errorMessage = this.getErrorMessage(
              error,
              'Failed to delete file.',
            );
          }
        },
      });
  }

  formatFileSize(size: number): string {
    if (!size || size < 0) return '0 B';

    if (size < 1024) {
      return `${size} B`;
    }

    if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(1)} KB`;
    }

    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  formatUploadedAt(uploadedAt: string | null): string {
    if (!uploadedAt) {
      return 'Uploaded date not available';
    }

    const date = new Date(uploadedAt);

    if (Number.isNaN(date.getTime())) {
      return uploadedAt;
    }

    return date.toLocaleString();
  }

  getFileExtension(fileName: string): string {
    return fileName.split('.').pop()?.toUpperCase() || 'FILE';
  }

  getFileIcon(fileName: string): string {
    const extension = this.getFileExtension(fileName).toLowerCase();

    if (extension === 'pdf') return 'fa-file-pdf';
    if (extension === 'doc' || extension === 'docx') return 'fa-file-word';
    if (extension === 'txt') return 'fa-file-lines';
    if (extension === 'xls' || extension === 'xlsx') return 'fa-file-excel';
    if (extension === 'ppt' || extension === 'pptx') {
      return 'fa-file-powerpoint';
    }

    if (
      extension === 'jpg' ||
      extension === 'jpeg' ||
      extension === 'png' ||
      extension === 'webp'
    ) {
      return 'fa-file-image';
    }

    return 'fa-file';
  }

  private updateFile(asset: AiFileAsset, file: File): void {
    this.updatingFileId = asset.file_id;
    this.errorMessage = '';
    this.successMessage = '';

    this.adminChatbotService
      .updateFile(asset.file_id, file)
      .pipe(
        timeout(60000),
        finalize(() => {
          this.updatingFileId = null;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: () => {
          this.successMessage = 'File updated successfully.';
          this.loadFiles();
        },
        error: (error) => {
          console.error('Failed to update file', error);

          if (error?.name === 'TimeoutError') {
            this.errorMessage =
              'Update request is taking too long. Please try again.';
          } else {
            this.errorMessage = this.getErrorMessage(
              error,
              'Failed to update file.',
            );
          }
        },
      });
  }

  private addFiles(fileList: FileList): void {
    const selectedFiles = Array.from(fileList);

    const existingFiles = new Set(
      this.files.map((file) => `${file.name}-${file.size}-${file.lastModified}`),
    );

    const newFiles = selectedFiles.filter(
      (file) =>
        !existingFiles.has(`${file.name}-${file.size}-${file.lastModified}`),
    );

    this.files = [...this.files, ...newFiles];

    this.errorMessage = '';
    this.successMessage = '';
  }

  private getErrorMessage(error: unknown, fallback: string): string {
    const httpError = error as {
      error?:
        | {
            detail?: string;
            message?: string;
            title?: string;
          }
        | string;
      message?: string;
    };

    if (typeof httpError.error === 'string') {
      return httpError.error;
    }

    if (httpError.error?.detail) {
      return httpError.error.detail;
    }

    if (httpError.error?.message) {
      return httpError.error.message;
    }

    if (httpError.error?.title) {
      return httpError.error.title;
    }

    if (httpError.message) {
      return httpError.message;
    }

    return fallback;
  }
}