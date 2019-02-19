var xBrowserSync = xBrowserSync || {};
xBrowserSync.App = xBrowserSync.App || {};

/* ------------------------------------------------------------------------------------
 * Class name:	xBrowserSync.App.Bookmarks
 * Description:	Responsible for handling bookmark data.
 * ------------------------------------------------------------------------------------ */

xBrowserSync.App.Bookmarks = function ($q, $timeout, platform, globals, api, utility) {
  'use strict';

  var currentSync, initialSyncFailedRetrySuccess = false, isSyncing = false, syncedBookmarks, syncQueue = [];

  /* ------------------------------------------------------------------------------------
   * Public functions
   * ------------------------------------------------------------------------------------ */

  var checkBookmarksHaveUniqueIds = function (bookmarks) {
    // Find any bookmark without an id
    var bookmarksHaveIds = true;
    self.Each(bookmarks, function (bookmark) {
      if (_.isUndefined(bookmark.id)) {
        bookmarksHaveIds = false;
      }
    });

    if (!bookmarksHaveIds) {
      return false;
    }

    // Get all local bookmarks into flat array
    var allBookmarks = [];
    self.Each(bookmarks, function (bookmark) {
      allBookmarks.push(bookmark);
    });

    // Find a bookmark with a duplicate id
    var duplicateIds = _.chain(allBookmarks)
      .countBy('id')
      .find(function (count) {
        return count > 1;
      }
      )
      .value();

    if (!_.isUndefined(duplicateIds)) {
      return false;
    }

    return true;
  };

  var checkForUpdates = function () {
    var cachedLastUpdated, syncEnabled;

    // Check if there are unsynced local updates
    if (syncQueue.length > 0) {
      return $q.resolve(true);
    }

    return platform.LocalStorage.Get([
      globals.CacheKeys.LastUpdated,
      globals.CacheKeys.SyncEnabled
    ])
      .then(function (cachedData) {
        syncEnabled = cachedData[globals.CacheKeys.SyncEnabled];

        // Get last updated date from local cache
        cachedLastUpdated = new Date(cachedData[globals.CacheKeys.LastUpdated]);

        // Check if bookmarks have been updated
        return api.GetBookmarksLastUpdated();
      })
      .then(function (data) {
        // If last updated is different the date in local storage, refresh bookmarks
        var remoteLastUpdated = new Date(data.lastUpdated);
        return !cachedLastUpdated || cachedLastUpdated.getTime() < remoteLastUpdated.getTime();
      })
      .catch(function (err) {
        // Check if sync should be disabled
        return checkIfDisableSync(syncEnabled, err)
          .then(function () {
            if (syncEnabled && err.code === globals.ErrorCodes.NoDataFound) {
              err.code = globals.ErrorCodes.SyncRemoved;
            }

            return $q.reject(err);
          });
      });
  };

  var disableSync = function () {
    // Disable checking for sync updates
    platform.AutomaticUpdates.Stop();

    // Clear sync queue
    syncQueue = [];

    // Reset syncing flag
    setIsSyncing(false);

    // Clear cached data
    return $q.all([
      platform.LocalStorage.Set(globals.CacheKeys.Bookmarks),
      platform.LocalStorage.Set(globals.CacheKeys.Password),
      platform.LocalStorage.Set(globals.CacheKeys.SyncEnabled, false),
      platform.LocalStorage.Set(globals.CacheKeys.SyncVersion)
    ])
      .then(function () {
        utility.LogInfo('Sync disabled.');

        // Refresh interface/icon
        $timeout(platform.Interface.Refresh);
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

  var exportBookmarks = function () {
    var syncEnabled, syncId;

    return platform.LocalStorage.Get([
      globals.CacheKeys.SyncEnabled,
      globals.CacheKeys.SyncId
    ])
      .then(function (cachedData) {
        syncEnabled = cachedData[globals.CacheKeys.SyncEnabled];
        syncId = cachedData[globals.CacheKeys.SyncId];

        // If sync is not enabled, export local browser data
        if (!syncEnabled) {
          return platform.Bookmarks.Get(false)
            .then(function (bookmarks) {
              var exportData = {
                xBrowserSync: {
                  bookmarks: bookmarks
                }
              };

              return exportData;
            });
        }
        else {
          // Otherwise, export synced data
          return api.GetBookmarks()
            .then(function (data) {
              // Decrypt bookmarks
              return utility.DecryptData(data.bookmarks);
            })
            .then(function (decryptedData) {
              var bookmarks = JSON.parse(decryptedData);

              var exportData = {
                xBrowserSync: {
                  id: syncId,
                  bookmarks: bookmarks
                }
              };

              return exportData;
            });
        }
      });
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
      };
      return {};
    }
  };

  var getCurrentSync = function () {
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

  var getLookahead = function (word, bookmarksToSearch, canceller, tagsOnly, exclusions) {
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
      getBookmarks = getCachedBookmarks(canceller);
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

  var getNewBookmarkId = function (bookmarks) {
    var highestId = 0;

    eachBookmark(bookmarks, function (bookmark) {
      if (!_.isUndefined(bookmark.id) && bookmark.id > highestId) {
        highestId = bookmark.id;
      }
    });

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

  var isCurrentPageABookmark = function () {
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

  var queueSync = function (syncData) {
    var deferred = $q.defer();

    platform.LocalStorage.Get(globals.CacheKeys.SyncEnabled)
      .then(function (syncEnabled) {
        // If new sync ensure sync queue is clear
        if (!syncEnabled) {
          syncQueue = [];
        }

        // Add sync to queue
        if (syncData) {
          syncData.deferred = deferred;
          syncData.uniqueId = syncData.uniqueId || (new Date()).getTime();
          syncQueue.push(syncData);
        }

        var syncType = _.findKey(globals.SyncType, function (key) { return key === syncData.type; });
        utility.LogInfo('Sync ' + syncData.uniqueId + ' (' + syncType.toLowerCase() + ') queued. ' + syncQueue.length + ' sync(s) queued.');

        // Trigger sync
        sync();
      });

    return deferred.promise;
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

  var updateCache = function (bookmarks, encryptedBookmarks) {
    if (bookmarks) {
      // Set cached decrypted bookmarks
      syncedBookmarks = bookmarks;
    }

    if (encryptedBookmarks) {
      // Updated cache with new encrypted bookmarks
      return platform.LocalStorage.Set(globals.CacheKeys.Bookmarks, encryptedBookmarks)
        .then(function () {
          return bookmarks;
        });
    }

    return $q.resolve(bookmarks);
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


  /* ------------------------------------------------------------------------------------
   * Private functions
   * ------------------------------------------------------------------------------------ */

  var checkIfDisableSync = function (syncEnabled, err) {
    if (syncEnabled && (
      err.code === globals.ErrorCodes.ContainerChanged ||
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
    utility.LogInfo('Sync enabled.');
    return $q.all([
      platform.LocalStorage.Set(globals.CacheKeys.SyncEnabled, true),
      platform.AutomaticUpdates.Start()
    ]);
  };

  var getCachedBookmarks = function (canceller) {
    var encryptedBookmarks;

    if (syncedBookmarks) {
      return $q.resolve(syncedBookmarks);
    }

    // Check current cached encrypted bookmarks
    return platform.LocalStorage.Get(globals.CacheKeys.Bookmarks)
      .then(function (cachedBookmarks) {
        if (cachedBookmarks) {
          return cachedBookmarks;
        }

        // If no bookmarks data cached, get synced bookmarks
        return api.GetBookmarks(canceller)
          .then(function (data) {
            return data.bookmarks;
          });
      })
      .then(function (bookmarksData) {
        // Decrypt bookmarks
        encryptedBookmarks = bookmarksData;
        return utility.DecryptData(encryptedBookmarks);
      })
      .then(function (decryptedBookmarks) {
        // Update cache and return decrypted bookmarks
        var bookmarks = decryptedBookmarks ? JSON.parse(decryptedBookmarks) : [];
        return updateCache(bookmarks, encryptedBookmarks);
      })
      .catch(function (err) {
        return $q.reject({ code: globals.ErrorCodes.InvalidData });
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
      if (!_.isUndefined(bookmark.children)) {
        // This is a folder, search children
        if (bookmark.children.length > 0) {
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

  var setIsSyncing = function (newIsSyncing) {
    // Update class variable
    isSyncing = newIsSyncing;

    // Refresh interface/icon
    return platform.LocalStorage.Get(globals.CacheKeys.SyncEnabled)
      .then(function (syncEnabled) {
        $timeout(function () {
          platform.Interface.Refresh(syncEnabled, newIsSyncing);
        });
      });
  };

  var sync = function () {
    // If a sync is in progress, retry later
    if (isSyncing || syncQueue.length === 0) {
      return;
    }

    // Get first sync in the queue
    currentSync = syncQueue.shift();

    // Enable syncing flag
    setIsSyncing(true);

    // Process sync
    var syncPromise;
    switch (currentSync.type) {
      // Push bookmarks to xBrowserSync service
      case globals.SyncType.Push:
        syncPromise = sync_handlePush(currentSync);
        break;
      // Overwrite local bookmarks
      case globals.SyncType.Pull:
        syncPromise = platform.LocalStorage.Set(globals.CacheKeys.DisableEventListeners, true)
          .then(function () {
            return sync_handlePull(currentSync);
          });
        break;
      // Sync to service and overwrite local bookmarks
      case globals.SyncType.Both:
        syncPromise = platform.LocalStorage.Set(globals.CacheKeys.DisableEventListeners, true)
          .then(function () {
            return sync_handleBoth(currentSync);
          });
        break;
      // Upgrade sync to current version
      case globals.SyncType.Upgrade:
        syncPromise = platform.LocalStorage.Set(globals.CacheKeys.DisableEventListeners, true)
          .then(function () {
            return sync_handleUpgrade(currentSync);
          });
        break;
      // Ambiguous sync
      default:
        syncPromise = $q.reject({ code: globals.ErrorCodes.AmbiguousSyncRequest });
        break;
    }

    // If deferred was not provided, use current sync's deferred.
    var deferredToResolve = currentSync.deferred;

    var bookmarks, syncEnabled;
    return syncPromise
      .then(function (returnedBookmarks) {
        bookmarks = returnedBookmarks;
        return platform.LocalStorage.Get(globals.CacheKeys.SyncEnabled);
      })
      .then(function (cachedSyncEnabled) {
        syncEnabled = cachedSyncEnabled;

        // If syncing for the first time or re-syncing, set sync as enabled
        if (!syncEnabled && currentSync.command !== globals.Commands.RestoreBookmarks) {
          return enableSync();
        }
      })
      // TODO: Android: Test initial sync failed functionality
      /*.then(function () {
          // Sync next item in the queue otherwise resolve the deferred
          if (syncQueue.length > 0) {
              initialSyncFailedRetrySuccess = (!initialSyncFailedRetrySuccess && currentSync.initialSyncFailed) ? true : initialSyncFailedRetrySuccess;
              $timeout(function () { sync(deferredToResolve); });
          }
          else {
              deferredToResolve.resolve(syncedBookmarks, initialSyncFailedRetrySuccess);
              initialSyncFailedRetrySuccess = false;
          }
      })*/
      .then(function () {
        utility.LogInfo('Sync ' + currentSync.uniqueId + ' completed. ' + syncQueue.length + ' sync(s) remaining.');
        deferredToResolve.resolve(bookmarks);
        $timeout(sync);
      })
      .catch(function (err) {
        var clearCachedData;

        utility.LogInfo('Sync ' + currentSync.uniqueId + ' failed.');
        utility.LogError(err, 'bookmarks.sync');

        return platform.LocalStorage.Get(globals.CacheKeys.SyncEnabled)
          .then(function (cachedSyncEnabled) {
            syncEnabled = cachedSyncEnabled;

            // If local data out of sync, queue refresh sync
            if (err && err.code === globals.ErrorCodes.DataOutOfSync) {
              // Reset syncing flag
              setIsSyncing(false);

              return queueSync({ type: globals.SyncType.Pull })
                .then(function () {
                  utility.LogInfo('Local sync data refreshed.');
                  deferredToResolve.reject(err)
                })
                .catch(deferredToResolve.reject);
            }

            // If error occurred whilst creating new sync, remove cached sync ID and password
            if (currentSync.type === globals.SyncType.Push && !currentSync.changeInfo) {
              clearCachedData = $q.all([
                platform.LocalStorage.Set(globals.CacheKeys.SyncId),
                platform.LocalStorage.Set(globals.CacheKeys.Password)
              ]);
            }
            else {
              clearCachedData = $q.resolve();
            }

            return clearCachedData
              .then(function () {
                // Check if sync should be disabled
                return checkIfDisableSync(syncEnabled, err);
              })
              .then(function () {
                // If no data found, sync has been removed
                if (syncEnabled && err.code === globals.ErrorCodes.NoDataFound) {
                  err.code = globals.ErrorCodes.SyncRemoved;
                }

                // TODO: Android: add check so that this only occurs on mobiles
                // If network disconnected when user was committing an update, 
                // add sync back to beginning of queue and return specific error code
                else if (err.code === globals.ErrorCodes.HttpRequestFailed &&
                  currentSync.type !== globals.SyncType.Pull &&
                  !utility.IsNetworkConnected()) {
                  currentSync.initialSyncFailed = true;
                  syncQueue.unshift(currentSync);
                  deferredToResolve.reject({
                    code: globals.ErrorCodes.HttpRequestFailedWhileUpdating
                  });
                }

                // If bookmarks were updated, set cached last updated so that out of sync will be detected
                // and clear sync queue
                else if (currentSync.type !== globals.SyncType.Pull) {
                  syncQueue = [];
                  var lastUpdated = new Date().toISOString();
                  platform.LocalStorage.Set(globals.CacheKeys.LastUpdated, lastUpdated);
                }

                deferredToResolve.reject(err);
              })
              .catch(deferredToResolve.reject);
          });
      })
      .finally(function () {
        // Clear current sync
        currentSync = null;

        // Reset syncing flag
        setIsSyncing(false);

        // Enable event listeners
        return platform.LocalStorage.Set(globals.CacheKeys.DisableEventListeners, false);
      });
  };

  var sync_handleBoth = function (syncData) {
    var bookmarks, getBookmarksToSync, cachedLastUpdated, updateLocalBookmarksInfo;

    return platform.LocalStorage.Get([
      globals.CacheKeys.Password,
      globals.CacheKeys.LastUpdated,
      globals.CacheKeys.SyncId
    ])
      .then(function (cachedData) {
        var password = cachedData[globals.CacheKeys.Password];
        var syncId = cachedData[globals.CacheKeys.SyncId];

        // Check for cached sync ID and password
        if (!password || !syncId) {
          return disableSync()
            .then(function () {
              return $q.reject({ code: globals.ErrorCodes.MissingClientData });
            });
        }

        // Get last updated date from local cache
        cachedLastUpdated = new Date(cachedData[globals.CacheKeys.LastUpdated]);

        if (syncData.bookmarks) {
          // Sync with provided bookmarks
          getBookmarksToSync = $q.resolve(syncData.bookmarks || []);
        }
        else {
          updateLocalBookmarksInfo = {
            type: syncData.changeInfo.type
          };
          getBookmarksToSync = api.GetBookmarks()
            .then(function (data) {
              // Check if data is out of sync
              var remoteLastUpdated = new Date(data.lastUpdated);
              if (cachedLastUpdated.getTime() !== remoteLastUpdated.getTime()) {
                return $q.reject({ code: globals.ErrorCodes.DataOutOfSync });
              }

              // Decrypt bookmarks
              return utility.DecryptData(data.bookmarks);
            })
            .then(function (decryptedData) {
              return JSON.parse(decryptedData);
            });

          // Update bookmarks before syncing
          switch (syncData.changeInfo.type) {
            // Create bookmark
            case globals.UpdateType.Create:
              getBookmarksToSync
                .then(function (bookmarksToUpdate) {
                  // Get or create other bookmarks container
                  var otherContainer = getContainer(globals.Bookmarks.OtherContainerName, bookmarksToUpdate, true);

                  // Give new bookmark an id and add to container
                  var newBookmark = syncData.changeInfo.bookmark;
                  newBookmark.id = getNewBookmarkId(bookmarksToUpdate);
                  otherContainer.children.push(newBookmark);

                  // Get path info for updating local bookmarks
                  updateLocalBookmarksInfo.pathInfo = findBookmarkInTree(newBookmark.id, bookmarksToUpdate);

                  return bookmarksToUpdate;
                });
              break;
            // Update bookmark
            case globals.UpdateType.Update:
              getBookmarksToSync
                .then(function (bookmarksToUpdate) {
                  // Update bookmark
                  bookmarksToUpdate = recursiveUpdate(bookmarksToUpdate, syncData.changeInfo.bookmark);

                  // Get path info for updating local bookmarks
                  updateLocalBookmarksInfo.pathInfo = findBookmarkInTree(syncData.changeInfo.bookmark.id, bookmarksToUpdate);

                  return bookmarksToUpdate;
                });
              break;
            // Delete bookmark
            case globals.UpdateType.Delete:
              getBookmarksToSync
                .then(function (bookmarksToUpdate) {
                  // Get path info for updating local bookmarks
                  updateLocalBookmarksInfo.pathInfo = findBookmarkInTree(syncData.changeInfo.id, bookmarksToUpdate);

                  // Remove bookmarks containing url parameter
                  return recursiveDelete(bookmarksToUpdate, syncData.changeInfo.id);
                });
              break;
            // Ambiguous sync
            case !syncData.changeInfo:
            /* falls through */
            default:
              getBookmarksToSync = $q.reject({ code: globals.ErrorCodes.AmbiguousSyncRequest });
              break;
          }
        }

        // Sync bookmarks
        return getBookmarksToSync;
      })
      .then(function (result) {
        // Remove empty containers then encrypt
        bookmarks = removeEmptyContainers(result || []);
        return utility.EncryptData(JSON.stringify(bookmarks));
      })
      .then(function (encryptedBookmarks) {
        // Update cached bookmarks
        return updateCache(bookmarks, encryptedBookmarks)
          .then(function () {
            // Sync provided bookmarks and set local bookmarks
            return $q.all([
              api.UpdateBookmarks(encryptedBookmarks),
              syncData.command === globals.Commands.RestoreBookmarks ?
                refreshLocalBookmarks(bookmarks) :
                updateLocalBookmarks(updateLocalBookmarksInfo)
            ]);
          });
      })
      .then(function (data) {
        // Update cached last updated date and return decrypted bookmarks
        return platform.LocalStorage.Set(globals.CacheKeys.LastUpdated, data[0].lastUpdated)
          .then(function () {
            return bookmarks;
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
        bookmarks = JSON.parse(decryptedData);

        // If bookmarks don't have unique ids, add new ids and re-sync
        var hasUniqueIds = checkBookmarksHaveUniqueIds(bookmarks);
        if (!hasUniqueIds) {
          return platform.Bookmarks.AddIds(bookmarks)
            .then(function (bookmarksWithIds) {
              // TODO: test this
              // Queue sync for bookmarks with ids
              return queueSync({
                bookmarks: bookmarksWithIds,
                type: globals.SyncType.Push
              })
                .then(function () {
                  return bookmarksWithIds;
                });
            });
        }
        else {
          // Update cached bookmarks and return
          return updateCache(bookmarks, encryptedBookmarks);
        }
      })
      .then(function (bookmarksToSet) {
        // Update browser bookmarks
        return refreshLocalBookmarks(bookmarksToSet);
      })
      .then(function () {
        // Update cached last updated date
        return platform.LocalStorage.Set(globals.CacheKeys.LastUpdated, lastUpdated);
      })
      .then(function () {
        // Return decrypted bookmarks
        return bookmarks;
      });
  };

  var sync_handlePush = function (syncData) {
    var bookmarks, getBookmarks;

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

        // Get last updated date from local cache
        var cachedLastUpdated = new Date(cachedData[globals.CacheKeys.LastUpdated]);

        if (!syncData.changeInfo) {
          // New sync, get local bookmarks
          getBookmarks = platform.Bookmarks.Get();
        }
        else {
          // Check sync is enabled
          if (!syncEnabled) {
            return $q.resolve();
          }

          // Get synced bookmarks and decrypt
          getBookmarks = api.GetBookmarks()
            .then(function (data) {
              // Check if data is out of sync
              var remoteLastUpdated = new Date(data.lastUpdated);
              if (cachedLastUpdated.getTime() !== remoteLastUpdated.getTime()) {
                return $q.reject({ code: globals.ErrorCodes.DataOutOfSync });
              }

              // Decrypt bookmarks
              return utility.DecryptData(data.bookmarks);
            })
            .then(function (decryptedData) {
              var bookmarks = JSON.parse(decryptedData);

              // Handle local updates
              switch (syncData.changeInfo.type) {
                // Create bookmark
                case globals.UpdateType.Create:
                  return platform.Bookmarks.Created(bookmarks, syncData.changeInfo.data)
                    .then(function (results) {
                      return results.bookmarks;
                    });
                // Delete bookmark
                case globals.UpdateType.Delete:
                  return platform.Bookmarks.Deleted(bookmarks, syncData.changeInfo.data)
                    .then(function (results) {
                      return results.bookmarks;
                    });
                // Update bookmark
                case globals.UpdateType.Update:
                  return platform.Bookmarks.Updated(bookmarks, syncData.changeInfo.data)
                    .then(function (results) {
                      return results.bookmarks;
                    });
                // Move bookmark
                case globals.UpdateType.Move:
                  return platform.Bookmarks.Moved(bookmarks, syncData.changeInfo.data)
                    .then(function (results) {
                      return results.bookmarks;
                    });
                // Ambiguous sync
                default:
                  return $q.reject({ code: globals.ErrorCodes.AmbiguousSyncRequest });
              }
            });
        }

        // Push bookmarks
        return getBookmarks;
      })
      .then(function (result) {
        // Remove empty containers then encrypt
        bookmarks = removeEmptyContainers(result || []);
        return utility.EncryptData(JSON.stringify(bookmarks));
      })
      .then(function (encryptedBookmarks) {
        // Update cached bookmarks and synced bookmarks
        return updateCache(bookmarks, encryptedBookmarks)
          .then(function () {
            return api.UpdateBookmarks(encryptedBookmarks);
          });
      })
      .then(function (data) {
        // Update cached last updated date
        return platform.LocalStorage.Set(globals.CacheKeys.LastUpdated, data.lastUpdated);
      })
      .then(function () {
        // Return decrypted bookmarks
        return bookmarks;
      });
  };

  var sync_handleUpgrade = function (syncData) {
    var bookmarks, password, syncId;

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
        bookmarks = decryptedData ? JSON.parse(decryptedData) : null;

        // Upgrade containers to use current container names
        bookmarks = upgradeContainers(bookmarks || []);

        // Set the sync version to the current app version
        return platform.LocalStorage.Set(globals.CacheKeys.SyncVersion, globals.AppVersion);
      })
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
        // Update cached bookmarks, synced bookmarks and sync version
        return updateCache(bookmarks, encryptedBookmarks)
          .then(function () {
            // Sync provided bookmarks and set local bookmarks
            return $q.all([
              api.UpdateBookmarks(encryptedBookmarks, true),
              refreshLocalBookmarks(bookmarks)
            ]);
          });
      })
      .then(function (data) {
        // Update cached last updated date and return decrypted bookmarks
        return platform.LocalStorage.Set(globals.CacheKeys.LastUpdated, data[0].lastUpdated);
      })
      .then(function () {
        return bookmarks;
      });
  };

  var updateLocalBookmarks = function (changeInfo) {
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
      /* falls through */
      default:
        return $q.reject({ code: globals.ErrorCodes.AmbiguousSyncRequest });
    }
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

    var xbsContainerIndex = bookmarks.findIndex(function (x) {
      return x.title === globals.Bookmarks.UnfiledContainerNameOld;
    });
    if (xbsContainerIndex >= 0) {
      var xbsContainer = bookmarks.splice(xbsContainerIndex, 1)[0];
      xbsContainer.title = 'Legacy xBrowserSync bookmarks';
      otherContainer.children = otherContainer.children || [];
      otherContainer.children.splice(0, 0, xbsContainer);
    }

    // Remove empty containers
    bookmarks = removeEmptyContainers(bookmarks);

    return bookmarks;
  }

  var self = {
    CheckBookmarksHaveUniqueIds: checkBookmarksHaveUniqueIds,
    CheckForUpdates: checkForUpdates,
    DisableSync: disableSync,
    Each: eachBookmark,
    Export: exportBookmarks,
    FindBookmarkInTree: findBookmarkInTree,
    GetContainer: getContainer,
    GetCurrentSync: getCurrentSync,
    GetLookahead: getLookahead,
    GetNewBookmarkId: getNewBookmarkId,
    GetSyncBookmarksToolbar: getSyncBookmarksToolbar,
    IncludesCurrentPage: isCurrentPageABookmark,
    Search: searchBookmarks,
    Sync: queueSync,
    SyncSize: getSyncSize,
    UpdateCache: updateCache,
    UpgradeContainers: upgradeContainers,
    XBookmark: xBookmark,
    XBookmarkIsContainer: xBookmarkIsContainer
  };
  return self;
};