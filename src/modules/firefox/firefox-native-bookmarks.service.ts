import angular from 'angular';
import { Injectable } from 'angular-ts-decorators';
import { autobind } from 'core-decorators';
import { Bookmarks as NativeBookmarks } from 'webextension-polyfill-ts';
import BookmarkChange from '../../interfaces/bookmark-change.interface';
import WebpageMetadata from '../../interfaces/webpage-metadata.interface';
import ChromiumNativeBookmarksService from '../chromium/chromium-native-bookmarks.service';
import BookmarkChangeType from '../shared/bookmark/bookmark-change-type.enum';
import Bookmark from '../shared/bookmark/bookmark.interface';

@autobind
@Injectable('NativeBookmarksService')
export default class FirefoxNativeBookmarksService extends ChromiumNativeBookmarksService {
  changeBookmark(id: string, changes: NativeBookmarks.OnChangedChangeInfoType): ng.IPromise<void> {
    // Create change info
    const changeInfo: BookmarkChange = {
      bookmark: angular.copy(changes),
      type: BookmarkChangeType.Update
    };
    changeInfo.bookmark.id = id;

    // Queue sync
    this.syncChange(changeInfo);
    return this.$q.resolve();
  }

  createBookmark(id: string, createdBookmark: NativeBookmarks.BookmarkTreeNode): ng.IPromise<void> {
    // Create change info
    const changeInfo: BookmarkChange = {
      bookmark: angular.copy(createdBookmark),
      type: BookmarkChangeType.Create
    };
    changeInfo.bookmark.id = id;

    // If bookmark is not folder or separator, get page metadata from current tab
    return (createdBookmark.url && !this.bookmarkSvc.isSeparator(createdBookmark)
      ? this.platformSvc.getPageMetadata()
      : this.$q.resolve<WebpageMetadata>(null)
    ).then((metadata) => {
      // Add metadata if bookmark is current tab location
      if (metadata && createdBookmark.url === metadata.url) {
        changeInfo.bookmark.title = this.utilitySvc.stripTags(metadata.title);
        (changeInfo.bookmark as Bookmark).description = this.utilitySvc.stripTags(metadata.description);
        (changeInfo.bookmark as Bookmark).tags = this.utilitySvc.getTagArrayFromText(metadata.tags);
      }

      // Queue sync
      this.syncChange(changeInfo);
      return this.$q.resolve();
    });
  }

  fixMultipleMoveOldIndexes(): void {
    const processBatch = (batch) => {
      // Adjust oldIndexes if bookmarks moved to different parent or to higher indexes
      if (batch[0].parentId !== batch[0].oldParentId || batch[0].index > batch[0].oldIndex) {
        for (let i = batch.length - 1; i >= 0; i -= 1) {
          batch[i].oldIndex -= 1;
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

  moveBookmark(id: string, moveInfo: NativeBookmarks.OnMovedMoveInfoType): ng.IPromise<void> {
    // Create change info
    const changeInfo: BookmarkChange = {
      bookmark: angular.copy(moveInfo) as any,
      type: BookmarkChangeType.Move
    };
    changeInfo.bookmark.id = id;

    // Queue sync
    this.syncChange(changeInfo);
    return this.$q.resolve();
  }

  processBookmarkEventsQueue(): void {
    // Fix incorrect oldIndex values for multiple moves
    // https://bugzilla.mozilla.org/show_bug.cgi?id=1556427
    this.fixMultipleMoveOldIndexes();
    super.processBookmarkEventsQueue();
  }
}
