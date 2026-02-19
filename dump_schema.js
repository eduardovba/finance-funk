const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');

async function dumpSchema() {
    const dbPath = path.join(process.cwd(), 'data', 'finance.db');
    const db = await open({
        filename: dbPath,
        driver: sqlite3.Database
    });

    console.log("--- TABLE SCHEMAS ---");
    const tables = await db.all("SELECT name, sql FROM sqlite_master WHERE type='table'");
    for (const table of tables) {
        console.log(`Table: ${table.name}`);
        console.log(table.sql);
        console.log("-------------------");
    }

    console.log("--- VIEW SCHEMAS ---");
    const views = await db.all("SELECT name, sql FROM sqlite_master WHERE type='view'");
    for (const view of views) {
        console.log(`View: ${view.name}`);
        console.log(view.sql);
        console.log("-------------------");
    }

    await db.close();
}

dumpSchema().catch(console.error);
