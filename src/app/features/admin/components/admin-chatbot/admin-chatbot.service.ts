import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { STORED_KEYS } from '../../../../core/constants/Stored_keys';

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

  private readonly baseUrl = STORED_KEYS.AI_DATA_URL;

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
