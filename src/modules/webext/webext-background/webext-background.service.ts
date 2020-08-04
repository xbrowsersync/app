import angular from 'angular';
import { Injectable } from 'angular-ts-decorators';
import browserDetect from 'browser-detect';
import compareVersions from 'compare-versions';
import { autobind } from 'core-decorators';
import _ from 'underscore';
import { Alarms, browser, Notifications } from 'webextension-polyfill-ts';
import Strings from '../../../../res/strings/en.json';
import { Alert } from '../../shared/alert/alert.interface';
import AlertService from '../../shared/alert/alert.service';
import BookmarkHelperService from '../../shared/bookmark/bookmark-helper/bookmark-helper.service';
import * as Exceptions from '../../shared/exception/exception';
import Globals from '../../shared/global-shared.constants';
import { MessageCommand } from '../../shared/global-shared.enum';
import { Message, PlatformService } from '../../shared/global-shared.interface';
import LogService from '../../shared/log/log.service';
import NetworkService from '../../shared/network/network.service';
import { StoreKey } from '../../shared/store/store.enum';
import StoreService from '../../shared/store/store.service';
import SyncEngineService from '../../shared/sync/sync-engine/sync-engine.service';
import { SyncType } from '../../shared/sync/sync.enum';
import { Sync } from '../../shared/sync/sync.interface';
import UtilityService from '../../shared/utility/utility.service';
import BookmarkIdMapperService from '../bookmark-id-mapper/bookmark-id-mapper.service';
import ChromiumBookmarkService from '../chromium/chromium-bookmark/chromium-bookmark.service';
import { InstallBackup } from '../webext.interface';

@autobind
@Injectable('WebExtBackgroundService')
export default class WebExtBackgroundService {
  $q: ng.IQService;
  $timeout: ng.ITimeoutService;
  alertSvc: AlertService;
  bookmarkIdMapperSvc: BookmarkIdMapperService;
  bookmarkHelperSvc: BookmarkHelperService;
  bookmarkSvc: ChromiumBookmarkService;
  logSvc: LogService;
  networkSvc: NetworkService;
  platformSvc: PlatformService;
  storeSvc: StoreService;
  syncEngineSvc: SyncEngineService;
  utilitySvc: UtilityService;

  notificationClickHandlers: any[] = [];

  static $inject = [
    '$q',
    '$timeout',
    'AlertService',
    'BookmarkHelperService',
    'BookmarkIdMapperService',
    'BookmarkService',
    'LogService',
    'NetworkService',
    'PlatformService',
    'StoreService',
    'SyncEngineService',
    'UtilityService'
  ];
  constructor(
    $q: ng.IQService,
    $timeout: ng.ITimeoutService,
    AlertSvc: AlertService,
    BookmarkHelperSvc: BookmarkHelperService,
    BookmarkIdMapperSvc: BookmarkIdMapperService,
    BookmarkSvc: ChromiumBookmarkService,
    LogSvc: LogService,
    NetworkSvc: NetworkService,
    PlatformSvc: PlatformService,
    StoreSvc: StoreService,
    SyncEngineSvc: SyncEngineService,
    UtilitySvc: UtilityService
  ) {
    this.$q = $q;
    this.$timeout = $timeout;
    this.alertSvc = AlertSvc;
    this.bookmarkIdMapperSvc = BookmarkIdMapperSvc;
    this.bookmarkHelperSvc = BookmarkHelperSvc;
    this.bookmarkSvc = BookmarkSvc;
    this.logSvc = LogSvc;
    this.networkSvc = NetworkSvc;
    this.platformSvc = PlatformSvc;
    this.storeSvc = StoreSvc;
    this.syncEngineSvc = SyncEngineSvc;
    this.utilitySvc = UtilitySvc;

    browser.alarms.onAlarm.addListener(this.onAlarm);
    browser.notifications.onClicked.addListener(this.onNotificationClicked);
    browser.notifications.onClosed.addListener(this.onNotificationClosed);
    browser.runtime.onMessage.addListener(this.onMessage);
  }

  checkForNewVersion(): void {
    this.platformSvc.getAppVersion().then((appVersion) => {
      return this.utilitySvc.checkForNewVersion(appVersion).then((newVersion) => {
        if (!newVersion) {
          return;
        }

        const alert: Alert = {
          message: this.platformSvc.getI18nString(Strings.appUpdateAvailable_Message).replace('{version}', newVersion),
          title: this.platformSvc.getI18nString(Strings.appUpdateAvailable_Title)
        };
        this.displayAlert(alert, Globals.ReleaseNotesUrlStem + newVersion.replace(/^v/, ''));
      });
    });
  }

