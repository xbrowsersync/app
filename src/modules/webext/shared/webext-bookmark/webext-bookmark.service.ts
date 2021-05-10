import angular from 'angular';
import autobind from 'autobind-decorator';
import { Bookmarks as NativeBookmarks, browser } from 'webextension-polyfill-ts';
import { BookmarkChangeType, BookmarkContainer, BookmarkType } from '../../../shared/bookmark/bookmark.enum';
import {
  AddNativeBookmarkChangeData,
  Bookmark,
  BookmarkChange,
  BookmarkMetadata,
  ModifyNativeBookmarkChangeData,
  MoveNativeBookmarkChangeData,
  OnChildrenReorderedReorderInfoType,
  RemoveNativeBookmarkChangeData,
  ReorderNativeBookmarkChangeData,
  UpdateBookmarksResult
} from '../../../shared/bookmark/bookmark.interface';
import BookmarkHelperService from '../../../shared/bookmark/bookmark-helper/bookmark-helper.service';
import * as Exceptions from '../../../shared/exception/exception';
import { MessageCommand } from '../../../shared/global-shared.enum';
import { PlatformService, WebpageMetadata } from '../../../shared/global-shared.interface';
import LogService from '../../../shared/log/log.service';
import SettingsService from '../../../shared/settings/settings.service';
import StoreService from '../../../shared/store/store.service';
import { SyncType } from '../../../shared/sync/sync.enum';
import { Sync } from '../../../shared/sync/sync.interface';
import SyncService from '../../../shared/sync/sync.service';
import UtilityService from '../../../shared/utility/utility.service';
import { BookmarkIdMapping } from '../bookmark-id-mapper/bookmark-id-mapper.interface';
import BookmarkIdMapperService from '../bookmark-id-mapper/bookmark-id-mapper.service';

@autobind
export default abstract class WebExtBookmarkService {
  $injector: ng.auto.IInjectorService;
  $q: ng.IQService;
  $timeout: ng.ITimeoutService;
  bookmarkIdMapperSvc: BookmarkIdMapperService;
  bookmarkHelperSvc: BookmarkHelperService;
  logSvc: LogService;
  platformSvc: PlatformService;
  settingsSvc: SettingsService;
  storeSvc: StoreService;
  _syncSvc: SyncService;
  utilitySvc: UtilityService;

  nativeBookmarkEventsQueue: any[] = [];
  processNativeBookmarkEventsTimeout: ng.IPromise<void>;
  unsupportedContainers = [];

  static $inject = [
    '$injector',
    '$q',
    '$timeout',
    'BookmarkHelperService',
    'BookmarkIdMapperService',
    'LogService',
    'PlatformService',
    'SettingsService',
    'StoreService',
    'UtilityService'
  ];
  constructor(
    $injector: ng.auto.IInjectorService,
    $q: ng.IQService,
    $timeout: ng.ITimeoutService,
    BookmarkHelperSvc: BookmarkHelperService,
    BookmarkIdMapperSvc: BookmarkIdMapperService,
    LogSvc: LogService,
    PlatformSvc: PlatformService,
    SettingsSvc: SettingsService,
    StoreSvc: StoreService,
    UtilitySvc: UtilityService
  ) {
    this.$injector = $injector;
    this.$q = $q;
    this.$timeout = $timeout;
    this.bookmarkIdMapperSvc = BookmarkIdMapperSvc;
    this.bookmarkHelperSvc = BookmarkHelperSvc;
    this.logSvc = LogSvc;
    this.platformSvc = PlatformSvc;
    this.settingsSvc = SettingsSvc;
    this.storeSvc = StoreSvc;
    this.utilitySvc = UtilitySvc;
  }

  get syncSvc(): SyncService {
    if (angular.isUndefined(this._syncSvc)) {
      this._syncSvc = this.$injector.get('SyncService');
    }
    return this._syncSvc;
  }

  addBookmark(bookmark: Bookmark, parentId: number, index: number, bookmarks: Bookmark[]): UpdateBookmarksResult {
    // Add bookmark as child at index param
    const updatedBookmarks = angular.copy(bookmarks);
    const parent = this.bookmarkHelperSvc.findBookmarkById(parentId, updatedBookmarks);
    if (!parent) {
      throw new Exceptions.BookmarkNotFoundException();
    }
    parent.children.splice(index, 0, bookmark);

    return {
      bookmark,
      bookmarks: updatedBookmarks
    } as UpdateBookmarksResult;
  }

