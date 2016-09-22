var xBrowserSync = xBrowserSync || {};
xBrowserSync.App = xBrowserSync.App || {};

/* ------------------------------------------------------------------------------------
 * Class name:	xBrowserSync.App.Bookmarks
 * Description:	Responsible for handling bookmark data.
 * ------------------------------------------------------------------------------------ */

xBrowserSync.App.Bookmarks = function($q, platform, global, api, utility) { 
    'use strict';
    
    var syncQueue = [];

/* ------------------------------------------------------------------------------------
 * Public functions
 * ------------------------------------------------------------------------------------ */
 
	var checkForUpdates = function() {
		// Exit if sync is in progress
		if (global.IsSyncing.Get()) {
            return $q.resolve();
		}
        
        // Check if bookmarks have been updated
		return api.GetBookmarksLastUpdated()
            .then(function(data) {
				if (!data || !data.lastUpdated) {
					return $q.reject({ code: global.ErrorCodes.NoDataFound });
				}
				
				var lastUpdated = new Date(data.lastUpdated);
				
				// If last updated is different the date in local storage, refresh bookmarks
				if (!global.LastUpdated.Get() || global.LastUpdated.Get().getTime() !== lastUpdated.getTime()) {
					// Run sync
                    return queueSync({ type: global.SyncType.Pull });
				}
			});
	};
	
	var exportBookmarks = function() {
        // If sync is not enabled, export local browser data
        if (!global.SyncEnabled.Get()) {
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
                        return $q.reject({ code: global.ErrorCodes.NoDataFound });
                    }
                    
                    // Decrypt bookmarks
                    var bookmarks;
                    try {
                        bookmarks = JSON.parse(utility.DecryptData(data.bookmarks));
                    }
                    catch (err) { 
                        return $q.reject({ code: global.ErrorCodes.InvalidData });
                    }
                    
                    var exportData = {
                        xBrowserSync: { 
                            id: global.Id.Get(),
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
    
    var getLookahead = function(word, bookmarks, tagsOnly) {
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
            getBookmarks = getCachedBookmarks();
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
                deferred.reject(err);
            });
        
        return deferred.promise;
    };
	
	var queueSync = function(syncData) {
        syncData.deferred = $q.defer();
        
        // Add sync to queue
        syncQueue.push(syncData);
        
        // Trigger sync
        sync();
        
        return syncData.deferred.promise;
    };
	
	var refreshCachedBookmarks = function(bookmarks) {
        // Clear cache
        global.Cache.Bookmarks.Set(null);
        
        // Refresh cache with latest sync data
        return getCachedBookmarks(bookmarks);
    };
    
    var searchBookmarks = function(query) {
        var keywords, url, results;
        
        if (!query) {
            return $q.resolve();
        }
        
        // Get keywords array from query
        keywords = (!!query.keywords) ? 
            _.compact(query.keywords.trim().replace("'", '').replace(/\W$/, '').toLowerCase().split(/\s/)) : null;
        
        // Get url from query
        url = (!!query.url) ? query.url : null;

        // Get cached synced bookmarks
        return getCachedBookmarks()
            .then(function(bookmarks) {
                switch (true) {
                    case (!!url):
                        // Get search results from url
                        results = searchBookmarksByUrl(bookmarks, url) || [];
                        if (!Array.isArray(results)) {
                            results = [results];
                        }
                        break;
                    case (!!keywords):
                        // Get search results from keywords and sort
                        results = _.sortBy(searchBookmarksByKeywords(bookmarks, keywords), 'score').reverse();
                        break;
                }
                
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
    
    var getCachedBookmarks = function(bookmarks) {
            var getBookmarks;
            
            if (!bookmarks) {
                // Get cached bookmarks
                bookmarks = global.Cache.Bookmarks.Get(); 
                
                if (!!bookmarks) {
                    // Return cached bookmarks
                    return $q.resolve(bookmarks);
                }

                // Get synced bookmarks
                getBookmarks = api.GetBookmarks()
                    .then(function(data) {
                        if (!data || !data.lastUpdated) {
                            return $q.reject({ code: global.ErrorCodes.NoDataFound });
                        }
                        
                        // Decrypt bookmarks
                        try {
                            bookmarks = JSON.parse(utility.DecryptData(data.bookmarks));
                            return bookmarks;
                        }
                        catch (err) { 
                            return $q.reject({ code: global.ErrorCodes.InvalidData });
                        }
                    });
            }
            else {
                getBookmarks = $q.resolve(bookmarks);
            }
            
            // If cache is empty, get synced bookmarks
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
                    
                    // Update cache
                    global.Cache.Bookmarks.Set(bookmarks);
                    
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
                bookmarkWords = bookmarkWords.concat(_.compact(bookmark.title.replace("'", '').toLowerCase().split(/\s/)));
                bookmarkWords = bookmarkWords.concat(_.compact(bookmark.url.replace("'", '').toLowerCase().split(/\s/)));
                if (!!bookmark.description) { bookmarkWords = bookmarkWords.concat(_.compact(bookmark.description.toLowerCase().split(/\s/))); }
                if (!!bookmark.tags) { bookmarkWords = bookmarkWords.concat(_.compact(bookmark.tags)); }
                
                // Get match scores for each keyword against bookmark words
                var scores = _.map(keywords, function(keyword) { 
                    var count = 0; 
                    
                    _.each(bookmarkWords, function(bookmarkWord) { 
                        if (bookmarkWord.indexOf(keyword) >= 0) { count++; } 
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
            
            return bookmark.url.indexOf(url) >= 0;
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
                                return tag.split(/\s/);
                            })
                            .flatten()
                            .compact()
                            .value();

                        bookmarkWords = bookmarkWords.concat(tags);
                    }

                    // Add url host
                    var hostMatch = bookmark.url.match(/^(https?:\/\/)?([^\/]+)/);
                    if (!!hostMatch && hostMatch.length > 2) {
                        bookmarkWords.push(hostMatch[2]);
                    }
                }
                else {
                    if (!!bookmark.tags) { 
                        bookmarkWords = bookmarkWords.concat(_.compact(bookmark.tags)); 
                    }
                }
                
                // Find all words that begin with lookahead word
                results = results.concat(_.filter(bookmarkWords, function(bookmark) { return bookmark.startsWith(word); }));
            }
        });
        
        return results;
    };
    
    var sync = function() {		
        // If a sync is in progress, retry later
		if (global.IsSyncing.Get()) {
			setTimeout(function() { sync(); }, global.RetrySyncTimeout);
			return;
		}
        
        // Get next queued sync
        var currentSync = syncQueue.shift();
        
        // Queue is empty, return
        if (!currentSync) {
            return;
        }
        
        global.IsSyncing.Set(true);
        
        var syncPromise;
        
        // Process sync
        switch(currentSync.type) {
            // Push bookmarks to xBrowserSync service
            case global.SyncType.Push:
                syncPromise = sync_handlePush(currentSync);
                break;
            // Overwrite local bookmarks
            case global.SyncType.Pull:
                global.DisableEventListeners.Set(true);
                syncPromise = sync_handlePull(currentSync);
                break;
            // Sync to service and overwrite local bookmarks
            case global.SyncType.Both:
                global.DisableEventListeners.Set(true);
                syncPromise = sync_handleBoth(currentSync);
                break;
            // Ambiguous sync
            default:
                syncPromise = $q.reject({ code: global.ErrorCodes.AmbiguousSyncRequest });
                break;
        }
        
        syncPromise
            // Resolve original sync deferred
            .then(currentSync.deferred.resolve)
            .catch(currentSync.deferred.reject)
            .finally(function () {
                global.IsSyncing.Set(false);
                global.DisableEventListeners.Set(false);
            });
	};
    
    var sync_handleBoth = function(syncData) {
        // Check secret and bookmarks ID are present
		if (!global.ClientSecret.Get() || !global.Id.Get()) {
			global.SyncEnabled.Set(false);
            return $q.reject({ code: global.ErrorCodes.MissingClientData });
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
                case global.UpdateType.Create:
                    syncPromise = api.GetBookmarks()
                        .then(function(data) {
                            if (!data || !data.lastUpdated) {
                                return $q.reject({ code: global.ErrorCodes.NoDataFound });
                            }

                            // Check if data is out of sync
                            var lastUpdated = new Date(data.lastUpdated);
                            if (global.LastUpdated.Get().getTime() !== lastUpdated.getTime()) {
                                return $q.reject({ code: global.ErrorCodes.DataOutOfSync });
                            }
                            
                            var bookmarksToUpdate;
                            
                            // Decrypt bookmarks
                            try {
                                bookmarksToUpdate = JSON.parse(utility.DecryptData(data.bookmarks));
                            }
                            catch (err) { 
                                return $q.reject({ code: global.ErrorCodes.InvalidData });
                            }
                            
                            // Get xBrowserSync group
		                    var xbsContainer = utility.GetXBrowserSyncContainer(bookmarksToUpdate, true);
                            
                            // Add new bookmark to xBrowserSync group
                            xbsContainer.children.push(syncData.changeInfo.bookmark);
                            
                            return bookmarksToUpdate;
                        });
                    break;
                // Update bookmark
                case global.UpdateType.Update:
                    syncPromise = api.GetBookmarks()
                        .then(function(data) {
                            if (!data || !data.lastUpdated) {
                                return $q.reject({ code: global.ErrorCodes.NoDataFound });
                            }

                            // Check if data is out of sync
                            var lastUpdated = new Date(data.lastUpdated);
                            if (global.LastUpdated.Get().getTime() !== lastUpdated.getTime()) {
                                return $q.reject({ code: global.ErrorCodes.DataOutOfSync });
                            }
                            
                            var bookmarksToUpdate;
                            
                            // Decrypt bookmarks
                            try {
                                bookmarksToUpdate = JSON.parse(utility.DecryptData(data.bookmarks));
                            }
                            catch (err) { 
                                return $q.reject({ code: global.ErrorCodes.InvalidData });
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
                case global.UpdateType.Delete:
                    syncPromise = api.GetBookmarks()
                        .then(function(data) {
                            if (!data || !data.lastUpdated) {
                                return $q.reject({ code: global.ErrorCodes.NoDataFound });
                            }

                            // Check if data is out of sync
                            var lastUpdated = new Date(data.lastUpdated);
                            if (global.LastUpdated.Get().getTime() !== lastUpdated.getTime()) {
                                return $q.reject({ code: global.ErrorCodes.DataOutOfSync });
                            }
                            
                            var bookmarksToUpdate;
                            
                            // Decrypt bookmarks
                            try {
                                bookmarksToUpdate = JSON.parse(utility.DecryptData(data.bookmarks));
                            }
                            catch (err) { 
                                return $q.reject({ code: global.ErrorCodes.InvalidData });
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
                    syncPromise = $q.reject({ code: global.ErrorCodes.AmbiguousSyncRequest });
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
                    return $q.reject({ code: global.ErrorCodes.NoDataFound });
                }
                
                global.LastUpdated.Set(data[0].lastUpdated);
                
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
		if (!global.ClientSecret.Get() || !global.Id.Get()) {
			global.SyncEnabled.Set(false);
            return $q.reject({ code: global.ErrorCodes.MissingClientData });
		}
        
        // Get synced bookmarks
        return api.GetBookmarks()
            .then(function(data) {
                if (!data || !data.lastUpdated) {
                    return $q.reject({ code: global.ErrorCodes.NoDataFound });
                }
                
                // Decrypt bookmarks
                try {
                    bookmarks = JSON.parse(utility.DecryptData(data.bookmarks));
                }
                catch (err) { 
                    return $q.reject({ code: global.ErrorCodes.InvalidData });
                }

                // Refresh bookmarks cache
                refreshCachedBookmarks(bookmarks);
                lastUpdated = data.lastUpdated;
                
                // Update browser bookmarks
                return setBookmarks(bookmarks);
            })
            .then(function() {
                global.LastUpdated.Set(lastUpdated);
                return bookmarks;
            });
    };
    
    var sync_handlePush = function(syncData) {
        // Get bookmarks to sync
        var getBookmarks, bookmarks;
        
        if (!syncData.changeInfo) {
            // Check secret is present
            if (!global.ClientSecret.Get()) {
                global.SyncEnabled.Set(false);
                return $q.reject({ code: global.ErrorCodes.MissingClientData });
            }
            
            // New sync, get local bookmarks
            getBookmarks = platform.Bookmarks.Get();
        }
        else {
            // Check sync is enabled
            if (!global.SyncEnabled.Get()) {
                return $q.resolve();
            }

            // Check secret and bookmarks ID are present
            if (!global.ClientSecret.Get() || !global.Id.Get()) {
                global.SyncEnabled.Set(false);
                return $q.reject({ code: global.ErrorCodes.MissingClientData });
            }
            
            // Get synced bookmarks and decrypt
            getBookmarks = api.GetBookmarks()
                .then(function(data) {
                    if (!data || !data.lastUpdated) {
                        return $q.reject({ code: global.ErrorCodes.NoDataFound });
                    }

                    // Check if data is out of sync
                    var lastUpdated = new Date(data.lastUpdated);
                    if (global.LastUpdated.Get().getTime() !== lastUpdated.getTime()) {
                        return $q.reject({ code: global.ErrorCodes.DataOutOfSync });
                    }
                    
                    // Decrypt bookmarks
                    try {
                        bookmarks = JSON.parse(utility.DecryptData(data.bookmarks));
                    }
                    catch (err) { 
                        return $q.reject({ code: global.ErrorCodes.InvalidData });
                    }
            
                    // Handle local updates
                    switch(syncData.changeInfo.type) {
                        // Create bookmark
                        case global.UpdateType.Create:
                            return platform.Bookmarks.Created(bookmarks, syncData.changeInfo.data)
                                .then(function(results) {
                                    return results.bookmarks;
                                });
                        // Delete bookmark
                        case global.UpdateType.Delete:
                            return platform.Bookmarks.Deleted(bookmarks, syncData.changeInfo.data)
                                .then(function(results) {
                                    return results.bookmarks;
                                });
                        // Update bookmark
                        case global.UpdateType.Update:
                            return platform.Bookmarks.Updated(bookmarks, syncData.changeInfo.data)
                                .then(function(results) {
                                    return results.bookmarks;
                                });
                        // Move bookmark
                        case global.UpdateType.Move:
                            return platform.Bookmarks.Moved(bookmarks, syncData.changeInfo.data)
                                .then(function(results) {
                                    return results.bookmarks;
                                });
                        // Ambiguous sync
                        default:
                            return $q.reject({ code: global.ErrorCodes.AmbiguousSyncRequest });
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
                        return reject({ code: global.ErrorCodes.NoDataFound });
                    }
                
                    global.Id.Set(data.id);
                    global.LastUpdated.Set(data.lastUpdated);
                    
                    return bookmarks;
                }
                else {
                    if (!data.lastUpdated) {
                        return reject({ code: global.ErrorCodes.NoDataFound });
                    }
                
                    global.LastUpdated.Set(data.lastUpdated);
                    
                    return bookmarks;
                }
            });
    };
		
	return {
        CheckForUpdates: checkForUpdates,
		Export: exportBookmarks,
		Import: importBookmarks,
        GetLookahead: getLookahead,
        RefreshCache: refreshCachedBookmarks,
        Search: searchBookmarks,
        Set: setBookmarks,
		Sync: queueSync
	};
};