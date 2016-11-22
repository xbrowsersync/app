var xBrowserSync = xBrowserSync || {};
xBrowserSync.App = xBrowserSync.App || {};

/* ------------------------------------------------------------------------------------
 * Class name:	xBrowserSync.App.Background
 * Description:	Initialises Chrome background required functionality; registers events; 
 *              listens for sync requests.
 * ------------------------------------------------------------------------------------ */

xBrowserSync.App.Background = function($q, platform, globals, utility, bookmarks) {
    'use strict';
	
	var asyncChannel, moduleName = 'xBrowserSync.App.Background';

/* ------------------------------------------------------------------------------------
 * Constructor
 * ------------------------------------------------------------------------------------ */
 
	var Background = function() {
		chrome.runtime.onInstalled.addListener(install);
		
		chrome.runtime.onStartup.addListener(startup);
		
		chrome.bookmarks.onCreated.addListener(createBookmark);
		
		chrome.bookmarks.onRemoved.addListener(removeBookmark);
		
		chrome.bookmarks.onChanged.addListener(changeBookmark);
		
		chrome.bookmarks.onMoved.addListener(moveBookmark);
		
		chrome.bookmarks.onImportBegan.addListener(handleImport);
		
		chrome.alarms.onAlarm.addListener(handleAlarm);
		
		chrome.runtime.onConnect.addListener(listenForMessages);
	};


/* ------------------------------------------------------------------------------------
 * Private functions
 * ------------------------------------------------------------------------------------ */
	
	var changeBookmark = function(id, changeInfo) {
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
		});
	};
	
	var createBookmark = function(id, bookmark) {
		// Exit if sync isn't enabled or event listeners disabled
		if (!globals.SyncEnabled.Get() || globals.DisableEventListeners.Get()) {
            return;
		}
		
		// Sync updates
		syncBookmarks({
			type: globals.SyncType.Push,
			changeInfo: { 
				type: globals.UpdateType.Create, 
				data: [id, bookmark]
			}
		});
	};
	
	var displayAlert = function(title, message, callback) {
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
	
	var handleAlarm = function(alarm) {
		// When alarm fires check for sync updates
		if (alarm && alarm.name === globals.Alarm.Name.Get()) {
			// Exit if sync isn't enabled or event listeners disabled
			if (!globals.SyncEnabled.Get() || globals.DisableEventListeners.Get()) {
				return;
			}
			
			bookmarks.CheckForUpdates()
				.then(function() {
					// Reset fail counter
					globals.CheckForUpdates.Attempts.Set(0);
				})
				.catch(function(err) {
					// Log error
					utility.LogMessage(
						moduleName, 'handleAlarm', utility.LogType.Error,
						JSON.stringify(err));
					
					globals.CheckForUpdates.Attempts.Set(globals.CheckForUpdates.Attempts.Get() + 1);
					if (err.code === globals.ErrorCodes.HttpRequestFailed &&
						globals.CheckForUpdates.Attempts.Get() < globals.CheckForUpdates.MaxRetries) {
						return;
					}
					
					// Display alert
					var errMessage = utility.GetErrorMessageFromException(err);
					displayAlert(errMessage.title, errMessage.message);
				});
		}
	};
	
	var handleImport = function() {
		if (!!globals.SyncEnabled.Get()) {
			// Display alert so that user knows to create new sync
			displayAlert(
				platform.GetConstant(globals.Constants.Error_BrowserImportBookmarksNotSupported_Title), 
				platform.GetConstant(globals.Constants.Error_BrowserImportBookmarksNotSupported_Message));
		}
	};
	
	var handleMessage = function(msg) {
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
	
	var install = function(details) {
		switch(details.reason) {
			case "install":
				// On install, register alarm
				chrome.alarms.clear(globals.Alarm.Name.Get(), function() {
					chrome.alarms.create(
						globals.Alarm.Name.Get(), {
							periodInMinutes: globals.Alarm.Period.Get()
						});
				});
				break;
			case "update":
				// If extension has been updated, display about panel 
				globals.DisplayAboutOnStartup.Set(true);

				// Clear cached bookmarks
				globals.Cache.Bookmarks.Set(null);
				break;
		}
	};
	
	var listenForMessages = function(port) {
		if (port.name !== globals.Title.Get()) {
			return;
		}
		
		asyncChannel = port;
		
		// Listen for messages to initiate syncing
		asyncChannel.onMessage.addListener(function(msg) {
			handleMessage(msg);
		});
	};
	
	var moveBookmark = function(id, moveInfo) {
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
		});
	};
	
	var removeBookmark = function(id, removeInfo) {
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
			.catch(function(err) {
				// Log error
				utility.LogMessage(
					moduleName, 'removeBookmark', utility.LogType.Error,
					JSON.stringify(err));
				
				// Display alert
				var errMessage = utility.GetErrorMessageFromException(err);
				displayAlert(errMessage.title, errMessage.message);

				// If data out of sync, refresh sync
				if (!!err && !!err.code && err.code === globals.ErrorCodes.DataOutOfSync) {
					syncBookmarks({ type: globals.SyncType.Pull });
				}
			});
	};
	
	var restoreBookmarks = function(restoreData) {
		syncBookmarks(restoreData, globals.Commands.RestoreBookmarks);
	};
	
	var startup = function() {
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
			.catch(function(err) {
				// Log error
				utility.LogMessage(
					moduleName, 'startup', utility.LogType.Error,
					JSON.stringify(err));
				
				// Display alert
				var errMessage = utility.GetErrorMessageFromException(err);
				displayAlert(errMessage.title, errMessage.message);
			});
	};
	
	var syncBookmarks = function(syncData, command) {
		// Start sync
		return bookmarks.Sync(syncData)
			.then(function() {
				if (!!command) {
					try {
						asyncChannel.postMessage({ command: command, success: true });
					}
					catch (err) {
						// Log error
						utility.LogMessage(
							moduleName, 'syncBookmarks', utility.LogType.Error,
							'Error posting message to async channel; ' + JSON.stringify(err));
					}
				}
			})
			.catch(function(err) {
				// Log error
				utility.LogMessage(
					moduleName, 'syncBookmarks', utility.LogType.Error,
					'Error syncing bookmarks; ' + JSON.stringify(err));
				utility.LogMessage(
					moduleName, 'syncBookmarks', utility.LogType.Info,
					'syncData: ' + JSON.stringify(syncData));

				if (!!command) {
					try {
						asyncChannel.postMessage({ command: command, success: false, error: err });
					}
					catch (err2) {
						// Log error
						utility.LogMessage(
							moduleName, 'syncBookmarks', utility.LogType.Error,
							'Error posting message to async channel; ' + JSON.stringify(err2));
					}
				}
				else {
					throw err;
				}
			});
	};
	
	// Call constructor
    return new Background();
};

