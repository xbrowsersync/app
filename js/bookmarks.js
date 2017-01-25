var xBrowserSync = xBrowserSync || {};
xBrowserSync.App = xBrowserSync.App || {};

/* ------------------------------------------------------------------------------------
 * Class name:	xBrowserSync.App.Bookmarks
 * Description:	Responsible for handling bookmark data.
 * ------------------------------------------------------------------------------------ */

xBrowserSync.App.Bookmarks = function($q, $timeout, platform, globals, api, utility) { 
    'use strict';
    
    var moduleName = 'xBrowserSync.App.Bookmarks', retryFailedSync, syncQueue = [];

/* ------------------------------------------------------------------------------------
 * Public functions
 * ------------------------------------------------------------------------------------ */
 
	var checkForUpdates = function() {
		// Exit if sync is in progress
		if (globals.IsSyncing.Get()) {
            return $q.resolve();
		}
        
        // Check if bookmarks have been updated
		return api.GetBookmarksLastUpdated()
            .then(function(data) {
				if (!data || !data.lastUpdated) {
					return $q.reject({ code: globals.ErrorCodes.NoDataFound });
				}
				
				var lastUpdated = new Date(data.lastUpdated);
				
				// If last updated is different the date in local storage, refresh bookmarks
				if (!globals.LastUpdated.Get() || globals.LastUpdated.Get().getTime() !== lastUpdated.getTime()) {
					// Run sync
                    return queueSync({ type: globals.SyncType.Pull });
				}
			});
	};
	
	var exportBookmarks = function() {
        // If sync is not enabled, export local browser data
        if (!globals.SyncEnabled.Get()) {
            return platform.Bookmarks.Get()
                .then(function(bookmarks) {
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
                .then(function(data) {
                    if (!data || !data.lastUpdated) {
                        return $q.reject({ code: globals.ErrorCodes.NoDataFound });
                    }
                    
                    // Decrypt bookmarks
                    var bookmarks;
                    try {
                        bookmarks = JSON.parse(utility.DecryptData(data.bookmarks));
                    }
                    catch (err) { 
                        // Log error
                        utility.LogMessage(
                            moduleName, 'exportBookmarks', utility.LogType.Error,
                            JSON.stringify(err));
                        
                        return $q.reject({ code: globals.ErrorCodes.InvalidData });
                    }
                    
                    var exportData = {
                        xBrowserSync: { 
                            id: globals.Id.Get(),
                            bookmarks: bookmarks
                        }
                    };
                    
                    return exportData;
                });
        }
	};
	
	var importBookmarks = function(bookmarks) {
		// Update browser bookmarks
		return setBookmarks(bookmarks);
	};

    var isCurrentPageABookmark = function() {
        var currentUrl;
        
        // Check if current url is contained in bookmarks
		return platform.GetCurrentUrl()
            .then(function(result) {
                if (!result) {
                    return;
                }
                
                currentUrl = result;
                return searchBookmarks({ url: currentUrl })
                    .then(function(results) {
                        var result = _.find(results, function(bookmark) { 
                            return bookmark.url.toLowerCase() === currentUrl.toLowerCase(); 
                        });

                        return $q.resolve(result);
                    });
            });
    };
    
    var getLookahead = function(word, bookmarks, canceller, tagsOnly) {
        var getBookmarks;
        var deferred = $q.defer();
        
        if (!word) {
            return deferred.resolve();
        }
        
        if (!!bookmarks && bookmarks.length > 0) {
            // Use supplied bookmarks
            getBookmarks = $q.resolve(bookmarks);
        }
        else {
            // Get cached synced bookmarks
            getBookmarks = getCachedBookmarks(null, canceller);
        }
        
        // With bookmarks
        getBookmarks
            .then(function(bookmarks) {
                // Get lookaheads
                var lookaheads = searchBookmarksForLookaheads(bookmarks, word, tagsOnly);
                
                if (lookaheads.length === 0) {
                    deferred.resolve(null);
                }
                
                // Count lookaheads and return most common
                var lookahead = _.chain(lookaheads)
                    .sortBy(function(lookahead) { 
                        return lookahead.length; 
                    })
                    .countBy().pairs().max(_.last).first().value();
                
                deferred.resolve([lookahead, word]);
            })
            .catch(function(err) {
                // Return if request was cancelled
                if (!!err && !!err.code && err.code === globals.ErrorCodes.HttpRequestCancelled) {
                    return;
                }
                
                // Log error
                utility.LogMessage(
                    moduleName, 'getLookahead', utility.LogType.Error,
                    JSON.stringify(err));
                
                deferred.reject(err);
            });
        
        return deferred.promise;
    };

    var getSyncSize = function() {
        // Get cached synced bookmarks
        return getCachedBookmarks()
            .then(function(bookmarks) {
                // Return size in bytes of encrypted bookmarks
                var encryptedBookmarks = utility.EncryptData(JSON.stringify(bookmarks));
                var sizeInBytes = utility.GetStringSizeInBytes(encryptedBookmarks);
                return sizeInBytes;
            });
    };
	
	var queueSync = function(syncData) {
        syncData.deferred = $q.defer();
        
        // Add sync to queue
        syncQueue.push(syncData);
        
        // Trigger sync
        sync(syncData.deferred);
        
        return syncData.deferred.promise;
    };
	
	var refreshCachedBookmarks = function(bookmarks) {
        // Clear cache
        globals.Cache.Bookmarks.Set(null);
        
        // Refresh cache with latest sync data
        return getCachedBookmarks(bookmarks);
    };
    
    var searchBookmarks = function(query) {
        if (!query) {
            return $q.resolve();
        }

        // Get cached synced bookmarks
        return getCachedBookmarks()
            .then(function(bookmarks) {
                var results;
                
                // If url supplied, first search by url
                if  (!!query.url) {
                    results = searchBookmarksByUrl(bookmarks, query.url) || [];
                }
                
                // Search by keywords and sort using results from url search if relevant
                bookmarks = results || bookmarks;
                results = _.sortBy(searchBookmarksByKeywords(bookmarks, query.keywords), 'score').reverse();
                
                return results;
            });
    };
	
	var setBookmarks = function(bookmarks) {
		// Clear current bookmarks
		return platform.Bookmarks.Clear()
            .then(function() {
                // Populate new bookmarks
                return platform.Bookmarks.Populate(bookmarks);
            });
	};


/* ------------------------------------------------------------------------------------
 * Private functions
 * ------------------------------------------------------------------------------------ */
    
    var getCachedBookmarks = function(bookmarks, canceller) {
            var bookmarkData, getBookmarks;
            
            if (!bookmarks) {
                // Get cached bookmarks
                bookmarkData = globals.Cache.Bookmarks.Get(); 
                
                if (!!bookmarkData) {
                    // Decrypt bookmarks
                    try {
                        bookmarks = JSON.parse(utility.DecryptData(bookmarkData));
                    }
                    catch (err) { 
                        // Log error
                        utility.LogMessage(
                            moduleName, 'getCachedBookmarks', utility.LogType.Error,
                            'Error decrypting cached bookmarks data; ' + JSON.stringify(err));
                        
                        return $q.reject({ code: globals.ErrorCodes.InvalidData });
                    }

                    getBookmarks = $q.resolve(bookmarks);
                }
                else {
                    // Get synced bookmarks
                    getBookmarks = api.GetBookmarks(canceller)
                        .then(function(data) {
                            if (!data || !data.lastUpdated) {
                                return $q.reject({ code: globals.ErrorCodes.NoDataFound });
                            }

                            // Decrypt bookmarks
                            try {
                                bookmarks = JSON.parse(utility.DecryptData(data.bookmarks));
                            }
                            catch (err) { 
                                // Log error
                                utility.LogMessage(
                                    moduleName, 'getCachedBookmarks', utility.LogType.Error,
                                    'Error decrypting synced bookmarks data; ' + JSON.stringify(err));
                                
                                return $q.reject({ code: globals.ErrorCodes.InvalidData });
                            }

                            // Add encrypted bookmark data to cache
                            globals.Cache.Bookmarks.Set(data.bookmarks);

                            return bookmarks;                            
                        });
                }
            }
            else {
                getBookmarks = $q.resolve(bookmarks);
            }
            
            return getBookmarks
                .then(function(bookmarks) {
                    // Add unique IDs
                    var counter = 0;
                    var addIdToBookmark = function(bookmark) {
                        if (!!bookmark.url) {
                            bookmark.id = counter;
                            counter++;
                        }

                        _.each(bookmark.children, addIdToBookmark);
                    };
                    
                    _.each(bookmarks, addIdToBookmark);
                    
                    return bookmarks;
                });
    };

    var recursiveDelete = function(bookmarks, url) {
        return _.map(
            _.reject(bookmarks, function(bookmark) {
                if (!bookmark.url) {
                    return false;
                }
                
                return bookmark.url === url;
            }), 
            function(bookmark) {
                if (!!bookmark.children && bookmark.children.length > 0) {
                    bookmark.children = recursiveDelete(bookmark.children, url);
                }
            
                return bookmark;
            }
        );
    };
                            
    var recursiveUpdate = function(bookmarks, url, updatedBookmark) {
        return _.map(
            bookmarks, 
            function(bookmark) {
                if (!!bookmark.url && bookmark.url === url) {
                    bookmark.title = updatedBookmark.title;
                    bookmark.url = updatedBookmark.url;
                    bookmark.description = updatedBookmark.description;
                    bookmark.tags = updatedBookmark.tags;
                }
                
                if (!!bookmark.children && bookmark.children.length > 0) {
                    bookmark.children = recursiveUpdate(bookmark.children, url, updatedBookmark);
                }
            
                return bookmark;
            }
        );
    };

    var removeEmptyContainers = function(xBookmarks) {
        var otherContainer = utility.GetOtherContainer(xBookmarks, false);
        var toolbarContainer = utility.GetToolbarContainer(xBookmarks, false);
        var xbsContainer = utility.GetXBrowserSyncContainer(xBookmarks, false);
        var removeArr = [];

        if (!!otherContainer && (!otherContainer.children || otherContainer.children.length === 0)) {
            removeArr.push(otherContainer);
        }

        if (!!toolbarContainer && (!toolbarContainer.children || toolbarContainer.children.length === 0)) {
            removeArr.push(toolbarContainer);
        }

        if (!!xbsContainer && (!xbsContainer.children || xbsContainer.children.length === 0)) {
            removeArr.push(xbsContainer);
        }

        return _.difference(xBookmarks, removeArr);
    };

    var cleanWords = function (wordsToClean) {
        if (!wordsToClean) {
            return;
        }
        
        // Remove all non alphanumerics and spaces and return as array
        var cleanWords = wordsToClean.toLowerCase().replace(/[^a-z0-9\s]/g, '');
        var cleanWordsArr = _.compact(cleanWords.split(/\s/)); 
        return cleanWordsArr;
    };
	
	var searchBookmarksByKeywords = function (bookmarksToSearch, keywords, results) {
        if (!results) {
            results = [];
        }
        
        _.each(bookmarksToSearch, function(bookmark) {
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
                if (!!bookmark.description) { bookmarkWords = bookmarkWords.concat(cleanWords(bookmark.description)); }
                if (!!bookmark.tags) { bookmarkWords = bookmarkWords.concat(cleanWords(bookmark.tags.join(' '))); }
                
                // Get match scores for each keyword against bookmark words
                var scores = _.map(keywords, function(keyword) { 
                    var count = 0; 
                    
                    // Match words that begin with keyword
                    _.each(bookmarkWords, function(bookmarkWord) { 
                        if (bookmarkWord.toLowerCase().indexOf(keyword.toLowerCase()) === 0) { count++; } 
                    }); 
                    
                    return count; 
                });
                
                // Check all keywords match
                if (_.isUndefined(_.find(scores, function(score) { return score === 0; }))) {
                    // Calculate score
                    var score = _.reduce(scores, function(memo, num) { return memo + num; }, 0);
                        
                    // Add result
                    var result = {
                        id: bookmark.id,
                        title: bookmark.title,
                        url: bookmark.url,
                        description: bookmark.description,
                        tags: bookmark.tags,
                        score: score
                    };
                    
                    results.push(result);
                }
            }
        });

        return results;
    };
    
    var searchBookmarksByUrl = function(bookmarksToSearch, url, results) {
        if (!results) {
            results = [];
        }
        
        results = results.concat(_.filter(bookmarksToSearch, function(bookmark) {
            if (!bookmark.url) {
                return false;
            }
            
            return bookmark.url.toLowerCase().indexOf(url.toLowerCase()) >= 0;
        }));
        
        for (var i = 0; i < bookmarksToSearch.length; i++) {
            if (!!bookmarksToSearch[i].children && bookmarksToSearch[i].children.length > 0) {
                results = searchBookmarksByUrl(bookmarksToSearch[i].children, url, results);
            }
        }

        return results;
    };
    
    var searchBookmarksForLookaheads = function(bookmarksToSearch, word, tagsOnly, results) {
        if (!results) {
            results = [];
        }
        
        _.each(bookmarksToSearch, function(bookmark) {
            if (!bookmark.url) {
                results = searchBookmarksForLookaheads(bookmark.children, word, tagsOnly, results);
            }
            else {
                var bookmarkWords = [];
                
                if (!tagsOnly) {
                    // Add all words from title
                    bookmarkWords = bookmarkWords.concat(_.compact(bookmark.title.replace("'", '').toLowerCase().split(/[\W_]/)));
                    
                    // Split tags into individual words
                    if (!!bookmark.tags) { 
                        var tags = _.chain(bookmark.tags)
                            .map(function(tag) {
                                return tag.toLowerCase().split(/\s/);
                            })
                            .flatten()
                            .compact()
                            .value();

                        bookmarkWords = bookmarkWords.concat(tags);
                    }

                    // Add url host
                    var hostMatch = bookmark.url.toLowerCase().match(/^(https?:\/\/)?(www\.)?([^\/]+)/);
                    if (!!hostMatch) {
                        bookmarkWords.push(hostMatch[0]);
                        bookmarkWords.push(hostMatch[2] + hostMatch[3]);
                        bookmarkWords.push(hostMatch[3]);
                    }
                }
                else {
                    if (!!bookmark.tags) { 
                        bookmarkWords = bookmarkWords.concat(_.compact(bookmark.tags)); 
                    }
                }

                // Remove words of two chars or less
                bookmarkWords = _.filter(bookmarkWords, function(item) { return item.length > 2; });
                
                // Find all words that begin with lookahead word
                results = results.concat(_.filter(bookmarkWords, function(bookmark) { return bookmark.indexOf(word) === 0; }));
            }
        });
        
        return results;
    };
    
    var sync = function(deferredToResolve) {
        // If a sync is in progress, retry later
		if (globals.IsSyncing.Get()) {
			$timeout(sync, globals.SyncPollTimeout);
			return;
		}

        // Clear any active failed sync retry
        if (!!retryFailedSync) {
            clearTimeout(retryFailedSync);
            retryFailedSync = null;
        }
        
        // Get next queued sync (process syncs in order )
        var currentSync = syncQueue.shift();
        
        // Queue is empty, return
        if (!currentSync) {
            return;
        }
        
        globals.IsSyncing.Set(true);

        var syncPromise;

        // Process sync
        switch(currentSync.type) {
            // Push bookmarks to xBrowserSync service
            case globals.SyncType.Push:
                syncPromise = sync_handlePush(currentSync);
                break;
            // Overwrite local bookmarks
            case globals.SyncType.Pull:
                globals.DisableEventListeners.Set(true);
                syncPromise = sync_handlePull(currentSync);
                break;
            // Sync to service and overwrite local bookmarks
            case globals.SyncType.Both:
                globals.DisableEventListeners.Set(true);
                syncPromise = sync_handleBoth(currentSync);
                break;
            // Ambiguous sync
            default:
                syncPromise = $q.reject({ code: globals.ErrorCodes.AmbiguousSyncRequest });
                break;
        }

        // If deferred was not provided, use current sync's deferred.
        deferredToResolve = deferredToResolve || currentSync.deferred;
        
        syncPromise
            // Resolve original sync deferred
            .then(function() {
                deferredToResolve.resolve();

                // If there are items in the queue call sync
                if (syncQueue.length > 0) {
                    $timeout(sync);
                }
            })
            .catch(function (err) {
                // Handle network error
                if (!!globals.Network.Disconnected.Get()) {
                    // If the user was committing an update, add sync back into queue and retry periodically, and 
                    // return specific error code
                    if (currentSync.type !== globals.SyncType.Pull) {
                        syncQueue.unshift(currentSync);
                        retryFailedSync = $timeout(sync, globals.RetryFailedSyncTimeout);
                        
                        deferredToResolve.reject({ 
                            code: globals.ErrorCodes.HttpRequestFailedWhileUpdating 
                        });
                        return;
                    }
                }
                    
                deferredToResolve.reject(err);
            })
            .finally(function () {
                globals.IsSyncing.Set(false);
                globals.DisableEventListeners.Set(false);
            });
	};
    
    var sync_handleBoth = function(syncData) {
        // Check secret and bookmarks ID are present
		if (!globals.ClientSecret.Get() || !globals.Id.Get()) {
			globals.SyncEnabled.Set(false);
            return $q.reject({ code: globals.ErrorCodes.MissingClientData });
		}
        
        var syncPromise, bookmarks;
        
        if (!_.isUndefined(syncData.bookmarks)) {
            // Sync with provided bookmarks
            syncPromise = $q.resolve(syncData.bookmarks || []);
        }
        else {
            // Update bookmarks before syncing
            switch(syncData.changeInfo.type) {
                // Create bookmark
                case globals.UpdateType.Create:
                    syncPromise = api.GetBookmarks()
                        .then(function(data) {
                            if (!data || !data.lastUpdated) {
                                return $q.reject({ code: globals.ErrorCodes.NoDataFound });
                            }

                            // Check if data is out of sync
                            var lastUpdated = new Date(data.lastUpdated);
                            if (globals.LastUpdated.Get().getTime() !== lastUpdated.getTime()) {
                                return $q.reject({ code: globals.ErrorCodes.DataOutOfSync });
                            }
                            
                            var bookmarksToUpdate;
                            
                            // Decrypt bookmarks
                            try {
                                bookmarksToUpdate = JSON.parse(utility.DecryptData(data.bookmarks));
                            }
                            catch (err) { 
                                // Log error
                                utility.LogMessage(
                                    moduleName, 'sync_handleBoth', utility.LogType.Error,
                                    'Error creating bookmark; ' + JSON.stringify(err));
                                
                                return $q.reject({ code: globals.ErrorCodes.InvalidData });
                            }
                            
                            // Get xBrowserSync group
		                    var xbsContainer = utility.GetXBrowserSyncContainer(bookmarksToUpdate, true);
                            
                            // Add new bookmark to xBrowserSync group
                            xbsContainer.children.push(syncData.changeInfo.bookmark);
                            
                            return bookmarksToUpdate;
                        });
                    break;
                // Update bookmark
                case globals.UpdateType.Update:
                    syncPromise = api.GetBookmarks()
                        .then(function(data) {
                            if (!data || !data.lastUpdated) {
                                return $q.reject({ code: globals.ErrorCodes.NoDataFound });
                            }

                            // Check if data is out of sync
                            var lastUpdated = new Date(data.lastUpdated);
                            if (globals.LastUpdated.Get().getTime() !== lastUpdated.getTime()) {
                                return $q.reject({ code: globals.ErrorCodes.DataOutOfSync });
                            }
                            
                            var bookmarksToUpdate;
                            
                            // Decrypt bookmarks
                            try {
                                bookmarksToUpdate = JSON.parse(utility.DecryptData(data.bookmarks));
                            }
                            catch (err) { 
                                // Log error
                                utility.LogMessage(
                                    moduleName, 'sync_handleBoth', utility.LogType.Error,
                                    'Error updating bookmark; ' + JSON.stringify(err));
                                
                                return $q.reject({ code: globals.ErrorCodes.InvalidData });
                            }
                            
                            // If url has changed, remove bookmarks containing updated url parameter
                            if (syncData.changeInfo.url != syncData.changeInfo.bookmark.url) {
                                bookmarksToUpdate = recursiveDelete(bookmarksToUpdate, syncData.changeInfo.bookmark.url);
                            }
                            
                            // Update bookmarks containing url parameter
                            bookmarksToUpdate = recursiveUpdate(bookmarksToUpdate, syncData.changeInfo.url, syncData.changeInfo.bookmark);
                            
                            return bookmarksToUpdate;
                        });
                    break;
                // Delete bookmark
                case globals.UpdateType.Delete:
                    syncPromise = api.GetBookmarks()
                        .then(function(data) {
                            if (!data || !data.lastUpdated) {
                                return $q.reject({ code: globals.ErrorCodes.NoDataFound });
                            }

                            // Check if data is out of sync
                            var lastUpdated = new Date(data.lastUpdated);
                            if (globals.LastUpdated.Get().getTime() !== lastUpdated.getTime()) {
                                return $q.reject({ code: globals.ErrorCodes.DataOutOfSync });
                            }
                            
                            var bookmarksToUpdate;
                            
                            // Decrypt bookmarks
                            try {
                                bookmarksToUpdate = JSON.parse(utility.DecryptData(data.bookmarks));
                            }
                            catch (err) { 
                                // Log error
                                utility.LogMessage(
                                    moduleName, 'sync_handleBoth', utility.LogType.Error,
                                    'Error deleting bookmark; ' + JSON.stringify(err));
                                
                                return $q.reject({ code: globals.ErrorCodes.InvalidData });
                            }
                            
                            // Remove bookmarks containing url parameter
                            bookmarksToUpdate = recursiveDelete(bookmarksToUpdate, syncData.changeInfo.url);
                            
                            return bookmarksToUpdate;
                        });
                    break;
                // Ambiguous sync
                case !syncData.changeInfo:
                    /* falls through */
                default:
                    syncPromise = $q.reject({ code: globals.ErrorCodes.AmbiguousSyncRequest });
                    break;
            }
        }
        
        // Sync bookmarks
        return syncPromise
            .then(function(bookmarksToSync) {
                bookmarks = bookmarksToSync || [];

                // Refresh bookmarks cache
                refreshCachedBookmarks(bookmarks);
                
                // Encrypt bookmarks
                var encryptedBookmarks = utility.EncryptData(JSON.stringify(bookmarks));
                
                // Sync provided bookmarks and set local bookmarks
                return $q.all([
                    api.UpdateBookmarks(encryptedBookmarks),
                    setBookmarks(bookmarks)
                ]);
            })
            .then(function(data) {
                if (!data || !data[0] || !data[0].lastUpdated) {
                    return $q.reject({ code: globals.ErrorCodes.NoDataFound });
                }
                
                globals.LastUpdated.Set(data[0].lastUpdated);
                
                return bookmarks;
            });
    };
    
    var sync_handlePull = function(syncData) {
        var bookmarks, lastUpdated;
        
        if (!_.isUndefined(syncData.bookmarks)) {
            // Local import, update browser bookmarks
            return setBookmarks(syncData.bookmarks);            
        }
        
        // Check secret and bookmarks ID are present
		if (!globals.ClientSecret.Get() || !globals.Id.Get()) {
			globals.SyncEnabled.Set(false);
            return $q.reject({ code: globals.ErrorCodes.MissingClientData });
		}
        
        // Get synced bookmarks
        return api.GetBookmarks()
            .then(function(data) {
                if (!data || !data.lastUpdated) {
                    return $q.reject({ code: globals.ErrorCodes.NoDataFound });
                }
                
                // Decrypt bookmarks
                try {
                    bookmarks = JSON.parse(utility.DecryptData(data.bookmarks));
                }
                catch (err) { 
                    // Log error
                    utility.LogMessage(
                        moduleName, 'sync_handlePull', utility.LogType.Error,
                        JSON.stringify(err));
                    
                    return $q.reject({ code: globals.ErrorCodes.InvalidData });
                }

                // Refresh bookmarks cache
                refreshCachedBookmarks(bookmarks);
                lastUpdated = data.lastUpdated;
                
                // Update browser bookmarks
                return setBookmarks(bookmarks);
            })
            .then(function() {
                globals.LastUpdated.Set(lastUpdated);
                return bookmarks;
            });
    };
    
    var sync_handlePush = function(syncData) {
        // Get bookmarks to sync
        var getBookmarks, bookmarks;
        
        if (!syncData.changeInfo) {
            // Check secret is present
            if (!globals.ClientSecret.Get()) {
                globals.SyncEnabled.Set(false);
                return $q.reject({ code: globals.ErrorCodes.MissingClientData });
            }
            
            // New sync, get local bookmarks
            getBookmarks = platform.Bookmarks.Get();
        }
        else {
            // Check sync is enabled
            if (!globals.SyncEnabled.Get()) {
                return $q.resolve();
            }

            // Check secret and bookmarks ID are present
            if (!globals.ClientSecret.Get() || !globals.Id.Get()) {
                globals.SyncEnabled.Set(false);
                return $q.reject({ code: globals.ErrorCodes.MissingClientData });
            }
            
            // Get synced bookmarks and decrypt
            getBookmarks = api.GetBookmarks()
                .then(function(data) {
                    if (!data || !data.lastUpdated) {
                        return $q.reject({ code: globals.ErrorCodes.NoDataFound });
                    }

                    // Check if data is out of sync
                    var lastUpdated = new Date(data.lastUpdated);
                    if (globals.LastUpdated.Get().getTime() !== lastUpdated.getTime()) {
                        return $q.reject({ code: globals.ErrorCodes.DataOutOfSync });
                    }
                    
                    // Decrypt bookmarks
                    try {
                        bookmarks = JSON.parse(utility.DecryptData(data.bookmarks));
                    }
                    catch (err) { 
                        // Log error
                        utility.LogMessage(
                            moduleName, 'sync_handlePush', utility.LogType.Error,
                            JSON.stringify(err));
                        
                        return $q.reject({ code: globals.ErrorCodes.InvalidData });
                    }
            
                    // Handle local updates
                    switch(syncData.changeInfo.type) {
                        // Create bookmark
                        case globals.UpdateType.Create:
                            return platform.Bookmarks.Created(bookmarks, syncData.changeInfo.data)
                                .then(function(results) {
                                    return results.bookmarks;
                                });
                        // Delete bookmark
                        case globals.UpdateType.Delete:
                            return platform.Bookmarks.Deleted(bookmarks, syncData.changeInfo.data)
                                .then(function(results) {
                                    return results.bookmarks;
                                });
                        // Update bookmark
                        case globals.UpdateType.Update:
                            return platform.Bookmarks.Updated(bookmarks, syncData.changeInfo.data)
                                .then(function(results) {
                                    return results.bookmarks;
                                });
                        // Move bookmark
                        case globals.UpdateType.Move:
                            return platform.Bookmarks.Moved(bookmarks, syncData.changeInfo.data)
                                .then(function(results) {
                                    return results.bookmarks;
                                });
                        // Ambiguous sync
                        default:
                            return $q.reject({ code: globals.ErrorCodes.AmbiguousSyncRequest });
                    }
                });
        }
        
        // Push bookmarks
        return getBookmarks
            .then(function(bookmarks) {
                bookmarks = bookmarks || [];

                // Remove empty containers
                bookmarks = removeEmptyContainers(bookmarks);

                // Refresh bookmarks cache
                refreshCachedBookmarks(bookmarks);
                
                // Encrypt local bookmarks
                var encryptedBookmarks = utility.EncryptData(JSON.stringify(bookmarks));
                
                if (!syncData.changeInfo) {
                    // Create new bookmarks sync
                    return api.CreateBookmarks(encryptedBookmarks);
                }
                else {
                    // Update bookmarks sync
                    return api.UpdateBookmarks(encryptedBookmarks);
                }
            })
            .then(function(data) {
                if (!syncData.changeInfo) {
                    if (!data.id) {
                        return reject({ code: globals.ErrorCodes.NoDataFound });
                    }
                
                    globals.Id.Set(data.id);
                    globals.LastUpdated.Set(data.lastUpdated);
                    
                    return bookmarks;
                }
                else {
                    if (!data.lastUpdated) {
                        return reject({ code: globals.ErrorCodes.NoDataFound });
                    }
                
                    globals.LastUpdated.Set(data.lastUpdated);
                    
                    return bookmarks;
                }
            });
    };
		
	return {
        CheckForUpdates: checkForUpdates,
		Export: exportBookmarks,
		Import: importBookmarks,
        IncludesCurrentPage: isCurrentPageABookmark,
        GetLookahead: getLookahead,
        RefreshCache: refreshCachedBookmarks,
        Search: searchBookmarks,
        Set: setBookmarks,
		Sync: queueSync,
        SyncSize: getSyncSize
	};
};