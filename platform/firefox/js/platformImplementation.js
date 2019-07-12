var xBrowserSync = xBrowserSync || {};
xBrowserSync.App = xBrowserSync.App || {};

/* ------------------------------------------------------------------------------------
 * Class name:  xBrowserSync.App.PlatformImplementation 
 * Description: Implements xBrowserSync.App.Platform for Firefox extension.
 * ------------------------------------------------------------------------------------ */

xBrowserSync.App.PlatformImplementation = function ($interval, $q, $timeout, platform, globals, utility, bookmarks) {
  'use strict';

  var vm, loadingId,
    contentScriptUrl = 'js/getPageMetadata.js',
    optionalPermissions = {
      origins: ['http://*/', 'https://*/']
    },
    separatorTypeName = 'separator',
    unsupportedContainers = [];


	/* ------------------------------------------------------------------------------------
	 * Constructor
	 * ------------------------------------------------------------------------------------ */

  var FirefoxImplementation = function () {
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
    platform.Bookmarks.GetLocalBookmarkLocationInfo = getLocalBookmarkLocationInfo;
    platform.Bookmarks.Moved = bookmarksMoved;
    platform.Bookmarks.Populate = populateBookmarks;
    platform.Bookmarks.ShouldSyncLocalChanges = shouldSyncLocalChanges;
    platform.Bookmarks.Updated = bookmarksUpdated;
    platform.Bookmarks.UpdateSingle = updateSingle;
    platform.DownloadFile = downloadFile;
    platform.EventListeners.Enable = enableEventListeners;
    platform.EventListeners.Disable = disableEventListeners;
    platform.GetConstant = getConstant;
    platform.GetCurrentUrl = getCurrentUrl;
    platform.GetNewTabUrl = getNewTabUrl;
    platform.GetPageMetadata = getPageMetadata;
    platform.GetSupportedUrl = getSupportedUrl;
    platform.Init = init;
    platform.Interface.Loading.Hide = hideLoading;
    platform.Interface.Loading.Show = displayLoading;
    platform.Interface.Refresh = refreshInterface;
    platform.LocalStorage.Get = getFromLocalStorage;
    platform.LocalStorage.Set = setInLocalStorage;
    platform.OpenUrl = openUrl;
    platform.Permissions.Check = checkPermissions;
    platform.Permissions.Remove = removePermissions;
    platform.Permissions.Request = requestPermissions;
    platform.Sync.Await = awaitSync;
    platform.Sync.Current = getCurrentSync;
    platform.Sync.Execute = executeSync;
  };


	/* ------------------------------------------------------------------------------------
	 * Public functions
	 * ------------------------------------------------------------------------------------ */

  var addIdsToBookmarks = function (xBookmarks) {
    // Get all bookmarks into array
    return $q.all([
      getLocalBookmarkTree(),
      getLocalContainerIds()
    ])
      .then(function (results) {
        var tree = results[0];
        var localContainerIds = results[1];
        var allBookmarks = [];

        // Get all local bookmarks into flat array
        bookmarks.Each([tree], function (bookmark) {
          allBookmarks.push(bookmark);
        });

        // Remove the root
        allBookmarks.shift();

        // Sort by dateAdded asc 
        allBookmarks = _.sortBy(allBookmarks, function (bookmark) {
          return bookmark.dateAdded;
        });

        // Start the id counter one greater than the total number of bookmarks
        var idCounter = allBookmarks.length + 1;

        // Add ids to containers' children 
        var addIdToBookmark = function (bookmark) {
          var bookmarkId;

          // Get the local index of the bookmark
          bookmarkId = _.findIndex(allBookmarks, function (sortedBookmark) {
            return bookmarks.XBookmarkIsContainer(bookmark) ?
              sortedBookmark.id === localContainerIds[bookmark.title] :
              sortedBookmark.title === (bookmark.title || '') &&
              sortedBookmark.url === bookmark.url &&
              !sortedBookmark.assigned;
          });

          // Use index if found otherwise take id from counter and increment 
          if (!_.isUndefined(bookmarkId) && bookmarkId >= 0) {
            bookmark.id = bookmarkId + 1;

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

        // Check that bookmarks now have unique ids
        var bookmarksHaveUniqueIds = bookmarks.CheckBookmarksHaveUniqueIds(xBookmarks);
        if (!bookmarksHaveUniqueIds) {
          return $q.reject({ code: globals.ErrorCodes.DuplicateBookmarkIdsDetected });
        }

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
        browser.runtime.onMessage.removeListener(awaitSyncListener);

        if (message.success) {
          resolve();
        }
        else {
          reject(message.error);
        }
      };

      // Listen for messages
      browser.runtime.onMessage.addListener(awaitSyncListener);
    });
  };

  var bookmarksCreated = function (xBookmarks, changeInfo) {
    // Remove native bookmark id
    delete changeInfo.bookmark.id;

    // Create synced bookmark
    return bookmarks.AddNewInXBookmarks(changeInfo.bookmark, changeInfo.container, changeInfo.indexPath, xBookmarks);
  };

  var bookmarksDeleted = function (xBookmarks, changeInfo) {
    // Remove synced bookmark
    return bookmarks.RemoveExistingInXBookmarks(changeInfo.container, changeInfo.indexPath, xBookmarks);
  };

  var bookmarksMoved = function (xBookmarks, changeInfo) {
    // Remove synced bookmark if info supplied
    return (changeInfo.syncChange ?
      bookmarks.RemoveExistingInXBookmarks(changeInfo.container, changeInfo.indexPath, xBookmarks) :
      bookmarks.GetExistingInXBookmarks(changeInfo.container, changeInfo.indexPath, xBookmarks))
      .then(function (results) {
        // Create synced bookmark if target info supplied
        return (changeInfo.targetInfo.syncChange ? bookmarks.AddNewInXBookmarks(results.bookmark, changeInfo.targetInfo.container, changeInfo.targetInfo.indexPath, results.bookmarks) : $q.resolve(results));
      });
  };

  var bookmarksUpdated = function (xBookmarks, changeInfo) {
    // Update synced bookmark
    return bookmarks.UpdateExistingInXBookmarks(changeInfo.bookmark, changeInfo.container, changeInfo.indexPath, xBookmarks);
  };

  var clearBookmarks = function () {
    // Get local container node ids
    return getLocalContainerIds()
      .then(function (localContainerIds) {
        var menuBookmarksId = localContainerIds[globals.Bookmarks.MenuContainerName];
        var mobileBookmarksId = localContainerIds[globals.Bookmarks.MobileContainerName];
        var otherBookmarksId = localContainerIds[globals.Bookmarks.OtherContainerName];
        var toolbarBookmarksId = localContainerIds[globals.Bookmarks.ToolbarContainerName];

        // Clear menu bookmarks
        var clearMenu = browser.bookmarks.getChildren(menuBookmarksId)
          .then(function (results) {
            return $q.all(results.map(function (child) {
              return deleteLocalBookmarksTree(child.id);
            }));
          })
          .catch(function (err) {
            utility.LogInfo('Error clearing bookmarks menu');
            throw err;
          });

        // Clear mobile bookmarks
        var clearMobile = browser.bookmarks.getChildren(mobileBookmarksId)
          .then(function (results) {
            return $q.all(results.map(function (child) {
              return deleteLocalBookmarksTree(child.id);
            }));
          })
          .catch(function (err) {
            utility.LogInfo('Error clearing mobile bookmarks');
            throw err;
          });

        // Clear other bookmarks
        var clearOthers = browser.bookmarks.getChildren(otherBookmarksId)
          .then(function (results) {
            return $q.all(results.map(function (child) {
              return deleteLocalBookmarksTree(child.id);
            }));
          })
          .catch(function (err) {
            utility.LogInfo('Error clearing other bookmarks');
            throw err;
          });

        // Clear bookmarks toolbar if enabled
        var clearToolbar = bookmarks.GetSyncBookmarksToolbar()
          .then(function (syncBookmarksToolbar) {
            if (!syncBookmarksToolbar) {
              utility.LogInfo('Not clearing toolbar');
              return;
            }

            return browser.bookmarks.getChildren(toolbarBookmarksId)
              .then(function (results) {
                return $q.all(results.map(function (child) {
                  return deleteLocalBookmarksTree(child.id);
                }));
              })
              .catch(function (err) {
                utility.LogInfo('Error clearing bookmarks toolbar');
                throw err;
              });
          });

        return $q.all([clearMenu, clearMobile, clearOthers, clearToolbar]);
      })
      .catch(function (err) {
        return $q.reject({
          code: globals.ErrorCodes.FailedRemoveLocalBookmarks,
          stack: err.stack
        });
      });
  };

  var checkPermissions = function () {
    // Check if extension has optional permissions
    //return browser.permissions.contains(optionalPermissions);

    // TODO: Add this back once Firefox supports optional permissions
    // https://bugzilla.mozilla.org/show_bug.cgi?id=1533014
    return $q.resolve(true);
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
          return $q.reject({ code: globals.ErrorCodes.LocalBookmarkNotFound });
        }

        return deleteLocalBookmarksTree(bookmarkToDelete.id);
      });
  };

  var disableEventListeners = function () {
    return browser.runtime.sendMessage({
      command: globals.Commands.DisableEventListeners
    })
      .then(function (response) {
        if (!response.success) {
          throw response.error;
        }
      });
  };

  var displayLoading = function (id) {
    var timeout;

    // Return if loading overlay already displayed
    if (loadingId) {
      return;
    }

    // Hide any alert messages
    vm.alert.show = false;

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
    downloadLink.innerText = fileName;
    downloadLink.download = fileName;
    downloadLink.click();

    if (!linkId) {
      document.body.removeChild(downloadLink);
    }
  };

  var enableEventListeners = function () {
    return browser.runtime.sendMessage({
      command: globals.Commands.EnableEventListeners
    })
      .then(function (response) {
        if (!response.success) {
          throw response.error;
        }
      });
  };

  var executeSync = function (syncData, command) {
    syncData.command = command || globals.Commands.SyncBookmarks;
    return browser.runtime.sendMessage(syncData)
      .then(function (response) {
        if (!response.success) {
          throw response.error;
        }

        return response.bookmarks;
      });
  };

  var getAutoUpdatesNextRun = function () {
    return browser.alarms.get(globals.Alarm.Name)
      .then(function (alarm) {
        if (!alarm) {
          return;
        }

        return utility.Get24hrTimeFromDate(new Date(alarm.scheduledTime));
      });
  };

  var getBookmarks = function (addBookmarkIds) {
    addBookmarkIds = addBookmarkIds || true;

    // Get local container node ids
    return getLocalContainerIds()
      .then(function (localContainerIds) {
        var menuBookmarksId = localContainerIds[globals.Bookmarks.MenuContainerName];
        var mobileBookmarksId = localContainerIds[globals.Bookmarks.MobileContainerName];
        var otherBookmarksId = localContainerIds[globals.Bookmarks.OtherContainerName];
        var toolbarBookmarksId = localContainerIds[globals.Bookmarks.ToolbarContainerName];

        // Get other bookmarks
        var getOtherBookmarks = otherBookmarksId == null ? $q.resolve() :
          getLocalBookmarkTree(otherBookmarksId)
            .then(function (otherBookmarks) {
              if (!otherBookmarks.children || otherBookmarks.children.length === 0) {
                return;
              }

              // Convert local bookmarks sub tree to xbookmarks
              var xBookmarks = getLocalBookmarksAsXBookmarks(otherBookmarks.children);

              // Remove any unsupported container folders present
              var xBookmarksWithoutContainers = xBookmarks.filter(function (x) {
                return !unsupportedContainers.find(function (y) {
                  return y === x.title;
                });
              });

              return xBookmarksWithoutContainers;
            });

        // Get toolbar bookmarks if enabled
        var getToolbarBookmarks = toolbarBookmarksId == null ? $q.resolve() :
          $q.all([
            bookmarks.GetSyncBookmarksToolbar(),
            getLocalBookmarkTree(toolbarBookmarksId)
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

        // Get menu bookmarks
        var getMenuBookmarks = menuBookmarksId == null ? $q.resolve() :
          getLocalBookmarkTree(menuBookmarksId)
            .then(function (menuBookmarks) {
              if (menuBookmarks.children && menuBookmarks.children.length > 0) {
                return getLocalBookmarksAsXBookmarks(menuBookmarks.children);
              }
            });

        // Get mobile bookmarks
        var getMobileBookmarks = mobileBookmarksId == null ? $q.resolve() :
          getLocalBookmarkTree(mobileBookmarksId)
            .then(function (mobileBookmarks) {
              if (mobileBookmarks.children && mobileBookmarks.children.length > 0) {
                return getLocalBookmarksAsXBookmarks(mobileBookmarks.children);
              }
            });

        return $q.all([getOtherBookmarks, getToolbarBookmarks, getMenuBookmarks, getMobileBookmarks]);
      })
      .then(function (results) {
        var otherBookmarks = results[0];
        var toolbarBookmarks = results[1];
        var menuBookmarks = results[2];
        var mobileBookmarks = results[3];
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

        // Add menu container if bookmarks present
        if (menuBookmarks && menuBookmarks.length > 0) {
          var menuContainer = bookmarks.GetContainer(globals.Bookmarks.MenuContainerName, xBookmarks, true);
          menuContainer.children = menuBookmarks;
        }

        // Add mobile container if bookmarks present
        if (mobileBookmarks && mobileBookmarks.length > 0) {
          var mobileContainer = bookmarks.GetContainer(globals.Bookmarks.MobileContainerName, xBookmarks, true);
          mobileContainer.children = mobileBookmarks;
        }

        // Add unique ids
        return addIdsToBookmarks(xBookmarks);
      });
  };

  var getConstant = function (constName) {
    return browser.i18n.getMessage(constName);
  };

  var getCurrentSync = function () {
    return browser.runtime.sendMessage({
      command: globals.Commands.GetCurrentSync
    })
      .then(function (response) {
        if (!response.success) {
          throw response.error;
        }

        return response.currentSync;
      });
  };

  var getCurrentUrl = function () {
    // Get current tab
    return browser.tabs.query({ currentWindow: true, active: true })
      .then(function (tabs) {
        return tabs[0].url;
      });
  };

  var getFromLocalStorage = function (storageKeys) {
    return browser.storage.local.get(storageKeys)
      .then(function (storageItems) {
        if (storageKeys == null || Array.isArray(storageKeys)) {
          return storageItems;
        }
        else {
          return storageItems[storageKeys];
        }
      });
  };

  var getLocalBookmarkLocationInfo = function (localBookmarkId, initialIndexPath) {
    var indexPath = initialIndexPath || [];
    var localBookmarkTree, containerId, containerName;

    // Create the condition check for the promise loop
    var condition = function (id) {
      // Check if the current bookmark is a container
      return isLocalBookmarkContainer(id)
        .then(function (localContainer) {
          if (localContainer) {
            // Retain the container info
            containerId = id;
            containerName = localContainer.xBookmarkTitle;
          }
          return !!localContainer;
        });
    };

    // Create the action for the promise loop
    var action = function (id) {
      return $q(function (resolve, reject) {
        // Find the current local bookmark in the tree, add it's index to the path then process it's parent
        var localBookmark = bookmarks.FindBookmarkById(localBookmarkTree.children, id);
        if (!localBookmark) {
          return reject({ code: globals.ErrorCodes.LocalBookmarkNotFound });
        }
        indexPath.unshift(localBookmark.index);
        resolve(localBookmark.parentId);
      });
    };

    return getLocalBookmarkTree()
      .then(function (tree) {
        // Return if local bookmark is not found in tree
        var localBookmark = bookmarks.FindBookmarkById(tree.children, localBookmarkId);
        if (!localBookmark) {
          return $q.reject({ code: globals.ErrorCodes.LocalBookmarkNotFound });
        }

        // Create the index path to the bookmark
        localBookmarkTree = tree;
        return utility.PromiseWhile(localBookmarkId, condition, action)
          .then(function () {
            // Adjust child index of other bookmarks to account for any unsupported containers
            return getNumContainersBeforeBookmarkIndex(containerId, indexPath[0])
              .then(function (numContainers) {
                // Adjust the initial index by the number of containers
                return [indexPath[0] - numContainers].concat(indexPath.slice(1));
              });
          })
          .then(function (adjustedIndexPath) {
            return {
              container: containerName,
              indexPath: adjustedIndexPath
            };
          });
      });
  };

  var getNewTabUrl = function () {
    return 'about:newtab';
  };

  var getPageMetadata = function (shouldCheckPermissions) {
    var activeTab;

    return browser.tabs.query({ active: true, currentWindow: true })
      .then(function (tabs) {
        activeTab = tabs[0];

        // If not checking permissions, return
        if (shouldCheckPermissions !== true) {
          return true;
        }

        // Check if extension has permissions to read active tab content
        return checkPermissions()
          .then(function (hasPermissions) {
            if (!hasPermissions) {
              utility.LogInfo('Do not have permission to read active tab content');
            }
            return hasPermissions;
          });
      })
      .then(function (getMetadata) {
        // Default metadata to the info from the active tab
        var metadata = {
          title: activeTab.title,
          url: activeTab.url
        };

        // If unable to get metadata return default
        if (!getMetadata) {
          return metadata;
        }

        return browser.tabs.executeScript(activeTab.id, { file: contentScriptUrl })
          .then(function (response) {
            if (response && response.length > 0) {
              metadata = response[0];
            }

            // If no metadata returned, use the info from the active tab
            metadata.title = metadata.title || activeTab.title;
            metadata.url = metadata.url || activeTab.url;
            return metadata;
          })
          .catch(function (err) {
            utility.LogWarning('Unable to get metadata: ' + (err ? err.message : ''));
            return metadata;
          });
      });
  };

  var getSupportedUrl = function (url) {
    return localBookmarkUrlIsSupported(url) ? url : getNewTabUrl();
  };

  var hideLoading = function (id, timeout) {
    if (timeout) {
      $timeout.cancel(timeout);
    }

    // Hide any alert messages
    vm.alert.show = false;

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
    vm.platformName = globals.Platforms.Firefox;
  };

  var openUrl = function (url) {
    // Check url is supported
    if (!localBookmarkUrlIsSupported(url)) {
      utility.LogInfo('Attempted to navigate to unsupported url: ' + url);
      url = getNewTabUrl();
    }

    var openInNewTab = function () {
      return browser.tabs.create({ 'url': url });
    };
    browser.tabs.query({ currentWindow: true, active: true })
      .then(function (tabs) {
        // Open url in current tab if new then close the extension window
        var tabAction = (tabs && tabs.length > 0 && tabs[0].url && tabs[0].url.startsWith(getNewTabUrl())) ?
          browser.tabs.update(tabs[0].id, { url: url }) : openInNewTab();
        return tabAction.then(window.close);
      })
      .catch(openInNewTab);
  };

  var populateBookmarks = function (xBookmarks) {
    var populateStartTime = new Date();

    // Get containers
    var menuContainer = bookmarks.GetContainer(globals.Bookmarks.MenuContainerName, xBookmarks);
    var mobileContainer = bookmarks.GetContainer(globals.Bookmarks.MobileContainerName, xBookmarks);
    var otherContainer = bookmarks.GetContainer(globals.Bookmarks.OtherContainerName, xBookmarks);
    var toolbarContainer = bookmarks.GetContainer(globals.Bookmarks.ToolbarContainerName, xBookmarks);

    // Get local container node ids
    return getLocalContainerIds()
      .then(function (localContainerIds) {
        var menuBookmarksId = localContainerIds[globals.Bookmarks.MenuContainerName];
        var mobileBookmarksId = localContainerIds[globals.Bookmarks.MobileContainerName];
        var otherBookmarksId = localContainerIds[globals.Bookmarks.OtherContainerName];
        var toolbarBookmarksId = localContainerIds[globals.Bookmarks.ToolbarContainerName];

        // Populate menu bookmarks
        var populateMenu = $q.resolve();
        if (menuContainer && menuContainer.children.length > 0) {
          populateMenu = browser.bookmarks.getSubTree(menuBookmarksId)
            .then(function (results) {
              return createLocalBookmarksFromXBookmarks(menuBookmarksId, menuContainer.children);
            })
            .catch(function (err) {
              utility.LogInfo('Error populating bookmarks menu.');
              throw err;
            });
        }

        // Populate mobile bookmarks
        var populateMobile = $q.resolve();
        if (mobileContainer && mobileContainer.children.length > 0) {
          populateMobile = browser.bookmarks.getSubTree(mobileBookmarksId)
            .then(function (results) {
              return createLocalBookmarksFromXBookmarks(mobileBookmarksId, mobileContainer.children);
            })
            .catch(function (err) {
              utility.LogInfo('Error populating mobile bookmarks.');
              throw err;
            });
        }

        // Populate other bookmarks
        var populateOther = $q.resolve();
        if (otherContainer && otherContainer.children.length > 0) {
          populateOther = browser.bookmarks.getSubTree(otherBookmarksId)
            .then(function (results) {
              return createLocalBookmarksFromXBookmarks(otherBookmarksId, otherContainer.children);
            })
            .catch(function (err) {
              utility.LogInfo('Error populating other bookmarks.');
              throw err;
            });
        }

        // Populate bookmarks toolbar if enabled
        var populateToolbar = bookmarks.GetSyncBookmarksToolbar()
          .then(function (syncBookmarksToolbar) {
            if (!syncBookmarksToolbar) {
              utility.LogInfo('Not populating toolbar');
              return;
            }

            if (toolbarContainer && toolbarContainer.children.length > 0) {
              return browser.bookmarks.getSubTree(toolbarBookmarksId)
                .then(function (results) {
                  return createLocalBookmarksFromXBookmarks(toolbarBookmarksId, toolbarContainer.children);
                })
                .catch(function (err) {
                  utility.LogInfo('Error populating bookmarks toolbar.');
                  throw err;
                });
            }
          });

        return $q.all([populateMenu, populateMobile, populateOther, populateToolbar]);
      })
      .then(function () {
        var populateEndTime = new Date();
        utility.LogInfo('Local population completed in ' + ((populateEndTime - populateStartTime) / 1000) + 's');
        return reorderLocalContainers();
      });
  };

  var refreshInterface = function (syncEnabled, syncType) {
    var iconPath;
    var tooltip = getConstant(globals.Constants.Title);

    if (syncType) {
      iconPath = syncType === globals.SyncType.Pull ? 'img/downloading.png' : 'img/uploading.png';
      tooltip += ' (' + getConstant(globals.Constants.Tooltip_Syncing_Label) + ')';
    }
    else if (syncEnabled) {
      iconPath = 'img/synced.png';
      tooltip += ' (' + getConstant(globals.Constants.Tooltip_Synced_Label) + ')';
    }
    else {
      iconPath = 'img/notsynced.png';
      tooltip += ' (' + getConstant(globals.Constants.Tooltip_NotSynced_Label) + ')';
    }

    return $q.all([
      browser.browserAction.setIcon({ path: iconPath }),
      browser.browserAction.setTitle({ title: tooltip })
    ]);
  };

  var removePermissions = function () {
    // Remove optional permissions
    return browser.permissions.remove(optionalPermissions)
      .then(function (removed) {
        if (!removed) {
          throw new Error('Optional permissions not removed');
        }
        utility.LogInfo('Optional permissions removed');
      });
  };

  var requestPermissions = function () {
    // Request optional permissions
    return browser.permissions.request(optionalPermissions)
      .then(function (granted) {
        utility.LogInfo('Optional permissions ' + (!granted ? 'not ' : '') + 'granted');
        return granted;
      })
      .catch(function (err) {
        console.log(err);
      });
  };

  var setInLocalStorage = function (storageKey, value) {
    if (value != null) {
      var storageObj = {};
      storageObj[storageKey] = value;

      return browser.storage.local.set(storageObj);
    }
    else {
      return browser.storage.local.remove(storageKey);
    }
  };

  var shouldSyncLocalChanges = function (changeInfo, xBookmarks) {
    // If changed bookmark is a container, disable sync
    return wasContainerChanged(changeInfo.bookmark, xBookmarks)
      .then(function (changedBookmarkIsContainer) {
        if (changedBookmarkIsContainer) {
          return $q.reject({ code: globals.ErrorCodes.ContainerChanged });
        }

        // If container is Toolbar, check if Toolbar sync is disabled
        return changeInfo.container === globals.Bookmarks.ToolbarContainerName ? bookmarks.GetSyncBookmarksToolbar() : $q.resolve(true);
      })
      .then(function (syncBookmarksToolbar) {
        if (!syncBookmarksToolbar) {
          utility.LogInfo('Not syncing toolbar');
          return false;
        }

        return true;
      });
  };

  var startAutoUpdates = function () {
    // Register alarm
    return browser.alarms.clear(globals.Alarm.Name)
      .then(function () {
        return browser.alarms.create(
          globals.Alarm.Name, {
            periodInMinutes: globals.Alarm.Period
          }
        );
      })
      .catch(function (err) {
        return $q.reject({
          code: globals.ErrorCodes.FailedRegisterAutoUpdates,
          stack: err.stack
        });
      });
  };

  var stopAutoUpdates = function () {
    browser.alarms.clear(globals.Alarm.Name);
  };

  var updateSingle = function (updatedBookmark, pathToTarget) {
    // Get local bookmark id from path and then update
    return findLocalBookmarkByPath(pathToTarget.slice(1))
      .then(function (localBookmarkToUpdate) {
        if (!localBookmarkToUpdate) {
          return $q.reject({ code: globals.ErrorCodes.LocalBookmarkNotFound });
        }

        return updateLocalBookmark(localBookmarkToUpdate.id, updatedBookmark.title, updatedBookmark.url);
      });
  };


	/* ------------------------------------------------------------------------------------
	 * Private functions
	 * ------------------------------------------------------------------------------------ */

  var createLocalBookmark = function (parentId, title, url, index) {
    var newLocalBookmark = {
      index: index,
      parentId: parentId,
      title: title,
      url: url
    };

    // Check that the url is supported
    if (!localBookmarkUrlIsSupported(url)) {
      utility.LogInfo('Bookmark url unsupported: ' + url);
      newLocalBookmark.url = getNewTabUrl();
    }

    return browser.bookmarks.create(newLocalBookmark)
      .catch(function (err) {
        utility.LogInfo('Failed to create local bookmark: ' + JSON.stringify(newLocalBookmark));
        return $q.reject({
          code: globals.ErrorCodes.FailedCreateLocalBookmarks,
          stack: err.stack
        });
      });
  };

  var createLocalBookmarksFromXBookmarks = function (parentId, xBookmarks, localToolbarContainerId) {
    var processError;
    var createRecursive = function (parentId, xBookmarks, localToolbarContainerId) {
      var createChildBookmarksPromises = [];

      // Create bookmarks at the top level of the supplied array
      return xBookmarks.reduce(function (p, xBookmark) {
        return p.then(function () {
          // If an error occurred during the recursive process, prevent any more bookmarks being created
          if (processError) {
            return $q.resolve();
          }

          return bookmarks.IsSeparator(xBookmark) ?
            createLocalSeparator(parentId, localToolbarContainerId) : createLocalBookmark(parentId, xBookmark.title, xBookmark.url)
              .then(function (newLocalBookmark) {
                // If the bookmark has children, recurse
                if (xBookmark.children && xBookmark.children.length > 0) {
                  createChildBookmarksPromises.push(createRecursive(newLocalBookmark.id, xBookmark.children, localToolbarContainerId));
                }
              });
        });
      }, $q.resolve())
        .then(function () {
          return $q.all(createChildBookmarksPromises);
        })
        .catch(function (err) {
          processError = err;
          throw err;
        });
    };
    return createRecursive(parentId, xBookmarks, localToolbarContainerId);
  };

  var createLocalSeparator = function (parentId) {
    var newLocalSeparator = {
      parentId: parentId,
      type: separatorTypeName
    };

    return browser.bookmarks.create(newLocalSeparator)
      .catch(function (err) {
        utility.LogInfo('Failed to create local separator');
        return $q.reject({
          code: globals.ErrorCodes.FailedCreateLocalBookmarks,
          stack: err.stack
        });
      });
  };

  var deleteLocalBookmarksTree = function (localBookmarkId) {
    return browser.bookmarks.removeTree(localBookmarkId)
      .catch(function (err) {
        utility.LogInfo('Failed to delete local bookmark: ' + localBookmarkId);
        return $q.reject({
          code: globals.ErrorCodes.FailedRemoveLocalBookmarks,
          stack: err.stack
        });
      });
  };

  var findLocalBookmarkByPath = function (path) {
    var menuBookmarksId, mobileBookmarksId, otherBookmarksId, toolbarBookmarksId;
    var container = path.shift().bookmark;
    if (!bookmarks.XBookmarkIsContainer(container)) {
      // First path item should always be a container
      return $q.reject({ code: globals.ErrorCodes.LocalBookmarkNotFound });
    }

    // Get local container node ids
    return getLocalContainerIds()
      .then(function (localContainerIds) {
        menuBookmarksId = localContainerIds[globals.Bookmarks.MenuContainerName];
        mobileBookmarksId = localContainerIds[globals.Bookmarks.MobileContainerName];
        otherBookmarksId = localContainerIds[globals.Bookmarks.OtherContainerName];
        toolbarBookmarksId = localContainerIds[globals.Bookmarks.ToolbarContainerName];

        // Check if container is unsupported in this browser
        var getLocalContainerIdPromise;
        if (unsupportedContainers.find(function (x) { return x === container.title; })) {
          // Container is unsupported, find folder under other bookmarks
          getLocalContainerIdPromise = browser.bookmarks.getChildren(otherBookmarksId)
            .then(function (children) {
              var localContainer = children.find(function (x) { return x.title === container.title; });
              if (localContainer) {
                // Container folder found, return id
                return localContainer.id;
              }
              else {
                // Unable to find local container folder 
                return $q.reject({ code: globals.ErrorCodes.LocalBookmarkNotFound });
              }
            });
        }
        else {
          // Container is supported, return relevant id
          switch (container.title) {
            case globals.Bookmarks.MenuContainerName:
              getLocalContainerIdPromise = $q.resolve(menuBookmarksId);
              break;
            case globals.Bookmarks.MobileContainerName:
              getLocalContainerIdPromise = $q.resolve(mobileBookmarksId);
              break;
            case globals.Bookmarks.OtherContainerName:
              getLocalContainerIdPromise = $q.resolve(otherBookmarksId);
              break;
            case globals.Bookmarks.ToolbarContainerName:
              getLocalContainerIdPromise = $q.resolve(toolbarBookmarksId);
              break;
          }
        }

        return getLocalContainerIdPromise;
      })
      .then(getLocalBookmarkTree)
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

    return browser.bookmarks.search({ title: title })
      .then(function (results) {
        var localBookmark;
        if (results.length > 0) {
          localBookmark = results.shift();
        }

        return localBookmark;
      });
  };

  var getLocalBookmarkTree = function (localBookmarkId) {
    var getTree = localBookmarkId != null ?
      browser.bookmarks.getSubTree(localBookmarkId) :
      browser.bookmarks.getTree();

    return getTree
      .then(function (tree) {
        if (!tree || tree.length < 1) {
          return $q.reject();
        }
        return tree[0];
      })
      .catch(function (err) {
        utility.LogInfo(
          localBookmarkId != null ? 'Failed to get local bookmark tree at id: ' + localBookmarkId :
            'Failed to get local bookmark tree');
        return $q.reject({
          code: globals.ErrorCodes.FailedGetLocalBookmarks,
          stack: err.stack
        });
      });
  };

  var getLocalBookmarksAsXBookmarks = function (localBookmarks) {
    var xBookmarks = [];

    for (var i = 0; i < localBookmarks.length; i++) {
      var currentLocalBookmark = localBookmarks[i];

      // Check if current local bookmark is a separator
      var newXBookmark = bookmarks.IsSeparator(currentLocalBookmark) ? new bookmarks.XSeparator() :
        new bookmarks.XBookmark(currentLocalBookmark.title, currentLocalBookmark.url);

      // If this is a folder and has children, process them
      if (currentLocalBookmark.children && currentLocalBookmark.children.length > 0) {
        newXBookmark.children = getLocalBookmarksAsXBookmarks(currentLocalBookmark.children);
      }

      xBookmarks.push(newXBookmark);
    }

    return xBookmarks;
  };

  var getLocalContainerIds = function () {
    return getLocalBookmarkTree()
      .then(function (tree) {
        // Get the root child nodes
        var menuBookmarksNode = tree.children.find(function (x) { return x.id === 'menu________'; });
        var mobileBookmarksNode = tree.children.find(function (x) { return x.id === 'mobile______'; });
        var otherBookmarksNode = tree.children.find(function (x) { return x.id === 'unfiled_____'; });
        var toolbarBookmarksNode = tree.children.find(function (x) { return x.id === 'toolbar_____'; });

        // Throw an error if a local container is not found
        if (!menuBookmarksNode || !mobileBookmarksNode || !otherBookmarksNode || !toolbarBookmarksNode) {
          if (!menuBookmarksNode) { utility.LogWarning('Missing container: menu bookmarks'); }
          if (!mobileBookmarksNode) { utility.LogWarning('Missing container: mobile bookmarks'); }
          if (!otherBookmarksNode) { utility.LogWarning('Missing container: other bookmarks'); }
          if (!toolbarBookmarksNode) { utility.LogWarning('Missing container: toolbar bookmarks'); }
          return $q.reject({ code: globals.ErrorCodes.LocalContainerNotFound });
        }

        // Return the container ids
        var results = {};
        results[globals.Bookmarks.MenuContainerName] = menuBookmarksNode.id;
        results[globals.Bookmarks.MobileContainerName] = mobileBookmarksNode.id;
        results[globals.Bookmarks.OtherContainerName] = otherBookmarksNode.id;
        results[globals.Bookmarks.ToolbarContainerName] = toolbarBookmarksNode.id;
        return results;
      });
  };

  var getNumContainersBeforeBookmarkIndex = function (parentId, bookmarkIndex) {
    return getLocalBookmarkTree(parentId)
      .then(function (localBookmark) {
        // TODO: Refactor to account for given index
        var numContainers = _.filter(localBookmark.children, bookmarks.XBookmarkIsContainer).length;
        return numContainers;
      });
  };

  var isLocalBookmarkContainer = function (localBookmarkId) {
    // Get local container node ids
    return getLocalContainerIds()
      .then(function (localContainerIds) {
        var menuBookmarksId = localContainerIds[globals.Bookmarks.MenuContainerName];
        var mobileBookmarksId = localContainerIds[globals.Bookmarks.MobileContainerName];
        var otherBookmarksId = localContainerIds[globals.Bookmarks.OtherContainerName];
        var toolbarBookmarksId = localContainerIds[globals.Bookmarks.ToolbarContainerName];

        var localContainers = [
          { id: menuBookmarksId, xBookmarkTitle: globals.Bookmarks.MenuContainerName },
          { id: mobileBookmarksId, xBookmarkTitle: globals.Bookmarks.MobileContainerName },
          { id: otherBookmarksId, xBookmarkTitle: globals.Bookmarks.OtherContainerName },
          { id: toolbarBookmarksId, xBookmarkTitle: globals.Bookmarks.ToolbarContainerName }
        ];

        // Check if the bookmark id resolves to a local container
        return _.findWhere(localContainers, { id: localBookmarkId });
      });
  };

  var localBookmarkUrlIsSupported = function (url) {
    if (!url) {
      return true;
    }

    var supportedRegex = /^(?!chrome|data)[\w\-]+:/i;
    return supportedRegex.test(url);
  };

  var reorderLocalContainers = function () {
    // Get local containers
    return $q.all(unsupportedContainers.map(findLocalBookmarkByTitle))
      .then(function (results) {
        // Remove falsy results
        var localContainers = results.filter(function (x) { return x; });

        // Reorder each local container to top of parent
        return $q.all(localContainers.map(function (localContainer, index) {
          return browser.bookmarks.move(
            localContainer.id,
            {
              index: index,
              parentId: localContainer.parentId
            }
          );
        }));
      });
  };

  var updateLocalBookmark = function (localBookmarkId, title, url) {
    var updateInfo = {
      title: title,
      url: url
    };

    // Check that the url is supported
    if (!localBookmarkUrlIsSupported(url)) {
      utility.LogInfo('Bookmark url unsupported: ' + url);
      updateInfo.url = getNewTabUrl();
    }

    return browser.bookmarks.update(localBookmarkId, updateInfo)
      .catch(function (err) {
        utility.LogInfo('Failed to update local bookmark: ' + JSON.stringify(updateInfo));
        return $q.reject({
          code: globals.ErrorCodes.FailedUpdateLocalBookmarks,
          stack: err.stack
        });
      });
  };

  var wasContainerChanged = function (changedBookmark, xBookmarks) {
    // Check based on title
    return $q.resolve(bookmarks.XBookmarkIsContainer(changedBookmark));
  };

  // Call constructor
  return new FirefoxImplementation();
};