import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-admin-chatbot',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-chatbot.component.html',
})
export class AdminChatbotComponent {
  isOpen = false;
  isDragging = false;

  files: File[] = [];

  togglePanel(): void {
    this.isOpen = !this.isOpen;
  }

  closePanel(): void {
    this.isOpen = false;
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

  formatFileSize(size: number): string {
    if (size < 1024) {
      return `${size} B`;
    }

    if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(1)} KB`;
    }

    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
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
    if (extension === 'ppt' || extension === 'pptx') return 'fa-file-powerpoint';
    if (extension === 'jpg' || extension === 'jpeg' || extension === 'png' || extension === 'webp') {
      return 'fa-file-image';
    }

    return 'fa-file';
  }

  private addFiles(fileList: FileList): void {
    const selectedFiles = Array.from(fileList);
    this.files = [...this.files, ...selectedFiles];
  }
}