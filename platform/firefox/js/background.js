var xBrowserSync = xBrowserSync || {};
xBrowserSync.App = xBrowserSync.App || {};

/* ------------------------------------------------------------------------------------
 * Class name:	xBrowserSync.App.BackgroundController
 * Description:	Initialises Firefox background required functionality; registers events; 
 *              listens for sync requests.
 * ------------------------------------------------------------------------------------ */

xBrowserSync.App.BackgroundController = function ($q, $timeout, bookmarkIdMapper, bookmarks, globals, platform, store, utility) {
  'use strict';

  var vm, bookmarkEventsQueue = [], notificationClickHandlers = [], startUpInitiated = false, processBookmarkEventsTimeout;

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
    browser.alarms.onAlarm.addListener(onAlarmHandler);
    browser.notifications.onClicked.addListener(onNotificationClicked);
    browser.notifications.onClosed.addListener(onNotificationClosed);
    browser.runtime.onMessage.addListener(onMessageHandler);
    window.xBrowserSync.App.HandleMessage = onMessageHandler;
  };


	/* ------------------------------------------------------------------------------------
	 * Private functions
	 * ------------------------------------------------------------------------------------ */

  var changeBookmark = function (id, changes) {
    // Create change info
    var changeInfo = {
      bookmark: angular.copy(changes),
      type: globals.UpdateType.Update
    };
    changeInfo.bookmark.id = id;

    // Queue sync
    queueBookmarksSync({
      changeInfo: changeInfo,
      type: globals.SyncType.Push
    }, function (response) {
      if (!response.success) {
        // Display alert
        var errMessage = utility.GetErrorMessageFromException(response.error);
        displayAlert(errMessage.title, errMessage.message);
      }
    }, false);

    return $q.resolve();
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
        utility.LogInfo('Couldn’t check for updates on startup: network offline');
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
            store.Get(globals.CacheKeys.SyncEnabled)
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
              resolve();
            }
            else {
              reject(response.error);
            }
          });
        });
      });
  };

  var createBookmark = function (id, createdBookmark) {
    // Create change info
    var changeInfo = {
      bookmark: angular.copy(createdBookmark),
      type: globals.UpdateType.Create
    };
    changeInfo.bookmark.id = id;

    // If bookmark is not folder or separator, get page metadata from current tab
    return (createdBookmark.url && !bookmarks.IsSeparator(createdBookmark) ? platform.GetPageMetadata() : $q.resolve())
      .then(function (metadata) {
        // Add metadata if bookmark is current tab location
        if (metadata && createdBookmark.url === metadata.url) {
          changeInfo.bookmark.title = utility.StripTags(metadata.title);
          changeInfo.bookmark.description = utility.StripTags(metadata.description);
          changeInfo.bookmark.tags = utility.GetTagArrayFromText(metadata.tags);
        }

        // Queue sync
        queueBookmarksSync({
          changeInfo: changeInfo,
          type: globals.SyncType.Push
        }, function (response) {
          if (!response.success) {
            // Display alert
            var errMessage = utility.GetErrorMessageFromException(response.error);
            displayAlert(errMessage.title, errMessage.message);
          }
        }, false);
      });
  };

  var disableEventListeners = function (sendResponse) {
    sendResponse = sendResponse || function () { };
    var response = {
      success: true
    };

    $q.all([
      browser.bookmarks.onCreated.removeListener(onCreatedHandler),
      browser.bookmarks.onRemoved.removeListener(onRemovedHandler),
      browser.bookmarks.onChanged.removeListener(onChangedHandler),
      browser.bookmarks.onMoved.removeListener(onMovedHandler)
    ])
      .catch(function (err) {
        utility.LogInfo('Failed to disable event listeners');
        response.error = err;
        response.success = false;
      })
      .finally(function () {
        sendResponse(response);
      });
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
    browser.notifications.create(utility.GetUniqueishId(), options)
      .then(function (notificationId) {
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

  var fixMultipleMoveOldIndexes = function () {
    var processBatch = function (batch) {
      // Adjust oldIndexes if bookmarks moved to different parent or to higher indexes
      if (batch[0].parentId !== batch[0].oldParentId || batch[0].index > batch[0].oldIndex) {
        for (var i = batch.length - 1; i >= 0; i--) {
          batch[i].oldIndex = batch[i].oldIndex - i;
        }
      }
    };

    var finalBatch = bookmarkEventsQueue.reduce(function (currentBatch, currentEvent, currentIndex) {
      // Check the current event is a move
      if (currentEvent[0] === moveBookmark) {
        // If no events in batch, add this as the first and continue
        if (currentBatch.length === 0) {
          currentBatch.push(currentEvent[1][1]);
          return currentBatch;
        }

        // Otherwise check if this is part of the batch (will have same parent and index as first event)
        var currentMoveInfo = currentEvent[1][1];
        if (currentMoveInfo.parentId === currentBatch[0].parentId &&
          (currentMoveInfo.index === currentBatch[0].index ||
            currentMoveInfo.index === bookmarkEventsQueue[currentIndex - 1][1][1].index + 1)) {
          currentBatch.push(currentMoveInfo);
          return currentBatch;
        }
      }

      if (currentBatch.length > 0) {
        // Process current batch
        processBatch(currentBatch);
      }

      // Return empty batch
      return [];
    }, []);

    if (finalBatch.length > 0) {
      // Process final batch
      processBatch(finalBatch);
    }
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
    return store.Get(globals.CacheKeys.SyncEnabled)
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
                  resolve();
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
    // Initialise data storage
    return store.Clear()
      .then(function () {
        return $q.all([
          store.Set(globals.CacheKeys.CheckForAppUpdates, true),
          store.Set(globals.CacheKeys.DisplayHelp, true),
          store.Set(globals.CacheKeys.SyncBookmarksToolbar, true),
          // TODO: Add this back once Firefox supports optional permissions
          // https://bugzilla.mozilla.org/show_bug.cgi?id=1432083
          //store.Set(globals.CacheKeys.DisplayPermissions, true)
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
            return store.Set(globals.CacheKeys.InstallBackup, JSON.stringify(data));
          });
      })
      .then(function () {
        utility.LogInfo('Installed v' + currentVersion);
      });
  };

  var moveBookmark = function (id, moveInfo) {
    // Create change info
    var changeInfo = {
      bookmark: angular.copy(moveInfo),
      type: globals.UpdateType.Move
    };
    changeInfo.bookmark.id = id;

    // Queue sync
    queueBookmarksSync({
      changeInfo: changeInfo,
      type: globals.SyncType.Push
    }, function (response) {
      if (!response.success) {
        // Display alert
        var errMessage = utility.GetErrorMessageFromException(response.error);
        displayAlert(errMessage.title, errMessage.message);
      }
    }, false);

    return $q.resolve();
  };

  var onAlarmHandler = function (alarm) {
    // When alarm fires check for sync updates
    if (alarm && alarm.name === globals.Alarm.Name) {
      getLatestUpdates();
    }
  };

  var onBookmarkEventHandler = function () {
    // Clear timeout
    if (processBookmarkEventsTimeout) {
      $timeout.cancel(processBookmarkEventsTimeout);
    }

    // Add event to the queue and trigger processing after a delay
    bookmarkEventsQueue.push(arguments);
    processBookmarkEventsTimeout = $timeout(processBookmarkEventsQueue, 200);
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
    var currentVersion = browser.runtime.getManifest().version;
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
    var mapIdsBeforeSendResponse = function (callbackInfo) {
      if (message.type === globals.SyncType.Push && callbackInfo && callbackInfo.success === true) {
        return bookmarks.GetBookmarks()
          .then(function (syncedBookmarks) {
            return platform.Bookmarks.BuildIdMappings(syncedBookmarks);
          })
          .catch(function (err) {
            return bookmarks.DisableSync()
              .then(function () {
                callbackInfo = { error: err, success: false };
              });
          })
          .finally(function () {
            sendResponse(callbackInfo);
          });
      }

      sendResponse(callbackInfo);
    };

    switch (message.command) {
      // Queue bookmarks sync
      case globals.Commands.SyncBookmarks:
        queueBookmarksSync(message, mapIdsBeforeSendResponse);
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
        sendResponse({ error: err, success: false });
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
    startUpInitiated = true;
    var syncEnabled;
    utility.LogInfo('Starting up');

    store.Get([
      globals.CacheKeys.CheckForAppUpdates,
      globals.CacheKeys.LastUpdated,
      globals.CacheKeys.ServiceUrl,
      globals.CacheKeys.SyncBookmarksToolbar,
      globals.CacheKeys.SyncEnabled,
      globals.CacheKeys.SyncId,
      globals.CacheKeys.SyncVersion
    ])
      .then(function (cachedData) {
        syncEnabled = cachedData[globals.CacheKeys.SyncEnabled];
        var checkForAppUpdates = cachedData[globals.CacheKeys.CheckForAppUpdates];

        // Add useful debug info to beginning of trace log
        cachedData.appVersion = globals.AppVersion;
        cachedData.platform = _.omit(browserDetect(), 'versionNumber');
        utility.LogInfo(Object.keys(cachedData)
          .filter(function (e) {
            return cachedData[e] != null;
          })
          .reduce(function (o, e) {
            o[e] = cachedData[e];
            return o;
          }, {}));

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

  var processBookmarkEventsQueue = function () {
    // Fix incorrect oldIndex values for multiple moves
    // https://bugzilla.mozilla.org/show_bug.cgi?id=1556427
    fixMultipleMoveOldIndexes();

    var doActionUntil = function () {
      return $q.resolve(bookmarkEventsQueue.length === 0);
    };

    var action = function () {
      // Get first event in the queue
      var currentEvent = bookmarkEventsQueue.shift();
      return currentEvent[0].apply(this, currentEvent[1]);
    };

    // Iterate through the queue and process the events
    utility.PromiseWhile(bookmarkEventsQueue, doActionUntil, action)
      .then(function () {
        $timeout(function () {
          bookmarks.Sync()
            .then(function (syncSuccess) {
              if (!syncSuccess) {
                return;
              }
              // Move local containers into the correct order	
              return platform.EventListeners.Disable()
                .then(platform.Bookmarks.ReorderContainers)
                .then(platform.EventListeners.Enable);
            })
            .catch(function (err) {
              // If local data out of sync, queue refresh sync
              var errToDisplay = err;
              return (bookmarks.CheckIfRefreshSyncedDataOnError(err) ? refreshLocalSyncData() : $q.resolve())
                .catch(function (refreshErr) {
                  errToDisplay = refreshErr;
                })
                .finally(function () {
                  // Display alert
                  var errMessage = utility.GetErrorMessageFromException(errToDisplay);
                  displayAlert(errMessage.title, errMessage.message);
                });
            });
        }, 100);
      });
  };

  var queueBookmarksSync = function (syncData, callback, runSync) {
    runSync = runSync === undefined ? true : runSync;
    callback = callback || function () { };

    // Queue sync
    return bookmarks.QueueSync(syncData, runSync)
      .then(function () {
        callback({ success: true });
      })
      .catch(function (err) {
        // If local data out of sync, queue refresh sync
        return (bookmarks.CheckIfRefreshSyncedDataOnError(err) ? refreshLocalSyncData() : $q.resolve())
          .then(function () {
            // Recreate error object since Firefox does not send the original properly
            var errObj = { code: err.code, logged: err.logged };
            callback({ error: errObj, success: false });
          });
      });
  };

  var refreshLocalSyncData = function () {
    return bookmarks.QueueSync({ type: globals.SyncType.Pull })
      .then(function () {
        utility.LogInfo('Local sync data refreshed');
      });
  };

  var removeBookmark = function (id, removeInfo) {
    // Create change info
    var changeInfo = {
      bookmark: removeInfo.node,
      type: globals.UpdateType.Delete
    };

    // Queue sync
    queueBookmarksSync({
      changeInfo: changeInfo,
      type: globals.SyncType.Push
    }, function (response) {
      if (!response.success) {
        // Display alert
        var errMessage = utility.GetErrorMessageFromException(response.error);
        displayAlert(errMessage.title, errMessage.message);
      }
    }, false);

    return $q.resolve();
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
    return store.Set(globals.CacheKeys.TraceLog)
      .then(function () {
        utility.LogInfo('Upgrading from ' + oldVersion + ' to ' + newVersion);
      })
      .then(function () {
        if (compareVersions(oldVersion, newVersion)) {
          switch (true) {
            case newVersion.indexOf('1.5.3') === 0:
              return upgradeTo153();
          }
        }
      })
      .then(function () {
        // Display alert and set update panel to show
        displayAlert(
          platform.GetConstant(globals.Constants.AppUpdated_Title) + globals.AppVersion,
          platform.GetConstant(globals.Constants.AppUpdated_Message),
          globals.ReleaseNotesUrlStem + globals.AppVersion);
        return store.Set(globals.CacheKeys.DisplayUpdated, true);
      })
      .catch(function (err) {
        utility.LogError(err, 'background.upgradeExtension');

        // Display alert
        var errMessage = utility.GetErrorMessageFromException(err);
        displayAlert(errMessage.title, errMessage.message);
      });
  };

  var upgradeTo153 = function () {
    // Convert local storage items to IndexedDB
    return browser.storage.local.get()
      .then(function (cachedData) {
        if (!cachedData || Object.keys(cachedData).length === 0) {
          return;
        }

        return $q.all(Object.keys(cachedData).map(function (key) {
          return store.Set(key, cachedData[key]);
        }));
      })
      .then(function () {
        return browser.storage.local.clear();
      })
      .then(function () {
        // If sync enabled, create id mappings
        return store.Get(globals.CacheKeys.SyncEnabled)
          .then(function (syncEnabled) {
            if (!syncEnabled) {
              return;
            }
            return bookmarks.GetBookmarks()
              .then(function (cachedBookmarks) {
                return platform.Bookmarks.BuildIdMappings(cachedBookmarks);
              });
          });
      });
  };

  // Call constructor
  return new Background();
};

// Initialise the angular app
xBrowserSync.App.Background = angular.module('xBrowserSync.App.Background', []);

// Disable debug info
xBrowserSync.App.Background.config(['$compileProvider', function ($compileProvider) {
  $compileProvider.debugInfoEnabled(false);
}]);

// Disable unhandled rejections error logging
xBrowserSync.App.Background.config(['$qProvider', function ($qProvider) {
  $qProvider.errorOnUnhandledRejections(false);
}]);

// Add global service
xBrowserSync.App.Background.factory('globals', xBrowserSync.App.Global);

// Add httpInterceptor service
xBrowserSync.App.HttpInterceptor.$inject = ['$q', 'globals'];
xBrowserSync.App.Background.factory('httpInterceptor', xBrowserSync.App.HttpInterceptor);
xBrowserSync.App.Background.config(['$httpProvider', function ($httpProvider) {
  $httpProvider.interceptors.push('httpInterceptor');
}]);

// Add platform service
xBrowserSync.App.Background.factory('platform', xBrowserSync.App.Platform);

// Add store service
xBrowserSync.App.Store.$inject = ['$q'];
xBrowserSync.App.Background.factory('store', xBrowserSync.App.Store);

// Add bookmark id mapper service
xBrowserSync.App.BookmarkIdMapper.$inject = ['$q', 'globals', 'store'];
xBrowserSync.App.Background.factory('bookmarkIdMapper', xBrowserSync.App.BookmarkIdMapper);

// Add utility service
xBrowserSync.App.Utility.$inject = ['$http', '$q', 'platform', 'globals', 'store'];
xBrowserSync.App.Background.factory('utility', xBrowserSync.App.Utility);

// Add api service
xBrowserSync.App.API.$inject = ['$http', '$q', 'platform', 'globals', 'store', 'utility'];
xBrowserSync.App.Background.factory('api', xBrowserSync.App.API);

// Add bookmarks service
xBrowserSync.App.Bookmarks.$inject = ['$q', '$timeout', 'api', 'globals', 'platform', 'store', 'utility'];
xBrowserSync.App.Background.factory('bookmarks', xBrowserSync.App.Bookmarks);

// Add platform implementation service
xBrowserSync.App.PlatformImplementation.$inject = ['$interval', '$q', '$timeout', 'bookmarkIdMapper', 'bookmarks', 'globals', 'platform', 'store', 'utility'];
xBrowserSync.App.Background.factory('platformImplementation', xBrowserSync.App.PlatformImplementation);

// Add background controller
xBrowserSync.App.BackgroundController.$inject = ['$q', '$timeout', 'bookmarkIdMapper', 'bookmarks', 'globals', 'platform', 'store', 'utility', 'platformImplementation'];
xBrowserSync.App.Background.controller('Controller', xBrowserSync.App.BackgroundController);

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