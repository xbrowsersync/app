import angular from 'angular';
import { Injectable } from 'angular-ts-decorators';
import { autobind } from 'core-decorators';
import { Bookmarks as NativeBookmarks, browser } from 'webextension-polyfill-ts';
import Strings from '../../../res/strings/en.json';
import I18nString from '../../interfaces/i18n-string.interface';
import PlatformService from '../../interfaces/platform-service.interface';
import Sync from '../../interfaces/sync.interface';
import WebpageMetadata from '../../interfaces/webpage-metadata.interface';
import BookmarkContainer from '../shared/bookmark/bookmark-container.enum';
import Bookmark from '../shared/bookmark/bookmark.interface';
import BookmarkService from '../shared/bookmark/bookmark.service';
import * as Exceptions from '../shared/exceptions/exception';
import Globals from '../shared/globals';
import LogService from '../shared/log/log.service';
import MessageCommand from '../shared/message-command.enum';
import StoreService from '../shared/store/store.service';
import SyncType from '../shared/sync-type.enum';
import UtilityService from '../shared/utility/utility.service';
import BookmarkIdMapperService from './bookmark-id-mapper/bookmark-id-mapper.service';
import BookmarkIdMapping from './bookmark-id-mapper/bookmark-id-mapping.interface';
import WebExtBackgroundService from './webext-background/webext-background.service';

@autobind
@Injectable('PlatformService')
export default class WebExtPlatformService implements PlatformService {
  $injector: ng.auto.IInjectorService;
  $interval: ng.IIntervalService;
  $q: ng.IQService;
  $timeout: ng.ITimeoutService;
  _backgroundSvc: WebExtBackgroundService;
  bookmarkIdMapperSvc: BookmarkIdMapperService;
  bookmarkSvc: BookmarkService;
  logSvc: LogService;
  storeSvc: StoreService;
  utilitySvc: UtilityService;

  contentScriptUrl = 'assets/webpage-metadata-collecter.js';
  loadingId: string;
  nativeConfigUrlRegex = /chrome:\/\//i;
  optionalPermissions = {
    origins: ['http://*/', 'https://*/']
  };
  refreshInterfaceTimeout: any;
  showAlert: boolean;
  showWorking: boolean;
  supportedLocalBookmarkUrlRegex = /^[\w-]+:/i;
  unsupportedContainers = [BookmarkContainer.Menu, BookmarkContainer.Mobile];

  static $inject = [
    '$injector',
    '$interval',
    '$q',
    '$timeout',
    'BookmarkIdMapperService',
    'BookmarkService',
    'LogService',
    'StoreService',
    'UtilityService'
  ];
  constructor(
    $injector: ng.auto.IInjectorService,
    $interval: ng.IIntervalService,
    $q: ng.IQService,
    $timeout: ng.ITimeoutService,
    BookmarkIdMapperSvc: BookmarkIdMapperService,
    BookmarkSvc: BookmarkService,
    LogSvc: LogService,
    StoreSvc: StoreService,
    UtilitySvc: UtilityService
  ) {
    this.$injector = $injector;
    this.$interval = $interval;
    this.$q = $q;
    this.$timeout = $timeout;
    this.bookmarkIdMapperSvc = BookmarkIdMapperSvc;
    this.bookmarkSvc = BookmarkSvc;
    this.logSvc = LogSvc;
    this.storeSvc = StoreSvc;
    this.utilitySvc = UtilitySvc;

    this.showAlert = false;
    this.showWorking = false;
  }

  get backgroundSvc(): WebExtBackgroundService {
    if (angular.isUndefined(this._backgroundSvc)) {
      this._backgroundSvc = this.$injector.get('WebExtBackgroundService');
    }
    return this._backgroundSvc;
  }

  automaticUpdates_NextUpdate(): ng.IPromise<string> {
    return browser.alarms.get(Globals.Alarm.Name).then((alarm) => {
      if (!alarm) {
        return '';
      }

      return this.get24hrTimeFromDate(new Date(alarm.scheduledTime));
    });
  }

  automaticUpdates_Start(): ng.IPromise<void> {
    // Register alarm
    return browser.alarms
      .clear(Globals.Alarm.Name)
      .then(() => {
        return browser.alarms.create(Globals.Alarm.Name, {
          periodInMinutes: Globals.Alarm.Period
        });
      })
      .catch((err) => {
        throw new Exceptions.FailedRegisterAutoUpdatesException(null, err);
      });
  }

  automaticUpdates_Stop(): ng.IPromise<void> {
    // Clear registered alarm
    return browser.alarms.clear(Globals.Alarm.Name).then(() => {});
  }

