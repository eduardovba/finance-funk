# How to Manually Restore the Database

If the application breaks or data is corrupted, follow these 3 steps to restore the database from a backup.

### Step 1: Locate the Backup
Navigate to the `backups/` folder in the project root. Identify the backup file you want to restore based on the timestamp in the filename (e.g., `db_backup_2024-02-18_1630.sqlite`).

### Step 2: Stop the Application
Ensure the application is not running. If the development server is active, stop it (Ctrl+C).

### Step 3: Replace the Database File
Run the following command in your terminal, replacing `[BACKUP_FILENAME]` with the actual filename you chose in Step 1:

```bash
cp backups/[BACKUP_FILENAME] data/finance.db
```

*Example:*
```bash
cp backups/db_backup_2026-02-18_1630.sqlite data/finance.db
```

**That's it!** Restart your application (`npm run dev`) and your data will be restored to that point in time.
