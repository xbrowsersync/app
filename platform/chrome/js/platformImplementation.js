var xBrowserSync = xBrowserSync || {};
xBrowserSync.App = xBrowserSync.App || {};

/* ------------------------------------------------------------------------------------
 * Class name:  xBrowserSync.App.PlatformImplementation 
 * Description: Implements xBrowserSync.App.Platform for Chrome extension.
 * ------------------------------------------------------------------------------------ */

xBrowserSync.App.PlatformImplementation = function($q, $timeout, platform, global, utility) {
	'use strict';

/* ------------------------------------------------------------------------------------
 * Platform variables
 * ------------------------------------------------------------------------------------ */

	var rootId = '0';
	var bookmarksBarId = '1';
	var otherBookmarksId = '2';


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
		platform.OpenUrl = openUrl;
		platform.PageMetadata.Get = getPageMetadata;
		platform.Sync = sync;
        
        // Refresh browser action icon on reload
        refreshInterface();
	};


/* ------------------------------------------------------------------------------------
 * Public functions
 * ------------------------------------------------------------------------------------ */
	
	var bookmarksCreated = function(xBookmarks, args) {
		var createInfo = args[1];
		var createdLocalBookmarkParent;
		var newXBookmark = new utility.XBookmark(createInfo.title, createInfo.url || null);
		var deferred = $q.defer();
		
		// Get created local bookmark's parent
		getLocalBookmark(createInfo.parentId)
			.then(function(localBookmark) {
				createdLocalBookmarkParent = localBookmark;

				// Check if any containers are before the deleted bookmark that would throw off index
				return getNumContainersBeforeBookmarkIndex(createInfo.parentId, createInfo.index);
			})
			.then(function(numContainers) {
				var createdBookmarkIndex = createInfo.index - numContainers;

				// Find parent in containers
				return checkContainersForXBookmark(xBookmarks, function(xBookmark) {
					// Check that bookmark has correct properties and child bookmarks are equal to index of new bookmark
					return checkXBookmarkByTitle(xBookmark, createdLocalBookmarkParent.title) &&
						   xBookmark.url === createdLocalBookmarkParent.url && 
						   xBookmark.children.length === createdBookmarkIndex
				});
			})
			.then(function(checkContainersResult) {
				if (!checkContainersResult.container) {
					// Bookmark not found in any containers
					return deferred.reject({ code: global.ErrorCodes.UpdatedBookmarkNotFound });
				}

				// If bookmark is in toolbar and not syncing toolbar, return
				if (checkContainersResult.container === global.Bookmarks.ToolbarContainerName &&
					!global.SyncBookmarksToolbar.Get()) {
					return deferred.resolve(xBookmarks);
				}

				// Otherwise, add bookmark to parent
				checkContainersResult.xBookmark.children.push(newXBookmark);
				return deferred.resolve(xBookmarks);
			})
			.catch(deferred.reject);
		
		return deferred.promise;
	};
	
	var bookmarksDeleted = function(xBookmarks, args) {
		var removeInfo = args[1];
		var deletedBookmarkIndex, deletedLocalBookmarkParent;
		var deferred = $q.defer();
		
		// Get deleted local bookmark's parent
		getLocalBookmark(removeInfo.parentId)
			.then(function(localBookmark) {
				deletedLocalBookmarkParent = localBookmark;

				// Check if any containers are before the deleted bookmark that would throw off index
				return getNumContainersBeforeBookmarkIndex(removeInfo.parentId, removeInfo.index);
			})
			.then(function(numContainers) {
				deletedBookmarkIndex = removeInfo.index - numContainers;

				// Find parent in containers
				return checkContainersForXBookmark(xBookmarks, function(xBookmark) {
					// Check that bookmark has correct index and has correct properties
					return checkXBookmarkByTitle(xBookmark, deletedLocalBookmarkParent.title) &&
						   xBookmark.url === deletedLocalBookmarkParent.url && 
						   !!xBookmark.children && 
						   xBookmark.children.length >= deletedBookmarkIndex + 1 &&
						   (xBookmark.children[deletedBookmarkIndex].title === removeInfo.node.title && 
						   xBookmark.children[deletedBookmarkIndex].url === removeInfo.node.url);
				});
			})
			.then(function(checkContainersResult) {
				if (!checkContainersResult.container) {
					// Bookmark not found in any containers
					return deferred.reject({ code: global.ErrorCodes.UpdatedBookmarkNotFound });
				}

				// If bookmark is in toolbar and not syncing toolbar, return
				if (checkContainersResult.container === global.Bookmarks.ToolbarContainerName &&
					!global.SyncBookmarksToolbar.Get()) {
					return deferred.resolve(xBookmarks);
				}

				// Otherwise, remove bookmark from parent
				checkContainersResult.xBookmark.children.splice(deletedBookmarkIndex, 1);
				return deferred.resolve(xBookmarks);
			})
			.catch(deferred.reject);
		
		return deferred.promise;
	};
	
	var bookmarksMoved = function(xBookmarks, args) {
		var id = args[0];
		var moveInfo = args[1];
		var deferred = $q.defer();
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
					var bookmarksBar = _.where(xBookmarks, { title: getConstant(global.Constants.BookmarksToolbarTitle) })[0];
					
					if (!global.SyncBookmarksToolbar.Get()) {
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
				else if (moveInfo.oldParentId === otherBookmarksId) {
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
					if (!global.SyncBookmarksToolbar.Get()) {
						// Not syncing Bookmarks bar, return
						return deferred.resolve(xBookmarks);
					}
					
					// Find synced parent bookmark in Bookmarks bar
					var bookmarksBar = _.where(xBookmarks, { title: getConstant(global.Constants.BookmarksToolbarTitle) })[0];
					
					// Create Bookmarks bar if it doesn't exist
					if (!bookmarksBar) {
						bookmarksBar = new utility.XBookmark(getConstant(global.Constants.BookmarksToolbarTitle));
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
				else if (moveInfo.parentId === otherBookmarksId) {
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
					if (!global.SyncBookmarksToolbar.Get()) {
						// Not syncing Bookmarks bar, return
						return deferred.resolve(xBookmarks);
					}
					
					// Find synced bookmark to update in Bookmarks bar
					var bookmarksBar = _.where(xBookmarks, { title: getConstant(global.Constants.BookmarksToolbarTitle) })[0];
					
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
					if (updatedLocalBookmark.parentId === otherBookmarksId) {
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
		var clearOtherBookmarks, clearBookmarksBar;
		
		// Clear Other bookmarks
		clearOtherBookmarks = $q(function(resolve, reject) {
			try {
                chrome.bookmarks.getChildren(otherBookmarksId, function(results) {
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
		
		// Clear Bookmarks bar
		clearBookmarksBar = $q(function(resolve, reject) {
			if (global.SyncBookmarksToolbar.Get()) {
				try {
                    chrome.bookmarks.getChildren(bookmarksBarId, function(results) {
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
			
		return $q.all([clearOtherBookmarks.promise, clearBookmarksBar.promise]);
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
		var getOtherBookmarks, getBookmarksBar;

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
		
        // If no bookmark id provided, get Other bookmarks
		getOtherBookmarks = $q(function(resolve, reject) {
			try {
                chrome.bookmarks.getSubTree(otherBookmarksId, function(results) {
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
		});

		// Get bookmarks bar
        getBookmarksBar = $q(function(resolve, reject) {
			try {
				if (!global.SyncBookmarksToolbar.Get()) {
					return resolve(xBookmarks);
				}
				
				chrome.bookmarks.getSubTree(bookmarksBarId, function(results) {
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
		});
		
		return $q.all([getOtherBookmarks, getBookmarksBar])
			.then(function(results) {
				var otherBookmarks = results[0];
				var bookmarksBar = results[1];
				var xBookmarks = [];

				// Add xBrowserSync container if bookmarks present
				var xbsBookmarks = utility.GetXBrowserSyncContainer(otherBookmarks, false);
				if (!!xbsBookmarks && xbsBookmarks.children.length > 0) {
					var xbsContainer = utility.GetXBrowserSyncContainer(xBookmarks, true);
					xbsContainer.children = xbsBookmarks.children;
				}

				// Add other container if bookmarks present
				var otherBookmarksExcXbs = _.reject(otherBookmarks, function(bookmark) { return bookmark.title === global.Bookmarks.xBrowserSyncContainerName; });
				if (!!otherBookmarksExcXbs && otherBookmarksExcXbs.length > 0) {
					var otherContainer = utility.GetOtherContainer(xBookmarks, true);
					otherContainer.children = otherBookmarksExcXbs;
				}

				// Add toolbar container if bookmarks present
				if (!!bookmarksBar && bookmarksBar.length > 0) {
					var toolbarContainer = utility.GetToolbarContainer(xBookmarks, true);
					toolbarContainer.children = bookmarksBar;
				}

				return xBookmarks;
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
				if (!!activeTab.url && activeTab.url.toLowerCase().startsWith('chrome://')) {
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
				chrome.tabs.executeScript(null, { file: 'js/content.js' }, 
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

	var openUrl = function(url) {
		// Get current tab
        chrome.tabs.query(
            { currentWindow: true, active: true },
            function(tabs) {
                var activeTab = tabs[0];
				
				// Open url in current tab if new
				if (!!activeTab.url && activeTab.url.startsWith('chrome://newtab')) {
					chrome.tabs.update(activeTab.id, { url: url }, function() {
						window.close();
					});
				}
				else {
					chrome.tabs.create({ 'url': url });
				}
        });
	};
	
	var populateBookmarks = function(xBookmarks) {
		var populateToolbar, populateOther, populateXbs;
		
		// Get containers
		var otherContainer = utility.GetOtherContainer(xBookmarks);
		var toolbarContainer = utility.GetToolbarContainer(xBookmarks);
		var xbsContainer = utility.GetXBrowserSyncContainer(xBookmarks);
		
		// Populate xBrowserSync bookmarks in Other bookmarks
		populateXbs = $q(function(resolve, reject) {
			if (!!xbsContainer && xbsContainer.children.length > 0) {
				try {
					chrome.bookmarks.get(otherBookmarksId, function(results) {
						createLocalBookmarksFromXBookmarks(otherBookmarksId, [xbsContainer], resolve, reject);
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
		
		// Populate Other bookmarks
		populateOther = $q(function(resolve, reject) {
			if (!!otherContainer && otherContainer.children.length > 0) {
				try {
					chrome.bookmarks.get(otherBookmarksId, function(results) {
						createLocalBookmarksFromXBookmarks(otherBookmarksId, otherContainer.children, resolve, reject);
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

		// Populate Bookmarks bar
		populateToolbar = $q(function(resolve, reject) {
			if (global.SyncBookmarksToolbar.Get() && !!toolbarContainer && toolbarContainer.children.length > 0) {
				try {
                    chrome.bookmarks.get(bookmarksBarId, function(results) {
                        createLocalBookmarksFromXBookmarks(bookmarksBarId, toolbarContainer.children, resolve, reject);
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
		
		return $q.all([populateXbs, populateOther, populateToolbar]);
	};
	
	var refreshInterface = function() {
		var iconPath;
		var tooltip = getConstant(global.Constants.Title);
		
		if (!!global.IsSyncing.Get()) {
			iconPath = 'img/browser-action-working.png';
			tooltip += ' - ' + getConstant(global.Constants.TooltipWorking);
		}
		else if (!!global.SyncEnabled.Get()) {
			iconPath = 'img/browser-action-on.png';
			tooltip += ' - ' + getConstant(global.Constants.TooltipSyncEnabled);
		}
		else {
			iconPath = 'img/browser-action-off.png';
		}
        
        $timeout(function() {
            chrome.browserAction.setIcon({ path: iconPath });
		    chrome.browserAction.setTitle({ title: tooltip });
        }, 100);
	};
	
 
/* ------------------------------------------------------------------------------------
 * Private functions
 * ------------------------------------------------------------------------------------ */
    
	var checkContainersForXBookmark = function(xBookmarks, predicate) {
		// Search for bookmark in other container
		var checkOtherContainer = $q(function(resolve, reject) {
			var otherContainer = utility.GetOtherContainer(xBookmarks, false);
			var result = {
				found: false,
				xBookmark: null
			};

			if (!otherContainer) {
				return resolve(result);
			}

			var foundXBookmarks = findXBookmark([otherContainer], predicate);
			if (!foundXBookmarks || foundXBookmarks.length === 0 || foundXBookmarks.length > 1) {
				return resolve(result);
			}

			result.found = true;
			result.xBookmark = foundXBookmarks[0];
			return resolve(result);
		});

		// Search for bookmark in toolbar container
		var checkToolbarContainer = $q(function(resolve, reject) {
			var toolbarContainer = utility.GetToolbarContainer(xBookmarks, false);
			var result = {
				found: false,
				xBookmark: null
			};

			if (!toolbarContainer) {
				return resolve(result);
			}

			var foundXBookmarks = findXBookmark([toolbarContainer], predicate);
			if (!foundXBookmarks || foundXBookmarks.length === 0 || foundXBookmarks.length > 1) {
				return resolve(result);
			}

			result.found = true;
			result.xBookmark = foundXBookmarks[0];
			return resolve(result);
		});

		// Search for bookmark in xbs container
		var checkXbsContainer = $q(function(resolve, reject) {
			var xbsContainer = utility.GetXBrowserSyncContainer(xBookmarks, false);
			var result = {
				found: false,
				xBookmark: null
			};

			if (!xbsContainer) {
				return resolve(result);
			}

			var foundXBookmarks = findXBookmark([xbsContainer], predicate);
			if (!foundXBookmarks || foundXBookmarks.length === 0 || foundXBookmarks.length > 1) {
				return resolve(result);
			}

			result.found = true;
			result.xBookmark = foundXBookmarks[0];
			return resolve(result);
		});

		return $q.all([checkOtherContainer, checkToolbarContainer, checkXbsContainer])
			.then(function(results) {
				var otherContainerResult = results[0];
				var toolbarContainerResult = results[1];
				var xbsContainerResult = results[2];
				var result = {
					container: null,
					xBookmark: null
				};

				if (!!otherContainerResult.found) {
					result.container = global.Bookmarks.OtherContainerName;
					result.xBookmark = otherContainerResult.xBookmark;
				}
				else if (!!toolbarContainerResult.found) {
					result.container = global.Bookmarks.ToolbarContainerName;
					result.xBookmark = toolbarContainerResult.xBookmark;
				}
				else if (!!xbsContainerResult.found) {
					result.container = global.Bookmarks.xBrowserSyncContainerName;
					result.xBookmark = xbsContainerResult.xBookmark;
				}

				return result;
			}); 
	};

	var checkXBookmarkByTitle = function(xBookmark, title) {
		// Compare bookmark title to value accounting for bookmark container titles
		switch (title.toLowerCase()) {
			case getConstant(global.Constants.BookmarksOtherTitle).toLowerCase():
				return xBookmark.title === global.Bookmarks.OtherContainerName;
			case getConstant(global.Constants.BookmarksToolbarTitle).toLowerCase():
				return xBookmark.title === global.Bookmarks.ToolbarContainerName;
			default:
				return xBookmark.title === title; 
		}
	};
	
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
	
	var findXBookmark = function(xBookmarks, predicate) {
		var results = [];
		
		// Filter array
		results = _.union(results, _.filter(xBookmarks, function(xBookmark) {
			// Match based on supplied predicate
			return predicate(xBookmark);
		}));
		
		// Process children
		var children = _.pluck(xBookmarks, 'children');		
		for (var i = 0; i < children.length; i++) {
			results = _.union(results, findXBookmark(children[i], predicate));
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

	var getNumContainersBeforeBookmarkIndex = function(parentId, bookmarkIndex) {
		var deferred = $q.defer();

		try {
			chrome.bookmarks.getSubTree(parentId, function(results) {
				var bookmarks = results[0].children.slice(0, bookmarkIndex);
				var containers = _.filter(bookmarks, function(bookmark) { 
					return bookmark.title === global.Bookmarks.OtherContainerName || 
						   bookmark.title === global.Bookmarks.ToolbarContainerName ||
						   bookmark.title === global.Bookmarks.xBrowserSyncContainerName;
				});
				
				if (!!containers) {
					deferred.resolve(containers.length);
				}
				else {
					deferred.resolve(0);
				}
			});
		}
		catch (err) {
			return deferred.reject({ code: global.ErrorCodes.FailedGetLocalBookmarks });
		}

		return deferred.promise;
	};
	
	var isLocalBookmarkInBookmarksBar = function(localBookmark, deferred) {
		if (!deferred) {
			deferred = $q.defer();
		}
		
		if (!!localBookmark.parentId && (localBookmark.id === bookmarksBarId || localBookmark.parentId === bookmarksBarId))
		{
			// Bookmark or parent is Bookmarks bar
			deferred.resolve(true);
		}
		else if (!localBookmark.parentId || localBookmark.parentId === rootId || localBookmark.parentId === otherBookmarksId) {
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