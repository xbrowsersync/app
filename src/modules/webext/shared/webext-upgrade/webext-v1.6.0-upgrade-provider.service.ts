import { Injectable } from 'angular-ts-decorators';
import browser from 'webextension-polyfill';
import { ApiServiceType } from '../../../shared/api/api.enum';
import { ApiXbrowsersyncSyncInfo } from '../../../shared/api/api-xbrowsersync/api-xbrowsersync.interface';
import { BookmarkService } from '../../../shared/bookmark/bookmark.interface';
import { BookmarkHelperService } from '../../../shared/bookmark/bookmark-helper/bookmark-helper.service';
import Globals from '../../../shared/global-shared.constants';
import { PlatformService } from '../../../shared/global-shared.interface';
import { StoreKey } from '../../../shared/store/store.enum';
import { StoreService } from '../../../shared/store/store.service';
import { V160UpgradeProviderService } from '../../../shared/upgrade/v1.6.0-upgrade-provider/v1.6.0-upgrade-provider.service';
import { UtilityService } from '../../../shared/utility/utility.service';

@Injectable('V160UpgradeProviderService')
export class WebExtV160UpgradeProviderService extends V160UpgradeProviderService {
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
    // Migrate items in local storage to new IndexedDB store
    return this.storeSvc
      .init()
      .then(() => browser.storage.local.get())
      .then((cachedData) => {
        if (!cachedData || Object.keys(cachedData).length === 0) {
          return;
        }

        const syncInfo: Partial<ApiXbrowsersyncSyncInfo> = {
          serviceType: ApiServiceType.xBrowserSync
        };
        return this.$q
          .all(
            Object.keys(cachedData).map((key) => {
              // Ignore items that should not be migrated
              if (key === 'password' || key === 'traceLog') {
                return;
              }

              // Upgrade sync settings
              switch (key) {
                case 'serviceUrl':
                  syncInfo.serviceUrl = cachedData[key];
                  return;
                case 'syncId':
                  syncInfo.id = cachedData[key];
                  return;
                case 'syncVersion':
                  syncInfo.version = cachedData[key];
                  return;
                default:
              }

              return this.storeSvc.set(key, cachedData[key]);
            })
          )
          .then(() => {
            if (!syncInfo.id) {
              return;
            }
            if (!syncInfo.serviceUrl) {
              syncInfo.serviceUrl = Globals.URL.DefaultServiceUrl;
            }
            return this.storeSvc.set(StoreKey.SyncInfo, syncInfo);
          });
      })
      .then(() => browser.storage.local.clear())
      .then(() => super.upgradeApp());
  }
}
