/* eslint-disable @typescript-eslint/no-explicit-any */

import WebpageMetadata from './webpage-metadata.interface';

export default interface PlatformService {
  automaticUpdates_NextUpdate: any;
  automaticUpdates_Start: any;
  automaticUpdates_Stop: any;
  bookmarks_BuildIdMappings: any;
  bookmarks_Clear: any;
  bookmarks_Created?: any;
  bookmarks_CreateSingle: any;
  bookmarks_Deleted?: any;
  bookmarks_DeleteSingle: any;
  bookmarks_Get: any;
  bookmarks_LocalBookmarkInToolbar?: any;
  bookmarks_Moved?: any;
  bookmarks_Populate: any;
  bookmarks_ReorderContainers?: any;
  bookmarks_Share?: any;
  bookmarks_Updated?: any;
  bookmarks_UpdateSingle: any;
  copyToClipboard: any;
  downloadFile: any;
  eventListeners_Enable: any;
  eventListeners_Disable: any;
  getConstant: any;
  getCurrentUrl: any;
  getHelpPages: any;
  getNewTabUrl?: any;
  getPageMetadata: (getFullMetadata?: boolean, pageUrl?: string) => ng.IPromise<WebpageMetadata>;
  getSupportedUrl: any;
  interface_Working_Hide: any;
  interface_Working_Show: any;
  interface_Refresh: any;
  openUrl: any;
  permissions_Check: any;
  permissions_Remove?: any;
  permissions_Request?: any;
  refreshLocalSyncData: any;
  scanner_Start?: any;
  scanner_Stop?: any;
  scanner_ToggleLight?: any;
  selectFile?: any;
  showAlert?: boolean;
  showWorking?: boolean;
  sync_Current: any;
  sync_Disable: any;
  sync_DisplayConfirmation: () => boolean;
  sync_GetQueueLength: any;
  sync_Queue: any;
}
