enum BrowserName {
  Brave = 'brave',
  Chrome = 'chrome',
  Edge = 'edge'
}

enum MessageCommand {
  SyncBookmarks = 'SYNC_BOOKMARKS',
  RestoreBookmarks = 'RESTORE_BOOKMARKS',
  GetCurrentSync = 'GET_CURRENT_SYNC',
  GetSyncQueueLength = 'GET_SYNC_QUEUE_LENGTH',
  DisableSync = 'DISABLE_SYNC',
  GetPageMetadata = 'GET_PAGE_METADATA',
  EnableEventListeners = 'ENABLE_EVENT_LISTENERS',
  DisableEventListeners = 'DISABLE_EVENT_LISTENERS'
}

enum PlatformType {
  Android = 'android',
  Chromium = 'chromium',
  Firefox = 'firefox'
}

export { BrowserName, MessageCommand, PlatformType };