  checkForSyncUpdates(): ng.IPromise<any> {
    // Exit if currently syncing
    const currentSync = this.syncEngineSvc.getCurrentSync();
    if (currentSync) {
      return this.$q.resolve();
    }

    // Exit if sync not enabled
    return this.storeSvc
      .get<boolean>(StoreKey.SyncEnabled)
      .then((syncEnabled) => {
        if (!syncEnabled) {
          return;
        }

        return this.syncEngineSvc.checkForUpdates().then((updatesAvailable) => {
          if (!updatesAvailable) {
            return;
          }

          // Queue sync
          return this.platformSvc.queueSync({
            type: SyncType.Local
          });
        });
      })
      .catch((err) => {
        // Don't display alert if sync failed due to network connection
        if (this.networkSvc.isNetworkConnectionError(err)) {
          this.logSvc.logInfo('Could not check for updates, no connection');
          return;
        }

        // If ID was removed disable sync
        if (err instanceof Exceptions.NoDataFoundException) {
          this.syncEngineSvc.disableSync();
          throw new Exceptions.SyncRemovedException(undefined, err);
        }

        throw err;
      });
  }

  checkForSyncUpdatesOnStartup(): ng.IPromise<any> {
    return this.$q<boolean>((resolve, reject) => {
      return this.storeSvc.get<boolean>(StoreKey.SyncEnabled).then((syncEnabled) => {
        if (!syncEnabled) {
          return resolve(false);
        }

        // If network disconnected, skip update check
        if (!this.networkSvc.isNetworkConnected()) {
          this.logSvc.logInfo('Couldn’t check for updates on startup: network offline');
          return resolve(false);
        }

        // Check for updates to synced bookmarks
        this.syncEngineSvc
          .checkForUpdates()
          .then(resolve)
          .catch((err) => {
            if (!(err instanceof Exceptions.HttpRequestFailedException)) {
              return reject(err);
            }

            // If request failed, retry once
            this.logSvc.logInfo('Connection to API failed, retrying check for sync updates momentarily');
            this.$timeout(() => {
              this.storeSvc.get<boolean>(StoreKey.SyncEnabled).then((syncEnabledAfterError) => {
                if (!syncEnabledAfterError) {
                  this.logSvc.logInfo('Sync was disabled before retry attempted');
                  return reject(new Exceptions.HttpRequestCancelledException());
                }
                this.syncEngineSvc.checkForUpdates().then(resolve).catch(reject);
              });
            }, 5000);
          });
      });
    }).then((updatesAvailable) => {
      if (!updatesAvailable) {
        return;
      }

      // Queue sync
      return this.platformSvc.queueSync({
        type: SyncType.Local
      });
    });
  }

  displayAlert(alert: Alert, url?: string): void {
    // Strip html tags from message
    const urlRegex = new RegExp(Globals.URL.ValidUrlRegex);
    const matches = alert.message.match(urlRegex);
    const messageToDisplay =
      matches?.length === 0
        ? alert.message
        : new DOMParser().parseFromString(`<span>${alert.message}</span>`, 'text/xml').firstElementChild.textContent;

    const options: Notifications.CreateNotificationOptions = {
      iconUrl: `${Globals.PathToAssets}/notification.svg`,
      message: messageToDisplay,
      title: alert.title,
      type: 'basic'
    };

    // Display notification
    browser.notifications.create(this.utilitySvc.getUniqueishId(), options).then((notificationId) => {
      // Add a click handler to open url if provided or if the message contains a url
      let urlToOpenOnClick = url;
      if (matches?.length > 0) {
        urlToOpenOnClick = matches[0];
      }

      if (urlToOpenOnClick) {
        const openUrlInNewTab = () => {
          this.platformSvc.openUrl(urlToOpenOnClick);
        };
        this.notificationClickHandlers.push({
          id: notificationId,
          eventHandler: openUrlInNewTab
        });
      }
    });
  }

