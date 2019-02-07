var xBrowserSync = xBrowserSync || {};
xBrowserSync.App = xBrowserSync.App || {};

/* ------------------------------------------------------------------------------------
 * Class name:	xBrowserSync.App.Background
 * Description:	Initialises Chrome background required functionality; registers events; 
 *              listens for sync requests.
 * ------------------------------------------------------------------------------------ */

xBrowserSync.App.Background = function ($q, platform, globals, utility, api, bookmarks) {
	'use strict';

	var vm, asyncChannel;

	/* ------------------------------------------------------------------------------------
	 * Constructor
	 * ------------------------------------------------------------------------------------ */

	var Background = function () {
		vm = this;
		vm.install = onInstallHandler;
		vm.startup = onStartupHandler;
		chrome.runtime.onConnect.addListener(listenForMessages);
		chrome.runtime.onMessage.addListener(onMessageHandler);
		chrome.alarms.onAlarm.addListener(onAlarmHandler);
		chrome.bookmarks.onCreated.addListener(function () { onBookmarkEventHandler(createBookmark, arguments); });
		chrome.bookmarks.onRemoved.addListener(function () { onBookmarkEventHandler(removeBookmark, arguments); });
		chrome.bookmarks.onChanged.addListener(function () { onBookmarkEventHandler(changeBookmark, arguments); });
		chrome.bookmarks.onMoved.addListener(function () { onBookmarkEventHandler(moveBookmark, arguments); });
	};


	/* ------------------------------------------------------------------------------------
	 * Private functions
	 * ------------------------------------------------------------------------------------ */

	var changeBookmark = function (id, changeInfo) {
		return syncBookmarks({
			type: globals.SyncType.Push,
			changeInfo: {
				type: globals.UpdateType.Update,
				data: [id, changeInfo]
			}
		});
	};

	var createBookmark = function (id, bookmark) {
		// Get page metadata from current tab
		return platform.GetPageMetadata()
			.then(function (metadata) {
				// Add metadata if provided
				if (metadata) {
					bookmark.description = utility.StripTags(metadata.description);
					bookmark.tags = utility.GetTagArrayFromText(metadata.tags);
				}

				return syncBookmarks({
					type: globals.SyncType.Push,
					changeInfo: {
						type: globals.UpdateType.Create,
						data: [id, bookmark]
					}
				});
			});
	};

	var displayAlert = function (title, message, callback) {
		var options = {
			type: 'basic',
			title: title,
			message: message,
			iconUrl: 'img/notification-icon.png'
		};

		if (!callback) {
			callback = null;
		}

		chrome.notifications.create('xBrowserSync-notification', options, callback);
	};

	var getLatestUpdates = function () {
		// Exit if currently syncing, sync isn't enabled or event listeners disabled
		return $q.all([
			bookmarks.IsSyncing(),
			platform.LocalStorage.Get([
				globals.CacheKeys.DisableEventListeners,
				globals.CacheKeys.SyncEnabled
			])
		])
			.then(function (data) {
				var isSyncing = data[0];
				var cachedData = data[1];
				if (isSyncing || cachedData[globals.CacheKeys.DisableEventListeners] ||
					!cachedData[globals.CacheKeys.SyncEnabled]) {
					return;
				}

				return bookmarks.CheckForUpdates()
					.then(function (updatesAvailable) {
						if (!updatesAvailable) {
							return;
						}

						// Get bookmark updates
						return syncBookmarks({ type: globals.SyncType.Pull });
					});
			});
	};

	var listenForMessages = function (port) {
		if (port.name !== globals.Title) {
			return;
		}

		asyncChannel = port;

		// Listen for messages to initiate syncing
		asyncChannel.onMessage.addListener(function (msg) {
			onMessageHandler(msg)
				.catch(function (err) {
					// Return if known error
					if (err.code) {
						return;
					}
					
					utility.LogInfo('Unhandled error: ' + err ? err.code || err.message : 'no error obj provided');
					if (err) {
						utility.LogError(err);
					}
				});
		});
	};

	var moveBookmark = function (id, moveInfo) {
		return syncBookmarks({
			type: globals.SyncType.Push,
			changeInfo: {
				type: globals.UpdateType.Move,
				data: [id, moveInfo]
			}
		});
	};

	var onAlarmHandler = function (alarm) {
		// When alarm fires check for sync updates
		if (alarm && alarm.name === globals.Alarm.Name) {
			getLatestUpdates()
				.catch(function (err) {
					// If ID was removed disable sync
					if (err.code === globals.ErrorCodes.NoDataFound) {
						err.code = globals.ErrorCodes.IdRemoved;
						bookmarks.DisableSync();
					}

					// Don't display alert if sync failed due to network connection
					if (err.code === globals.ErrorCodes.HttpRequestFailed ||
						err.code === globals.ErrorCodes.HttpRequestFailedWhileUpdating) {
						return;
					}

					// Display alert
					var errMessage = utility.GetErrorMessageFromException(err);
					displayAlert(errMessage.title, errMessage.message);
				});
		}
	};

	var onBookmarkEventHandler = function (syncFunction, args) {
		// Exit if sync isn't enabled or event listeners disabled
		return platform.LocalStorage.Get([
			globals.CacheKeys.DisableEventListeners,
			globals.CacheKeys.SyncEnabled
		])
			.then(function (cachedData) {
				if (cachedData[globals.CacheKeys.DisableEventListeners] ||
					!cachedData[globals.CacheKeys.SyncEnabled]) {
					return;
				}

				return syncFunction.apply(this, args)
					.catch (function (err) {
						if (err instanceof Error) {
							utility.LogInfo('Unhandled error: ' + err.message);
							utility.LogError(err);
						}
						
						// Display alert
						var errMessage = utility.GetErrorMessageFromException(err);
						displayAlert(errMessage.title, errMessage.message);

						// Local bookmarks now out of sync so refresh sync
						return platform.LocalStorage.Get(globals.CacheKeys.SyncEnabled)
							.then(function (syncEnabled) {
								if (syncEnabled && err.code !== globals.ErrorCodes.HttpRequestFailedWhileUpdating) {
									return syncBookmarks({ type: globals.SyncType.Pull });
								}
							});
					});
			});
	};

	var onInstallHandler = function (details) {
		switch (true) {
			// Extension updated
			case details && details.reason === 'update':
				if (details.previousVersion &&
					details.previousVersion !== chrome.runtime.getManifest().version) {
					// If extension has been updated display updated message
					platform.LocalStorage.Set(globals.CacheKeys.DisplayUpdated, true);
				}
				break;
			// Extension reloaded
			case !details:
				onStartupHandler();
				break;
		}
	};

	var onMessageHandler = function (msg) {
		switch (msg.command) {
			// Trigger bookmarks sync
			case globals.Commands.SyncBookmarks:
				return syncBookmarks(msg, globals.Commands.SyncBookmarks);
			// Trigger bookmarks sync with no callback
			case globals.Commands.NoCallback:
				return syncBookmarks(msg, globals.Commands.NoCallback);
			// Trigger bookmarks restore
			case globals.Commands.RestoreBookmarks:
				return restoreBookmarks(msg);
		}
	};

	var onStartupHandler = function () {
		var isSyncing, syncEnabled;

		$q.all([
			bookmarks.IsSyncing(),
			platform.LocalStorage.Get(globals.CacheKeys.SyncEnabled)
		])
			.then(function (data) {
				isSyncing = data[0];
				syncEnabled = data[1];

				// Check if a sync was interrupted
				if (isSyncing) {
					// Disable sync
					return bookmarks.DisableSync()
						.then(function () {
							// Display alert
							displayAlert(
								platform.GetConstant(globals.Constants.Error_SyncInterrupted_Title),
								platform.GetConstant(globals.Constants.Error_SyncInterrupted_Message));
						});
				}

				// Exit if sync not enabled
				if (!syncEnabled) {
					return;
				}

				// Check for updates to synced bookmarks
				bookmarks.CheckForUpdates()
					.then(function (updatesAvailable) {
						if (!updatesAvailable) {
							return;
						}

						return syncBookmarks({ type: globals.SyncType.Pull });
					})
					.catch(function (err) {
						// Display alert
						var errMessage = utility.GetErrorMessageFromException(err);
						displayAlert(errMessage.title, errMessage.message);
					});
			});
	};

	var removeBookmark = function (id, removeInfo) {
		return syncBookmarks({
			type: globals.SyncType.Push,
			changeInfo: {
				type: globals.UpdateType.Delete,
				data: [id, removeInfo]
			}
		});
	};

	var restoreBookmarks = function (restoreData) {
		return $q(function (resolve) {
			// Upgrade containers to use current container names
			var upgradedBookmarks = bookmarks.UpgradeContainers(restoreData.bookmarks || []);

			// If bookmarks don't have unique ids, add new ids
			if (!bookmarks.CheckBookmarksHaveUniqueIds(upgradedBookmarks)) {
				platform.Bookmarks.AddIds(upgradedBookmarks)
					.then(function (updatedBookmarks) {
						resolve(updatedBookmarks);
					});
			}
			else {
				resolve(upgradedBookmarks);
			}
		})
			.then(function (bookmarksToRestore) {
				restoreData.bookmarks = bookmarksToRestore;
				return syncBookmarks(restoreData, globals.Commands.RestoreBookmarks);
			});
	};

	var syncBookmarks = function (syncData, command) {
		// Start sync
		return bookmarks.Sync(syncData)
			.then(function (bookmarks, initialSyncFailed) {
				// If this sync initially failed, alert the user and refresh search results
				if (initialSyncFailed) {
					displayAlert(
						platform.GetConstant(globals.Constants.ConnRestored_Title),
						platform.GetConstant(globals.Constants.ConnRestored_Message));
				}

				if (command) {
					try {
						asyncChannel.postMessage({
							command: command,
							bookmarks: bookmarks,
							success: true
						});
					}
					catch (err) { }
				}
			})
			.catch(function (err) {
				utility.LogMessage(globals.LogType.Info, 'Sync error: ' + err ? err.code || err.message : 'no error obj provided');

				if (command) {
					try {
						asyncChannel.postMessage({ command: command, success: false, error: err });
					}
					catch (innerErr) { }
				}

				return $q.reject(err);
			})
			.finally(function () {
				utility.LogMessage(globals.LogType.Info, 'Sync data: ' + JSON.stringify(syncData));
			});
	};

	// Call constructor
	return new Background();
};

