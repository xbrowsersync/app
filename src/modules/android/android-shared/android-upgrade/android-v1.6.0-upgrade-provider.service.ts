import { Injectable } from 'angular-ts-decorators';
import autobind from 'autobind-decorator';
import * as Exceptions from '../../../shared/exception/exception';
import { StoreKey } from '../../../shared/store/store.enum';
import V160UpgradeProviderService from '../../../shared/upgrade/v1.6.0-upgrade-provider/v1.6.0-upgrade-provider.service';

@autobind
@Injectable('V160UpgradeProviderService')
export default class AndroidV160UpgradeProviderService extends V160UpgradeProviderService {
  static $inject = ['$q', 'BookmarkHelperService', 'PlatformService', 'StoreService', 'UtilityService'];

  getAllFromNativeStorage(): ng.IPromise<any> {
    return this.$q<any>((resolve, reject) => {
      const nativeStorageItems: any = {};

      const failure = (err = new Error()) => {
        if ((err as any).code === 2) {
          // Item not found
          return resolve(null);
        }
        reject(new Exceptions.FailedLocalStorageException(undefined, err));
      };

      const success = (keys: string[]) => {
        this.$q
          .all(
            keys.map((key) => {
              return this.$q((resolveGetItem, rejectGetItem) => {
                window.NativeStorage.getItem(
                  key,
                  (result: any) => {
                    nativeStorageItems[key] = result;
                    resolveGetItem();
                  },
                  rejectGetItem
                );
              });
            })
          )
          .then(() => {
            resolve(nativeStorageItems);
          })
          .catch(failure);
      };

      window.NativeStorage.keys(success, failure);
    });
  }

  upgradeApp(upgradingFromVersion?: string): ng.IPromise<void> {
    // Get current native storage items
    return this.getAllFromNativeStorage().then((cachedData) => {
      // Initialise store
      return this.storeSvc
        .init()
        .then(() => {
          if (!cachedData || Object.keys(cachedData).length === 0) {
            return;
          }

          // Add settings from previous version to store
          return this.$q.all(
            Object.keys(cachedData).map((key) => {
              // Don't include deprecated settings
              if (key === 'appVersion' || key === 'traceLog') {
                return;
              }

              // Update settings whose key has changed
              if (key === 'displaySearchBarBeneathResults') {
                const keyValue = cachedData[key];
                key = StoreKey.AlternateSearchBarPosition;
                cachedData[key] = keyValue;
              }

              return this.storeSvc.set(key, cachedData[key]);
            })
          );
        })
        .then(() => {});
    });
  }
}
