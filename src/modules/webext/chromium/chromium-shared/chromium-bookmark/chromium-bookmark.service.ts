import angular from 'angular';
import { Injectable } from 'angular-ts-decorators';
import autobind from 'autobind-decorator';
import { Bookmarks as NativeBookmarks, browser } from 'webextension-polyfill-ts';
import { BookmarkChangeType, BookmarkContainer } from '../../../../shared/bookmark/bookmark.enum';
import {
  AddNativeBookmarkChangeData,
  Bookmark,
  BookmarkChange,
  BookmarkService,
  ModifyNativeBookmarkChangeData,
  MoveNativeBookmarkChangeData
} from '../../../../shared/bookmark/bookmark.interface';
import * as Exceptions from '../../../../shared/exception/exception';
import Globals from '../../../../shared/global-shared.constants';
import { WebpageMetadata } from '../../../../shared/global-shared.interface';
import WebExtBookmarkService from '../../../webext-shared/webext-bookmark/webext-bookmark.service';

@autobind
@Injectable('BookmarkService')
export default class ChromiumBookmarkService extends WebExtBookmarkService implements BookmarkService {
  otherBookmarksNodeId = '2';
  toolbarBookmarksNodeId = '1';
  unsupportedContainers = [BookmarkContainer.Menu, BookmarkContainer.Mobile];

