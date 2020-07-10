import { Bookmarks as NativeBookmarks } from 'webextension-polyfill-ts';
import {
  AddNativeBookmarkChangeData,
  Bookmark,
  BookmarkMetadata,
  ModifyNativeBookmarkChangeData,
  MoveNativeBookmarkChangeData,
  RemoveNativeBookmarkChangeData
} from './bookmark/bookmark.interface';
import { MessageCommand } from './global-shared.enum';
import { SyncType } from './sync/sync.enum';
import { Sync } from './sync/sync.interface';

export interface I18nString {
  key: string;
  message: string;
}

export interface PlatformService {
  automaticUpdates_NextUpdate: () => ng.IPromise<string>;
  automaticUpdates_Start: () => ng.IPromise<void>;
  automaticUpdates_Stop: () => ng.IPromise<void>;
  bookmarks_BuildIdMappings: (bookmarks: Bookmark[]) => ng.IPromise<void>;
  bookmarks_Clear: () => ng.IPromise<void>;
  bookmarks_Created?: (bookmarks: Bookmark[], changeData: AddNativeBookmarkChangeData) => ng.IPromise<Bookmark[]>;
  bookmarks_CreateSingle: (id: number, createInfo: BookmarkMetadata) => ng.IPromise<void>;
  bookmarks_Deleted?: (bookmarks: Bookmark[], changeData: RemoveNativeBookmarkChangeData) => ng.IPromise<Bookmark[]>;
  bookmarks_DeleteSingle: (id: number) => ng.IPromise<void>;
  bookmarks_Get: () => ng.IPromise<Bookmark[]>;
  bookmarks_LocalBookmarkInToolbar?: (nativeBookmark: NativeBookmarks.BookmarkTreeNode) => ng.IPromise<boolean>;
  bookmarks_Moved?: (bookmarks: Bookmark[], changeData: MoveNativeBookmarkChangeData) => ng.IPromise<Bookmark[]>;
  bookmarks_Populate: (bookmarks: Bookmark[]) => ng.IPromise<void>;
  bookmarks_ReorderContainers?: () => ng.IPromise<void>;
  bookmarks_Share?: (bookmark: Bookmark) => void;
  bookmarks_Updated?: (bookmarks: Bookmark[], changeData: ModifyNativeBookmarkChangeData) => ng.IPromise<Bookmark[]>;
  bookmarks_UpdateSingle: (id: number, updateInfo: BookmarkMetadata) => ng.IPromise<void>;
  copyTextToClipboard: (text: string) => ng.IPromise<void>;
  downloadFile: (fileName: string, textContents: string, linkId?: string) => ng.IPromise<string>;
  eventListeners_Enable: () => ng.IPromise<void>;
  eventListeners_Disable: () => ng.IPromise<void>;
  getConstant: (i18nString: I18nString) => string;
  getCurrentUrl: () => ng.IPromise<string>;
  getHelpPages: () => string[];
  getNewTabUrl?: () => string;
  getPageMetadata: (getFullMetadata?: boolean, pageUrl?: string) => ng.IPromise<WebpageMetadata>;
  getSupportedUrl: (url: string) => string;
  interface_Refresh: (syncEnabled?: boolean, syncType?: SyncType) => ng.IPromise<void>;
  interface_Working_Hide: (id?: string, timeout?: ng.IPromise<void>) => void;
  interface_Working_Show: (id?: string) => ng.IPromise<void>;
  openUrl: (url: string) => void;
  permissions_Check: () => ng.IPromise<boolean>;
  permissions_Remove?: () => ng.IPromise<void>;
  permissions_Request?: () => ng.IPromise<boolean>;
  refreshLocalSyncData: () => ng.IPromise<void>;
  scanner_Start?: () => ng.IPromise<any>;
  scanner_Stop?: () => ng.IPromise<void>;
  scanner_ToggleLight?: (switchOn?: boolean) => ng.IPromise<boolean>;
  selectFile?: () => any;
  showAlert?: boolean;
  showWorking?: boolean;
  sync_Current: () => ng.IPromise<Sync>;
  sync_Disable: () => ng.IPromise<any>;
  sync_DisplayConfirmation: () => boolean;
  sync_GetQueueLength: () => ng.IPromise<number>;
  sync_Queue: (sync: Sync, command?: MessageCommand, runSync?: boolean) => ng.IPromise<any>;
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
