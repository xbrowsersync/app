import angular from 'angular';
import { Component, OnInit } from 'angular-ts-decorators';
import autobind from 'autobind-decorator';
import { AppEventType, AppViewType } from '../../app/app.enum';
import AppMainComponent from '../../app/app-main/app-main.component';
import AppHelperService from '../../app/shared/app-helper/app-helper.service';
import AlertService from '../../shared/alert/alert.service';
import { BookmarkMetadata } from '../../shared/bookmark/bookmark.interface';
import BookmarkHelperService from '../../shared/bookmark/bookmark-helper/bookmark-helper.service';
import Globals from '../../shared/global-shared.constants';
import { PlatformService } from '../../shared/global-shared.interface';
import LogService from '../../shared/log/log.service';
import NetworkService from '../../shared/network/network.service';
import SettingsService from '../../shared/settings/settings.service';
import { StoreKey } from '../../shared/store/store.enum';
import StoreService from '../../shared/store/store.service';
import SyncEngineService from '../../shared/sync/sync-engine/sync-engine.service';
import UpgradeService from '../../shared/upgrade/upgrade.service';
import UtilityService from '../../shared/utility/utility.service';
import { WorkingContext } from '../../shared/working/working.enum';
import WorkingService from '../../shared/working/working.service';
import AndroidPlatformService from '../android-shared/android-platform/android-platform.service';
import { AndroidAlert } from './android-app.interface';
import AndroidAppHelperService from './shared/android-app-helper/android-app-helper.service';

@autobind
@Component({
  controllerAs: 'vm',
  selector: 'app',
  styles: [require('./android-app.component.scss')],
  template: require('../../app/app-main/app-main.component.html')
})
export default class AndroidAppComponent extends AppMainComponent implements OnInit {
  $interval: ng.IIntervalService;
  appHelperSvc: AndroidAppHelperService;
  platformSvc: AndroidPlatformService;
  syncEngineSvc: SyncEngineService;
  upgradeSvc: UpgradeService;

  static $inject = [
    '$interval',
    '$q',
    '$scope',
    '$timeout',
    'AlertService',
    'AppHelperService',
    'BookmarkHelperService',
    'LogService',
    'NetworkService',
    'PlatformService',
    'SettingsService',
    'StoreService',
    'SyncEngineService',
    'UpgradeService',
    'UtilityService',
    'WorkingService'
  ];
  constructor(
    $interval: ng.IIntervalService,
    $q: ng.IQService,
    $scope: ng.IScope,
    $timeout: ng.ITimeoutService,
    AlertSvc: AlertService,
    AppHelperSvc: AppHelperService,
    BookmarkHelperSvc: BookmarkHelperService,
    LogSvc: LogService,
    NetworkSvc: NetworkService,
    PlatformSvc: PlatformService,
    SettingsSvc: SettingsService,
    StoreSvc: StoreService,
    SyncEngineSvc: SyncEngineService,
    UpgradeSvc: UpgradeService,
    UtilitySvc: UtilityService,
    WorkingSvc: WorkingService
  ) {
    super(
      $q,
      $scope,
      $timeout,
      AlertSvc,
      AppHelperSvc,
      BookmarkHelperSvc,
      LogSvc,
      NetworkSvc,
      PlatformSvc,
      SettingsSvc,
      StoreSvc,
      UtilitySvc,
      WorkingSvc
    );

    this.$interval = $interval;
    this.syncEngineSvc = SyncEngineSvc;
    this.upgradeSvc = UpgradeSvc;
  }

  checkForDarkTheme(): ng.IPromise<void> {
    // Check dark theme is supported
    return this.$q<void>((resolve, reject) => {
      window.cordova.plugins.ThemeDetection.isAvailable(resolve, reject);
    }).then((isAvailable: any) => {
      if (!isAvailable.value) {
        return;
      }

      // Check dark theme is enabled
      return this.$q<void>((resolve, reject) => {
        window.cordova.plugins.ThemeDetection.isDarkModeEnabled(resolve, reject);
      })
        .then((isDarkModeEnabled: any) => this.settingsSvc.darkModeEnabled(isDarkModeEnabled.value))
        .then(() => {});
    });
  }

