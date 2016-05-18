var xBrowserSync = xBrowserSync || {};
xBrowserSync.App = xBrowserSync.App || {};

/* ------------------------------------------------------------------------------------
 * Class name:  xBrowserSync.App.PlatformImplementation 
 * Description: Implements xBrowserSync.App.Platform.
 * ------------------------------------------------------------------------------------ */

xBrowserSync.App.PlatformImplementation = function($q, $timeout, platform, global, utility) {
	'use strict';
	
/* ------------------------------------------------------------------------------------
 * Constructor
 * ------------------------------------------------------------------------------------ */
    
	var ChromeImplementation = function() {
		// Inject required platform implementation functions
		platform.AsyncChannel.Get = getAsyncChannel; 
		platform.Bookmarks.Clear = clearBookmarks;
        platform.Bookmarks.ContainsCurrentPage = containsCurrentPage;
		platform.Bookmarks.Created = bookmarksCreated;
		platform.Bookmarks.Deleted = bookmarksDeleted;
		platform.Bookmarks.Get = getBookmarks;
		platform.Bookmarks.Moved = bookmarksMoved;
		platform.Bookmarks.Populate = populateBookmarks;
		platform.Bookmarks.Updated = bookmarksUpdated;
		platform.Constants.Get = getConstant;
        platform.CurrentUrl.Get = getCurrentUrl;
        platform.Interface.Refresh = refreshInterface;
		platform.LocalStorage.Get = getFromLocalStorage;
		platform.LocalStorage.Set = setInLocalStorage;
		platform.PageMetadata.Get = getPageMetadata;
		platform.Sync = sync;
        
        // Refresh browser action icon on reload
        refreshInterface();
	};


/* ------------------------------------------------------------------------------------
 * Public functions
 * ------------------------------------------------------------------------------------ */
	
	var bookmarksCreated = function(syncedBookmarks, args) {
		var id = args[0];
		var createInfo = args[1];
		var createdLocalBookmarkParent, bookmarksBar, possibleParents;
		var deferred = $q.defer();
		
		var title = createInfo.title;
		var url = (!!createInfo.url) ? createInfo.url : null;
		var newBookmark = new utility.Bookmark(title, url);
		
		// Get created local bookmark's parent
		getLocalBookmark(createInfo.parentId)
			.then(function(bookmark) {
				createdLocalBookmarkParent = bookmark;
				
				// Check if in Bookmarks bar
				return isLocalBookmarkInBookmarksBar(createdLocalBookmarkParent);
			})
			.then(function(inBookmarksBar) {
				if (inBookmarksBar) {
					if (!global.IncludeBookmarksBar.Get()) {
						// Not syncing Bookmarks bar, return
						return deferred.resolve(syncedBookmarks);
					}
					
					// Find synced parent bookmark in Bookmarks bar
					bookmarksBar = _.where(syncedBookmarks, { Title: getConstant(global.Constants.BookmarksBarTitle) })[0];
					
					// Create Bookmarks bar if it doesn't exist
					if (!bookmarksBar) {
						bookmarksBar = new utility.Bookmark(getConstant(global.Constants.BookmarksBarTitle));
						syncedBookmarks.push(bookmarksBar);
					}
					
					// Find parent in Bookmarks bar
					possibleParents = findSyncedBookmark([bookmarksBar], createdLocalBookmarkParent.title, createdLocalBookmarkParent.url, createdLocalBookmarkParent.index, function(bookmark) {
						// Amount of child bookmarks must be equal to index of new bookmark
						return bookmark.Children.length === createInfo.index;
					});
					
					if (!possibleParents || possibleParents.length === 0 || possibleParents.length > 1) {
						// Unable to determine parent bookmark
						return deferred.reject({ code: global.ErrorCodes.UpdatedBookmarkNotFound });
					}
					
					// Add new child bookmark
					possibleParents[0].Children.push(newBookmark);
				}
				
				// Check if parent is Other bookmarks
				else if (createInfo.parentId === '2') {
					// Add new bookmark
					syncedBookmarks.push(newBookmark);
					
					// Move Bookmarks bar to end of array
					var bookmarksBarIndex = _.findIndex(syncedBookmarks, { Title: getConstant(global.Constants.BookmarksBarTitle) });
					if (bookmarksBarIndex >= 0) {
						bookmarksBar = syncedBookmarks.splice(bookmarksBarIndex, 1);
						syncedBookmarks.push(bookmarksBar[0]);
					}
				}
				
				else {
					// Find parent in synced bookmarks
					possibleParents = findSyncedBookmark(syncedBookmarks, createdLocalBookmarkParent.title, createdLocalBookmarkParent.url, createdLocalBookmarkParent.index, function(bookmark) {
						// Amount of child bookmarks must be equal to index of new bookmark
						return bookmark.Children.length === createInfo.index;
					});
					
					if (!possibleParents || possibleParents.length === 0 || possibleParents.length > 1) {
						// Unable to determine parent bookmark
						return deferred.reject({ code: global.ErrorCodes.UpdatedBookmarkNotFound });
					}
					
					// Add new child bookmark
					possibleParents[0].Children.push(newBookmark);
				}
				
				deferred.resolve(syncedBookmarks);
			})
			.catch(deferred.reject);
		
		return deferred.promise;
	};
	
	var bookmarksDeleted = function(syncedBookmarks, args) {
		var id = args[0];
		var removeInfo = args[1];
		var deletedBookmarkIndex = removeInfo.index;
		var deletedLocalBookmarkParent, possibleParents;
		var deferred = $q.defer();
		
		// Get deleted local bookmark's parent
		getLocalBookmark(removeInfo.parentId)
			.then(function(bookmark) {
				deletedLocalBookmarkParent = bookmark;
				
				// Check if in Bookmarks bar
				return isLocalBookmarkInBookmarksBar(deletedLocalBookmarkParent);
			})
			.then(function(inBookmarksBar) {
				if (inBookmarksBar) {
					if (!global.IncludeBookmarksBar.Get()) {
						// Not syncing Bookmarks bar, return
						return deferred.resolve(syncedBookmarks);
					}
					
					// Find synced bookmark to update in Bookmarks bar
					var bookmarksBar = _.where(syncedBookmarks, { Title: getConstant(global.Constants.BookmarksBarTitle) })[0];
					
					if (!bookmarksBar || !bookmarksBar.Children || bookmarksBar.Children.length === 0) {
						// Bookmark bar doesn't exist in synced bookmarks
						return deferred.reject({ code: global.ErrorCodes.UpdatedBookmarkNotFound });
					}
					
					// Find parent in Bookmarks bar
					possibleParents = findSyncedBookmark([bookmarksBar], deletedLocalBookmarkParent.title, deletedLocalBookmarkParent.url, deletedLocalBookmarkParent.index, function(bookmark) {
						// Check that child exists at correct index and has correct properties
						return !!bookmark.Children && 
								bookmark.Children.length >= deletedBookmarkIndex + 1 &&
								(bookmark.Children[deletedBookmarkIndex].Title === removeInfo.node.title && 
								bookmark.Children[deletedBookmarkIndex].Url === removeInfo.node.url);
					});
					
					if (!possibleParents || possibleParents.length === 0 || possibleParents.length > 1) {
						// Unable to determine parent bookmark
						return deferred.reject({ code: global.ErrorCodes.UpdatedBookmarkNotFound });
					}
					
					// Remove deleted bookmark from parent
					possibleParents[0].Children.splice(deletedBookmarkIndex, 1);
				}
				
				// Check if parent is Other bookmarks
				else if (removeInfo.parentId === '2') {
					// Remove deleted bookmark from Other bookmarks
					syncedBookmarks.splice(deletedBookmarkIndex, 1);
				}
				
				else {
					// Find parent in synced bookmarks
					possibleParents = findSyncedBookmark(syncedBookmarks, deletedLocalBookmarkParent.title, deletedLocalBookmarkParent.url, deletedLocalBookmarkParent.index, function(bookmark) {
						// Check that child exists at correct index and has correct properties
						return !!bookmark.Children && 
							   bookmark.Children.length >= deletedBookmarkIndex + 1 &&
							   (bookmark.Children[deletedBookmarkIndex].Title === removeInfo.node.title && 
							   bookmark.Children[deletedBookmarkIndex].Url === removeInfo.node.url);
					});
					
					if (!possibleParents || possibleParents.length === 0 || possibleParents.length > 1) {
						// Unable to determine parent bookmark
						return deferred.reject({ code: global.ErrorCodes.UpdatedBookmarkNotFound });
					}
					
					// Remove deleted bookmark from parent
					possibleParents[0].Children.splice(deletedBookmarkIndex, 1);
				}
				
				deferred.resolve(syncedBookmarks);
			})
			.catch(deferred.reject);
		
		return deferred.promise;
	};
	
	var bookmarksMoved = function(syncedBookmarks, args) {
		var id = args[0];
		var moveInfo = args[1];
		var deferred = $q.defer();
		var getSyncedBookmarkToUpdate = $q.defer();
		var movedLocalBookmark, movedLocalBookmarkOldParent, movedLocalBookmarkNewParent, 
			syncedBookmarkToMove, possibleParents;
		
		// Get moved local bookmark
		var removeFromOldParentDelegate = getLocalBookmark(id)
			.then(function(bookmark) {
				movedLocalBookmark = bookmark;
				
				// Get moved local bookmark's old parent
				return getLocalBookmark(moveInfo.oldParentId);
			})
			.then(function(bookmark) {
				movedLocalBookmarkOldParent = bookmark;
				
				// Check if in Bookmarks bar
				return isLocalBookmarkInBookmarksBar(movedLocalBookmarkOldParent);
			})
			.then(function(inBookmarksBar) {
				if (inBookmarksBar) {
					// Find synced bookmark to update in Bookmarks bar
					var bookmarksBar = _.where(syncedBookmarks, { Title: getConstant(global.Constants.BookmarksBarTitle) })[0];
					
					if (!global.IncludeBookmarksBar.Get()) {
						// Not syncing Bookmarks bar, don't remove
						if (!bookmarksBar || !bookmarksBar.Children || bookmarksBar.Children.length === 0) {
							return;
						}
						
						return bookmarksBar.Children[moveInfo.oldIndex];
					}
					
					if (!bookmarksBar || !bookmarksBar.Children || bookmarksBar.Children.length === 0) {
						// Bookmark bar doesn't exist in synced bookmarks
						return $q.reject({ code: global.ErrorCodes.UpdatedBookmarkNotFound });
					}
					
					// Find parent in Bookmarks bar
					possibleParents = findSyncedBookmark([bookmarksBar], movedLocalBookmarkOldParent.title, movedLocalBookmarkOldParent.url, movedLocalBookmarkOldParent.index, function(bookmark) {
						// Check that child exists at correct index and has correct properties
						return !!bookmark.Children && 
							   bookmark.Children.length >= moveInfo.oldIndex + 1 &&
							   (bookmark.Children[moveInfo.oldIndex].Title === movedLocalBookmark.title && 
							   bookmark.Children[moveInfo.oldIndex].Url === movedLocalBookmark.url);
					});
					
					if (!possibleParents || possibleParents.length === 0 || possibleParents.length > 1) {
						// Unable to determine parent bookmark
						return $q.reject({ code: global.ErrorCodes.UpdatedBookmarkNotFound });
					}
					
					// Remove moved bookmark from parent
					return possibleParents[0].Children.splice(moveInfo.oldIndex, 1)[0];
				}
				
				// Check if parent is Other bookmarks
				else if (moveInfo.oldParentId === '2') {
					// Remove moved bookmark from Other bookmarks
					return syncedBookmarks.splice(moveInfo.oldIndex, 1)[0];
				}
				
				else {
					// Find parent in synced bookmarks
					possibleParents = findSyncedBookmark(syncedBookmarks, movedLocalBookmarkOldParent.title, movedLocalBookmarkOldParent.url, movedLocalBookmarkOldParent.index, function(bookmark) {
						// Check that child exists at correct index and has correct properties
						return !!bookmark.Children && 
							   bookmark.Children.length >= moveInfo.oldIndex + 1 &&
							   (bookmark.Children[moveInfo.oldIndex].Title === movedLocalBookmark.title && 
							   bookmark.Children[moveInfo.oldIndex].Url === movedLocalBookmark.url);
					});
					
					if (!possibleParents || possibleParents.length === 0 || possibleParents.length > 1) {
						// Unable to determine parent bookmark
						return $q.reject({ code: global.ErrorCodes.UpdatedBookmarkNotFound });
					}
					
					// Remove deleted bookmark from parent
					return possibleParents[0].Children.splice(moveInfo.oldIndex, 1)[0];
				}
			})
			.catch(deferred.reject);
		
		removeFromOldParentDelegate
			.then(function(bookmark) {
				if (!bookmark) {
					var title = movedLocalBookmark.title;
					var url = (!!movedLocalBookmark.url) ? movedLocalBookmark.url : null;
					bookmark = new utility.Bookmark(title, url);
				}
				
				syncedBookmarkToMove = bookmark;
				
				// Get moved local bookmark's new parent
				return getLocalBookmark(moveInfo.parentId);
			})
			.then(function(bookmark) {
				movedLocalBookmarkNewParent = bookmark;
				
				// Check if in Bookmarks bar
				return isLocalBookmarkInBookmarksBar(movedLocalBookmarkNewParent);
			})
			.then(function(inBookmarksBar) {
				if (inBookmarksBar) {
					if (!global.IncludeBookmarksBar.Get()) {
						// Not syncing Bookmarks bar, return
						return deferred.resolve(syncedBookmarks);
					}
					
					// Find synced parent bookmark in Bookmarks bar
					var bookmarksBar = _.where(syncedBookmarks, { Title: getConstant(global.Constants.BookmarksBarTitle) })[0];
					
					// Create Bookmarks bar if it doesn't exist
					if (!bookmarksBar) {
						bookmarksBar = new utility.Bookmark(getConstant(global.Constants.BookmarksBarTitle));
						syncedBookmarks.push(bookmarksBar);
					}
					
					// Find parent in Bookmarks bar
					possibleParents = findSyncedBookmark([bookmarksBar], movedLocalBookmarkNewParent.title, movedLocalBookmarkNewParent.url, movedLocalBookmarkNewParent.index, function(bookmark) {
						// Amount of child bookmarks must be greater than or equal to index of new bookmark
						return !!bookmark.Children && bookmark.Children.length >= moveInfo.index;
					});
					
					if (!possibleParents || possibleParents.length === 0 || possibleParents.length > 1) {
						// Unable to determine parent bookmark
						return deferred.reject({ code: global.ErrorCodes.UpdatedBookmarkNotFound });
					}
					
					// Add moved bookmark at new index
					possibleParents[0].Children.splice(moveInfo.index, 0, syncedBookmarkToMove);
				}
				
				// Check if parent is Other bookmarks
				else if (moveInfo.parentId === '2') {
					// Add moved bookmark at new index
					syncedBookmarks.splice(moveInfo.index, 0, syncedBookmarkToMove);
				}
				
				else {
					// Find parent in synced bookmarks
					possibleParents = findSyncedBookmark(syncedBookmarks, movedLocalBookmarkNewParent.title, movedLocalBookmarkNewParent.url, movedLocalBookmarkNewParent.index, function(bookmark) {
						// Amount of child bookmarks must be greater than or equal to index of new bookmark
						return !!bookmark.Children && bookmark.Children.length >= moveInfo.index;
					});
					
					if (!possibleParents || possibleParents.length === 0 || possibleParents.length > 1) {
						// Unable to determine parent bookmark
						return deferred.reject({ code: global.ErrorCodes.UpdatedBookmarkNotFound });
					}
					
					// Add moved bookmark at new index
					possibleParents[0].Children.splice(moveInfo.index, 0, syncedBookmarkToMove);
				}
				
				deferred.resolve(syncedBookmarks);
			})
			.catch(deferred.reject);
		
		return deferred.promise;
	};
	
	var bookmarksUpdated = function(syncedBookmarks, args) {
		var id = args[0];
		var updateInfo = args[1];
		var updatedLocalBookmark, updatedLocalBookmarkParent, possibleParents;
		var deferred = $q.defer();
		var getSyncedBookmarkToUpdate = $q.defer();
		
		// Get updated local bookmark
		getLocalBookmark(id)
			.then(function(bookmark) {
				updatedLocalBookmark = bookmark;
				
				// Get updated local bookmark parent
				return getLocalBookmark(updatedLocalBookmark.parentId);
			})
			.then(function(bookmark) {
				updatedLocalBookmarkParent = bookmark;
				
				// Check if in Bookmarks bar
				return isLocalBookmarkInBookmarksBar(updatedLocalBookmark);
			})
			.then(function(inBookmarksBar) {
				if (inBookmarksBar) {
					if (!global.IncludeBookmarksBar.Get()) {
						// Not syncing Bookmarks bar, return
						return deferred.resolve(syncedBookmarks);
					}
					
					// Find synced bookmark to update in Bookmarks bar
					var bookmarksBar = _.where(syncedBookmarks, { Title: getConstant(global.Constants.BookmarksBarTitle) })[0];
					
					if (!bookmarksBar || !bookmarksBar.Children || bookmarksBar.Children.length === 0) {
						// Bookmark bar doesn't exist in synced bookmarks
						return deferred.reject({ code: global.ErrorCodes.UpdatedBookmarkNotFound });
					}
					
					// Find parent in Bookmarks bar
					possibleParents = findSyncedBookmark([bookmarksBar], updatedLocalBookmarkParent.title, updatedLocalBookmarkParent.url, updatedLocalBookmarkParent.index, function(bookmark) {
						// Check that child exists at correct index and has correct properties
						return !!bookmark.Children && 
							   bookmark.Children.length >= updatedLocalBookmark.index + 1 &&
							   (bookmark.Children[updatedLocalBookmark.index].Title === updateInfo.title || 
							   bookmark.Children[updatedLocalBookmark.index].Url === updateInfo.url);
					});
					
					if (!possibleParents || possibleParents.length === 0 || possibleParents.length > 1) {
						// Unable to determine parent bookmark
						return deferred.reject({ code: global.ErrorCodes.UpdatedBookmarkNotFound });
					}
					
					return getSyncedBookmarkToUpdate.resolve(possibleParents[0].Children[updatedLocalBookmark.index]);
				}
				else {
					// Check if parent is Other bookmarks
					if (updatedLocalBookmark.parentId === '2') {
						// Find bookmark to update in Other bookmarks
						return getSyncedBookmarkToUpdate.resolve(syncedBookmarks[updatedLocalBookmark.index]);
					}
					
					// Find parent in synced bookmarks
					possibleParents = findSyncedBookmark(syncedBookmarks, updatedLocalBookmarkParent.title, updatedLocalBookmarkParent.url, updatedLocalBookmarkParent.index, function(bookmark) {
						// Check that child exists at correct index and has correct properties
						return !!bookmark.Children && 
							   bookmark.Children.length >= updatedLocalBookmark.index + 1 &&
							   (bookmark.Children[updatedLocalBookmark.index].Title === updateInfo.title || 
							   bookmark.Children[updatedLocalBookmark.index].Url === updateInfo.url);
					});
					
					if (!possibleParents || possibleParents.length === 0 || possibleParents.length > 1) {
						// Unable to determine parent bookmark
						return deferred.reject({ code: global.ErrorCodes.UpdatedBookmarkNotFound });
					}
					
					return getSyncedBookmarkToUpdate.resolve(possibleParents[0].Children[updatedLocalBookmark.index]);
				}
			})
			.catch(deferred.reject);
		
		getSyncedBookmarkToUpdate.promise
			.then(function(bookmarkToUpdate) {
				// Update bookmark
				bookmarkToUpdate.Title = updateInfo.title;
				bookmarkToUpdate.Url = updateInfo.url;
				
				return deferred.resolve(syncedBookmarks);
			});
		
		return deferred.promise;
	};
	
	var clearBookmarks = function() {
		var clearOtherBookmarksDeferred, clearBookmarksBarDeferred;
		
		// Clear other bookmarks
		clearOtherBookmarksDeferred = $q(function(resolve, reject) {
			try {
                chrome.bookmarks.getChildren('2', function(results) {
                    try {
                        if (!!results) {
                            for (var i = 0; i < results.length; i++) {
                                chrome.bookmarks.removeTree(results[i].id);
                            }
                            
                            return resolve();
                        }
                    }
                    catch (err) {
                        return reject({ code: global.ErrorCodes.FailedRemoveLocalBookmarks });
                    }
                });
            }
            catch (err) {
                return reject({ code: global.ErrorCodes.FailedGetLocalBookmarks });
            }
		});
		
		// Clear bookmarks bar
		clearBookmarksBarDeferred = $q(function(resolve, reject) {
			if (global.IncludeBookmarksBar.Get()) {
				try {
                    chrome.bookmarks.getChildren('1', function(results) {
                        try {
                            if (!!results) {
                                for (var i = 0; i < results.length; i++) {
                                    chrome.bookmarks.removeTree(results[i].id);
                                }
                                
                                return resolve();
                            }
                        }
                        catch (err) {
                            return reject({ code: global.ErrorCodes.FailedRemoveLocalBookmarks });
                        }
                    });
                }
                catch (err) {
                    return reject({ code: global.ErrorCodes.FailedGetLocalBookmarks });
                }
			}
			else {
				return resolve();
			}
		});
			
		return $q.all([clearOtherBookmarksDeferred.promise, clearBookmarksBarDeferred.promise]);
	};
	
	var containsCurrentPage = function() {
        var deferred = $q.defer();
        
        // Get current url
        getCurrentUrl()
            .then(function(currentUrl) {
                // Find current url in local bookmarks
                chrome.bookmarks.search({ url: currentUrl }, function(results) {
                    deferred.resolve(!!results && results.length > 0);
                });
            });
        
        return deferred.promise;
    };
	
	var getAsyncChannel = function(syncCallback) {
		// Configure async messaging channel
		var asyncChannel = chrome.runtime.connect({ name: global.Title.Get() });
		
		// Begin listening for sync messages
		asyncChannel.onMessage.addListener(function(msg) {
			if (!msg.command) {
				return;
			}
			
			syncCallback(msg);
		});
		
		return asyncChannel;
	};
	
	var getBookmarks = function(bookmarkId) {
		// If bookmarkId provided, return the tree from this ID
		if (!!bookmarkId) {
			return $q(function(resolve, reject) {
				try {
					chrome.bookmarks.getSubTree(bookmarkId, function(results) {
						if (results[0].children.length > 0) {
							var bookmarks = getLocalBookmarksRecursive(results);
							resolve(bookmarks);
						}
						else {
							resolve();
						}
					});
				}
				catch (err) {
					return reject({ code: global.ErrorCodes.FailedGetLocalBookmarks });
				}
			});
		}
		
        // If no bookmarkId provided, add Other bookmarks
		return $q(function(resolve, reject) {
			try {
                chrome.bookmarks.getSubTree('2', function(results) {
                    if (results[0].children.length > 0) {
                        var bookmarks = getLocalBookmarksRecursive(results[0].children);
                        resolve(bookmarks);
                    }
                    else {
                        resolve();
                    }
                });
            }
            catch (err) {
                return reject({ code: global.ErrorCodes.FailedGetLocalBookmarks });
            }
		})
            .then(function(bookmarks) {
				// Add Bookmarks bar
				return $q(function(resolve, reject) {
					try {
                        if (!global.IncludeBookmarksBar.Get()) {
							return resolve(bookmarks);
						}
						
						chrome.bookmarks.getSubTree('1', function(results) {
							if (results[0].children.length > 0) {
								if (!bookmarks) {
									bookmarks = [];
								}
								
								var bookmarksBar = new utility.Bookmark(results[0].title);
								bookmarksBar.Children = getLocalBookmarksRecursive(results[0].children);						
								bookmarks.push(bookmarksBar);
								resolve(bookmarks);
							}
							else {
								resolve(bookmarks);
							}
						});
                    }
                    catch (err) {
                        return reject({ code: global.ErrorCodes.FailedGetLocalBookmarks });
                    }
				});
			});
	};
	
	var getConstant = function(constName) {
		return chrome.i18n.getMessage(constName);
	};
	
	var getCurrentUrl = function() {
        var deferred = $q.defer();
        
        // Get current tab
        chrome.tabs.query(
            { currentWindow: true, active: true },
            function(tabs) {
                var activeTab = tabs[0];
                var url = activeTab.url;
                
                deferred.resolve(url);
        });
        
        return deferred.promise;
    };
    
    var getFromLocalStorage = function(itemName) {
		return localStorage.getItem(itemName);
	};
    
    var getPageMetadata = function() {
        var deferred = $q.defer();
        var metadata = {};
		
		// Get current tab
        chrome.tabs.query(
            { currentWindow: true, active: true },
            function(tabs) {
                var activeTab = tabs[0];
                metadata.url = activeTab.url;
				
				// Exit if this is a chrome url
				if (activeTab.url.toLowerCase().startsWith('chrome://')) {
					return deferred.resolve(metadata);
				}
                
				// Add listener to receive page metadata from content script
                chrome.runtime.onMessage.addListener(function(message, sender) {
					if (message.command === 'getPageMetadata') {
						if (!!message.metadata) {
							metadata.title = message.metadata.title;
							metadata.description = message.metadata.description;
							metadata.tags = message.metadata.tags;
						}
						
						deferred.resolve(metadata);
					}
				});
				
				// Run content script to return page metadata
				chrome.tabs.executeScript(null, { file: 'scripts/content.js' }, 
					function() {
						// If error, resolve deferred
						deferred.resolve(metadata);
					});
        });
        
        return deferred.promise;
    };
	
	var setInLocalStorage = function(itemName, itemValue) {
		localStorage.setItem(itemName, itemValue);
	};
	
	var sync = function(asyncChannel, syncData, command) {
		syncData.command = (!!command) ? command : global.Commands.SyncBookmarks;
		asyncChannel.postMessage(syncData);
	};
	
	var populateBookmarks = function(bookmarks) {
		var populateBookmarksBar, populateOtherBookmarks;
		
		// Get bookmarks bar if present
		var bookmarksBar = _.findWhere(bookmarks, { Title: getConstant(global.Constants.BookmarksBarTitle) });
		var bookmarksExBookmarksBar = _.difference(bookmarks, [ bookmarksBar ]);
		
		// Populate bookmarks bar
		populateBookmarksBar = $q(function(resolve, reject) {
			if (global.IncludeBookmarksBar.Get() && !!bookmarksBar && bookmarksBar.Children.length > 0) {
				try {
                    chrome.bookmarks.get('1', function(results) {
                        createLocalBookmarksRecursive(results[0].id, bookmarksBar.Children, resolve, reject);
                    });
                }
                catch (err) {
                    return reject({ code: global.ErrorCodes.FailedGetLocalBookmarks });
                }
			}
			else {
				resolve();
			}
		});
		
		// Populate other bookmarks
		populateOtherBookmarks = $q(function(resolve, reject) {
			try {
                chrome.bookmarks.get('2', function(results) {
                    createLocalBookmarksRecursive(results[0].id, bookmarksExBookmarksBar, resolve, reject);
                });
            }
            catch (err) {
                return reject({ code: global.ErrorCodes.FailedGetLocalBookmarks });
            }
		});
		
		return $q.all([populateBookmarksBar, populateOtherBookmarks]);
	};
	
	var refreshInterface = function() {
		var iconPath;
		var tooltip = getConstant(global.Constants.Title);
		
		if (!!global.IsSyncing.Get()) {
			iconPath = 'images/browser-action-working.png';
			tooltip += ' - ' + getConstant(global.Constants.TooltipWorking);
		}
		else if (!!global.SyncEnabled.Get()) {
			iconPath = 'images/browser-action-on.png';
			tooltip += ' - ' + getConstant(global.Constants.TooltipSyncEnabled);
		}
		else {
			iconPath = 'images/browser-action-off.png';
		}
        
        $timeout(function() {
            chrome.browserAction.setIcon({ path: iconPath });
		    chrome.browserAction.setTitle({ title: tooltip });
        }, 100);
	};
	
 
/* ------------------------------------------------------------------------------------
 * Private functions
 * ------------------------------------------------------------------------------------ */
    
	var createLocalBookmark = function(parentId, title, url) {
		var deferred = $q.defer();
		
		try {
			var bookmark = {
				parentId: parentId,
				title: title,
				url: url
			};
			
			chrome.bookmarks.create(bookmark, function(result) {
				deferred.resolve(result);
			});
		}
		catch(err) {
			deferred.reject({ code: global.ErrorCodes.FailedCreateLocalBookmarks });
		}
		
		return deferred.promise;
	};
    
    var createLocalBookmarksRecursive = function(parentId, bookmarks, success, failed) {
		(function step(i, callback) {
			if (i < bookmarks.length) {
				createLocalBookmark(parentId, bookmarks[i].Title, bookmarks[i].Url).then(
					function(newBookmark) {
						var originalBookmark = bookmarks[i];
						
						if (!!originalBookmark.Children && originalBookmark.Children.length > 0) {
							createLocalBookmarksRecursive(newBookmark.id, originalBookmark.Children,
								function() {
									step(i + 1, callback);
								},
								failed);
						}
						else {
							step(i + 1, callback);
						}
					},
					function(err) {
						failed(err);
					});
			}
			else {
				callback();
			}
		})(0, function() {
			success();
		});
	};
	
	var findSyncedBookmark = function(bookmarks, title, url, index, predicate) {
		var results = [];
		
		// Filter array
		results = _.union(results, _.filter(bookmarks, function(bookmark) {
			var found = false;
			
			// Match based on supplied title, url and index
			if (bookmark.Title === title &&
				bookmark.Url === url &&
				bookmarks.length >= index + 1 &&
				bookmarks[index].Title === bookmark.Title &&
				bookmarks[index].Url === bookmark.Url) {
					found = true;
				}
			
			// If supplied, match based on predicate
			if (!!found && !!predicate) {
				found = predicate(bookmark);
			}
			
			return found;
		}));
		
		// Process children
		var children = _.pluck(bookmarks, 'Children');		
		for (var i = 0; i < children.length; i++) {
			results = _.union(results, findSyncedBookmark(children[i], title, url, index, predicate));
		}
		
		return results;
	};
	
	var getLocalBookmark = function(bookmarkId) {
		var deferred = $q.defer();
		
		try {
			chrome.bookmarks.get(bookmarkId, function(results) {
				if (!!results[0]) {
					deferred.resolve(results[0]);
				}
				else {
					deferred.reject({ code: global.ErrorCodes.FailedGetLocalBookmarks });
				}
			});
		}
		catch (err) {
			deferred.reject({ code: global.ErrorCodes.FailedGetLocalBookmarks });
		}
		
		return deferred.promise;
	};
	
	var getLocalBookmarksRecursive = function(bookmarks) {
		var retrievedBookmarks = [];
		
		for (var i = 0; i < bookmarks.length; i++) {
			var bookmark = new utility.Bookmark(bookmarks[i].title, bookmarks[i].url);
			
			// If this is a folder and has chldren, process them
			if (!!bookmarks[i].children && bookmarks[i].children.length > 0) {
				bookmark.Children = getLocalBookmarksRecursive(bookmarks[i].children);
			}
			
			retrievedBookmarks.push(bookmark);
		}
		
		return retrievedBookmarks;
	};
	
	var isLocalBookmarkInBookmarksBar = function(bookmark, deferred) {
		if (!deferred) {
			deferred = $q.defer();
		}
		
		if (!!bookmark.parentId && (bookmark.id === '1' || bookmark.parentId === '1'))
		{
			// Bookmark or parent is Bookmarks bar
			deferred.resolve(true);
		}
		else if (!bookmark.parentId || bookmark.parentId === '0' || bookmark.parentId === '2') {
			// Parent is null, root, or Other bookmarks
			deferred.resolve(false);
		}
		else {
			// Get parent bookmark and call self when done
			getLocalBookmark(bookmark.parentId)
				.then(function(parent) {
					isLocalBookmarkInBookmarksBar(parent, deferred);
				})
				.catch(deferred.reject);
		}
		
		return deferred.promise;
	};
	
	// Call constructor
	return new ChromeImplementation();
};