export default {
  Alarms: {
    AutoBackUp: {
      Name: 'ALARM_AUTO_BACK_UP'
    },
    SyncUpdatesCheck: {
      Name: 'ALARM_SYNC_UPDATES_CHECK',
      Period: 15
    }
  },
  Bookmarks: {
    DescriptionMaxLength: 300,
    HorizontalSeparatorTitle:
      '────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────',
    SeparatorUrl: 'xbs:separator',
    VerticalSeparatorTitle: '|'
  },
  Debounce: 300,
  I18n: {
    DefaultLocale: 'en'
  },
  InterfaceReadyTimeout: 100,
  LookaheadMinChars: 2,
  MinApiVersion: '1.1.9',
  PathToAssets: 'assets',
  QrCode: {
    Delimiter: '|$$|'
  },
  ReleaseNotesUrlStem: 'https://github.com/xbrowsersync/app/releases/tag/v',
  ReleaseLatestUrl: 'https://api.github.com/repos/xbrowsersync/app/releases/latest',
  TelemetryUrl: 'https://telemetry.xbrowsersync.org/submit',
  Title: 'xBrowserSync',
  URL: {
    DefaultServiceUrl: 'https://api.xbrowsersync.org',
    HttpRegex: '^https?://\\w+',
    ProtocolRegex: '^[\\w-]+:',
    ValidUrlRegex:
      '(?:[a-z0-9\\u00a1-\\uffff]{3,}:(?:\\/\\/)?)?(?:\\S+(?::\\S*)?@)?(?:(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(?:\\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3})|(?:[a-z0-9\\u00a1-\\uffff]{3,}:[a-z0-9\\u00a1-\\uffff]{2,})|(?:(?:(?:[a-z0-9\\u00a1-\\uffff][a-z0-9\\u00a1-\\uffff_-]{0,62})?[a-z0-9\\u00a1-\\uffff]\\.)+(?:[a-z\\u00a1-\\uffff]{2,}\\.?))|(?:localhost))(?::\\d{2,5})?(?:[/?#]\\S*)?'
  }
};
