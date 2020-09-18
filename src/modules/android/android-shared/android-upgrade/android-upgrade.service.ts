import { Injectable } from 'angular-ts-decorators';
import autobind from 'autobind-decorator';
import * as Exceptions from '../../../shared/exception/exception';
import { PlatformUpgradeService } from '../../../shared/global-shared.interface';
import UpgradeService from '../../../shared/upgrade/upgrade.service';

@autobind
@Injectable('UpgradeService')
export default class AndroidUpgradeService extends UpgradeService implements PlatformUpgradeService {
  static $inject = ['$q', 'LogService', 'StoreService'];

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

  upgradeTo160(): ng.IPromise<void> {
    return (
      super
        .upgradeTo160()
        // Convert native storage items to IndexedDB
        .then(() => this.getAllFromNativeStorage())
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
          return window.NativeStorage.clear();
        })
    );
  }
}
