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

import angular from 'angular';
import { Injectable } from 'angular-ts-decorators';
import { autobind } from 'core-decorators';
import _ from 'underscore';
import ApiService from '../api/api-service.interface';
import BookmarkChangeType from './bookmark-change-type.enum';
import CryptoService from '../crypto/crypto.service';
import ExceptionHandler from '../exceptions/exception-handler.interface';
import * as Exceptions from '../exceptions/exception';
import Globals from '../globals';
import PlatformService from '../../../interfaces/platform-service.interface';
import LogService from '../log/log.service';
import MessageCommand from '../message-command.enum';
import Strings from '../../../../res/strings/en.json';
import StoreService from '../store/store.service';
import StoreKey from '../store/store-key.enum';
import SyncType from '../sync-type.enum';
import UtilityService from '../utility/utility.service';

@autobind
@Injectable('BookmarkService')
export default class BookmarkService {
  $exceptionHandler: ExceptionHandler;
  $injector: ng.auto.IInjectorService;
  $q: ng.IQService;
  $timeout: ng.ITimeoutService;
  apiSvc: ApiService;
  cryptoSvc: CryptoService;
  logSvc: LogService;
  _platformSvc: PlatformService;
  storeSvc: StoreService;
  utilitySvc: UtilityService;

  cachedBookmarks_encrypted: any;
  cachedBookmarks_plain: any;
  currentSync: any;
  syncQueue = [];

  static $inject = [
    '$exceptionHandler',
    '$injector',
    '$q',
    '$timeout',
    'ApiService',
    'CryptoService',
    'LogService',
    'StoreService',
    'UtilityService'
  ];
  constructor(
    $exceptionHandler: ng.IExceptionHandlerService,
    $injector: ng.auto.IInjectorService,
    $q: ng.IQService,
    $timeout: ng.ITimeoutService,
    ApiSvc: ApiService,
    CryptoSvc: CryptoService,
    LogSvc: LogService,
    StoreSvc: StoreService,
    UtilitySvc: UtilityService
  ) {
    this.$exceptionHandler = $exceptionHandler;
    this.$injector = $injector;
    this.$q = $q;
    this.$timeout = $timeout;
    this.apiSvc = ApiSvc;
    this.cryptoSvc = CryptoSvc;
    this.logSvc = LogSvc;
    this.storeSvc = StoreSvc;
    this.utilitySvc = UtilitySvc;
  }

  get platformSvc(): PlatformService {
    if (angular.isUndefined(this._platformSvc)) {
      this._platformSvc = this.$injector.get('PlatformService');
    }
    return this._platformSvc;
  }

