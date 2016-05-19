var xBrowserSync = xBrowserSync || {};
xBrowserSync.App = xBrowserSync.App || {};

/* ------------------------------------------------------------------------------------
 * Class name:  xBrowserSync.App.PlatformImplementation 
 * Description: Implements xBrowserSync.App.Platform for Chrome extension.
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
	
	var bookmarksCreated = function(xBookmarks, args) {
		var id = args[0];
		var createInfo = args[1];
		var createdLocalBookmarkParent, bookmarksBar, possibleParents;
		var deferred = $q.defer();
		
		var title = createInfo.title;
		var url = (!!createInfo.url) ? createInfo.url : null;
		var newXBookmark = new utility.XBookmark(title, url);
		
		// Get created local bookmark's parent
		getLocalBookmark(createInfo.parentId)
			.then(function(localBookmark) {
				createdLocalBookmarkParent = localBookmark;
				
				// Check if in Bookmarks bar
				return isLocalBookmarkInBookmarksBar(createdLocalBookmarkParent);
			})
			.then(function(inBookmarksBar) {
				if (inBookmarksBar) {
					if (!global.IncludeBookmarksBar.Get()) {
						// Not syncing Bookmarks bar, return
						return deferred.resolve(xBookmarks);
					}
					
					// Find synced parent bookmark in Bookmarks bar
					bookmarksBar = _.where(xBookmarks, { title: getConstant(global.Constants.BookmarksBarTitle) })[0];
					
					// Create Bookmarks bar if it doesn't exist
					if (!bookmarksBar) {
						bookmarksBar = new utility.XBookmark(getConstant(global.Constants.BookmarksBarTitle));
						xBookmarks.push(bookmarksBar);
					}
					
					// Find parent in Bookmarks bar
					possibleParents = findXBookmark([bookmarksBar], createdLocalBookmarkParent.title, createdLocalBookmarkParent.url, createdLocalBookmarkParent.index, function(xBookmark) {
						// Amount of child bookmarks must be equal to index of new bookmark
						return xBookmark.children.length === createInfo.index;
					});
					
					if (!possibleParents || possibleParents.length === 0 || possibleParents.length > 1) {
						// Unable to determine parent bookmark
						return deferred.reject({ code: global.ErrorCodes.UpdatedBookmarkNotFound });
					}
					
					// Add new child bookmark
					possibleParents[0].children.push(newXBookmark);
				}
				
				// Check if parent is Other bookmarks
				else if (createInfo.parentId === '2') {
					// Add new bookmark
					xBookmarks.push(newXBookmark);
					
					// Move Bookmarks bar to end of array
					var bookmarksBarIndex = _.findIndex(xBookmarks, { title: getConstant(global.Constants.BookmarksBarTitle) });
					if (bookmarksBarIndex >= 0) {
						bookmarksBar = xBookmarks.splice(bookmarksBarIndex, 1);
						xBookmarks.push(bookmarksBar[0]);
					}
				}
				
				else {
					// Find parent in synced bookmarks
					possibleParents = findXBookmark(xBookmarks, createdLocalBookmarkParent.title, createdLocalBookmarkParent.url, createdLocalBookmarkParent.index, function(xBookmark) {
						// Amount of child bookmarks must be equal to index of new bookmark
						return xBookmark.children.length === createInfo.index;
					});
					
					if (!possibleParents || possibleParents.length === 0 || possibleParents.length > 1) {
						// Unable to determine parent bookmark
						return deferred.reject({ code: global.ErrorCodes.UpdatedBookmarkNotFound });
					}
					
					// Add new child bookmark
					possibleParents[0].children.push(newXBookmark);
				}
				
				deferred.resolve(xBookmarks);
			})
			.catch(deferred.reject);
		
		return deferred.promise;
	};
	
	var bookmarksDeleted = function(xBookmarks, args) {
		var id = args[0];
		var removeInfo = args[1];
		var deletedBookmarkIndex = removeInfo.index;
		var deletedLocalBookmarkParent, possibleParents;
		var deferred = $q.defer();
		
		// Get deleted local bookmark's parent
		getLocalBookmark(removeInfo.parentId)
			.then(function(localBookmark) {
				deletedLocalBookmarkParent = localBookmark;
				
				// Check if in Bookmarks bar
				return isLocalBookmarkInBookmarksBar(deletedLocalBookmarkParent);
			})
			.then(function(inBookmarksBar) {
				if (inBookmarksBar) {
					if (!global.IncludeBookmarksBar.Get()) {
						// Not syncing Bookmarks bar, return
						return deferred.resolve(xBookmarks);
					}
					
					// Find synced bookmark to update in Bookmarks bar
					var bookmarksBar = _.where(xBookmarks, { title: getConstant(global.Constants.BookmarksBarTitle) })[0];
					
					if (!bookmarksBar || !bookmarksBar.children || bookmarksBar.children.length === 0) {
						// Bookmark bar doesn't exist in synced bookmarks
						return deferred.reject({ code: global.ErrorCodes.UpdatedBookmarkNotFound });
					}
					
					// Find parent in Bookmarks bar
					possibleParents = findXBookmark([bookmarksBar], deletedLocalBookmarkParent.title, deletedLocalBookmarkParent.url, deletedLocalBookmarkParent.index, function(xBookmark) {
						// Check that child exists at correct index and has correct properties
						return !!xBookmark.children && 
								xBookmark.children.length >= deletedBookmarkIndex + 1 &&
								(xBookmark.children[deletedBookmarkIndex].title === removeInfo.node.title && 
								xBookmark.children[deletedBookmarkIndex].url === removeInfo.node.url);
					});
					
					if (!possibleParents || possibleParents.length === 0 || possibleParents.length > 1) {
						// Unable to determine parent bookmark
						return deferred.reject({ code: global.ErrorCodes.UpdatedBookmarkNotFound });
					}
					
					// Remove deleted bookmark from parent
					possibleParents[0].children.splice(deletedBookmarkIndex, 1);
				}
				
				// Check if parent is Other bookmarks
				else if (removeInfo.parentId === '2') {
					// Remove deleted bookmark from Other bookmarks
					xBookmarks.splice(deletedBookmarkIndex, 1);
				}
				
				else {
					// Find parent in synced bookmarks
					possibleParents = findXBookmark(xBookmarks, deletedLocalBookmarkParent.title, deletedLocalBookmarkParent.url, deletedLocalBookmarkParent.index, function(xBookmark) {
						// Check that child exists at correct index and has correct properties
						return !!xBookmark.children && 
							   xBookmark.children.length >= deletedBookmarkIndex + 1 &&
							   (xBookmark.children[deletedBookmarkIndex].title === removeInfo.node.title && 
							   xBookmark.children[deletedBookmarkIndex].url === removeInfo.node.url);
					});
					
					if (!possibleParents || possibleParents.length === 0 || possibleParents.length > 1) {
						// Unable to determine parent bookmark
						return deferred.reject({ code: global.ErrorCodes.UpdatedBookmarkNotFound });
					}
					
					// Remove deleted bookmark from parent
					possibleParents[0].children.splice(deletedBookmarkIndex, 1);
				}
				
				deferred.resolve(xBookmarks);
			})
			.catch(deferred.reject);
		
		return deferred.promise;
	};
	
	var bookmarksMoved = function(xBookmarks, args) {
		var id = args[0];
		var moveInfo = args[1];
		var deferred = $q.defer();
		var getXBookmarkToUpdate = $q.defer();
		var movedLocalBookmark, movedLocalBookmarkOldParent, movedLocalBookmarkNewParent, 
			xBookmarkToMove, possibleParents;
		
		// Get moved local bookmark
		var removeFromOldParentDelegate = getLocalBookmark(id)
			.then(function(localBookmark) {
				movedLocalBookmark = localBookmark;
				
				// Get moved local bookmark's old parent
				return getLocalBookmark(moveInfo.oldParentId);
			})
			.then(function(localBookmark) {
				movedLocalBookmarkOldParent = localBookmark;
				
				// Check if in Bookmarks bar
				return isLocalBookmarkInBookmarksBar(movedLocalBookmarkOldParent);
			})
			.then(function(inBookmarksBar) {
				if (inBookmarksBar) {
					// Find synced bookmark to update in Bookmarks bar
					var bookmarksBar = _.where(xBookmarks, { title: getConstant(global.Constants.BookmarksBarTitle) })[0];
					
					if (!global.IncludeBookmarksBar.Get()) {
						// Not syncing Bookmarks bar, don't remove
						if (!bookmarksBar || !bookmarksBar.children || bookmarksBar.children.length === 0) {
							return;
						}
						
						return bookmarksBar.children[moveInfo.oldIndex];
					}
					
					if (!bookmarksBar || !bookmarksBar.children || bookmarksBar.children.length === 0) {
						// Bookmark bar doesn't exist in synced bookmarks
						return $q.reject({ code: global.ErrorCodes.UpdatedBookmarkNotFound });
					}
					
					// Find parent in Bookmarks bar
					possibleParents = findXBookmark([bookmarksBar], movedLocalBookmarkOldParent.title, movedLocalBookmarkOldParent.url, movedLocalBookmarkOldParent.index, function(xBookmark) {
						// Check that child exists at correct index and has correct properties
						return !!xBookmark.children && 
							   xBookmark.children.length >= moveInfo.oldIndex + 1 &&
							   (xBookmark.children[moveInfo.oldIndex].title === movedLocalBookmark.title && 
							   xBookmark.children[moveInfo.oldIndex].url === movedLocalBookmark.url);
					});
					
					if (!possibleParents || possibleParents.length === 0 || possibleParents.length > 1) {
						// Unable to determine parent bookmark
						return $q.reject({ code: global.ErrorCodes.UpdatedBookmarkNotFound });
					}
					
					// Remove moved bookmark from parent
					return possibleParents[0].children.splice(moveInfo.oldIndex, 1)[0];
				}
				
				// Check if parent is Other bookmarks
				else if (moveInfo.oldParentId === '2') {
					// Remove moved bookmark from Other bookmarks
					return xBookmarks.splice(moveInfo.oldIndex, 1)[0];
				}
				
				else {
					// Find parent in synced bookmarks
					possibleParents = findXBookmark(xBookmarks, movedLocalBookmarkOldParent.title, movedLocalBookmarkOldParent.url, movedLocalBookmarkOldParent.index, function(xBookmark) {
						// Check that child exists at correct index and has correct properties
						return !!xBookmark.children && 
							   xBookmark.children.length >= moveInfo.oldIndex + 1 &&
							   (xBookmark.children[moveInfo.oldIndex].title === movedLocalBookmark.title && 
							   xBookmark.children[moveInfo.oldIndex].url === movedLocalBookmark.url);
					});
					
					if (!possibleParents || possibleParents.length === 0 || possibleParents.length > 1) {
						// Unable to determine parent bookmark
						return $q.reject({ code: global.ErrorCodes.UpdatedBookmarkNotFound });
					}
					
					// Remove deleted bookmark from parent
					return possibleParents[0].children.splice(moveInfo.oldIndex, 1)[0];
				}
			})
			.catch(deferred.reject);
		
		removeFromOldParentDelegate
			.then(function(xBookmark) {
				if (!xBookmark) {
					var title = movedLocalBookmark.title;
					var url = (!!movedLocalBookmark.url) ? movedLocalBookmark.url : null;
					xBookmark = new utility.XBookmark(title, url);
				}
				
				xBookmarkToMove = xBookmark;
				
				// Get moved local bookmark's new parent
				return getLocalBookmark(moveInfo.parentId);
			})
			.then(function(localBookmark) {
				movedLocalBookmarkNewParent = localBookmark;
				
				// Check if in Bookmarks bar
				return isLocalBookmarkInBookmarksBar(movedLocalBookmarkNewParent);
			})
			.then(function(inBookmarksBar) {
				if (inBookmarksBar) {
					if (!global.IncludeBookmarksBar.Get()) {
						// Not syncing Bookmarks bar, return
						return deferred.resolve(xBookmarks);
					}
					
					// Find synced parent bookmark in Bookmarks bar
					var bookmarksBar = _.where(xBookmarks, { title: getConstant(global.Constants.BookmarksBarTitle) })[0];
					
					// Create Bookmarks bar if it doesn't exist
					if (!bookmarksBar) {
						bookmarksBar = new utility.XBookmark(getConstant(global.Constants.BookmarksBarTitle));
						xBookmarks.push(bookmarksBar);
					}
					
					// Find parent in Bookmarks bar
					possibleParents = findXBookmark([bookmarksBar], movedLocalBookmarkNewParent.title, movedLocalBookmarkNewParent.url, movedLocalBookmarkNewParent.index, function(xBookmark) {
						// Amount of child bookmarks must be greater than or equal to index of new bookmark
						return !!xBookmark.children && xBookmark.children.length >= moveInfo.index;
					});
					
					if (!possibleParents || possibleParents.length === 0 || possibleParents.length > 1) {
						// Unable to determine parent bookmark
						return deferred.reject({ code: global.ErrorCodes.UpdatedBookmarkNotFound });
					}
					
					// Add moved bookmark at new index
					possibleParents[0].children.splice(moveInfo.index, 0, xBookmarkToMove);
				}
				
				// Check if parent is Other bookmarks
				else if (moveInfo.parentId === '2') {
					// Add moved bookmark at new index
					xBookmarks.splice(moveInfo.index, 0, xBookmarkToMove);
				}
				
				else {
					// Find parent in synced bookmarks
					possibleParents = findXBookmark(xBookmarks, movedLocalBookmarkNewParent.title, movedLocalBookmarkNewParent.url, movedLocalBookmarkNewParent.index, function(xBookmark) {
						// Amount of child bookmarks must be greater than or equal to index of new bookmark
						return !!xBookmark.children && xBookmark.children.length >= moveInfo.index;
					});
					
					if (!possibleParents || possibleParents.length === 0 || possibleParents.length > 1) {
						// Unable to determine parent bookmark
						return deferred.reject({ code: global.ErrorCodes.UpdatedBookmarkNotFound });
					}
					
					// Add moved bookmark at new index
					possibleParents[0].children.splice(moveInfo.index, 0, xBookmarkToMove);
				}
				
				deferred.resolve(xBookmarks);
			})
			.catch(deferred.reject);
		
		return deferred.promise;
	};
	
	var bookmarksUpdated = function(xBookmarks, args) {
		var id = args[0];
		var updateInfo = args[1];
		var updatedLocalBookmark, updatedLocalBookmarkParent, possibleParents;
		var deferred = $q.defer();
		var getXBookmarkToUpdate = $q.defer();
		
		// Get updated local bookmark
		getLocalBookmark(id)
			.then(function(localBookmark) {
				updatedLocalBookmark = localBookmark;
				
				// Get updated local bookmark parent
				return getLocalBookmark(updatedLocalBookmark.parentId);
			})
			.then(function(localBookmark) {
				updatedLocalBookmarkParent = localBookmark;
				
				// Check if in Bookmarks bar
				return isLocalBookmarkInBookmarksBar(updatedLocalBookmark);
			})
			.then(function(inBookmarksBar) {
				if (inBookmarksBar) {
					if (!global.IncludeBookmarksBar.Get()) {
						// Not syncing Bookmarks bar, return
						return deferred.resolve(xBookmarks);
					}
					
					// Find synced bookmark to update in Bookmarks bar
					var bookmarksBar = _.where(xBookmarks, { title: getConstant(global.Constants.BookmarksBarTitle) })[0];
					
					if (!bookmarksBar || !bookmarksBar.children || bookmarksBar.children.length === 0) {
						// Bookmark bar doesn't exist in synced bookmarks
						return deferred.reject({ code: global.ErrorCodes.UpdatedBookmarkNotFound });
					}
					
					// Find parent in Bookmarks bar
					possibleParents = findXBookmark([bookmarksBar], updatedLocalBookmarkParent.title, updatedLocalBookmarkParent.url, updatedLocalBookmarkParent.index, function(xBookmark) {
						// Check that child exists at correct index and has correct properties
						return !!xBookmark.children && 
							   xBookmark.children.length >= updatedLocalBookmark.index + 1 &&
							   (xBookmark.children[updatedLocalBookmark.index].title === updateInfo.title || 
							   xBookmark.children[updatedLocalBookmark.index].url === updateInfo.url);
					});
					
					if (!possibleParents || possibleParents.length === 0 || possibleParents.length > 1) {
						// Unable to determine parent bookmark
						return deferred.reject({ code: global.ErrorCodes.UpdatedBookmarkNotFound });
					}
					
					return getXBookmarkToUpdate.resolve(possibleParents[0].children[updatedLocalBookmark.index]);
				}
				else {
					// Check if parent is Other bookmarks
					if (updatedLocalBookmark.parentId === '2') {
						// Find bookmark to update in Other bookmarks
						return getXBookmarkToUpdate.resolve(xBookmarks[updatedLocalBookmark.index]);
					}
					
					// Find parent in synced bookmarks
					possibleParents = findXBookmark(xBookmarks, updatedLocalBookmarkParent.title, updatedLocalBookmarkParent.url, updatedLocalBookmarkParent.index, function(xBookmark) {
						// Check that child exists at correct index and has correct properties
						return !!xBookmark.children && 
							   xBookmark.children.length >= updatedLocalBookmark.index + 1 &&
							   (xBookmark.children[updatedLocalBookmark.index].title === updateInfo.title || 
							   xBookmark.children[updatedLocalBookmark.index].url === updateInfo.url);
					});
					
					if (!possibleParents || possibleParents.length === 0 || possibleParents.length > 1) {
						// Unable to determine parent bookmark
						return deferred.reject({ code: global.ErrorCodes.UpdatedBookmarkNotFound });
					}
					
					return getXBookmarkToUpdate.resolve(possibleParents[0].children[updatedLocalBookmark.index]);
				}
			})
			.catch(deferred.reject);
		
		getXBookmarkToUpdate.promise
			.then(function(bookmarkToUpdate) {
				// Update bookmark
				bookmarkToUpdate.title = updateInfo.title;
				bookmarkToUpdate.url = updateInfo.url;
				
				return deferred.resolve(xBookmarks);
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
	
	var getBookmarks = function(localBookmarkId) {
		// If bookmark id provided, return the tree from this ID
		if (!!localBookmarkId) {
			return $q(function(resolve, reject) {
				try {
					chrome.bookmarks.getSubTree(localBookmarkId, function(results) {
						if (results[0].children.length > 0) {
							var xBookmarks = getLocalBookmarksAsXBookmarks(results);
							resolve(xBookmarks);
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
		
        // If no bookmark id provided, add Other bookmarks
		return $q(function(resolve, reject) {
			try {
                chrome.bookmarks.getSubTree('2', function(results) {
                    if (results[0].children.length > 0) {
                        var xBookmarks = getLocalBookmarksAsXBookmarks(results[0].children);
                        resolve(xBookmarks);
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
            .then(function(xBookmarks) {
				// Add Bookmarks bar
				return $q(function(resolve, reject) {
					try {
                        if (!global.IncludeBookmarksBar.Get()) {
							return resolve(xBookmarks);
						}
						
						chrome.bookmarks.getSubTree('1', function(results) {
							if (results[0].children.length > 0) {
								if (!xBookmarks) {
									xBookmarks = [];
								}
								
								var bookmarksBar = new utility.XBookmark(results[0].title);
								bookmarksBar.children = getLocalBookmarksAsXBookmarks(results[0].children);						
								xBookmarks.push(bookmarksBar);
								resolve(xBookmarks);
							}
							else {
								resolve(xBookmarks);
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
	
	var populateBookmarks = function(xBookmarks) {
		var populateBookmarksBar, populateOtherBookmarks;
		
		// Get bookmarks bar if present
		var bookmarksBar = _.findWhere(xBookmarks, { title: getConstant(global.Constants.BookmarksBarTitle) });
		var bookmarksExBookmarksBar = _.difference(xBookmarks, [ bookmarksBar ]);
		
		// Populate bookmarks bar
		populateBookmarksBar = $q(function(resolve, reject) {
			if (global.IncludeBookmarksBar.Get() && !!bookmarksBar && bookmarksBar.children.length > 0) {
				try {
                    chrome.bookmarks.get('1', function(results) {
                        createLocalBookmarksFromXBookmarks(results[0].id, bookmarksBar.children, resolve, reject);
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
                    createLocalBookmarksFromXBookmarks(results[0].id, bookmarksExBookmarksBar, resolve, reject);
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
			var newLocalBookmark = {
				parentId: parentId,
				title: title,
				url: url
			};
			
			chrome.bookmarks.create(newLocalBookmark, function(result) {
				deferred.resolve(result);
			});
		}
		catch(err) {
			deferred.reject({ code: global.ErrorCodes.FailedCreateLocalBookmarks });
		}
		
		return deferred.promise;
	};
    
    var createLocalBookmarksFromXBookmarks = function(parentId, xBookmarks, success, failed) {
		(function step(i, callback) {
			if (i < xBookmarks.length) {
				createLocalBookmark(parentId, xBookmarks[i].title, xBookmarks[i].url).then(
					function(newLocalBookmark) {
						var xBookmark = xBookmarks[i];
						
						if (!!xBookmark.children && xBookmark.children.length > 0) {
							createLocalBookmarksFromXBookmarks(newLocalBookmark.id, xBookmark.children,
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
	
	var findXBookmark = function(xBookmarks, title, url, index, predicate) {
		var results = [];
		
		// Filter array
		results = _.union(results, _.filter(xBookmarks, function(xBookmark) {
			var found = false;
			
			// Match based on supplied title, url and index
			if (xBookmark.title === title &&
				xBookmark.url === url &&
				xBookmarks.length >= index + 1 &&
				xBookmarks[index].title === xBookmark.title &&
				xBookmarks[index].url === xBookmark.url) {
					found = true;
				}
			
			// If supplied, match based on predicate
			if (!!found && !!predicate) {
				found = predicate(xBookmark);
			}
			
			return found;
		}));
		
		// Process children
		var children = _.pluck(xBookmarks, 'children');		
		for (var i = 0; i < children.length; i++) {
			results = _.union(results, findXBookmark(children[i], title, url, index, predicate));
		}
		
		return results;
	};
	
	var getLocalBookmark = function(localBookmarkId) {
		var deferred = $q.defer();
		
		try {
			chrome.bookmarks.get(localBookmarkId, function(results) {
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
	
	var getLocalBookmarksAsXBookmarks = function(localBookmarks) {
		var xBookmarks = [];
		
		for (var i = 0; i < localBookmarks.length; i++) {
			var newXBookmark = new utility.XBookmark(localBookmarks[i].title, localBookmarks[i].url);
			
			// If this is a folder and has chldren, process them
			if (!!localBookmarks[i].children && localBookmarks[i].children.length > 0) {
				newXBookmark.children = getLocalBookmarksAsXBookmarks(localBookmarks[i].children);
			}
			
			xBookmarks.push(newXBookmark);
		}
		
		return xBookmarks;
	};
	
	var isLocalBookmarkInBookmarksBar = function(localBookmark, deferred) {
		if (!deferred) {
			deferred = $q.defer();
		}
		
		if (!!localBookmark.parentId && (localBookmark.id === '1' || localBookmark.parentId === '1'))
		{
			// Bookmark or parent is Bookmarks bar
			deferred.resolve(true);
		}
		else if (!localBookmark.parentId || localBookmark.parentId === '0' || localBookmark.parentId === '2') {
			// Parent is null, root, or Other bookmarks
			deferred.resolve(false);
		}
		else {
			// Get parent bookmark and call self when done
			getLocalBookmark(localBookmark.parentId)
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