  bookmarks_BuildIdMappings(bookmarks: Bookmark[]): ng.IPromise<void> {
    const mapIds = (
      nativeBookmarks: NativeBookmarks.BookmarkTreeNode[],
      syncedBookmarks: Bookmark[]
    ): BookmarkIdMapping[] => {
      return nativeBookmarks.reduce((acc, val, index) => {
        // Create mapping for the current node
        const mapping = this.bookmarkIdMapperSvc.createMapping(syncedBookmarks[index].id, val.id);
        acc.push(mapping);

        // Process child nodes
        return val.children && val.children.length > 0
          ? acc.concat(mapIds(val.children, syncedBookmarks[index].children))
          : acc;
      }, [] as BookmarkIdMapping[]);
    };

    // Get native container ids
    return this.getNativeContainerIds()
      .then((nativeContainerIds) => {
        const menuBookmarksId: string = nativeContainerIds[BookmarkContainer.Menu];
        const mobileBookmarksId: string = nativeContainerIds[BookmarkContainer.Mobile];
        const otherBookmarksId: string = nativeContainerIds[BookmarkContainer.Other];
        const toolbarBookmarksId: string = nativeContainerIds[BookmarkContainer.Toolbar];

        // Map menu bookmarks
        const getMenuBookmarks =
          menuBookmarksId == null
            ? this.$q.resolve([] as BookmarkIdMapping[])
            : browser.bookmarks.getSubTree(menuBookmarksId).then((subTree) => {
                const menuBookmarks = subTree[0];
                if (!menuBookmarks.children || menuBookmarks.children.length === 0) {
                  return [] as BookmarkIdMapping[];
                }

                // Map ids between nodes and synced container children
                const menuBookmarksContainer = bookmarks.find((x) => {
                  return x.title === BookmarkContainer.Menu;
                });
                return !!menuBookmarksContainer &&
                  menuBookmarksContainer.children &&
                  menuBookmarksContainer.children.length > 0
                  ? mapIds(menuBookmarks.children, menuBookmarksContainer.children)
                  : ([] as BookmarkIdMapping[]);
              });

        // Map mobile bookmarks
        const getMobileBookmarks =
          mobileBookmarksId == null
            ? this.$q.resolve([] as BookmarkIdMapping[])
            : browser.bookmarks.getSubTree(mobileBookmarksId).then((subTree) => {
                const mobileBookmarks = subTree[0];
                if (!mobileBookmarks.children || mobileBookmarks.children.length === 0) {
                  return [] as BookmarkIdMapping[];
                }

                // Map ids between nodes and synced container children
                const mobileBookmarksContainer = bookmarks.find((x) => {
                  return x.title === BookmarkContainer.Mobile;
                });
                return !!mobileBookmarksContainer &&
                  mobileBookmarksContainer.children &&
                  mobileBookmarksContainer.children.length > 0
                  ? mapIds(mobileBookmarks.children, mobileBookmarksContainer.children)
                  : ([] as BookmarkIdMapping[]);
              });

        // Map other bookmarks
        const getOtherBookmarks =
          otherBookmarksId == null
            ? this.$q.resolve([] as BookmarkIdMapping[])
            : browser.bookmarks.getSubTree(otherBookmarksId).then((subTree) => {
                const otherBookmarks = subTree[0];
                if (!otherBookmarks.children || otherBookmarks.children.length === 0) {
                  return [] as BookmarkIdMapping[];
                }

                // Remove any unsupported container folders present
                const nodes = otherBookmarks.children.filter((x) => {
                  return Object.values(nativeContainerIds).indexOf(x.id) < 0;
                });

                // Map ids between nodes and synced container children
                const otherBookmarksContainer = bookmarks.find((x) => {
                  return x.title === BookmarkContainer.Other;
                });
                return !!otherBookmarksContainer &&
                  otherBookmarksContainer.children &&
                  otherBookmarksContainer.children.length > 0
                  ? mapIds(nodes, otherBookmarksContainer.children)
                  : ([] as BookmarkIdMapping[]);
              });

        // Map toolbar bookmarks if enabled
        const getToolbarBookmarks =
          toolbarBookmarksId == null
            ? this.$q.resolve([] as BookmarkIdMapping[])
            : this.$q
                .all([this.bookmarkSvc.getSyncBookmarksToolbar(), browser.bookmarks.getSubTree(toolbarBookmarksId)])
                .then((results) => {
                  const syncBookmarksToolbar = results[0];
                  const toolbarBookmarks = results[1][0];

                  if (!syncBookmarksToolbar || !toolbarBookmarks.children || toolbarBookmarks.children.length === 0) {
                    return [] as BookmarkIdMapping[];
                  }

                  // Map ids between nodes and synced container children
                  const toolbarBookmarksContainer = bookmarks.find((x) => {
                    return x.title === BookmarkContainer.Toolbar;
                  });
                  return !!toolbarBookmarksContainer &&
                    toolbarBookmarksContainer.children &&
                    toolbarBookmarksContainer.children.length > 0
                    ? mapIds(toolbarBookmarks.children, toolbarBookmarksContainer.children)
                    : ([] as BookmarkIdMapping[]);
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

  bookmarks_Clear(): ng.IPromise<void> {
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
                return this.deleteNativeBookmarks(child.id);
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
              return null;
            }

            return browser.bookmarks.getChildren(toolbarBookmarksId).then((results) => {
              return this.$q.all(
                results.map((child) => {
                  return this.deleteNativeBookmarks(child.id);
                })
              );
            });
          })
          .catch((err) => {
            this.logSvc.logWarning('Error clearing bookmarks toolbar');
            throw err;
          });

        return this.$q.all([clearOthers, clearToolbar]).then(() => {});
      })
      .catch((err) => {
        throw new Exceptions.FailedRemoveNativeBookmarksException(null, err);
      });
  }

