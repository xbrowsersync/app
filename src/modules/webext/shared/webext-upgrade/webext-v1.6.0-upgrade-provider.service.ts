import { Injectable } from 'angular-ts-decorators';
import autobind from 'autobind-decorator';
import { browser } from 'webextension-polyfill-ts';
import { BookmarkService } from '../../../shared/bookmark/bookmark.interface';
import BookmarkHelperService from '../../../shared/bookmark/bookmark-helper/bookmark-helper.service';
import { PlatformService } from '../../../shared/global-shared.interface';
import StoreService from '../../../shared/store/store.service';
import V160UpgradeProviderService from '../../../shared/upgrade/v1.6.0-upgrade-provider/v1.6.0-upgrade-provider.service';
import UtilityService from '../../../shared/utility/utility.service';

@autobind
@Injectable('V160UpgradeProviderService')
export default class WebExtV160UpgradeProviderService extends V160UpgradeProviderService {
  bookmarkSvc: BookmarkService;

  static $inject = [
    '$q',
    'BookmarkHelperService',
    'BookmarkService',
    'PlatformService',
    'StoreService',
    'UtilityService'
  ];
  constructor(
    $q: ng.IQService,
    BookmarkHelperSvc: BookmarkHelperService,
    BookmarkSvc: BookmarkService,
    PlatformSvc: PlatformService,
    StoreSvc: StoreService,
    UtilitySvc: UtilityService
  ) {
    super($q, BookmarkHelperSvc, PlatformSvc, StoreSvc, UtilitySvc);
    this.bookmarkSvc = BookmarkSvc;
  }

  upgradeApp(upgradingFromVersion?: string): ng.IPromise<void> {
    // Initialise IndexedDB data storage
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
        .then(() => browser.storage.local.clear())
    );
  }
}
