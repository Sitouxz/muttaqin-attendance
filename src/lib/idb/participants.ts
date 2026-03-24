import { getDb } from "./schema";

export async function cacheParticipants(
  participants: Array<{ id: string; full_name: string; email: string; phone: string; qr_token: string }>
) {
  const db = await getDb();
  const tx = db.transaction("participants", "readwrite");
  await Promise.all([
    ...participants.map((p) => tx.store.put(p)),
    tx.done,
  ]);
}

export async function getParticipantByQrToken(qrToken: string) {
  const db = await getDb();
  return db.getFromIndex("participants", "by_qr_token", qrToken);
}

export async function searchParticipantsByName(query: string) {
  const db = await getDb();
  const all = await db.getAll("participants");
  const lower = query.toLowerCase();
  return all.filter(
    (p) =>
      p.full_name.toLowerCase().includes(lower) ||
      p.phone.includes(lower)
  );
}
