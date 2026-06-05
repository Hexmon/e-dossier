import { api } from '@/app/lib/apiClient';
import { endpoints } from '@/constants/endpoints';

export type SsbUploadItem = {
  ocId: string;
  ocNo: string;
  name: string;
  courseId: string;
  fileName?: string | null;
  sizeBytes?: number | null;
  uploadedAt?: string | null;
  hasUpload: boolean;
  savedPassword?: string | null;
};

export function listSsbUploadOcs(courseId: string) {
  return api.get<{ items: SsbUploadItem[] }>(endpoints.admin.ssbUpload.list, {
    query: { courseId },
  });
}

export function getSsbUploadForOc(ocId: string) {
  return api.get<{ item: SsbUploadItem }>(endpoints.admin.ssbUpload.list, {
    query: { ocId },
  });
}

export function uploadSsbPdf(ocId: string, payload: { file: File; password: string }) {
  const form = new FormData();
  form.set('file', payload.file);
  form.set('password', payload.password);
  return api.post<{ item: SsbUploadItem }, FormData>(endpoints.admin.ssbUpload.upload(ocId), form);
}

async function getCsrfToken() {
  const response = await fetch('/api/v1/health', { method: 'GET', credentials: 'include' });
  return response.headers.get('X-CSRF-Token');
}

export async function openSsbPdf(ocId: string, password: string) {
  const csrf = await getCsrfToken();
  const response = await fetch(endpoints.admin.ssbUpload.view(ocId), {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(csrf ? { 'X-CSRF-Token': csrf } : {}),
    },
    body: JSON.stringify({ password }),
  });

  if (!response.ok) {
    let message = 'Unable to open SSB PDF.';
    try {
      const body = await response.json();
      if (body?.message) message = body.message;
    } catch {
      // no-op
    }
    throw new Error(message);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener,noreferrer');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