  checkForInstallOrUpgrade(): ng.IPromise<void> {
    // Get current app version
    return this.platformSvc.getAppVersion().then((appVersion) => {
      // Get previous app version by first checking both legacy and old versions
      const localStorageAppVersion = localStorage.getItem('xBrowserSync-mobileAppVersion');
      return this.$q<string>((resolve) => {
        window.NativeStorage.getItem('appVersion', resolve, () => resolve());
      })
        .then((nativeStorageAppVersion) => {
          return nativeStorageAppVersion ?? localStorageAppVersion ?? undefined;
        })
        .then((legacyAppVersion) => {
          // If no last upgrade version or legacy app version this is a new install
          // otherwise set last upgrade version to be legacy version if not set
          return this.upgradeSvc
            .getLastUpgradeVersion()
            .then((lastUpgradeVersion) => {
              if (angular.isUndefined(lastUpgradeVersion)) {
                if (angular.isUndefined(legacyAppVersion)) {
                  return this.handleInstall(appVersion);
                }
                return this.upgradeSvc.setLastUpgradeVersion(legacyAppVersion);
              }
            })
            .then(() => {
              // Upgrade if required
              return this.upgradeSvc.checkIfUpgradeRequired(appVersion).then((upgradeRequired) => {
                if (upgradeRequired) {
                  return this.handleUpgrade(appVersion);
                }
              });
            });
        });
    });
  }

  checkForNewVersion(): void {
    this.$timeout(() => {
      this.platformSvc.getAppVersion().then((appVersion) => {
        this.utilitySvc.checkForNewVersion(appVersion).then((newVersion) => {
          if (!newVersion) {
            return;
          }

          this.alertSvc.setCurrentAlert({
            message: this.platformSvc
              .getI18nString(this.Strings.Alert.AppUpdateAvailable.Message)
              .replace('{version}', newVersion),
            action: this.platformSvc.getI18nString(this.Strings.Button.View),
            actionCallback: () => {
              this.platformSvc.openUrl(Globals.ReleaseNotesUrlStem + (newVersion as string).replace(/^v/, ''));
            }
          } as AndroidAlert);
        });
      });
    }, 1e3);
  }

  executeSyncIfOnline(workingContext: WorkingContext): ng.IPromise<boolean> {
    // If not online display an alert and return
    if (!this.networkSvc.isNetworkConnected()) {
      this.alertSvc.setCurrentAlert({
        message: this.platformSvc.getI18nString(this.Strings.Alert.WorkingOffline.Message),
        title: this.platformSvc.getI18nString(this.Strings.Alert.WorkingOffline.Title)
      });
      return this.$q.resolve(false);
    }

    // Sync bookmarks
    return this.platformSvc.executeSync(false, workingContext).then(() => {
      return true;
    });
  }

  getSharedBookmark(): ng.IPromise<BookmarkMetadata> {
    return this.$q<any>((resolve, reject) => window.plugins.intentShim.getIntent(resolve, reject))
      .then((intent) => {
        if (intent?.type !== 'text/plain' || !intent?.extras) {
          return;
        }
        const intentText = intent.extras[window.plugins.intentShim.EXTRA_TEXT];
        const intentSubject = intent.extras[window.plugins.intentShim.EXTRA_SUBJECT];

        // Set shared bookmark with shared intent data
        this.logSvc.logInfo(`Detected new intent: ${intentText}`);

        // Extract url from intent
        const url = intentText?.match(Globals.URL.ValidUrlRegex)?.find(Boolean);
        return {
          title: intentSubject,
          url
        };
      })
      .then((sharedBookmark) => {
        if (angular.isUndefined(sharedBookmark)) {
          return;
        }

        const txt = document.createElement('textarea');
        txt.innerHTML = sharedBookmark.title ? sharedBookmark.title.trim() : '';
        sharedBookmark.title = txt.value;
        return sharedBookmark;
      });
  }

  handleBackButton(event: Event): void {
    // Back button action depends on current view
    const currentView = this.appHelperSvc.getCurrentView();
    if (
      currentView.view === AppViewType.Bookmark ||
      currentView.view === AppViewType.Help ||
      currentView.view === AppViewType.Scan ||
      currentView.view === AppViewType.Settings ||
      currentView.view === AppViewType.Support ||
      currentView.view === AppViewType.Updated
    ) {
      // Back to login/search panel
      event.preventDefault();
      this.appHelperSvc.switchView();
    } else {
      // On main view, exit app
      event.preventDefault();
      this.appHelperSvc.exitApp();
    }
  }

