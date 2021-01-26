import angular from 'angular';
import { Injectable } from 'angular-ts-decorators';
import autobind from 'autobind-decorator';
import { ApiService } from '../../api/api.interface';
import { Bookmark } from '../../bookmark/bookmark.interface';
import BookmarkHelperService from '../../bookmark/bookmark-helper/bookmark-helper.service';
import CryptoService from '../../crypto/crypto.service';
import * as Exceptions from '../../exception/exception';
import { ExceptionHandler } from '../../exception/exception.interface';
import { PlatformService } from '../../global-shared.interface';
import LogService from '../../log/log.service';
import NetworkService from '../../network/network.service';
import { StoreKey } from '../../store/store.enum';
import StoreService from '../../store/store.service';
import UtilityService from '../../utility/utility.service';
import BookmarkSyncProviderService from '../bookmark-sync-provider/bookmark-sync-provider.service';
import { SyncType } from '../sync.enum';
import { Sync, SyncProvider } from '../sync.interface';

@autobind
@Injectable('SyncEngineService')
export default class SyncEngineService {
  $exceptionHandler: ExceptionHandler;
  $q: ng.IQService;
  $timeout: ng.ITimeoutService;
  apiSvc: ApiService;
  bookmarkHelperSvc: BookmarkHelperService;
  cryptoSvc: CryptoService;
  logSvc: LogService;
  networkSvc: NetworkService;
  platformSvc: PlatformService;
  storeSvc: StoreService;
  utilitySvc: UtilityService;

  currentSync: Sync;
  providers: SyncProvider[];
  syncQueue: Sync[] = [];

  static $inject = [
    '$exceptionHandler',
    '$q',
    '$timeout',
    'ApiService',
    'BookmarkHelperService',
    'BookmarkSyncProviderService',
    'CryptoService',
    'LogService',
    'NetworkService',
    'PlatformService',
    'StoreService',
    'UtilityService'
  ];
  constructor(
    $exceptionHandler: ExceptionHandler,
    $q: ng.IQService,
    $timeout: ng.ITimeoutService,
    ApiSvc: ApiService,
    BookmarkHelperSvc: BookmarkHelperService,
    BookmarkSyncProviderSvc: BookmarkSyncProviderService,
    CryptoSvc: CryptoService,
    LogSvc: LogService,
    NetworkSvc: NetworkService,
    PlatformSvc: PlatformService,
    StoreSvc: StoreService,
    UtilitySvc: UtilityService
  ) {
    this.$exceptionHandler = $exceptionHandler;
    this.$q = $q;
    this.$timeout = $timeout;
    this.apiSvc = ApiSvc;
    this.bookmarkHelperSvc = BookmarkHelperSvc;
    this.cryptoSvc = CryptoSvc;
    this.logSvc = LogSvc;
    this.networkSvc = NetworkSvc;
    this.platformSvc = PlatformSvc;
    this.storeSvc = StoreSvc;
    this.utilitySvc = UtilitySvc;

    // Register sync providers
    this.providers = [BookmarkSyncProviderSvc];
  }

  cancelSync(): ng.IPromise<void> {
    return this.disableSync();
  }

  checkIfDisableSyncOnError(err: Error): boolean {
    return (
      err &&
      (err instanceof Exceptions.SyncRemovedException ||
        err instanceof Exceptions.MissingClientDataException ||
        err instanceof Exceptions.NoDataFoundException ||
        err instanceof Exceptions.TooManyRequestsException)
    );
  }

  checkIfRefreshSyncedDataOnError(err: Error): boolean {
    return (
      err &&
      (err instanceof Exceptions.BookmarkMappingNotFoundException ||
        err instanceof Exceptions.ContainerChangedException ||
        err instanceof Exceptions.DataOutOfSyncException ||
        err instanceof Exceptions.FailedCreateNativeBookmarksException ||
        err instanceof Exceptions.FailedGetNativeBookmarksException ||
        err instanceof Exceptions.FailedRemoveNativeBookmarksException ||
        err instanceof Exceptions.NativeBookmarkNotFoundException ||
        err instanceof Exceptions.BookmarkNotFoundException)
    );
  }

