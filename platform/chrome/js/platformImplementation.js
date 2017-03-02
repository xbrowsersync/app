var xBrowserSync = xBrowserSync || {};
xBrowserSync.App = xBrowserSync.App || {};

/* ------------------------------------------------------------------------------------
 * Class name:  xBrowserSync.App.PlatformImplementation 
 * Description: Implements xBrowserSync.App.Platform for Chrome extension.
 * ------------------------------------------------------------------------------------ */

xBrowserSync.App.PlatformImplementation = function($http, $interval, $q, $timeout, platform, globals, utility, bookmarks) {
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
		platform.Bookmarks.AddIds = addIdsToBookmarks;
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
		platform.Interface.Loading.Hide = hideLoading;
        platform.Interface.Loading.Show = displayLoading;
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
	
	var addIdsToBookmarks = function(xBookmarks) { 
        // Get all bookmarks into array
		return $q(function(resolve, reject) {
			chrome.bookmarks.getTree(function(results) { 
				return resolve(results); 
			});
		})
			.then(function(bookmarkTreeNodes) {
				var allBookmarks = [];
				
				// Get all local bookmarks into flat array
				bookmarks.Each(bookmarkTreeNodes, function(bookmark) { 
					if (!!bookmark.url) { 
						allBookmarks.push(bookmark); 
					}
				});
 
				// Sort by dateAdded asc 
				allBookmarks = _.sortBy(allBookmarks, function(bookmark) {  
					return bookmark.dateAdded;  
				}); 
 
				var idCounter = allBookmarks.length; 
				
				// Add ids to containers' children 
				var addIdToBookmark = function(bookmark) { 
					var bookmarkId; 
		
					// If url is not null, check allBookmarks for index 
					if (!!bookmark.url) { 
						bookmarkId = _.findIndex(allBookmarks, function(sortedBookmark) {  
							return sortedBookmark.url === bookmark.url; 
						}); 
					} 
		
					// Otherwise take id from counter and increment 
					if (!_.isUndefined(bookmarkId) && bookmarkId >= 0) { 
						bookmark.id = bookmarkId; 
					} 
					else { 
						bookmark.id = idCounter; 
						idCounter++; 
					} 
		
					_.each(bookmark.children, addIdToBookmark); 
				}; 
				_.each(xBookmarks, addIdToBookmark);

				return xBookmarks;
			});
    };
	
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
                var message = platform.GetConstant(globals.Constants.BackupSuccess_Message).replace(
                    '{fileName}',
                    fileName);
                
                vm.settings.backupRestoreResult = message;
			});
	};
	
	var bookmarksCreated = function(xBookmarks, args) {
		var deferred = $q.defer();
		var createInfo = args[1];
		var changedBookmarkIndex;
		
		// Check new bookmark doesn't have the same name as a container
		if (bookmarks.IsBookmarkContainer(createInfo)) {
			// Disable sync
			globals.SyncEnabled.Set(false);
			return $q.reject({ code: globals.ErrorCodes.ContainerChanged });
		}

		// Get local bookmark's parent's corresponding xBookmark and container
		// Check if any containers are before the changed bookmark that would throw off index
		$q.all([
			findXBookmarkUsingLocalBookmarkId(createInfo.parentId, xBookmarks), 
			getNumContainersBeforeBookmarkIndex(createInfo.parentId, createInfo.index)])
			.then(function(results) {
				var findParentXBookmark = results[0];
            
				// Check if the Toolbar container was found and Toolbar sync is disabled
				if (!!findParentXBookmark.container && findParentXBookmark.container.title === globals.Bookmarks.ToolbarContainerName && !globals.SyncBookmarksToolbar.Get()) {
					return deferred.resolve({
						bookmarks: xBookmarks
					});
				}
				
				// Check if both container and parent bookmark were found
				if (!findParentXBookmark.container || !findParentXBookmark.xBookmark) {
					return $q.reject({
						code: globals.ErrorCodes.UpdatedBookmarkNotFound
					});
				}

				// Create new bookmark
				var newXBookmark = new bookmarks.XBookmark(
					createInfo.title, 
					createInfo.url || null,
					createInfo.description,
					createInfo.tags,
					createInfo.children);
				
				if (!!createInfo.newId) {
					// Use new id supplied
					newXBookmark.id = createInfo.newId;
				}
				else {
					// Get new bookmark id
					newXBookmark.id = bookmarks.GetNewBookmarkId(xBookmarks);
				}

				// Add the new bookmark to the parent's children at the correct index
				var numContainers = results[1];
				changedBookmarkIndex = createInfo.index - numContainers;
				findParentXBookmark.xBookmark.children.splice(changedBookmarkIndex, 0, newXBookmark);

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
					globals.SyncEnabled.Set(false);
					return $q.reject({ code: globals.ErrorCodes.ContainerChanged });
				}
		
				// Get deleted local bookmark's parent
				return getLocalBookmark(removeInfo.parentId);
			})
			.then(function(localBookmark) {
				deletedLocalBookmarkParent = localBookmark;

				// Get local bookmark's parent's corresponding xBookmark and container
				// Check if any containers are before the changed bookmark that would throw off index
				return $q.all([
					findXBookmarkUsingLocalBookmarkId(removeInfo.parentId, xBookmarks), 
					getNumContainersBeforeBookmarkIndex(removeInfo.parentId, removeInfo.index)]);
			})
			.then(function(results) {
				var findParentXBookmark = results[0];
            
				// Check if the Toolbar container was found and Toolbar sync is disabled
				if (!!findParentXBookmark.container && findParentXBookmark.container.title === globals.Bookmarks.ToolbarContainerName && !globals.SyncBookmarksToolbar.Get()) {
					return deferred.resolve({
						bookmarks: xBookmarks
					});
				}
				
				// Check if both container and parent bookmark were found
				if (!findParentXBookmark.container || !findParentXBookmark.xBookmark) {
					return $q.reject({
						code: globals.ErrorCodes.UpdatedBookmarkNotFound
					});
				}

				// Otherwise, remove bookmark at the correct index from parent
				var numContainers = results[1];
				changedBookmarkIndex = removeInfo.index - numContainers;
				var removedBookmark = findParentXBookmark.xBookmark.children.splice(changedBookmarkIndex, 1)[0];

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
			id: null,
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
					createArgs[1].newId = removedBookmark.id;
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
					globals.SyncEnabled.Set(false);
					return $q.reject({ code: globals.ErrorCodes.ContainerChanged });
				}
				
				// Get updated local bookmark parent
				return getLocalBookmark(updatedLocalBookmark.parentId);
			})
			.then(function(localBookmark) {
				updatedLocalBookmarkParent = localBookmark;

				// Get local bookmark's parent's corresponding xBookmark and container
				// Check if any containers are before the changed bookmark that would throw off index
				return $q.all([
					findXBookmarkUsingLocalBookmarkId(updatedLocalBookmark.parentId, xBookmarks), 
					getNumContainersBeforeBookmarkIndex(updatedLocalBookmark.parentId, updatedLocalBookmark.index)]);
			})
			.then(function(results) {
				var findParentXBookmark = results[0];
            
				// Check if the Toolbar container was found and Toolbar sync is disabled
				if (!!findParentXBookmark.container && findParentXBookmark.container.title === globals.Bookmarks.ToolbarContainerName && !globals.SyncBookmarksToolbar.Get()) {
					return deferred.resolve({
						bookmarks: xBookmarks
					});
				}
				
				// Check if both container and parent bookmark were found
				if (!findParentXBookmark.container || !findParentXBookmark.xBookmark) {
					return $q.reject({
						code: globals.ErrorCodes.UpdatedBookmarkNotFound
					});
				}

				// Otherwise, update bookmark at correct index
				var numContainers = results[1];
				changedBookmarkIndex = updatedLocalBookmark.index - numContainers;
				var bookmarkToUpdate = findParentXBookmark.xBookmark.children[changedBookmarkIndex];

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
							
						return reject({ code: globals.ErrorCodes.FailedRemoveLocalBookmarks });
                    }
                });
            }
            catch (err) {
                return reject({ code: globals.ErrorCodes.FailedGetLocalBookmarks });
            }
		});
		
		// Clear Bookmarks bar
		clearBookmarksBar = $q(function(resolve, reject) {
			if (globals.SyncBookmarksToolbar.Get()) {
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
							
							return reject({ code: globals.ErrorCodes.FailedRemoveLocalBookmarks });
                        }
                    });
                }
                catch (err) {
                    return reject({ code: globals.ErrorCodes.FailedGetLocalBookmarks });
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
		var asyncChannel = chrome.runtime.connect({ name: globals.Title.Get() });
		
		// Begin listening for sync messages
		asyncChannel.onMessage.addListener(function(msg) {
			if (!msg.command) {
				return;
			}
			
			syncCallback(msg);
		});
		
		return asyncChannel;
	};
	
	var getBookmarks = function(addBookmarkIds) {
		var getOtherBookmarks, getBookmarksBar;
		addBookmarkIds = addBookmarkIds || true;

		// Get Other bookmarks
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
				if (!globals.SyncBookmarksToolbar.Get()) {
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
				var xbsBookmarks = bookmarks.GetXBrowserSyncContainer(otherBookmarks, false);
				if (!!xbsBookmarks && xbsBookmarks.children.length > 0) {
					var xbsContainer = bookmarks.GetXBrowserSyncContainer(xBookmarks, true);
					xbsContainer.children = xbsBookmarks.children;
				}

				// Add other container if bookmarks present
				var otherBookmarksExcXbs = _.reject(otherBookmarks, function(bookmark) { return bookmark.title === globals.Bookmarks.xBrowserSyncContainerName; });
				if (!!otherBookmarksExcXbs && otherBookmarksExcXbs.length > 0) {
					var otherContainer = bookmarks.GetOtherContainer(xBookmarks, true);
					otherContainer.children = otherBookmarksExcXbs;
				}

				// Add toolbar container if bookmarks present
				if (!!bookmarksBar && bookmarksBar.length > 0) {
					var toolbarContainer = bookmarks.GetToolbarContainer(xBookmarks, true);
					toolbarContainer.children = bookmarksBar;
				}

				// Add unique ids
				return addIdsToBookmarks(xBookmarks);
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

				// Grab metadata from current page
				chrome.tabs.executeScript(null, { 
						code: "(" + getCurrentPageMetadata.toString() + ")();" 
					}, 
					function(response) {  
						if (!!response && response.length >= 0) {
							var currentPageMetadata = response[0];

							metadata.title = currentPageMetadata.title;
							metadata.description = utility.StripTags(currentPageMetadata.description);
							metadata.tags = currentPageMetadata.tags;
						}
						
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
		vm.platformName = globals.Platforms.Chrome;
		
		// Enable event listeners
        globals.DisableEventListeners.Set(false);

		// Get async channel for syncing in background
        viewModel.sync.asyncChannel = getAsyncChannel(function(msg) {
            viewModel.scope.$apply(function() {
                viewModel.events.handleSyncResponse(msg);
            });
        });

		// Display contents
		vm.loading = false;

		// Focus on search box
		if (viewModel.view.current === viewModel.view.views.search) {
			$timeout(function() {
				document.querySelector('input[name=txtSearch]').focus();
			});
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
		var otherContainer = bookmarks.GetOtherContainer(xBookmarks);
		var toolbarContainer = bookmarks.GetToolbarContainer(xBookmarks);
		var xbsContainer = bookmarks.GetXBrowserSyncContainer(xBookmarks);
		
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
					
					return reject({ code: globals.ErrorCodes.FailedGetLocalBookmarks });
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
					
					return reject({ code: globals.ErrorCodes.FailedGetLocalBookmarks });
				}
			}
			else {
				resolve();
			}
		});

		// Populate bookmarks bar
		populateToolbar = $q(function(resolve, reject) {
			if (globals.SyncBookmarksToolbar.Get() && !!toolbarContainer && toolbarContainer.children.length > 0) {
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
					
					return reject({ code: globals.ErrorCodes.FailedGetLocalBookmarks });
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
		var tooltip = getConstant(globals.Constants.Title);
		
		if (!!globals.IsSyncing.Get()) {
			iconPath = 'img/browser-action-working.png';
			tooltip += ' - ' + getConstant(globals.Constants.TooltipWorking);
		}
		else if (!!globals.SyncEnabled.Get()) {
			iconPath = 'img/browser-action-on.png';
			tooltip += ' - ' + getConstant(globals.Constants.TooltipSyncEnabled);
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
		syncData.command = (!!command) ? command : globals.Commands.SyncBookmarks;
		asyncChannel.postMessage(syncData);
	};
	
 
/* ------------------------------------------------------------------------------------
 * Private functions
 * ------------------------------------------------------------------------------------ */
    
	var checkForLocalContainer = function(localBookmark) {
        var localContainers = [ 
            { id: bookmarksBarId, xBookmarkTitle: globals.Bookmarks.ToolbarContainerName },
            { id: otherBookmarksId, xBookmarkTitle: globals.Bookmarks.OtherContainerName } 
        ];
		
		// Check if the bookmark id is a local container
        var localContainer = _.findWhere(localContainers, { id: localBookmark.id });

        // If the bookmark is not a local container, check if it is an xBrowserSync container
        if (!localContainer && bookmarks.IsBookmarkContainer(localBookmark)) {
            localContainer = { id: localBookmark.id, xBookmarkTitle: globals.Bookmarks.xBrowserSyncContainerName };
        }

        return localContainer;
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
			// Log error
			utility.LogMessage(
				moduleName, 'createLocalBookmark', utility.LogType.Error,
				JSON.stringify(err));
			
			deferred.reject({ code: globals.ErrorCodes.FailedCreateLocalBookmarks });
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
					deferred.reject({ code: globals.ErrorCodes.FailedGetLocalBookmarks });
				}
			});
		}
		catch (err) {
			// Log error
			utility.LogMessage(
				moduleName, 'getLocalBookmark', utility.LogType.Error,
				JSON.stringify(err));
			
			deferred.reject({ code: globals.ErrorCodes.FailedGetLocalBookmarks });
		}
		
		return deferred.promise;
	};

	var findXBookmarkUsingLocalBookmarkId = function(localBookmarkId, xBookmarks) {
        var deferred = $q.defer();
        var indexTree = [];
        var result = {
            container: null,
            xBookmark: null
        };
        
        (function loop(bookmarkId) {
            var bookmark, bookmarkIndex;
            
            getLocalBookmark(bookmarkId)
                .then(function(localBookmark) {
                    // If the local bookmark is a container, use the index tree to get the xBookmark
                    var localContainer = checkForLocalContainer(localBookmark);
                    if (!!localContainer) {
                        var container;

                        // Get the xBookmark that corresponds to the container
                        switch(localContainer.xBookmarkTitle) {
                            case globals.Bookmarks.OtherContainerName:
                                container = bookmarks.GetOtherContainer(xBookmarks, true);
                                break;
                            case globals.Bookmarks.ToolbarContainerName:
                                container = bookmarks.GetToolbarContainer(xBookmarks, true);
                                break;
                            case globals.Bookmarks.xBrowserSyncContainerName:
                                container = bookmarks.GetXBrowserSyncContainer(xBookmarks, true);
                                break;
                            default:
                                return deferred.reject({ code: globals.ErrorCodes.XBookmarkNotFound });
                        }

                        // Follow the index tree from the container to find the required xBookmark
                        var currentXBookmark = container;                        
                        while (indexTree.length > 0) {
                            var index = indexTree.splice(0, 1)[0];

                            if (!currentXBookmark.children || currentXBookmark.children.length === 0 || !currentXBookmark.children[index]) {
                                return deferred.reject({ code: globals.ErrorCodes.XBookmarkNotFound });
                            }

                            currentXBookmark = currentXBookmark.children[index];
                        }

                        // Return the located xBookmark and corresponding container
                        result.container = container;
                        result.xBookmark = currentXBookmark;                        
                        return deferred.resolve(result);
                    }
                    
                    bookmark = localBookmark;

                    // Check if any containers are before the bookmark that would throw off synced index
				    return getNumContainersBeforeBookmarkIndex(bookmark.parentId, bookmark.index)
                        .then(function(numContainers) {
                            // Add the bookmark's synced index to the index tree
                            bookmarkIndex = bookmark.index - numContainers;
                            indexTree.unshift(bookmarkIndex);

                            // Run the next iteration for the bookmark's parent
                            loop(bookmark.parentId);
                        })
                        .catch(deferred.reject);
                })
                .catch(deferred.reject);
        })(localBookmarkId);

        return deferred.promise;
    };

	var getCurrentPageMetadata = function() { 
		var getPageDescription = function() { 
			var metaElement = document.querySelector('meta[property="og:description" i]') || 
				document.querySelector('meta[name="twitter:description" i]') ||  
				document.querySelector('meta[name="description" i]'); 
			
			if (!!metaElement && !!metaElement.getAttribute('content')) { 
				return metaElement.getAttribute('content'); 
			} 
			
			return null; 
		}; 
		
		var getPageTags = function() { 
			// Get open graph tag values 
			var tagElements = document.querySelectorAll('meta[property$="video:tag" i]'); 
			
			if (!!tagElements && tagElements.length > 0) { 
				var tags = ''; 
				
				for (var i = 0; i < tagElements.length; i++) { 
					tags += tagElements[i].getAttribute('content') + ','; 
				} 
				
				return tags; 
			} 
			
			// Get meta tag values 
			var metaElement = document.querySelector('meta[name="keywords" i]'); 
			
			if (!!metaElement && !!metaElement.getAttribute('content')) { 
				return metaElement.getAttribute('content'); 
			} 
			
			return null; 
		}; 
		
		var getPageTitle = function() { 
			var metaElement = document.querySelector('meta[property="og:title" i]') ||  
				document.querySelector('meta[name="twitter:title" i]'); 
	
			if (!!metaElement && !!metaElement.getAttribute('content')) { 
				return metaElement.getAttribute('content'); 
			} 
			else { 
				return document.title; 
			} 
		}; 
	
		var metadata = { 
			title: getPageTitle(), 
			url: document.location.href, 
			description: getPageDescription(), 
			tags: getPageTags() 
		}; 
	
		return metadata; 
	};
	
	var getLocalBookmarksAsXBookmarks = function(localBookmarks) {
		var xBookmarks = [];
		
		for (var i = 0; i < localBookmarks.length; i++) {
			var newXBookmark = new bookmarks.XBookmark(localBookmarks[i].title, localBookmarks[i].url);
			
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
					return bookmark.title === globals.Bookmarks.OtherContainerName || 
						   bookmark.title === globals.Bookmarks.ToolbarContainerName ||
						   bookmark.title === globals.Bookmarks.xBrowserSyncContainerName;
				});
				
				if (!!containers) {
					return containers.length;
				}
				else {
					return 0;
				}
			});
	};

	var wasContainerChanged = function(changedBookmark, xBookmarks) {
		// Check based on title
		if (bookmarks.IsBookmarkContainer(changedBookmark)) {
			return $q.resolve(true);
		}
		
		// If parent is Other bookmarks, check Other bookmarks children for containers
		if (!!changedBookmark.parentId && changedBookmark.parentId === otherBookmarksId) {
			var xbsContainer = bookmarks.GetXBrowserSyncContainer(xBookmarks, false);

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