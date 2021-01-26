import angular from 'angular';
import { Injectable } from 'angular-ts-decorators';
import autobind from 'autobind-decorator';
import { AppEventType } from '../../../app/app.enum';
import { Alert } from '../../../shared/alert/alert.interface';
import AlertService from '../../../shared/alert/alert.service';
import { BookmarkChangeType } from '../../../shared/bookmark/bookmark.enum';
import {
  Bookmark,
  BookmarkMetadata,
  ModifyBookmarkChangeData,
  RemoveBookmarkChangeData
} from '../../../shared/bookmark/bookmark.interface';
import BookmarkHelperService from '../../../shared/bookmark/bookmark-helper/bookmark-helper.service';
import * as Exceptions from '../../../shared/exception/exception';
import { ExceptionHandler } from '../../../shared/exception/exception.interface';
import Globals from '../../../shared/global-shared.constants';
import { MessageCommand, PlatformType } from '../../../shared/global-shared.enum';
import { I18nObject, PlatformService, WebpageMetadata } from '../../../shared/global-shared.interface';
import LogService from '../../../shared/log/log.service';
import NetworkService from '../../../shared/network/network.service';
import StoreService from '../../../shared/store/store.service';
import { SyncType } from '../../../shared/sync/sync.enum';
import { Sync, SyncResult } from '../../../shared/sync/sync.interface';
import SyncEngineService from '../../../shared/sync/sync-engine/sync-engine.service';
import UtilityService from '../../../shared/utility/utility.service';
import { WorkingContext } from '../../../shared/working/working.enum';
import WorkingService from '../../../shared/working/working.service';

@autobind
@Injectable('PlatformService')
export default class AndroidPlatformService implements PlatformService {
  Strings = require('../../../../../res/strings/en.json');

  $exceptionHandler: ExceptionHandler;
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
  cancelGetPageMetadata: () => any;
  i18nObjects: I18nObject[];
  loadingId: string;
  platformName = PlatformType.Android;

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
    $exceptionHandler: ExceptionHandler,
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

    this.i18nObjects = [];
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

      this.executeSync(true)
        // Disable background sync if sync successfull
        .then(this.disableBackgroundSync)
        .catch((err) => {
          // Swallow sync uncommitted and network connection errors to not flood logs with duplicate error messages
          if (err instanceof Exceptions.SyncUncommittedException || this.networkSvc.isNetworkConnectionError(err)) {
            this.logSvc.logInfo('Waiting for network connection...');
            return;
          }

          // Disable background sync if error encountered
          this.disableBackgroundSync();
          throw err;
        });
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
    return this.syncEngineSvc.executeSync(isBackgroundSync).finally(() => {
      if (!isBackgroundSync) {
        this.workingSvc.hide();
      }
    });
  }

  getAppVersion(): ng.IPromise<string> {
    return this.$q.resolve().then(window.cordova.getAppVersion.getVersionNumber);
  }

  getCurrentUrl(): ng.IPromise<string> {
    return this.$q.resolve(this.currentPage?.url);
  }

  getI18nString(i18nObj: I18nObject): string {
    const i18nStr = this.i18nObjects[i18nObj.key];
    if (angular.isUndefined(i18nStr ?? undefined)) {
      throw new Exceptions.I18nException('I18n string has no value');
    }
    return i18nStr;
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

      // If user cancels loading metadata, return default metadata
      this.cancelGetPageMetadata = () => {
        resolve(metadata);
        this.cancelGetPageMetadata = undefined;
      };

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
        if ((promise as any).$$state?.status === 0) {
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
        return this.$http.get<I18nObject[]>(`./assets/strings_${i18nCode}.json`).then((response) => {
          this.i18nObjects = response.data;
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
    return this.queueSync({ type: SyncType.Local }).then(() => {
      this.logSvc.logInfo('Local sync data refreshed');
    });
  }

  queueSync(sync: Sync, command = MessageCommand.SyncBookmarks): ng.IPromise<SyncResult> {
    let resyncRequired = false;
    return this.$q<boolean>((resolve, reject) => {
      // If pushing a change, check for updates before proceeding with sync
      if (sync.type !== SyncType.LocalAndRemote && sync.type !== SyncType.Remote) {
        return resolve(true);
      }

      // Check for updates before syncing
      this.syncEngineSvc
        .checkForUpdates()
        .then((updatesAvailable) => {
          if (!updatesAvailable) {
            return resolve(true);
          }

          // Queue sync to get updates
          resyncRequired = true;
          return this.queueSync({
            type: SyncType.Local
          }).then(() => {
            // Proceed with sync only if queued sync is to add a new bookmark or changed bookmark
            // still exists
            if (sync.changeInfo.type === BookmarkChangeType.Add) {
              return resolve(true);
            }
            return this.bookmarkHelperSvc.getCachedBookmarks().then((bookmarks) => {
              const changedBookmarkId =
                (sync.changeInfo.changeData as RemoveBookmarkChangeData)?.id ??
                (sync.changeInfo.changeData as ModifyBookmarkChangeData)?.bookmark?.id;
              const changedBookmark = this.bookmarkHelperSvc.findBookmarkById(changedBookmarkId, bookmarks) as Bookmark;
              if (angular.isUndefined(changedBookmark)) {
                this.logSvc.logInfo('Changed bookmark could not be found, cancelling sync');
                return resolve(false);
              }
              resolve(true);
            });
          });
        })
        .catch(reject);
    })
      .catch(() => true)
      .then((proceedWithSync) => {
        return (proceedWithSync ? this.syncEngineSvc.queueSync(sync) : this.$q.resolve())
          .then(() => {
            // Ensure bookmark results are refreshed if bookmarks were out of sync
            if (resyncRequired) {
              this.utilitySvc.broadcastEvent(AppEventType.RefreshBookmarkSearchResults);
            }
            return { success: proceedWithSync } as SyncResult;
          })
          .catch((err) => {
            // Enable background sync if sync uncommitted
            if (err instanceof Exceptions.SyncUncommittedException) {
              this.alertSvc.setCurrentAlert({
                message: this.getI18nString(this.Strings.Exception.UncommittedSyncs_Message),
                title: this.getI18nString(this.Strings.Exception.UncommittedSyncs_Title)
              } as Alert);
              this.enableBackgroundSync();
              return { error: err, success: false } as SyncResult;
            }

            throw err;
          });
      })
      .finally(this.workingSvc.hide);
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
