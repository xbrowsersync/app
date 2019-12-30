var xBrowserSync = xBrowserSync || {};
xBrowserSync.App = xBrowserSync.App || {};

/* ------------------------------------------------------------------------------------
 * Class name:	xBrowserSync.App.Background
 * Description:	Initialises Chrome background required functionality; registers events; 
 *              listens for sync requests.
 * ------------------------------------------------------------------------------------ */

xBrowserSync.App.Background = function ($q, $timeout, platform, globals, utility, bookmarks) {
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
    chrome.alarms.onAlarm.addListener(onAlarmHandler);
    chrome.notifications.onClicked.addListener(onNotificationClicked);
    chrome.notifications.onClosed.addListener(onNotificationClosed);
    chrome.runtime.onMessage.addListener(onMessageHandler);
  };


	/* ------------------------------------------------------------------------------------
	 * Private functions
	 * ------------------------------------------------------------------------------------ */

  var changeBookmark = function (id) {
    var changedBookmark, changeInfo, locationInfo, syncChange = $q.defer();

    // Retrieve changed bookmark full info
    var prepareToSyncChanges = $q(function (resolve, reject) {
      chrome.bookmarks.getSubTree(id, function (subTree) {
        var apiError = checkForApiError();
        if (apiError) {
          return reject(apiError);
        }

        resolve(subTree);
      });
    })
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
          utility.LogWarning('Unable to retrieve local bookmark location info, not syncing this change');
          syncChange.resolve(false);
          return;
        }
        locationInfo = results;

        // If updated bookmark is separator update local bookmark properties
        return (bookmarks.IsSeparator(changedBookmark) ? convertLocalBookmarkToSeparator(changedBookmark) : $q.resolve(changedBookmark))
          .then(function (bookmark) {
            // Create change info
            changeInfo = {
              bookmark: bookmark,
              container: locationInfo.container,
              indexPath: locationInfo.indexPath,
              type: globals.UpdateType.Update
            };

            // Check if this change should be synced
            return platform.Bookmarks.ShouldSyncLocalChanges(changeInfo);
          })
          .then(function (doSync) {
            syncChange.resolve(doSync);
            return changeInfo;
          });
      })
      .catch(function (err) {
        syncChange.reject(err);
      });

    // Queue sync
    return $q(function (resolve, reject) {
      queueBookmarksSync({
        changeInfo: prepareToSyncChanges,
        syncChange: syncChange.promise,
        type: globals.SyncType.Push
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

  var checkForApiError = function () {
    var err;

    if (chrome.runtime.lastError) {
      err = new Error(chrome.runtime.lastError.message);
      utility.LogError(err);
    }

    return err;
  };

  var checkForUpdatesOnStartup = function () {
    return $q(function (resolve, reject) {
      // If network disconnected, skip update check
      if (!utility.IsNetworkConnected()) {
        return resolve(false);
      }

      // Check for updates to synced bookmarks
      bookmarks.CheckForUpdates()
        .then(resolve)
        .catch(function (err) {
          // If request failed, retry once
          if (err.code !== globals.ErrorCodes.HttpRequestFailed) {
            return reject(err);
          }

          utility.LogInfo('Connection to API failed, retrying check for sync updates momentarily');
          $timeout(function () {
            platform.LocalStorage.Get(globals.CacheKeys.SyncEnabled)
              .then(function (syncEnabled) {
                if (!syncEnabled) {
                  utility.LogInfo('Sync was disabled before retry attempted');
                  return reject({ code: globals.ErrorCodes.HttpRequestCancelled });
                }

                bookmarks.CheckForUpdates().then(resolve).catch(reject);
              })
              .catch(reject);
          }, 5000);
        });
    })
      .then(function (updatesAvailable) {
        if (!updatesAvailable) {
          return;
        }

        // Queue sync
        return $q(function (resolve, reject) {
          queueBookmarksSync({
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
  };

  var convertLocalBookmarkToSeparator = function (bookmark) {
    return toggleEventListeners(false)
      .then(function () {
        return platform.Bookmarks.LocalBookmarkInToolbar(bookmark);
      })
      .then(function (inToolbar) {
        var title = inToolbar ? globals.Bookmarks.VerticalSeparatorTitle : globals.Bookmarks.HorizontalSeparatorTitle;
        return $q(function (resolve, reject) {
          // Remove and recreate bookmark as a separator
          var separator = {
            index: bookmark.index,
            parentId: bookmark.parentId,
            title: title,
            url: platform.GetNewTabUrl()
          };

          chrome.bookmarks.remove(bookmark.id, function () {
            var apiError = checkForApiError();
            if (apiError) {
              return reject(apiError);
            }

            chrome.bookmarks.create(separator, function (createdBookmark) {
              var apiError = checkForApiError();
              if (apiError) {
                return reject(apiError);
              }

              resolve(createdBookmark);
            });
          });
        });
      })
      .finally(function () {
        return toggleEventListeners(true);
      });
  };

  var checkPermsAndGetPageMetadata = function () {
    return platform.Permissions.Check()
      .then(function (hasPermissions) {
        if (!hasPermissions) {
          utility.LogInfo('Do not have permission to read active tab content');
        }

        // Depending on current perms, get full or partial page metadata
        return hasPermissions ? platform.GetPageMetadata(true) : platform.GetPageMetadata(false);
      });
  };

  var createBookmark = function (id, createdBookmark) {
    var changeInfo, locationInfo, syncChange = $q.defer();

    // Get created bookmark location info
    var prepareToSyncChanges = platform.Bookmarks.GetLocalBookmarkLocationInfo(id)
      .then(function (results) {
        if (!results) {
          utility.LogWarning('Unable to retrieve local bookmark location info, not syncing this change');
          syncChange.resolve(false);
          return;
        }
        locationInfo = results;

        var convertToSeparatorOrGetMetadata;
        if (bookmarks.IsSeparator(createdBookmark)) {
          // If bookmark is separator update local bookmark properties
          convertToSeparatorOrGetMetadata = convertLocalBookmarkToSeparator(createdBookmark);
        }
        else if (createdBookmark.url) {
          // If bookmark is not folder, get page metadata from current tab
          convertToSeparatorOrGetMetadata = checkPermsAndGetPageMetadata()
            .then(function (metadata) {
              // Add metadata if bookmark is current tab location
              if (metadata && createdBookmark.url === metadata.url) {
                createdBookmark.title = utility.StripTags(metadata.title);
                createdBookmark.description = utility.StripTags(metadata.description);
                createdBookmark.tags = utility.GetTagArrayFromText(metadata.tags);
              }

              return createdBookmark;
            });
        }
        else {
          convertToSeparatorOrGetMetadata = $q.resolve(createdBookmark);
        }

        return convertToSeparatorOrGetMetadata
          .then(function (bookmark) {
            // Create change info
            changeInfo = {
              bookmark: bookmark,
              container: locationInfo.container,
              indexPath: locationInfo.indexPath,
              type: globals.UpdateType.Create
            };

            // Check if this change should be synced
            return platform.Bookmarks.ShouldSyncLocalChanges(changeInfo);
          })
          .then(function (doSync) {
            syncChange.resolve(doSync);
            return changeInfo;
          });
      })
      .catch(function (err) {
        syncChange.reject(err);
      });

    // Queue sync
    return $q(function (resolve, reject) {
      queueBookmarksSync({
        changeInfo: prepareToSyncChanges,
        syncChange: syncChange.promise,
        type: globals.SyncType.Push
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

    chrome.bookmarks.onCreated.removeListener(onCreatedHandler);
    chrome.bookmarks.onRemoved.removeListener(onRemovedHandler);
    chrome.bookmarks.onChanged.removeListener(onChangedHandler);
    chrome.bookmarks.onMoved.removeListener(onMovedHandler);

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
      iconUrl: 'img/notification.svg'
    };

    // Display notification
    chrome.notifications.create(utility.GetUniqueishId(), options, function (notificationId) {
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
        chrome.bookmarks.onCreated.addListener(onCreatedHandler);
        chrome.bookmarks.onRemoved.addListener(onRemovedHandler);
        chrome.bookmarks.onChanged.addListener(onChangedHandler);
        chrome.bookmarks.onMoved.addListener(onMovedHandler);
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
              queueBookmarksSync({
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
      .then(function () {
        return $q.all([
          platform.LocalStorage.Set(globals.CacheKeys.DisplayHelp, true),
          platform.LocalStorage.Get(globals.CacheKeys.DisplayPermissions)
            .then(function (displayPermissions) {
              if (displayPermissions === false) {
                return;
              }
              return platform.LocalStorage.Set(globals.CacheKeys.DisplayPermissions, true);
            })
        ]);
      })
      .then(function () {
        utility.LogInfo('Installed v' + currentVersion);
      });
  };

  var moveBookmark = function (id, moveInfo) {
    var changeInfo, movedBookmark, syncChange = $q.defer();

    // Retrieve moved bookmark full info
    var prepareToSyncChanges = $q(function (resolve, reject) {
      chrome.bookmarks.getSubTree(id, function (subTree) {
        var apiError = checkForApiError();
        if (apiError) {
          return reject(apiError);
        }

        resolve(subTree);
      });
    })
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
          utility.LogWarning('Unable to retrieve local bookmark location info, not syncing this change');
          syncChange.resolve(false);
          return;
        }

        // If negative target index, bookmark was moved above containers
        if (locationInfo[1].indexPath[0] < 0) {
          return $q.reject({ code: globals.ErrorCodes.ContainerChanged });
        }

        // Create change info
        changeInfo = {
          bookmark: movedBookmark,
          container: locationInfo[0].container,
          indexPath: locationInfo[0].indexPath,
          targetInfo: {
            bookmark: movedBookmark,
            container: locationInfo[1].container,
            indexPath: locationInfo[1].indexPath
          },
          type: globals.UpdateType.Move
        };

        // If bookmark is separator update local bookmark properties
        return (bookmarks.IsSeparator(movedBookmark) ? convertLocalBookmarkToSeparator(movedBookmark) : $q.resolve())
          .then(function () {
            // Check if move changes (remove and add) should be synced
            return $q.all([
              platform.Bookmarks.ShouldSyncLocalChanges(changeInfo),
              platform.Bookmarks.ShouldSyncLocalChanges(changeInfo.targetInfo)
            ]);
          })
          .then(function (results) {
            changeInfo.syncChange = results[0];
            changeInfo.targetInfo.syncChange = results[1];
            syncChange.resolve(changeInfo.syncChange || changeInfo.targetInfo.syncChange);
            return changeInfo;
          });
      })
      .catch(function (err) {
        syncChange.reject(err);
      });

    // Queue sync
    return $q(function (resolve, reject) {
      queueBookmarksSync({
        changeInfo: prepareToSyncChanges,
        syncChange: syncChange.promise,
        type: globals.SyncType.Push
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
          if (utility.IsNetworkConnectionError(err)) {
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
    var currentVersion = chrome.runtime.getManifest().version;
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
      // Queue bookmarks sync
      case globals.Commands.SyncBookmarks:
        queueBookmarksSync(message, sendResponse);
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
      chrome.notifications.clear(notificationId);
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

        // Enable event listeners
        return toggleEventListeners(true)
          // Start auto updates
          .then(platform.AutomaticUpdates.Start)
          // Check for updates
          .then(checkForUpdatesOnStartup)
          .catch(function (err) {
            // If check for updates was cancelled don't continue
            if (err.code === globals.ErrorCodes.HttpRequestCancelled) {
              return;
            }

            // Display alert
            var errMessage = utility.GetErrorMessageFromException(err);
            displayAlert(errMessage.title, errMessage.message);

            utility.LogError(err, 'background.onStartupHandler');
          });
      });
  };

  var queueBookmarksSync = function (syncData, sendResponse) {
    sendResponse = sendResponse || function () { };

    // Disable event listeners if sync will affect local bookmarks
    return (syncData.type === globals.SyncType.Pull || syncData.type === globals.SyncType.Both ?
      toggleEventListeners(false) : $q.resolve())
      .then(function () {
        // Queue sync
        return bookmarks.QueueSync(syncData)
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
        catch (innerErr) { }

        // Send a message in case the user closed the extension window
        chrome.runtime.sendMessage({
          command: globals.Commands.SyncFinished,
          error: err,
          success: false
        });
      })
      // Enable event listeners if required
      .finally(toggleEventListeners);
  };

  var refreshLocalSyncData = function () {
    return queueBookmarksSync({ type: globals.SyncType.Pull })
      .then(function () {
        utility.LogInfo('Local sync data refreshed');
      });
  };

  var removeBookmark = function (id, removeInfo) {
    var changeInfo, syncChange = $q.defer();

    // Get removed bookmark location info 
    var prepareToSyncChanges = platform.Bookmarks.GetLocalBookmarkLocationInfo(removeInfo.parentId, [removeInfo.index])
      .then(function (locationInfo) {
        if (!locationInfo) {
          utility.LogWarning('Unable to retrieve local bookmark location info, not syncing this change');
          syncChange.resolve(false);
          return;
        }

        // Create change info
        var deletedBookmark = removeInfo.node;
        deletedBookmark.parentId = removeInfo.parentId;
        changeInfo = {
          bookmark: deletedBookmark,
          container: locationInfo.container,
          indexPath: locationInfo.indexPath,
          type: globals.UpdateType.Delete
        };

        // Check if this change should be synced
        return platform.Bookmarks.ShouldSyncLocalChanges(changeInfo)
          .then(function (doSync) {
            syncChange.resolve(doSync);
            return changeInfo;
          });
      })
      .catch(function (err) {
        syncChange.reject(err);
      });

    // Queue sync
    return $q(function (resolve, reject) {
      queueBookmarksSync({
        changeInfo: prepareToSyncChanges,
        syncChange: syncChange.promise,
        type: globals.SyncType.Push
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
        return !bookmarks.CheckBookmarksHaveUniqueIds(upgradedBookmarks) ?
          platform.Bookmarks.AddIds(upgradedBookmarks)
            .then(function (updatedBookmarks) {
              return updatedBookmarks;
            }) :
          upgradedBookmarks;
      })
      .then(function (bookmarksToRestore) {
        // Queue sync
        restoreData.bookmarks = bookmarksToRestore;
        return queueBookmarksSync(restoreData, sendResponse);
      });
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
        if (compareVersions(oldVersion, newVersion)) {
          switch (true) {
            // v1.5.0
            case newVersion.indexOf('1.5.0') === 0:
              return upgradeTo150();
          }
        }
      })
      .then(function () {
        // Display alert and set update panel to show
        displayAlert(
          platform.GetConstant(globals.Constants.Updated_Title) + globals.AppVersion,
          platform.GetConstant(globals.Constants.Updated_Message));
        return platform.LocalStorage.Set(globals.CacheKeys.DisplayUpdated, true);
      })
      .catch(function (err) {
        utility.LogError(err, 'background.upgradeExtension');

        // Display alert
        var errMessage = utility.GetErrorMessageFromException(err);
        displayAlert(errMessage.title, errMessage.message);
      });
  };

  var upgradeTo150 = function () {
    // Convert local storage items to storage API
    return utility.ConvertLocalStorageToStorageApi()
      .then(function () {
        // Check if optional permissions were granted and set other syncs warning panel to display
        return $q.all([
          platform.Permissions.Check(),
          platform.LocalStorage.Set(globals.CacheKeys.DisplayOtherSyncsWarning, true)
        ]);
      })
      .then(function (results) {
        var hasPermissions = results[0];
        if (!hasPermissions) {
          return platform.LocalStorage.Set(globals.CacheKeys.DisplayPermissions, true);
        }
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

// Disable unhandled rejections error logging
xBrowserSync.App.ChromeBackground.config(['$qProvider', function ($qProvider) {
  $qProvider.errorOnUnhandledRejections(false);
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
xBrowserSync.App.PlatformImplementation.$inject = ['$interval', '$q', '$timeout', 'platform', 'globals', 'utility', 'bookmarks'];
xBrowserSync.App.ChromeBackground.factory('platformImplementation', xBrowserSync.App.PlatformImplementation);

// Add background module
xBrowserSync.App.Background.$inject = ['$q', '$timeout', 'platform', 'globals', 'utility', 'bookmarks', 'platformImplementation'];
xBrowserSync.App.ChromeBackground.controller('Controller', xBrowserSync.App.Background);

// Set synchronous event handlers
chrome.runtime.onInstalled.addListener(function (details) {
  // Store event details as element data
  var element = document.querySelector('#install');
  angular.element(element).data('details', details);
  document.querySelector('#install').click();
});
chrome.runtime.onStartup.addListener(function () {
  document.querySelector('#startup').click();
});