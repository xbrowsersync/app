/* eslint-disable no-case-declarations */

import angular from 'angular';
import { Injectable } from 'angular-ts-decorators';
import compareVersions from 'compare-versions';
import { autobind } from 'core-decorators';
import Strings from '../../../res/strings/en.json';
import { Alert } from '../shared/alert/alert.interface';
import BookmarkHelperService from '../shared/bookmark/bookmark-helper/bookmark-helper.service';
import { BookmarkChangeType } from '../shared/bookmark/bookmark.enum';
import { BookmarkMetadata } from '../shared/bookmark/bookmark.interface';
import * as Exceptions from '../shared/exception/exception';
import Globals from '../shared/global-shared.constants';
import { MessageCommand } from '../shared/global-shared.enum';
import { I18nString, PlatformService, WebpageMetadata } from '../shared/global-shared.interface';
import LogService from '../shared/log/log.service';
import NetworkService from '../shared/network/network.service';
import { StoreKey } from '../shared/store/store.enum';
import StoreService from '../shared/store/store.service';
import SyncEngineService from '../shared/sync/sync-engine/sync-engine.service';
import { Sync } from '../shared/sync/sync.interface';
import UtilityService from '../shared/utility/utility.service';

@autobind
@Injectable('PlatformService')
export default class AndroidPlatformService implements PlatformService {
  $exceptionHandler: ng.IExceptionHandlerService;
  $http: ng.IHttpService;
  $interval: ng.IIntervalService;
  $q: ng.IQService;
  $timeout: ng.ITimeoutService;
  bookmarkHelperSvc: BookmarkHelperService;
  logSvc: LogService;
  networkSvc: NetworkService;
  storeSvc: StoreService;
  syncEngineService: SyncEngineService;
  utilitySvc: UtilityService;

  backgroundSyncInterval: ng.IPromise<void>;
  currentPage: BookmarkMetadata;
  i18nStrings: I18nString[];
  loadingId: string;
  sharedBookmark: BookmarkMetadata;
  vm: any;

  static $inject = [
    '$exceptionHandler',
    '$http',
    '$interval',
    '$q',
    '$timeout',
    'BookmarkHelperService',
    'LogService',
    'NetworkService',
    'StoreService',
    'SyncEngineService',
    'UtilityService'
  ];
  constructor(
    $exceptionHandler: ng.IExceptionHandlerService,
    $http: ng.IHttpService,
    $interval: ng.IIntervalService,
    $q: ng.IQService,
    $timeout: ng.ITimeoutService,
    BookmarkHelperSvc: BookmarkHelperService,
    LogSvc: LogService,
    NetworkSvc: NetworkService,
    StoreSvc: StoreService,
    SyncEngineSvc: SyncEngineService,
    UtilitySvc: UtilityService
  ) {
    this.$exceptionHandler = $exceptionHandler;
    this.$http = $http;
    this.$interval = $interval;
    this.$q = $q;
    this.$timeout = $timeout;
    this.bookmarkHelperSvc = BookmarkHelperSvc;
    this.logSvc = LogSvc;
    this.networkSvc = NetworkSvc;
    this.storeSvc = StoreSvc;
    this.syncEngineService = SyncEngineSvc;
    this.utilitySvc = UtilitySvc;

    this.i18nStrings = [];
  }

  automaticUpdates_Start(): ng.IPromise<void> {
    return this.methodNotApplicable();
  }

