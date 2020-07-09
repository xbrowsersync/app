import { Injectable } from 'angular-ts-decorators';
import { autobind } from 'core-decorators';
import { Bookmarks as NativeBookmarks, browser } from 'webextension-polyfill-ts';
import BookmarkChange, {
  AddNativeBookmarkChangeData,
  ModifyNativeBookmarkChangeData,
  MoveNativeBookmarkChangeData,
  RemoveNativeBookmarkChangeData
} from '../../interfaces/bookmark-change.interface';
import NativeBookmarksService from '../../interfaces/native-bookmarks-service.interface';
import PlatformService from '../../interfaces/platform-service.interface';
import WebpageMetadata from '../../interfaces/webpage-metadata.interface';
import BookmarkChangeType from '../shared/bookmark/bookmark-change-type.enum';
import BookmarkService from '../shared/bookmark/bookmark.service';
import * as Exceptions from '../shared/exceptions/exception';
import Globals from '../shared/globals';
import LogService from '../shared/log/log.service';
import MessageCommand from '../shared/message-command.enum';
import SyncType from '../shared/sync-type.enum';
import SyncEngineService from '../shared/sync/sync-engine.service';
import Sync from '../shared/sync/sync.interface';
import UtilityService from '../shared/utility/utility.service';
import BookmarkIdMapperService from '../webext/bookmark-id-mapper/bookmark-id-mapper.service';

@autobind
@Injectable('NativeBookmarksService')
export default class ChromiumNativeBookmarksService implements NativeBookmarksService {
  $q: ng.IQService;
  $timeout: ng.ITimeoutService;
  bookmarkIdMapperSvc: BookmarkIdMapperService;
  bookmarkSvc: BookmarkService;
  logSvc: LogService;
  platformSvc: PlatformService;
  syncEngineService: SyncEngineService;
  utilitySvc: UtilityService;

  bookmarkEventsQueue: any[] = [];
  processBookmarkEventsTimeout: ng.IPromise<void>;

  static $inject = [
    '$q',
    '$timeout',
    'BookmarkIdMapperService',
    'BookmarkService',
    'LogService',
    'PlatformService',
    'SyncEngineService',
    'UtilityService'
  ];
  constructor(
    $q: ng.IQService,
    $timeout: ng.ITimeoutService,
    BookmarkIdMapperSvc: BookmarkIdMapperService,
    BookmarkSvc: BookmarkService,
    LogSvc: LogService,
    PlatformSvc: PlatformService,
    SyncEngineSvc: SyncEngineService,
    UtilitySvc: UtilityService
  ) {
    this.$q = $q;
    this.$timeout = $timeout;
    this.bookmarkIdMapperSvc = BookmarkIdMapperSvc;
    this.bookmarkSvc = BookmarkSvc;
    this.logSvc = LogSvc;
    this.platformSvc = PlatformSvc;
    this.syncEngineService = SyncEngineSvc;
    this.utilitySvc = UtilitySvc;
  }

  addBookmark(id?: string, nativeBookmark?: NativeBookmarks.BookmarkTreeNode): ng.IPromise<void> {
    // If bookmark is separator update native bookmark properties
    return (this.bookmarkSvc.isSeparator(nativeBookmark)
      ? this.convertNativeBookmarkToSeparator(nativeBookmark)
      : this.$q.resolve(nativeBookmark)
    ).then((bookmarkNode) => {
      // Create change info
      const data: AddNativeBookmarkChangeData = {
        nativeBookmark: bookmarkNode
      };
      const changeInfo: BookmarkChange = {
        changeData: data,
        type: BookmarkChangeType.Add
      };

      // If bookmark is not folder or separator, get page metadata from current tab
      return (bookmarkNode.url && !this.bookmarkSvc.isSeparator(bookmarkNode)
        ? this.checkPermsAndGetPageMetadata()
        : this.$q.resolve<WebpageMetadata>(null)
      ).then((metadata) => {
        // Add metadata if bookmark is current tab location
        if (metadata && bookmarkNode.url === metadata.url) {
          (changeInfo.changeData as AddNativeBookmarkChangeData).nativeBookmark.title = this.utilitySvc.stripTags(
            metadata.title
          );
          (changeInfo.changeData as AddNativeBookmarkChangeData).nativeBookmark.description = this.utilitySvc.stripTags(
            metadata.description
          );
          (changeInfo.changeData as AddNativeBookmarkChangeData).nativeBookmark.tags = this.utilitySvc.getTagArrayFromText(
            metadata.tags
          );
        }

        // Queue sync
        this.syncChange(changeInfo);
      });
    });
  }

