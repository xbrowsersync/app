import angular from 'angular';
import { Injectable } from 'angular-ts-decorators';
import { autobind } from 'core-decorators';
import { browser } from 'webextension-polyfill-ts';
import NativeBookmarksService from '../../interfaces/native-bookmarks-service.interface';
import PlatformService from '../../interfaces/platform-service.interface';
import BookmarkService from '../shared/bookmark/bookmark.service';
import { BookmarkMappingNotFoundException, UnspecifiedException } from '../shared/exceptions/exception-types';
import Globals from '../shared/globals';
import LogService from '../shared/log/log.service';
import UtilityService from '../shared/utility/utility.service';
import BookmarkIdMapperService from '../webext/bookmark-id-mapper.service';

@autobind
@Injectable('NativeBookmarksService')
export default class ChromiumNativeBookmarksService implements NativeBookmarksService {
  $q: ng.IQService;
  $timeout: ng.ITimeoutService;
  bookmarkIdMapperSvc: BookmarkIdMapperService;
  bookmarkSvc: BookmarkService;
  logSvc: LogService;
  platformSvc: PlatformService;
  utilitySvc: UtilityService;

  bookmarkEventsQueue = [];
  processBookmarkEventsTimeout: any;

  static $inject = [
    '$q',
    '$timeout',
    'BookmarkIdMapperService',
    'BookmarkService',
    'LogService',
    'PlatformService',
    'UtilityService'
  ];
  constructor(
    $q: ng.IQService,
    $timeout: ng.ITimeoutService,
    BookmarkIdMapperSvc: BookmarkIdMapperService,
    BookmarkSvc: BookmarkService,
    LogSvc: LogService,
    PlatformSvc: PlatformService,
    UtilitySvc: UtilityService
  ) {
    this.$q = $q;
    this.$timeout = $timeout;
    this.bookmarkIdMapperSvc = BookmarkIdMapperSvc;
    this.bookmarkSvc = BookmarkSvc;
    this.logSvc = LogSvc;
    this.platformSvc = PlatformSvc;
    this.utilitySvc = UtilitySvc;
  }

