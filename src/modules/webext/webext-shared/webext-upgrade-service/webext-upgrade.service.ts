import { Injectable } from 'angular-ts-decorators';
import autobind from 'autobind-decorator';
import { browser } from 'webextension-polyfill-ts';
import BookmarkHelperService from '../../../shared/bookmark/bookmark-helper/bookmark-helper.service';
import { BookmarkService } from '../../../shared/bookmark/bookmark.interface';
import { PlatformUpgradeService } from '../../../shared/global-shared.interface';
import LogService from '../../../shared/log/log.service';
import StoreService from '../../../shared/store/store.service';
import UpgradeService from '../../../shared/upgrade/upgrade.service';
import UtilityService from '../../../shared/utility/utility.service';

@autobind
@Injectable('UpgradeService')
export default class WebExtUpgradeService extends UpgradeService implements PlatformUpgradeService {
  bookmarkHelperSvc: BookmarkHelperService;
  bookmarkSvc: BookmarkService;
  utilitySvc: UtilityService;

  static $inject = ['$q', 'BookmarkHelperService', 'BookmarkService', 'LogService', 'StoreService', 'UtilityService'];
  constructor(
    $q: ng.IQService,
    BookmarkHelperSvc: BookmarkHelperService,
    BookmarkSvc: BookmarkService,
    LogSvc: LogService,
    StoreSvc: StoreService,
    UtilitySvc: UtilityService
  ) {
    super($q, LogSvc, StoreSvc);

    this.bookmarkHelperSvc = BookmarkHelperSvc;
    this.bookmarkSvc = BookmarkSvc;
    this.utilitySvc = UtilitySvc;
  }

  upgradeTo160(): ng.IPromise<void> {
    // Convert local storage items to IndexedDB
    return browser.storage.local
      .get()
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
          return this.bookmarkHelperSvc.getCachedBookmarks().then((cachedBookmarks) => {
            return this.bookmarkSvc.buildIdMappings(cachedBookmarks);
          });
        });
      })
      .then(() => {});
  }
}
