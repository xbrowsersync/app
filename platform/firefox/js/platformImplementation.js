var xBrowserSync = xBrowserSync || {};
xBrowserSync.App = xBrowserSync.App || {};

/* ------------------------------------------------------------------------------------
 * Class name:  xBrowserSync.App.PlatformImplementation 
 * Description: Implements xBrowserSync.App.Platform for Firefox extension.
 * ------------------------------------------------------------------------------------ */

xBrowserSync.App.PlatformImplementation = function ($interval, $q, $timeout, bookmarkIdMapper, bookmarks, globals, platform, store, utility) {
  'use strict';

  var vm, loadingId, refreshInterfaceTimeout,
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
    platform.Bookmarks.BuildIdMappings = buildIdMappings;
    platform.Bookmarks.Clear = clearBookmarks;
    platform.Bookmarks.Created = bookmarksCreated;
    platform.Bookmarks.CreateSingle = createSingle;
    platform.Bookmarks.Deleted = bookmarksDeleted;
    platform.Bookmarks.DeleteSingle = deleteSingle;
    platform.Bookmarks.Get = getBookmarks;
    platform.Bookmarks.Moved = bookmarksMoved;
    platform.Bookmarks.Populate = populateBookmarks;
    platform.Bookmarks.ReorderContainers = reorderLocalContainers;
    platform.Bookmarks.Updated = bookmarksUpdated;
    platform.Bookmarks.UpdateSingle = updateSingle;
    platform.CopyToClipboard = copyToClipboard;
    platform.DownloadFile = downloadFile;
    platform.EventListeners.Enable = enableEventListeners;
    platform.EventListeners.Disable = disableEventListeners;
    platform.GetConstant = getConstant;
    platform.GetCurrentUrl = getCurrentUrl;
    platform.GetHelpPages = getHelpPages;
    platform.GetNewTabUrl = getNewTabUrl;
    platform.GetPageMetadata = getPageMetadata;
    platform.GetSupportedUrl = getSupportedUrl;
    platform.Init = init;
    platform.Interface.Working.Hide = hideLoading;
    platform.Interface.Working.Show = displayLoading;
    platform.Interface.Refresh = refreshInterface;
    platform.OpenUrl = openUrl;
    platform.Permissions.Check = checkPermissions;
    platform.Permissions.Remove = removePermissions;
    platform.Permissions.Request = requestPermissions;
    platform.Sync.Current = getCurrentSync;
    platform.Sync.Disable = disableSync;
    platform.Sync.GetQueueLength = getSyncQueueLength;
    platform.Sync.Queue = queueSync;
  };


	/* ------------------------------------------------------------------------------------
	 * Public functions
	 * ------------------------------------------------------------------------------------ */

  var bookmarksCreated = function (xBookmarks, createInfo) {
    // Check if the current bookmark is a container
    return isLocalBookmarkContainer(createInfo.parentId)
      .then(function (localContainer) {
        if (localContainer) {
          // Check container exists
          var container = bookmarks.GetContainer(localContainer.xBookmarkTitle, xBookmarks, true);
          return container.id;
        }

        // Get the synced parent id from id mappings and retrieve the synced parent bookmark
        return bookmarkIdMapper.Get(createInfo.parentId)
          .then(function (idMapping) {
            if (!idMapping) {
              // No mappings found, skip sync
              utility.LogInfo('No id mapping found, skipping sync');
              return;
            }

            return idMapping.syncedId;
          });
      })
      .then(function (parentId) {
        if (!parentId) {
          return;
        }

        // Add new bookmark then check if the change should be synced
        var newBookmarkInfo = angular.copy(createInfo);
        newBookmarkInfo.parentId = parentId;
        delete newBookmarkInfo.id;
        return bookmarks.AddBookmark(newBookmarkInfo, xBookmarks)
          .then(function (result) {
            return shouldSyncLocalChanges(result.bookmark, result.bookmarks)
              .then(function (syncChange) {
                if (!syncChange) {
                  return;
                }

                // Add new id mapping
                var idMapping = bookmarkIdMapper.CreateMapping(result.bookmark.id, createInfo.id);
                return bookmarkIdMapper.Add(idMapping)
                  .then(function () {
                    return result.bookmarks;
                  });
              });
          });
      });
  };

  var bookmarksDeleted = function (xBookmarks, deleteInfo) {
    // Check if the deleted bookmark was an unsupported container
    var isContainer = unsupportedContainers.filter(function (x) {
      return x === deleteInfo.title;
    }).length > 0;
    if (isContainer) {
      return $q.reject({ code: globals.ErrorCodes.ContainerChanged });
    }

    // Get the synced bookmark id from delete info
    return bookmarkIdMapper.Get(deleteInfo.id)
      .then(function (idMapping) {
        if (!idMapping) {
          // No mappings found, skip sync
          utility.LogInfo('No id mapping found, skipping sync');
          return;
        }

        // Check if the change should be synced
        var bookmarkToDelete = bookmarks.FindBookmarkById(xBookmarks, idMapping.syncedId);
        return shouldSyncLocalChanges(bookmarkToDelete, xBookmarks)
          .then(function (syncChange) {
            if (!syncChange) {
              return;
            }

            // Get all child bookmark mappings
            var descendantsIds = bookmarks.GetIdsFromDescendants(bookmarkToDelete);

            // Delete bookmark
            return bookmarks.RemoveBookmarkById(idMapping.syncedId, xBookmarks)
              .then(function (updatedBookmarks) {
                // Remove all retrieved ids from mappings
                var syncedIds = descendantsIds.concat([idMapping.syncedId]);
                return bookmarkIdMapper.Remove(syncedIds)
                  .then(function () {
                    return updatedBookmarks;
                  });
              });
          });
      });
  };

  var bookmarksMoved = function (xBookmarks, moveInfo) {
    var changesMade = false;

    // Get the moved bookmark and new parent ids from id mappings or if container use the existing id
    return $q.all([
      bookmarkIdMapper.Get(moveInfo.id),
      (isLocalBookmarkContainer(moveInfo.parentId)
        .then(function (localContainer) {
          if (localContainer) {
            var container = bookmarks.GetContainer(localContainer.xBookmarkTitle, xBookmarks, true);
            return { syncedId: container.id };
          }
          return bookmarkIdMapper.Get(moveInfo.parentId);
        }))
    ])
      .then(function (idMappings) {
        if (!idMappings[0] && !idMappings[1]) {
          // No mappings found, skip sync
          utility.LogInfo('No id mappings found, skipping sync');
          return;
        }

        // Get the bookmark to be removed
        return (!idMappings[0] ? createBookmarkFromLocalId(moveInfo.id, xBookmarks) : $q.resolve(bookmarks.FindBookmarkById(xBookmarks, idMappings[0].syncedId)))
          .then(function (bookmarkToRemove) {
            // If old parent is mapped, remove the moved bookmark
            var removeBookmarkPromise;
            if (!idMappings[0]) {
              // Moved bookmark not mapped, skip remove
              removeBookmarkPromise = $q.resolve(xBookmarks);
            }
            else {
              // Check if change should be synced then remove the bookmark
              removeBookmarkPromise = shouldSyncLocalChanges(bookmarkToRemove, xBookmarks)
                .then(function (syncChange) {
                  if (!syncChange) {
                    return xBookmarks;
                  }
                  return bookmarks.RemoveBookmarkById(idMappings[0].syncedId, xBookmarks)
                    .then(function (updatedBookmarks) {
                      // Set flag to ensure update bookmarks are synced
                      changesMade = true;
                      return updatedBookmarks;
                    });
                });
            }
            return removeBookmarkPromise
              .then(function (bookmarksAfterRemoval) {
                var addBookmarkPromise;
                if (!idMappings[1]) {
                  // New parent not mapped, skip add
                  addBookmarkPromise = $q.resolve(bookmarksAfterRemoval);
                }
                else {
                  // Add the bookmark then check if change should be synced
                  var newBookmarkInfo = angular.copy(bookmarkToRemove);
                  newBookmarkInfo.parentId = idMappings[1].syncedId;
                  addBookmarkPromise = getNumContainersBeforeBookmarkIndex(moveInfo.parentId, moveInfo.index)
                    .then(function (numContainers) {
                      // Adjust the target index by the number of container folders then add the bookmark
                      newBookmarkInfo.index = moveInfo.index - numContainers;
                      return bookmarks.AddBookmark(newBookmarkInfo, bookmarksAfterRemoval);
                    })
                    .then(function (result) {
                      return shouldSyncLocalChanges(result.bookmark, result.bookmarks)
                        .then(function (syncChange) {
                          if (!syncChange) {
                            return bookmarksAfterRemoval;
                          }

                          // Set flag to ensure update bookmarks are synced
                          changesMade = true;

                          // Add new id mapping for moved bookmark
                          if (idMappings[0]) {
                            // If moved bookmark was already mapped, no need to update id mappings
                            return result.bookmarks;
                          }
                          var idMapping = bookmarkIdMapper.CreateMapping(result.bookmark.id, moveInfo.id);
                          return bookmarkIdMapper.Add(idMapping)
                            .then(function () {
                              return result.bookmarks;
                            });
                        });
                    });
                }
                return addBookmarkPromise;
              })
              .then(function (updatedBookmarks) {
                if (!changesMade) {
                  // No changes made, skip sync
                  return;
                }
                return updatedBookmarks;
              });
          });
      });
  };

  var bookmarksUpdated = function (xBookmarks, updateInfo) {
    // Get the synced bookmark id from change info
    return bookmarkIdMapper.Get(updateInfo.id)
      .then(function (idMapping) {
        if (!idMapping) {
          // No mappings found, skip sync
          utility.LogInfo('No id mapping found, skipping sync');
          return;
        }

        // Check if the change should be synced
        var bookmarkToUpdate = bookmarks.FindBookmarkById(xBookmarks, idMapping.syncedId);
        return shouldSyncLocalChanges(bookmarkToUpdate, xBookmarks)
          .then(function (syncChange) {
            if (!syncChange) {
              return;
            }

            // Update the bookmark with the update info
            return bookmarks.UpdateBookmarkById(idMapping.syncedId, updateInfo, xBookmarks);
          });
      });
  };

  var buildIdMappings = function (syncedBookmarks) {
    var mapIds = function (nodes, syncedBookmarks) {
      return nodes.reduce(function (acc, val, index) {
        // Create mapping for the current node
        var mapping = bookmarkIdMapper.CreateMapping(syncedBookmarks[index].id, val.id);
        acc.push(mapping);

        // Process child nodes
        return (val.children && val.children.length > 0) ? acc.concat(mapIds(val.children, syncedBookmarks[index].children)) : acc;
      }, []);
    };

    // Get local container node ids
    return getLocalContainerIds()
      .then(function (localContainerIds) {
        var menuBookmarksId = localContainerIds[globals.Bookmarks.MenuContainerName];
        var mobileBookmarksId = localContainerIds[globals.Bookmarks.MobileContainerName];
        var otherBookmarksId = localContainerIds[globals.Bookmarks.OtherContainerName];
        var toolbarBookmarksId = localContainerIds[globals.Bookmarks.ToolbarContainerName];

        // Map menu bookmarks
        var getMenuBookmarks = menuBookmarksId == null ? $q.resolve([]) :
          browser.bookmarks.getSubTree(menuBookmarksId)
            .then(function (subTree) {
              var menuBookmarks = subTree[0];
              if (!menuBookmarks.children || menuBookmarks.children.length === 0) {
                return [];
              }

              // Map ids between nodes and synced container children
              var menuBookmarksContainer = syncedBookmarks.find(function (x) {
                return x.title === globals.Bookmarks.MenuContainerName;
              });
              return !!menuBookmarksContainer && menuBookmarksContainer.children && menuBookmarksContainer.children.length > 0 ?
                mapIds(menuBookmarks.children, menuBookmarksContainer.children) : [];
            });

        // Map mobile bookmarks
        var getMobileBookmarks = mobileBookmarksId == null ? $q.resolve([]) :
          browser.bookmarks.getSubTree(mobileBookmarksId)
            .then(function (subTree) {
              var mobileBookmarks = subTree[0];
              if (!mobileBookmarks.children || mobileBookmarks.children.length === 0) {
                return [];
              }

              // Map ids between nodes and synced container children
              var mobileBookmarksContainer = syncedBookmarks.find(function (x) {
                return x.title === globals.Bookmarks.MobileContainerName;
              });
              return !!mobileBookmarksContainer && mobileBookmarksContainer.children && mobileBookmarksContainer.children.length > 0 ?
                mapIds(mobileBookmarks.children, mobileBookmarksContainer.children) : [];
            });

        // Map other bookmarks
        var getOtherBookmarks = otherBookmarksId == null ? $q.resolve([]) :
          browser.bookmarks.getSubTree(otherBookmarksId)
            .then(function (subTree) {
              var otherBookmarks = subTree[0];
              if (!otherBookmarks.children || otherBookmarks.children.length === 0) {
                return [];
              }

              // Remove any unsupported container folders present
              var nodes = otherBookmarks.children.filter(function (x) {
                return Object.values(localContainerIds).indexOf(x.id) < 0;
              });

              // Map ids between nodes and synced container children
              var otherBookmarksContainer = syncedBookmarks.find(function (x) {
                return x.title === globals.Bookmarks.OtherContainerName;
              });
              return !!otherBookmarksContainer && otherBookmarksContainer.children && otherBookmarksContainer.children.length > 0 ?
                mapIds(nodes, otherBookmarksContainer.children) : [];
            });

        // Map toolbar bookmarks if enabled
        var getToolbarBookmarks = toolbarBookmarksId == null ? $q.resolve([]) :
          $q.all([
            bookmarks.GetSyncBookmarksToolbar(),
            browser.bookmarks.getSubTree(toolbarBookmarksId)
          ])
            .then(function (results) {
              var syncBookmarksToolbar = results[0];
              var toolbarBookmarks = results[1][0];

              if (!syncBookmarksToolbar) {
                return;
              }

              if (!toolbarBookmarks.children || toolbarBookmarks.children.length === 0) {
                return [];
              }

              // Map ids between nodes and synced container children
              var toolbarBookmarksContainer = syncedBookmarks.find(function (x) {
                return x.title === globals.Bookmarks.ToolbarContainerName;
              });
              return !!toolbarBookmarksContainer && toolbarBookmarksContainer.children && toolbarBookmarksContainer.children.length > 0 ?
                mapIds(toolbarBookmarks.children, toolbarBookmarksContainer.children) : [];
            });

        return $q.all([getMenuBookmarks, getMobileBookmarks, getOtherBookmarks, getToolbarBookmarks]);
      })
      .then(function (results) {
        // Combine all mappings
        var combinedMappings = results.reduce(function (acc, val) {
          return acc.concat(val);
        }, []);

        // Save mappings
        return bookmarkIdMapper.Set(combinedMappings);
      });
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
            utility.LogWarning('Error clearing bookmarks menu');
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
            utility.LogWarning('Error clearing mobile bookmarks');
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
            utility.LogWarning('Error clearing other bookmarks');
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
              });
          })
          .catch(function (err) {
            utility.LogWarning('Error clearing bookmarks toolbar');
            throw err;
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

  var copyToClipboard = function (textToCopy) {
    return navigator.clipboard.writeText(textToCopy)
      .catch(function (err) {
        utility.LogError(err, 'platform.copyToClipboard');
        throw err;
      });
  };

  var createSingle = function (createInfo) {
    // Create local bookmark in other bookmarks container
    return getLocalContainerIds()
      .then(function (localContainerIds) {
        var otherBookmarksId = localContainerIds[globals.Bookmarks.OtherContainerName];
        return createLocalBookmark(otherBookmarksId, createInfo.bookmark.title, createInfo.bookmark.url);
      })
      .then(function (newLocalBookmark) {
        // Add id mapping for new bookmark
        var idMapping = bookmarkIdMapper.CreateMapping(createInfo.bookmark.id, newLocalBookmark.id);
        return bookmarkIdMapper.Add(idMapping);
      });
  };

  var deleteSingle = function (deleteInfo) {
    // Get local bookmark id from id mappings
    return bookmarkIdMapper.Get(null, deleteInfo.bookmark.id)
      .then(function (idMapping) {
        if (!idMapping) {
          utility.LogWarning('No id mapping found for synced id \'' + deleteInfo.bookmark.id + '\'');
          return;
        }

        // Remove local bookmark
        return deleteLocalBookmarksTree(idMapping.nativeId)
          .then(function () {
            // Remove id mapping
            return bookmarkIdMapper.Remove(deleteInfo.bookmark.id);
          });
      });
  };

  var disableEventListeners = function () {
    return sendMessage({
      command: globals.Commands.DisableEventListeners
    });
  };

  var disableSync = function () {
    return sendMessage({
      command: globals.Commands.DisableSync
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
      // Loading bookmark metadata, wait a moment before displaying loading overlay
      case 'retrievingMetadata':
        timeout = $timeout(function () {
          vm.working.show = true;
        }, 500);
        break;
      // Display default overlay
      default:
        timeout = $timeout(function () {
          vm.working.show = true;
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

    // Use provided hyperlink or create new one
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

    utility.LogInfo('Downloading file ' + fileName);

    // Use hyperlink to trigger file download
    var file = new Blob([textContents], { type: 'text/plain' });
    downloadLink.href = URL.createObjectURL(file);
    downloadLink.innerText = fileName;
    downloadLink.download = fileName;
    downloadLink.click();

    if (!linkId) {
      document.body.removeChild(downloadLink);
    }

    // Return message to be displayed
    var message = getConstant(globals.Constants.DownloadFile_Success_Message);
    return $q.resolve(message);
  };

  var enableEventListeners = function () {
    return sendMessage({
      command: globals.Commands.EnableEventListeners
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
    var allLocalBookmarks = [];

    // Get local container node ids
    return getLocalContainerIds()
      .then(function (localContainerIds) {
        var menuBookmarksId = localContainerIds[globals.Bookmarks.MenuContainerName];
        var mobileBookmarksId = localContainerIds[globals.Bookmarks.MobileContainerName];
        var otherBookmarksId = localContainerIds[globals.Bookmarks.OtherContainerName];
        var toolbarBookmarksId = localContainerIds[globals.Bookmarks.ToolbarContainerName];

        // Get menu bookmarks
        var getMenuBookmarks = menuBookmarksId == null ? $q.resolve() :
          browser.bookmarks.getSubTree(menuBookmarksId)
            .then(function (subTree) {
              var menuBookmarks = subTree[0];
              if (menuBookmarks.children && menuBookmarks.children.length > 0) {
                // Add all bookmarks into flat array
                bookmarks.Each(menuBookmarks.children, function (bookmark) {
                  allLocalBookmarks.push(bookmark);
                });
                return getLocalBookmarksAsXBookmarks(menuBookmarks.children);
              }
            });

        // Get mobile bookmarks
        var getMobileBookmarks = mobileBookmarksId == null ? $q.resolve() :
          browser.bookmarks.getSubTree(mobileBookmarksId)
            .then(function (subTree) {
              var mobileBookmarks = subTree[0];
              if (mobileBookmarks.children && mobileBookmarks.children.length > 0) {
                // Add all bookmarks into flat array
                bookmarks.Each(mobileBookmarks.children, function (bookmark) {
                  allLocalBookmarks.push(bookmark);
                });
                return getLocalBookmarksAsXBookmarks(mobileBookmarks.children);
              }
            });

        // Get other bookmarks
        var getOtherBookmarks = otherBookmarksId == null ? $q.resolve() :
          browser.bookmarks.getSubTree(otherBookmarksId)
            .then(function (subTree) {
              var otherBookmarks = subTree[0];
              if (!otherBookmarks.children || otherBookmarks.children.length === 0) {
                return;
              }

              // Add all bookmarks into flat array
              bookmarks.Each(otherBookmarks.children, function (bookmark) {
                allLocalBookmarks.push(bookmark);
              });

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
            browser.bookmarks.getSubTree(toolbarBookmarksId)
          ])
            .then(function (results) {
              var syncBookmarksToolbar = results[0];
              var toolbarBookmarks = results[1][0];

              if (!syncBookmarksToolbar) {
                return;
              }

              if (toolbarBookmarks.children && toolbarBookmarks.children.length > 0) {
                // Add all bookmarks into flat array
                bookmarks.Each(toolbarBookmarks.children, function (bookmark) {
                  allLocalBookmarks.push(bookmark);
                });

                return getLocalBookmarksAsXBookmarks(toolbarBookmarks.children);
              }
            });

        return $q.all([getMenuBookmarks, getMobileBookmarks, getOtherBookmarks, getToolbarBookmarks]);
      })
      .then(function (results) {
        var menuBookmarks = results[0];
        var mobileBookmarks = results[1];
        var otherBookmarks = results[2];
        var toolbarBookmarks = results[3];
        var xBookmarks = [];
        var otherContainer, toolbarContainer, menuContainer, mobileContainer;

        // Add other container if bookmarks present
        if (otherBookmarks && otherBookmarks.length > 0) {
          otherContainer = bookmarks.GetContainer(globals.Bookmarks.OtherContainerName, xBookmarks, true);
          otherContainer.children = otherBookmarks;
        }

        // Add toolbar container if bookmarks present
        if (toolbarBookmarks && toolbarBookmarks.length > 0) {
          toolbarContainer = bookmarks.GetContainer(globals.Bookmarks.ToolbarContainerName, xBookmarks, true);
          toolbarContainer.children = toolbarBookmarks;
        }

        // Add menu container if bookmarks present
        if (menuBookmarks && menuBookmarks.length > 0) {
          menuContainer = bookmarks.GetContainer(globals.Bookmarks.MenuContainerName, xBookmarks, true);
          menuContainer.children = menuBookmarks;
        }

        // Add mobile container if bookmarks present
        if (mobileBookmarks && mobileBookmarks.length > 0) {
          mobileContainer = bookmarks.GetContainer(globals.Bookmarks.MobileContainerName, xBookmarks, true);
          mobileContainer.children = mobileBookmarks;
        }

        // Filter containers from flat array of bookmarks
        [otherContainer, toolbarContainer, menuContainer, mobileContainer].forEach(function (container) {
          if (!container) {
            return;
          }

          allLocalBookmarks = allLocalBookmarks.filter(function (bookmark) {
            return bookmark.title !== container.title;
          });
        });

        // Sort by date added asc 
        allLocalBookmarks = allLocalBookmarks.sort(function (x, y) {
          return x.dateAdded - y.dateAdded;
        });

        // Iterate local bookmarks to add unique bookmark ids in correct order 
        allLocalBookmarks.forEach(function (localBookmark) {
          bookmarks.Each(xBookmarks, function (xBookmark) {
            if (!xBookmark.id && (
              (!localBookmark.url && xBookmark.title === localBookmark.title) ||
              (localBookmark.url && xBookmark.url === localBookmark.url))) {
              xBookmark.id = bookmarks.GetNewBookmarkId(xBookmarks);
            }
          });
        });

        // Find and fix any bookmarks missing ids
        bookmarks.Each(xBookmarks, function (xBookmark) {
          if (!xBookmark.id) {
            xBookmark.id = bookmarks.GetNewBookmarkId(xBookmarks);
          }
        });

        return xBookmarks;
      });
  };

  var getConstant = function (constName) {
    return browser.i18n.getMessage(constName);
  };

  var getCurrentSync = function () {
    return sendMessage({
      command: globals.Commands.GetCurrentSync
    })
      .then(function (response) {
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

  var getHelpPages = function () {
    var pages = [
      platform.GetConstant(globals.Constants.Help_Page_Welcome_Desktop_Content),
      platform.GetConstant(globals.Constants.Help_Page_BeforeYouBegin_Firefox_Content),
      platform.GetConstant(globals.Constants.Help_Page_FirstSync_Desktop_Content),
      platform.GetConstant(globals.Constants.Help_Page_Service_Content),
      platform.GetConstant(globals.Constants.Help_Page_SyncId_Content),
      platform.GetConstant(globals.Constants.Help_Page_ExistingId_Desktop_Content),
      platform.GetConstant(globals.Constants.Help_Page_Searching_Desktop_Content),
      platform.GetConstant(globals.Constants.Help_Page_AddingBookmarks_Firefox_Content),
      platform.GetConstant(globals.Constants.Help_Page_NativeFeatures_Firefox_Content),
      platform.GetConstant(globals.Constants.Help_Page_BackingUp_Desktop_Content),
      platform.GetConstant(globals.Constants.Help_Page_Shortcuts_Firefox_Content),
      platform.GetConstant(globals.Constants.Help_Page_Mobile_Content),
      platform.GetConstant(globals.Constants.Help_Page_FurtherSupport_Content)
    ];

    return pages;
  };

  var getNewTabUrl = function () {
    return 'about:newtab';
  };

  var getPageMetadata = function (getFullMetadata, pageUrl) {
    var activeTab;
    getFullMetadata = getFullMetadata === undefined ? true : getFullMetadata;

    return browser.tabs.query({ active: true, currentWindow: true })
      .then(function (tabs) {
        // If active tab empty, throw error
        activeTab = tabs && tabs[0];
        if (!activeTab) {
          return $q.reject({ code: globals.ErrorCodes.FailedGetPageMetadata });
        }

        // Default metadata to the info from the active tab
        var metadata = activeTab && {
          title: activeTab.title,
          url: activeTab.url
        };

        // Don't get metadata if this is a firefox url
        if (getFullMetadata) {
          getFullMetadata = !(/^about\:/i).test(activeTab.url);
        }

        // If not retrieving full metadata return with default
        if (!getFullMetadata) {
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

  var getSyncQueueLength = function () {
    return sendMessage({
      command: globals.Commands.GetSyncQueueLength
    })
      .then(function (response) {
        return response.syncQueueLength;
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
        vm.working.show = false;
        loadingId = null;
      });
    }
  };

  var init = function (viewModel) {
    // Set global variables
    vm = viewModel;
    vm.platformName = globals.Platforms.Firefox;

    return $q.resolve();
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
        if (menuContainer) {
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
        if (mobileContainer) {
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
        if (otherContainer) {
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

            if (toolbarContainer) {
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
        utility.LogInfo('Local bookmarks populated in ' + ((new Date() - populateStartTime) / 1000) + 's');
        // Move local containers into the correct order
        return reorderLocalContainers();
      });
  };

  var queueSync = function (syncData, command) {
    syncData.command = command || globals.Commands.SyncBookmarks;
    return sendMessage(syncData)
      .then(function (response) {
        return response.bookmarks;
      });
  };

  var refreshInterface = function (syncEnabled, syncType) {
    var iconPath, newTitle = getConstant(globals.Constants.Title);
    var syncingTitle = ' (' + getConstant(globals.Constants.Tooltip_Syncing_Label) + ')';
    var syncedTitle = ' (' + getConstant(globals.Constants.Tooltip_Synced_Label) + ')';
    var notSyncedTitle = ' (' + getConstant(globals.Constants.Tooltip_NotSynced_Label) + ')';

    // Clear timeout
    if (refreshInterfaceTimeout) {
      $timeout.cancel(refreshInterfaceTimeout);
      refreshInterfaceTimeout = null;
    }

    if (syncType) {
      iconPath = syncType === globals.SyncType.Pull ? 'img/downloading.png' : 'img/uploading.png';
      newTitle += syncingTitle;
    }
    else if (syncEnabled) {
      iconPath = 'img/synced.png';
      newTitle += syncedTitle;
    }
    else {
      iconPath = 'img/notsynced.png';
      newTitle += notSyncedTitle;
    }

    return $q(function (resolve, reject) {
      var iconUpdated = $q.defer();
      var titleUpdated = $q.defer();

      browser.browserAction.getTitle({})
        .then(function (currentTitle) {
          // Don't do anything if browser action title hasn't changed 
          if (newTitle === currentTitle) {
            return resolve();
          }

          // Set a delay if finished syncing to prevent flickering when executing many syncs
          if (currentTitle.indexOf(syncingTitle) > 0 && newTitle.indexOf(syncedTitle)) {
            refreshInterfaceTimeout = $timeout(function () {
              browser.browserAction.setIcon({ path: iconPath });
              browser.browserAction.setTitle({ title: newTitle });
            }, 350);
            iconUpdated.resolve();
            titleUpdated.resolve();
          }
          else {
            browser.browserAction.setIcon({ path: iconPath }).then(iconUpdated.resolve);
            browser.browserAction.setTitle({ title: newTitle }).then(titleUpdated.resolve);
          }

          $q.all([iconUpdated, titleUpdated])
            .then(resolve)
            .catch(reject);
        });
    });
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
      });
  };

  var shouldSyncLocalChanges = function (changedBookmark, xBookmarks) {
    // Check if container was changed
    return wasContainerChanged(changedBookmark, xBookmarks)
      .then(function (changedBookmarkIsContainer) {
        if (changedBookmarkIsContainer) {
          return $q.reject({ code: globals.ErrorCodes.ContainerChanged });
        }

        // If container is Toolbar, check if Toolbar sync is disabled
        var container = bookmarks.GetContainerByBookmarkId(changedBookmark.id, xBookmarks);
        if (!container) {
          return $q.reject({ code: globals.ErrorCodes.ContainerNotFound });
        }
        return container.title === globals.Bookmarks.ToolbarContainerName ? bookmarks.GetSyncBookmarksToolbar() : $q.resolve(true);
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

  var updateSingle = function (updateInfo) {
    // Get local bookmark id from id mappings
    return bookmarkIdMapper.Get(null, updateInfo.bookmark.id)
      .then(function (idMapping) {
        if (!idMapping) {
          utility.LogWarning('No id mapping found for synced id \'' + updateInfo.bookmark.id + '\'');
          return;
        }

        // Update local bookmark
        return updateLocalBookmark(idMapping.nativeId, updateInfo.bookmark.title, updateInfo.bookmark.url);
      });
  };


	/* ------------------------------------------------------------------------------------
	 * Private functions
	 * ------------------------------------------------------------------------------------ */

  var createBookmarkFromLocalId = function (id, xBookmarks) {
    return browser.bookmarks.get(id)
      .then(function (results) {
        if (!results || results.length === 0) {
          return $q.reject({ code: globals.ErrorCodes.LocalBookmarkNotFound });
        }
        var localBookmark = results[0];
        var convertedBookmark = bookmarks.ConvertLocalBookmarkToXBookmark(localBookmark, xBookmarks);
        return convertedBookmark;
      });
  };

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
    return browser.bookmarks.getTree()
      .then(function (tree) {
        // Get the root child nodes
        var menuBookmarksNode = tree[0].children.find(function (x) { return x.id === 'menu________'; });
        var mobileBookmarksNode = tree[0].children.find(function (x) { return x.id === 'mobile______'; });
        var otherBookmarksNode = tree[0].children.find(function (x) { return x.id === 'unfiled_____'; });
        var toolbarBookmarksNode = tree[0].children.find(function (x) { return x.id === 'toolbar_____'; });

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
    // Get local container node ids
    return getLocalContainerIds()
      .then(function (localContainerIds) {
        // No containers to adjust for if parent is not other bookmarks
        if (parentId !== localContainerIds[globals.Bookmarks.OtherContainerName]) {
          return 0;
        }

        // Get parent bookmark and count containers
        return browser.bookmarks.getSubTree(parentId)
          .then(function (subTree) {
            var numContainers = subTree[0].children.filter(function (child, index) {
              return index < bookmarkIndex && bookmarks.XBookmarkIsContainer(child);
            }).length;
            return numContainers;
          });
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

  var sendMessage = function (message) {
    return $q(function (resolve, reject) {
      browser.runtime.sendMessage(message)
        .then(function (response) {
          if (!response) {
            return resolve();
          }

          if (!response.success) {
            return reject(response.error);
          }

          resolve(response);
        })
        .catch(function (err) {
          // If no message connection detected, check if background function can be called directly
          if (err.message && err.message.toLowerCase().indexOf('could not establish connection') >= 0 &&
            window.xBrowserSync.App.HandleMessage) {
            return window.xBrowserSync.App.HandleMessage(message, null, resolve);
          }

          utility.LogWarning('Message listener not available');
          reject(err);
        });
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
    return (xBookmarks ? $q.resolve(xBookmarks) : bookmarks.GetBookmarks())
      .then(function (results) {
        xBookmarks = results;

        // Check based on title
        if (bookmarks.XBookmarkIsContainer(changedBookmark)) {
          return true;
        }

        // Get local container node ids
        return getLocalContainerIds()
          .then(function (localContainerIds) {
            // If parent is other bookmarks, check other bookmarks children for containers
            var otherBookmarksId = localContainerIds[globals.Bookmarks.OtherContainerName];
            if (changedBookmark.parentId !== otherBookmarksId) {
              return false;
            }

            return browser.bookmarks.getChildren(otherBookmarksId)
              .then(function (children) {
                // Get all bookmarks in other bookmarks that are xBrowserSync containers
                var localContainers = children.filter(function (x) {
                  return unsupportedContainers.find(function (y) { return y === x.title; });
                });
                var containersCount = 0;
                var checksFailed = false;
                var count;

                // Check each container present only appears once
                var menuContainer = bookmarks.GetContainer(globals.Bookmarks.MenuContainerName, xBookmarks, false);
                if (menuContainer) {
                  containersCount++;
                  count = localContainers.filter(function (x) {
                    return x.title === globals.Bookmarks.MenuContainerName;
                  }).length;
                  checksFailed = count !== 1 ? true : checksFailed;
                }

                var mobileContainer = bookmarks.GetContainer(globals.Bookmarks.MobileContainerName, xBookmarks, false);
                if (mobileContainer) {
                  containersCount++;
                  count = localContainers.filter(function (x) {
                    return x.title === globals.Bookmarks.MobileContainerName;
                  }).length;
                  checksFailed = count !== 1 ? true : checksFailed;
                }

                // Check number of containers match and return result
                checksFailed = containersCount !== localContainers.length ? true : checksFailed;
                return checksFailed;
              })
              .catch(function (err) {
                utility.LogInfo('Failed to detect whether container changed: ' + JSON.stringify(changedBookmark));
                return $q.reject({
                  code: globals.ErrorCodes.FailedGetLocalBookmarks,
                  stack: err.stack
                });
              });
          });
      });
  };

  // Call constructor
  return new FirefoxImplementation();
};