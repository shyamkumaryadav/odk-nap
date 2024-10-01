import idb, { DBSchema } from "idb";

const DB_NAME = "enketo_local_db";
const DB_VERSION = 1;

enum ITEMSET_TABLES {
  STATE = "state",
  DISTRICT = "district",
  SUB_DISTRICT = "sub_district",
  LGD_ULB_HEALTH_HULB = "lgd_ulb_health_hulb",
  HEALTH_FACILITY = "health_facility",
  SUB_CENTRE = "sub_centre",
  SESSION_SITE = "session_site",
}

type ITEMSET_KEY = number;

interface DB_ITEMSET_ITEM {
  label: string;
  parent_id: ITEMSET_KEY; // <--- this is the parent_id (index of other table key)
}

interface DB_ITEMSET_TEMPLATE {
  key: ITEMSET_KEY;
  value: DB_ITEMSET_ITEM;
  indexes: { parent_id: ITEMSET_KEY };
}

interface IDBSchema extends DBSchema {
  [K: keyof ITEMSET_TABLES]: DB_ITEMSET_TEMPLATE;
}

const dbPromise = idb.openDB<IDBSchema>(DB_NAME, DB_VERSION, {
  upgrade(db) {
    const stores = [
      STATE,
      DISTRICT,
      SUB_DISTRICT,
      LGD_ULB_HEALTH_HULB,
      HEALTH_FACILITY,
      SUB_CENTRE,
      SESSION_SITE,
    ];

    stores.forEach((storeName) => {
      if (!db.objectStoreNames.contains(storeName)) {
        const store = db.createObjectStore(storeName, {
          keyPath: ITEMSET_KEY, // Primary key
        });

        // Create an index on 'parent_id'
        store.createIndex("parent_id", "parent_id", { unique: false });
      }
    });
  },
});
