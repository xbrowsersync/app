import { Injectable } from 'angular-ts-decorators';
import { autobind } from 'core-decorators';
import { Bookmarks as NativeBookmarks, browser } from 'webextension-polyfill-ts';
import Strings from '../../../../../res/strings/en.json';
import { BookmarkContainer } from '../../../shared/bookmark/bookmark.enum';
import { Bookmark } from '../../../shared/bookmark/bookmark.interface';
import * as Exceptions from '../../../shared/exception/exception';
import WebExtPlatformService from '../../webext-platform/webext-platform.service';

@autobind
@Injectable('PlatformService')
export default class FirefoxPlatformService extends WebExtPlatformService {
  nativeConfigUrlRegex = /^about:/i;
  supportedNativeBookmarkUrlRegex = /^(?!chrome|data)[\w-]+:/i;
  unsupportedContainers = [];

  bookmarks_Clear(): ng.IPromise<void> {
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
        const clearToolbar = this.bookmarkSvc
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

  bookmarks_Get(): ng.IPromise<Bookmark[]> {
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
                  this.bookmarkSvc.eachBookmark(menuBookmarks.children, (bookmark) => {
                    allNativeBookmarks.push(bookmark);
                  });

                  return this.getNativeBookmarksAsBookmarks(menuBookmarks.children);
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
                  this.bookmarkSvc.eachBookmark(mobileBookmarks.children, (bookmark) => {
                    allNativeBookmarks.push(bookmark);
                  });

                  return this.getNativeBookmarksAsBookmarks(mobileBookmarks.children);
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
                this.bookmarkSvc.eachBookmark(otherBookmarks.children, (bookmark) => {
                  allNativeBookmarks.push(bookmark);
                });

                // Convert native bookmarks sub tree to bookmarks
                const bookmarks = this.getNativeBookmarksAsBookmarks(otherBookmarks.children);

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
                .all([this.bookmarkSvc.getSyncBookmarksToolbar(), browser.bookmarks.getSubTree(toolbarBookmarksId)])
                .then((results) => {
                  const syncBookmarksToolbar = results[0];
                  const toolbarBookmarks = results[1][0];

                  if (!syncBookmarksToolbar) {
                    return;
                  }

                  if (toolbarBookmarks.children && toolbarBookmarks.children.length > 0) {
                    // Add all bookmarks into flat array
                    this.bookmarkSvc.eachBookmark(toolbarBookmarks.children, (bookmark) => {
                      allNativeBookmarks.push(bookmark);
                    });
                    return this.getNativeBookmarksAsBookmarks(toolbarBookmarks.children);
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
          otherContainer = this.bookmarkSvc.getContainer(BookmarkContainer.Other, bookmarks, true);
          otherContainer.children = otherBookmarks;
        }

        // Add toolbar container if bookmarks present
        if (toolbarBookmarks && toolbarBookmarks.length > 0) {
          toolbarContainer = this.bookmarkSvc.getContainer(BookmarkContainer.Toolbar, bookmarks, true);
          toolbarContainer.children = toolbarBookmarks;
        }

        // Add menu container if bookmarks present
        if (menuBookmarks && menuBookmarks.length > 0) {
          menuContainer = this.bookmarkSvc.getContainer(BookmarkContainer.Menu, bookmarks, true);
          menuContainer.children = menuBookmarks;
        }

        // Add mobile container if bookmarks present
        if (mobileBookmarks && mobileBookmarks.length > 0) {
          mobileContainer = this.bookmarkSvc.getContainer(BookmarkContainer.Mobile, bookmarks, true);
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
          this.bookmarkSvc.eachBookmark(bookmarks, (bookmark) => {
            if (
              !bookmark.id &&
              ((!nativeBookmark.url && bookmark.title === nativeBookmark.title) ||
                (nativeBookmark.url && bookmark.url === nativeBookmark.url))
            ) {
              bookmark.id = this.bookmarkSvc.getNewBookmarkId(bookmarks);
            }
          });
        });

        // Find and fix any bookmarks missing ids
        this.bookmarkSvc.eachBookmark(bookmarks, (bookmark) => {
          if (!bookmark.id) {
            bookmark.id = this.bookmarkSvc.getNewBookmarkId(bookmarks);
          }
        });

        return bookmarks;
      });
  }

  bookmarks_Populate(bookmarks: Bookmark[]): ng.IPromise<void> {
    const populateStartTime = new Date();

    // Get containers
    const menuContainer = this.bookmarkSvc.getContainer(BookmarkContainer.Menu, bookmarks);
    const mobileContainer = this.bookmarkSvc.getContainer(BookmarkContainer.Mobile, bookmarks);
    const otherContainer = this.bookmarkSvc.getContainer(BookmarkContainer.Other, bookmarks);
    const toolbarContainer = this.bookmarkSvc.getContainer(BookmarkContainer.Toolbar, bookmarks);

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
        const populateToolbar = this.bookmarkSvc.getSyncBookmarksToolbar().then((syncBookmarksToolbar) => {
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
        // Move local containers into the correct order
        return this.bookmarks_ReorderContainers();
      });
  }

  createNativeSeparator(parentId: string): ng.IPromise<NativeBookmarks.BookmarkTreeNode> {
    const newSeparator: NativeBookmarks.CreateDetails = {
      parentId,
      type: 'separator'
    };
    return browser.bookmarks.create(newSeparator as any).catch((err) => {
      this.logSvc.logInfo('Failed to create local separator');
      throw new Exceptions.FailedCreateNativeBookmarksException(null, err);
    });
  }

  getHelpPages(): string[] {
    const pages = [
      this.getConstant(Strings.help_Page_Welcome_Desktop_Content),
      this.getConstant(Strings.help_Page_BeforeYouBegin_Firefox_Content),
      this.getConstant(Strings.help_Page_FirstSync_Desktop_Content),
      this.getConstant(Strings.help_Page_Service_Content),
      this.getConstant(Strings.help_Page_SyncId_Content),
      this.getConstant(Strings.help_Page_ExistingId_Desktop_Content),
      this.getConstant(Strings.help_Page_Searching_Desktop_Content),
      this.getConstant(Strings.help_Page_AddingBookmarks_Firefox_Content),
      this.getConstant(Strings.help_Page_NativeFeatures_Firefox_Content),
      this.getConstant(Strings.help_Page_BackingUp_Desktop_Content),
      this.getConstant(Strings.help_Page_Shortcuts_Firefox_Content),
      this.getConstant(Strings.help_Page_Mobile_Content),
      this.getConstant(Strings.help_Page_FurtherSupport_Content)
    ];

    return pages;
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

      // Throw an error if a local container is not found
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

  getNewTabUrl(): string {
    return 'about:newtab';
  }
}
