var xBrowserSync = xBrowserSync || {};
xBrowserSync.App = xBrowserSync.App || {};

/* ------------------------------------------------------------------------------------
 * Class name:	xBrowserSync.App.Background
 * Description:	Initialises Chrome background required functionality; registers events; 
 *              listens for sync requests.
 * ------------------------------------------------------------------------------------ */

xBrowserSync.App.Background = function ($q, platform, globals, utility, bookmarks) {
  'use strict';

  var vm;

	/* ------------------------------------------------------------------------------------
	 * Constructor
	 * ------------------------------------------------------------------------------------ */

  var Background = function () {
    vm = this;
    vm.install = onInstallHandler;
    vm.startup = onStartupHandler;
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
    utility.LogInfo('onChanged event detected');
    return $q(function (resolve, reject) {
      syncBookmarks({
        type: globals.SyncType.Push,
        changeInfo: {
          type: globals.UpdateType.Update,
          data: [id, changeInfo]
        }
      }, function (response) {
        if (response.success) {
          resolve(response.bookmarks);
        }
        else {
          reject(response.error);
        }
      });
    });
  };

  var createBookmark = function (id, bookmark) {
    utility.LogInfo('onCreated event detected');

    // Get page metadata from current tab
    return platform.GetPageMetadata()
      .then(function (metadata) {
        // Add metadata if provided
        if (metadata) {
          bookmark.title = utility.StripTags(metadata.title);
          bookmark.description = utility.StripTags(metadata.description);
          bookmark.tags = utility.GetTagArrayFromText(metadata.tags);
        }

        return $q(function (resolve, reject) {
          syncBookmarks({
            type: globals.SyncType.Push,
            changeInfo: {
              type: globals.UpdateType.Create,
              data: [id, bookmark]
            }
          }, function (response) {
            if (response.success) {
              resolve(response.bookmarks);
            }
            else {
              reject(response.error);
            }
          });
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

  var getCurrentSync = function (sendResponse) {
    try {
      sendResponse({
        currentSync: bookmarks.GetCurrentSync(),
        success: true
      });
    }
    catch (err) { };
  };

  var getLatestUpdates = function () {
    // Exit if currently syncing
    var currentSync = bookmarks.GetCurrentSync();
    if (currentSync) {
      return $q.resolve();
    }

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

        utility.LogInfo('Checking for updates');

        return bookmarks.CheckForUpdates()
          .then(function (updatesAvailable) {
            if (!updatesAvailable) {
              return;
            }

            utility.LogInfo('Updates found, retrieving latest sync data');

            // Get bookmark updates
            return $q(function (resolve, reject) {
              syncBookmarks({
                type: globals.SyncType.Pull
              }, function (response) {
                if (response.success) {
                  resolve(response.bookmarks);
                }
                else {
                  reject(response.error);
                }
              });
            });
          });
      });
  };

  var moveBookmark = function (id, moveInfo) {
    utility.LogInfo('onMoved event detected');
    return $q(function (resolve, reject) {
      syncBookmarks({
        type: globals.SyncType.Push,
        changeInfo: {
          type: globals.UpdateType.Move,
          data: [id, moveInfo]
        }
      }, function (response) {
        if (response.success) {
          resolve(response.bookmarks);
        }
        else {
          reject(response.error);
        }
      });
    });
  };

  var onAlarmHandler = function (alarm) {
    // When alarm fires check for sync updates
    if (alarm && alarm.name === globals.Alarm.Name) {
      getLatestUpdates()
        .catch(function (err) {
          // Don't display alert if sync failed due to network connection
          if (err.code === globals.ErrorCodes.HttpRequestFailed ||
            err.code === globals.ErrorCodes.HttpRequestFailedWhileUpdating) {
            return;
          }

          utility.LogError(err, 'background.onAlarmHandler');

          // If ID was removed disable sync
          if (err.code === globals.ErrorCodes.NoDataFound) {
            err.code = globals.ErrorCodes.SyncRemoved;
            bookmarks.DisableSync();
          }

          // Display alert
          var errMessage = utility.GetErrorMessageFromException(err);
          displayAlert(errMessage.title, errMessage.message);
        });
    }
  };

  var onBookmarkEventHandler = function (syncFunction, args) {
    // Exit if sync isn't enabled or event listeners disabled
    platform.LocalStorage.Get([
      globals.CacheKeys.DisableEventListeners,
      globals.CacheKeys.SyncEnabled
    ])
      .then(function (cachedData) {
        if (cachedData[globals.CacheKeys.DisableEventListeners] ||
          !cachedData[globals.CacheKeys.SyncEnabled]) {
          return;
        }

        return syncFunction.apply(this, args)
          .catch(function (err) {
            // Display alert
            var errMessage = utility.GetErrorMessageFromException(err);
            displayAlert(errMessage.title, errMessage.message);
          });
      });
  };

  var onInstallHandler = function (details) {
    var currentVersion = chrome.runtime.getManifest().version;
    var doUpgrade = $q.resolve();

    // Check for upgrade
    if (details && details.reason === 'update' &&
      details.previousVersion && details.previousVersion !== currentVersion) {
      doUpgrade = upgradeExtension(details.previousVersion, currentVersion);
    }

    doUpgrade.then(function () {
      // Run startup
      onStartupHandler();
    });
  };

  var onMessageHandler = function (message, sender, sendResponse) {
    var commandName = _.findKey(globals.Commands, function (key) { return key === message.command; });
    utility.LogInfo('background.onMessageHandler: ' + commandName);

    switch (message.command) {
      // Trigger bookmarks sync
      case globals.Commands.SyncBookmarks:
        syncBookmarks(message, sendResponse);
        break;
      // Trigger bookmarks restore
      case globals.Commands.RestoreBookmarks:
        restoreBookmarks(message, sendResponse);
        break;
      // Get current sync in progress
      case globals.Commands.GetCurrentSync:
        getCurrentSync(sendResponse);
        break;
    }

    // Enable async response
    return true;
  };

  var onStartupHandler = function () {
    var cachedData, syncEnabled;

    $q.all([
      platform.LocalStorage.Get(),
      platform.LocalStorage.Set(globals.CacheKeys.DebugMessageLog)
    ])
      .then(function (data) {
        cachedData = data[0];
        syncEnabled = cachedData[globals.CacheKeys.SyncEnabled];
        return utility.LogInfo('Starting up');
      })
      .then(function () {
        cachedData.appVersion = globals.AppVersion;
        return utility.LogInfo(_.omit(
          cachedData,
          globals.CacheKeys.Bookmarks,
          globals.CacheKeys.DebugMessageLog,
          globals.CacheKeys.Password
        ));
      })
      .then(function () {
        // Refresh interface
        platform.Interface.Refresh(syncEnabled);

        // Exit if sync not enabled
        if (!syncEnabled) {
          return;
        }

        // Start auto updates
        platform.AutomaticUpdates.Start()
          // Check for updates to synced bookmarks
          .then(bookmarks.CheckForUpdates)
          .then(function (updatesAvailable) {
            if (!updatesAvailable) {
              return;
            }

            return $q(function (resolve, reject) {
              syncBookmarks({
                type: globals.SyncType.Pull
              }, function (response) {
                if (response.success) {
                  resolve(response.bookmarks);
                }
                else {
                  reject(response.error);
                }
              });
            });
          })
          .catch(function (err) {
            // Display alert
            var errMessage = utility.GetErrorMessageFromException(err);
            displayAlert(errMessage.title, errMessage.message);

            // Don't log error if request failed
            if (err.code === globals.ErrorCodes.HttpRequestFailed) {
              return;
            }

            utility.LogError(err, 'background.onStartupHandler');
          });
      });
  };

  var removeBookmark = function (id, removeInfo) {
    utility.LogInfo('onRemoved event detected');
    return $q(function (resolve, reject) {
      syncBookmarks({
        type: globals.SyncType.Push,
        changeInfo: {
          type: globals.UpdateType.Delete,
          data: [id, removeInfo]
        }
      }, function (response) {
        if (response.success) {
          resolve(response.bookmarks);
        }
        else {
          reject(response.error);
        }
      });
    });
  };

  var restoreBookmarks = function (restoreData, sendResponse) {
    sendResponse = sendResponse || function () { };

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
        return syncBookmarks(restoreData, sendResponse);
      });
  };

  var syncBookmarks = function (syncData, sendResponse) {
    syncData.uniqueId = (new Date()).getTime();
    sendResponse = sendResponse || function () { };

    // Start sync
    return bookmarks.Sync(syncData)
      .then(function (bookmarks) {
        try {
          sendResponse({ bookmarks: bookmarks, success: true });
        }
        catch (err) { };

        // Send a message in case the user closed the extension window
        chrome.runtime.sendMessage({
          command: globals.Commands.SyncFinished,
          success: true,
          uniqueId: syncData.uniqueId
        });
      })
      .catch(function (err) {
        try {
          sendResponse({ error: err, success: false });
        }
        catch (err) { };

        // Send a message in case the user closed the extension window
        chrome.runtime.sendMessage({
          command: globals.Commands.SyncFinished,
          error: err,
          success: false
        });
      });
  };

  var upgradeExtension = function (oldVersion, newVersion) {
    return platform.LocalStorage.Set(globals.CacheKeys.DebugMessageLog)
      .then(function () {
        return utility.LogInfo('Upgrading from ' + oldVersion + ' to ' + newVersion);
      })
      .then(function () {
        // For v1.4.1, convert local storage items to storage API
        if (newVersion === '1.4.1' && compareVersions(oldVersion, newVersion) < 0) {
          return utility.ConvertLocalStorageToStorageApi();
        }
      })
      .then(function () {
        // Set update panel to show
        return platform.LocalStorage.Set(globals.CacheKeys.DisplayUpdated, true);
      })
      .catch(function (err) {
        utility.LogError(err, 'background.upgradeExtension');

        // Display alert
        var errMessage = utility.GetErrorMessageFromException(err);
        displayAlert(errMessage.title, errMessage.message);
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
xBrowserSync.App.Background.$inject = ['$q', 'platform', 'globals', 'utility', 'bookmarks', 'platformImplementation'];
xBrowserSync.App.ChromeBackground.controller('Controller', xBrowserSync.App.Background);

// Set synchronous event handlers
chrome.runtime.onInstalled.addListener(function () {
  document.querySelector('#install').click();
});
chrome.runtime.onStartup.addListener(function () {
  document.querySelector('#startup').click();
});