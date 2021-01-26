export default {
  Alarm: {
    Name: 'xBrowserSync-alarm',
    Period: 15
  },
  Bookmarks: {
    ContainerPrefix: '[xbs]',
    DescriptionMaxLength: 300,
    HorizontalSeparatorTitle:
      '────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────',
    SeparatorUrl: 'xbs:separator',
    VerticalSeparatorTitle: '|'
  },
  InterfaceReadyTimeout: 150,
  LookaheadMinChars: 2,
  MinApiVersion: '1.1.9',
  PathToAssets: 'assets',
  QrCode: {
    Delimiter: '|$$|'
  },
  Regex: {
    Url: /(https?|ftp):\/\/(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!$&'()*+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!$&'()*+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!$&'()*+,;=]|:|@)*)*)?)?(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!$&'()*+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!$&'()*+,;=]|:|@)|\/|\?)*)?$/i
  },
  ReleaseNotesUrlStem: 'https://github.com/xbrowsersync/app/releases/tag/v',
  ReleaseLatestUrl: 'https://api.github.com/repos/xbrowsersync/app/releases/latest',
  SyncPollTimeout: 2000,
  Title: 'xBrowserSync',
  URL: {
    DefaultServiceUrl: 'https://api.xbrowsersync.org',
    HttpRegex: '^https?://\\w+',
    ProtocolRegex: '^[\\w-]+:',
    ValidUrlRegex:
      '(\\w+://)?((www\\.)?[-a-zA-Z0-9@:%._\\+~#=]+\\.[a-z]+|(\\d{1,3}\\.){3}\\d{1,3})\\b([-a-zA-Z0-9@:%_\\+.~#?&//=]*)'
  }
};
