enum ApiServiceStatus {
  Error = -1,
  Online = 1,
  Offline = 2,
  NoNewSyncs = 3
}

enum ApiServiceType {
  xBrowserSync = 'xbrowsersync'
}

export { ApiServiceStatus, ApiServiceType };
