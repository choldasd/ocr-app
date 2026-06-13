const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

// ─── Single OCR ───────────────────────────────────────────────────────────────

export async function extractOCR(
  file: File,
  onProgress?: (percent: number) => void
): Promise<Response> {
  const formData = new FormData();
  formData.append("file", file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable && onProgress) {
        const percent = Math.round((e.loaded / e.total) * 100);
        onProgress(percent);
      }
    });

    xhr.addEventListener("load", () => {
      const response = new Response(xhr.response, {
        status: xhr.status,
        statusText: xhr.statusText,
        headers: { "Content-Type": "application/json" },
      });
      resolve(response);
    });

    xhr.addEventListener("error", () => reject(new Error("Network error during upload")));
    xhr.addEventListener("abort", () => reject(new Error("Upload aborted")));

    xhr.open("POST", `${API_BASE}/ocr/extract`);
    xhr.responseType = "text";
    xhr.send(formData);
  });
}

export async function getDocuments(skip = 0, limit = 20) {
  const res = await fetch(`${API_BASE}/ocr/documents?skip=${skip}&limit=${limit}`);
  if (!res.ok) throw new Error("Failed to fetch documents");
  return res.json();
}

export async function getDocument(id: number) {
  const res = await fetch(`${API_BASE}/ocr/documents/${id}`);
  if (!res.ok) throw new Error("Failed to fetch document");
  return res.json();
}

export async function checkHealth() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error("Backend not available");
  return res.json();
}

// ─── Batch API ────────────────────────────────────────────────────────────────

export async function createBatch(totalFiles: number) {
  const res = await fetch(`${API_BASE}/ocr/batches`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ total_files: totalFiles }),
  });
  if (!res.ok) throw new Error("Failed to create batch");
  return res.json();
}

export async function uploadBatchChunk(
  batchUuid: string,
  files: File[],
  onProgress?: (percent: number) => void
): Promise<Response> {
  const formData = new FormData();
  files.forEach((f) => formData.append("files", f));

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener("load", () => {
      resolve(
        new Response(xhr.response, {
          status: xhr.status,
          headers: { "Content-Type": "application/json" },
        })
      );
    });

    xhr.addEventListener("error", () => reject(new Error("Network error")));
    xhr.addEventListener("abort", () => reject(new Error("Upload aborted")));

    xhr.open("POST", `${API_BASE}/ocr/batches/${batchUuid}/upload`);
    xhr.responseType = "text";
    xhr.send(formData);
  });
}

export async function listBatches(skip = 0, limit = 20) {
  const res = await fetch(`${API_BASE}/ocr/batches?skip=${skip}&limit=${limit}`);
  if (!res.ok) throw new Error("Failed to fetch batches");
  return res.json();
}

export async function getBatch(batchUuid: string) {
  const res = await fetch(`${API_BASE}/ocr/batches/${batchUuid}`);
  if (!res.ok) throw new Error("Failed to fetch batch");
  return res.json();
}

export async function getBatchAnalytics() {
  const res = await fetch(`${API_BASE}/ocr/batches/analytics`);
  if (!res.ok) throw new Error("Failed to fetch analytics");
  return res.json();
}

export async function retryBatch(batchUuid: string) {
  const res = await fetch(`${API_BASE}/ocr/batches/${batchUuid}/retry`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to retry batch");
  return res.json();
}

export async function cancelBatch(batchUuid: string) {
  const res = await fetch(`${API_BASE}/ocr/batches/${batchUuid}/cancel`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to cancel batch");
  return res.json();
}

export function getBatchExportUrl(batchUuid: string, format: "json" | "csv" | "excel" | "pdf") {
  return `${API_BASE}/ocr/batches/${batchUuid}/export?format=${format}`;
}

export function createBatchWebSocket(batchUuid: string): WebSocket {
  const wsBase = API_BASE.replace(/^http/, "ws");
  return new WebSocket(`${wsBase}/ocr/batches/${batchUuid}/ws`);
}
