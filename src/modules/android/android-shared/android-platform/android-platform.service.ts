import angular from 'angular';
import { Injectable } from 'angular-ts-decorators';
import { boundMethod } from 'autobind-decorator';
import { AppEventType } from '../../../app/app.enum';
import { AlertService } from '../../../shared/alert/alert.service';
import { BookmarkChangeType } from '../../../shared/bookmark/bookmark.enum';
import {
  Bookmark,
  BookmarkMetadata,
  ModifyBookmarkChangeData,
  RemoveBookmarkChangeData
} from '../../../shared/bookmark/bookmark.interface';
import { BookmarkHelperService } from '../../../shared/bookmark/bookmark-helper/bookmark-helper.service';
import {
  FailedDownloadFileError,
  FailedGetPageMetadataError,
  I18nError,
  SyncUncommittedError
} from '../../../shared/errors/errors';
import { ExceptionHandler } from '../../../shared/errors/errors.interface';
import Globals from '../../../shared/global-shared.constants';
import { PlatformType } from '../../../shared/global-shared.enum';
import { I18nObject, PlatformInfo, PlatformService, WebpageMetadata } from '../../../shared/global-shared.interface';
import { LogService } from '../../../shared/log/log.service';
import { MetadataService } from '../../../shared/metadata/metadata.service';
import { NetworkService } from '../../../shared/network/network.service';
import { StoreService } from '../../../shared/store/store.service';
import { SyncType } from '../../../shared/sync/sync.enum';
import { Sync } from '../../../shared/sync/sync.interface';
import { SyncService } from '../../../shared/sync/sync.service';
import { UtilityService } from '../../../shared/utility/utility.service';
import { WorkingContext } from '../../../shared/working/working.enum';
import { WorkingService } from '../../../shared/working/working.service';

@Injectable('PlatformService')
export class AndroidPlatformService implements PlatformService {
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
  metadataSvc: MetadataService;
  networkSvc: NetworkService;
  storeSvc: StoreService;
  _syncSvc: SyncService;
  utilitySvc: UtilityService;
  workingSvc: WorkingService;

  backgroundSyncInterval: ng.IPromise<void>;
  _sharedBookmark: BookmarkMetadata;
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
    'MetadataService',
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
    MetadataSvc: MetadataService,
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
    this.metadataSvc = MetadataSvc;
    this.networkSvc = NetworkSvc;
    this.storeSvc = StoreSvc;
    this.utilitySvc = UtilitySvc;
    this.workingSvc = WorkingSvc;

