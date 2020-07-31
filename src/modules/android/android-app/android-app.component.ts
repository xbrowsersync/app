import './android-app.component.scss';
import angular from 'angular';
import { Component, OnInit } from 'angular-ts-decorators';
import compareVersions from 'compare-versions';
import { autobind } from 'core-decorators';
import Strings from '../../../../res/strings/en.json';
import AppMainComponent from '../../app/app-main/app-main.component';
import { AppView } from '../../app/app.enum';
import { AppHelperService } from '../../app/app.interface';
import AlertService from '../../shared/alert/alert.service';
import { ApiService } from '../../shared/api/api.interface';
import BackupRestoreService from '../../shared/backup-restore/backup-restore.service';
import BookmarkHelperService from '../../shared/bookmark/bookmark-helper/bookmark-helper.service';
import { BookmarkMetadata, BookmarkService } from '../../shared/bookmark/bookmark.interface';
import CryptoService from '../../shared/crypto/crypto.service';
import * as Exceptions from '../../shared/exception/exception';
import Globals from '../../shared/global-shared.constants';
import { PlatformService } from '../../shared/global-shared.interface';
import LogService from '../../shared/log/log.service';
import NetworkService from '../../shared/network/network.service';
import { StoreKey } from '../../shared/store/store.enum';
import StoreService from '../../shared/store/store.service';
import SyncEngineService from '../../shared/sync/sync-engine/sync-engine.service';
import UtilityService from '../../shared/utility/utility.service';
import { WorkingContext } from '../../shared/working/working.enum';
import WorkingService from '../../shared/working/working.service';
import AndroidPlatformService from '../android-platform.service';
import AndroidAppHelperService from './android-app-helper/android-app-helper.service';
import { AndroidAlert } from './android-app.interface';

@autobind
@Component({
  controllerAs: 'vm',
  selector: 'app',
  template: require('../../app/app-main/app-main.component.html')
})
export default class AndroidAppComponent extends AppMainComponent implements OnInit {
  $interval: ng.IIntervalService;
  appHelperSvc: AndroidAppHelperService;
  platformSvc: AndroidPlatformService;

  initialised = false;
  sharedBookmark: BookmarkMetadata;

