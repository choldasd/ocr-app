export interface OCRPageResult {
  page: number;
  text: string;
  confidence: number;
  engine: string;
}

export interface OCRResponse {
  success: boolean;
  document_id: number;
  filename: string;
  processing_time: string;
  total_pages: number;
  pages: OCRPageResult[];
}

export interface DocumentListItem {
  id: number;
  filename: string;
  file_type: string;
  status: string;
  total_pages: number;
  processing_time_ms: number;
  created_at: string | null;
}

export interface DocumentListResponse {
  total: number;
  documents: DocumentListItem[];
}

export interface DocumentDetail {
  success: boolean;
  document_id: number;
  filename: string;
  file_type: string;
  status: string;
  total_pages: number;
  processing_time: string;
  created_at: string | null;
  pages: {
    page: number;
    results: {
      text: string;
      confidence: number;
      language: string;
      engine: string;
    }[];
  }[];
}

export type UploadStatus = "idle" | "uploading" | "processing" | "completed" | "error";

export type ThemeMode = "light" | "dark";
