import localforage from "localforage";

import type { Subscriber } from "@/types/subscriber";

export const OFFLINE_STORE_EVENT = "offline-store-changed";

const db = localforage.createInstance({
  name: "2b-gym",
  storeName: "offline",
  description: "Offline-first cache + sync queue",
});

const KEYS = {
  subscribers: "subscribers",
  pending: "pending_changes",
  meta: "meta",
  settings: "settings_cache",
  contacts: "contacts_cache",
  templates: "templates_cache",
  pendingSettings: "pending_settings",
} as const;

type Meta = {
  lastSyncAt?: number;
  syncing?: boolean;
};

export type PendingSubscriberChange =
  | {
      id: string;
      entity: "subscriber";
      op: "upsert";
      row: Record<string, any>;
      timestamp: number;
    }
  | {
      id: string;
      entity: "subscriber";
      op: "update";
      subscriberId: string;
      patch: Record<string, any>;
      timestamp: number;
    }
  | {
      id: string;
      entity: "subscriber";
      op: "delete";
      subscriberId: string;
      timestamp: number;
    };

export type PendingSettingsChange = {
  id: string;
  entity: "settings" | "contacts" | "templates";
  data: Record<string, any>;
  timestamp: number;
};

function emitChange(key: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OFFLINE_STORE_EVENT, { detail: { key } }));
}

// ─── Subscribers ───

export async function getCachedSubscribers(): Promise<Subscriber[]> {
  return (await db.getItem<Subscriber[]>(KEYS.subscribers)) ?? [];
}

export async function setCachedSubscribers(subs: Subscriber[]): Promise<void> {
  await db.setItem(KEYS.subscribers, subs);
  emitChange(KEYS.subscribers);
}

// ─── Pending subscriber changes ───

export async function getPendingChanges(): Promise<PendingSubscriberChange[]> {
  return (await db.getItem<PendingSubscriberChange[]>(KEYS.pending)) ?? [];
}

export async function setPendingChanges(changes: PendingSubscriberChange[]): Promise<void> {
  await db.setItem(KEYS.pending, changes);
  emitChange(KEYS.pending);
}

export async function addPendingChange(change: PendingSubscriberChange): Promise<void> {
  const prev = await getPendingChanges();
  
  // Deduplicate: if same entity+subscriberId+op exists, replace with latest
  const deduped = prev.filter(c => {
    if (change.op === 'upsert' && c.op === 'upsert') {
      return !('row' in c && 'row' in change && c.row?.id === change.row?.id);
    }
    if (change.op === 'update' && c.op === 'update') {
      return c.subscriberId !== change.subscriberId;
    }
    if (change.op === 'delete') {
      // Remove any prior updates/upserts for the same subscriber
      if (c.op === 'update' && c.subscriberId === change.subscriberId) return false;
      if (c.op === 'upsert' && 'row' in c && c.row?.id === change.subscriberId) return false;
      if (c.op === 'delete' && c.subscriberId === change.subscriberId) return false;
    }
    return true;
  });
  
  await setPendingChanges([...deduped, change]);
}

export async function removePendingChange(changeId: string): Promise<void> {
  const prev = await getPendingChanges();
  await setPendingChanges(prev.filter((c) => c.id !== changeId));
}

export async function clearPendingChanges(): Promise<void> {
  await db.removeItem(KEYS.pending);
  emitChange(KEYS.pending);
}

// ─── Pending settings changes (settings, contacts, templates) ───

export async function getPendingSettingsChanges(): Promise<PendingSettingsChange[]> {
  return (await db.getItem<PendingSettingsChange[]>(KEYS.pendingSettings)) ?? [];
}

export async function setPendingSettingsChanges(changes: PendingSettingsChange[]): Promise<void> {
  await db.setItem(KEYS.pendingSettings, changes);
  emitChange(KEYS.pendingSettings);
}

export async function addPendingSettingsChange(change: PendingSettingsChange): Promise<void> {
  const prev = await getPendingSettingsChanges();
  // Replace previous change for same entity (only latest matters)
  const filtered = prev.filter(c => c.entity !== change.entity);
  await setPendingSettingsChanges([...filtered, change]);
}

export async function removePendingSettingsChange(changeId: string): Promise<void> {
  const prev = await getPendingSettingsChanges();
  await setPendingSettingsChanges(prev.filter(c => c.id !== changeId));
}

// ─── Settings cache (prices) ───

export async function getCachedSettings(): Promise<Record<string, any> | null> {
  return await db.getItem<Record<string, any>>(KEYS.settings);
}

export async function setCachedSettings(settings: Record<string, any>): Promise<void> {
  await db.setItem(KEYS.settings, settings);
}

// ─── Contacts cache ───

export async function getCachedContacts(): Promise<Record<string, any> | null> {
  return await db.getItem<Record<string, any>>(KEYS.contacts);
}

export async function setCachedContacts(contacts: Record<string, any>): Promise<void> {
  await db.setItem(KEYS.contacts, contacts);
}

// ─── Templates cache ───

export async function getCachedTemplates(): Promise<any[] | null> {
  return await db.getItem<any[]>(KEYS.templates);
}

export async function setCachedTemplates(templates: any[]): Promise<void> {
  await db.setItem(KEYS.templates, templates);
}

// ─── Meta ───

async function getMeta(): Promise<Meta> {
  return (await db.getItem<Meta>(KEYS.meta)) ?? {};
}

async function setMeta(next: Meta): Promise<void> {
  await db.setItem(KEYS.meta, next);
  emitChange(KEYS.meta);
}

export async function getLastSyncAt(): Promise<number | null> {
  const meta = await getMeta();
  return meta.lastSyncAt ?? null;
}

export async function setLastSyncAt(ts: number): Promise<void> {
  const meta = await getMeta();
  await setMeta({ ...meta, lastSyncAt: ts });
}

export async function getSyncing(): Promise<boolean> {
  const meta = await getMeta();
  return Boolean(meta.syncing);
}

export async function setSyncing(syncing: boolean): Promise<void> {
  const meta = await getMeta();
  await setMeta({ ...meta, syncing });
}