// Initialise the angular app
xBrowserSync.App.ChromeBackground = angular.module('xBrowserSync.App.ChromeBackground', []);

// Disable debug info
xBrowserSync.App.ChromeBackground.config(['$compileProvider', function ($compileProvider) {
	$compileProvider.debugInfoEnabled(false);
}]);

// Add platform service
xBrowserSync.App.Platform.$inject = ['$q'];
xBrowserSync.App.ChromeBackground.factory('platform', xBrowserSync.App.Platform);

// Add global service
xBrowserSync.App.Global.$inject = ['platform'];
xBrowserSync.App.ChromeBackground.factory('globals', xBrowserSync.App.Global);

// Add httpInterceptor service
xBrowserSync.App.HttpInterceptor.$inject = ['$q', 'globals'];
xBrowserSync.App.ChromeBackground.factory('httpInterceptor', xBrowserSync.App.HttpInterceptor);
xBrowserSync.App.ChromeBackground.config(['$httpProvider', function ($httpProvider) {
	$httpProvider.interceptors.push('httpInterceptor');
}]);

// Add utility service
xBrowserSync.App.Utility.$inject = ['$q', 'platform', 'globals'];
xBrowserSync.App.ChromeBackground.factory('utility', xBrowserSync.App.Utility);

// Add api service
xBrowserSync.App.API.$inject = ['$http', '$q', 'platform', 'globals', 'utility'];
xBrowserSync.App.ChromeBackground.factory('api', xBrowserSync.App.API);

// Add bookmarks service
xBrowserSync.App.Bookmarks.$inject = ['$q', '$timeout', 'platform', 'globals', 'api', 'utility'];
xBrowserSync.App.ChromeBackground.factory('bookmarks', xBrowserSync.App.Bookmarks);

// Add platform implementation service
xBrowserSync.App.PlatformImplementation.$inject = ['$http', '$interval', '$q', '$timeout', 'platform', 'globals', 'utility', 'bookmarks'];
xBrowserSync.App.ChromeBackground.factory('platformImplementation', xBrowserSync.App.PlatformImplementation);

// Add background module
xBrowserSync.App.Background.$inject = ['$q', 'platform', 'globals', 'utility', 'api', 'bookmarks', 'platformImplementation'];
xBrowserSync.App.ChromeBackground.controller('Controller', xBrowserSync.App.Background);

// Set synchronous event handlers
chrome.runtime.onInstalled.addListener(function () {
	document.querySelector('#install').click();
});
chrome.runtime.onStartup.addListener(function () {
	document.querySelector('#startup').click();
});