import { MessageCommand } from './global-shared.enum';
import { SyncType } from './sync/sync.enum';
import { Sync, SyncResult } from './sync/sync.interface';

export interface I18nObject {
  android?: string;
  default: string;
  chromium?: string;
  key: string;
  firefox?: string;
}

export interface Message {
  command: MessageCommand;
  runSync?: boolean;
  sync?: Sync;
}

export interface PlatformService {
  checkOptionalNativePermissions: () => ng.IPromise<boolean>;
  disableNativeEventListeners: () => ng.IPromise<void>;
  disableSync: () => ng.IPromise<any>;
  enableNativeEventListeners: () => ng.IPromise<void>;
  getAppVersion: () => ng.IPromise<string>;
  getCurrentUrl: () => ng.IPromise<string>;
  getI18nString: (i18nObj: I18nObject) => string;
  getNewTabUrl?: () => string;
  getPageMetadata: (getFullMetadata?: boolean, pageUrl?: string) => ng.IPromise<WebpageMetadata>;
  openUrl: (url: string) => void;
  platformName: string;
  queueLocalResync: () => ng.IPromise<void>;
  queueSync: (sync: Sync, command?: MessageCommand, runSync?: boolean) => ng.IPromise<SyncResult>;
  refreshNativeInterface: (syncEnabled?: boolean, syncType?: SyncType) => ng.IPromise<void>;
  startSyncUpdateChecks: () => ng.IPromise<void>;
  stopSyncUpdateChecks: () => ng.IPromise<void>;
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
  title: string | undefined;
  url: string | undefined;
}
