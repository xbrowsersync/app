import angular from 'angular';
import { Injectable } from 'angular-ts-decorators';
import browser, { Bookmarks as NativeBookmarks } from 'webextension-polyfill';
import { BookmarkChangeType, BookmarkContainer } from '../../../../shared/bookmark/bookmark.enum';
import {
  AddNativeBookmarkChangeData,
  Bookmark,
  BookmarkChange,
  ModifyNativeBookmarkChangeData,
  MoveNativeBookmarkChangeData
} from '../../../../shared/bookmark/bookmark.interface';
import {
  BaseError,
  ContainerNotFoundError,
  FailedCreateNativeBookmarksError,
  FailedRemoveNativeBookmarksError
} from '../../../../shared/errors/errors';
import { WebpageMetadata } from '../../../../shared/global-shared.interface';
import { WebExtBookmarkService } from '../../../shared/webext-bookmark/webext-bookmark.service';

@Injectable('BookmarkService')
export class FirefoxBookmarkService extends WebExtBookmarkService {
  unsupportedContainers: string[] = [];

  clearNativeBookmarks(): ng.IPromise<void> {
    // Get native container ids
    return this.getNativeContainerIds()
      .then((nativeContainerIds) => {
        const menuBookmarksId = nativeContainerIds.get(BookmarkContainer.Menu);
        const otherBookmarksId = nativeContainerIds.get(BookmarkContainer.Other);
        const toolbarBookmarksId = nativeContainerIds.get(BookmarkContainer.Toolbar);

        // Clear menu bookmarks
        const clearMenu = browser.bookmarks
          .getChildren(menuBookmarksId)
          .then((results) => {
            return this.$q.all(
              results.map((child) => {
                return this.removeNativeBookmarks(child.id);
              })
            );
          })
          .catch((err) => {
            this.logSvc.logWarning('Error clearing bookmarks menu');
            throw err;
          });

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

        return this.$q.all([clearMenu, clearOthers, clearToolbar]).then(() => {});
      })
      .catch((err) => {
        throw new FailedRemoveNativeBookmarksError(undefined, err);
      });
  }

