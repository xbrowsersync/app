import angular from 'angular';
import { Injectable } from 'angular-ts-decorators';
import { autobind } from 'core-decorators';
import _ from 'underscore';
import { ApiService } from '../../api/api.interface';
import BookmarkHelperService from '../../bookmark/bookmark-helper/bookmark-helper.service';
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
import CryptoService from '../../crypto/crypto.service';
import * as Exceptions from '../../exception/exception';
import Globals from '../../global-shared.constants';
import { MessageCommand } from '../../global-shared.enum';
import { PlatformService } from '../../global-shared.interface';
import LogService from '../../log/log.service';
import { StoreKey } from '../../store/store.enum';
import StoreService from '../../store/store.service';
import UtilityService from '../../utility/utility.service';
import { SyncType } from '../sync.enum';
import { Sync, SyncProcessBookmarksData, SyncProcessResult, SyncProvider } from '../sync.interface';

@autobind
@Injectable('BookmarkSyncProviderService')
export default class BookmarkSyncProviderService implements SyncProvider {
  $q: ng.IQService;
  apiSvc: ApiService;
  bookmarkHelperSvc: BookmarkHelperService;
  bookmarkSvc: BookmarkService;
  cryptoSvc: CryptoService;
  logSvc: LogService;
  platformSvc: PlatformService;
  storeSvc: StoreService;
  utilitySvc: UtilityService;