  checkForUpdates(isBackgroundSync = false, outputToLog = true): ng.IPromise<boolean> {
    return this.storeSvc.get<string>(StoreKey.LastUpdated).then((storedLastUpdated) => {
      // Get last updated date from cache
      const storedLastUpdatedDate = new Date(storedLastUpdated);

      // Check if bookmarks have been updated
      return this.apiSvc.getBookmarksLastUpdated(isBackgroundSync).then((response) => {
        // If last updated is different to the cached date, refresh bookmarks
        const remoteLastUpdated = new Date(response.lastUpdated);
        const updatesAvailable = storedLastUpdatedDate?.getTime() !== remoteLastUpdated.getTime();

        if (updatesAvailable && outputToLog) {
          this.logSvc.logInfo(
            `Updates available, local:${
              storedLastUpdatedDate?.toISOString() ?? 'none'
            } remote:${remoteLastUpdated.toISOString()}`
          );
        }

        return updatesAvailable;
      });
    });
  }

  disableSync(): ng.IPromise<void> {
    return this.utilitySvc.isSyncEnabled().then((syncEnabled) => {
      if (!syncEnabled) {
        return;
      }

      // Disable sync update check and clear cached data
      return this.$q
        .all([
          this.platformSvc.stopSyncUpdateChecks(),
          this.storeSvc.remove(StoreKey.Password),
          this.storeSvc.remove(StoreKey.SyncVersion),
          this.storeSvc.set(StoreKey.SyncEnabled, false)
        ])
        .then(() => {
          // Disable syncing for registered providers
          return this.$q.all(this.providers.map((provider) => provider.disable()));
        })
        .then(() => {
          // Clear sync queue
          this.syncQueue = [];

          // Reset syncing flag
          this.showInterfaceAsSyncing();

          // Update browser action icon
          this.platformSvc.refreshNativeInterface();
          this.logSvc.logInfo('Sync disabled');
        });
    });
  }

  enableSync(): ng.IPromise<void> {
    return this.$q
      .all([this.storeSvc.set(StoreKey.SyncEnabled, true), this.platformSvc.startSyncUpdateChecks()])
      .then(() => {
        // Enable syncing for registered providers
        return this.$q.all(this.providers.map((provider) => provider.enable()));
      })
      .then(() => this.platformSvc.refreshNativeInterface(true));
  }

  executeSync(isBackgroundSync = false): ng.IPromise<void> {
    // Check if sync enabled before running sync
    return this.utilitySvc.isSyncEnabled().then((syncEnabled) => {
      if (!syncEnabled) {
        throw new Exceptions.SyncDisabledException();
      }

      // Get available updates if there are no queued syncs, finally process the queue
      return (this.syncQueue.length === 0 ? this.checkForUpdates(isBackgroundSync) : this.$q.resolve(false))
        .then((updatesAvailable) => {
          return (
            updatesAvailable &&
            this.queueSync({
              type: SyncType.Local
            })
          );
        })
        .then(() => this.processSyncQueue(isBackgroundSync));
    });
  }

  getCurrentSync(): Sync {
    return this.currentSync;
  }

  getSyncQueueLength(): number {
    return this.syncQueue.length;
  }

  getSyncSize(): ng.IPromise<number> {
    return this.bookmarkHelperSvc
      .getCachedBookmarks()
      .then(() => {
        return this.storeSvc.get<string>(StoreKey.Bookmarks);
      })
      .then((encryptedBookmarks) => {
        // Return size in bytes of cached encrypted bookmarks
        const sizeInBytes = new TextEncoder().encode(encryptedBookmarks).byteLength;
        return sizeInBytes;
      });
  }

