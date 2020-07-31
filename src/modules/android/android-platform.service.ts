import angular from 'angular';
import { Injectable } from 'angular-ts-decorators';
import { autobind } from 'core-decorators';
import Strings from '../../../res/strings/en.json';
import { Alert } from '../shared/alert/alert.interface';
import AlertService from '../shared/alert/alert.service';
import BookmarkHelperService from '../shared/bookmark/bookmark-helper/bookmark-helper.service';
import { BookmarkChangeType } from '../shared/bookmark/bookmark.enum';
import { BookmarkMetadata } from '../shared/bookmark/bookmark.interface';
import * as Exceptions from '../shared/exception/exception';
import Globals from '../shared/global-shared.constants';
import { MessageCommand } from '../shared/global-shared.enum';
import { I18nString, PlatformService, WebpageMetadata } from '../shared/global-shared.interface';
import LogService from '../shared/log/log.service';
import NetworkService from '../shared/network/network.service';
import StoreService from '../shared/store/store.service';
import SyncEngineService from '../shared/sync/sync-engine/sync-engine.service';
import { Sync } from '../shared/sync/sync.interface';
import UtilityService from '../shared/utility/utility.service';
import { WorkingContext } from '../shared/working/working.enum';
import WorkingService from '../shared/working/working.service';

@autobind
@Injectable('PlatformService')
export default class AndroidPlatformService implements PlatformService {
  $exceptionHandler: ng.IExceptionHandlerService;
  $http: ng.IHttpService;
  $injector: ng.auto.IInjectorService;
  $interval: ng.IIntervalService;
  $q: ng.IQService;
  $timeout: ng.ITimeoutService;
  alertSvc: AlertService;
  bookmarkHelperSvc: BookmarkHelperService;
  logSvc: LogService;
  networkSvc: NetworkService;
  storeSvc: StoreService;
  _syncEngineSvc: SyncEngineService;
  utilitySvc: UtilityService;
  workingSvc: WorkingService;

  backgroundSyncInterval: ng.IPromise<void>;
  _currentPage: BookmarkMetadata;
  i18nStrings: I18nString[];
  loadingId: string;

  static $inject = [
    '$exceptionHandler',
    '$http',
    '$injector',
    '$interval',
    '$q',
    '$timeout',
    'AlertService',
    'BookmarkHelperService',
    'LogService',
    'NetworkService',
    'StoreService',
    'UtilityService',
    'WorkingService'
  ];
  constructor(
    $exceptionHandler: ng.IExceptionHandlerService,
    $http: ng.IHttpService,
    $injector: ng.auto.IInjectorService,
    $interval: ng.IIntervalService,
    $q: ng.IQService,
    $timeout: ng.ITimeoutService,
    AlertSvc: AlertService,
    BookmarkHelperSvc: BookmarkHelperService,
    LogSvc: LogService,
    NetworkSvc: NetworkService,
    StoreSvc: StoreService,
    UtilitySvc: UtilityService,
    WorkingSvc: WorkingService
  ) {
    this.$exceptionHandler = $exceptionHandler;
    this.$http = $http;
    this.$injector = $injector;
    this.$interval = $interval;
    this.$q = $q;
    this.$timeout = $timeout;
    this.alertSvc = AlertSvc;
    this.bookmarkHelperSvc = BookmarkHelperSvc;
    this.logSvc = LogSvc;
    this.networkSvc = NetworkSvc;
    this.storeSvc = StoreSvc;
    this.utilitySvc = UtilitySvc;
    this.workingSvc = WorkingSvc;

    this.i18nStrings = [];
  }

  get currentPage(): BookmarkMetadata {
    return this._currentPage;
  }
  set currentPage(value: BookmarkMetadata) {
    this._currentPage = value;
  }

  get syncEngineSvc(): SyncEngineService {
    if (angular.isUndefined(this._syncEngineSvc)) {
      this._syncEngineSvc = this.$injector.get('SyncEngineService');
    }
    return this._syncEngineSvc;
  }

  checkOptionalNativePermissions(): ng.IPromise<boolean> {
    return this.methodNotApplicable();
  }

  disableBackgroundSync(): void {
    if (!this.backgroundSyncInterval) {
      return;
    }

    this.$interval.cancel(this.backgroundSyncInterval);
    this.backgroundSyncInterval = null;
    window.cordova.plugins.backgroundMode.disable();
  }

  disableSync(): ng.IPromise<any> {
    return this.syncEngineSvc.disableSync();
  }

