import { openDB, DBSchema } from "idb";

const DB_NAME = "enketo_local_db";
const DB_VERSION = 1;

export const ITEMSET_TABLES = {
  STATE: "state",
  DISTRICT: "district",
  SUB_DISTRICT: "sub_district",
  LGD_ULB_HEALTH_HULB: "lgd_ulb_health_hulb",
  HEALTH_FACILITY: "health_facility",
  SUB_CENTRE: "sub_centre",
  SESSION_SITE: "session_site",
} as const;

type ObjectValues<T> = T[keyof T];

export type ITEMSET_TABLES_NAME = ObjectValues<typeof ITEMSET_TABLES>;

export type ITEMSET_KEY = number;

export interface DB_ITEMSET_ITEM {
  name: ITEMSET_KEY;
  label: string;
  /**
   * @description This is the parent_id of the itemset (index of other table key)
   */
  parent_id: ITEMSET_KEY;
}

type IDBSchema = DBSchema & {
  [k in ITEMSET_TABLES_NAME]: {
    key: ITEMSET_KEY;
    value: DB_ITEMSET_ITEM;
    indexes: { parent_id: ITEMSET_KEY };
  };
};

const dbPromise = openDB<IDBSchema>(DB_NAME, DB_VERSION, {
  upgrade(db) {
    Object.values(ITEMSET_TABLES).forEach((tableName) => {
      if (!db.objectStoreNames.contains(tableName)) {
        const store = db.createObjectStore(tableName, {
          keyPath: "name", // Use the 'name' property as the primary key
        });
        store.createIndex("parent_id", "parent_id", { unique: false });
      }
    });
  },
});

export const addItemsToStore = async (
  tableName: ITEMSET_TABLES_NAME,
  items: DB_ITEMSET_ITEM[]
) => {
  const msg = `Add ${items.length} items to ${tableName}`;
  console.time(msg);
  const db = await dbPromise;
  const tx = db.transaction(tableName, "readwrite");
  const store = tx.store;
  items.forEach((item) => store.put(item));
  await tx.done;
  console.timeEnd(msg);
};

export const getItemsFromStore = async (
  tableName: ITEMSET_TABLES_NAME,
  parent_id: ITEMSET_KEY
) => {
  const db = await dbPromise;
  const tx = db.transaction(tableName);
  const store = tx.store;

  const index = !isNaN(parent_id) ? store.index("parent_id") : store;
  return !isNaN(parent_id) ? index.getAll(parent_id) : index.getAll();
};

export const clearStore = async (tableName: ITEMSET_TABLES_NAME) => {
  const db = await dbPromise;
  const tx = db.transaction(tableName, "readwrite");
  const store = tx.store;
  store.clear();
  await tx.done;
};
