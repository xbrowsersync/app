var xBrowserSync = xBrowserSync || {};
xBrowserSync.App = xBrowserSync.App || {};

/* ------------------------------------------------------------------------------------
 * Class name:	xBrowserSync.App.Bookmarks
 * Description:	Responsible for handling bookmark data.
 * ------------------------------------------------------------------------------------ */

xBrowserSync.App.Bookmarks = function ($q, $timeout, api, globals, platform, store, utility) {
  'use strict';

  var cachedBookmarks_encrypted, cachedBookmarks_plain, currentSync, syncQueue = [];

  /* ------------------------------------------------------------------------------------
   * Public functions
   * ------------------------------------------------------------------------------------ */

  var addBookmark = function (newBookmarkInfo, bookmarks) {
    var updatedBookmarks = angular.copy(bookmarks);
    var parent = findBookmarkById(updatedBookmarks, newBookmarkInfo.parentId);
    if (!parent) {
      return $q.reject({ code: globals.ErrorCodes.XBookmarkNotFound });
    }

    // Create new bookmark/separator
    var bookmark = isSeparator(newBookmarkInfo) ? new xSeparator() :
      new xBookmark(
        newBookmarkInfo.title,
        newBookmarkInfo.url || null,
        newBookmarkInfo.description,
        newBookmarkInfo.tags,
        newBookmarkInfo.children);

    // Use id if supplied or create new id
    bookmark.id = newBookmarkInfo.id || getNewBookmarkId(updatedBookmarks);

    // Clean bookmark and add at index or last index in path
    var cleanedBookmark = cleanBookmark(bookmark);
    parent.children.splice(newBookmarkInfo.index, 0, cleanedBookmark);

    return $q.resolve({
      bookmark: cleanedBookmark,
      bookmarks: updatedBookmarks
    });
  };

  var checkIfRefreshSyncedDataOnError = function (err) {
    return err && (
      err.code === globals.ErrorCodes.BookmarkMappingNotFound ||
      err.code === globals.ErrorCodes.ContainerChanged ||
      err.code === globals.ErrorCodes.DataOutOfSync ||
      err.code === globals.ErrorCodes.FailedCreateLocalBookmarks ||
      err.code === globals.ErrorCodes.FailedGetLocalBookmarks ||
      err.code === globals.ErrorCodes.FailedRemoveLocalBookmarks ||
      err.code === globals.ErrorCodes.LocalBookmarkNotFound ||
      err.code === globals.ErrorCodes.XBookmarkNotFound);
  };

  var checkForUpdates = function () {
    return store.Get(globals.CacheKeys.LastUpdated)
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
    var copy = angular.copy(originalBookmark);

    // Remove empty properties, except for children array
    var cleanedBookmark = _.pick(copy, function (value, key) {
      return _.isArray(value) && key !== 'children' || _.isString(value) ? value.length > 0 : value != null;
    });

    return cleanedBookmark;
  };

  var convertLocalBookmarkToXBookmark = function (localBookmark, xBookmarks, takenIds) {
    takenIds = takenIds || [];

    if (!localBookmark) {
      return null;
    }

    var bookmark;
    if (isSeparator(localBookmark)) {
      bookmark = new xSeparator();
    }
    else {
      bookmark = new xBookmark(localBookmark.title, localBookmark.url);
    }

    // Assign a unique id
    bookmark.id = getNewBookmarkId(xBookmarks, takenIds);
    takenIds.push(bookmark.id);

    // Process children if any
    if (localBookmark.children && localBookmark.children.length > 0) {
      bookmark.children = localBookmark.children.map(function (childBookmark) {
        return convertLocalBookmarkToXBookmark(childBookmark, xBookmarks, takenIds);
      });
    }

    return bookmark;
  };

  var disableSync = function () {
    return store.Get(globals.CacheKeys.SyncEnabled)
      .then(function (syncEnabled) {
        if (!syncEnabled) {
          return;
        }

        // Disable event listeners and checking for sync updates
        platform.EventListeners.Disable();
        platform.AutomaticUpdates.Stop();

        // Clear sync queue
        syncQueue = [];

        // Reset syncing flag
        setIsSyncing();

        // Clear cached sync data
        return $q.all([
          store.Remove(globals.CacheKeys.BookmarkIdMappings),
          store.Remove(globals.CacheKeys.Bookmarks),
          store.Remove(globals.CacheKeys.Password),
          store.Remove(globals.CacheKeys.SyncVersion),
          store.Set(globals.CacheKeys.SyncEnabled, false),
          updateCachedBookmarks(null, null)
        ])
          .then(function () {
            // Update browser action icon
            platform.Interface.Refresh();
            utility.LogInfo('Sync disabled');
          });
      });
  };

  var eachBookmark = function (bookmarks, iteratee, untilCondition) {
    untilCondition = untilCondition === undefined ? false : untilCondition;
    // Run the iteratee function for every bookmark until the condition is met
    (function iterateBookmarks(bookmarksToIterate) {
      for (var i = 0; i < bookmarksToIterate.length; i++) {
        if (untilCondition) {
          return;
        }
        iteratee(bookmarksToIterate[i]);
        if (bookmarksToIterate[i].children && bookmarksToIterate[i].children.length > 0) {
          iterateBookmarks(bookmarksToIterate[i].children);
        }
      }
    })(bookmarks);
  };

  var enableSync = function () {
    return $q.all([
      store.Set(globals.CacheKeys.SyncEnabled, true),
      platform.EventListeners.Enable(),
      platform.AutomaticUpdates.Start()
    ]);
  };

  var executeSync = function (isBackgroundSync) {
    // Check if sync enabled before running sync
    return store.Get(globals.CacheKeys.SyncEnabled)
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

    return store.Get(globals.CacheKeys.SyncEnabled)
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
    var bookmark;
    var index = bookmarks.findIndex(function (x) { return x.id === id; });
    if (index === -1) {
      _.each(bookmarks, function (x) {
        if (!bookmark) {
          bookmark = findBookmarkById(x.children, id);
        }
      });
    }
    else {
      bookmark = bookmarks[index];
      // Set index as bookmark indexes in Firefox are unreliable!
      // https://bugzilla.mozilla.org/show_bug.cgi?id=1556427
      if (bookmark.index != null) {
        bookmark.index = index;
      }
    }

    return bookmark;
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

  var getBookmarkTitleForDisplay = function (bookmark) {
    // If normal bookmark, return title or if blank url to display
    if (bookmark.url) {
      return bookmark.title ? bookmark.title : bookmark.url.replace(/^https?:\/\//i, '');
    }

    // Otherwise bookmark is a folder, return title if not a container
    if (!xBookmarkIsContainer(bookmark)) {
      return bookmark.title;
    }

    var containerTitle = undefined + '';

    switch (bookmark.title) {
      case globals.Bookmarks.MenuContainerName:
        containerTitle = platform.GetConstant(globals.Constants.Bookmarks_Container_Menu_Title);
        break;
      case globals.Bookmarks.MobileContainerName:
        containerTitle = platform.GetConstant(globals.Constants.Bookmarks_Container_Mobile_Title);
        break;
      case globals.Bookmarks.OtherContainerName:
        containerTitle = platform.GetConstant(globals.Constants.Bookmarks_Container_Other_Title);
        break;
      case globals.Bookmarks.ToolbarContainerName:
        containerTitle = platform.GetConstant(globals.Constants.Bookmarks_Container_Toolbar_Title);
        break;
    }

    return containerTitle;
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

  var getContainerByBookmarkId = function (id, bookmarks) {
    // Check if the id corresponds to a container
    var bookmark = findBookmarkById(bookmarks, id);
    if (xBookmarkIsContainer(bookmark)) {
      return bookmark;
    }

    // Search through the child bookmarks of each container to find the bookmark
    var container;
    bookmarks.forEach(function (x) {
      eachBookmark(x.children, function (child) {
        if (child.id === id) {
          container = x;
        }
      }, container != null);
    });
    return container;
  };

  var getCurrentSync = function () {
    // If nothing on the queue, get the current sync in progress if exists, otherwise get the last
    // sync in the queue
    return syncQueue.length === 0 ? currentSync : syncQueue[syncQueue.length - 1];
  };

  var getIdsFromDescendants = function (bookmark) {
    var ids = [];
    if (!bookmark.children || bookmark.children.length === 0) {
      return ids;
    }

    eachBookmark(bookmark.children, function (child) {
      ids.push(child.id);
    });
    return ids;
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

    return parseInt(highestId) + 1;
  };

  var getSyncBookmarksToolbar = function () {
    // Get setting from local storage
    return store.Get(globals.CacheKeys.SyncBookmarksToolbar)
      .then(function (syncBookmarksToolbar) {
        // Set default value to true
        if (syncBookmarksToolbar == null) {
          syncBookmarksToolbar = true;
        }

        return syncBookmarksToolbar;
      });
  };

  var getSyncQueueLength = function () {
    return syncQueue.length;
  };

  var getSyncSize = function () {
    return getCachedBookmarks()
      .then(function () {
        return store.Get(globals.CacheKeys.Bookmarks);
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

    return $q(function (resolve, reject) {
      store.Get(globals.CacheKeys.SyncEnabled)
        .then(function (syncEnabled) {
          // If new sync ensure sync queue is clear
          if (!syncEnabled) {
            syncQueue = [];
          }

          var queuedSync;
          if (syncToQueue) {
            // If sync is type cancel, clear queue first
            if (syncToQueue.type === globals.SyncType.Cancel) {
              syncQueue = [];
            }

            // Add sync to queue
            queuedSync = $q.defer();
            syncToQueue.deferred = queuedSync;
            syncToQueue.uniqueId = syncToQueue.uniqueId || utility.GetUniqueishId();
            syncQueue.push(syncToQueue);

            var syncType = _.findKey(globals.SyncType, function (key) { return key === syncToQueue.type; });
            utility.LogInfo('Sync ' + syncToQueue.uniqueId + ' (' + syncType.toLowerCase() + ') queued');
          }

          // Prepare sync promises to return and check if should also run sync
          var promises = [queuedSync.promise];
          if (runSync) {
            var syncedPromise = $q(function (syncedResolve, syncedReject) {
              $timeout(function () {
                processSyncQueue()
                  .then(syncedResolve)
                  .catch(syncedReject);
              });
            });
            promises.push(syncedPromise);
          }

          return $q.all(promises).then(function () {
            resolve();
          });
        })
        .catch(reject);
    });
  };

  var removeBookmarkById = function (id, bookmarks) {
    return $q(function (resolve, reject) {
      try {
        var updatedBookmarks = recursiveDelete(bookmarks, id);
        resolve(updatedBookmarks);
      }
      catch (err) {
        reject(err);
      }
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

  var updateBookmarkById = function (id, updateInfo, bookmarks) {
    var updatedBookmarks = angular.copy(bookmarks);
    var bookmarkToUpdate = findBookmarkById(updatedBookmarks, id);
    if (!bookmarkToUpdate) {
      return $q.reject({ code: globals.ErrorCodes.XBookmarkNotFound });
    }

    bookmarkToUpdate.title = updateInfo.title !== undefined ? updateInfo.title : bookmarkToUpdate.title;

    // Update url accounting for unsupported urls
    if (updateInfo.url !== undefined &&
      updateInfo.url !== bookmarkToUpdate.url &&
      (updateInfo.url !== platform.GetNewTabUrl() ||
        (updateInfo.url === platform.GetNewTabUrl() &&
          bookmarkToUpdate.url === platform.GetSupportedUrl(bookmarkToUpdate.url)))) {
      bookmarkToUpdate.url = updateInfo.url;
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

    // Clean bookmark and return updated bookmarks
    var cleanedBookmark = cleanBookmark(bookmarkToUpdate);
    angular.copy(cleanedBookmark, bookmarkToUpdate);
    return $q.resolve(updatedBookmarks);
  };

  var validateBookmarkIds = function (bookmarks) {
    if (!bookmarks || bookmarks.length === 0) {
      return true;
    }

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

    // Find a bookmark with a non-numeric id
    var invalidId = allBookmarks.find(function (bookmark) {
      return typeof bookmark.id !== 'number';
    });

    if (!_.isUndefined(invalidId)) {
      utility.LogWarning('Invalid bookmark id detected: ' + invalidId.id + ' (' + invalidId.url + ')');
      return false;
    }

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

  var getCachedBookmarks = function () {
    // Get cached encrypted bookmarks from local storage
    return store.Get(globals.CacheKeys.Bookmarks)
      .then(function (cachedData) {
        var cachedEncryptedBookmarks = cachedData;

        // Return unencrypted cached bookmarks from memory if encrypted bookmarks
        // in storage match cached encrypted bookmarks in memory
        if (cachedEncryptedBookmarks && cachedBookmarks_encrypted && cachedEncryptedBookmarks === cachedBookmarks_encrypted) {
          return angular.copy(cachedBookmarks_plain);
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
    // Update browser action icon
    platform.Interface.Refresh();

    // If offline and sync is a change, swallow error and place failed sync back on the queue
    if (err.code === globals.ErrorCodes.NetworkOffline && failedSync.type !== globals.SyncType.Pull) {
      failedSync.changeInfo = $q.resolve();
      syncQueue.unshift(failedSync);
      utility.LogInfo('Sync ' + failedSync.uniqueId + ' not committed: network offline (' + syncQueue.length + ' queued)');
      return $q.reject({ code: globals.ErrorCodes.SyncUncommitted });
    }

    // Otherwise handle failed sync
    utility.LogInfo('Sync ' + failedSync.uniqueId + ' failed');
    utility.LogError(err, 'bookmarks.sync');
    if (failedSync.changeInfo && failedSync.changeInfo.type) {
      utility.LogInfo(failedSync.changeInfo);
    }

    return store.Get(globals.CacheKeys.SyncEnabled)
      .then(function (syncEnabled) {
        return setIsSyncing()
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
              store.Set(globals.CacheKeys.LastUpdated, lastUpdated);
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
    var returnInfo = {};

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
        returnInfo.bookmark = newBookmark;
        returnInfo.container = otherContainer.title;
        break;
      // Update bookmark
      case globals.UpdateType.Update:
        returnInfo.container = getContainerByBookmarkId(changeInfo.bookmark.id, bookmarks).title;
        bookmarks = recursiveUpdate(bookmarks, changeInfo.bookmark);
        returnInfo.bookmark = changeInfo.bookmark;
        break;
      // Delete bookmark
      case globals.UpdateType.Delete:
        returnInfo.container = getContainerByBookmarkId(changeInfo.id, bookmarks).title;
        recursiveDelete(bookmarks, changeInfo.id);
        returnInfo.bookmark = {
          id: changeInfo.id
        };
        break;
    }

    returnInfo.bookmarks = bookmarks;
    return returnInfo;
  };

  var processSyncQueue = function (isBackgroundSync) {
    var syncEnabled, updateRemote = false;

    // If a sync is in progress, retry later
    if (currentSync || syncQueue.length === 0) {
      return $q.resolve();
    }

    var doActionUntil = function () {
      return $q.resolve(syncQueue.length === 0);
    };

    var action = function () {
      // Get first sync in the queue
      currentSync = syncQueue.shift();
      utility.LogInfo('Processing sync ' + currentSync.uniqueId + (isBackgroundSync ? ' in background' : '') + ' (' + syncQueue.length + ' in queue)');

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
            // Cancel current sync process
            case globals.SyncType.Cancel:
              return sync_handleCancel(currentSync);
            // Upgrade sync to current version
            case globals.SyncType.Upgrade:
              return sync_handleUpgrade(currentSync);
            // Ambiguous sync
            default:
              return $q.reject({ code: globals.ErrorCodes.AmbiguousSyncRequest });
          }
        })
        .then(function (syncChange) {
          syncChange = syncChange === undefined ? true : syncChange;
          return store.Get(globals.CacheKeys.SyncEnabled)
            .then(function (cachedSyncEnabled) {
              syncEnabled = cachedSyncEnabled;

              // If syncing for the first time or re-syncing, set sync as enabled
              if (!syncEnabled && currentSync.command !== globals.Commands.RestoreBookmarks && currentSync.type !== globals.SyncType.Cancel) {
                return enableSync()
                  .then(function () {
                    utility.LogInfo('Sync enabled');
                  });
              }
            })
            .then(function () {
              // Resolve the current sync's promise
              currentSync.deferred.resolve();

              // Set flag if remote bookmarks data should be updated
              if (!syncChange || currentSync.type === globals.SyncType.Cancel) {
                updateRemote = false;
              }
              else if (currentSync.type !== globals.SyncType.Pull) {
                updateRemote = true;
              }

              // Reset syncing flag
              return setIsSyncing();
            })
            .then(function () {
              // Return true to indicate sync succeeded
              return true;
            });
        })
        .catch(function (err) {
          // Clear update flag if local data will be refreshed 
          if (checkIfRefreshSyncedDataOnError(err)) {
            updateRemote = false;
          }
          return handleFailedSync(currentSync, err)
            .then(function () {
              // Return false to indicate sync failed
              return false;
            });
        });
    };

    // Disable automatic updates whilst processing syncs
    return store.Get(globals.CacheKeys.SyncEnabled)
      .then(function (cachedSyncEnabled) {
        if (cachedSyncEnabled) {
          return platform.AutomaticUpdates.Stop();
        }
      })
      .then(function () {
        return utility.PromiseWhile(syncQueue, doActionUntil, action);
      })
      .then(function (syncsProcessedSuccessfully) {
        if (!syncsProcessedSuccessfully) {
          // Return false to indicate sync failed
          return false;
        }

        if (!updateRemote) {
          // Return false to indicate sync succeeded
          return true;
        }

        // Update remote bookmarks data
        return store.Get(globals.CacheKeys.Bookmarks)
          .then(function (encryptedBookmarks) {
            // Decrypt cached bookmarks data
            return utility.DecryptData(encryptedBookmarks)
              .then(function (bookmarksJson) {
                // Commit update to service
                return api.UpdateBookmarks(encryptedBookmarks)
                  .then(function (response) {
                    return store.Set(globals.CacheKeys.LastUpdated, response.lastUpdated)
                      .then(function () {
                        utility.LogInfo('Remote bookmarks data updated at ' + response.lastUpdated);
                      });
                  })
                  .catch(function (err) {
                    // If offline update cache and then throw error
                    if (err.code === globals.ErrorCodes.NetworkOffline) {
                      utility.LogInfo('Couldn’t update remote bookmarks data');
                      var bookmarks = JSON.parse(bookmarksJson);
                      return updateCachedBookmarks(bookmarks, encryptedBookmarks)
                        .then(function () {
                          currentSync.bookmarks = bookmarks;
                          return handleFailedSync(currentSync, err);
                        })
                        .then(function () {
                          // Return false to indicate sync failed
                          return false;
                        });
                    }

                    throw err;
                  });
              });
          })
          .then(function () {
            // Return false to indicate sync succeeded
            return true;
          });
      })
      .finally(function () {
        // Clear current sync
        currentSync = null;

        // Start auto updates if sync enabled
        return store.Get(globals.CacheKeys.SyncEnabled)
          .then(function (cachedSyncEnabled) {
            if (cachedSyncEnabled) {
              return platform.AutomaticUpdates.Start();
            }
          });
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

  var repairBookmarkIds = function (bookmarks) {
    var allBookmarks = [];
    var idCounter = 1;

    // Get all local bookmarks into flat array
    eachBookmark(bookmarks, function (bookmark) {
      allBookmarks.push(bookmark);
    });

    // Remove any invalid ids
    allBookmarks.forEach(function (bookmark) {
      if (typeof bookmark.id !== 'number') {
        delete bookmark.id;
      }
    });

    // Sort by id asc
    allBookmarks = allBookmarks.sort(function (x, y) {
      return x.id - y.id;
    });

    // Re-add ids
    allBookmarks.forEach(function (bookmark) {
      bookmark.id = idCounter;
      idCounter++;
    });

    return bookmarks;
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
    // Update browser action icon with current sync type
    if (syncType != null) {
      return platform.Interface.Refresh(null, syncType);
    }

    // Get cached sync enabled value and update browser action icon
    return store.Get(globals.CacheKeys.SyncEnabled)
      .then(platform.Interface.Refresh);
  };

  var sync_handleBoth = function (syncData, backgroundUpdate) {
    var getBookmarksToSync, updateLocalBookmarksInfo;

    // changeInfo can be an object or a promise
    return $q.resolve(syncData.changeInfo)
      .then(function (changeInfo) {
        if (syncData.bookmarks) {
          // Sync with provided bookmarks, validate bookmark ids
          getBookmarksToSync = $q(function (resolve) {
            if (validateBookmarkIds(syncData.bookmarks)) {
              resolve(syncData.bookmarks);
            }
            else {
              var repairedBookmarks = repairBookmarkIds(syncData.bookmarks);
              resolve(repairedBookmarks);
            }
          });
        }
        else {
          updateLocalBookmarksInfo = {
            type: changeInfo.type
          };

          // Process bookmark changes
          if (!changeInfo) {
            getBookmarksToSync = $q.reject({ code: globals.ErrorCodes.AmbiguousSyncRequest });
          }
          else {
            getBookmarksToSync = getCachedBookmarks()
              .then(function (bookmarks) {
                return processBookmarkChanges(bookmarks, changeInfo);
              })
              .then(function (results) {
                updateLocalBookmarksInfo.bookmark = results.bookmark;
                updateLocalBookmarksInfo.bookmarks = results.bookmarks;
                updateLocalBookmarksInfo.container = results.container;
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
                return $q(function (resolve, reject) {
                  platform.EventListeners.Disable()
                    .then(function () {
                      return (syncData.command === globals.Commands.RestoreBookmarks ?
                        refreshLocalBookmarks(bookmarks) :
                        updateLocalBookmarks(updateLocalBookmarksInfo));
                    })
                    .then(resolve)
                    .catch(reject)
                    .finally(platform.EventListeners.Enable);
                })
                  .then(function () {
                    // Update bookmarks cache
                    return updateCachedBookmarks(bookmarks, encryptedBookmarks)
                      .then(function (cachedBookmarks) {
                        // Build id mappings if this was a restore
                        if (syncData.command !== globals.Commands.RestoreBookmarks) {
                          return;
                        }
                        return platform.Bookmarks.BuildIdMappings(cachedBookmarks);
                      });
                  });
              });
          });
      });
  };

  var sync_handleCancel = function (syncData) {
    return disableSync();
  };

  var sync_handlePull = function (syncData) {
    var bookmarks, encryptedBookmarks, lastUpdated;

    if (syncData.bookmarks) {
      // Local import, update browser bookmarks
      return refreshLocalBookmarks(syncData.bookmarks);
    }

    return store.Get([
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

        // Check bookmark ids are all valid
        if (!validateBookmarkIds(bookmarks)) {
          bookmarks = repairBookmarkIds(bookmarks);

          // Encrypt bookmarks with new ids
          return utility.EncryptData(JSON.stringify(bookmarks))
            .then(function (encryptedBookmarksWithNewIds) {
              encryptedBookmarks = encryptedBookmarksWithNewIds;
            });
        }
      })
      .then(function () {
        return updateCachedBookmarks(bookmarks, encryptedBookmarks);
      })
      .then(function (cachedBookmarks) {
        // Update browser bookmarks
        return platform.EventListeners.Disable()
          .then(function () {
            return refreshLocalBookmarks(cachedBookmarks);
          })
          .then(function () {
            return platform.Bookmarks.BuildIdMappings(cachedBookmarks);
          })
          .finally(platform.EventListeners.Enable);
      })
      .then(function () {
        // Update cached last updated date
        return store.Set(globals.CacheKeys.LastUpdated, lastUpdated);
      });
  };

  var sync_handlePush = function (syncData) {
    return store.Get([
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

        // If this is a new sync, get local bookmarks and continue
        if (!syncEnabled || !syncData.changeInfo) {
          return platform.Bookmarks.Get();
        }

        // Otherwose get cached bookmarks and process changes
        return getCachedBookmarks()
          .then(function (bookmarks) {
            if (!syncData.changeInfo) {
              // Nothing to process
              utility.LogInfo('No change to process');
              return;
            }

            // Update bookmarks data with local changes
            switch (syncData.changeInfo.type) {
              // Create bookmark
              case globals.UpdateType.Create:
                return platform.Bookmarks.Created(bookmarks, syncData.changeInfo.bookmark);
              // Delete bookmark
              case globals.UpdateType.Delete:
                return platform.Bookmarks.Deleted(bookmarks, syncData.changeInfo.bookmark);
              // Update bookmark
              case globals.UpdateType.Update:
                return platform.Bookmarks.Updated(bookmarks, syncData.changeInfo.bookmark);
              // Move bookmark
              case globals.UpdateType.Move:
                return platform.Bookmarks.Moved(bookmarks, syncData.changeInfo.bookmark);
              // Ambiguous sync
              default:
                return $q.reject({ code: globals.ErrorCodes.AmbiguousSyncRequest });
            }
          });
      })
      .then(function (bookmarks) {
        if (!bookmarks) {
          // Don't sync
          return false;
        }

        // Update local cached bookmarks
        return utility.EncryptData(JSON.stringify(bookmarks))
          .then(function (encryptedBookmarks) {
            return updateCachedBookmarks(bookmarks, encryptedBookmarks);
          })
          .then(function () {
            // Continue with sync
            return true;
          });
      });
  };

  var sync_handleUpgrade = function (syncData) {
    var password, syncId;

    return store.Get([
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
        return store.Set(globals.CacheKeys.SyncVersion, globals.AppVersion)
          .then(function () {
            // Generate a new password hash from the old clear text password and sync ID
            return utility.GetPasswordHash(password, syncId);
          })
          .then(function (passwordHash) {
            // Cache the new password hash and encrypt the data
            return store.Set(globals.CacheKeys.Password, passwordHash);
          })
          .then(function () {
            return utility.EncryptData(JSON.stringify(bookmarks));
          })
          .then(function (encryptedBookmarks) {
            // Sync provided bookmarks and set local bookmarks
            return $q.all([
              api.UpdateBookmarks(encryptedBookmarks, true),
              platform.EventListeners.Disable()
                .then(function () {
                  return refreshLocalBookmarks(bookmarks);
                })
                .then(function () {
                  return platform.Bookmarks.BuildIdMappings(bookmarks);
                })
                .finally(platform.EventListeners.Enable)
            ])
              .then(function (data) {
                // Update cached last updated date and return decrypted bookmarks
                return $q.all([
                  updateCachedBookmarks(bookmarks, encryptedBookmarks),
                  store.Set(globals.CacheKeys.LastUpdated, data[0].lastUpdated)
                ]);
              });
          });
      });
  };

  var updateCachedBookmarks = function (unencryptedBookmarks, encryptedBookmarks) {
    if (encryptedBookmarks !== undefined) {
      // Update storage cache with new encrypted bookmarks
      return store.Set(globals.CacheKeys.Bookmarks, encryptedBookmarks)
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

  var updateLocalBookmarks = function (updateInfo) {
    if (!updateInfo || !updateInfo.bookmark || !updateInfo.bookmarks || !updateInfo.container) {
      return $q.resolve(false);
    }

    // Check if change is in toolbar and is syncing toolbar
    return (updateInfo.container === globals.Bookmarks.ToolbarContainerName ? getSyncBookmarksToolbar() : $q.resolve(true))
      .then(function (doLocalUpdate) {
        if (!doLocalUpdate) {
          return;
        }

        switch (updateInfo.type) {
          // Create new local bookmark
          case globals.UpdateType.Create:
            return platform.Bookmarks.CreateSingle(updateInfo);
          // Update existing local bookmark
          case globals.UpdateType.Update:
            return platform.Bookmarks.UpdateSingle(updateInfo);
          // Delete existing local bookmark
          case globals.UpdateType.Delete:
            return platform.Bookmarks.DeleteSingle(updateInfo);
          // Ambiguous sync
          case !updateInfo:
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
    AddBookmark: addBookmark,
    CheckIfRefreshSyncedDataOnError: checkIfRefreshSyncedDataOnError,
    CheckForUpdates: checkForUpdates,
    CleanBookmark: cleanBookmark,
    ConvertLocalBookmarkToXBookmark: convertLocalBookmarkToXBookmark,
    DisableSync: disableSync,
    Each: eachBookmark,
    EnableSync: enableSync,
    Export: exportBookmarks,
    FindBookmarkById: findBookmarkById,
    FindCurrentUrlInBookmarks: findCurrentUrlInBookmarks,
    GetBookmarks: getCachedBookmarks,
    GetBookmarkTitleForDisplay: getBookmarkTitleForDisplay,
    GetContainer: getContainer,
    GetContainerByBookmarkId: getContainerByBookmarkId,
    GetCurrentSync: getCurrentSync,
    GetIdsFromDescendants: getIdsFromDescendants,
    GetLookahead: getLookahead,
    GetNewBookmarkId: getNewBookmarkId,
    GetSyncBookmarksToolbar: getSyncBookmarksToolbar,
    GetSyncQueueLength: getSyncQueueLength,
    IsSeparator: isSeparator,
    QueueSync: queueSync,
    RemoveBookmarkById: removeBookmarkById,
    Search: searchBookmarks,
    Sync: executeSync,
    SyncSize: getSyncSize,
    UpdateBookmarkById: updateBookmarkById,
    UpgradeContainers: upgradeContainers,
    XBookmark: xBookmark,
    XBookmarkIsContainer: xBookmarkIsContainer,
    XSeparator: xSeparator,
  };
};