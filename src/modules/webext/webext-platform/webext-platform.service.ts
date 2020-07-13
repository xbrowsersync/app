import angular from 'angular';
import { autobind } from 'core-decorators';
import { browser, Tabs } from 'webextension-polyfill-ts';
import Strings from '../../../../res/strings/en.json';
import BookmarkHelperService from '../../shared/bookmark/bookmark-helper/bookmark-helper.service';
import * as Exceptions from '../../shared/exception/exception';
import Globals from '../../shared/global-shared.constants';
import { MessageCommand } from '../../shared/global-shared.enum';
import { I18nString, PlatformService, WebpageMetadata } from '../../shared/global-shared.interface';
import LogService from '../../shared/log/log.service';
import StoreService from '../../shared/store/store.service';
import { SyncType } from '../../shared/sync/sync.enum';
import { Sync } from '../../shared/sync/sync.interface';
import UtilityService from '../../shared/utility/utility.service';
import BookmarkIdMapperService from '../bookmark-id-mapper/bookmark-id-mapper.service';
import WebExtBackgroundService from '../webext-background/webext-background.service';

@autobind
export default class WebExtPlatformService implements PlatformService {
  $injector: ng.auto.IInjectorService;
  $interval: ng.IIntervalService;
  $q: ng.IQService;
  $timeout: ng.ITimeoutService;
  _backgroundSvc: WebExtBackgroundService;
  bookmarkIdMapperSvc: BookmarkIdMapperService;
  bookmarkHelperSvc: BookmarkHelperService;
  logSvc: LogService;
  storeSvc: StoreService;
  utilitySvc: UtilityService;

  contentScriptUrl = 'assets/webpage-metadata-collecter.js';
  loadingId: string;
  optionalPermissions = {
    origins: ['http://*/', 'https://*/']
  };
  refreshInterfaceTimeout: any;
  showAlert: boolean;
  showWorking: boolean;

  static $inject = [
    '$injector',
    '$interval',
    '$q',
    '$timeout',
    'BookmarkHelperService',
    'BookmarkIdMapperService',
    'LogService',
    'StoreService',
    'UtilityService'
  ];
  constructor(
    $injector: ng.auto.IInjectorService,
    $interval: ng.IIntervalService,
    $q: ng.IQService,
    $timeout: ng.ITimeoutService,
    BookmarkHelperSvc: BookmarkHelperService,
    BookmarkIdMapperSvc: BookmarkIdMapperService,
    LogSvc: LogService,
    StoreSvc: StoreService,
    UtilitySvc: UtilityService
  ) {
    this.$injector = $injector;
    this.$interval = $interval;
    this.$q = $q;
    this.$timeout = $timeout;
    this.bookmarkIdMapperSvc = BookmarkIdMapperSvc;
    this.bookmarkHelperSvc = BookmarkHelperSvc;
    this.logSvc = LogSvc;
    this.storeSvc = StoreSvc;
    this.utilitySvc = UtilitySvc;

    this.showAlert = false;
    this.showWorking = false;
  }

  get backgroundSvc(): WebExtBackgroundService {
    if (angular.isUndefined(this._backgroundSvc)) {
      this._backgroundSvc = this.$injector.get('WebExtBackgroundService');
    }
    return this._backgroundSvc;
  }

  automaticUpdates_NextUpdate(): ng.IPromise<string> {
    return browser.alarms.get(Globals.Alarm.Name).then((alarm) => {
      if (!alarm) {
        return '';
      }

      return this.get24hrTimeFromDate(new Date(alarm.scheduledTime));
    });
  }

  automaticUpdates_Start(): ng.IPromise<void> {
    // Register alarm
    return browser.alarms
      .clear(Globals.Alarm.Name)
      .then(() => {
        return browser.alarms.create(Globals.Alarm.Name, {
          periodInMinutes: Globals.Alarm.Period
        });
      })
      .catch((err) => {
        throw new Exceptions.FailedRegisterAutoUpdatesException(null, err);
      });
  }

