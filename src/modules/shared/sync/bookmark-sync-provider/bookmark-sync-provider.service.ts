import angular from 'angular';
import { Injectable } from 'angular-ts-decorators';
import autobind from 'autobind-decorator';
import { ApiService } from '../../api/api.interface';
import { BookmarkChangeType, BookmarkContainer } from '../../bookmark/bookmark.enum';
import {
  AddBookmarkChangeData,
  Bookmark,
  BookmarkChange,
  BookmarkService,
  ModifyBookmarkChangeData,
  RemoveBookmarkChangeData,
  UpdateBookmarksResult
} from '../../bookmark/bookmark.interface';
import BookmarkHelperService from '../../bookmark/bookmark-helper/bookmark-helper.service';
import CryptoService from '../../crypto/crypto.service';
import * as Exceptions from '../../exception/exception';
import { PlatformService } from '../../global-shared.interface';
import LogService from '../../log/log.service';
import NetworkService from '../../network/network.service';
import SettingsService from '../../settings/settings.service';
import { StoreKey } from '../../store/store.enum';
import StoreService from '../../store/store.service';
import UpgradeService from '../../upgrade/upgrade.service';
import UtilityService from '../../utility/utility.service';
import { SyncType } from '../sync.enum';
import { ProcessSyncResult, Sync, SyncProvider } from '../sync.interface';

@autobind
@Injectable('BookmarkSyncProviderService')
export default class BookmarkSyncProviderService implements SyncProvider {
  $q: ng.IQService;
  apiSvc: ApiService;
  bookmarkHelperSvc: BookmarkHelperService;
  bookmarkSvc: BookmarkService;
  cryptoSvc: CryptoService;
  logSvc: LogService;
  networkSvc: NetworkService;
  platformSvc: PlatformService;
  settingsSvc: SettingsService;
  storeSvc: StoreService;
  upgradeSvc: UpgradeService;
  utilitySvc: UtilityService;

  static $inject = [
    '$q',
    'ApiService',
    'BookmarkHelperService',
    'BookmarkService',
    'CryptoService',
    'LogService',
    'NetworkService',
    'PlatformService',
    'SettingsService',
    'StoreService',
    'UpgradeService',
    'UtilityService'
  ];
  constructor(
    $q: ng.IQService,
    ApiSvc: ApiService,
    BookmarkHelperSvc: BookmarkHelperService,
    BookmarkSvc: BookmarkService,
    CryptoSvc: CryptoService,
    LogSvc: LogService,
    NetworkSvc: NetworkService,
    PlatformSvc: PlatformService,
    SettingsSvc: SettingsService,
    StoreSvc: StoreService,
    UpgradeSvc: UpgradeService,
    UtilitySvc: UtilityService
  ) {
    this.$q = $q;
    this.apiSvc = ApiSvc;
    this.bookmarkHelperSvc = BookmarkHelperSvc;
    this.bookmarkSvc = BookmarkSvc;
    this.cryptoSvc = CryptoSvc;
    this.logSvc = LogSvc;
    this.networkSvc = NetworkSvc;
    this.platformSvc = PlatformSvc;
    this.settingsSvc = SettingsSvc;
    this.storeSvc = StoreSvc;
    this.upgradeSvc = UpgradeSvc;
    this.utilitySvc = UtilitySvc;
  }

  disable(): ng.IPromise<void> {
    // Stop listening for native bookmark events and clear cached data
    return this.$q
      .all([
        this.platformSvc.disableNativeEventListeners(),
        this.storeSvc.remove(StoreKey.BookmarkIdMappings),
        this.storeSvc.remove(StoreKey.Bookmarks),
        this.bookmarkHelperSvc.updateCachedBookmarks(null, null)
      ])
      .then(() => {});
  }

  enable(): ng.IPromise<void> {
    // Start listening for native bookmark events
    return this.platformSvc.enableNativeEventListeners();
  }

