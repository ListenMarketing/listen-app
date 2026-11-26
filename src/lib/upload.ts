import { File } from 'expo-file-system';
import type { UploadTarget } from '@/api/types';
import { ApiError } from '@/api/client';
import { getApiLanguage } from '@/api/normalize';

/**
 * Carica un file SOLO nei bucket privati di Listen, usando l'URL firmato
 * che arriva dalle API. `onProgress` va da 0 a 1 per la barra di avanzamento.
 */
export async function uploadToSignedUrl(target: UploadTarget, fileUri: string, contentType: string, onProgress?: (fraction: number) => void): Promise<void> {
  const failed = getApiLanguage() === 'en' ? 'Upload failed. Check your connection and try again.' : 'Caricamento non riuscito. Controlla la rete e riprova.';
  let status = 0;
  try {
    const res = await new File(fileUri).upload(target.url, {
      httpMethod: target.method,
      headers: { 'Content-Type': contentType, ...target.headers },
      onProgress: (p) => {
        if (onProgress && p.totalBytes > 0) onProgress(Math.min(1, p.bytesSent / p.totalBytes));
      },
    });
    status = res.status;
  } catch {
    throw new ApiError({ message: failed, status: 0, network: true });
  }
  if (status < 200 || status >= 300) throw new ApiError({ message: failed, status });
  onProgress?.(1);
}
