var xBrowserSync = xBrowserSync || {};
xBrowserSync.App = xBrowserSync.App || {};

/* ------------------------------------------------------------------------------------
 * Class name:  xBrowserSync.App.PlatformImplementation 
 * Description: Implements xBrowserSync.App.Platform for Chrome extension.
 * ------------------------------------------------------------------------------------ */

xBrowserSync.App.PlatformImplementation = function($http, $interval, $q, $timeout, platform, global, utility, bookmarks) {
	'use strict';

/* ------------------------------------------------------------------------------------
 * Platform variables
 * ------------------------------------------------------------------------------------ */

	var moduleName = 'xBrowserSync.App.PlatformImplementation', vm;
	var bookmarksBarId = '1', otherBookmarksId = '2';


/* ------------------------------------------------------------------------------------
 * Constructor
 * ------------------------------------------------------------------------------------ */
    
	var ChromeImplementation = function() {
		// Inject required platform implementation functions
		platform.BackupData = backupData;
		platform.Bookmarks.Clear = clearBookmarks;
		platform.Bookmarks.Created = bookmarksCreated;
		platform.Bookmarks.Deleted = bookmarksDeleted;
		platform.Bookmarks.Get = getBookmarks;
		platform.Bookmarks.Moved = bookmarksMoved;
		platform.Bookmarks.Populate = populateBookmarks;
		platform.Bookmarks.Updated = bookmarksUpdated;
		platform.GetConstant = getConstant;
        platform.GetCurrentUrl = getCurrentUrl;
		platform.GetPageMetadata = getPageMetadata;
		platform.Init = init;
        platform.Interface.Loading.Show = displayLoading;
		platform.Interface.Loading.Hide = hideLoading;
		platform.Interface.Refresh = refreshInterface;
		platform.LocalStorage.Get = getFromLocalStorage;
		platform.LocalStorage.Set = setInLocalStorage;
		platform.OpenUrl = openUrl;
		platform.Sync = sync;
        
        // Refresh browser action icon on reload
        refreshInterface();
	};


/* ------------------------------------------------------------------------------------
 * Public functions
 * ------------------------------------------------------------------------------------ */
	
	var backupData = function() {
		// Export bookmarks
		return bookmarks.Export()
            .then(function(data) {
				var date = new Date();
				var minute = ('0' + date.getMinutes()).slice(-2);
				var hour = ('0' + date.getHours()).slice(-2);
				var day = ('0' + date.getDate()).slice(-2);
				var month = ('0' + (date.getMonth() + 1)).slice(-2);
				var year = date.getFullYear();
				var dateString = year + month + day + hour + minute;
				
				// Trigger download 
                var backupLink = document.getElementById('backupLink');
                var fileName = 'xBrowserSyncBackup_' + dateString + '.txt';
                backupLink.setAttribute('download', fileName);
				backupLink.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(JSON.stringify(data)));
				backupLink.click();
                
                // Display message
                var message = platform.GetConstant(global.Constants.BackupSuccess_Message).replace(
                    '{fileName}',
                    fileName);
                
                vm.settings.backupRestoreResult = message;
			});
	};
	
	var bookmarksCreated = function(xBookmarks, args) {
		var createInfo = args[1];
		var createdLocalBookmarkParent, changedBookmarkIndex;
		var newXBookmark = new utility.XBookmark(
			createInfo.title, 
			createInfo.url || null,
			createInfo.description,
			createInfo.tags,
			createInfo.children
			);
		var deferred = $q.defer();

		// Check new bookmark doesn't have the same name as a container
		if (utility.IsBookmarkContainer(createInfo)) {
			// Disable sync
			global.SyncEnabled.Set(false);
			return $q.reject({ code: global.ErrorCodes.ContainerChanged });
		}
		
		// Get created local bookmark's parent
		getLocalBookmark(createInfo.parentId)
			.then(function(localBookmark) {
				createdLocalBookmarkParent = localBookmark;

				// Check if any containers are before the changed bookmark that would throw off index
				return getNumContainersBeforeBookmarkIndex(createInfo.parentId, createInfo.index);
			})
			.then(function(numContainers) {
				changedBookmarkIndex = createInfo.index - numContainers;

				// Find parent in containers
				return utility.FindXBookmarkInContainers(xBookmarks, function(xBookmark) {
					// Check that bookmark has correct properties and child bookmarks are equal to index of new bookmark
					return isXBookmarkTitleEqual(xBookmark, createdLocalBookmarkParent.title) &&
						   xBookmark.url === createdLocalBookmarkParent.url && 
						   xBookmark.children.length >= changedBookmarkIndex;
				});
			})
			.then(function(checkContainersResult) {
				if (!checkContainersResult.container) {
					// Bookmark not found in any containers
					return $q.reject({ code: global.ErrorCodes.UpdatedBookmarkNotFound });
				}

				// If bookmark is in toolbar and not syncing toolbar, return
				if (checkContainersResult.container === global.Bookmarks.ToolbarContainerName &&
					!global.SyncBookmarksToolbar.Get()) {
					return deferred.resolve({ bookmarks: xBookmarks });
				}

				// Otherwise, add bookmark to parent
				checkContainersResult.xBookmark.children.splice(changedBookmarkIndex, 0, newXBookmark);
				return deferred.resolve({ bookmarks: xBookmarks });
			})
			.catch(deferred.reject);
		
		return deferred.promise;
	};
	
	var bookmarksDeleted = function(xBookmarks, args) {
		var removeInfo = args[1];
		var changedBookmarkIndex, deletedLocalBookmarkParent;
		var deferred = $q.defer();

		// Check if changed bookmark is a container
		wasContainerChanged(removeInfo.node, xBookmarks)
			.then(function(changedBookmarkIsContainer) {
				if (!!changedBookmarkIsContainer) {
					// Disable sync
					global.SyncEnabled.Set(false);
					return $q.reject({ code: global.ErrorCodes.ContainerChanged });
				}
		
				// Get deleted local bookmark's parent
				return getLocalBookmark(removeInfo.parentId);
			})
			.then(function(localBookmark) {
				deletedLocalBookmarkParent = localBookmark;

				// Check if any containers are before the changed bookmark that would throw off index
				return getNumContainersBeforeBookmarkIndex(removeInfo.parentId, removeInfo.index);
			})
			.then(function(numContainers) {
				changedBookmarkIndex = removeInfo.index - numContainers;

				// Find parent in containers
				return utility.FindXBookmarkInContainers(xBookmarks, function(xBookmark) {
					// Check that parent bookmark has correct properties and child bookmark has correct index and properties
					return isXBookmarkTitleEqual(xBookmark, deletedLocalBookmarkParent.title) &&
						   xBookmark.url === deletedLocalBookmarkParent.url && 
						   !!xBookmark.children && 
						   xBookmark.children.length >= changedBookmarkIndex + 1 &&
						   (xBookmark.children[changedBookmarkIndex].title === removeInfo.node.title && 
						   xBookmark.children[changedBookmarkIndex].url === removeInfo.node.url);
				});
			})
			.then(function(checkContainersResult) {
				if (!checkContainersResult.container) {
					// Bookmark not found in any containers
					return $q.reject({ code: global.ErrorCodes.UpdatedBookmarkNotFound });
				}

				// If bookmark is in toolbar and not syncing toolbar, return
				if (checkContainersResult.container === global.Bookmarks.ToolbarContainerName &&
					!global.SyncBookmarksToolbar.Get()) {
					return deferred.resolve({ bookmarks: xBookmarks });
				}

				// Otherwise, remove bookmark from parent
				var removedBookmark = checkContainersResult.xBookmark.children.splice(changedBookmarkIndex, 1)[0];
				return deferred.resolve({ 
					bookmarks: xBookmarks, 
					removedBookmark: removedBookmark
				});
			})
			.catch(deferred.reject);
		
		return deferred.promise;
	};
	
	var bookmarksMoved = function(xBookmarks, args) {
		var id = args[0];
		var moveInfo = args[1];
		var movedLocalBookmark;
		var deferred = $q.defer();

		var deleteArgs = [null, {
			index: moveInfo.oldIndex,
			node: {
				title: null,
				url: null
			},
			parentId: moveInfo.oldParentId
		}];

		var createArgs = [null, {
			index: moveInfo.index,
			parentId: moveInfo.parentId,
			title: null,
			url: null,
			children: null,
			description: null,
			tags: null
		}];
		
		// Get moved local bookmark
		getLocalBookmark(id)
			.then(function(localBookmark) {
				movedLocalBookmark = localBookmark;

				// Update args bookmark properties
				deleteArgs[1].node.title = movedLocalBookmark.title;
				deleteArgs[1].node.url = movedLocalBookmark.url;

				// Remove from old parent
				return bookmarksDeleted(xBookmarks, deleteArgs);
			})
			.then(function(results) {
				var updatedBookmarks = results.bookmarks; 
				var removedBookmark = results.removedBookmark;

				// Update args bookmark properties
				createArgs[1].title = movedLocalBookmark.title;
				createArgs[1].url = movedLocalBookmark.url;
				if (!!removedBookmark) {
					createArgs[1].children = removedBookmark.children;
					createArgs[1].description = removedBookmark.description;
					createArgs[1].tags = removedBookmark.tags;
				}

				// Create under new parent
				return bookmarksCreated(updatedBookmarks, createArgs);
			})
			.then(function(updatedBookmarks) {
				return deferred.resolve(updatedBookmarks);
			})
			.catch(deferred.reject);

		return deferred.promise;
	};
	
	var bookmarksUpdated = function(xBookmarks, args) {
		var id = args[0];
		var updateInfo = args[1];
		var updatedLocalBookmark, updatedLocalBookmarkParent, changedBookmarkIndex;
		var deferred = $q.defer();

		// Get updated local bookmark
		getLocalBookmark(id)
			.then(function(localBookmark) {
				updatedLocalBookmark = localBookmark;

				// Check if changed bookmark is a container
				return wasContainerChanged(updatedLocalBookmark, xBookmarks);
			})
			.then(function(changedBookmarkIsContainer) {
				if (!!changedBookmarkIsContainer) {
					// Disable sync
					global.SyncEnabled.Set(false);
					return $q.reject({ code: global.ErrorCodes.ContainerChanged });
				}
				
				// Get updated local bookmark parent
				return getLocalBookmark(updatedLocalBookmark.parentId);
			})
			.then(function(localBookmark) {
				updatedLocalBookmarkParent = localBookmark;

				// Check if any containers are before the changed bookmark that would throw off index
				return getNumContainersBeforeBookmarkIndex(updatedLocalBookmark.parentId, updatedLocalBookmark.index);
			})
			.then(function(numContainers) {
				changedBookmarkIndex = updatedLocalBookmark.index - numContainers;

				// Find parent in containers
				return utility.FindXBookmarkInContainers(xBookmarks, function(xBookmark) {
					// Check that parent bookmark has correct properties and child bookmark has correct index and properties
					return isXBookmarkTitleEqual(xBookmark, updatedLocalBookmarkParent.title) &&
						   xBookmark.url === updatedLocalBookmarkParent.url && 
						   !!xBookmark.children && 
						   xBookmark.children.length >= changedBookmarkIndex + 1 &&
						   (xBookmark.children[changedBookmarkIndex].title === updateInfo.title || 
						   xBookmark.children[changedBookmarkIndex].url === updateInfo.url);
				});
			})
			.then(function(checkContainersResult) {
				if (!checkContainersResult.container) {
					// Bookmark not found in any containers
					return $q.reject({ code: global.ErrorCodes.UpdatedBookmarkNotFound });
				}

				// If bookmark is in toolbar and not syncing toolbar, return
				if (checkContainersResult.container === global.Bookmarks.ToolbarContainerName &&
					!global.SyncBookmarksToolbar.Get()) {
					return deferred.resolve({ bookmarks: xBookmarks });
				}

				// Otherwise, update bookmark
				var bookmarkToUpdate = checkContainersResult.xBookmark.children[changedBookmarkIndex];

				bookmarkToUpdate.title = updateInfo.title;
				bookmarkToUpdate.url = updateInfo.url;
				return deferred.resolve({ bookmarks: xBookmarks });
			})
			.catch(deferred.reject);
		
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
                        // Log error
						utility.LogMessage(
							moduleName, 'clearBookmarks', utility.LogType.Error,
							'Error clearing other bookmarks; ' + JSON.stringify(err));
							
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
                            // Log error
							utility.LogMessage(
								moduleName, 'clearBookmarks', utility.LogType.Error,
								'Error clearing bookmarks bar; ' + JSON.stringify(err));
							
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

	var displayLoading = function() {
		vm.working = true;
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
			return getLocalBookmark(localBookmarkId)
				.then(function(localBookmark) {
					if (localBookmark.children.length > 0) {
						var xBookmarks = getLocalBookmarksAsXBookmarks([localBookmark]);
						return xBookmarks;
					}
				});
		}
		
        // If no bookmark id provided, get Other bookmarks
		getOtherBookmarks = getLocalBookmark(otherBookmarksId)
			.then(function(otherBookmarks) {
				if (otherBookmarks.children.length > 0) {
					var xBookmarks = getLocalBookmarksAsXBookmarks(otherBookmarks.children);
					return xBookmarks;
				}
			});

		// Get bookmarks bar
        getBookmarksBar = getLocalBookmark(bookmarksBarId)
			.then(function(bookmarksBar) {
				if (!global.SyncBookmarksToolbar.Get()) {
					return;
				}
				
				if (bookmarksBar.children.length > 0) {
					var xBookmarks = getLocalBookmarksAsXBookmarks(bookmarksBar.children);
					return xBookmarks;
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
				chrome.tabs.executeScript(null, { file: 'js/content.js' }, 
					function() {
						// If error, resolve deferred
						deferred.resolve(metadata);
					});
        });
        
        return deferred.promise;
    };

	var hideLoading = function() {
		vm.working = false;
	};

	var init = function(viewModel, scope) {
		// Set global variables
		vm = viewModel;

		// Set platform
		vm.platformName = global.Platforms.Chrome;
		
		// Enable event listeners
        global.DisableEventListeners.Set(false);

		// Get async channel for syncing in background
        viewModel.sync.asyncChannel = getAsyncChannel(function(msg) {
            viewModel.scope.$apply(function() {
                viewModel.events.handleSyncResponse(msg);
            });
        });

		// Focus on search box
		if (viewModel.view.current === viewModel.view.views.search) {
			$timeout(function() {
				document.querySelector('input[name=txtSearch]').focus();
			}, 100);
		}
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
		
		// Populate xBrowserSync bookmarks in other bookmarks
		populateXbs = $q(function(resolve, reject) {
			if (!!xbsContainer && xbsContainer.children.length > 0) {
				try {
					chrome.bookmarks.get(otherBookmarksId, function(results) {
						createLocalBookmarksFromXBookmarks(otherBookmarksId, [xbsContainer], resolve, reject);
					});
				}
				catch (err) {
					// Log error
					utility.LogMessage(
						moduleName, 'populateBookmarks', utility.LogType.Error,
						'Error populating xBrowserSync bookmarks in other bookmarks; ' + JSON.stringify(err));
					
					return reject({ code: global.ErrorCodes.FailedGetLocalBookmarks });
				}
			}
			else {
				resolve();
			}
		});
		
		// Populate other bookmarks
		populateOther = $q(function(resolve, reject) {
			if (!!otherContainer && otherContainer.children.length > 0) {
				try {
					chrome.bookmarks.get(otherBookmarksId, function(results) {
						createLocalBookmarksFromXBookmarks(otherBookmarksId, otherContainer.children, resolve, reject);
					});
				}
				catch (err) {
					// Log error
					utility.LogMessage(
						moduleName, 'populateBookmarks', utility.LogType.Error,
						'Error populating other bookmarks; ' + JSON.stringify(err));
					
					return reject({ code: global.ErrorCodes.FailedGetLocalBookmarks });
				}
			}
			else {
				resolve();
			}
		});

		// Populate bookmarks bar
		populateToolbar = $q(function(resolve, reject) {
			if (global.SyncBookmarksToolbar.Get() && !!toolbarContainer && toolbarContainer.children.length > 0) {
				try {
                    chrome.bookmarks.get(bookmarksBarId, function(results) {
                        createLocalBookmarksFromXBookmarks(bookmarksBarId, toolbarContainer.children, resolve, reject);
                    });
                }
                catch (err) {
                    // Log error
					utility.LogMessage(
						moduleName, 'populateBookmarks', utility.LogType.Error,
						'Error populating bookmarks bar; ' + JSON.stringify(err));
					
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
        
		chrome.browserAction.setIcon({ path: iconPath });
		chrome.browserAction.setTitle({ title: tooltip });
	};
	
	var setInLocalStorage = function(itemName, itemValue) {
		localStorage.setItem(itemName, itemValue);
	};
	
	var sync = function(asyncChannel, syncData, command) {
		syncData.command = (!!command) ? command : global.Commands.SyncBookmarks;
		asyncChannel.postMessage(syncData);
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
			// Log error
			utility.LogMessage(
				moduleName, 'createLocalBookmark', utility.LogType.Error,
				JSON.stringify(err));
			
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

	var getLocalBookmark = function(localBookmarkId) {
		var deferred = $q.defer();
		
		try {
			chrome.bookmarks.getSubTree(localBookmarkId, function(results) {
				if (!!results[0]) {
					deferred.resolve(results[0]);
				}
				else {
					deferred.reject({ code: global.ErrorCodes.FailedGetLocalBookmarks });
				}
			});
		}
		catch (err) {
			// Log error
			utility.LogMessage(
				moduleName, 'getLocalBookmark', utility.LogType.Error,
				JSON.stringify(err));
			
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
		return getLocalBookmark(parentId)
			.then(function(localBookmark) {
				var bookmarks = localBookmark.children.slice(0, bookmarkIndex);
				var containers = _.filter(bookmarks, function(bookmark) { 
					return bookmark.title === global.Bookmarks.OtherContainerName || 
						   bookmark.title === global.Bookmarks.ToolbarContainerName ||
						   bookmark.title === global.Bookmarks.xBrowserSyncContainerName;
				});
				
				if (!!containers) {
					return containers.length;
				}
				else {
					return 0;
				}
			});
	};

	var isXBookmarkTitleEqual = function(xBookmark, title) {
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

	var wasContainerChanged = function(changedBookmark, xBookmarks) {
		// Check based on title
		if (utility.IsBookmarkContainer(changedBookmark)) {
			return $q.resolve(true);
		}
		
		// If parent is Other bookmarks, check Other bookmarks children for containers
		if (!!changedBookmark.parentId && changedBookmark.parentId === otherBookmarksId) {
			var xbsContainer = utility.GetXBrowserSyncContainer(xBookmarks, false);

			return $q.all([
				xBookmarkIsChildOfLocalBookmarkById(xbsContainer, otherBookmarksId)
			])
				.then(function(results) {
					var xbsContainerFound = results[0];

					if (!!xbsContainerFound) {
						return true;
					}
					
					return false;
				});
		}

		return $q.resolve(false);
	};

	var xBookmarkIsChildOfLocalBookmarkById = function(xBookmark, localBookmarkId) {
		// If xBookmark is null or has no children, return
		if (!xBookmark || !xBookmark.children || xBookmark.children.length === 0) {
			return $q.resolve(false);
		}
		
		// Find xBookmark in local bookmarks children
		return getLocalBookmark(localBookmarkId)
			.then(function(localBookmark) {
				var result = _.findWhere(localBookmark.children, { title: xBookmark.title });
				if (!result) {
					return true;
				}
				else {
					return false;
				}
			});
	};
	
	// Call constructor
	return new ChromeImplementation();
};