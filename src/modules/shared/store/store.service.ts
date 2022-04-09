import angular from 'angular';
import { StoreKey } from './store.enum';
import { StoreContent } from './store.interface';

export abstract class StoreService {
  $q: ng.IQService;
  dbName = 'xbs-store';
  storeName = 'xbs';

  constructor($q: ng.IQService) {
    this.$q = $q;
  }

  protected abstract clear(): ng.IPromise<void>;

  get<T = StoreContent>(keys?: string | string[]): ng.IPromise<T> {
    // If no keys provided, get all keys from store
    return (angular.isUndefined(keys ?? undefined) ? this.keys() : this.$q.resolve(keys)).then((allKeys) => {
      // Ensure the keys param is an array before processing
      const keysArr = Array.isArray(allKeys) ? (allKeys as string[]) : [allKeys];
      return this.getFromStore(keysArr)
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

  protected abstract getFromStore<T = StoreContent>(keys: string[]): ng.IPromise<T[]>;

  init(): ng.IPromise<void> {
    return this.clear()
      .then(() => {
        return this.$q.all([
          this.setInStore(StoreKey.AlternateSearchBarPosition, false),
          this.setInStore(StoreKey.AutoFetchMetadata, true),
          this.setInStore(StoreKey.CheckForAppUpdates, true),
          this.setInStore(StoreKey.DarkModeEnabled, false),
          this.setInStore(StoreKey.DefaultToFolderView, false),
          this.setInStore(StoreKey.DisplayHelp, true),
          this.setInStore(StoreKey.DisplayOtherSyncsWarning, false),
          this.setInStore(StoreKey.DisplayPermissions, false),
          this.setInStore(StoreKey.DisplayTelemetryCheck, true),
          this.setInStore(StoreKey.DisplayUpdated, false),
          this.setInStore(StoreKey.SyncBookmarksToolbar, false),
          this.setInStore(StoreKey.SyncEnabled, false),
          this.setInStore(StoreKey.TelemetryEnabled, true)
        ]);
      })
      .then(() => {});
  }

  protected abstract keys(): ng.IPromise<string[]>;

  remove(keys: string | string[]): ng.IPromise<void> {
    const keysArr = Array.isArray(keys) ? keys : [keys];
    return this.removeFromStore(keysArr);
  }

  protected abstract removeFromStore(keys: string[]): ng.IPromise<void>;

  set(key: string, value?: any): ng.IPromise<void> {
    if (angular.isUndefined(key ?? undefined)) {
      return this.$q.resolve();
    }

    return this.$q((resolve, reject) => {
      (angular.isUndefined(value ?? undefined)
        ? this.removeFromStore(Array.isArray(key) ? key : [key])
        : this.setInStore(key, value)
      )
        .then(resolve)
        .catch(reject);
    });
  }

  protected abstract setInStore(key: string, value: any): ng.IPromise<void>;
}