  convertNativeBookmarkToSeparator(
    bookmark: NativeBookmarks.BookmarkTreeNode
  ): ng.IPromise<NativeBookmarks.BookmarkTreeNode> {
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
          const separator: NativeBookmarks.CreateDetails = {
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

  checkPermsAndGetPageMetadata(): ng.IPromise<WebpageMetadata> {
    return this.platformSvc.permissions_Check().then((hasPermissions) => {
      if (!hasPermissions) {
        this.logSvc.logInfo('Do not have permission to read active tab content');
      }

      // Depending on current perms, get full or partial page metadata
      return hasPermissions ? this.platformSvc.getPageMetadata(true) : this.platformSvc.getPageMetadata(false);
    });
  }

  enableEventListeners(): ng.IPromise<void> {
    return this.disableEventListeners()
      .then(() => {
        browser.bookmarks.onCreated.addListener(this.onCreated);
        browser.bookmarks.onRemoved.addListener(this.onRemoved);
        browser.bookmarks.onChanged.addListener(this.onChanged);
        browser.bookmarks.onMoved.addListener(this.onMoved);
      })
      .catch((err) => {
        this.logSvc.logWarning('Failed to enable event listeners');
        throw new Exceptions.UnspecifiedException(null, err);
      });
  }

  disableEventListeners(): ng.IPromise<void> {
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
        throw new Exceptions.UnspecifiedException(null, err);
      });
  }