  bookmarks_Created(
    bookmarks: Bookmark[],
    createdNativeBookmark: NativeBookmarks.BookmarkTreeNode
  ): ng.IPromise<Bookmark[]> {
    // Check if the current bookmark is a container
    return this.getContainerNameFromNativeId(createdNativeBookmark.parentId)
      .then((containerName) => {
        if (containerName) {
          // If parent is a container use it's id
          const container = this.bookmarkSvc.getContainer(containerName, bookmarks, true);
          return container.id as number;
        }

        // Get the synced parent id from id mappings and retrieve the synced parent bookmark
        return this.bookmarkIdMapperSvc.get(createdNativeBookmark.parentId).then((idMapping) => {
          if (!idMapping) {
            // No mappings found, skip sync
            this.logSvc.logInfo('No id mapping found, skipping sync');
            return null;
          }

          return idMapping.syncedId;
        });
      })
      .then((parentId) => {
        if (!parentId) {
          return null;
        }

        // Add new bookmark then check if the change should be synced
        const newBookmarkInfo = angular.copy(createdNativeBookmark) as any;
        newBookmarkInfo.parentId = parentId;
        delete newBookmarkInfo.id;
        const addBookmarkResult = this.bookmarkSvc.addBookmark(newBookmarkInfo, bookmarks);
        return this.shouldSyncLocalChanges(addBookmarkResult.bookmark, addBookmarkResult.bookmarks).then(
          (syncChange) => {
            if (!syncChange) {
              return null;
            }

            // Add new id mapping
            const idMapping = this.bookmarkIdMapperSvc.createMapping(
              addBookmarkResult.bookmark.id,
              createdNativeBookmark.id
            );
            return this.bookmarkIdMapperSvc.add(idMapping).then(() => {
              return addBookmarkResult.bookmarks;
            });
          }
        );
      });
  }

  bookmarks_CreateSingle(createDetails: any): ng.IPromise<void> {
    // Create local bookmark in other bookmarks container
    return this.getNativeContainerIds()
      .then((nativeContainerIds) => {
        const otherBookmarksId = nativeContainerIds[BookmarkContainer.Other];
        return this.createNativeBookmark(otherBookmarksId, createDetails.bookmark.title, createDetails.bookmark.url);
      })
      .then((newLocalBookmark) => {
        // Add id mapping for new bookmark
        const idMapping = this.bookmarkIdMapperSvc.createMapping(createDetails.bookmark.id, newLocalBookmark.id);
        return this.bookmarkIdMapperSvc.add(idMapping);
      });
  }

  bookmarks_Deleted(
    bookmarks: Bookmark[],
    deletedNativeBookmark: NativeBookmarks.BookmarkTreeNode
  ): ng.IPromise<Bookmark[]> {
    // Check if the deleted bookmark was an unsupported container
    const isContainer =
      this.unsupportedContainers.filter((x) => {
        return x === deletedNativeBookmark.title;
      }).length > 0;
    if (isContainer) {
      throw new Exceptions.ContainerChangedException();
    }

    // Get the synced bookmark id from delete info
    return this.bookmarkIdMapperSvc.get(deletedNativeBookmark.id).then((idMapping) => {
      if (!idMapping) {
        // No mappings found, skip sync
        this.logSvc.logInfo('No id mapping found, skipping sync');
        return null;
      }

      // Check if the change should be synced
      const bookmarkToDelete = this.bookmarkSvc.findBookmarkById(bookmarks, idMapping.syncedId) as Bookmark;
      return this.shouldSyncLocalChanges(bookmarkToDelete, bookmarks).then((syncChange) => {
        if (!syncChange) {
          return;
        }

        // Get all child bookmark mappings
        const descendantsIds = this.bookmarkSvc.getIdsFromDescendants(bookmarkToDelete);

        // Delete bookmark
        return this.bookmarkSvc.removeBookmarkById(idMapping.syncedId, bookmarks).then((updatedBookmarks) => {
          // Remove all retrieved ids from mappings
          const syncedIds = descendantsIds.concat([idMapping.syncedId]);
          return this.bookmarkIdMapperSvc.remove(syncedIds).then(() => {
            return updatedBookmarks;
          });
        });
      });
    });
  }

