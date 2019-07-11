var xBrowserSync = xBrowserSync || {};
xBrowserSync.App = xBrowserSync.App || {};

/* ------------------------------------------------------------------------------------
 * Class name:  xBrowserSync.App.Controller 
 * Description: Main angular controller class for the app.
 * ------------------------------------------------------------------------------------ */

xBrowserSync.App.Controller = function ($scope, $q, $timeout, platform, globals, api, utility, bookmarks) {
  'use strict';

  var vm;


  /* ------------------------------------------------------------------------------------
   * Constructor
   * ------------------------------------------------------------------------------------ */

  var BrowserAction = function () {
    vm = this;
    vm.globals = globals;
    vm.platform = platform;
    vm.utility = utility;
    vm.scope = $scope;

    vm.working = false;

    vm.alert = {
      show: false,
      title: '',
      message: '',
      type: '',
      display: displayAlert
    };

    vm.animations = {
      enabled: true
    };

    vm.bookmark = {
      active: false,
      current: undefined,
      currentUrl: undefined,
      descriptionFieldOriginalHeight: undefined,
      displayUpdateForm: false,
      originalUrl: undefined,
      tagText: undefined,
      urlAsTitle: displayUrlAsBookmarkTitle
    };

    vm.events = {
      backupRestoreForm_Backup_Click: backupRestoreForm_Backup_Click,
      backupRestoreForm_DisplayRestoreForm_Click: backupRestoreForm_DisplayRestoreForm_Click,
      backupRestoreForm_DisplayRestoreConfirmation_Click: backupRestoreForm_DisplayRestoreConfirmation_Click,
      backupRestoreForm_Restore_Click: backupRestoreForm_Restore_Click,
      backupRestoreForm_SelectBackupFile_Click: backupRestoreForm_SelectBackupFile_Click,
      bookmarkForm_BookmarkDescription_Change: bookmarkForm_BookmarkDescription_Change,
      bookmarkForm_BookmarkTags_Change: bookmarkForm_BookmarkTags_Change,
      bookmarkForm_BookmarkTags_ClearAll_Click: bookmarkForm_BookmarkTags_ClearAll_Click,
      bookmarkForm_BookmarkTags_Lookahead_Click: bookmarkForm_BookmarkTags_Lookahead_Click,
      bookmarkForm_BookmarkTags_KeyDown: bookmarkForm_BookmarkTags_KeyDown,
      bookmarkForm_BookmarkUrl_Change: bookmarkForm_BookmarkUrl_Change,
      bookmarkForm_CreateBookmark_Click: bookmarkForm_CreateBookmark_Click,
      bookmarkForm_CreateTags_Click: bookmarkForm_CreateTags_Click,
      bookmarkForm_DeleteBookmark_Click: bookmarkForm_DeleteBookmark_Click,
      bookmarkForm_RemoveTag_Click: bookmarkForm_RemoveTag_Click,
      bookmarkForm_ShareBookmark_Click: platform.Bookmarks.Share,
      bookmarkForm_UpdateBookmark_Click: bookmarkForm_UpdateBookmark_Click,
      bookmarkPanel_Close_Click: bookmarkPanel_Close_Click,
      button_ReleaseNotes_Click: button_ReleaseNotes_Click,
      displayQrPanel: displayQrPanel,
      helpPanel_Close_Click: helpPanel_Close_Click,
      helpPanel_ShowHelp_Click: helpPanel_ShowHelp_Click,
      helpPanel1_Next_Click: helpPanel1_Next_Click,
      helpPanel2_Next_Click: helpPanel2_Next_Click,
      helpPanel2_Prev_Click: helpPanel2_Prev_Click,
      helpPanel3_Next_Click: helpPanel3_Next_Click,
      helpPanel3_Prev_Click: helpPanel3_Prev_Click,
      helpPanel4_Next_Click: helpPanel4_Next_Click,
      helpPanel4_Prev_Click: helpPanel4_Prev_Click,
      helpPanel5_Next_Click: helpPanel5_Next_Click,
      helpPanel5_Prev_Click: helpPanel5_Prev_Click,
      helpPanel6_Next_Click: helpPanel6_Next_Click,
      helpPanel6_Prev_Click: helpPanel6_Prev_Click,
      helpPanel7_Next_Click: helpPanel7_Next_Click,
      helpPanel7_Prev_Click: helpPanel7_Prev_Click,
      helpPanel8_Next_Click: helpPanel8_Next_Click,
      helpPanel8_Prev_Click: helpPanel8_Prev_Click,
      helpPanel9_Next_Click: helpPanel9_Next_Click,
      helpPanel9_Prev_Click: helpPanel9_Prev_Click,
      helpPanel10_Next_Click: helpPanel10_Next_Click,
      helpPanel10_Prev_Click: helpPanel10_Prev_Click,
      helpPanel11_Next_Click: helpPanel11_Next_Click,
      helpPanel11_Prev_Click: helpPanel11_Prev_Click,
      helpPanel12_Prev_Click: helpPanel12_Prev_Click,
      issuesPanel_ClearLog_Click: issuesPanel_ClearLog_Click,
      issuesPanel_DownloadLogFile_Click: issuesPanel_DownloadLogFile_Click,
      openUrl: openUrl,
      permissions_Revoke_Click: permissions_Revoke_Click,
      permissions_Request_Click: permissions_Request_Click,
      permissionsPanel_RequestPermissions_Click: permissionsPanel_RequestPermissions_Click,
      qrPanel_Close_Click: qrPanel_Close_Click,
      qrPanel_CopySyncId_Click: qrPanel_CopySyncId_Click,
      queueSync: queueSync,
      searchForm_Clear_Click: searchForm_Clear_Click,
      searchForm_DeleteBookmark_Click: searchForm_DeleteBookmark_Click,
      searchForm_ScanCode_Click: searchForm_ScanCode_Click,
      searchForm_SearchText_Autocomplete: searchForm_SearchText_Autocomplete,
      searchForm_SearchText_Change: searchForm_SearchText_Change,
      searchForm_SearchText_KeyDown: searchForm_SearchText_KeyDown,
      searchForm_SearchResult_KeyDown: searchForm_SearchResult_KeyDown,
      searchForm_SearchResults_Scroll: searchForm_SearchResults_Scroll,
      searchForm_SelectBookmark_Press: searchForm_SelectBookmark_Press,
      searchForm_ShareBookmark_Click: platform.Bookmarks.Share,
      searchForm_UpdateBookmark_Click: searchForm_UpdateBookmark_Click,
      syncPanel_SyncBookmarksToolbar_Click: syncPanel_SyncBookmarksToolbar_Click,
      syncPanel_SyncBookmarksToolbar_Cancel: syncPanel_SyncBookmarksToolbar_Cancel,
      syncPanel_SyncBookmarksToolbar_Confirm: syncPanel_SyncBookmarksToolbar_Confirm,
      syncForm_ConfirmPassword_Back_Click: syncForm_ConfirmPassword_Back_Click,
      syncForm_ConfirmPassword_Click: syncForm_ConfirmPassword_Click,
      syncForm_ConfirmSync_Click: startSyncing,
      syncForm_DisableSync_Click: syncForm_DisableSync_Click,
      syncForm_EnableSync_Click: syncForm_EnableSync_Click,
      syncForm_ExistingSync_Click: syncForm_ExistingSync_Click,
      syncForm_NewSync_Click: syncForm_NewSync_Click,
      syncForm_OtherSyncsDisabled_Click: syncForm_OtherSyncsDisabled_Click,
      syncForm_Submit_Click: syncForm_Submit_Click,
      syncForm_SyncId_Change: syncForm_SyncId_Change,
      syncForm_SyncUpdates_Click: syncForm_SyncUpdates_Click,
      syncForm_UpgradeSync_Click: syncForm_UpgradeSync_Click,
      syncPanel_DisplayDataUsage_Click: displayDataUsage,
      searchForm_ToggleBookmark_Click: searchForm_ToggleBookmark_Click,
      updatedPanel_Continue_Click: updatedPanel_Continue_Click,
      updateServiceUrlForm_Cancel_Click: updateServiceUrlForm_Cancel_Click,
      updateServiceUrlForm_Confirm_Click: updateServiceUrlForm_Confirm_Click,
      updateServiceUrlForm_Display_Click: updateServiceUrlForm_Display_Click,
      updateServiceUrlForm_NewServiceUrl_Change: updateServiceUrlForm_NewServiceUrl_Change,
      updateServiceUrlForm_Update_Click: updateServiceUrlForm_Update_Click
    };

    vm.help = {
      currentPanel: 0,
      displayPanel: displayHelpPanel
    };

    vm.platformName = undefined;

    vm.search = {
      batchResultsNum: 10,
      cancelGetBookmarksRequest: undefined,
      displayDefaultState: displayDefaultSearchState,
      execute: searchBookmarks,
      getLookaheadTimeout: undefined,
      getSearchLookaheadTimeout: undefined,
      getSearchResultsTimeout: undefined,
      lastWord: undefined,
      lookahead: undefined,
      query: undefined,
      results: undefined,
      resultsDisplayed: 10,
      selectedBookmark: undefined,
      scrollDisplayMoreEnabled: true
    };

    vm.settings = {
      backupCompletedMessage: undefined,
      backupFileName: undefined,
      dataToRestore: undefined,
      dataToRestoreIsValid: validateDataToRestore,
      displayCancelSyncConfirmation: false,
      displayQrPanel: false,
      displayRestoreConfirmation: false,
      displayRestoreForm: false,
      displaySyncBookmarksToolbarConfirmation: false,
      displayUpdateServiceUrlConfirmation: false,
      displayUpdateServiceUrlForm: false,
      downloadLogCompletedMessage: undefined,
      fileRestoreEnabled: false,
      getSearchLookaheadDelay: 50,
      getSearchResultsDelay: 250,
      logSize: undefined,
      readWebsiteDataPermissionsGranted: false,
      iCloudNotAvailable: false,
      restoreCompletedMessage: undefined,
      savingBackup: false,
      savingLog: false,
      service: {
        apiVersion: '',
        maxSyncSize: 0,
        newServiceUrl: '',
        status: undefined,
        statusMessage: '',
        url: undefined
      },
      syncBookmarksToolbar: true,
      syncDataSize: undefined,
      syncDataUsed: undefined,
      syncIdCopied: false,
      validatingServiceUrl: false
    };

    vm.sync = {
      asyncChannel: undefined,
      displayOtherSyncsWarning: false,
      displayNewSyncPanel: true,
      displayPasswordConfirmation: false,
      displaySyncConfirmation: false,
      displayUpgradeConfirmation: false,
      enabled: false,
      id: undefined,
      inProgress: false,
      nextAutoUpdate: undefined,
      password: '',
      passwordComplexity: {},
      passwordConfirmation: undefined,
      updatesAvailable: undefined,
      upgradeConfirmed: false
    };

    vm.view = {
      current: undefined,
      change: changeView,
      displayMainView: displayMainView,
      views: { login: 0, search: 1, bookmark: 2, settings: 3, help: 4, support: 5, updated: 6, permissions: 7 }
    };

    // Initialise the app
    init();
  };


  /* ------------------------------------------------------------------------------------
   * Private functions
   * ------------------------------------------------------------------------------------ */

  var backupRestoreForm_Backup_Click = function () {
    vm.settings.savingBackup = true;

    downloadBackupFile()
      .catch(displayAlertErrorHandler)
      .finally(function () {
        $timeout(function () {
          vm.settings.savingBackup = false;

          // Focus on done button
          if (!utility.IsMobilePlatform(vm.platformName)) {
            document.querySelector('.btn-done').focus();
          }
        });
      });
  };

  var backupRestoreForm_DisplayRestoreForm_Click = function () {
    // Display restore form
    vm.settings.backupFileName = null;
    vm.settings.restoreCompletedMessage = null;
    vm.settings.displayRestoreConfirmation = false;
    vm.settings.dataToRestore = '';
    vm.settings.displayRestoreForm = true;
    document.querySelector('#backupFile').value = null;
    vm.restoreForm.dataToRestore.$setValidity('InvalidData', true);

    // Focus in restore textarea
    $timeout(function () {
      document.querySelector('#restoreForm textarea').select();
    });
  };

  var backupRestoreForm_DisplayRestoreConfirmation_Click = function () {
    // Display restore confirmation 
    vm.settings.displayRestoreForm = false;
    vm.settings.displayRestoreConfirmation = true;

    // Focus on confirm button
    if (!utility.IsMobilePlatform(vm.platformName)) {
      $timeout(function () {
        document.querySelector('.btn-confirm-restore').focus();
      });
    }
  };

  var backupRestoreForm_Restore_Click = function () {
    if (!vm.settings.dataToRestore) {
      // Display alert
      vm.alert.display(
        platform.GetConstant(globals.Constants.Error_NoDataToRestore_Title),
        platform.GetConstant(globals.Constants.Error_NoDataToRestore_Message),
        'danger');

      return;
    }

    // Hide restore confirmation
    vm.settings.displayRestoreConfirmation = false;
    vm.settings.displayRestoreForm = true;

    // Start restore
    restoreData(JSON.parse(vm.settings.dataToRestore));
  };

  var backupRestoreForm_SelectBackupFile_Click = function () {
    platform.SelectFile();
  };

  var bookmarkForm_BookmarkDescription_Change = function () {
    // Limit the bookmark description to the max length
    $timeout(function () {
      vm.bookmark.current.description = utility.TrimToNearestWord(vm.bookmark.current.description, globals.Bookmarks.DescriptionMaxLength);
    });
  };

  var bookmarkForm_BookmarkTags_Change = function () {
    vm.bookmark.tagLookahead = null;

    if (!vm.bookmark.tagText || !vm.bookmark.tagText.trim()) {
      return;
    }

    // Get last word of tag text
    var matches = vm.bookmark.tagText.match(/[^,]+$/);
    var lastWord = matches ? matches[0].trimLeft() : undefined;

    // Display lookahead if word length exceeds minimum
    if (lastWord && lastWord.length > globals.LookaheadMinChars) {
      // Get tags lookahead
      bookmarks.GetLookahead(lastWord.toLowerCase(), null, null, true, vm.bookmark.current.tags)
        .then(function (results) {
          if (!results) {
            return;
          }

          var lookahead = results[0];
          var word = results[1];

          // Display lookahead
          if (lookahead && word.toLowerCase() === lastWord.toLowerCase()) {
            // Trim word from lookahead
            lookahead = lookahead ? lookahead.substring(word.length) : undefined;
            vm.bookmark.tagLookahead = lookahead.replace(/\s/g, '&nbsp;');
            vm.bookmark.tagTextMeasure = vm.bookmark.tagText.replace(/\s/g, '&nbsp;');
            vm.bookmark.tagLookahead = null;

            // Set position of lookahead element
            $timeout(function () {
              var lookaheadElement = document.querySelector('#bookmark-panel .lookahead-container .lookahead');
              var measureElement = document.querySelector('#bookmark-panel .lookahead-container .measure');
              lookaheadElement.style.left = (measureElement.offsetLeft + measureElement.offsetWidth) + 'px';
              vm.bookmark.tagLookahead = lookahead.replace(/\s/g, '&nbsp;');
            });
          }
        });
    }
  };

  var bookmarkForm_BookmarkTags_ClearAll_Click = function () {
    vm.bookmark.current.tags = [];
    vm.bookmarkForm.$setDirty();
    if (!utility.IsMobilePlatform(vm.platformName)) {
      document.querySelector('input[name="bookmarkTags"]').focus();
    }
  };

  var bookmarkForm_BookmarkTags_Lookahead_Click = function () {
    vm.bookmark.tagText += vm.bookmark.tagLookahead.replace(/&nbsp;/g, ' ');
    bookmarkForm_CreateTags_Click();
    if (!utility.IsMobilePlatform(vm.platformName)) {
      document.querySelector('input[name="bookmarkTags"]').focus();
    }
  };

  var bookmarkForm_BookmarkTags_KeyDown = function (event) {
    switch (true) {
      // If user pressed Enter
      case (event.keyCode === 13):
        // Add new tags
        event.preventDefault();
        bookmarkForm_CreateTags_Click();
        break;
      // If user pressed tab or right arrow key and lookahead present
      case ((event.keyCode === 9 || event.keyCode === 39) && !!vm.bookmark.tagLookahead):
        // Add lookahead to search query
        event.preventDefault();
        vm.bookmark.tagText += vm.bookmark.tagLookahead.replace(/&nbsp;/g, ' ');
        bookmarkForm_BookmarkTags_Change();
        if (!utility.IsMobilePlatform(vm.platformName)) {
          document.querySelector('input[name="bookmarkTags"]').focus();
        }
        break;
    }
  };

  var bookmarkForm_BookmarkUrl_Change = function () {
    // Reset form if field is invalid
    if (vm.bookmarkForm.bookmarkUrl.$invalid) {
      vm.bookmarkForm.bookmarkUrl.$setValidity('Exists', true);
    }
  };

  var bookmarkForm_CreateBookmark_Click = function () {
    // Add tags if tag text present
    if (vm.bookmark.tagText && vm.bookmark.tagText.length > 0) {
      bookmarkForm_CreateTags_Click();
    }

    // Clone current bookmark object
    var bookmarkToCreate = bookmarks.CleanBookmark(vm.bookmark.current);

    // Check for protocol
    if (!(new RegExp(globals.URL.ProtocolRegex)).test(bookmarkToCreate.url)) {
      bookmarkToCreate.url = 'http://' + bookmarkToCreate.url;
    }

    // Validate the new bookmark
    bookmarkForm_ValidateBookmark(bookmarkToCreate)
      .then(function (isValid) {
        if (!isValid) {
          // Bookmark URL exists, display validation error
          vm.bookmarkForm.bookmarkUrl.$setValidity('Exists', false);
          return;
        }

        // Display loading overlay
        platform.Interface.Loading.Show();

        // Sync changes
        return queueSync({
          type: globals.SyncType.Both,
          changeInfo: {
            type: globals.UpdateType.Create,
            bookmark: bookmarkToCreate
          }
        })
          .then(function () {
            // Set bookmark active status if current bookmark is current page
            return platform.GetCurrentUrl();
          })
          .then(function (currentUrl) {
            vm.bookmark.active = currentUrl && currentUrl.toUpperCase() === bookmarkToCreate.url.toUpperCase();
            return changeView(vm.view.views.search);
          })
          .then(function () {
            // Add new bookmark into search results on mobile apps
            if (utility.IsMobilePlatform(vm.platformName)) {
              var bookmarkToCreateClone = JSON.parse(JSON.stringify(bookmarkToCreate));
              bookmarkToCreateClone.id = bookmarks.GetNewBookmarkId(vm.search.results);
              bookmarkToCreateClone.class = 'added';
              $timeout(function () {
                // Add bookmark to results
                vm.search.results.unshift(bookmarkToCreateClone);

                $timeout(function () {
                  // Remove animation class
                  delete bookmarkToCreateClone.class;
                }, 500);
              }, 300);
            }
          });
      })
      .catch(displayAlertErrorHandler);
  };

  var bookmarkForm_CreateTags_Click = function () {
    // Clean and sort tags and add them to tag array
    var newTags = utility.GetTagArrayFromText(vm.bookmark.tagText);
    vm.bookmark.current.tags = _.sortBy(_.union(newTags, vm.bookmark.current.tags), function (tag) {
      return tag;
    });

    vm.bookmarkForm.$setDirty();
    vm.bookmark.tagText = '';
    vm.bookmark.tagLookahead = '';
    if (!utility.IsMobilePlatform(vm.platformName)) {
      document.querySelector('input[name="bookmarkTags"]').focus();
    }
  };

  var bookmarkForm_DeleteBookmark_Click = function () {
    var bookmarkToDelete = vm.bookmark.current;

    // Display loading overlay
    platform.Interface.Loading.Show();

    // Sync changes
    queueSync({
      type: globals.SyncType.Both,
      changeInfo: {
        type: globals.UpdateType.Delete,
        id: bookmarkToDelete.id
      }
    })
      .then(function () {
        // Set bookmark active status if current bookmark is current page
        return platform.GetCurrentUrl();
      })
      .then(function (currentUrl) {
        if (currentUrl && currentUrl.toUpperCase() === vm.bookmark.originalUrl.toUpperCase()) {
          vm.bookmark.active = false;
        }

        // Display the search panel
        return changeView(vm.view.views.search);
      })
      .then(function () {
        // Find and delete the deleted bookmark element in the search results on mobile apps
        if (utility.IsMobilePlatform(vm.platformName)) {
          if (vm.search.results && vm.search.results.length >= 0) {
            var deletedBookmarkIndex = _.findIndex(vm.search.results, function (result) {
              return result.id === bookmarkToDelete.id;
            });

            if (deletedBookmarkIndex >= 0) {
              vm.search.results[deletedBookmarkIndex].class = 'deleted';
              $timeout(function () {
                // Remove bookmark from results
                vm.search.results.splice(deletedBookmarkIndex, 1);
              }, 500);
            }
          }
        }
      })
      .catch(displayAlertErrorHandler);
  };

  var bookmarkForm_RemoveTag_Click = function (tag) {
    vm.bookmark.current.tags = _.without(vm.bookmark.current.tags, tag);
    vm.bookmarkForm.$setDirty();
    if (!utility.IsMobilePlatform(vm.platformName)) {
      document.querySelector('#bookmarkForm input[name="bookmarkTags"]').focus();
    }
  };

  var bookmarkForm_UpdateBookmark_Click = function () {
    // Add tags if tag text present
    if (vm.bookmark.tagText && vm.bookmark.tagText.length > 0) {
      bookmarkForm_CreateTags_Click();
    }

    // Clone current bookmark object
    var bookmarkToUpdate = bookmarks.CleanBookmark(vm.bookmark.current);

    // Check for protocol
    if (!(new RegExp(globals.URL.ProtocolRegex)).test(bookmarkToUpdate.url)) {
      bookmarkToUpdate.url = 'http://' + bookmarkToUpdate.url;
    }

    // Validate the new bookmark
    bookmarkForm_ValidateBookmark(bookmarkToUpdate, vm.bookmark.originalUrl)
      .then(function (isValid) {
        if (!isValid) {
          // Bookmark URL exists, display validation error
          vm.bookmarkForm.bookmarkUrl.$setValidity('Exists', false);
          return;
        }

        // Display loading overlay
        platform.Interface.Loading.Show();

        // Sync changes
        return queueSync({
          type: globals.SyncType.Both,
          changeInfo: {
            type: globals.UpdateType.Update,
            bookmark: bookmarkToUpdate
          }
        })
          .then(function () {
            // Set bookmark active status if current bookmark is current page
            return platform.GetCurrentUrl();
          })
          .then(function (currentUrl) {
            if (currentUrl && currentUrl.toUpperCase() === vm.bookmark.originalUrl.toUpperCase()) {
              vm.bookmark.active = currentUrl && currentUrl.toUpperCase() === bookmarkToUpdate.url.toUpperCase();
            }

            // Display the search panel
            return changeView(vm.view.views.search);
          })
          .then(function () {
            // Find and update the updated bookmark element in the search results on mobile apps
            if (utility.IsMobilePlatform(vm.platformName)) {
              if (vm.search.results && vm.search.results.length >= 0) {
                var updatedBookmarkIndex = _.findIndex(vm.search.results, function (result) {
                  return result.id === bookmarkToUpdate.id;
                });

                if (updatedBookmarkIndex >= 0) {
                  $timeout(function () {
                    vm.search.results[updatedBookmarkIndex] = bookmarkToUpdate;
                  }, 500);
                }
              }
            }
          });
      })
      .catch(displayAlertErrorHandler);
  };

  var bookmarkForm_ValidateBookmark = function (bookmarkToValidate, originalUrl) {
    // Skip validation if URL is unmodified
    if (originalUrl && bookmarkToValidate.url.toUpperCase() === originalUrl.toUpperCase()) {
      return $q.resolve(true);
    }

    // Check if bookmark url already exists
    return bookmarks.Search({
      url: bookmarkToValidate.url
    })
      .then(function (results) {
        // Filter search results for bookmarks wuth matching urls
        var duplicateBookmarks = results.filter(function (b) {
          return b.url.toUpperCase() === bookmarkToValidate.url.toUpperCase();
        });

        return duplicateBookmarks.length === 0;
      });
  };

  var bookmarkPanel_Close_Click = function () {
    vm.view.displayMainView();
  };

  var button_ReleaseNotes_Click = function () {
    var url = globals.ReleaseNotesUrlStem + utility.GetVersionTag();
    vm.events.openUrl(null, url);
    vm.view.displayMainView();
  };

  var changeView = function (view, viewData) {
    var initNewView;

    // Hide loading panel
    platform.Interface.Loading.Hide();

    // Disable animations
    vm.animations.enabled = false;

    // Initialise new view
    vm.view.current = view;
    switch (view) {
      case vm.view.views.bookmark:
        initNewView = init_bookmarkView(viewData);
        break;
      case vm.view.views.search:
        initNewView = init_searchView(viewData);
        break;
      case vm.view.views.settings:
        initNewView = init_settingsView(viewData);
        break;
      case vm.view.views.help:
      case vm.view.views.permissions:
      case vm.view.views.support:
      case vm.view.views.updated:
        initNewView = init_infoView(viewData);
        break;
      case vm.view.views.login:
      default:
        initNewView = init_loginView(viewData);
        break;
    }

    return initNewView
      .then(function () {
        // Attach events to new tab links
        $timeout(setNewTabLinks, 100);
        return view;
      })
      .finally(function () {
        // Re-enable animations
        vm.animations.enabled = true;
      });
  };

  var disableSync = function () {
    // Disable sync and event listeners
    return $q.all([
      bookmarks.DisableSync(),
      platform.EventListeners.Disable()
    ]);
  };

  var displayAlert = function (title, message, alertType) {
    $timeout(function () {
      vm.alert.title = title;
      vm.alert.message = message;
      vm.alert.type = alertType;
      vm.alert.show = true;
    });
  };

  var displayAlertErrorHandler = function (err) {
    var errMessage = utility.GetErrorMessageFromException(err);
    vm.alert.display(errMessage.title, errMessage.message, 'danger');
  };

  var displayDataUsage = function () {
    vm.settings.syncDataSize = null;
    vm.settings.syncDataUsed = null;

    return platform.LocalStorage.Get(globals.CacheKeys.SyncEnabled)
      .then(function (syncEnabled) {
        // Return if not synced
        if (!syncEnabled) {
          return;
        }

        // Get  bookmarks sync size and calculate sync data percentage used
        return bookmarks.SyncSize()
          .then(function (bookmarksSyncSize) {
            vm.settings.syncDataSize = bookmarksSyncSize / 1024;
            vm.settings.syncDataUsed = (vm.settings.syncDataSize / vm.settings.service.maxSyncSize) * 100;
          })
          .catch(displayAlertErrorHandler);
      });
  };

  var displayDefaultSearchState = function () {
    // Clear search and results
    vm.search.query = null;
    vm.search.queryMeasure = null;
    vm.search.lookahead = null;
    vm.search.results = null;

    // Focus on search box
    if (!utility.IsMobilePlatform(vm.platformName)) {
      $timeout(function () {
        document.querySelector('input[name=txtSearch]').focus();
      }, 100);
    }
  };

  var displayHelpPanel = function (panelToDisplay) {
    if (!panelToDisplay || panelToDisplay > vm.help.currentPanel) {
      var panels = document.querySelectorAll('.help-panel > div');

      for (var i = 0; i < panels.length; i++) {
        panels[i].classList.remove('reverse');
      }
    }
    else if (panelToDisplay < vm.help.currentPanel) {
      document.querySelector('#help-panel-' + vm.help.currentPanel).classList.add('reverse');
      document.querySelector('#help-panel-' + panelToDisplay).classList.add('reverse');
    }

    vm.help.currentPanel = (!panelToDisplay) ? 0 : panelToDisplay;
  };

  var displayMainView = function () {
    return platform.LocalStorage.Get([
      globals.CacheKeys.DisplayPermissions,
      globals.CacheKeys.DisplayUpdated,
      globals.CacheKeys.SyncEnabled
    ])
      .then(function (cachedData) {
        var displayPermissions = cachedData[globals.CacheKeys.DisplayPermissions];
        var displayUpdated = cachedData[globals.CacheKeys.DisplayUpdated];
        var syncEnabled = cachedData[globals.CacheKeys.SyncEnabled];

        switch (true) {
          case displayPermissions:
            return changeView(vm.view.views.permissions);
          case displayUpdated:
            return changeView(vm.view.views.updated);
          case syncEnabled:
            return changeView(vm.view.views.search);
          default:
            return changeView(vm.view.views.login);
        }
      });
  };

  var displayQrPanel = function (value) {
    if (!value) {
      return;
    }

    // Generate new QR code from the supplied value
    var qrcode = new QRCode({
      content: value,
      padding: 4,
      width: 200,
      height: 200,
      color: '#000000',
      background: '#ffffff',
      ecl: 'M'
    });

    // Add new qr code svg to qr container
    var svg = new DOMParser().parseFromString(qrcode.svg(), 'text/xml').firstElementChild;
    var qrContainer = document.getElementById('qr');
    while (qrContainer.firstElementChild) {
      qrContainer.removeChild(qrContainer.firstElementChild);
    }
    qrContainer.appendChild(svg);
    vm.settings.displayQrPanel = true;
  };

  var displayUrlAsBookmarkTitle = function (url) {
    return url.replace(/^https?:\/\//i, '');
  };

  var downloadBackupFile = function () {
    // Get data for backup
    return $q.all([
      bookmarks.Export(),
      platform.LocalStorage.Get([
        globals.CacheKeys.SyncEnabled,
        globals.CacheKeys.SyncId
      ]),
      utility.GetServiceUrl()
    ])
      .then(function (data) {
        var bookmarksData = data[0];
        var syncEnabled = data[1][globals.CacheKeys.SyncEnabled];
        var syncId = data[1][globals.CacheKeys.SyncId];
        var serviceUrl = data[2];
        var backupData = utility.CreateBackupData(bookmarksData, syncEnabled ? syncId : null, syncEnabled ? serviceUrl : null);

        // Beautify json and download data
        var beautifiedJson = JSON.stringify(backupData, null, 2);
        platform.DownloadFile(utility.GetBackupFileName(), beautifiedJson, 'backupLink');
        vm.settings.backupCompletedMessage = platform.GetConstant(globals.Constants.Settings_BackupRestore_BackupSuccess_Message);
      });
  };

  var downloadLogFile = function () {
    // Get cached message log
    return platform.LocalStorage.Get(globals.CacheKeys.TraceLog)
      .then(function (debugMessageLog) {
        // Trigger download
        platform.DownloadFile(utility.GetLogFileName(), debugMessageLog.join('\r\n'), 'downloadLogFileLink');

        // Display message
        vm.settings.downloadLogCompletedMessage = platform.GetConstant(globals.Constants.Settings_Issues_LogDownloaded_Message);
      });
  };

  var init = function () {
    // Platform-specific initation
    platform.Init(vm, $scope);

    // Check if sync enabled
    return platform.Sync.Current()
      .then(function (currentSync) {
        // Check if a sync is currently in progress
        if (currentSync) {
          utility.LogInfo('Waiting for sync: ' + currentSync.uniqueId);
          platform.Interface.Loading.Show();
          return platform.Sync.Await(currentSync.uniqueId)
            .then(function () {
              return vm.view.change(vm.view.views.search);
            });
        }

        // Set initial view
        return displayMainView();
      })
      // Check if current page is a bookmark
      .then(setBookmarkStatus)
      .catch(function (err) {
        displayMainView()
          .then(function () {
            // Display alert
            var errMessage = utility.GetErrorMessageFromException(err);
            vm.alert.display(errMessage.title, errMessage.message, 'danger');
          });
      })
      .finally(function () {
        // Reset network disconnected flag
        return platform.LocalStorage.Set(globals.CacheKeys.NetworkDisconnected, false);
      });
  };

  var init_bookmarkView = function (bookmarkToUpdate) {
    var loadMetadataDeferred = $q.defer();
    var timeout;

    vm.bookmark.tagText = null;
    vm.bookmark.tagTextMeasure = null;
    vm.bookmark.tagLookahead = null;
    vm.bookmark.displayUpdateForm = false;

    // If bookmark to update provided, set to current and return
    return $q(function (resolve, reject) {
      if (bookmarkToUpdate) {
        vm.bookmark.displayUpdateForm = true;
        return resolve(bookmarkToUpdate);
      }

      // Check if current url is a bookmark
      return bookmarks.IncludesCurrentPage()
        .then(function (bookmarkedCurrentPage) {
          if (bookmarkedCurrentPage) {
            // Display update bookmark form and return
            vm.bookmark.displayUpdateForm = true;
            return resolve(bookmarkedCurrentPage);
          }

          // Display loading on mobiles and get page metadata for current url
          timeout = utility.IsMobilePlatform(vm.platformName) ?
            platform.Interface.Loading.Show('retrievingMetadata', loadMetadataDeferred) : null;
          return platform.GetPageMetadata(loadMetadataDeferred)
            .then(function (metadata) {
              // Display add bookmark form
              vm.bookmark.displayUpdateForm = false;

              // Set current bookmark properties
              var bookmark = new bookmarks.XBookmark(
                null,
                metadata.url,
                null,
                null);

              if (metadata) {
                // Set form properties to url metadata
                bookmark.title = metadata.title;
                bookmark.description = utility.TrimToNearestWord(metadata.description, globals.Bookmarks.DescriptionMaxLength);
                bookmark.tags = utility.GetTagArrayFromText(metadata.tags);
              }

              resolve(bookmark);
            });
        });
    })
      .then(function (bookmark) {
        // Remove search score and set current bookmark to result
        delete bookmark.score;

        // Save url to compare for changes
        vm.bookmark.current = bookmark;
        vm.bookmark.originalUrl = bookmark.url;

        $timeout(function () {
          // Don't focus on title field for mobile apps unless not sharing a bookmark
          if ((!utility.IsMobilePlatform(vm.platformName)) ||
            vm.bookmark.current.url === 'http://') {
            document.querySelector('input[name="bookmarkTitle"]').focus();
          }
        }, 100);
      })
      .catch(function (err) {
        // Set bookmark url
        if (err && err.url) {
          var bookmark = new bookmarks.XBookmark(
            '',
            err.url);
          vm.bookmark.current = bookmark;
        }

        // Display alert
        var errMessage = utility.GetErrorMessageFromException(err);
        vm.alert.display(errMessage.title, errMessage.message, 'danger');
      })
      .finally(function () {
        platform.Interface.Loading.Hide('retrievingMetadata', timeout);
      });
  };

  var init_infoView = function () {
    $timeout(function () {
      // Focus on button
      if (!utility.IsMobilePlatform(vm.platformName)) {
        var element = document.querySelector('.focused');
        if (element) {
          element.focus();
        }
      }
    }, 150);

    return $q.resolve();
  };

  var init_loginView = function () {
    vm.sync.displayOtherSyncsWarning = false;
    vm.sync.displayPasswordConfirmation = false;
    vm.sync.displaySyncConfirmation = false;
    vm.sync.displayUpgradeConfirmation = false;
    vm.sync.password = '';
    vm.sync.passwordComplexity = {};
    vm.sync.passwordConfirmation = null;
    vm.sync.upgradeConfirmed = false;
    if (vm.syncForm) {
      vm.syncForm.$setPristine();
      vm.syncForm.$setUntouched();
    }

    // Get cached sync data
    return platform.LocalStorage.Get([
      globals.CacheKeys.DisplayOtherSyncsWarning,
      globals.CacheKeys.SyncEnabled,
      globals.CacheKeys.SyncId
    ])
      .then(function (cachedData) {
        var displayOtherSyncsWarning = cachedData[globals.CacheKeys.DisplayOtherSyncsWarning];
        var syncEnabled = cachedData[globals.CacheKeys.SyncEnabled];
        var syncId = cachedData[globals.CacheKeys.SyncId];

        vm.sync.enabled = !!syncEnabled;
        vm.sync.id = syncId;

        // If not on a mobile platform, display new sync panel depending on if ID is set
        vm.sync.displayNewSyncPanel = utility.IsMobilePlatform(vm.platformName) ? false : !syncId;

        // If not synced before, display warning to disable other sync tools
        if (displayOtherSyncsWarning == null || displayOtherSyncsWarning === true) {
          vm.sync.displayOtherSyncsWarning = true;

          // Focus on first button
          $timeout(function () {
            if (!utility.IsMobilePlatform(vm.platformName)) {
              document.querySelector('.otherSyncsWarning .buttons > button').focus();
            }
          }, 150);
        }
        else {
          if (!utility.IsMobilePlatform(vm.platformName)) {
            $timeout(function () {
              // Focus on password field
              document.querySelector('.active-login-form  input[name="txtPassword"]').focus();
            }, 100);
          }
        }
      });
  };

  var init_searchView = function () {
    vm.search.lookahead = null;
    vm.search.selectedBookmark = null;
    vm.search.query = null;
    vm.search.queryMeasure = null;

    // Clear search results for non-mobile platforms, otherwise refresh search
    if (!utility.IsMobilePlatform(vm.platformName)) {
      vm.search.results = null;
    }
    else {
      $timeout(vm.search.execute);
    }

    // Focus on search box
    if (!utility.IsMobilePlatform(vm.platformName)) {
      $timeout(function () {
        document.querySelector('input[name=txtSearch]').focus();
      }, 200);
    }

    return $q.resolve();
  };

  var init_settingsView = function () {
    vm.settings.displayCancelSyncConfirmation = false;
    vm.settings.displayQrPanel = false;
    vm.settings.displayRestoreConfirmation = false;
    vm.settings.displayRestoreForm = false;
    vm.settings.displaySyncBookmarksToolbarConfirmation = false;
    vm.settings.displayUpdateServiceUrlConfirmation = false;
    vm.settings.displayUpdateServiceUrlForm = false;
    document.querySelector('#backupFile').value = null;
    vm.settings.backupFileName = null;
    vm.settings.backupCompletedMessage = null;
    vm.settings.downloadLogCompletedMessage = null;
    vm.settings.readWebsiteDataPermissionsGranted = false;
    vm.settings.restoreCompletedMessage = null;
    vm.settings.dataToRestore = '';
    vm.settings.savingBackup = false;
    vm.settings.savingLog = false;
    vm.settings.service.status = null;
    vm.settings.validatingServiceUrl = false;
    vm.sync.updatesAvailable = undefined;
    vm.sync.nextAutoUpdate = undefined;

    // Get current service url and sync bookmarks toolbar setting from cache
    return $q.all([
      bookmarks.GetSyncBookmarksToolbar(),
      platform.LocalStorage.Get([
        globals.CacheKeys.TraceLog,
        globals.CacheKeys.SyncEnabled,
        globals.CacheKeys.SyncId
      ]),
      utility.GetServiceUrl(),
      platform.Permissions.Check()
    ])
      .then(function (data) {
        var syncBookmarksToolbar = data[0];
        var traceLog = data[1][globals.CacheKeys.TraceLog];
        var syncEnabled = data[1][globals.CacheKeys.SyncEnabled];
        var syncId = data[1][globals.CacheKeys.SyncId];
        var serviceUrl = data[2];
        var readWebsiteDataPermissionsGranted = data[3];

        vm.settings.service.url = serviceUrl;
        vm.settings.service.newServiceUrl = serviceUrl;
        vm.settings.syncBookmarksToolbar = syncBookmarksToolbar;
        vm.sync.enabled = syncEnabled;
        vm.sync.id = syncId;
        vm.settings.readWebsiteDataPermissionsGranted = readWebsiteDataPermissionsGranted;
        vm.settings.logSize = (new TextEncoder().encode(traceLog)).length;

        // Check for available sync updates on non-mobile platforms
        if (syncEnabled && !utility.IsMobilePlatform(vm.platformName)) {
          $q.all([
            bookmarks.CheckForUpdates(),
            platform.AutomaticUpdates.NextUpdate()
          ])
            .then(function (data) {
              if (data[0]) {
                vm.sync.updatesAvailable = true;
                vm.sync.nextAutoUpdate = data[1];
              }
              else {
                vm.sync.updatesAvailable = false;
              }
            })
            .catch(function (err) {
              // Don't display alert if sync failed due to network connection
              if (err.code !== globals.ErrorCodes.HttpRequestFailed) {
                var errMessage = utility.GetErrorMessageFromException(err);
                displayAlert(errMessage.title, errMessage.message);
              }
            });
        }

        // Update service status and display info
        return updateServicePanel();
      });
  };

  var issuesPanel_ClearLog_Click = function () {
    // Clear trace log
    return platform.LocalStorage.Set(globals.CacheKeys.TraceLog)
      .then(function () {
        $timeout(function () {
          vm.settings.logSize = 0;
        });
      });
  };

  var issuesPanel_DownloadLogFile_Click = function () {
    vm.settings.savingLog = true;

    downloadLogFile()
      .catch(displayAlertErrorHandler)
      .finally(function () {
        $timeout(function () {
          vm.settings.savingLog = false;

          // Focus on done button
          if (!utility.IsMobilePlatform(vm.platformName)) {
            document.querySelector('.btn-done').focus();
          }
        });
      });
  };

  var helpPanel_Close_Click = function () {
    vm.view.displayMainView();
  };

  var helpPanel_ShowHelp_Click = function () {
    vm.help.currentPanel = 1;
    vm.view.change(vm.view.views.help);
  };

  var helpPanel1_Next_Click = function () {
    vm.help.displayPanel(2);
  };

  var helpPanel2_Next_Click = function () {
    vm.help.displayPanel(3);
  };

  var helpPanel2_Prev_Click = function () {
    vm.help.displayPanel(1);
  };

  var helpPanel3_Next_Click = function () {
    vm.help.displayPanel(4);
  };

  var helpPanel3_Prev_Click = function () {
    vm.help.displayPanel(2);
  };

  var helpPanel4_Next_Click = function () {
    vm.help.displayPanel(5);
  };

  var helpPanel4_Prev_Click = function () {
    vm.help.displayPanel(3);
  };

  var helpPanel5_Next_Click = function () {
    vm.help.displayPanel(6);
  };

  var helpPanel5_Prev_Click = function () {
    vm.help.displayPanel(4);
  };

  var helpPanel6_Next_Click = function () {
    vm.help.displayPanel(7);
  };

  var helpPanel6_Prev_Click = function () {
    vm.help.displayPanel(5);
  };

  var helpPanel7_Next_Click = function () {
    vm.help.displayPanel(8);
  };

  var helpPanel7_Prev_Click = function () {
    vm.help.displayPanel(6);
  };

  var helpPanel8_Next_Click = function () {
    vm.help.displayPanel(9);
  };

  var helpPanel8_Prev_Click = function () {
    vm.help.displayPanel(7);
  };

  var helpPanel9_Next_Click = function () {
    vm.help.displayPanel(10);
  };

  var helpPanel9_Prev_Click = function () {
    vm.help.displayPanel(8);
  };

  var helpPanel10_Next_Click = function () {
    vm.help.displayPanel(11);
  };

  var helpPanel10_Prev_Click = function () {
    vm.help.displayPanel(9);
  };

  var helpPanel11_Next_Click = function () {
    vm.help.displayPanel(12);
  };

  var helpPanel11_Prev_Click = function () {
    vm.help.displayPanel(10);
  };

  var helpPanel12_Prev_Click = function () {
    vm.help.displayPanel(11);
  };

  var openUrl = function (event, url) {
    if (event && event.preventDefault) {
      event.preventDefault();
    }

    if (url) {
      platform.OpenUrl(url);
    }
    else {
      platform.OpenUrl(event.currentTarget.href);
    }

    return false;
  };

  var permissions_Revoke_Click = function () {
    platform.Permissions.Remove()
      .then(function () {
        vm.settings.readWebsiteDataPermissionsGranted = false;
      })
      .catch(displayAlertErrorHandler);
  };

  var permissions_Request_Click = function () {
    platform.Permissions.Request()
      .then(function (granted) {
        vm.settings.readWebsiteDataPermissionsGranted = granted;
      })
      .catch(displayAlertErrorHandler);
  };

  var permissionsPanel_RequestPermissions_Click = function () {
    $q.all([
      platform.Permissions.Request(),
      platform.LocalStorage.Set(globals.CacheKeys.DisplayPermissions, false)
    ])
      .finally(vm.view.displayMainView);
  };

  var qrPanel_Close_Click = function () {
    vm.settings.displayQrPanel = false;
    $timeout(function () {
      vm.settings.syncIdCopied = false;
    }, 200);
  };

  var qrPanel_CopySyncId_Click = function () {
    navigator.clipboard.writeText(vm.sync.id)
      .then(function () {
        $timeout(function () {
          vm.settings.syncIdCopied = true;
        });
      })
      .catch(function (err) {
        utility.LogError(err, 'app.qrPanel_CopySyncId_Click');

        // Display alert
        var errMessage = utility.GetErrorMessageFromException(err);
        vm.alert.display(errMessage.title, errMessage.message, 'danger');
      });
  };

  var queueSync = function (syncData, command) {
    command = command || globals.Commands.SyncBookmarks;
    return platform.Sync.Execute(syncData, command)
      .then(function (syncedBookmarks) {
        if (command == globals.Commands.SyncBookmarks ||
          command == globals.Commands.RestoreBookmarks) {
          return bookmarks.UpdateCache(syncedBookmarks);
        }
      })
      .finally(function () {
        platform.Interface.Loading.Hide();
      });
  };

  var restoreBookmarksSuccess = function (restoredBookmarks) {
    // Update current bookmark status
    return setBookmarkStatus()
      // Refresh data usage
      .then(displayDataUsage)
      .then(function () {
        vm.settings.displayRestoreForm = false;
        vm.settings.dataToRestore = '';
        vm.settings.restoreCompletedMessage = platform.GetConstant(globals.Constants.Settings_BackupRestore_RestoreSuccess_Message);

        if (!utility.IsMobilePlatform(vm.platformName)) {
          $timeout(function () {
            document.querySelector('.btn-done').focus();
          });
        }
        else {
          // Refresh search results
          vm.search.query = null;
          vm.search.queryMeasure = null;
          vm.search.lookahead = null;
          return vm.search.execute();
        }
      });
  };

  var restoreData = function (backupData) {
    var bookmarksToRestore, serviceUrl, syncId, syncEnabled;

    utility.LogInfo('Restoring data');

    try {
      if (backupData.xbrowsersync) {
        // Get data to restore from v1.5.0 backup
        var data = backupData.xbrowsersync.data;
        var sync = backupData.xbrowsersync.sync;
        bookmarksToRestore = data ? data.bookmarks : null;
        serviceUrl = sync ? sync.url : null;
        syncId = sync ? sync.id : null;
      }
      else if (backupData.xBrowserSync) {
        // Get data to restore from backups prior to v1.5.0
        bookmarksToRestore = backupData.xBrowserSync.bookmarks;
        syncId = backupData.xBrowserSync.id;
      }
      else {
        // Data to restore invalid, throw error
        var error = new Error('FailedRestoreData');
        error.code = globals.ErrorCodes.FailedRestoreData;
        throw error;
      }
    }
    catch (err) {
      utility.LogError(err, 'app.restoreData');
      displayAlertErrorHandler(err);
      return;
    }

    // Display loading overlay
    platform.Interface.Loading.Show();

    platform.LocalStorage.Get(globals.CacheKeys.SyncEnabled)
      .then(function (cachedSyncEnabled) {
        syncEnabled = cachedSyncEnabled;

        // If synced check service status before starting restore, otherwise restore sync settings
        return syncEnabled ? api.CheckServiceStatus() : $q(function (resolve, reject) {
          // Clear current password and set sync ID if supplied
          vm.sync.password = '';
          vm.sync.passwordComplexity = {};
          $q.all([
            platform.LocalStorage.Set(globals.CacheKeys.Password),
            syncId ? platform.LocalStorage.Set(globals.CacheKeys.SyncId, syncId) : $q.resolve(),
            serviceUrl ? platform.LocalStorage.Set(globals.CacheKeys.ServiceUrl, serviceUrl) : $q.resolve()
          ])
            .then(function () {
              // Update the service URL if supplied
              if (serviceUrl) {
                vm.settings.service.url = serviceUrl;
                updateServicePanel();
              }
            })
            .then(resolve)
            .catch(reject);
        });
      })
      .then(function () {
        // Return if no bookmarks found
        if (!bookmarksToRestore) {
          return;
        }

        // Start restore
        return queueSync({
          bookmarks: bookmarksToRestore,
          type: !syncEnabled ? globals.SyncType.Pull : globals.SyncType.Both
        }, globals.Commands.RestoreBookmarks)
          .then(restoreBookmarksSuccess);
      })
      .catch(displayAlertErrorHandler)
      .finally(platform.Interface.Loading.Hide);
  };

  var searchBookmarks = function () {
    var queryData = {
      url: undefined,
      keywords: []
    };
    var urlRegex = new RegExp('^' + globals.URL.Regex + '$', 'i');

    if (vm.search.query) {
      // Iterate query words to form query data object
      var queryWords = vm.search.query.split(/[\s,]+/);
      _.each(queryWords, function (queryWord) {
        // Add query word as url if query is in url format, otherwise add to keywords
        if (!queryData.url && urlRegex.test(queryWord.trim())) {
          queryData.url = queryWord.trim();
        }
        else {
          var keyword = queryWord.trim().replace("'", '').replace(/\W$/, '').toLowerCase();
          if (keyword) {
            queryData.keywords.push(queryWord.trim());
          }
        }
      });
    }

    return bookmarks.Search(queryData)
      .then(function (results) {
        vm.search.scrollDisplayMoreEnabled = false;
        vm.search.resultsDisplayed = vm.search.batchResultsNum;
        vm.search.results = results;

        // Scroll to top of search results
        $timeout(function () {
          document.querySelector('.search-results-panel').scrollTop = 0;
          vm.search.scrollDisplayMoreEnabled = true;
        });
      })
      .catch(function (err) {
        vm.search.results = null;

        // Display alert
        var errMessage = utility.GetErrorMessageFromException(err);
        vm.alert.display(errMessage.title, errMessage.message, 'danger');
      });
  };

  var searchForm_Clear_Click = function () {
    vm.search.displayDefaultState();
  };

  var searchForm_DeleteBookmark_Click = function (event, bookmark) {
    // Delete the bookmark
    queueSync({
      type: globals.SyncType.Both,
      changeInfo: {
        type: globals.UpdateType.Delete,
        id: bookmark.id
      }
    })
      .catch(displayAlertErrorHandler);

    // Find and remove the deleted bookmark element in the search results
    if (vm.search.results && vm.search.results.length > 0) {
      var deletedBookmarkIndex = _.findIndex(vm.search.results, function (result) { return result.id === bookmark.id; });
      if (deletedBookmarkIndex >= 0) {
        vm.search.selectedBookmark = null;
        $timeout(function () {
          vm.search.results[deletedBookmarkIndex].class = 'deleted';
          $timeout(function () {
            // Remove bookmark from results
            vm.search.results.splice(deletedBookmarkIndex, 1);
          }, 500);
        });
      }
    }
  };

  var searchForm_ScanCode_Click = function () {
    platform.ScanID();
  };

  var searchForm_SearchText_Autocomplete = function () {
    vm.search.query = vm.search.query + '' + vm.search.lookahead;
    searchForm_SearchText_Change();
    if (!utility.IsMobilePlatform(vm.platformName)) {
      $timeout(function () {
        document.querySelector('input[name=txtSearch]').focus();
      });
    }
  };

  var searchForm_SearchText_Change = function () {
    vm.alert.show = false;

    // Clear timeouts
    if (vm.search.getSearchLookaheadTimeout) {
      $timeout.cancel(vm.search.getSearchLookaheadTimeout);
      vm.search.getSearchLookaheadTimeout = null;
    }

    if (vm.search.getSearchResultsTimeout) {
      $timeout.cancel(vm.search.getSearchResultsTimeout);
      vm.search.getSearchResultsTimeout = null;
    }

    // No query, clear results
    if (!vm.search.query.trim()) {
      vm.search.displayDefaultState();
      return;
    }

    // Get last word of search query
    var queryWords = vm.search.query.split(/[\s]+/);
    var lastWord = _.last(queryWords);
    var getLookahead;

    // Display lookahead if word length exceed minimum
    if (lastWord && lastWord.length > globals.LookaheadMinChars) {
      // Get lookahead after delay
      vm.search.getSearchLookaheadTimeout = $timeout(function () {
        // Enable searching animation if bookmark cache is empty
        platform.LocalStorage.Get(globals.CacheKeys.Bookmarks)
          .then(function (cachedBookmarks) {
            if (!cachedBookmarks) {
              searchForm_ToggleSearchingAnimation(true);
            }
          });

        // Cancel any exist http request to get bookmarks and refresh deferred
        if (vm.search.cancelGetBookmarksRequest &&
          vm.search.cancelGetBookmarksRequest.promise.$$state.status === 0) {
          vm.search.cancelGetBookmarksRequest.resolve();
        }
        vm.search.cancelGetBookmarksRequest = $q.defer();

        getLookahead = bookmarks.GetLookahead(lastWord.toLowerCase(), vm.search.results, vm.search.cancelGetBookmarksRequest.promise)
          .then(function (results) {
            if (!results) {
              vm.search.lookahead = null;
              return;
            }

            var lookahead = results[0];
            var word = results[1];

            if (lookahead && word.toLowerCase() === lastWord.toLowerCase()) {
              // Trim word from lookahead
              lookahead = lookahead ? lookahead.substring(word.length) : undefined;
              vm.search.queryMeasure = vm.search.query.replace(/\s/g, '&nbsp;');
              vm.search.lookahead = null;

              // Set position of lookahead element
              $timeout(function () {
                var lookaheadElement = document.querySelector('#search-panel .lookahead-container .lookahead');
                var measureElement = document.querySelector('#search-panel .lookahead-container .measure');
                lookaheadElement.style.left = (measureElement.offsetLeft + measureElement.getBoundingClientRect().width) + 'px';
                vm.search.lookahead = lookahead.replace(/\s/g, '&nbsp;');
              });
            }

            vm.search.cancelGetBookmarksRequest = null;
          })
          .catch(displayAlertErrorHandler)
          .finally(function () {
            searchForm_ToggleSearchingAnimation(false);
          });
      }, vm.settings.getSearchLookaheadDelay);

      // Execute search after timeout and once lookahead request is finished
      vm.search.getSearchResultsTimeout = $timeout(function () {
        getLookahead.then(searchBookmarks);
      }, vm.settings.getSearchResultsDelay);
    }
    else {
      vm.search.lookahead = null;
    }
  };

  var searchForm_SearchText_KeyDown = function (event) {
    // If user pressed enter and search text present
    if (event.keyCode === 13) {
      document.activeElement.blur();

      if (vm.search.getSearchResultsTimeout) {
        $timeout.cancel(vm.search.getSearchResultsTimeout);
        vm.search.getSearchResultsTimeout = null;
      }

      // Get search results
      searchBookmarks();

      // Return focus to search box
      $timeout(function () {
        document.querySelector('input[name=txtSearch]').focus();
      });

      return;
    }

    // If user pressed down arrow and search results present
    if (event.keyCode === 40 && vm.search.results && vm.search.results.length > 0) {
      // Focus on first search result
      event.preventDefault();
      document.querySelector('.search-results-panel .list-group').firstElementChild.children[2].focus();
      return;
    }

    // If user pressed tab or right arrow key and lookahead present
    if ((event.keyCode === 9 || event.keyCode === 39) && vm.search.lookahead) {
      // Add lookahead to search query
      event.preventDefault();
      searchForm_SearchText_Autocomplete();
      return;
    }
  };

  var searchForm_SearchResult_KeyDown = function (event) {
    var currentIndex, newIndex;

    switch (true) {
      // Up arrow
      case (event.keyCode === 38):
        event.preventDefault();

        if (event.target.parentElement.previousElementSibling) {
          // Focus on previous result
          event.target.parentElement.previousElementSibling.children[2].focus();
        }
        else {
          // Focus on search box
          document.querySelector('input[name=txtSearch]').focus();
        }

        break;
      // Down arrow
      case (event.keyCode === 40):
        event.preventDefault();

        if (event.target.parentElement.nextElementSibling) {
          // Focus on next result
          event.target.parentElement.nextElementSibling.children[2].focus();
        }

        break;
      // Page up
      case (event.keyCode === 33):
        event.preventDefault();

        // Focus on result 6 down from current
        currentIndex = _.indexOf(event.target.parentElement.parentElement.children, event.target.parentElement);
        newIndex = currentIndex - 6;

        if (newIndex < 0) {
          event.target.parentElement.parentElement.firstElementChild.children[2].focus();
        }
        else {
          event.target.parentElement.parentElement.children[newIndex].children[2].focus();
        }

        break;
      // Page down
      case (event.keyCode === 34):
        event.preventDefault();

        // Focus on result 6 down from current
        currentIndex = _.indexOf(event.target.parentElement.parentElement.children, event.target.parentElement);
        newIndex = currentIndex + 6;

        if (event.target.parentElement.parentElement.children.length < newIndex) {
          event.target.parentElement.parentElement.lastElementChild.children[2].focus();
        }
        else {
          event.target.parentElement.parentElement.children[newIndex].children[2].focus();
        }

        break;
      // Home
      case (event.keyCode === 36):
        event.preventDefault();

        // Focus on first result
        event.target.parentElement.parentElement.firstElementChild.children[2].focus();

        break;
      // End
      case (event.keyCode === 35):
        event.preventDefault();

        // Focus on last result
        event.target.parentElement.parentElement.lastElementChild.children[2].focus();

        break;
      // Backspace
      case (event.keyCode === 8):
      // Space
      case (event.keyCode === 32):
      // Numbers and letters
      case (event.keyCode > 47 && event.keyCode < 112):
        // Focus on search box
        document.querySelector('input[name=txtSearch]').focus();
        break;
    }
  };

  var searchForm_SearchResults_Scroll = function () {
    if (vm.search.results && vm.search.results.length > 0 && vm.search.scrollDisplayMoreEnabled) {
      // Display next batch of results
      vm.search.resultsDisplayed += vm.search.batchResultsNum;
      vm.search.results = vm.search.results;
    }
  };

  var searchForm_SelectBookmark_Press = function (bookmarkId, event) {
    event.preventDefault();

    // Display menu for selected bookmark
    vm.search.selectedBookmark = bookmarkId;

  };

  var searchForm_ToggleBookmark_Click = function () {
    // Display bookmark panel
    changeView(vm.view.views.bookmark);
  };

  var searchForm_ToggleSearchingAnimation = function (active) {
    var searchIcon = document.querySelector('.search-form i');

    if (active) {
      searchIcon.classList.add("animate-flash");
    }
    else {
      searchIcon.classList.remove("animate-flash");
    }
  };

  var searchForm_UpdateBookmark_Click = function (bookmarkToUpdate) {
    // On mobiles, display bookmark panel with slight delay to avoid focussing on description field
    if (utility.IsMobilePlatform(vm.platformName)) {
      $timeout(function () {
        changeView(vm.view.views.bookmark, bookmarkToUpdate);
      }, 500);
    }
    else {
      changeView(vm.view.views.bookmark, bookmarkToUpdate);
    }
  };

  var setBookmarkStatus = function () {
    return platform.LocalStorage.Get(globals.CacheKeys.SyncEnabled)
      .then(function (syncEnabled) {
        if (!syncEnabled) {
          return;
        }

        // If current page is a bookmark, actvate bookmark icon
        return bookmarks.IncludesCurrentPage()
          .then(function (result) {
            vm.bookmark.active = !!result;
          })
          .catch(displayAlertErrorHandler);
      });
  };

  var setNewTabLinks = function () {
    var links = document.querySelectorAll('a.new-tab');
    var onClickEvent = function () {
      return openUrl({ currentTarget: { href: this.href } });
    };

    for (var i = 0; i < links.length; i++) {
      var link = links[i];
      link.onclick = onClickEvent;
    }
  };

  var setServiceInformation = function (serviceInfo) {
    // Linkify service message
    var message = serviceInfo.message;
    if (message) {
      _.each(message.match(new RegExp(globals.URL.Regex, 'g')), function (match) {
        var link = document.createElement('a');
        link.innerText = match;
        link.href = (new RegExp(globals.URL.ProtocolRegex)).test(match) ? match : 'http://' + match;
        link.className = 'new-tab';
        message = message.replace(match, link.outerHTML);
      });
      $timeout(setNewTabLinks);
    }

    vm.settings.service.status = serviceInfo.status;
    vm.settings.service.statusMessage = message;
    vm.settings.service.maxSyncSize = serviceInfo.maxSyncSize / 1024;
    vm.settings.service.apiVersion = serviceInfo.version;
  };

  var startSyncing = function () {
    var syncInfoMessage, syncType;

    // Display loading panel
    vm.sync.displaySyncConfirmation = false;
    vm.sync.displayOtherSyncsWarning = false;
    vm.sync.displayUpgradeConfirmation = false;
    var loadingTimeout = platform.Interface.Loading.Show();

    // Check service status
    api.CheckServiceStatus()
      .then(function () {
        // Clear the current cached password
        return platform.LocalStorage.Set(globals.CacheKeys.Password);
      })
      .then(function () {
        // If a sync ID has not been supplied, get a new one
        if (!vm.sync.id) {
          // Set sync type for create new sync
          syncType = globals.SyncType.Push;

          // Get new sync ID
          return api.CreateNewSync()
            .then(function (newSync) {
              syncInfoMessage = 'New sync id created: ' + newSync.id;

              // Add sync data to cache and return
              return $q.all([
                platform.LocalStorage.Set(globals.CacheKeys.LastUpdated, newSync.lastUpdated),
                platform.LocalStorage.Set(globals.CacheKeys.SyncId, newSync.id),
                platform.LocalStorage.Set(globals.CacheKeys.SyncVersion, newSync.version)
              ])
                .then(function () {
                  return newSync.id;
                });
            });
        }
        else {
          syncInfoMessage = 'Synced to existing id: ' + vm.sync.id;

          // Set sync type for retrieve existing sync
          syncType = globals.SyncType.Pull;

          // Retrieve sync version for existing id
          return api.GetBookmarksVersion(vm.sync.id)
            .then(function (response) {
              // If no sync version is set, confirm upgrade
              if (!response.version) {
                if (vm.sync.upgradeConfirmed) {
                  syncType = globals.SyncType.Upgrade;
                }
                else {
                  vm.sync.displayUpgradeConfirmation = true;
                  return;
                }
              }

              // Add sync version to cache and return current sync ID
              return $q.all([
                platform.LocalStorage.Set(globals.CacheKeys.SyncId, vm.sync.id),
                platform.LocalStorage.Set(globals.CacheKeys.SyncVersion, response.version)
              ])
                .then(function () {
                  return vm.sync.id;
                });
            });
        }
      })
      .then(function (syncId) {
        if (!syncId) {
          return;
        }

        // Generate a password hash, cache it then queue the sync
        return utility.GetPasswordHash(vm.sync.password, syncId)
          .then(function (passwordHash) {
            platform.LocalStorage.Set(globals.CacheKeys.Password, passwordHash);
            return queueSync({ type: syncType });
          })
          .then(function () {
            utility.LogInfo(syncInfoMessage);
            return syncBookmarksSuccess(loadingTimeout);
          })
          .catch(syncBookmarksFailed);
      })
      .catch(function (err) {
        // Disable upgrade confirmed flag
        vm.sync.upgradeConfirmed = false;

        // Display alert
        var errMessage = utility.GetErrorMessageFromException(err);
        vm.alert.display(errMessage.title, errMessage.message, 'danger');
      })
      .finally(function () {
        // Hide loading panel
        platform.Interface.Loading.Hide(null, loadingTimeout);
      });
  };

  var syncBookmarksFailed = function (err) {
    var errMessage;

    // Disable upgrade confirmed flag
    vm.sync.upgradeConfirmed = false;

    // Clear cached data
    platform.LocalStorage.Set([
      globals.CacheKeys.Bookmarks,
      globals.CacheKeys.Password,
      globals.CacheKeys.SyncVersion
    ]);

    // If ID was removed disable sync and display login panel
    if (err && err.code === globals.ErrorCodes.SyncRemoved) {
      return changeView(vm.view.views.login)
        .finally(function () {
          errMessage = utility.GetErrorMessageFromException(err);
          vm.alert.display(errMessage.title, errMessage.message, 'danger');
        });
    }
    else {
      // Display alert
      errMessage = utility.GetErrorMessageFromException(err);
      vm.alert.display(errMessage.title, errMessage.message, 'danger');
    }
  };

  var syncBookmarksSuccess = function (loadingTimeout) {
    // Hide loading panel
    platform.Interface.Loading.Hide(null, loadingTimeout);

    // If initial sync, switch to search panel
    $timeout(function () {
      if (vm.view.current !== vm.view.views.search) {
        return changeView(vm.view.views.search);
      }
      else {
        vm.search.displayDefaultState();
      }
    });

    // Update bookmark icon
    return setBookmarkStatus();
  };

  var syncForm_ConfirmPassword_Back_Click = function () {
    vm.sync.displayPasswordConfirmation = false;
    vm.sync.passwordConfirmation = null;
  };

  var syncForm_ConfirmPassword_Click = function () {
    vm.sync.displayPasswordConfirmation = true;

    if (!utility.IsMobilePlatform(vm.platformName)) {
      $timeout(function () {
        document.querySelector('input[name="txtPasswordConfirmation"]').focus();
      }, 100);
    }
  };

  var syncForm_DisableSync_Click = function () {
    // Disable sync and switch to login panel
    disableSync()
      .then(function () {
        return changeView(vm.view.views.login);
      })
      .catch(displayAlertErrorHandler);
  };

  var syncForm_EnableSync_Click = function () {
    if (vm.sync.id) {
      // Display overwrite data confirmation panel
      vm.sync.displaySyncConfirmation = true;
      if (!utility.IsMobilePlatform(vm.platformName)) {
        $timeout(function () {
          document.querySelector('.btn-confirm-enable-sync').focus();
        });
      }
    }
    else {
      // If no ID provided start syncing
      startSyncing();
    }
  };

  var syncForm_ExistingSync_Click = function () {
    vm.sync.displayNewSyncPanel = false;
    vm.sync.password = '';

    if (!utility.IsMobilePlatform(vm.platformName)) {
      $timeout(function () {
        document.querySelector('input[name="txtId"]').focus();
      }, 100);
    }
  };

  var syncForm_NewSync_Click = function () {
    vm.sync.displayNewSyncPanel = true;
    vm.sync.displayPasswordConfirmation = false;
    platform.LocalStorage.Set(globals.CacheKeys.SyncId);
    platform.LocalStorage.Set(globals.CacheKeys.Password);
    vm.sync.id = null;
    vm.sync.password = '';
    vm.sync.passwordConfirmation = null;
    vm.sync.passwordComplexity = {};

    if (!utility.IsMobilePlatform(vm.platformName)) {
      $timeout(function () {
        document.querySelector('.login-form-new input[name="txtPassword"]').focus();
      }, 100);
    }
  };

  var syncForm_OtherSyncsDisabled_Click = function () {
    // Hide disable other syncs warning panel and update cache setting
    vm.sync.displayOtherSyncsWarning = false;
    platform.LocalStorage.Set(globals.CacheKeys.DisplayOtherSyncsWarning, false);

    // Focus on password field
    if (!utility.IsMobilePlatform(vm.platformName)) {
      $timeout(function () {
        document.querySelector('.active-login-form input[name="txtPassword"]').focus();
      }, 100);
    }
  };

  var syncForm_Submit_Click = function () {
    $timeout(function () {
      // Handle enter key press for login form
      if (vm.sync.displayNewSyncPanel) {
        if (vm.sync.displayPasswordConfirmation) {
          document.querySelector('.login-form-new .btn-new-sync').click();
        }
        else {
          document.querySelector('.login-form-new .btn-confirm-password').click();
        }
      }
      else {
        document.querySelector('.login-form-existing .btn-existing-sync').click();
      }
    });
  };

  var syncForm_SyncId_Change = function () {
    platform.LocalStorage.Set(globals.CacheKeys.SyncId, vm.sync.id);
  };

  var syncForm_SyncUpdates_Click = function () {
    // Display loading panel
    var loadingTimeout = platform.Interface.Loading.Show();

    // Pull updates
    queueSync({ type: globals.SyncType.Pull })
      .then(function () {
        return syncBookmarksSuccess(loadingTimeout);
      })
      .catch(displayAlertErrorHandler);
  };

  var syncForm_UpgradeSync_Click = function () {
    vm.sync.upgradeConfirmed = true;
    startSyncing();
  };

  var syncPanel_SyncBookmarksToolbar_Click = function () {
    $q.all([
      bookmarks.GetSyncBookmarksToolbar(),
      platform.LocalStorage.Get(globals.CacheKeys.SyncEnabled)
    ])
      .then(function (cachedData) {
        var syncBookmarksToolbar = cachedData[0];
        var syncEnabled = cachedData[1];

        // If sync not enabled or user just clicked to disable toolbar sync, update stored value and return
        if (!syncEnabled || syncBookmarksToolbar) {
          utility.LogInfo('Toolbar sync ' + (!syncBookmarksToolbar ? 'enabled' : 'disabled'));
          return platform.LocalStorage.Set(globals.CacheKeys.SyncBookmarksToolbar, !syncBookmarksToolbar);
        }

        // Otherwise, display sync confirmation
        vm.settings.displaySyncBookmarksToolbarConfirmation = true;
        $timeout(function () {
          document.querySelector('.btn-confirm-sync-toolbar').focus();
        });
      });
  };

  var syncPanel_SyncBookmarksToolbar_Cancel = function () {
    vm.settings.displaySyncBookmarksToolbarConfirmation = false;
    vm.settings.syncBookmarksToolbar = false;
  };

  var syncPanel_SyncBookmarksToolbar_Confirm = function () {
    var syncId;

    platform.LocalStorage.Get([
      globals.CacheKeys.SyncEnabled,
      globals.CacheKeys.SyncId
    ])
      .then(function (cachedData) {
        var syncEnabled = cachedData[globals.CacheKeys.SyncEnabled];
        syncId = cachedData[globals.CacheKeys.SyncId];

        // If sync not enabled, return
        if (!syncEnabled) {
          return;
        }

        // Hide sync confirmation and display loading overlay
        vm.settings.displaySyncBookmarksToolbarConfirmation = false;
        platform.Interface.Loading.Show();

        // Enable setting in cache
        return platform.LocalStorage.Set(globals.CacheKeys.SyncBookmarksToolbar, true);
      })
      .then(function () {
        utility.LogInfo('Toolbar sync enabled');

        // Start sync with no callback action
        return queueSync({
          type: !syncId ? globals.SyncType.Push : globals.SyncType.Pull
        })
          .catch(displayAlertErrorHandler);
      });
  };

  var updatedPanel_Continue_Click = function () {
    platform.LocalStorage.Set(globals.CacheKeys.DisplayUpdated, false);
    vm.view.change(vm.view.views.support);
  };

  var updateServicePanel = function () {
    return api.CheckServiceStatus()
      .then(function (serviceInfo) {
        $timeout(function () {
          setServiceInformation(serviceInfo);
          displayDataUsage();
        });
      })
      .catch(function (err) {
        if (err && err.code === globals.ErrorCodes.ApiOffline) {
          vm.settings.service.status = globals.ServiceStatus.Offline;
        }
        else {
          vm.settings.service.status = globals.ServiceStatus.Error;
        }
      });
  };

  var updateServiceUrlForm_Cancel_Click = function () {
    // Hide form and scroll to top of section
    vm.settings.displayUpdateServiceUrlForm = false;
    document.querySelector('.status-panel h4').scrollIntoView();
  };

  var updateServiceUrlForm_Confirm_Click = function () {
    // Check service url
    var url = vm.settings.service.newServiceUrl.replace(/\/$/, '');

    // Disable sync
    vm.sync.enabled = false;
    vm.sync.password = '';
    vm.sync.passwordComplexity = {};
    disableSync()
      .then(function () {
        // Update the service URL
        vm.settings.service.url = url;

        // Remove saved credentials
        return $q.all([
          platform.LocalStorage.Set(globals.CacheKeys.ServiceUrl, url),
          platform.LocalStorage.Set(globals.CacheKeys.SyncId),
          platform.LocalStorage.Set(globals.CacheKeys.Password)
        ]);
      })
      // Update service status
      .then(function () {
        return api.CheckServiceStatus(url);
      })
      .then(function (serviceInfo) {
        utility.LogInfo('Service url changed to: ' + url);

        // Refresh panel
        setServiceInformation(serviceInfo);
        displayDataUsage();

        // Reset view
        vm.settings.displayCancelSyncConfirmation = false;
        vm.settings.displayUpdateServiceUrlConfirmation = false;
        vm.settings.displayUpdateServiceUrlForm = false;
        vm.settings.service.newServiceUrl = vm.settings.service.url;
        vm.updateServiceUrlForm.newServiceUrl.$setValidity('InvalidService', true);
        vm.updateServiceUrlForm.newServiceUrl.$setValidity('ServiceOffline', true);
        vm.updateServiceUrlForm.newServiceUrl.$setValidity('ServiceVersionNotSupported', true);

        // Scroll to top of section
        $timeout(function () {
          document.querySelector('.status-panel h4').scrollIntoView();
        });
      })
      .catch(function (err) {
        utility.LogError(err, 'app.updateServiceUrlForm_Confirm_Click');
        vm.settings.service.status = globals.ServiceStatus.Offline;
      });
  };

  var updateServiceUrlForm_Display_Click = function () {
    // Reset form
    vm.updateServiceUrlForm.$setPristine();
    vm.settings.service.newServiceUrl = vm.settings.service.url;
    vm.updateServiceUrlForm.newServiceUrl.$setValidity('InvalidService', true);
    vm.updateServiceUrlForm.newServiceUrl.$setValidity('ServiceOffline', true);
    vm.updateServiceUrlForm.newServiceUrl.$setValidity('ServiceVersionNotSupported', true);

    // Display update form panel
    vm.settings.displayUpdateServiceUrlForm = true;

    // Validate service url
    updateServiceUrlForm_ValidateServiceUrl()
      .finally(function () {
        // Focus on url field
        document.querySelector('input[name="newServiceUrl"]').focus();
      });
  };

  var updateServiceUrlForm_NewServiceUrl_Change = function (event) {
    // Reset form if field is invalid
    if (vm.updateServiceUrlForm.newServiceUrl.$invalid) {
      vm.updateServiceUrlForm.newServiceUrl.$setValidity('InvalidService', true);
      vm.updateServiceUrlForm.newServiceUrl.$setValidity('ServiceOffline', true);
      vm.updateServiceUrlForm.newServiceUrl.$setValidity('ServiceVersionNotSupported', true);
    }
  };

  var updateServiceUrlForm_Update_Click = function () {
    // Check for protocol
    if (vm.settings.service.newServiceUrl && vm.settings.service.newServiceUrl.trim() &&
      !(new RegExp(globals.URL.ProtocolRegex)).test(vm.settings.service.newServiceUrl)) {
      vm.settings.service.newServiceUrl = 'https://' + vm.settings.service.newServiceUrl;
    }

    // Validate service url
    return updateServiceUrlForm_ValidateServiceUrl()
      .then(function (isValid) {
        if (!isValid) {
          return;
        }

        // Check if sync is enabled
        return platform.LocalStorage.Get(globals.CacheKeys.SyncEnabled)
          .then(function (syncEnabled) {
            if (!syncEnabled) {
              updateServiceUrlForm_Confirm_Click();
              return;
            }

            // Display confirmation panel
            vm.settings.displayUpdateServiceUrlForm = false;
            vm.settings.displayUpdateServiceUrlConfirmation = true;

            if (!utility.IsMobilePlatform(vm.platformName)) {
              $timeout(function () {
                document.querySelector('.btn-confirm-update-service-url').focus();
              });
            }
          });
      });
  };

  var updateServiceUrlForm_ValidateServiceUrl = function () {
    var timeout = $timeout(function () {
      vm.settings.validatingServiceUrl = true;
    }, 100);

    // Check service url status
    var url = vm.settings.service.newServiceUrl.replace(/\/$/, '');
    return api.CheckServiceStatus(url)
      .then(function (serviceInfo) {
        return !!serviceInfo;
      })
      .catch(function (err) {
        if (err && err.code != null) {
          switch (err.code) {
            case globals.ErrorCodes.ApiOffline:
              vm.updateServiceUrlForm.newServiceUrl.$setValidity('ServiceOffline', false);
              break;
            case globals.ErrorCodes.ApiVersionNotSupported:
              vm.updateServiceUrlForm.newServiceUrl.$setValidity('ServiceVersionNotSupported', false);
              break;
            default:
              vm.updateServiceUrlForm.newServiceUrl.$setValidity('InvalidService', false);
          }
        }
        else {
          vm.updateServiceUrlForm.newServiceUrl.$setValidity('InvalidService', false);
        }

        // Focus on url field
        document.querySelector('input[name=newServiceUrl]').focus();

        return false;
      })
      .finally(function () {
        $timeout.cancel(timeout);
        $timeout(function () {
          vm.settings.validatingServiceUrl = false;
        });
      });
  };

  var validateDataToRestore = function () {
    var validData = false;

    if (vm.settings.dataToRestore) {
      try {
        var restoreData = JSON.parse(vm.settings.dataToRestore);

        if ((restoreData.xBrowserSync && restoreData.xBrowserSync.bookmarks) ||
          (restoreData.xbrowsersync && restoreData.xbrowsersync.data)) {
          validData = true;
        }
      }
      catch (err) { }
    }
    else {
      validData = true;
    }

    vm.restoreForm.dataToRestore.$setValidity('InvalidData', validData);
  };

  // Call constructor
  return new BrowserAction();
};