  buildIdMappings(bookmarks: Bookmark[]): ng.IPromise<void> {
    const mapIds = (
      nativeBookmarks: NativeBookmarks.BookmarkTreeNode[],
      syncedBookmarks: Bookmark[]
    ): BookmarkIdMapping[] => {
      return nativeBookmarks.reduce((acc, val, index) => {
        // Create mapping for the current node
        const mapping = this.bookmarkIdMapperSvc.createMapping(syncedBookmarks[index].id, val.id);
        acc.push(mapping);

        // Process child nodes
        return val.children?.length ? acc.concat(mapIds(val.children, syncedBookmarks[index].children)) : acc;
      }, [] as BookmarkIdMapping[]);
    };

    // Get native container ids
    return this.getNativeContainerIds()
      .then((nativeContainerIds) => {
        const menuBookmarksId = nativeContainerIds.get(BookmarkContainer.Menu);
        const mobileBookmarksId = nativeContainerIds.get(BookmarkContainer.Mobile);
        const otherBookmarksId = nativeContainerIds.get(BookmarkContainer.Other);
        const toolbarBookmarksId = nativeContainerIds.get(BookmarkContainer.Toolbar);

        // Map menu bookmarks
        const getMenuBookmarks =
          menuBookmarksId == null
            ? this.$q.resolve([] as BookmarkIdMapping[])
            : browser.bookmarks.getSubTree(menuBookmarksId).then((subTree) => {
                const menuBookmarks = subTree[0];
                if (!menuBookmarks.children?.length) {
                  return [] as BookmarkIdMapping[];
                }

                // Map ids between nodes and synced container children
                const menuBookmarksContainer = bookmarks.find((x) => {
                  return x.title === BookmarkContainer.Menu;
                });
                return menuBookmarksContainer?.children?.length
                  ? mapIds(menuBookmarks.children, menuBookmarksContainer.children)
                  : ([] as BookmarkIdMapping[]);
              });

        // Map mobile bookmarks
        const getMobileBookmarks =
          mobileBookmarksId == null
            ? this.$q.resolve([] as BookmarkIdMapping[])
            : browser.bookmarks.getSubTree(mobileBookmarksId).then((subTree) => {
                const mobileBookmarks = subTree[0];
                if (!mobileBookmarks.children?.length) {
                  return [] as BookmarkIdMapping[];
                }

                // Map ids between nodes and synced container children
                const mobileBookmarksContainer = bookmarks.find((x) => {
                  return x.title === BookmarkContainer.Mobile;
                });
                return mobileBookmarksContainer?.children?.length
                  ? mapIds(mobileBookmarks.children, mobileBookmarksContainer.children)
                  : ([] as BookmarkIdMapping[]);
              });

        // Map other bookmarks
        const getOtherBookmarks =
          otherBookmarksId == null
            ? this.$q.resolve([] as BookmarkIdMapping[])
            : browser.bookmarks.getSubTree(otherBookmarksId).then((subTree) => {
                const otherBookmarks = subTree[0];
                if (!otherBookmarks.children?.length) {
                  return [] as BookmarkIdMapping[];
                }

                // Remove any unsupported container folders present
                const nodes = otherBookmarks.children.filter((x) => !this.unsupportedContainers.includes(x.title));

                // Map ids between nodes and synced container children
                const otherBookmarksContainer = bookmarks.find((x) => {
                  return x.title === BookmarkContainer.Other;
                });
                return otherBookmarksContainer?.children?.length
                  ? mapIds(nodes, otherBookmarksContainer.children)
                  : ([] as BookmarkIdMapping[]);
              });

        // Map toolbar bookmarks if enabled
        const getToolbarBookmarks =
          toolbarBookmarksId == null
            ? this.$q.resolve([] as BookmarkIdMapping[])
            : browser.bookmarks.getSubTree(toolbarBookmarksId).then((results) => {
                return this.settingsSvc.syncBookmarksToolbar().then((syncBookmarksToolbar) => {
                  const toolbarBookmarks = results[0];

                  if (!syncBookmarksToolbar || !toolbarBookmarks.children?.length) {
                    return [] as BookmarkIdMapping[];
                  }

                  // Map ids between nodes and synced container children
                  const toolbarBookmarksContainer = bookmarks.find((x) => {
                    return x.title === BookmarkContainer.Toolbar;
                  });
                  return toolbarBookmarksContainer?.children?.length
                    ? mapIds(toolbarBookmarks.children, toolbarBookmarksContainer.children)
                    : ([] as BookmarkIdMapping[]);
                });
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

  checkIfBookmarkChangeShouldBeSynced(changedBookmark: Bookmark, bookmarks: Bookmark[]): ng.IPromise<boolean> {
    return this.settingsSvc.syncBookmarksToolbar().then((syncBookmarksToolbar) => {
      // If container is Toolbar, check if Toolbar sync is disabled
      const container = this.bookmarkHelperSvc.getContainerByBookmarkId(changedBookmark.id, bookmarks);
      if (!container) {
        throw new Exceptions.ContainerNotFoundException();
      }
      if (container.title === BookmarkContainer.Toolbar && !syncBookmarksToolbar) {
        this.logSvc.logInfo('Not syncing toolbar');
        return false;
      }
      return true;
    });
  }

  checkPermsAndGetPageMetadata(): ng.IPromise<WebpageMetadata> {
    return this.platformSvc.checkOptionalNativePermissions().then((hasPermissions) => {
      if (!hasPermissions) {
        this.logSvc.logInfo('Do not have permission to read active tab content');
      }

      // Depending on current perms, get full or partial page metadata
      return hasPermissions ? this.platformSvc.getPageMetadata(true) : this.platformSvc.getPageMetadata(false);
    });
  }

  abstract clearNativeBookmarks(): ng.IPromise<void>;

  convertNativeBookmarkToBookmark(
    nativeBookmark: NativeBookmarks.BookmarkTreeNode,
    bookmarks: Bookmark[],
    takenIds?: number[]
  ): Bookmark {
    if (!nativeBookmark) {
      return;
    }

    // Get a new bookmark id and add to taken ids array so that ids are not duplicated before bookmarks are updated
    const id = this.bookmarkHelperSvc.getNewBookmarkId(bookmarks, takenIds);
    if (angular.isUndefined(takenIds)) {
      takenIds = [];
    }
    takenIds.push(id);

    // Create the new bookmark
    const bookmark = this.bookmarkHelperSvc.newBookmark(nativeBookmark.title, nativeBookmark.url);
    bookmark.id = id;

    // Process children if any
    if (nativeBookmark.children?.length) {
      bookmark.children = nativeBookmark.children.map((childBookmark) => {
        return this.convertNativeBookmarkToBookmark(childBookmark, bookmarks, takenIds);
      });
    }

    return bookmark;
  }

  countNativeContainersBeforeIndex(parentId: string, index: number): ng.IPromise<number> {
    // Get native container ids
    return this.getNativeContainerIds().then((nativeContainerIds) => {
      // No containers to adjust for if parent is not other bookmarks
      if (parentId !== nativeContainerIds.get(BookmarkContainer.Other)) {
        return 0;
      }

      // Get parent bookmark and count containers
      return browser.bookmarks.getSubTree(parentId).then((subTree) => {
        const numContainers = subTree[0].children.filter((child, childIndex) => {
          return childIndex < index && Array.from(nativeContainerIds.values()).includes(child.id);
        }).length;
        return numContainers;
      });
    });
  }

  createBookmarkFromNativeBookmarkId(id: string, bookmarks: Bookmark[]): ng.IPromise<Bookmark> {
    return browser.bookmarks.get(id).then((results) => {
      if (results?.length === 0) {
        throw new Exceptions.NativeBookmarkNotFoundException();
      }
      const nativeBookmark = results[0];
      const convertedBookmark = this.convertNativeBookmarkToBookmark(nativeBookmark, bookmarks);
      return convertedBookmark;
    });
  }

  createNativeBookmark(
    parentId: string,
    title: string,
    url: string,
    index?: number
  ): ng.IPromise<NativeBookmarks.BookmarkTreeNode> {
    const nativeBookmarkInfo: NativeBookmarks.CreateDetails = {
      index,
      parentId,
      title
    };

    // Don't use unsupported urls for native bookmarks
    if (!angular.isUndefined(url ?? undefined)) {
      nativeBookmarkInfo.url = this.getSupportedUrl(url);
    }

    return browser.bookmarks.create(nativeBookmarkInfo).catch((err) => {
      this.logSvc.logWarning(`Failed to create native bookmark: ${JSON.stringify(nativeBookmarkInfo)}`);
      throw new Exceptions.FailedCreateNativeBookmarksException(undefined, err);
    });
  }

  abstract createNativeBookmarksFromBookmarks(bookmarks: Bookmark[]): ng.IPromise<number>;

  createNativeBookmarkTree(
    parentId: string,
    bookmarks: Bookmark[],
    nativeToolbarContainerId?: string
  ): ng.IPromise<number> {
    let processError: Error;
    let total = 0;
    const createRecursive = (id: string, bookmarksToCreate: Bookmark[] = [], toolbarId: string) => {
      const createChildBookmarksPromises = [];

      // Create bookmarks at the top level of the supplied array
      return bookmarksToCreate
        .reduce((p, bookmark) => {
          return p.then(() => {
            // If an error occurred during the recursive process, prevent any more bookmarks being created
            if (processError) {
              return this.$q.resolve();
            }

            return this.bookmarkHelperSvc.getBookmarkType(bookmark) === BookmarkType.Separator
              ? this.createNativeSeparator(id, toolbarId).then(() => {})
              : this.createNativeBookmark(id, bookmark.title, bookmark.url).then((newNativeBookmark) => {
                  // If the bookmark has children, recurse
                  if (bookmark.children?.length) {
                    createChildBookmarksPromises.push(
                      createRecursive(newNativeBookmark.id, bookmark.children, toolbarId)
                    );
                  }
                });
          });
        }, this.$q.resolve())
        .then(() => this.$q.all(createChildBookmarksPromises))
        .then(() => {
          total += bookmarksToCreate.length;
        })
        .catch((err) => {
          processError = err;
          throw err;
        });
    };
    return createRecursive(parentId, bookmarks, nativeToolbarContainerId).then(() => total);
  }

  abstract createNativeSeparator(
    parentId: string,
    nativeToolbarContainerId: string
  ): ng.IPromise<NativeBookmarks.BookmarkTreeNode>;

  abstract disableEventListeners(): ng.IPromise<void>;

  abstract enableEventListeners(): ng.IPromise<void>;

  abstract ensureContainersExist(bookmarks: Bookmark[]): Bookmark[];

  getContainerNameFromNativeId(nativeBookmarkId: string): ng.IPromise<string> {
    return this.getNativeContainerIds().then((nativeContainerIds) => {
      const menuBookmarksId = nativeContainerIds.get(BookmarkContainer.Menu);
      const mobileBookmarksId = nativeContainerIds.get(BookmarkContainer.Mobile);
      const otherBookmarksId = nativeContainerIds.get(BookmarkContainer.Other);
      const toolbarBookmarksId = nativeContainerIds.get(BookmarkContainer.Toolbar);

      const nativeContainers = [
        { nativeId: otherBookmarksId, containerName: BookmarkContainer.Other },
        { nativeId: toolbarBookmarksId, containerName: BookmarkContainer.Toolbar }
      ];

      if (menuBookmarksId) {
        nativeContainers.push({ nativeId: menuBookmarksId, containerName: BookmarkContainer.Menu });
      }

      if (mobileBookmarksId) {
        nativeContainers.push({ nativeId: mobileBookmarksId, containerName: BookmarkContainer.Mobile });
      }

      // Check if the native bookmark id resolves to a container
      const result = nativeContainers.find((x) => x.nativeId === nativeBookmarkId);
      return result ? result.containerName : '';
    });
  }

  getIdsFromDescendants(bookmark: Bookmark): number[] {
    const ids = [];
    if (angular.isUndefined(bookmark.children ?? undefined) || bookmark.children.length === 0) {
      return ids;
    }

    this.bookmarkHelperSvc.eachBookmark(bookmark.children, (child) => {
      ids.push(child.id);
    });
    return ids;
  }

  getNativeBookmarkByTitle(title: string): ng.IPromise<NativeBookmarks.BookmarkTreeNode> {
    if (!title) {
      return this.$q.resolve(null);
    }

    return browser.bookmarks.search({ title }).then((results) => {
      return results?.[0];
    });
  }

  abstract getNativeBookmarksAsBookmarks(): ng.IPromise<Bookmark[]>;

  abstract getNativeContainerIds(): ng.IPromise<Map<BookmarkContainer, string>>;

  getSupportedUrl(url: string): string {
    if (angular.isUndefined(url ?? undefined)) {
      return '';
    }

    // If url is not supported, use new tab url instead
    let returnUrl = url;
    if (!this.platformSvc.urlIsSupported(url)) {
      this.logSvc.logInfo(`Bookmark url unsupported: ${url}`);
      returnUrl = this.platformSvc.getNewTabUrl();
    }

    return returnUrl;
  }

  isNativeBookmarkInToolbarContainer(nativeBookmark: NativeBookmarks.BookmarkTreeNode): ng.IPromise<boolean> {
    return this.getNativeContainerIds().then((nativeContainerIds) => {
      return nativeBookmark.parentId === nativeContainerIds.get(BookmarkContainer.Toolbar);
    });
  }

  modifyNativeBookmark(id: string, newMetadata: BookmarkMetadata): ng.IPromise<NativeBookmarks.BookmarkTreeNode> {
    // Don't use unsupported urls for native bookmarks
    const updateInfo: NativeBookmarks.UpdateChangesType = {
      title: newMetadata.title
    };

    // Don't use unsupported urls for native bookmarks
    if (!angular.isUndefined(updateInfo.url ?? undefined)) {
      updateInfo.url = this.getSupportedUrl(updateInfo.url);
    }

    return browser.bookmarks.update(id, updateInfo).catch((err) => {
      this.logSvc.logInfo(`Failed to modify native bookmark: ${JSON.stringify(newMetadata)}`);
      throw new Exceptions.FailedUpdateNativeBookmarksException(undefined, err);
    });
  }

  onNativeBookmarkChanged(...args: any[]): void {
    this.logSvc.logInfo('onChanged event detected');
    this.queueNativeBookmarkEvent(BookmarkChangeType.Modify, ...args);
  }

  onNativeBookmarkCreated(...args: any[]): void {
    this.logSvc.logInfo('onCreated event detected');
    this.queueNativeBookmarkEvent(BookmarkChangeType.Add, ...args);
  }

  onNativeBookmarkMoved(...args: any[]): void {
    this.logSvc.logInfo('onMoved event detected');
    this.queueNativeBookmarkEvent(BookmarkChangeType.Move, ...args);
  }

  onNativeBookmarkRemoved(...args: any[]): void {
    this.logSvc.logInfo('onRemoved event detected');
    this.queueNativeBookmarkEvent(BookmarkChangeType.Remove, ...args);
  }

  processChangeOnNativeBookmarks(
    id: number,
    changeType: BookmarkChangeType,
    changeInfo: BookmarkMetadata
  ): ng.IPromise<void> {
    // Check the change type and process native bookmark changes
    switch (changeType) {
      case BookmarkChangeType.Add:
        return this.processChangeTypeAddOnNativeBookmarks(id, changeInfo);
      case BookmarkChangeType.Modify:
        return this.processChangeTypeModifyOnNativeBookmarks(id, changeInfo);
      case BookmarkChangeType.Remove:
        return this.processChangeTypeRemoveOnNativeBookmarks(id);
      default:
        throw new Exceptions.AmbiguousSyncRequestException();
    }
  }

  processChangeTypeAddOnBookmarks(
    bookmarks: Bookmark[],
    changeData: AddNativeBookmarkChangeData
  ): ng.IPromise<Bookmark[]> {
    // Check if container was changed
    return this.wasContainerChanged(changeData.nativeBookmark).then((changedBookmarkIsContainer) => {
      if (changedBookmarkIsContainer) {
        throw new Exceptions.ContainerChangedException();
      }

      return this.getContainerNameFromNativeId(changeData.nativeBookmark.parentId)
        .then((containerName) => {
          if (containerName) {
            // If parent is a container use it's id
            const container = this.bookmarkHelperSvc.getContainer(containerName, bookmarks, true);
            return container.id as number;
          }

          // Get the synced parent id from id mappings and retrieve the synced parent bookmark
          return this.bookmarkIdMapperSvc.get(changeData.nativeBookmark.parentId).then((idMapping) => {
            if (!idMapping) {
              // No mappings found, skip sync
              this.logSvc.logInfo('No id mapping found, skipping sync');
              return;
            }

            return idMapping.syncedId;
          });
        })
        .then((parentId) => {
          if (!parentId) {
            // Don't sync this change
            return bookmarks;
          }

          // Add new bookmark then check if the change should be synced
          const newBookmarkMetadata = this.bookmarkHelperSvc.extractBookmarkMetadata(changeData.nativeBookmark);
          const newBookmark = this.bookmarkHelperSvc.newBookmark(
            newBookmarkMetadata.title,
            newBookmarkMetadata.url,
            newBookmarkMetadata.description,
            newBookmarkMetadata.tags,
            bookmarks
          );
          const addBookmarkResult = this.addBookmark(newBookmark, parentId, changeData.nativeBookmark.index, bookmarks);

          return this.checkIfBookmarkChangeShouldBeSynced(addBookmarkResult.bookmark, addBookmarkResult.bookmarks).then(
            (syncThisChange) => {
              if (!syncThisChange) {
                // Don't sync this change
                return bookmarks;
              }
              // Add new id mapping
              const idMapping = this.bookmarkIdMapperSvc.createMapping(
                addBookmarkResult.bookmark.id,
                changeData.nativeBookmark.id
              );
              return this.bookmarkIdMapperSvc.add(idMapping).then(() => {
                return addBookmarkResult.bookmarks;
              });
            }
          );
        });
    });
  }

  processChangeTypeChildrenReorderedOnBookmarks(
    bookmarks: Bookmark[],
    changeData: ReorderNativeBookmarkChangeData
  ): ng.IPromise<Bookmark[]> {
    // Check if parent bookmark is a container
    return this.getNativeContainerIds()
      .then((nativeContainerIds) => {
        // If parent is not a container, find bookmark using mapped id
        const containerName = [...nativeContainerIds].find(({ 1: x }) => x === changeData.parentId)?.[0];
        if (angular.isUndefined(containerName)) {
          return this.bookmarkIdMapperSvc
            .get(changeData.parentId)
            .then((idMapping) => this.bookmarkHelperSvc.findBookmarkById(idMapping.syncedId, bookmarks));
        }

        // Otherwise get the relavant container
        return this.$q.resolve().then(() => this.bookmarkHelperSvc.getContainer(containerName, bookmarks));
      })
      .then((parentBookmark) => {
        // Retrieve child id mappings using change data
        return this.$q
          .all(changeData.childIds.map((childId) => this.bookmarkIdMapperSvc.get(childId)))
          .then((idMappings) => {
            // Reorder children as per change data
            const childIds = idMappings.filter(Boolean).map((idMapping) => idMapping.syncedId);
            parentBookmark.children = childIds.map<Bookmark>((childId) => {
              return (parentBookmark.children as Bookmark[]).find((x) => x.id === childId);
            });

            return bookmarks;
          });
      });
  }

  processChangeTypeAddOnNativeBookmarks(id: number, createInfo: BookmarkMetadata): ng.IPromise<void> {
    // Create native bookmark in other bookmarks container
    return this.getNativeContainerIds()
      .then((nativeContainerIds) => {
        const otherBookmarksId = nativeContainerIds.get(BookmarkContainer.Other);
        return this.createNativeBookmark(otherBookmarksId, createInfo.title, createInfo.url);
      })
      .then((newNativeBookmark) => {
        // Add id mapping for new bookmark
        const idMapping = this.bookmarkIdMapperSvc.createMapping(id, newNativeBookmark.id);
        return this.bookmarkIdMapperSvc.add(idMapping);
      });
  }

  processChangeTypeModifyOnBookmarks(
    bookmarks: Bookmark[],
    changeData: ModifyNativeBookmarkChangeData
  ): ng.IPromise<Bookmark[]> {
    // Check if container was changed
    return this.wasContainerChanged(changeData.nativeBookmark).then((changedBookmarkIsContainer) => {
      if (changedBookmarkIsContainer) {
        throw new Exceptions.ContainerChangedException();
      }

      // Retrieve id mapping using change data
      return this.bookmarkIdMapperSvc.get(changeData.nativeBookmark.id).then((idMapping) => {
        if (!idMapping) {
          // No mappings found, skip sync
          this.logSvc.logInfo('No id mapping found, skipping sync');
          return bookmarks;
        }

        // Check if the change should be synced
        const bookmarkToUpdate = this.bookmarkHelperSvc.findBookmarkById(idMapping.syncedId, bookmarks) as Bookmark;
        return this.checkIfBookmarkChangeShouldBeSynced(bookmarkToUpdate, bookmarks).then((syncThisChange) => {
          if (!syncThisChange) {
            // Don't sync this change
            return bookmarks;
          }

          // Modify the bookmark with the update info
          const updateInfo = this.bookmarkHelperSvc.extractBookmarkMetadata(changeData.nativeBookmark);
          return this.bookmarkHelperSvc.modifyBookmarkById(idMapping.syncedId, updateInfo, bookmarks);
        });
      });
    });
  }

  processChangeTypeModifyOnNativeBookmarks(id: number, updateInfo: BookmarkMetadata): ng.IPromise<void> {
    // Retrieve native bookmark id from id mappings
    return this.bookmarkIdMapperSvc.get(null, id).then((idMapping) => {
      if (!idMapping) {
        this.logSvc.logWarning(`No id mapping found for synced id '${id}'`);
        return;
      }

      // Modify native bookmark
      return this.modifyNativeBookmark(idMapping.nativeId, updateInfo).then(() => {});
    });
  }

  processChangeTypeMoveOnBookmarks(
    bookmarks: Bookmark[],
    changeData: MoveNativeBookmarkChangeData
  ): ng.IPromise<Bookmark[]> {
    // Get native container ids
    return this.getNativeContainerIds().then((nativeContainerIds) => {
      // Check if container was moved to a different folder
      if (Array.from(nativeContainerIds.values()).includes(undefined)) {
        throw new Exceptions.ContainerChangedException();
      }

      return browser.bookmarks.get(changeData.id).then((results) => {
        // If container moved to a different position in same folder, skip sync
        const movedBookmark = results[0];
        if (Array.from(nativeContainerIds.values()).includes(movedBookmark.id)) {
          return;
        }

        // Get the moved bookmark and new parent ids from id mappings or if container use the existing id
        return this.$q
          .all([
            this.bookmarkIdMapperSvc.get(changeData.id),
            this.getContainerNameFromNativeId(changeData.parentId).then((parentNameAsContainer) => {
              if (parentNameAsContainer) {
                const container = this.bookmarkHelperSvc.getContainer(parentNameAsContainer, bookmarks, true);
                return { syncedId: container.id };
              }
              return this.bookmarkIdMapperSvc.get(changeData.parentId);
            })
          ])
          .then((idMappings) => {
            const movedBookmarkMapping = idMappings[0];
            const parentMapping = idMappings[1];

            if (!movedBookmarkMapping && !parentMapping) {
              // No mappings found, skip sync
              this.logSvc.logInfo('No id mappings found, skipping sync');
              return;
            }

            // Get the bookmark to be removed
            // If no mapping exists then native bookmark will likely have been
            //  created in toolbar container whilst not syncing toolbar option enabled
            //  in which case create a new bookmark from the native bookmark
            let changesMade = false;
            return (!movedBookmarkMapping
              ? this.createBookmarkFromNativeBookmarkId(changeData.id, bookmarks)
              : this.$q
                  .resolve()
                  .then(
                    () => this.bookmarkHelperSvc.findBookmarkById(movedBookmarkMapping.syncedId, bookmarks) as Bookmark
                  )
            ).then((bookmarkToRemove) => {
              // If old parent is mapped, remove the moved bookmark
              let removeBookmarkPromise: ng.IPromise<Bookmark[]>;
              if (!movedBookmarkMapping) {
                // Moved bookmark not mapped, skip remove
                removeBookmarkPromise = this.$q.resolve(bookmarks);
              } else {
                // Check if change should be synced then remove the bookmark
                removeBookmarkPromise = this.$q((resolve, reject) => {
                  this.checkIfBookmarkChangeShouldBeSynced(bookmarkToRemove, bookmarks)
                    .then((syncThisChange) => {
                      if (!syncThisChange) {
                        // Don't sync this change, return unmodified bookmarks
                        return resolve(bookmarks);
                      }
                      return this.bookmarkHelperSvc
                        .removeBookmarkById(movedBookmarkMapping.syncedId, bookmarks)
                        .then((updatedBookmarks) => {
                          // Set flag to ensure update bookmarks are synced
                          changesMade = true;
                          resolve(updatedBookmarks);
                        });
                    })
                    .catch(reject);
                });
              }
              return (
                removeBookmarkPromise
                  .then((bookmarksAfterRemoval) => {
                    let addBookmarkPromise: ng.IPromise<Bookmark[]>;
                    if (!parentMapping) {
                      // New parent not mapped, skip add
                      addBookmarkPromise = this.$q.resolve(bookmarksAfterRemoval);
                    } else {
                      // Add the bookmark then check if change should be synced
                      addBookmarkPromise = this.countNativeContainersBeforeIndex(
                        changeData.parentId,
                        changeData.index
                      ).then((numContainers) => {
                        // Adjust the target index by the number of container folders then add the bookmark
                        const index = changeData.index - numContainers;
                        const addBookmarkResult = this.addBookmark(
                          bookmarkToRemove,
                          parentMapping.syncedId,
                          index,
                          bookmarksAfterRemoval
                        );
                        addBookmarkResult.bookmark.id = bookmarkToRemove.id;
                        return this.checkIfBookmarkChangeShouldBeSynced(
                          addBookmarkResult.bookmark,
                          addBookmarkResult.bookmarks
                        ).then((syncThisChange) => {
                          if (!syncThisChange) {
                            // Don't sync this change, return bookmarks after removal processed
                            return bookmarksAfterRemoval;
                          }

                          // Set flag to ensure update bookmarks are synced
                          changesMade = true;

                          // Add new id mapping for moved bookmark
                          if (movedBookmarkMapping) {
                            // If moved bookmark was already mapped, no need to update id mappings
                            return addBookmarkResult.bookmarks;
                          }
                          const idMapping = this.bookmarkIdMapperSvc.createMapping(
                            addBookmarkResult.bookmark.id,
                            changeData.id
                          );
                          return this.bookmarkIdMapperSvc.add(idMapping).then(() => {
                            return addBookmarkResult.bookmarks;
                          });
                        });
                      });
                    }
                    return addBookmarkPromise;
                  })
                  // If no changes made return original bookmarks
                  .then((updatedBookmarks) => (!changesMade ? bookmarks : updatedBookmarks))
              );
            });
          });
      });
    });
  }

  processChangeTypeRemoveOnBookmarks(
    bookmarks: Bookmark[],
    changeData: RemoveNativeBookmarkChangeData
  ): ng.IPromise<Bookmark[]> {
    // Check if container was changed
    return this.wasContainerChanged(changeData.nativeBookmark).then((changedBookmarkIsContainer) => {
      if (changedBookmarkIsContainer) {
        throw new Exceptions.ContainerChangedException();
      }

      // Retrieve the id mapping using change data
      return this.bookmarkIdMapperSvc.get(changeData.nativeBookmark.id).then((idMapping) => {
        if (!idMapping) {
          // No mappings found, skip sync
          this.logSvc.logInfo('No id mapping found, skipping sync');
          return bookmarks;
        }

        // Check if the change should be synced
        const bookmarkToRemove = this.bookmarkHelperSvc.findBookmarkById(idMapping.syncedId, bookmarks) as Bookmark;
        return this.checkIfBookmarkChangeShouldBeSynced(bookmarkToRemove, bookmarks).then((syncThisChange) => {
          if (!syncThisChange) {
            // Don't sync this change
            return bookmarks;
          }

          // Get all child bookmark mappings
          const descendantsIds = this.getIdsFromDescendants(bookmarkToRemove);

          // Remove bookmark
          return this.bookmarkHelperSvc.removeBookmarkById(idMapping.syncedId, bookmarks).then((updatedBookmarks) => {
            // Remove all retrieved ids from mappings
            const syncedIds = descendantsIds.concat([idMapping.syncedId]);
            return this.bookmarkIdMapperSvc.remove(syncedIds).then(() => {
              return updatedBookmarks;
            });
          });
        });
      });
    });
  }

  processChangeTypeRemoveOnNativeBookmarks(id: number): ng.IPromise<void> {
    // Get native bookmark id from id mappings
    return this.bookmarkIdMapperSvc.get(null, id).then((idMapping) => {
      if (!idMapping) {
        this.logSvc.logWarning(`No id mapping found for synced id '${id}'`);
        return;
      }

      // Remove bookmark and id mapping
      return this.removeNativeBookmarks(idMapping.nativeId).then(() => {
        return this.bookmarkIdMapperSvc.remove(id);
      });
    });
  }

  processNativeBookmarkEventsQueue(): void {
    const condition = (): ng.IPromise<boolean> => {
      return this.$q.resolve(this.nativeBookmarkEventsQueue.length > 0);
    };

    const action = (): ng.IPromise<void> => {
      // Get first event in the queue and process change
      const currentEvent = this.nativeBookmarkEventsQueue.shift();
      switch (currentEvent.changeType) {
        case BookmarkChangeType.Add:
          return this.syncNativeBookmarkCreated(...currentEvent.eventArgs);
        case BookmarkChangeType.ChildrenReordered:
          return this.syncNativeBookmarkChildrenReordered(...currentEvent.eventArgs);
        case BookmarkChangeType.Remove:
          return this.syncNativeBookmarkRemoved(...currentEvent.eventArgs);
        case BookmarkChangeType.Move:
          return this.syncNativeBookmarkMoved(...currentEvent.eventArgs);
        case BookmarkChangeType.Modify:
          return this.syncNativeBookmarkChanged(...currentEvent.eventArgs);
        default:
          throw new Exceptions.AmbiguousSyncRequestException();
      }
    };

    // Iterate through the queue and process the events
    this.utilitySvc.asyncWhile<any>(this.nativeBookmarkEventsQueue, condition, action).then(() => {
      this.$timeout(() => {
        this.syncSvc.executeSync().then(() => {
          // Move native unsupported containers into the correct order
          return this.disableEventListeners().then(this.reorderUnsupportedContainers).then(this.enableEventListeners);
        });
      }, 100);
    });
  }

  processNativeChangeOnBookmarks(changeInfo: BookmarkChange, bookmarks: Bookmark[]): ng.IPromise<Bookmark[]> {
    switch (changeInfo.type) {
      case BookmarkChangeType.Add:
        return this.processChangeTypeAddOnBookmarks(bookmarks, changeInfo.changeData as AddNativeBookmarkChangeData);
      case BookmarkChangeType.ChildrenReordered:
        return this.processChangeTypeChildrenReorderedOnBookmarks(
          bookmarks,
          changeInfo.changeData as ReorderNativeBookmarkChangeData
        );
      case BookmarkChangeType.Modify:
        return this.processChangeTypeModifyOnBookmarks(
          bookmarks,
          changeInfo.changeData as ModifyNativeBookmarkChangeData
        );
      case BookmarkChangeType.Move:
        return this.processChangeTypeMoveOnBookmarks(bookmarks, changeInfo.changeData as MoveNativeBookmarkChangeData);
      case BookmarkChangeType.Remove:
        return this.processChangeTypeRemoveOnBookmarks(
          bookmarks,
          changeInfo.changeData as RemoveNativeBookmarkChangeData
        );
      default:
        throw new Exceptions.AmbiguousSyncRequestException();
    }
  }

  queueNativeBookmarkEvent(changeType: BookmarkChangeType, ...eventArgs: any[]): void {
    // Clear timeout
    if (this.processNativeBookmarkEventsTimeout) {
      this.$timeout.cancel(this.processNativeBookmarkEventsTimeout);
    }

    // Add event to the queue and trigger processing after a delay
    this.nativeBookmarkEventsQueue.push({
      changeType,
      eventArgs
    });
    this.processNativeBookmarkEventsTimeout = this.$timeout(this.processNativeBookmarkEventsQueue, 200);
  }

  removeNativeBookmarks(id: string): ng.IPromise<void> {
    return browser.bookmarks.removeTree(id).catch((err) => {
      this.logSvc.logInfo(`Failed to remove native bookmark: ${id}`);
      throw new Exceptions.FailedRemoveNativeBookmarksException(undefined, err);
    });
  }

  reorderUnsupportedContainers(): ng.IPromise<void> {
    // Get unsupported containers
    return this.$q.all(this.unsupportedContainers.map(this.getNativeBookmarkByTitle)).then((results) => {
      return this.$q
        .all(
          results
            // Remove falsy results
            .filter((x) => x)
            // Reorder each native bookmark to top of parent
            .map((container, index) => {
              return browser.bookmarks.move(container.id, {
                index,
                parentId: container.parentId
              });
            })
        )
        .then(() => {});
    });
  }

  syncChange(changeInfo: BookmarkChange): ng.IPromise<any> {
    const sync: Sync = {
      changeInfo,
      type: SyncType.Remote
    };

    // Queue sync but dont execute sync to allow for batch processing multiple changes
    return this.platformSvc.queueSync(sync, MessageCommand.SyncBookmarks, false).catch(() => {
      // Swallow error, sync errors thrown separately by processBookmarkEventsQueue
    });
  }

  abstract syncNativeBookmarkChanged(id?: string): ng.IPromise<void>;

  syncNativeBookmarkChildrenReordered(
    id?: string,
    reorderInfo?: OnChildrenReorderedReorderInfoType
  ): ng.IPromise<void> {
    // Create change info
    const data: ReorderNativeBookmarkChangeData = {
      childIds: reorderInfo.childIds,
      parentId: id
    };
    const changeInfo: BookmarkChange = {
      changeData: data,
      type: BookmarkChangeType.ChildrenReordered
    };

    // Queue sync
    this.syncChange(changeInfo);
    return this.$q.resolve();
  }

  abstract syncNativeBookmarkCreated(id?: string, nativeBookmark?: NativeBookmarks.BookmarkTreeNode): ng.IPromise<void>;

  abstract syncNativeBookmarkMoved(id?: string, moveInfo?: NativeBookmarks.OnMovedMoveInfoType): ng.IPromise<void>;

  syncNativeBookmarkRemoved(id?: string, removeInfo?: NativeBookmarks.OnRemovedRemoveInfoType): ng.IPromise<void> {
    // Create change info
    const data: RemoveNativeBookmarkChangeData = {
      nativeBookmark: {
        ...removeInfo.node,
        parentId: removeInfo.parentId
      }
    };
    const changeInfo: BookmarkChange = {
      changeData: data,
      type: BookmarkChangeType.Remove
    };

    // Queue sync
    this.syncChange(changeInfo);
    return this.$q.resolve();
  }

  wasContainerChanged(changedNativeBookmark: NativeBookmarks.BookmarkTreeNode): ng.IPromise<boolean> {
    return this.getNativeContainerIds().then((nativeContainerIds) => {
      // If parent is not other bookmarks, no container was changed
      const otherBookmarksId = nativeContainerIds.get(BookmarkContainer.Other);
      if ((changedNativeBookmark as NativeBookmarks.BookmarkTreeNode).parentId !== otherBookmarksId) {
        return false;
      }

      // If any native container ids are undefined, container was removed
      if (Array.from(nativeContainerIds.values()).includes(undefined)) {
        return true;
      }

      return browser.bookmarks
        .getChildren(otherBookmarksId)
        .then((children) => {
          // Get all native bookmarks in other bookmarks that are unsupported containers and check for duplicates
          const containers = children.filter((x) => this.unsupportedContainers.includes(x.title)).map((x) => x.title);
          return containers.length !== new Set(containers).size;
        })
        .catch((err) => {
          this.logSvc.logInfo(`Failed to detect whether container changed: ${JSON.stringify(changedNativeBookmark)}`);
          throw new Exceptions.FailedGetNativeBookmarksException(undefined, err);
        });
    });
  }
}