  static $inject = [
    '$exceptionHandler',
    '$interval',
    '$q',
    '$timeout',
    'AlertService',
    'ApiService',
    'AppHelperService',
    'BackupRestoreService',
    'BookmarkHelperService',
    'BookmarkService',
    'CryptoService',
    'LogService',
    'NetworkService',
    'PlatformService',
    'StoreService',
    'SyncEngineService',
    'UtilityService',
    'WorkingService'
  ];
  constructor(
    $exceptionHandler: ng.IExceptionHandlerService,
    $interval: ng.IIntervalService,
    $q: ng.IQService,
    $timeout: ng.ITimeoutService,
    AlertSvc: AlertService,
    ApiSvc: ApiService,
    AppHelperSvc: AppHelperService,
    BackupRestoreSvc: BackupRestoreService,
    BookmarkHelperSvc: BookmarkHelperService,
    BookmarkSvc: BookmarkService,
    CryptoSvc: CryptoService,
    LogSvc: LogService,
    NetworkSvc: NetworkService,
    PlatformSvc: PlatformService,
    StoreSvc: StoreService,
    SyncEngineSvc: SyncEngineService,
    UtilitySvc: UtilityService,
    WorkingSvc: WorkingService
  ) {
    super(
      $exceptionHandler,
      $q,
      $timeout,
      AlertSvc,
      ApiSvc,
      AppHelperSvc,
      BackupRestoreSvc,
      BookmarkHelperSvc,
      BookmarkSvc,
      CryptoSvc,
      LogSvc,
      NetworkSvc,
      PlatformSvc,
      StoreSvc,
      SyncEngineSvc,
      UtilitySvc,
      WorkingSvc
    );

    this.$interval = $interval;
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
      }).then((isDarkModeEnabled: any) => {
        return this.storeSvc.set(StoreKey.DarkModeEnabled, isDarkModeEnabled.value);
      });
    });
  }

  checkForInstallOrUpgrade(): ng.IPromise<void> {
    // Check for stored app version and compare it to current
    const mobileAppVersion = localStorage.getItem('xBrowserSync-mobileAppVersion');
    return this.platformSvc.getAppVersion().then((appVersion) => {
      return (mobileAppVersion
        ? this.$q.resolve(mobileAppVersion)
        : this.storeSvc.get<string>(StoreKey.AppVersion)
      ).then((currentVersion) => {
        return currentVersion ? this.handleUpgrade(currentVersion, appVersion) : this.handleInstall(appVersion);
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
              .getI18nString(Strings.appUpdateAvailable_Android_Message)
              .replace('{version}', newVersion),
            action: this.platformSvc.getI18nString(Strings.button_View_Label),
            actionCallback: () => {
              this.platformSvc.openUrl(Globals.ReleaseNotesUrlStem + (newVersion as string).replace(/^v/, ''));
            }
          } as AndroidAlert);
        });
      });
    }, 1e3);
  }

  checkForSharedBookmark(): ng.IPromise<void> {
    const bookmark = this.getSharedBookmark();
    if (!bookmark) {
      return this.$q.resolve();
    }

    // Set current page as shared bookmark and display bookmark panel
    this.platformSvc.currentPage = bookmark;
    return this.vm.changeView(AppView.Bookmark).finally(() => {
      // Set bookmark form fields to display default values
      this.vm.bookmark.current = bookmark;
      this.vm.bookmark.originalUrl = this.vm.bookmark.current.url;

      // Clear current page
      this.platformSvc.currentPage = undefined;
    });
  }

  displayDefaultSearchState() {
    // Set clear search button to display all bookmarks
    return super.displayDefaultSearchState().then(this.searchBookmarks);
  }

  executeSyncIfOnline(displayLoadingId): ng.IPromise<boolean> {
    const isOnline = this.networkSvc.isNetworkConnected();

    // If not online display an alert and return
    if (!isOnline) {
      this.alertSvc.setCurrentAlert({
        message: this.platformSvc.getI18nString(Strings.workingOffline_Message),
        title: this.platformSvc.getI18nString(Strings.workingOffline_Title)
      });

      return this.$q.resolve(false);
    }

    // Sync bookmarks
    return this.platformSvc.executeSync(false, displayLoadingId).then(() => {
      return true;
    });
  }

  getAllFromNativeStorage(): ng.IPromise<any> {
    return this.$q<any>((resolve, reject) => {
      const nativeStorageItems: any = {};

      const failure = (err = new Error()) => {
        if ((err as any).code === 2) {
          // Item not found
          return resolve(null);
        }
        reject(new Exceptions.FailedLocalStorageException(undefined, err));
      };

      const success = (keys: string[]) => {
        this.$q
          .all(
            keys.map((key) => {
              return this.$q((resolveGetItem, rejectGetItem) => {
                window.NativeStorage.getItem(
                  key,
                  (result: any) => {
                    nativeStorageItems[key] = result;
                    resolveGetItem();
                  },
                  rejectGetItem
                );
              });
            })
          )
          .then(() => {
            resolve(nativeStorageItems);
          })
          .catch(failure);
      };

      window.NativeStorage.keys(success, failure);
    });
  }

  getSharedBookmark(): BookmarkMetadata {
    if (!this.sharedBookmark) {
      return;
    }

    const bookmark = this.sharedBookmark;
    const txt = document.createElement('textarea');
    txt.innerHTML = bookmark.title ? bookmark.title.trim() : '';
    bookmark.title = txt.value;
    this.sharedBookmark = null;
    return bookmark;
  }

  handleBackButton(event: Event): void {
    if (
      this.vm.currentView === AppView.Bookmark ||
      this.vm.currentView === AppView.Help ||
      this.vm.currentView === AppView.Scan ||
      this.vm.currentView === AppView.Settings ||
      this.vm.currentView === AppView.Support ||
      this.vm.currentView === AppView.Updated
    ) {
      // Back to login/search panel
      event.preventDefault();
      this.vm.displayMainView();
    } else {
      // On main view, exit app
      event.preventDefault();
      window.cordova.plugins.exit();
    }
  }

  handleDeviceReady(success: () => any, failure: () => any): ng.IPromise<any> {
    // Configure events
    document.addEventListener('backbutton', this.handleBackButton, false);
    document.addEventListener('touchstart', this.handleTouchStart, false);
    window.addEventListener('keyboardDidShow', this.handleKeyboardDidShow);
    window.addEventListener('keyboardWillHide', this.handleKeyboardWillHide);

    // Check if an intent started the app and detect future shared intents
    window.plugins.intentShim.getIntent(this.handleNewIntent, () => {});
    window.plugins.intentShim.onIntent(this.handleNewIntent);

    // Enable app working in background to check for uncommitted syncs
    window.cordova.plugins.backgroundMode.setDefaults({ hidden: true, silent: true });
    window.cordova.plugins.backgroundMode.on('activate', () => {
      window.cordova.plugins.backgroundMode.disableWebViewOptimizations();
    });

    // Check for upgrade or do fresh install
    return (
      this.checkForInstallOrUpgrade()
        // Run startup process after install/upgrade
        .then(this.handleStartup)
        .then(success)
        .catch(failure)
    );
  }

  handleInstall(installedVersion: string): ng.IPromise<void> {
    return this.storeSvc
      .clear()
      .then(() => {
        return this.$q.all([
          this.storeSvc.set(StoreKey.AppVersion, installedVersion),
          this.storeSvc.set(StoreKey.CheckForAppUpdates, true),
          this.storeSvc.set(StoreKey.DisplayHelp, true)
        ]);
      })
      .then(() => {
        this.logSvc.logInfo(`Installed v${installedVersion}`);
      });
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

  handleNewIntent(intent: any): void {
    if (!intent || !intent.extras) {
      return;
    }

    this.logSvc.logInfo(`Detected new intent: ${intent.extras['android.intent.extra.TEXT']}`);

    // Set shared bookmark with shared intent data
    this.sharedBookmark = {
      title: intent.extras['android.intent.extra.SUBJECT'],
      url: intent.extras['android.intent.extra.TEXT']
    };
  }

  handleResume(): ng.IPromise<void> {
    // Set theme
    return this.checkForDarkTheme().then(() => {
      // Check if sync enabled and reset network disconnected flag
      this.storeSvc.get<boolean>(StoreKey.SyncEnabled).then((syncEnabled) => {
        // Deselect bookmark
        this.vm.search.selectedBookmark = null;

        if (!syncEnabled) {
          return;
        }

        // Run sync
        return this.executeSyncIfOnline('delayDisplayDialog')
          .then((isOnline) => {
            if (isOnline === false) {
              return;
            }

            // Refresh search results if query not present
            if (this.vm.currentView === AppView.Search && !this.vm.search.query) {
              this.vm.displayDefaultSearchState();
            }
          })
          .then(() => {
            // Check if a bookmark was shared
            return this.checkForSharedBookmark();
          });
      });
    });
  }

  handleStartup(): ng.IPromise<void> {
    this.logSvc.logInfo('Starting up');

    // Set theme
    return this.checkForDarkTheme().then(() => {
      return this.storeSvc.get().then((storeContent) => {
        // Prime bookmarks cache
        if (storeContent.syncEnabled) {
          this.bookmarkHelperSvc.getCachedBookmarks();
        }

        // Add useful debug info to beginning of trace log
        const debugInfo = angular.copy(storeContent) as any;
        debugInfo.platform = {
          name: window.device.platform,
          device: `${window.device.manufacturer} ${window.device.model}`
        };
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
        if (storeContent.checkForAppUpdates) {
          this.checkForNewVersion();
        }

        // Exit if sync not enabled
        if (!storeContent.syncEnabled) {
          return;
        }

        // Run sync
        this.executeSyncIfOnline('delayDisplayDialog')
          .then((isOnline) => {
            if (isOnline === false) {
              return;
            }

            // Refresh search results if query not present
            if (this.vm.currentView === AppView.Search && !this.vm.search.query) {
              this.vm.displayDefaultSearchState();
            }
          })
          .then(() => {
            // Check if a bookmark was shared
            return this.checkForSharedBookmark();
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
    } else if (this.vm.search.selectedBookmark) {
      // Deselect selected bookmark
      this.vm.search.selectedBookmark = null;
    }
  }

  handleUpgrade(oldVersion: string, newVersion: string): ng.IPromise<void> {
    if (compareVersions.compare(oldVersion, newVersion, '=')) {
      // No upgrade
      return this.$q.resolve();
    }

    // Clear trace log
    return this.storeSvc
      .set(StoreKey.TraceLog)
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
        return this.$q
          .all([this.storeSvc.set(StoreKey.AppVersion, newVersion), this.storeSvc.set(StoreKey.DisplayUpdated, true)])
          .then(() => {});
      });
  }

  init() {
    // Enable select file to restore
    this.vm.settings.fileRestoreEnabled = true;

    // Increase search results timeout to avoid display lag
    this.vm.settings.getSearchResultsDelay = 500;

    // Display existing sync panel by default
    this.vm.login.displayNewSyncPanel = false;

    // Load i18n strings
    return this.platformSvc
      .initI18n()
      .then(() => {
        // Bind to cordova device events
        return this.$q<void>((resolve, reject) => {
          document.addEventListener(
            'deviceready',
            () => {
              this.handleDeviceReady(resolve, reject);
            },
            false
          );
          document.addEventListener('resume', this.handleResume, false);
        });
      })
      .then(() => {
        // Set component to display and continue initialisation
        this.initialised = true;
        return super.init();
      });
  }

  ngOnInit(): void {
    this.init();
  }

  scanCompleted(scannedSyncInfo: any): ng.IPromise<void> {
    // Update stored sync id and service values
    this.sync.id = scannedSyncInfo.id;
    return this.$q
      .all([this.storeSvc.set(StoreKey.SyncId, scannedSyncInfo.id), this.updateServiceUrl(scannedSyncInfo.url)])
      .then(this.displayMainView)
      .then(() => {
        // Focus on password field
        this.$timeout(() => {
          (document.querySelector('.active-login-form  input[name="txtPassword"]') as HTMLInputElement).focus();
        });
      });
  }

  syncForm_ScanCode_Click() {
    this.changeView(AppView.Scan);
  }

  upgradeTo160(): ng.IPromise<void> {
    // Convert local storage items to IndexedDB
    return this.getAllFromNativeStorage()
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
        return window.NativeStorage.clear();
      });
  }

  workingCancelAction(): ng.IPromise<void> {
    // TODO: implement
    return this.$q.resolve();
  }
}
