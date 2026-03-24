import { openDB, type DBSchema, type IDBPDatabase } from "idb";

interface SantunanDB extends DBSchema {
  participants: {
    key: string;
    value: {
      id: string;
      full_name: string;
      email: string;
      phone: string;
      qr_token: string;
    };
    indexes: {
      by_qr_token: string;
      by_full_name: string;
    };
  };
  check_in_queue: {
    key: number;
    value: {
      localId?: number;
      session_id: string;
      programme_ids: string[];
      participant_id: string;
      check_in_method: string;
      is_synced: boolean;
      queued_at: string;
      notes?: string;
    };
    autoIncrement: true;
    indexes: {
      by_synced: number;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<SantunanDB>> | null = null;

export function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<SantunanDB>("santunan-emas-v1", 1, {
      upgrade(db) {
        const p = db.createObjectStore("participants", { keyPath: "id" });
        p.createIndex("by_qr_token", "qr_token", { unique: true });
        p.createIndex("by_full_name", "full_name");

        const q = db.createObjectStore("check_in_queue", {
          autoIncrement: true,
          keyPath: "localId",
        });
        q.createIndex("by_synced", "is_synced");
      },
    });
  }
  return dbPromise;
}