  handleDeviceReady(success: () => any, failure: () => any): ng.IPromise<any> {
    // Prime cache for faster startup
    this.$q.all([this.bookmarkHelperSvc.getCachedBookmarks(), this.settingsSvc.all()]).catch(() => {});

    // Load i18n strings
    return (
      this.platformSvc
        .initI18n()
        .then(() => {
          // Configure events
          document.addEventListener('backbutton', this.handleBackButton, false);
          document.addEventListener('touchstart', this.handleTouchStart, false);
          window.addEventListener('keyboardDidShow', this.handleKeyboardDidShow);
          window.addEventListener('keyboardWillHide', this.handleKeyboardWillHide);

          // Enable app working in background to check for uncommitted syncs
          window.cordova.plugins.backgroundMode.setDefaults({ hidden: true, silent: true });
          window.cordova.plugins.backgroundMode.on('activate', () => {
            window.cordova.plugins.backgroundMode.disableWebViewOptimizations();
          });

          // Check for upgrade or do fresh install
          return this.checkForInstallOrUpgrade();
        })

        // Run startup process after install/upgrade
        .then(this.handleStartup)
        .then(success)
        .catch(failure)
    );
  }

  handleInstall(installedVersion: string): ng.IPromise<void> {
    return (
      this.storeSvc
        .init()
        // Set the initial upgrade version
        .then(() => this.upgradeSvc.setLastUpgradeVersion(installedVersion))
        .then(() => this.logSvc.logInfo(`Installed v${installedVersion}`))
    );
  }

  handleBookmarkShared(sharedBookmark: BookmarkMetadata): void {
    if (!angular.isUndefined(sharedBookmark)) {
      // Set current page as shared bookmark
      this.platformSvc.currentPage = sharedBookmark;
    }
  }

  handleKeyboardDidShow(event: any): void {
    document.body.style.height = `calc(100% - ${event.keyboardHeight}px)`;
    setTimeout(() => {
      (document.activeElement as any).scrollIntoViewIfNeeded();
    }, 100);
  }

  handleKeyboardWillHide(): void {
    document.body.style.removeProperty('height');
  }

  handleResume(): ng.IPromise<void> {
    // Set theme
    return this.checkForDarkTheme().then(() => {
      // Check if sync enabled and reset network disconnected flag
      this.utilitySvc.isSyncEnabled().then((syncEnabled) => {
        if (!syncEnabled) {
          return;
        }

        // If not online display an alert
        if (!this.networkSvc.isNetworkConnected()) {
          this.alertSvc.setCurrentAlert({
            message: this.platformSvc.getI18nString(this.Strings.Alert.WorkingOffline.Message),
            title: this.platformSvc.getI18nString(this.Strings.Alert.WorkingOffline.Title)
          });
          return;
        }

        // If bookmark was shared, switch to bookmark view
        return this.getSharedBookmark().then((sharedBookmark) => {
          if (!angular.isUndefined(sharedBookmark)) {
            this.handleBookmarkShared(sharedBookmark);
            return this.appHelperSvc.switchView({ view: AppViewType.Bookmark });
          }

          // Deselect bookmark
          if (this.appHelperSvc.getCurrentView()?.view === AppViewType.Search) {
            this.utilitySvc.broadcastEvent(AppEventType.ClearSelectedBookmark);
          }

          // If not online return here
          if (!this.networkSvc.isNetworkConnected()) {
            return;
          }

          // Check for updates and run sync but don't wait before continuing
          this.appHelperSvc
            .getSyncQueueLength()
            .then((syncQueueLength) => {
              return syncQueueLength === 0 ? this.syncEngineSvc.checkForUpdates(undefined, false) : true;
            })
            .then((runSync) => {
              if (!runSync) {
                return;
              }

              // Run sync
              this.executeSyncIfOnline(WorkingContext.DelayedSyncing).then((isOnline) => {
                if (isOnline) {
                  this.utilitySvc.broadcastEvent(AppEventType.RefreshBookmarkSearchResults);
                }
              });
            });
        });
      });
    });
  }

