import * as SQLite from "expo-sqlite";
import { SCHEMA_SQL } from "./schema";

const DB_NAME = "melita.db";

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbInstance) {
    dbInstance = await SQLite.openDatabaseAsync(DB_NAME);
    await dbInstance.execAsync(SCHEMA_SQL);
  }
  return dbInstance;
}