  handleFailedSync(failedSync: Sync, err: Error, isBackgroundSync = false): ng.IPromise<Error> {
    let syncException = err;
    return this.$q<Error>((resolve, reject) => {
      // If offline and sync is a change, swallow error and place failed sync back on the queue
      if (
        (this.networkSvc.isNetworkOfflineError(err) ||
          (isBackgroundSync && this.networkSvc.isNetworkConnectionError(err))) &&
        failedSync.type !== SyncType.Local
      ) {
        this.syncQueue.unshift(failedSync);
        if (!isBackgroundSync) {
          this.logSvc.logInfo('Sync not committed: network offline');
        }
        return resolve(new Exceptions.SyncUncommittedException(undefined, err));
      }

      // Set default exception if none set
      if (!(err instanceof Exceptions.Exception)) {
        syncException = new Exceptions.SyncFailedException(undefined, err);
      }

      // Handle failed sync
      this.logSvc.logWarning(`Sync ${failedSync.uniqueId} failed`);
      this.$exceptionHandler(syncException, null, false);
      if (failedSync.changeInfo && failedSync.changeInfo.type) {
        this.logSvc.logInfo(failedSync.changeInfo);
      }
      return this.utilitySvc
        .isSyncEnabled()
        .then((syncEnabled) => {
          return this.showInterfaceAsSyncing()
            .then(() => {
              if (!syncEnabled) {
                return;
              }

              // If no data found, sync has been removed
              if (err instanceof Exceptions.NoDataFoundException) {
                syncException = new Exceptions.SyncRemovedException(undefined, err);
              } else if (failedSync.type !== SyncType.Local) {
                // If local changes made, clear sync queue and refresh sync data if necessary
                this.syncQueue = [];
                if (this.checkIfRefreshSyncedDataOnError(syncException)) {
                  this.currentSync = undefined;
                  return this.platformSvc.queueLocalResync().catch((refreshErr) => {
                    syncException = refreshErr;
                  });
                }
              }
            })
            .then(() => {
              // Check if sync should be disabled
              if (this.checkIfDisableSyncOnError(syncException)) {
                return this.disableSync();
              }
            });
        })
        .then(() => {
          resolve(syncException);
        })
        .catch(reject);
    }).finally(() => {
      // Return sync error back to process that queued the sync
      failedSync.deferred.reject(syncException);
      return this.showInterfaceAsSyncing();
    });
  }

  processSyncQueue(isBackgroundSync = false): ng.IPromise<void> {
    let cancel = false;
    let processedBookmarksData: Bookmark[];
    let updateRemote = false;
    let updateSyncVersion = false;

    // If a sync is in progress, retry later
    if (this.currentSync || this.syncQueue.length === 0) {
      return this.$q.resolve();
    }

    const condition = (): ng.IPromise<boolean> => {
      return this.$q.resolve(this.syncQueue.length > 0);
    };

    const action = (): ng.IPromise<void> => {
      // Get first sync in the queue
      this.currentSync = this.syncQueue.shift();
      this.logSvc.logInfo(
        `Processing sync ${this.currentSync.uniqueId}${isBackgroundSync ? ' in background' : ''} (${
          this.syncQueue.length
        } waiting in queue)`
      );

      // Enable syncing flag
      return this.showInterfaceAsSyncing(this.currentSync.type)
        .then(() => {
          // Process here if this is a cancel
          if (this.currentSync.type === SyncType.Cancel) {
            return this.cancelSync().then(() => {
              cancel = true;
              return false;
            });
          }

          // Set update sync version flag if upgrading
          if (this.currentSync.type === SyncType.Upgrade) {
            updateSyncVersion = true;
          }

          // Set sync bookmarks to last processed result if applicable
          if (angular.isUndefined(this.currentSync.bookmarks) && !angular.isUndefined(processedBookmarksData)) {
            this.currentSync.bookmarks = processedBookmarksData;
          }

          // Process sync for each registered provider
          return this.$q
            .all(this.providers.map((provider) => provider.processSync(this.currentSync)))
            .then((processSyncResults) => {
              // Iterate through process results and extract resultant data
              processSyncResults.forEach((result, index) => {
                switch (this.providers[index].constructor) {
                  case BookmarkSyncProviderService:
                    processedBookmarksData = result.data;
                    break;
                  default:
                    this.logSvc.logWarning('Sync provider not specified');
                }
              });

              // Combine all results to determine whether to proceed with update
              return processSyncResults.reduce((prev, current) => {
                return current.updateRemote ? prev : prev && current.updateRemote;
              }, true);
            });
        })
        .then((syncChange) => {
          // Resolve the current sync's promise
          this.currentSync.deferred.resolve();

          // Set flag if remote bookmarks data should be updated
          updateRemote = !!syncChange;

          // Reset syncing flag
          return this.showInterfaceAsSyncing();
        });
    };

    // Disable automatic updates whilst processing syncs
    return (
      this.utilitySvc
        .isSyncEnabled()
        .then((syncEnabled) => {
          if (syncEnabled) {
            return this.platformSvc.stopSyncUpdateChecks();
          }
        })
        // Process sync queue
        .then(() => this.utilitySvc.asyncWhile<any>(this.syncQueue, condition, action))
        .then(() => {
          // If sync was cancelled stop here
          if (cancel) {
            return;
          }

          return this.cryptoSvc.encryptData(JSON.stringify(processedBookmarksData)).then((encryptedBookmarks) => {
            // Update remote bookmarks if required
            return (!updateRemote
              ? this.$q.resolve().then(() => this.logSvc.logInfo('No changes made, skipping remote update.'))
              : this.apiSvc
                  .updateBookmarks(encryptedBookmarks, updateSyncVersion, isBackgroundSync)
                  .then((response) => {
                    return this.storeSvc.set(StoreKey.LastUpdated, response.lastUpdated).then(() => {
                      this.logSvc.logInfo(`Remote bookmarks updated at ${response.lastUpdated}`);
                    });
                  })
                  .catch((err) => {
                    return this.$q
                      .all(
                        this.providers.map((provider) => {
                          let lastResult: any;
                          switch (provider.constructor) {
                            case BookmarkSyncProviderService:
                              lastResult = processedBookmarksData;
                              break;
                            default:
                          }
                          return provider.handleUpdateRemoteFailed(err, lastResult, this.currentSync);
                        })
                      )
                      .then(() => {
                        throw err;
                      });
                  })
            ).then(() => this.bookmarkHelperSvc.updateCachedBookmarks(processedBookmarksData, encryptedBookmarks));
          });
        })
        .catch((err) =>
          this.handleFailedSync(this.currentSync, err, isBackgroundSync).then((innerErr) => {
            throw innerErr;
          })
        )
        .finally(() => {
          // Clear current sync
          this.currentSync = undefined;

          // Start auto updates if sync enabled
          return this.utilitySvc.isSyncEnabled().then((cachedSyncEnabled) => {
            if (cachedSyncEnabled) {
              return this.platformSvc.startSyncUpdateChecks();
            }
          });
        })
    );
  }