  bookmarks_DeleteSingle(deleteDetails: any): ng.IPromise<void> {
    // Get local bookmark id from id mappings
    return this.bookmarkIdMapperSvc.get(null, deleteDetails.bookmark.id).then((idMapping) => {
      if (!idMapping) {
        this.logSvc.logWarning(`No id mapping found for synced id '${deleteDetails.bookmark.id}'`);
        return;
      }

      // Remove local bookmark
      return this.deleteNativeBookmarks(idMapping.nativeId).then(() => {
        // Remove id mapping
        return this.bookmarkIdMapperSvc.remove(deleteDetails.bookmark.id);
      });
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

                // Remove any unsupported container folders present
                const bookmarksWithoutContainers = this.getNativeBookmarksAsBookmarks(otherBookmarks.children).filter(
                  (x) => {
                    return !this.unsupportedContainers.find((y) => {
                      return y === x.title;
                    });
                  }
                );
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

        // Iterate local bookmarks to add unique bookmark ids in correct order
        allNativeBookmarks.forEach((localBookmark) => {
          this.bookmarkSvc.eachBookmark(bookmarks, (xBookmark) => {
            if (
              !xBookmark.id &&
              ((!localBookmark.url && xBookmark.title === localBookmark.title) ||
                (localBookmark.url && xBookmark.url === localBookmark.url))
            ) {
              xBookmark.id = this.bookmarkSvc.getNewBookmarkId(bookmarks);
            }
          });
        });

        // Find and fix any bookmarks missing ids
        this.bookmarkSvc.eachBookmark(bookmarks, (xBookmark) => {
          if (!xBookmark.id) {
            xBookmark.id = this.bookmarkSvc.getNewBookmarkId(bookmarks);
          }
        });

        return bookmarks;
      });
  }

  bookmarks_LocalBookmarkInToolbar(nativeBookmark: NativeBookmarks.BookmarkTreeNode): ng.IPromise<boolean> {
    return this.getNativeContainerIds().then((nativeContainerIds) => {
      return nativeBookmark.parentId === nativeContainerIds[BookmarkContainer.Toolbar];
    });
  }