  handleUpdateRemoteFailed(err: Error, lastResult: Bookmark[], sync: Sync): ng.IPromise<void> {
    if (angular.isUndefined(lastResult ?? undefined)) {
      return this.$q.resolve();
    }

    // If offline update cache and then throw error
    return this.networkSvc.isNetworkOfflineError(err)
      ? (() =>
          this.cryptoSvc.encryptData(JSON.stringify(lastResult)).then((encryptedBookmarks) =>
            this.bookmarkHelperSvc.updateCachedBookmarks(lastResult, encryptedBookmarks).then(() => {
              // Prepare sync data before it is placed back on the queue
              sync.changeInfo = undefined;
              sync.bookmarks = lastResult;
              sync.type = SyncType.Remote;
            })
          ))()
      : this.$q.resolve();
  }

  populateNativeBookmarks(bookmarks: Bookmark[]): ng.IPromise<void> {
    // Clear native bookmarks and then populate with provided bookmarks
    return this.bookmarkSvc.clearNativeBookmarks().then(() => {
      const populateStartTime = new Date();
      return this.bookmarkSvc.createNativeBookmarksFromBookmarks(bookmarks).then((numBookmarksCreated) => {
        if (!angular.isUndefined(numBookmarksCreated)) {
          this.logSvc.logInfo(
            `${numBookmarksCreated} bookmarks populated in ${
              ((new Date() as any) - (populateStartTime as any)) / 1000
            }s`
          );
        }
      });
    });
  }

  processSync(sync: Sync): ng.IPromise<ProcessSyncResult> {
    // Process sync
    switch (sync.type) {
      // Sync native bookmarks to service
      case SyncType.Remote:
        return this.processRemoteSync(sync);
      // Overwrite native bookmarks with synced bookmarks
      case SyncType.Local:
        return this.processLocalSync(sync);
      // Sync bookmarks to service and overwrite native bookmarks
      case SyncType.LocalAndRemote:
        return this.processLocalAndRemoteSync(sync);
      // Upgrade sync to current version
      case SyncType.Upgrade:
        return this.processUpgradeSync();
      // Ambiguous sync
      default:
        throw new Exceptions.AmbiguousSyncRequestException();
    }
  }

  processLocalAndRemoteSync(sync: Sync): ng.IPromise<ProcessSyncResult> {
    const processResult: ProcessSyncResult = {
      updateRemote: false
    };
    let rebuildIdMappings = false;

    // changeInfo can be an object or a promise
    return this.$q.resolve(sync.changeInfo).then((changeInfo) =>
      this.$q<Bookmark[]>((resolve, reject) => {
        this.$q
          .resolve()
          .then(() => {
            // Use bookmarks provided or retrieve cached bookmarks
            if (sync.bookmarks) {
              // Validate provided bookmark ids first
              if (this.validateBookmarkIds(sync.bookmarks)) {
                return sync.bookmarks;
              }
              const repairedBookmarks = this.repairBookmarkIds(sync.bookmarks);
              return repairedBookmarks;
            }

            if (!changeInfo) {
              throw new Exceptions.AmbiguousSyncRequestException();
            }
            return this.bookmarkHelperSvc.getCachedBookmarks();
          })
          .then(resolve)
          .catch(reject);
      })
        .then((bookmarks) => {
          // Process bookmark updates if change info provided
          return (
            (angular.isUndefined(changeInfo) ? this.$q.resolve(undefined) : this.updateBookmarks(bookmarks, changeInfo))
              // Update native bookmarks
              .then((updateResults) =>
                this.platformSvc
                  .disableNativeEventListeners()
                  .then(() => {
                    // If no change info provided, populate native bookmarks from bookmarks provided or
                    // return unmodified bookmarks
                    if (angular.isUndefined(updateResults)) {
                      if (angular.isUndefined(sync.bookmarks)) {
                        return bookmarks;
                      }
                      rebuildIdMappings = true;
                      return this.populateNativeBookmarks(bookmarks).then(() => bookmarks);
                    }

                    // Check if bookmark container is toolbar and toolbar syncing is enabled
                    return this.settingsSvc.syncBookmarksToolbar().then((syncBookmarksToolbar) => {
                      if (updateResults.container === BookmarkContainer.Toolbar && !syncBookmarksToolbar) {
                        return updateResults.bookmarks;
                      }

                      // Process updates on native bookmarks
                      return this.bookmarkSvc
                        .processChangeOnNativeBookmarks(
                          updateResults.bookmark.id,
                          changeInfo.type,
                          updateResults.bookmark
                        )
                        .then(() => updateResults.bookmarks);
                    });
                  })
                  .finally(this.platformSvc.enableNativeEventListeners)
              )
          );
        })
        // Create containers if required
        .then((bookmarks) => this.bookmarkSvc.ensureContainersExist(bookmarks))
        .then((bookmarks) => {
          // Build id mappings if required
          processResult.data = bookmarks;
          if (rebuildIdMappings) {
            return this.bookmarkSvc.buildIdMappings(bookmarks);
          }
        })
        .then(() => {
          processResult.updateRemote = true;
          return processResult;
        })
    );
  }

