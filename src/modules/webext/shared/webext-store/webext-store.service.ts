import { Injectable } from 'angular-ts-decorators';
import autobind from 'autobind-decorator';
import * as idbKeyval from 'idb-keyval';
import { StoreKey } from '../../../shared/store/store.enum';
import { StoreContent, TraceLogItem } from '../../../shared/store/store.interface';
import StoreService from '../../../shared/store/store.service';

@autobind
@Injectable('StoreService')
export default class WebExtStoreService extends StoreService {
  dbName = 'xbs-store';
  store: idbKeyval.Store;
  storeName = 'xbs';

  static $inject = ['$q'];
  constructor($q: ng.IQService) {
    super($q);

    // Initialise the store
    this.store = new idbKeyval.Store(this.dbName, this.storeName);
  }

  protected addTraceLog(newLogItem: TraceLogItem): ng.IPromise<void> {
    return this.getAllTraceLogs().then((traceLogItems = []) => {
      traceLogItems.push(newLogItem);
      return this.setInIdbKeyval(StoreKey.TraceLog, traceLogItems);
    });
  }

  protected clear(): ng.IPromise<void> {
    return idbKeyval.clear(this.getStore());
  }

  protected getFromStore<T = StoreContent>(keys: IDBValidKey[] = []): ng.IPromise<T[]> {
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

  protected getAllTraceLogs(): ng.IPromise<TraceLogItem[]> {
    return idbKeyval.get<TraceLogItem[]>(StoreKey.TraceLog, this.getStore()).then((traceLogItems) => {
      return traceLogItems;
    });
  }

  protected getStore(): idbKeyval.Store {
    return this.store;
  }

  protected keys(): ng.IPromise<IDBValidKey[]> {
    return this.$q.resolve().then(() => idbKeyval.keys(this.getStore()));
  }

  protected removeFromStore(keys: IDBValidKey[] = []): ng.IPromise<void> {
    return this.$q.all(keys.map((key) => idbKeyval.del(key, this.getStore()))).then(() => {});
  }

  protected setInStore(key: IDBValidKey, value: any): ng.IPromise<void> {
    if (key === StoreKey.TraceLog) {
      return this.addTraceLog(value);
    }
    return this.setInIdbKeyval(key, value);
  }

  protected setInIdbKeyval(key: IDBValidKey, value: any): ng.IPromise<void> {
    return idbKeyval.set(key, value, this.getStore());
  }
}
