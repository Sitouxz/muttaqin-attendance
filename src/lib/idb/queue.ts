import { getDb } from "./schema";

export async function enqueueCheckIn(item: {
  session_id: string;
  programme_ids: string[];
  participant_id: string;
  check_in_method: string;
  notes?: string;
}) {
  const db = await getDb();
  await db.add("check_in_queue", {
    ...item,
    is_synced: false,
    queued_at: new Date().toISOString(),
  });
}

export async function getPendingQueue() {
  const db = await getDb();
  const all = await db.getAll("check_in_queue");
  return all.filter((item) => !item.is_synced);
}

export async function markSynced(localId: number) {
  const db = await getDb();
  const item = await db.get("check_in_queue", localId);
  if (item) {
    await db.put("check_in_queue", { ...item, is_synced: true });
  }
}

export async function getPendingCount(): Promise<number> {
  const pending = await getPendingQueue();
  return pending.length;
}
