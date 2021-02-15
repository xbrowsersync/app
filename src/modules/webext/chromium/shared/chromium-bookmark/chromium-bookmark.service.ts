import angular from 'angular';
import { Injectable } from 'angular-ts-decorators';
import autobind from 'autobind-decorator';
import { Bookmarks as NativeBookmarks, browser } from 'webextension-polyfill-ts';
import { BookmarkChangeType, BookmarkContainer, BookmarkType } from '../../../../shared/bookmark/bookmark.enum';
import {
  AddNativeBookmarkChangeData,
  BookmarkChange,
  ModifyNativeBookmarkChangeData,
  MoveNativeBookmarkChangeData
} from '../../../../shared/bookmark/bookmark.interface';
import * as Exceptions from '../../../../shared/exception/exception';
import Globals from '../../../../shared/global-shared.constants';
import { WebpageMetadata } from '../../../../shared/global-shared.interface';
import WebExtBookmarkService from '../../../shared/webext-bookmark/webext-bookmark.service';

@autobind
@Injectable('BookmarkService')
export default class ChromiumBookmarkService extends WebExtBookmarkService {
  convertNativeBookmarkToSeparator(
    bookmark: NativeBookmarks.BookmarkTreeNode
  ): ng.IPromise<NativeBookmarks.BookmarkTreeNode> {
    // Check if bookmark is in toolbar
    return this.isNativeBookmarkIdOfToolbarContainer(bookmark.parentId)
      .then((inToolbar) => {
        // Skip process if bookmark is not in toolbar and already native separator
        if (
          (bookmark.url === this.platformSvc.getNewTabUrl!() &&
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
              url: this.platformSvc.getNewTabUrl!()
            };
            return browser.bookmarks.remove(bookmark.id).then(() => {
              return browser.bookmarks.create(separator);
            });
          })
          .finally(this.enableEventListeners);
      })
      .then((nativeSeparator: NativeBookmarks.BookmarkTreeNode) => {
        // Set type to separator to identify type when syncing
        nativeSeparator.type = BookmarkType.Separator;
        return nativeSeparator;
      });
  }

  createNativeSeparator(parentId: string): ng.IPromise<NativeBookmarks.BookmarkTreeNode> {
    return this.isNativeBookmarkIdOfToolbarContainer(parentId)
      .then((inToolbar) => {
        const newSeparator: NativeBookmarks.CreateDetails = {
          parentId,
          title: inToolbar ? Globals.Bookmarks.VerticalSeparatorTitle : Globals.Bookmarks.HorizontalSeparatorTitle,
          url: this.platformSvc.getNewTabUrl!()
        };
        return browser.bookmarks.create(newSeparator);
      })
      .catch((err) => {
        this.logSvc.logInfo('Failed to create native separator');
        throw new Exceptions.FailedCreateNativeBookmarksException(undefined, err);
      });
  }

  disableEventListeners(): ng.IPromise<void> {
    return this.$q
      .all([
        (browser.bookmarks as any).onChildrenReordered.removeListener(this.onNativeBookmarkChildrenReordered),
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
        (browser.bookmarks as any).onChildrenReordered.addListener(this.onNativeBookmarkChildrenReordered);
        browser.bookmarks.onMoved.addListener(this.onNativeBookmarkMoved);
      })
      .catch((err) => {
        this.logSvc.logWarning('Failed to enable event listeners');
        throw new Exceptions.UnspecifiedException(undefined, err);
      });
  }

  getNativeBookmarksWithSeparators(
    nativeBookmarks: NativeBookmarks.BookmarkTreeNode[]
  ): NativeBookmarks.BookmarkTreeNode[] {
    // Check very bookmark setting type to separator to identify type when syncing
    this.bookmarkHelperSvc.eachBookmark(nativeBookmarks, (bookmark) => {
      if (this.isSeparator(bookmark)) {
        bookmark.type = BookmarkType.Separator;
      }
    });
    return nativeBookmarks;
  }

  browserDetection: { isOpera: boolean };
  getBrowserDetection() {
    if (this.browserDetection) return this.browserDetection;

    const browserDetection: any = {};
    browserDetection.isChromeLike = this.utilitySvc.isChromeLikeBrowser();
    browserDetection.isOpera = this.utilitySvc.isOperaBrowser();
    browserDetection.isEdgeChromium = this.utilitySvc.isEdgeChromiumBrowser();

    this.browserDetection = browserDetection;
    return this.browserDetection;
  }

  chromiumSupportedContainersInfo = {
    map: new Map<BookmarkContainer, { id: string; throwIfNotFound: boolean }>([
      [BookmarkContainer.Toolbar, { id: '1', throwIfNotFound: false }],
      [BookmarkContainer.Other, { id: '2', throwIfNotFound: false }],
      [BookmarkContainer.Mobile, { id: '3', throwIfNotFound: false }]
    ]),
    default: [BookmarkContainer.Other, BookmarkContainer.Mobile]
  };

  operaSupportedContainersInfo = {
    map: new Map<BookmarkContainer, { id: string; throwIfNotFound: boolean }>([
      [BookmarkContainer.Toolbar, { id: 'bookmarks_bar', throwIfNotFound: false }],
      [BookmarkContainer.Other, { id: 'other', throwIfNotFound: true }]
      // [, { id: 'unsorted', throwIfNotFound: false }],
      // [, { id: 'user_root', throwIfNotFound: false }],
      // [, { id: 'shared', throwIfNotFound: false }],
      // [, { id: 'trash', throwIfNotFound: false }],
      // [, { id: 'speed_dial', throwIfNotFound: false }],
    ]),
    default: [BookmarkContainer.Other]
  };

  getNativeContainerInfo(containerName: BookmarkContainer): ng.IPromise<{ id?: string; throwIfNotFound: boolean }> {
    const browserDetection = this.getBrowserDetection();
    if (browserDetection.isOpera) {
      const getByName: (
        id: string,
        callback: (node: NativeBookmarks.BookmarkTreeNode) => void
      ) => void = (browser as any).bookmarks.getRootByName;

      const baseInfo = this.operaSupportedContainersInfo.map.get(containerName);
      if (baseInfo) {
        return this.$q((resolve) => {
          getByName(baseInfo.id, (node) => {
            resolve({ id: node.id, throwIfNotFound: baseInfo.throwIfNotFound });
          });
        });
        // eslint-disable-next-line no-else-return
      } else {
        return this.$q.resolve({ id: undefined, throwIfNotFound: false });
      }
      // eslint-disable-next-line no-else-return
    } else {
      return browser.bookmarks.getTree().then((tree) => {
        const baseInfo = this.chromiumSupportedContainersInfo.map.get(containerName);
        let info: { id?: string; throwIfNotFound: boolean };
        if (baseInfo && tree[0].children!.find((x) => x.id === baseInfo.id)) {
          info = { ...baseInfo }; // make a copy
        } else {
          info = { id: undefined, throwIfNotFound: false };
        }
        return info;
      });
    }
  }

  getDefaultNativeContainerCandidates(): BookmarkContainer[] {
    const browserDetection = this.getBrowserDetection();
    if (browserDetection.isOpera) {
      return this.operaSupportedContainersInfo.default;
      // eslint-disable-next-line no-else-return
    } else {
      return this.chromiumSupportedContainersInfo.default;
    }
  }

  isSeparator(nativeBookmark: NativeBookmarks.BookmarkTreeNode): boolean {
    // Native bookmark is separator if title is dashes or designated separator title
    // and has no url and no children
    const separatorRegex = new RegExp('^[-─]{1,}$');
    return (
      !angular.isUndefined(nativeBookmark.title) &&
      ((separatorRegex.test(nativeBookmark.title ?? '') && !nativeBookmark.children?.length) ||
        ((nativeBookmark.title!.indexOf(Globals.Bookmarks.HorizontalSeparatorTitle) >= 0 ||
          nativeBookmark.title === Globals.Bookmarks.VerticalSeparatorTitle) &&
          nativeBookmark.url === this.platformSvc.getNewTabUrl!()))
    );
  }

  onNativeBookmarkChildrenReordered(...args: any[]): void {
    this.logSvc.logInfo('onChildrenReordered event detected');
    this.queueNativeBookmarkEvent(BookmarkChangeType.ChildrenReordered, ...args);
  }

  syncNativeBookmarkChanged(id?: string): ng.IPromise<void> {
    // Retrieve full bookmark info
    return browser.bookmarks.getSubTree(id).then((results) => {
      const changedBookmark = results[0];

      // If bookmark is separator update native bookmark properties
      (this.isSeparator(changedBookmark)
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

  syncNativeBookmarkCreated(id: string, nativeBookmark: NativeBookmarks.BookmarkTreeNode): ng.IPromise<void> {
    // If bookmark is separator update native bookmark properties
    return (this.isSeparator(nativeBookmark)
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
      return (bookmarkNode.url && !this.isSeparator(bookmarkNode)
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

  syncNativeBookmarkMoved(id?: string, moveInfo?: NativeBookmarks.OnMovedMoveInfoType): ng.IPromise<void> {
    return browser.bookmarks.get(id).then((results) => {
      const movedBookmark = results[0];

      // If bookmark is separator update native bookmark properties
      return (this.isSeparator(movedBookmark)
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
}
