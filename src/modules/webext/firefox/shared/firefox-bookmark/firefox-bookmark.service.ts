import { Injectable } from 'angular-ts-decorators';
import autobind from 'autobind-decorator';
import { Bookmarks as NativeBookmarks, browser } from 'webextension-polyfill-ts';
import { BookmarkChangeType, BookmarkContainer } from '../../../../shared/bookmark/bookmark.enum';
import {
  AddNativeBookmarkChangeData,
  BookmarkChange,
  ModifyNativeBookmarkChangeData,
  MoveNativeBookmarkChangeData
} from '../../../../shared/bookmark/bookmark.interface';
import * as Exceptions from '../../../../shared/exception/exception';
import { WebpageMetadata } from '../../../../shared/global-shared.interface';
import WebExtBookmarkService from '../../../shared/webext-bookmark/webext-bookmark.service';

@autobind
@Injectable('BookmarkService')
export default class FirefoxBookmarkService extends WebExtBookmarkService {
  createNativeSeparator(parentId: string): ng.IPromise<NativeBookmarks.BookmarkTreeNode> {
    const newSeparator: NativeBookmarks.CreateDetails = {
      parentId,
      type: 'separator'
    };
    return browser.bookmarks.create(newSeparator).catch((err) => {
      this.logSvc.logInfo('Failed to create native separator');
      throw new Exceptions.FailedCreateNativeBookmarksException(undefined, err);
    });
  }

  disableEventListeners(): ng.IPromise<void> {
    return this.$q
      .all([
        browser.bookmarks.onCreated.removeListener(this.onNativeBookmarkCreated),
        browser.bookmarks.onRemoved.removeListener(this.onNativeBookmarkRemoved),
        browser.bookmarks.onChanged.removeListener(this.onNativeBookmarkChanged),
        browser.bookmarks.onMoved.removeListener(this.onNativeBookmarkMoved)
      ])
      .then(() => {})
      .catch((err) => {
        this.logSvc.logWarning('Failed to disable event listeners');
        throw new Exceptions.UnspecifiedException(undefined, err);
      });
  }

  enableEventListeners(): ng.IPromise<void> {
    return this.disableEventListeners()
      .then(() => {
        return this.utilitySvc.isSyncEnabled();
      })
      .then((syncEnabled) => {
        if (!syncEnabled) {
          return;
        }
        browser.bookmarks.onCreated.addListener(this.onNativeBookmarkCreated);
        browser.bookmarks.onRemoved.addListener(this.onNativeBookmarkRemoved);
        browser.bookmarks.onChanged.addListener(this.onNativeBookmarkChanged);
        browser.bookmarks.onMoved.addListener(this.onNativeBookmarkMoved);
      })
      .catch((err) => {
        this.logSvc.logWarning('Failed to enable event listeners');
        throw new Exceptions.UnspecifiedException(undefined, err);
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

    const finalBatch = this.nativeBookmarkEventsQueue.reduce((currentBatch, currentEvent, currentIndex) => {
      // Check the current event is a move
      if (currentEvent[0] === this.syncNativeBookmarkMoved) {
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
            currentMoveInfo.index === this.nativeBookmarkEventsQueue[currentIndex - 1][1][1].index + 1)
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

  supportedContainersInfo = new Map<BookmarkContainer, { id: string; throwIfNotFound: boolean }>([
    [BookmarkContainer.Menu, { id: 'menu________', throwIfNotFound: true }],
    [BookmarkContainer.Other, { id: 'unfiled_____', throwIfNotFound: true }],
    [BookmarkContainer.Toolbar, { id: 'toolbar_____', throwIfNotFound: true }],
    [BookmarkContainer.Mobile, { id: 'mobile______', throwIfNotFound: true }]
  ]);

  getNativeContainerInfo(containerName: BookmarkContainer): ng.IPromise<{ id?: string; throwIfNotFound: boolean }> {
    return browser.bookmarks.getTree().then((tree) => {
      const baseInfo = this.supportedContainersInfo.get(containerName);
      let info: { id?: string; throwIfNotFound: boolean };
      if (baseInfo && tree[0].children!.find((x) => x.id === baseInfo.id)) {
        info = { ...baseInfo }; // make a copy
      } else {
        info = { id: undefined, throwIfNotFound: false };
      }
      return info;
    });
  }

  getDefaultNativeContainerCandidates(): BookmarkContainer[] {
    return [BookmarkContainer.Other];
  }

  processNativeBookmarkEventsQueue(): void {
    // Fix incorrect oldIndex values for multiple moves
    // https://bugzilla.mozilla.org/show_bug.cgi?id=1556427
    this.fixMultipleMoveOldIndexes();
    super.processNativeBookmarkEventsQueue();
  }

  syncNativeBookmarkChanged(id: string): ng.IPromise<void> {
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

  syncNativeBookmarkCreated(id: string, nativeBookmark: NativeBookmarks.BookmarkTreeNode): ng.IPromise<void> {
    // Create change info
    const data: AddNativeBookmarkChangeData = {
      nativeBookmark
    };
    const changeInfo: BookmarkChange = {
      changeData: data,
      type: BookmarkChangeType.Add
    };

    // If bookmark is not folder or separator, get page metadata from current tab
    return (nativeBookmark.url && !this.bookmarkHelperSvc.nativeBookmarkIsSeparator(nativeBookmark)
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

  syncNativeBookmarkMoved(id: string, moveInfo: NativeBookmarks.OnMovedMoveInfoType): ng.IPromise<void> {
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
}
