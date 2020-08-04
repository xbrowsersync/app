import angular from 'angular';
import { Injectable } from 'angular-ts-decorators';
import { autobind } from 'core-decorators';
import { PlatformStoreService, StoreContent } from './store.interface';

@autobind
@Injectable('StoreService')
export default class StoreService {
  $q: ng.IQService;
  platformStoreSvc: PlatformStoreService;
  dbName = 'xbs-store';
  storeName = 'xbs';

  static $inject = ['$q', 'PlatformStoreService'];
  constructor($q: ng.IQService, PlatformStoreSvc: PlatformStoreService) {
    this.$q = $q;
    this.platformStoreSvc = PlatformStoreSvc;
  }

  clear(): ng.IPromise<void> {
    return this.platformStoreSvc.clear();
  }

  get<T = StoreContent>(keys?: IDBValidKey | IDBValidKey[]): ng.IPromise<T> {
    // If no keys provided, get all keys from store
    return (angular.isUndefined(keys) ? this.platformStoreSvc.keys() : this.$q.resolve(keys)).then((allKeys) => {
      // Ensure the keys param is an array before processing
      const keysArr = Array.isArray(allKeys) ? (allKeys as IDBValidKey[]) : [allKeys];
      return this.platformStoreSvc
        .get(keysArr)
        .then((keyValues) => {
          // Convert the keys and key values into a return object
          return keysArr.reduce((prev, current, index) => {
            const next = angular.copy(prev);
            next[current as string] = keyValues[index];
            return next;
          }, {} as T);
        })
        .then((storeContent) => {
          // If result object only has one key, simply return the key value
          if (storeContent && Object.keys(storeContent).length === 1) {
            return storeContent[keysArr[0] as string];
          }
          return storeContent;
        });
    });
  }

  remove(keys: string | string[]): ng.IPromise<void> {
    const keysArr = Array.isArray(keys) ? keys : [keys];
    return this.platformStoreSvc.remove(keysArr);
  }

  set(key: IDBValidKey, value?: any): ng.IPromise<void> {
    if (angular.isUndefined(key)) {
      return this.$q.resolve();
    }

    return this.$q((resolve, reject) => {
      (angular.isUndefined(value ?? undefined)
        ? this.platformStoreSvc.remove(Array.isArray(key) ? key : [key])
        : this.platformStoreSvc.set(key, value)
      )
        .then(resolve)
        .catch(reject);
    });
  }
}
