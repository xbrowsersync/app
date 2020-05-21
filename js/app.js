var xBrowserSync = xBrowserSync || {};
xBrowserSync.App = xBrowserSync.App || {};

/* ------------------------------------------------------------------------------------
 * Class name:  xBrowserSync.App.Controller 
 * Description: Main angular controller class for the app.
 * ------------------------------------------------------------------------------------ */

xBrowserSync.App.Controller = function ($q, $timeout, platform, globals, store, api, utility, bookmarks) {
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

    vm.working = {
      displayCancelSyncButton: false,
      message: platform.GetConstant(globals.Constants.Working_Syncing_Message),
      show: false
    };

    vm.alert = {
      show: false,
      title: '',
      message: '',
      type: '',
      display: displayAlert
    };

    vm.bookmark = {
      active: false,
      addButtonDisabledUntilEditForm: false,
      current: undefined,
      descriptionFieldOriginalHeight: undefined,
      displayUpdateForm: false,
      getTitleForDisplay: bookmarks.GetBookmarkTitleForDisplay,
      originalUrl: undefined,
      tagText: undefined
    };

    vm.events = {
      backupRestoreForm_Backup_Click: backupRestoreForm_Backup_Click,
      backupRestoreForm_BackupFile_Change: backupRestoreForm_BackupFile_Change,
      backupRestoreForm_CancelRevert_Click: backupRestoreForm_CancelRevert_Click,
      backupRestoreForm_ConfirmRestore_Click: backupRestoreForm_ConfirmRestore_Click,
      backupRestoreForm_ConfirmRevert_Click: backupRestoreForm_ConfirmRevert_Click,
      backupRestoreForm_DataToRestore_Change: backupRestoreForm_DataToRestore_Change,
      backupRestoreForm_DisplayRestoreForm_Click: backupRestoreForm_DisplayRestoreForm_Click,
      backupRestoreForm_Restore_Click: backupRestoreForm_Restore_Click,
      backupRestoreForm_Revert_Click: backupRestoreForm_Revert_Click,
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
      bookmarkForm_GetMetadata_Click: bookmarkForm_GetMetadata_Click,
      bookmarkForm_RemoveTag_Click: bookmarkForm_RemoveTag_Click,
      bookmarkForm_ShareBookmark_Click: platform.Bookmarks.Share,
      bookmarkForm_UpdateBookmark_Click: bookmarkForm_UpdateBookmark_Click,
      bookmarkPanel_Close_Click: bookmarkPanel_Close_Click,
      button_ReleaseNotes_Click: button_ReleaseNotes_Click,
      helpPanel_Close: helpPanel_Close,
      helpPanel_KeyDown: helpPanel_KeyDown,
      helpPanel_NextPage: helpPanel_NextPage,
      helpPanel_PreviousPage: helpPanel_PreviousPage,
      helpPanel_ShowHelp: helpPanel_ShowHelp,
      issuesPanel_ClearLog_Click: issuesPanel_ClearLog_Click,
      issuesPanel_DownloadLogFile_Click: issuesPanel_DownloadLogFile_Click,
      openUrl: openUrl,
      permissions_Revoke_Click: permissions_Revoke_Click,
      permissions_Request_Click: permissions_Request_Click,
      permissionsPanel_RequestPermissions_Click: permissionsPanel_RequestPermissions_Click,
      settings_Prefs_CheckForAppUpdates_Click: settings_Prefs_CheckForAppUpdates_Click,
      settings_Prefs_DisplaySearchBar_Click: settings_Prefs_DisplaySearchBar_Click,
      settings_Prefs_EnableDarkMode_Click: settings_Prefs_EnableDarkMode_Click,
      settings_Prefs_DefaultToFolderView_Click: settings_Prefs_DefaultToFolderView_Click,
      settings_Prefs_SyncBookmarksToolbar_Cancel: settings_Prefs_SyncBookmarksToolbar_Cancel,
      settings_Prefs_SyncBookmarksToolbar_Click: settings_Prefs_SyncBookmarksToolbar_Click,
      settings_Prefs_SyncBookmarksToolbar_Confirm: settings_Prefs_SyncBookmarksToolbar_Confirm,
      qrPanel_Close_Click: qrPanel_Close_Click,
      qrPanel_CopySyncId_Click: qrPanel_CopySyncId_Click,
      scanPanel_Cancel_Click: scanPanel_Cancel_Click,
      scanPanel_ToggleLight_Click: scanPanel_ToggleLight_Click,
      searchForm_AddBookmark_Click: searchForm_AddBookmark_Click,
      searchForm_Clear_Click: searchForm_Clear_Click,
      searchForm_DeleteBookmark_Click: searchForm_DeleteBookmark_Click,
      searchForm_SearchText_Autocomplete: searchForm_SearchText_Autocomplete,
      searchForm_SearchText_Change: searchForm_SearchText_Change,
      searchForm_SearchText_KeyDown: searchForm_SearchText_KeyDown,
      searchForm_SearchResult_KeyDown: searchForm_SearchResult_KeyDown,
      searchForm_SearchResults_Scroll: searchForm_SearchResults_Scroll,
      searchForm_SelectBookmark_Press: searchForm_SelectBookmark_Press,
      searchForm_ShareBookmark_Click: searchForm_ShareBookmark_Click,
      searchForm_UpdateBookmark_Click: searchForm_UpdateBookmark_Click,
      syncForm_ScanCode_Click: syncForm_ScanCode_Click,
      syncForm_ConfirmPassword_Back_Click: syncForm_ConfirmPassword_Back_Click,
      syncForm_ConfirmPassword_Click: syncForm_ConfirmPassword_Click,
      syncForm_ConfirmSync_Click: startSyncing,
      syncForm_DisableSync_Click: syncForm_DisableSync_Click,
      syncForm_EnableSync_Click: syncForm_EnableSync_Click,
      syncForm_ExistingSync_Click: syncForm_ExistingSync_Click,
      syncForm_ManualEntry_Click: syncForm_ManualEntry_Click,
      syncForm_NewSync_Click: syncForm_NewSync_Click,
      syncForm_OtherSyncsDisabled_Click: syncForm_OtherSyncsDisabled_Click,
      syncForm_ShowPassword_Click: syncForm_ShowPassword_Click,
      syncForm_Submit_Click: syncForm_Submit_Click,
      syncForm_SyncId_Change: syncForm_SyncId_Change,
      syncForm_SyncUpdates_Click: syncForm_SyncUpdates_Click,
      syncForm_UpdateService_Cancel_Click: syncForm_UpdateService_Cancel_Click,
      syncForm_UpdateService_Click: syncForm_UpdateService_Click,
      syncForm_UpdateService_Confirm_Click: syncForm_UpdateService_Confirm_Click,
      syncForm_UpdateService_ServiceUrl_Change: syncForm_UpdateService_ServiceUrl_Change,
      syncForm_UpdateService_Update_Click: syncForm_UpdateService_Update_Click,
      syncForm_UpgradeSync_Click: syncForm_UpgradeSync_Click,
      syncPanel_DisplayQrPanel_Click: displayQrPanel,
      searchForm_ToggleBookmark_Click: searchForm_ToggleBookmark_Click,
      searchForm_ToggleView_Click: searchForm_ToggleView_Click,
      updatedPanel_Continue_Click: updatedPanel_Continue_Click,
      workingPanel_Cancel_Click: workingPanel_Cancel_Click
    };

    vm.help = {
      currentPage: 0,
      pages: undefined
    };

    vm.login = {
      displayGetSyncIdPanel: true,
      displayOtherSyncsWarning: false,
      displayNewSyncPanel: true,
      displayPasswordConfirmation: false,
      displaySyncConfirmation: false,
      displayUpdateServiceConfirmation: false,
      displayUpdateServicePanel: false,
      displayUpgradeConfirmation: false,
      passwordComplexity: {},
      passwordConfirmation: undefined,
      showPassword: false,
      upgradeConfirmed: false,
      validatingServiceUrl: false
    };

    vm.platformName = undefined;

    vm.scanner = {
      invalidSyncId: false,
      lightEnabled: false
    };

    vm.search = {
      batchResultsNum: 10,
      bookmarkTree: undefined,
      cancelGetBookmarksRequest: undefined,
      displayDefaultState: displayDefaultSearchState,
      displayFolderView: false,
      execute: searchBookmarks,
      getLookaheadTimeout: undefined,
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
      checkForAppUpdates: false,
      darkModeEnabled: false,
      dataToRestore: undefined,
      displayQrPanel: false,
      displayRestoreConfirmation: false,
      displayRestoreForm: false,
      displayRevertConfirmation: false,
      displaySearchBarBeneathResults: false,
      displaySyncBookmarksToolbarConfirmation: false,
      downloadLogCompletedMessage: undefined,
      fileRestoreEnabled: false,
      defaultToFolderView: false,
      getSearchLookaheadDelay: 50,
      getSearchResultsDelay: 250,
      logSize: undefined,
      nextAutoUpdate: undefined,
      readWebsiteDataPermissionsGranted: false,
      restoreCompletedMessage: undefined,
      revertCompleted: false,
      revertConfirmationMessage: undefined,
      revertUnavailable: false,
      savingBackup: false,
      savingLog: false,
      syncBookmarksToolbar: true,
      syncIdCopied: false,
      updatesAvailable: undefined,
      validatingRestoreData: false
    };

    vm.sync = {
      dataSize: undefined,
      dataUsed: undefined,
      enabled: false,
      id: undefined,
      inProgress: false,
      newService: {
        apiVersion: '',
        location: undefined,
        maxSyncSize: 0,
        message: '',
        status: undefined,
        url: undefined
      },
      password: '',
      service: {
        apiVersion: '',
        location: undefined,
        maxSyncSize: 0,
        message: '',
        newServiceUrl: '',
        status: undefined,
        url: undefined
      }
    };

    vm.view = {
      current: undefined,
      change: changeView,
      displayMainView: displayMainView,
      views: {
        login: 0,
        search: 1,
        bookmark: 2,
        settings: 3,
        help: 4,
        support: 5,
        updated: 6,
        permissions: 7,
        loading: 8,
        scan: 9
      }
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

  var backupRestoreForm_BackupFile_Change = function () {
    var fileInput = document.getElementById('backupFile');

    if (fileInput.files.length > 0) {
      var file = fileInput.files[0];
      vm.settings.backupFileName = file.name;
      var reader = new FileReader();

      reader.onload = (function (data) {
        return function (event) {
          $timeout(function () {
            vm.settings.dataToRestore = event.target.result;

            // Reset validation interface
            backupRestoreForm_DataToRestore_Change();
            vm.settings.validatingRestoreData = true;

            // Trigger restore data validation
            $timeout(function () {
              validateBackupData();
              vm.settings.validatingRestoreData = false;
            });
          });
        };
      })(file);

      // Read the backup file data
      reader.readAsText(file);
    }
  };

  var backupRestoreForm_ConfirmRestore_Click = function () {
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

  var backupRestoreForm_DataToRestore_Change = function () {
    vm.restoreForm.dataToRestore.$setValidity('InvalidData', true);
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

    // Focus on restore textarea
    if (!utility.IsMobilePlatform(vm.platformName)) {
      $timeout(function () {
        document.querySelector('#restoreForm textarea').select();
      });
    }
  };

  var backupRestoreForm_Restore_Click = function () {
    if (!validateBackupData()) {
      return;
    }

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

  var backupRestoreForm_SelectBackupFile_Click = function () {
    // Open select file dialog
    document.querySelector('#backupFile').click();
  };

  var backupRestoreForm_Revert_Click = function () {
    // Retrieve install backup from local storage
    return store.Get(globals.CacheKeys.InstallBackup)
      .then(function (installBackup) {
        $timeout(function () {
          if (!installBackup) {
            vm.settings.revertUnavailable = true;
            return;
          }

          var installBackupObj = JSON.parse(installBackup);
          if (installBackupObj && installBackupObj.date && installBackupObj.bookmarks) {
            var date = new Date(installBackupObj.date);
            var confirmationMessage = platform.GetConstant(globals.Constants.Settings_BackupRestore_Revert_Confirmation_Message);
            vm.settings.revertConfirmationMessage = confirmationMessage.replace('{date}', date.toLocaleDateString());
            vm.settings.displayRevertConfirmation = true;
          }
          else {
            vm.settings.revertUnavailable = true;
          }
        });
      });
  };

  var backupRestoreForm_ConfirmRevert_Click = function () {
    // Display loading overlay
    platform.Interface.Working.Show();

    // Disable sync and restore local bookmarks to installation state
    $q.all([
      store.Get(globals.CacheKeys.InstallBackup),
      disableSync()
    ])
      .then(function (response) {
        var installBackupObj = JSON.parse(response[0]);
        var installBackupDate = new Date(installBackupObj.date);
        var bookmarksToRestore = installBackupObj.bookmarks;
        utility.LogInfo('Reverting data to installation state from ' + installBackupDate.toISOString());

        // Set working message
        vm.working.message = platform.GetConstant(globals.Constants.Working_Reverting_Message);

        // Start restore
        return queueSync({
          bookmarks: bookmarksToRestore,
          type: globals.SyncType.Pull
        }, globals.Commands.RestoreBookmarks);
      })
      .then(function () {
        $timeout(function () {
          // Display completed message
          vm.settings.displayRevertConfirmation = false;
          vm.settings.revertCompleted = true;
        });
      })
      .catch(displayAlertErrorHandler)
      .finally(platform.Interface.Working.Hide);
  };

  var backupRestoreForm_CancelRevert_Click = function () {
    vm.settings.displayRevertConfirmation = false;
    vm.settings.revertCompleted = false;
    vm.settings.revertConfirmationMessage = null;
    vm.settings.revertUnavailable = false;
  };

  var bookmarkForm_BookmarkDescription_Change = function () {
    // Limit the bookmark description to the max length
    $timeout(function () {
      vm.bookmark.current.description = utility.TrimToNearestWord(vm.bookmark.current.description, globals.Bookmarks.DescriptionMaxLength);
    });
  };

  var bookmarkForm_BookmarkTags_Change = function (event) {
    // Get tag text from event data if provided
    if (event && event.data) {
      vm.bookmark.tagText = event.data;
    }

    if (!vm.bookmark.tagText || !vm.bookmark.tagText.trim()) {
      return;
    }

    // Get last word of tag text
    var lastWord = _.last(vm.bookmark.tagText.split(",")).trimLeft();

    // Display lookahead if word length exceeds minimum
    if (lastWord && lastWord.length > globals.LookaheadMinChars) {
      // Get tags lookahead
      bookmarks.GetLookahead(lastWord.toLowerCase(), null, true, vm.bookmark.current.tags)
        .then(function (results) {
          if (!results) {
            vm.bookmark.tagLookahead = null;
            return;
          }

          var lookahead = results[0];
          var word = results[1];

          if (lookahead && word.toLowerCase() === lastWord.toLowerCase()) {
            // Set lookahead after trimming word
            lookahead = lookahead ? lookahead.substring(word.length) : undefined;
            vm.bookmark.tagTextMeasure = vm.bookmark.tagText.replace(/\s/g, '&nbsp;');
            vm.bookmark.tagLookahead = lookahead.replace(/\s/g, '&nbsp;');
          }
        });
    }
    else {
      vm.bookmark.tagLookahead = null;
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
        // Add lookahead to tag text
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
      bookmarkToCreate.url = 'https://' + bookmarkToCreate.url;
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
        var loadingTimeout = platform.Interface.Working.Show();

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
            return platform.GetCurrentUrl()
              .then(function (currentUrl) {
                // Update bookmark status and switch view
                var bookmarkStatusActive = currentUrl && currentUrl.toUpperCase() === bookmarkToCreate.url.toUpperCase();
                return syncBookmarksSuccess(loadingTimeout, bookmarkStatusActive);
              });
          });
      })
      .catch(checkIfSyncDataRefreshedOnError);
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
    var loadingTimeout = platform.Interface.Working.Show();

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
        // Update bookmark status and switch view
        var bookmarkStatusActive = !(currentUrl && currentUrl.toUpperCase() === vm.bookmark.originalUrl.toUpperCase());
        return syncBookmarksSuccess(loadingTimeout, bookmarkStatusActive);
      })
      .catch(checkIfSyncDataRefreshedOnError);
  };

  var bookmarkForm_GetMetadata_Click = function () {
    getMetadataForUrl(vm.bookmark.current.url)
      .then(function (metadata) {
        if (!metadata || (!metadata.title && !metadata.description && !metadata.tags)) {
          return;
        }

        // Update bookmark metadata and set url field as pristine
        vm.bookmark.current.title = metadata.title || vm.bookmark.current.title;
        vm.bookmark.current.description = metadata.description || vm.bookmark.current.description;
        vm.bookmark.current.tags = metadata.tags || vm.bookmark.current.tags;
        vm.bookmarkForm.bookmarkUrl.$setPristine();

        // Display message
        vm.alert.display(null, platform.GetConstant(globals.Constants.GetMetadata_Success_Message));
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
      bookmarkToUpdate.url = 'https://' + bookmarkToUpdate.url;
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
        platform.Interface.Working.Show();

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
          });
      })
      .catch(checkIfSyncDataRefreshedOnError);
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
    platform.Interface.Working.Hide();

    // Initialise new view
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
      case vm.view.views.loading:
        initNewView = init_loadingView(viewData);
        break;
      case vm.view.views.login:
        initNewView = init_loginView(viewData);
        break;
      default:
        initNewView = $q.resolve();
    }

    return initNewView
      .then(function () {
        // Display new view
        vm.view.current = view;
      })
      .then(function () {
        // Attach events to new tab links
        $timeout(setNewTabLinks, 150);
        return view;
      });
  };

  var checkIfSyncDataRefreshedOnError = function (err) {
    // If data out of sync display main view
    return (bookmarks.CheckIfRefreshSyncedDataOnError(err) ? displayMainView() : $q.resolve())
      .then(function () {
        displayAlertErrorHandler(err);
      });
  };

  var convertPageMetadataToBookmark = function (metadata) {
    if (!metadata) {
      return;
    }

    var metadataAsBookmark = new bookmarks.XBookmark(
      metadata.title,
      metadata.url,
      utility.TrimToNearestWord(metadata.description, globals.Bookmarks.DescriptionMaxLength),
      utility.GetTagArrayFromText(metadata.tags));
    return metadataAsBookmark;
  };

  var disableSync = function () {
    // Disable sync
    return platform.Sync.Disable()
      .then(function () {
        vm.sync.dataSize = null;
        vm.sync.dataUsed = null;
        vm.sync.enabled = false;
        vm.sync.password = '';
        vm.login.passwordComplexity = {};
      })
      .catch(displayAlertErrorHandler);
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
    $timeout(function () {
      var errMessage = utility.GetErrorMessageFromException(err);
      vm.alert.display(errMessage.title, errMessage.message, 'danger');
    });
  };

  var displayDefaultSearchState = function () {
    // Clear search and results
    vm.search.query = null;
    vm.search.queryMeasure = null;
    vm.search.lookahead = null;
    vm.search.results = null;

    if (vm.search.displayFolderView) {
      // Initialise bookmark tree
      vm.search.bookmarkTree = null;
      bookmarks.GetBookmarks()
        .then(function (results) {
          $timeout(function () {
            // Display bookmark tree view, sort containers
            vm.search.bookmarkTree = results.sort(function (a, b) {
              return b.title.localeCompare(a.title);
            });
          });
        })
        .catch(displayAlertErrorHandler);
    }

    return $q.resolve();
  };

  var displayHelpPage = function (panelToDisplay) {
    if (panelToDisplay < 0 || panelToDisplay >= vm.help.pages.length) {
      return helpPanel_Close();
    }

    vm.help.currentPage = panelToDisplay || 0;
    $timeout(function () {
      document.querySelector('#help-panel .view-content > div').focus();
    });
  };

  var displayMainView = function () {
    return store.Get([
      globals.CacheKeys.DisplayHelp,
      globals.CacheKeys.DisplayPermissions,
      globals.CacheKeys.DisplayUpdated,
      globals.CacheKeys.SyncEnabled
    ])
      .then(function (cachedData) {
        var displayHelp = cachedData[globals.CacheKeys.DisplayHelp];
        var displayPermissions = cachedData[globals.CacheKeys.DisplayPermissions];
        var displayUpdated = cachedData[globals.CacheKeys.DisplayUpdated];
        var syncEnabled = cachedData[globals.CacheKeys.SyncEnabled];

        switch (true) {
          case displayUpdated:
            return changeView(vm.view.views.updated);
          case displayPermissions:
            return changeView(vm.view.views.permissions);
          case displayHelp:
            return helpPanel_ShowHelp();
          case syncEnabled:
            return changeView(vm.view.views.search);
          default:
            return changeView(vm.view.views.login);
        }
      });
  };

  var displayQrPanel = function () {
    // Value for QR code should comprise of sync ID and service URL
    var value = vm.sync.id + globals.QrCode.Delimiter + vm.sync.service.url;

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
    var svgString = qrcode.svg().replace('width="200" height="200"', 'viewBox="0, 0, 200, 200" preserveAspectRatio="xMidYMid meet"');

    // Add new qr code svg to qr container
    var svg = new DOMParser().parseFromString(svgString, 'text/xml').firstElementChild;
    var qrContainer = document.getElementById('qr');
    while (qrContainer.firstElementChild) {
      qrContainer.removeChild(qrContainer.firstElementChild);
    }
    qrContainer.appendChild(svg);
    vm.settings.displayQrPanel = true;
  };

  var downloadBackupFile = function () {
    // Get data for backup
    return $q.all([
      bookmarks.Export(),
      store.Get([
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
        return platform.DownloadFile(utility.GetBackupFileName(), beautifiedJson, 'backupLink');
      })
      .then(function (message) {
        // Display message
        vm.settings.backupCompletedMessage = message;
      });
  };

  var downloadLogFile = function () {
    // Get cached message log
    return store.Get(globals.CacheKeys.TraceLog)
      .then(function (debugMessageLog) {
        // Trigger download
        return platform.DownloadFile(utility.GetLogFileName(), debugMessageLog.join('\r\n'), 'downloadLogFileLink');
      })
      .then(function (message) {
        // Display message
        vm.settings.downloadLogCompletedMessage = message;
      });
  };

  var getMetadataForCurrentPage = function () {
    return platform.GetPageMetadata(true)
      .then(convertPageMetadataToBookmark);
  };

  var getMetadataForUrl = function (url) {
    if (!url) {
      return $q.resolve();
    }

    return platform.GetPageMetadata(true, url)
      .then(convertPageMetadataToBookmark);
  };

  var init = function () {
    // Platform-specific initation
    platform.Init(vm)
      .then(function () {
        // Get cached prefs from storage
        return $q.all([
          store.Get([
            globals.CacheKeys.DarkModeEnabled,
            globals.CacheKeys.DisplaySearchBarBeneathResults,
            globals.CacheKeys.DefaultToFolderView,
            globals.CacheKeys.SyncEnabled,
            globals.CacheKeys.SyncId
          ]),
          utility.GetServiceUrl()
        ]);
      })
      .then(function (cachedData) {
        // Set view model values
        vm.settings.displaySearchBarBeneathResults = !!cachedData[0][globals.CacheKeys.DisplaySearchBarBeneathResults];
        vm.settings.defaultToFolderView = !!cachedData[0][globals.CacheKeys.DefaultToFolderView];
        vm.sync.enabled = !!cachedData[0][globals.CacheKeys.SyncEnabled];
        vm.sync.id = cachedData[0][globals.CacheKeys.SyncId];
        vm.sync.service.url = cachedData[1];
        if (cachedData[0][globals.CacheKeys.DarkModeEnabled] !== undefined) {
          vm.settings.darkModeEnabled = cachedData[0][globals.CacheKeys.DarkModeEnabled];
        }

        // Check if a sync is currently in progress
        return platform.Sync.Current()
          .then(function (currentSync) {
            if (currentSync) {
              utility.LogInfo('Waiting for syncs to finish...');

              // Only display cancel button for push syncs
              if (currentSync.type === globals.SyncType.Push) {
                vm.working.displayCancelSyncButton = true;
              }

              // Display loading panel
              return vm.view.change(vm.view.views.loading)
                .then(waitForSyncsToFinish)
                .then(function () {
                  return store.Get(globals.CacheKeys.SyncEnabled);
                })
                .then(function (syncEnabled) {
                  // Check that user didn't cancel sync
                  vm.sync.enabled = syncEnabled;
                  if (vm.sync.enabled) {
                    utility.LogInfo('Syncs finished, resuming');
                    return syncBookmarksSuccess();
                  }
                })
                .finally(function () {
                  vm.working.displayCancelSyncButton = false;
                });
            }

            // Return here if view has already been set
            if (vm.view.current) {
              return;
            }

            // Set initial view
            return displayMainView();
          })
          // Check if current page is a bookmark
          .then(function () {
            return setBookmarkStatus();
          });
      })
      .catch(function (err) {
        displayMainView()
          .then(function () {
            // Display alert
            displayAlertErrorHandler(err);
          });
      })
      .finally(refreshServiceStatus);
  };

  var init_bookmarkView = function (bookmark) {
    vm.bookmark.addButtonDisabledUntilEditForm = false;
    vm.bookmark.current = null;
    vm.bookmark.displayUpdateForm = false;
    vm.bookmark.originalUrl = null;
    vm.bookmark.tagLookahead = null;
    vm.bookmark.tagText = null;
    vm.bookmark.tagTextMeasure = null;

    return $q(function (resolve) {
      // If bookmark to update provided, set to current and return
      if (bookmark) {
        vm.bookmark.displayUpdateForm = true;
        return resolve(bookmark);
      }

      // Check if current url is a bookmark
      return bookmarks.FindCurrentUrlInBookmarks()
        .then(function (existingBookmark) {
          if (existingBookmark) {
            // Display update bookmark form and return
            vm.bookmark.displayUpdateForm = true;
            return resolve(existingBookmark);
          }

          resolve();
        });
    })
      .then(function (bookmarkToUpdate) {
        if (bookmarkToUpdate) {
          // Remove search score and set current bookmark to result
          delete bookmarkToUpdate.score;
          vm.bookmark.current = bookmarkToUpdate;
          vm.bookmark.originalUrl = bookmarkToUpdate.url;
          return;
        }

        // Set default bookmark form values
        vm.bookmark.current = { url: 'https://' };
        vm.bookmark.originalUrl = vm.bookmark.current.url;

        // Get current page metadata as bookmark
        getMetadataForCurrentPage()
          .then(function (currentPageMetadata) {
            if (currentPageMetadata) {
              vm.bookmark.current = currentPageMetadata;
              vm.bookmark.originalUrl = currentPageMetadata.url;
            }
          })
          .catch(displayAlertErrorHandler);
      })
      .then(function () {
        $timeout(function () {
          // Reset form
          vm.bookmarkForm.$setPristine();
          vm.bookmarkForm.$setUntouched();

          if (!utility.IsMobilePlatform(vm.platformName)) {
            // Set initial focus
            var element = document.querySelector('.focused');
            if (element.select) { element.select(); } else { element.focus(); }
          }
        }, 150);
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
        displayAlertErrorHandler(err);
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

  var init_loadingView = function () {
    platform.Interface.Working.Show();
    return $q.resolve();
  };

  var init_loginView = function () {
    vm.login.displayOtherSyncsWarning = false;
    vm.login.displayPasswordConfirmation = false;
    vm.login.displaySyncConfirmation = false;
    vm.login.displayUpdateServiceConfirmation = false;
    vm.login.displayUpdateServicePanel = false;
    vm.login.displayUpgradeConfirmation = false;
    vm.login.passwordComplexity = {};
    vm.login.passwordConfirmation = null;
    vm.login.showPassword = false;
    vm.login.upgradeConfirmed = false;
    vm.login.validatingServiceUrl = false;
    vm.sync.password = '';

    // Validate sync id if present
    $timeout(function () {
      syncForm_SyncId_Change();
    }, 150);

    return store.Get(globals.CacheKeys.DisplayOtherSyncsWarning)
      .then(function (displayOtherSyncsWarning) {
        if (utility.IsMobilePlatform(vm.platformName)) {
          // Set displayed panels for mobile platform
          vm.login.displayGetSyncIdPanel = !vm.sync.id;
          vm.login.displayNewSyncPanel = false;
        }
        else {
          // Set displayed panels for browsers
          vm.login.displayNewSyncPanel = !vm.sync.id;

          // If not synced before, display warning to disable other sync tools
          if (displayOtherSyncsWarning == null || displayOtherSyncsWarning === true) {
            vm.login.displayOtherSyncsWarning = true;

            // Focus on first button
            if (!utility.IsMobilePlatform(vm.platformName)) {
              $timeout(function () {
                document.querySelector('.otherSyncsWarning .buttons > button').focus();
              }, 150);
            }
          }
          else {
            // Focus on password field
            if (!utility.IsMobilePlatform(vm.platformName)) {
              $timeout(function () {
                document.querySelector('.active-login-form  input[name="txtPassword"]').focus();
              }, 150);
            }
          }
        }

        // Refresh service info
        refreshServiceStatus();
      });
  };

  var init_searchView = function () {
    if (!utility.IsMobilePlatform(vm.platformName)) {
      $timeout(function () {
        // Focus on search box
        document.querySelector('input[name=txtSearch]').focus();
      }, 150);
    }

    // Reset search view
    vm.search.displayFolderView = vm.settings.defaultToFolderView;
    vm.search.bookmarkTree = null;
    vm.search.selectedBookmark = null;
    return vm.search.displayDefaultState();
  };

  var init_settingsView = function () {
    vm.settings.displayQrPanel = false;
    vm.settings.displayRestoreConfirmation = false;
    vm.settings.displayRestoreForm = false;
    vm.settings.displayRevertConfirmation = false;
    vm.settings.displaySyncBookmarksToolbarConfirmation = false;
    vm.settings.backupFileName = null;
    vm.settings.backupCompletedMessage = null;
    vm.settings.downloadLogCompletedMessage = null;
    vm.settings.readWebsiteDataPermissionsGranted = false;
    vm.settings.restoreCompletedMessage = null;
    vm.settings.revertCompleted = false;
    vm.settings.revertConfirmationMessage = undefined;
    vm.settings.revertUnavailable = false;
    vm.settings.dataToRestore = '';
    vm.settings.savingBackup = false;
    vm.settings.savingLog = false;
    vm.settings.validatingRestoreData = false;
    vm.settings.updatesAvailable = undefined;
    vm.settings.nextAutoUpdate = undefined;

    // Get current service url and sync bookmarks toolbar setting from cache
    return $q.all([
      bookmarks.GetSyncBookmarksToolbar(),
      store.Get([
        globals.CacheKeys.CheckForAppUpdates,
        globals.CacheKeys.TraceLog
      ]),
      utility.IsPlatform(vm.platformName, globals.Platforms.Chrome) ? platform.Permissions.Check() : $q.resolve(false)
    ])
      .then(function (data) {
        var syncBookmarksToolbar = data[0];
        var checkForAppUpdates = data[1][globals.CacheKeys.CheckForAppUpdates];
        var traceLog = data[1][globals.CacheKeys.TraceLog];
        var readWebsiteDataPermissionsGranted = data[2];

        vm.settings.checkForAppUpdates = checkForAppUpdates;
        vm.settings.syncBookmarksToolbar = syncBookmarksToolbar;
        vm.settings.readWebsiteDataPermissionsGranted = readWebsiteDataPermissionsGranted;
        vm.settings.logSize = (new TextEncoder().encode(traceLog)).length;

        $timeout(function () {
          // Check for available sync updates on non-mobile platforms
          if (vm.sync.enabled && !utility.IsMobilePlatform(vm.platformName)) {
            $q.all([
              bookmarks.CheckForUpdates(),
              platform.AutomaticUpdates.NextUpdate()
            ])
              .then(function (data) {
                if (data[0]) {
                  vm.settings.updatesAvailable = true;
                  vm.settings.nextAutoUpdate = data[1];
                }
                else {
                  vm.settings.updatesAvailable = false;
                }
              })
              .catch(function (err) {
                // Don't display alert if sync failed due to network connection
                if (utility.IsNetworkConnectionError(err) ||
                  err.code == globals.ErrorCodes.InvalidService ||
                  err.code == globals.ErrorCodes.ServiceOffline) {
                  return;
                }

                // Otherwise display alert
                displayAlertErrorHandler(err);
              });
          }

          // Set backup file change event for mobile platforms
          if (utility.IsMobilePlatform(vm.platformName)) {
            document.getElementById('backupFile').addEventListener('change', vm.events.backupRestoreForm_BackupFile_Change, false);
          }

          // Update service status and display info
          refreshServiceStatus().then(refreshSyncDataUsageMeter);
        }, 150);
      });
  };

  var issuesPanel_ClearLog_Click = function () {
    // Clear trace log
    return store.Set(globals.CacheKeys.TraceLog)
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

  var helpPanel_Close = function () {
    vm.view.displayMainView();
  };

  var helpPanel_KeyDown = function (event) {
    switch (true) {
      // Escape key
      case (event.keyCode === 27):
        event.preventDefault();
        vm.events.helpPanel_Close();
        break;
      // Left arrow key
      case (event.keyCode === 37):
        event.preventDefault();
        displayHelpPage(vm.help.currentPage - 1);
        break;
      // Right arrow key
      case (event.keyCode === 39):
        event.preventDefault();
        displayHelpPage(vm.help.currentPage + 1);
        break;
    }
  };

  var helpPanel_NextPage = function () {
    displayHelpPage(vm.help.currentPage + 1);
  };

  var helpPanel_PreviousPage = function () {
    displayHelpPage(vm.help.currentPage - 1);
  };

  var helpPanel_ShowHelp = function () {
    store.Set(globals.CacheKeys.DisplayHelp, false);
    vm.help.pages = platform.GetHelpPages();
    vm.view.change(vm.view.views.help);
    displayHelpPage();
  };

  var openUrl = function (event, url) {
    if (event) {
      if (event.preventDefault) { event.preventDefault(); }
      if (event.srcEvent) { event.srcEvent.stopPropagation(); }
    }

    if (url) {
      platform.OpenUrl(url);
    }
    else {
      platform.OpenUrl(event.currentTarget.href);
    }
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
      store.Set(globals.CacheKeys.DisplayPermissions, false)
    ])
      .finally(vm.view.displayMainView);
  };

  var qrPanel_Close_Click = function () {
    vm.settings.displayQrPanel = false;
    $timeout(function () {
      vm.settings.syncIdCopied = false;
    }, 150);
  };

  var qrPanel_CopySyncId_Click = function () {
    platform.CopyToClipboard(vm.sync.id)
      .then(function () {
        $timeout(function () {
          vm.settings.syncIdCopied = true;
        });
      })
      .catch(displayAlertErrorHandler);
  };

  var queueSync = function (syncData, command) {
    command = command || globals.Commands.SyncBookmarks;
    return platform.Sync.Queue(syncData, command)
      .catch(function (err) {
        // If sync was processed but not committed (offline) catch the error but display an alert
        if (err.code === globals.ErrorCodes.SyncUncommitted) {
          $timeout(function () {
            displayAlertErrorHandler(err);
          }, 150);
          return;
        }

        throw err;
      })
      .finally(function () {
        // Hide working panel and restore default message
        platform.Interface.Working.Hide();
        $timeout(function () {
          vm.working.message = platform.GetConstant(globals.Constants.Working_Syncing_Message);
        }, 1e3);
      });
  };

  var refreshServiceStatus = function (serviceObj, serviceInfo) {
    serviceObj = serviceObj || vm.sync.service;

    // Clear current status
    serviceObj.status = null;

    // Retrieve service info
    return (serviceInfo ? $q.resolve(serviceInfo) : api.CheckServiceStatus())
      .then(function (response) {
        if (!response) {
          return;
        }

        // Render markdown and add link classes to service message 
        var message = response.message ? marked(response.message) : null;
        if (message) {
          var messageDom = new DOMParser().parseFromString(message, 'text/html');
          _.each(messageDom.querySelectorAll('a'), function (hyperlink) {
            hyperlink.className = 'new-tab';
          });
          message = DOMPurify.sanitize(messageDom.body.firstElementChild.innerHTML);
          $timeout(setNewTabLinks);
        }

        serviceObj.apiVersion = response.version;
        serviceObj.location = response.location;
        serviceObj.maxSyncSize = response.maxSyncSize / 1024;
        serviceObj.message = message;
        serviceObj.status = response.status;
      })
      .catch(function (err) {
        if (err && err.code === globals.ErrorCodes.ServiceOffline) {
          serviceObj.status = globals.ServiceStatus.Offline;
        }
        else {
          serviceObj.status = globals.ServiceStatus.Error;
        }
      });
  };

  var refreshSyncDataUsageMeter = function () {
    return store.Get(globals.CacheKeys.SyncEnabled)
      .then(function (syncEnabled) {
        // Return if not synced
        if (!syncEnabled) {
          return;
        }

        // Get  bookmarks sync size and calculate sync data percentage used
        return bookmarks.SyncSize()
          .then(function (bookmarksSyncSize) {
            $timeout(function () {
              vm.sync.dataSize = bookmarksSyncSize / 1024;
              vm.sync.dataUsed = Math.ceil((vm.sync.dataSize / vm.sync.service.maxSyncSize) * 150);
            });
          })
          .catch(displayAlertErrorHandler);
      });
  };

  var restoreBookmarksSuccess = function () {
    // Update current bookmark status
    return setBookmarkStatus()
      // Refresh data usage
      .then(refreshSyncDataUsageMeter)
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

    // Set working message and display loading overlay
    vm.working.message = platform.GetConstant(globals.Constants.Working_Restoring_Message);
    platform.Interface.Working.Show();

    store.Get(globals.CacheKeys.SyncEnabled)
      .then(function (cachedSyncEnabled) {
        syncEnabled = cachedSyncEnabled;

        // If synced check service status before starting restore, otherwise restore sync settings
        return syncEnabled ? api.CheckServiceStatus() : $q(function (resolve, reject) {
          // Clear current password and set sync ID if supplied
          vm.sync.password = '';
          vm.login.passwordComplexity = {};
          $q.all([
            store.Set(globals.CacheKeys.Password),
            syncId ? store.Set(globals.CacheKeys.SyncId, syncId) : $q.resolve(),
            serviceUrl ? updateServiceUrl(serviceUrl) : $q.resolve()
          ])
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
      .finally(platform.Interface.Working.Hide);
  };

  var scanPanel_Cancel_Click = function () {
    vm.login.displayGetSyncIdPanel = false;
    displayMainView().then(platform.Scanner.Stop);
  };

  var scanPanel_ToggleLight_Click = function () {
    platform.Scanner.ToggleLight()
      .then(function (lightEnabled) {
        vm.scanner.lightEnabled = lightEnabled;
      })
      .catch(displayAlertErrorHandler);
  };

  var searchBookmarks = function () {
    var queryData = {
      url: undefined,
      keywords: []
    };
    var urlRegex = new RegExp('^' + globals.URL.ValidUrlRegex + '$', 'i');

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
          vm.search.scrollDisplayMoreEnabled = true;
          var resultsPanel = document.querySelector('.search-results-panel');
          if (resultsPanel) {
            resultsPanel.scrollTop = 0;
          }
        }, 150);
      })
      .catch(function (err) {
        vm.search.results = null;
        displayAlertErrorHandler(err);
      });
  };

  var searchForm_AddBookmark_Click = function () {
    // Display bookmark panel
    changeView(vm.view.views.bookmark)
      .then(function () {
        // Disable add bookmark button by default
        vm.bookmark.addButtonDisabledUntilEditForm = true;
      });
  };

  var searchForm_Clear_Click = function () {
    displayDefaultSearchState()
      .then(function () {
        // Display default search results
        searchBookmarks();

        // Focus on search box
        if (!utility.IsMobilePlatform(vm.platformName)) {
          document.querySelector('input[name=txtSearch]').focus();
        }
      });
  };

  var searchForm_DeleteBookmark_Click = function (event, bookmark) {
    if (event) {
      if (event.preventDefault) { event.preventDefault(); }
      if (event.srcEvent) { event.srcEvent.stopPropagation(); }
    }

    // Find and remove the deleted bookmark element in the search results
    if (vm.search.results && vm.search.results.length > 0) {
      var deletedBookmarkIndex = _.findIndex(vm.search.results, function (result) { return result.id === bookmark.id; });
      if (deletedBookmarkIndex >= 0) {
        vm.search.results.splice(deletedBookmarkIndex, 1);
      }
    }

    // Find and remove the deleted bookmark element in the bookmark tree
    if (vm.search.bookmarkTree && vm.search.bookmarkTree.length > 0) {
      // Find parent of bookmark to delete
      var parent, childIndex = -1;
      bookmarks.Each(vm.search.bookmarkTree, function (current) {
        if (!current.children || current.children.length === 0) {
          return;
        }

        // Check children for target bookmark 
        var index = current.children.findIndex(function (child) {
          return child.id === bookmark.id;
        });
        if (index >= 0) {
          parent = current;
          childIndex = index;
        }
      });

      // If target bookmark and parent were found, remove the bookmark
      if (parent && childIndex >= 0) {
        parent.children.splice(childIndex, 1);
      }
    }

    $timeout(function () {
      // Display loading overlay
      platform.Interface.Working.Show();

      // Sync changes
      queueSync({
        type: globals.SyncType.Both,
        changeInfo: {
          type: globals.UpdateType.Delete,
          id: bookmark.id
        }
      })
        .catch(checkIfSyncDataRefreshedOnError);
    }, 1e3);
  };

  var syncForm_ScanCode_Click = function () {
    var scanSuccess = false;

    platform.Scanner.Start()
      .then(function (value) {
        scanSuccess = true;

        // Split the scanned value into it's components and update stored sync id and service values
        var arrValue = value.split(globals.QrCode.Delimiter);
        vm.sync.id = arrValue[0];
        return $q.all([
          store.Set(globals.CacheKeys.SyncId, arrValue[0]),
          updateServiceUrl(arrValue[1])
        ]);
      })
      .catch(displayAlertErrorHandler)
      .finally(function () {
        displayMainView()
          .then(function () {
            // Stop scanning
            platform.Scanner.Stop();

            // If ID was scanned focus on password field
            if (scanSuccess) {
              $timeout(function () {
                document.querySelector('.active-login-form  input[name="txtPassword"]').focus();
              });
            }
          });
      });
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

  var searchForm_SearchText_Change = function (event) {
    vm.alert.show = false;

    // Get query from event data if provided
    if (event && event.data) {
      vm.search.query = event.data;
    }

    if (vm.search.getSearchResultsTimeout) {
      $timeout.cancel(vm.search.getSearchResultsTimeout);
      vm.search.getSearchResultsTimeout = null;
    }

    // No query, clear results
    if (!vm.search.query || !vm.search.query.trim()) {
      vm.search.displayDefaultState();
      return;
    }

    // Get last word of search query
    var queryWords = vm.search.query.split(/[\s]+/);
    var lastWord = _.last(queryWords);
    var getLookahead;

    // Display lookahead if word length exceed minimum
    if (lastWord && lastWord.length > globals.LookaheadMinChars) {
      // Get lookahead
      getLookahead = bookmarks.GetLookahead(lastWord.toLowerCase(), vm.search.results)
        .then(function (results) {
          if (!results) {
            vm.search.lookahead = null;
            return;
          }

          var lookahead = results[0];
          var word = results[1];

          if (lookahead && word.toLowerCase() === lastWord.toLowerCase()) {
            // Set lookahead after trimming word
            lookahead = lookahead ? lookahead.substring(word.length) : undefined;
            vm.search.queryMeasure = vm.search.query.replace(/\s/g, '&nbsp;');
            vm.search.lookahead = lookahead.replace(/\s/g, '&nbsp;');
          }

          vm.search.cancelGetBookmarksRequest = null;
        })
        .then(function () {
          vm.search.displayFolderView = false;
          return searchBookmarks();
        })
        .catch(displayAlertErrorHandler);
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
      vm.search.displayFolderView = false;
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
      document.querySelector('.search-results-panel .bookmark-list').firstElementChild.focus();
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
    var currentIndex, newIndex, elementToFocus;

    switch (true) {
      // Enter
      case (event.keyCode === 13):
        event.target.querySelector('.bookmark-content').click();
        break;
      // Up arrow
      case (event.keyCode === 38):
        if (event.target.previousElementSibling) {
          // Focus on previous result
          elementToFocus = event.target.previousElementSibling;
        }
        else {
          // Focus on search box
          elementToFocus = document.querySelector('input[name=txtSearch]');
        }
        break;
      // Down arrow
      case (event.keyCode === 40):
        if (event.target.nextElementSibling) {
          // Focus on next result
          elementToFocus = event.target.nextElementSibling;
        }
        break;
      // Page up
      case (event.keyCode === 33):
        // Focus on result 10 up from current
        currentIndex = _.indexOf(event.target.parentElement.children, event.target);
        newIndex = currentIndex - 10;
        if (newIndex < 0) {
          elementToFocus = event.target.parentElement.firstElementChild;
        }
        else {
          elementToFocus = event.target.parentElement.children[newIndex];
        }
        break;
      // Page down
      case (event.keyCode === 34):
        // Focus on result 10 down from current
        currentIndex = _.indexOf(event.target.parentElement.children, event.target);
        newIndex = currentIndex + 10;
        if (event.target.parentElement.children.length <= newIndex) {
          elementToFocus = event.target.parentElement.lastElementChild;
        }
        else {
          elementToFocus = event.target.parentElement.children[newIndex];
        }
        break;
      // Home
      case (event.keyCode === 36):
        // Focus on first result
        elementToFocus = event.target.parentElement.firstElementChild;
        break;
      // End
      case (event.keyCode === 35):
        // Focus on last result
        elementToFocus = event.target.parentElement.lastElementChild;
        break;
      // Backspace
      case (event.keyCode === 8):
      // Space
      case (event.keyCode === 32):
      // Numbers and letters
      case (event.keyCode > 47 && event.keyCode < 112):
        // Focus on search box
        elementToFocus = document.querySelector('input[name=txtSearch]');
        break;
    }

    if (elementToFocus) {
      event.preventDefault();
      elementToFocus.focus();
    }
  };

  var searchForm_SearchResults_Scroll = function () {
    if (vm.search.results && vm.search.results.length > 0 && vm.search.scrollDisplayMoreEnabled) {
      // Display next batch of results
      vm.search.resultsDisplayed += vm.search.batchResultsNum;
      vm.search.results = vm.search.results;
    }
  };

  var searchForm_SelectBookmark_Press = function (event, bookmarkId) {
    if (event) {
      if (event.preventDefault) { event.preventDefault(); }
      if (event.srcEvent) { event.srcEvent.stopPropagation(); }
    }

    // Display menu for selected bookmark
    vm.search.selectedBookmark = bookmarkId;
  };

  var searchForm_ShareBookmark_Click = function (event, bookmarkToShare) {
    if (event) {
      if (event.preventDefault) { event.preventDefault(); }
      if (event.srcEvent) { event.srcEvent.stopPropagation(); }
    }

    // Trigger native share functionality
    platform.Bookmarks.Share(bookmarkToShare);
  };

  var searchForm_ToggleBookmark_Click = function () {
    // Display bookmark panel
    changeView(vm.view.views.bookmark);
  };

  var searchForm_ToggleView_Click = function () {
    vm.search.displayFolderView = !vm.search.displayFolderView;
    displayDefaultSearchState()
      .then(function () {
        // Display default search results
        if (!vm.search.displayFolderView) {
          searchBookmarks();
        }

        // Focus on search box
        if (!utility.IsMobilePlatform(vm.platformName)) {
          document.querySelector('input[name=txtSearch]').focus();
        }
      });
  };

  var searchForm_UpdateBookmark_Click = function (event, bookmarkToUpdate) {
    if (event) {
      if (event.preventDefault) { event.preventDefault(); }
      if (event.srcEvent) { event.srcEvent.stopPropagation(); }
    }

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

  var setBookmarkStatus = function (isActive) {
    if (isActive !== undefined) {
      vm.bookmark.active = isActive;
      return $q.resolve();
    }

    return store.Get(globals.CacheKeys.SyncEnabled)
      .then(function (syncEnabled) {
        if (!syncEnabled) {
          return;
        }

        // If current page is a bookmark, actvate bookmark icon
        return bookmarks.FindCurrentUrlInBookmarks()
          .then(function (result) {
            vm.bookmark.active = !!result;
          })
          .catch(displayAlertErrorHandler);
      });
  };

  var setNewTabLinks = function () {
    var links = document.querySelectorAll('a.new-tab');
    for (var i = 0; i < links.length; i++) {
      var link = links[i];
      link.onclick = openUrl;
    }
  };

  var settings_Prefs_CheckForAppUpdates_Click = function () {
    // Update setting value and store in cache
    var value = !vm.settings.checkForAppUpdates;
    store.Set(globals.CacheKeys.CheckForAppUpdates, value);
  };

  var settings_Prefs_DisplaySearchBar_Click = function () {
    // Update setting value and store in cache
    var value = !vm.settings.displaySearchBarBeneathResults;
    store.Set(globals.CacheKeys.DisplaySearchBarBeneathResults, value);
  };

  var settings_Prefs_EnableDarkMode_Click = function () {
    // Update setting value and store in cache
    var value = !vm.settings.darkModeEnabled;
    store.Set(globals.CacheKeys.DarkModeEnabled, value);
  };

  var settings_Prefs_DefaultToFolderView_Click = function () {
    // Update setting value and store in cache
    var value = !vm.settings.defaultToFolderView;
    store.Set(globals.CacheKeys.DefaultToFolderView, value);
  };

  var startSyncing = function () {
    var syncData = {}, syncInfoMessage;

    // Display loading panel
    vm.login.displaySyncConfirmation = false;
    vm.login.displayOtherSyncsWarning = false;
    vm.login.displayUpgradeConfirmation = false;
    var loadingTimeout = platform.Interface.Working.Show();

    // Check service status
    api.CheckServiceStatus()
      .then(function () {
        // Clear the current cached password
        return store.Set(globals.CacheKeys.Password);
      })
      .then(function () {
        // If a sync ID has not been supplied, get a new one
        if (!vm.sync.id) {
          // Set sync type for create new sync
          syncData.type = globals.SyncType.Push;

          // Get new sync ID
          return api.CreateNewSync()
            .then(function (newSync) {
              syncInfoMessage = 'New sync id created: ' + newSync.id;

              // Add sync data to cache and return
              return $q.all([
                store.Set(globals.CacheKeys.LastUpdated, newSync.lastUpdated),
                store.Set(globals.CacheKeys.SyncId, newSync.id),
                store.Set(globals.CacheKeys.SyncVersion, newSync.version)
              ])
                .then(function () {
                  return newSync.id;
                });
            });
        }
        else {
          syncInfoMessage = 'Synced to existing id: ' + vm.sync.id;

          // Set sync type for retrieve existing sync
          syncData.type = globals.SyncType.Pull;

          // Retrieve sync version for existing id
          return api.GetBookmarksVersion(vm.sync.id)
            .then(function (response) {
              // If no sync version is set, confirm upgrade
              if (!response.version) {
                if (vm.login.upgradeConfirmed) {
                  syncData.type = globals.SyncType.Upgrade;
                }
                else {
                  vm.login.displayUpgradeConfirmation = true;
                  return;
                }
              }

              // Add sync version to cache and return current sync ID
              return $q.all([
                store.Set(globals.CacheKeys.SyncId, vm.sync.id),
                store.Set(globals.CacheKeys.SyncVersion, response.version)
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
            store.Set(globals.CacheKeys.Password, passwordHash);
            return queueSync(syncData);
          })
          .then(function () {
            utility.LogInfo(syncInfoMessage);
            return syncBookmarksSuccess(loadingTimeout);
          })
          .then(function () {
            vm.sync.enabled = true;
            vm.sync.id = syncId;
          })
          .catch(function (err) {
            return syncBookmarksFailed(err, syncData);
          });
      })
      .catch(function (err) {
        // Disable upgrade confirmed flag
        vm.login.upgradeConfirmed = false;

        // Display alert
        displayAlertErrorHandler(err);
      })
      .finally(function () {
        // Hide loading panel
        platform.Interface.Working.Hide(null, loadingTimeout);
      });
  };

  var syncBookmarksFailed = function (err, syncData) {
    // Disable upgrade confirmed flag
    vm.login.upgradeConfirmed = false;

    // Clear cached data
    var keys = [
      globals.CacheKeys.Bookmarks,
      globals.CacheKeys.Password,
      globals.CacheKeys.SyncVersion
    ];
    // If error occurred whilst creating new sync, remove cached sync ID and password
    if (syncData.type === globals.SyncType.Push) {
      keys.push(globals.CacheKeys.SyncId);
    }
    store.Set(keys);

    // If ID was removed disable sync and display login panel
    if (err && err.code === globals.ErrorCodes.SyncRemoved) {
      return changeView(vm.view.views.login)
        .finally(function () {
          // Display alert
          displayAlertErrorHandler(err);
        });
    }
    else {
      // Display alert
      displayAlertErrorHandler(err);

      // If creds were incorrect, focus on password field
      if (err.code === globals.ErrorCodes.InvalidCredentials &&
        !utility.IsMobilePlatform(vm.platformName)) {
        $timeout(function () {
          document.querySelector('.login-form-existing input[name="txtPassword"]').select();
        }, 150);
      }
    }
  };

  var syncBookmarksSuccess = function (loadingTimeout, bookmarkStatusActive) {
    // Hide loading panel
    platform.Interface.Working.Hide(null, loadingTimeout);

    // If initial sync, switch to search panel
    $timeout(function () {
      if (vm.view.current !== vm.view.views.search) {
        return changeView(vm.view.views.search);
      }
      else {
        vm.search.displayDefaultState();
      }
    }, 150);

    // Update bookmark icon
    return setBookmarkStatus(bookmarkStatusActive);
  };

  var syncForm_ConfirmPassword_Back_Click = function () {
    vm.login.displayPasswordConfirmation = false;
    vm.login.passwordConfirmation = null;
  };

  var syncForm_ConfirmPassword_Click = function () {
    vm.login.displayPasswordConfirmation = true;

    if (!utility.IsMobilePlatform(vm.platformName)) {
      $timeout(function () {
        document.querySelector('input[name="txtPasswordConfirmation"]').focus();
      }, 150);
    }
  };

  var syncForm_DisableSync_Click = function () {
    // Disable sync and switch to login panel
    $q.all([
      disableSync(),
      changeView(vm.view.views.login)
    ])
      .catch(displayAlertErrorHandler);
  };

  var syncForm_EnableSync_Click = function () {
    if (vm.sync.id) {
      // Display overwrite data confirmation panel
      vm.login.displaySyncConfirmation = true;
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
    vm.login.displayNewSyncPanel = false;
    vm.sync.password = '';

    if (!utility.IsMobilePlatform(vm.platformName)) {
      $timeout(function () {
        document.querySelector('input[name="txtId"]').focus();
      }, 150);
    }
  };

  var syncForm_ManualEntry_Click = function () {
    vm.login.displayGetSyncIdPanel = false;
  };

  var syncForm_NewSync_Click = function () {
    vm.login.displayNewSyncPanel = true;
    vm.login.displayPasswordConfirmation = false;
    store.Set(globals.CacheKeys.SyncId);
    store.Set(globals.CacheKeys.Password);
    vm.sync.id = null;
    vm.sync.password = '';
    vm.syncForm.txtId.$setValidity('InvalidSyncId', true);
    vm.login.passwordConfirmation = null;
    vm.login.passwordComplexity = {};

    if (!utility.IsMobilePlatform(vm.platformName)) {
      $timeout(function () {
        document.querySelector('.login-form-new input[name="txtPassword"]').focus();
      }, 150);
    }
  };

  var syncForm_OtherSyncsDisabled_Click = function () {
    // Hide disable other syncs warning panel and update cache setting
    vm.login.displayOtherSyncsWarning = false;
    store.Set(globals.CacheKeys.DisplayOtherSyncsWarning, false);

    // Focus on password field
    if (!utility.IsMobilePlatform(vm.platformName)) {
      $timeout(function () {
        document.querySelector('.active-login-form input[name="txtPassword"]').focus();
      }, 150);
    }
  };

  var syncForm_ShowPassword_Click = function () {
    // Toggle show password
    vm.login.showPassword = !vm.login.showPassword;
  };

  var syncForm_Submit_Click = function () {
    $timeout(function () {
      // Handle enter key press
      if (vm.login.displayUpdateServicePanel) {
        document.querySelector('.update-service-panel .btn-update-service-url').click();
      }
      else if (vm.login.displayNewSyncPanel) {
        if (vm.login.displayPasswordConfirmation) {
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
    if (!vm.sync.id || utility.SyncIdIsValid(vm.sync.id)) {
      vm.syncForm.txtId.$setValidity('InvalidSyncId', true);
      store.Set(globals.CacheKeys.SyncId, vm.sync.id);
    }
    else {
      vm.syncForm.txtId.$setValidity('InvalidSyncId', false);
    }
  };

  var syncForm_SyncUpdates_Click = function () {
    // Display loading panel
    var loadingTimeout = platform.Interface.Working.Show();

    // Pull updates
    queueSync({ type: globals.SyncType.Pull })
      .then(function () {
        return syncBookmarksSuccess(loadingTimeout);
      })
      .catch(displayAlertErrorHandler);
  };

  var syncForm_UpdateService_Cancel_Click = function () {
    vm.login.displayUpdateServiceConfirmation = false;
    vm.login.displayUpdateServicePanel = false;
  };

  var syncForm_UpdateService_Click = function () {
    // Reset view
    vm.sync.newService.url = vm.sync.service.url;
    vm.login.displayUpdateServiceConfirmation = false;
    vm.login.displayUpdateServicePanel = true;
    vm.login.validatingServiceUrl = false;

    // Validate service url
    syncForm_UpdateService_ServiceUrl_Validate()
      .finally(function () {
        // Focus on url field
        document.querySelector('.update-service-panel input').focus();
      });
  };

  var syncForm_UpdateService_Confirm_Click = function () {
    // Update saved credentials
    var url = vm.sync.newService.url.replace(/\/$/, '');
    return $q.all([
      updateServiceUrl(url),
      store.Set(globals.CacheKeys.SyncId),
      store.Set(globals.CacheKeys.Password)
    ])
      .then(function () {
        // Update view
        vm.login.displayUpdateServicePanel = false;
        vm.login.passwordComplexity = {};
        vm.login.passwordConfirmation = null;
        vm.sync.id = null;
        vm.sync.password = '';
        vm.syncForm.txtId.$setValidity('InvalidSyncId', true);
        vm.syncForm.$setPristine();
        vm.syncForm.$setUntouched();

        // Focus on first field
        if (!utility.IsMobilePlatform(vm.platformName)) {
          $timeout(function () {
            document.querySelector('.active-login-form input').focus();
          }, 150);
        }
      })
      .catch(function (err) {
        utility.LogError(err, 'app.syncForm_UpdateService_Update_Click');
      });
  };

  var syncForm_UpdateService_ServiceUrl_Change = function (event) {
    // Reset form if field is invalid
    if (vm.syncForm.newServiceUrl.$invalid) {
      vm.syncForm.newServiceUrl.$setValidity('InvalidService', true);
      vm.syncForm.newServiceUrl.$setValidity('RequestFailed', true);
      vm.syncForm.newServiceUrl.$setValidity('ServiceVersionNotSupported', true);
    }
  };

  var syncForm_UpdateService_ServiceUrl_Validate = function () {
    var timeout = $timeout(function () {
      vm.login.validatingServiceUrl = true;
    }, 150);

    // Check service url status
    var url = vm.sync.newService.url.replace(/\/$/, '');
    return api.CheckServiceStatus(url)
      .catch(function (err) {
        if (err && err.code != null) {
          switch (err.code) {
            case globals.ErrorCodes.ServiceOffline:
              // If API is offline still allow setting as current service
              return true;
            case globals.ErrorCodes.UnsupportedServiceApiVersion:
              vm.syncForm.newServiceUrl.$setValidity('ServiceVersionNotSupported', false);
              break;
            case globals.ErrorCodes.InvalidService:
              vm.syncForm.newServiceUrl.$setValidity('InvalidService', false);
              break;
            default:
              vm.syncForm.newServiceUrl.$setValidity('RequestFailed', false);
          }
        }
        else {
          vm.syncForm.newServiceUrl.$setValidity('RequestFailed', false);
        }

        // Focus on url field
        document.querySelector('input[name=newServiceUrl]').focus();
        return false;
      })
      .finally(function () {
        $timeout.cancel(timeout);
        $timeout(function () {
          vm.login.validatingServiceUrl = false;
        });
      });
  };

  var syncForm_UpdateService_Update_Click = function () {
    // Check for protocol
    if (vm.sync.newService.url && vm.sync.newService.url.trim() &&
      !(new RegExp(globals.URL.ProtocolRegex)).test(vm.sync.newService.url)) {
      vm.sync.newService.url = 'https://' + vm.sync.newService.url;
    }

    // Validate service url
    return syncForm_UpdateService_ServiceUrl_Validate()
      .then(function (newServiceInfo) {
        if (!newServiceInfo) {
          return;
        }

        // Retrieve new service status
        return refreshServiceStatus(vm.sync.newService, newServiceInfo)
          .then(function () {
            // Display confirmation panel
            vm.login.displayUpdateServiceConfirmation = true;

            // Focus on first button
            if (!utility.IsMobilePlatform(vm.platformName)) {
              $timeout(function () {
                document.querySelector('.update-service-panel .confirm .buttons > button').focus();
              }, 150);
            }
          });
      });
  };

  var syncForm_UpgradeSync_Click = function () {
    vm.login.upgradeConfirmed = true;
    startSyncing();
  };

  var settings_Prefs_SyncBookmarksToolbar_Click = function () {
    // If confirmation message is currently displayed, hide it and return
    if (vm.settings.displaySyncBookmarksToolbarConfirmation) {
      vm.settings.displaySyncBookmarksToolbarConfirmation = false;
      return;
    }

    $q.all([
      bookmarks.GetSyncBookmarksToolbar(),
      store.Get(globals.CacheKeys.SyncEnabled)
    ])
      .then(function (cachedData) {
        var syncBookmarksToolbar = cachedData[0];
        var syncEnabled = cachedData[1];

        // If sync not enabled or user just clicked to disable toolbar sync, update stored value and return
        if (!syncEnabled || syncBookmarksToolbar) {
          utility.LogInfo('Toolbar sync ' + (!syncBookmarksToolbar ? 'enabled' : 'disabled'));
          return store.Set(globals.CacheKeys.SyncBookmarksToolbar, !syncBookmarksToolbar);
        }

        // Otherwise, display sync confirmation
        vm.settings.displaySyncBookmarksToolbarConfirmation = true;
        $timeout(function () {
          document.querySelector('.btn-confirm-sync-toolbar').focus();
        });
      });
  };

  var settings_Prefs_SyncBookmarksToolbar_Cancel = function () {
    vm.settings.displaySyncBookmarksToolbarConfirmation = false;
    vm.settings.syncBookmarksToolbar = false;
  };

  var settings_Prefs_SyncBookmarksToolbar_Confirm = function () {
    var syncId;

    store.Get([
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
        platform.Interface.Working.Show();

        // Enable setting in cache
        return store.Set(globals.CacheKeys.SyncBookmarksToolbar, true);
      })
      .then(function () {
        utility.LogInfo('Toolbar sync enabled');

        // Queue sync with no callback action
        return queueSync({
          type: !syncId ? globals.SyncType.Push : globals.SyncType.Pull
        })
          .catch(displayAlertErrorHandler);
      });
  };

  var updatedPanel_Continue_Click = function () {
    store.Set(globals.CacheKeys.DisplayUpdated, false);
    vm.view.change(vm.view.views.support);
  };

  var updateServiceUrl = function (url) {
    url = url.replace(/\/$/, '');
    return store.Set(globals.CacheKeys.ServiceUrl, url)
      .then(function () {
        vm.sync.service.apiVersion = '';
        vm.sync.service.location = null;
        vm.sync.service.maxSyncSize = 0;
        vm.sync.service.message = '';
        vm.sync.service.status = null;
        vm.sync.service.url = url;
        utility.LogInfo('Service url changed to: ' + url);

        // Refresh service info
        refreshServiceStatus();
      })
      .catch(displayAlertErrorHandler);
  };

  var validateBackupData = function () {
    var xBookmarks, restoreData, validateData = false;

    if (!vm.settings.dataToRestore) {
      validateData = false;
    }

    // Check backup data structure
    try {
      restoreData = JSON.parse(vm.settings.dataToRestore);
      xBookmarks = restoreData.xBrowserSync ? restoreData.xBrowserSync.bookmarks :
        restoreData.xbrowsersync && restoreData.xbrowsersync.data ?
          restoreData.xbrowsersync.data.bookmarks : null;
      validateData = !!xBookmarks;
    }
    catch (err) { }
    vm.restoreForm.dataToRestore.$setValidity('InvalidData', validateData);

    return validateData;
  };

  var waitForSyncsToFinish = function () {
    var doActionUntil = function (currentData) {
      var currentSync = currentData[0];
      var syncQueueLength = currentData[1];
      return $q.resolve(currentSync == null && syncQueueLength === 0);
    };

    var action = function () {
      return $q(function (resolve, reject) {
        $timeout(function () {
          $q.all([
            platform.Sync.Current(),
            platform.Sync.GetQueueLength()
          ])
            .then(resolve)
            .catch(reject);
        }, 1e3);
      });
    };

    // Periodically check sync queue until it is empty
    return utility.PromiseWhile([], doActionUntil, action);
  };

  var workingPanel_Cancel_Click = function () {
    utility.LogInfo('Cancelling sync');

    return queueSync({
      type: globals.SyncType.Cancel
    })
      .then(function () {
        vm.sync.enabled = false;
        vm.working.displayCancelSyncButton = false;
      })
      .then(displayMainView)
      .catch(displayAlertErrorHandler);
  };

  // Call constructor
  return new BrowserAction();
};