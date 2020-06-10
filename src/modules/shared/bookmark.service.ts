/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-prototype-builtins */
/* eslint-disable no-restricted-syntax */
/* eslint-disable @typescript-eslint/brace-style */
/* eslint-disable @typescript-eslint/camelcase */
/* eslint-disable no-case-declarations */
/* eslint-disable default-case */
/* eslint-disable no-plusplus */
/* eslint-disable no-param-reassign */
/* eslint-disable consistent-return */
/* eslint-disable @typescript-eslint/explicit-function-return-type */

import { Injectable } from 'angular-ts-decorators';
import _ from 'underscore';
import angular from 'angular';
import { autobind } from 'core-decorators';
import Globals from './globals';
import StoreService from './store.service';
import ApiService from './api.service';
import Platform from './platform.interface';
import UtilityService from './utility.service';
import Strings from '../../../res/strings/en.json';

@autobind
@Injectable('BookmarkService')
export default class BookmarkService {
  $q: ng.IQService;
  $timeout: ng.ITimeoutService;
  apiSvc: ApiService;
  platformSvc: Platform;
  storeSvc: StoreService;
  utilitySvc: UtilityService;

  cachedBookmarks_encrypted: any;
  cachedBookmarks_plain: any;
  currentSync: any;
  syncQueue = [];

  static $inject = ['$injector', '$q', '$timeout', 'ApiService', 'StoreService', 'UtilityService'];
  constructor(
    $injector: any,
    $q: ng.IQService,
    $timeout: ng.ITimeoutService,
    ApiSvc: ApiService,
    StoreSvc: StoreService,
    UtilitySvc: UtilityService
  ) {
    this.$q = $q;
    this.$timeout = $timeout;
    this.apiSvc = ApiSvc;
    this.storeSvc = StoreSvc;
    this.utilitySvc = UtilitySvc;

    $timeout(() => {
      this.platformSvc = $injector.get('PlatformService');
    });
  }

  addBookmark(newBookmarkInfo, bookmarks) {
    const updatedBookmarks = angular.copy(bookmarks);
    const parent = this.findBookmarkById(updatedBookmarks, newBookmarkInfo.parentId);
    if (!parent) {
      return this.$q.reject({ code: Globals.ErrorCodes.XBookmarkNotFound });
    }

    // Create new bookmark/separator
    const bookmark = this.isSeparator(newBookmarkInfo)
      ? this.xSeparator()
      : this.xBookmark(
          newBookmarkInfo.title,
          newBookmarkInfo.url || null,
          newBookmarkInfo.description,
          newBookmarkInfo.tags,
          newBookmarkInfo.children
        );

    // Use id if supplied or create new id
    (bookmark as any).id = newBookmarkInfo.id || this.getNewBookmarkId(updatedBookmarks);

    // Clean bookmark and add at index or last index in path
    const cleanedBookmark = this.cleanBookmark(bookmark);
    parent.children.splice(newBookmarkInfo.index, 0, cleanedBookmark);

    return this.$q.resolve({
      bookmark: cleanedBookmark,
      bookmarks: updatedBookmarks
    });
  }

  checkForUpdates() {
    return this.storeSvc.get(Globals.CacheKeys.LastUpdated).then((cachedData) => {
      // Get last updated date from local cache
      const cachedLastUpdated = new Date(cachedData);

      // Check if bookmarks have been updated
      return this.apiSvc.getBookmarksLastUpdated().then((data) => {
        // If last updated is different to the date in local storage, refresh bookmarks
        const remoteLastUpdated = new Date(data.lastUpdated);
        const updatesAvailable = !cachedLastUpdated || cachedLastUpdated.getTime() !== remoteLastUpdated.getTime();

        if (updatesAvailable) {
          this.utilitySvc.logInfo(
            `Updates available, local:${
              cachedLastUpdated ? cachedLastUpdated.toISOString() : 'none'
            } remote:${remoteLastUpdated.toISOString()}`
          );
        }

        return updatesAvailable;
      });
    });
  }

  checkIfDisableSyncOnError(syncEnabled, err) {
    if (
      syncEnabled &&
      (err.code === Globals.ErrorCodes.SyncRemoved ||
        err.code === Globals.ErrorCodes.MissingClientData ||
        err.code === Globals.ErrorCodes.NoDataFound ||
        err.code === Globals.ErrorCodes.TooManyRequests)
    ) {
      return this.disableSync();
    }

    return this.$q.resolve();
  }

  checkIfRefreshSyncedDataOnError(err) {
    return (
      err &&
      (err.code === Globals.ErrorCodes.BookmarkMappingNotFound ||
        err.code === Globals.ErrorCodes.ContainerChanged ||
        err.code === Globals.ErrorCodes.DataOutOfSync ||
        err.code === Globals.ErrorCodes.FailedCreateLocalBookmarks ||
        err.code === Globals.ErrorCodes.FailedGetLocalBookmarks ||
        err.code === Globals.ErrorCodes.FailedRemoveLocalBookmarks ||
        err.code === Globals.ErrorCodes.LocalBookmarkNotFound ||
        err.code === Globals.ErrorCodes.XBookmarkNotFound)
    );
  }

  cleanBookmark(originalBookmark) {
    // Create a copy of original
    const copy = angular.copy(originalBookmark);

    // Remove empty properties, except for children array
    const cleanedBookmark = _.pick(copy, (value, key) => {
      return (_.isArray(value) && key !== 'children') || _.isString(value) ? value.length > 0 : value != null;
    });

    return cleanedBookmark;
  }