  bookmarks_Moved(bookmarks: Bookmark[], moveInfo: NativeBookmarks.OnMovedMoveInfoType): ng.IPromise<Bookmark[]> {
    let changesMade = false;

    // Get the moved bookmark and new parent ids from id mappings or if container use the existing id
    return this.$q
      .all([
        this.bookmarkIdMapperSvc.get((moveInfo as any).id),
        this.getContainerNameFromNativeId(moveInfo.parentId).then((containerName) => {
          if (containerName) {
            const container = this.bookmarkSvc.getContainer(containerName, bookmarks, true);
            return { syncedId: container.id };
          }
          return this.bookmarkIdMapperSvc.get(moveInfo.parentId);
        })
      ])
      .then((idMappings) => {
        if (!idMappings[0] && !idMappings[1]) {
          // No mappings found, skip sync
          this.logSvc.logInfo('No id mappings found, skipping sync');
          return;
        }

        // Get the bookmark to be removed
        // If no mapping exists then native bookmark will likely have been
        //  created in toolbar container whilst not syncing toolbar option enabled
        //  in which case create a new bookmark from the native bookmark
        return (!idMappings[0]
          ? this.createBookmarkFromNativeBookmarkId((moveInfo as any).id, bookmarks)
          : this.$q.resolve(this.bookmarkSvc.findBookmarkById(bookmarks, idMappings[0].syncedId) as Bookmark)
        ).then((bookmarkToRemove) => {
          // If old parent is mapped, remove the moved bookmark
          let removeBookmarkPromise: ng.IPromise<Bookmark[]>;
          if (!idMappings[0]) {
            // Moved bookmark not mapped, skip remove
            removeBookmarkPromise = this.$q.resolve(bookmarks);
          } else {
            // Check if change should be synced then remove the bookmark
            removeBookmarkPromise = this.shouldSyncLocalChanges(bookmarkToRemove, bookmarks).then((syncChange) => {
              if (!syncChange) {
                return bookmarks;
              }
              return this.bookmarkSvc.removeBookmarkById(idMappings[0].syncedId, bookmarks).then((updatedBookmarks) => {
                // Set flag to ensure update bookmarks are synced
                changesMade = true;
                return updatedBookmarks;
              });
            });
          }
          return removeBookmarkPromise
            .then((bookmarksAfterRemoval) => {
              let addBookmarkPromise: ng.IPromise<Bookmark[]>;
              if (!idMappings[1]) {
                // New parent not mapped, skip add
                addBookmarkPromise = this.$q.resolve(bookmarksAfterRemoval);
              } else {
                // Add the bookmark then check if change should be synced
                const newBookmarkInfo: any = angular.copy(bookmarkToRemove);
                newBookmarkInfo.parentId = idMappings[1].syncedId;
                addBookmarkPromise = this.countNativeContainersBeforeIndex(moveInfo.parentId, moveInfo.index).then(
                  (numContainers) => {
                    // Adjust the target index by the number of container folders then add the bookmark
                    newBookmarkInfo.index = moveInfo.index - numContainers;
                    const addBookmarkResult = this.bookmarkSvc.addBookmark(newBookmarkInfo, bookmarksAfterRemoval);
                    return this.shouldSyncLocalChanges(addBookmarkResult.bookmark, addBookmarkResult.bookmarks).then(
                      (syncChange) => {
                        if (!syncChange) {
                          return bookmarksAfterRemoval;
                        }

                        // Set flag to ensure update bookmarks are synced
                        changesMade = true;

                        // Add new id mapping for moved bookmark
                        if (idMappings[0]) {
                          // If moved bookmark was already mapped, no need to update id mappings
                          return addBookmarkResult.bookmarks;
                        }
                        const idMapping = this.bookmarkIdMapperSvc.createMapping(
                          addBookmarkResult.bookmark.id,
                          (moveInfo as any).id
                        );
                        return this.bookmarkIdMapperSvc.add(idMapping).then(() => {
                          return addBookmarkResult.bookmarks;
                        });
                      }
                    );
                  }
                );
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
        const otherBookmarksId: string = nativeContainerIds[BookmarkContainer.Other];
        const toolbarBookmarksId: string = nativeContainerIds[BookmarkContainer.Toolbar];

        // Populate menu bookmarks in other bookmarks
        let populateMenu = this.$q.resolve();
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
        let populateMobile = this.$q.resolve();
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
        let populateOther = this.$q.resolve();
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
        this.logSvc.logInfo(
          `Local bookmarks populated in ${((new Date() as any) - (populateStartTime as any)) / 1000}s`
        );
        // Move local containers into the correct order
        return this.bookmarks_ReorderContainers();
      });
  }

  bookmarks_ReorderContainers(): ng.IPromise<void> {
    // Get local containers
    return this.$q.all(this.unsupportedContainers.map(this.getNativeBookmarkByTitle)).then((results) => {
      // Remove falsy results
      const localContainers = results.filter((x) => {
        return x;
      });

      // Reorder each local container to top of parent
      return this.$q
        .all(
          localContainers.map((localContainer, index) => {
            return browser.bookmarks.move((localContainer as any).id, {
              index,
              parentId: (localContainer as any).parentId
            });
          })
        )
        .then(() => {});
    });
  }

  bookmarks_Updated(
    bookmarks: Bookmark[],
    updateInfo: NativeBookmarks.OnChangedChangeInfoType
  ): ng.IPromise<Bookmark[]> {
    // Get the synced bookmark id from change info
    return this.bookmarkIdMapperSvc.get((updateInfo as any).id).then((idMapping) => {
      if (!idMapping) {
        // No mappings found, skip sync
        this.logSvc.logInfo('No id mapping found, skipping sync');
        return;
      }

      // Check if the change should be synced
      const bookmarkToUpdate = this.bookmarkSvc.findBookmarkById(bookmarks, idMapping.syncedId) as Bookmark;
      return this.shouldSyncLocalChanges(bookmarkToUpdate, bookmarks).then((syncChange) => {
        if (!syncChange) {
          return;
        }

        // Update the bookmark with the update info
        return this.bookmarkSvc.updateBookmarkById(idMapping.syncedId, updateInfo, bookmarks);
      });
    });
  }

  bookmarks_UpdateSingle(updateDetails: any): ng.IPromise<void> {
    // Get local bookmark id from id mappings
    return this.bookmarkIdMapperSvc.get(null, updateDetails.bookmark.id).then((idMapping) => {
      if (!idMapping) {
        this.logSvc.logWarning(`No id mapping found for synced id '${updateDetails.bookmark.id}'`);
        return;
      }

      // Update local bookmark
      return this.updateLocalBookmark(
        idMapping.nativeId,
        updateDetails.bookmark.title,
        updateDetails.bookmark.url
      ).then(() => {});
    });
  }

  copyTextToClipboard(text: string): ng.IPromise<void> {
    return navigator.clipboard.writeText(text);
  }

  createBookmarkFromNativeBookmarkId(id: string, bookmarks: Bookmark[]): ng.IPromise<Bookmark> {
    return browser.bookmarks.get(id).then((results) => {
      if (!results || results.length === 0) {
        throw new Exceptions.NativeBookmarkNotFoundException();
      }
      const localBookmark = results[0];
      const convertedBookmark = this.bookmarkSvc.convertNativeBookmarkToBookmark(localBookmark, bookmarks);
      return convertedBookmark;
    });
  }

  createNativeBookmark(
    parentId: string,
    title: string,
    url: string,
    index?: number
  ): ng.IPromise<NativeBookmarks.BookmarkTreeNode> {
    const nativeBookmark: NativeBookmarks.CreateDetails = {
      index,
      parentId,
      title,
      url
    };

    // Check that the url is supported
    if (!this.nativeBookmarkUrlIsSupported(url)) {
      this.logSvc.logInfo(`Bookmark url unsupported: ${url}`);
      nativeBookmark.url = this.getNewTabUrl();
    }

    return browser.bookmarks.create(nativeBookmark).catch((err) => {
      this.logSvc.logWarning(`Failed to create local bookmark: ${JSON.stringify(nativeBookmark)}`);
      throw new Exceptions.FailedCreateNativeBookmarksException(null, err);
    });
  }

  createNativeBookmarkTree(
    parentId: string,
    bookmarks: Bookmark[],
    nativeToolbarContainerId?: string
  ): ng.IPromise<void> {
    let processError: Error;
    const createRecursive = (id: string, bookmarksToCreate: Bookmark[], toolbarId: string) => {
      const createChildBookmarksPromises = [];

      // Create bookmarks at the top level of the supplied array
      return bookmarksToCreate
        .reduce((p, xBookmark) => {
          return p.then(() => {
            // If an error occurred during the recursive process, prevent any more bookmarks being created
            if (processError) {
              return this.$q.resolve();
            }

            return this.bookmarkSvc.isSeparator(xBookmark)
              ? this.createNativeSeparator(id, toolbarId).then(() => {})
              : this.createNativeBookmark(id, xBookmark.title, xBookmark.url).then((newLocalBookmark) => {
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
        .then(() => {})
        .catch((err) => {
          processError = err;
          throw err;
        });
    };
    return createRecursive(parentId, bookmarks, nativeToolbarContainerId);
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
      url: this.getNewTabUrl()
    };
    return browser.bookmarks.create(newSeparator).catch((err) => {
      this.logSvc.logInfo('Failed to create local separator');
      throw new Exceptions.FailedCreateNativeBookmarksException(null, err);
    });
  }

  deleteNativeBookmarks(id: string): ng.IPromise<void> {
    return browser.bookmarks.removeTree(id).catch((err) => {
      this.logSvc.logInfo(`Failed to delete local bookmark: ${id}`);
      throw new Exceptions.FailedRemoveNativeBookmarksException(null, err);
    });
  }

  downloadFile(fileName: string, textContents: string, linkId: string): ng.IPromise<string> {
    if (!fileName) {
      throw new Error('File name not supplied.');
    }

    // Use provided hyperlink or create new one
    let downloadLink: HTMLAnchorElement;
    if (linkId) {
      downloadLink = document.getElementById(linkId) as HTMLAnchorElement;
    } else {
      downloadLink = document.createElement('a');
      downloadLink.style.display = 'none';
      document.body.appendChild(downloadLink);
    }

    if (!downloadLink) {
      throw new Error('Link element not found.');
    }

    this.logSvc.logInfo(`Downloading file ${fileName}`);

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

  eventListeners_Disable(): ng.IPromise<void> {
    return this.sendMessage({
      command: MessageCommand.DisableEventListeners
    });
  }

  eventListeners_Enable(): ng.IPromise<void> {
    return this.sendMessage({
      command: MessageCommand.EnableEventListeners
    });
  }

  getNativeBookmarkByTitle(title: string): ng.IPromise<NativeBookmarks.BookmarkTreeNode> {
    if (!title) {
      return this.$q.resolve(null);
    }

    return browser.bookmarks.search({ title }).then((results) => {
      return results.shift();
    });
  }

  get24hrTimeFromDate(date = new Date()): string {
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }

  getConstant(i18nString: I18nString): string {
    let message = '';

    if (i18nString && i18nString.key) {
      message = browser.i18n.getMessage(i18nString.key);
    }

    if (!message) {
      this.logSvc.logWarning('I18n string has no value');
    }

    return message;
  }

  getCurrentUrl(): ng.IPromise<string> {
    // Get current tab
    return browser.tabs.query({ currentWindow: true, active: true }).then((tabs) => {
      return tabs[0].url;
    });
  }

  getHelpPages(): string[] {
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

  getNativeBookmarksAsBookmarks(nativeBookmarks: NativeBookmarks.BookmarkTreeNode[]): Bookmark[] {
    const bookmarks: Bookmark[] = [];
    for (let i = 0; i < nativeBookmarks.length; i += 1) {
      // Check if current local bookmark is a separator
      const nativeBookmark = nativeBookmarks[i];
      const bookmark = this.bookmarkSvc.isSeparator(nativeBookmark)
        ? this.bookmarkSvc.newSeparator()
        : this.bookmarkSvc.newBookmark(nativeBookmark.title, nativeBookmark.url);

      // If this is a folder and has children, process them
      if (nativeBookmark.children && nativeBookmark.children.length > 0) {
        bookmark.children = this.getNativeBookmarksAsBookmarks(nativeBookmark.children);
      }
      bookmarks.push(bookmark);
    }
    return bookmarks;
  }

  getNativeContainerIds(): ng.IPromise<any> {
    return browser.bookmarks.getTree().then((tree) => {
      // Get the root child nodes
      const otherBookmarksNode = tree[0].children.find((x) => {
        return x.id === '2';
      });
      const toolbarBookmarksNode = tree[0].children.find((x) => {
        return x.id === '1';
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

  getNewTabUrl(): string {
    return 'chrome://newtab/';
  }

  countNativeContainersBeforeIndex(parentId: string, index: number): ng.IPromise<number> {
    // Get native container ids
    return this.getNativeContainerIds().then((nativeContainerIds) => {
      // No containers to adjust for if parent is not other bookmarks
      if (parentId !== nativeContainerIds[BookmarkContainer.Other]) {
        return 0;
      }

      // Get parent bookmark and count containers
      return browser.bookmarks.getSubTree(parentId).then((subTree) => {
        const numContainers = subTree[0].children.filter((child, childIndex) => {
          return childIndex < index && this.bookmarkSvc.bookmarkIsContainer(child);
        }).length;
        return numContainers;
      });
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getPageMetadata(getFullMetadata = true, pageUrl?: string): ng.IPromise<WebpageMetadata> {
    return browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      // If active tab empty, throw error
      const activeTab = tabs && tabs[0];
      if (!activeTab) {
        throw new Exceptions.FailedGetPageMetadataException();
      }

      // Default metadata to the info from the active tab
      let metadata: WebpageMetadata = activeTab && {
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
          this.logSvc.logWarning(`Unable to get metadata: ${err ? err.message : ''}`);
          return metadata;
        });
    });
  }

  getSupportedUrl(url: string): string {
    return this.nativeBookmarkUrlIsSupported(url) ? url : this.getNewTabUrl();
  }

  interface_Refresh(syncEnabled?: boolean, syncType?: SyncType): ng.IPromise<void> {
    let iconPath: string;
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
        syncType === SyncType.Pull
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
      const iconUpdated = this.$q.defer<void>();
      const titleUpdated = this.$q.defer<void>();

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

  interface_Working_Hide(id?: string, timeout?: ng.IPromise<void>): void {
    if (timeout) {
      this.$timeout.cancel(timeout);
    }

    // Hide any alert messages
    this.showAlert = false;

    // Hide loading overlay if supplied if matches current
    if (!this.loadingId || id === this.loadingId) {
      this.showWorking = false;
      this.loadingId = null;
    }
  }

  interface_Working_Show(id?: string): ng.IPromise<void> {
    let timeout: ng.IPromise<void>;

    // Return if loading overlay already displayed
    if (this.loadingId) {
      return;
    }

    // Hide any alert messages
    this.showAlert = false;

    switch (id) {
      // Loading bookmark metadata, wait a moment before displaying loading overlay
      case 'retrievingMetadata':
        timeout = this.$timeout(() => {
          this.showWorking = true;
        }, 500);
        break;
      // Display default overlay
      default:
        timeout = this.$timeout(() => {
          this.showWorking = true;
        });
        break;
    }

    this.loadingId = id;
    return timeout;
  }

  getContainerNameFromNativeId(nativeBookmarkId: string): ng.IPromise<string> {
    return this.getNativeContainerIds().then((nativeContainerIds) => {
      const menuBookmarksId = nativeContainerIds[BookmarkContainer.Menu] as string;
      const mobileBookmarksId = nativeContainerIds[BookmarkContainer.Mobile] as string;
      const otherBookmarksId = nativeContainerIds[BookmarkContainer.Other] as string;
      const toolbarBookmarksId = nativeContainerIds[BookmarkContainer.Toolbar] as string;

      const localContainers = [
        { nativeId: otherBookmarksId, containerName: BookmarkContainer.Other },
        { nativeId: toolbarBookmarksId, containerName: BookmarkContainer.Toolbar }
      ];

      if (menuBookmarksId) {
        localContainers.push({ nativeId: menuBookmarksId, containerName: BookmarkContainer.Menu });
      }

      if (mobileBookmarksId) {
        localContainers.push({ nativeId: mobileBookmarksId, containerName: BookmarkContainer.Mobile });
      }

      // Check if the native bookmark id resolves to a container
      const result = localContainers.find((x) => x.nativeId === nativeBookmarkId);
      return result ? result.containerName : '';
    });
  }

  nativeBookmarkUrlIsSupported(url: string): boolean {
    if (!url) {
      return true;
    }

    return this.supportedLocalBookmarkUrlRegex.test(url);
  }

  openUrl(url: string): void {
    // Check url is supported
    if (!this.nativeBookmarkUrlIsSupported(url)) {
      this.logSvc.logInfo(`Attempted to navigate to unsupported url: ${url}`);
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

  permissions_Check(): ng.IPromise<boolean> {
    // Check if extension has optional permissions
    return this.$q.resolve().then(() => {
      return browser.permissions.contains(this.optionalPermissions);
    });
  }

  permissions_Remove(): ng.IPromise<void> {
    // Remove optional permissions
    return browser.permissions.remove(this.optionalPermissions).then(() => {
      this.logSvc.logInfo('Optional permissions removed');
    });
  }

  permissions_Request(): ng.IPromise<boolean> {
    // Request optional permissions
    return browser.permissions.request(this.optionalPermissions).then((granted) => {
      this.logSvc.logInfo(`Optional permissions ${!granted ? 'not ' : ''}granted`);
      return granted;
    });
  }

  refreshLocalSyncData(): ng.IPromise<void> {
    return this.sync_Queue({ type: SyncType.Pull }).then(() => {
      this.logSvc.logInfo('Local sync data refreshed');
    });
  }

  sendMessage(message: any): ng.IPromise<any> {
    let module: ng.IModule;
    try {
      module = angular.module('WebExtBackgroundModule');
    } catch (err) {}

    let promise: ng.IPromise<any>;
    if (angular.isUndefined(module)) {
      promise = browser.runtime.sendMessage(message);
    } else {
      promise = this.backgroundSvc.onMessage(message);
    }

    return promise.catch((err: Error) => {
      const exception: Exceptions.Exception = new (<any>Exceptions)[err.message]();
      exception.logged = true;
      throw exception;
    });
  }

  shouldSyncLocalChanges(changedBookmark: Bookmark, bookmarks: Bookmark[]): ng.IPromise<boolean> {
    // Check if container was changed
    return this.wasContainerChanged(changedBookmark, bookmarks)
      .then((changedBookmarkIsContainer) => {
        if (changedBookmarkIsContainer) {
          throw new Exceptions.ContainerChangedException();
        }

        // If container is Toolbar, check if Toolbar sync is disabled
        const container = this.bookmarkSvc.getContainerByBookmarkId(changedBookmark.id, bookmarks);
        if (!container) {
          throw new Exceptions.ContainerNotFoundException();
        }
        return container.title === BookmarkContainer.Toolbar
          ? this.bookmarkSvc.getSyncBookmarksToolbar()
          : this.$q.resolve(true);
      })
      .then((syncBookmarksToolbar) => {
        if (!syncBookmarksToolbar) {
          this.logSvc.logInfo('Not syncing toolbar');
          return false;
        }

        return true;
      });
  }

  sync_Current(): ng.IPromise<Sync> {
    return this.sendMessage({
      command: MessageCommand.GetCurrentSync
    });
  }

  sync_Disable(): ng.IPromise<any> {
    return this.sendMessage({
      command: MessageCommand.DisableSync
    });
  }

  sync_DisplayConfirmation(): boolean {
    return true;
  }

  sync_GetQueueLength(): ng.IPromise<number> {
    return this.sendMessage({
      command: MessageCommand.GetSyncQueueLength
    });
  }

  sync_Queue(sync: Sync, command = MessageCommand.SyncBookmarks, runSync = true): ng.IPromise<any> {
    const message: any = angular.copy(sync);
    message.command = command;
    message.runSync = runSync;
    return this.sendMessage(message);
  }

  updateLocalBookmark(id: string, title: string, url: string): ng.IPromise<NativeBookmarks.BookmarkTreeNode> {
    const updateInfo: NativeBookmarks.UpdateChangesType = {
      title,
      url
    };

    // Check that the url is supported
    if (!this.nativeBookmarkUrlIsSupported(url)) {
      this.logSvc.logInfo(`Bookmark url unsupported: ${url}`);
      updateInfo.url = this.getNewTabUrl();
    }

    return browser.bookmarks.update(id, updateInfo).catch((err) => {
      this.logSvc.logInfo(`Failed to update local bookmark: ${JSON.stringify(updateInfo)}`);
      throw new Exceptions.FailedUpdateNativeBookmarksException(null, err);
    });
  }

  wasContainerChanged(changedBookmark: Bookmark, bookmarks: Bookmark[]): ng.IPromise<boolean> {
    return (bookmarks ? this.$q.resolve(bookmarks) : this.bookmarkSvc.getCachedBookmarks()).then((results) => {
      bookmarks = results;

      // Check based on title
      if (this.bookmarkSvc.bookmarkIsContainer(changedBookmark)) {
        return true;
      }

      // Get native container ids
      return this.getNativeContainerIds().then((nativeContainerIds) => {
        // If parent is other bookmarks, check other bookmarks children for containers
        const otherBookmarksId = nativeContainerIds[BookmarkContainer.Other];
        if ((changedBookmark as any).parentId !== otherBookmarksId) {
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
            const menuContainer = this.bookmarkSvc.getContainer(BookmarkContainer.Menu, bookmarks, false);
            if (menuContainer) {
              containersCount += 1;
              count = localContainers.filter((x) => {
                return x.title === BookmarkContainer.Menu;
              }).length;
              checksFailed = count !== 1 ? true : checksFailed;
            }

            const mobileContainer = this.bookmarkSvc.getContainer(BookmarkContainer.Mobile, bookmarks, false);
            if (mobileContainer) {
              containersCount += 1;
              count = localContainers.filter((x) => {
                return x.title === BookmarkContainer.Mobile;
              }).length;
              checksFailed = count !== 1 ? true : checksFailed;
            }

            // Check number of containers match and return result
            checksFailed = containersCount !== localContainers.length ? true : checksFailed;
            return checksFailed;
          })
          .catch((err) => {
            this.logSvc.logInfo(`Failed to detect whether container changed: ${JSON.stringify(changedBookmark)}`);
            throw new Exceptions.FailedGetNativeBookmarksException(null, err);
          });
      });
    });
  }
}
