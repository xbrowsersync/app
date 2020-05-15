var xBrowserSync = xBrowserSync || {};
xBrowserSync.App = xBrowserSync.App || {};

/* ------------------------------------------------------------------------------------
 * Class name:	xBrowserSync.App.BookmarkIdMapper
 * Description:	Manages mappings between native bookmark IDs and synced bookmark IDs.
 * ------------------------------------------------------------------------------------ */

xBrowserSync.App.BookmarkIdMapper = function ($q, globals, store) {
  'use strict';

  var mapper = {};

  mapper.Add = function (newMappings) {
    // Convert mappings to arrays if necessary
    newMappings = Array.isArray(newMappings) ? newMappings : [newMappings];

    // Add new mappings to existing mappings
    return store.Get(globals.CacheKeys.BookmarkIdMappings)
      .then(function (idMappings) {
        return idMappings.concat(newMappings);
      })
      .then(function (updatedMappings) {
        return mapper.Set(updatedMappings);
      });
  };

  mapper.Clear = function () {
    return store.Clear(globals.CacheKeys.BookmarkIdMappings);
  };

  mapper.CreateMapping = function (syncedId, nativeId) {
    return {
      nativeId: nativeId,
      syncedId: syncedId
    };
  };

  mapper.Get = function (nativeId, syncedId) {
    return store.Get(globals.CacheKeys.BookmarkIdMappings)
      .then(function (idMappings) {
        // Find the requested mapping
        var mapping;
        if (nativeId != null) {
          mapping = idMappings.find(function (x) {
            return x.nativeId === nativeId;
          });
        }
        else if (syncedId != null) {
          mapping = idMappings.find(function (x) {
            return x.syncedId === syncedId;
          });
        }
        return mapping;
      });
  };

  mapper.Remove = function (syncedIds, nativeIds) {
    // Convert ids to arrays if necessary
    syncedIds = syncedIds != null ? Array.isArray(syncedIds) ? syncedIds : [syncedIds] : null;
    nativeIds = nativeIds != null ? Array.isArray(nativeIds) ? nativeIds : [nativeIds] : null;

    // Retrieve id mappings
    return store.Get(globals.CacheKeys.BookmarkIdMappings)
      .then(function (idMappings) {
        // Remove id mappings matching provided synced ids
        var idMappingsLessSynced = syncedIds == null ? idMappings :
          syncedIds.reduce(function (acc, val) {
            var indexToRemove = acc.findIndex(function (x) {
              return x.syncedId === val;
            });
            if (indexToRemove < 0) {
              throw new Error('Bookmark ID mapping to remove could not be determined');
            }
            return acc.filter(function (x, index) {
              return index !== indexToRemove;
            });
          }, idMappings);

        // Remove id mappings matching provided native ids
        var idMappingsLessNative = nativeIds == null ? idMappingsLessSynced :
          nativeIds.reduce(function (acc, val) {
            var indexToRemove = acc.findIndex(function (x) {
              return x.nativeIds === val;
            });
            if (indexToRemove < 0) {
              throw new Error('Bookmark ID mapping to remove could not be determined');
            }
            return acc.filter(function (x, index) {
              return index !== indexToRemove;
            });
          }, idMappingsLessSynced);

        // Add updated mappings to store
        return mapper.Set(idMappingsLessNative);
      })
      .catch(function (err) {
        return $q.reject({
          code: globals.ErrorCodes.BookmarkMappingNotFound,
          stack: err.stack
        });
      });
  };

  mapper.Set = function (idMappings) {
    // Sort mappings then save to store
    var sortedMappings = idMappings.sort(function (a, b) {
      return a.syncedId - b.syncedId;
    });
    return store.Set(globals.CacheKeys.BookmarkIdMappings, sortedMappings);
  };

  return mapper;
};