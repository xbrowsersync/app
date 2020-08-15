enum SyncType {
  Cancel = 'CANCEL', // Stop current sync, clear sync queue and don't update remote
  Local = 'LOCAL', // Update local data
  LocalAndRemote = 'LOCAL_REMOTE', // Update both local and remote data
  Remote = 'REMOTE', // Update remote data
  Upgrade = 'UPGRADE' // Upgrade synced data
}

export { SyncType };
