var xBrowserSync = xBrowserSync || {};
xBrowserSync.App = xBrowserSync.App || {};

/* ------------------------------------------------------------------------------------
 * Class name:	xBrowserSync.App.Bookmarks
 * Description:	Responsible for handling bookmark data.
 * ------------------------------------------------------------------------------------ */

xBrowserSync.App.Bookmarks = function($q, $timeout, platform, globals, api, utility) { 
    'use strict';
    
    var moduleName = 'xBrowserSync.App.Bookmarks', syncQueue = [], initialSyncFailedRetrySuccess = false, syncedBookmarks;

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
                    return utility.DecryptData(data.bookmarks);
                })
                .then(function(decryptedData) {
                    var bookmarks = JSON.parse(decryptedData);
                    
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
	
	var getContainer = function(containerName, bookmarks, createIfNotPresent) {
        var container = _.findWhere(bookmarks, { title: containerName });

        // If container does not exist, create it if specified
        if (!container && !!createIfNotPresent) {
            container = new xBookmark(containerName);
            container.id = getNewBookmarkId(bookmarks);
            bookmarks.push(container);
        }

        return container;
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
            // Get cached bookmarks
            getBookmarks = getCachedBookmarks(canceller);
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
                    moduleName, 'getLookahead', globals.LogType.Warning,
                    err.stack);
                
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

    var getSyncSize = function() {
        return getCachedBookmarks()
            .then(function() {
                // Return size in bytes of cached encrypted bookmarks
                var encryptedBookmarks = globals.Cache.Bookmarks.Get();
                var sizeInBytes = (new TextEncoder('utf-8')).encode(encryptedBookmarks).byteLength;
                return sizeInBytes;
            });
    };

    var isBookmarkContainer = function(bookmark) {
		return (bookmark.title === globals.Bookmarks.MenuContainerName ||
				bookmark.title === globals.Bookmarks.MobileContainerName ||
				bookmark.title === globals.Bookmarks.OtherContainerName ||
				bookmark.title === globals.Bookmarks.ToolbarContainerName ||
				bookmark.title === globals.Bookmarks.UnfiledContainerName);
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
    
    var searchBookmarks = function(query) {
        if (!query) {
            query = { keywords: [] };
        }

        // Get cached bookmarks
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

    var updateCache = function(bookmarks, encryptedBookmarks) {
        if (bookmarks) {
            // Clear cached decrypted bookmarks
            syncedBookmarks = bookmarks;
        }
        
        if (encryptedBookmarks) {
            // Updated cache with new encrypted bookmarks
            globals.Cache.Bookmarks.Set(encryptedBookmarks);
        }
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
    
    var getCachedBookmarks = function(canceller) {
        var encryptedBookmarks, getEncryptedBookmarks;
        
        if (syncedBookmarks) {
            return $q.resolve(syncedBookmarks);
        }
        
        // Check current cached encrypted bookmarks
        if (globals.Cache.Bookmarks.Get()) {
            getEncryptedBookmarks = $q.resolve(globals.Cache.Bookmarks.Get());
        }
        else {
            // Get synced bookmarks
            getEncryptedBookmarks = api.GetBookmarks(canceller)
                .then(function(data) {
                    if (!data || !data.lastUpdated) {
                        return $q.reject({ code: globals.ErrorCodes.NoDataFound });
                    }

                    return data.bookmarks;
                });
        }

        // Decrypt bookmarks
        return getEncryptedBookmarks
            .then(function(data) {
                encryptedBookmarks = data;
                return utility.DecryptData(encryptedBookmarks);
            })
            .then(function(decryptedBookmarks) {
                // Update cache and return decrypted bookmarks
                var bookmarks = decryptedBookmarks ? JSON.parse(decryptedBookmarks) : [];
                updateCache(bookmarks, encryptedBookmarks);
                syncedBookmarks = bookmarks;
                return bookmarks;
            })
            .catch(function(err) {
                // Log error
                utility.LogMessage(
                    moduleName, 'getCachedBookmarks', globals.LogType.Warning,
                    'Error decrypting bookmarks; ' + err.stack);
                
                return $q.reject({ code: globals.ErrorCodes.InvalidData });
            });
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
        var menuContainer = getContainer(globals.Bookmarks.MenuContainerName, bookmarks);
        var mobileContainer = getContainer(globals.Bookmarks.MobileContainerName, bookmarks);
        var otherContainer = getContainer(globals.Bookmarks.OtherContainerName, bookmarks);
        var toolbarContainer = getContainer(globals.Bookmarks.ToolbarContainerName, bookmarks);
        var unfiledContainer = getContainer(globals.Bookmarks.UnfiledContainerName, bookmarks);
        var removeArr = [];

        if (!!menuContainer && (!menuContainer.children || menuContainer.children.length === 0)) {
            removeArr.push(menuContainer);
        }

        if (!!mobileContainer && (!mobileContainer.children || mobileContainer.children.length === 0)) {
            removeArr.push(mobileContainer);
        }

        if (!!otherContainer && (!otherContainer.children || otherContainer.children.length === 0)) {
            removeArr.push(otherContainer);
        }

        if (!!toolbarContainer && (!toolbarContainer.children || toolbarContainer.children.length === 0)) {
            removeArr.push(toolbarContainer);
        }

        if (!!unfiledContainer && (!unfiledContainer.children || unfiledContainer.children.length === 0)) {
            removeArr.push(unfiledContainer);
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
            // Upgrade sync to current version
            case globals.SyncType.Upgrade:
                globals.DisableEventListeners.Set(true);
                syncPromise = sync_handleUpgrade(currentSync);
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
            .then(function(bookmarks) {
                // Sync next item in the queue otherwise resolve the deferred
                if (syncQueue.length > 0) {
                    initialSyncFailedRetrySuccess = (!initialSyncFailedRetrySuccess && !!currentSync.initialSyncFailed) ? true : initialSyncFailedRetrySuccess;
                    $timeout(function() { sync(deferredToResolve); });
                }
                else {
                    deferredToResolve.resolve(bookmarks, initialSyncFailedRetrySuccess);
                    initialSyncFailedRetrySuccess = false;
                }
            })
            .catch(function(err) {
                // If error occurred whilst creating new sync, remove cached sync ID and password
                if (currentSync.type === globals.SyncType.Push && !currentSync.changeInfo) {
                    globals.Id.Set(null);
                    globals.Password.Set(null);
                }

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
            .finally(function() {
                globals.IsSyncing.Set(false);
                globals.DisableEventListeners.Set(false);
            });
	};
    
    var sync_handleBoth = function(syncData) {
        var bookmarks, syncPromise, unfiledContainer;

        // Check secret and bookmarks ID are present
		if (!globals.Password.Get() || !globals.Id.Get()) {
			globals.SyncEnabled.Set(false);
            return $q.reject({ code: globals.ErrorCodes.MissingClientData });
		}
        
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
                            return utility.DecryptData(data.bookmarks);
                        })
                        .then(function(decryptedData) {
                            var bookmarksToUpdate = JSON.parse(decryptedData);
                            
                            // Get unfiled container
		                    unfiledContainer = getContainer(globals.Bookmarks.UnfiledContainerName, bookmarksToUpdate, true);
                            
                            // Add new id to new bookmark
                            var newBookmark = syncData.changeInfo.bookmark;
                            newBookmark.id = getNewBookmarkId(bookmarksToUpdate);
                            
                            // Add new bookmark to unfiled container
                            unfiledContainer.children.push(newBookmark);
                            
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
                            
                            // Decrypt bookmarks
                            return utility.DecryptData(data.bookmarks);
                        })
                        .then(function(decryptedData) {
                            var bookmarksToUpdate = JSON.parse(decryptedData);
                            var bookmarkToUpdate = syncData.changeInfo.bookmark;
                            
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
                            
                            // Decrypt bookmarks
                            return utility.DecryptData(data.bookmarks);
                        })
                        .then(function(decryptedData) {
                            var bookmarksToUpdate = JSON.parse(decryptedData);
                            
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
            .then(function(result) {
                // Remove empty containers then encrypt
                bookmarks = removeEmptyContainers(result || []);
                return utility.EncryptData(JSON.stringify(bookmarks));
            })
            .then(function(encryptedBookmarks) {
                // Update cached bookmarks
                updateCache(bookmarks, encryptedBookmarks);

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
                
                // Update cached last updated date
                globals.LastUpdated.Set(data[0].lastUpdated);

                // Return decrypted bookmarks
                return bookmarks;
            });
    };
    
    var sync_handlePull = function(syncData) {
        var bookmarks, encryptedBookmarks, lastUpdated, syncVersion;
        
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

                encryptedBookmarks = data.bookmarks;
                lastUpdated = data.lastUpdated;
                
                // Decrypt bookmarks
                return utility.DecryptData(data.bookmarks);
            })
            .then(function(decryptedData) {
                bookmarks = JSON.parse(decryptedData);

                // If bookmarks don't have unique ids, add new ids and re-sync
                var hasUniqueIds = checkBookmarksHaveUniqueIds(bookmarks);
                if (!hasUniqueIds) {
                    return platform.Bookmarks.AddIds(bookmarks)
                        .then(function(updatedBookmarks) {
                            // TODO: Test waiting for this extra sync
                            return queueSync({ 
                                bookmarks: updatedBookmarks, 
                                type: globals.SyncType.Both 
                            });
                        });
                }
                else {
                    // Update cached bookmarks and return
                    updateCache(bookmarks, encryptedBookmarks);
                }
            })
            .then(function() {
                // Update browser bookmarks
                return setBookmarks(bookmarks);
            })
            .then(function() {
                // Update cached last updated date
                globals.LastUpdated.Set(lastUpdated);

                // Return decrypted bookmarks
                return bookmarks;
            });
    };
    
    var sync_handlePush = function(syncData) {
        var bookmarks, getBookmarks;
        
        // Check secret and sync ID are present
        if (!globals.Password.Get() || !globals.Id.Get()) {
            globals.SyncEnabled.Set(false);
            return $q.reject({ code: globals.ErrorCodes.MissingClientData });
        }
        
        if (!syncData.changeInfo) {
            // New sync, get local bookmarks
            getBookmarks = platform.Bookmarks.Get();
        }
        else {
            // Check sync is enabled
            if (!globals.SyncEnabled.Get()) {
                return $q.resolve();
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
                    return utility.DecryptData(data.bookmarks);
                })
                .then(function(decryptedData) {
                    var bookmarks = JSON.parse(decryptedData);
            
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
            .then(function(result) {
                // Remove empty containers then encrypt
                bookmarks = removeEmptyContainers(result || []);
                return utility.EncryptData(JSON.stringify(bookmarks));
            })
            .then(function(encryptedBookmarks) {                
                // Update cached bookmarks and synced bookmarks
                updateCache(bookmarks, encryptedBookmarks);
                return api.UpdateBookmarks(encryptedBookmarks);
            })
            .then(function(data) {
                if (!data.lastUpdated) {
                    return $q.reject({ code: globals.ErrorCodes.NoDataFound });
                }
            
                // Update cached last updated date
                globals.LastUpdated.Set(data.lastUpdated);

                // Return decrypted bookmarks
                return bookmarks;
            });
    };
    
    var sync_handleUpgrade = function(syncData) {
        var bookmarks;
        
        // Check secret and sync ID are present
        if (!globals.Password.Get() || !globals.Id.Get()) {
            globals.SyncEnabled.Set(false);
            return $q.reject({ code: globals.ErrorCodes.MissingClientData });
        }
            
        // Get synced bookmarks and decrypt
        return api.GetBookmarks()
            .then(function(data) {
                if (!data) {
                    return $q.reject({ code: globals.ErrorCodes.NoDataFound });
                }

                // Decrypt bookmarks
                return utility.DecryptData(data.bookmarks);
            })
            .then(function(decryptedData) {
                bookmarks = decryptedData ? JSON.parse(decryptedData) : null;

                // Upgrade containers to use current container names
                bookmarks = upgradeContainers(bookmarks || []);

                // Set the sync version to the current app version
                globals.SyncVersion.Set(globals.AppVersion);

                // Generate a new password hash from the old clear text password and sync ID
                return utility.GetPasswordHash(globals.Password.Get(), globals.Id.Get());
            })
            .then(function(passwordHash) {
                // Cache the new password hash and encrypt the data
                globals.Password.Set(passwordHash);

                return utility.EncryptData(JSON.stringify(bookmarks));
            })
            .then(function(encryptedBookmarks) {                
                // Update cached bookmarks, synced bookmarks and sync version
                updateCache(bookmarks, encryptedBookmarks);
                return api.UpdateBookmarks(encryptedBookmarks, true);
            })
            .then(function(data) {
                if (!data.lastUpdated) {
                    return $q.reject({ code: globals.ErrorCodes.NoDataFound });
                }
            
                // Update cached last updated date
                globals.LastUpdated.Set(data.lastUpdated);
            });
    };

    var upgradeContainers = function(bookmarks) {
        // Upgrade containers to use current container names
        var otherContainer = getContainer(globals.Bookmarks.OtherContainerNameOld, bookmarks);
        if (otherContainer) {
            otherContainer.title = globals.Bookmarks.OtherContainerName;
        }
        
        var toolbarContainer = getContainer(globals.Bookmarks.ToolbarContainerNameOld, bookmarks);
        if (toolbarContainer) {
            toolbarContainer.title = globals.Bookmarks.ToolbarContainerName;
        }

        var unfiledContainer = getContainer(globals.Bookmarks.UnfiledContainerNameOld, bookmarks);
        if (unfiledContainer) {
            unfiledContainer.title = globals.Bookmarks.UnfiledContainerName;
        }

        // Remove empty containers
        bookmarks = removeEmptyContainers(bookmarks);

        return bookmarks;
    }
		
	var self = {
        CheckBookmarksHaveUniqueIds: checkBookmarksHaveUniqueIds,
        CheckForUpdates: checkForUpdates,
        Each: eachBookmark,
		Export: exportBookmarks,
        GetContainer: getContainer,
        GetLookahead: getLookahead,
        GetNewBookmarkId: getNewBookmarkId,
        IncludesCurrentPage: isCurrentPageABookmark,
		IsBookmarkContainer: isBookmarkContainer,
        Search: searchBookmarks,
        Set: setBookmarks,
		Sync: queueSync,
        SyncSize: getSyncSize,
        UpdateCache: updateCache,
        UpgradeContainers: upgradeContainers,
        XBookmark: xBookmark
	};
    return self;
};