import { Injectable } from 'angular-ts-decorators';
import { autobind } from 'core-decorators';
import { Bookmarks as NativeBookmarks, browser } from 'webextension-polyfill-ts';
import { BookmarkChangeType } from '../../../shared/bookmark/bookmark.enum';
import {
  AddNativeBookmarkChangeData,
  BookmarkChange,
  ModifyNativeBookmarkChangeData,
  MoveNativeBookmarkChangeData
} from '../../../shared/bookmark/bookmark.interface';
import { WebpageMetadata } from '../../../shared/global-shared.interface';
import ChromiumBookmarkService from '../../chromium/chromium-bookmark/chromium-bookmark.service';

@autobind
@Injectable('NativeBookmarkService')
export default class FirefoxBookmarkService extends ChromiumBookmarkService {
  addBookmark(id: string, nativeBookmark: NativeBookmarks.BookmarkTreeNode): ng.IPromise<void> {
    // Create change info
    const data: AddNativeBookmarkChangeData = {
      nativeBookmark
    };
    const changeInfo: BookmarkChange = {
      changeData: data,
      type: BookmarkChangeType.Add
    };

    // If bookmark is not folder or separator, get page metadata from current tab
    return (nativeBookmark.url && !this.bookmarkSvc.isSeparator(nativeBookmark)
      ? this.platformSvc.getPageMetadata()
      : this.$q.resolve<WebpageMetadata>(null)
    ).then((metadata) => {
      // Add metadata if bookmark is current tab location
      if (metadata && nativeBookmark.url === metadata.url) {
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

  modifyBookmark(id: string): ng.IPromise<void> {
    // Retrieve full bookmark info
    return browser.bookmarks.getSubTree(id).then((results) => {
      const changedBookmark = results[0];

      // Create change info
      const data: ModifyNativeBookmarkChangeData = {
        nativeBookmark: changedBookmark
      };
      const changeInfo: BookmarkChange = {
        changeData: data,
        type: BookmarkChangeType.Modify
      };

      // Queue sync
      this.syncChange(changeInfo);
    });
  }

  moveBookmark(id: string, moveInfo: NativeBookmarks.OnMovedMoveInfoType): ng.IPromise<void> {
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
    return this.$q.resolve();
  }

  processBookmarkEventsQueue(): void {
    // Fix incorrect oldIndex values for multiple moves
    // https://bugzilla.mozilla.org/show_bug.cgi?id=1556427
    this.fixMultipleMoveOldIndexes();
    super.processBookmarkEventsQueue();
  }
}
