/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-plusplus */
/* eslint-disable prefer-destructuring */
/* eslint-disable consistent-return */
/* eslint-disable @typescript-eslint/camelcase */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable no-param-reassign */

import { Injectable } from 'angular-ts-decorators';
import { browser } from 'webextension-polyfill-ts';
import _ from 'underscore';
import { autobind } from 'core-decorators';
import Strings from '../../../res/strings/en.json';
import {
  FailedRemoveLocalBookmarksException,
  FailedCreateLocalBookmarksException,
  LocalContainerNotFoundException
} from '../shared/exceptions/exception';
import Globals from '../shared/globals';
import WebExtPlatformService from '../webext/webext-platform.service';

@autobind
@Injectable('PlatformService')
export default class FirefoxPlatformService extends WebExtPlatformService {
  nativeConfigUrlRegex = /^about:/i;
  separatorTypeName = 'separator';
  supportedLocalBookmarkUrlRegex = /^(?!chrome|data)[\w-]+:/i;
  unsupportedContainers = [];

  bookmarks_Clear() {
    // Get local container node ids
    return this.getLocalContainerIds()
      .then((localContainerIds) => {
        const menuBookmarksId = localContainerIds[Globals.Bookmarks.MenuContainerName];
        const mobileBookmarksId = localContainerIds[Globals.Bookmarks.MobileContainerName];
        const otherBookmarksId = localContainerIds[Globals.Bookmarks.OtherContainerName];
        const toolbarBookmarksId = localContainerIds[Globals.Bookmarks.ToolbarContainerName];

        // Clear menu bookmarks
        const clearMenu = browser.bookmarks
          .getChildren(menuBookmarksId)
          .then((results) => {
            return this.$q.all(
              results.map((child) => {
                return this.deleteLocalBookmarksTree(child.id);
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
                return this.deleteLocalBookmarksTree(child.id);
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
                return this.deleteLocalBookmarksTree(child.id);
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
                  return this.deleteLocalBookmarksTree(child.id);
                })
              );
            });
          })
          .catch((err) => {
            this.logSvc.logWarning('Error clearing bookmarks toolbar');
            throw err;
          });
        return this.$q.all([clearMenu, clearMobile, clearOthers, clearToolbar]);
      })
      .catch((err) => {
        throw new FailedRemoveLocalBookmarksException(null, err);
      });
  }

  bookmarks_Get(addBookmarkIds) {
    addBookmarkIds = addBookmarkIds || true;
    let allLocalBookmarks = [];

    // Get local container node ids
    return this.getLocalContainerIds()
      .then((localContainerIds) => {
        const menuBookmarksId = localContainerIds[Globals.Bookmarks.MenuContainerName];
        const mobileBookmarksId = localContainerIds[Globals.Bookmarks.MobileContainerName];
        const otherBookmarksId = localContainerIds[Globals.Bookmarks.OtherContainerName];
        const toolbarBookmarksId = localContainerIds[Globals.Bookmarks.ToolbarContainerName];

        // Get menu bookmarks
        const getMenuBookmarks =
          menuBookmarksId == null
            ? this.$q.resolve()
            : browser.bookmarks.getSubTree(menuBookmarksId).then((subTree) => {
                const menuBookmarks = subTree[0];

                if (menuBookmarks.children && menuBookmarks.children.length > 0) {
                  // Add all bookmarks into flat array
                  this.bookmarkSvc.eachBookmark(menuBookmarks.children, (bookmark) => {
                    allLocalBookmarks.push(bookmark);
                  });

                  return this.getLocalBookmarksAsXBookmarks(menuBookmarks.children);
                }
              });

        // Get mobile bookmarks
        const getMobileBookmarks =
          mobileBookmarksId == null
            ? this.$q.resolve()
            : browser.bookmarks.getSubTree(mobileBookmarksId).then((subTree) => {
                const mobileBookmarks = subTree[0];

                if (mobileBookmarks.children && mobileBookmarks.children.length > 0) {
                  // Add all bookmarks into flat array
                  this.bookmarkSvc.eachBookmark(mobileBookmarks.children, (bookmark) => {
                    allLocalBookmarks.push(bookmark);
                  });

                  return this.getLocalBookmarksAsXBookmarks(mobileBookmarks.children);
                }
              });

        // Get other bookmarks
        const getOtherBookmarks =
          otherBookmarksId == null
            ? this.$q.resolve()
            : browser.bookmarks.getSubTree(otherBookmarksId).then((subTree) => {
                const otherBookmarks = subTree[0];
                if (!otherBookmarks.children || otherBookmarks.children.length === 0) {
                  return;
                }

                // Add all bookmarks into flat array
                this.bookmarkSvc.eachBookmark(otherBookmarks.children, (bookmark) => {
                  allLocalBookmarks.push(bookmark);
                });

                // Convert local bookmarks sub tree to xbookmarks
                const xBookmarks = this.getLocalBookmarksAsXBookmarks(otherBookmarks.children);

                // Remove any unsupported container folders present
                const xBookmarksWithoutContainers = xBookmarks.filter((x) => {
                  return !this.unsupportedContainers.find((y) => {
                    return y === x.title;
                  });
                });
                return xBookmarksWithoutContainers;
              });

        // Get toolbar bookmarks if enabled
        const getToolbarBookmarks =
          toolbarBookmarksId == null
            ? this.$q.resolve()
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
                      allLocalBookmarks.push(bookmark);
                    });
                    return this.getLocalBookmarksAsXBookmarks(toolbarBookmarks.children);
                  }
                });

        return this.$q.all([getMenuBookmarks, getMobileBookmarks, getOtherBookmarks, getToolbarBookmarks]);
      })
      .then((results) => {
        const menuBookmarks = results[0] as any[];
        const mobileBookmarks = results[1] as any[];
        const otherBookmarks = results[2] as any[];
        const toolbarBookmarks = results[3] as any[];
        const xBookmarks = [];
        let otherContainer;
        let toolbarContainer;
        let menuContainer;
        let mobileContainer;

        // Add other container if bookmarks present
        if (otherBookmarks && otherBookmarks.length > 0) {
          otherContainer = this.bookmarkSvc.getContainer(Globals.Bookmarks.OtherContainerName, xBookmarks, true);
          otherContainer.children = otherBookmarks;
        }

        // Add toolbar container if bookmarks present
        if (toolbarBookmarks && toolbarBookmarks.length > 0) {
          toolbarContainer = this.bookmarkSvc.getContainer(Globals.Bookmarks.ToolbarContainerName, xBookmarks, true);
          toolbarContainer.children = toolbarBookmarks;
        }

        // Add menu container if bookmarks present
        if (menuBookmarks && menuBookmarks.length > 0) {
          menuContainer = this.bookmarkSvc.getContainer(Globals.Bookmarks.MenuContainerName, xBookmarks, true);
          menuContainer.children = menuBookmarks;
        }

        // Add mobile container if bookmarks present
        if (mobileBookmarks && mobileBookmarks.length > 0) {
          mobileContainer = this.bookmarkSvc.getContainer(Globals.Bookmarks.MobileContainerName, xBookmarks, true);
          mobileContainer.children = mobileBookmarks;
        }

        // Filter containers from flat array of bookmarks
        [otherContainer, toolbarContainer, menuContainer, mobileContainer].forEach((container) => {
          if (!container) {
            return;
          }

          allLocalBookmarks = allLocalBookmarks.filter((bookmark) => {
            return bookmark.title !== container.title;
          });
        });

        // Sort by date added asc
        allLocalBookmarks = allLocalBookmarks.sort((x, y) => {
          return x.dateAdded - y.dateAdded;
        });

        // Iterate local bookmarks to add unique bookmark ids in correct order
        allLocalBookmarks.forEach((localBookmark) => {
          this.bookmarkSvc.eachBookmark(xBookmarks, (xBookmark) => {
            if (
              !xBookmark.id &&
              ((!localBookmark.url && xBookmark.title === localBookmark.title) ||
                (localBookmark.url && xBookmark.url === localBookmark.url))
            ) {
              xBookmark.id = this.bookmarkSvc.getNewBookmarkId(xBookmarks);
            }
          });
        });

        // Find and fix any bookmarks missing ids
        this.bookmarkSvc.eachBookmark(xBookmarks, (xBookmark) => {
          if (!xBookmark.id) {
            xBookmark.id = this.bookmarkSvc.getNewBookmarkId(xBookmarks);
          }
        });

        return xBookmarks;
      });
  }

  bookmarks_Populate(xBookmarks) {
    const populateStartTime = new Date();

    // Get containers
    const menuContainer = this.bookmarkSvc.getContainer(Globals.Bookmarks.MenuContainerName, xBookmarks);
    const mobileContainer = this.bookmarkSvc.getContainer(Globals.Bookmarks.MobileContainerName, xBookmarks);
    const otherContainer = this.bookmarkSvc.getContainer(Globals.Bookmarks.OtherContainerName, xBookmarks);
    const toolbarContainer = this.bookmarkSvc.getContainer(Globals.Bookmarks.ToolbarContainerName, xBookmarks);

    // Get local container node ids
    return this.getLocalContainerIds()
      .then((localContainerIds) => {
        const menuBookmarksId = localContainerIds[Globals.Bookmarks.MenuContainerName];
        const mobileBookmarksId = localContainerIds[Globals.Bookmarks.MobileContainerName];
        const otherBookmarksId = localContainerIds[Globals.Bookmarks.OtherContainerName];
        const toolbarBookmarksId = localContainerIds[Globals.Bookmarks.ToolbarContainerName];

        // Populate menu bookmarks
        let populateMenu = this.$q.resolve();
        if (menuContainer) {
          populateMenu = browser.bookmarks
            .getSubTree(menuBookmarksId)
            .then((results) => {
              return this.createLocalBookmarksFromXBookmarks(menuBookmarksId, menuContainer.children);
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
            .then((results) => {
              return this.createLocalBookmarksFromXBookmarks(mobileBookmarksId, mobileContainer.children);
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
            .then((results) => {
              return this.createLocalBookmarksFromXBookmarks(otherBookmarksId, otherContainer.children);
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
              .then((results) => {
                return this.createLocalBookmarksFromXBookmarks(toolbarBookmarksId, toolbarContainer.children);
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
        this.logSvc.logInfo(
          `Local bookmarks populated in ${((new Date() as any) - (populateStartTime as any)) / 1000}s`
        );
        // Move local containers into the correct order
        return this.reorderLocalContainers();
      });
  }

  createLocalSeparator(parentId) {
    const newLocalSeparator = {
      parentId,
      type: this.separatorTypeName
    };

    return browser.bookmarks.create(newLocalSeparator as any).catch((err) => {
      this.logSvc.logInfo('Failed to create local separator');
      throw new FailedCreateLocalBookmarksException(null, err);
    });
  }

  getHelpPages() {
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

  getLocalContainerIds() {
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
        throw new LocalContainerNotFoundException();
      }

      // Return the container ids
      const results = {};
      results[Globals.Bookmarks.MenuContainerName] = menuBookmarksNode.id;
      results[Globals.Bookmarks.MobileContainerName] = mobileBookmarksNode.id;
      results[Globals.Bookmarks.OtherContainerName] = otherBookmarksNode.id;
      results[Globals.Bookmarks.ToolbarContainerName] = toolbarBookmarksNode.id;
      return results;
    });
  }

  getNewTabUrl() {
    return 'about:newtab';
  }
}
