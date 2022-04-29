import { Injectable } from 'angular-ts-decorators';
import { ApiServiceType } from '../../../shared/api/api.enum';
import { ApiXbrowsersyncSyncInfo } from '../../../shared/api/api-xbrowsersync/api-xbrowsersync.interface';
import { FailedLocalStorageError } from '../../../shared/errors/errors';
import Globals from '../../../shared/global-shared.constants';
import { StoreKey } from '../../../shared/store/store.enum';
import { V160UpgradeProviderService } from '../../../shared/upgrade/v1.6.0-upgrade-provider/v1.6.0-upgrade-provider.service';

@Injectable('V160UpgradeProviderService')
export class AndroidV160UpgradeProviderService extends V160UpgradeProviderService {
  static $inject = ['$q', 'BookmarkHelperService', 'PlatformService', 'StoreService', 'UtilityService'];

  getAllFromNativeStorage(): ng.IPromise<any> {
    return this.$q<any>((resolve, reject) => {
      const nativeStorageItems: any = {};

      const failure = (err = new Error()) => {
        if ((err as any).code === 2) {
          // Item not found
          return resolve(null);
        }
        reject(new FailedLocalStorageError(undefined, err));
      };

      const success = (keys: string[]) => {
        this.$q
          .all(
            keys.map((key) => {
              return this.$q((resolveGetItem, rejectGetItem) =>
                window.NativeStorage.getItem(
                  key,
                  (result: any) => {
                    nativeStorageItems[key] = result;
                    resolveGetItem();
                  },
                  rejectGetItem
                )
              );
            })
          )
          .then(() => resolve(nativeStorageItems))
          .catch((err) => failure(err));
      };

      window.NativeStorage.keys(success, failure);
    });
  }

  upgradeApp(upgradingFromVersion?: string): ng.IPromise<void> {
    // Migrate items in native storage to new store
    return this.getAllFromNativeStorage().then((cachedData) => {
      return this.storeSvc
        .init()
        .then(() => {
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
                if (key === 'appVersion' || key === 'password' || key === 'traceLog') {
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

                // Update settings whose key has changed
                if (key === 'displaySearchBarBeneathResults') {
                  const keyValue = cachedData[key];
                  key = StoreKey.AlternateSearchBarPosition;
                  cachedData[key] = keyValue;
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
        .then(() => super.upgradeApp());
    });
  }
}
