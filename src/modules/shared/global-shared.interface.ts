import { Bookmark } from './bookmark/bookmark.interface';
import { MessageCommand } from './global-shared.enum';
import { SyncType } from './sync/sync.enum';
import { Sync } from './sync/sync.interface';

export interface I18nString {
  key: string;
  message: string;
}

export interface PlatformService {
  automaticUpdates_NextUpdate: () => ng.IPromise<string>; // TODO: Move to app platform component
  automaticUpdates_Start: () => ng.IPromise<void>;
  automaticUpdates_Stop: () => ng.IPromise<void>;
  bookmarks_Share?: (bookmark: Bookmark) => void; // TODO: Move to app platform component
  copyTextToClipboard: (text: string) => ng.IPromise<void>; // TODO: Move to app platform component
  downloadFile: (fileName: string, textContents: string, linkId?: string) => ng.IPromise<string>; // TODO: Move to app platform component
  eventListeners_Enable: () => ng.IPromise<void>;
  eventListeners_Disable: () => ng.IPromise<void>;
  getConstant: (i18nString: I18nString) => string;
  getCurrentUrl: () => ng.IPromise<string>;
  getHelpPages: () => string[]; // TODO: Move to app platform component
  getNewTabUrl?: () => string;
  getPageMetadata: (getFullMetadata?: boolean, pageUrl?: string) => ng.IPromise<WebpageMetadata>;
  interface_Refresh: (syncEnabled?: boolean, syncType?: SyncType) => ng.IPromise<void>;
  interface_Working_Hide: (id?: string, timeout?: ng.IPromise<void>) => void; // TODO: Move to app platform component
  interface_Working_Show: (id?: string) => ng.IPromise<void>; // TODO: Move to app platform component
  openUrl: (url: string) => void;
  permissions_Check: () => ng.IPromise<boolean>;
  permissions_Remove?: () => ng.IPromise<void>; // TODO: Move to app platform component
  permissions_Request?: () => ng.IPromise<boolean>; // TODO: Move to app platform component
  refreshLocalSyncData: () => ng.IPromise<void>;
  scanner_Start?: () => ng.IPromise<any>; // TODO: Move to app platform component
  scanner_Stop?: () => ng.IPromise<void>; // TODO: Move to app platform component
  scanner_ToggleLight?: (switchOn?: boolean) => ng.IPromise<boolean>; // TODO: Move to app platform component
  showAlert?: boolean;
  showWorking?: boolean;
  sync_Current: () => ng.IPromise<Sync>; // TODO: Move to app platform component
  sync_Disable: () => ng.IPromise<any>;
  sync_DisplayConfirmation: () => boolean; // TODO: Move to app platform component
  sync_GetQueueLength: () => ng.IPromise<number>; // TODO: Move to app platform component
  sync_Queue: (sync: Sync, command?: MessageCommand, runSync?: boolean) => ng.IPromise<any>;
  urlIsSupported: (url: string) => boolean;
}

export interface Url {
  protocol: string;
  host: string;
  hostname: string;
  port: string;
  pathname: string;
  search: string;
  searchObject: any;
  hash: string;
}

export interface WebpageMetadata {
  description?: string;
  tags?: string;
  title: string;
  url: string;
}