  addBookmark(newBookmarkInfo, bookmarks) {
    const updatedBookmarks = angular.copy(bookmarks);
    const parent = this.findBookmarkById(updatedBookmarks, newBookmarkInfo.parentId);
    if (!parent) {
      throw new Exceptions.SyncedBookmarkNotFoundException();
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
    return this.storeSvc.get<string>(StoreKey.LastUpdated).then((storedLastUpdated) => {
      // Get last updated date from local cache
      const storedLastUpdatedDate = new Date(storedLastUpdated);

      // Check if bookmarks have been updated
      return this.apiSvc.getBookmarksLastUpdated().then((data) => {
        // If last updated is different to the date in local storage, refresh bookmarks
        const remoteLastUpdated = new Date(data.lastUpdated);
        const updatesAvailable =
          !storedLastUpdatedDate || storedLastUpdatedDate.getTime() !== remoteLastUpdated.getTime();

        if (updatesAvailable) {
          this.logSvc.logInfo(
            `Updates available, local:${
              storedLastUpdatedDate ? storedLastUpdatedDate.toISOString() : 'none'
            } remote:${remoteLastUpdated.toISOString()}`
          );
        }

        return updatesAvailable;
      });
    });
  }

  checkIfDisableSyncOnError(err) {
    return (
      err &&
      (err instanceof Exceptions.SyncRemovedException ||
        err instanceof Exceptions.MissingClientDataException ||
        err instanceof Exceptions.NoDataFoundException ||
        err instanceof Exceptions.TooManyRequestsException)
    );
  }

  checkIfRefreshSyncedDataOnError(err) {
    return (
      err &&
      (err instanceof Exceptions.BookmarkMappingNotFoundException ||
        err instanceof Exceptions.ContainerChangedException ||
        err instanceof Exceptions.DataOutOfSyncException ||
        err instanceof Exceptions.FailedCreateLocalBookmarksException ||
        err instanceof Exceptions.FailedGetLocalBookmarksException ||
        err instanceof Exceptions.FailedRemoveLocalBookmarksException ||
        err instanceof Exceptions.LocalBookmarkNotFoundException ||
        err instanceof Exceptions.SyncedBookmarkNotFoundException)
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
    return this.storeSvc.get<boolean>(StoreKey.SyncEnabled).then((syncEnabled) => {
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
          this.storeSvc.remove(StoreKey.BookmarkIdMappings),
          this.storeSvc.remove(StoreKey.Bookmarks),
          this.storeSvc.remove(StoreKey.Password),
          this.storeSvc.remove(StoreKey.SyncVersion),
          this.storeSvc.set(StoreKey.SyncEnabled, false),
          this.updateCachedBookmarks(null, null)
        ])
        .then(() => {
          // Update browser action icon
          this.platformSvc.interface_Refresh();
          this.logSvc.logInfo('Sync disabled');
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
      this.storeSvc.set(StoreKey.SyncEnabled, true),
      this.platformSvc.eventListeners_Enable(),
      this.platformSvc.automaticUpdates_Start()
    ]);
  }

  executeSync(isBackgroundSync?) {
    // Check if sync enabled before running sync
    return this.storeSvc.get<boolean>(StoreKey.SyncEnabled).then((syncEnabled) => {
      if (!syncEnabled) {
        throw new Exceptions.SyncDisabledException();
      }

      // Get available updates if there are no queued syncs, finally process the queue
      return (this.syncQueue.length === 0 ? this.checkForUpdates() : this.$q.resolve(false))
        .then((updatesAvailable) => {
          if (updatesAvailable) {
            return this.queueSync({
              type: SyncType.Pull
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

    return this.storeSvc.get<boolean>(StoreKey.SyncEnabled).then((syncEnabled) => {
      // If sync is not enabled, export local browser data
      if (!syncEnabled) {
        return this.platformSvc.bookmarks_Get(false);
      }

      // Otherwise, export synced data
      return this.apiSvc
        .getBookmarks()
        .then((data) => {
          // Decrypt bookmarks
          return this.cryptoSvc.decryptData(data.bookmarks);
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
    return this.storeSvc.get<string>(StoreKey.Bookmarks).then((encryptedBookmarksFromStore) => {
      // Return unencrypted cached bookmarks from memory if encrypted bookmarks
      // in storage match cached encrypted bookmarks in memory
      if (
        encryptedBookmarksFromStore &&
        this.cachedBookmarks_encrypted &&
        encryptedBookmarksFromStore === this.cachedBookmarks_encrypted
      ) {
        return angular.copy(this.cachedBookmarks_plain);
      }

      // If encrypted bookmarks not cached in storage, get synced bookmarks
      return (encryptedBookmarksFromStore
        ? this.$q.resolve(encryptedBookmarksFromStore)
        : this.apiSvc.getBookmarks().then((response) => {
            return response.bookmarks;
          })
      ).then((encryptedBookmarks) => {
        // Decrypt bookmarks
        return this.cryptoSvc.decryptData(encryptedBookmarks).then((decryptedBookmarks) => {
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
        const lookahead = _.first(
          _.chain<any>(lookaheads)
            .sortBy((x) => {
              return x.length;
            })
            .countBy()
            .pairs()
            .max(_.last)
            .value()
        );

        return [lookahead, word];
      })
      .catch((err) => {
        // Swallow error if request was cancelled
        if (err instanceof Exceptions.HttpRequestCancelledException) {
          return;
        }

        throw err;
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
    return this.storeSvc.get<boolean>(StoreKey.SyncBookmarksToolbar).then((syncBookmarksToolbar) => {
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
        return this.storeSvc.get<string>(StoreKey.Bookmarks);
      })
      .then((encryptedBookmarks) => {
        // Return size in bytes of cached encrypted bookmarks
        const sizeInBytes = new TextEncoder().encode(encryptedBookmarks).byteLength;
        return sizeInBytes;
      });
  }

  handleFailedSync(failedSync, err) {
    return this.$q((resolve, reject) => {
      // Update browser action icon
      this.platformSvc.interface_Refresh();

      // If offline and sync is a change, swallow error and place failed sync back on the queue
      if (err instanceof Exceptions.NetworkOfflineException && failedSync.type !== SyncType.Pull) {
        err = new Exceptions.SyncUncommittedException();
        return resolve(err);
      }

      // Set default exception if none set
      if (!(err instanceof Exceptions.Exception)) {
        err = new Exceptions.SyncFailedException(err.message);
      }

      // Handle failed sync
      this.logSvc.logWarning(`Sync ${failedSync.uniqueId} failed`);
      this.$exceptionHandler(err, null, false);
      if (failedSync.changeInfo && failedSync.changeInfo.type) {
        this.logSvc.logInfo(failedSync.changeInfo);
      }
      return this.storeSvc
        .get<boolean>(StoreKey.SyncEnabled)
        .then((syncEnabled) => {
          return this.setIsSyncing()
            .then(() => {
              if (!syncEnabled) {
                return;
              }

              // If no data found, sync has been removed
              if (err instanceof Exceptions.NoDataFoundException) {
                err = new Exceptions.SyncRemovedException(null, err);
              }

              // If local changes made, clear sync queue and refresh sync data if necessary
              else if (failedSync.type !== SyncType.Pull) {
                this.syncQueue = [];
                this.storeSvc.set(StoreKey.LastUpdated, new Date().toISOString());
                if (this.checkIfRefreshSyncedDataOnError(err)) {
                  this.currentSync = null;
                  return this.platformSvc.refreshLocalSyncData().catch((refreshErr) => {
                    err = refreshErr;
                  });
                }
              }
            })
            .then(() => {
              // Check if sync should be disabled
              if (!this.checkIfDisableSyncOnError(err)) {
                return;
              }
              return this.disableSync();
            });
        })
        .then(() => {
          resolve(err);
        })
        .catch(reject);
    }).finally(() => {
      // Return sync error back to process that queued the sync
      failedSync.deferred.reject(err);
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

  populateLocalBookmarks(bookmarks) {
    // Clear local bookmarks and then populate with provided bookmarks
    return this.platformSvc.bookmarks_Clear().then(() => {
      return this.platformSvc.bookmarks_Populate(bookmarks);
    });
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
      case BookmarkChangeType.Create:
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
      case BookmarkChangeType.Update:
        returnInfo.container = this.getContainerByBookmarkId(changeInfo.bookmark.id, bookmarks).title;
        bookmarks = this.recursiveUpdate(bookmarks, changeInfo.bookmark);
        returnInfo.bookmark = changeInfo.bookmark;
        break;
      // Delete bookmark
      case BookmarkChangeType.Delete:
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
      return this.$q.resolve();
    }

    const doActionUntil = () => {
      return this.$q.resolve(this.syncQueue.length === 0);
    };

    const action = () => {
      // Get first sync in the queue
      this.currentSync = this.syncQueue.shift();
      this.logSvc.logInfo(
        `Processing sync ${this.currentSync.uniqueId}${isBackgroundSync ? ' in background' : ''} (${
          this.syncQueue.length
        } waiting in queue)`
      );

      // Enable syncing flag
      return this.setIsSyncing(this.currentSync.type)
        .then(() => {
          // Process sync
          switch (this.currentSync.type) {
            // Push bookmarks to xBrowserSync service
            case SyncType.Push:
              return this.sync_handlePush(this.currentSync);
            // Overwrite local bookmarks
            case SyncType.Pull:
              return this.sync_handlePull(this.currentSync);
            // Sync to service and overwrite local bookmarks
            case SyncType.Both:
              return this.sync_handleBoth(this.currentSync, isBackgroundSync);
            // Cancel current sync process
            case SyncType.Cancel:
              return this.sync_handleCancel(this.currentSync);
            // Upgrade sync to current version
            case SyncType.Upgrade:
              return this.sync_handleUpgrade(this.currentSync);
            // Ambiguous sync
            default:
              throw new Exceptions.AmbiguousSyncRequestException();
          }
        })
        .then((syncChange = true) => {
          return this.storeSvc
            .get<boolean>(StoreKey.SyncEnabled)
            .then((cachedSyncEnabled) => {
              syncEnabled = cachedSyncEnabled;

              // If syncing for the first time or re-syncing, set sync as enabled
              if (
                !syncEnabled &&
                this.currentSync.command !== MessageCommand.RestoreBookmarks &&
                this.currentSync.type !== SyncType.Cancel
              ) {
                return this.enableSync().then(() => {
                  this.logSvc.logInfo('Sync enabled');
                });
              }
            })
            .then(() => {
              // Resolve the current sync's promise
              this.currentSync.deferred.resolve();

              // Set flag if remote bookmarks data should be updated
              if (!syncChange || this.currentSync.type === SyncType.Cancel) {
                updateRemote = false;
              } else if (this.currentSync.type !== SyncType.Pull) {
                updateRemote = true;
              }

              // Reset syncing flag
              return this.setIsSyncing();
            });
        });
    };

    // Disable automatic updates whilst processing syncs
    return this.storeSvc
      .get<boolean>(StoreKey.SyncEnabled)
      .then((cachedSyncEnabled) => {
        if (cachedSyncEnabled) {
          return this.platformSvc.automaticUpdates_Stop();
        }
      })
      .then(() => {
        return this.utilitySvc.promiseWhile(this.syncQueue, doActionUntil, action);
      })
      .then(() => {
        if (!updateRemote) {
          // Don't update synced bookmarks
          return;
        }

        // Update remote bookmarks data
        return this.storeSvc.get<string>(StoreKey.Bookmarks).then((encryptedBookmarks) => {
          // Decrypt cached bookmarks data
          return this.cryptoSvc.decryptData(encryptedBookmarks).then((bookmarksJson) => {
            // Commit update to service
            return this.apiSvc
              .updateBookmarks(encryptedBookmarks)
              .then((response) => {
                return this.storeSvc.set(StoreKey.LastUpdated, response.lastUpdated).then(() => {
                  this.logSvc.logInfo(`Remote bookmarks data updated at ${response.lastUpdated}`);
                });
              })
              .catch((err) => {
                // If offline update cache and then throw errors
                return (err instanceof Exceptions.NetworkOfflineException
                  ? (() => {
                      const bookmarks = JSON.parse(bookmarksJson);
                      return this.updateCachedBookmarks(bookmarks, encryptedBookmarks).then(() => {
                        this.currentSync.bookmarks = bookmarks;
                      });
                    })()
                  : this.$q.resolve()
                ).then(() => {
                  throw err;
                });
              });
          });
        });
      })
      .catch((err) => {
        return this.handleFailedSync(this.currentSync, err).then((innerErr) => {
          throw innerErr;
        });
      })
      .finally(() => {
        // Clear current sync
        this.currentSync = null;

        // Start auto updates if sync enabled
        return this.storeSvc.get<boolean>(StoreKey.SyncEnabled).then((cachedSyncEnabled) => {
          if (cachedSyncEnabled) {
            return this.platformSvc.automaticUpdates_Start();
          }
        });
      });
  }

  queueSync(syncToQueue, runSync = true) {
    return this.$q<any>((resolve, reject) => {
      this.storeSvc
        .get(StoreKey.SyncEnabled)
        .then((syncEnabled) => {
          // If new sync ensure sync queue is clear
          if (!syncEnabled) {
            this.syncQueue = [];
          }

          let queuedSync;
          if (syncToQueue) {
            // If sync is type cancel, clear queue first
            if (syncToQueue.type === SyncType.Cancel) {
              this.syncQueue = [];
            }

            // Add sync to queue
            queuedSync = this.$q.defer();
            syncToQueue.deferred = queuedSync;
            syncToQueue.uniqueId = syncToQueue.uniqueId || this.utilitySvc.getUniqueishId();
            this.syncQueue.push(syncToQueue);
            this.logSvc.logInfo(`Sync ${syncToQueue.uniqueId} (${syncToQueue.type}) queued`);
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
    return this.storeSvc.get<boolean>(StoreKey.SyncEnabled).then(this.platformSvc.interface_Refresh);
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
        if (!changeInfo) {
          throw new Exceptions.AmbiguousSyncRequestException();
        }

        // Process bookmark changes
        updateLocalBookmarksInfo = {
          type: changeInfo.type
        };

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

      // Sync bookmarks
      return getBookmarksToSync.then((bookmarks) => {
        // Encrypt bookmarks
        bookmarks = bookmarks || [];
        return this.cryptoSvc.encryptData(JSON.stringify(bookmarks)).then((encryptedBookmarks) => {
          // Update local bookmarks
          return this.$q((resolve, reject) => {
            this.platformSvc
              .eventListeners_Disable()
              .then(() => {
                return syncData.command === MessageCommand.RestoreBookmarks
                  ? this.populateLocalBookmarks(bookmarks)
                  : this.updateLocalBookmarks(updateLocalBookmarksInfo);
              })
              .then(resolve)
              .catch(reject)
              .finally(this.platformSvc.eventListeners_Enable);
          }).then(() => {
            // Update bookmarks cache
            return this.updateCachedBookmarks(bookmarks, encryptedBookmarks).then((cachedBookmarks) => {
              // Build id mappings if this was a restore
              if (syncData.command !== MessageCommand.RestoreBookmarks) {
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
      return this.populateLocalBookmarks(syncData.bookmarks);
    }

    return this.storeSvc
      .get([StoreKey.Password, StoreKey.SyncId])
      .then((storeContent) => {
        // Check secret and bookmarks ID are present
        if (!storeContent.password || !storeContent.syncId) {
          return this.disableSync().then(() => {
            throw new Exceptions.MissingClientDataException();
          });
        }

        // Get synced bookmarks
        return this.apiSvc.getBookmarks();
      })
      .then((data) => {
        encryptedBookmarks = data.bookmarks;
        lastUpdated = data.lastUpdated;

        // Decrypt bookmarks
        return this.cryptoSvc.decryptData(data.bookmarks);
      })
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
        return this.updateCachedBookmarks(bookmarks, encryptedBookmarks);
      })
      .then((cachedBookmarks) => {
        // Update browser bookmarks
        return this.platformSvc
          .eventListeners_Disable()
          .then(() => {
            return this.populateLocalBookmarks(cachedBookmarks);
          })
          .then(() => {
            return this.platformSvc.bookmarks_BuildIdMappings(cachedBookmarks);
          })
          .finally(this.platformSvc.eventListeners_Enable);
      })
      .then(() => {
        // Update cached last updated date
        return this.storeSvc.set(StoreKey.LastUpdated, lastUpdated);
      });
  }

  sync_handlePush(syncData) {
    return this.storeSvc
      .get([StoreKey.LastUpdated, StoreKey.Password, StoreKey.SyncEnabled, StoreKey.SyncId])
      .then((storeContent) => {
        // Check for cached sync ID and password
        if (!storeContent.password || !storeContent.syncId) {
          return this.disableSync().then(() => {
            throw new Exceptions.MissingClientDataException();
          });
        }

        // If this is a new sync, get local bookmarks and continue
        if (!storeContent.syncEnabled || !syncData.changeInfo) {
          return this.platformSvc.bookmarks_Get();
        }

        // Otherwose get cached bookmarks and process changes
        return this.getCachedBookmarks().then((bookmarks) => {
          if (!syncData.changeInfo) {
            // Nothing to process
            this.logSvc.logInfo('No change to process');
            return;
          }

          // Update bookmarks data with local changes
          switch (syncData.changeInfo.type) {
            // Create bookmark
            case BookmarkChangeType.Create:
              return this.platformSvc.bookmarks_Created(bookmarks, syncData.changeInfo.bookmark);
            // Delete bookmark
            case BookmarkChangeType.Delete:
              return this.platformSvc.bookmarks_Deleted(bookmarks, syncData.changeInfo.bookmark);
            // Update bookmark
            case BookmarkChangeType.Update:
              return this.platformSvc.bookmarks_Updated(bookmarks, syncData.changeInfo.bookmark);
            // Move bookmark
            case BookmarkChangeType.Move:
              return this.platformSvc.bookmarks_Moved(bookmarks, syncData.changeInfo.bookmark);
            // Ambiguous sync
            default:
              throw new Exceptions.AmbiguousSyncRequestException();
          }
        });
      })
      .then((bookmarks) => {
        if (!bookmarks) {
          // Don't sync
          return false;
        }

        // Update local cached bookmarks
        return this.cryptoSvc
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
    return this.storeSvc.get([StoreKey.Password, StoreKey.SyncId]).then((storeContent) => {
      // Check secret and sync ID are present
      if (!storeContent.password || !storeContent.syncId) {
        return this.disableSync().then(() => {
          throw new Exceptions.MissingClientDataException();
        });
      }

      // Get synced bookmarks and decrypt
      return this.apiSvc
        .getBookmarks()
        .then((data) => {
          // Decrypt bookmarks
          return this.cryptoSvc.decryptData(data.bookmarks);
        })
        .then((decryptedData) => {
          let bookmarks = decryptedData ? JSON.parse(decryptedData) : null;

          // Upgrade containers to use current container names
          bookmarks = this.upgradeContainers(bookmarks || []);

          // Set the sync version to the current app version
          return this.storeSvc
            .set(StoreKey.SyncVersion, Globals.AppVersion)
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
              // Sync provided bookmarks and set local bookmarks
              return this.$q
                .all([
                  this.apiSvc.updateBookmarks(encryptedBookmarks, true),
                  this.platformSvc
                    .eventListeners_Disable()
                    .then(() => {
                      return this.populateLocalBookmarks(bookmarks);
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
                    this.storeSvc.set(StoreKey.LastUpdated, data[0].lastUpdated)
                  ]);
                });
            });
        });
    });
  }

  updateBookmarkById(id, updateInfo, bookmarks) {
    const updatedBookmarks = angular.copy(bookmarks);
    const bookmarkToUpdate = this.findBookmarkById(updatedBookmarks, id);
    if (!bookmarkToUpdate) {
      throw new Exceptions.SyncedBookmarkNotFoundException();
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
      return this.storeSvc.set(StoreKey.Bookmarks, encryptedBookmarks).then(() => {
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
        case BookmarkChangeType.Create:
          return this.platformSvc.bookmarks_CreateSingle(updateInfo);
        // Update existing local bookmark
        case BookmarkChangeType.Update:
          return this.platformSvc.bookmarks_UpdateSingle(updateInfo);
        // Delete existing local bookmark
        case BookmarkChangeType.Delete:
          return this.platformSvc.bookmarks_DeleteSingle(updateInfo);
        // Ambiguous sync
        case !updateInfo:
        default:
          throw new Exceptions.AmbiguousSyncRequestException();
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
      this.logSvc.logWarning('Bookmarks missing ids');
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

    if (!_.isUndefined(duplicateId)) {
      this.logSvc.logWarning(`Duplicate bookmark id detected: ${duplicateId}`);
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
