enum MessageCommand {
  SyncBookmarks = 1,
  RestoreBookmarks,
  GetCurrentSync,
  GetSyncQueueLength,
  DisableSync,
  GetPageMetadata,
  EnableEventListeners,
  DisableEventListeners
}

enum PlatformType {
  Android = 'android',
  Chromium = 'chromium',
  Firefox = 'firefox'
}

export { MessageCommand, PlatformType };
