import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

// Singleton connection to prevent multiple opens in dev/hot-reload
let dbInstance = null;

export async function getDB() {
    if (dbInstance) return dbInstance;

    const dbPath = path.join(process.cwd(), 'data', 'finance.db');

    dbInstance = await open({
        filename: dbPath,
        driver: sqlite3.Database
    });

    return dbInstance;
}

export async function query(sql, params = []) {
    const db = await getDB();
    return db.all(sql, params);
}

export async function get(sql, params = []) {
    const db = await getDB();
    return db.get(sql, params);
}

export async function run(sql, params = []) {
    const db = await getDB();
    return db.run(sql, params);
}