  processLocalSync(sync: Sync): ng.IPromise<ProcessSyncResult> {
    const processResult: ProcessSyncResult = {
      updateRemote: false
    };

    // Bookmarks will be provided if this is a restore, if so update native bookmarks and return
    if (sync.bookmarks) {
      return this.populateNativeBookmarks(sync.bookmarks).then(() => processResult);
    }

    return (
      // Ensure sync credentials exist before continuing
      this.utilitySvc
        .checkSyncCredentialsExist()
        // Get synced bookmarks
        .then(() => this.apiSvc.getBookmarks())
        .then((response) => {
          const encryptedBookmarks = response.bookmarks;
          const lastUpdated = response.lastUpdated;

          // Decrypt bookmarks
          let bookmarks: Bookmark[];
          return (
            this.cryptoSvc
              .decryptData(encryptedBookmarks)
              .then((bookmarksJson) => {
                bookmarks = JSON.parse(bookmarksJson);

                // Check bookmark ids are all valid
                if (!this.validateBookmarkIds(bookmarks)) {
                  bookmarks = this.repairBookmarkIds(bookmarks);
                  processResult.updateRemote = true;
                }

                // Create any missing containers
                const bookmarksWithMissingContainers = this.bookmarkSvc.ensureContainersExist(bookmarks);
                if (!angular.equals(bookmarks, bookmarksWithMissingContainers)) {
                  bookmarks = bookmarksWithMissingContainers;
                  processResult.updateRemote = true;
                }

                processResult.data = bookmarks;

                // Update browser bookmarks
                return this.platformSvc
                  .disableNativeEventListeners()
                  .then(() => this.populateNativeBookmarks(bookmarks))
                  .then(() => this.bookmarkSvc.buildIdMappings(bookmarks))
                  .finally(this.platformSvc.enableNativeEventListeners);
              })
              // Update cached last updated date
              .then(() => this.storeSvc.set(StoreKey.LastUpdated, lastUpdated))
              .then(() => processResult)
          );
        })
    );
  }

  processRemoteSync(sync: Sync): ng.IPromise<ProcessSyncResult> {
    const processResult: ProcessSyncResult = {
      updateRemote: false
    };

    // Ensure sync credentials exist before continuing
    return this.utilitySvc
      .checkSyncCredentialsExist()
      .then(() => this.utilitySvc.isSyncEnabled())
      .then((syncEnabled) => {
        // If this is a new sync, get native bookmarks and build id mappings
        if (!syncEnabled) {
          // TODO: Fix this circular dependency
          return (this.bookmarkSvc as any).getNativeBookmarksAsBookmarks().then((bookmarks) => {
            processResult.data = bookmarks;
            processResult.updateRemote = true;
            return this.bookmarkSvc.buildIdMappings(bookmarks);
          });
        }

        // Retrieve cached bookmarks and then process changes
        return this.bookmarkHelperSvc.getCachedBookmarks().then((cachedBookmarks) => {
          // Use bookmarks provided with sync if exists
          const bookmarksToSync = angular.isUndefined(sync.bookmarks) ? cachedBookmarks : sync.bookmarks;
          processResult.data = bookmarksToSync;
          return (angular.isUndefined(sync.changeInfo)
            ? this.$q.resolve(bookmarksToSync)
            : this.bookmarkSvc
                .processNativeChangeOnBookmarks(sync.changeInfo, bookmarksToSync)
                .then((updatedBookmarks) => this.bookmarkSvc.ensureContainersExist(updatedBookmarks))
          ).then((updatedBookmarks) => {
            // If changes made, add updated bookmarks to process result and mark for remote update
            if (!angular.equals(updatedBookmarks, bookmarksToSync)) {
              processResult.data = updatedBookmarks;
              processResult.updateRemote = true;
            }
          });
        });
      })
      .then(() => processResult);
  }