  createNativeBookmarksFromBookmarks(bookmarks: Bookmark[]): ng.IPromise<number> {
    // Get containers
    const menuContainer = this.bookmarkHelperSvc.getContainer(BookmarkContainer.Menu, bookmarks);
    const otherContainer = this.bookmarkHelperSvc.getContainer(BookmarkContainer.Other, bookmarks);
    const toolbarContainer = this.bookmarkHelperSvc.getContainer(BookmarkContainer.Toolbar, bookmarks);

    // Get native container ids
    return this.getNativeContainerIds()
      .then((nativeContainerIds) => {
        const menuBookmarksId = nativeContainerIds.get(BookmarkContainer.Menu);
        const otherBookmarksId = nativeContainerIds.get(BookmarkContainer.Other);
        const toolbarBookmarksId = nativeContainerIds.get(BookmarkContainer.Toolbar);

        // Populate menu bookmarks
        let populateMenu = this.$q.resolve(0);
        if (menuContainer) {
          populateMenu = browser.bookmarks
            .getSubTree(menuBookmarksId)
            .then(() => {
              return this.createNativeBookmarkTree(menuBookmarksId, menuContainer.children);
            })
            .catch((err) => {
              this.logSvc.logInfo('Error populating bookmarks menu.');
              throw err;
            });
        }

        // Populate other bookmarks
        let populateOther = this.$q.resolve(0);
        if (otherContainer) {
          populateOther = browser.bookmarks
            .getSubTree(otherBookmarksId)
            .then(() => {
              return this.createNativeBookmarkTree(otherBookmarksId, otherContainer.children);
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

        return this.$q.all([populateMenu, populateOther, populateToolbar]);
      })
      .then((totals) => {
        // Move native unsupported containers into the correct order
        return this.reorderUnsupportedContainers().then(() => {
          return totals.filter(Boolean).reduce((a, b) => a + b, 0);
        });
      });
  }

  createNativeSeparator(parentId: string): ng.IPromise<NativeBookmarks.BookmarkTreeNode> {
    const newSeparator: NativeBookmarks.CreateDetails = {
      parentId,
      type: 'separator'
    };
    return browser.bookmarks.create(newSeparator).catch((err) => {
      this.logSvc.logInfo('Failed to create native separator');
      throw new FailedCreateNativeBookmarksError(undefined, err);
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
        throw new BaseError(undefined, err);
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
        throw new BaseError(undefined, err);
      });
  }

  ensureContainersExist(bookmarks: Bookmark[]): Bookmark[] {
    if (angular.isUndefined(bookmarks)) {
      return;
    }

    // Add supported containers
    const bookmarksToReturn = angular.copy(bookmarks);
    this.bookmarkHelperSvc.getContainer(BookmarkContainer.Menu, bookmarksToReturn, true);
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

  fixMultipleMoveOldIndexes(): void {
    const processBatch = (batch) => {
      // Adjust oldIndexes if bookmarks moved to different parent or to higher indexes
      const [moveInfo] = batch;
      if (moveInfo.parentId !== moveInfo.oldParentId || moveInfo.index > moveInfo.oldIndex) {
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

  getNativeBookmarksAsBookmarks(): ng.IPromise<Bookmark[]> {
    let allNativeBookmarks = [];

    // Get native container ids
    return this.getNativeContainerIds()
      .then((nativeContainerIds) => {
        const menuBookmarksId = nativeContainerIds.get(BookmarkContainer.Menu);
        const otherBookmarksId = nativeContainerIds.get(BookmarkContainer.Other);
        const toolbarBookmarksId = nativeContainerIds.get(BookmarkContainer.Toolbar);

        // Get menu bookmarks
        const getMenuBookmarks =
          menuBookmarksId === undefined
            ? this.$q.resolve<Bookmark[]>(undefined)
            : browser.bookmarks.getSubTree(menuBookmarksId).then((subTree) => {
                const [menuContainer] = subTree;
                // Add all bookmarks into flat array
                this.bookmarkHelperSvc.eachBookmark((bookmark) => {
                  allNativeBookmarks.push(bookmark);
                }, menuContainer.children);
                return this.bookmarkHelperSvc.getNativeBookmarksAsBookmarks(menuContainer.children);
              });

        // Get other bookmarks
        const getOtherBookmarks =
          otherBookmarksId === undefined
            ? this.$q.resolve<Bookmark[]>(undefined)
            : browser.bookmarks.getSubTree(otherBookmarksId).then((subTree) => {
                const [otherContainer] = subTree;
                if (otherContainer.children.length === 0) {
                  return;
                }

                // Add all bookmarks into flat array
                this.bookmarkHelperSvc.eachBookmark((bookmark) => {
                  allNativeBookmarks.push(bookmark);
                }, otherContainer.children);

                // Convert native bookmarks sub tree to bookmarks
                const bookmarks = this.bookmarkHelperSvc.getNativeBookmarksAsBookmarks(otherContainer.children);

                // Remove any unsupported container folders present
                const bookmarksWithoutContainers = bookmarks.filter((x) => {
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
                const [toolbarContainer] = results;
                return this.settingsSvc.syncBookmarksToolbar().then((syncBookmarksToolbar) => {
                  if (syncBookmarksToolbar && toolbarContainer.children.length > 0) {
                    // Add all bookmarks into flat array
                    this.bookmarkHelperSvc.eachBookmark((bookmark) => {
                      allNativeBookmarks.push(bookmark);
                    }, toolbarContainer.children);
                    return this.bookmarkHelperSvc.getNativeBookmarksAsBookmarks(toolbarContainer.children);
                  }
                });
              });

        return this.$q.all([getMenuBookmarks, getOtherBookmarks, getToolbarBookmarks]);
      })
      .then((results) => {
        const [menuBookmarks, otherBookmarks, toolbarBookmarks] = results;
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
        const menuContainer = this.bookmarkHelperSvc.getContainer(BookmarkContainer.Menu, bookmarks, true);
        if (menuBookmarks?.length > 0) {
          menuContainer.children = menuBookmarks;
        }

        // Filter containers from flat array of bookmarks
        [otherContainer, toolbarContainer, menuContainer].forEach((container) => {
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
          this.bookmarkHelperSvc.eachBookmark((bookmark) => {
            if (
              !bookmark.id &&
              ((!nativeBookmark.url && bookmark.title === nativeBookmark.title) ||
                (nativeBookmark.url && bookmark.url === nativeBookmark.url))
            ) {
              bookmark.id = this.bookmarkHelperSvc.getNewBookmarkId(bookmarks);
            }
          }, bookmarks);
        });

        // Find and fix any bookmarks missing ids
        this.bookmarkHelperSvc.eachBookmark((bookmark) => {
          if (!bookmark.id) {
            bookmark.id = this.bookmarkHelperSvc.getNewBookmarkId(bookmarks);
          }
        }, bookmarks);

        return bookmarks;
      });
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
          const [root] = tree;
          const menuBookmarksNode = root.children.find((x) => {
            return x.id === 'menu________';
          });
          const otherBookmarksNode = root.children.find((x) => {
            return x.id === 'unfiled_____';
          });
          const toolbarBookmarksNode = root.children.find((x) => {
            return x.id === 'toolbar_____';
          });

          // Throw an error if a native container is not found
          if (!menuBookmarksNode || !otherBookmarksNode || !toolbarBookmarksNode) {
            if (!menuBookmarksNode) {
              this.logSvc.logWarning('Missing container: menu bookmarks');
            }
            if (!otherBookmarksNode) {
              this.logSvc.logWarning('Missing container: other bookmarks');
            }
            if (!toolbarBookmarksNode) {
              this.logSvc.logWarning('Missing container: toolbar bookmarks');
            }
            throw new ContainerNotFoundError();
          }

          // Add container ids to result
          containerIds.set(BookmarkContainer.Menu, menuBookmarksNode.id);
          containerIds.set(BookmarkContainer.Other, otherBookmarksNode.id);
          containerIds.set(BookmarkContainer.Toolbar, toolbarBookmarksNode.id);
          return containerIds;
        });
      });
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
      const [changedBookmark] = results;

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
    return (
      nativeBookmark.url && !this.bookmarkHelperSvc.nativeBookmarkIsSeparator(nativeBookmark)
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
        (changeInfo.changeData as AddNativeBookmarkChangeData).nativeBookmark.tags =
          this.utilitySvc.getTagArrayFromText(metadata.tags);
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
