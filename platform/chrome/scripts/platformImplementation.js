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
    
	var BrowserImplementation = function() {
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
		
		return $q(function(resolve, reject) {
			// Get parent tree from local bookmarks
			chrome.bookmarks.getSubTree(createInfo.parentId, function(parentTree) {
				var parentBookmark = null;
				
				var title = createInfo.title;
				var url = (!!createInfo.url) ? createInfo.url : null;
				var newBookmark = new utility.Bookmark(title, url);	
				
				// Check if parent is Bookmarks bar
				if (createInfo.parentId === '1') {
					if (!global.IncludeBookmarksBar.Get()) {
						// Not syncing bookmarks bar, return
						return resolve(syncedBookmarks);
					}
					else {
						try {
							// Add new bookmark to Bookmarks bar
							parentBookmark = _.where(syncedBookmarks, { Title: parentTree[0].title })[0];
							parentBookmark.Children.push(newBookmark);
						}
						catch (err) {
							// Create new Bookmarks bar bookmark and add new bookmark
							parentBookmark = new utility.Bookmark(parentTree[0].title);
							parentBookmark.Children.push(newBookmark);
							syncedBookmarks.push(parentBookmark);
						}
					}
				}
				// Check if parent is Other bookmarks
				else if (createInfo.parentId === '2') {
					// Add new bookmark bookmarks root
					syncedBookmarks.push(newBookmark);
					
					// Move Bookmarks bar to end of array
					var bookmarksBarIndex = _.findIndex(syncedBookmarks, { Title: getConstant(global.Constants.BookmarksBarTitle) });
					if (bookmarksBarIndex >= 0) {
						var bookmarksBar = syncedBookmarks.splice(bookmarksBarIndex, 1);
						syncedBookmarks.push(bookmarksBar[0]);
					}
				}
				else {
					// Find parent in synced bookmarks
					var possibleParents = findSyncedBookmark(syncedBookmarks, parentTree[0].title, parentTree[0].url, parentTree[0].index, function(bookmark) {
						// Amount of child bookmarks must be equal to index of new bookmark
						return bookmark.Children.length === createInfo.index;
					});
									
					if (possibleParents.length === 1) {
						// Add new bookmark to children of parent
						parentBookmark = possibleParents[0];
						parentBookmark.Children.push(newBookmark);
					}
					else {
						// Unable to determine parent bookmark
						return reject({ code: global.ErrorCodes.UpdatedBookmarkNotFound });
					}
				}
				
				return resolve(syncedBookmarks);
			});
		});
	};
	
	var bookmarksDeleted = function(syncedBookmarks, args) {
		var id = args[0];
		var removeInfo = args[1];
		var deletedBookmarkIndex = removeInfo.index;
		
		return $q(function(resolve, reject) {
			// Get parent tree from local bookmarks
			chrome.bookmarks.getSubTree(removeInfo.parentId, function(parentTree) {
				// Check if parent is Bookmarks bar
				if (parentTree[0].id === '1') {
					if (!global.IncludeBookmarksBar.Get()) {
						// Not syncing Bookmarks bar, return
						return resolve(syncedBookmarks);
					}
					else {
						// Find bookmark to update in Bookmarks bar
						var bookmarksBar = _.where(syncedBookmarks, { Title: parentTree[0].title })[0];
						
						if (!!bookmarksBar) {
							bookmarksBar.Children.splice(deletedBookmarkIndex, 1);
						}
						else {
							// Bookmark bar doesn't exist in synced bookmarks
							return reject({ code: global.ErrorCodes.UpdatedBookmarkNotFound });
						}
					}
				}
				// Check if parent is Other bookmarks
				else if (parentTree[0].id === '2') {
					// Remove deleted bookmark from Other bookmarks
					syncedBookmarks.splice(deletedBookmarkIndex, 1);
				}
				else {
					// Find parent in synced bookmarks
					var possibleParents = findSyncedBookmark(syncedBookmarks, parentTree[0].title, parentTree[0].url, parentTree[0].index, function(bookmark) {
						// Bookmark's child at deletedBookmarkIndex should match deleted bookmark
						return bookmark.Children.length >= deletedBookmarkIndex + 1 &&
						       bookmark.Children[deletedBookmarkIndex].Title === removeInfo.node.title && 
							   bookmark.Children[deletedBookmarkIndex].Url === removeInfo.node.url;
					});
					
					if (possibleParents.length === 1) {
						var parent = possibleParents[0];
						
						// Remove deleted bookmark from parent
						parent.Children.splice(deletedBookmarkIndex, 1);
					}
					else {
						// Unable to determine parent bookmark
						return reject({ code: global.ErrorCodes.UpdatedBookmarkNotFound });
					}
				}
				
				return resolve(syncedBookmarks);
			});
		});
	};
	
	var bookmarksMoved = function(syncedBookmarks, args) {
		var id = args[0];
		var moveInfo = args[1];
		
		return $q(function(resolve, reject) {
			chrome.bookmarks.get(id, function(movedBookmark) {
				var bookmarkToMove;
				
				// Find old parent
				chrome.bookmarks.get(moveInfo.oldParentId, function(oldParent) {
					// Check if parent is Bookmarks bar
                    if (oldParent[0].id === '1') {
                        var bookmarksBar = _.where(syncedBookmarks, { Title: oldParent[0].title })[0];
                        
                        if (!global.IncludeBookmarksBar.Get()) {
							// Not syncing Bookmarks bar, don't remove
							bookmarkToMove = bookmarksBar.Children[moveInfo.oldIndex];
						}
						else {
							if (!!bookmarksBar) {
								// Remove moved bookmark
								bookmarkToMove = bookmarksBar.Children.splice(moveInfo.oldIndex, 1)[0];
							}
							else {
								// Bookmark bar doesn't exist in synced bookmarks
								return reject({ code: global.ErrorCodes.UpdatedBookmarkNotFound });
							}
						}
                    }
                    // Check if parent is Other bookmarks
                    else if (oldParent[0].id === '2') {
                        // Remove deleted bookmark from Other bookmarks
                        bookmarkToMove = syncedBookmarks.splice(moveInfo.oldIndex, 1)[0];
                    }
                    else {
                        // Find parent
                        var possibleParents = findSyncedBookmark(syncedBookmarks, oldParent[0].title, oldParent[0].url, oldParent[0].index, function(bookmark) {
                            // Bookmark's child at oldIndex should match moved bookmark
                            return bookmark.Children[moveInfo.oldIndex].Title === movedBookmark[0].title && 
                                bookmark.Children[moveInfo.oldIndex].Url === movedBookmark[0].url;
                        });
                        
                        if (possibleParents.length === 1) {
                            bookmarkToMove = possibleParents[0].Children.splice(moveInfo.oldIndex, 1)[0];
                        }
                        else {
                            // Unable to determine parent bookmark
                            return reject({ code: global.ErrorCodes.UpdatedBookmarkNotFound });
                        }
                    }
					
					// Find new parent
					chrome.bookmarks.getSubTree(moveInfo.parentId, function(newParentTree) {
						// Check if parent is Bookmarks bar
                        if (newParentTree[0].id === '1') {
                            if (!global.IncludeBookmarksBar.Get()) {
                                // Not syncing Bookmarks bar, return
                                return resolve(syncedBookmarks);
                            }
                            
							var bookmarksBar = _.where(syncedBookmarks, { Title: newParentTree[0].title })[0];
							
							// Create Bookmarks bar if it doesn't exist
							if (!bookmarksBar) {
								bookmarksBar = new utility.Bookmark(newParentTree[0].title);
								syncedBookmarks.push(bookmarksBar);
							}
							
                            // Add moved bookmark at new index
							bookmarksBar.Children.splice(moveInfo.index, 0, bookmarkToMove);
                        }
                        // Check if parent is Other bookmarks
                        else if (newParentTree[0].id === '2') {
                            // Add moved bookmark at new index
                            syncedBookmarks.splice(moveInfo.index, 0, bookmarkToMove);
                        }
                        else {
                            // Find parent        
                            var possibleParents = findSyncedBookmark(syncedBookmarks, newParentTree[0].title, newParentTree[0].url, newParentTree[0].index, function(bookmark) {
                                // Amount of child bookmarks must be equal to new index of moved bookmark
                                return bookmark.Children.length === moveInfo.index;
                            });
                            
                            if (possibleParents.length === 1) {
                                // Add moved bookmark at new index
                                possibleParents[0].Children.splice(moveInfo.index, 0, bookmarkToMove);
                            }
                            else {
                                // Unable to determine parent bookmark
                                return reject({ code: global.ErrorCodes.UpdatedBookmarkNotFound });
                            }
                        }
						
						return resolve(syncedBookmarks);
					});
				});
			});
		});
	};
	
	var bookmarksUpdated = function(syncedBookmarks, args) {
		var id = args[0];
		var updateInfo = args[1];
		var updatedLocalBookmark, updatedLocalBookmarkParent;
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
				return isLocalBookmarkInBookmarksBar(updatedLocalBookmark)
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
					var possibleParents = findSyncedBookmark([bookmarksBar], updatedLocalBookmarkParent.title, updatedLocalBookmarkParent.url, updatedLocalBookmarkParent.index, function(bookmark) {
						// Check that child exists at correct index and has correct properties
						return !!bookmark.Children && 
							   bookmark.Children.length >= updatedLocalBookmark.index &&
							   (bookmark.Children[updatedLocalBookmark.index].Title === updateInfo.title || 
							   bookmark.Children[updatedLocalBookmark.index].Url === updateInfo.url);
					});
					
					if (possibleParents.length > 1) {
						// Unable to determine parent bookmark
						return reject({ code: global.ErrorCodes.UpdatedBookmarkNotFound });
					}
					
					var bookmarkToUpdate = possibleParents[0].Children[updatedLocalBookmark.index];
					return getSyncedBookmarkToUpdate.resolve(bookmarkToUpdate);
				}
				else {
					// Check if parent is Other bookmarks
					if (updatedLocalBookmark.parentId === '2') {
						// Find bookmark to update in Other bookmarks
						var bookmarkToUpdate = syncedBookmarks[updatedLocalBookmark.index];
						return getSyncedBookmarkToUpdate.resolve(bookmarkToUpdate);
					}
					
					// Find parent in synced bookmarks
					var possibleParents = findSyncedBookmark(syncedBookmarks, updatedLocalBookmarkParent.title, updatedLocalBookmarkParent.url, updatedLocalBookmarkParent.index, function(bookmark) {
						// Check that child exists at correct index and has correct properties
						return !!bookmark.Children && 
							   bookmark.Children.length >= updatedLocalBookmark.index &&
							   (bookmark.Children[updatedLocalBookmark.index].Title === updateInfo.title || 
							   bookmark.Children[updatedLocalBookmark.index].Url === updateInfo.url);
					});
					
					if (possibleParents.length > 1) {
						// Unable to determine parent bookmark
						return reject({ code: global.ErrorCodes.UpdatedBookmarkNotFound });
					}
					
					var bookmarkToUpdate = possibleParents[0].Children[updatedLocalBookmark.index];
					return getSyncedBookmarkToUpdate.resolve(bookmarkToUpdate);
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
		var promises = [];
		
		// Clear other bookmarks
		promises.push($q(function(resolve, reject) {
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
		}));
		
		// Clear bookmarks bar
		promises.push($q(function(resolve, reject) {
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
		}));
			
		return $q.all(promises);
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
		var deferred = $q.defer();
		var promises = [];
		
		// Get bookmarks bar if present
		var bookmarksBar = _.findWhere(bookmarks, { Title: getConstant(global.Constants.BookmarksBarTitle) });
		var bookmarksExBookmarksBar = _.difference(bookmarks, [ bookmarksBar ]);
		
		// Populate bookmarks bar
		promises.push($q(function(resolve, reject) {
			if (global.IncludeBookmarksBar.Get() && !!bookmarksBar && bookmarksBar.Children.length > 0) {
				try {
                    chrome.bookmarks.get('1', function(results) {
                        createBookmarksRecursive(results[0].id, bookmarksBar.Children, resolve, reject);
                    });
                }
                catch (err) {
                    return reject({ code: global.ErrorCodes.FailedGetLocalBookmarks });
                }
			}
			else {
				resolve();
			}
		}));
		
		// Populate other bookmarks
		promises.push($q(function(resolve, reject) {
			try {
                chrome.bookmarks.get('2', function(results) {
                    createBookmarksRecursive(results[0].id, bookmarksExBookmarksBar, resolve, reject);
                });
            }
            catch (err) {
                return reject({ code: global.ErrorCodes.FailedGetLocalBookmarks });
            }
		}));
		
		$q.all(promises)
			.then(function() {
				deferred.resolve();
			})
			.catch(deferred.reject);
		
		return deferred.promise;
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
    
	var countBookmarksRecursive = function(bookmarks) {
		var count = 0;
		
		_.each(bookmarks, function(bookmark) {
			count++;
			
			// If bookmark has children, count them
			if (!!bookmark.children && bookmark.children.length > 0) {
				count += countBookmarksRecursive(bookmark.children);
			}
		});
		
		return count;
	};
	
	var createBookmark = function(parentId, title, url) {
		return $q(function(resolve, reject) {
			try {
				var bookmark = {
					parentId: parentId,
					title: title,
					url: url
				};
				
				chrome.bookmarks.create(bookmark, function(result) {
					return resolve(result);
				});
			}
			catch(err) {
				return reject({ 
					code: global.ErrorCodes.FailedCreateLocalBookmarks,
					details:  '&quot;' + title + '&quot;: ' + url
				});
			}
		});
	};
    
    var createBookmarksRecursive = function(parentId, bookmarks, success, failed) {
		(function step(i, callback) {
			if (i < bookmarks.length) {
				createBookmark(parentId, bookmarks[i].Title, bookmarks[i].Url).then(
					function(newBookmark) {
						var originalBookmark = bookmarks[i];
						
						if (!!originalBookmark.Children && originalBookmark.Children.length > 0) {
							createBookmarksRecursive(newBookmark.id, originalBookmark.Children,
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
				};
			});
		}
		catch (err) {
			deferred.reject({ code: global.ErrorCodes.FailedGetLocalBookmarks });
		};
		
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
		};
		
		if (!bookmark.parentId || bookmark.parentId === '0' || bookmark.parentId === '2') {
			// Parent is null, root, or Other bookmarks
			deferred.resolve(false);
		}
		else if (bookmark.parentId === '1') {
			// Parent is Bookmarks bar
			deferred.resolve(true);
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
	return new BrowserImplementation();
};