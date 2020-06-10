/* eslint-disable operator-assignment */
/* eslint-disable no-plusplus */
/* eslint-disable default-case */
/* eslint-disable no-undef */
/* eslint-disable no-case-declarations */
/* eslint-disable no-empty */
/* eslint-disable prefer-destructuring */
/* eslint-disable no-param-reassign */
/* eslint-disable consistent-return */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable global-require */

import { Component } from 'angular-ts-decorators';
import angular from 'angular';
import { autobind } from 'core-decorators';
import Globals from '../shared/globals';
import StoreService from '../shared/store.service';
import BookmarkService from '../shared/bookmark.service';
import Platform from '../shared/platform.interface';
import UtilityService from '../shared/utility.service';
import BookmarkIdMapperService from '../webext/bookmark-id-mapper.service';
import WebExtBackgroundComponent from '../webext/webext-background.component';

@autobind
@Component({
  controllerAs: 'vm',
  selector: 'webextBackground',
  template: require('../webext/webext-background.component.html')
})
export default class FirefoxBackgroundComponent extends WebExtBackgroundComponent {
  $q: ng.IQService;
  $timeout: ng.ITimeoutService;
  bookmarkIdMapperSvc: BookmarkIdMapperService;
  bookmarkSvc: BookmarkService;
  platformSvc: Platform;
  storeSvc: StoreService;
  utilitySvc: UtilityService;

  static $inject = [
    '$q',
    '$timeout',
    'BookmarkIdMapperService',
    'BookmarkService',
    'PlatformService',
    'StoreService',
    'UtilityService'
  ];
  constructor(
    $q: ng.IQService,
    $timeout: ng.ITimeoutService,
    BookmarkIdMapperSvc: BookmarkIdMapperService,
    BookmarkSvc: BookmarkService,
    PlatformSvc: Platform,
    StoreSvc: StoreService,
    UtilitySvc: UtilityService
  ) {
    super($q, $timeout, BookmarkIdMapperSvc, BookmarkSvc, PlatformSvc, StoreSvc, UtilitySvc);

    this.$q = $q;
    this.$timeout = $timeout;
    this.bookmarkIdMapperSvc = BookmarkIdMapperSvc;
    this.bookmarkSvc = BookmarkSvc;
    this.platformSvc = PlatformSvc;
    this.storeSvc = StoreSvc;
    this.utilitySvc = UtilitySvc;
  }

  changeBookmark(id, changes) {
    // Create change info
    const changeInfo = {
      bookmark: angular.copy(changes),
      type: Globals.UpdateType.Update
    };
    changeInfo.bookmark.id = id;
    // Queue sync
    this.queueBookmarksSync(
      {
        changeInfo,
        type: Globals.SyncType.Push
      },
      (response) => {
        if (!response.success) {
          // Display alert
          const errMessage = this.platformSvc.getErrorMessageFromException(response.error);
          this.displayAlert(errMessage.title, errMessage.message);
        }
      },
      false
    );
  }

  createBookmark(id, createdBookmark) {
    // Create change info
    const changeInfo = {
      bookmark: angular.copy(createdBookmark),
      type: Globals.UpdateType.Create
    };
    changeInfo.bookmark.id = id;
    // If bookmark is not folder or separator, get page metadata from current tab
    (createdBookmark.url && !this.bookmarkSvc.isSeparator(createdBookmark)
      ? this.platformSvc.getPageMetadata()
      : this.$q.resolve()
    ).then((metadata) => {
      // Add metadata if bookmark is current tab location
      if (metadata && createdBookmark.url === metadata.url) {
        changeInfo.bookmark.title = this.utilitySvc.stripTags(metadata.title);
        changeInfo.bookmark.description = this.utilitySvc.stripTags(metadata.description);
        changeInfo.bookmark.tags = this.utilitySvc.getTagArrayFromText(metadata.tags);
      }
      // Queue sync
      this.queueBookmarksSync(
        {
          changeInfo,
          type: Globals.SyncType.Push
        },
        (response) => {
          if (!response.success) {
            // Display alert
            const errMessage = this.platformSvc.getErrorMessageFromException(response.error);
            this.displayAlert(errMessage.title, errMessage.message);
          }
        },
        false
      );
    });
  }

  fixMultipleMoveOldIndexes() {
    const processBatch = (batch) => {
      // Adjust oldIndexes if bookmarks moved to different parent or to higher indexes
      if (batch[0].parentId !== batch[0].oldParentId || batch[0].index > batch[0].oldIndex) {
        for (let i = batch.length - 1; i >= 0; i--) {
          batch[i].oldIndex = batch[i].oldIndex - i;
        }
      }
    };
    const finalBatch = this.bookmarkEventsQueue.reduce((currentBatch, currentEvent, currentIndex) => {
      // Check the current event is a move
      if (currentEvent[0] === this.moveBookmark) {
        // If no events in batch, add this as the first and continue
        if (currentBatch.length === 0) {
          currentBatch.push(currentEvent[1][1]);
          return currentBatch;
        }
        // Otherwise check if this is part of the batch (will have same parent and index as first event)
        const currentMoveInfo = currentEvent[1][1];
        if (
          currentMoveInfo.parentId === currentBatch[0].parentId &&
          (currentMoveInfo.index === currentBatch[0].index ||
            currentMoveInfo.index === this.bookmarkEventsQueue[currentIndex - 1][1][1].index + 1)
        ) {
          currentBatch.push(currentMoveInfo);
          return currentBatch;
        }
      }
      if (currentBatch.length > 0) {
        // Process current batch
        processBatch(currentBatch);
      }
      // Return empty batch
      return [];
    }, []);
    if (finalBatch.length > 0) {
      // Process final batch
      processBatch(finalBatch);
    }
  }

  moveBookmark(id, moveInfo) {
    // Create change info
    const changeInfo = {
      bookmark: angular.copy(moveInfo),
      type: Globals.UpdateType.Move
    };
    changeInfo.bookmark.id = id;
    // Queue sync
    this.queueBookmarksSync(
      {
        changeInfo,
        type: Globals.SyncType.Push
      },
      (response) => {
        if (!response.success) {
          // Display alert
          const errMessage = this.platformSvc.getErrorMessageFromException(response.error);
          this.displayAlert(errMessage.title, errMessage.message);
        }
      },
      false
    );
  }

  processBookmarkEventsQueue() {
    // Fix incorrect oldIndex values for multiple moves
    // https://bugzilla.mozilla.org/show_bug.cgi?id=1556427
    this.fixMultipleMoveOldIndexes();

    super.processBookmarkEventsQueue();
  }

  queueBookmarksSync(syncData, callback, runSync) {
    runSync = runSync === undefined ? true : runSync;
    callback = callback || (() => {});

    // Queue sync
    return this.bookmarkSvc
      .queueSync(syncData, runSync)
      .then(() => {
        callback({ success: true });
      })
      .catch((err) => {
        // If local data out of sync, queue refresh sync
        return (this.bookmarkSvc.checkIfRefreshSyncedDataOnError(err)
          ? this.refreshLocalSyncData()
          : this.$q.resolve()
        ).then(() => {
          // Recreate error object since Firefox does not send the original properly
          const errObj = { code: err.code, logged: err.logged };
          callback({ error: errObj, success: false });
        });
      });
  }
}
