enum SyncType {
  Cancel = 'cancel', // Stop current sync, clear sync queue and don't update remote
  Local = 'local', // Update local data
  LocalAndRemote = 'local and remote', // Update both local and remote data
  Remote = 'remote', // Update remote data
  Upgrade = 'upgrade' // Upgrade synced data
}

export { SyncType };
