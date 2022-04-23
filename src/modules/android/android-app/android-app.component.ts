import angular from 'angular';
import { Component, OnInit } from 'angular-ts-decorators';
import { boundMethod } from 'autobind-decorator';
import { AppEventType, RoutePath } from '../../app/app.enum';
import { AppMainComponent } from '../../app/app-main/app-main.component';
import { AppHelperService } from '../../app/shared/app-helper/app-helper.service';
import { AlertService } from '../../shared/alert/alert.service';
import { BookmarkMetadata } from '../../shared/bookmark/bookmark.interface';
import { BookmarkHelperService } from '../../shared/bookmark/bookmark-helper/bookmark-helper.service';
import Globals from '../../shared/global-shared.constants';
import { PlatformService } from '../../shared/global-shared.interface';
import { LogService } from '../../shared/log/log.service';
import { NetworkService } from '../../shared/network/network.service';
import { SettingsService } from '../../shared/settings/settings.service';
import { StoreKey } from '../../shared/store/store.enum';
import { StoreService } from '../../shared/store/store.service';
import { SyncService } from '../../shared/sync/sync.service';
import { TelemetryService } from '../../shared/telemetry/telemetry.service';
import { UpgradeService } from '../../shared/upgrade/upgrade.service';
import { UtilityService } from '../../shared/utility/utility.service';
import { WorkingContext } from '../../shared/working/working.enum';
import { WorkingService } from '../../shared/working/working.service';
import { AndroidPlatformService } from '../android-shared/android-platform/android-platform.service';
import { AndroidAlert } from './android-app.interface';
import { AndroidAppHelperService } from './shared/android-app-helper/android-app-helper.service';

@Component({
  controllerAs: 'vm',
  selector: 'app',
  styles: [require('./android-app.component.scss')],
  template: require('../../app/app-main/app-main.component.html')
})
export class AndroidAppComponent extends AppMainComponent implements OnInit {
  $interval: ng.IIntervalService;
  appHelperSvc: AndroidAppHelperService;
  platformSvc: AndroidPlatformService;
  syncSvc: SyncService;
  telemetrySvc: TelemetryService;
  upgradeSvc: UpgradeService;

  darkThemeEnabled = false;

