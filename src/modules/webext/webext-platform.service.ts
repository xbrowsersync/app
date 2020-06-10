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
import angular from 'angular';
import _ from 'underscore';
import { autobind } from 'core-decorators';
import BookmarkIdMapperService from './bookmark-id-mapper.service';
import Globals from '../shared/globals';
import Platform from '../shared/platform.interface';
import StoreService from '../shared/store.service';
import UtilityService from '../shared/utility.service';
import BookmarkService from '../shared/bookmark.service';
import Strings from '../../../res/strings/en.json';

@autobind
@Injectable('PlatformService')
export default class WebExtPlatformService implements Platform {
  $interval: ng.IIntervalService;
  $q: ng.IQService;
  $timeout: ng.ITimeoutService;
  bookmarkIdMapperSvc: BookmarkIdMapperService;
  bookmarkSvc: BookmarkService;
  storeSvc: StoreService;
  utilitySvc: UtilityService;

  contentScriptUrl = 'assets/webpage-metadata-collecter.js';
  loadingId: string;
  nativeConfigUrlRegex = /chrome:\/\//i;
  optionalPermissions = {
    origins: ['http://*/', 'https://*/']
  };
  refreshInterfaceTimeout: any;
  supportedLocalBookmarkUrlRegex = /^[\w-]+:/i;
  unsupportedContainers = [Globals.Bookmarks.MenuContainerName, Globals.Bookmarks.MobileContainerName];
  vm: any;

  static $inject = [
    '$interval',
    '$q',
    '$timeout',
    'BookmarkIdMapperService',
    'BookmarkService',
    'StoreService',
    'UtilityService'
  ];
  constructor(
    $interval: ng.IIntervalService,
    $q: ng.IQService,
    $timeout: ng.ITimeoutService,
    BookmarkIdMapperSvc: BookmarkIdMapperService,
    BookmarkSvc: BookmarkService,
    StoreSvc: StoreService,
    UtilitySvc: UtilityService
  ) {
    this.$interval = $interval;
    this.$q = $q;
    this.$timeout = $timeout;
    this.bookmarkIdMapperSvc = BookmarkIdMapperSvc;
    this.bookmarkSvc = BookmarkSvc;
    this.storeSvc = StoreSvc;
    this.utilitySvc = UtilitySvc;
  }

  automaticUpdates_NextUpdate() {
    return browser.alarms.get(Globals.Alarm.Name).then((alarm) => {
      if (!alarm) {
        return;
      }

      return this.utilitySvc.get24hrTimeFromDate(new Date(alarm.scheduledTime));
    });
  }

  automaticUpdates_Start() {
    // Register alarm
    return browser.alarms
      .clear(Globals.Alarm.Name)
      .then(() => {
        return browser.alarms.create(Globals.Alarm.Name, {
          periodInMinutes: Globals.Alarm.Period
        });
      })
      .catch((err) => {
        return this.$q.reject({
          code: Globals.ErrorCodes.FailedRegisterAutoUpdates,
          stack: err.stack
        });
      });
  }

  automaticUpdates_Stop() {
    browser.alarms.clear(Globals.Alarm.Name);
  }

  bookmarks_BuildIdMappings(syncedBookmarks) {
    const mapIds = (nodes, bookmarks) => {
      return nodes.reduce((acc, val, index) => {
        // Create mapping for the current node
        const mapping = this.bookmarkIdMapperSvc.createMapping(bookmarks[index].id, val.id);
        acc.push(mapping);

        // Process child nodes
        return val.children && val.children.length > 0
          ? acc.concat(mapIds(val.children, bookmarks[index].children))
          : acc;
      }, []);
    };

    // Get local container node ids
    return this.getLocalContainerIds()
      .then((localContainerIds) => {
        const menuBookmarksId = localContainerIds[Globals.Bookmarks.MenuContainerName];
        const mobileBookmarksId = localContainerIds[Globals.Bookmarks.MobileContainerName];
        const otherBookmarksId = localContainerIds[Globals.Bookmarks.OtherContainerName];
        const toolbarBookmarksId = localContainerIds[Globals.Bookmarks.ToolbarContainerName];

        // Map menu bookmarks
        const getMenuBookmarks =
          menuBookmarksId == null
            ? this.$q.resolve([])
            : browser.bookmarks.getSubTree(menuBookmarksId).then((subTree) => {
                const menuBookmarks = subTree[0];
                if (!menuBookmarks.children || menuBookmarks.children.length === 0) {
                  return [];
                }

                // Map ids between nodes and synced container children
                const menuBookmarksContainer = syncedBookmarks.find((x) => {
                  return x.title === Globals.Bookmarks.MenuContainerName;
                });
                return !!menuBookmarksContainer &&
                  menuBookmarksContainer.children &&
                  menuBookmarksContainer.children.length > 0
                  ? mapIds(menuBookmarks.children, menuBookmarksContainer.children)
                  : [];
              });

        // Map mobile bookmarks
        const getMobileBookmarks =
          mobileBookmarksId == null
            ? this.$q.resolve([])
            : browser.bookmarks.getSubTree(mobileBookmarksId).then((subTree) => {
                const mobileBookmarks = subTree[0];
                if (!mobileBookmarks.children || mobileBookmarks.children.length === 0) {
                  return [];
                }

                // Map ids between nodes and synced container children
                const mobileBookmarksContainer = syncedBookmarks.find((x) => {
                  return x.title === Globals.Bookmarks.MobileContainerName;
                });
                return !!mobileBookmarksContainer &&
                  mobileBookmarksContainer.children &&
                  mobileBookmarksContainer.children.length > 0
                  ? mapIds(mobileBookmarks.children, mobileBookmarksContainer.children)
                  : [];
              });

        // Map other bookmarks
        const getOtherBookmarks =
          otherBookmarksId == null
            ? this.$q.resolve([])
            : browser.bookmarks.getSubTree(otherBookmarksId).then((subTree) => {
                const otherBookmarks = subTree[0];
                if (!otherBookmarks.children || otherBookmarks.children.length === 0) {
                  return [];
                }

                // Remove any unsupported container folders present
                const nodes = otherBookmarks.children.filter((x) => {
                  return Object.values(localContainerIds).indexOf(x.id) < 0;
                });

                // Map ids between nodes and synced container children
                const otherBookmarksContainer = syncedBookmarks.find((x) => {
                  return x.title === Globals.Bookmarks.OtherContainerName;
                });
                return !!otherBookmarksContainer &&
                  otherBookmarksContainer.children &&
                  otherBookmarksContainer.children.length > 0
                  ? mapIds(nodes, otherBookmarksContainer.children)
                  : [];
              });

        // Map toolbar bookmarks if enabled
        const getToolbarBookmarks =
          toolbarBookmarksId == null
            ? this.$q.resolve([])
            : this.$q
                .all([this.bookmarkSvc.getSyncBookmarksToolbar(), browser.bookmarks.getSubTree(toolbarBookmarksId)])
                .then((results) => {
                  const syncBookmarksToolbar = results[0];
                  const toolbarBookmarks = results[1][0];

                  if (!syncBookmarksToolbar) {
                    return;
                  }

                  if (!toolbarBookmarks.children || toolbarBookmarks.children.length === 0) {
                    return [];
                  }

                  // Map ids between nodes and synced container children
                  const toolbarBookmarksContainer = syncedBookmarks.find((x) => {
                    return x.title === Globals.Bookmarks.ToolbarContainerName;
                  });
                  return !!toolbarBookmarksContainer &&
                    toolbarBookmarksContainer.children &&
                    toolbarBookmarksContainer.children.length > 0
                    ? mapIds(toolbarBookmarks.children, toolbarBookmarksContainer.children)
                    : [];
                });

        return this.$q.all([getMenuBookmarks, getMobileBookmarks, getOtherBookmarks, getToolbarBookmarks]);
      })
      .then((results) => {
        // Combine all mappings
        const combinedMappings = results.reduce((acc, val) => {
          return acc.concat(val);
        }, []);

        // Save mappings
        return this.bookmarkIdMapperSvc.set(combinedMappings);
      });
  }

