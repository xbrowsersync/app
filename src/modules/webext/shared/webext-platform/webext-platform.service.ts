import angular from 'angular';
import autobind from 'autobind-decorator';
import { browser, Tabs } from 'webextension-polyfill-ts';
import AlertService from '../../../shared/alert/alert.service';
import BookmarkHelperService from '../../../shared/bookmark/bookmark-helper/bookmark-helper.service';
import * as Exceptions from '../../../shared/exception/exception';
import Globals from '../../../shared/global-shared.constants';
import { BrowserName, MessageCommand, PlatformType } from '../../../shared/global-shared.enum';
import { I18nObject, PlatformService, WebpageMetadata } from '../../../shared/global-shared.interface';
import LogService from '../../../shared/log/log.service';
import StoreService from '../../../shared/store/store.service';
import { SyncType } from '../../../shared/sync/sync.enum';
import { Sync, SyncResult } from '../../../shared/sync/sync.interface';
import UtilityService from '../../../shared/utility/utility.service';
import WorkingService from '../../../shared/working/working.service';
import { Message, SyncBookmarksMessage } from '../../webext.interface';
import WebExtBackgroundService from '../../webext-background/webext-background.service';
import BookmarkIdMapperService from '../bookmark-id-mapper/bookmark-id-mapper.service';

@autobind
export default abstract class WebExtPlatformService implements PlatformService {
  Strings = require('../../../../../res/strings/en.json');

  $injector: ng.auto.IInjectorService;
  $interval: ng.IIntervalService;
  $q: ng.IQService;
  $timeout: ng.ITimeoutService;
  alertSvc: AlertService;
  _backgroundSvc: WebExtBackgroundService | undefined;
  bookmarkIdMapperSvc: BookmarkIdMapperService;
  bookmarkHelperSvc: BookmarkHelperService;
  logSvc: LogService;
  storeSvc: StoreService;
  utilitySvc: UtilityService;
  workingSvc: WorkingService;

  contentScriptUrl = 'assets/webpage-metadata-collecter.js';
  optionalPermissions = {
    origins: ['http://*/', 'https://*/']
  };
  refreshInterfaceTimeout: any;

  static $inject = [
    '$injector',
    '$interval',
    '$q',
    '$timeout',
    'AlertService',
    'BookmarkHelperService',
    'BookmarkIdMapperService',
    'LogService',
    'StoreService',
    'UtilityService',
    'WorkingService'
  ];
  constructor(
    $injector: ng.auto.IInjectorService,
    $interval: ng.IIntervalService,
    $q: ng.IQService,
    $timeout: ng.ITimeoutService,
    AlertSvc: AlertService,
    BookmarkHelperSvc: BookmarkHelperService,
    BookmarkIdMapperSvc: BookmarkIdMapperService,
    LogSvc: LogService,
    StoreSvc: StoreService,
    UtilitySvc: UtilityService,
    WorkingSvc: WorkingService
  ) {
    this.$injector = $injector;
    this.$interval = $interval;
    this.$q = $q;
    this.$timeout = $timeout;
    this.alertSvc = AlertSvc;
    this.bookmarkIdMapperSvc = BookmarkIdMapperSvc;
    this.bookmarkHelperSvc = BookmarkHelperSvc;
    this.logSvc = LogSvc;
    this.storeSvc = StoreSvc;
    this.utilitySvc = UtilitySvc;
    this.workingSvc = WorkingSvc;
  }
  platformName = '';

  get backgroundSvc(): WebExtBackgroundService {
    if (angular.isUndefined(this._backgroundSvc)) {
      this._backgroundSvc = this.$injector.get('WebExtBackgroundService');
    }
    return this._backgroundSvc as WebExtBackgroundService;
  }

  checkOptionalNativePermissions(): ng.IPromise<boolean> {
    // Check if extension has optional permissions
    return this.$q.resolve().then(() => {
      return browser.permissions.contains(this.optionalPermissions);
    });
  }

  disableNativeEventListeners(): ng.IPromise<void> {
    return this.sendMessage({
      command: MessageCommand.DisableEventListeners
    });
  }

  disableSync(): ng.IPromise<any> {
    return this.sendMessage({
      command: MessageCommand.DisableSync
    });
  }

  enableNativeEventListeners(): ng.IPromise<void> {
    return this.sendMessage({
      command: MessageCommand.EnableEventListeners
    });
  }

  getAppVersion(): ng.IPromise<string> {
    return this.$q.resolve(browser.runtime.getManifest().version);
  }

