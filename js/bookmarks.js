var xBrowserSync = xBrowserSync || {};
xBrowserSync.App = xBrowserSync.App || {};

/* ------------------------------------------------------------------------------------
 * Class name:	xBrowserSync.App.Bookmarks
 * Description:	Responsible for handling bookmark data.
 * ------------------------------------------------------------------------------------ */

xBrowserSync.App.Bookmarks = function($q, $timeout, platform, globals, api, utility) { 
    'use strict';
    
    var moduleName = 'xBrowserSync.App.Bookmarks', syncQueue = [];

/* ------------------------------------------------------------------------------------
 * Public functions
 * ------------------------------------------------------------------------------------ */
 
    var checkBookmarksHaveUniqueIds = function(bookmarks) {
        // Find any bookmark without an id
        var bookmarksHaveIds = true;
        self.Each(bookmarks, function(bookmark) {
            if (_.isUndefined(bookmark.id)) {
                bookmarksHaveIds = false;
            }
        });

        if (!bookmarksHaveIds) {
            return false;
        }
        
        // Get all local bookmarks into flat array
        var allBookmarks = [];
        self.Each(bookmarks, function(bookmark) { 
            allBookmarks.push(bookmark); 
        });

        // Find a bookmark with a duplicate id
        var duplicateIds = _.chain(allBookmarks)
            .countBy('id')
            .find(function(count) { 
                return count > 1; }
            )
            .value();
        
        if (!_.isUndefined(duplicateIds)) {
            return false;
        }

        return true;
    };
    
    var checkForUpdates = function() {
		// Check if there are unsynced local updates
        if (syncQueue.length > 0) {
            return $q.resolve(true);
        }

        // Check if bookmarks have been updated
        return api.GetBookmarksLastUpdated()
            .then(function(data) {
                if (!data || !data.lastUpdated) {
                    return $q.reject({ code: globals.ErrorCodes.NoDataFound });
                }
                
                var lastUpdated = new Date(data.lastUpdated);
                
                // If last updated is different the date in local storage, refresh bookmarks
                return !globals.LastUpdated.Get() || globals.LastUpdated.Get().getTime() !== lastUpdated.getTime();
            });
	};

    var eachBookmark = function(bookmarks, iteratee) {
        // Run the iteratee function for every bookmark
        (function iterateBookmarks(bookmarksToIterate) { 
            for (var i=0; i < bookmarksToIterate.length; i++) { 
                iteratee(bookmarksToIterate[i]);

                // If the bookmark has children, iterate them
                if (!!bookmarksToIterate[i].children && bookmarksToIterate[i].children.length > 0) {
                    iterateBookmarks(bookmarksToIterate[i].children); 
                } 
            } 
        })(bookmarks);
    };
	
	var exportBookmarks = function() {
        // If sync is not enabled, export local browser data
        if (!globals.SyncEnabled.Get()) {
            return platform.Bookmarks.Get(false)
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

	var getLookahead = function(word, bookmarksToSearch, canceller, tagsOnly) {
        var getBookmarks;
        var deferred = $q.defer();
        
        if (!word) {
            return deferred.resolve();
        }
        
        if (!!bookmarksToSearch && bookmarksToSearch.length > 0) {
            // Use supplied bookmarks
            getBookmarks = $q.resolve(bookmarksToSearch);
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

    var getNewBookmarkId = function(bookmarks) {
        var highestId = 0;

        eachBookmark(bookmarks, function(bookmark) {
            if (!_.isUndefined(bookmark.id) && bookmark.id > highestId) {
                highestId = bookmark.id;
            }
        });

        return highestId + 1;
    };
	
	var getOtherContainer = function(bookmarks, createIfNotPresent) {
        var container = _.findWhere(bookmarks, { title: globals.Bookmarks.OtherContainerName });

        // If container does not exist, create it if specified
        if (!container && !!createIfNotPresent) {
            container = new xBookmark(globals.Bookmarks.OtherContainerName);
            container.id = getNewBookmarkId(bookmarks);
            bookmarks.push(container);
        }

        return container;
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
	
	var getToolbarContainer = function(bookmarks, createIfNotPresent) {
        var container = _.findWhere(bookmarks, { title: globals.Bookmarks.ToolbarContainerName });

        // If container does not exist, create it if specified
        if (!container && !!createIfNotPresent) {
            container = new xBookmark(globals.Bookmarks.ToolbarContainerName);
            container.id = getNewBookmarkId(bookmarks);
            bookmarks.push(container);
        }

        return container;
    };

	var getXBrowserSyncContainer = function(bookmarks, createIfNotPresent) {
        var container = _.findWhere(bookmarks, { title: globals.Bookmarks.xBrowserSyncContainerName });

        // If container does not exist, create it if specified
        if (!container && !!createIfNotPresent) {
            container = new xBookmark(globals.Bookmarks.xBrowserSyncContainerName);
            container.id = getNewBookmarkId(bookmarks);
            bookmarks.push(container);
        }

        return container;
    };

    var isBookmarkContainer = function(bookmark) {
		return (bookmark.title === globals.Bookmarks.OtherContainerName ||
				bookmark.title === globals.Bookmarks.ToolbarContainerName ||
				bookmark.title === globals.Bookmarks.xBrowserSyncContainerName);
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
    
    var queueSync = function(syncData) {
        var deferred = $q.defer();

        // If new sync ensure sync queue is clear
        if (!globals.SyncEnabled.Get()) {
            syncQueue = [];
        }
        
        // Add sync to queue
        if (!!syncData) {
            syncData.deferred = deferred;
            syncQueue.push(syncData);
        }

        // Trigger sync
        sync(deferred);
        return deferred.promise;
    };
	
	var refreshCachedBookmarks = function(bookmarks) {
        // Clear cache
        globals.Cache.Bookmarks.Set(null);
        
        // Refresh cache with latest sync data
        return getCachedBookmarks(bookmarks);
    };
    
    var searchBookmarks = function(query) {
        if (!query) {
            query = { keywords: [] };
        }

        // Get cached synced bookmarks
        return getCachedBookmarks()
            .then(function(bookmarks) {
                var results;
                
                // If url supplied, first search by url
                if  (!!query.url) {
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
	
	var setBookmarks = function(bookmarks) {
		// Clear current bookmarks
		return platform.Bookmarks.Clear()
            .then(function() {
                // Populate new bookmarks
                return platform.Bookmarks.Populate(bookmarks);
            });
	};

	var xBookmark = function(title, url, description, tags, children) {
		var xBookmark = {};
		
		if (!!title) {
			xBookmark.title = title.trim();
		}
		
		if (!!url) {
			xBookmark.url = url.trim();
		}
		else {
			xBookmark.children = children || [];
		}
		
		if (!!description) {
			xBookmark.description = utility.TrimToNearestWord(description, globals.Bookmarks.DescriptionMaxLength);
		}
		
		if (!!tags && tags.length > 0) {
			xBookmark.tags = tags;
		}
		
		return xBookmark;
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
                // Encrypt bookmarks and add to cache
                var encryptedBookmarks = utility.EncryptData(JSON.stringify(bookmarks));
                globals.Cache.Bookmarks.Set(encryptedBookmarks);

                getBookmarks = $q.resolve(bookmarks);
            }
            
            return getBookmarks;
    };

    var recursiveDelete = function(bookmarks, id) {
        return _.map(
            _.reject(bookmarks, function(bookmark) {
                return bookmark.id === id;
            }), 
            function(bookmark) {
                if (!!bookmark.children && bookmark.children.length > 0) {
                    bookmark.children = recursiveDelete(bookmark.children, id);
                }
            
                return bookmark;
            }
        );
    };
                            
    var recursiveUpdate = function(bookmarks, updatedBookmark) {
        return _.map(
            bookmarks, 
            function(bookmark) {
                if (bookmark.id === updatedBookmark.id) {
                    bookmark.title = updatedBookmark.title;
                    bookmark.url = updatedBookmark.url;
                    bookmark.description = updatedBookmark.description;
                    bookmark.tags = updatedBookmark.tags;
                }
                
                if (!!bookmark.children && bookmark.children.length > 0) {
                    bookmark.children = recursiveUpdate(bookmark.children, updatedBookmark);
                }
            
                return bookmark;
            }
        );
    };

    var removeEmptyContainers = function(bookmarks) {
        var otherContainer = getOtherContainer(bookmarks, false);
        var toolbarContainer = getToolbarContainer(bookmarks, false);
        var xbsContainer = getXBrowserSyncContainer(bookmarks, false);
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

        return _.difference(bookmarks, removeArr);
    };

    var cleanWords = function (wordsToClean) {
        if (!wordsToClean) {
            return;
        }

        var cleanWords = wordsToClean.toLowerCase().replace(/['"]/g, '');
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
                        if (!!bookmarkWord && bookmarkWord.toLowerCase().indexOf(keyword.toLowerCase()) === 0) { count++; } 
                    }); 
                    
                    return count; 
                });
                
                // Check all keywords match
                if (_.isUndefined(_.find(scores, function(score) { return score === 0; }))) {
                    // Calculate score
                    var score = _.reduce(scores, function(memo, num) { return memo + num; }, 0);
                        
                    // Add result
                    var result = _.clone(bookmark);
                    result.score = score;
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
                    if (!!bookmark.title) {
                        // Add all words from title
                        bookmarkWords = bookmarkWords.concat(_.compact(bookmark.title.replace("'", '').toLowerCase().split(/[\W_]/)));
                    }

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
                        bookmarkWords.push((!!hostMatch[2]) ? hostMatch[2] + hostMatch[3] : hostMatch[3]);
                        if (!!hostMatch[2]) {
                            bookmarkWords.push(hostMatch[3]);
                        }
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
        
        // Get next queued sync (process syncs in order)
        var currentSync = syncQueue.shift();
        
        // Queue is empty, return
        if (!currentSync) {
            if (!!deferredToResolve) {
                deferredToResolve.resolve();
            }

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
                deferredToResolve.resolve(currentSync.initialSyncFailed);

                // If there are items in the queue call sync
                if (syncQueue.length > 0) {
                    $timeout(sync);
                }
            })
            .catch(function (err) {
                // If ID was removed disable sync
                if (!!globals.SyncEnabled.Get() && err.code === globals.ErrorCodes.NoDataFound) {
                    err.code = globals.ErrorCodes.IdRemoved;
                    globals.SyncEnabled.Set(false);
                }
                
                // Handle network error
                if (!!globals.Network.Disconnected.Get()) {
                    // If the user was committing an update add failed sync back to beginning of queue and 
                    // return specific error code
                    if (currentSync.type !== globals.SyncType.Pull) {
                        currentSync.initialSyncFailed = true;
                        syncQueue.unshift(currentSync);
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
		if (!globals.Password.Get() || !globals.Id.Get()) {
			globals.SyncEnabled.Set(false);
            return $q.reject({ code: globals.ErrorCodes.MissingClientData });
		}
        
        var syncPromise, bookmarks, bookmarksToUpdate, xbsContainer;
        
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
		                    xbsContainer = getXBrowserSyncContainer(bookmarksToUpdate, true);
                            
                            // Add new id to new bookmark
                            var newBookmark = syncData.changeInfo.bookmark;
                            newBookmark.id = getNewBookmarkId(bookmarksToUpdate);

                            // Remove unwanted properties
                            if (!!newBookmark.class) { delete newBookmark.class; }
                            
                            // Add new bookmark to xBrowserSync group
                            xbsContainer.children.push(newBookmark);
                            
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

                            var bookmarkToUpdate = syncData.changeInfo.bookmark;

                            // Remove unwanted properties
                            if (!!bookmarkToUpdate.class) { delete bookmarkToUpdate.class; }
                            
                            // Update bookmark
                            bookmarksToUpdate = recursiveUpdate(bookmarksToUpdate, bookmarkToUpdate);
                            
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
                            bookmarksToUpdate = recursiveDelete(bookmarksToUpdate, syncData.changeInfo.id);
                            
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
		if (!globals.Password.Get() || !globals.Id.Get()) {
			globals.SyncEnabled.Set(false);
            return $q.reject({ code: globals.ErrorCodes.MissingClientData });
		}
        
        // Get synced bookmarks
        return api.GetBookmarks()
            .then(function(data) {
                if (!data || !data.lastUpdated) {
                    return $q.reject({ code: globals.ErrorCodes.NoDataFound });
                }

                lastUpdated = data.lastUpdated;
                
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

                // If bookmarks don't have unique ids, add new ids and re-sync
                var hasUniqueIds = checkBookmarksHaveUniqueIds(bookmarks);
                if (!hasUniqueIds) {
                    return platform.Bookmarks.AddIds(bookmarks)
                        .then(function(updatedBookmarks) {
                            queueSync({ 
                                bookmarks: updatedBookmarks, 
                                type: globals.SyncType.Both 
                            });

                            return updatedBookmarks;
                        });
                }
                
                return bookmarks;
            })
            .then(function(bookmarks) {
                // Refresh bookmarks cache
                refreshCachedBookmarks(bookmarks);
                
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
            if (!globals.Password.Get()) {
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
            if (!globals.Password.Get() || !globals.Id.Get()) {
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
		
	var self = {
        CheckBookmarksHaveUniqueIds: checkBookmarksHaveUniqueIds,
        CheckForUpdates: checkForUpdates,
        Each: eachBookmark,
		Export: exportBookmarks,
        GetLookahead: getLookahead,
        GetNewBookmarkId: getNewBookmarkId,
        GetOtherContainer: getOtherContainer,
        GetToolbarContainer: getToolbarContainer,
		GetXBrowserSyncContainer: getXBrowserSyncContainer,
        IncludesCurrentPage: isCurrentPageABookmark,
		IsBookmarkContainer: isBookmarkContainer,
        RefreshCache: refreshCachedBookmarks,
        Search: searchBookmarks,
        Set: setBookmarks,
		Sync: queueSync,
        SyncSize: getSyncSize,
        XBookmark: xBookmark
	};
    return self;
};