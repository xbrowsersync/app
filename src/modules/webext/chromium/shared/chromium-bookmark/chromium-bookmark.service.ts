import angular from 'angular';
import { Injectable } from 'angular-ts-decorators';
import autobind from 'autobind-decorator';
import { Bookmarks as NativeBookmarks, browser } from 'webextension-polyfill-ts';
import {
  BookmarkChangeType,
  BookmarkContainer,
  BookmarkType,
  MandatoryBookmarkContainers
} from '../../../../shared/bookmark/bookmark.enum';
import {
  AddNativeBookmarkChangeData,
  Bookmark,
  BookmarkChange,
  ModifyNativeBookmarkChangeData,
  MoveNativeBookmarkChangeData
} from '../../../../shared/bookmark/bookmark.interface';
import * as Exceptions from '../../../../shared/exception/exception';
import Globals from '../../../../shared/global-shared.constants';
import { WebpageMetadata } from '../../../../shared/global-shared.interface';
import { NativeContainersInfo } from '../../../shared/webext-bookmark/NativeContainersInfo';
import WebExtBookmarkService from '../../../shared/webext-bookmark/webext-bookmark.service';

@autobind
@Injectable('BookmarkService')
export default class ChromiumBookmarkService extends WebExtBookmarkService {
  otherBookmarksNodeTitle = 'Other bookmarks';
  toolbarBookmarksNodeTitle = 'Bookmarks bar';
  menuBookmarksNodeTitle = 'Menu bookmarks';
  mobileBookmarksNodeTitle = 'Mobile bookmarks';
  unsupportedContainers = [BookmarkContainer.Menu, BookmarkContainer.Mobile];

  convertNativeBookmarkToSeparator(
    bookmark: NativeBookmarks.BookmarkTreeNode
  ): ng.IPromise<NativeBookmarks.BookmarkTreeNode> {
    // Check if bookmark is in toolbar
    return this.isNativeBookmarkIdOfToolbarContainer(bookmark.parentId)
      .then((inToolbar) => {
        // Skip process if bookmark is not in toolbar and already native separator
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
          url: this.platformSvc.getNewTabUrl()
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

  // TODO: unify with firefox somehow?
  // probably auto-detect all supported containers in getNativeContainer (maybe call it explicitely for detection?)
  // and then ensure that all supported containers are created
  ensureContainersExist(bookmarks: Bookmark[]): Bookmark[] {
    if (angular.isUndefined(bookmarks)) {
      return;
    }

    // Add supported containers
    const bookmarksToReturn = angular.copy(bookmarks);
    MandatoryBookmarkContainers.forEach((element) => {
      this.bookmarkHelperSvc.getContainer(element, bookmarksToReturn, true);
    });

    // Return sorted containers
    return bookmarksToReturn.sort((x, y) => {
      if (x.title < y.title) {
        return -1;
      }
      if (x.title > y.title) {
        return 1;
      }
      return 0;
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

  // TODO: unify/share more code with firefox
  getNativeContainerIds(): ng.IPromise<NativeContainersInfo> {    
    const containerIds = new NativeContainersInfo();
    // Populate container ids
    return browser.bookmarks.getTree().then((tree) => {
      // Get the root child nodes
      let otherBookmarksNode = tree[0].children.find((x) => {
        return x.title === this.otherBookmarksNodeTitle;
      });
      let toolbarBookmarksNode = tree[0].children.find((x) => {
        return x.title === this.toolbarBookmarksNodeTitle;
      });
      let menuBookmarksNode = tree[0].children.find((x) => {
        return x.title === this.menuBookmarksNodeTitle;
      });
      let mobileBookmarksNode = tree[0].children.find((x) => {
        return x.title === this.mobileBookmarksNodeTitle;
      });

      // TODO: improve this logic
      const defaultBookmarksNode = otherBookmarksNode || mobileBookmarksNode;
      if (!defaultBookmarksNode) {
        // coulnd not find a default container to create folders to place other containers in
        throw new Exceptions.ContainerNotFoundException();
      }

      // TODO: FINISH THIS!
      // is related to createNativeBookmarksFromBookmarks
      // HACK!!!!
      this.unsupportedContainers = [];

      // Check for unsupported containers
      if (!otherBookmarksNode) {
        this.logSvc.logWarning('Unsupported container: other bookmarks');
        // HACK!!!!
        this.unsupportedContainers.push(BookmarkContainer.Other);
        otherBookmarksNode = defaultBookmarksNode.children.find((x) => {
          return x.title === BookmarkContainer.Other;
        });
      }
      if (!toolbarBookmarksNode) {
        this.logSvc.logWarning('Unsupported container: toolbar bookmarks');
        // HACK!!!!
        this.unsupportedContainers.push(BookmarkContainer.Toolbar);
        toolbarBookmarksNode = defaultBookmarksNode.children.find((x) => {
          return x.title === BookmarkContainer.Toolbar;
        });
      }
      if (!menuBookmarksNode) {
        this.logSvc.logWarning('Unsupported container: menu bookmarks');
        // HACK!!!!
        this.unsupportedContainers.push(BookmarkContainer.Menu);
        menuBookmarksNode = defaultBookmarksNode.children.find((x) => {
          return x.title === BookmarkContainer.Menu;
        });
      }
      if (!mobileBookmarksNode) {
        this.logSvc.logWarning('Unsupported container: mobile bookmarks');
        // HACK!!!!
        this.unsupportedContainers.push(BookmarkContainer.Mobile);
        mobileBookmarksNode = defaultBookmarksNode.children.find((x) => {
          return x.title === BookmarkContainer.Mobile;
        });
      }

      // Add container ids to result
      {
        // must be always defined!
        containerIds.platformDefaultBookmarksNodeId = defaultBookmarksNode.id;
      }
      if (!angular.isUndefined(otherBookmarksNode)) {
        containerIds.set(BookmarkContainer.Other, otherBookmarksNode.id);
      }
      if (!angular.isUndefined(toolbarBookmarksNode)) {
        containerIds.set(BookmarkContainer.Toolbar, toolbarBookmarksNode.id);
      }
      if (!angular.isUndefined(menuBookmarksNode)) {
        containerIds.set(BookmarkContainer.Menu, menuBookmarksNode.id);
      }
      if (!angular.isUndefined(mobileBookmarksNode)) {
        containerIds.set(BookmarkContainer.Mobile, mobileBookmarksNode.id);
      }
      return containerIds;
    });
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

  syncNativeBookmarkCreated(id?: string, nativeBookmark?: NativeBookmarks.BookmarkTreeNode): ng.IPromise<void> {
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
