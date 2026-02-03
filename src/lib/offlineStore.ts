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

function emitChange(key: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OFFLINE_STORE_EVENT, { detail: { key } }));
}

export async function getCachedSubscribers(): Promise<Subscriber[]> {
  return (await db.getItem<Subscriber[]>(KEYS.subscribers)) ?? [];
}

export async function setCachedSubscribers(subs: Subscriber[]): Promise<void> {
  await db.setItem(KEYS.subscribers, subs);
  emitChange(KEYS.subscribers);
}

export async function getPendingChanges(): Promise<PendingSubscriberChange[]> {
  return (await db.getItem<PendingSubscriberChange[]>(KEYS.pending)) ?? [];
}

export async function setPendingChanges(changes: PendingSubscriberChange[]): Promise<void> {
  await db.setItem(KEYS.pending, changes);
  emitChange(KEYS.pending);
}

export async function addPendingChange(change: PendingSubscriberChange): Promise<void> {
  const prev = await getPendingChanges();
  await setPendingChanges([...prev, change]);
}

export async function removePendingChange(changeId: string): Promise<void> {
  const prev = await getPendingChanges();
  await setPendingChanges(prev.filter((c) => c.id !== changeId));
}

export async function clearPendingChanges(): Promise<void> {
  await db.removeItem(KEYS.pending);
  emitChange(KEYS.pending);
}

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
