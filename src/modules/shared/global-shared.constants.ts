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
  I18n: {
    DefaultLocale: 'en'
  },
  InterfaceReadyTimeout: 150,
  LookaheadMinChars: 2,
  MinApiVersion: '1.1.9',
  PathToAssets: 'assets',
  QrCode: {
    Delimiter: '|$$|'
  },
  ReleaseNotesUrlStem: 'https://github.com/xbrowsersync/app/releases/tag/v',
  ReleaseLatestUrl: 'https://api.github.com/repos/xbrowsersync/app/releases/latest',
  Title: 'xBrowserSync',
  URL: {
    DefaultServiceUrl: 'https://api.xbrowsersync.org',
    HttpRegex: '^https?://\\w+',
    ProtocolRegex: '^[\\w-]+:',
    ValidUrlRegex:
      '((([A-Za-z]{3,9}:(?:\\/\\/)?)(?:[\\-;:&=\\+\\$,\\w]+@)?[A-Za-z0-9\\.\\-]+|(?:www\\.|[\\-;:&=\\+\\$,\\w]+@)[A-Za-z0-9\\.\\-]+)((?:\\/[\\+~%\\/\\.\\w\\-_]*)?\\??(?:[\\-\\+=&;%@\\.\\w_]*)#?(?:[\\.\\!\\/\\\\\\w]*))?)'
  }
};
