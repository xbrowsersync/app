import { ApiServiceInfo, ApiServiceInfoResponse } from '../shared/api/api.interface';
import { Bookmark } from '../shared/bookmark/bookmark.interface';
import { MessageCommand } from '../shared/global-shared.enum';
import { Sync } from '../shared/sync/sync.interface';
import { AppViewType } from './app.enum';

export interface AppHelperService {
  attachClickEventsToNewTabLinks: (element?: HTMLElement) => void;
  confirmBeforeSyncing: () => boolean;
  copyTextToClipboard: (text: string) => ng.IPromise<void>;
  downloadFile: (fileName: string, textContents: string, linkId: string) => ng.IPromise<string>;
  focusOnElement: (domSelector: string, select?: boolean) => void;
  formatServiceInfo: (serviceInfoResponse?: ApiServiceInfoResponse) => ng.IPromise<ApiServiceInfo>;
  getHelpPages: () => string[];
  getCurrentSync: () => ng.IPromise<Sync>;
  getCurrentView: () => AppView;
  getNextScheduledSyncUpdateCheck: () => ng.IPromise<string>;
  getSyncQueueLength: () => ng.IPromise<number>;
  openUrl: (event?: Event, url?: string) => void;
  platformName: string;
  queueSync: (sync: Sync, command?: MessageCommand) => ng.IPromise<any>;
  removePermissions: () => ng.IPromise<void>;
  requestPermissions: () => ng.IPromise<boolean>;
  shareBookmark?: (bookmark: Bookmark) => void;
  switchView: (view?: AppView) => ng.IPromise<void>;
  syncBookmarksSuccess: () => ng.IPromise<void>;
  updateServiceUrl: (newServiceUrl: string) => ng.IPromise<ApiServiceInfo>;
}

export interface AppView {
  data?: AppViewData;
  view: AppViewType;
}

export interface AppViewData {
  addButtonDisabledByDefault?: boolean;
  bookmark?: Bookmark;
}
