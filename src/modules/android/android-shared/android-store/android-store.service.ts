import angular from 'angular';
import { Injectable } from 'angular-ts-decorators';
import autobind from 'autobind-decorator';
import * as Exceptions from '../../../shared/exception/exception';
import { StoreKey } from '../../../shared/store/store.enum';
import { StoreContent, TraceLogItem } from '../../../shared/store/store.interface';
import StoreService from '../../../shared/store/store.service';
import { NativeStorageError, Table, TraceLogColumn } from './android-store.enum';

@autobind
@Injectable('StoreService')
export default class AndroidStoreService extends StoreService {
  appRowId = 1;
  db: any;
  dbName = 'xbs.db';
  idCol = 'id';
  nativeStorageKeys: IDBValidKey[] = [
    StoreKey.AlternateSearchBarPosition,
    StoreKey.AutoFetchMetadata,
    StoreKey.CheckForAppUpdates,
    StoreKey.DarkModeEnabled,
    StoreKey.DefaultToFolderView,
    StoreKey.DisplayHelp,
    StoreKey.DisplayOtherSyncsWarning,
    StoreKey.DisplayPermissions,
    StoreKey.DisplayUpdated,
    StoreKey.LastUpgradeVersion,
    StoreKey.SyncBookmarksToolbar,
    StoreKey.SyncEnabled
  ];
  sqlKeys: IDBValidKey[] = [
    StoreKey.Bookmarks,
    StoreKey.LastUpdated,
    StoreKey.Password,
    StoreKey.ServiceUrl,
    StoreKey.SyncId,
    StoreKey.SyncVersion,
    StoreKey.TraceLog
  ];

  static $inject = ['$q'];

  protected addTraceLog(log: TraceLogItem): ng.IPromise<void> {
    return this.$q<void>((resolve, reject) => {
      this.openDatabase().then((db) => {
        db.executeSql(
          `INSERT INTO ${Table.TraceLog} (
            ${TraceLogColumn.Timestamp},
            ${TraceLogColumn.Level},
            ${TraceLogColumn.Message}
          ) VALUES (?, ?, ?)`,
          [log.timestamp, log.level, log.message],
          () => resolve(),
          reject
        );
      });
    }).catch(this.handleSqlError);
  }

  protected clear(): ng.IPromise<void> {
    return this.$q
      .all([
        this.$q((resolve, reject) => window.NativeStorage.clear(resolve, reject)),
        this.openDatabase().then(this.createTables).catch(this.handleSqlError)
      ])
      .then(() => {});
  }

  protected clearTraceLog(): ng.IPromise<void> {
    return this.$q<void>((resolve, reject) => {
      this.openDatabase().then((db) => {
        db.executeSql(`DELETE FROM ${Table.TraceLog}`, [], () => resolve(), reject);
      });
    }).catch(this.handleSqlError);
  }

  protected createTables(db: any): ng.IPromise<any> {
    return this.$q((resolve, reject) => {
      db.transaction(
        (tx: any) => {
          tx.executeSql(`DROP TABLE IF EXISTS ${Table.App}`);
          tx.executeSql(`CREATE TABLE ${Table.App} (
            ${this.idCol} INTEGER PRIMARY KEY,
            ${StoreKey.Bookmarks} TEXT,
            ${StoreKey.LastUpdated} TEXT,
            ${StoreKey.Password} TEXT,
            ${StoreKey.ServiceUrl} TEXT,
            ${StoreKey.SyncId} TEXT,
            ${StoreKey.SyncVersion} TEXT
          )`);
          tx.executeSql(`INSERT INTO ${Table.App} (${this.idCol}) VALUES (?)`, [this.appRowId]);
          tx.executeSql(`DROP TABLE IF EXISTS ${Table.TraceLog}`);
          tx.executeSql(`CREATE TABLE ${Table.TraceLog} (
            ${TraceLogColumn.Timestamp} INTEGER PRIMARY KEY,
            ${TraceLogColumn.Level} INTEGER,
            ${TraceLogColumn.Message} TEXT
          )`);
        },
        reject,
        resolve
      );
    }).catch(this.handleSqlError);
  }

  protected getFromStore<T = StoreContent>(keys: IDBValidKey[] = []): ng.IPromise<T[]> {
    return this.$q<T[]>((resolve, reject) => {
      // Separate keys
      const keysForNativeStorage = keys.filter((key) => this.nativeStorageKeys.includes(key));
      const keysForSql = keys.filter((key) => this.sqlKeys.includes(key));

      // Get values from native storage and sql separately then combine them back to original order
      const results = new Array(keys.length);
      this.$q
        .all(
          keysForNativeStorage
            .map((key) => {
              return this.getFromNativeStorage(key).then((value) => {
                results[keys.indexOf(key)] = value;
              });
            })
            .concat([
              this.getFromSql(keysForSql).then((values) => {
                keysForSql.forEach((key, index) => {
                  results[keys.indexOf(key)] = values[index];
                });
              })
            ])
        )
        .then(() => resolve(results))
        .catch(reject);
    });
  }

