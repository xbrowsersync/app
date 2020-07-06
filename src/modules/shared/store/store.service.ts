import angular from 'angular';
import { Injectable } from 'angular-ts-decorators';
import { autobind } from 'core-decorators';
import * as idbKeyval from 'idb-keyval';
import StoreContent from './store-content.interface';

@autobind
@Injectable('StoreService')
export default class StoreService {
  $q: ng.IQService;
  dbName = 'xbs-store';
  store = {};
  storeName = 'xbs';

  static $inject = ['$q'];
  constructor($q: ng.IQService) {
    this.$q = $q;
  }

  clear(): ng.IPromise<void> {
    return idbKeyval.clear(this.getStore());
  }

  get<T = StoreContent>(keys?: IDBValidKey | IDBValidKey[]): ng.IPromise<T> {
    // If no keys provided, get all keys from store
    return (!keys ? this.$q.resolve(idbKeyval.keys(this.getStore())) : this.$q.resolve(keys)).then((allKeys) => {
      // Ensure the keys param is an array before processing
      const keysArr = Array.isArray(allKeys) ? (allKeys as IDBValidKey[]) : [allKeys];
      return this.$q
        .all(
          keysArr.map((key) => {
            return idbKeyval.get<any>(key, this.getStore());
          })
        )
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

  getStore(): idbKeyval.Store {
    return new idbKeyval.Store(this.dbName, this.storeName);
  }

  remove(keys: string | string[]): ng.IPromise<void> {
    const keysArr = Array.isArray(keys) ? keys : [keys];
    return this.$q
      .all(
        keysArr.map((key) => {
          return idbKeyval.del(key, this.getStore());
        })
      )
      .then(() => {});
  }

  set(key: IDBValidKey, value?: any): ng.IPromise<void> {
    if (!key) {
      return this.$q.resolve();
    }

    return this.$q((resolve, reject) => {
      (value == null ? idbKeyval.del(key, this.getStore()) : idbKeyval.set(key, value, this.getStore()))
        .then(resolve)
        .catch(reject);
    });
  }
}