  static $inject = [
    '$q',
    'ApiService',
    'BookmarkHelperService',
    'BookmarkService',
    'CryptoService',
    'LogService',
    'PlatformService',
    'StoreService',
    'UtilityService'
  ];
  constructor(
    $q: ng.IQService,
    ApiSvc: ApiService,
    BookmarkHelperSvc: BookmarkHelperService,
    BookmarkSvc: BookmarkService,
    CryptoSvc: CryptoService,
    LogSvc: LogService,
    PlatformSvc: PlatformService,
    StoreSvc: StoreService,
    UtilitySvc: UtilityService
  ) {
    this.$q = $q;
    this.apiSvc = ApiSvc;
    this.bookmarkHelperSvc = BookmarkHelperSvc;
    this.bookmarkSvc = BookmarkSvc;
    this.cryptoSvc = CryptoSvc;
    this.logSvc = LogSvc;
    this.platformSvc = PlatformSvc;
    this.storeSvc = StoreSvc;
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

  handleUpdateRemoteFailed(err: Error, lastResult: SyncProcessBookmarksData, sync: Sync): ng.IPromise<void> {
    if (angular.isUndefined(lastResult)) {
      return this.$q.resolve();
    }

    // If offline update cache and then throw error
    return err instanceof Exceptions.NetworkOfflineException
      ? (() => {
          return this.bookmarkHelperSvc
            .updateCachedBookmarks(lastResult.updatedBookmarks, lastResult.encryptedBookmarks)
            .then(() => {
              sync.bookmarks = lastResult.updatedBookmarks;
            });
        })()
      : this.$q.resolve();
  }

  populateNativeBookmarks(bookmarks: Bookmark[]): ng.IPromise<void> {
    // Clear native bookmarks and then populate with provided bookmarks
    return this.bookmarkSvc.clearNativeBookmarks().then(() => {
      return this.bookmarkSvc.createNativeBookmarksFromBookmarks(bookmarks);
    });
  }

  processSync(sync: Sync): ng.IPromise<SyncProcessResult> {
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

  processLocalAndRemoteSync(sync: Sync): ng.IPromise<SyncProcessResult> {
    let getBookmarksToSync: ng.IPromise<Bookmark[]>;
    let updatedBookmark: Bookmark;
    let updatedBookmarkContainer: string;
    const processResult: SyncProcessResult = {
      updateRemote: false
    };

    // changeInfo can be an object or a promise
    return this.$q.resolve(sync.changeInfo).then((changeInfo) => {
      // Use bookmarks provided or process updates on cached bookmarks
      if (sync.bookmarks) {
        // Sync with provided bookmarks, validate bookmark ids
        getBookmarksToSync = this.$q((resolve) => {
          if (this.validateBookmarkIds(sync.bookmarks)) {
            resolve(sync.bookmarks);
          } else {
            const repairedBookmarks = this.repairBookmarkIds(sync.bookmarks);
            resolve(repairedBookmarks);
          }
        });
      } else {
        if (!changeInfo) {
          throw new Exceptions.AmbiguousSyncRequestException();
        }

        getBookmarksToSync = this.bookmarkHelperSvc
          .getCachedBookmarks()
          .then((bookmarks) => {
            // Process bookmark changes
            return this.updateBookmarks(bookmarks, changeInfo);
          })
          .then((updateResults) => {
            updatedBookmark = updateResults.bookmark;
            updatedBookmarkContainer = updateResults.container;
            return updateResults.bookmarks;
          });
      }

      // Sync bookmarks
      return getBookmarksToSync
        .then((bookmarks = []) => {
          // Update native bookmarks
          return this.$q((resolve, reject) => {
            this.platformSvc
              .disableNativeEventListeners()
              .then(() => {
                // Use provided bookmarks to populate native bookmarks
                if (sync.bookmarks) {
                  return this.populateNativeBookmarks(bookmarks);
                }

                // Apply updates to native bookmarks
                // But first check if bookmark container is toolbar and is syncing toolbar
                return (updatedBookmarkContainer === BookmarkContainer.Toolbar
                  ? this.bookmarkHelperSvc.getSyncBookmarksToolbar()
                  : this.$q.resolve(true)
                ).then((updateNativeBookmarks) => {
                  if (updateNativeBookmarks) {
                    return this.bookmarkSvc.processChangeOnNativeBookmarks(
                      updatedBookmark.id,
                      changeInfo.type,
                      updatedBookmark
                    );
                  }
                });
              })
              .then(resolve)
              .catch(reject)
              .finally(this.platformSvc.enableNativeEventListeners);
          }).then(() => {
            // Encrypt bookmarks
            return this.cryptoSvc.encryptData(JSON.stringify(bookmarks)).then((encryptedBookmarks) => {
              processResult.data = {
                encryptedBookmarks,
                updatedBookmarks: bookmarks
              };

              // Update bookmarks cache
              return this.bookmarkHelperSvc.updateCachedBookmarks(bookmarks, encryptedBookmarks).then(() => {
                // Build id mappings if bookmarks provided
                if (sync.bookmarks) {
                  return this.bookmarkSvc.buildIdMappings(bookmarks);
                }
              });
            });
          });
        })
        .then(() => {
          processResult.updateRemote = true;
          return processResult;
        });
    });
  }

  processLocalSync(sync: Sync): ng.IPromise<SyncProcessResult> {
    const processResult: SyncProcessResult = {
      updateRemote: false
    };

    if (sync.bookmarks) {
      // Local import, update native bookmarks
      return this.populateNativeBookmarks(sync.bookmarks).then(() => processResult);
    }

    return (
      // Ensure sync credentials exist before continuing
      this.utilitySvc
        .checkSyncCredentialsExist()
        // Get synced bookmarks
        .then(() => this.apiSvc.getBookmarks())
        .then((response) => {
          let encryptedBookmarks = response.bookmarks;
          const lastUpdated = response.lastUpdated;

          // Decrypt bookmarks
          let bookmarks: Bookmark[];
          return this.cryptoSvc
            .decryptData(response.bookmarks)
            .then((decryptedData) => {
              // Update cached bookmarks
              bookmarks = JSON.parse(decryptedData);

              // Check bookmark ids are all valid
              if (!this.validateBookmarkIds(bookmarks)) {
                bookmarks = this.repairBookmarkIds(bookmarks);

                // Encrypt bookmarks with new ids
                return this.cryptoSvc.encryptData(JSON.stringify(bookmarks)).then((encryptedBookmarksWithNewIds) => {
                  encryptedBookmarks = encryptedBookmarksWithNewIds;
                });
              }
            })
            .then(() => {
              processResult.data = {
                encryptedBookmarks,
                updatedBookmarks: bookmarks
              };
              return this.bookmarkHelperSvc.updateCachedBookmarks(bookmarks, encryptedBookmarks).then(() => bookmarks);
            })
            .then((cachedBookmarks) => {
              // Update browser bookmarks
              return this.platformSvc
                .disableNativeEventListeners()
                .then(() => {
                  return this.populateNativeBookmarks(cachedBookmarks);
                })
                .then(() => {
                  return this.bookmarkSvc.buildIdMappings(cachedBookmarks);
                })
                .finally(this.platformSvc.enableNativeEventListeners);
            })
            .then(() => {
              // Update cached last updated date
              return this.storeSvc.set(StoreKey.LastUpdated, lastUpdated);
            })
            .then(() => {
              processResult.updateRemote = true;
              return processResult;
            });
        })
    );
  }

  processRemoteSync(sync: Sync): ng.IPromise<SyncProcessResult> {
    let buildIdMappings = false;
    const processResult: SyncProcessResult = {
      updateRemote: false
    };

    // Ensure sync credentials exist before continuing
    return this.utilitySvc
      .checkSyncCredentialsExist()
      .then(() => {
        return this.storeSvc.get<boolean>(StoreKey.SyncEnabled);
      })
      .then((syncEnabled) => {
        // If this is a new sync, get native bookmarks and continue
        if (!syncEnabled || !sync.changeInfo) {
          buildIdMappings = true;
          return this.bookmarkSvc.getNativeBookmarksAsBookmarks();
        }

        // Otherwise get cached bookmarks and process changes
        return this.bookmarkHelperSvc.getCachedBookmarks().then((bookmarks) => {
          if (!sync.changeInfo) {
            // Nothing to process
            this.logSvc.logInfo('No change to process');
            return;
          }

          // Update bookmarks data with local changes
          return this.bookmarkSvc.processNativeChangeOnBookmarks(sync.changeInfo, bookmarks);
        });
      })
      .then((bookmarksToSync) => {
        if (!bookmarksToSync) {
          // Don't sync
          return processResult;
        }

        // Update cached bookmarks
        return this.cryptoSvc
          .encryptData(JSON.stringify(bookmarksToSync))
          .then((encryptedBookmarks) => {
            processResult.data = {
              encryptedBookmarks,
              updatedBookmarks: bookmarksToSync
            };
            return this.bookmarkHelperSvc.updateCachedBookmarks(bookmarksToSync, encryptedBookmarks);
          })
          .then(() => {
            // Build id mappings if this is a new sync
            if (buildIdMappings) {
              return this.bookmarkSvc.buildIdMappings(bookmarksToSync);
            }
          })
          .then(() => {
            processResult.updateRemote = true;
            return processResult;
          });
      });
  }

  processUpgradeSync(): ng.IPromise<SyncProcessResult> {
    const processResult: SyncProcessResult = {
      updateRemote: false
    };

    return this.storeSvc
      .get([StoreKey.Password, StoreKey.SyncId])
      .then((storeContent) => {
        // Check secret and sync ID are present
        if (!storeContent.password || !storeContent.syncId) {
          return this.disable().then(() => {
            throw new Exceptions.MissingClientDataException();
          });
        }

        // Get synced bookmarks and decrypt
        return this.apiSvc
          .getBookmarks()
          .then((response) => {
            // Decrypt bookmarks
            return this.cryptoSvc.decryptData(response.bookmarks);
          })
          .then((decryptedData) => {
            // Upgrade containers to use current container names
            const bookmarks = this.bookmarkHelperSvc.upgradeContainers(decryptedData ? JSON.parse(decryptedData) : []);

            // Set the sync version to the current app version
            return this.platformSvc
              .getAppVersion()
              .then((appVersion) => {
                return this.storeSvc.set(StoreKey.SyncVersion, appVersion);
              })
              .then(() => {
                // Generate a new password hash from the old clear text password and sync ID
                return this.cryptoSvc.getPasswordHash(storeContent.password, storeContent.syncId);
              })
              .then((passwordHash) => {
                // Cache the new password hash and encrypt the data
                return this.storeSvc.set(StoreKey.Password, passwordHash);
              })
              .then(() => {
                return this.cryptoSvc.encryptData(JSON.stringify(bookmarks));
              })
              .then((encryptedBookmarks) => {
                // Sync provided bookmarks and set native bookmarks
                return this.$q
                  .all([
                    this.apiSvc.updateBookmarks(encryptedBookmarks, true),
                    this.platformSvc
                      .disableNativeEventListeners()
                      .then(() => {
                        return this.populateNativeBookmarks(bookmarks);
                      })
                      .then(() => {
                        return this.bookmarkSvc.buildIdMappings(bookmarks);
                      })
                      .finally(this.platformSvc.enableNativeEventListeners)
                  ])
                  .then((data) => {
                    processResult.data = {
                      encryptedBookmarks,
                      updatedBookmarks: bookmarks
                    };

                    // Update cached last updated date and return decrypted bookmarks
                    return this.$q.all([
                      this.bookmarkHelperSvc.updateCachedBookmarks(bookmarks, encryptedBookmarks),
                      this.storeSvc.set(StoreKey.LastUpdated, data[0].lastUpdated)
                    ]);
                  });
              })
              .then(() => {});
          });
      })
      .then(() => {
        processResult.updateRemote = true;
        return processResult;
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
      changeData.metadata.isSeparator,
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
    if (bookmarks?.length === 0) {
      return true;
    }

    // Find any bookmark without an id
    let bookmarksHaveIds = true;
    this.bookmarkHelperSvc.eachBookmark(bookmarks, (bookmark) => {
      if (angular.isUndefined(bookmark.id)) {
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

    if (!angular.isUndefined(invalidId)) {
      this.logSvc.logWarning(`Invalid bookmark id detected: ${invalidId.id} (${invalidId.url})`);
      return false;
    }

    // Find a bookmark with a duplicate id
    const duplicateId = _.chain(allBookmarks)
      .countBy('id')
      .findKey((count) => {
        return count > 1;
      })
      .value();

    if (!angular.isUndefined(duplicateId)) {
      this.logSvc.logWarning(`Duplicate bookmark id detected: ${duplicateId}`);
      return false;
    }

    return true;
  }
}
