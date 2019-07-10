var xBrowserSync = xBrowserSync || {};
xBrowserSync.App = xBrowserSync.App || {};

/* ------------------------------------------------------------------------------------
 * Class name:	xBrowserSync.App.Background
 * Description:	Initialises Firefox background required functionality; registers events; 
 *              listens for sync requests.
 * ------------------------------------------------------------------------------------ */

xBrowserSync.App.Background = function ($q, platform, globals, utility, bookmarks) {
  'use strict';

  var vm, notificationClickHandlers = [];

	/* ------------------------------------------------------------------------------------
	 * Constructor
	 * ------------------------------------------------------------------------------------ */

  var Background = function () {
    vm = this;
    vm.install = function (event) {
      var details = angular.element(event.currentTarget).data('details');
      onInstallHandler(details);
    };
    vm.startup = onStartupHandler;
    browser.alarms.onAlarm.addListener(onAlarmHandler);
    browser.notifications.onClicked.addListener(onNotificationClicked);
    browser.notifications.onClosed.addListener(onNotificationClosed);
    browser.runtime.onMessage.addListener(onMessageHandler);
  };


	/* ------------------------------------------------------------------------------------
	 * Private functions
	 * ------------------------------------------------------------------------------------ */

  var changeBookmark = function (id) {
    var changedBookmark, changeInfo, locationInfo;

    // Retrieve changed bookmark full info
    var prepareToSyncChanges = browser.bookmarks.getSubTree(id)
      .then(function (results) {
        if (!results || results.length === 0) {
          return $q.reject({ code: globals.ErrorCodes.LocalBookmarkNotFound });
        }
        
        changedBookmark = results[0];
        
        // Get changed bookmark location info 
        return platform.Bookmarks.GetLocalBookmarkLocationInfo(id);
      })
      .then(function (results) {
        if (!results) {
          return;
        }
        locationInfo = results;

        // Create change info
        changeInfo = {
          type: globals.UpdateType.Update,
          bookmark: changedBookmark,
          container: locationInfo.container,
          indexPath: locationInfo.indexPath
        };

        // Check if this change should be synced
        return platform.Bookmarks.ShouldSyncLocalChanges(changeInfo)
          .then(function (doSync) {
            return doSync ? changeInfo : null;
          });
      });

    // Queue sync
    return $q(function (resolve, reject) {
      syncBookmarks({
        type: globals.SyncType.Push,
        changeInfo: prepareToSyncChanges
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

  var createBookmark = function (id, createdBookmark) {
    var changeInfo, locationInfo;

    // Get created bookmark location info
    var prepareToSyncChanges = platform.Bookmarks.GetLocalBookmarkLocationInfo(id)
      .then(function (results) {
        if (!results) {
          return;
        }
        locationInfo = results;

        // If bookmark is not folder, get page metadata from current tab
        return (createdBookmark.url ? platform.GetPageMetadata(true) : $q.resolve());
      })
      .then(function (metadata) {
        // Add metadata if bookmark is current tab location
        if (metadata && createdBookmark.url === metadata.url) {
          createdBookmark.title = utility.StripTags(metadata.title);
          createdBookmark.description = utility.StripTags(metadata.description);
          createdBookmark.tags = utility.GetTagArrayFromText(metadata.tags);
        }

        return createdBookmark;
      })
      .then(function (bookmark) {
        // Create change info
        changeInfo = {
          type: globals.UpdateType.Create,
          bookmark: bookmark,
          container: locationInfo.container,
          indexPath: locationInfo.indexPath
        };

        // Check if this change should be synced
        return platform.Bookmarks.ShouldSyncLocalChanges(changeInfo)
          .then(function (doSync) {
            return doSync ? changeInfo : null;
          });
      });

    // Queue sync
    return $q(function (resolve, reject) {
      syncBookmarks({
        type: globals.SyncType.Push,
        changeInfo: prepareToSyncChanges
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

  var disableEventListeners = function (sendResponse) {
    sendResponse = sendResponse || function () { };
    var response = {
      success: true
    };

    try {
      browser.bookmarks.onCreated.removeListener(onCreatedHandler);
      browser.bookmarks.onRemoved.removeListener(onRemovedHandler);
      browser.bookmarks.onChanged.removeListener(onChangedHandler);
      browser.bookmarks.onMoved.removeListener(onMovedHandler);
    }
    catch (err) {
      utility.LogInfo('Failed to disable event listeners');
      response.error = err;
      response.success = false;
    }

    sendResponse(response);
  };

  var displayAlert = function (title, message) {
    // Strip html tags from message
    var urlRegex = new RegExp(globals.URL.Regex);
    var matches = message.match(urlRegex);
    var messageToDisplay = (!matches || matches.length === 0) ? message :
      new DOMParser().parseFromString('<span>' + message + '</span>', 'text/xml').firstElementChild.textContent;

    var options = {
      type: 'basic',
      title: title,
      message: messageToDisplay,
      iconUrl: 'img/notification.png'
    };

    // Display notification
    browser.notifications.create(utility.GetUniqueishId(), options)
      .then(function (notificationId) {
        // If the message contains a url add a click handler
        if (matches && matches.length > 0) {
          var openUrlInNewTab = function () {
            platform.OpenUrl(matches[0]);
          };
          notificationClickHandlers.push({
            id: notificationId,
            eventHandler: openUrlInNewTab
          });
        }
      });
  };

  var enableEventListeners = function (sendResponse) {
    sendResponse = sendResponse || function () { };
    var response = {
      success: true
    };

    $q(function (resolve, reject) {
      disableEventListeners(function (disableResponse) {
        if (disableResponse.success) {
          resolve();
        }
        else {
          reject(disableResponse.error);
        }
      });
    })
      .then(function () {
        browser.bookmarks.onCreated.addListener(onCreatedHandler);
        browser.bookmarks.onRemoved.addListener(onRemovedHandler);
        browser.bookmarks.onChanged.addListener(onChangedHandler);
        browser.bookmarks.onMoved.addListener(onMovedHandler);
      })
      .catch(function (err) {
        utility.LogInfo('Failed to enable event listeners');
        response.error = err;
        response.success = false;
      })
      .finally(function () {
        sendResponse(response);
      });
  };

  var getCurrentSync = function (sendResponse) {
    try {
      sendResponse({
        currentSync: bookmarks.GetCurrentSync(),
        success: true
      });
    }
    catch (err) { }
  };

  var getLatestUpdates = function () {
    // Exit if currently syncing
    var currentSync = bookmarks.GetCurrentSync();
    if (currentSync) {
      return $q.resolve();
    }

    // Exit if sync not enabled
    return platform.LocalStorage.Get(globals.CacheKeys.SyncEnabled)
      .then(function (syncEnabled) {
        if (!syncEnabled) {
          return;
        }

        return bookmarks.CheckForUpdates()
          .then(function (updatesAvailable) {
            if (!updatesAvailable) {
              return;
            }

            // Queue sync
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

  var installExtension = function (currentVersion) {
    // Clear trace log and display permissions panel if not already dismissed
    return platform.LocalStorage.Set(globals.CacheKeys.TraceLog)

      // TODO: Add this back once Firefox supports optional permissions
      // https://bugzilla.mozilla.org/show_bug.cgi?id=1533014

      //  return platform.LocalStorage.Set(globals.CacheKeys.DisplayPermissions, true)
      //})
      .then(function () {
        utility.LogInfo('Installed v' + currentVersion);
      });
  };

  var moveBookmark = function (id, moveInfo) {
    var changeInfo, movedBookmark;

    // Retrieve moved bookmark full info
    var prepareToSyncChanges = browser.bookmarks.getSubTree(id)
      .then(function (results) {
        if (!results || results.length === 0) {
          return $q.reject({ code: globals.ErrorCodes.LocalBookmarkNotFound });
        }
        
        movedBookmark = results[0];

        // Get moved bookmark old and new location info 
        return $q.all([
          platform.Bookmarks.GetLocalBookmarkLocationInfo(moveInfo.oldParentId, [moveInfo.oldIndex]),
          platform.Bookmarks.GetLocalBookmarkLocationInfo(moveInfo.parentId, [moveInfo.index])
        ]);
      })
      .then(function (locationInfo) {
        if (!locationInfo[0] || !locationInfo[1]) {
          return;
        }

        // If negative target index, bookmark was moved above containers
        if (locationInfo[1].indexPath[0] < 0) {
          return $q.reject({ code: globals.ErrorCodes.ContainerChanged });
        }

        // Create change info
        changeInfo = {
          type: globals.UpdateType.Move,
          bookmark: movedBookmark,
          container: locationInfo[0].container,
          indexPath: locationInfo[0].indexPath,
          targetInfo: {
            bookmark: movedBookmark,
            container: locationInfo[1].container,
            indexPath: locationInfo[1].indexPath
          }
        };

        // Check if move changes (remove and add) should be synced
        return $q.all([
          platform.Bookmarks.ShouldSyncLocalChanges(changeInfo),
          platform.Bookmarks.ShouldSyncLocalChanges(changeInfo.targetInfo)
        ])
          .then(function (results) {
            changeInfo.syncChange = results[0];
            changeInfo.targetInfo.syncChange = results[1];
            return changeInfo;
          });
      });

    // Queue sync
    return $q(function (resolve, reject) {
      syncBookmarks({
        type: globals.SyncType.Push,
        changeInfo: prepareToSyncChanges
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
    return syncFunction.apply(this, args)
      .catch(function (err) {
        utility.LogError(err, 'background.onBookmarkEventHandler');

        // Display alert
        var errMessage = utility.GetErrorMessageFromException(err);
        displayAlert(errMessage.title, errMessage.message);
      });
  };

  var onChangedHandler = function () {
    utility.LogInfo('onChanged event detected');
    onBookmarkEventHandler(changeBookmark, arguments);
  };

  var onCreatedHandler = function () {
    utility.LogInfo('onCreated event detected');
    onBookmarkEventHandler(createBookmark, arguments);
  };

  var onInstallHandler = function (details) {
    var currentVersion = browser.runtime.getManifest().version;
    var installOrUpgrade = $q.resolve();

    // Check for upgrade or do fresh install
    if (details && details.reason === 'install') {
      installOrUpgrade = installExtension(currentVersion);
    }
    else if (details && details.reason === 'update' &&
      details.previousVersion &&
      compareVersions(details.previousVersion, currentVersion) === -1) {
      installOrUpgrade = upgradeExtension(details.previousVersion, currentVersion);
    }

    // Run startup process after install/upgrade
    installOrUpgrade.then(onStartupHandler);
  };

  var onMessageHandler = function (message, sender, sendResponse) {
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
      // Enable event listeners
      case globals.Commands.EnableEventListeners:
        enableEventListeners(sendResponse);
        break;
      // Disable event listeners
      case globals.Commands.DisableEventListeners:
        disableEventListeners(sendResponse);
        break;
      // Unknown command
      default:
        var err = new Error('Unknown command: ' + message.command);
        utility.LogError(err, 'background.onMessageHandler');
        sendResponse({ success: false, error: err });
    }

    // Enable async response
    return true;
  };

  var onMovedHandler = function () {
    utility.LogInfo('onMoved event detected');
    onBookmarkEventHandler(moveBookmark, arguments);
  };

  var onNotificationClicked = function (notificationId) {
    // Execute the event handler if one exists and then remove
    var notificationClickHandler = notificationClickHandlers.find(function (x) {
      return x.id === notificationId;
    });
    if (notificationClickHandler != null) {
      notificationClickHandler.eventHandler();
      browser.notifications.clear(notificationId);
    }
  };

  var onNotificationClosed = function (notificationId) {
    // Remove the handler for this notification if one exists
    var index = notificationClickHandlers.findIndex(function (x) {
      return x.id === notificationId;
    });
    if (index >= 0) {
      notificationClickHandlers.splice(index, 1);
    }
  };

  var onRemovedHandler = function () {
    utility.LogInfo('onRemoved event detected');
    onBookmarkEventHandler(removeBookmark, arguments);
  };

  var onStartupHandler = function () {
    var cachedData, syncEnabled;
    utility.LogInfo('Starting up');

    $q.all([
      platform.LocalStorage.Get(),
      platform.LocalStorage.Set(globals.CacheKeys.TraceLog)
    ])
      .then(function (data) {
        cachedData = data[0];
        syncEnabled = cachedData[globals.CacheKeys.SyncEnabled];

        // Add useful debug info to beginning of trace log
        cachedData.appVersion = globals.AppVersion;
        cachedData.platform = _.omit(browserDetect(), 'versionNumber');
        utility.LogInfo(_.omit(
          cachedData,
          'debugMessageLog',
          globals.CacheKeys.Bookmarks,
          globals.CacheKeys.TraceLog,
          globals.CacheKeys.Password
        ));

        // Refresh interface
        platform.Interface.Refresh(syncEnabled);

        // Exit if sync not enabled
        if (!syncEnabled) {
          return;
        }

        // Check for updates to synced bookmarks
        return bookmarks.CheckForUpdates()
          .then(function (updatesAvailable) {
            if (!updatesAvailable) {
              return;
            }

            // Queue sync
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
          .then(function () {
            // Enable event listeners
            return toggleEventListeners(true);
          })
          // Start auto updates
          .then(platform.AutomaticUpdates.Start)
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

  var refreshLocalSyncData = function () {
    utility.LogInfo('Refreshing local sync data');
    return syncBookmarks({ type: globals.SyncType.Pull })
      .then(function () {
        utility.LogInfo('Local sync data refreshed');
      });
  };

  var removeBookmark = function (id, removeInfo) {
    var changeInfo;

    // Get removed bookmark location info 
    var prepareToSyncChanges = platform.Bookmarks.GetLocalBookmarkLocationInfo(removeInfo.parentId, [removeInfo.index])
      .then(function (locationInfo) {
        if (!locationInfo) {
          return;
        }

        // Create change info
        var deletedBookmark = removeInfo.node;
        deletedBookmark.parentId = removeInfo.parentId;
        changeInfo = {
          type: globals.UpdateType.Delete,
          bookmark: deletedBookmark,
          container: locationInfo.container,
          indexPath: locationInfo.indexPath
        };

        // Check if this change should be synced
        return platform.Bookmarks.ShouldSyncLocalChanges(changeInfo)
          .then(function (doSync) {
            return doSync ? changeInfo : null;
          });
      });

    // Queue sync
    return $q(function (resolve, reject) {
      syncBookmarks({
        type: globals.SyncType.Push,
        changeInfo: prepareToSyncChanges
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

    return $q(function (resolve, reject) {
      disableEventListeners(function (response) {
        if (response.success) {
          resolve();
        }
        else {
          reject(response.error);
        }
      });
    })
      .then(function () {
        // Upgrade containers to use current container names
        var upgradedBookmarks = bookmarks.UpgradeContainers(restoreData.bookmarks || []);

        // If bookmarks don't have unique ids, add new ids
        if (!bookmarks.CheckBookmarksHaveUniqueIds(upgradedBookmarks)) {
          return platform.Bookmarks.AddIds(upgradedBookmarks)
            .then(function (updatedBookmarks) {
              return updatedBookmarks;
            });
        }
        else {
          return upgradedBookmarks;
        }
      })
      .then(function (bookmarksToRestore) {
        // Queue sync
        restoreData.bookmarks = bookmarksToRestore;
        return syncBookmarks(restoreData, sendResponse);
      });
  };

  var syncBookmarks = function (syncData, sendResponse) {
    sendResponse = sendResponse || function () { };

    // Disable event listeners if sync will affect local bookmarks
    return (syncData.type === globals.SyncType.Pull || syncData.type === globals.SyncType.Both ?
      toggleEventListeners(false) : $q.resolve())
      .then(function () {
        // Start sync
        return bookmarks.Sync(syncData)
          .catch(function (err) {
            // If local data out of sync, queue refresh sync
            return (bookmarks.CheckIfRefreshSyncedDataOnError(err) ? refreshLocalSyncData() : $q.resolve())
              .then(function () {
                throw err;
              });
          });
      })
      .then(function (bookmarks) {
        try {
          sendResponse({ bookmarks: bookmarks, success: true });
        }
        catch (err) { }

        // Send a message in case the user closed the extension window
        browser.runtime.sendMessage({
          command: globals.Commands.SyncFinished,
          success: true,
          uniqueId: syncData.uniqueId
        })
          .catch(function () { });
      })
      .catch(function (err) {
        try {
          sendResponse({ error: err, success: false });
        }
        catch (innerErr) { }

        // Send a message in case the user closed the extension window
        browser.runtime.sendMessage({
          command: globals.Commands.SyncFinished,
          error: err,
          success: false
        })
          .catch(function () { });
      })
      // Enable event listeners if required
      .finally(toggleEventListeners);
  };

  var toggleEventListeners = function (enable) {
    return (enable == null ? platform.LocalStorage.Get(globals.CacheKeys.SyncEnabled) : $q.resolve(enable))
      .then(function (syncEnabled) {
        return $q(function (resolve, reject) {
          var callback = function (response) {
            if (response.success) {
              resolve();
            }
            else {
              reject(response.error);
            }
          };

          if (syncEnabled) {
            return enableEventListeners(callback);
          }
          else {
            return disableEventListeners(callback);
          }
        });
      });
  };

  var upgradeExtension = function (oldVersion, newVersion) {
    return platform.LocalStorage.Set(globals.CacheKeys.TraceLog)
      .then(function () {
        utility.LogInfo('Upgrading from ' + oldVersion + ' to ' + newVersion);
      })
      .then(function () {
        // For v1.5.0, convert local storage items to storage API and display info panels
        if (newVersion === '1.5.0' && compareVersions(oldVersion, newVersion) < 0) {
          return utility.ConvertLocalStorageToStorageApi()
            .then(function () {
              return platform.LocalStorage.Set(globals.CacheKeys.DisplayOtherSyncsWarning, true);
            });
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
xBrowserSync.App.FirefoxBackground = angular.module('xBrowserSync.App.FirefoxBackground', []);

// Disable debug info
xBrowserSync.App.FirefoxBackground.config(['$compileProvider', function ($compileProvider) {
  $compileProvider.debugInfoEnabled(false);
}]);

// Add platform service
xBrowserSync.App.Platform.$inject = ['$q'];
xBrowserSync.App.FirefoxBackground.factory('platform', xBrowserSync.App.Platform);

// Add global service
xBrowserSync.App.Global.$inject = ['platform'];
xBrowserSync.App.FirefoxBackground.factory('globals', xBrowserSync.App.Global);

// Add httpInterceptor service
xBrowserSync.App.HttpInterceptor.$inject = ['$q', 'globals'];
xBrowserSync.App.FirefoxBackground.factory('httpInterceptor', xBrowserSync.App.HttpInterceptor);
xBrowserSync.App.FirefoxBackground.config(['$httpProvider', function ($httpProvider) {
  $httpProvider.interceptors.push('httpInterceptor');
}]);

// Add utility service
xBrowserSync.App.Utility.$inject = ['$q', 'platform', 'globals'];
xBrowserSync.App.FirefoxBackground.factory('utility', xBrowserSync.App.Utility);

// Add api service
xBrowserSync.App.API.$inject = ['$http', '$q', 'platform', 'globals', 'utility'];
xBrowserSync.App.FirefoxBackground.factory('api', xBrowserSync.App.API);

// Add bookmarks service
xBrowserSync.App.Bookmarks.$inject = ['$q', '$timeout', 'platform', 'globals', 'api', 'utility'];
xBrowserSync.App.FirefoxBackground.factory('bookmarks', xBrowserSync.App.Bookmarks);

// Add platform implementation service
xBrowserSync.App.PlatformImplementation.$inject = ['$interval', '$q', '$timeout', 'platform', 'globals', 'utility', 'bookmarks'];
xBrowserSync.App.FirefoxBackground.factory('platformImplementation', xBrowserSync.App.PlatformImplementation);

// Add background module
xBrowserSync.App.Background.$inject = ['$q', 'platform', 'globals', 'utility', 'bookmarks', 'platformImplementation'];
xBrowserSync.App.FirefoxBackground.controller('Controller', xBrowserSync.App.Background);

// Set synchronous event handlers
browser.runtime.onInstalled.addListener(function (details) {
  // Store event details as element data
  var element = document.querySelector('#install');
  angular.element(element).data('details', details);
  document.querySelector('#install').click();
});
browser.runtime.onStartup.addListener(function () {
  document.querySelector('#startup').click();
});