  modifyBookmark(id?: string): ng.IPromise<void> {
    // Retrieve full bookmark info
    return browser.bookmarks.getSubTree(id).then((results) => {
      const changedBookmark = results[0];

      // If bookmark is separator update native bookmark properties
      (this.bookmarkSvc.isSeparator(changedBookmark)
        ? this.convertNativeBookmarkToSeparator(changedBookmark)
        : this.$q.resolve(changedBookmark)
      ).then((bookmarkNode) => {
        // If the bookmark was converted to a separator, update id mapping
        let updateMappingPromise: ng.IPromise<void>;
        if (bookmarkNode.id !== id) {
          updateMappingPromise = this.bookmarkIdMapperSvc.get(id).then((idMapping) => {
            if (!idMapping) {
              throw new Exceptions.BookmarkMappingNotFoundException();
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
          const data: ModifyNativeBookmarkChangeData = {
            nativeBookmark: bookmarkNode
          };
          const changeInfo: BookmarkChange = {
            changeData: data,
            type: BookmarkChangeType.Modify
          };

          // Queue sync
          this.syncChange(changeInfo);
        });
      });
    });
  }

  moveBookmark(id?: string, moveInfo?: NativeBookmarks.OnMovedMoveInfoType): ng.IPromise<void> {
    return browser.bookmarks.get(id).then((results) => {
      const movedBookmark = results[0];

      // If bookmark is separator update native bookmark properties
      return (this.bookmarkSvc.isSeparator(movedBookmark)
        ? this.convertNativeBookmarkToSeparator(movedBookmark)
        : this.$q.resolve(movedBookmark)
      ).then((bookmarkNode) => {
        // If the bookmark was converted to a separator, update id mapping
        let updateMappingPromise: ng.IPromise<void>;
        if (bookmarkNode.id !== id) {
          updateMappingPromise = this.bookmarkIdMapperSvc.get(id).then((idMapping) => {
            if (!idMapping) {
              throw new Exceptions.BookmarkMappingNotFoundException();
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
          const data: MoveNativeBookmarkChangeData = {
            ...moveInfo,
            id
          };
          const changeInfo: BookmarkChange = {
            changeData: data,
            type: BookmarkChangeType.Move
          };

          // Queue sync
          this.syncChange(changeInfo);
        });
      });
    });
  }

  onChanged(...args: any[]): void {
    this.logSvc.logInfo('onChanged event detected');
    this.queueBookmarkEvent(BookmarkChangeType.Modify, ...args);
  }

  onCreated(...args: any[]): void {
    this.logSvc.logInfo('onCreated event detected');
    this.queueBookmarkEvent(BookmarkChangeType.Add, ...args);
  }

  onMoved(...args: any[]): void {
    this.logSvc.logInfo('onMoved event detected');
    this.queueBookmarkEvent(BookmarkChangeType.Move, ...args);
  }

  onRemoved(...args: any[]): void {
    this.logSvc.logInfo('onRemoved event detected');
    this.queueBookmarkEvent(BookmarkChangeType.Remove, ...args);
  }

  processBookmarkEventsQueue(): void {
    const doActionUntil = (): ng.IPromise<boolean> => {
      return this.$q.resolve(this.bookmarkEventsQueue.length === 0);
    };

    const action = (): any => {
      // Get first event in the queue and process change
      const currentEvent = this.bookmarkEventsQueue.shift();
      switch (currentEvent.changeType) {
        case BookmarkChangeType.Add:
          return this.addBookmark(...currentEvent.eventArgs);
        case BookmarkChangeType.Remove:
          return this.removeBookmark(...currentEvent.eventArgs);
        case BookmarkChangeType.Move:
          return this.moveBookmark(...currentEvent.eventArgs);
        case BookmarkChangeType.Modify:
          return this.modifyBookmark(...currentEvent.eventArgs);
        default:
          throw new Exceptions.AmbiguousSyncRequestException();
      }
    };

    // Iterate through the queue and process the events
    this.utilitySvc.promiseWhile(this.bookmarkEventsQueue, doActionUntil, action).then(() => {
      this.$timeout(() => {
        this.syncEngineService.executeSync().then(() => {
          // Move local containers into the correct order
          return this.disableEventListeners()
            .then(this.platformSvc.bookmarks_ReorderContainers)
            .then(this.enableEventListeners);
        });
      }, 100);
    });
  }

  queueBookmarkEvent(changeType: BookmarkChangeType, ...eventArgs: any[]): void {
    // Clear timeout
    if (this.processBookmarkEventsTimeout) {
      this.$timeout.cancel(this.processBookmarkEventsTimeout);
    }

    // Add event to the queue and trigger processing after a delay
    this.bookmarkEventsQueue.push({
      changeType,
      eventArgs
    });
    this.processBookmarkEventsTimeout = this.$timeout(this.processBookmarkEventsQueue, 200);
  }

  removeBookmark(id?: string, removeInfo?: NativeBookmarks.OnRemovedRemoveInfoType): ng.IPromise<void> {
    // Create change info
    const data: RemoveNativeBookmarkChangeData = {
      nativeBookmark: removeInfo.node
    };
    const changeInfo: BookmarkChange = {
      changeData: data,
      type: BookmarkChangeType.Remove
    };

    // Queue sync
    this.syncChange(changeInfo);
    return this.$q.resolve();
  }

  syncChange(changeInfo: BookmarkChange): ng.IPromise<any> {
    const sync: Sync = {
      changeInfo,
      type: SyncType.Remote
    };

    // Queue sync but dont execute sync to allow for batch processing multiple changes
    return this.platformSvc.sync_Queue(sync, MessageCommand.SyncBookmarks, false).catch(() => {
      // Swallow error, sync errors thrown searately by processBookmarkEventsQueue
    });
  }
}
