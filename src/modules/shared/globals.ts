export default {
  Alarm: {
    Name: 'xBrowserSync-alarm',
    Period: 15
  },
  AppVersion: '1.5.3',
  Bookmarks: {
    ContainerPrefix: '[xbs]',
    DescriptionMaxLength: 300,
    MenuContainerName: '[xbs] Menu',
    MobileContainerName: '[xbs] Mobile',
    OtherContainerName: '[xbs] Other',
    OtherContainerNameOld: '_other_',
    HorizontalSeparatorTitle:
      '────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────',
    ToolbarContainerName: '[xbs] Toolbar',
    ToolbarContainerNameOld: '_toolbar_',
    UnfiledContainerNameOld: '_xBrowserSync_',
    VerticalSeparatorTitle: '|'
  },
  CacheKeys: {
    AppVersion: 'appVersion',
    BookmarkIdMappings: 'bookmarkIdMappings',
    Bookmarks: 'bookmarks',
    CheckForAppUpdates: 'checkForAppUpdates',
    DarkModeEnabled: 'darkModeEnabled',
    DisplayHelp: 'displayHelp',
    DisplayOtherSyncsWarning: 'displayOtherSyncsWarning',
    DisplayPermissions: 'displayPermissions',
    DisplaySearchBarBeneathResults: 'displaySearchBarBeneathResults',
    DisplayUpdated: 'displayUpdated',
    DefaultToFolderView: 'defaultToFolderView',
    InstallBackup: 'installBackup',
    LastUpdated: 'lastUpdated',
    Password: 'password',
    ServiceUrl: 'serviceUrl',
    SyncBookmarksToolbar: 'syncBookmarksToolbar',
    SyncEnabled: 'syncEnabled',
    SyncId: 'syncId',
    SyncVersion: 'syncVersion',
    TraceLog: 'traceLog'
  },
  Commands: {
    SyncBookmarks: 1,
    RestoreBookmarks: 2,
    GetCurrentSync: 3,
    GetSyncQueueLength: 4,
    DisableSync: 5,
    GetPageMetadata: 6,
    EnableEventListeners: 7,
    DisableEventListeners: 8
  },
  ErrorCodes: {
    NetworkOffline: 10000,
    HttpRequestFailed: 10001,
    HttpRequestCancelled: 10002,
    TooManyRequests: 10003,
    RequestEntityTooLarge: 10004,
    NotAcceptingNewSyncs: 10005,
    DailyNewSyncLimitReached: 10006,
    MissingClientData: 10100,
    AmbiguousSyncRequest: 10101,
    FailedGetLocalBookmarks: 10102,
    FailedCreateLocalBookmarks: 10103,
    FailedRemoveLocalBookmarks: 10104,
    FailedUpdateLocalBookmarks: 10105,
    NoDataFound: 10106,
    SyncRemoved: 10107,
    PasswordRemoved: 10108,
    InvalidCredentials: 10109,
    LocalBookmarkNotFound: 10110,
    XBookmarkNotFound: 10111,
    ContainerNotFound: 10112,
    ContainerChanged: 10113,
    LocalContainerNotFound: 10114,
    DataOutOfSync: 10115,
    InvalidBookmarkIdsDetected: 10116,
    BookmarkMappingNotFound: 10117,
    SyncNotEnabled: 10118,
    SyncUncommitted: 10200,
    InvalidService: 10300,
    UnsupportedServiceApiVersion: 10301,
    ServiceOffline: 10302,
    FailedGetPageMetadata: 10400,
    FailedSaveBackup: 10401,
    FailedScan: 10402,
    FailedShareBookmark: 10403,
    FailedDownloadFile: 10404,
    FailedGetDataToRestore: 10405,
    FailedLocalStorage: 10406,
    FailedRestoreData: 10407,
    FailedRefreshBookmarks: 10408,
    FailedShareUrl: 10500,
    FailedShareUrlNotSynced: 10501,
    FailedRegisterAutoUpdates: 10600,
    LocalStorageNotAvailable: 10700,
    NotImplemented: 10800
  },
  LogType: {
    Trace: 0,
    Warn: 1,
    Error: 2
  },
  LookaheadMinChars: 1,
  MinApiVersion: '1.1.3',
  PathToAssets: 'assets',
  Platforms: {
    Android: 'android',
    Chrome: 'chrome',
    Firefox: 'firefox'
  },
  QrCode: {
    Delimiter: '|$$|'
  },
  Regex: {
    Url: /(https?|ftp):\/\/(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!$&'()*+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!$&'()*+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!$&'()*+,;=]|:|@)*)*)?)?(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!$&'()*+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!$&'()*+,;=]|:|@)|\/|\?)*)?$/i
  },
  ReleaseNotesUrlStem: 'https://github.com/xbrowsersync/app/releases/tag/v',
  ReleaseLatestUrl: 'https://api.github.com/repos/xbrowsersync/app/releases/latest',
  SyncPollTimeout: 2000,
  ServiceStatus: {
    Error: -1,
    Online: 1,
    Offline: 2,
    NoNewSyncs: 3
  },
  SyncType: {
    Push: 1,
    Pull: 2,
    Both: 3,
    Cancel: 4,
    Upgrade: 5
  },
  Title: 'xBrowserSync',
  UpdateType: {
    Create: 1,
    Delete: 2,
    Update: 3,
    Move: 4
  },
  URL: {
    Bookmarks: '/bookmarks',
    Current: '/current',
    DefaultServiceUrl: 'https://api.xbrowsersync.org',
    HttpRegex: '^https?://\\w+',
    LastUpdated: '/lastUpdated',
    ProtocolRegex: '^[\\w-]+:',
    ServiceInformation: '/info',
    ValidUrlRegex:
      '(\\w+://)?((www\\.)?[-a-zA-Z0-9@:%._\\+~#=]+\\.[a-z]+|(\\d{1,3}\\.){3}\\d{1,3})\\b([-a-zA-Z0-9@:%_\\+.~#?&//=]*)',
    Version: '/version'
  }
};
