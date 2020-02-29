var xBrowserSync = xBrowserSync || {};
xBrowserSync.App = xBrowserSync.App || {};

/* ------------------------------------------------------------------------------------
 * Class name:	xBrowserSync.App.Background
 * Description:	Initialises Chrome background required functionality; registers events; 
 *              listens for sync requests.
 * ------------------------------------------------------------------------------------ */

xBrowserSync.App.Background = function ($q, $timeout, platform, globals, utility, bookmarks) {
  'use strict';

  var vm, notificationClickHandlers = [], startUpInitiated = false, syncTimeout;

	/* ------------------------------------------------------------------------------------
	 * Constructor
	 * ------------------------------------------------------------------------------------ */

  var Background = function () {
    vm = this;
    vm.install = function (event) {
      if (startUpInitiated) {
        return;
      }
      var details = angular.element(event.currentTarget).data('details');
      onInstallHandler(details);
    };
    vm.startup = function () {
      if (startUpInitiated) {
        return;
      }
      onStartupHandler();
    };
    chrome.alarms.onAlarm.addListener(onAlarmHandler);
    chrome.notifications.onClicked.addListener(onNotificationClicked);
    chrome.notifications.onClosed.addListener(onNotificationClosed);
    chrome.runtime.onMessage.addListener(onMessageHandler);
    window.xBrowserSync.App.HandleMessage = onMessageHandler;
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
      }, false);
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

  var checkForNewVersion = function () {
    $timeout(function () {
      utility.CheckForNewVersion()
        .then(function (newVersion) {
          if (!newVersion) {
            return;
          }

          displayAlert(platform.GetConstant(globals.Constants.AppUpdateAvailable_Title),
            platform.GetConstant(globals.Constants.AppUpdateAvailable_Message).replace('{version}', newVersion),
            globals.ReleaseNotesUrlStem + newVersion.replace(/^v/, ''));
        });
    }, 5e3);
  };

  var checkForUpdatesOnStartup = function () {
    return $q(function (resolve, reject) {
      // If network disconnected, skip update check
      if (!utility.IsNetworkConnected()) {
        utility.LogInfo('Could not check for updates on startup, no connection');
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

  var convertLocalBookmarkToSeparator = function (bookmark) {
    // Test if sync enabled check needed
    return $q(function (resolve) { disableEventListeners(resolve); })
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
        return $q(function (resolve) { enableEventListeners(resolve); });
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
      }, false);
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

  var disableSync = function (sendResponse) {
    bookmarks.DisableSync()
      .then(function () {
        sendResponse({
          success: true
        });
      });
  };

  var displayAlert = function (title, message, url) {
    // Strip html tags from message
    var urlRegex = new RegExp(globals.URL.ValidUrlRegex);
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
      // Add a click handler to open url if provided or if the message contains a url
      var urlToOpenOnClick = url;
      if (matches && matches.length > 0) {
        urlToOpenOnClick = matches[0];
      }

      if (urlToOpenOnClick) {
        var openUrlInNewTab = function () {
          platform.OpenUrl(urlToOpenOnClick);
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
      })
      .catch(function (err) {
        // Don't display alert if sync failed due to network connection
        if (utility.IsNetworkConnectionError(err)) {
          utility.LogInfo('Could not check for updates, no connection');
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
  };

  var getSyncQueueLength = function (sendResponse) {
    try {
      sendResponse({
        syncQueueLength: bookmarks.GetSyncQueueLength(),
        success: true
      });
    }
    catch (err) { }
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
        // Get local bookmarks and save data state at install to local storage
        return platform.Bookmarks.Get()
          .then(function (localBookmarks) {
            var data = {
              bookmarks: localBookmarks,
              date: new Date().toISOString()
            };
            return platform.LocalStorage.Set(globals.CacheKeys.InstallBackup, JSON.stringify(data));
          });
      })
      .then(function () {
        utility.LogInfo('Installed v' + currentVersion);
      });
  };

  var moveBookmark = function (id, moveInfo) {
    var changeInfo, syncChange = $q.defer();

    // Get moved bookmark old and new location info
    var prepareToSyncChanges = $q.all([
      platform.Bookmarks.GetLocalBookmarkLocationInfo(moveInfo.oldParentId, [moveInfo.oldIndex]),
      platform.Bookmarks.GetLocalBookmarkLocationInfo(moveInfo.parentId, [moveInfo.index])
    ])
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
          container: locationInfo[0].container,
          indexPath: locationInfo[0].indexPath,
          targetInfo: {
            container: locationInfo[1].container,
            indexPath: locationInfo[1].indexPath
          },
          type: globals.UpdateType.Move
        };

        // Retrieve moved local bookmark by id
        return $q(function (resolve, reject) {
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
              utility.LogWarning('Unable to locate moved bookmark');
              return $q.reject({ code: globals.ErrorCodes.LocalBookmarkNotFound });
            }

            // Add moved bookmark to change info 
            changeInfo.bookmark = results[0];
            changeInfo.targetInfo.bookmark = results[0];

            // If bookmark is separator update local bookmark properties
            return (bookmarks.IsSeparator(changeInfo.bookmark) ? convertLocalBookmarkToSeparator(changeInfo.bookmark) : $q.resolve());
          })
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
      }, false);
    });
  };

  var onAlarmHandler = function (alarm) {
    // When alarm fires check for sync updates
    if (alarm && alarm.name === globals.Alarm.Name) {
      getLatestUpdates();
    }
  };

  var onBookmarkEventHandler = function (syncFunction, args) {
    // Clear sync timeout
    if (syncTimeout) {
      $timeout.cancel(syncTimeout);
    }

    // Queue sync
    syncFunction.apply(this, args)
      .catch(function (err) {
        // Display alert
        var errMessage = utility.GetErrorMessageFromException(err);
        displayAlert(errMessage.title, errMessage.message);
      });

    // Execute sync after a delay
    syncTimeout = $timeout(function () {
      bookmarks.Sync();
    }, 1e3);
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
    startUpInitiated = true;
    var currentVersion = chrome.runtime.getManifest().version;
    var installOrUpgrade = $q.resolve();

    // Check for upgrade or do fresh install
    if (details && details.reason === 'install') {
      installOrUpgrade = installExtension(currentVersion);
    }
    else if (details && details.reason === 'update' &&
      details.previousVersion &&
      compareVersions.compare(details.previousVersion, currentVersion, '<')) {
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
      // Get current number of syncs on the queue
      case globals.Commands.GetSyncQueueLength:
        getSyncQueueLength(sendResponse);
        break;
      // Disable sync
      case globals.Commands.DisableSync:
        disableSync(sendResponse);
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
    startUpInitiated = true;
    var cachedData, syncEnabled;
    utility.LogInfo('Starting up');

    $q.all([
      platform.LocalStorage.Get(),
      platform.LocalStorage.Set(globals.CacheKeys.TraceLog)
    ])
      .then(function (data) {
        cachedData = data[0];
        syncEnabled = cachedData[globals.CacheKeys.SyncEnabled];
        var checkForAppUpdates = cachedData[globals.CacheKeys.CheckForAppUpdates];

        // Add useful debug info to beginning of trace log
        cachedData.appVersion = globals.AppVersion;
        cachedData.platform = _.omit(browserDetect(), 'versionNumber');
        utility.LogInfo(_.omit(
          cachedData,
          'debugMessageLog',
          globals.CacheKeys.Bookmarks,
          globals.CacheKeys.InstallBackup,
          globals.CacheKeys.TraceLog,
          globals.CacheKeys.Password
        ));

        // Update browser action icon
        platform.Interface.Refresh(syncEnabled);

        // Check for new app version
        if (checkForAppUpdates) {
          checkForNewVersion();
        }

        // Exit if sync not enabled
        if (!syncEnabled) {
          return;
        }

        // Enable sync
        return bookmarks.EnableSync()
          .then(function () {
            // Check for updates after a slight delay to allow for initialising network connection
            $timeout(function () {
              checkForUpdatesOnStartup()
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
            }, 1e3);
          });
      });
  };

  var queueBookmarksSync = function (syncData, sendResponse, runSync) {
    runSync = runSync === undefined ? true : runSync;
    sendResponse = sendResponse || function () { };

    // Queue sync
    return bookmarks.QueueSync(syncData, runSync)
      .then(function (bookmarks) {
        try {
          sendResponse({ bookmarks: bookmarks, success: true });
        }
        catch (err) { }
      })
      .catch(function (err) {
        // If local data out of sync, queue refresh sync
        return (bookmarks.CheckIfRefreshSyncedDataOnError(err) ? refreshLocalSyncData() : $q.resolve())
          .then(function () {
            try {
              sendResponse({ error: err, success: false });
            }
            catch (innerErr) { }
          });
      });
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
      }, false);
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
        return bookmarks.UpgradeContainers(restoreData.bookmarks || []);
      })
      .then(function (bookmarksToRestore) {
        // Queue sync
        restoreData.bookmarks = bookmarksToRestore;
        return queueBookmarksSync(restoreData, sendResponse);
      });
  };

  var upgradeExtension = function (oldVersion, newVersion) {
    return platform.LocalStorage.Set(globals.CacheKeys.TraceLog)
      .then(function () {
        utility.LogInfo('Upgrading from ' + oldVersion + ' to ' + newVersion);

        // Display alert and set update panel to show
        displayAlert(
          platform.GetConstant(globals.Constants.AppUpdated_Title) + globals.AppVersion,
          platform.GetConstant(globals.Constants.AppUpdated_Message),
          globals.ReleaseNotesUrlStem + globals.AppVersion);
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

// Disable unhandled rejections error logging
xBrowserSync.App.ChromeBackground.config(['$qProvider', function ($qProvider) {
  $qProvider.errorOnUnhandledRejections(false);
}]);

// Add platform service
xBrowserSync.App.Platform.$inject = ['$q'];
xBrowserSync.App.ChromeBackground.factory('platform', xBrowserSync.App.Platform);

// Add global service
xBrowserSync.App.ChromeBackground.factory('globals', xBrowserSync.App.Global);

// Add httpInterceptor service
xBrowserSync.App.HttpInterceptor.$inject = ['$q', 'globals'];
xBrowserSync.App.ChromeBackground.factory('httpInterceptor', xBrowserSync.App.HttpInterceptor);
xBrowserSync.App.ChromeBackground.config(['$httpProvider', function ($httpProvider) {
  $httpProvider.interceptors.push('httpInterceptor');
}]);

// Add utility service
xBrowserSync.App.Utility.$inject = ['$http', '$q', 'platform', 'globals'];
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