  static $inject = [
    '$interval',
    '$location',
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
    'SyncService',
    'TelemetryService',
    'UpgradeService',
    'UtilityService',
    'WorkingService'
  ];
  constructor(
    $interval: ng.IIntervalService,
    $location: ng.ILocationService,
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
    SyncSvc: SyncService,
    TelemetrySvc: TelemetryService,
    UpgradeSvc: UpgradeService,
    UtilitySvc: UtilityService,
    WorkingSvc: WorkingService
  ) {
    super(
      $location,
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
    this.syncSvc = SyncSvc;
    this.telemetrySvc = TelemetrySvc;
    this.upgradeSvc = UpgradeSvc;
  }

  checkForInstallOrUpgrade(): ng.IPromise<void> {
    // Get current app version
    return (
      this.platformSvc
        .getAppVersion()
        .then((appVersion) => {
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
        })
        // Load i18n strings
        .finally(() => this.platformSvc.initI18n())
    );
  }

  checkForNewVersion(): void {
    this.$timeout(() => {
      this.platformSvc.getAppVersion().then((appVersion) => {
        this.utilitySvc.checkForNewVersion(appVersion).then((newVersion) => {
          if (!newVersion) {
            return;
          }

          this.alertSvc.currentAlert = {
            message: this.platformSvc
              .getI18nString(this.Strings.Alert.AppUpdateAvailable.Message)
              .replace('{version}', `v${newVersion}`),
            action: this.platformSvc.getI18nString(this.Strings.Button.View),
            actionCallback: () => {
              this.platformSvc.openUrl(`${Globals.ReleaseNotesUrlStem}${newVersion}`);
            }
          } as AndroidAlert;
        });
      });
    }, 1e3);
  }

  executeSync(workingContext: WorkingContext): ng.IPromise<void> {
    return this.$q.resolve().then(() => {
      // Don't attempt to sync if no connection
      if (!this.networkSvc.isNetworkConnected()) {
        return;
      }

      // Check if there are uncommitted syncs or sync updates before syncing
      return this.appHelperSvc
        .getSyncQueueLength()
        .then((syncQueueLength) => {
          return syncQueueLength === 0 ? this.syncSvc.checkForUpdates().catch(() => false) : true;
        })
        .then((runSync) => {
          if (!runSync) {
            return;
          }

          return this.platformSvc
            .executeSync(false, workingContext)
            .then(() => this.utilitySvc.broadcastEvent(AppEventType.RefreshBookmarkSearchResults))
            .catch((err) => {
              return this.appHelperSvc.syncBookmarksFailed(err).then(() => {
                throw err;
              });
            });
        });
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
        const url = intentText?.match(new RegExp(Globals.URL.ValidUrlRegex, 'i'))?.find(Boolean);
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

  @boundMethod
  handleBackButton(event: Event): void {
    if (
      this.utilitySvc.checkCurrentRoute(RoutePath.Bookmark) ||
      this.utilitySvc.checkCurrentRoute(RoutePath.Help) ||
      this.utilitySvc.checkCurrentRoute(RoutePath.Scan) ||
      this.utilitySvc.checkCurrentRoute(RoutePath.Settings) ||
      this.utilitySvc.checkCurrentRoute(RoutePath.Support) ||
      this.utilitySvc.checkCurrentRoute(RoutePath.Updated)
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

  handleBookmarkShared(sharedBookmark: BookmarkMetadata): void {
    if (!angular.isUndefined(sharedBookmark)) {
      // Set current page as shared bookmark
      this.platformSvc.sharedBookmark = sharedBookmark;
    }
  }

  handleDeviceReady(success: () => any, failure: (err: any) => any): ng.IPromise<any> {
    return (
      this.$q
        .resolve()
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
        .then(() => this.handleStartup())
        .then(() => success())
        .catch((err) => failure(err))
    );
  }

  handleInstall(installedVersion: string): ng.IPromise<void> {
    return (
      this.storeSvc
        .init()
        // Set the initial upgrade version
        .then(() => this.upgradeSvc.setLastUpgradeVersion(installedVersion))
        .then(() => this.logSvc.logInfo(`Installed ${installedVersion}`))
    );
  }

  @boundMethod
  handleKeyboardDidShow(event: any): void {
    document.body.style.height = `calc(100% - ${event.keyboardHeight}px)`;
    setTimeout(() => {
      (document.activeElement as any).scrollIntoViewIfNeeded();
    }, 100);
  }

  @boundMethod
  handleKeyboardWillHide(): void {
    document.body.style.removeProperty('height');
  }

  @boundMethod
  handleResume(): ng.IPromise<void> {
    // Check if sync enabled and reset network disconnected flag
    return this.utilitySvc.isSyncEnabled().then((syncEnabled) => {
      if (!syncEnabled) {
        return;
      }

      // If bookmark was shared, switch to bookmark view
      return this.getSharedBookmark().then((sharedBookmark) => {
        if (!angular.isUndefined(sharedBookmark)) {
          this.handleBookmarkShared(sharedBookmark);
          return this.appHelperSvc.switchView(RoutePath.Bookmark);
        }

        // Run sync
        this.executeSync(WorkingContext.DelayedSyncing);
      });
    });
  }

  handleStartup(): ng.IPromise<void> {
    this.logSvc.logInfo('Starting up');

    return this.$q
      .all([
        this.settingsSvc.checkForAppUpdates(),
        this.settingsSvc.telemetryEnabled(),
        this.utilitySvc.isSyncEnabled()
      ])
      .then((data) => {
        const [checkForAppUpdates, telemetryEnabled, syncEnabled] = data;

        // Check for new app version
        if (checkForAppUpdates) {
          this.checkForNewVersion();
        }

        // Exit if sync not enabled
        if (!syncEnabled) {
          return;
        }

        // Submit telemetry if enabled
        if (telemetryEnabled) {
          this.$timeout(() => this.telemetrySvc.submitTelemetry(), 5e3);
        }

        // Check if a bookmark was shared
        return this.getSharedBookmark().then((sharedBookmark) => {
          if (!angular.isUndefined(sharedBookmark)) {
            return this.handleBookmarkShared(sharedBookmark);
          }

          // Run sync
          this.executeSync(WorkingContext.DelayedSyncing);
        });
      });
  }

  @boundMethod
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
        document.addEventListener('deviceready', () => this.handleDeviceReady(resolve, reject), false);
        document.addEventListener('resume', this.handleResume, false);
      })
        .then(() => {
          // If bookmark was shared, switch to bookmark view
          if (!angular.isUndefined(this.platformSvc.sharedBookmark)) {
            return this.appHelperSvc.switchView(RoutePath.Bookmark);
          }
        })
        // Continue initialisation
        .then(() => super.ngOnInit())
    );
  }

  @boundMethod
  workingCancelAction(): ng.IPromise<void> {
    this.utilitySvc.broadcastEvent(AppEventType.WorkingCancelAction);
    return this.$q.resolve();
  }
}