  automaticUpdates_Stop(): ng.IPromise<void> {
    // Clear registered alarm
    return browser.alarms.clear(Globals.Alarm.Name).then(() => {});
  }

  copyTextToClipboard(text: string): ng.IPromise<void> {
    return navigator.clipboard.writeText(text);
  }

  downloadFile(fileName: string, textContents: string, linkId: string): ng.IPromise<string> {
    if (!fileName) {
      throw new Error('File name not supplied.');
    }

    // Use provided hyperlink or create new one
    let downloadLink: HTMLAnchorElement;
    if (linkId) {
      downloadLink = document.getElementById(linkId) as HTMLAnchorElement;
    } else {
      downloadLink = document.createElement('a');
      downloadLink.style.display = 'none';
      document.body.appendChild(downloadLink);
    }

    if (!downloadLink) {
      throw new Error('Link element not found.');
    }

    this.logSvc.logInfo(`Downloading file ${fileName}`);

    // Use hyperlink to trigger file download
    const file = new Blob([textContents], { type: 'text/plain' });
    downloadLink.href = URL.createObjectURL(file);
    downloadLink.innerText = fileName;
    downloadLink.download = fileName;
    downloadLink.click();

    if (!linkId) {
      document.body.removeChild(downloadLink);
    }

    // Return message to be displayed
    const message = this.getConstant(Strings.downloadFile_Success_Message);
    return this.$q.resolve(message);
  }

  eventListeners_Disable(): ng.IPromise<void> {
    return this.sendMessage({
      command: MessageCommand.DisableEventListeners
    });
  }

  eventListeners_Enable(): ng.IPromise<void> {
    return this.sendMessage({
      command: MessageCommand.EnableEventListeners
    });
  }

  get24hrTimeFromDate(date = new Date()): string {
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }

  getConstant(i18nString: I18nString): string {
    let message = '';

    if (i18nString && i18nString.key) {
      message = browser.i18n.getMessage(i18nString.key);
    }

    if (!message) {
      this.logSvc.logWarning('I18n string has no value');
    }

    return message;
  }

  getCurrentUrl(): ng.IPromise<string> {
    // Get current tab
    return browser.tabs.query({ currentWindow: true, active: true }).then((tabs) => {
      return tabs[0].url;
    });
  }

  getHelpPages(): string[] {
    const pages = [
      this.getConstant(Strings.help_Page_Welcome_Desktop_Content),
      this.getConstant(Strings.help_Page_BeforeYouBegin_Chrome_Content),
      this.getConstant(Strings.help_Page_FirstSync_Desktop_Content),
      this.getConstant(Strings.help_Page_Service_Content),
      this.getConstant(Strings.help_Page_SyncId_Content),
      this.getConstant(Strings.help_Page_ExistingId_Desktop_Content),
      this.getConstant(Strings.help_Page_Searching_Desktop_Content),
      this.getConstant(Strings.help_Page_AddingBookmarks_Chrome_Content),
      this.getConstant(Strings.help_Page_NativeFeatures_Chrome_Content),
      this.getConstant(Strings.help_Page_BackingUp_Desktop_Content),
      this.getConstant(Strings.help_Page_Shortcuts_Chrome_Content),
      this.getConstant(Strings.help_Page_Mobile_Content),
      this.getConstant(Strings.help_Page_FurtherSupport_Content)
    ];

    return pages;
  }