  processUpgradeSync(): ng.IPromise<ProcessSyncResult> {
    const processResult: ProcessSyncResult = {
      updateRemote: false
    };

    return this.storeSvc.get([StoreKey.Password, StoreKey.SyncId]).then((storeContent) => {
      // Check secret and sync ID are present
      if (!storeContent.password || !storeContent.syncId) {
        return this.disable().then(() => {
          throw new Exceptions.MissingClientDataException();
        });
      }

      // Get synced bookmarks and decrypt
      return this.apiSvc.getBookmarks().then((response) => {
        const lastUpdated = response.lastUpdated;
        return (
          this.cryptoSvc
            .decryptData(response.bookmarks)
            .then((bookmarksJson) => {
              const bookmarks = JSON.parse(bookmarksJson);
              return this.$q
                .all([this.platformSvc.getAppVersion(), this.utilitySvc.getSyncVersion()])
                .then((result) => {
                  // Upgrade bookmarks
                  const appVersion = result[0];
                  const syncVersion = result[1];
                  return this.upgradeSvc
                    .upgradeBookmarks(bookmarks, syncVersion, appVersion)
                    .then((upgradedBookmarks) => {
                      // Check bookmark ids are all valid
                      if (!this.validateBookmarkIds(upgradedBookmarks)) {
                        upgradedBookmarks = this.repairBookmarkIds(upgradedBookmarks);
                      }

                      // Create any missing containers
                      const bookmarksWithMissingContainers = this.bookmarkSvc.ensureContainersExist(upgradedBookmarks);
                      if (!angular.equals(upgradedBookmarks, bookmarksWithMissingContainers)) {
                        upgradedBookmarks = bookmarksWithMissingContainers;
                      }

                      processResult.data = upgradedBookmarks;
                      processResult.updateRemote = true;

                      // Update browser bookmarks
                      return this.populateNativeBookmarks(upgradedBookmarks).then(() =>
                        this.bookmarkSvc.buildIdMappings(upgradedBookmarks)
                      );
                    });
                });
            })
            // Update cached last updated date to avoid update conflict response
            .then(() => this.storeSvc.set(StoreKey.LastUpdated, lastUpdated))
            .then(() => processResult)
        );
      });
    });
  }

  repairBookmarkIds(bookmarks: Bookmark[]): Bookmark[] {
    let allBookmarks: Bookmark[] = [];
    let idCounter = 1;

    // Get all bookmarks into flat array
    this.bookmarkHelperSvc.eachBookmark(bookmarks, (bookmark) => {
      allBookmarks.push(bookmark as Bookmark);
    });

    // Remove any invalid ids
    allBookmarks.forEach((bookmark) => {
      if (typeof bookmark.id !== 'number') {
        delete bookmark.id;
      }
    });

    // Sort by id asc
    allBookmarks = allBookmarks.sort((x, y) => {
      return x.id - y.id;
    });

    // Re-add ids
    allBookmarks.forEach((bookmark) => {
      bookmark.id = idCounter;
      idCounter += 1;
    });

    return bookmarks;
  }

  updateBookmarks(bookmarks: Bookmark[], changeInfo: BookmarkChange): ng.IPromise<UpdateBookmarksResult> {
    // Update bookmarks according to change info
    switch (changeInfo.type) {
      // Add bookmark
      case BookmarkChangeType.Add:
        return this.updateBookmarksForChangeTypeAdd(bookmarks, changeInfo.changeData as AddBookmarkChangeData);
      // Modify bookmark
      case BookmarkChangeType.Modify:
        return this.updateBookmarksForChangeTypeUpdate(bookmarks, changeInfo.changeData as ModifyBookmarkChangeData);
      // Remove bookmark
      case BookmarkChangeType.Remove:
        return this.updateBookmarksForChangeTypeRemove(bookmarks, changeInfo.changeData as RemoveBookmarkChangeData);
      default:
        throw new Exceptions.AmbiguousSyncRequestException();
    }
  }