  init(): void {
    this.logSvc.logInfo('Starting up');
    this.$q
      .all([
        this.platformSvc.getAppVersion(),
        this.storeSvc.get([
          StoreKey.CheckForAppUpdates,
          StoreKey.LastUpdated,
          StoreKey.ServiceUrl,
          StoreKey.SyncBookmarksToolbar,
          StoreKey.SyncEnabled,
          StoreKey.SyncId,
          StoreKey.SyncVersion
        ])
      ])
      .then((data) => {
        const appVersion = data[0];
        const storeContent = data[1];

        // Add useful debug info to beginning of trace log
        const debugInfo = angular.copy(storeContent) as any;
        debugInfo.appVersion = appVersion;
        debugInfo.platform = _.omit(browserDetect(), 'versionNumber');
        this.logSvc.logInfo(
          Object.keys(debugInfo)
            .filter((key) => {
              return debugInfo[key] != null;
            })
            .reduce((prev, current) => {
              prev[current] = debugInfo[current];
              return prev;
            }, {})
        );

        // Update browser action icon
        this.platformSvc.refreshNativeInterface(storeContent.syncEnabled);

        // Check for new app version after a delay
        if (storeContent.checkForAppUpdates) {
          this.$timeout(this.checkForNewVersion, 5e3);
        }

        // Exit if sync not enabled
        if (!storeContent.syncEnabled) {
          return;
        }

        // Enable sync
        return this.syncEngineSvc.enableSync().then(() => {
          // Check for updates after a delay to allow for initialising network connection
          this.$timeout(this.checkForSyncUpdatesOnStartup, 5e3);
        });
      });
  }

  installExtension(currentVersion: string): ng.IPromise<void> {
    // Initialise data storage
    return this.storeSvc
      .clear()
      .then(() => {
        return this.$q.all([
          this.storeSvc.set(StoreKey.CheckForAppUpdates, true),
          this.storeSvc.set(StoreKey.DisplayHelp, true),
          this.storeSvc.set(StoreKey.SyncBookmarksToolbar, true),
          this.storeSvc.set(StoreKey.DisplayPermissions, true)
        ]);
      })
      .then(() => {
        // Get locnativeal bookmarks and save data state at install to local storage
        return this.bookmarkSvc.getNativeBookmarksAsBookmarks().then((bookmarks) => {
          const backup: InstallBackup = {
            bookmarks,
            date: new Date().toISOString()
          };
          return this.storeSvc.set(StoreKey.InstallBackup, JSON.stringify(backup));
        });
      })
      .then(() => {
        this.logSvc.logInfo(`Installed v${currentVersion}`);
      });
  }

  onAlarm(alarm: Alarms.Alarm): void {
    // When alarm fires check for sync updates
    if (alarm?.name === Globals.Alarm.Name) {
      this.checkForSyncUpdates();
    }
  }

  onInstall(event: InputEvent): void {
    const currentVersion = browser.runtime.getManifest().version;
    let installOrUpgrade = this.$q.resolve();

    // Check for upgrade or do fresh install
    const details = angular.element(event.currentTarget as Element).data('details');
    if (details?.reason === 'install') {
      installOrUpgrade = this.installExtension(currentVersion);
    } else if (
      details?.reason === 'update' &&
      details?.previousVersion &&
      compareVersions.compare(details.previousVersion, currentVersion, '<')
    ) {
      installOrUpgrade = this.upgradeExtension(details.previousVersion, currentVersion);
    }

    // Run startup process after install/upgrade
    installOrUpgrade.then(this.init);
  }

  onNotificationClicked(notificationId: string): void {
    // Execute the event handler if one exists and then remove
    const notificationClickHandler = this.notificationClickHandlers.find((x) => {
      return x.id === notificationId;
    });
    if (notificationClickHandler != null) {
      notificationClickHandler.eventHandler();
      browser.notifications.clear(notificationId);
    }
  }

  onNotificationClosed(notificationId: string): void {
    // Remove the handler for this notification if one exists
    const index = this.notificationClickHandlers.findIndex((x) => {
      return x.id === notificationId;
    });
    if (index >= 0) {
      this.notificationClickHandlers.splice(index, 1);
    }
  }