  getNewTabUrl(): string {
    return 'chrome://newtab/';
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getPageMetadata(getFullMetadata = true, pageUrl?: string): ng.IPromise<WebpageMetadata> {
    return browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      // If active tab empty, throw error
      const activeTab = tabs && tabs[0];
      if (!activeTab) {
        throw new Exceptions.FailedGetPageMetadataException();
      }

      // Default metadata to the info from the active tab
      let metadata: WebpageMetadata = activeTab && {
        title: activeTab.title,
        url: activeTab.url
      };

      // Don't get metadata if this is a native config page url
      if (getFullMetadata) {
        getFullMetadata = !this.urlIsNativeConfigPage(activeTab.url);
      }

      // If not retrieving full metadata return with default
      if (!getFullMetadata) {
        return metadata;
      }

      return browser.tabs
        .executeScript(activeTab.id, { file: this.contentScriptUrl })
        .then((response) => {
          if (response && response.length > 0 && response[0].default) {
            metadata = response[0].default;
          }

          // If no metadata returned, use the info from the active tab
          metadata.title = metadata.title || activeTab.title;
          metadata.url = metadata.url || activeTab.url;
          return metadata;
        })
        .catch((err) => {
          this.logSvc.logWarning(`Unable to get metadata: ${err ? err.message : ''}`);
          return metadata;
        });
    });
  }

  interface_Refresh(syncEnabled?: boolean, syncType?: SyncType): ng.IPromise<void> {
    let iconPath: string;
    let newTitle = this.getConstant(Strings.title);
    const syncingTitle = ` (${this.getConstant(Strings.tooltip_Syncing_Label)})`;
    const syncedTitle = ` (${this.getConstant(Strings.tooltip_Synced_Label)})`;
    const notSyncedTitle = ` (${this.getConstant(Strings.tooltip_NotSynced_Label)})`;

    // Clear timeout
    if (this.refreshInterfaceTimeout) {
      this.$timeout.cancel(this.refreshInterfaceTimeout);
      this.refreshInterfaceTimeout = null;
    }

    if (syncType) {
      iconPath =
        syncType === SyncType.Local
          ? `${Globals.PathToAssets}/downloading.png`
          : `${Globals.PathToAssets}/uploading.png`;
      newTitle += syncingTitle;
    } else if (syncEnabled) {
      iconPath = `${Globals.PathToAssets}/synced.png`;
      newTitle += syncedTitle;
    } else {
      iconPath = `${Globals.PathToAssets}/notsynced.png`;
      newTitle += notSyncedTitle;
    }

    return this.$q((resolve, reject) => {
      const iconUpdated = this.$q.defer<void>();
      const titleUpdated = this.$q.defer<void>();

      browser.browserAction.getTitle({}).then((currentTitle) => {
        // Don't do anything if browser action title hasn't changed
        if (newTitle === currentTitle) {
          return resolve();
        }

        // Set a delay if finished syncing to prevent flickering when executing many syncs
        if (currentTitle.indexOf(syncingTitle) > 0 && newTitle.indexOf(syncedTitle)) {
          this.refreshInterfaceTimeout = this.$timeout(() => {
            browser.browserAction.setIcon({ path: iconPath });
            browser.browserAction.setTitle({ title: newTitle });
          }, 350);
          iconUpdated.resolve();
          titleUpdated.resolve();
        } else {
          browser.browserAction.setIcon({ path: iconPath }).then(iconUpdated.resolve);
          browser.browserAction.setTitle({ title: newTitle }).then(titleUpdated.resolve);
        }

        this.$q.all([iconUpdated, titleUpdated]).then(resolve).catch(reject);
      });
    });
  }

  interface_Working_Hide(id?: string, timeout?: ng.IPromise<void>): void {
    if (timeout) {
      this.$timeout.cancel(timeout);
    }

    // Hide any alert messages
    this.showAlert = false;

    // Hide loading overlay if supplied if matches current
    if (!this.loadingId || id === this.loadingId) {
      this.showWorking = false;
      this.loadingId = null;
    }
  }

  interface_Working_Show(id?: string): ng.IPromise<void> {
    let timeout: ng.IPromise<void>;

    // Return if loading overlay already displayed
    if (this.loadingId) {
      return;
    }

    // Hide any alert messages
    this.showAlert = false;

    switch (id) {
      // Loading bookmark metadata, wait a moment before displaying loading overlay
      case 'retrievingMetadata':
        timeout = this.$timeout(() => {
          this.showWorking = true;
        }, 500);
        break;
      // Display default overlay
      default:
        timeout = this.$timeout(() => {
          this.showWorking = true;
        });
        break;
    }

    this.loadingId = id;
    return timeout;
  }

  openUrl(url: string): void {
    const createProperties: Tabs.CreateCreatePropertiesType = {};

    const openInNewTab = (urlToOpen?: string) => {
      if (urlToOpen) {
        createProperties.url = urlToOpen;
      }
      return browser.tabs.create(createProperties).then(window.close);
    };

    // Attempting to navigate to unsupported urls can cause errors
    // Check url is supported, otherwise navigate to new tab url
    if (!this.urlIsSupported(url)) {
      this.logSvc.logInfo(`Attempted to navigate to unsupported url: ${url}`);
      openInNewTab();
      return;
    }

    browser.tabs
      .query({ currentWindow: true, active: true })
      .then((tabs) => {
        // Open url in current tab if new then close the extension window
        return tabs && tabs.length > 0 && tabs[0].url && tabs[0].url.startsWith(this.getNewTabUrl())
          ? browser.tabs.update(tabs[0].id, { url }).then(window.close)
          : openInNewTab(url);
      })
      .catch(openInNewTab);
  }

  permissions_Check(): ng.IPromise<boolean> {
    // Check if extension has optional permissions
    return this.$q.resolve().then(() => {
      return browser.permissions.contains(this.optionalPermissions);
    });
  }

  permissions_Remove(): ng.IPromise<void> {
    // Remove optional permissions
    return browser.permissions.remove(this.optionalPermissions).then(() => {
      this.logSvc.logInfo('Optional permissions removed');
    });
  }

  permissions_Request(): ng.IPromise<boolean> {
    // Request optional permissions
    return browser.permissions.request(this.optionalPermissions).then((granted) => {
      this.logSvc.logInfo(`Optional permissions ${!granted ? 'not ' : ''}granted`);
      return granted;
    });
  }

  refreshLocalSyncData(): ng.IPromise<void> {
    return this.sync_Queue({ type: SyncType.Local }).then(() => {
      this.logSvc.logInfo('Local sync data refreshed');
    });
  }

  sendMessage(message: any): ng.IPromise<any> {
    let module: ng.IModule;
    try {
      module = angular.module('WebExtBackgroundModule');
    } catch (err) {}

    let promise: ng.IPromise<any>;
    if (angular.isUndefined(module)) {
      promise = browser.runtime.sendMessage(message);
    } else {
      promise = this.backgroundSvc.onMessage(message);
    }

    return promise.catch((err: Error) => {
      const exception: Exceptions.Exception = new (<any>Exceptions)[err.message]();
      exception.logged = true;
      throw exception;
    });
  }

  sync_Current(): ng.IPromise<Sync> {
    return this.sendMessage({
      command: MessageCommand.GetCurrentSync
    });
  }

  sync_Disable(): ng.IPromise<any> {
    return this.sendMessage({
      command: MessageCommand.DisableSync
    });
  }

  sync_DisplayConfirmation(): boolean {
    return true;
  }

  sync_GetQueueLength(): ng.IPromise<number> {
    return this.sendMessage({
      command: MessageCommand.GetSyncQueueLength
    });
  }

  sync_Queue(sync: Sync, command = MessageCommand.SyncBookmarks, runSync = true): ng.IPromise<any> {
    const message: any = angular.copy(sync);
    message.command = command;
    message.runSync = runSync;
    return this.sendMessage(message);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  urlIsNativeConfigPage(url: string): boolean {
    return false;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  urlIsSupported(url: string): boolean {
    return true;
  }
}