  protected getAllTraceLogs(): ng.IPromise<TraceLogItem[]> {
    return this.$q<TraceLogItem[]>((resolve, reject) => {
      this.openDatabase().then((db) => {
        db.executeSql(
          `SELECT * FROM ${Table.TraceLog} ORDER BY ${TraceLogColumn.Timestamp}`,
          [],
          (result: any) => {
            // Convert results to array of TraceLogItem
            const logItems: TraceLogItem[] = [];
            for (let x = 0; x < result.rows.length; x += 1) {
              const logItem: TraceLogItem = {
                level: result.rows.item(x).level,
                message: result.rows.item(x).message,
                timestamp: result.rows.item(x).timestamp
              };
              logItems.push(logItem);
            }
            resolve(logItems);
          },
          reject
        );
      });
    }).catch(this.handleSqlError);
  }

  protected getFromNativeStorage<T = StoreContent>(key: IDBValidKey): ng.IPromise<T> {
    return this.$q<T>((resolve, reject) => {
      if (angular.isUndefined(key ?? undefined)) {
        return resolve();
      }

      const failure = (err = new Error()) => {
        if ((err as any).code === NativeStorageError.ItemNotFound) {
          return resolve();
        }
        reject(new Exceptions.FailedLocalStorageException(NativeStorageError[(err as any).code], err));
      };
      window.NativeStorage.getItem(key, resolve, failure);
    });
  }

  protected getFromSql<T = StoreContent>(keys: IDBValidKey[] = []): ng.IPromise<T[]> {
    const values = new Array(keys.length);
    return this.$q<T[]>((resolve, reject) => {
      // Get non-trace log values
      const keysWithoutTraceLog = keys.filter((key) => key !== StoreKey.TraceLog);
      if (keysWithoutTraceLog.length === 0) {
        return resolve([]);
      }
      this.openDatabase().then((db) => {
        db.executeSql(
          `SELECT ${keysWithoutTraceLog.join(', ')} FROM ${Table.App} WHERE ${this.idCol} = ?`,
          [this.appRowId],
          (result: any) => {
            keysWithoutTraceLog.forEach((key) => {
              values[keys.indexOf(key)] = result.rows.item(0)[key as string];
            });
            resolve();
          },
          reject
        );
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
      .then(() => values)
      .catch(this.handleSqlError);
  }

  protected handleSqlError(err: Error): never {
    throw new Exceptions.FailedLocalStorageException(err.message);
  }

  protected keys(): ng.IPromise<IDBValidKey[]> {
    return this.$q<IDBValidKey[]>((resolve, reject) => window.NativeStorage.keys(resolve, reject)).then((keys) => {
      return keys.concat(this.sqlKeys);
    });
  }

  protected openDatabase(): ng.IPromise<any> {
    if (!angular.isUndefined(this.db ?? undefined)) {
      return this.$q.resolve(this.db);
    }
    return this.$q((resolve, reject) => {
      window.resolveLocalFileSystemURL(window.cordova.file.externalDataDirectory, (dataDir: any) => {
        window.sqlitePlugin.openDatabase(
          { name: this.dbName, androidDatabaseLocation: dataDir.toURL() },
          resolve,
          reject
        );
      });
    })
      .then((db) => {
        this.db = db;
        return db;
      })
      .catch(this.handleSqlError);
  }

  protected removeFromStore(keys: IDBValidKey[] = []): ng.IPromise<void> {
    // Separate keys
    const keysForNativeStorage = keys.filter((key) => this.nativeStorageKeys.includes(key));
    const keysForSql = keys.filter((key) => this.sqlKeys.includes(key));

    // Remove values from native storage and sql separately
    return this.$q
      .all(
        keysForNativeStorage
          .map((key) => this.$q((resolve, reject) => window.NativeStorage.remove(key, resolve, reject)))
          .concat(this.$q.all(keysForSql.map((key) => this.setInSql(key, null))))
      )
      .then(() => {});
  }

  protected setInStore(key: IDBValidKey, value: any): ng.IPromise<void> {
    if (this.nativeStorageKeys.includes(key)) {
      return this.setInNativeStorage(key, value);
    }
    return this.setInSql(key, value);
  }

  protected setInNativeStorage(key: IDBValidKey, value: any): ng.IPromise<void> {
    return this.$q((resolve, reject) => window.NativeStorage.setItem(key, value, resolve, reject));
  }

  protected setInSql(key: IDBValidKey, value: any): ng.IPromise<void> {
    // For trace log use relevant method
    if (key === StoreKey.TraceLog) {
      return angular.isUndefined(value ?? undefined) ? this.clearTraceLog() : this.addTraceLog(value);
    }

    // For anything else update existing app table row
    return this.$q<void>((resolve, reject) => {
      this.openDatabase().then((db) => {
        db.executeSql(
          `UPDATE ${Table.App} SET ${key} = ? WHERE ${this.idCol} = ?`,
          [value, this.appRowId],
          () => resolve(),
          reject
        );
      });
    }).catch(this.handleSqlError);
  }
}