  clearNativeBookmarks(): ng.IPromise<void> {
    // Get native container ids
    return this.getNativeContainerIds()
      .then((nativeContainerIds) => {
        const otherBookmarksId = nativeContainerIds[BookmarkContainer.Other] as string;
        const toolbarBookmarksId = nativeContainerIds[BookmarkContainer.Toolbar] as string;

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
                return resolve();
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

  createNativeBookmarksFromBookmarks(bookmarks: Bookmark[]): ng.IPromise<number> {
    // Get containers
    const menuContainer = this.bookmarkHelperSvc.getContainer(BookmarkContainer.Menu, bookmarks);
    const mobileContainer = this.bookmarkHelperSvc.getContainer(BookmarkContainer.Mobile, bookmarks);
    const otherContainer = this.bookmarkHelperSvc.getContainer(BookmarkContainer.Other, bookmarks);
    const toolbarContainer = this.bookmarkHelperSvc.getContainer(BookmarkContainer.Toolbar, bookmarks);

    // Get native container ids
    return this.getNativeContainerIds()
      .then((nativeContainerIds) => {
        const otherBookmarksId: string = nativeContainerIds[BookmarkContainer.Other];
        const toolbarBookmarksId: string = nativeContainerIds[BookmarkContainer.Toolbar];

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
                return resolve();
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
                if (menuBookmarks.children?.length > 0) {
                  return this.bookmarkHelperSvc.getNativeBookmarksAsBookmarks(menuBookmarks.children);
                }
              });

        // Get mobile bookmarks
        const getMobileBookmarks =
          mobileBookmarksId == null
            ? Promise.resolve<Bookmark[]>(null)
            : browser.bookmarks.getSubTree(mobileBookmarksId).then((subTree) => {
                const mobileBookmarks = subTree[0];
                if (mobileBookmarks.children?.length > 0) {
                  return this.bookmarkHelperSvc.getNativeBookmarksAsBookmarks(mobileBookmarks.children);
                }
              });

        // Get other bookmarks
        const getOtherBookmarks =
          otherBookmarksId == null
            ? Promise.resolve<Bookmark[]>(null)
            : browser.bookmarks.getSubTree(otherBookmarksId).then((subTree) => {
                const otherBookmarks = subTree[0];
                if (otherBookmarks.children?.length === 0) {
                  return;
                }

                // Add all bookmarks into flat array
                this.bookmarkHelperSvc.eachBookmark(otherBookmarks.children, (bookmark) => {
                  allNativeBookmarks.push(bookmark);
                });

                // Remove any unsupported container folders present
                const bookmarksWithoutContainers = this.bookmarkHelperSvc
                  .getNativeBookmarksAsBookmarks(otherBookmarks.children)
                  .filter((x) => {
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
            : browser.bookmarks.getSubTree(toolbarBookmarksId).then((results) => {
                const toolbarBookmarks = results[0];
                return this.settingsSvc.syncBookmarksToolbar().then((syncBookmarksToolbar) => {
                  if (!syncBookmarksToolbar) {
                    return;
                  }
                  if (toolbarBookmarks.children?.length > 0) {
                    // Add all bookmarks into flat array
                    this.bookmarkHelperSvc.eachBookmark(toolbarBookmarks.children, (bookmark) => {
                      allNativeBookmarks.push(bookmark);
                    });
                    return this.bookmarkHelperSvc.getNativeBookmarksAsBookmarks(toolbarBookmarks.children);
                  }
                });
              });

        return this.$q.all([getMenuBookmarks, getMobileBookmarks, getOtherBookmarks, getToolbarBookmarks]);
      })
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
        if (menuBookmarks?.length > 0) {
          menuContainer = this.bookmarkHelperSvc.getContainer(BookmarkContainer.Menu, bookmarks, true);
          menuContainer.children = menuBookmarks;
        }

        // Add mobile container if bookmarks present
        let mobileContainer: Bookmark;
        if (mobileBookmarks?.length > 0) {
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

      // Add containers to results
      const containerIds = {};
      containerIds[BookmarkContainer.Other] = otherBookmarksNode.id;
      containerIds[BookmarkContainer.Toolbar] = toolbarBookmarksNode.id;

      // Check for unsupported containers
      const menuBookmarksNode = otherBookmarksNode.children.find((x) => {
        return x.title === BookmarkContainer.Menu;
      });
      const mobileBookmarksNode = otherBookmarksNode.children.find((x) => {
        return x.title === BookmarkContainer.Mobile;
      });
      containerIds[BookmarkContainer.Menu] = menuBookmarksNode ? menuBookmarksNode.id : undefined;
      containerIds[BookmarkContainer.Mobile] = mobileBookmarksNode ? mobileBookmarksNode.id : undefined;

      return containerIds;
    });
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
      (this.bookmarkHelperSvc.isSeparator(changedBookmark)
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
    return (this.bookmarkHelperSvc.isSeparator(nativeBookmark)
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
      return (bookmarkNode.url && !this.bookmarkHelperSvc.isSeparator(bookmarkNode)
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
      return (this.bookmarkHelperSvc.isSeparator(movedBookmark)
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

  wasContainerChanged(
    changedNativeBookmark: NativeBookmarks.BookmarkTreeNode,
    bookmarks: Bookmark[]
  ): ng.IPromise<boolean> {
    return this.$q
      .resolve()
      .then(() => {
        return bookmarks ?? this.bookmarkHelperSvc.getCachedBookmarks();
      })
      .then((results) => {
        const syncedBookmarks = results;

        // Check based on title
        if (this.bookmarkHelperSvc.bookmarkIsContainer(changedNativeBookmark)) {
          return true;
        }

        // Get native container ids
        return this.getNativeContainerIds().then((nativeContainerIds) => {
          // If parent is other bookmarks, check other bookmarks children for containers
          const otherBookmarksId = nativeContainerIds[BookmarkContainer.Other];
          if ((changedNativeBookmark as NativeBookmarks.BookmarkTreeNode).parentId !== otherBookmarksId) {
            return false;
          }

          return browser.bookmarks
            .getChildren(otherBookmarksId)
            .then((children) => {
              // Get all native bookmarks in other bookmarks that are unsupported containers
              const containers = children.filter((x) => {
                return this.unsupportedContainers.find((y) => {
                  return y === x.title;
                });
              });
              let containersCount = 0;
              let checksFailed = false;
              let count;

              // Check each container present only appears once
              const menuContainer = this.bookmarkHelperSvc.getContainer(BookmarkContainer.Menu, syncedBookmarks, false);
              if (menuContainer) {
                containersCount += 1;
                count = containers.filter((x) => {
                  return x.title === BookmarkContainer.Menu;
                }).length;
                checksFailed = count !== 1 ? true : checksFailed;
              }

              const mobileContainer = this.bookmarkHelperSvc.getContainer(
                BookmarkContainer.Mobile,
                syncedBookmarks,
                false
              );
              if (mobileContainer) {
                containersCount += 1;
                count = containers.filter((x) => {
                  return x.title === BookmarkContainer.Mobile;
                }).length;
                checksFailed = count !== 1 ? true : checksFailed;
              }

              // Check number of containers match and return result
              checksFailed = containersCount !== containers.length ? true : checksFailed;
              return checksFailed;
            })
            .catch((err) => {
              this.logSvc.logInfo(
                `Failed to detect whether container changed: ${JSON.stringify(changedNativeBookmark)}`
              );
              throw new Exceptions.FailedGetNativeBookmarksException(undefined, err);
            });
        });
      });
  }
}
