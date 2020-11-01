/* eslint-disable @typescript-eslint/no-explicit-any */

interface Window {
  cordova: Cordova;
  device: any;
  NativeStorage: any;
  plugins: any;
  QRScanner: any;
  resolveLocalFileSystemURL: any;
  SpinnerDialog: any;
  sqlitePlugin: any;
}

interface Cordova {
  file: any;
  getAppVersion: any;
  InAppBrowser: any;
}

interface CordovaPlugins {
  backgroundMode: any;
  clipboard: any;
  exit: () => void;
  snackbar: any;
  ThemeDetection: any;
}

interface Navigator {
  brave: any;
  globalization: any;
}
