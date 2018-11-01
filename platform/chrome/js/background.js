var xBrowserSync = xBrowserSync || {};
xBrowserSync.App = xBrowserSync.App || {};

/* ------------------------------------------------------------------------------------
 * Class name:	xBrowserSync.App.Background
 * Description:	Initialises Chrome background required functionality; registers events; 
 *              listens for sync requests.
 * ------------------------------------------------------------------------------------ */

xBrowserSync.App.Background = function ($q, platform, globals, utility, api, bookmarks) {
	'use strict';

	var vm, asyncChannel, moduleName = 'xBrowserSync.App.Background', networkErrorDetected = false, checkForUpdatesAttempts = 0, disconnectedAlertDisplayed = false;

	/* ------------------------------------------------------------------------------------
	 * Constructor
	 * ------------------------------------------------------------------------------------ */

	var Background = function () {
		vm = this;

		vm.install = function (details) {
			if (!details) {
				return;
			}

			switch (details.reason) {
				case 'update':
					if (details.previousVersion &&
						details.previousVersion !== chrome.runtime.getManifest().version) {
						// If extension has been updated display updated message
						globals.DisplayUpdated.Set(true);
					}
					break;
			}
		};

		vm.startup = function () {
			// Check if a sync was interrupted
			if (!!globals.IsSyncing.Get()) {
				globals.IsSyncing.Set(false);

				// Disable sync
				globals.SyncEnabled.Set(false);

				// Display alert
				displayAlert(
					platform.GetConstant(globals.Constants.Error_SyncInterrupted_Title),
					platform.GetConstant(globals.Constants.Error_SyncInterrupted_Message));

				return;
			}

			// Exit if sync isn't enabled or event listeners disabled
			if (!globals.SyncEnabled.Get() || globals.DisableEventListeners.Get()) {
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
		};

		chrome.runtime.onConnect.addListener(listenForMessages);
		chrome.runtime.onMessage.addListener(handleMessage);
		chrome.alarms.onAlarm.addListener(handleAlarm);
		chrome.bookmarks.onCreated.addListener(createBookmark);
		chrome.bookmarks.onRemoved.addListener(removeBookmark);
		chrome.bookmarks.onChanged.addListener(changeBookmark);
		chrome.bookmarks.onMoved.addListener(moveBookmark);
	};


	/* ------------------------------------------------------------------------------------
	 * Private functions
	 * ------------------------------------------------------------------------------------ */

	var changeBookmark = function (id, changeInfo) {
		// Exit if sync isn't enabled or event listeners disabled
		if (!globals.SyncEnabled.Get() || globals.DisableEventListeners.Get()) {
			return;
		}

		// Sync updates
		syncBookmarks({
			type: globals.SyncType.Push,
			changeInfo: {
				type: globals.UpdateType.Update,
				data: [id, changeInfo]
			}
		})
			.catch(function (err) {
				// Display alert
				var errMessage = utility.GetErrorMessageFromException(err);
				displayAlert(errMessage.title, errMessage.message);

				// If data out of sync, refresh sync
				if (!!err && !!err.code && err.code === globals.ErrorCodes.DataOutOfSync) {
					syncBookmarks({ type: globals.SyncType.Pull });
				}
			});
	};

	var createBookmark = function (id, bookmark) {
		// Exit if sync isn't enabled or event listeners disabled
		if (!globals.SyncEnabled.Get() || globals.DisableEventListeners.Get()) {
			return;
		}

		// Get page metadata from current tab
		platform.GetPageMetadata()
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
			})
			.catch(function (err) {
				// Display alert
				var errMessage = utility.GetErrorMessageFromException(err);
				displayAlert(errMessage.title, errMessage.message);

				// If data out of sync, refresh sync
				if (!!err && !!err.code && err.code === globals.ErrorCodes.DataOutOfSync) {
					syncBookmarks({ type: globals.SyncType.Pull });
				}
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
		// Exit if sync isn't enabled or event listeners disabled
		if (!globals.SyncEnabled.Get() || globals.DisableEventListeners.Get()) {
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
	};

	var handleAlarm = function (alarm) {
		// When alarm fires check for sync updates
		if (alarm && alarm.name === globals.Alarm.Name.Get()) {
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

	var handleMessage = function (msg) {
		switch (msg.command) {
			// Trigger bookmarks sync
			case globals.Commands.SyncBookmarks:
				syncBookmarks(msg, globals.Commands.SyncBookmarks);
				break;
			// Trigger bookmarks sync with no callback
			case globals.Commands.NoCallback:
				syncBookmarks(msg, globals.Commands.NoCallback);
				break;
			// Trigger bookmarks restore
			case globals.Commands.RestoreBookmarks:
				restoreBookmarks(msg);
				break;
		}
	};

	var listenForMessages = function (port) {
		if (port.name !== globals.Title.Get()) {
			return;
		}

		asyncChannel = port;

		// Listen for messages to initiate syncing
		asyncChannel.onMessage.addListener(function (msg) {
			handleMessage(msg);
		});
	};

	var moveBookmark = function (id, moveInfo) {
		// Exit if sync isn't enabled or event listeners disabled
		if (!globals.SyncEnabled.Get() || globals.DisableEventListeners.Get()) {
			return;
		}

		// Sync updates
		syncBookmarks({
			type: globals.SyncType.Push,
			changeInfo: {
				type: globals.UpdateType.Move,
				data: [id, moveInfo]
			}
		})
			.catch(function (err) {
				// Display alert
				var errMessage = utility.GetErrorMessageFromException(err);
				displayAlert(errMessage.title, errMessage.message);

				// If data out of sync, refresh sync
				if (!!err && !!err.code && err.code === globals.ErrorCodes.DataOutOfSync) {
					syncBookmarks({ type: globals.SyncType.Pull });
				}
			});
	};

	var removeBookmark = function (id, removeInfo) {
		// Exit if sync isn't enabled or event listeners disabled
		if (!globals.SyncEnabled.Get() || globals.DisableEventListeners.Get()) {
			return;
		}

		// Sync updates
		syncBookmarks({
			type: globals.SyncType.Push,
			changeInfo: {
				type: globals.UpdateType.Delete,
				data: [id, removeInfo]
			}
		})
			.catch(function (err) {
				// Display alert
				var errMessage = utility.GetErrorMessageFromException(err);
				displayAlert(errMessage.title, errMessage.message);

				// If data out of sync, refresh sync
				if (!!err && !!err.code && err.code === globals.ErrorCodes.DataOutOfSync) {
					syncBookmarks({ type: globals.SyncType.Pull });
				}
			});
	};

	var restoreBookmarks = function (restoreData) {
		$q(function (resolve) {
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
				syncBookmarks(restoreData, globals.Commands.RestoreBookmarks);
			});
	};

	var syncBookmarks = function (syncData, command) {
		// Check service status
		return api.CheckServiceStatus()
			.then(function () {
				// Start sync
				return bookmarks.Sync(syncData);
			})
			.then(function (bookmarks, initialSyncFailed) {
				// Reset network disconnected flag
				globals.Network.Disconnected.Set(false);

				// If this sync initially failed, alert the user and refresh search results
				if (!!initialSyncFailed) {
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
				if (err && err.code) {
					utility.LogMessage(globals.LogType.Info, 'Sync error: ' + err.code);
				}

				if (command) {
					try {
						asyncChannel.postMessage({ command: command, success: false, error: err });
					}
					catch (innerErr) { }
				}
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
xBrowserSync.App.API.$inject = ['$http', '$q', 'globals', 'utility'];
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