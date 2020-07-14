import { Bookmark } from './bookmark/bookmark.interface';
import { MessageCommand } from './global-shared.enum';
import { SyncType } from './sync/sync.enum';
import { Sync } from './sync/sync.interface';

export interface I18nString {
  key: string;
  message: string;
}

export interface Message {
  command: MessageCommand;
  runSync?: boolean;
  sync?: Sync;
}

export interface PlatformService {
  automaticUpdates_Start: () => ng.IPromise<void>;
  automaticUpdates_Stop: () => ng.IPromise<void>;
  eventListeners_Enable: () => ng.IPromise<void>;
  eventListeners_Disable: () => ng.IPromise<void>;
  getConstant: (i18nString: I18nString) => string;
  getCurrentUrl: () => ng.IPromise<string>;
  getNewTabUrl?: () => string;
  getPageMetadata: (getFullMetadata?: boolean, pageUrl?: string) => ng.IPromise<WebpageMetadata>;
  interface_Refresh: (syncEnabled?: boolean, syncType?: SyncType) => ng.IPromise<void>;
  interface_Working_Hide: (id?: string, timeout?: ng.IPromise<void>) => void;
  interface_Working_Show: (id?: string) => ng.IPromise<void>;
  openUrl: (url: string) => void;
  permissions_Check: () => ng.IPromise<boolean>;
  refreshLocalSyncData: () => ng.IPromise<void>;
  showAlert?: boolean;
  showWorking?: boolean;
  sync_Disable: () => ng.IPromise<any>;
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
