import angular from 'angular';
import { Injectable } from 'angular-ts-decorators';
import { boundMethod } from 'autobind-decorator';
import browser, { Alarms, Downloads, Notifications } from 'webextension-polyfill';
import { Alert } from '../../shared/alert/alert.interface';
import { AlertService } from '../../shared/alert/alert.service';
import { BackupRestoreService } from '../../shared/backup-restore/backup-restore.service';
import { BookmarkHelperService } from '../../shared/bookmark/bookmark-helper/bookmark-helper.service';
import {
  AmbiguousSyncRequestError,
  FailedDownloadFileError,
  HttpRequestAbortedError
} from '../../shared/errors/errors';
import { ExceptionHandler } from '../../shared/errors/errors.interface';
import Globals from '../../shared/global-shared.constants';
import { MessageCommand } from '../../shared/global-shared.enum';
import { PlatformService } from '../../shared/global-shared.interface';
import { LogService } from '../../shared/log/log.service';
import { NetworkService } from '../../shared/network/network.service';
import { SettingsService } from '../../shared/settings/settings.service';
import { StoreKey } from '../../shared/store/store.enum';
import { StoreService } from '../../shared/store/store.service';
import { Sync } from '../../shared/sync/sync.interface';
import { SyncService } from '../../shared/sync/sync.service';
import { TelemetryService } from '../../shared/telemetry/telemetry.service';
import { UpgradeService } from '../../shared/upgrade/upgrade.service';
import { UtilityService } from '../../shared/utility/utility.service';
import { ChromiumBookmarkService } from '../chromium/shared/chromium-bookmark/chromium-bookmark.service';
import { BookmarkIdMapperService } from '../shared/bookmark-id-mapper/bookmark-id-mapper.service';
import {
  DownloadFileMessage,
  EnableAutoBackUpMessage,
  InstallBackup,
  Message,
  SyncBookmarksMessage
} from '../webext.interface';

@Injectable('WebExtBackgroundService')
export class WebExtBackgroundService {
  Strings = require('../../../../res/strings/en.json');

  $exceptionHandler: ExceptionHandler;
  $q: ng.IQService;
  $timeout: ng.ITimeoutService;
  alertSvc: AlertService;
  backupRestoreSvc: BackupRestoreService;
  bookmarkIdMapperSvc: BookmarkIdMapperService;
  bookmarkHelperSvc: BookmarkHelperService;
  bookmarkSvc: ChromiumBookmarkService;
  logSvc: LogService;
  networkSvc: NetworkService;
  platformSvc: PlatformService;
  settingsSvc: SettingsService;
  storeSvc: StoreService;
  syncSvc: SyncService;
  telemetrySvc: TelemetryService;
  upgradeSvc: UpgradeService;
  utilitySvc: UtilityService;

  notificationClickHandlers: any[] = [];

