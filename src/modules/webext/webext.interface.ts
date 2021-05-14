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
  displaySaveDialog: boolean;
  filename: string;
  textContents: string;
}

export interface SyncBookmarksMessage extends Message {
  runSync?: boolean;
  sync?: Sync;
}