  convertLocalBookmarkToSeparator(bookmark) {
    // Check if bookmark is in toolbar
    return this.platformSvc.bookmarks_LocalBookmarkInToolbar(bookmark).then((inToolbar) => {
      // Skip process if bookmark is not in toolbar and already local separator
      if (
        (bookmark.url === this.platformSvc.getNewTabUrl() &&
          !inToolbar &&
          bookmark.title === Globals.Bookmarks.HorizontalSeparatorTitle) ||
        (inToolbar && bookmark.title === Globals.Bookmarks.VerticalSeparatorTitle)
      ) {
        return bookmark;
      }

      // Disable event listeners and process conversion
      return this.disableEventListeners()
        .then(() => {
          const title = inToolbar
            ? Globals.Bookmarks.VerticalSeparatorTitle
            : Globals.Bookmarks.HorizontalSeparatorTitle;

          // If already a separator just update the title
          if (
            (!inToolbar && bookmark.title === Globals.Bookmarks.VerticalSeparatorTitle) ||
            (inToolbar && bookmark.title === Globals.Bookmarks.HorizontalSeparatorTitle)
          ) {
            return browser.bookmarks.update(bookmark.id, { title });
          }

          // Remove and recreate bookmark as a separator
          const separator = {
            index: bookmark.index,
            parentId: bookmark.parentId,
            title,
            url: this.platformSvc.getNewTabUrl()
          };
          return browser.bookmarks.remove(bookmark.id).then(() => {
            return browser.bookmarks.create(separator);
          });
        })
        .finally(this.enableEventListeners);
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  changeBookmark(id, changes) {
    // Retrieve full bookmark info
    browser.bookmarks.getSubTree(id).then((results) => {
      const changedBookmark = results[0];

      // If bookmark is separator update local bookmark properties
      (this.bookmarkSvc.isSeparator(changedBookmark)
        ? this.convertLocalBookmarkToSeparator(changedBookmark)
        : this.$q.resolve(changedBookmark)
      ).then((bookmarkNode) => {
        // If the bookmark was converted to a separator, update id mapping
        let updateMappingPromise;
        if (bookmarkNode.id !== id) {
          updateMappingPromise = this.bookmarkIdMapperSvc.get(id).then((idMapping) => {
            if (!idMapping) {
              throw new BookmarkMappingNotFoundException();
            }

            return this.bookmarkIdMapperSvc.remove(idMapping.syncedId).then(() => {
              const newMapping = this.bookmarkIdMapperSvc.createMapping(idMapping.syncedId, bookmarkNode.id);
              return this.bookmarkIdMapperSvc.add(newMapping);
            });
          });
        } else {
          updateMappingPromise = this.$q.resolve();
        }
        return updateMappingPromise.then(() => {
          // Create change info
          const changeInfo = {
            bookmark: bookmarkNode,
            type: Globals.UpdateType.Update
          };

          // Queue sync
          this.syncChange(changeInfo);
        });
      });
    });
  }

  checkPermsAndGetPageMetadata() {
    return this.platformSvc.permissions_Check().then((hasPermissions) => {
      if (!hasPermissions) {
        this.logSvc.logInfo('Do not have permission to read active tab content');
      }

      // Depending on current perms, get full or partial page metadata
      return hasPermissions ? this.platformSvc.getPageMetadata(true) : this.platformSvc.getPageMetadata(false);
    });
  }

  createBookmark(id, createdBookmark) {
    // If bookmark is separator update local bookmark properties
    return (this.bookmarkSvc.isSeparator(createdBookmark)
      ? this.convertLocalBookmarkToSeparator(createdBookmark)
      : this.$q.resolve(createdBookmark)
    ).then((bookmarkNode) => {
      // Create change info
      const changeInfo = {
        bookmark: bookmarkNode,
        type: Globals.UpdateType.Create
      };

      // If bookmark is not folder or separator, get page metadata from current tab
      return (bookmarkNode.url && !this.bookmarkSvc.isSeparator(bookmarkNode)
        ? this.checkPermsAndGetPageMetadata()
        : this.$q.resolve()
      ).then((metadata) => {
        // Add metadata if bookmark is current tab location
        if (metadata && bookmarkNode.url === metadata.url) {
          changeInfo.bookmark.title = this.utilitySvc.stripTags(metadata.title);
          changeInfo.bookmark.description = this.utilitySvc.stripTags(metadata.description);
          changeInfo.bookmark.tags = this.utilitySvc.getTagArrayFromText(metadata.tags);
        }

        // Queue sync
        this.syncChange(changeInfo);
      });
    });
  }

  enableEventListeners() {
    return this.disableEventListeners()
      .then(() => {
        browser.bookmarks.onCreated.addListener(this.onCreated);
        browser.bookmarks.onRemoved.addListener(this.onRemoved);
        browser.bookmarks.onChanged.addListener(this.onChanged);
        browser.bookmarks.onMoved.addListener(this.onMoved);
      })
      .catch((err) => {
        this.logSvc.logWarning('Failed to enable event listeners');
        throw new UnspecifiedException(err.message);
      });
  }

  disableEventListeners() {
    return this.$q
      .all([
        browser.bookmarks.onCreated.removeListener(this.onCreated),
        browser.bookmarks.onRemoved.removeListener(this.onRemoved),
        browser.bookmarks.onChanged.removeListener(this.onChanged),
        browser.bookmarks.onMoved.removeListener(this.onMoved)
      ])
      .then(() => {})
      .catch((err) => {
        this.logSvc.logWarning('Failed to disable event listeners');
        throw new UnspecifiedException(err.message);
      });
  }

  moveBookmark(id, moveInfo) {
    return this.$q
      .resolve(id)
      .then(browser.bookmarks.get)
      .then((results) => {
        const movedBookmark = results[0];

        // If bookmark is separator update local bookmark properties
        return (this.bookmarkSvc.isSeparator(movedBookmark)
          ? this.convertLocalBookmarkToSeparator(movedBookmark)
          : this.$q.resolve(movedBookmark)
        ).then((bookmarkNode) => {
          // If the bookmark was converted to a separator, update id mapping
          let updateMappingPromise;
          if (bookmarkNode.id !== id) {
            updateMappingPromise = this.bookmarkIdMapperSvc.get(id).then((idMapping) => {
              if (!idMapping) {
                throw new BookmarkMappingNotFoundException();
              }

              return this.bookmarkIdMapperSvc.remove(idMapping.syncedId).then(() => {
                const newMapping = this.bookmarkIdMapperSvc.createMapping(idMapping.syncedId, bookmarkNode.id);
                return this.bookmarkIdMapperSvc.add(newMapping);
              });
            });
          } else {
            updateMappingPromise = this.$q.resolve();
          }
          return updateMappingPromise.then(() => {
            // Create change info
            const changeInfo = {
              bookmark: angular.copy(moveInfo),
              type: Globals.UpdateType.Move
            };
            changeInfo.bookmark.id = id;

            // Queue sync
            this.syncChange(changeInfo);
          });
        });
      });
  }

  onChanged(...args) {
    this.logSvc.logInfo('onChanged event detected');
    this.queueBookmarkEvent(this.changeBookmark, args);
  }

  onCreated(...args) {
    this.logSvc.logInfo('onCreated event detected');
    this.queueBookmarkEvent(this.createBookmark, args);
  }

  onMoved(...args) {
    this.logSvc.logInfo('onMoved event detected');
    this.queueBookmarkEvent(this.moveBookmark, args);
  }

  onRemoved(...args) {
    this.logSvc.logInfo('onRemoved event detected');
    this.queueBookmarkEvent(this.removeBookmark, args);
  }

  processBookmarkEventsQueue() {
    const doActionUntil = () => {
      return this.$q.resolve(this.bookmarkEventsQueue.length === 0);
    };

    const action = () => {
      // Get first event in the queue
      const currentEvent = this.bookmarkEventsQueue.shift();
      return currentEvent[0].apply(this, currentEvent[1]);
    };

    // Iterate through the queue and process the events
    this.utilitySvc.promiseWhile(this.bookmarkEventsQueue, doActionUntil, action).then(() => {
      this.$timeout(() => {
        this.bookmarkSvc.executeSync().then(() => {
          // Move local containers into the correct order
          return this.disableEventListeners()
            .then(this.platformSvc.bookmarks_ReorderContainers)
            .then(this.enableEventListeners);
        });
      }, 100);
    });
  }

  queueBookmarkEvent(...args) {
    // Clear timeout
    if (this.processBookmarkEventsTimeout) {
      this.$timeout.cancel(this.processBookmarkEventsTimeout);
    }

    // Add event to the queue and trigger processing after a delay
    this.bookmarkEventsQueue.push(args);
    this.processBookmarkEventsTimeout = this.$timeout(this.processBookmarkEventsQueue, 200);
  }

  syncChange(changeInfo) {
    const syncData = {
      changeInfo,
      type: Globals.SyncType.Push
    };
    return this.platformSvc.sync_Queue(syncData, Globals.Commands.SyncBookmarks, false).catch(() => {
      // Swallow error, sync errors thrown searately by processBookmarkEventsQueue
    });
  }

  removeBookmark(id, removeInfo) {
    // Create change info
    const changeInfo = {
      bookmark: removeInfo.node,
      type: Globals.UpdateType.Delete
    };

    // Queue sync
    this.syncChange(changeInfo);

    return this.$q.resolve();
  }
}