  disableNativeEventListeners(): ng.IPromise<void> {
    return this.methodNotApplicable();
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

  enableNativeEventListeners(): ng.IPromise<void> {
    return this.methodNotApplicable();
  }

  executeSync(isBackgroundSync = false, workingContext?: WorkingContext): ng.IPromise<void> {
    // Display loading panel if not background sync and currently on the search view
    if (!isBackgroundSync) {
      this.workingSvc.show(workingContext);
    }

    // Sync bookmarks
    return this.syncEngineSvc
      .executeSync(isBackgroundSync)
      .then(() => {
        // Disable background sync if sync successfull
        if (isBackgroundSync) {
          this.disableBackgroundSync();
        }
      })
      .finally(() => {
        this.workingSvc.hide();
      });
  }

  getAppVersion(): ng.IPromise<string> {
    return this.$q.resolve().then(window.cordova.getAppVersion.getVersionNumber);
  }

  getCurrentUrl(): ng.IPromise<string> {
    return this.$q.resolve(this.currentPage?.url);
  }

  getI18nString(i18nString: I18nString): string {
    let message = '';

    if (i18nString?.key) {
      message = this.i18nStrings[i18nString.key];
    }

    if (!message) {
      throw new Exceptions.I18nException('I18n string has no value');
    }

    return message;
  }

  getPageMetadata(getFullMetadata = true, pageUrl?: string): ng.IPromise<WebpageMetadata> {
    let inAppBrowser: any;
    let loadUrlTimeout: ng.IPromise<void>;

    // Set default metadata from provided page url or current page
    const metadata: WebpageMetadata = {
      title: this.currentPage?.title,
      url: pageUrl ?? this.currentPage?.url
    };

    const promise = this.$q<WebpageMetadata>((resolve, reject) => {
      // Return if no url set
      if (!metadata.url) {
        // TODO: Move this to app component
        // this.vm.bookmark.addButtonDisabledUntilEditForm = true;
        return resolve();
      }

      // If url was provided, check connection and is valid http url
      const httpRegex = new RegExp(Globals.URL.HttpRegex, 'i');
      if (pageUrl && (!this.networkSvc.isNetworkConnected() || !httpRegex.test(pageUrl))) {
        return reject(new Exceptions.FailedGetPageMetadataException());
      }

      const handleResponse = (pageContent?: string, err?: Error): void => {
        this.workingSvc.hide();

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
      // TODO: fix cancelledCallback
      this.workingSvc.show(WorkingContext.RetrievingMetadata);
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

  getSupportedUrl(url: string): string {
    return url;
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

  methodNotApplicable(): ng.IPromise<any> {
    // Unused for this platform
    return this.$q.resolve();
  }

  openUrl(url: string): void {
    window.open(url, '_system', '');
  }

  queueLocalResync(): ng.IPromise<void> {
    return this.$q.resolve();
  }

  queueSync(sync: Sync, command = MessageCommand.SyncBookmarks): ng.IPromise<any> {
    // Add sync data to queue and run sync
    return this.syncEngineSvc
      .queueSync(sync)
      .then(() => {
        if (sync.changeInfo === undefined) {
          return;
        }
        return this.$q.resolve(sync.changeInfo).then((changeInfo) => {
          switch (true) {
            case changeInfo.type === BookmarkChangeType.Add:
              this.$timeout(() => {
                this.alertSvc.setCurrentAlert({
                  message: this.getI18nString(Strings.bookmarkCreated_Message)
                } as Alert);
              }, 200);
              break;
            case changeInfo.type === BookmarkChangeType.Modify:
              this.$timeout(() => {
                this.alertSvc.setCurrentAlert({
                  message: this.getI18nString(Strings.bookmarkUpdated_Message)
                } as Alert);
              }, 200);
              break;
            case changeInfo.type === BookmarkChangeType.Remove:
              this.$timeout(() => {
                this.alertSvc.setCurrentAlert({
                  message: this.getI18nString(Strings.bookmarkDeleted_Message)
                } as Alert);
              }, 200);
              break;
            default:
          }
        });
      })
      .catch((err) => {
        // If local data out of sync, queue refresh sync
        return (this.syncEngineSvc.checkIfRefreshSyncedDataOnError(err)
          ? this.queueLocalResync()
          : this.$q.resolve()
        ).then(() => {
          // Add uncommitted syncs back to the queue and notify
          if (err instanceof Exceptions.SyncUncommittedException) {
            sync.changeInfo = undefined;
            this.syncEngineSvc.queueSync(sync, false);
            this.logSvc.logInfo('Sync not committed: network offline');
            this.alertSvc.setCurrentAlert({
              message: this.getI18nString(Strings.error_UncommittedSyncs_Message),
              title: this.getI18nString(Strings.error_UncommittedSyncs_Title)
            } as Alert);
            this.enableBackgroundSync();
            return;
          }

          throw err;
        });
      });
  }

  refreshNativeInterface(): ng.IPromise<void> {
    return this.methodNotApplicable();
  }

  startSyncUpdateChecks(): ng.IPromise<void> {
    return this.methodNotApplicable();
  }

  stopSyncUpdateChecks(): ng.IPromise<void> {
    return this.methodNotApplicable();
  }

  urlIsSupported(): boolean {
    // Android supports all urls
    return true;
  }
}