  getCurrentLocale(): ng.IPromise<string> {
    return Promise.resolve(browser.i18n.getUILanguage());
  }

  getCurrentUrl(): ng.IPromise<string> {
    // Get current tab
    return browser.tabs.query({ currentWindow: true, active: true }).then((tabs) => {
      return tabs[0].url ?? '';
    });
  }

  getI18nString(i18nObj: I18nObject): string {
    let i18nStr: string;
    let platformName = this.platformName.toString();
    if (platformName === PlatformType.Chromium) {
      const browserName = this.utilitySvc.getBrowserName() as string;
      platformName = browserName !== BrowserName.Chrome ? browserName : platformName;
    }

    // If the i18n object contains a string for this platform then use that, otherwise use the default
    if (Object.keys(i18nObj).includes(platformName)) {
      i18nStr = browser.i18n.getMessage(`${i18nObj.key}_${platformName}`);
    } else {
      i18nStr = browser.i18n.getMessage(`${i18nObj.key}_Default`);
    }

    if (angular.isUndefined(i18nStr ?? undefined)) {
      throw new Exceptions.I18nException('I18n string has no value');
    }

    return i18nStr;
  }

  abstract getNewTabUrl(): string;

  getPageMetadata(getFullMetadata = true, pageUrl?: string): ng.IPromise<WebpageMetadata> {
    return browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      // If active tab empty, throw error
      const activeTab = tabs?.[0];
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
        .then(() => {
          return browser.tabs.executeScript(activeTab.id, {
            code: 'WebpageMetadataCollecter.CollectMetadata();'
          });
        })
        .then((response) => {
          if (response?.length && response?.[0]) {
            metadata = response[0];
          }

          // If no metadata returned, use the info from the active tab
          metadata.title = metadata.title ?? activeTab.title;
          metadata.url = metadata.url ?? activeTab.url;
          return metadata;
        })
        .catch((err) => {
          this.logSvc.logWarning(`Unable to get metadata: ${err ? err.message : ''}`);
          return metadata;
        });
    });
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
        return tabs?.length > 0 && tabs?.[0].url && tabs?.[0].url.startsWith(this.getNewTabUrl())
          ? browser.tabs.update(tabs[0].id, { url }).then(window.close)
          : openInNewTab(url);
      })
      .catch(openInNewTab);
  }

  queueLocalResync(): ng.IPromise<void> {
    return this.queueSync({ type: SyncType.Local }).then(() => {
      this.logSvc.logInfo('Local sync data refreshed');
    });
  }

  queueSync(sync: Sync, command = MessageCommand.SyncBookmarks, runSync = true): ng.IPromise<SyncResult> {
    const message: SyncBookmarksMessage = {
      command,
      sync,
      runSync
    };
    return this.sendMessage(message).finally(this.workingSvc.hide);
  }

  refreshNativeInterface(syncEnabled?: boolean, syncType?: SyncType): ng.IPromise<void> {
    let iconPath: string;
    let newTitle = this.getI18nString(this.Strings.App.Title);
    const syncingTitle = ` (${this.getI18nString(this.Strings.Tooltip.Syncing)})`;
    const syncedTitle = ` (${this.getI18nString(this.Strings.Tooltip.Synced)})`;
    const notSyncedTitle = ` (${this.getI18nString(this.Strings.Tooltip.NotSynced)})`;

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

  sendMessage(message: Message): ng.IPromise<any> {
    // If background module loaded use browser API to send the message
    let module: ng.IModule | undefined;
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
      // Recreate the error object as webextension-polyfill wraps the object before returning it
      const exception: Exceptions.Exception = new (<any>Exceptions)[err.message]();
      exception.logged = true;
      throw exception;
    });
  }

  startSyncUpdateChecks(): ng.IPromise<void> {
    // Register alarm
    return browser.alarms
      .clear(Globals.Alarm.Name)
      .then(() => {
        return browser.alarms.create(Globals.Alarm.Name, {
          periodInMinutes: Globals.Alarm.Period
        });
      })
      .catch((err) => {
        throw new Exceptions.FailedRegisterAutoUpdatesException(undefined, err);
      });
  }

  stopSyncUpdateChecks(): ng.IPromise<void> {
    // Clear registered alarm
    return browser.alarms.clear(Globals.Alarm.Name).then(() => {});
  }

  urlIsNativeConfigPage(url: string | undefined): boolean {
    return false;
  }

  urlIsSupported(url: string): boolean {
    return true;
  }
}
