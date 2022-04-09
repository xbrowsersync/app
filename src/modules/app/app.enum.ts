enum AppEventType {
  RefreshBookmarkSearchResults = 'REFRESH_BOOKMARK_SEARCH_RESULTS',
  RefreshSyncDataUsage = 'REFRESH_SYNC_DATA_USAGE',
  SyncDisabled = 'SYNC_DISABlED',
  WorkingCancelAction = 'WORKING_CANCEL_ACTION'
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

enum RoutePath {
  Bookmark = '/bookmark',
  Help = '/help',
  Login = '/login',
  Permissions = '/permissions',
  Scan = '/scan',
  Search = '/search',
  Settings = '/settings',
  Support = '/support',
  SyncRemoved = '/sync-removed',
  TelemetryCheck = '/telemetry-check',
  Updated = '/updated'
}

export { AppEventType, KeyCode, RoutePath };
