import { invoke } from '@tauri-apps/api/core';
import type { SmsModel } from '@/features/sound-design/types/sms';

let bankRootCached: string | null = null;

export async function getBankRoot(): Promise<string> {
  if (!bankRootCached) bankRootCached = await invoke<string>('fs_bank_dir');
  return bankRootCached;
}

export async function saveModelFile(model: SmsModel): Promise<void> {
  await getBankRoot();
  const relPath = `models/sms/${model.meta.id}.json`;
  const json = JSON.stringify(model, null, 2);
  await invoke('fs_write_text', { relPath, contents: json });
}

export async function deleteModelFile(id: string): Promise<void> {
  await getBankRoot();
  const relPath = `models/sms/${id}.json`;
  await invoke('fs_remove', { relPath });
}

export async function loadAllModelFiles(): Promise<SmsModel[]> {
  await getBankRoot();
  const names = await invoke<string[]>('fs_read_dir', { relDir: 'models/sms' });
  const models: SmsModel[] = [];
  for (const name of names) {
    if (!name.endsWith('.json')) continue;
    const relPath = `models/sms/${name}`;
    const raw = await invoke<string>('fs_read_text', { relPath });
    try {
      const obj = JSON.parse(raw);
      // Minimal guard
      if (obj && obj.method === 'sms' && obj.meta?.id) models.push(obj as SmsModel);
    } catch {
      // ignore malformed
    }
  }
  return models;
}