  automaticUpdates_Stop(): ng.IPromise<void> {
    return this.methodNotApplicable();
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
        this.vm.settings.darkModeEnabled = isDarkModeEnabled.value;
      });
    });
  }

  checkForInstallOrUpgrade(): ng.IPromise<void> {
    // Check for stored app version and compare it to current
    const mobileAppVersion = localStorage.getItem('xBrowserSync-mobileAppVersion');
    return this.getAppVersion().then((appVersion) => {
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
      this.getAppVersion().then((appVersion) => {
        this.utilitySvc.checkForNewVersion(appVersion).then((newVersion) => {
          if (!newVersion) {
            return;
          }

          this.vm.displaySnackbar(
            null,
            this.getConstant(Strings.appUpdateAvailable_Android_Message).replace('{version}', newVersion),
            null,
            this.getConstant(Strings.button_View_Label),
            () => {
              this.openUrl(Globals.ReleaseNotesUrlStem + (newVersion as string).replace(/^v/, ''));
            }
          );
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
    this.currentPage = bookmark;
    return this.vm.changeView(this.vm.view.views.bookmark).finally(() => {
      // Set bookmark form fields to display default values
      this.vm.bookmark.current = bookmark;
      this.vm.bookmark.originalUrl = this.vm.bookmark.current.url;

      // Clear current page
      this.currentPage = null;
    });
  }

  disableBackgroundSync(): void {
    if (!this.backgroundSyncInterval) {
      return;
    }

    this.$interval.cancel(this.backgroundSyncInterval);
    this.backgroundSyncInterval = null;
    window.cordova.plugins.backgroundMode.disable();
  }

  enableBackgroundSync(): void {
    // Exit if background sync already enabled
    if (this.backgroundSyncInterval) {
      return;
    }

    // Keep app running in background
    window.cordova.plugins.backgroundMode.enable();

    // Try executing sync periodically
    this.backgroundSyncInterval = this.$interval(() => {
      // Only execute sync if app running in background
      if (!window.cordova.plugins.backgroundMode.isActive()) {
        return;
      }

      this.executeSync(true);
    }, 120e3);
  }

  eventListeners_Disable(): ng.IPromise<void> {
    return this.methodNotApplicable();
  }

  eventListeners_Enable(): ng.IPromise<void> {
    return this.methodNotApplicable();
  }

  executeSync(isBackgroundSync = false, displayLoadingId?: string): ng.IPromise<void> {
    let displayLoadingTimeout: ng.IPromise<void>;

    // Display loading panel if not background sync and currently on the search view
    if (!isBackgroundSync) {
      displayLoadingTimeout = this.interface_Working_Show(displayLoadingId);
    }

    // Sync bookmarks
    return this.syncEngineService
      .executeSync(isBackgroundSync)
      .then(() => {
        // Disable background sync if sync successfull
        if (isBackgroundSync) {
          this.disableBackgroundSync();
        }
      })
      .finally(() => {
        this.interface_Working_Hide(displayLoadingId, displayLoadingTimeout);
      });
  }

  executeSyncIfOnline(displayLoadingId): ng.IPromise<boolean> {
    const isOnline = this.networkSvc.isNetworkConnected();

    // If not online display an alert and return
    if (!isOnline) {
      this.vm.displayAlert({
        message: this.getConstant(Strings.workingOffline_Message),
        title: this.getConstant(Strings.workingOffline_Title)
      } as Alert);

      return this.$q.resolve(false);
    }

    // Sync bookmarks
    return this.executeSync(false, displayLoadingId).then(() => {
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

  getAppVersion(): ng.IPromise<string> {
    return this.$q.resolve().then(window.cordova.getAppVersion.getVersionNumber);
  }

  getConstant(i18nString: I18nString): string {
    let message = '';

    if (i18nString?.key) {
      message = this.i18nStrings[i18nString.key];
    }

    if (!message) {
      throw new Exceptions.I18nException('I18n string has no value');
    }

    return message;
  }

  getCurrentUrl(): ng.IPromise<string> {
    return this.$q.resolve(this.currentPage?.url);
  }

  getPageMetadata(getFullMetadata = true, pageUrl?: string): ng.IPromise<WebpageMetadata> {
    let inAppBrowser: any;
    let loadUrlTimeout: ng.IPromise<void>;
    let timeout: ng.IPromise<void>;

    // Set default metadata from provided page url or current page
    const metadata: WebpageMetadata = {
      title: this.currentPage?.title,
      url: pageUrl ?? this.currentPage?.url
    };

    const promise = this.$q<WebpageMetadata>((resolve, reject) => {
      // Return if no url set
      if (!metadata.url) {
        this.vm.bookmark.addButtonDisabledUntilEditForm = true;
        return resolve();
      }

      // If url was provided, check connection and is valid http url
      const httpRegex = new RegExp(Globals.URL.HttpRegex, 'i');
      if (pageUrl && (!this.networkSvc.isNetworkConnected() || !httpRegex.test(pageUrl))) {
        return reject(new Exceptions.FailedGetPageMetadataException());
      }

      const handleResponse = (pageContent?: string, err?: Error): void => {
        this.interface_Working_Hide('retrievingMetadata', timeout);

        // Cancel timeout
        if (loadUrlTimeout) {
          this.$timeout.cancel(loadUrlTimeout);
          loadUrlTimeout = null;
        }

        // Check html content was returned
        if (err || !pageContent) {
          return reject(new Exceptions.FailedGetPageMetadataException(undefined, err));
        }

        // Extract metadata values
        const parser = new DOMParser();
        const document = parser.parseFromString(pageContent, 'text/html');

        const getDecodedTextValue = (text: string): string => {
          if (!text) {
            return '';
          }
          const txt = document.createElement('textarea');
          txt.innerHTML = text.trim();
          return txt.value;
        };

        const getPageDescription = (): string => {
          const ogDescription: HTMLMetaElement =
            document.querySelector('meta[property="OG:DESCRIPTION"]') ??
            document.querySelector('meta[property="og:description"]');
          if (ogDescription?.content) {
            return getDecodedTextValue(ogDescription.content);
          }

          const twitterDescription: HTMLMetaElement =
            document.querySelector('meta[name="TWITTER:DESCRIPTION"]') ??
            document.querySelector('meta[name="twitter:description"]');
          if (twitterDescription?.content) {
            return getDecodedTextValue(twitterDescription.content);
          }

          const defaultDescription: HTMLMetaElement =
            document.querySelector('meta[name="DESCRIPTION"]') ?? document.querySelector('meta[name="description"]');
          if (defaultDescription?.content) {
            return getDecodedTextValue(defaultDescription.content);
          }

          return '';
        };

        const getPageKeywords = (): string => {
          const keywords = [];

          // Get open graph tag values
          document.querySelectorAll<HTMLMetaElement>('meta[property="OG:VIDEO:TAG"]').forEach((tag) => {
            if (tag?.content) {
              keywords.push(getDecodedTextValue(tag.content));
            }
          });
          document.querySelectorAll<HTMLMetaElement>('meta[property="og:video:tag"]').forEach((tag) => {
            if (tag?.content) {
              keywords.push(getDecodedTextValue(tag.content));
            }
          });

          // Get meta tag values
          const metaKeywords: HTMLMetaElement =
            document.querySelector('meta[name="KEYWORDS"]') ?? document.querySelector('meta[name="keywords"]');
          if (metaKeywords?.content) {
            metaKeywords.content.split(',').forEach((keyword) => {
              if (keyword) {
                keywords.push(getDecodedTextValue(keyword));
              }
            });
          }

          // Remove duplicates
          const uniqueKeywords = keywords.filter((value, index, self) => {
            return self.indexOf(value) === index;
          });

          if (uniqueKeywords.length > 0) {
            return uniqueKeywords.join();
          }
        };

        const getPageTitle = (): string => {
          const ogTitle: HTMLMetaElement =
            document.querySelector('meta[property="OG:TITLE"]') ?? document.querySelector('meta[property="og:title"]');
          if (ogTitle?.content) {
            return getDecodedTextValue(ogTitle.content);
          }

          const twitterTitle: HTMLMetaElement =
            document.querySelector('meta[name="TWITTER:TITLE"]') ??
            document.querySelector('meta[name="twitter:title"]');
          if (twitterTitle?.content) {
            return getDecodedTextValue(twitterTitle.content);
          }

          return getDecodedTextValue(document.title);
        };

        // Update metadata with retrieved page data and return
        metadata.title = getPageTitle();
        metadata.description = getPageDescription();
        metadata.tags = getPageKeywords();
        resolve(metadata);
      };

      // If network disconnected fail immediately, otherwise retrieve page metadata
      if (!this.networkSvc.isNetworkConnected()) {
        return handleResponse();
      }

      const cancelledCallback = (): void => {
        resolve(metadata);
      };
      timeout = this.interface_Working_Show('retrievingMetadata', cancelledCallback);
      inAppBrowser = window.cordova.InAppBrowser.open(metadata.url, '_blank', 'hidden=yes');

      inAppBrowser.addEventListener('loaderror', (event: any) => {
        const errMessage = event?.message ?? 'Failed to load webpage';
        handleResponse(null, new Error(errMessage));
      });

      inAppBrowser.addEventListener('loadstop', () => {
        // Return if inAppBrowser has already been closed
        if (!inAppBrowser) {
          return;
        }

        // Remove invasive content and return doc html
        inAppBrowser.executeScript(
          {
            code:
              "(function() { var elements = document.querySelectorAll('video,script'); for (var i = 0; i < elements.length; i++) { elements[i].parentNode.removeChild(elements[i]); } })();" +
              "document.querySelector('html').outerHTML;"
          },
          handleResponse
        );
      });

      // Time out metadata load after 10 secs
      loadUrlTimeout = this.$timeout(() => {
        if ((promise as any).$this.$state.status === 0) {
          handleResponse(null, new Error('Timed out loading URL'));
        }
      }, 10e3);
    }).finally(() => {
      // Close InAppBrowser
      if (inAppBrowser) {
        inAppBrowser.close();
        inAppBrowser = null;
      }
    });

    return promise;
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

  getSupportedUrl(url: string): string {
    return url;
  }

  handleBackButton(event: Event): void {
    if (
      this.vm.view.current === this.vm.view.views.bookmark ||
      this.vm.view.current === this.vm.view.views.settings ||
      this.vm.view.current === this.vm.view.views.help ||
      this.vm.view.current === this.vm.view.views.support ||
      this.vm.view.current === this.vm.view.views.updated ||
      this.vm.view.current === this.vm.view.views.scan
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

  handleDeviceReady(viewModel: any, success: () => any, failure: () => any): ng.IPromise<any> {
    // Set global variables
    this.vm = viewModel;

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
            if (this.vm.view.current === this.vm.view.views.search && !this.vm.search.query) {
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
            if (this.vm.view.current === this.vm.view.views.search && !this.vm.search.query) {
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
    if (!this.isTextInput(event.target as Element) && this.isTextInput(document.activeElement)) {
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

  initI18n(): ng.IPromise<void> {
    let i18nCode = 'en';
    return this.$q<any>((resolve, reject) => {
      navigator.globalization.getPreferredLanguage(resolve, reject);
    })
      .then((language) => {
        if (!language?.value) {
          this.logSvc.logWarning('Couldn’t get preferred language');
          return;
        }
        i18nCode = language.value.split('-')[0];
      })
      .then(() => {
        return this.$http.get<I18nString[]>(`./assets/strings_${i18nCode}.json`).then((response) => {
          this.i18nStrings = response.data;
        });
      })
      .catch((err) => {
        this.logSvc.logWarning(`Couldn’t load i18n strings: ${i18nCode}`);
        throw err;
      });
  }

  interface_Refresh(): ng.IPromise<void> {
    return this.methodNotApplicable();
  }

  interface_Working_Hide(id?: string, timeout?: ng.IPromise<void>): void {
    if (timeout) {
      this.$timeout.cancel(timeout);
    }

    // Hide loading panel if supplied if matches current
    if (!this.loadingId || id === this.loadingId) {
      window.SpinnerDialog.hide();
      this.loadingId = null;
    }
  }

  interface_Working_Show(id?: string, cancelledCallback?: () => void): ng.IPromise<void> {
    let timeout: ng.IPromise<void>;

    // Return if loading overlay already displayed
    if (this.loadingId) {
      return;
    }

    switch (id) {
      // Display syncing dialog after a slight delay
      case 'delayDisplayDialog':
        timeout = this.$timeout(() => {
          if (this.vm.view.current === this.vm.view.views.search) {
            window.SpinnerDialog.show(null, `${this.vm.working.message}…`, true);
          }
        }, 250);
        break;
      // Loading bookmark metadata, display cancellable overlay
      case 'retrievingMetadata':
        const cancel = () => {
          window.SpinnerDialog.hide();
          this.loadingId = null;
          cancelledCallback();
        };
        window.SpinnerDialog.hide();
        timeout = this.$timeout(() => {
          window.SpinnerDialog.show(null, this.getConstant(Strings.getMetadata_Message), cancel);
        }, 250);
        break;
      // Display default overlay
      default:
        timeout = this.$timeout(() => {
          window.SpinnerDialog.show(null, `${this.getConstant(Strings.working_Syncing_Message)}…`, true);
        });
        break;
    }

    this.loadingId = id;
    return timeout;
  }

  isTextInput(element: Element): boolean {
    return ['INPUT', 'TEXTAREA'].indexOf(element.nodeName) !== -1;
  }

  methodNotApplicable(): ng.IPromise<any> {
    // Unused for this platform
    return this.$q.resolve();
  }

  openUrl(url: string): void {
    window.open(url, '_system', '');
  }

  permissions_Check(): ng.IPromise<boolean> {
    return this.methodNotApplicable();
  }

  refreshLocalSyncData(): ng.IPromise<void> {
    return this.$q.resolve();
  }

  sync_Queue(sync: Sync, command = MessageCommand.SyncBookmarks): ng.IPromise<any> {
    // Add sync data to queue and run sync
    return this.syncEngineService
      .queueSync(sync)
      .then(() => {
        if (sync.changeInfo === undefined) {
          return;
        }
        return this.$q.resolve(sync.changeInfo).then((changeInfo) => {
          switch (true) {
            case changeInfo.type === BookmarkChangeType.Add:
              this.$timeout(() => {
                this.vm.displayAlert({
                  message: this.getConstant(Strings.bookmarkCreated_Message)
                } as Alert);
              }, 200);
              break;
            case changeInfo.type === BookmarkChangeType.Modify:
              this.$timeout(() => {
                this.vm.displayAlert({
                  message: this.getConstant(Strings.bookmarkUpdated_Message)
                } as Alert);
              }, 200);
              break;
            case changeInfo.type === BookmarkChangeType.Remove:
              this.$timeout(() => {
                this.vm.displayAlert({
                  message: this.getConstant(Strings.bookmarkDeleted_Message)
                } as Alert);
              }, 200);
              break;
            default:
          }
        });
      })
      .catch((err) => {
        // If local data out of sync, queue refresh sync
        return (this.syncEngineService.checkIfRefreshSyncedDataOnError(err)
          ? this.refreshLocalSyncData()
          : this.$q.resolve()
        ).then(() => {
          // Add uncommitted syncs back to the queue and notify
          if (err instanceof Exceptions.SyncUncommittedException) {
            sync.changeInfo = undefined;
            this.syncEngineService.queueSync(sync, false);
            this.logSvc.logInfo('Sync not committed: network offline');
            this.vm.displayAlert({
              message: this.getConstant(Strings.error_UncommittedSyncs_Message),
              title: this.getConstant(Strings.error_UncommittedSyncs_Title)
            } as Alert);
            this.enableBackgroundSync();
            return;
          }

          throw err;
        });
      });
  }

  sync_Disable(): ng.IPromise<any> {
    return this.syncEngineService.disableSync();
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

  urlIsSupported(): boolean {
    return true;
  }
}
