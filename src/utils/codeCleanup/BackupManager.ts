/**
 * Backup Manager
 *
 * Provides comprehensive backup and restore functionality for the code cleanup process.
 * Ensures that all changes can be safely reverted if needed, maintaining system stability
 * and allowing for confident cleanup operations.
 */

import * as fs from 'fs';
import * as path from 'path';
import { BackupResult, RollbackResult } from './types';

/**
 * Backup Manager Class
 * Handles creation and management of code backups during cleanup operations
 */
export class BackupManager {
  private readonly backupRoot: string;
  private readonly maxBackups: number;
  private backups: Map<string, BackupResult> = new Map();

  constructor(backupRoot: string = 'backups/cleanup', maxBackups: number = 10) {
    this.backupRoot = path.resolve(backupRoot);
    this.maxBackups = maxBackups;

    // Ensure backup directory exists
    if (!fs.existsSync(this.backupRoot)) {
      fs.mkdirSync(this.backupRoot, { recursive: true });
    }
  }

  /**
   * Create a backup of specified files
   * @param files - Array of file paths to backup
   * @param description - Optional description of the backup
   * @returns Backup result
   */
  async createBackup(files: string[], description?: string): Promise<BackupResult> {
    const backupId = this.generateBackupId();
    const backupDir = path.join(this.backupRoot, backupId);
    const timestamp = new Date().toISOString();

    console.log(`📦 Creating backup ${backupId} for ${files.length} files...`);

    try {
      // Create backup directory
      fs.mkdirSync(backupDir, { recursive: true });

      // Copy files to backup directory
      const backedUpFiles: string[] = [];
      let totalSize = 0;

      for (const file of files) {
        if (fs.existsSync(file)) {
          const stats = fs.statSync(file);
          if (stats.isFile()) {
            const relativePath = path.relative(process.cwd(), file);
            const backupPath = path.join(backupDir, relativePath);

            // Ensure backup subdirectory exists
            const backupSubDir = path.dirname(backupPath);
            if (!fs.existsSync(backupSubDir)) {
              fs.mkdirSync(backupSubDir, { recursive: true });
            }

            // Copy file
            fs.copyFileSync(file, backupPath);
            backedUpFiles.push(file);
            totalSize += stats.size;
          }
        } else {
          console.warn(`Warning: File ${file} does not exist, skipping backup`);
        }
      }

      // Create backup metadata
      const metadata = {
        id: backupId,
        timestamp,
        description: description || 'Code cleanup backup',
        files: backedUpFiles,
        totalSize,
        fileCount: backedUpFiles.length
      };

      fs.writeFileSync(
        path.join(backupDir, 'backup-metadata.json'),
        JSON.stringify(metadata, null, 2)
      );

      const backupResult: BackupResult = {
        id: backupId,
        timestamp,
        files: backedUpFiles,
        size: totalSize,
        location: backupDir,
        success: true
      };

      // Store backup reference
      this.backups.set(backupId, backupResult);

      // Clean up old backups if needed
      await this.cleanupOldBackups();

      console.log(`✅ Backup ${backupId} created successfully`);
      console.log(`📁 ${backedUpFiles.length} files backed up`);
      console.log(`💾 Total size: ${this.formatBytes(totalSize)}`);

      return backupResult;

    } catch (error) {
      console.error(`❌ Failed to create backup ${backupId}:`, error);
      throw new Error(`Backup creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Restore files from a backup
   * @param backupId - ID of the backup to restore
   * @returns Rollback result
   */
  async restoreBackup(backupId: string): Promise<RollbackResult> {
    const backupResult = this.backups.get(backupId);
    if (!backupResult) {
      throw new Error(`Backup ${backupId} not found`);
    }

    const backupDir = backupResult.location;
    const metadataPath = path.join(backupDir, 'backup-metadata.json');

    if (!fs.existsSync(metadataPath)) {
      throw new Error(`Backup metadata not found for ${backupId}`);
    }

    console.log(`🔄 Restoring backup ${backupId}...`);

    try {
      // Read backup metadata
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));

      // Restore files
      const restoredFiles: string[] = [];

      for (const file of metadata.files) {
        const relativePath = path.relative(process.cwd(), file);
        const backupPath = path.join(backupDir, relativePath);

        if (fs.existsSync(backupPath)) {
          // Ensure target directory exists
          const targetDir = path.dirname(file);
          if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
          }

          // Restore file
          fs.copyFileSync(backupPath, file);
          restoredFiles.push(file);
        } else {
          console.warn(`Warning: Backup file ${backupPath} not found`);
        }
      }

      const rollbackResult: RollbackResult = {
        success: true,
        filesRestored: restoredFiles,
        timestamp: new Date().toISOString(),
        errors: []
      };

      console.log(`✅ Backup ${backupId} restored successfully`);
      console.log(`📁 ${restoredFiles.length} files restored`);

      return rollbackResult;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Failed to restore backup ${backupId}:`, error);

      return {
        success: false,
        filesRestored: [],
        timestamp: new Date().toISOString(),
        errors: [errorMessage]
      };
    }
  }

