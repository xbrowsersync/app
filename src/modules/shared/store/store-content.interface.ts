export default interface StoreContent {
  appVersion: string;
  bookmarkIdMappings: any;
  bookmarks: any;
  checkForAppUpdates: boolean;
  darkModeEnabled: boolean;
  displayHelp: boolean;
  displayOtherSyncsWarning: boolean;
  displayPermissions: boolean;
  displaySearchBarBeneathResults: boolean;
  displayUpdated: boolean;
  defaultToFolderView: boolean;
  installBackup: any;
  lastUpdated: Date;
  password: string;
  serviceUrl: string;
  syncBookmarksToolbar: boolean;
  syncEnabled: boolean;
  syncId: string;
  syncVersion: string;
  traceLog: string[];
}