  onMessage(message: Message): Promise<any> {
    // Use native Promise not $q otherwise browser.runtime.sendMessage will return immediately in Firefox
    return new Promise((resolve, reject) => {
      let action: ng.IPromise<any>;
      switch (message.command) {
        // Queue bookmarks sync
        case MessageCommand.SyncBookmarks:
          action = this.runSyncBookmarksCommand(message.sync, message.runSync);
          break;
        // Trigger bookmarks restore
        case MessageCommand.RestoreBookmarks:
          action = this.runRestoreBookmarksCommand(message.sync);
          break;
        // Get current sync in progress
        case MessageCommand.GetCurrentSync:
          action = this.runGetCurrentSyncCommand();
          break;
        // Get current number of syncs on the queue
        case MessageCommand.GetSyncQueueLength:
          action = this.runGetSyncQueueLengthCommand();
          break;
        // Disable sync
        case MessageCommand.DisableSync:
          action = this.runDisableSyncCommand();
          break;
        // Enable event listeners
        case MessageCommand.EnableEventListeners:
          action = this.runEnableEventListenersCommand();
          break;
        // Disable event listeners
        case MessageCommand.DisableEventListeners:
          action = this.runDisableEventListenersCommand();
          break;
        // Unknown command
        default:
          action = this.$q.reject(new Exceptions.AmbiguousSyncRequestException());
      }
      return action.then(resolve).catch(reject);
    }).catch((err) => {
      // Set message to exception class name so sender can rehydrate the exception
      err.message = err.constructor.name;
      throw err;
    });
  }

  runDisableEventListenersCommand(): ng.IPromise<void> {
    return this.bookmarkSvc.disableEventListeners();
  }

  runDisableSyncCommand(): ng.IPromise<void> {
    return this.syncEngineSvc.disableSync();
  }

  runEnableEventListenersCommand(): ng.IPromise<void> {
    return this.bookmarkSvc.enableEventListeners();
  }

  runGetCurrentSyncCommand(): ng.IPromise<Sync> {
    return this.$q.resolve(this.syncEngineSvc.getCurrentSync());
  }

  runGetSyncQueueLengthCommand(): ng.IPromise<number> {
    return this.$q.resolve(this.syncEngineSvc.getSyncQueueLength());
  }

  runRestoreBookmarksCommand(sync: Sync): ng.IPromise<any> {
    return this.bookmarkSvc
      .disableEventListeners()
      .then(() => {
        // Upgrade containers to use current container names
        return this.bookmarkHelperSvc.upgradeContainers(sync.bookmarks ?? []);
      })
      .then((bookmarksToRestore) => {
        // Queue sync
        sync.bookmarks = bookmarksToRestore;
        return this.syncEngineSvc.queueSync(sync);
      });
  }

  runSyncBookmarksCommand(sync: Sync, runSync: boolean): ng.IPromise<void> {
    return this.syncEngineSvc.queueSync(sync, runSync);
  }

  upgradeExtension(oldVersion: string, newVersion: string): ng.IPromise<void> {
    return this.storeSvc
      .remove(StoreKey.TraceLog)
      .then(() => {
        this.logSvc.logInfo(`Upgrading from ${oldVersion} to ${newVersion}`);
      })
      .then(() => {
        if (compareVersions(oldVersion, newVersion)) {
          switch (true) {
            case newVersion.indexOf('1.6.0') === 0:
              return this.upgradeTo160();
            default:
          }
        }
      })
      .then(() => {
        return this.platformSvc.getAppVersion().then((appVersion) => {
          // Display alert and set update panel to show
          const alert: Alert = {
            message: this.platformSvc.getI18nString(Strings.appUpdated_Message),
            title: `${this.platformSvc.getI18nString(Strings.appUpdated_Title)} ${appVersion}`
          };
          this.displayAlert(alert, Globals.ReleaseNotesUrlStem + appVersion);
          return this.storeSvc.set(StoreKey.DisplayUpdated, true);
        });
      });
  }

  upgradeTo160(): ng.IPromise<void> {
    // Convert local storage items to IndexedDB
    return browser.storage.local
      .get()
      .then((cachedData) => {
        if (!cachedData || Object.keys(cachedData).length === 0) {
          return;
        }

        return this.$q.all(
          Object.keys(cachedData).map((key) => {
            return this.storeSvc.set(key, cachedData[key]);
          })
        );
      })
      .then(() => {
        return browser.storage.local.clear();
      })
      .then(() => {
        // If sync enabled, create id mappings
        return this.storeSvc.get<boolean>(StoreKey.SyncEnabled).then((syncEnabled) => {
          if (!syncEnabled) {
            return;
          }
          return this.bookmarkHelperSvc.getCachedBookmarks().then((cachedBookmarks) => {
            return this.bookmarkSvc.buildIdMappings(cachedBookmarks);
          });
        });
      })
      .then(() => {});
  }
}
