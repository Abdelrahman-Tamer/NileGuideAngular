import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AiFileAsset {
  file_id: string;
  asset_name: string;
  file_size: number;
  uploaded_at: string | null;
}

export interface AiFilesListResponse {
  assets: AiFileAsset[];
}

@Injectable({
  providedIn: 'root',
})
export class AdminChatbotService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl = 'http://32.195.230.191:5000/api/v1/data';

  getFiles(): Observable<AiFilesListResponse> {
    return this.http.get<AiFilesListResponse>(`${this.baseUrl}/files`);
  }

  uploadFiles(
    files: File[],
    chunkSize: number = 500,
    overlapSize: number = 20,
  ): Observable<unknown> {
    const formData = new FormData();

    files.forEach((file) => {
      formData.append('files', file, file.name);
    });

    formData.append('chunk_size', String(chunkSize));
    formData.append('overlap_size', String(overlapSize));

    return this.http.post(`${this.baseUrl}/multi-upload`, formData);
  }

  updateFile(
    fileId: string,
    file: File,
    chunkSize: number = 500,
    overlapSize: number = 20,
  ): Observable<unknown> {
    const formData = new FormData();

    formData.append('file', file, file.name);
    formData.append('chunk_size', String(chunkSize));
    formData.append('overlap_size', String(overlapSize));

    return this.http.put(
      `${this.baseUrl}/file/${encodeURIComponent(fileId)}`,
      formData,
    );
  }

  deleteFile(fileId: string): Observable<unknown> {
    return this.http.delete(`${this.baseUrl}/file/${encodeURIComponent(fileId)}`);
  }
}