import angular from 'angular';
import { Injectable } from 'angular-ts-decorators';
import autobind from 'autobind-decorator';
import { Bookmarks as NativeBookmarks, browser } from 'webextension-polyfill-ts';
import { BookmarkChangeType, BookmarkContainer, BookmarkType } from '../../../../shared/bookmark/bookmark.enum';
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
import WebExtBookmarkService from '../../../shared/webext-bookmark/webext-bookmark.service';

@autobind
@Injectable('BookmarkService')
export default class ChromiumBookmarkService extends WebExtBookmarkService {
  otherBookmarksNodeId = '2';
  toolbarBookmarksNodeId = '1';
  unsupportedContainers = [BookmarkContainer.Menu, BookmarkContainer.Mobile];

  clearNativeBookmarks(): ng.IPromise<void> {
    // Get native container ids
    return this.getNativeContainerIds()
      .then((nativeContainerIds) => {
        const otherBookmarksId = nativeContainerIds.get(BookmarkContainer.Other);
        const toolbarBookmarksId = nativeContainerIds.get(BookmarkContainer.Toolbar);

        // Clear other bookmarks
        const clearOthers = browser.bookmarks
          .getChildren(otherBookmarksId)
          .then((results) => {
            return this.$q.all(
              results.map((child) => {
                return this.removeNativeBookmarks(child.id);
              })
            );
          })
          .catch((err) => {
            this.logSvc.logWarning('Error clearing other bookmarks');
            throw err;
          });

        // Clear bookmarks toolbar if enabled
        const clearToolbar = this.$q((resolve, reject) => {
          return this.settingsSvc
            .syncBookmarksToolbar()
            .then((syncBookmarksToolbar) => {
              if (!syncBookmarksToolbar) {
                this.logSvc.logInfo('Not clearing toolbar');
                resolve();
                return;
              }
              return browser.bookmarks.getChildren(toolbarBookmarksId).then((results) => {
                return this.$q.all(
                  results.map((child) => {
                    return this.removeNativeBookmarks(child.id);
                  })
                );
              });
            })
            .then(resolve)
            .catch((err) => {
              this.logSvc.logWarning('Error clearing bookmarks toolbar');
              reject(err);
            });
        });

        return this.$q.all([clearOthers, clearToolbar]).then(() => {});
      })
      .catch((err) => {
        throw new Exceptions.FailedRemoveNativeBookmarksException(undefined, err);
      });
  }

