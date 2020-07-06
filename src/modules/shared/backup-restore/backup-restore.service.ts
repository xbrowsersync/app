import { Injectable } from 'angular-ts-decorators';
import { autobind } from 'core-decorators';
import ApiServiceType from '../api/api-service-type.enum';
import UtilityService from '../utility/utility.service';
import Backup, { BackupSync } from './backup.interface';

@autobind
@Injectable('BackupRestoreService')
export default class BackupRestoreService {
  utilitySvc: UtilityService;

  static $inject = ['UtilityService'];
  constructor(UtilitySvc: UtilityService) {
    this.utilitySvc = UtilitySvc;
  }

  createBackupData(bookmarksData, syncId: string, serviceUrl: string): Backup {
    const backupData: Backup = {
      xbrowsersync: {
        date: this.utilitySvc.getDateTimeString(new Date()),
        sync: {},
        data: {}
      }
    };

    // Add sync info if provided
    if (syncId) {
      backupData.xbrowsersync.sync = this.createSyncInfoObject(syncId, serviceUrl);
    }

    // Add bookmarks
    backupData.xbrowsersync.data.bookmarks = bookmarksData;
    return backupData;
  }

  createSyncInfoObject(syncId: string, serviceUrl: string): BackupSync {
    return {
      id: syncId,
      type: ApiServiceType.xBrowserSync,
      url: serviceUrl
    } as BackupSync;
  }

  getBackupFileName(): string {
    const fileName = `xbs_backup_${this.utilitySvc.getDateTimeString(new Date())}.json`;
    return fileName;
  }
}