  /**
   * List all available backups
   * @returns Array of backup results
   */
  listBackups(): BackupResult[] {
    try {
      const backupDirs = fs.readdirSync(this.backupRoot)
        .filter(dir => fs.statSync(path.join(this.backupRoot, dir)).isDirectory())
        .sort()
        .reverse(); // Most recent first

      const backups: BackupResult[] = [];

      for (const dir of backupDirs) {
        const metadataPath = path.join(this.backupRoot, dir, 'backup-metadata.json');
        if (fs.existsSync(metadataPath)) {
          try {
            const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
            backups.push({
              id: metadata.id,
              timestamp: metadata.timestamp,
              files: metadata.files,
              size: metadata.totalSize,
              location: path.join(this.backupRoot, dir),
              success: true
            });
          } catch (error) {
            console.warn(`Warning: Could not read backup metadata for ${dir}:`, error);
          }
        }
      }

      return backups;
    } catch (error) {
      console.error('Error listing backups:', error);
      return [];
    }
  }

  /**
   * Delete a specific backup
   * @param backupId - ID of the backup to delete
   * @returns Whether deletion was successful
   */
  deleteBackup(backupId: string): boolean {
    try {
      const backupDir = path.join(this.backupRoot, backupId);
      if (fs.existsSync(backupDir)) {
        fs.rmSync(backupDir, { recursive: true, force: true });
        this.backups.delete(backupId);
        console.log(`🗑️ Backup ${backupId} deleted`);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`Error deleting backup ${backupId}:`, error);
      return false;
    }
  }

  /**
   * Get backup information
   * @param backupId - ID of the backup
   * @returns Backup result or null if not found
   */
  getBackup(backupId: string): BackupResult | null {
    // First check in-memory cache
    if (this.backups.has(backupId)) {
      return this.backups.get(backupId)!;
    }

    // Check on disk
    const backupDir = path.join(this.backupRoot, backupId);
    const metadataPath = path.join(backupDir, 'backup-metadata.json');

    if (fs.existsSync(metadataPath)) {
      try {
        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
        const backupResult: BackupResult = {
          id: metadata.id,
          timestamp: metadata.timestamp,
          files: metadata.files,
          size: metadata.totalSize,
          location: backupDir,
          success: true
        };

        // Cache in memory
        this.backups.set(backupId, backupResult);
        return backupResult;
      } catch (error) {
        console.warn(`Warning: Could not read backup metadata for ${backupId}:`, error);
      }
    }

    return null;
  }

  /**
   * Clean up old backups to stay within maxBackups limit
   */
  private async cleanupOldBackups(): Promise<void> {
    try {
      const backups = this.listBackups();

      if (backups.length > this.maxBackups) {
        const backupsToDelete = backups.slice(this.maxBackups);
        console.log(`🧹 Cleaning up ${backupsToDelete.length} old backups...`);

        for (const backup of backupsToDelete) {
          this.deleteBackup(backup.id);
        }
      }
    } catch (error) {
      console.warn('Warning: Could not cleanup old backups:', error);
    }
  }

  /**
   * Generate a unique backup ID
   * @returns Unique backup identifier
   */
  private generateBackupId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `backup_${timestamp}_${random}`;
  }

  /**
   * Format bytes into human-readable format
   * @param bytes - Number of bytes
   * @returns Formatted string
   */
  private formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  /**
   * Get backup statistics
   * @returns Backup statistics
   */
  getBackupStats(): {
    totalBackups: number;
    totalSize: number;
    oldestBackup: string | null;
    newestBackup: string | null;
  } {
    const backups = this.listBackups();

    if (backups.length === 0) {
      return {
        totalBackups: 0,
        totalSize: 0,
        oldestBackup: null,
        newestBackup: null
      };
    }

    const totalSize = backups.reduce((sum, backup) => sum + backup.size, 0);
    const timestamps = backups.map(b => b.timestamp).sort();

    return {
      totalBackups: backups.length,
      totalSize,
      oldestBackup: timestamps[0],
      newestBackup: timestamps[timestamps.length - 1]
    };
  }
}