  convertNativeBookmarkToSeparator(
    bookmark: NativeBookmarks.BookmarkTreeNode
  ): ng.IPromise<NativeBookmarks.BookmarkTreeNode> {
    // Check if bookmark is in toolbar
    return this.isNativeBookmarkInToolbarContainer(bookmark)
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

  createNativeBookmarksFromBookmarks(bookmarks: Bookmark[]): ng.IPromise<number> {
    // Get containers
    const menuContainer = this.bookmarkHelperSvc.getContainer(BookmarkContainer.Menu, bookmarks);
    const mobileContainer = this.bookmarkHelperSvc.getContainer(BookmarkContainer.Mobile, bookmarks);
    const otherContainer = this.bookmarkHelperSvc.getContainer(BookmarkContainer.Other, bookmarks);
    const toolbarContainer = this.bookmarkHelperSvc.getContainer(BookmarkContainer.Toolbar, bookmarks);

    // Get native container ids
    return this.getNativeContainerIds()
      .then((nativeContainerIds) => {
        const otherBookmarksId = nativeContainerIds.get(BookmarkContainer.Other);
        const toolbarBookmarksId = nativeContainerIds.get(BookmarkContainer.Toolbar);

        // Populate menu bookmarks in other bookmarks
        let populateMenu = this.$q.resolve(0);
        if (menuContainer) {
          populateMenu = browser.bookmarks
            .getSubTree(otherBookmarksId)
            .then(() => {
              return this.createNativeBookmarkTree(otherBookmarksId, [menuContainer], toolbarBookmarksId);
            })
            .catch((err) => {
              this.logSvc.logInfo('Error populating bookmarks menu.');
              throw err;
            });
        }

        // Populate mobile bookmarks in other bookmarks
        let populateMobile = this.$q.resolve(0);
        if (mobileContainer) {
          populateMobile = browser.bookmarks
            .getSubTree(otherBookmarksId)
            .then(() => {
              return this.createNativeBookmarkTree(otherBookmarksId, [mobileContainer], toolbarBookmarksId);
            })
            .catch((err) => {
              this.logSvc.logInfo('Error populating mobile bookmarks.');
              throw err;
            });
        }

        // Populate other bookmarks
        let populateOther = this.$q.resolve(0);
        if (otherContainer) {
          populateOther = browser.bookmarks
            .getSubTree(otherBookmarksId)
            .then(() => {
              return this.createNativeBookmarkTree(otherBookmarksId, otherContainer.children, toolbarBookmarksId);
            })
            .catch((err) => {
              this.logSvc.logInfo('Error populating other bookmarks.');
              throw err;
            });
        }

        // Populate bookmarks toolbar if enabled
        const populateToolbar = this.$q<number>((resolve, reject) => {
          if (!toolbarContainer) {
            return resolve(0);
          }
          return this.settingsSvc
            .syncBookmarksToolbar()
            .then((syncBookmarksToolbar) => {
              if (!syncBookmarksToolbar) {
                this.logSvc.logInfo('Not populating toolbar');
                resolve();
                return;
              }
              return browser.bookmarks.getSubTree(toolbarBookmarksId).then(() => {
                return this.createNativeBookmarkTree(toolbarBookmarksId, toolbarContainer.children);
              });
            })
            .then(resolve)
            .catch((err) => {
              this.logSvc.logInfo('Error populating bookmarks toolbar.');
              reject(err);
            });
        });

        return this.$q.all([populateMenu, populateMobile, populateOther, populateToolbar]);
      })
      .then((totals) => {
        // Move native unsupported containers into the correct order
        return this.reorderUnsupportedContainers().then(() => {
          return totals.filter(Boolean).reduce((a, b) => a + b, 0);
        });
      });
  }

  createNativeSeparator(
    parentId: string,
    nativeToolbarContainerId: string
  ): ng.IPromise<NativeBookmarks.BookmarkTreeNode> {
    const newSeparator: NativeBookmarks.CreateDetails = {
      parentId,
      title:
        parentId === nativeToolbarContainerId
          ? Globals.Bookmarks.VerticalSeparatorTitle
          : Globals.Bookmarks.HorizontalSeparatorTitle,
      url: this.platformSvc.getNewTabUrl()
    };
    return browser.bookmarks.create(newSeparator).catch((err) => {
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

  ensureContainersExist(bookmarks: Bookmark[]): Bookmark[] {
    if (angular.isUndefined(bookmarks)) {
      return;
    }

    // Add supported containers
    const bookmarksToReturn = angular.copy(bookmarks);
    this.bookmarkHelperSvc.getContainer(BookmarkContainer.Other, bookmarksToReturn, true);
    this.bookmarkHelperSvc.getContainer(BookmarkContainer.Toolbar, bookmarksToReturn, true);

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

  getNativeBookmarksAsBookmarks(): ng.IPromise<Bookmark[]> {
    let allNativeBookmarks = [];

    // Get native container ids
    return this.getNativeContainerIds().then((nativeContainerIds) => {
      const menuBookmarksId = nativeContainerIds.get(BookmarkContainer.Menu);
      const mobileBookmarksId = nativeContainerIds.get(BookmarkContainer.Mobile);
      const otherBookmarksId = nativeContainerIds.get(BookmarkContainer.Other);
      const toolbarBookmarksId = nativeContainerIds.get(BookmarkContainer.Toolbar);

      // Get menu bookmarks
      const getMenuBookmarks =
        menuBookmarksId === undefined
          ? Promise.resolve<Bookmark[]>(undefined)
          : browser.bookmarks.getSubTree(menuBookmarksId).then((subTree) => {
              return this.bookmarkHelperSvc.getNativeBookmarksAsBookmarks(
                this.getNativeBookmarksWithSeparators(subTree[0].children)
              );
            });

      // Get mobile bookmarks
      const getMobileBookmarks =
        mobileBookmarksId === undefined
          ? Promise.resolve<Bookmark[]>(undefined)
          : browser.bookmarks.getSubTree(mobileBookmarksId).then((subTree) => {
              return this.bookmarkHelperSvc.getNativeBookmarksAsBookmarks(
                this.getNativeBookmarksWithSeparators(subTree[0].children)
              );
            });

      // Get other bookmarks
      const getOtherBookmarks =
        otherBookmarksId === undefined
          ? Promise.resolve<Bookmark[]>(undefined)
          : browser.bookmarks.getSubTree(otherBookmarksId).then((subTree) => {
              const otherBookmarks = subTree[0];
              if (otherBookmarks.children.length === 0) {
                return;
              }

              // Add all bookmarks into flat array
              this.bookmarkHelperSvc.eachBookmark(otherBookmarks.children, (bookmark) => {
                allNativeBookmarks.push(bookmark);
              });

              // Remove any unsupported container folders present
              const bookmarksWithoutContainers = this.bookmarkHelperSvc
                .getNativeBookmarksAsBookmarks(this.getNativeBookmarksWithSeparators(otherBookmarks.children))
                .filter((x) => {
                  return !this.unsupportedContainers.find((y) => {
                    return y === x.title;
                  });
                });
              return bookmarksWithoutContainers;
            });

      // Get toolbar bookmarks if enabled
      const getToolbarBookmarks =
        toolbarBookmarksId === undefined
          ? this.$q.resolve<Bookmark[]>(undefined)
          : browser.bookmarks.getSubTree(toolbarBookmarksId).then((results) => {
              const toolbarBookmarks = results[0];
              return this.settingsSvc.syncBookmarksToolbar().then((syncBookmarksToolbar) => {
                if (syncBookmarksToolbar && toolbarBookmarks.children.length > 0) {
                  // Add all bookmarks into flat array
                  this.bookmarkHelperSvc.eachBookmark(toolbarBookmarks.children, (bookmark) => {
                    allNativeBookmarks.push(bookmark);
                  });
                  return this.bookmarkHelperSvc.getNativeBookmarksAsBookmarks(
                    this.getNativeBookmarksWithSeparators(toolbarBookmarks.children)
                  );
                }
              });
            });

      return this.$q
        .all([getMenuBookmarks, getMobileBookmarks, getOtherBookmarks, getToolbarBookmarks])
        .then((results) => {
          const menuBookmarks = results[0];
          const mobileBookmarks = results[1];
          const otherBookmarks = results[2];
          const toolbarBookmarks = results[3];
          const bookmarks: Bookmark[] = [];

          // Add other container if bookmarks present
          const otherContainer = this.bookmarkHelperSvc.getContainer(BookmarkContainer.Other, bookmarks, true);
          if (otherBookmarks?.length > 0) {
            otherContainer.children = otherBookmarks;
          }

          // Add toolbar container if bookmarks present
          const toolbarContainer = this.bookmarkHelperSvc.getContainer(BookmarkContainer.Toolbar, bookmarks, true);
          if (toolbarBookmarks?.length > 0) {
            toolbarContainer.children = toolbarBookmarks;
          }

          // Add menu container if bookmarks present
          let menuContainer: Bookmark;
          if (menuBookmarksId !== undefined) {
            menuContainer = this.bookmarkHelperSvc.getContainer(BookmarkContainer.Menu, bookmarks, true);
            if (menuBookmarks?.length > 0) {
              menuContainer.children = menuBookmarks;
            }
          }

          // Add mobile container if bookmarks present
          let mobileContainer: Bookmark;
          if (mobileBookmarksId !== undefined) {
            mobileContainer = this.bookmarkHelperSvc.getContainer(BookmarkContainer.Mobile, bookmarks, true);
            if (mobileBookmarks?.length > 0) {
              mobileContainer.children = mobileBookmarks;
            }
          }

          // Filter containers from flat array of bookmarks
          [otherContainer, toolbarContainer, menuContainer, mobileContainer].forEach((container) => {
            if (!container) {
              return;
            }

            allNativeBookmarks = allNativeBookmarks.filter((bookmark) => {
              return bookmark.title !== container.title;
            });
          });

          // Sort by date added asc
          allNativeBookmarks = allNativeBookmarks.sort((x, y) => {
            return x.dateAdded - y.dateAdded;
          });

          // Iterate native bookmarks to add unique bookmark ids in correct order
          allNativeBookmarks.forEach((nativeBookmark) => {
            this.bookmarkHelperSvc.eachBookmark(bookmarks, (bookmark) => {
              if (
                !bookmark.id &&
                ((!nativeBookmark.url && bookmark.title === nativeBookmark.title) ||
                  (nativeBookmark.url && bookmark.url === nativeBookmark.url))
              ) {
                bookmark.id = this.bookmarkHelperSvc.getNewBookmarkId(bookmarks);
              }
            });
          });

          // Find and fix any bookmarks missing ids
          this.bookmarkHelperSvc.eachBookmark(bookmarks, (bookmark) => {
            if (!bookmark.id) {
              bookmark.id = this.bookmarkHelperSvc.getNewBookmarkId(bookmarks);
            }
          });

          return bookmarks;
        });
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
      return bookmark;
    });
    return nativeBookmarks;
  }

  getNativeContainerIds(): ng.IPromise<Map<BookmarkContainer, string>> {
    return this.utilitySvc
      .isSyncEnabled()
      .then((syncEnabled) => (syncEnabled ? this.bookmarkHelperSvc.getCachedBookmarks() : undefined))
      .then((bookmarks) => {
        // Initialise container ids object using containers defined in bookmarks
        const containerIds = new Map<BookmarkContainer, string>();
        if (!angular.isUndefined(bookmarks)) {
          bookmarks.forEach((x) => {
            containerIds.set(x.title as BookmarkContainer, undefined);
          });
        }

        // Populate container ids
        return browser.bookmarks.getTree().then((tree) => {
          // Get the root child nodes
          const otherBookmarksNode = tree[0].children.find((x) => {
            return x.id === this.otherBookmarksNodeId;
          });
          const toolbarBookmarksNode = tree[0].children.find((x) => {
            return x.id === this.toolbarBookmarksNodeId;
          });

          // Throw an error if a native container node is not found
          if (!otherBookmarksNode || !toolbarBookmarksNode) {
            if (!otherBookmarksNode) {
              this.logSvc.logWarning('Missing container: other bookmarks');
            }
            if (!toolbarBookmarksNode) {
              this.logSvc.logWarning('Missing container: toolbar bookmarks');
            }
            throw new Exceptions.ContainerNotFoundException();
          }

          // Check for unsupported containers
          const menuBookmarksNode = otherBookmarksNode.children.find((x) => {
            return x.title === BookmarkContainer.Menu;
          });
          const mobileBookmarksNode = otherBookmarksNode.children.find((x) => {
            return x.title === BookmarkContainer.Mobile;
          });

          // Add container ids to result
          containerIds.set(BookmarkContainer.Other, otherBookmarksNode.id);
          containerIds.set(BookmarkContainer.Toolbar, toolbarBookmarksNode.id);
          if (!angular.isUndefined(menuBookmarksNode)) {
            containerIds.set(BookmarkContainer.Menu, menuBookmarksNode.id);
          }
          if (!angular.isUndefined(mobileBookmarksNode)) {
            containerIds.set(BookmarkContainer.Mobile, mobileBookmarksNode.id);
          }
          return containerIds;
        });
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
