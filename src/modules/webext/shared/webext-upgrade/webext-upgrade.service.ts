import { Injectable } from 'angular-ts-decorators';
import autobind from 'autobind-decorator';
import { browser } from 'webextension-polyfill-ts';
import BookmarkHelperService from '../../../shared/bookmark/bookmark-helper/bookmark-helper.service';
import { BookmarkService } from '../../../shared/bookmark/bookmark.interface';
import { PlatformService } from '../../../shared/global-shared.interface';
import LogService from '../../../shared/log/log.service';
import StoreService from '../../../shared/store/store.service';
import UpgradeService from '../../../shared/upgrade/upgrade.service';
import UtilityService from '../../../shared/utility/utility.service';

@autobind
@Injectable('UpgradeService')
export default class WebExtUpgradeService extends UpgradeService {
  bookmarkHelperSvc: BookmarkHelperService;
  bookmarkSvc: BookmarkService;
  platformSvc: PlatformService;
  utilitySvc: UtilityService;

  static $inject = [
    '$q',
    'BookmarkHelperService',
    'BookmarkService',
    'LogService',
    'PlatformService',
    'StoreService',
    'UtilityService'
  ];
  constructor(
    $q: ng.IQService,
    BookmarkHelperSvc: BookmarkHelperService,
    BookmarkSvc: BookmarkService,
    LogSvc: LogService,
    PlatformSvc: PlatformService,
    StoreSvc: StoreService,
    UtilitySvc: UtilityService
  ) {
    super($q, LogSvc, StoreSvc, UtilitySvc);

    this.bookmarkHelperSvc = BookmarkHelperSvc;
    this.bookmarkSvc = BookmarkSvc;
    this.platformSvc = PlatformSvc;
    this.utilitySvc = UtilitySvc;
  }

  upgradeTo160(): ng.IPromise<void> {
    // Initialise data storage
    return (
      this.storeSvc
        .init()
        // Convert local storage items to IndexedDB
        .then(() => browser.storage.local.get())
        .then((cachedData) => {
          if (!cachedData || Object.keys(cachedData).length === 0) {
            return;
          }

          return this.$q.all(
            Object.keys(cachedData).map((key) => {
              return this.storeSvc.set(key, cachedData[key]);
            })
          );
        })
        .then(() => {
          return browser.storage.local.clear();
        })
        .then(() => {
          // If sync enabled, create id mappings
          return this.utilitySvc.isSyncEnabled().then((syncEnabled) => {
            if (!syncEnabled) {
              return;
            }
            return this.bookmarkHelperSvc
              .getCachedBookmarks()
              .then(this.bookmarkSvc.buildIdMappings)
              .then(() => this.platformSvc.refreshNativeInterface(true));
          });
        })
        .then(() => {})
    );
  }
}