  updateBookmarksForChangeTypeAdd(
    bookmarks: Bookmark[],
    changeData: AddBookmarkChangeData
  ): ng.IPromise<UpdateBookmarksResult> {
    // Get or create other bookmarks container to add create bookmark to
    const otherContainer = this.bookmarkHelperSvc.getContainer(BookmarkContainer.Other, bookmarks, true);

    // Create new bookmark and add to container
    const newBookmark = this.bookmarkHelperSvc.newBookmark(
      changeData.metadata.title,
      changeData.metadata.url,
      changeData.metadata.description,
      changeData.metadata.tags,
      bookmarks
    );
    otherContainer.children.push(newBookmark);

    // Return updated info
    return this.$q.resolve({
      bookmark: newBookmark,
      bookmarks,
      container: otherContainer.title
    } as UpdateBookmarksResult);
  }

  updateBookmarksForChangeTypeRemove(
    bookmarks: Bookmark[],
    changeData: RemoveBookmarkChangeData
  ): ng.IPromise<UpdateBookmarksResult> {
    const container = this.bookmarkHelperSvc.getContainerByBookmarkId(changeData.id, bookmarks).title;
    return this.bookmarkHelperSvc.removeBookmarkById(changeData.id, bookmarks).then((updatedBookmarks) => {
      return {
        bookmark: {
          id: changeData.id
        },
        bookmarks: updatedBookmarks,
        container
      } as UpdateBookmarksResult;
    });
  }

  updateBookmarksForChangeTypeUpdate(
    bookmarks: Bookmark[],
    changeData: ModifyBookmarkChangeData
  ): ng.IPromise<UpdateBookmarksResult> {
    const container = this.bookmarkHelperSvc.getContainerByBookmarkId(changeData.bookmark.id, bookmarks).title;
    const updateInfo = this.bookmarkHelperSvc.extractBookmarkMetadata(changeData.bookmark);
    return this.bookmarkHelperSvc
      .modifyBookmarkById(changeData.bookmark.id, updateInfo, bookmarks)
      .then((updatedBookmarks) => {
        return {
          bookmark: changeData.bookmark,
          bookmarks: updatedBookmarks,
          container
        } as UpdateBookmarksResult;
      });
  }

  validateBookmarkIds(bookmarks: Bookmark[]): boolean {
    if (!bookmarks?.length) {
      return true;
    }

    // Find any bookmark without an id
    let bookmarksHaveIds = true;
    this.bookmarkHelperSvc.eachBookmark(bookmarks, (bookmark) => {
      if (angular.isUndefined(bookmark.id ?? undefined)) {
        bookmarksHaveIds = false;
      }
    });

    if (!bookmarksHaveIds) {
      this.logSvc.logWarning('Bookmarks missing ids');
      return false;
    }

    // Get all bookmarks into flat array
    const allBookmarks: Bookmark[] = [];
    this.bookmarkHelperSvc.eachBookmark(bookmarks, (bookmark) => {
      allBookmarks.push(bookmark as Bookmark);
    });

    // Find a bookmark with a non-numeric id
    const invalidId = allBookmarks.find((bookmark) => {
      return !angular.isNumber(bookmark.id);
    });

    if (!angular.isUndefined(invalidId ?? undefined)) {
      this.logSvc.logWarning(`Invalid bookmark id detected: ${invalidId.id} (${invalidId.url})`);
      return false;
    }

    // Check for duplicate ids
    const uniqueIds = new Set(allBookmarks.map((x) => x.id));
    const duplicatesFound = uniqueIds.size < allBookmarks.length;
    if (duplicatesFound) {
      this.logSvc.logWarning('Duplicate bookmark ids detected');
      return false;
    }

    return true;
  }
}
