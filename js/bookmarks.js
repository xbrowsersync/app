var xBrowserSync = xBrowserSync || {};
xBrowserSync.App = xBrowserSync.App || {};

/* ------------------------------------------------------------------------------------
 * Class name:	xBrowserSync.App.Bookmarks
 * Description:	Responsible for handling bookmark data.
 * ------------------------------------------------------------------------------------ */

xBrowserSync.App.Bookmarks = function ($q, $timeout, platform, globals, api, utility) {
  'use strict';

  var cachedBookmarks_encrypted, cachedBookmarks_plain, currentSync, syncQueue = [];

  /* ------------------------------------------------------------------------------------
   * Public functions
   * ------------------------------------------------------------------------------------ */

  var addNewInXBookmarks = function (createdBookmarkInfo, containerName, indexPath, xBookmarks) {
    var updatedBookmarks = utility.DeepCopy(xBookmarks);

    try {
      var container = getContainer(containerName, updatedBookmarks, true);
      if (!container) {
        throw new Error();
      }

      var parent = indexPath.slice(0, -1).reduce(function (previous, indexPathPosition) {
        return previous.children[indexPathPosition];
      }, container);
      if (!parent) {
        throw new Error();
      }

      // Create new bookmark/separator
      var newXBookmark = isSeparator(createdBookmarkInfo) ? new xSeparator() :
        new xBookmark(
          createdBookmarkInfo.title,
          createdBookmarkInfo.url || null,
          createdBookmarkInfo.description,
          createdBookmarkInfo.tags,
          createdBookmarkInfo.children);

      // Use id if supplied or create new id
      newXBookmark.id = createdBookmarkInfo.id || getNewBookmarkId(xBookmarks, [container.id]);

      // Clean bookmark and add at last index in path
      var cleanedBookmark = cleanBookmark(newXBookmark);
      parent.children.splice(indexPath.slice().pop(), 0, cleanedBookmark);
    }
    catch (err) {
      return $q.reject({
        code: globals.ErrorCodes.XBookmarkNotFound,
        stack: err.stack
      });
    }

    return $q.resolve({
      bookmarks: updatedBookmarks
    });
  };

  var checkBookmarksHaveUniqueIds = function (bookmarks) {
    // Find any bookmark without an id
    var bookmarksHaveIds = true;
    eachBookmark(bookmarks, function (bookmark) {
      if (_.isUndefined(bookmark.id)) {
        bookmarksHaveIds = false;
      }
    });

    if (!bookmarksHaveIds) {
      utility.LogWarning('Bookmarks missing ids');
      return false;
    }

    // Get all local bookmarks into flat array
    var allBookmarks = [];
    eachBookmark(bookmarks, function (bookmark) {
      allBookmarks.push(bookmark);
    });

    // Find a bookmark with a duplicate id
    var duplicateId = _.chain(allBookmarks)
      .countBy('id')
      .findKey(function (count) {
        return count > 1;
      })
      .value();

    if (!_.isUndefined(duplicateId)) {
      utility.LogWarning('Duplicate bookmark id detected: ' + duplicateId);
      return false;
    }

    return true;
  };

  var checkIfRefreshSyncedDataOnError = function (err) {
    return err && (
      err.code === globals.ErrorCodes.ContainerChanged ||
      err.code === globals.ErrorCodes.DataOutOfSync ||
      err.code === globals.ErrorCodes.FailedCreateLocalBookmarks ||
      err.code === globals.ErrorCodes.FailedGetLocalBookmarks ||
      err.code === globals.ErrorCodes.FailedRemoveLocalBookmarks ||
      err.code === globals.ErrorCodes.LocalBookmarkNotFound ||
      err.code === globals.ErrorCodes.XBookmarkNotFound);
  };

  var checkForUpdates = function () {
    return platform.LocalStorage.Get(globals.CacheKeys.LastUpdated)
      .then(function (cachedData) {
        // Get last updated date from local cache
        var cachedLastUpdated = new Date(cachedData);

        // Check if bookmarks have been updated
        return api.GetBookmarksLastUpdated()
          .then(function (data) {
            // If last updated is different to the date in local storage, refresh bookmarks
            var remoteLastUpdated = new Date(data.lastUpdated);
            var updatesAvailable = !cachedLastUpdated || cachedLastUpdated.getTime() !== remoteLastUpdated.getTime();

            if (updatesAvailable) {
              utility.LogInfo('Updates available, local:' + (cachedLastUpdated ? cachedLastUpdated.toISOString() : 'none') + ' remote:' + remoteLastUpdated.toISOString());
            }

            return updatesAvailable;
          });
      });
  };

  var cleanBookmark = function (originalBookmark) {
    // Create a copy of original
    var copy = utility.DeepCopy(originalBookmark);

    // Remove empty properties, except for children array
    var cleanedBookmark = _.pick(copy, function (value, key) {
      return _.isArray(value) && key !== 'children' || _.isString(value) ? value.length > 0 : value != null;
    });

    return cleanedBookmark;
  };

  var disableSync = function () {
    return platform.LocalStorage.Get(globals.CacheKeys.SyncEnabled)
      .then(function (syncEnabled) {
        if (!syncEnabled) {
          return;
        }

        // Disable checking for sync updates
        platform.AutomaticUpdates.Stop();

        // Clear sync queue
        syncQueue = [];

        // Reset syncing flag
        setIsSyncing();

        // Clear cached data
        return $q.all([
          platform.LocalStorage.Set(globals.CacheKeys.Bookmarks),
          platform.LocalStorage.Set(globals.CacheKeys.Password),
          platform.LocalStorage.Set(globals.CacheKeys.SyncEnabled, false),
          platform.LocalStorage.Set(globals.CacheKeys.SyncVersion),
          updateCachedBookmarks(null, null)
        ])
          .then(function () {
            utility.LogInfo('Sync disabled');

            // Refresh interface/icon
            platform.Interface.Refresh();
          });
      });
  };

  var eachBookmark = function (bookmarks, iteratee) {
    // Run the iteratee function for every bookmark
    (function iterateBookmarks(bookmarksToIterate) {
      for (var i = 0; i < bookmarksToIterate.length; i++) {
        iteratee(bookmarksToIterate[i]);

        // If the bookmark has children, iterate them
        if (bookmarksToIterate[i].children && bookmarksToIterate[i].children.length > 0) {
          iterateBookmarks(bookmarksToIterate[i].children);
        }
      }
    })(bookmarks);
  };

  var executeSync = function (isBackgroundSync) {
    // Check if sync enabled before running sync
    return platform.LocalStorage.Get(globals.CacheKeys.SyncEnabled)
      .then(function (syncEnabled) {
        if (!syncEnabled) {
          return $q.reject(globals.ErrorCodes.SyncNotEnabled);
        }

        // Get available updates if there are no queued syncs, finally process the queue
        return (syncQueue.length === 0 ? checkForUpdates() : $q.resolve())
          .then(function (updatesAvailable) {
            if (updatesAvailable) {
              return queueSync({
                type: globals.SyncType.Pull
              });
            }
          })
          .then(function () {
            return processSyncQueue(isBackgroundSync);
          });
      });
  };

  var exportBookmarks = function () {
    var cleanRecursive = function (bookmarks) {
      return bookmarks.map(function (bookmark) {
        var cleanedBookmark = cleanBookmark(bookmark);
        if (_.isArray(cleanedBookmark.children)) {
          cleanedBookmark.children = cleanRecursive(cleanedBookmark.children);
        }
        return cleanedBookmark;
      });
    };

    return platform.LocalStorage.Get(globals.CacheKeys.SyncEnabled)
      .then(function (syncEnabled) {
        // If sync is not enabled, export local browser data
        if (!syncEnabled) {
          return platform.Bookmarks.Get(false);
        }
        else {
          // Otherwise, export synced data
          return api.GetBookmarks()
            .then(function (data) {
              // Decrypt bookmarks
              return utility.DecryptData(data.bookmarks);
            })
            .then(function (decryptedData) {
              // Remove empty containers
              var bookmarks = removeEmptyContainers(JSON.parse(decryptedData));

              // Clean exported bookmarks and return as json
              return cleanRecursive(bookmarks);
            });
        }
      });
  };

  var findBookmarkById = function (bookmarks, id) {
    if (!bookmarks) {
      return;
    }

    // Recursively iterate through all bookmarks until id match is found
    var bookmark = bookmarks.find(function (x) { return x.id === id; });
    if (!bookmark) {
      _.each(bookmarks, function (x) {
        if (!bookmark) {
          bookmark = findBookmarkById(x.children, id);
        }
      });
    }

    return bookmark;
  };

  var findBookmarkInTree = function (id, tree, index) {
    if (Array.isArray(tree)) {
      tree = {
        id: -1,
        children: tree
      };
    }

    if (tree.id === id) {
      var path = [{ bookmark: tree, index: index }];
      return { result: tree, path: path };
    } else {
      var children = tree.children || [];
      for (var i = 0; i < children.length; i++) {
        var child = children[i];
        var tmp = findBookmarkInTree(id, child, i);
        if (!_.isEmpty(tmp)) {
          tmp.path.unshift({ bookmark: tree, index: index });
          return tmp;
        }
      }
      return {};
    }
  };

  var findCurrentUrlInBookmarks = function () {
    var currentUrl;

    // Check if current url is contained in bookmarks
    return platform.GetCurrentUrl()
      .then(function (result) {
        if (!result) {
          return;
        }

        currentUrl = result;
        return searchBookmarks({ url: currentUrl })
          .then(function (results) {
            var result = _.find(results, function (bookmark) {
              return bookmark.url.toLowerCase() === currentUrl.toLowerCase();
            });

            return $q.resolve(result);
          });
      });
  };

  var getCurrentSync = function () {
    // If nothing on the queue, get the current sync in progress if exists, otherwise get the last
    // sync in the queue
    return syncQueue.length === 0 ? currentSync : syncQueue[syncQueue.length - 1];
  };

  var getContainer = function (containerName, bookmarks, createIfNotPresent) {
    var container = _.findWhere(bookmarks, { title: containerName });

    // If container does not exist, create it if specified
    if (!container && createIfNotPresent) {
      container = new xBookmark(containerName);
      container.id = getNewBookmarkId(bookmarks);
      bookmarks.push(container);
    }

    return container;
  };

  var getExistingInXBookmarks = function (containerName, indexPath, xBookmarks) {
    var bookmark;

    try {
      var container = getContainer(containerName, xBookmarks);
      if (!container) {
        throw new Error();
      }

      var parent = indexPath.slice(0, -1).reduce(function (previous, indexPathPosition) {
        return previous.children[indexPathPosition];
      }, container);
      if (!parent) {
        throw new Error();
      }

      // Return a copy of the specified bookmark
      bookmark = utility.DeepCopy(parent.children[indexPath.slice().pop()]);
      if (!bookmark) {
        throw new Error();
      }
    }
    catch (err) {
      return $q.reject({
        code: globals.ErrorCodes.XBookmarkNotFound,
        stack: err.stack
      });
    }

    return $q.resolve({
      bookmark: bookmark,
      bookmarks: xBookmarks
    });
  };

  var getLookahead = function (word, bookmarksToSearch, tagsOnly, exclusions) {
    var getBookmarks;
    var deferred = $q.defer();

    if (!word) {
      return deferred.resolve();
    }

    if (bookmarksToSearch && bookmarksToSearch.length > 0) {
      // Use supplied bookmarks
      getBookmarks = $q.resolve(bookmarksToSearch);
    }
    else {
      // Get cached bookmarks
      getBookmarks = getCachedBookmarks();
    }

    // With bookmarks
    getBookmarks
      .then(function (bookmarks) {
        // Get lookaheads
        var lookaheads = searchBookmarksForLookaheads(bookmarks, word, tagsOnly);

        // Remove exclusions from lookaheads
        if (exclusions) {
          lookaheads = _.difference(lookaheads, exclusions);
        }

        if (lookaheads.length === 0) {
          deferred.resolve(null);
        }

        // Count lookaheads and return most common
        var lookahead = _.chain(lookaheads)
          .sortBy(function (lookahead) {
            return lookahead.length;
          })
          .countBy().pairs().max(_.last).first().value();

        deferred.resolve([lookahead, word]);
      })
      .catch(function (err) {
        // Return if request was cancelled
        if (err && err.code && err.code === globals.ErrorCodes.HttpRequestCancelled) {
          return;
        }

        deferred.reject(err);
      });

    return deferred.promise;
  };

  var getNewBookmarkId = function (bookmarks, takenIds) {
    var highestId = 0;
    takenIds = takenIds || [0];

    // Check existing bookmarks for highest id
    eachBookmark(bookmarks, function (bookmark) {
      if (!_.isUndefined(bookmark.id) && bookmark.id > highestId) {
        highestId = bookmark.id;
      }
    });

    // Compare highest id with supplied taken ids
    highestId = _.max(takenIds) > highestId ? _.max(takenIds) : highestId;

    return highestId + 1;
  };

  var getSyncBookmarksToolbar = function () {
    // Get setting from local storage
    return platform.LocalStorage.Get(globals.CacheKeys.SyncBookmarksToolbar)
      .then(function (syncBookmarksToolbar) {
        // Set default value to true
        if (syncBookmarksToolbar == null) {
          syncBookmarksToolbar = true;
        }

        return syncBookmarksToolbar;
      });
  };

  var getSyncSize = function () {
    return getCachedBookmarks()
      .then(function () {
        return platform.LocalStorage.Get(globals.CacheKeys.Bookmarks);
      })
      .then(function (cachedBookmarks) {
        // Return size in bytes of cached encrypted bookmarks
        var sizeInBytes = (new TextEncoder('utf-8')).encode(cachedBookmarks).byteLength;
        return sizeInBytes;
      });
  };

  var isSeparator = function (bookmark) {
    if (!bookmark) {
      return false;
    }

    // Bookmark is separator if title is dashes or designated separator title, has no url and no children,
    // or type is separator (in FF)
    var separatorRegex = new RegExp('^[-─]{1,}$');
    return bookmark.type === 'separator' ||
      bookmark.title && (
        (separatorRegex.test(bookmark.title) || bookmark.title.indexOf(globals.Bookmarks.HorizontalSeparatorTitle) >= 0 ||
          bookmark.title === globals.Bookmarks.VerticalSeparatorTitle) &&
        (!bookmark.url || bookmark.url === platform.GetNewTabUrl()) &&
        (!bookmark.children || bookmark.children.length === 0)
      );
  };

  var queueSync = function (syncToQueue, runSync) {
    runSync = runSync === undefined ? true : runSync;

    return platform.LocalStorage.Get(globals.CacheKeys.SyncEnabled)
      .then(function (syncEnabled) {
        // If new sync ensure sync queue is clear
        if (!syncEnabled) {
          syncQueue = [];
        }

        var queuedSync;
        if (syncToQueue) {
          // Add sync to queue
          queuedSync = $q.defer();
          syncToQueue.deferred = queuedSync;
          syncToQueue.uniqueId = syncToQueue.uniqueId || utility.GetUniqueishId();
          syncQueue.push(syncToQueue);

          var syncType = _.findKey(globals.SyncType, function (key) { return key === syncToQueue.type; });
          utility.LogInfo('Sync ' + syncToQueue.uniqueId + ' (' + syncType.toLowerCase() + ') queued (' + syncQueue.length + ' waiting to sync)');
        }

        // Process queued syncs
        if (runSync) {
          $timeout(processSyncQueue);
        }

        // Return queued sync promise
        return queuedSync.promise;
      });
  };

  var removeExistingInXBookmarks = function (containerName, indexPath, xBookmarks) {
    var bookmark;
    var updatedBookmarks = utility.DeepCopy(xBookmarks);

    try {
      var container = getContainer(containerName, updatedBookmarks);
      if (!container) {
        throw new Error();
      }

      var parent = indexPath.slice(0, -1).reduce(function (previous, indexPathPosition) {
        return previous.children[indexPathPosition];
      }, container);
      if (!parent) {
        throw new Error();
      }

      bookmark = parent.children.splice(indexPath.slice().pop(), 1)[0];
      if (!bookmark) {
        throw new Error();
      }
    }
    catch (err) {
      return $q.reject({
        code: globals.ErrorCodes.XBookmarkNotFound,
        stack: err.stack
      });
    }

    return $q.resolve({
      bookmark: bookmark,
      bookmarks: updatedBookmarks
    });
  };

  var searchBookmarks = function (query) {
    if (!query) {
      query = { keywords: [] };
    }

    // Get cached bookmarks
    return getCachedBookmarks()
      .then(function (bookmarks) {
        var results;

        // If url supplied, first search by url
        if (query.url) {
          results = searchBookmarksByUrl(bookmarks, query.url) || [];
        }

        // Search by keywords and sort (score desc, id desc) using results from url search if relevant
        bookmarks = results || bookmarks;
        results = _.chain(searchBookmarksByKeywords(bookmarks, query.keywords))
          .sortBy('id')
          .sortBy('score')
          .reverse()
          .value();

        return results;
      });
  };

  var updateExistingInXBookmarks = function (changedBookmarkInfo, containerName, indexPath, xBookmarks) {
    var updatedBookmarks = utility.DeepCopy(xBookmarks);

    try {
      var container = getContainer(containerName, updatedBookmarks);
      if (!container) {
        throw new Error();
      }

      var parent = indexPath.slice(0, -1).reduce(function (previous, indexPathPosition) {
        return previous.children[indexPathPosition];
      }, container);
      if (!parent) {
        throw new Error();
      }

      // Update bookmark at last index in path
      var bookmarkToUpdate = parent.children[indexPath.slice().pop()];
      if (!bookmarkToUpdate) {
        throw new Error();
      }
      bookmarkToUpdate.title = changedBookmarkInfo.title !== undefined ? changedBookmarkInfo.title : bookmarkToUpdate.title;

      // Update url accounting for unsupported urls
      if (changedBookmarkInfo.url !== undefined &&
        changedBookmarkInfo.url !== bookmarkToUpdate.url &&
        (changedBookmarkInfo.url !== platform.GetNewTabUrl() ||
          (changedBookmarkInfo.url === platform.GetNewTabUrl() &&
            bookmarkToUpdate.url === platform.GetSupportedUrl(bookmarkToUpdate.url)))) {
        bookmarkToUpdate.url = changedBookmarkInfo.url;
      }

      // If updated bookmark is a separator, convert xbookmark to separator
      if (isSeparator(bookmarkToUpdate)) {
        // Create a new separator with same id
        var separator = new xSeparator();
        separator.id = bookmarkToUpdate.id;

        // Clear existing properties
        for (var prop in bookmarkToUpdate) {
          if (bookmarkToUpdate.hasOwnProperty(prop)) {
            delete bookmarkToUpdate[prop];
          }
        }

        // Copy separator properties          
        bookmarkToUpdate.id = separator.id;
        bookmarkToUpdate.title = separator.title;
      }

      // Clean bookmark and replace existing
      var cleanedBookmark = cleanBookmark(bookmarkToUpdate);
      parent.children[indexPath.slice().pop()] = cleanedBookmark;
    }
    catch (err) {
      return $q.reject({
        code: globals.ErrorCodes.XBookmarkNotFound,
        stack: err.stack
      });
    }

    return $q.resolve({
      bookmarks: updatedBookmarks
    });
  };

  var xBookmark = function (title, url, description, tags, children) {
    var xBookmark = {};

    if (title) {
      xBookmark.title = title.trim();
    }

    if (url) {
      xBookmark.url = url.trim();
    }
    else {
      xBookmark.children = children || [];
    }

    if (description) {
      xBookmark.description = utility.TrimToNearestWord(description, globals.Bookmarks.DescriptionMaxLength);
    }

    if (tags && tags.length > 0) {
      xBookmark.tags = tags;
    }

    return xBookmark;
  };

  var xBookmarkIsContainer = function (bookmark) {
    return (bookmark.title === globals.Bookmarks.MenuContainerName ||
      bookmark.title === globals.Bookmarks.MobileContainerName ||
      bookmark.title === globals.Bookmarks.OtherContainerName ||
      bookmark.title === globals.Bookmarks.ToolbarContainerName);
  };

  var xSeparator = function () {
    return {
      title: '-'
    };
  };


  /* ------------------------------------------------------------------------------------
   * Private functions
   * ------------------------------------------------------------------------------------ */

  var checkIfDisableSyncOnError = function (syncEnabled, err) {
    if (syncEnabled && (
      err.code === globals.ErrorCodes.SyncRemoved ||
      err.code === globals.ErrorCodes.MissingClientData ||
      err.code === globals.ErrorCodes.NoDataFound ||
      err.code === globals.ErrorCodes.TooManyRequests)) {
      return disableSync();
    }
    else {
      return $q.resolve();
    }
  };

  var cleanWords = function (wordsToClean) {
    if (!wordsToClean) {
      return;
    }

    var cleanWords = wordsToClean.toLowerCase().replace(/['"]/g, '');
    var cleanWordsArr = _.compact(cleanWords.split(/\s/));
    return cleanWordsArr;
  };

  var enableSync = function () {
    utility.LogInfo('Sync enabled');
    return $q.all([
      platform.LocalStorage.Set(globals.CacheKeys.SyncEnabled, true),
      platform.AutomaticUpdates.Start()
    ]);
  };

  var getCachedBookmarks = function () {
    // Get cached encrypted bookmarks from local storage
    return platform.LocalStorage.Get(globals.CacheKeys.Bookmarks)
      .then(function (cachedData) {
        var cachedEncryptedBookmarks = cachedData;

        // Return unencrypted cached bookmarks from memory if encrypted bookmarks
        // in storage match cached encrypted bookmarks in memory
        if (cachedEncryptedBookmarks && cachedBookmarks_encrypted && cachedEncryptedBookmarks === cachedBookmarks_encrypted) {
          return utility.DeepCopy(cachedBookmarks_plain);
        }

        // If encrypted bookmarks not cached in storage, get synced bookmarks
        return (cachedEncryptedBookmarks ? $q.resolve(cachedEncryptedBookmarks) :
          api.GetBookmarks()
            .then(function (response) {
              return response.bookmarks;
            })
        ).then(function (encryptedBookmarks) {
          // Decrypt bookmarks
          return utility.DecryptData(encryptedBookmarks)
            .then(function (decryptedBookmarks) {
              var bookmarks = decryptedBookmarks ? JSON.parse(decryptedBookmarks) : [];

              // Update cache with retrieved bookmarks data
              return updateCachedBookmarks(bookmarks, encryptedBookmarks);
            });
        });
      });
  };

  var handleFailedSync = function (failedSync, err) {
    var clearCachedData;

    // If offline swallow error and place failed sync back on the queue
    if (err.code === globals.ErrorCodes.NetworkOffline) {
      utility.LogInfo('Sync ' + failedSync.uniqueId + ' not committed, network offline (' + syncQueue.length + ' waiting to sync)');
      syncQueue.unshift(failedSync);

      // Return sync error back to process that queued the sync
      failedSync.deferred.reject({
        code: globals.ErrorCodes.SyncUncommitted
      });

      return;
    }

    // Otherwise handle failed sync
    utility.LogInfo('Sync ' + failedSync.uniqueId + ' failed.');
    utility.LogError(err, 'bookmarks.sync');
    if (failedSync.changeInfo && failedSync.changeInfo.type) {
      utility.LogInfo(failedSync.changeInfo);
    }

    return platform.LocalStorage.Get(globals.CacheKeys.SyncEnabled)
      .then(function (syncEnabled) {
        // TODO: Move to UI
        // If error occurred whilst creating new sync, remove cached sync ID and password
        if (failedSync.type === globals.SyncType.Push && !failedSync.changeInfo) {
          clearCachedData = $q.all([
            platform.LocalStorage.Set(globals.CacheKeys.SyncId),
            platform.LocalStorage.Set(globals.CacheKeys.Password)
          ]);
        }
        else {
          clearCachedData = $q.resolve();
        }

        return $q.all([
          clearCachedData,
          setIsSyncing()
        ])
          .then(function () {
            if (!syncEnabled) {
              return;
            }

            // If no data found, sync has been removed
            if (err.code === globals.ErrorCodes.NoDataFound) {
              err.code = globals.ErrorCodes.SyncRemoved;
            }

            // If local changes made, clear sync queue
            else if (failedSync.type !== globals.SyncType.Pull) {
              syncQueue = [];
              var lastUpdated = new Date().toISOString();
              platform.LocalStorage.Set(globals.CacheKeys.LastUpdated, lastUpdated);
            }

            // Check if sync should be disabled
            return checkIfDisableSyncOnError(syncEnabled, err);
          })
          .finally(function () {
            // Return sync error back to process that queued the sync
            failedSync.deferred.reject(err);
          });
      });
  };

  var processBookmarkChanges = function (bookmarks, changeInfo) {
    var pathInfo;

    // Update bookmarks before syncing
    switch (changeInfo.type) {
      // Create bookmark
      case globals.UpdateType.Create:
        // Get or create other bookmarks container
        var otherContainer = getContainer(globals.Bookmarks.OtherContainerName, bookmarks, true);

        // Give new bookmark an id and add to container
        var newBookmark = changeInfo.bookmark;
        newBookmark.id = getNewBookmarkId(bookmarks);
        otherContainer.children.push(newBookmark);

        // Get path info for updating local bookmarks
        pathInfo = findBookmarkInTree(newBookmark.id, bookmarks);
        break;
      // Update bookmark
      case globals.UpdateType.Update:
        // Update bookmark
        bookmarks = recursiveUpdate(bookmarks, changeInfo.bookmark);

        // Get path info for updating local bookmarks
        pathInfo = findBookmarkInTree(changeInfo.bookmark.id, bookmarks);
        break;
      // Delete bookmark
      case globals.UpdateType.Delete:
        // Get path info for updating local bookmarks
        pathInfo = findBookmarkInTree(changeInfo.id, bookmarks);

        // Remove bookmarks containing url parameter
        recursiveDelete(bookmarks, changeInfo.id);
        break;
    }

    return {
      bookmarks: bookmarks,
      pathInfo: pathInfo
    };
  };

  var processSyncQueue = function (isBackgroundSync) {
    var syncEnabled;

    // If a sync is in progress, retry later
    if (currentSync || syncQueue.length === 0) {
      return $q.resolve();
    }

    // Get first sync in the queue
    currentSync = syncQueue.shift();

    // If syncChange flag set wait for resolution, otherwise proceed with sync
    return (currentSync.syncChange || $q.resolve(true))
      .then(function (syncChange) {
        if (!syncChange) {
          // Not syncing this change
          return;
        }

        utility.LogInfo('Processing sync ' + currentSync.uniqueId + (isBackgroundSync ? ' in background' : ''));

        // Enable syncing flag
        return setIsSyncing(currentSync.type)
          .then(function () {
            // Process sync
            switch (currentSync.type) {
              // Push bookmarks to xBrowserSync service
              case globals.SyncType.Push:
                return sync_handlePush(currentSync);
              // Overwrite local bookmarks
              case globals.SyncType.Pull:
                return sync_handlePull(currentSync);
              // Sync to service and overwrite local bookmarks
              case globals.SyncType.Both:
                return sync_handleBoth(currentSync, isBackgroundSync);
              // Upgrade sync to current version
              case globals.SyncType.Upgrade:
                return sync_handleUpgrade(currentSync);
              // Ambiguous sync
              default:
                return $q.reject({ code: globals.ErrorCodes.AmbiguousSyncRequest });
            }
          })
          .then(function () {
            return platform.LocalStorage.Get(globals.CacheKeys.SyncEnabled)
              .then(function (cachedSyncEnabled) {
                syncEnabled = cachedSyncEnabled;

                // If syncing for the first time or re-syncing, set sync as enabled
                if (!syncEnabled && currentSync.command !== globals.Commands.RestoreBookmarks) {
                  return enableSync();
                }
              })
              .then(function () {
                utility.LogInfo('Sync ' + currentSync.uniqueId + ' committed (' + syncQueue.length + ' waiting to sync)');
                currentSync.deferred.resolve();

                // Reset syncing flag
                return setIsSyncing();
              });
          });
      })
      .then(function () {
        // TODO: Covert to promise while loop
        // Trigger remaining syncs
        $timeout(processSyncQueue);
      })
      .catch(function (err) {
        return handleFailedSync(currentSync, err);
      })
      .finally(function () {
        // Clear current sync
        currentSync = null;
      });
  };

  var recursiveDelete = function (bookmarks, id) {
    return _.map(
      _.reject(bookmarks, function (bookmark) {
        return bookmark.id === id;
      }),
      function (bookmark) {
        if (bookmark.children && bookmark.children.length > 0) {
          bookmark.children = recursiveDelete(bookmark.children, id);
        }

        return bookmark;
      }
    );
  };

  var recursiveUpdate = function (bookmarks, updatedBookmark) {
    return _.map(
      bookmarks,
      function (bookmark) {
        if (bookmark.id === updatedBookmark.id) {
          bookmark.title = updatedBookmark.title;
          bookmark.url = updatedBookmark.url;
          bookmark.description = updatedBookmark.description;
          bookmark.tags = updatedBookmark.tags;
        }

        if (bookmark.children && bookmark.children.length > 0) {
          bookmark.children = recursiveUpdate(bookmark.children, updatedBookmark);
        }

        return bookmark;
      }
    );
  };

  var refreshLocalBookmarks = function (bookmarks) {
    // Clear current bookmarks
    return platform.Bookmarks.Clear()
      .then(function () {
        // Populate new bookmarks
        return platform.Bookmarks.Populate(bookmarks);
      });
  };

  var removeEmptyContainers = function (bookmarks) {
    var menuContainer = getContainer(globals.Bookmarks.MenuContainerName, bookmarks);
    var mobileContainer = getContainer(globals.Bookmarks.MobileContainerName, bookmarks);
    var otherContainer = getContainer(globals.Bookmarks.OtherContainerName, bookmarks);
    var toolbarContainer = getContainer(globals.Bookmarks.ToolbarContainerName, bookmarks);
    var removeArr = [];

    if (menuContainer && (!menuContainer.children || menuContainer.children.length === 0)) {
      removeArr.push(menuContainer);
    }

    if (mobileContainer && (!mobileContainer.children || mobileContainer.children.length === 0)) {
      removeArr.push(mobileContainer);
    }

    if (otherContainer && (!otherContainer.children || otherContainer.children.length === 0)) {
      removeArr.push(otherContainer);
    }

    if (toolbarContainer && (!toolbarContainer.children || toolbarContainer.children.length === 0)) {
      removeArr.push(toolbarContainer);
    }

    return _.difference(bookmarks, removeArr);
  };

  var searchBookmarksByKeywords = function (bookmarksToSearch, keywords, results) {
    if (!results) {
      results = [];
    }

    _.each(bookmarksToSearch, function (bookmark) {
      if (!bookmark.url) {
        // If this is a folder, search children
        if (bookmark.children && bookmark.children.length > 0) {
          searchBookmarksByKeywords(bookmark.children, keywords, results);
        }
      }
      else {
        var bookmarkWords = [];

        // Add all words in bookmark to array
        bookmarkWords = bookmarkWords.concat(cleanWords(bookmark.title));
        if (bookmark.description) { bookmarkWords = bookmarkWords.concat(cleanWords(bookmark.description)); }
        if (bookmark.tags) { bookmarkWords = bookmarkWords.concat(cleanWords(bookmark.tags.join(' '))); }

        // Get match scores for each keyword against bookmark words
        var scores = _.map(keywords, function (keyword) {
          var count = 0;

          // Match words that begin with keyword
          _.each(bookmarkWords, function (bookmarkWord) {
            if (bookmarkWord && bookmarkWord.toLowerCase().indexOf(keyword.toLowerCase()) === 0) { count++; }
          });

          return count;
        });

        // Check all keywords match
        if (_.isUndefined(_.find(scores, function (score) { return score === 0; }))) {
          // Calculate score
          var score = _.reduce(scores, function (memo, num) { return memo + num; }, 0);

          // Add result
          var result = _.clone(bookmark);
          result.score = score;
          results.push(result);
        }
      }
    });

    return results;
  };

  var searchBookmarksByUrl = function (bookmarksToSearch, url, results) {
    if (!results) {
      results = [];
    }

    results = results.concat(_.filter(bookmarksToSearch, function (bookmark) {
      if (!bookmark.url) {
        return false;
      }

      return bookmark.url.toLowerCase().indexOf(url.toLowerCase()) >= 0;
    }));

    for (var i = 0; i < bookmarksToSearch.length; i++) {
      if (bookmarksToSearch[i].children && bookmarksToSearch[i].children.length > 0) {
        results = searchBookmarksByUrl(bookmarksToSearch[i].children, url, results);
      }
    }

    return results;
  };

  var searchBookmarksForLookaheads = function (bookmarksToSearch, word, tagsOnly, results) {
    if (!results) {
      results = [];
    }

    _.each(bookmarksToSearch, function (bookmark) {
      if (!bookmark.url) {
        results = searchBookmarksForLookaheads(bookmark.children, word, tagsOnly, results);
      }
      else {
        var bookmarkWords = [];

        if (!tagsOnly) {
          if (bookmark.title) {
            // Add all words from title
            bookmarkWords = bookmarkWords.concat(_.compact(bookmark.title.replace("'", '').toLowerCase().split(/[\W_]/)));
          }

          // Split tags into individual words
          if (bookmark.tags) {
            var tags = _.chain(bookmark.tags)
              .map(function (tag) {
                return tag.toLowerCase().split(/\s/);
              })
              .flatten()
              .compact()
              .value();

            bookmarkWords = bookmarkWords.concat(tags);
          }

          // Add url host
          var hostMatch = bookmark.url.toLowerCase().match(/^(https?:\/\/)?(www\.)?([^\/]+)/);
          if (hostMatch) {
            bookmarkWords.push(hostMatch[0]);
            bookmarkWords.push(hostMatch[2] ? hostMatch[2] + hostMatch[3] : hostMatch[3]);
            if (hostMatch[2]) {
              bookmarkWords.push(hostMatch[3]);
            }
          }
        }
        else {
          if (bookmark.tags) {
            bookmarkWords = bookmarkWords.concat(_.compact(bookmark.tags));
          }
        }

        // Remove words of two chars or less
        bookmarkWords = _.filter(bookmarkWords, function (item) { return item.length > 2; });

        // Find all words that begin with lookahead word
        results = results.concat(_.filter(bookmarkWords, function (bookmark) { return bookmark.indexOf(word) === 0; }));
      }
    });

    return results;
  };

  var setIsSyncing = function (syncType) {
    // Refresh interface with current sync type
    if (syncType != null) {
      return platform.Interface.Refresh(null, syncType);
    }

    // Get cached sync enabled value and refresh interface
    return platform.LocalStorage.Get(globals.CacheKeys.SyncEnabled)
      .then(platform.Interface.Refresh);
  };

  var sync_handleBoth = function (syncData, backgroundUpdate) {
    var getBookmarksToSync, updateLocalBookmarksInfo;

    if (syncData.bookmarks) {
      // Sync with provided bookmarks
      getBookmarksToSync = $q.resolve(syncData.bookmarks || []);
    }
    else {
      updateLocalBookmarksInfo = {
        type: syncData.changeInfo.type
      };

      // Process bookmark changes
      if (!syncData.changeInfo) {
        getBookmarksToSync = $q.reject({ code: globals.ErrorCodes.AmbiguousSyncRequest });
      }
      else {
        getBookmarksToSync = getCachedBookmarks()
          .then(function (bookmarks) {
            return processBookmarkChanges(bookmarks, syncData.changeInfo);
          })
          .then(function (results) {
            updateLocalBookmarksInfo.pathInfo = results.pathInfo;
            return results.bookmarks;
          });
      }
    }

    // Sync bookmarks
    return getBookmarksToSync
      .then(function (bookmarks) {
        // Encrypt bookmarks
        bookmarks = bookmarks || [];
        return utility.EncryptData(JSON.stringify(bookmarks))
          .then(function (encryptedBookmarks) {
            // Update local bookmarks
            return (syncData.command === globals.Commands.RestoreBookmarks ?
              refreshLocalBookmarks(bookmarks) :
              updateLocalBookmarks(updateLocalBookmarksInfo))
              .then(function () {
                // Commit update to service
                return api.UpdateBookmarks(encryptedBookmarks, null, backgroundUpdate)
                  .then(function (response) {
                    return platform.LocalStorage.Set(globals.CacheKeys.LastUpdated, response.lastUpdated);
                  })
                  .catch(function (err) {
                    // If offline update cache and then throw error
                    return (err.code === globals.ErrorCodes.NetworkOffline ?
                      updateCachedBookmarks(bookmarks, encryptedBookmarks) :
                      $q.resolve())
                      .then(function () {
                        // Save bookmarks with sync data to avoid reprocessing changes
                        syncData.bookmarks = bookmarks;
                        throw err;
                      });
                  });
              })
              .then(function () {
                return updateCachedBookmarks(bookmarks, encryptedBookmarks);
              });
          });
      });
  };

  var sync_handlePull = function (syncData) {
    var bookmarks, encryptedBookmarks, lastUpdated;

    if (syncData.bookmarks) {
      // Local import, update browser bookmarks
      return refreshLocalBookmarks(syncData.bookmarks);
    }

    return platform.LocalStorage.Get([
      globals.CacheKeys.Password,
      globals.CacheKeys.SyncId
    ])
      .then(function (cachedData) {
        var password = cachedData[globals.CacheKeys.Password];
        var syncId = cachedData[globals.CacheKeys.SyncId];

        // Check secret and bookmarks ID are present
        if (!password || !syncId) {
          return disableSync()
            .then(function () {
              return $q.reject({ code: globals.ErrorCodes.MissingClientData });
            });
        }

        // Get synced bookmarks
        return api.GetBookmarks();
      })
      .then(function (data) {
        encryptedBookmarks = data.bookmarks;
        lastUpdated = data.lastUpdated;

        // Decrypt bookmarks
        return utility.DecryptData(data.bookmarks);
      })
      .then(function (decryptedData) {
        // Update cached bookmarks
        bookmarks = JSON.parse(decryptedData);

        // Add new ids if bookmarks don't have unique ids
        return !checkBookmarksHaveUniqueIds(bookmarks) && platform.Bookmarks.AddIds(bookmarks)
          .then(function (bookmarksWithNewIds) {
            // Encrypt bookmarks with new ids
            bookmarks = bookmarksWithNewIds;
            return utility.EncryptData(JSON.stringify(bookmarks));
          })
          .then(function (encryptedBookmarksWithNewIds) {
            encryptedBookmarks = encryptedBookmarksWithNewIds;
          });
      })
      .then(function () {
        return updateCachedBookmarks(bookmarks, encryptedBookmarks);
      })
      .then(function () {
        // Update browser bookmarks
        return refreshLocalBookmarks(bookmarks);
      })
      .then(function () {
        // Update cached last updated date
        return platform.LocalStorage.Set(globals.CacheKeys.LastUpdated, lastUpdated);
      });
  };

  var sync_handlePush = function (syncData) {
    return platform.LocalStorage.Get([
      globals.CacheKeys.LastUpdated,
      globals.CacheKeys.Password,
      globals.CacheKeys.SyncEnabled,
      globals.CacheKeys.SyncId
    ])
      .then(function (cachedData) {
        var password = cachedData[globals.CacheKeys.Password];
        var syncEnabled = cachedData[globals.CacheKeys.SyncEnabled];
        var syncId = cachedData[globals.CacheKeys.SyncId];

        // Check for cached sync ID and password
        if (!password || !syncId) {
          return disableSync()
            .then(function () {
              return $q.reject({ code: globals.ErrorCodes.MissingClientData });
            });
        }

        var getBookmarks;
        if (!syncData.changeInfo) {
          // New sync, get local bookmarks
          getBookmarks = platform.Bookmarks.Get();
        }
        else {
          // Check sync is enabled
          if (!syncEnabled) {
            return $q.resolve();
          }

          // Get cached bookmarks
          getBookmarks = getCachedBookmarks()
            .then(function (bookmarks) {
              // Wait for change info
              return syncData.changeInfo
                .then(function (changeInfo) {
                  // Handle local updates
                  switch (changeInfo.type) {
                    // Create bookmark
                    case globals.UpdateType.Create:
                      return platform.Bookmarks.Created(bookmarks, changeInfo)
                        .then(function (results) {
                          return results.bookmarks;
                        });
                    // Delete bookmark
                    case globals.UpdateType.Delete:
                      return platform.Bookmarks.Deleted(bookmarks, changeInfo)
                        .then(function (results) {
                          return results.bookmarks;
                        });
                    // Update bookmark
                    case globals.UpdateType.Update:
                      return platform.Bookmarks.Updated(bookmarks, changeInfo)
                        .then(function (results) {
                          return results.bookmarks;
                        });
                    // Move bookmark
                    case globals.UpdateType.Move:
                      return platform.Bookmarks.Moved(bookmarks, changeInfo)
                        .then(function (results) {
                          return results.bookmarks;
                        });
                    // Ambiguous sync
                    default:
                      return $q.reject({ code: globals.ErrorCodes.AmbiguousSyncRequest });
                  }
                });
            });
        }

        // Push bookmarks
        return getBookmarks;
      })
      .then(function (bookmarks) {
        // Encrypt bookmarks
        bookmarks = bookmarks || [];
        return utility.EncryptData(JSON.stringify(bookmarks))
          .then(function (encryptedBookmarks) {
            return $q.resolve()
              .then(function () {
                // Commit update to service
                return api.UpdateBookmarks(encryptedBookmarks)
                  .then(function (response) {
                    return platform.LocalStorage.Set(globals.CacheKeys.LastUpdated, response.lastUpdated);
                  })
                  .catch(function (err) {
                    // If offline update cache and then throw error
                    return (err.code === globals.ErrorCodes.NetworkOffline ?
                      updateCachedBookmarks(bookmarks, encryptedBookmarks) :
                      $q.resolve())
                      .then(function () {
                        throw err;
                      });
                  });
              })
              .then(function () {
                return updateCachedBookmarks(bookmarks, encryptedBookmarks);
              });
          });
      });
  };

  var sync_handleUpgrade = function (syncData) {
    var password, syncId;

    return platform.LocalStorage.Get([
      globals.CacheKeys.Password,
      globals.CacheKeys.SyncId
    ])
      .then(function (cachedData) {
        password = cachedData[globals.CacheKeys.Password];
        syncId = cachedData[globals.CacheKeys.SyncId];

        // Check secret and sync ID are present
        if (!password || !syncId) {
          return disableSync()
            .then(function () {
              return $q.reject({ code: globals.ErrorCodes.MissingClientData });
            });
        }

        // Get synced bookmarks and decrypt
        return api.GetBookmarks();
      })
      .then(function (data) {
        // Decrypt bookmarks
        return utility.DecryptData(data.bookmarks);
      })
      .then(function (decryptedData) {
        var bookmarks = decryptedData ? JSON.parse(decryptedData) : null;

        // Upgrade containers to use current container names
        bookmarks = upgradeContainers(bookmarks || []);

        // Set the sync version to the current app version
        return platform.LocalStorage.Set(globals.CacheKeys.SyncVersion, globals.AppVersion)
          .then(function () {
            // Generate a new password hash from the old clear text password and sync ID
            return utility.GetPasswordHash(password, syncId);
          })
          .then(function (passwordHash) {
            // Cache the new password hash and encrypt the data
            return platform.LocalStorage.Set(globals.CacheKeys.Password, passwordHash);
          })
          .then(function () {
            return utility.EncryptData(JSON.stringify(bookmarks));
          })
          .then(function (encryptedBookmarks) {
            // Sync provided bookmarks and set local bookmarks
            return $q.all([
              api.UpdateBookmarks(encryptedBookmarks, true),
              refreshLocalBookmarks(bookmarks)
            ])
              .then(function (data) {
                // Update cached last updated date and return decrypted bookmarks
                return $q.all([
                  updateCachedBookmarks(bookmarks, encryptedBookmarks),
                  platform.LocalStorage.Set(globals.CacheKeys.LastUpdated, data[0].lastUpdated)
                ]);
              });
          });
      });
  };

  var updateCachedBookmarks = function (unencryptedBookmarks, encryptedBookmarks) {
    if (encryptedBookmarks !== undefined) {
      // Update storage cache with new encrypted bookmarks
      return platform.LocalStorage.Set(globals.CacheKeys.Bookmarks, encryptedBookmarks)
        .then(function () {
          // Update memory cached bookmarks
          cachedBookmarks_encrypted = encryptedBookmarks;
          if (unencryptedBookmarks !== undefined) {
            cachedBookmarks_plain = unencryptedBookmarks;
          }

          return unencryptedBookmarks;
        });
    }

    return $q.resolve(unencryptedBookmarks);
  };

  var updateLocalBookmarks = function (changeInfo) {
    // Check if change is in toolbar and is syncing toolbar
    return (!changeInfo ? $q.resolve(false) :
      changeInfo.pathInfo.path[1].bookmark.title === globals.Bookmarks.ToolbarContainerName ?
        getSyncBookmarksToolbar() : $q.resolve(true))
      .then(function (doLocalUpdate) {
        if (!doLocalUpdate) {
          return;
        }

        switch (changeInfo.type) {
          // Create new local bookmark
          case globals.UpdateType.Create:
            return platform.Bookmarks.CreateSingle(changeInfo.pathInfo.result, changeInfo.pathInfo.path);
          // Update existing local bookmark
          case globals.UpdateType.Update:
            return platform.Bookmarks.UpdateSingle(changeInfo.pathInfo.result, changeInfo.pathInfo.path);
          // Delete existing local bookmark
          case globals.UpdateType.Delete:
            return platform.Bookmarks.DeleteSingle(changeInfo.pathInfo.path);
          // Ambiguous sync
          case !changeInfo:
          default:
            return $q.reject({ code: globals.ErrorCodes.AmbiguousSyncRequest });
        }
      });
  };

  var upgradeContainers = function (bookmarks) {
    // Upgrade containers to use current container names
    var otherContainer = getContainer(globals.Bookmarks.OtherContainerNameOld, bookmarks);
    if (otherContainer) {
      otherContainer.title = globals.Bookmarks.OtherContainerName;
    }

    var toolbarContainer = getContainer(globals.Bookmarks.ToolbarContainerNameOld, bookmarks);
    if (toolbarContainer) {
      toolbarContainer.title = globals.Bookmarks.ToolbarContainerName;
    }

    var xbsContainerIndex = _.findIndex(bookmarks, function (x) {
      return x.title === globals.Bookmarks.UnfiledContainerNameOld;
    });
    if (xbsContainerIndex >= 0) {
      var xbsContainer = bookmarks.splice(xbsContainerIndex, 1)[0];
      xbsContainer.title = 'Legacy xBrowserSync bookmarks';
      otherContainer.children = otherContainer.children || [];
      otherContainer.children.splice(0, 0, xbsContainer);
    }

    return bookmarks;
  };

  return {
    AddNewInXBookmarks: addNewInXBookmarks,
    CheckBookmarksHaveUniqueIds: checkBookmarksHaveUniqueIds,
    CheckIfRefreshSyncedDataOnError: checkIfRefreshSyncedDataOnError,
    CheckForUpdates: checkForUpdates,
    CleanBookmark: cleanBookmark,
    DisableSync: disableSync,
    Each: eachBookmark,
    Export: exportBookmarks,
    FindBookmarkById: findBookmarkById,
    FindBookmarkInTree: findBookmarkInTree,
    FindCurrentUrlInBookmarks: findCurrentUrlInBookmarks,
    GetBookmarks: getCachedBookmarks,
    GetContainer: getContainer,
    GetCurrentSync: getCurrentSync,
    GetExistingInXBookmarks: getExistingInXBookmarks,
    GetLookahead: getLookahead,
    GetNewBookmarkId: getNewBookmarkId,
    GetSyncBookmarksToolbar: getSyncBookmarksToolbar,
    IsSeparator: isSeparator,
    QueueSync: queueSync,
    RemoveExistingInXBookmarks: removeExistingInXBookmarks,
    Search: searchBookmarks,
    Sync: executeSync,
    SyncSize: getSyncSize,
    UpdateExistingInXBookmarks: updateExistingInXBookmarks,
    UpgradeContainers: upgradeContainers,
    XBookmark: xBookmark,
    XBookmarkIsContainer: xBookmarkIsContainer,
    XSeparator: xSeparator,
  };
};