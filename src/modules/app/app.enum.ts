enum AppEventType {
  ClearSelectedBookmark = 'clearSelectedBookmark',
  RefreshBookmarkSearchResults = 'refreshBookmarkSearchResults',
  RefreshSyncDataUsage = 'refreshSyncDataUsage',
  ShareModeEnabled = 'shareModeEnabled',
  WorkingCancelAction = 'workingCancelAction'
}

enum AppViewType {
  Bookmark = 'BOOKMARK',
  Help = 'HELP',
  Login = 'LOGIN',
  Permissions = 'PERMISSIONS',
  Scan = 'SCAN',
  Search = 'SEARCH',
  Settings = 'SETTINGS',
  Support = 'SUPPORT',
  Updated = 'UPDATED',
  Working = 'WORKING'
}

enum KeyCode {
  Enter = 13,
  Backspace = 8,
  Tab = 9,
  Escape = 27,
  Space = 32,
  PageUp = 33,
  PageDown = 34,
  End = 35,
  Home = 36,
  ArrowLeft = 37,
  ArrowUp = 38,
  ArrowRight = 39,
  ArrowDown = 40
}

export { AppEventType, AppViewType, KeyCode };