    this.i18nObjects = [];
  }

  get sharedBookmark(): BookmarkMetadata {
    return this._sharedBookmark;
  }
  set sharedBookmark(value: BookmarkMetadata) {
    this._sharedBookmark = value;
  }

  get syncSvc(): SyncService {
    if (angular.isUndefined(this._syncSvc)) {
      this._syncSvc = this.$injector.get('SyncService');
    }
    return this._syncSvc;
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
    return this.syncSvc.disableSync();
  }

  disableNativeEventListeners(): ng.IPromise<void> {
    return this.methodNotApplicable();
  }

  downloadFile(filename: string, textContents: string): ng.IPromise<string | void> {
    if (!filename) {
      throw new Error('File name not supplied.');
    }

    // Set file storage location to external storage root directory
    const storageLocation = `${window.cordova.file.externalRootDirectory}Download`;

    return this.$q((resolve, reject) => {
      const onError = (err: Error) => {
        return reject(new FailedDownloadFileError(undefined, err));
      };

      this.logSvc.logInfo(`Downloading file ${filename}`);

      // Save file to storage location
      window.resolveLocalFileSystemURL(
        storageLocation,
        (dirEntry) => {
          dirEntry.getFile(
            filename,
            { create: true },
            (fileEntry) => {
              fileEntry.createWriter((fileWriter) => {
                fileWriter.write(textContents);
                fileWriter.onerror = onError;
                fileWriter.onwriteend = () => resolve(filename);
              }, onError);
            },
            onError
          );
        },
        onError
      );
    });
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
        .then(() => this.disableBackgroundSync())
        .catch((err) => {
          // Swallow sync uncommitted and network connection errors to not flood logs with duplicate error messages
          if (err instanceof SyncUncommittedError || this.networkSvc.isNetworkConnectionError(err)) {
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
    return this.syncSvc.executeSync(isBackgroundSync).finally(() => {
      if (!isBackgroundSync) {
        this.workingSvc.hide();
      }
    });
  }

  getAppVersion(): ng.IPromise<string> {
    return this.$q.when(window.cordova.getAppVersion.getVersionNumber()).then((versionNumber: string) => {
      return this.utilitySvc.getSemVerAlignedVersion(versionNumber);
    });
  }

  getAppVersionName(): ng.IPromise<string> {
    return this.$q.when(window.cordova.getAppVersion.getVersionNumber());
  }

  getCurrentLocale(): ng.IPromise<string> {
    let currentLocale = Globals.I18n.DefaultLocale;
    return this.$q<any>((resolve, reject) => {
      navigator.globalization.getPreferredLanguage(resolve, reject);
    })
      .then((language) => {
        if (!angular.isUndefined(language?.value)) {
          currentLocale = language?.value;
        }
        return currentLocale;
      })
      .catch((err) => {
        this.logSvc.logWarning(`Couldn’t get current locale: ${err.message}`);
        return currentLocale;
      });
  }

  getCurrentUrl(): ng.IPromise<string> {
    return this.$q.resolve(this.sharedBookmark?.url);
  }

  @boundMethod
  getI18nString(i18nObj: I18nObject): string {
    const i18nStr = this.i18nObjects[i18nObj.key];
    if (angular.isUndefined(i18nStr ?? undefined)) {
      throw new I18nError('I18n string has no value');
    }
    return i18nStr;
  }

  getPageMetadata(getFullMetadata = true, pageUrl?: string): ng.IPromise<WebpageMetadata> {
    let inAppBrowser: any;
    let loadUrlTimeout: ng.IPromise<void>;

    // Check for protocol
    let metadataUrl = pageUrl ?? this.sharedBookmark?.url;
    if (metadataUrl && !new RegExp(Globals.URL.ProtocolRegex).test(metadataUrl)) {
      metadataUrl = `https://${metadataUrl}`;
    }

    // Set default metadata from provided page url or current page
    const metadata: WebpageMetadata = {
      title: this.sharedBookmark?.title,
      url: metadataUrl
    };

    const promise = this.$q<WebpageMetadata>((resolve, reject) => {
      // Return if no url set
      if (!metadata.url) {
        return resolve();
      }

      // Check connection
      if (!this.networkSvc.isNetworkConnected()) {
        return reject(new FailedGetPageMetadataError());
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
          return reject(new FailedGetPageMetadataError(undefined, err));
        }

        // Update metadata with retrieved page data and return
        const pageMetadata = this.metadataSvc.getMetadata(metadata.url, pageContent);
        if (pageMetadata) {
          return resolve(pageMetadata);
        }
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

  getPlatformInfo(): PlatformInfo {
    return {
      device: `${window.device.manufacturer} ${window.device.model}`
    };
  }

  getSupportedUrl(url: string): string {
    return url;
  }

  initI18n(): ng.IPromise<void> {
    // Load strings for default locale first
    return this.$http
      .get<I18nObject[]>(`./assets/strings_${Globals.I18n.DefaultLocale}.json`)
      .then((response) => {
        this.i18nObjects = response.data;

        // Load strings for current locale
        return this.getCurrentLocale();
      })
      .then((currentLocale) => {
        const i18nCode = currentLocale.split('-')[0];
        return this.$http
          .get<I18nObject[]>(`./assets/strings_${i18nCode}.json`)
          .then((response) => {
            this.i18nObjects = response.data;
          })
          .catch((err) => {
            this.logSvc.logWarning(`Failed to load i18n strings for locale ${currentLocale}`);
          });
      })
      .catch((err) => {
        this.logSvc.logWarning(`Failed to load i18n strings: ${err?.message}`);
      });
  }

  methodNotApplicable(): ng.IPromise<any> {
    // Unused for this platform
    return this.$q.resolve();
  }

  @boundMethod
  openUrl(url: string): void {
    window.open(url, '_system', '');
  }

  queueLocalResync(): ng.IPromise<void> {
    return this.queueSync({ type: SyncType.Local }).then(() => {
      this.logSvc.logInfo('Local sync data refreshed');
    });
  }

  queueSync(sync?: Sync): ng.IPromise<void> {
    let resyncRequired = false;
    return this.$q<boolean>((resolve, reject) => {
      // If no sync has been provided, process current sync queue and check for updates
      if (angular.isUndefined(sync)) {
        return this.executeSync();
      }

      // If pushing a change, check for updates before proceeding with sync
      if (sync.type !== SyncType.LocalAndRemote && sync.type !== SyncType.Remote) {
        return resolve(true);
      }

      // Check for updates before syncing
      this.syncSvc
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
        return (proceedWithSync ? this.syncSvc.queueSync(sync) : this.$q.resolve())
          .then(() => {
            // Ensure bookmark results are refreshed if bookmarks were out of sync
            if (resyncRequired) {
              this.utilitySvc.broadcastEvent(AppEventType.RefreshBookmarkSearchResults);
            }
          })
          .catch((err) => {
            // Enable background sync if sync uncommitted
            if (err instanceof SyncUncommittedError) {
              this.enableBackgroundSync();
            }
            throw err;
          });
      })
      .finally(() => this.workingSvc.hide());
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