  queueSync(syncToQueue: Sync, runSync = true): ng.IPromise<void> {
    return this.$q<any>((resolve, reject) => {
      this.utilitySvc
        .isSyncEnabled()
        .then((syncEnabled) => {
          // If new sync ensure sync queue is clear
          if (!syncEnabled) {
            this.syncQueue = [];
          }

          let queuedSync: any;
          if (syncToQueue) {
            // If sync is type cancel, clear queue first
            if (syncToQueue.type === SyncType.Cancel) {
              this.syncQueue = [];
            }

            // Add sync to queue
            queuedSync = this.$q.defer();
            syncToQueue.deferred = queuedSync;
            syncToQueue.uniqueId = syncToQueue.uniqueId ?? this.utilitySvc.getUniqueishId();
            this.syncQueue.push(syncToQueue);
            this.logSvc.logInfo(`Sync ${syncToQueue.uniqueId} (${syncToQueue.type}) queued`);
          }

          // Prepare sync promises to return and check if should also run sync
          const promises = [queuedSync.promise];
          if (runSync) {
            const syncedPromise = this.$q<void>((syncedResolve, syncedReject) => {
              this.$timeout(() => {
                this.processSyncQueue().then(syncedResolve).catch(syncedReject);
              });
            });
            promises.push(syncedPromise);
          }

          return this.$q
            .all(promises)
            .then(() => {
              // Enable sync if required
              if (
                !syncEnabled &&
                ((syncToQueue.type === SyncType.Local && angular.isUndefined(syncToQueue.bookmarks ?? undefined)) ||
                  syncToQueue.type === SyncType.Remote ||
                  syncToQueue.type === SyncType.Upgrade)
              ) {
                return this.enableSync().then(() => {
                  this.logSvc.logInfo('Sync enabled');
                });
              }
            })
            .then(resolve);
        })
        .catch(reject);
    });
  }

  showInterfaceAsSyncing(syncType?: SyncType): ng.IPromise<void> {
    // Update browser action icon with current sync type
    if (!angular.isUndefined(syncType ?? undefined)) {
      return this.platformSvc.refreshNativeInterface(undefined, syncType);
    }

    // Get cached sync enabled value and update browser action icon
    return this.utilitySvc.isSyncEnabled().then(this.platformSvc.refreshNativeInterface);
  }
}
