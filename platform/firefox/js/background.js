var xBrowserSync = xBrowserSync || {};
xBrowserSync.App = xBrowserSync.App || {};

/* ------------------------------------------------------------------------------------
 * Class name:	xBrowserSync.App.BackgroundController
 * Description:	Initialises Firefox background required functionality; registers events; 
 *              listens for sync requests.
 * ------------------------------------------------------------------------------------ */

xBrowserSync.App.BackgroundController = function ($q, $timeout, platform, globals, store, utility, bookmarks) {
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

  var changeBookmark = function (id) {
    var changedBookmark, changeInfo, locationInfo, syncChange = $q.defer();

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
          utility.LogWarning('Unable to retrieve local bookmark location info, not syncing this change');
          syncChange.resolve(false);
          return;
        }
        locationInfo = results;

        // Create change info
        changeInfo = {
          bookmark: changedBookmark,
          container: locationInfo.container,
          indexPath: locationInfo.indexPath,
          type: globals.UpdateType.Update
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
              resolve(response.bookmarks);
            }
            else {
              reject(response.error);
            }
          });
        });
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

        // Firefox moves folders after adding them as last child, update bookmark location index to 
        // account for this behaviour
        locationInfo.indexPath[locationInfo.indexPath.length - 1] = createdBookmark.index;

        // If bookmark is not folder, get page metadata from current tab
        return (createdBookmark.url ? platform.GetPageMetadata() : $q.resolve())
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
    var changeInfo, movedBookmark, syncChange = $q.defer();

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

        // Check if move changes (remove and add) should be synced
        return $q.all([
          platform.Bookmarks.ShouldSyncLocalChanges(changeInfo),
          platform.Bookmarks.ShouldSyncLocalChanges(changeInfo.targetInfo)
        ])
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

  var onBookmarkEventHandler = function () {
    // Clear timeout
    if (processBookmarkEventsTimeout) {
      $timeout.cancel(processBookmarkEventsTimeout);
    }

    // Add event to the queue and trigger processing after a delay
    bookmarkEventsQueue.push(arguments);
    processBookmarkEventsTimeout = $timeout(processBookmarkEventsQueue, 1e3);
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
    var cachedData, syncEnabled;
    utility.LogInfo('Starting up');

    $q.all([
      store.Get(),
      store.Set(globals.CacheKeys.TraceLog)
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
      currentEvent[0].apply(this, currentEvent[1])
        .catch(function (err) {
          // Display alert
          var errMessage = utility.GetErrorMessageFromException(err);
          displayAlert(errMessage.title, errMessage.message);
        });
      return $q.resolve();
    };

    // Iterate through the queue and process the events
    utility.PromiseWhile(bookmarkEventsQueue, doActionUntil, action)
      .then(function () {
        $timeout(function () {
          bookmarks.Sync()
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
      .then(function (bookmarks) {
        callback({ bookmarks: bookmarks, success: true });
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

// Add utility service
xBrowserSync.App.Utility.$inject = ['$http', '$q', 'platform', 'globals', 'store'];
xBrowserSync.App.Background.factory('utility', xBrowserSync.App.Utility);

// Add api service
xBrowserSync.App.API.$inject = ['$http', '$q', 'platform', 'globals', 'store', 'utility'];
xBrowserSync.App.Background.factory('api', xBrowserSync.App.API);

// Add bookmarks service
xBrowserSync.App.Bookmarks.$inject = ['$q', '$timeout', 'platform', 'globals', 'store', 'api', 'utility'];
xBrowserSync.App.Background.factory('bookmarks', xBrowserSync.App.Bookmarks);

// Add platform implementation service
xBrowserSync.App.PlatformImplementation.$inject = ['$interval', '$q', '$timeout', 'platform', 'globals', 'store', 'utility', 'bookmarks'];
xBrowserSync.App.Background.factory('platformImplementation', xBrowserSync.App.PlatformImplementation);

// Add background controller
xBrowserSync.App.BackgroundController.$inject = ['$q', '$timeout', 'platform', 'globals', 'store', 'utility', 'bookmarks', 'platformImplementation'];
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