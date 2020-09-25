import angular from 'angular';
import { Injectable } from 'angular-ts-decorators';
import autobind from 'autobind-decorator';
import * as idbKeyval from 'idb-keyval';
import { StoreKey } from '../../../shared/store/store.enum';
import { PlatformStoreService, StoreContent, TraceLogItem } from '../../../shared/store/store.interface';

@autobind
@Injectable('PlatformStoreService')
export default class WebExtStoreService implements PlatformStoreService {
  $q: ng.IQService;

  dbName = 'xbs-store';
  store: idbKeyval.Store;
  storeName = 'xbs';

  static $inject = ['$q'];
  constructor($q: ng.IQService) {
    this.$q = $q;

    // Initialise the store
    this.store = new idbKeyval.Store(this.dbName, this.storeName);
  }

  addTraceLog(newLogItem: TraceLogItem): ng.IPromise<void> {
    return this.getAllTraceLogs().then((traceLogItems = []) => {
      traceLogItems.push(newLogItem);
      return this.setInIdbKeyval(StoreKey.TraceLog, traceLogItems);
    });
  }

  clear(): ng.IPromise<void> {
    return idbKeyval.clear(this.getStore());
  }

  get<T = StoreContent>(keys: IDBValidKey[] = []): ng.IPromise<T[]> {
    const values = new Array(keys.length);
    return this.$q<T[]>((resolve, reject) => {
      // Get non-trace log values
      const keysWithoutTraceLog = keys.filter((key) => key !== StoreKey.TraceLog);
      if (keysWithoutTraceLog.length === 0) {
        return resolve();
      }
      return this.$q.all(keysWithoutTraceLog.map((key) => idbKeyval.get<any>(key, this.getStore()))).then((results) => {
        keysWithoutTraceLog.forEach((key, index) => {
          values[keys.indexOf(key)] = results[index];
        });
        resolve();
      });
    })
      .then(() => {
        // Get trace log if requested
        if (!keys.includes(StoreKey.TraceLog)) {
          return;
        }
        return this.getAllTraceLogs().then((traceLogItems) => {
          values[keys.indexOf(StoreKey.TraceLog)] = traceLogItems;
        });
      })
      .then(() => values);
  }

  getAllTraceLogs(): ng.IPromise<TraceLogItem[]> {
    return idbKeyval.get<TraceLogItem[]>(StoreKey.TraceLog, this.getStore()).then((traceLogItems) => {
      return traceLogItems;
    });
  }

  getStore(): idbKeyval.Store {
    return this.store;
  }

  keys(): ng.IPromise<IDBValidKey[]> {
    return this.$q.resolve().then(() => idbKeyval.keys(this.getStore()));
  }

  remove(keys: IDBValidKey[] = []): ng.IPromise<void> {
    return this.$q.all(keys.map((key) => idbKeyval.del(key, this.getStore()))).then(() => {});
  }

  set(key: IDBValidKey, value: any): ng.IPromise<void> {
    if (key === StoreKey.TraceLog) {
      return this.addTraceLog(value);
    }
    return this.setInIdbKeyval(key, value);
  }

  setInIdbKeyval(key: IDBValidKey, value: any): ng.IPromise<void> {
    return idbKeyval.set(key, value, this.getStore());
  }
}
