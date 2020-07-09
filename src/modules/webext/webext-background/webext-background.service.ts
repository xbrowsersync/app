import angular from 'angular';
import { Injectable } from 'angular-ts-decorators';
import browserDetect from 'browser-detect';
import compareVersions from 'compare-versions';
import { autobind } from 'core-decorators';
import _ from 'underscore';
import { Alarms, browser } from 'webextension-polyfill-ts';
import Strings from '../../../../res/strings/en.json';
import InstallBackup from '../../../interfaces/install-backup.interface';
import NativeBookmarksService from '../../../interfaces/native-bookmarks-service.interface';
import PlatformService from '../../../interfaces/platform-service.interface';
import Alert from '../../shared/alert/alert.interface';
import AlertService from '../../shared/alert/alert.service';
import BookmarkService from '../../shared/bookmark/bookmark.service';
import * as Exceptions from '../../shared/exceptions/exception';
import Globals from '../../shared/globals';
import LogService from '../../shared/log/log.service';
import MessageCommand from '../../shared/message-command.enum';
import NetworkService from '../../shared/network/network.service';
import StoreKey from '../../shared/store/store-key.enum';
import StoreService from '../../shared/store/store.service';
import SyncType from '../../shared/sync-type.enum';
import SyncEngineService from '../../shared/sync/sync-engine.service';
import Sync from '../../shared/sync/sync.interface';
import UtilityService from '../../shared/utility/utility.service';
import BookmarkIdMapperService from '../bookmark-id-mapper/bookmark-id-mapper.service';

@autobind
@Injectable('WebExtBackgroundService')
export default class WebExtBackgroundService {
  $q: ng.IQService;
  $timeout: ng.ITimeoutService;
  alertSvc: AlertService;
  bookmarkIdMapperSvc: BookmarkIdMapperService;
  bookmarkSvc: BookmarkService;
  logSvc: LogService;
  nativeBookmarksSvc: NativeBookmarksService;
  networkSvc: NetworkService;
  platformSvc: PlatformService;
  storeSvc: StoreService;
  syncEngineService: SyncEngineService;
  utilitySvc: UtilityService;

  notificationClickHandlers: any[] = [];

  static $inject = [
    '$q',
    '$timeout',
    'AlertService',
    'BookmarkIdMapperService',
    'BookmarkService',
    'LogService',
    'NativeBookmarksService',
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
    BookmarkIdMapperSvc: BookmarkIdMapperService,
    BookmarkSvc: BookmarkService,
    LogSvc: LogService,
    NativeBookmarksSvc: NativeBookmarksService,
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
    this.bookmarkSvc = BookmarkSvc;
    this.logSvc = LogSvc;
    this.nativeBookmarksSvc = NativeBookmarksSvc;
    this.networkSvc = NetworkSvc;
    this.platformSvc = PlatformSvc;
    this.storeSvc = StoreSvc;
    this.syncEngineService = SyncEngineSvc;
    this.utilitySvc = UtilitySvc;

    browser.alarms.onAlarm.addListener(this.onAlarm);
    browser.notifications.onClicked.addListener(this.onNotificationClicked);
    browser.notifications.onClosed.addListener(this.onNotificationClosed);
    browser.runtime.onMessage.addListener(this.onMessage as any);
  }

  checkForNewVersion(): void {
    this.utilitySvc.checkForNewVersion().then((newVersion) => {
      if (!newVersion) {
        return;
      }

      const alert: Alert = {
        message: this.platformSvc.getConstant(Strings.appUpdateAvailable_Message).replace('{version}', newVersion),
        title: this.platformSvc.getConstant(Strings.appUpdateAvailable_Title)
      };
      this.displayAlert(alert, Globals.ReleaseNotesUrlStem + newVersion.replace(/^v/, ''));
    });
  }

  checkForUpdatesOnStartup(): ng.IPromise<any> {
    return this.$q<boolean>((resolve, reject) => {
      // If network disconnected, skip update check
      if (!this.networkSvc.isNetworkConnected()) {
        this.logSvc.logInfo('Couldn’t check for updates on startup: network offline');
        resolve(false);
        return;
      }

      // Check for updates to synced bookmarks
      this.syncEngineService
        .checkForUpdates()
        .then(resolve)
        .catch((err) => {
          if (!(err instanceof Exceptions.HttpRequestFailedException)) {
            reject(err);
            return;
          }

          // If request failed, retry once
          this.logSvc.logInfo('Connection to API failed, retrying check for sync updates momentarily');
          this.$timeout(() => {
            this.storeSvc.get<boolean>(StoreKey.SyncEnabled).then((syncEnabled) => {
              if (!syncEnabled) {
                this.logSvc.logInfo('Sync was disabled before retry attempted');
                reject(new Exceptions.HttpRequestCancelledException());
                return;
              }
              this.syncEngineService.checkForUpdates().then(resolve).catch(reject);
            });
          }, 5000);
        });
    }).then((updatesAvailable) => {
      if (!updatesAvailable) {
        return null;
      }

      // Queue sync
      return this.platformSvc.sync_Queue({
        type: SyncType.Local
      });
    });
  }

