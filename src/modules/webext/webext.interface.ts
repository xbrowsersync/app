import { AutoBackUpSchedule } from '../shared/backup-restore/backup-restore.interface';
import { Bookmark } from '../shared/bookmark/bookmark.interface';
import { MessageCommand } from '../shared/global-shared.enum';
import { Sync } from '../shared/sync/sync.interface';

export interface InstallBackup {
  bookmarks: Bookmark[];
  date: string;
}

export interface Message {
  command: MessageCommand;
}

export interface DownloadFileMessage extends Message {
  command: MessageCommand.DownloadFile;
  displaySaveDialog: boolean;
  filename: string;
  textContents: string;
}

export interface EnableAutoBackUpMessage extends Message {
  command: MessageCommand.EnableAutoBackUp;
  schedule: AutoBackUpSchedule;
}

export interface SyncBookmarksMessage extends Message {
  runSync?: boolean;
  sync?: Sync;
}