  cleanWords(wordsToClean) {
    if (!wordsToClean) {
      return;
    }

    const cleanWords = wordsToClean.toLowerCase().replace(/['"]/g, '');
    const cleanWordsArr = _.compact(cleanWords.split(/\s/));
    return cleanWordsArr;
  }

  convertLocalBookmarkToXBookmark(localBookmark, xBookmarks, takenIds?) {
    takenIds = takenIds || [];

    if (!localBookmark) {
      return null;
    }

    let bookmark;
    if (this.isSeparator(localBookmark)) {
      bookmark = this.xSeparator();
    } else {
      bookmark = this.xBookmark(localBookmark.title, localBookmark.url);
    }

    // Assign a unique id
    bookmark.id = this.getNewBookmarkId(xBookmarks, takenIds);
    takenIds.push(bookmark.id);

    // Process children if any
    if (localBookmark.children && localBookmark.children.length > 0) {
      bookmark.children = localBookmark.children.map((childBookmark) => {
        return this.convertLocalBookmarkToXBookmark(childBookmark, xBookmarks, takenIds);
      });
    }

    return bookmark;
  }

  disableSync() {
    return this.storeSvc.get(Globals.CacheKeys.SyncEnabled).then((syncEnabled) => {
      if (!syncEnabled) {
        return;
      }

      // Disable event listeners and checking for sync updates
      this.platformSvc.eventListeners_Disable();
      this.platformSvc.automaticUpdates_Stop();

      // Clear sync queue
      this.syncQueue = [];

      // Reset syncing flag
      this.setIsSyncing();

      // Clear cached sync data
      return this.$q
        .all([
          this.storeSvc.remove(Globals.CacheKeys.BookmarkIdMappings),
          this.storeSvc.remove(Globals.CacheKeys.Bookmarks),
          this.storeSvc.remove(Globals.CacheKeys.Password),
          this.storeSvc.remove(Globals.CacheKeys.SyncVersion),
          this.storeSvc.set(Globals.CacheKeys.SyncEnabled, false),
          this.updateCachedBookmarks(null, null)
        ])
        .then(() => {
          // Update browser action icon
          this.platformSvc.interface_Refresh();
          this.utilitySvc.logInfo('Sync disabled');
        });
    });
  }

  eachBookmark(bookmarks, iteratee, untilCondition?) {
    untilCondition = untilCondition === undefined ? false : untilCondition;
    // Run the iteratee function for every bookmark until the condition is met
    (function iterateBookmarks(bookmarksToIterate) {
      for (let i = 0; i < bookmarksToIterate.length; i++) {
        if (untilCondition) {
          return;
        }
        iteratee(bookmarksToIterate[i]);
        if (bookmarksToIterate[i].children && bookmarksToIterate[i].children.length > 0) {
          iterateBookmarks(bookmarksToIterate[i].children);
        }
      }
    })(bookmarks);
  }

  enableSync() {
    return this.$q.all([
      this.storeSvc.set(Globals.CacheKeys.SyncEnabled, true),
      this.platformSvc.eventListeners_Enable(),
      this.platformSvc.automaticUpdates_Start()
    ]);
  }

  executeSync(isBackgroundSync?) {
    // Check if sync enabled before running sync
    return this.storeSvc.get(Globals.CacheKeys.SyncEnabled).then((syncEnabled) => {
      if (!syncEnabled) {
        return this.$q.reject(Globals.ErrorCodes.SyncNotEnabled);
      }

      // Get available updates if there are no queued syncs, finally process the queue
      return (this.syncQueue.length === 0 ? this.checkForUpdates() : this.$q.resolve(false))
        .then((updatesAvailable) => {
          if (updatesAvailable) {
            return this.queueSync({
              type: Globals.SyncType.Pull
            });
          }
        })
        .then(() => {
          return this.processSyncQueue(isBackgroundSync);
        });
    });
  }

  exportBookmarks() {
    const cleanRecursive = (bookmarks) => {
      return bookmarks.map((bookmark) => {
        const cleanedBookmark = this.cleanBookmark(bookmark);
        if (_.isArray(cleanedBookmark.children)) {
          cleanedBookmark.children = cleanRecursive(cleanedBookmark.children);
        }
        return cleanedBookmark;
      });
    };

    return this.storeSvc.get(Globals.CacheKeys.SyncEnabled).then((syncEnabled) => {
      // If sync is not enabled, export local browser data
      if (!syncEnabled) {
        return this.platformSvc.bookmarks_Get(false);
      }

      // Otherwise, export synced data
      return this.apiSvc
        .getBookmarks()
        .then((data) => {
          // Decrypt bookmarks
          return this.utilitySvc.decryptData(data.bookmarks);
        })
        .then((decryptedData) => {
          // Remove empty containers
          const bookmarks = this.removeEmptyContainers(JSON.parse(decryptedData));

          // Clean exported bookmarks and return as json
          return cleanRecursive(bookmarks);
        });
    });
  }

  findBookmarkById(bookmarks, id) {
    if (!bookmarks) {
      return;
    }

    // Recursively iterate through all bookmarks until id match is found
    let bookmark;
    const index = bookmarks.findIndex((x) => {
      return x.id === id;
    });
    if (index === -1) {
      _.each<any>(bookmarks, (x) => {
        if (!bookmark) {
          bookmark = this.findBookmarkById(x.children, id);
        }
      });
    } else {
      bookmark = bookmarks[index];
      // Set index as bookmark indexes in Firefox are unreliable!
      // https://bugzilla.mozilla.org/show_bug.cgi?id=1556427
      if (bookmark.index != null) {
        bookmark.index = index;
      }
    }

    return bookmark;
  }

  findBookmarkInTree(id, tree, index) {
    if (Array.isArray(tree)) {
      tree = {
        id: -1,
        children: tree
      };
    }

    if (tree.id === id) {
      const path = [{ bookmark: tree, index }];
      return { result: tree, path };
    }
    const children = tree.children || [];
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const tmp = this.findBookmarkInTree(id, child, i);
      if (!_.isEmpty(tmp)) {
        tmp.path.unshift({ bookmark: tree, index });
        return tmp;
      }
    }
    return {};
  }

  findCurrentUrlInBookmarks() {
    // Check if current url is contained in bookmarks
    return this.platformSvc.getCurrentUrl().then((currentUrl) => {
      if (!currentUrl) {
        return;
      }

      return this.searchBookmarks({ url: currentUrl }).then((searchResults) => {
        const searchResult = _.find<any>(searchResults, (bookmark) => {
          return bookmark.url.toLowerCase() === currentUrl.toLowerCase();
        });

        return this.$q.resolve(searchResult);
      });
    });
  }

  getBookmarkTitleForDisplay(bookmark) {
    // If normal bookmark, return title or if blank url to display
    if (bookmark.url) {
      return bookmark.title ? bookmark.title : bookmark.url.replace(/^https?:\/\//i, '');
    }

    // Otherwise bookmark is a folder, return title if not a container
    if (!this.xBookmarkIsContainer(bookmark)) {
      return bookmark.title;
    }

    let containerTitle = `${undefined}`;

    switch (bookmark.title) {
      case Globals.Bookmarks.MenuContainerName:
        containerTitle = this.platformSvc.getConstant(Strings.bookmarks_Container_Menu_Title);
        break;
      case Globals.Bookmarks.MobileContainerName:
        containerTitle = this.platformSvc.getConstant(Strings.bookmarks_Container_Mobile_Title);
        break;
      case Globals.Bookmarks.OtherContainerName:
        containerTitle = this.platformSvc.getConstant(Strings.bookmarks_Container_Other_Title);
        break;
      case Globals.Bookmarks.ToolbarContainerName:
        containerTitle = this.platformSvc.getConstant(Strings.bookmarks_Container_Toolbar_Title);
        break;
    }

    return containerTitle;
  }

  getCachedBookmarks() {
    // Get cached encrypted bookmarks from local storage
    return this.storeSvc.get(Globals.CacheKeys.Bookmarks).then((cachedData) => {
      const cachedEncryptedBookmarks = cachedData;

      // Return unencrypted cached bookmarks from memory if encrypted bookmarks
      // in storage match cached encrypted bookmarks in memory
      if (
        cachedEncryptedBookmarks &&
        this.cachedBookmarks_encrypted &&
        cachedEncryptedBookmarks === this.cachedBookmarks_encrypted
      ) {
        return angular.copy(this.cachedBookmarks_plain);
      }

      // If encrypted bookmarks not cached in storage, get synced bookmarks
      return (cachedEncryptedBookmarks
        ? this.$q.resolve(cachedEncryptedBookmarks)
        : this.apiSvc.getBookmarks().then((response) => {
            return response.bookmarks;
          })
      ).then((encryptedBookmarks) => {
        // Decrypt bookmarks
        return this.utilitySvc.decryptData(encryptedBookmarks).then((decryptedBookmarks) => {
          const bookmarks = decryptedBookmarks ? JSON.parse(decryptedBookmarks) : [];

          // Update cache with retrieved bookmarks data
          return this.updateCachedBookmarks(bookmarks, encryptedBookmarks);
        });
      });
    });
  }

  getContainer(containerName, bookmarks, createIfNotPresent?) {
    let container = _.findWhere<any, any>(bookmarks, { title: containerName });

    // If container does not exist, create it if specified
    if (!container && createIfNotPresent) {
      container = this.xBookmark(containerName);
      container.id = this.getNewBookmarkId(bookmarks);
      bookmarks.push(container);
    }

    return container;
  }

  getContainerByBookmarkId(id, bookmarks) {
    // Check if the id corresponds to a container
    const bookmark = this.findBookmarkById(bookmarks, id);
    if (this.xBookmarkIsContainer(bookmark)) {
      return bookmark;
    }

    // Search through the child bookmarks of each container to find the bookmark
    let container;
    bookmarks.forEach((x) => {
      this.eachBookmark(
        x.children,
        (child) => {
          if (child.id === id) {
            container = x;
          }
        },
        container != null
      );
    });
    return container;
  }

  getCurrentSync() {
    // If nothing on the queue, get the current sync in progress if exists, otherwise get the last
    // sync in the queue
    return this.syncQueue.length === 0 ? this.currentSync : this.syncQueue[this.syncQueue.length - 1];
  }

  getIdsFromDescendants(bookmark) {
    const ids = [];
    if (!bookmark.children || bookmark.children.length === 0) {
      return ids;
    }

    this.eachBookmark(bookmark.children, (child) => {
      ids.push(child.id);
    });
    return ids;
  }

  getLookahead(word, bookmarksToSearch, tagsOnly?, exclusions?) {
    if (!word) {
      return this.$q.resolve();
    }

    let getBookmarks;
    if (bookmarksToSearch && bookmarksToSearch.length > 0) {
      // Use supplied bookmarks
      getBookmarks = this.$q.resolve(bookmarksToSearch);
    } else {
      // Get cached bookmarks
      getBookmarks = this.getCachedBookmarks();
    }

    // With bookmarks
    return getBookmarks
      .then((bookmarks) => {
        // Get lookaheads
        let lookaheads = this.searchBookmarksForLookaheads(bookmarks, word, tagsOnly);

        // Remove exclusions from lookaheads
        if (exclusions) {
          lookaheads = _.difference(lookaheads, exclusions);
        }

        if (lookaheads.length === 0) {
          return null;
        }

        // Count lookaheads and return most common
        // TODO: check this still works
        const lookahead = _.chain<any>(lookaheads)
          .sortBy((x) => {
            return x.length;
          })
          .countBy()
          .pairs()
          .max(_.last)
          .value();

        return [lookahead, word];
      })
      .catch((err) => {
        // Return if request was cancelled
        if (err && err.code && err.code === Globals.ErrorCodes.HttpRequestCancelled) {
          return;
        }

        return this.$q.reject(err);
      });
  }

  getNewBookmarkId(bookmarks, takenIds?) {
    let highestId = 0;
    takenIds = takenIds || [0];

    // Check existing bookmarks for highest id
    this.eachBookmark(bookmarks, (bookmark) => {
      if (!_.isUndefined(bookmark.id) && parseInt(bookmark.id, 10) > highestId) {
        highestId = parseInt(bookmark.id, 10);
      }
    });

    // Compare highest id with supplied taken ids
    highestId = _.max(takenIds) > highestId ? _.max(takenIds) : highestId;

    return highestId + 1;
  }

  getSyncBookmarksToolbar() {
    // Get setting from local storage
    return this.storeSvc.get(Globals.CacheKeys.SyncBookmarksToolbar).then((syncBookmarksToolbar) => {
      // Set default value to true
      if (syncBookmarksToolbar == null) {
        syncBookmarksToolbar = true;
      }

      return syncBookmarksToolbar;
    });
  }

  getSyncQueueLength() {
    return this.syncQueue.length;
  }

  getSyncSize() {
    return this.getCachedBookmarks()
      .then(() => {
        return this.storeSvc.get(Globals.CacheKeys.Bookmarks);
      })
      .then((cachedBookmarks) => {
        // Return size in bytes of cached encrypted bookmarks
        const sizeInBytes = new TextEncoder().encode(cachedBookmarks).byteLength;
        return sizeInBytes;
      });
  }

  handleFailedSync(failedSync, err) {
    // Update browser action icon
    this.platformSvc.interface_Refresh();

    // If offline and sync is a change, swallow error and place failed sync back on the queue
    if (err.code === Globals.ErrorCodes.NetworkOffline && failedSync.type !== Globals.SyncType.Pull) {
      failedSync.changeInfo = this.$q.resolve();
      this.syncQueue.unshift(failedSync);
      this.utilitySvc.logInfo(
        `Sync ${failedSync.uniqueId} not committed: network offline (${this.syncQueue.length} queued)`
      );
      return this.$q.reject({ code: Globals.ErrorCodes.SyncUncommitted });
    }

    // Otherwise handle failed sync
    this.utilitySvc.logInfo(`Sync ${failedSync.uniqueId} failed`);
    this.utilitySvc.logError(err, 'bookmarks.sync');
    if (failedSync.changeInfo && failedSync.changeInfo.type) {
      this.utilitySvc.logInfo(failedSync.changeInfo);
    }

    return this.storeSvc.get(Globals.CacheKeys.SyncEnabled).then((syncEnabled) => {
      return this.setIsSyncing()
        .then(() => {
          if (!syncEnabled) {
            return;
          }

          // If no data found, sync has been removed
          if (err.code === Globals.ErrorCodes.NoDataFound) {
            err.code = Globals.ErrorCodes.SyncRemoved;
          }

          // If local changes made, clear sync queue
          else if (failedSync.type !== Globals.SyncType.Pull) {
            this.syncQueue = [];
            const lastUpdated = new Date().toISOString();
            this.storeSvc.set(Globals.CacheKeys.LastUpdated, lastUpdated);
          }

          // Check if sync should be disabled
          return this.checkIfDisableSyncOnError(syncEnabled, err);
        })
        .finally(() => {
          // Return sync error back to process that queued the sync
          failedSync.deferred.reject(err);
        });
    });
  }

  isSeparator(bookmark) {
    if (!bookmark) {
      return false;
    }

    // Bookmark is separator if title is dashes or designated separator title, has no url and no children,
    // or type is separator (in FF)
    const separatorRegex = new RegExp('^[-─]{1,}$');
    return (
      bookmark.type === 'separator' ||
      (bookmark.title &&
        (separatorRegex.test(bookmark.title) ||
          bookmark.title.indexOf(Globals.Bookmarks.HorizontalSeparatorTitle) >= 0 ||
          bookmark.title === Globals.Bookmarks.VerticalSeparatorTitle) &&
        (!bookmark.url || bookmark.url === this.platformSvc.getNewTabUrl()) &&
        (!bookmark.children || bookmark.children.length === 0))
    );
  }

  processBookmarkChanges(bookmarks, changeInfo) {
    const returnInfo = {
      bookmark: undefined,
      bookmarks: undefined,
      container: undefined
    };

    // Update bookmarks before syncing
    switch (changeInfo.type) {
      // Create bookmark
      case Globals.UpdateType.Create:
        // Get or create other bookmarks container
        const otherContainer = this.getContainer(Globals.Bookmarks.OtherContainerName, bookmarks, true);

        // Give new bookmark an id and add to container
        const newBookmark = changeInfo.bookmark;
        newBookmark.id = this.getNewBookmarkId(bookmarks);
        otherContainer.children.push(newBookmark);
        returnInfo.bookmark = newBookmark;
        returnInfo.container = otherContainer.title;
        break;
      // Update bookmark
      case Globals.UpdateType.Update:
        returnInfo.container = this.getContainerByBookmarkId(changeInfo.bookmark.id, bookmarks).title;
        bookmarks = this.recursiveUpdate(bookmarks, changeInfo.bookmark);
        returnInfo.bookmark = changeInfo.bookmark;
        break;
      // Delete bookmark
      case Globals.UpdateType.Delete:
        returnInfo.container = this.getContainerByBookmarkId(changeInfo.id, bookmarks).title;
        this.recursiveDelete(bookmarks, changeInfo.id);
        returnInfo.bookmark = {
          id: changeInfo.id
        };
        break;
    }

    returnInfo.bookmarks = bookmarks;
    return returnInfo;
  }

  processSyncQueue(isBackgroundSync?) {
    let syncEnabled;
    let updateRemote = false;

    // If a sync is in progress, retry later
    if (this.currentSync || this.syncQueue.length === 0) {
      return this.$q.resolve(true);
    }

    const doActionUntil = () => {
      return this.$q.resolve(this.syncQueue.length === 0);
    };

    const action = () => {
      // Get first sync in the queue
      this.currentSync = this.syncQueue.shift();
      this.utilitySvc.logInfo(
        `Processing sync ${this.currentSync.uniqueId}${isBackgroundSync ? ' in background' : ''} (${
          this.syncQueue.length
        } in queue)`
      );

      // Enable syncing flag
      return this.setIsSyncing(this.currentSync.type)
        .then(() => {
          // Process sync
          switch (this.currentSync.type) {
            // Push bookmarks to xBrowserSync service
            case Globals.SyncType.Push:
              return this.sync_handlePush(this.currentSync);
            // Overwrite local bookmarks
            case Globals.SyncType.Pull:
              return this.sync_handlePull(this.currentSync);
            // Sync to service and overwrite local bookmarks
            case Globals.SyncType.Both:
              return this.sync_handleBoth(this.currentSync, isBackgroundSync);
            // Cancel current sync process
            case Globals.SyncType.Cancel:
              return this.sync_handleCancel(this.currentSync);
            // Upgrade sync to current version
            case Globals.SyncType.Upgrade:
              return this.sync_handleUpgrade(this.currentSync);
            // Ambiguous sync
            default:
              return this.$q.reject({ code: Globals.ErrorCodes.AmbiguousSyncRequest });
          }
        })
        .then((syncChange) => {
          syncChange = syncChange === undefined ? true : syncChange;
          return this.storeSvc
            .get(Globals.CacheKeys.SyncEnabled)
            .then((cachedSyncEnabled) => {
              syncEnabled = cachedSyncEnabled;

              // If syncing for the first time or re-syncing, set sync as enabled
              if (
                !syncEnabled &&
                this.currentSync.command !== Globals.Commands.RestoreBookmarks &&
                this.currentSync.type !== Globals.SyncType.Cancel
              ) {
                return this.enableSync().then(() => {
                  this.utilitySvc.logInfo('Sync enabled');
                });
              }
            })
            .then(() => {
              // Resolve the current sync's promise
              this.currentSync.deferred.resolve();

              // Set flag if remote bookmarks data should be updated
              if (!syncChange || this.currentSync.type === Globals.SyncType.Cancel) {
                updateRemote = false;
              } else if (this.currentSync.type !== Globals.SyncType.Pull) {
                updateRemote = true;
              }

              // Reset syncing flag
              return this.setIsSyncing();
            })
            .then(() => {
              // Return true to indicate sync succeeded
              return true;
            });
        })
        .catch((err) => {
          // Clear update flag if local data will be refreshed
          if (this.checkIfRefreshSyncedDataOnError(err)) {
            updateRemote = false;
          }
          return this.handleFailedSync(this.currentSync, err).then(() => {
            // Return false to indicate sync failed
            return false;
          });
        });
    };

    // Disable automatic updates whilst processing syncs
    return this.storeSvc
      .get(Globals.CacheKeys.SyncEnabled)
      .then((cachedSyncEnabled) => {
        if (cachedSyncEnabled) {
          return this.platformSvc.automaticUpdates_Stop();
        }
      })
      .then(() => {
        return this.utilitySvc.promiseWhile(this.syncQueue, doActionUntil, action);
      })
      .then((syncsProcessedSuccessfully) => {
        if (!syncsProcessedSuccessfully) {
          // Return false to indicate sync failed
          return false;
        }

        if (!updateRemote) {
          // Return false to indicate sync succeeded
          return true;
        }

        // Update remote bookmarks data
        return this.storeSvc
          .get(Globals.CacheKeys.Bookmarks)
          .then((encryptedBookmarks) => {
            // Decrypt cached bookmarks data
            return this.utilitySvc.decryptData(encryptedBookmarks).then((bookmarksJson) => {
              // Commit update to service
              return this.apiSvc
                .updateBookmarks(encryptedBookmarks)
                .then((response) => {
                  return this.storeSvc.set(Globals.CacheKeys.LastUpdated, response.lastUpdated).then(() => {
                    this.utilitySvc.logInfo(`Remote bookmarks data updated at ${response.lastUpdated}`);
                  });
                })
                .catch((err) => {
                  // If offline update cache and then throw error
                  if (err.code === Globals.ErrorCodes.NetworkOffline) {
                    this.utilitySvc.logInfo('Couldn’t update remote bookmarks data');
                    const bookmarks = JSON.parse(bookmarksJson);
                    return this.updateCachedBookmarks(bookmarks, encryptedBookmarks)
                      .then(() => {
                        this.currentSync.bookmarks = bookmarks;
                        return this.handleFailedSync(this.currentSync, err);
                      })
                      .then(() => {
                        // Return false to indicate sync failed
                        return false;
                      });
                  }

                  throw err;
                });
            });
          })
          .then(() => {
            // Return false to indicate sync succeeded
            return true;
          });
      })
      .finally(() => {
        // Clear current sync
        this.currentSync = null;

        // Start auto updates if sync enabled
        return this.storeSvc.get(Globals.CacheKeys.SyncEnabled).then((cachedSyncEnabled) => {
          if (cachedSyncEnabled) {
            return this.platformSvc.automaticUpdates_Start();
          }
        });
      });
  }

  queueSync(syncToQueue, runSync?) {
    runSync = runSync === undefined ? true : runSync;

    return this.$q((resolve, reject) => {
      this.storeSvc
        .get(Globals.CacheKeys.SyncEnabled)
        .then((syncEnabled) => {
          // If new sync ensure sync queue is clear
          if (!syncEnabled) {
            this.syncQueue = [];
          }

          let queuedSync;
          if (syncToQueue) {
            // If sync is type cancel, clear queue first
            if (syncToQueue.type === Globals.SyncType.Cancel) {
              this.syncQueue = [];
            }

            // Add sync to queue
            queuedSync = this.$q.defer();
            syncToQueue.deferred = queuedSync;
            syncToQueue.uniqueId = syncToQueue.uniqueId || this.utilitySvc.getUniqueishId();
            this.syncQueue.push(syncToQueue);

            const syncType = _.findKey(Globals.SyncType, (key) => {
              return key === syncToQueue.type;
            });
            this.utilitySvc.logInfo(`Sync ${syncToQueue.uniqueId} (${syncType.toLowerCase()}) queued`);
          }

          // Prepare sync promises to return and check if should also run sync
          const promises = [queuedSync.promise];
          if (runSync) {
            const syncedPromise = this.$q((syncedResolve, syncedReject) => {
              this.$timeout(() => {
                this.processSyncQueue().then(syncedResolve).catch(syncedReject);
              });
            });
            promises.push(syncedPromise);
          }

          return this.$q.all(promises).then(() => {
            resolve();
          });
        })
        .catch(reject);
    });
  }

  recursiveDelete(bookmarks, id) {
    return _.map(
      _.reject<any>(bookmarks, (bookmark) => {
        return bookmark.id === id;
      }),
      (bookmark) => {
        if (bookmark.children && bookmark.children.length > 0) {
          bookmark.children = this.recursiveDelete(bookmark.children, id);
        }

        return bookmark;
      }
    );
  }

  recursiveUpdate(bookmarks, updatedBookmark) {
    return _.map<any>(bookmarks, (bookmark) => {
      if (bookmark.id === updatedBookmark.id) {
        bookmark.title = updatedBookmark.title;
        bookmark.url = updatedBookmark.url;
        bookmark.description = updatedBookmark.description;
        bookmark.tags = updatedBookmark.tags;
      }

      if (bookmark.children && bookmark.children.length > 0) {
        bookmark.children = this.recursiveUpdate(bookmark.children, updatedBookmark);
      }

      return bookmark;
    });
  }

  refreshLocalBookmarks(bookmarks) {
    // Clear current bookmarks
    return this.platformSvc.bookmarks_Clear().then(() => {
      // Populate new bookmarks
      return this.platformSvc.bookmarks_Populate(bookmarks);
    });
  }

  removeBookmarkById(id, bookmarks) {
    return this.$q((resolve, reject) => {
      try {
        const updatedBookmarks = this.recursiveDelete(bookmarks, id);
        resolve(updatedBookmarks);
      } catch (err) {
        reject(err);
      }
    });
  }

  removeEmptyContainers(bookmarks) {
    const menuContainer = this.getContainer(Globals.Bookmarks.MenuContainerName, bookmarks);
    const mobileContainer = this.getContainer(Globals.Bookmarks.MobileContainerName, bookmarks);
    const otherContainer = this.getContainer(Globals.Bookmarks.OtherContainerName, bookmarks);
    const toolbarContainer = this.getContainer(Globals.Bookmarks.ToolbarContainerName, bookmarks);
    const removeArr = [];

    if (menuContainer && (!menuContainer.children || menuContainer.children.length === 0)) {
      removeArr.push(menuContainer);
    }

    if (mobileContainer && (!mobileContainer.children || mobileContainer.children.length === 0)) {
      removeArr.push(mobileContainer);
    }

    if (otherContainer && (!otherContainer.children || otherContainer.children.length === 0)) {
      removeArr.push(otherContainer);
    }

    if (toolbarContainer && (!toolbarContainer.children || toolbarContainer.children.length === 0)) {
      removeArr.push(toolbarContainer);
    }

    return _.difference(bookmarks, removeArr);
  }

  repairBookmarkIds(bookmarks) {
    let allBookmarks = [];
    let idCounter = 1;

    // Get all local bookmarks into flat array
    this.eachBookmark(bookmarks, (bookmark) => {
      allBookmarks.push(bookmark);
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
      idCounter++;
    });

    return bookmarks;
  }

  searchBookmarks(query) {
    if (!query) {
      query = { keywords: [] };
    }

    // Get cached bookmarks
    return this.getCachedBookmarks().then((bookmarks) => {
      let results;

      // If url supplied, first search by url
      if (query.url) {
        results = this.searchBookmarksByUrl(bookmarks, query.url) || [];
      }

      // Search by keywords and sort (score desc, id desc) using results from url search if relevant
      bookmarks = results || bookmarks;
      results = _.chain(this.searchBookmarksByKeywords(bookmarks, query.keywords))
        .sortBy('id')
        .sortBy('score')
        .reverse()
        .value();

      return results;
    });
  }

  searchBookmarksByKeywords(bookmarksToSearch, keywords, results?) {
    if (!results) {
      results = [];
    }

    _.each<any>(bookmarksToSearch, (bookmark) => {
      if (!bookmark.url) {
        // If this is a folder, search children
        if (bookmark.children && bookmark.children.length > 0) {
          this.searchBookmarksByKeywords(bookmark.children, keywords, results);
        }
      } else {
        let bookmarkWords = [];

        // Add all words in bookmark to array
        bookmarkWords = bookmarkWords.concat(this.cleanWords(bookmark.title));
        if (bookmark.description) {
          bookmarkWords = bookmarkWords.concat(this.cleanWords(bookmark.description));
        }
        if (bookmark.tags) {
          bookmarkWords = bookmarkWords.concat(this.cleanWords(bookmark.tags.join(' ')));
        }

        // Get match scores for each keyword against bookmark words
        const scores = _.map<any, number>(keywords, (keyword) => {
          let count = 0;

          // Match words that begin with keyword
          _.each(bookmarkWords, (bookmarkWord) => {
            if (bookmarkWord && bookmarkWord.toLowerCase().indexOf(keyword.toLowerCase()) === 0) {
              count++;
            }
          });

          return count;
        });

        // Check all keywords match
        if (
          _.isUndefined(
            _.find(scores, (score) => {
              return score === 0;
            })
          )
        ) {
          // Calculate score
          const score = _.reduce(
            scores,
            (memo, num) => {
              return memo + num;
            },
            0
          );

          // Add result
          const result = _.clone(bookmark);
          result.score = score;
          results.push(result);
        }
      }
    });

    return results;
  }

  searchBookmarksByUrl(bookmarksToSearch, url, results?) {
    if (!results) {
      results = [];
    }

    results = results.concat(
      _.filter<any>(bookmarksToSearch, (bookmark) => {
        if (!bookmark.url) {
          return false;
        }

        return bookmark.url.toLowerCase().indexOf(url.toLowerCase()) >= 0;
      })
    );

    for (let i = 0; i < bookmarksToSearch.length; i++) {
      if (bookmarksToSearch[i].children && bookmarksToSearch[i].children.length > 0) {
        results = this.searchBookmarksByUrl(bookmarksToSearch[i].children, url, results);
      }
    }

    return results;
  }

  searchBookmarksForLookaheads(bookmarksToSearch, word, tagsOnly, results?) {
    if (!results) {
      results = [];
    }

    _.each<any>(bookmarksToSearch, (bookmark) => {
      if (!bookmark.url) {
        results = this.searchBookmarksForLookaheads(bookmark.children, word, tagsOnly, results);
      } else {
        let bookmarkWords = [];

        if (!tagsOnly) {
          if (bookmark.title) {
            // Add all words from title
            bookmarkWords = bookmarkWords.concat(
              _.compact(bookmark.title.replace("'", '').toLowerCase().split(/[\W_]/))
            );
          }

          // Split tags into individual words
          if (bookmark.tags) {
            const tags = _.chain<any, any>(bookmark.tags)
              .map((tag) => {
                return tag.toLowerCase().split(/\s/);
              })
              .flatten()
              .compact()
              .value();

            bookmarkWords = bookmarkWords.concat(tags);
          }

          // Add url host
          const hostMatch = bookmark.url.toLowerCase().match(/^(https?:\/\/)?(www\.)?([^/]+)/);
          if (hostMatch) {
            bookmarkWords.push(hostMatch[0]);
            bookmarkWords.push(hostMatch[2] ? hostMatch[2] + hostMatch[3] : hostMatch[3]);
            if (hostMatch[2]) {
              bookmarkWords.push(hostMatch[3]);
            }
          }
        } else if (bookmark.tags) {
          bookmarkWords = bookmarkWords.concat(_.compact(bookmark.tags));
        }

        // Remove words of two chars or less
        bookmarkWords = _.filter(bookmarkWords, (item) => {
          return item.length > 2;
        });

        // Find all words that begin with lookahead word
        results = results.concat(
          _.filter(bookmarkWords, (innerbookmark) => {
            return innerbookmark.indexOf(word) === 0;
          })
        );
      }
    });

    return results;
  }

  setIsSyncing(syncType?) {
    // Update browser action icon with current sync type
    if (syncType != null) {
      return this.platformSvc.interface_Refresh(null, syncType);
    }

    // Get cached sync enabled value and update browser action icon
    return this.storeSvc.get(Globals.CacheKeys.SyncEnabled).then(this.platformSvc.interface_Refresh);
  }

  sync_handleBoth(syncData, backgroundUpdate) {
    let getBookmarksToSync;
    let updateLocalBookmarksInfo;

    // changeInfo can be an object or a promise
    return this.$q.resolve(syncData.changeInfo).then((changeInfo) => {
      if (syncData.bookmarks) {
        // Sync with provided bookmarks, validate bookmark ids
        getBookmarksToSync = this.$q((resolve) => {
          if (this.validateBookmarkIds(syncData.bookmarks)) {
            resolve(syncData.bookmarks);
          } else {
            const repairedBookmarks = this.repairBookmarkIds(syncData.bookmarks);
            resolve(repairedBookmarks);
          }
        });
      } else {
        updateLocalBookmarksInfo = {
          type: changeInfo.type
        };

        // Process bookmark changes
        if (!changeInfo) {
          getBookmarksToSync = this.$q.reject({ code: Globals.ErrorCodes.AmbiguousSyncRequest });
        } else {
          getBookmarksToSync = this.getCachedBookmarks()
            .then((bookmarks) => {
              return this.processBookmarkChanges(bookmarks, changeInfo);
            })
            .then((results) => {
              updateLocalBookmarksInfo.bookmark = results.bookmark;
              updateLocalBookmarksInfo.bookmarks = results.bookmarks;
              updateLocalBookmarksInfo.container = results.container;
              return results.bookmarks;
            });
        }
      }

      // Sync bookmarks
      return getBookmarksToSync.then((bookmarks) => {
        // Encrypt bookmarks
        bookmarks = bookmarks || [];
        return this.utilitySvc.encryptData(JSON.stringify(bookmarks)).then((encryptedBookmarks) => {
          // Update local bookmarks
          return this.$q((resolve, reject) => {
            this.platformSvc
              .eventListeners_Disable()
              .then(() => {
                return syncData.command === Globals.Commands.RestoreBookmarks
                  ? this.refreshLocalBookmarks(bookmarks)
                  : this.updateLocalBookmarks(updateLocalBookmarksInfo);
              })
              .then(resolve)
              .catch(reject)
              .finally(this.platformSvc.eventListeners_Enable);
          }).then(() => {
            // Update bookmarks cache
            return this.updateCachedBookmarks(bookmarks, encryptedBookmarks).then((cachedBookmarks) => {
              // Build id mappings if this was a restore
              if (syncData.command !== Globals.Commands.RestoreBookmarks) {
                return;
              }
              return this.platformSvc.bookmarks_BuildIdMappings(cachedBookmarks);
            });
          });
        });
      });
    });
  }

  sync_handleCancel(syncData) {
    return this.disableSync();
  }

  sync_handlePull(syncData) {
    let bookmarks;
    let encryptedBookmarks;
    let lastUpdated;

    if (syncData.bookmarks) {
      // Local import, update browser bookmarks
      return this.refreshLocalBookmarks(syncData.bookmarks);
    }

    return this.storeSvc
      .get([Globals.CacheKeys.Password, Globals.CacheKeys.SyncId])
      .then((cachedData) => {
        const password = cachedData[Globals.CacheKeys.Password];
        const syncId = cachedData[Globals.CacheKeys.SyncId];

        // Check secret and bookmarks ID are present
        if (!password || !syncId) {
          return this.disableSync().then(() => {
            return this.$q.reject({ code: Globals.ErrorCodes.MissingClientData });
          });
        }

        // Get synced bookmarks
        return this.apiSvc.getBookmarks();
      })
      .then((data) => {
        encryptedBookmarks = data.bookmarks;
        lastUpdated = data.lastUpdated;

        // Decrypt bookmarks
        return this.utilitySvc.decryptData(data.bookmarks);
      })
      .then((decryptedData) => {
        // Update cached bookmarks
        bookmarks = JSON.parse(decryptedData);

        // Check bookmark ids are all valid
        if (!this.validateBookmarkIds(bookmarks)) {
          bookmarks = this.repairBookmarkIds(bookmarks);

          // Encrypt bookmarks with new ids
          return this.utilitySvc.encryptData(JSON.stringify(bookmarks)).then((encryptedBookmarksWithNewIds) => {
            encryptedBookmarks = encryptedBookmarksWithNewIds;
          });
        }
      })
      .then(() => {
        return this.updateCachedBookmarks(bookmarks, encryptedBookmarks);
      })
      .then((cachedBookmarks) => {
        // Update browser bookmarks
        return this.platformSvc
          .eventListeners_Disable()
          .then(() => {
            return this.refreshLocalBookmarks(cachedBookmarks);
          })
          .then(() => {
            return this.platformSvc.bookmarks_BuildIdMappings(cachedBookmarks);
          })
          .finally(this.platformSvc.eventListeners_Enable);
      })
      .then(() => {
        // Update cached last updated date
        return this.storeSvc.set(Globals.CacheKeys.LastUpdated, lastUpdated);
      });
  }

  sync_handlePush(syncData) {
    return this.storeSvc
      .get([
        Globals.CacheKeys.LastUpdated,
        Globals.CacheKeys.Password,
        Globals.CacheKeys.SyncEnabled,
        Globals.CacheKeys.SyncId
      ])
      .then((cachedData) => {
        const password = cachedData[Globals.CacheKeys.Password];
        const syncEnabled = cachedData[Globals.CacheKeys.SyncEnabled];
        const syncId = cachedData[Globals.CacheKeys.SyncId];

        // Check for cached sync ID and password
        if (!password || !syncId) {
          return this.disableSync().then(() => {
            return this.$q.reject({ code: Globals.ErrorCodes.MissingClientData });
          });
        }

        // If this is a new sync, get local bookmarks and continue
        if (!syncEnabled || !syncData.changeInfo) {
          return this.platformSvc.bookmarks_Get();
        }

        // Otherwose get cached bookmarks and process changes
        return this.getCachedBookmarks().then((bookmarks) => {
          if (!syncData.changeInfo) {
            // Nothing to process
            this.utilitySvc.logInfo('No change to process');
            return;
          }

          // Update bookmarks data with local changes
          switch (syncData.changeInfo.type) {
            // Create bookmark
            case Globals.UpdateType.Create:
              return this.platformSvc.bookmarks_Created(bookmarks, syncData.changeInfo.bookmark);
            // Delete bookmark
            case Globals.UpdateType.Delete:
              return this.platformSvc.bookmarks_Deleted(bookmarks, syncData.changeInfo.bookmark);
            // Update bookmark
            case Globals.UpdateType.Update:
              return this.platformSvc.bookmarks_Updated(bookmarks, syncData.changeInfo.bookmark);
            // Move bookmark
            case Globals.UpdateType.Move:
              return this.platformSvc.bookmarks_Moved(bookmarks, syncData.changeInfo.bookmark);
            // Ambiguous sync
            default:
              return this.$q.reject({ code: Globals.ErrorCodes.AmbiguousSyncRequest });
          }
        });
      })
      .then((bookmarks) => {
        if (!bookmarks) {
          // Don't sync
          return false;
        }

        // Update local cached bookmarks
        return this.utilitySvc
          .encryptData(JSON.stringify(bookmarks))
          .then((encryptedBookmarks) => {
            return this.updateCachedBookmarks(bookmarks, encryptedBookmarks);
          })
          .then(() => {
            // Continue with sync
            return true;
          });
      });
  }

  sync_handleUpgrade(syncData) {
    let password;
    let syncId;

    return this.storeSvc
      .get([Globals.CacheKeys.Password, Globals.CacheKeys.SyncId])
      .then((cachedData) => {
        password = cachedData[Globals.CacheKeys.Password];
        syncId = cachedData[Globals.CacheKeys.SyncId];

        // Check secret and sync ID are present
        if (!password || !syncId) {
          return this.disableSync().then(() => {
            return this.$q.reject({ code: Globals.ErrorCodes.MissingClientData });
          });
        }

        // Get synced bookmarks and decrypt
        return this.apiSvc.getBookmarks();
      })
      .then((data) => {
        // Decrypt bookmarks
        return this.utilitySvc.decryptData(data.bookmarks);
      })
      .then((decryptedData) => {
        let bookmarks = decryptedData ? JSON.parse(decryptedData) : null;

        // Upgrade containers to use current container names
        bookmarks = this.upgradeContainers(bookmarks || []);

        // Set the sync version to the current app version
        return this.storeSvc
          .set(Globals.CacheKeys.SyncVersion, Globals.AppVersion)
          .then(() => {
            // Generate a new password hash from the old clear text password and sync ID
            return this.utilitySvc.getPasswordHash(password, syncId);
          })
          .then((passwordHash) => {
            // Cache the new password hash and encrypt the data
            return this.storeSvc.set(Globals.CacheKeys.Password, passwordHash);
          })
          .then(() => {
            return this.utilitySvc.encryptData(JSON.stringify(bookmarks));
          })
          .then((encryptedBookmarks) => {
            // Sync provided bookmarks and set local bookmarks
            return this.$q
              .all([
                this.apiSvc.updateBookmarks(encryptedBookmarks, true),
                this.platformSvc
                  .eventListeners_Disable()
                  .then(() => {
                    return this.refreshLocalBookmarks(bookmarks);
                  })
                  .then(() => {
                    return this.platformSvc.bookmarks_BuildIdMappings(bookmarks);
                  })
                  .finally(this.platformSvc.eventListeners_Enable)
              ])
              .then((data) => {
                // Update cached last updated date and return decrypted bookmarks
                return this.$q.all([
                  this.updateCachedBookmarks(bookmarks, encryptedBookmarks),
                  this.storeSvc.set(Globals.CacheKeys.LastUpdated, data[0].lastUpdated)
                ]);
              });
          });
      });
  }

  updateBookmarkById(id, updateInfo, bookmarks) {
    const updatedBookmarks = angular.copy(bookmarks);
    const bookmarkToUpdate = this.findBookmarkById(updatedBookmarks, id);
    if (!bookmarkToUpdate) {
      return this.$q.reject({ code: Globals.ErrorCodes.XBookmarkNotFound });
    }

    bookmarkToUpdate.title = updateInfo.title !== undefined ? updateInfo.title : bookmarkToUpdate.title;

    // Update url accounting for unsupported urls
    if (
      updateInfo.url !== undefined &&
      updateInfo.url !== bookmarkToUpdate.url &&
      (updateInfo.url !== this.platformSvc.getNewTabUrl() ||
        (updateInfo.url === this.platformSvc.getNewTabUrl() &&
          bookmarkToUpdate.url === this.platformSvc.getSupportedUrl(bookmarkToUpdate.url)))
    ) {
      bookmarkToUpdate.url = updateInfo.url;
    }

    // If updated bookmark is a separator, convert xbookmark to separator
    if (this.isSeparator(bookmarkToUpdate)) {
      // Create a new separator with same id
      const separator = this.xSeparator();
      (separator as any).id = bookmarkToUpdate.id;

      // Clear existing properties
      for (const prop in bookmarkToUpdate) {
        if (bookmarkToUpdate.hasOwnProperty(prop)) {
          delete bookmarkToUpdate[prop];
        }
      }

      // Copy separator properties
      bookmarkToUpdate.id = (separator as any).id;
      bookmarkToUpdate.title = separator.title;
    }

    // Clean bookmark and return updated bookmarks
    const cleanedBookmark = this.cleanBookmark(bookmarkToUpdate);
    angular.copy(cleanedBookmark, bookmarkToUpdate);
    return this.$q.resolve(updatedBookmarks);
  }

  updateCachedBookmarks(unencryptedBookmarks, encryptedBookmarks) {
    if (encryptedBookmarks !== undefined) {
      // Update storage cache with new encrypted bookmarks
      return this.storeSvc.set(Globals.CacheKeys.Bookmarks, encryptedBookmarks).then(() => {
        // Update memory cached bookmarks
        this.cachedBookmarks_encrypted = encryptedBookmarks;
        if (unencryptedBookmarks !== undefined) {
          this.cachedBookmarks_plain = unencryptedBookmarks;
        }

        return unencryptedBookmarks;
      });
    }

    return this.$q.resolve(unencryptedBookmarks);
  }

  updateLocalBookmarks(updateInfo) {
    if (!updateInfo || !updateInfo.bookmark || !updateInfo.bookmarks || !updateInfo.container) {
      return this.$q.resolve(false);
    }

    // Check if change is in toolbar and is syncing toolbar
    return (updateInfo.container === Globals.Bookmarks.ToolbarContainerName
      ? this.getSyncBookmarksToolbar()
      : this.$q.resolve(true)
    ).then((doLocalUpdate) => {
      if (!doLocalUpdate) {
        return;
      }

      switch (updateInfo.type) {
        // Create new local bookmark
        case Globals.UpdateType.Create:
          return this.platformSvc.bookmarks_CreateSingle(updateInfo);
        // Update existing local bookmark
        case Globals.UpdateType.Update:
          return this.platformSvc.bookmarks_UpdateSingle(updateInfo);
        // Delete existing local bookmark
        case Globals.UpdateType.Delete:
          return this.platformSvc.bookmarks_DeleteSingle(updateInfo);
        // Ambiguous sync
        case !updateInfo:
        default:
          return this.$q.reject({ code: Globals.ErrorCodes.AmbiguousSyncRequest });
      }
    });
  }

  upgradeContainers(bookmarks) {
    // Upgrade containers to use current container names
    const otherContainer = this.getContainer(Globals.Bookmarks.OtherContainerNameOld, bookmarks);
    if (otherContainer) {
      otherContainer.title = Globals.Bookmarks.OtherContainerName;
    }

    const toolbarContainer = this.getContainer(Globals.Bookmarks.ToolbarContainerNameOld, bookmarks);
    if (toolbarContainer) {
      toolbarContainer.title = Globals.Bookmarks.ToolbarContainerName;
    }

    const xbsContainerIndex = _.findIndex<any>(bookmarks, (x) => {
      return x.title === Globals.Bookmarks.UnfiledContainerNameOld;
    });
    if (xbsContainerIndex >= 0) {
      const xbsContainer = bookmarks.splice(xbsContainerIndex, 1)[0];
      xbsContainer.title = 'Legacy xBrowserSync bookmarks';
      otherContainer.children = otherContainer.children || [];
      otherContainer.children.splice(0, 0, xbsContainer);
    }

    return bookmarks;
  }

  validateBookmarkIds(bookmarks) {
    if (!bookmarks || bookmarks.length === 0) {
      return true;
    }

    // Find any bookmark without an id
    let bookmarksHaveIds = true;
    this.eachBookmark(bookmarks, (bookmark) => {
      if (_.isUndefined(bookmark.id)) {
        bookmarksHaveIds = false;
      }
    });

    if (!bookmarksHaveIds) {
      this.utilitySvc.logWarning('Bookmarks missing ids');
      return false;
    }

    // Get all local bookmarks into flat array
    const allBookmarks = [];
    this.eachBookmark(bookmarks, (bookmark) => {
      allBookmarks.push(bookmark);
    });

    // Find a bookmark with a non-numeric id
    const invalidId = allBookmarks.find((bookmark) => {
      return typeof bookmark.id !== 'number';
    });

    if (!_.isUndefined(invalidId)) {
      this.utilitySvc.logWarning(`Invalid bookmark id detected: ${invalidId.id} (${invalidId.url})`);
      return false;
    }

    // Find a bookmark with a duplicate id
    const duplicateId = _.chain(allBookmarks)
      .countBy('id')
      .findKey((count) => {
        return count > 1;
      })
      .value();

    if (!_.isUndefined(duplicateId)) {
      this.utilitySvc.logWarning(`Duplicate bookmark id detected: ${duplicateId}`);
      return false;
    }

    return true;
  }

  xBookmark(title, url?, description?, tags?, children?) {
    const xBookmark = {};

    if (title) {
      (xBookmark as any).title = title.trim();
    }

    if (url) {
      (xBookmark as any).url = url.trim();
    } else {
      (xBookmark as any).children = children || [];
    }

    if (description) {
      (xBookmark as any).description = this.utilitySvc.trimToNearestWord(
        description,
        Globals.Bookmarks.DescriptionMaxLength
      );
    }

    if (tags && tags.length > 0) {
      (xBookmark as any).tags = tags;
    }

    return xBookmark;
  }

  xBookmarkIsContainer(bookmark) {
    return (
      bookmark.title === Globals.Bookmarks.MenuContainerName ||
      bookmark.title === Globals.Bookmarks.MobileContainerName ||
      bookmark.title === Globals.Bookmarks.OtherContainerName ||
      bookmark.title === Globals.Bookmarks.ToolbarContainerName
    );
  }

  xSeparator() {
    return {
      title: '-'
    };
  }
}
