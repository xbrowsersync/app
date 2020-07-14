import { Injectable } from 'angular-ts-decorators';
import { autobind } from 'core-decorators';
import { Bookmarks as NativeBookmarks, browser } from 'webextension-polyfill-ts';
import { BookmarkChangeType, BookmarkContainer } from '../../../shared/bookmark/bookmark.enum';
import {
  AddNativeBookmarkChangeData,
  Bookmark,
  BookmarkChange,
  BookmarkService,
  ModifyNativeBookmarkChangeData,
  MoveNativeBookmarkChangeData
} from '../../../shared/bookmark/bookmark.interface';
import * as Exceptions from '../../../shared/exception/exception';
import { WebpageMetadata } from '../../../shared/global-shared.interface';
import WebExtBookmarkService from '../../webext-bookmark/webext-bookmark.service';

@autobind
@Injectable('BookmarkService')
export default class FirefoxBookmarkService extends WebExtBookmarkService implements BookmarkService {
  unsupportedContainers = [];

  clearNativeBookmarks(): ng.IPromise<void> {
    // Get native container ids
    return this.getNativeContainerIds()
      .then((nativeContainerIds) => {
        const menuBookmarksId = nativeContainerIds[BookmarkContainer.Menu];
        const mobileBookmarksId = nativeContainerIds[BookmarkContainer.Mobile];
        const otherBookmarksId = nativeContainerIds[BookmarkContainer.Other];
        const toolbarBookmarksId = nativeContainerIds[BookmarkContainer.Toolbar];

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

        // Clear mobile bookmarks
        const clearMobile = browser.bookmarks
          .getChildren(mobileBookmarksId)
          .then((results) => {
            return this.$q.all(
              results.map((child) => {
                return this.removeNativeBookmarks(child.id);
              })
            );
          })
          .catch((err) => {
            this.logSvc.logWarning('Error clearing mobile bookmarks');
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
        const clearToolbar = this.bookmarkHelperSvc
          .getSyncBookmarksToolbar()
          .then((syncBookmarksToolbar) => {
            if (!syncBookmarksToolbar) {
              this.logSvc.logInfo('Not clearing toolbar');
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
          .catch((err) => {
            this.logSvc.logWarning('Error clearing bookmarks toolbar');
            throw err;
          });
        return this.$q.all([clearMenu, clearMobile, clearOthers, clearToolbar]).then(() => {});
      })
      .catch((err) => {
        throw new Exceptions.FailedRemoveNativeBookmarksException(null, err);
      });
  }

  createNativeBookmarksFromBookmarks(bookmarks: Bookmark[]): ng.IPromise<void> {
    const populateStartTime = new Date();

    // Get containers
    const menuContainer = this.bookmarkHelperSvc.getContainer(BookmarkContainer.Menu, bookmarks);
    const mobileContainer = this.bookmarkHelperSvc.getContainer(BookmarkContainer.Mobile, bookmarks);
    const otherContainer = this.bookmarkHelperSvc.getContainer(BookmarkContainer.Other, bookmarks);
    const toolbarContainer = this.bookmarkHelperSvc.getContainer(BookmarkContainer.Toolbar, bookmarks);

    // Get native container ids
    return this.getNativeContainerIds()
      .then((nativeContainerIds) => {
        const menuBookmarksId: string = nativeContainerIds[BookmarkContainer.Menu];
        const mobileBookmarksId: string = nativeContainerIds[BookmarkContainer.Mobile];
        const otherBookmarksId: string = nativeContainerIds[BookmarkContainer.Other];
        const toolbarBookmarksId: string = nativeContainerIds[BookmarkContainer.Toolbar];

        // Populate menu bookmarks
        let populateMenu = this.$q.resolve();
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

        // Populate mobile bookmarks
        let populateMobile = this.$q.resolve();
        if (mobileContainer) {
          populateMobile = browser.bookmarks
            .getSubTree(mobileBookmarksId)
            .then(() => {
              return this.createNativeBookmarkTree(mobileBookmarksId, mobileContainer.children);
            })
            .catch((err) => {
              this.logSvc.logInfo('Error populating mobile bookmarks.');
              throw err;
            });
        }

        // Populate other bookmarks
        let populateOther = this.$q.resolve();
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
        const populateToolbar = this.bookmarkHelperSvc.getSyncBookmarksToolbar().then((syncBookmarksToolbar) => {
          if (!syncBookmarksToolbar) {
            this.logSvc.logInfo('Not populating toolbar');
            return;
          }

          if (toolbarContainer) {
            return browser.bookmarks
              .getSubTree(toolbarBookmarksId)
              .then(() => {
                return this.createNativeBookmarkTree(toolbarBookmarksId, toolbarContainer.children);
              })
              .catch((err) => {
                this.logSvc.logInfo('Error populating bookmarks toolbar.');
                throw err;
              });
          }
        });

        return this.$q.all([populateMenu, populateMobile, populateOther, populateToolbar]);
      })
      .then(() => {
        this.logSvc.logInfo(`Bookmarks populated in ${((new Date() as any) - (populateStartTime as any)) / 1000}s`);
        // Move native unsupported containers into the correct order
        return this.reorderUnsupportedContainers();
      });
  }

  createNativeSeparator(parentId: string): ng.IPromise<NativeBookmarks.BookmarkTreeNode> {
    const newSeparator: NativeBookmarks.CreateDetails = {
      parentId,
      type: 'separator'
    };
    return browser.bookmarks.create(newSeparator).catch((err) => {
      this.logSvc.logInfo('Failed to create native separator');
      throw new Exceptions.FailedCreateNativeBookmarksException(null, err);
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

  getNativeBookmarksAsBookmarks(): ng.IPromise<Bookmark[]> {
    let allNativeBookmarks = [];

    // Get native container ids
    return this.getNativeContainerIds()
      .then((nativeContainerIds) => {
        const menuBookmarksId: string = nativeContainerIds[BookmarkContainer.Menu];
        const mobileBookmarksId: string = nativeContainerIds[BookmarkContainer.Mobile];
        const otherBookmarksId: string = nativeContainerIds[BookmarkContainer.Other];
        const toolbarBookmarksId: string = nativeContainerIds[BookmarkContainer.Toolbar];

        // Get menu bookmarks
        const getMenuBookmarks =
          menuBookmarksId == null
            ? Promise.resolve<Bookmark[]>(null)
            : browser.bookmarks.getSubTree(menuBookmarksId).then((subTree) => {
                const menuBookmarks = subTree[0];

                if (menuBookmarks.children && menuBookmarks.children.length > 0) {
                  // Add all bookmarks into flat array
                  this.bookmarkHelperSvc.eachBookmark(menuBookmarks.children, (bookmark) => {
                    allNativeBookmarks.push(bookmark);
                  });

                  return this.bookmarkHelperSvc.getNativeBookmarksAsBookmarks(menuBookmarks.children);
                }
              });

        // Get mobile bookmarks
        const getMobileBookmarks =
          mobileBookmarksId == null
            ? Promise.resolve<Bookmark[]>(null)
            : browser.bookmarks.getSubTree(mobileBookmarksId).then((subTree) => {
                const mobileBookmarks = subTree[0];

                if (mobileBookmarks.children && mobileBookmarks.children.length > 0) {
                  // Add all bookmarks into flat array
                  this.bookmarkHelperSvc.eachBookmark(mobileBookmarks.children, (bookmark) => {
                    allNativeBookmarks.push(bookmark);
                  });

                  return this.bookmarkHelperSvc.getNativeBookmarksAsBookmarks(mobileBookmarks.children);
                }
              });

        // Get other bookmarks
        const getOtherBookmarks =
          otherBookmarksId == null
            ? Promise.resolve<Bookmark[]>(null)
            : browser.bookmarks.getSubTree(otherBookmarksId).then((subTree) => {
                const otherBookmarks = subTree[0];
                if (!otherBookmarks.children || otherBookmarks.children.length === 0) {
                  return;
                }

                // Add all bookmarks into flat array
                this.bookmarkHelperSvc.eachBookmark(otherBookmarks.children, (bookmark) => {
                  allNativeBookmarks.push(bookmark);
                });

                // Convert native bookmarks sub tree to bookmarks
                const bookmarks = this.bookmarkHelperSvc.getNativeBookmarksAsBookmarks(otherBookmarks.children);

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
          toolbarBookmarksId == null
            ? this.$q.resolve<Bookmark[]>(null)
            : this.$q
                .all([
                  this.bookmarkHelperSvc.getSyncBookmarksToolbar(),
                  browser.bookmarks.getSubTree(toolbarBookmarksId)
                ])
                .then((results) => {
                  const syncBookmarksToolbar = results[0];
                  const toolbarBookmarks = results[1][0];

                  if (!syncBookmarksToolbar) {
                    return;
                  }

                  if (toolbarBookmarks.children && toolbarBookmarks.children.length > 0) {
                    // Add all bookmarks into flat array
                    this.bookmarkHelperSvc.eachBookmark(toolbarBookmarks.children, (bookmark) => {
                      allNativeBookmarks.push(bookmark);
                    });
                    return this.bookmarkHelperSvc.getNativeBookmarksAsBookmarks(toolbarBookmarks.children);
                  }
                });

        return this.$q.all([getMenuBookmarks, getMobileBookmarks, getOtherBookmarks, getToolbarBookmarks]);
      })
      .then((results) => {
        const menuBookmarks = results[0];
        const mobileBookmarks = results[1];
        const otherBookmarks = results[2];
        const toolbarBookmarks = results[3];
        const bookmarks: Bookmark[] = [];
        let otherContainer: Bookmark;
        let toolbarContainer: Bookmark;
        let menuContainer: Bookmark;
        let mobileContainer: Bookmark;

        // Add other container if bookmarks present
        if (otherBookmarks && otherBookmarks.length > 0) {
          otherContainer = this.bookmarkHelperSvc.getContainer(BookmarkContainer.Other, bookmarks, true);
          otherContainer.children = otherBookmarks;
        }

        // Add toolbar container if bookmarks present
        if (toolbarBookmarks && toolbarBookmarks.length > 0) {
          toolbarContainer = this.bookmarkHelperSvc.getContainer(BookmarkContainer.Toolbar, bookmarks, true);
          toolbarContainer.children = toolbarBookmarks;
        }

        // Add menu container if bookmarks present
        if (menuBookmarks && menuBookmarks.length > 0) {
          menuContainer = this.bookmarkHelperSvc.getContainer(BookmarkContainer.Menu, bookmarks, true);
          menuContainer.children = menuBookmarks;
        }

        // Add mobile container if bookmarks present
        if (mobileBookmarks && mobileBookmarks.length > 0) {
          mobileContainer = this.bookmarkHelperSvc.getContainer(BookmarkContainer.Mobile, bookmarks, true);
          mobileContainer.children = mobileBookmarks;
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
  }

  getNativeContainerIds(): ng.IPromise<any> {
    return browser.bookmarks.getTree().then((tree) => {
      // Get the root child nodes
      const menuBookmarksNode = tree[0].children.find((x) => {
        return x.id === 'menu________';
      });
      const mobileBookmarksNode = tree[0].children.find((x) => {
        return x.id === 'mobile______';
      });
      const otherBookmarksNode = tree[0].children.find((x) => {
        return x.id === 'unfiled_____';
      });
      const toolbarBookmarksNode = tree[0].children.find((x) => {
        return x.id === 'toolbar_____';
      });

      // Throw an error if a native container is not found
      if (!menuBookmarksNode || !mobileBookmarksNode || !otherBookmarksNode || !toolbarBookmarksNode) {
        if (!menuBookmarksNode) {
          this.logSvc.logWarning('Missing container: menu bookmarks');
        }
        if (!mobileBookmarksNode) {
          this.logSvc.logWarning('Missing container: mobile bookmarks');
        }
        if (!otherBookmarksNode) {
          this.logSvc.logWarning('Missing container: other bookmarks');
        }
        if (!toolbarBookmarksNode) {
          this.logSvc.logWarning('Missing container: toolbar bookmarks');
        }
        throw new Exceptions.ContainerNotFoundException();
      }

      // Return the container ids
      const containerIds = {};
      containerIds[BookmarkContainer.Menu] = menuBookmarksNode.id;
      containerIds[BookmarkContainer.Mobile] = mobileBookmarksNode.id;
      containerIds[BookmarkContainer.Other] = otherBookmarksNode.id;
      containerIds[BookmarkContainer.Toolbar] = toolbarBookmarksNode.id;
      return containerIds;
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
    return (nativeBookmark.url && !this.bookmarkHelperSvc.isSeparator(nativeBookmark)
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