  displayAlert(alert: Alert, url?: string): void {
    // Strip html tags from message
    const urlRegex = new RegExp(Globals.URL.ValidUrlRegex);
    const matches = alert.message.match(urlRegex);
    const messageToDisplay =
      !matches || matches.length === 0
        ? alert.message
        : new DOMParser().parseFromString(`<span>${alert.message}</span>`, 'text/xml').firstElementChild.textContent;

    const options = {
      iconUrl: `${Globals.PathToAssets}/notification.svg`,
      message: messageToDisplay,
      title: alert.title,
      type: 'basic'
    };

    // Display notification
    browser.notifications.create(this.utilitySvc.getUniqueishId(), options as any).then((notificationId) => {
      // Add a click handler to open url if provided or if the message contains a url
      let urlToOpenOnClick = url;
      if (matches && matches.length > 0) {
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

  getLatestUpdates(): ng.IPromise<any> {
    // Exit if currently syncing
    const currentSync = this.syncEngineService.getCurrentSync();
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

        return this.syncEngineService.checkForUpdates().then((updatesAvailable) => {
          if (!updatesAvailable) {
            return;
          }

          // Queue sync
          return this.platformSvc.sync_Queue({
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
          this.syncEngineService.disableSync();
          throw new Exceptions.SyncRemovedException(null, err);
        }

        throw err;
      });
  }

  init(): void {
    this.logSvc.logInfo('Starting up');
    this.storeSvc
      .get([
        StoreKey.CheckForAppUpdates,
        StoreKey.LastUpdated,
        StoreKey.ServiceUrl,
        StoreKey.SyncBookmarksToolbar,
        StoreKey.SyncEnabled,
        StoreKey.SyncId,
        StoreKey.SyncVersion
      ])
      .then((storeContent) => {
        // Add useful debug info to beginning of trace log
        const debugInfo = angular.copy(storeContent) as any;
        debugInfo.appVersion = Globals.AppVersion;
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
        this.platformSvc.interface_Refresh(storeContent.syncEnabled);

        // Check for new app version after a delay
        if (storeContent.checkForAppUpdates) {
          this.$timeout(this.checkForNewVersion, 5e3);
        }

        // Exit if sync not enabled
        if (!storeContent.syncEnabled) {
          return;
        }

        // Enable sync
        return this.syncEngineService.enableSync().then(() => {
          // Check for updates after a delay to allow for initialising network connection
          this.$timeout(this.checkForUpdatesOnStartup, 5e3);
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
        return this.platformSvc.bookmarks_Get().then((bookmarks) => {
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
    if (alarm && alarm.name === Globals.Alarm.Name) {
      this.getLatestUpdates();
    }
  }

  onInstall(event: InputEvent): void {
    const currentVersion = browser.runtime.getManifest().version;
    let installOrUpgrade = this.$q.resolve();

    // Check for upgrade or do fresh install
    const details = angular.element(event.currentTarget as Element).data('details');
    if (details && details.reason === 'install') {
      installOrUpgrade = this.installExtension(currentVersion);
    } else if (
      details &&
      details.reason === 'update' &&
      details.previousVersion &&
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

  onMessage(message: any): ng.IPromise<any> {
    return new this.$q((resolve, reject) => {
      let action: ng.IPromise<any>;
      switch (message.command) {
        // Queue bookmarks sync
        case MessageCommand.SyncBookmarks:
          action = this.runSyncBookmarksCommand(message);
          break;
        // Trigger bookmarks restore
        case MessageCommand.RestoreBookmarks:
          action = this.runRestoreBookmarksCommand(message);
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
    return this.nativeBookmarksSvc.disableEventListeners();
  }

  runDisableSyncCommand(): ng.IPromise<void> {
    return this.syncEngineService.disableSync();
  }

  runEnableEventListenersCommand(): ng.IPromise<void> {
    return this.nativeBookmarksSvc.enableEventListeners();
  }

  runGetCurrentSyncCommand(): ng.IPromise<Sync> {
    return this.$q.resolve(this.syncEngineService.getCurrentSync());
  }

  runGetSyncQueueLengthCommand(): ng.IPromise<number> {
    return this.$q.resolve(this.syncEngineService.getSyncQueueLength());
  }

  runRestoreBookmarksCommand(sync: Sync): ng.IPromise<any> {
    return this.nativeBookmarksSvc
      .disableEventListeners()
      .then(() => {
        // Upgrade containers to use current container names
        return this.bookmarkSvc.upgradeContainers(sync.bookmarks || []);
      })
      .then((bookmarksToRestore) => {
        // Queue sync
        sync.bookmarks = bookmarksToRestore;
        return this.syncEngineService.queueSync(sync);
      });
  }

  runSyncBookmarksCommand(sync: Sync): ng.IPromise<void> {
    return this.syncEngineService.queueSync(sync, (sync as any).runSync);
  }

  upgradeExtension(oldVersion: string, newVersion: string): ng.IPromise<void> {
    return this.storeSvc
      .set(StoreKey.TraceLog)
      .then(() => {
        this.logSvc.logInfo(`Upgrading from ${oldVersion} to ${newVersion}`);
      })
      .then(() => {
        if (compareVersions(oldVersion, newVersion)) {
          switch (true) {
            case newVersion.indexOf('1.5.3') === 0:
              return this.upgradeTo153();
            default:
          }
        }
      })
      .then(() => {
        // Display alert and set update panel to show
        const alert: Alert = {
          message: this.platformSvc.getConstant(Strings.appUpdated_Message),
          title: this.platformSvc.getConstant(Strings.appUpdated_Title) + Globals.AppVersion
        };
        this.displayAlert(alert, Globals.ReleaseNotesUrlStem + Globals.AppVersion);
        return this.storeSvc.set(StoreKey.DisplayUpdated, true);
      });
  }

  upgradeTo153(): ng.IPromise<void> {
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
          return this.bookmarkSvc.getCachedBookmarks().then((cachedBookmarks) => {
            return this.platformSvc.bookmarks_BuildIdMappings(cachedBookmarks);
          });
        });
      })
      .then(() => {});
  }
}