  static $inject = [
    '$exceptionHandler',
    '$q',
    '$timeout',
    'AlertService',
    'BackupRestoreService',
    'BookmarkHelperService',
    'BookmarkIdMapperService',
    'BookmarkService',
    'LogService',
    'NetworkService',
    'PlatformService',
    'SettingsService',
    'StoreService',
    'SyncService',
    'TelemetryService',
    'UpgradeService',
    'UtilityService'
  ];
  constructor(
    $exceptionHandler: ExceptionHandler,
    $q: ng.IQService,
    $timeout: ng.ITimeoutService,
    AlertSvc: AlertService,
    BackupRestoreSvc: BackupRestoreService,
    BookmarkHelperSvc: BookmarkHelperService,
    BookmarkIdMapperSvc: BookmarkIdMapperService,
    BookmarkSvc: ChromiumBookmarkService,
    LogSvc: LogService,
    NetworkSvc: NetworkService,
    PlatformSvc: PlatformService,
    SettingsSvc: SettingsService,
    StoreSvc: StoreService,
    SyncSvc: SyncService,
    TelemetrySvc: TelemetryService,
    UpgradeSvc: UpgradeService,
    UtilitySvc: UtilityService
  ) {
    this.$exceptionHandler = $exceptionHandler;
    this.$q = $q;
    this.$timeout = $timeout;
    this.alertSvc = AlertSvc;
    this.backupRestoreSvc = BackupRestoreSvc;
    this.bookmarkIdMapperSvc = BookmarkIdMapperSvc;
    this.bookmarkHelperSvc = BookmarkHelperSvc;
    this.bookmarkSvc = BookmarkSvc;
    this.logSvc = LogSvc;
    this.networkSvc = NetworkSvc;
    this.platformSvc = PlatformSvc;
    this.settingsSvc = SettingsSvc;
    this.storeSvc = StoreSvc;
    this.syncSvc = SyncSvc;
    this.telemetrySvc = TelemetrySvc;
    this.upgradeSvc = UpgradeSvc;
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
          message: this.platformSvc
            .getI18nString(this.Strings.Alert.AppUpdateAvailable.Message)
            .replace('{version}', `v${newVersion}`),
          title: this.platformSvc.getI18nString(this.Strings.Alert.AppUpdateAvailable.Title)
        };
        this.displayAlert(alert, `${Globals.ReleaseNotesUrlStem}${newVersion}`);
      });
    });
  }

  checkForSyncUpdates(): ng.IPromise<void> {
    // Exit if currently syncing
    const currentSync = this.syncSvc.getCurrentSync();
    if (currentSync) {
      return this.$q.resolve();
    }

    // Exit if sync not enabled
    return this.syncSvc.executeSync().catch((err) => this.checkForSyncUpdatesFailed(err));
  }

  checkForSyncUpdatesFailed(err: Error): void {
    // Don't display alert if sync failed due to network connection
    if (this.networkSvc.isNetworkConnectionError(err)) {
      this.logSvc.logInfo('Could not check for updates, no connection');
      return;
    }
    throw err;
  }

  checkForSyncUpdatesOnStartup(): ng.IPromise<void> {
    return this.$q<void>((resolve, reject) => {
      this.utilitySvc.isSyncEnabled().then((syncEnabled) => {
        if (!syncEnabled) {
          return resolve();
        }

        // Check for updates to synced bookmarks
        this.checkForSyncUpdates()
          .then(resolve)
          .catch((err) => {
            if (!this.networkSvc.isNetworkConnectionError(err)) {
              return reject(err);
            }

            // If request failed, retry once
            this.logSvc.logInfo('Connection lost, retrying check for sync updates momentarily');
            this.$timeout(() => {
              this.utilitySvc.isSyncEnabled().then((syncEnabledAfterError) => {
                if (!syncEnabledAfterError) {
                  this.logSvc.logInfo('Sync was disabled before retry attempted');
                  return reject(new HttpRequestAbortedError());
                }
                this.checkForSyncUpdates().then(resolve).catch(reject);
              });
            }, 5000);
          });
      });
    });
  }

  displayAlert(alert: Alert, url?: string): void {
    // Strip html tags from message
    const urlRegex = new RegExp(Globals.URL.ValidUrlRegex, 'i');
    const urlInAlert = alert.message.match(urlRegex)?.find(Boolean);
    const messageToDisplay = urlInAlert
      ? new DOMParser().parseFromString(`<span>${alert.message}</span>`, 'text/xml').firstElementChild.textContent
      : alert.message;
    const options: Notifications.CreateNotificationOptions = {
      iconUrl: `${Globals.PathToAssets}/notification.svg`,
      message: messageToDisplay,
      title: alert.title,
      type: 'basic'
    };

    // Display notification
    browser.notifications.create(this.utilitySvc.getUniqueishId(), options).then((notificationId) => {
      // Add a click handler to open url if provided or if the message contains a url
      const urlToOpenOnClick = urlInAlert ?? url;
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

  getDownloadById(id: number): ng.IPromise<Downloads.DownloadItem> {
    return browser.downloads.search({ id }).then((results) => {
      const [download] = results;
      if ((download ?? undefined) === undefined) {
        this.logSvc.logWarning('Failed to find download');
        return;
      }
      return download;
    });
  }

  init(): void {
    this.logSvc.logInfo('Starting up');

    // Before initialising, check if upgrade required
    this.platformSvc
      .getAppVersion()
      .then((appVersion) => this.upgradeSvc.checkIfUpgradeRequired(appVersion))
      .then((upgradeRequired) => upgradeRequired && this.upgradeExtension())
      .then(() =>
        this.$q
          .all([
            this.settingsSvc.checkForAppUpdates(),
            this.settingsSvc.telemetryEnabled(),
            this.utilitySvc.isSyncEnabled()
          ])
          .then((data) => {
            // Update browser action icon
            const [checkForAppUpdates, telemetryEnabled, syncEnabled] = data;
            this.platformSvc.refreshNativeInterface(syncEnabled);

            // Check for new app version
            if (checkForAppUpdates) {
              this.$timeout(() => this.checkForNewVersion(), 5e3);
            }

            // Enable sync and check for updates
            if (!syncEnabled) {
              return;
            }
            return this.syncSvc.enableSync().then(() => {
              this.$timeout(() => this.checkForSyncUpdatesOnStartup(), 3e3);

              // Submit telemetry if enabled
              if (telemetryEnabled) {
                this.$timeout(() => this.telemetrySvc.submitTelemetry(), 4e3);
              }
            });
          })
      );
  }

  installExtension(): ng.IPromise<void> {
    // Initialise data storage
    return (
      this.storeSvc
        .init()
        .then(() =>
          this.$q.all([
            this.storeSvc.set(StoreKey.DisplayOtherSyncsWarning, true),
            this.storeSvc.set(StoreKey.DisplayPermissions, true),
            this.storeSvc.set(StoreKey.SyncBookmarksToolbar, true)
          ])
        )
        .then(() => {
          // Get native bookmarks and save data state at install to store
          return this.bookmarkSvc.getNativeBookmarksAsBookmarks().then((bookmarks) => {
            const backup: InstallBackup = {
              bookmarks,
              date: new Date().toISOString()
            };
            return this.storeSvc.set(StoreKey.InstallBackup, JSON.stringify(backup));
          });
        })
        // Set the initial upgrade version
        .then(() =>
          this.platformSvc.getAppVersion().then((currentVersion) =>
            this.upgradeSvc.setLastUpgradeVersion(currentVersion).then(() => {
              this.logSvc.logInfo(`Installed ${currentVersion}`);
            })
          )
        )
        .catch((err) => {
          this.$exceptionHandler(err);
          return this.$q.reject(err);
        })
    );
  }

  @boundMethod
  onAlarm(alarm: Alarms.Alarm): void {
    switch (alarm?.name) {
      case Globals.Alarms.AutoBackUp.Name:
        this.backupRestoreSvc.runAutoBackUp();
        break;
      case Globals.Alarms.SyncUpdatesCheck.Name:
        this.checkForSyncUpdates();
        break;
      default:
    }
  }

  onInstall(event: InputEvent): void {
    // Check if fresh install needed
    const details = angular.element(event.currentTarget as Element).data('details');
    (details?.reason === 'install' ? this.installExtension() : this.$q.resolve()).then(() => this.init());
  }

  @boundMethod
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

  @boundMethod
  onNotificationClosed(notificationId: string): void {
    // Remove the handler for this notification if one exists
    const index = this.notificationClickHandlers.findIndex((x) => {
      return x.id === notificationId;
    });
    if (index >= 0) {
      this.notificationClickHandlers.splice(index, 1);
    }
  }

  @boundMethod
  onMessage(message: Message): Promise<any> {
    // Use native Promise not $q otherwise browser.runtime.sendMessage will return immediately in Firefox
    return new Promise((resolve, reject) => {
      let action: ng.IPromise<any>;
      switch (message.command) {
        // Queue bookmarks sync
        case MessageCommand.SyncBookmarks:
          action = this.runSyncBookmarksCommand(message as SyncBookmarksMessage);
          break;
        // Trigger bookmarks restore
        case MessageCommand.RestoreBookmarks:
          action = this.runRestoreBookmarksCommand(message as SyncBookmarksMessage);
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
        // Download file
        case MessageCommand.DownloadFile:
          action = this.runDownloadFileCommand(message as DownloadFileMessage);
          break;
        // Enable event listeners
        case MessageCommand.EnableEventListeners:
          action = this.runEnableEventListenersCommand();
          break;
        // Disable event listeners
        case MessageCommand.DisableEventListeners:
          action = this.runDisableEventListenersCommand();
          break;
        // Enable auto back up
        case MessageCommand.EnableAutoBackUp:
          action = this.runEnableAutoBackUpCommand(message as EnableAutoBackUpMessage);
          break;
        // Disable auto back up
        case MessageCommand.DisableAutoBackUp:
          action = this.runDisableAutoBackUpCommand();
          break;
        // Unknown command
        default:
          action = this.$q.reject(new AmbiguousSyncRequestError());
      }
      action.then(resolve).catch(reject);
    }).catch((err) => {
      // Set message to error class name so sender can rehydrate the error on receipt
      err.message = err.constructor.name;
      throw err;
    });
  }

  runDisableAutoBackUpCommand(): ng.IPromise<void> {
    return browser.alarms.clear(Globals.Alarms.AutoBackUp.Name).then(() => {});
  }

  runDisableEventListenersCommand(): ng.IPromise<void> {
    return this.bookmarkSvc.disableEventListeners();
  }

  runDisableSyncCommand(): ng.IPromise<void> {
    return this.syncSvc.disableSync();
  }

  runDownloadFileCommand(message: DownloadFileMessage): ng.IPromise<string | void> {
    const { filename, textContents, displaySaveDialog = true } = message;
    if (!filename) {
      return this.$q.reject(new Error('File name parameter missing.'));
    }
    if (!textContents) {
      return this.$q.reject(new Error('File contents parameter missing.'));
    }

    return new this.$q<string | void>((resolve, reject) => {
      // Use create a new object url using contents and trigger download
      const file = new Blob([textContents], { type: 'text/plain' });
      const url = URL.createObjectURL(file);
      browser.downloads
        .download({
          filename,
          saveAs: displaySaveDialog,
          url
        })
        .then((downloadId) => {
          const onChangedHandler = (delta: Downloads.OnChangedDownloadDeltaType) => {
            switch (delta.state?.current) {
              case 'complete':
                URL.revokeObjectURL(url);
                browser.downloads.onChanged.removeListener(onChangedHandler);
                this.getDownloadById(downloadId).then((download) => {
                  this.logSvc.logInfo(`Downloaded file ${download.filename}`);
                  resolve(download.filename);
                });
                break;
              case 'interrupted':
                URL.revokeObjectURL(url);
                browser.downloads.onChanged.removeListener(onChangedHandler);
                if (delta.error?.current === 'USER_CANCELED') {
                  resolve();
                } else {
                  reject(new FailedDownloadFileError());
                }
                break;
              default:
            }
          };
          browser.downloads.onChanged.addListener(onChangedHandler);
        }, reject);
    });
  }

  runEnableAutoBackUpCommand(message: EnableAutoBackUpMessage): ng.IPromise<void> {
    const { schedule } = message;

    // Calculate alarm delay from schedule
    let delayInMinutes = 0;
    const now = new Date();
    const runTime = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      parseInt(schedule.autoBackUpHour, 10),
      parseInt(schedule.autoBackUpMinute, 10)
    );
    if (runTime < now) {
      runTime.setDate(now.getDate() + 1);
    }
    delayInMinutes = Math.round((runTime.getTime() - now.getTime()) / 1e3 / 60);

    // Calculate alarm period from schedule
    let periodInMinutes;
    switch (schedule.autoBackUpUnit) {
      case 'week':
        periodInMinutes = 60 * 24 * 7;
        break;
      case 'month':
        periodInMinutes = 60 * 24 * (365 / 12);
        break;
      case 'day':
      default:
        periodInMinutes = 60 * 24;
    }
    periodInMinutes *= parseInt(schedule.autoBackUpNumber, 10);

    // Register alarm
    return browser.alarms.clear(Globals.Alarms.AutoBackUp.Name).then(() => {
      return browser.alarms.create(Globals.Alarms.AutoBackUp.Name, {
        delayInMinutes,
        periodInMinutes
      });
    });
  }

  runEnableEventListenersCommand(): ng.IPromise<void> {
    return this.bookmarkSvc.enableEventListeners();
  }

  runGetCurrentSyncCommand(): ng.IPromise<Sync> {
    return this.$q.resolve(this.syncSvc.getCurrentSync());
  }

  runGetSyncQueueLengthCommand(): ng.IPromise<number> {
    return this.$q.resolve(this.syncSvc.getSyncQueueLength());
  }

  runRestoreBookmarksCommand(message: SyncBookmarksMessage): ng.IPromise<void> {
    const { sync } = message;
    return this.syncSvc.queueSync(sync);
  }

  runSyncBookmarksCommand(message: SyncBookmarksMessage): ng.IPromise<void> {
    const { sync, runSync } = message;
    // If no sync has been provided, process current sync queue and check for updates
    if (angular.isUndefined(sync)) {
      return this.syncSvc.executeSync();
    }
    return this.syncSvc.queueSync(sync, runSync);
  }

  upgradeExtension(): ng.IPromise<void> {
    // Run upgrade process and display notification to user
    return this.platformSvc
      .getAppVersion()
      .then((appVersion) => this.upgradeSvc.upgrade(appVersion))
      .then(() => {
        return this.platformSvc.getAppVersionName().then((appVersion) => {
          const alert: Alert = {
            message: this.platformSvc.getI18nString(this.Strings.Alert.AppUpdated.Message),
            title: `${this.platformSvc.getI18nString(this.Strings.Alert.AppUpdated.Title)} v${appVersion}`
          };
          this.displayAlert(alert, `${Globals.ReleaseNotesUrlStem}${appVersion}`);
          return this.storeSvc.set(StoreKey.DisplayUpdated, true);
        });
      });
  }
}
