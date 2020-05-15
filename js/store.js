var xBrowserSync = xBrowserSync || {};
xBrowserSync.App = xBrowserSync.App || {};

/* ------------------------------------------------------------------------------------
 * Class name:	xBrowserSync.App.Store
 * Description:	Responsible for interacting with the cache store.
 * ------------------------------------------------------------------------------------ */

xBrowserSync.App.Store = function ($q) {
  'use strict';

  var _dbName = 'xbs-store';
  var _storeName = 'xbs';
  var store = {};

  var getStore = function () {
    return new idbKeyval.Store(_dbName, _storeName);
  };

  store.Clear = function () {
    return idbKeyval.clear(getStore());
  };

  store.Get = function (keys) {
    // If no keys provided, get all keys from store
    return (!keys ? idbKeyval.keys(getStore()) : $q.resolve(keys))
      .then(function (allKeys) {
        // Ensure the keys param is an array before processing
        keys = Array.isArray(allKeys) ? allKeys : [allKeys];
        return $q.all(keys.map(function (key) {
          return idbKeyval.get(key, getStore());
        }));
      })
      .then(function (keyValues) {
        // Convert the keys and key values into a return object
        return keys.reduce(function (prev, current, index) {
          prev[current] = keyValues[index];
          return prev;
        }, {});
      })
      .then(function (objKeyValues) {
        // If result object only has one key, simply return the key value
        if (objKeyValues && Object.keys(objKeyValues).length === 1) {
          return objKeyValues[keys[0]];
        }

        return objKeyValues;
      });
  };

  store.Remove = function (keys) {
    keys = Array.isArray(keys) ? keys : [keys];
    return $q.all(keys.map(function (key) {
      return idbKeyval.del(key, getStore());
    }));
  };

  store.Set = function (key, value) {
    if (!key) {
      return $q.resolve();
    }

    return $q(function (resolve, reject) {
      (value == null ? idbKeyval.del(key, getStore()) : idbKeyval.set(key, value, getStore()))
        .then(resolve)
        .catch(reject);
    });
  };

  return store;
};