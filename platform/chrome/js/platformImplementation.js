var xBrowserSync = xBrowserSync || {};
xBrowserSync.App = xBrowserSync.App || {};

/* ------------------------------------------------------------------------------------
 * Class name:  xBrowserSync.App.PlatformImplementation 
 * Description: Implements xBrowserSync.App.Platform for Chrome extension.
 * ------------------------------------------------------------------------------------ */

xBrowserSync.App.PlatformImplementation = function ($http, $interval, $q, $timeout, platform, globals, utility, bookmarks) {
  'use strict';

  var vm, loadingId;
  var toolbarBookmarksId = '1', otherBookmarksId = '2';
  var unsupportedContainers = [
    globals.Bookmarks.MenuContainerName,
    globals.Bookmarks.MobileContainerName
  ];


	/* ------------------------------------------------------------------------------------
	 * Constructor
	 * ------------------------------------------------------------------------------------ */

  var ChromeImplementation = function () {
    // Inject required platform implementation functions
    platform.AutomaticUpdates.NextUpdate = getAutoUpdatesNextRun;
    platform.AutomaticUpdates.Start = startAutoUpdates;
    platform.AutomaticUpdates.Stop = stopAutoUpdates;
    platform.Bookmarks.AddIds = addIdsToBookmarks;
    platform.Bookmarks.Clear = clearBookmarks;
    platform.Bookmarks.Created = bookmarksCreated;
    platform.Bookmarks.CreateSingle = createSingle;
    platform.Bookmarks.Deleted = bookmarksDeleted;
    platform.Bookmarks.DeleteSingle = deleteSingle;
    platform.Bookmarks.Get = getBookmarks;
    platform.Bookmarks.Moved = bookmarksMoved;
    platform.Bookmarks.Populate = populateBookmarks;
    platform.Bookmarks.Updated = bookmarksUpdated;
    platform.Bookmarks.UpdateSingle = updateSingle;
    platform.DownloadFile = downloadFile;
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
    platform.Sync.Await = awaitSync;
    platform.Sync.Current = getCurrentSync;
    platform.Sync.Execute = executeSync;
  };


	/* ------------------------------------------------------------------------------------
	 * Public functions
	 * ------------------------------------------------------------------------------------ */

  var addIdsToBookmarks = function (xBookmarks) {
    // Get all bookmarks into array
    return $q(function (resolve, reject) {
      try {
        chrome.bookmarks.getTree(function (results) {
          return resolve(results);
        });
      }
      catch (ex) {
        reject(ex);
      }
    })
      .then(function (bookmarkTreeNodes) {
        var allBookmarks = [];

        // Get all local bookmarks into flat array
        bookmarks.Each(bookmarkTreeNodes, function (bookmark) {
          allBookmarks.push(bookmark);
        });

        // Sort by dateAdded asc 
        allBookmarks = _.sortBy(allBookmarks, function (bookmark) {
          return bookmark.dateAdded;
        });

        var idCounter = allBookmarks.length;

        // Add ids to containers' children 
        var addIdToBookmark = function (bookmark) {
          var bookmarkId;

          // Check allBookmarks for index 
          bookmarkId = _.findIndex(allBookmarks, function (sortedBookmark) {
            if (sortedBookmark.title === bookmark.title &&
              sortedBookmark.url === bookmark.url &&
              !sortedBookmark.assigned) {
              return true;
            }
          });

          // Otherwise take id from counter and increment 
          if (!_.isUndefined(bookmarkId) && bookmarkId >= 0) {
            bookmark.id = bookmarkId;

            // Mark this bookmark as assigned to prevent duplicate ids
            allBookmarks[bookmarkId].assigned = true;
          }
          else {
            bookmark.id = idCounter;
            idCounter++;
          }

          if (bookmark.children) {
            _.each(bookmark.children, addIdToBookmark);
          }
        };
        _.each(xBookmarks, addIdToBookmark);

        return xBookmarks;
      });
  };

  var awaitSync = function (uniqueId) {
    return $q(function (resolve, reject) {
      var awaitSyncListener = function (message, sender, sendResponse) {
        // Only listen for SyncFinished messages
        if (message.command !== globals.Commands.SyncFinished || message.uniqueId !== uniqueId) {
          return;
        }

        utility.LogInfo('Awaited sync complete: ' + message.uniqueId);
        chrome.runtime.onMessage.removeListener(awaitSyncListener);

        if (message.success) {
          resolve();
        }
        else {
          reject(message.error);
        }
      };

      // Listen for messages
      chrome.runtime.onMessage.addListener(awaitSyncListener);
    });
  };

  var bookmarksCreated = function (xBookmarks, args) {
    var deferred = $q.defer();
    var createInfo = args[1];
    var changedBookmarkIndex;

    // Check if created bookmark is a container
    wasContainerChanged(createInfo, xBookmarks)
      .then(function (createdBookmarkIsContainer) {
        if (createdBookmarkIsContainer) {
          return $q.reject({ code: globals.ErrorCodes.ContainerChanged });
        }

        // Get local bookmark's parent's corresponding xBookmark and container
        // Check if any containers are before the changed bookmark that would throw off index
        return $q.all([
          findXBookmarkUsingLocalBookmarkId(createInfo.parentId, xBookmarks),
          getNumContainersBeforeBookmarkIndex(createInfo.parentId, createInfo.index),
          bookmarks.GetSyncBookmarksToolbar()
        ]);
      })
      .then(function (results) {
        var findParentXBookmark = results[0];
        var numContainers = results[1];
        var syncBookmarksToolbar = results[2];

        // Check if the Toolbar container was found and Toolbar sync is disabled
        if (findParentXBookmark.container && findParentXBookmark.container.title === globals.Bookmarks.ToolbarContainerName && !syncBookmarksToolbar) {
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

        if (createInfo.newId) {
          // Use new id supplied
          newXBookmark.id = createInfo.newId;
        }
        else {
          // Get new bookmark id
          newXBookmark.id = bookmarks.GetNewBookmarkId(xBookmarks);
        }

        // Add the new bookmark to the parent's children at the correct index
        changedBookmarkIndex = createInfo.index - numContainers;
        findParentXBookmark.xBookmark.children.splice(changedBookmarkIndex, 0, newXBookmark);

        return deferred.resolve({ bookmarks: xBookmarks });
      })
      .catch(deferred.reject);

    return deferred.promise;
  };

  var bookmarksDeleted = function (xBookmarks, args) {
    var removeInfo = args[1];
    var changedBookmarkIndex;
    var deferred = $q.defer();

    // Check if changed bookmark is a container
    wasContainerChanged(removeInfo.node, xBookmarks)
      .then(function (changedBookmarkIsContainer) {
        // If container deleted disable sync
        if (changedBookmarkIsContainer) {
          return bookmarks.DisableSync()
            .then(function () {
              return $q.reject({ code: globals.ErrorCodes.ContainerChanged });
            });
        }

        // Get local bookmark's parent's corresponding xBookmark and container
        // Check if any containers are before the changed bookmark that would throw off index
        return $q.all([
          findXBookmarkUsingLocalBookmarkId(removeInfo.parentId, xBookmarks),
          getNumContainersBeforeBookmarkIndex(removeInfo.parentId, removeInfo.index),
          bookmarks.GetSyncBookmarksToolbar()
        ]);
      })
      .then(function (results) {
        var findParentXBookmark = results[0];
        var numContainers = results[1];
        var syncBookmarksToolbar = results[2];

        // Check if the Toolbar container was found and Toolbar sync is disabled
        if (findParentXBookmark.container && findParentXBookmark.container.title === globals.Bookmarks.ToolbarContainerName && !syncBookmarksToolbar) {
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

  var bookmarksMoved = function (xBookmarks, args) {
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
    getLocalBookmarkTreeById(id)
      .then(function (localBookmark) {
        movedLocalBookmark = localBookmark;

        // Update args bookmark properties
        deleteArgs[1].node.title = movedLocalBookmark.title;
        deleteArgs[1].node.url = movedLocalBookmark.url;

        // Remove from old parent
        return bookmarksDeleted(xBookmarks, deleteArgs);
      })
      .then(function (results) {
        var updatedBookmarks = results.bookmarks;
        var removedBookmark = results.removedBookmark;

        // Update args bookmark properties
        createArgs[1].title = movedLocalBookmark.title;
        createArgs[1].url = movedLocalBookmark.url;
        if (removedBookmark) {
          createArgs[1].newId = removedBookmark.id;
          createArgs[1].children = removedBookmark.children;
          createArgs[1].description = removedBookmark.description;
          createArgs[1].tags = removedBookmark.tags;
        }

        // Create under new parent
        return bookmarksCreated(updatedBookmarks, createArgs);
      })
      .then(function (updatedBookmarks) {
        return deferred.resolve(updatedBookmarks);
      })
      .catch(deferred.reject);

    return deferred.promise;
  };

  var bookmarksUpdated = function (xBookmarks, args) {
    var id = args[0];
    var updateInfo = args[1];
    var updatedLocalBookmark, changedBookmarkIndex;
    var deferred = $q.defer();

    // Get updated local bookmark
    getLocalBookmarkTreeById(id)
      .then(function (localBookmark) {
        updatedLocalBookmark = localBookmark;

        // Check if changed bookmark is a container
        return wasContainerChanged(updatedLocalBookmark, xBookmarks);
      })
      .then(function (changedBookmarkIsContainer) {
        // If container changed disable sync
        if (changedBookmarkIsContainer) {
          return bookmarks.DisableSync()
            .then(function () {
              return $q.reject({ code: globals.ErrorCodes.ContainerChanged });
            });
        }

        // Get local bookmark's parent's corresponding xBookmark and container
        // Check if any containers are before the changed bookmark that would throw off index
        return $q.all([
          findXBookmarkUsingLocalBookmarkId(updatedLocalBookmark.parentId, xBookmarks),
          getNumContainersBeforeBookmarkIndex(updatedLocalBookmark.parentId, updatedLocalBookmark.index),
          bookmarks.GetSyncBookmarksToolbar()
        ]);
      })
      .then(function (results) {
        var findParentXBookmark = results[0];
        var numContainers = results[1];
        var syncBookmarksToolbar = results[2];

        // Check if the Toolbar container was found and Toolbar sync is disabled
        if (findParentXBookmark.container && findParentXBookmark.container.title === globals.Bookmarks.ToolbarContainerName && !syncBookmarksToolbar) {
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
        changedBookmarkIndex = updatedLocalBookmark.index - numContainers;
        var bookmarkToUpdate = findParentXBookmark.xBookmark.children[changedBookmarkIndex];

        bookmarkToUpdate.title = updateInfo.title !== undefined ? updateInfo.title : bookmarkToUpdate.title;
        bookmarkToUpdate.url = updateInfo.url !== undefined ? updateInfo.url : bookmarkToUpdate.url;
        return deferred.resolve({ bookmarks: xBookmarks });
      })
      .catch(deferred.reject);

    return deferred.promise;
  };

  var clearBookmarks = function () {
    // Clear Other bookmarks
    var clearOthers = $q(function (resolve, reject) {
      try {
        chrome.bookmarks.getChildren(otherBookmarksId, function (results) {
          var promises = [];

          if (results) {
            for (var i = 0; i < results.length; i++) {
              promises.push(deleteLocalBookmarksTree(results[i].id));
            }

            return $q.all(promises)
              .then(resolve)
              .catch(reject);
          }
        });
      }
      catch (err) {
        reject(err);
      }
    })
      .catch(function (err) {
        utility.LogInfo('Error clearing other bookmarks');
        throw err;
      });

    // Clear bookmarks toolbar if enabled
    var clearToolbar = bookmarks.GetSyncBookmarksToolbar()
      .then(function (syncBookmarksToolbar) {
        if (syncBookmarksToolbar) {
          return $q(function (resolve, reject) {
            try {
              chrome.bookmarks.getChildren(toolbarBookmarksId, function (results) {
                var promises = [];

                if (results) {
                  for (var i = 0; i < results.length; i++) {
                    promises.push(deleteLocalBookmarksTree(results[i].id));
                  }

                  return $q.all(promises)
                    .then(resolve)
                    .catch(reject)
                }
              });
            }
            catch (err) {
              reject(err);
            }
          })
            .catch(function (err) {
              utility.LogInfo('Error clearing bookmarks toolbar');
              throw err;
            });
        }
      })

    return $q.all([clearOthers, clearToolbar])
      .catch(function (err) {
        return reject({
          code: globals.ErrorCodes.FailedRemoveLocalBookmarks,
          stack: err.stack
        });
      });
  };

  var createSingle = function (bookmarkToCreate, pathToTarget) {
    // Get parent local bookmark id from path and create local bookmark
    return findLocalBookmarkByPath(pathToTarget.slice(1, pathToTarget.length - 1))
      .then(function (parentLocalBookmark) {
        return createLocalBookmark(parentLocalBookmark.id, bookmarkToCreate.title, bookmarkToCreate.url);
      });
  };

  var deleteSingle = function (pathToTarget) {
    // Get local bookmark id from path and then delete
    return findLocalBookmarkByPath(pathToTarget.slice(1))
      .then(function (bookmarkToDelete) {
        if (!bookmarkToDelete) {
          return $q.reject({ code: globals.ErrorCodes.UpdatedBookmarkNotFound });
        }

        return deleteLocalBookmarksTree(bookmarkToDelete.id);
      });
  };

  var displayLoading = function (id) {
    var timeout;

    // Return if loading overlay already displayed
    if (loadingId) {
      return;
    }

    switch (id) {
      // Checking updated service url, wait a moment before displaying loading overlay
      case 'checkingNewServiceUrl':
        timeout = $timeout(function () {
          vm.working = true;
        }, 100);
        break;
      // Loading bookmark metadata, wait a moment before displaying loading overlay
      case 'retrievingMetadata':
        timeout = $timeout(function () {
          vm.working = true;
        }, 500);
        break;
      // Display default overlay
      default:
        timeout = $timeout(function () {
          vm.working = true;
        });
        break;
    }

    loadingId = id;
    return timeout;
  };

  var downloadFile = function (fileName, textContents, linkId) {
    if (!fileName) {
      throw new Error('File name not supplied.');
    }

    var downloadLink;
    if (linkId) {
      downloadLink = document.getElementById(linkId);
    }
    else {
      downloadLink = document.createElement('a');
      downloadLink.style.display = 'none';
      document.body.appendChild(downloadLink);
    }

    if (!downloadLink) {
      throw new Error('Link element not found.');
    }

    var file = new Blob([textContents], { type: 'text/plain' });
    downloadLink.href = URL.createObjectURL(file);
    downloadLink.innerHTML = fileName;
    downloadLink.download = fileName;
    downloadLink.click();

    if (!linkId) {
      document.body.removeChild(downloadLink);
    }
  };

  var executeSync = function (syncData, command) {
    syncData.command = command || globals.Commands.SyncBookmarks;
    return $q(function (resolve, reject) {
      chrome.runtime.sendMessage(syncData, function (response) {
        if (response.success) {
          resolve(response.bookmarks);
        }
        else {
          reject(response.error);
        }
      });
    });
  };

  var getAutoUpdatesNextRun = function () {
    return $q(function (resolve, reject) {
      chrome.alarms.get(globals.Alarm.Name, function (alarm) {
        if (!alarm) {
          return resolve();
        }

        resolve(utility.Get24hrTimeFromDate(new Date(alarm.scheduledTime)));
      });
    });
  };

  var getBookmarks = function (addBookmarkIds) {
    var getOtherBookmarks, getToolbarBookmarks;
    addBookmarkIds = addBookmarkIds || true;

    // Get Other bookmarks
    var getOtherBookmarks = getLocalBookmarkTreeById(otherBookmarksId)
      .then(function (otherBookmarks) {
        if (otherBookmarks.children && otherBookmarks.children.length > 0) {
          return getLocalBookmarksAsXBookmarks(otherBookmarks.children);
        }
      });

    // Get toolbar bookmarks if enabled
    var getToolbarBookmarks = $q.all([
      bookmarks.GetSyncBookmarksToolbar(),
      getLocalBookmarkTreeById(toolbarBookmarksId)
    ])
      .then(function (results) {
        var syncBookmarksToolbar = results[0];
        var toolbarBookmarks = results[1];

        if (!syncBookmarksToolbar) {
          return;
        }

        if (toolbarBookmarks.children && toolbarBookmarks.children.length > 0) {
          return getLocalBookmarksAsXBookmarks(toolbarBookmarks.children);
        }
      });

    return $q.all([getOtherBookmarks, getToolbarBookmarks])
      .then(function (results) {
        var otherBookmarks = results[0];
        var toolbarBookmarks = results[1];
        var xBookmarks = [];

        // Add other container if bookmarks present
        if (otherBookmarks && otherBookmarks.length > 0) {
          var otherContainer = bookmarks.GetContainer(globals.Bookmarks.OtherContainerName, xBookmarks, true);
          otherContainer.children = otherBookmarks;
        }

        // Add toolbar container if bookmarks present
        if (toolbarBookmarks && toolbarBookmarks.length > 0) {
          var toolbarContainer = bookmarks.GetContainer(globals.Bookmarks.ToolbarContainerName, xBookmarks, true);
          toolbarContainer.children = toolbarBookmarks;
        }

        // Add unique ids
        return addIdsToBookmarks(xBookmarks);
      });
  };

  var getConstant = function (constName) {
    return chrome.i18n.getMessage(constName);
  };

  var getCurrentSync = function () {
    return $q(function (resolve, reject) {
      chrome.runtime.sendMessage({
        command: globals.Commands.GetCurrentSync
      }, function (response) {
        if (response.success) {
          resolve(response.currentSync);
        }
        else {
          reject(response.error);
        }
      });
    });
  };

  var getCurrentUrl = function () {
    return $q(function (resolve, reject) {
      try {
        // Get current tab
        chrome.tabs.query(
          { currentWindow: true, active: true },
          function (tabs) {
            resolve(tabs[0].url);
          });
      }
      catch (err) {
        reject(err);
      }
    });
  };

  var getFromLocalStorage = function (storageKeys) {
    return $q(function (resolve, reject) {
      try {
        chrome.storage.local.get(storageKeys, function (storageItems) {
          if (storageKeys == null || Array.isArray(storageKeys)) {
            resolve(storageItems);
          }
          else {
            resolve(storageItems[storageKeys]);
          }
        });
      }
      catch (err) {
        reject(err);
      }
    });
  };

  var getPageMetadata = function () {
    return $q(function (resolve, reject) {
      try {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
          var activeTab = tabs[0];
          chrome.tabs.sendMessage(activeTab.id, { command: globals.Commands.GetPageMetadata }, function (response) {
            // If no metadata returned, use the info from the active tab
            response = response || {};
            response.title = response.title || activeTab.title;
            response.url = response.url || activeTab.url;
            resolve(response);
          });
        });
      }
      catch (err) {
        reject(err);
      }
    });
  };

  var hideLoading = function (id, timeout) {
    if (timeout) {
      $timeout.cancel(timeout);
    }

    // Hide loading overlay if supplied if matches current
    if (!loadingId || id === loadingId) {
      $timeout(function () {
        vm.working = false;
        loadingId = null;
      });
    }
  };

  var init = function (viewModel) {
    // Set global variables
    vm = viewModel;
    vm.platformName = globals.Platforms.Chrome;
  };

  var openUrl = function (url) {
    // If this is a bookmarklet, execute it and return
    if (globals.URL.BookmarkletRegex.test(url)) {
      return eval(url.replace(globals.URL.BookmarkletRegex, '$2'));
    }

    // Get current tab
    chrome.tabs.query(
      { currentWindow: true, active: true },
      function (tabs) {
        var activeTab = tabs[0];

        // Open url in current tab if new
        if (activeTab.url && activeTab.url.startsWith('chrome://newtab')) {
          chrome.tabs.update(activeTab.id, { url: url }, function () {
            window.close();
          });
        }
        else {
          chrome.tabs.create({ 'url': url });
        }
      });
  };

  var populateBookmarks = function (xBookmarks) {
    // Get containers
    var menuContainer = bookmarks.GetContainer(globals.Bookmarks.MenuContainerName, xBookmarks);
    var mobileContainer = bookmarks.GetContainer(globals.Bookmarks.MobileContainerName, xBookmarks);
    var otherContainer = bookmarks.GetContainer(globals.Bookmarks.OtherContainerName, xBookmarks);
    var toolbarContainer = bookmarks.GetContainer(globals.Bookmarks.ToolbarContainerName, xBookmarks);

    // Populate menu bookmarks in other bookmarks
    var populateMenu = $q(function (resolve, reject) {
      if (menuContainer && menuContainer.children.length > 0) {
        try {
          chrome.bookmarks.get(otherBookmarksId, function (results) {
            createLocalBookmarksFromXBookmarks(otherBookmarksId, [menuContainer], resolve, reject);
          });
        }
        catch (err) {
          utility.LogInfo('Error populating bookmarks menu');
          throw err;
        }
      }
      else {
        resolve();
      }
    });

    // Populate mobile bookmarks in other bookmarks
    var populateMobile = $q(function (resolve, reject) {
      if (mobileContainer && mobileContainer.children.length > 0) {
        try {
          chrome.bookmarks.get(otherBookmarksId, function (results) {
            createLocalBookmarksFromXBookmarks(otherBookmarksId, [mobileContainer], resolve, reject);
          });
        }
        catch (err) {
          utility.LogInfo('Error populating mobile bookmarks');
          throw err;
        }
      }
      else {
        resolve();
      }
    });

    // Populate other bookmarks
    var populateOther = $q(function (resolve, reject) {
      if (otherContainer && otherContainer.children.length > 0) {
        try {
          chrome.bookmarks.get(otherBookmarksId, function (results) {
            createLocalBookmarksFromXBookmarks(otherBookmarksId, otherContainer.children, resolve, reject);
          });
        }
        catch (err) {
          utility.LogInfo('Error populating other bookmarks');
          throw err;
        }
      }
      else {
        resolve();
      }
    });

    // Populate bookmarks toolbar if enabled
    var populateToolbar = bookmarks.GetSyncBookmarksToolbar()
      .then(function (syncBookmarksToolbar) {
        if (syncBookmarksToolbar && toolbarContainer && toolbarContainer.children.length > 0) {
          return $q(function (resolve, reject) {
            try {
              chrome.bookmarks.get(toolbarBookmarksId, function (results) {
                createLocalBookmarksFromXBookmarks(toolbarBookmarksId, toolbarContainer.children, resolve, reject);
              });
            }
            catch (err) {
              utility.LogInfo('Error populating bookmarks toolbar');
              throw err;
            }
          });
        }
      });

    return $q.all([populateMenu, populateMobile, populateOther, populateToolbar])
      .then(reorderLocalContainers)
      .catch(function (err) {
        return reject({
          code: globals.ErrorCodes.FailedGetLocalBookmarks,
          stack: err.stack
        });
      });
  };

  var refreshInterface = function (syncEnabled, isSyncing) {
    var iconPath;
    var tooltip = getConstant(globals.Constants.Title);

    if (isSyncing) {
      iconPath = 'img/browser-action-working.png';
      tooltip += ' - ' + getConstant(globals.Constants.TooltipWorking_Label);
    }
    else if (syncEnabled) {
      iconPath = 'img/browser-action-on.png';
      tooltip += ' - ' + getConstant(globals.Constants.TooltipSyncEnabled_Label);
    }
    else {
      iconPath = 'img/browser-action-off.png';
    }

    chrome.browserAction.setIcon({ path: iconPath });
    chrome.browserAction.setTitle({ title: tooltip });
  };

  var setInLocalStorage = function (storageKey, value) {
    return $q(function (resolve, reject) {
      try {
        if (value != null) {
          var storageObj = {};
          storageObj[storageKey] = value;

          chrome.storage.local.set(storageObj, function () {
            resolve();
          });
        }
        else {
          chrome.storage.local.remove(storageKey, function () {
            resolve();
          });
        }
      }
      catch (err) {
        reject(err);
      }
    });
  };

  var startAutoUpdates = function () {
    return $q(function (resolve, reject) {
      // Register alarm
      try {
        chrome.alarms.clear(globals.Alarm.Name, function () {
          chrome.alarms.create(
            globals.Alarm.Name, {
              periodInMinutes: globals.Alarm.Period
            }
          );

          resolve();
        });
      }
      catch (err) {
        return reject({
          code: globals.ErrorCodes.FailedRegisterAutoUpdates,
          stack: err.stack
        });
      }
    });
  };

  var stopAutoUpdates = function () {
    chrome.alarms.clear(globals.Alarm.Name);
  };

  var updateSingle = function (updatedBookmark, pathToTarget) {
    // Get local bookmark id from path and then update
    return findLocalBookmarkByPath(pathToTarget.slice(1))
      .then(function (localBookmarkToUpdate) {
        if (!localBookmarkToUpdate) {
          return $q.reject({ code: globals.ErrorCodes.UpdatedBookmarkNotFound });
        }

        return updateLocalBookmark(localBookmarkToUpdate.id, updatedBookmark.title, updatedBookmark.url);
      });
  };


	/* ------------------------------------------------------------------------------------
	 * Private functions
	 * ------------------------------------------------------------------------------------ */

  var checkForLocalContainer = function (localBookmark) {
    var localContainers = [
      { id: toolbarBookmarksId, xBookmarkTitle: globals.Bookmarks.ToolbarContainerName },
      { id: otherBookmarksId, xBookmarkTitle: globals.Bookmarks.OtherContainerName }
    ];

    // Check if the bookmark id is a local container
    return _.findWhere(localContainers, { id: localBookmark.id });
  };

  var createLocalBookmark = function (parentId, title, url, index) {
    var newLocalBookmark = {
      index: index,
      parentId: parentId,
      title: title,
      url: url
    };

    return $q(function (resolve, reject) {
      try {
        chrome.bookmarks.create(newLocalBookmark, resolve);
      }
      catch (err) {
        utility.LogInfo('Failed to create local bookmark: ' + JSON.stringify(newLocalBookmark));
        reject({
          code: globals.ErrorCodes.FailedCreateLocalBookmarks,
          stack: err.stack
        });
      }
    });
  };

  var createLocalBookmarksFromXBookmarks = function (parentId, xBookmarks, success, failed) {
    (function step(i, callback) {
      if (i < xBookmarks.length) {
        createLocalBookmark(parentId, xBookmarks[i].title, xBookmarks[i].url, i).then(
          function (newLocalBookmark) {
            var xBookmark = xBookmarks[i];

            if (xBookmark.children && xBookmark.children.length > 0) {
              createLocalBookmarksFromXBookmarks(newLocalBookmark.id, xBookmark.children,
                function () {
                  step(i + 1, callback);
                },
                failed);
            }
            else {
              step(i + 1, callback);
            }
          },
          function (err) {
            failed(err);
          });
      }
      else {
        callback();
      }
    })(0, function () {
      success();
    });
  };

  var deleteLocalBookmarksTree = function (localBookmarkId) {
    return $q(function (resolve, reject) {
      try {
        chrome.bookmarks.removeTree(localBookmarkId, resolve);
      }
      catch (err) {
        utility.LogInfo('Failed to delete local bookmark: ' + localBookmarkId);
        reject({
          code: globals.ErrorCodes.FailedRemoveLocalBookmarks,
          stack: err.stack
        });
      }
    });
  };

  var findLocalBookmarkByPath = function (path) {
    var container = path.shift().bookmark;
    if (!bookmarks.XBookmarkIsContainer(container)) {
      // First path item should always be a container
      return $q.reject({ code: globals.ErrorCodes.UpdatedBookmarkNotFound });
    }

    // Check if container is unsupported in this browser
    var getLocalContainerIdPromise;
    if (unsupportedContainers.find(function (x) { return x === container.title; })) {
      // Container is unsupported, find folder under other bookmarks
      getLocalContainerIdPromise = $q(function (resolve, reject) {
        chrome.bookmarks.getChildren(otherBookmarksId, function (children) {
          var localContainer = children.find(function (x) { return x.title === container.title; });
          if (localContainer) {
            // Container folder found, return id
            resolve(localContainer.id);
          }
          else {
            // Unable to find local container folder 
            reject({ code: globals.ErrorCodes.UpdatedBookmarkNotFound });
          }
        });
      });
    }
    else {
      // Container is supported, return relevant id
      switch (container.title) {
        case globals.Bookmarks.OtherContainerName:
          getLocalContainerIdPromise = $q.resolve(otherBookmarksId);
          break;
        case globals.Bookmarks.ToolbarContainerName:
          getLocalContainerIdPromise = $q.resolve(toolbarBookmarksId);
          break;
      }
    }

    return getLocalContainerIdPromise
      .then(getLocalBookmarkTreeById)
      .then(function (bookmarkTree) {
        if (path.length === 0) {
          return bookmarkTree;
        }

        return utility.AsyncReduce(bookmarkTree, path,
          function (treePosition, pathCurrent) {
            return $q(function (resolve, reject) {
              if (!treePosition) {
                return resolve();
              }

              // If the current position is other bookmarks, 
              // check for any existing container folders that would throw off the target index
              var getLocalBookmarkIndex;
              if (treePosition.id === otherBookmarksId) {
                getLocalBookmarkIndex = getNumContainersBeforeBookmarkIndex(treePosition.id, pathCurrent.index)
                  .then(function (numContainers) {
                    // Adjust the index by the number of container folders
                    return pathCurrent.index + numContainers;
                  });
              }
              else {
                getLocalBookmarkIndex = $q.resolve(pathCurrent.index);
              }

              return getLocalBookmarkIndex
                .then(function (localBookmarkIndex) {
                  // Return the child at the matching index
                  var targetChild = treePosition.children.find(function (x) {
                    return x.index === localBookmarkIndex;
                  });
                  return resolve(targetChild);
                })
                .catch(reject);
            });
          }
        );
      });
  };

  var findLocalBookmarkByTitle = function (title) {
    if (!title) {
      return $q.resolve();
    }

    return $q(function (resolve, reject) {
      try {
        chrome.bookmarks.search({ title: title }, function (results) {
          var localBookmark;
          if (results.length > 0) {
            localBookmark = results.shift();
          }

          resolve(localBookmark);
        });
      }
      catch (ex) {
        reject(ex);
      }
    });
  };

  var findXBookmarkUsingLocalBookmarkId = function (localBookmarkId, xBookmarks) {
    var deferred = $q.defer();
    var indexTree = [];
    var result = {
      container: null,
      xBookmark: null
    };

    (function loop(bookmarkId) {
      var bookmark, bookmarkIndex;
      getLocalBookmarkTreeById(bookmarkId)
        .then(function (localBookmark) {
          // Determine if the current local bookmark is a container
          var containerName;
          var localContainer = checkForLocalContainer(localBookmark);
          if (localContainer) {
            containerName = localContainer.xBookmarkTitle;
          }
          else if (bookmarks.XBookmarkIsContainer(localBookmark)) {
            containerName = localBookmark.title;
          }

          // If the local bookmark is a container, use the index tree to get the target xBookmark
          if (containerName) {
            // Get the xBookmark that corresponds to the container, creating it if not present
            var container = bookmarks.GetContainer(containerName, xBookmarks, true);

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
            .then(function (numContainers) {
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

  var getLocalBookmarkTreeById = function (localBookmarkId) {
    return $q(function (resolve, reject) {
      try {
        chrome.bookmarks.getSubTree(localBookmarkId, function (results) {
          if (results[0]) {
            resolve(results[0]);
          }
          else {
            reject(new Error('Tree empty for ' + localBookmarkId));
          }
        });
      }
      catch (err) {
        reject(err);
      }
    })
      .catch(function (err) {
        utility.LogInfo('Failed to get local bookmark: ' + localBookmarkId);
        return $q.reject({
          code: globals.ErrorCodes.FailedGetLocalBookmarks,
          stack: err.stack
        });
      });
  };

  var getLocalBookmarksAsXBookmarks = function (localBookmarks) {
    var xBookmarks = [];

    for (var i = 0; i < localBookmarks.length; i++) {
      var newXBookmark = new bookmarks.XBookmark(localBookmarks[i].title, localBookmarks[i].url);

      // If this is a folder and has children, process them
      if (localBookmarks[i].children && localBookmarks[i].children.length > 0) {
        newXBookmark.children = getLocalBookmarksAsXBookmarks(localBookmarks[i].children);
      }

      xBookmarks.push(newXBookmark);
    }

    return xBookmarks;
  };

  var getNumContainersBeforeBookmarkIndex = function (parentId, bookmarkIndex) {
    return getLocalBookmarkTreeById(parentId)
      .then(function (localBookmark) {
        var preceedingBookmarks = _.filter(localBookmark.children, function (bookmark) {
          return bookmark.index <= bookmarkIndex;
        });
        var containers = _.filter(preceedingBookmarks, bookmarks.XBookmarkIsContainer);

        if (containers) {
          return containers.length;
        }
        else {
          return 0;
        }
      });
  };

  var reorderLocalContainers = function () {
    // Get local containers
    return $q.all(unsupportedContainers.map(findLocalBookmarkByTitle))
      .then(function (results) {
        // Remove falsy results
        var localContainers = results.filter(function (x) { return x; });

        // Reorder each local container to top of parent
        return $q.all(localContainers.map(function (localContainer, index) {
          return $q(function (resolve, reject) {
            try {
              chrome.bookmarks.move(
                localContainer.id,
                {
                  index: index,
                  parentId: localContainer.parentId
                },
                function (results) {
                  resolve();
                }
              );
            }
            catch (ex) {
              reject(ex);
            }
          });
        }));
      })
  };

  var updateLocalBookmark = function (localBookmarkId, title, url) {
    var updateInfo = {
      title: title,
      url: url
    };

    return $q(function (resolve, reject) {
      try {
        chrome.bookmarks.update(localBookmarkId, updateInfo, resolve);
      }
      catch (err) {
        utility.LogInfo('Failed to update local bookmark: ' + JSON.stringify(updateInfo));
        reject({
          code: globals.ErrorCodes.FailedUpdateLocalBookmarks,
          stack: err.stack
        });
      }
    });
  };

  var wasContainerChanged = function (changedBookmark, xBookmarks) {
    // Check based on title
    if (bookmarks.XBookmarkIsContainer(changedBookmark)) {
      return $q.resolve(true);
    }

    // If parent is Other bookmarks, check Other bookmarks children for containers
    if (changedBookmark.parentId && changedBookmark.parentId === otherBookmarksId) {
      return $q(function (resolve, reject) {
        try {
          chrome.bookmarks.getChildren(otherBookmarksId, function (children) {
            // Get all bookmarks in other bookmarks that are xBrowserSync containers
            var localContainers = children.filter(function (x) {
              return unsupportedContainers.find(function (y) { return y === x.title });
            });
            var containersCount = 0;
            var checksFailed = false;

            // Check each container present only appears once
            var menuContainer = bookmarks.GetContainer(globals.Bookmarks.MenuContainerName, xBookmarks, false);
            if (menuContainer) {
              containersCount++;
              var count = localContainers.filter(function (x) {
                return x.title === globals.Bookmarks.MenuContainerName;
              }).length;
              checksFailed = count !== 1 ? true : checksFailed;
            }

            var mobileContainer = bookmarks.GetContainer(globals.Bookmarks.MobileContainerName, xBookmarks, false);
            if (mobileContainer) {
              containersCount++;
              var count = localContainers.filter(function (x) {
                return x.title === globals.Bookmarks.MobileContainerName;
              }).length;
              checksFailed = count !== 1 ? true : checksFailed;
            }

            // Check number of containers match and return result
            checksFailed = containersCount !== localContainers.length ? true : checksFailed;
            resolve(checksFailed);
          });
        }
        catch (err) {
          utility.LogInfo('Failed to detect whether container changed: ' + JSON.stringify(changedBookmark));
          return reject({
            code: globals.ErrorCodes.FailedGetLocalBookmarks,
            stack: err.stack
          });
        }
      });
    }

    return $q.resolve(false);
  };

  // Call constructor
  return new ChromeImplementation();
};