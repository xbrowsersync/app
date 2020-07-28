import { Bookmark } from '../shared/bookmark/bookmark.interface';
import { Sync } from '../shared/sync/sync.interface';

export interface AppHelperService {
  confirmBeforeSyncing: () => boolean;
  copyTextToClipboard: (text: string) => ng.IPromise<void>;
  downloadFile: (fileName: string, textContents: string, linkId: string) => ng.IPromise<string>;
  getHelpPages: () => string[];
  getCurrentSync: () => ng.IPromise<Sync>;
  getNextScheduledSyncUpdateCheck: () => ng.IPromise<string>;
  getSyncQueueLength: () => ng.IPromise<number>;
  openUrl: (event?: Event, url?: string) => void;
  removePermissions: () => ng.IPromise<void>;
  requestPermissions: () => ng.IPromise<boolean>;
  shareBookmark?: (bookmark: Bookmark) => void;
}
