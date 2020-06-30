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

export default MessageCommand;