// Initialise the angular app
xBrowserSync.App.ChromeBackground = angular.module('xBrowserSync.App.ChromeBackground', []);

// Disable debug info
xBrowserSync.App.ChromeBackground.config(['$compileProvider', function($compileProvider) {
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
xBrowserSync.App.ChromeBackground.config(['$httpProvider', function($httpProvider) {
$httpProvider.interceptors.push('httpInterceptor');
}]);

// Add utility service
xBrowserSync.App.Utility.$inject = ['$q', 'platform', 'globals'];
xBrowserSync.App.ChromeBackground.factory('utility', xBrowserSync.App.Utility);

// Add api service
xBrowserSync.App.API.$inject = ['$http', '$q', 'globals', 'utility'];
xBrowserSync.App.ChromeBackground.factory('api', xBrowserSync.App.API);

// Add bookmarks service
xBrowserSync.App.Bookmarks.$inject = ['$q', 'platform', 'globals', 'api', 'utility'];
xBrowserSync.App.ChromeBackground.factory('bookmarks', xBrowserSync.App.Bookmarks);

// Add platform implementation service
xBrowserSync.App.PlatformImplementation.$inject = ['$http', '$interval', '$q', '$timeout', 'platform', 'globals', 'utility', 'bookmarks'];
xBrowserSync.App.ChromeBackground.factory('platformImplementation', xBrowserSync.App.PlatformImplementation);

// Add background module
xBrowserSync.App.Background.$inject = ['$q', 'platform', 'globals', 'utility', 'bookmarks', 'platformImplementation'];
xBrowserSync.App.ChromeBackground.controller('Controller', xBrowserSync.App.Background);