  bookmarks_Clear(): any {
    // Get local container node ids
    return this.getLocalContainerIds()
      .then((localContainerIds) => {
        const otherBookmarksId = localContainerIds[Globals.Bookmarks.OtherContainerName];
        const toolbarBookmarksId = localContainerIds[Globals.Bookmarks.ToolbarContainerName];

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
            this.utilitySvc.logWarning('Error clearing other bookmarks');
            throw err;
          });

        // Clear bookmarks toolbar if enabled
        const clearToolbar = this.bookmarkSvc
          .getSyncBookmarksToolbar()
          .then((syncBookmarksToolbar) => {
            if (!syncBookmarksToolbar) {
              this.utilitySvc.logInfo('Not clearing toolbar');
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
            this.utilitySvc.logWarning('Error clearing bookmarks toolbar');
            throw err;
          });

        return this.$q.all([clearOthers, clearToolbar]);
      })
      .catch((err) => {
        return this.$q.reject({
          code: Globals.ErrorCodes.FailedRemoveLocalBookmarks,
          stack: err.stack
        });
      });
  }

  bookmarks_Created(xBookmarks, createInfo) {
    // Check if the current bookmark is a container
    return this.isLocalBookmarkContainer(createInfo.parentId)
      .then((localContainer) => {
        if (localContainer) {
          // Check container exists
          const container = this.bookmarkSvc.getContainer(localContainer.xBookmarkTitle, xBookmarks, true);
          return container.id;
        }

        // Get the synced parent id from id mappings and retrieve the synced parent bookmark
        return this.bookmarkIdMapperSvc.get(createInfo.parentId).then((idMapping) => {
          if (!idMapping) {
            // No mappings found, skip sync
            this.utilitySvc.logInfo('No id mapping found, skipping sync');
            return;
          }

          return idMapping.syncedId;
        });
      })
      .then((parentId) => {
        if (!parentId) {
          return;
        }

        // Add new bookmark then check if the change should be synced
        const newBookmarkInfo = angular.copy(createInfo);
        newBookmarkInfo.parentId = parentId;
        delete newBookmarkInfo.id;
        return this.bookmarkSvc.addBookmark(newBookmarkInfo, xBookmarks).then((result) => {
          return this.shouldSyncLocalChanges(result.bookmark, result.bookmarks).then((syncChange) => {
            if (!syncChange) {
              return;
            }

            // Add new id mapping
            const idMapping = this.bookmarkIdMapperSvc.createMapping(result.bookmark.id, createInfo.id);
            return this.bookmarkIdMapperSvc.add(idMapping).then(() => {
              return result.bookmarks;
            });
          });
        });
      });
  }

  bookmarks_CreateSingle(createInfo) {
    // Create local bookmark in other bookmarks container
    return this.getLocalContainerIds()
      .then((localContainerIds) => {
        const otherBookmarksId = localContainerIds[Globals.Bookmarks.OtherContainerName];
        return this.createLocalBookmark(otherBookmarksId, createInfo.bookmark.title, createInfo.bookmark.url);
      })
      .then((newLocalBookmark) => {
        // Add id mapping for new bookmark
        const idMapping = this.bookmarkIdMapperSvc.createMapping(createInfo.bookmark.id, newLocalBookmark.id);
        return this.bookmarkIdMapperSvc.add(idMapping);
      });
  }

  bookmarks_Deleted(xBookmarks, deleteInfo) {
    // Check if the deleted bookmark was an unsupported container
    const isContainer =
      this.unsupportedContainers.filter((x) => {
        return x === deleteInfo.title;
      }).length > 0;
    if (isContainer) {
      return this.$q.reject({ code: Globals.ErrorCodes.ContainerChanged });
    }

    // Get the synced bookmark id from delete info
    return this.bookmarkIdMapperSvc.get(deleteInfo.id).then((idMapping) => {
      if (!idMapping) {
        // No mappings found, skip sync
        this.utilitySvc.logInfo('No id mapping found, skipping sync');
        return;
      }

      // Check if the change should be synced
      const bookmarkToDelete = this.bookmarkSvc.findBookmarkById(xBookmarks, idMapping.syncedId);
      return this.shouldSyncLocalChanges(bookmarkToDelete, xBookmarks).then((syncChange) => {
        if (!syncChange) {
          return;
        }

        // Get all child bookmark mappings
        const descendantsIds = this.bookmarkSvc.getIdsFromDescendants(bookmarkToDelete);

        // Delete bookmark
        return this.bookmarkSvc.removeBookmarkById(idMapping.syncedId, xBookmarks).then((updatedBookmarks) => {
          // Remove all retrieved ids from mappings
          const syncedIds = descendantsIds.concat([idMapping.syncedId]);
          return this.bookmarkIdMapperSvc.remove(syncedIds).then(() => {
            return updatedBookmarks;
          });
        });
      });
    });
  }

  bookmarks_DeleteSingle(deleteInfo) {
    // Get local bookmark id from id mappings
    return this.bookmarkIdMapperSvc.get(null, deleteInfo.bookmark.id).then((idMapping) => {
      if (!idMapping) {
        this.utilitySvc.logWarning(`No id mapping found for synced id '${deleteInfo.bookmark.id}'`);
        return;
      }

      // Remove local bookmark
      return this.deleteLocalBookmarksTree(idMapping.nativeId).then(() => {
        // Remove id mapping
        return this.bookmarkIdMapperSvc.remove(deleteInfo.bookmark.id);
      });
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

  bookmarks_LocalBookmarkInToolbar(localBookmark) {
    return this.getLocalContainerIds().then((localContainerIds) => {
      return localBookmark.parentId === localContainerIds[Globals.Bookmarks.ToolbarContainerName];
    });
  }

  bookmarks_Moved(xBookmarks, moveInfo) {
    let changesMade = false;

    // Get the moved bookmark and new parent ids from id mappings or if container use the existing id
    return this.$q
      .all([
        this.bookmarkIdMapperSvc.get(moveInfo.id),
        this.isLocalBookmarkContainer(moveInfo.parentId).then((localContainer) => {
          if (localContainer) {
            const container = this.bookmarkSvc.getContainer(localContainer.xBookmarkTitle, xBookmarks, true);
            return { syncedId: container.id };
          }
          return this.bookmarkIdMapperSvc.get(moveInfo.parentId);
        })
      ])
      .then((idMappings) => {
        if (!idMappings[0] && !idMappings[1]) {
          // No mappings found, skip sync
          this.utilitySvc.logInfo('No id mappings found, skipping sync');
          return;
        }

        // Get the bookmark to be removed
        return (!idMappings[0]
          ? this.createBookmarkFromLocalId(moveInfo.id, xBookmarks)
          : this.$q.resolve(this.bookmarkSvc.findBookmarkById(xBookmarks, idMappings[0].syncedId))
        ).then((bookmarkToRemove) => {
          // If old parent is mapped, remove the moved bookmark
          let removeBookmarkPromise;
          if (!idMappings[0]) {
            // Moved bookmark not mapped, skip remove
            removeBookmarkPromise = this.$q.resolve(xBookmarks);
          } else {
            // Check if change should be synced then remove the bookmark
            removeBookmarkPromise = this.shouldSyncLocalChanges(bookmarkToRemove, xBookmarks).then((syncChange) => {
              if (!syncChange) {
                return xBookmarks;
              }
              return this.bookmarkSvc
                .removeBookmarkById(idMappings[0].syncedId, xBookmarks)
                .then((updatedBookmarks) => {
                  // Set flag to ensure update bookmarks are synced
                  changesMade = true;
                  return updatedBookmarks;
                });
            });
          }
          return removeBookmarkPromise
            .then((bookmarksAfterRemoval) => {
              let addBookmarkPromise;
              if (!idMappings[1]) {
                // New parent not mapped, skip add
                addBookmarkPromise = this.$q.resolve(bookmarksAfterRemoval);
              } else {
                // Add the bookmark then check if change should be synced
                const newBookmarkInfo = angular.copy(bookmarkToRemove);
                newBookmarkInfo.parentId = idMappings[1].syncedId;
                addBookmarkPromise = this.getNumContainersBeforeBookmarkIndex(moveInfo.parentId, moveInfo.index)
                  .then((numContainers) => {
                    // Adjust the target index by the number of container folders then add the bookmark
                    newBookmarkInfo.index = moveInfo.index - numContainers;
                    return this.bookmarkSvc.addBookmark(newBookmarkInfo, bookmarksAfterRemoval);
                  })
                  .then((result) => {
                    return this.shouldSyncLocalChanges(result.bookmark, result.bookmarks).then((syncChange) => {
                      if (!syncChange) {
                        return bookmarksAfterRemoval;
                      }

                      // Set flag to ensure update bookmarks are synced
                      changesMade = true;

                      // Add new id mapping for moved bookmark
                      if (idMappings[0]) {
                        // If moved bookmark was already mapped, no need to update id mappings
                        return result.bookmarks;
                      }
                      const idMapping = this.bookmarkIdMapperSvc.createMapping(result.bookmark.id, moveInfo.id);
                      return this.bookmarkIdMapperSvc.add(idMapping).then(() => {
                        return result.bookmarks;
                      });
                    });
                  });
              }
              return addBookmarkPromise;
            })
            .then((updatedBookmarks) => {
              if (!changesMade) {
                // No changes made, skip sync
                return;
              }
              return updatedBookmarks;
            });
        });
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
        const otherBookmarksId = localContainerIds[Globals.Bookmarks.OtherContainerName];
        const toolbarBookmarksId = localContainerIds[Globals.Bookmarks.ToolbarContainerName];

        // Populate menu bookmarks in other bookmarks
        let populateMenu = this.$q.resolve();
        if (menuContainer) {
          populateMenu = browser.bookmarks
            .getSubTree(otherBookmarksId)
            .then((results) => {
              return this.createLocalBookmarksFromXBookmarks(otherBookmarksId, [menuContainer], toolbarBookmarksId);
            })
            .catch((err) => {
              this.utilitySvc.logInfo('Error populating bookmarks menu.');
              throw err;
            });
        }

        // Populate mobile bookmarks in other bookmarks
        let populateMobile = this.$q.resolve();
        if (mobileContainer) {
          populateMobile = browser.bookmarks
            .getSubTree(otherBookmarksId)
            .then((results) => {
              return this.createLocalBookmarksFromXBookmarks(otherBookmarksId, [mobileContainer], toolbarBookmarksId);
            })
            .catch((err) => {
              this.utilitySvc.logInfo('Error populating mobile bookmarks.');
              throw err;
            });
        }

        // Populate other bookmarks
        let populateOther = this.$q.resolve();
        if (otherContainer) {
          populateOther = browser.bookmarks
            .getSubTree(otherBookmarksId)
            .then((results) => {
              return this.createLocalBookmarksFromXBookmarks(
                otherBookmarksId,
                otherContainer.children,
                toolbarBookmarksId
              );
            })
            .catch((err) => {
              this.utilitySvc.logInfo('Error populating other bookmarks.');
              throw err;
            });
        }

        // Populate bookmarks toolbar if enabled
        const populateToolbar = this.bookmarkSvc.getSyncBookmarksToolbar().then((syncBookmarksToolbar) => {
          if (!syncBookmarksToolbar) {
            this.utilitySvc.logInfo('Not populating toolbar');
            return;
          }

          if (toolbarContainer) {
            return browser.bookmarks
              .getSubTree(toolbarBookmarksId)
              .then((results) => {
                return this.createLocalBookmarksFromXBookmarks(toolbarBookmarksId, toolbarContainer.children);
              })
              .catch((err) => {
                this.utilitySvc.logInfo('Error populating bookmarks toolbar.');
                throw err;
              });
          }
        });

        return this.$q.all([populateMenu, populateMobile, populateOther, populateToolbar]);
      })
      .then(() => {
        this.utilitySvc.logInfo(
          `Local bookmarks populated in ${((new Date() as any) - (populateStartTime as any)) / 1000}s`
        );
        // Move local containers into the correct order
        return this.reorderLocalContainers();
      });
  }

  bookmarks_ReorderContainers() {
    // Get local containers
    return this.$q.all(this.unsupportedContainers.map(this.findLocalBookmarkByTitle)).then((results) => {
      // Remove falsy results
      const localContainers = results.filter((x) => {
        return x;
      });

      // Reorder each local container to top of parent
      return this.$q.all(
        localContainers.map((localContainer, index) => {
          return browser.bookmarks.move((localContainer as any).id, {
            index,
            parentId: (localContainer as any).parentId
          });
        })
      );
    });
  }

  bookmarks_Updated(xBookmarks, updateInfo) {
    // Get the synced bookmark id from change info
    return this.bookmarkIdMapperSvc.get(updateInfo.id).then((idMapping) => {
      if (!idMapping) {
        // No mappings found, skip sync
        this.utilitySvc.logInfo('No id mapping found, skipping sync');
        return;
      }

      // Check if the change should be synced
      const bookmarkToUpdate = this.bookmarkSvc.findBookmarkById(xBookmarks, idMapping.syncedId);
      return this.shouldSyncLocalChanges(bookmarkToUpdate, xBookmarks).then((syncChange) => {
        if (!syncChange) {
          return;
        }

        // Update the bookmark with the update info
        return this.bookmarkSvc.updateBookmarkById(idMapping.syncedId, updateInfo, xBookmarks);
      });
    });
  }

  bookmarks_UpdateSingle(updateInfo) {
    // Get local bookmark id from id mappings
    return this.bookmarkIdMapperSvc.get(null, updateInfo.bookmark.id).then((idMapping) => {
      if (!idMapping) {
        this.utilitySvc.logWarning(`No id mapping found for synced id '${updateInfo.bookmark.id}'`);
        return;
      }

      // Update local bookmark
      return this.updateLocalBookmark(idMapping.nativeId, updateInfo.bookmark.title, updateInfo.bookmark.url);
    });
  }

  copyToClipboard(textToCopy) {
    return navigator.clipboard.writeText(textToCopy).catch((err) => {
      this.utilitySvc.logError(err, 'platform.copyToClipboard');
      throw err;
    });
  }

  createBookmarkFromLocalId(id, xBookmarks): angular.IPromise<any> {
    return browser.bookmarks.get(id).then((results) => {
      if (!results || results.length === 0) {
        return this.$q.reject({ code: Globals.ErrorCodes.LocalBookmarkNotFound });
      }
      const localBookmark = results[0];
      const convertedBookmark = this.bookmarkSvc.convertLocalBookmarkToXBookmark(localBookmark, xBookmarks);
      return convertedBookmark;
    });
  }

  createLocalBookmark(parentId, title, url, index?) {
    const newLocalBookmark = {
      index,
      parentId,
      title,
      url
    };

    // Check that the url is supported
    if (!this.localBookmarkUrlIsSupported(url)) {
      this.utilitySvc.logInfo(`Bookmark url unsupported: ${url}`);
      newLocalBookmark.url = this.getNewTabUrl();
    }

    return browser.bookmarks.create(newLocalBookmark).catch((err) => {
      this.utilitySvc.logInfo(`Failed to create local bookmark: ${JSON.stringify(newLocalBookmark)}`);
      return this.$q.reject({
        code: Globals.ErrorCodes.FailedCreateLocalBookmarks,
        stack: err.stack
      });
    });
  }

  createLocalBookmarksFromXBookmarks(localParentId, xBookmarks, localToolbarContainerId?) {
    let processError;
    const createRecursive = (parentId, bookmarks, toolbarId) => {
      const createChildBookmarksPromises = [];

      // Create bookmarks at the top level of the supplied array
      return bookmarks
        .reduce((p, xBookmark) => {
          return p.then(() => {
            // If an error occurred during the recursive process, prevent any more bookmarks being created
            if (processError) {
              return this.$q.resolve();
            }

            return this.bookmarkSvc.isSeparator(xBookmark)
              ? this.createLocalSeparator(parentId, toolbarId)
              : this.createLocalBookmark(parentId, xBookmark.title, xBookmark.url).then((newLocalBookmark) => {
                  // If the bookmark has children, recurse
                  if (xBookmark.children && xBookmark.children.length > 0) {
                    createChildBookmarksPromises.push(
                      createRecursive(newLocalBookmark.id, xBookmark.children, toolbarId)
                    );
                  }
                });
          });
        }, this.$q.resolve())
        .then(() => {
          return this.$q.all(createChildBookmarksPromises);
        })
        .catch((err) => {
          processError = err;
          throw err;
        });
    };
    return createRecursive(localParentId, xBookmarks, localToolbarContainerId);
  }

  createLocalSeparator(parentId, localToolbarContainerId) {
    const newLocalSeparator = {
      parentId,
      title:
        parentId === localToolbarContainerId
          ? Globals.Bookmarks.VerticalSeparatorTitle
          : Globals.Bookmarks.HorizontalSeparatorTitle,
      url: this.getNewTabUrl()
    };

    return browser.bookmarks.create(newLocalSeparator).catch((err) => {
      this.utilitySvc.logInfo('Failed to create local separator');
      return this.$q.reject({
        code: Globals.ErrorCodes.FailedCreateLocalBookmarks,
        stack: err.stack
      });
    });
  }

  deleteLocalBookmarksTree(localBookmarkId) {
    return browser.bookmarks.removeTree(localBookmarkId).catch((err) => {
      this.utilitySvc.logInfo(`Failed to delete local bookmark: ${localBookmarkId}`);
      return this.$q.reject({
        code: Globals.ErrorCodes.FailedRemoveLocalBookmarks,
        stack: err.stack
      });
    });
  }

  downloadFile(fileName, textContents, linkId) {
    if (!fileName) {
      throw new Error('File name not supplied.');
    }

    // Use provided hyperlink or create new one
    let downloadLink;
    if (linkId) {
      downloadLink = document.getElementById(linkId);
    } else {
      downloadLink = document.createElement('a');
      downloadLink.style.display = 'none';
      document.body.appendChild(downloadLink);
    }

    if (!downloadLink) {
      throw new Error('Link element not found.');
    }

    this.utilitySvc.logInfo(`Downloading file ${fileName}`);

    // Use hyperlink to trigger file download
    const file = new Blob([textContents], { type: 'text/plain' });
    downloadLink.href = URL.createObjectURL(file);
    downloadLink.innerText = fileName;
    downloadLink.download = fileName;
    downloadLink.click();

    if (!linkId) {
      document.body.removeChild(downloadLink);
    }

    // Return message to be displayed
    const message = this.getConstant(Strings.downloadFile_Success_Message);
    return this.$q.resolve(message);
  }

  eventListeners_Disable() {
    return this.sendMessage({
      command: Globals.Commands.DisableEventListeners
    });
  }

  eventListeners_Enable() {
    return this.sendMessage({
      command: Globals.Commands.EnableEventListeners
    });
  }

  findLocalBookmarkByTitle(title) {
    if (!title) {
      return this.$q.resolve();
    }

    return browser.bookmarks.search({ title }).then((results) => {
      let localBookmark;
      if (results.length > 0) {
        localBookmark = results.shift();
      }

      return localBookmark;
    });
  }

  getConstant(stringObj: any): string {
    let stringVal = '';

    if (stringObj && stringObj.key) {
      stringVal = browser.i18n.getMessage(stringObj.key);
    }

    if (!stringVal) {
      this.utilitySvc.logWarning('I18n string has no value');
    }

    return stringVal;
  }

  getCurrentUrl() {
    // Get current tab
    return browser.tabs.query({ currentWindow: true, active: true }).then((tabs) => {
      return tabs[0].url;
    });
  }

  getErrorMessageFromException(err: any): any {
    const errorMessage = {
      title: '',
      message: ''
    };

    if (!err || !err.code) {
      errorMessage.title = this.getConstant(Strings.error_Default_Title);
      errorMessage.message = this.getConstant(Strings.error_Default_Message);
      return errorMessage;
    }

    err.details = !err.details ? '' : err.details;

    switch (err.code) {
      case Globals.ErrorCodes.NetworkOffline:
      case Globals.ErrorCodes.HttpRequestFailed:
        errorMessage.title = this.getConstant(Strings.error_HttpRequestFailed_Title);
        errorMessage.message = this.getConstant(Strings.error_HttpRequestFailed_Message);
        break;
      case Globals.ErrorCodes.TooManyRequests:
        errorMessage.title = this.getConstant(Strings.error_TooManyRequests_Title);
        errorMessage.message = this.getConstant(Strings.error_TooManyRequests_Message);
        break;
      case Globals.ErrorCodes.RequestEntityTooLarge:
        errorMessage.title = this.getConstant(Strings.error_RequestEntityTooLarge_Title);
        errorMessage.message = this.getConstant(Strings.error_RequestEntityTooLarge_Message);
        break;
      case Globals.ErrorCodes.NotAcceptingNewSyncs:
        errorMessage.title = this.getConstant(Strings.error_NotAcceptingNewSyncs_Title);
        errorMessage.message = this.getConstant(Strings.error_NotAcceptingNewSyncs_Message);
        break;
      case Globals.ErrorCodes.DailyNewSyncLimitReached:
        errorMessage.title = this.getConstant(Strings.error_DailyNewSyncLimitReached_Title);
        errorMessage.message = this.getConstant(Strings.error_DailyNewSyncLimitReached_Message);
        break;
      case Globals.ErrorCodes.MissingClientData:
        errorMessage.title = this.getConstant(Strings.error_MissingClientData_Title);
        errorMessage.message = this.getConstant(Strings.error_MissingClientData_Message);
        break;
      case Globals.ErrorCodes.NoDataFound:
        errorMessage.title = this.getConstant(Strings.error_InvalidCredentials_Title);
        errorMessage.message = this.getConstant(Strings.error_InvalidCredentials_Message);
        break;
      case Globals.ErrorCodes.SyncRemoved:
        errorMessage.title = this.getConstant(Strings.error_SyncRemoved_Title);
        errorMessage.message = this.getConstant(Strings.error_SyncRemoved_Message);
        break;
      case Globals.ErrorCodes.InvalidCredentials:
        errorMessage.title = this.getConstant(Strings.error_InvalidCredentials_Title);
        errorMessage.message = this.getConstant(Strings.error_InvalidCredentials_Message);
        break;
      case Globals.ErrorCodes.ContainerChanged:
        errorMessage.title = this.getConstant(Strings.error_ContainerChanged_Title);
        errorMessage.message = this.getConstant(Strings.error_ContainerChanged_Message);
        break;
      case Globals.ErrorCodes.LocalContainerNotFound:
        errorMessage.title = this.getConstant(Strings.error_LocalContainerNotFound_Title);
        errorMessage.message = this.getConstant(Strings.error_LocalContainerNotFound_Message);
        break;
      case Globals.ErrorCodes.DataOutOfSync:
        errorMessage.title = this.getConstant(Strings.error_OutOfSync_Title);
        errorMessage.message = this.getConstant(Strings.error_OutOfSync_Message);
        break;
      case Globals.ErrorCodes.InvalidService:
        errorMessage.title = this.getConstant(Strings.error_InvalidService_Title);
        errorMessage.message = this.getConstant(Strings.error_InvalidService_Message);
        break;
      case Globals.ErrorCodes.ServiceOffline:
        errorMessage.title = this.getConstant(Strings.error_ServiceOffline_Title);
        errorMessage.message = this.getConstant(Strings.error_ServiceOffline_Message);
        break;
      case Globals.ErrorCodes.UnsupportedServiceApiVersion:
        errorMessage.title = this.getConstant(Strings.error_UnsupportedServiceApiVersion_Title);
        errorMessage.message = this.getConstant(Strings.error_UnsupportedServiceApiVersion_Message);
        break;
      case Globals.ErrorCodes.FailedGetPageMetadata:
        errorMessage.title = this.getConstant(Strings.error_FailedGetPageMetadata_Title);
        errorMessage.message = this.getConstant(Strings.error_FailedGetPageMetadata_Message);
        break;
      case Globals.ErrorCodes.FailedScan:
        errorMessage.title = this.getConstant(Strings.error_ScanFailed_Message);
        break;
      case Globals.ErrorCodes.FailedShareBookmark:
        errorMessage.title = this.getConstant(Strings.error_ShareFailed_Title);
        break;
      case Globals.ErrorCodes.FailedDownloadFile:
        errorMessage.title = this.getConstant(Strings.error_FailedDownloadFile_Title);
        break;
      case Globals.ErrorCodes.FailedGetDataToRestore:
        errorMessage.title = this.getConstant(Strings.error_FailedGetDataToRestore_Title);
        break;
      case Globals.ErrorCodes.FailedRestoreData:
        errorMessage.title = this.getConstant(Strings.error_FailedRestoreData_Title);
        errorMessage.message = this.getConstant(Strings.error_FailedRestoreData_Message);
        break;
      case Globals.ErrorCodes.FailedShareUrl:
        errorMessage.title = this.getConstant(Strings.error_FailedShareUrl_Title);
        break;
      case Globals.ErrorCodes.FailedShareUrlNotSynced:
        errorMessage.title = this.getConstant(Strings.error_FailedShareUrlNotSynced_Title);
        break;
      case Globals.ErrorCodes.FailedRefreshBookmarks:
        errorMessage.title = this.getConstant(Strings.error_FailedRefreshBookmarks_Title);
        break;
      case Globals.ErrorCodes.SyncUncommitted:
        errorMessage.title = this.getConstant(Strings.error_UncommittedSyncs_Title);
        errorMessage.message = this.getConstant(Strings.error_UncommittedSyncs_Message);
        break;
      case Globals.ErrorCodes.FailedCreateLocalBookmarks:
      case Globals.ErrorCodes.FailedGetLocalBookmarks:
      case Globals.ErrorCodes.FailedRemoveLocalBookmarks:
      case Globals.ErrorCodes.LocalBookmarkNotFound:
      case Globals.ErrorCodes.XBookmarkNotFound:
        errorMessage.title = this.getConstant(Strings.error_LocalSyncError_Title);
        errorMessage.message = this.getConstant(Strings.error_LocalSyncError_Message);
        break;
      default:
        errorMessage.title = this.getConstant(Strings.error_Default_Title);
        errorMessage.message = this.getConstant(Strings.error_Default_Message);
    }

    return errorMessage;
  }

  getHelpPages() {
    const pages = [
      this.getConstant(Strings.help_Page_Welcome_Desktop_Content),
      this.getConstant(Strings.help_Page_BeforeYouBegin_Chrome_Content),
      this.getConstant(Strings.help_Page_FirstSync_Desktop_Content),
      this.getConstant(Strings.help_Page_Service_Content),
      this.getConstant(Strings.help_Page_SyncId_Content),
      this.getConstant(Strings.help_Page_ExistingId_Desktop_Content),
      this.getConstant(Strings.help_Page_Searching_Desktop_Content),
      this.getConstant(Strings.help_Page_AddingBookmarks_Chrome_Content),
      this.getConstant(Strings.help_Page_NativeFeatures_Chrome_Content),
      this.getConstant(Strings.help_Page_BackingUp_Desktop_Content),
      this.getConstant(Strings.help_Page_Shortcuts_Chrome_Content),
      this.getConstant(Strings.help_Page_Mobile_Content),
      this.getConstant(Strings.help_Page_FurtherSupport_Content)
    ];

    return pages;
  }

  getLocalBookmarksAsXBookmarks(localBookmarks) {
    const xBookmarks = [];

    for (let i = 0; i < localBookmarks.length; i++) {
      const currentLocalBookmark = localBookmarks[i];

      // Check if current local bookmark is a separator
      const newXBookmark = this.bookmarkSvc.isSeparator(currentLocalBookmark)
        ? this.bookmarkSvc.xSeparator()
        : this.bookmarkSvc.xBookmark(currentLocalBookmark.title, currentLocalBookmark.url);

      // If this is a folder and has children, process them
      if (currentLocalBookmark.children && currentLocalBookmark.children.length > 0) {
        (newXBookmark as any).children = this.getLocalBookmarksAsXBookmarks(currentLocalBookmark.children);
      }

      xBookmarks.push(newXBookmark);
    }

    return xBookmarks;
  }

  getLocalContainerIds() {
    return browser.bookmarks.getTree().then((tree) => {
      // Get the root child nodes
      const otherBookmarksNode = tree[0].children.find((x) => {
        return x.id === '2';
      });
      const toolbarBookmarksNode = tree[0].children.find((x) => {
        return x.id === '1';
      });

      // Throw an error if a local container is not found
      if (!otherBookmarksNode || !toolbarBookmarksNode) {
        if (!otherBookmarksNode) {
          this.utilitySvc.logWarning('Missing container: other bookmarks');
        }
        if (!toolbarBookmarksNode) {
          this.utilitySvc.logWarning('Missing container: toolbar bookmarks');
        }
        return this.$q.reject({ code: Globals.ErrorCodes.LocalContainerNotFound });
      }

      // Add containers to results
      const results = {};
      results[Globals.Bookmarks.OtherContainerName] = otherBookmarksNode.id;
      results[Globals.Bookmarks.ToolbarContainerName] = toolbarBookmarksNode.id;

      // Check for unsupported containers
      const menuBookmarksNode = otherBookmarksNode.children.find((x) => {
        return x.title === Globals.Bookmarks.MenuContainerName;
      });
      const mobileBookmarksNode = otherBookmarksNode.children.find((x) => {
        return x.title === Globals.Bookmarks.MobileContainerName;
      });
      results[Globals.Bookmarks.MenuContainerName] = menuBookmarksNode ? menuBookmarksNode.id : undefined;
      results[Globals.Bookmarks.MobileContainerName] = mobileBookmarksNode ? mobileBookmarksNode.id : undefined;

      return results;
    });
  }

  getNewTabUrl() {
    return 'chrome://newtab/';
  }

  getNumContainersBeforeBookmarkIndex(parentId, bookmarkIndex) {
    // Get local container node ids
    return this.getLocalContainerIds().then((localContainerIds) => {
      // No containers to adjust for if parent is not other bookmarks
      if (parentId !== localContainerIds[Globals.Bookmarks.OtherContainerName]) {
        return 0;
      }

      // Get parent bookmark and count containers
      return browser.bookmarks.getSubTree(parentId).then((subTree) => {
        const numContainers = subTree[0].children.filter((child, index) => {
          return index < bookmarkIndex && this.bookmarkSvc.xBookmarkIsContainer(child);
        }).length;
        return numContainers;
      });
    });
  }

  getPageMetadata(getFullMetadata, pageUrl) {
    let activeTab;
    getFullMetadata = getFullMetadata === undefined ? true : getFullMetadata;

    return browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      // If active tab empty, throw error
      activeTab = tabs && tabs[0];
      if (!activeTab) {
        return this.$q.reject({ code: Globals.ErrorCodes.FailedGetPageMetadata });
      }

      // Default metadata to the info from the active tab
      let metadata = activeTab && {
        title: activeTab.title,
        url: activeTab.url
      };

      // Don't get metadata if this is a native config page url
      if (getFullMetadata) {
        getFullMetadata = !this.nativeConfigUrlRegex.test(activeTab.url);
      }

      // If not retrieving full metadata return with default
      if (!getFullMetadata) {
        return metadata;
      }

      return browser.tabs
        .executeScript(activeTab.id, { file: this.contentScriptUrl })
        .then((response) => {
          if (response && response.length > 0 && response[0].default) {
            metadata = response[0].default;
          }

          // If no metadata returned, use the info from the active tab
          metadata.title = metadata.title || activeTab.title;
          metadata.url = metadata.url || activeTab.url;
          return metadata;
        })
        .catch((err) => {
          this.utilitySvc.logWarning(`Unable to get metadata: ${err ? err.message : ''}`);
          return metadata;
        });
    });
  }

  getSupportedUrl(url) {
    return this.localBookmarkUrlIsSupported(url) ? url : this.getNewTabUrl();
  }

  init(viewModel) {
    // Set global variables
    this.vm = viewModel;
    this.vm.platformName = Globals.Platforms.Chrome;

    return this.$q.resolve();
  }

  interface_Refresh(syncEnabled, syncType) {
    let iconPath;
    let newTitle = this.getConstant(Strings.title);
    const syncingTitle = ` (${this.getConstant(Strings.tooltip_Syncing_Label)})`;
    const syncedTitle = ` (${this.getConstant(Strings.tooltip_Synced_Label)})`;
    const notSyncedTitle = ` (${this.getConstant(Strings.tooltip_NotSynced_Label)})`;

    // Clear timeout
    if (this.refreshInterfaceTimeout) {
      this.$timeout.cancel(this.refreshInterfaceTimeout);
      this.refreshInterfaceTimeout = null;
    }

    if (syncType) {
      iconPath =
        syncType === Globals.SyncType.Pull
          ? `${Globals.PathToAssets}/downloading.png`
          : `${Globals.PathToAssets}/uploading.png`;
      newTitle += syncingTitle;
    } else if (syncEnabled) {
      iconPath = `${Globals.PathToAssets}/synced.png`;
      newTitle += syncedTitle;
    } else {
      iconPath = `${Globals.PathToAssets}/notsynced.png`;
      newTitle += notSyncedTitle;
    }

    return this.$q((resolve, reject) => {
      const iconUpdated = this.$q.defer();
      const titleUpdated = this.$q.defer();

      browser.browserAction.getTitle({}).then((currentTitle) => {
        // Don't do anything if browser action title hasn't changed
        if (newTitle === currentTitle) {
          return resolve();
        }

        // Set a delay if finished syncing to prevent flickering when executing many syncs
        if (currentTitle.indexOf(syncingTitle) > 0 && newTitle.indexOf(syncedTitle)) {
          this.refreshInterfaceTimeout = this.$timeout(() => {
            browser.browserAction.setIcon({ path: iconPath });
            browser.browserAction.setTitle({ title: newTitle });
          }, 350);
          iconUpdated.resolve();
          titleUpdated.resolve();
        } else {
          browser.browserAction.setIcon({ path: iconPath }).then(iconUpdated.resolve);
          browser.browserAction.setTitle({ title: newTitle }).then(titleUpdated.resolve);
        }

        this.$q.all([iconUpdated, titleUpdated]).then(resolve).catch(reject);
      });
    });
  }

  interface_Working_Hide(id, timeout) {
    if (timeout) {
      this.$timeout.cancel(timeout);
    }

    // Hide any alert messages
    this.vm.alert.show = false;

    // Hide loading overlay if supplied if matches current
    if (!this.loadingId || id === this.loadingId) {
      this.$timeout(() => {
        this.vm.working.show = false;
        this.loadingId = null;
      });
    }
  }

  interface_Working_Show(id) {
    let timeout;

    // Return if loading overlay already displayed
    if (this.loadingId) {
      return;
    }

    // Hide any alert messages
    this.vm.alert.show = false;

    switch (id) {
      // Loading bookmark metadata, wait a moment before displaying loading overlay
      case 'retrievingMetadata':
        timeout = this.$timeout(() => {
          this.vm.working.show = true;
        }, 500);
        break;
      // Display default overlay
      default:
        timeout = this.$timeout(() => {
          this.vm.working.show = true;
        });
        break;
    }

    this.loadingId = id;
    return timeout;
  }

  isLocalBookmarkContainer(localBookmarkId) {
    // Get local container node ids
    return this.getLocalContainerIds().then((localContainerIds) => {
      const menuBookmarksId = localContainerIds[Globals.Bookmarks.MenuContainerName];
      const mobileBookmarksId = localContainerIds[Globals.Bookmarks.MobileContainerName];
      const otherBookmarksId = localContainerIds[Globals.Bookmarks.OtherContainerName];
      const toolbarBookmarksId = localContainerIds[Globals.Bookmarks.ToolbarContainerName];

      const localContainers = [
        { id: otherBookmarksId, xBookmarkTitle: Globals.Bookmarks.OtherContainerName },
        { id: toolbarBookmarksId, xBookmarkTitle: Globals.Bookmarks.ToolbarContainerName }
      ];

      if (menuBookmarksId) {
        localContainers.push({ id: menuBookmarksId, xBookmarkTitle: Globals.Bookmarks.MenuContainerName });
      }

      if (mobileBookmarksId) {
        localContainers.push({ id: mobileBookmarksId, xBookmarkTitle: Globals.Bookmarks.MobileContainerName });
      }

      // Check if the bookmark id resolves to a local container
      return _.findWhere(localContainers, { id: localBookmarkId });
    });
  }

  localBookmarkUrlIsSupported(url) {
    if (!url) {
      return true;
    }

    return this.supportedLocalBookmarkUrlRegex.test(url);
  }

  openUrl(url) {
    // Check url is supported
    if (!this.localBookmarkUrlIsSupported(url)) {
      this.utilitySvc.logInfo(`Attempted to navigate to unsupported url: ${url}`);
      url = this.getNewTabUrl();
    }

    const openInNewTab = () => {
      return browser.tabs.create({ url });
    };

    browser.tabs
      .query({ currentWindow: true, active: true })
      .then((tabs) => {
        // Open url in current tab if new then close the extension window
        const tabAction =
          tabs && tabs.length > 0 && tabs[0].url && tabs[0].url.startsWith(this.getNewTabUrl())
            ? browser.tabs.update(tabs[0].id, { url })
            : openInNewTab();
        return tabAction.then(window.close);
      })
      .catch(openInNewTab);
  }

  permissions_Check() {
    // Check if extension has optional permissions
    return browser.permissions.contains(this.optionalPermissions);
  }

  permissions_Remove() {
    // Remove optional permissions
    return browser.permissions.remove(this.optionalPermissions).then(() => {
      this.utilitySvc.logInfo('Optional permissions removed');
    });
  }

  permissions_Request() {
    // Request optional permissions
    return browser.permissions.request(this.optionalPermissions).then((granted) => {
      this.utilitySvc.logInfo(`Optional permissions ${!granted ? 'not ' : ''}granted`);
      return granted;
    });
  }

  reorderLocalContainers() {
    // Get local containers
    return this.$q.all(this.unsupportedContainers.map(this.findLocalBookmarkByTitle)).then((results) => {
      // Remove falsy results
      const localContainers = results.filter((x) => {
        return x;
      });

      // Reorder each local container to top of parent
      return this.$q.all(
        localContainers.map((localContainer, index) => {
          return browser.bookmarks.move((localContainer as any).id, {
            index,
            parentId: (localContainer as any).parentId
          });
        })
      );
    });
  }

  sendMessage(message) {
    return this.$q((resolve, reject) => {
      browser.runtime
        .sendMessage(message)
        .then((response) => {
          if (!response) {
            return resolve();
          }

          if (!response.success) {
            return reject(response.error);
          }

          resolve(response);
        })
        .catch((err) => {
          // If no message connection detected, check if background function can be called directly
          if (
            err.message &&
            err.message.toLowerCase().indexOf('could not establish connection') >= 0 &&
            (window as any).handleXBrowserSyncMessage
          ) {
            return (window as any).handleXBrowserSyncMessage(message, null, resolve);
          }

          this.utilitySvc.logWarning('Message listener not available');
          reject(err);
        });
    });
  }

  shouldSyncLocalChanges(changedBookmark, xBookmarks) {
    // Check if container was changed
    return this.wasContainerChanged(changedBookmark, xBookmarks)
      .then((changedBookmarkIsContainer) => {
        if (changedBookmarkIsContainer) {
          return this.$q.reject({ code: Globals.ErrorCodes.ContainerChanged });
        }

        // If container is Toolbar, check if Toolbar sync is disabled
        const container = this.bookmarkSvc.getContainerByBookmarkId(changedBookmark.id, xBookmarks);
        if (!container) {
          return this.$q.reject({ code: Globals.ErrorCodes.ContainerNotFound });
        }
        return container.title === Globals.Bookmarks.ToolbarContainerName
          ? this.bookmarkSvc.getSyncBookmarksToolbar()
          : this.$q.resolve(true);
      })
      .then((syncBookmarksToolbar) => {
        if (!syncBookmarksToolbar) {
          this.utilitySvc.logInfo('Not syncing toolbar');
          return false;
        }

        return true;
      });
  }

  sync_Current() {
    return this.sendMessage({
      command: Globals.Commands.GetCurrentSync
    }).then((response: any) => {
      return response.currentSync;
    });
  }

  sync_Disable() {
    return this.sendMessage({
      command: Globals.Commands.DisableSync
    });
  }

  sync_DisplayConfirmation(): boolean {
    return true;
  }

  sync_GetQueueLength() {
    return this.sendMessage({
      command: Globals.Commands.GetSyncQueueLength
    }).then((response: any) => {
      return response.syncQueueLength;
    });
  }

  sync_Queue(syncData, command) {
    syncData.command = command || Globals.Commands.SyncBookmarks;
    return this.sendMessage(syncData).then((response: any) => {
      return response.bookmarks;
    });
  }

  updateLocalBookmark(localBookmarkId, title, url) {
    const updateInfo = {
      title,
      url
    };

    // Check that the url is supported
    if (!this.localBookmarkUrlIsSupported(url)) {
      this.utilitySvc.logInfo(`Bookmark url unsupported: ${url}`);
      updateInfo.url = this.getNewTabUrl();
    }

    return browser.bookmarks.update(localBookmarkId, updateInfo).catch((err) => {
      this.utilitySvc.logInfo(`Failed to update local bookmark: ${JSON.stringify(updateInfo)}`);
      return this.$q.reject({
        code: Globals.ErrorCodes.FailedUpdateLocalBookmarks,
        stack: err.stack
      });
    });
  }

  wasContainerChanged(changedBookmark, xBookmarks) {
    return (xBookmarks ? this.$q.resolve(xBookmarks) : this.bookmarkSvc.getCachedBookmarks()).then((results) => {
      xBookmarks = results;

      // Check based on title
      if (this.bookmarkSvc.xBookmarkIsContainer(changedBookmark)) {
        return true;
      }

      // Get local container node ids
      return this.getLocalContainerIds().then((localContainerIds) => {
        // If parent is other bookmarks, check other bookmarks children for containers
        const otherBookmarksId = localContainerIds[Globals.Bookmarks.OtherContainerName];
        if (changedBookmark.parentId !== otherBookmarksId) {
          return false;
        }

        return browser.bookmarks
          .getChildren(otherBookmarksId)
          .then((children) => {
            // Get all bookmarks in other bookmarks that are xBrowserSync containers
            const localContainers = children.filter((x) => {
              return this.unsupportedContainers.find((y) => {
                return y === x.title;
              });
            });
            let containersCount = 0;
            let checksFailed = false;
            let count;

            // Check each container present only appears once
            const menuContainer = this.bookmarkSvc.getContainer(Globals.Bookmarks.MenuContainerName, xBookmarks, false);
            if (menuContainer) {
              containersCount++;
              count = localContainers.filter((x) => {
                return x.title === Globals.Bookmarks.MenuContainerName;
              }).length;
              checksFailed = count !== 1 ? true : checksFailed;
            }

            const mobileContainer = this.bookmarkSvc.getContainer(
              Globals.Bookmarks.MobileContainerName,
              xBookmarks,
              false
            );
            if (mobileContainer) {
              containersCount++;
              count = localContainers.filter((x) => {
                return x.title === Globals.Bookmarks.MobileContainerName;
              }).length;
              checksFailed = count !== 1 ? true : checksFailed;
            }

            // Check number of containers match and return result
            checksFailed = containersCount !== localContainers.length ? true : checksFailed;
            return checksFailed;
          })
          .catch((err) => {
            this.utilitySvc.logInfo(`Failed to detect whether container changed: ${JSON.stringify(changedBookmark)}`);
            return this.$q.reject({
              code: Globals.ErrorCodes.FailedGetLocalBookmarks,
              stack: err.stack
            });
          });
      });
    });
  }
}