  handleStartup(): ng.IPromise<void> {
    this.logSvc.logInfo('Starting up');

    // Set theme
    return this.checkForDarkTheme().then(() => {
      return this.$q
        .all([
          this.platformSvc.getAppVersion(),
          this.settingsSvc.checkForAppUpdates(),
          this.storeSvc.get([StoreKey.LastUpdated, StoreKey.SyncId]),
          this.utilitySvc.getServiceUrl(),
          this.utilitySvc.getSyncVersion(),
          this.utilitySvc.isSyncEnabled()
        ])
        .then((result) => {
          const appVersion = result[0];
          const checkForAppUpdates = result[1];
          const storeContent = result[2];
          const serviceUrl = result[3];
          const syncVersion = result[4];
          const syncEnabled = result[5];

          // Add useful debug info to beginning of trace log
          const debugInfo = angular.copy(storeContent) as any;
          debugInfo.appVersion = appVersion;
          debugInfo.checkForAppUpdates = checkForAppUpdates;
          debugInfo.platform = {
            name: window.device.platform,
            device: `${window.device.manufacturer} ${window.device.model}`
          };
          debugInfo.serviceUrl = serviceUrl;
          debugInfo.syncEnabled = syncEnabled;
          debugInfo.syncVersion = syncVersion;
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

          // Check for new app version
          if (checkForAppUpdates) {
            this.checkForNewVersion();
          }

          // Exit if sync not enabled
          if (!syncEnabled) {
            return;
          }

          // If not online display an alert
          if (!this.networkSvc.isNetworkConnected()) {
            this.alertSvc.setCurrentAlert({
              message: this.platformSvc.getI18nString(this.Strings.Alert.WorkingOffline.Message),
              title: this.platformSvc.getI18nString(this.Strings.Alert.WorkingOffline.Title)
            });
          }

          // Check if a bookmark was shared
          return this.getSharedBookmark().then((sharedBookmark) => {
            if (!angular.isUndefined(sharedBookmark)) {
              return this.handleBookmarkShared(sharedBookmark);
            }

            // If not online return here
            if (!this.networkSvc.isNetworkConnected()) {
              return;
            }

            // Check for updates and run sync but don't wait before continuing
            this.appHelperSvc
              .getSyncQueueLength()
              .then((syncQueueLength) => {
                return syncQueueLength === 0 ? this.syncEngineSvc.checkForUpdates(undefined, false) : true;
              })
              .then((runSync) => {
                if (!runSync) {
                  return;
                }

                // Run sync
                this.executeSyncIfOnline(WorkingContext.DelayedSyncing).then((isOnline) => {
                  if (isOnline) {
                    this.utilitySvc.broadcastEvent(AppEventType.RefreshBookmarkSearchResults);
                  }
                });
              });
          });
        });
    });
  }

  handleTouchStart(event: Event): void {
    // Blur focus (and hide keyboard) when pressing out of text fields
    if (!this.utilitySvc.isTextInput(event.target as Element) && this.utilitySvc.isTextInput(document.activeElement)) {
      this.$timeout(() => {
        (document.activeElement as HTMLInputElement).blur();
      }, 100);
    }
  }

  handleUpgrade(upgradeToVersion: string): ng.IPromise<void> {
    return this.upgradeSvc.upgrade(upgradeToVersion).then(() => this.storeSvc.set(StoreKey.DisplayUpdated, true));
  }

  ngOnInit(): ng.IPromise<void> {
    // Bind to cordova device events
    return (
      this.$q<void>((resolve, reject) => {
        document.addEventListener(
          'deviceready',
          () => {
            this.handleDeviceReady(resolve, reject);
          },
          false
        );
        document.addEventListener('resume', this.handleResume, false);
      })
        .then(() => {
          // If bookmark was shared, switch to bookmark view
          if (!angular.isUndefined(this.platformSvc.currentPage)) {
            return this.appHelperSvc.switchView({ view: AppViewType.Bookmark });
          }
        })
        // Continue initialisation
        .then(() => super.ngOnInit())
    );
  }

  workingCancelAction(): ng.IPromise<void> {
    this.utilitySvc.broadcastEvent(AppEventType.WorkingCancelAction);
    return this.$q.resolve();
  }
}
