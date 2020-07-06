/* eslint-disable no-case-declarations */
import angular from 'angular';
import { Injectable } from 'angular-ts-decorators';
import { autobind } from 'core-decorators';
import _ from 'underscore';
import { Bookmarks as NativeBookmarks } from 'webextension-polyfill-ts';
import Strings from '../../../../res/strings/en.json';
import BookmarkChange from '../../../interfaces/bookmark-change.interface';
import BookmarkSearchResult from '../../../interfaces/bookmark-search-result.interface';
import PlatformService from '../../../interfaces/platform-service.interface';
import Sync from '../../../interfaces/sync.interface';
import ApiService from '../api/api-service.interface';
import CryptoService from '../crypto/crypto.service';
import * as Exceptions from '../exceptions/exception';
import ExceptionHandler from '../exceptions/exception-handler.interface';
import Globals from '../globals';
import LogService from '../log/log.service';
import MessageCommand from '../message-command.enum';
import StoreKey from '../store/store-key.enum';
import StoreService from '../store/store.service';
import SyncType from '../sync-type.enum';
import UtilityService from '../utility/utility.service';
import AddBookmarkResult from './add-bookmark-result.interface';
import BookmarkChangeType from './bookmark-change-type.enum';
import BookmarkContainer from './bookmark-container.enum';
import Bookmark from './bookmark.interface';

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

  cachedBookmarks_encrypted: string;
  cachedBookmarks_plain: Bookmark[];
  currentSync: Sync;
  syncQueue: Sync[] = [];

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

  addBookmark(newBookmarkInfo: any, bookmarks: Bookmark[]): AddBookmarkResult {
    const updatedBookmarks = angular.copy(bookmarks);
    const parent = this.findBookmarkById(updatedBookmarks, newBookmarkInfo.parentId);
    if (!parent) {
      throw new Exceptions.SyncedBookmarkNotFoundException();
    }

    // Create new bookmark/separator
    const bookmark = this.isSeparator(newBookmarkInfo)
      ? this.newSeparator(bookmarks)
      : this.newBookmark(
          newBookmarkInfo.title,
          newBookmarkInfo.url || null,
          newBookmarkInfo.description,
          newBookmarkInfo.tags,
          newBookmarkInfo.children,
          bookmarks
        );

    // Use id if supplied or create new id
    if (!angular.isUndefined(newBookmarkInfo.id)) {
      bookmark.id = newBookmarkInfo.id;
    }

    // Clean bookmark and add at index or last index in path
    const cleanedBookmark = this.cleanBookmark(bookmark);
    parent.children.splice(newBookmarkInfo.index, 0, cleanedBookmark);

    return {
      bookmark: cleanedBookmark,
      bookmarks: updatedBookmarks
    } as AddBookmarkResult;
  }

  bookmarkIsContainer(bookmark: Bookmark | NativeBookmarks.BookmarkTreeNode): boolean {
    return (
      bookmark.title === BookmarkContainer.Menu ||
      bookmark.title === BookmarkContainer.Mobile ||
      bookmark.title === BookmarkContainer.Other ||
      bookmark.title === BookmarkContainer.Toolbar
    );
  }

  checkForUpdates(): ng.IPromise<boolean> {
    return this.storeSvc.get<string>(StoreKey.LastUpdated).then((storedLastUpdated) => {
      // Get last updated date from cache
      const storedLastUpdatedDate = new Date(storedLastUpdated);

      // Check if bookmarks have been updated
      return this.apiSvc.getBookmarksLastUpdated().then((response) => {
        // If last updated is different to the cached date, refresh bookmarks
        const remoteLastUpdated = new Date(response.lastUpdated);
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
        err instanceof Exceptions.SyncedBookmarkNotFoundException)
    );
  }

  cleanBookmark(bookmark: Bookmark): Bookmark {
    // Remove empty properties, except for children array
    const cleanedBookmark = _.pick<Bookmark, 'id' | 'url'>(angular.copy(bookmark), (value, key) => {
      return (_.isArray(value) && key !== 'children') || _.isString(value) ? value.length > 0 : value != null;
    });

    return cleanedBookmark;
  }

  disableSync(): ng.IPromise<void> {
    return this.storeSvc.get<boolean>(StoreKey.SyncEnabled).then((syncEnabled) => {
      if (!syncEnabled) {
        return null;
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

  eachBookmark(
    bookmarks: Bookmark[] | NativeBookmarks.BookmarkTreeNode[],
    iteratee: (rootBookmark: Bookmark | NativeBookmarks.BookmarkTreeNode) => void,
    untilCondition = false
  ): void {
    // Run the iteratee function for every bookmark until the condition is met
    const iterateBookmarks = (bookmarksToIterate: Bookmark[] | NativeBookmarks.BookmarkTreeNode[]): void => {
      for (let i = 0; i < bookmarksToIterate.length; i += 1) {
        if (untilCondition) {
          return;
        }
        iteratee(bookmarksToIterate[i]);
        if (bookmarksToIterate[i].children && bookmarksToIterate[i].children.length > 0) {
          iterateBookmarks(bookmarksToIterate[i].children);
        }
      }
    };
    iterateBookmarks(bookmarks);
  }

  enableSync(): ng.IPromise<void> {
    return this.$q
      .all([
        this.storeSvc.set(StoreKey.SyncEnabled, true),
        this.platformSvc.eventListeners_Enable(),
        this.platformSvc.automaticUpdates_Start()
      ])
      .then(() => {});
  }

  executeSync(isBackgroundSync = false): ng.IPromise<any> {
    // Check if sync enabled before running sync
    return this.storeSvc.get<boolean>(StoreKey.SyncEnabled).then((syncEnabled) => {
      if (!syncEnabled) {
        throw new Exceptions.SyncDisabledException();
      }

      // Get available updates if there are no queued syncs, finally process the queue
      return (this.syncQueue.length === 0 ? this.checkForUpdates() : this.$q.resolve(false))
        .then((updatesAvailable) => {
          return (
            updatesAvailable &&
            this.queueSync({
              type: SyncType.Pull
            })
          );
        })
        .then(() => this.processSyncQueue(isBackgroundSync));
    });
  }

  exportBookmarks(): ng.IPromise<Bookmark[]> {
    const cleanRecursive = (bookmarks: Bookmark[]): Bookmark[] => {
      return bookmarks.map((bookmark) => {
        const cleanedBookmark = this.cleanBookmark(bookmark);
        if (_.isArray(cleanedBookmark.children)) {
          cleanedBookmark.children = cleanRecursive(cleanedBookmark.children);
        }
        return cleanedBookmark;
      });
    };

    return this.storeSvc.get<boolean>(StoreKey.SyncEnabled).then((syncEnabled) => {
      // If sync is not enabled, export native bookmarks
      if (!syncEnabled) {
        return this.platformSvc.bookmarks_Get();
      }

      // Otherwise, export synced data
      return this.apiSvc
        .getBookmarks()
        .then((response) => {
          // Decrypt bookmarks
          return this.cryptoSvc.decryptData(response.bookmarks);
        })
        .then((decryptedData) => {
          // Remove empty containers
          const bookmarks = this.removeEmptyContainers(JSON.parse(decryptedData));

          // Clean exported bookmarks and return as json
          return cleanRecursive(bookmarks);
        });
    });
  }

  findBookmarkById(
    bookmarks: Bookmark[] | NativeBookmarks.BookmarkTreeNode[],
    id: number | string
  ): Bookmark | NativeBookmarks.BookmarkTreeNode {
    if (!bookmarks) {
      return null;
    }

    // Recursively iterate through all bookmarks until id match is found
    let bookmark: Bookmark | NativeBookmarks.BookmarkTreeNode;
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
      if ((bookmark as NativeBookmarks.BookmarkTreeNode).index != null) {
        (bookmark as NativeBookmarks.BookmarkTreeNode).index = index;
      }
    }

    return bookmark;
  }

  findCurrentUrlInBookmarks(): ng.IPromise<Bookmark> {
    // Check if current url is contained in bookmarks
    return this.platformSvc.getCurrentUrl().then((currentUrl) => {
      if (!currentUrl) {
        return null;
      }

      return this.searchBookmarks({ url: currentUrl }).then((searchResults) => {
        const searchResult = _.find<any>(searchResults, (bookmark) => {
          return bookmark.url.toLowerCase() === currentUrl.toLowerCase();
        });

        return this.$q.resolve(searchResult);
      });
    });
  }

  convertNativeBookmarkToBookmark(
    nativeBookmark: NativeBookmarks.BookmarkTreeNode,
    bookmarks: Bookmark[],
    takenIds: number[] = []
  ): Bookmark {
    if (!nativeBookmark) {
      return null;
    }

    // Get a new bookmark id and add to taken ids array so that ids are not duplicated before bookmarks are updated
    const id = this.getNewBookmarkId(bookmarks, takenIds);
    takenIds.push(id);

    // Create the new bookmark
    const bookmark = this.isSeparator(nativeBookmark)
      ? this.newSeparator()
      : this.newBookmark(nativeBookmark.title, nativeBookmark.url);
    bookmark.id = id;

    // Process children if any
    if (nativeBookmark.children && nativeBookmark.children.length > 0) {
      bookmark.children = nativeBookmark.children.map((childBookmark) => {
        return this.convertNativeBookmarkToBookmark(childBookmark, bookmarks, takenIds);
      });
    }

    return bookmark;
  }

  getBookmarkTitleForDisplay(bookmark: Bookmark): string {
    // If normal bookmark, return title or if blank url to display
    if (bookmark.url) {
      return bookmark.title ? bookmark.title : bookmark.url.replace(/^https?:\/\//i, '');
    }

    // Otherwise bookmark is a folder, return title if not a container
    if (!this.bookmarkIsContainer(bookmark)) {
      return bookmark.title;
    }
    let containerTitle: string;
    switch (bookmark.title) {
      case BookmarkContainer.Menu:
        containerTitle = this.platformSvc.getConstant(Strings.bookmarks_Container_Menu_Title);
        break;
      case BookmarkContainer.Mobile:
        containerTitle = this.platformSvc.getConstant(Strings.bookmarks_Container_Mobile_Title);
        break;
      case BookmarkContainer.Other:
        containerTitle = this.platformSvc.getConstant(Strings.bookmarks_Container_Other_Title);
        break;
      case BookmarkContainer.Toolbar:
        containerTitle = this.platformSvc.getConstant(Strings.bookmarks_Container_Toolbar_Title);
        break;
      default:
        containerTitle = `${undefined}`;
    }
    return containerTitle;
  }

  getCachedBookmarks(): ng.IPromise<Bookmark[]> {
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
          // Update cache with retrieved bookmarks data
          const bookmarks: Bookmark[] = decryptedBookmarks ? JSON.parse(decryptedBookmarks) : [];
          return this.updateCachedBookmarks(bookmarks, encryptedBookmarks);
        });
      });
    });
  }

  getContainer(containerName: string, bookmarks: Bookmark[], createIfNotPresent = false): Bookmark {
    // If container does not exist, create it if specified
    let container = _.findWhere<Bookmark, any>(bookmarks, { title: containerName });
    if (!container && createIfNotPresent) {
      container = this.newBookmark(containerName, null, null, null, null, bookmarks);
      bookmarks.push(container);
    }
    return container;
  }

  getContainerByBookmarkId(id: number, bookmarks: Bookmark[]): Bookmark {
    // Check if the id corresponds to a container
    const bookmark = this.findBookmarkById(bookmarks, id);
    if (this.bookmarkIsContainer(bookmark as Bookmark)) {
      return bookmark as Bookmark;
    }

    // Search through the child bookmarks of each container to find the bookmark
    let container: Bookmark;
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

  getCurrentSync(): Sync {
    // If nothing on the queue, get the current sync in progress if exists, otherwise get the last
    // sync in the queue
    return this.syncQueue.length === 0 ? this.currentSync : this.syncQueue[this.syncQueue.length - 1];
  }

  getIdsFromDescendants(bookmark: Bookmark): number[] {
    const ids = [];
    if (!bookmark.children || bookmark.children.length === 0) {
      return ids;
    }

    this.eachBookmark(bookmark.children, (child) => {
      ids.push(child.id);
    });
    return ids;
  }

  getLookahead(word: string, bookmarks: Bookmark[], tagsOnly = false, exclusions: string[] = []): ng.IPromise<any> {
    if (!word) {
      return this.$q.resolve('');
    }

    let getBookmarks: ng.IPromise<Bookmark[]>;
    if (bookmarks && bookmarks.length > 0) {
      // Use supplied bookmarks
      getBookmarks = this.$q.resolve(bookmarks);
    } else {
      // Get cached bookmarks
      getBookmarks = this.getCachedBookmarks();
    }

    // With bookmarks
    return getBookmarks
      .then((bookmarksToSearch) => {
        // Get lookaheads
        let lookaheads = this.searchBookmarksForLookaheads(bookmarksToSearch, word, tagsOnly);

        // Remove exclusions from lookaheads
        if (exclusions) {
          lookaheads = _.difference(lookaheads, exclusions);
        }

        if (lookaheads.length === 0) {
          return null;
        }

        // Count lookaheads and return most common
        const lookahead = _.first(
          _.chain(lookaheads)
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

  getNewBookmarkId(bookmarks: Bookmark[], takenIds: number[] = [0]): number {
    // Check existing bookmarks for highest id
    let highestId = 0;
    this.eachBookmark(bookmarks, (bookmark) => {
      if (
        !angular.isUndefined(bookmark.id) &&
        parseInt((bookmark as NativeBookmarks.BookmarkTreeNode).id, 10) > highestId
      ) {
        highestId = parseInt((bookmark as NativeBookmarks.BookmarkTreeNode).id, 10);
      }
    });

    // Compare highest id with supplied taken ids
    highestId = _.max(takenIds) > highestId ? _.max(takenIds) : highestId;
    return highestId + 1;
  }

  getSyncBookmarksToolbar(): ng.IPromise<boolean> {
    // Get setting from local storage
    return this.storeSvc.get<boolean>(StoreKey.SyncBookmarksToolbar).then((syncBookmarksToolbar) => {
      // Set default value to true
      if (syncBookmarksToolbar == null) {
        syncBookmarksToolbar = true;
      }
      return syncBookmarksToolbar;
    });
  }

  getSyncQueueLength(): number {
    return this.syncQueue.length;
  }

  getSyncSize(): ng.IPromise<number> {
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

  handleFailedSync(failedSync: Sync, err: Error): ng.IPromise<Error> {
    return this.$q<Error>((resolve, reject) => {
      // Update browser action icon
      this.platformSvc.interface_Refresh();

      // If offline and sync is a change, swallow error and place failed sync back on the queue
      if (err instanceof Exceptions.NetworkOfflineException && failedSync.type !== SyncType.Pull) {
        return resolve(new Exceptions.SyncUncommittedException());
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
              } else if (failedSync.type !== SyncType.Pull) {
                // If local changes made, clear sync queue and refresh sync data if necessary
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

  isSeparator(bookmark: Bookmark | NativeBookmarks.BookmarkTreeNode): boolean {
    if (!bookmark) {
      return false;
    }

    // Bookmark is separator if title is dashes or designated separator title, has no url and no children,
    // or type is separator (in FF)
    const separatorRegex = new RegExp('^[-─]{1,}$');
    return (
      (bookmark as NativeBookmarks.BookmarkTreeNode).type === 'separator' ||
      (bookmark.title &&
        (separatorRegex.test(bookmark.title) ||
          bookmark.title.indexOf(Globals.Bookmarks.HorizontalSeparatorTitle) >= 0 ||
          bookmark.title === Globals.Bookmarks.VerticalSeparatorTitle) &&
        (!bookmark.url || bookmark.url === this.platformSvc.getNewTabUrl()) &&
        (!bookmark.children || bookmark.children.length === 0))
    );
  }

  newBookmark(
    title: string,
    url?: string,
    description?: string,
    tags?: string[],
    children?: Bookmark[],
    bookmarksToGenerateNewId?: Bookmark[]
  ): Bookmark {
    const newBookmark: Bookmark = {
      children: children || [],
      description: this.utilitySvc.trimToNearestWord(description, Globals.Bookmarks.DescriptionMaxLength),
      tags,
      title: title && title.trim(),
      url: url && url.trim()
    };

    if (url) {
      delete newBookmark.children;
    } else {
      delete newBookmark.url;
    }

    if (tags && tags.length === 0) {
      delete newBookmark.tags;
    }

    // If bookmarks provided, generate new id
    if (bookmarksToGenerateNewId) {
      newBookmark.id = this.getNewBookmarkId(bookmarksToGenerateNewId);
    }

    return newBookmark;
  }

  newSeparator(bookmarksToGenerateNewId?: Bookmark[]): Bookmark {
    return this.newBookmark('-', null, null, null, null, bookmarksToGenerateNewId);
  }

  populateNativeBookmarks(bookmarks: Bookmark[]): ng.IPromise<void> {
    // Clear native bookmarks and then populate with provided bookmarks
    return this.platformSvc.bookmarks_Clear().then(() => {
      return this.platformSvc.bookmarks_Populate(bookmarks);
    });
  }

  processBookmarkChanges(bookmarks: Bookmark[], changeInfo: BookmarkChange): any {
    const returnInfo = {
      bookmark: undefined,
      bookmarks: undefined,
      container: undefined
    };

    // Update bookmarks before syncing
    let otherContainer: Bookmark;
    switch (changeInfo.type) {
      // Create bookmark
      case BookmarkChangeType.Create:
        // Get or create other bookmarks container
        otherContainer = this.getContainer(BookmarkContainer.Other, bookmarks, true);

        // Create new bookmark and add to container
        const newBookmark = this.newBookmark(
          (changeInfo.bookmark as Bookmark).title,
          (changeInfo.bookmark as Bookmark).url,
          (changeInfo.bookmark as Bookmark).description,
          (changeInfo.bookmark as Bookmark).tags,
          (changeInfo.bookmark as Bookmark).children,
          bookmarks
        );
        otherContainer.children.push(newBookmark);
        returnInfo.bookmark = newBookmark;
        returnInfo.container = otherContainer.title;
        break;
      // Update bookmark
      case BookmarkChangeType.Update:
        returnInfo.container = this.getContainerByBookmarkId((changeInfo.bookmark as Bookmark).id, bookmarks).title;
        bookmarks = this.recursiveUpdate(bookmarks, changeInfo.bookmark as Bookmark);
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
      default:
        throw new Exceptions.AmbiguousSyncRequestException();
    }

    returnInfo.bookmarks = bookmarks;
    return returnInfo;
  }

  processSyncQueue(isBackgroundSync = false): ng.IPromise<any> {
    let updateRemote = false;

    // If a sync is in progress, retry later
    if (this.currentSync || this.syncQueue.length === 0) {
      return this.$q.resolve();
    }

    const doActionUntil = (): ng.IPromise<boolean> => {
      return this.$q.resolve(this.syncQueue.length === 0);
    };

    const action = (): ng.IPromise<any> => {
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
            // Overwrite native bookmarks
            case SyncType.Pull:
              return this.sync_handlePull(this.currentSync).then(() => true);
            // Sync to service and overwrite native bookmarks
            case SyncType.Both:
              return this.sync_handleBoth(this.currentSync).then(() => true);
            // Cancel current sync process
            case SyncType.Cancel:
              return this.sync_handleCancel().then(() => false);
            // Upgrade sync to current version
            case SyncType.Upgrade:
              return this.sync_handleUpgrade().then(() => true);
            // Ambiguous sync
            default:
              throw new Exceptions.AmbiguousSyncRequestException();
          }
        })
        .then((syncChange) => {
          return this.storeSvc
            .get<boolean>(StoreKey.SyncEnabled)
            .then((syncEnabled) => {
              // If syncing for the first time or re-syncing, set sync as enabled
              return (
                !syncEnabled &&
                this.currentSync.command !== MessageCommand.RestoreBookmarks &&
                this.currentSync.type !== SyncType.Cancel &&
                this.enableSync().then(() => {
                  this.logSvc.logInfo('Sync enabled');
                })
              );
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

  queueSync(syncToQueue: Sync, runSync = true): ng.IPromise<void> {
    return this.$q<any>((resolve, reject) => {
      this.storeSvc
        .get<boolean>(StoreKey.SyncEnabled)
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
            syncToQueue.uniqueId = syncToQueue.uniqueId || this.utilitySvc.getUniqueishId();
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

          return this.$q.all(promises).then(() => {
            resolve();
          });
        })
        .catch(reject);
    });
  }

  recursiveDelete(bookmarks: Bookmark[], id: number): Bookmark[] {
    return _.map(
      _.reject(bookmarks, (bookmark) => {
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

  recursiveUpdate(bookmarks: Bookmark[], updatedBookmark: Bookmark) {
    return _.map(bookmarks, (bookmark) => {
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

  removeBookmarkById(id: number, bookmarks: Bookmark[]): ng.IPromise<Bookmark[]> {
    return this.$q((resolve, reject) => {
      try {
        const updatedBookmarks = this.recursiveDelete(bookmarks, id);
        resolve(updatedBookmarks);
      } catch (err) {
        reject(err);
      }
    });
  }

  removeEmptyContainers(bookmarks: Bookmark[]): Bookmark[] {
    const menuContainer = this.getContainer(BookmarkContainer.Menu, bookmarks);
    const mobileContainer = this.getContainer(BookmarkContainer.Mobile, bookmarks);
    const otherContainer = this.getContainer(BookmarkContainer.Other, bookmarks);
    const toolbarContainer = this.getContainer(BookmarkContainer.Toolbar, bookmarks);
    const removeArr: Bookmark[] = [];

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

  repairBookmarkIds(bookmarks: Bookmark[]): Bookmark[] {
    let allBookmarks: Bookmark[] = [];
    let idCounter = 1;

    // Get all bookmarks into flat array
    this.eachBookmark(bookmarks, (bookmark) => {
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

  searchBookmarks(query: any): ng.IPromise<Bookmark[]> {
    if (!query) {
      query = { keywords: [] };
    }

    // Get cached bookmarks
    return this.getCachedBookmarks().then((bookmarks) => {
      let results: BookmarkSearchResult[];

      // If url supplied, first search by url
      if (query.url) {
        results = this.searchBookmarksByUrl(bookmarks, query.url) || [];
      }

      // Search by keywords and sort (score desc, id desc) using results from url search if relevant
      results = _.chain(
        this.searchBookmarksByKeywords(results || (bookmarks as BookmarkSearchResult[]), query.keywords)
      )
        .sortBy('id')
        .sortBy('score')
        .value()
        .reverse();
      return results;
    });
  }

  searchBookmarksByKeywords(
    bookmarks: Bookmark[],
    keywords: string[] = [],
    results: BookmarkSearchResult[] = []
  ): BookmarkSearchResult[] {
    _.each(bookmarks, (bookmark) => {
      if (!bookmark.url) {
        // If this is a folder, search children
        if (bookmark.children && bookmark.children.length > 0) {
          this.searchBookmarksByKeywords(bookmark.children, keywords, results);
        }
      } else {
        let bookmarkWords: string[] = [];

        // Add all words in bookmark to array
        bookmarkWords = bookmarkWords.concat(this.utilitySvc.splitTextIntoWords(bookmark.title));
        if (bookmark.description) {
          bookmarkWords = bookmarkWords.concat(this.utilitySvc.splitTextIntoWords(bookmark.description));
        }
        if (bookmark.tags) {
          bookmarkWords = bookmarkWords.concat(this.utilitySvc.splitTextIntoWords(bookmark.tags.join(' ')));
        }

        // Get match scores for each keyword against bookmark words
        const scores = keywords.map((keyword) => {
          let count = 0;
          bookmarkWords.forEach((word) => {
            if (word && word.toLowerCase().indexOf(keyword.toLowerCase()) === 0) {
              count += 1;
            }
          });

          return count;
        });

        // Check all keywords match
        if (
          angular.isUndefined(
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
          const result: BookmarkSearchResult = angular.copy(bookmark);
          result.score = score;
          results.push(result);
        }
      }
    });

    return results;
  }

  searchBookmarksByUrl(
    bookmarks: Bookmark[],
    url: string,
    results: BookmarkSearchResult[] = []
  ): BookmarkSearchResult[] {
    results = results.concat(
      _.filter(bookmarks, (bookmark) => {
        if (!bookmark.url) {
          return false;
        }

        return bookmark.url.toLowerCase().indexOf(url.toLowerCase()) >= 0;
      })
    );

    for (let i = 0; i < bookmarks.length; i += 1) {
      if (bookmarks[i].children && bookmarks[i].children.length > 0) {
        results = this.searchBookmarksByUrl(bookmarks[i].children, url, results);
      }
    }

    return results;
  }

  searchBookmarksForLookaheads(
    bookmarks: Bookmark[],
    word: string,
    tagsOnly = false,
    results: string[] = []
  ): string[] {
    _.each(bookmarks, (bookmark) => {
      if (!bookmark.url) {
        results = this.searchBookmarksForLookaheads(bookmark.children, word, tagsOnly, results);
      } else {
        let bookmarkWords: string[] = [];

        if (!tagsOnly) {
          if (bookmark.title) {
            // Add all words from title
            bookmarkWords = bookmarkWords.concat(
              this.utilitySvc.filterFalsyValues(bookmark.title.replace("'", '').toLowerCase().split(/[\W_]/))
            );
          }

          // Split tags into individual words
          if (bookmark.tags) {
            const tags = _.chain(bookmark.tags)
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
          bookmarkWords = bookmarkWords.concat(this.utilitySvc.filterFalsyValues(bookmark.tags));
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

  setIsSyncing(syncType?: SyncType): ng.IPromise<void> {
    // Update browser action icon with current sync type
    if (syncType != null) {
      return this.platformSvc.interface_Refresh(null, syncType);
    }

    // Get cached sync enabled value and update browser action icon
    return this.storeSvc.get<boolean>(StoreKey.SyncEnabled).then(this.platformSvc.interface_Refresh);
  }

  sync_handleBoth(sync: Sync): ng.IPromise<void> {
    let getBookmarksToSync: ng.IPromise<Bookmark[]>;
    let updateNativeBookmarksInfo: any;

    // changeInfo can be an object or a promise
    return this.$q.resolve(sync.changeInfo).then((changeInfo) => {
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

        // Process bookmark changes
        updateNativeBookmarksInfo = {
          type: changeInfo.type
        };

        getBookmarksToSync = this.getCachedBookmarks()
          .then((bookmarks) => {
            return this.processBookmarkChanges(bookmarks, changeInfo);
          })
          .then((results) => {
            updateNativeBookmarksInfo.bookmark = results.bookmark;
            updateNativeBookmarksInfo.bookmarks = results.bookmarks;
            updateNativeBookmarksInfo.container = results.container;
            return results.bookmarks;
          });
      }

      // Sync bookmarks
      return getBookmarksToSync.then((bookmarks) => {
        // Encrypt bookmarks
        bookmarks = bookmarks || [];
        return this.cryptoSvc.encryptData(JSON.stringify(bookmarks)).then((encryptedBookmarks) => {
          // Update native bookmarks
          return this.$q((resolve, reject) => {
            this.platformSvc
              .eventListeners_Disable()
              .then(() => {
                return sync.command === MessageCommand.RestoreBookmarks
                  ? this.populateNativeBookmarks(bookmarks)
                  : this.processNativeBookmarkChanges(updateNativeBookmarksInfo);
              })
              .then(resolve)
              .catch(reject)
              .finally(this.platformSvc.eventListeners_Enable);
          }).then(() => {
            // Update bookmarks cache
            return this.updateCachedBookmarks(bookmarks, encryptedBookmarks).then((cachedBookmarks) => {
              // Build id mappings if this was a restore
              if (sync.command !== MessageCommand.RestoreBookmarks) {
                return;
              }
              return this.platformSvc.bookmarks_BuildIdMappings(cachedBookmarks);
            });
          });
        });
      });
    });
  }

  sync_handleCancel(): ng.IPromise<void> {
    return this.disableSync();
  }

  sync_handlePull(sync: Sync): ng.IPromise<void> {
    if (sync.bookmarks) {
      // Local import, update native bookmarks
      return this.populateNativeBookmarks(sync.bookmarks);
    }

    return this.storeSvc.get([StoreKey.Password, StoreKey.SyncId]).then((storeContent) => {
      // Check secret and bookmarks ID are present
      if (!storeContent.password || !storeContent.syncId) {
        return this.disableSync().then(() => {
          throw new Exceptions.MissingClientDataException();
        });
      }

      // Get synced bookmarks
      return this.apiSvc.getBookmarks().then((response) => {
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
            return this.updateCachedBookmarks(bookmarks, encryptedBookmarks);
          })
          .then((cachedBookmarks) => {
            // Update browser bookmarks
            return this.platformSvc
              .eventListeners_Disable()
              .then(() => {
                return this.populateNativeBookmarks(cachedBookmarks);
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
      });
    });
  }

  sync_handlePush(sync: Sync): ng.IPromise<boolean> {
    return this.storeSvc
      .get([StoreKey.LastUpdated, StoreKey.Password, StoreKey.SyncEnabled, StoreKey.SyncId])
      .then((storeContent) => {
        // Check for cached sync ID and password
        if (!storeContent.password || !storeContent.syncId) {
          return this.disableSync().then(() => {
            throw new Exceptions.MissingClientDataException();
          });
        }

        // If this is a new sync, get native bookmarks and continue
        if (!storeContent.syncEnabled || !sync.changeInfo) {
          return this.platformSvc.bookmarks_Get();
        }

        // Otherwose get cached bookmarks and process changes
        return this.getCachedBookmarks().then((bookmarks) => {
          if (!sync.changeInfo) {
            // Nothing to process
            this.logSvc.logInfo('No change to process');
            return;
          }

          // Update bookmarks data with local changes
          switch (sync.changeInfo.type) {
            // Create bookmark
            case BookmarkChangeType.Create:
              return this.platformSvc.bookmarks_Created(
                bookmarks,
                sync.changeInfo.bookmark as NativeBookmarks.BookmarkTreeNode
              );
            // Delete bookmark
            case BookmarkChangeType.Delete:
              return this.platformSvc.bookmarks_Deleted(
                bookmarks,
                sync.changeInfo.bookmark as NativeBookmarks.BookmarkTreeNode
              );
            // Update bookmark
            case BookmarkChangeType.Update:
              return this.platformSvc.bookmarks_Updated(
                bookmarks,
                sync.changeInfo.bookmark as NativeBookmarks.BookmarkTreeNode
              );
            // Move bookmark
            case BookmarkChangeType.Move:
              return this.platformSvc.bookmarks_Moved(bookmarks, sync.changeInfo.bookmark as any);
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

        // Update cached bookmarks
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

  sync_handleUpgrade(): ng.IPromise<void> {
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
        .then((response) => {
          // Decrypt bookmarks
          return this.cryptoSvc.decryptData(response.bookmarks);
        })
        .then((decryptedData) => {
          let bookmarks: Bookmark[] = decryptedData ? JSON.parse(decryptedData) : null;

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
              // Sync provided bookmarks and set native bookmarks
              return this.$q
                .all([
                  this.apiSvc.updateBookmarks(encryptedBookmarks, true),
                  this.platformSvc
                    .eventListeners_Disable()
                    .then(() => {
                      return this.populateNativeBookmarks(bookmarks);
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
            })
            .then(() => {});
        });
    });
  }

  updateBookmarkById(id: number, updateInfo: any, bookmarks: Bookmark[]): ng.IPromise<Bookmark[]> {
    const updatedBookmarks = angular.copy(bookmarks);
    const bookmarkToUpdate = this.findBookmarkById(updatedBookmarks, id) as Bookmark;
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

    // If updated bookmark is a separator, convert bookmark to separator
    if (this.isSeparator(bookmarkToUpdate)) {
      // Create a new separator with same id
      const separator = this.newSeparator();
      separator.id = bookmarkToUpdate.id;

      // Clear existing properties
      // eslint-disable-next-line no-restricted-syntax
      for (const prop in bookmarkToUpdate) {
        // eslint-disable-next-line no-prototype-builtins
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

  updateCachedBookmarks(unencryptedBookmarks: Bookmark[], encryptedBookmarks: string): ng.IPromise<Bookmark[]> {
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

  processNativeBookmarkChanges(updateInfo: any): ng.IPromise<void> {
    if (!updateInfo || !updateInfo.bookmark || !updateInfo.bookmarks || !updateInfo.container) {
      return this.$q.resolve();
    }

    // Check if change is in toolbar and is syncing toolbar
    return (updateInfo.container === BookmarkContainer.Toolbar
      ? this.getSyncBookmarksToolbar()
      : this.$q.resolve(true)
    ).then((updateNativeBookmarks) => {
      if (!updateNativeBookmarks) {
        return;
      }

      switch (updateInfo.type) {
        // Create new native bookmark
        case BookmarkChangeType.Create:
          return this.platformSvc.bookmarks_CreateSingle(updateInfo);
        // Update native bookmark
        case BookmarkChangeType.Update:
          return this.platformSvc.bookmarks_UpdateSingle(updateInfo);
        // Delete native bookmark
        case BookmarkChangeType.Delete:
          return this.platformSvc.bookmarks_DeleteSingle(updateInfo);
        // Ambiguous sync
        case !updateInfo:
        default:
          throw new Exceptions.AmbiguousSyncRequestException();
      }
    });
  }

  upgradeContainers(bookmarks: Bookmark[]): Bookmark[] {
    // Upgrade containers to use current container names
    const otherContainer = this.getContainer('_other_', bookmarks);
    if (otherContainer) {
      otherContainer.title = BookmarkContainer.Other;
    }

    const toolbarContainer = this.getContainer('_toolbar_', bookmarks);
    if (toolbarContainer) {
      toolbarContainer.title = BookmarkContainer.Toolbar;
    }

    const xbsContainerIndex = _.findIndex(bookmarks, (x) => {
      return x.title === '_xBrowserSync_';
    });
    if (xbsContainerIndex >= 0) {
      const xbsContainer = bookmarks.splice(xbsContainerIndex, 1)[0];
      xbsContainer.title = 'Legacy xBrowserSync bookmarks';
      otherContainer.children = otherContainer.children || [];
      otherContainer.children.splice(0, 0, xbsContainer);
    }

    return bookmarks;
  }

  validateBookmarkIds(bookmarks: Bookmark[]): boolean {
    if (!bookmarks || bookmarks.length === 0) {
      return true;
    }

    // Find any bookmark without an id
    let bookmarksHaveIds = true;
    this.eachBookmark(bookmarks, (bookmark) => {
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
    this.eachBookmark(bookmarks, (bookmark) => {
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
