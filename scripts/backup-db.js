const fs = require('fs');
const path = require('path');

const BACKUP_DIR = path.join(__dirname, '..', 'backups');
const DB_PATH = path.join(__dirname, '..', 'data', 'finance.db');
const RETENTION_LIMIT = 5;

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR);
}

// Generate timestamp
const now = new Date();
const timestamp = now.toISOString()
    .replace(/T/, '_')
    .replace(/:/g, '')
    .slice(0, 15); // YYYY-MM-DD_HHmm

const backupFilename = `db_backup_${timestamp}.sqlite`;
const backupPath = path.join(BACKUP_DIR, backupFilename);

// ASCII Art & Logging
console.log('\n🛡️  STARTING DATABASE BACKUP 🛡️');
console.log('-----------------------------------');

// Check if DB exists
if (!fs.existsSync(DB_PATH)) {
    console.error(`❌ Error: Database file not found at ${DB_PATH}`);
    process.exit(1);
}

// Copy File
try {
    fs.copyFileSync(DB_PATH, backupPath);
    console.log(`✅ Backup created: ${backupFilename}`);
} catch (error) {
    console.error(`❌ Backup failed: ${error.message}`);
    process.exit(1);
}

// Retention Policy
const files = fs.readdirSync(BACKUP_DIR)
    .filter(file => file.startsWith('db_backup_') && file.endsWith('.sqlite'))
    .map(file => ({
        name: file,
        time: fs.statSync(path.join(BACKUP_DIR, file)).mtime.getTime()
    }))
    .sort((a, b) => b.time - a.time); // Newest first

if (files.length > RETENTION_LIMIT) {
    console.log(`\n🧹 Cleaning up old backups (Limit: ${RETENTION_LIMIT})...`);
    const filesToDelete = files.slice(RETENTION_LIMIT);

    filesToDelete.forEach(file => {
        fs.unlinkSync(path.join(BACKUP_DIR, file.name));
        console.log(`   🗑️  Deleted: ${file.name}`);
    });
}

console.log('-----------------------------------');
console.log('✨ SAFETY NET SECURED\n');
