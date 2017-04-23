var xBrowserSync = xBrowserSync || {};
xBrowserSync.App = xBrowserSync.App || {};

/* ------------------------------------------------------------------------------------
 * Class name:  xBrowserSync.App.PlatformImplementation 
 * Description: Implements xBrowserSync.App.Platform for web app.
 * ------------------------------------------------------------------------------------ */

xBrowserSync.App.PlatformImplementation = function($http, $interval, $q, $timeout, platform, globals, utility, bookmarks) {
	'use strict';

/* ------------------------------------------------------------------------------------
 * Platform variables
 * ------------------------------------------------------------------------------------ */

	var $scope, currentUrl, loadingId, moduleName = 'xBrowserSync.App.PlatformImplementation', vm;
	
	var constants = {
		"title": {
			"message": "xBrowserSync"
		},
		"description": {
			"message": "Browser syncing as it should be: secure, anonymous and free! Sync your bookmarks across your browsers and devices with xBrowserSync in one click, no sign up required."
		},
		"bookmarksToolbarTitle": {
			"message": "Bookmarks bar"
		},
		"bookmarksOtherTitle": {
			"message": "Other bookmarks"
		},
		"tooltipSyncEnabled": {
			"message": "sync enabled"
		},
		"tooltipWorking": {
			"message": "syncing..."
		},
		"button_Help_Label": {
			"message": "Display help"
		},
		"aboutPanel_Title" : {
			"message": "What's new in version"
		},
		"aboutPanel_WebsiteLink_Label" : {
			"message": "Website"
		},
		"aboutPanel_GitHubLink_Label" : {
			"message": "Git Hub Repos"
		},
		"aboutPanel_VersionHistoryLink_Label" : {
			"message": "Full release history"
		},
		"button_Next_Label": {
			"message": "Next"
		},
		"button_Previous_Label": {
			"message": "Previous"
		},
		"introPanel1_Message": {
			"message": "<h4>Welcome</h4><p>Thanks for using xBrowserSync &mdash; browser syncing as it should be: secure, anonymous and free!</p><p>Take some time to read through the following pages to get aquainted with xBrowserSync's features. Futher information is available in the <a href='https://www.xbrowsersync.org/#faqs' class='new-tab'>FAQs</a>.</p>"
		},
		"introPanel2_Message": {
			"message": "<h4>Your secret word</h4><p>To begin, enter a secret word or phrase that will be used to encrypt and decrypt your browser data.</p><p>Make it strong to protect your data but also memorable, if you forget it we can't remind you and you won't be able to decrypt your data without it.</p>"
		},
		"introPanel3_Message": {
			"message": "<h4>Syncing for the first time</h4><p>Once you've entered your secret word or phrase, you are ready to create a new sync. Just click the Sync button and your browser data will be encrypted before being synced to the xBrowserSync service.</p><p>And that's it! Any future changes will be synced automatically in the background.</p>"
		},
		"introPanel4_Message": {
			"message": "<h4>Your xBrowserSync ID</h4><p>When you create a new sync you are given a new xBrowserSync ID (find it in the Settings panel), which you can use along with your secret word or phrase to enable syncing of your data on a different device.</p><p>If you've already created a sync using the xBrowserSync browser extension, tap the camera icon to scan the QR code to get your existing sync ID.</p>"
		},
		"introPanel5_Message": {
			"message": "<h4>Syncing to another service</h4><p>By default your data is synced to the official xBrowserSync service, though anyone can <a href='https://github.com/xBrowserSync/API' class='new-tab'>run their own xBrowserSync service</a>, either for private use (for ultimate security and privacy) or to make available for public use so that more people can enjoy xBrowserSync.</p><p>Check the available <a href='https://www.xbrowsersync.org/#status' class='new-tab'>xBrowserSync services</a> and switch your active service in the Settings panel.</p>"
		},
		"introPanel6_Message": {
			"message": "<h4>New service, new ID</h4><p>IDs are service-specific. When you create a sync with a service, the xBrowserSync ID you are given can only be used with that service.</p><p>Whenever you change services you must create a new sync, you'll then receive a new ID for use with that service (you can then restore your backed-up data after creating the new sync).</p>"
		},
		"introPanel7_Message": {
			"message": "<h4>Searching your bookmarks</h4><p>Your bookmarks are displayed with the most recent showing first. To search your bookmarks, simply enter some keywords or a URL and the list will be filtered to display only those bookmarks that are relevant to your query.</p><p>You can also share, modify or delete bookmarks from the search results by long pressing on a search result.</p>"
		},
		"introPanel8_Message": {
			"message": "<h4>Adding a bookmark</h4><p>You can add a new bookmark by either sharing a URL to the xBrowserSync app from your favourite browser app, or by clicking on the bookmark icon above the search box to add a bookmark manually.</p><p>When sharing a bookmark, the title, description and tags will be populated for you automatically, otherwise a description and tags to help find the bookmark more easily when searching.</p>"
		},
		"introPanel9_Message": {
			"message": "<h4>Bookmark from your browser</h4><p>In order to add bookmarks directly from your browser, you will first need to enable sharing to xBrowserSync.</p><p>In your browser app, tap the share button to bring up the share sheet, slide to the right and tap the More option. Enable the xBrowserSync activity and tap Done to save your changes. From now on you can tap xBrowserSync on the share sheet to add the current webpage to xBrowserSync.</p>"
		},
		"introPanel10_Message": {
			"message": "<h4>Remember to back up</h4><p>xBrowserSync services are run voluntarily, plus servers can break and go wrong so please look after your data and make sure to keep backups.</p><p>Open the Settings panel and in the Back up and restore tab you can back up your unencrypted synced data to a local file, which can then restored at a later date should you need to.</p>"
		},
		"introPanel11_Message": {
			"message": "<h4>Got desktop?</h4><p>Sync your xBrowserSync data with your desktop browser using the xBrowserSync browser extension, available for Chrome and with Firefox support coming soon.</p>"
		},
		"introPanel12_Message": {
			"message": ""
		},
		"introPanel13_Message": {
			"message": "<h4>Noticed an issue?</h4><p>If you've found a bug in xBrowserSync or would like to request a new feature, head on over to Git Hub and <a href='https://github.com/xBrowserSync/App/issues' class='new-tab'>submit an issue</a>.</p><p>Calling all coders! If you would like to help make xBrowserSync better, go ahead and fork the <a href='https://github.com/xBrowserSync/App' class='new-tab'>xBrowserSync Git Hub repo</a> and submit a pull request.</p>"
		},
		"button_About_Label": {
			"message": "About"
		},
		"button_Settings_Label": {
			"message": "Settings"
		},
		"button_AddBookmark_Label": {
			"message": "Add bookmark"
		},
		"button_DeleteBookmark_Label": {
			"message": "Delete bookmark"
		},
		"button_EditBookmark_Label": {
			"message": "Edit bookmark"
		},
		"button_ShareBookmark_Label": {
			"message": "Share bookmark"
		},
		"field_ClientSecret_Label": {
			"message": "Secret"
		},
		"field_ClientSecret_Description": {
			"message": "Your secret word or phrase"
		},
		"field_Id_Label": {
			"message": "ID"
		},
		"field_Id_Description": {
			"message": "Your xBrowserSync ID (optional)"
		},
		"button_ScanCode_Label": {
			"message": "Scan your xBrowserSync ID"
		},
		"button_Sync_Enable_Label": {
			"message": "Sync"
		},
		"button_Sync_Disable_Label": {
			"message": "Disable Sync"
		},
		"confirmSync_Title" : {
			"message":  "Create new sync?"
		},
		"confirmSync_Message" : {
			"message":  "No xBrowserSync ID has been provided so a new sync will be created for you. OK to proceed?"
		},
		"button_Confirm_Label" : {
			"message":  "Yes"
		},
		"button_Deny_Label" : {
			"message":  "No"
		},
		"field_Search_Description" : {
			"message":  "Find a bookmark"
		},
		"noBookmarks_Message" : {
			"message":  "You currently have no bookmarks to display.<br/><br/>Start adding bookmarks easily by sharing web pages from your favourite browser app."
		},
		"noSearchResults_Message" : {
			"message":  "No bookmarks found"
		},
		"shareBookmark_Prompt": {
			"message":  "Share bookmark with"
		},
		"shareBookmark_Title": {
			"message":  "shared via xBrowserSync"
		},
		"syncBookmarksToolbarConfirmation_Message": {
			"message":  "<p>Enabling syncing of the bookmarks bar will replace the bookmarks currently in the bookmarks bar with your synced bookmarks. OK to proceed?</p>"
		},
		"cancelSyncConfirmation_Message": {
			"message":  "<p>There is currently a sync in progress, if you proceed your local synced data will be incomplete. OK to proceed?</p>"
		},
		"serviceStatus_Label" : {
			"message":  "Service"
		},
		"serviceStatus_NoNewSyncs" : {
			"message":  "Online but not accepting new syncs"
		},
		"serviceStatus_Online" : {
			"message":  "Online"
		},
		"serviceStatus_Offline" : {
			"message":  "Offline"
		},
		"button_UpdateServiceUrl_Label" : {
			"message":  "Change Service"
		},
		"updateServiceUrlForm_Message" : {
			"message":  "Enter the URL of an alternative xBrowserSync service. You can check the list of public xBrowserSync services <a href='https://www.xbrowsersync.org/#status' class='new-tab'>here</a>."
		},
		"updateServiceUrlForm_Placeholder" : {
			"message":  "xBrowserSync service URL"
		},
		"button_UpdateServiceUrl_Submit_Label" : {
			"message":  "Update"
		},
		"button_Cancel_Label" : {
			"message":  "Cancel"
		},
		"confirmUpdateServiceUrl_Message": {
			"message":  "<p>After changing the service, the current sync will be disabled and you'll need to create a new sync.</p><p>If you have previously created a sync using this service and would like to retrieve your data, you can use the xBrowserSync ID provided at the time. OK to proceed?</p>"
		},
		"backupRestore_Title" : {
			"message":  "Back up and restore"
		},
		"backupRestore_Message" : {
			"message":  "<p>Back up your xBrowserSync data or restore from a previous backup.</p>"
		},
		"backupRestore_NotSynced_Message": {
			"message": "<p>Back up and restore will be available here once you are synced.</p>"
		},
		"button_Backup_Label" : {
			"message":  "Back Up"
		},
		"button_Restore_Label" : {
			"message":  "Restore"
		},
		"button_Done_Label" : {
			"message":  "Done"
		},
		"button_Clear_Label" : {
			"message":  "Clear"
		},
		"button_Close_Label" : {
			"message":  "Close"
		},
		"button_Back_Label" : {
			"message":  "Back"
		},
		"backupSuccess_Message" : {
			"message":  ""
		},
		"backupSuccess_Android_Message" : {
			"message":  "Your synced data has been unencrypted and saved to {fileName} in the xBrowserSync folder on external storage root (if available, otherwise check internal storage)."
		},
		"backupSuccess_IOS_Message" : {
			"message":  "Your synced data has been unencrypted and saved to {fileName} in the xBrowserSync folder in Documents."
		},
		"restoreSuccess_Message" : {
			"message":  "Your data has been restored."
		},
		"restoreForm_Message" : {
			"message":  "Select an xBrowserSync backup file to restore."
		},
		"dataToRestore_Label" : {
			"message":  "Paste backup data"
		},
		"button_SelectBackupFile_Label" : {
			"message":  "Select File"
		},
		"button_RestoreData_Label" : {
			"message":  "Restore Data"
		},
		"button_RestoreData_Invalid_Label" : {
			"message":  "Invalid Data"
		},
		"button_RestoreData_Ready_Label" : {
			"message":  "Ready to Restore"
		},
		"syncPanel_Title" : {
			"message":  "Sync"
		},
		"syncPanel_Message" : {
			"message":  "<p>Sync settings will be available here once you are synced.</p>"
		},
		"syncPanel_Id_Label" : {
			"message":  "Your xBrowserSync ID"
		},
		"syncPanel_DisplayQRCode_Label" : {
			"message":  "Display QR code"
		},
		"syncPanel_DisplayDataUsage_Label" : {
			"message": "Data Usage"
		},
		"syncPanel_DisplaySyncOptions_Label" : {
			"message": "Sync Options"
		},
		"syncPanel_SyncBookmarksToolbar_Label" : {
			"message":  "Include bookmarks bar"
		},
		"syncDataUsagePanel_Message" : {
			"message":  "Current sync data usage"
		},
		"confirmRestore_Sync_Message" : {
			"message":  "The data being restored will overwrite your synced data. OK to proceed?"
		},
		"confirmRestore_NoSync_Message" : {
			"message":  "As sync is currently disabled, the data being restored will overwrite the local browser data. OK to proceed?"
		},
		"bookmarkPanel_Title_Add" : {
			"message":  "Add bookmark"
		},
		"bookmarkPanel_Title_Edit" : {
			"message":  "Edit bookmark"
		},
		"bookmarkPanel_Field_Title_Label": {
			"message": "Title"
		},
		"bookmarkPanel_Field_Url_Label": {
			"message": "URL"
		},
		"bookmarkPanel_Field_Description_Label": {
			"message": "Description"
		},
		"bookmarkPanel_Field_Tags_Label": {
			"message": "Tags"
		},
		"bookmarkPanel_Field_Tags_Placeholder": {
			"message": "tag 1, tag 2, tag 3, etc..."
		},
		"bookmarkPanel_Button_AddTags_Label": {
			"message": "Add"
		},
		"bookmarkPanel_Button_RemoveTag_Label": {
			"message": "Remove tag"
		},
		"bookmarkPanel_Button_AddBookmark_Label": {
			"message": "Add Bookmark"
		},
		"bookmarkPanel_Button_DeleteBookmark_Label": {
			"message": "Delete"
		},
		"bookmarkPanel_Button_ShareBookmark_Label": {
			"message": "Share"
		},
		"bookmarkPanel_Button_UpdateBookmark_Label": {
			"message": "Update"
		},
		"working_Title" : {
			"message":  "Working on it..."
		},
		"working_Message" : {
			"message":  "Don't close the window yet."
		},
		"connRestored_Title" : {
			"message":  "Connection restored"
		},
		"connRestored_Message" : {
			"message":  "Your xBrowserSync changes have been synced."
		},
		"getPageMetadata_Message" : {
			"message":  "Retrieving bookmark metadata, touch to cancel."
		},
		"error_Default_Title" : {
			"message":  "Something went wrong"
		},
		"error_Default_Message" : {
			"message":  "If this problem recurs, submit an issue at github.com/xBrowserSync/App."
		},
		"error_HttpRequestFailed_Title" : {
			"message":  "Connection lost"
		},
		"error_HttpRequestFailed_Message" : {
			"message":  "Couldn't connect to the xBrowserSync service, check the service status in the Settings panel."
		},
		"error_HttpRequestFailedWhileUpdating_Title" : {
			"message":  "Connection lost"
		},
		"error_HttpRequestFailedWhileUpdating_Message" : {
			"message":  "Your sync will be retried automatically when connection is restored."
		},
		"error_TooManyRequests_Title" : {
			"message":  "Slow down"
		},
		"error_TooManyRequests_Message" : {
			"message":  "Too many requests sent, sync has been disabled. Re-enable sync to resume syncing."
		},
		"error_RequestEntityTooLarge_Title" : {
			"message":  "Sync data limit exceeded"
		},
		"error_RequestEntityTooLarge_Message" : {
			"message":  "Unable to sync your data as it exceeds the size limit set by the xBrowserSync service. Remove some old bookmarks and try again or switch to a different xBrowserSync service that allows for larger syncs."
		},
		"error_NotAcceptingNewSyncs_Title" : {
			"message":  "Service not accepting new syncs"
		},
		"error_NotAcceptingNewSyncs_Message" : {
			"message":  "Unable to sync as this xBrowserSync service is not currently accepting new syncs. If you have already created a sync using this service enter your xBrowserSync ID, or change to an alternative service."
		},
		"error_DailyNewSyncLimitReached_Title" : {
			"message":  "Daily new sync limit reached"
		},
		"error_DailyNewSyncLimitReached_Message" : {
			"message":  "Unable to create new sync as you have reached your daily new sync limit for this xBrowserSync service. Sync with an existing xBrowserSync ID, choose a different service or try again tomorrow."
		},
		"error_MissingClientData_Title" : {
			"message":  "Missing xBrowserSync ID or secret"
		},
		"error_MissingClientData_Message" : {
			"message":  "Re-enable sync and try again."
		},
		"error_NoDataFound_Title" : {
			"message":  "No data found"
		},
		"error_NoDataFound_Message" : {
			"message":  "Double check your xBrowserSync ID and secret and try again."
		},
		"error_IdRemoved_Title" : {
			"message":  "Data removed due to inactivity"
		},
		"error_IdRemoved_Message" : {
			"message":  "Create a new ID and restore your data from a backup."
		},
		"error_NoDataToRestore_Title" : {
			"message":  "No data to restore"
		},
		"error_NoDataToRestore_Message" : {
			"message":  "Ensure you have provided a valid xBrowserSync back up before restoring."
		},
		"error_FailedGetLocalBookmarks_Title" : {
			"message":  "Couldn't get local bookmarks"
		},
		"error_FailedGetLocalBookmarks_Message" : {
			"message":  "An error occurred when trying to retrieve local bookmarks."
		},
		"error_FailedCreateLocalBookmarks_Title" : {
			"message":  "Couldn't create bookmarks"
		},
		"error_FailedCreateLocalBookmarks_Message" : {
			"message":  "An error occurred when trying to create a local bookmark."
		},
		"error_FailedRemoveLocalBookmarks_Title" : {
			"message":  "Couldn't overwrite bookmark"
		},
		"error_FailedRemoveLocalBookmarks_Message" : {
			"message":  "An error occurred when trying to overwrite local bookmarks."
		},
		"error_InvalidData_Title" : {
			"message":  "Couldn't decrypt xBrowserSync data"
		},
		"error_InvalidData_Message" : {
			"message":  "Ensure your secret is identical to the one used when you created the sync for this ID."
		},
		"error_LastChangeNotSynced_Title" : {
			"message":  "Last change not synced"
		},
		"error_LastChangeNotSynced_Message" : {
			"message":  "The last change was not synced due to a bookmarks conflict. It would be a good idea to disable and re-enable sync before continuing."
		},
		"error_BookmarkNotFound_Title" : {
			"message":  "Bookmark not found"
		},
		"error_BookmarkNotFound_Message" : {
			"message":  "It looks like your bookmarks are out of sync. It would be a good idea to disable and re-enable sync before continuing."
		},
		"error_OutOfSync_Title" : {
			"message":  "Data out of sync"
		},
		"error_OutOfSync_Message" : {
			"message":  "Local data was out of sync but has now been refreshed. However, your last change was not synced so you will need to redo this change."
		},
		"error_ContainerChanged_Title" : {
			"message": "xBrowserSync folder changed"
		},
		"error_ContainerChanged_Message" : {
			"message": "Changing, deleting or moving xBrowserSync application folders can cause issues, sync has been disabled. Re-enable sync to restore bookmarks."
		},
		"error_BrowserImportBookmarksNotSupported_Title" : {
			"message":  "Importing not supported"
		},
		"error_BrowserImportBookmarksNotSupported_Message" : {
			"message":  "Browser import bookmarks functionality is not supported in xBrowserSync. Create a new sync to sync your newly imported bookmarks."
		},
		"error_NotImplemented_Title" : {
			"message":  "Function not implemented"
		},
		"error_NotImplemented_Message" : {
			"message":  "A required function has not been implemented and is causing xBrowserSync to not function correctly."
		},
		"error_FailedGetPageMetadata_Title" : {
			"message":  "Couldn't retrieve bookmark metadata"
		},
		"error_FailedGetPageMetadata_Message" : {
			"message":  "Try sharing the URL again or enter metadata manually."
		},
		"error_SyncInterrupted_Title" : {
			"message":  "Sync interrupted"
		},
		"error_SyncInterrupted_Message" : {
			"message":  "A previous sync was interrupted and failed to complete. Re-enable sync to restore your synced data."
		},
		"error_ScanFailed_Title" : {
			"message":  "Scan failed"
		},
		"error_ShareFailed_Title" : {
			"message":  "Share failed"
		},
		"error_FailedBackupData_Title" : {
			"message":  "Backup failed"
		},
		"error_InvalidUrlScheme_Title": {
			"message":  "Only URLs can be shared to xBrowserSync"
		}
	};


/* ------------------------------------------------------------------------------------
 * Constructor
 * ------------------------------------------------------------------------------------ */
    
	var MobileAppsImplementation = function() {
		// Inject required platform implementation functions
		platform.BackupData = backupData;
		platform.Bookmarks.Clear = clearBookmarks;
		platform.Bookmarks.Get = getBookmarks;
		platform.Bookmarks.Populate = populateBookmarks;
		platform.Bookmarks.Share = shareBookmark;
		platform.GetConstant = getConstant;
        platform.GetCurrentUrl = getCurrentUrl;
		platform.GetPageMetadata = getPageMetadata;
		platform.Init = init;
        platform.Interface.Loading.Show = displayLoading;
		platform.Interface.Loading.Hide = hideLoading;
		platform.Interface.Refresh = refreshInterface;
		platform.LocalStorage.Get = getFromLocalStorage;
		platform.LocalStorage.Set = setInLocalStorage;
		platform.OpenUrl = openUrl;
		platform.ScanID = scanId;
		platform.SelectFile = selectBackupFile;
		platform.Sync = sync;
	};


/* ------------------------------------------------------------------------------------
 * Public functions
 * ------------------------------------------------------------------------------------ */
	
	var backupData = function() {
		var deferred = $q.defer();
		
		// Export bookmarks
		bookmarks.Export()
            .then(function(data) {
				var date = new Date();
				var minute = ('0' + date.getMinutes()).slice(-2);
				var hour = ('0' + date.getHours()).slice(-2);
				var day = ('0' + date.getDate()).slice(-2);
				var month = ('0' + (date.getMonth() + 1)).slice(-2);
				var year = date.getFullYear();
				var dateString = year + month + day + hour + minute;
				var fileName = 'xBrowserSyncBackup_' + dateString + '.txt';

				var onError = function() {
					return deferred.reject({ code: globals.ErrorCodes.FailedBackupData });
				};
				
				// Get/Create xBrowserSync dir in persistent storage location and save export file
				window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, function (fs) { 
					fs.root.getDirectory('xBrowserSync', { create: true }, function (dirEntry) {
						dirEntry.getFile(fileName, { create: true }, function (fileEntry) {
							fileEntry.createWriter(function (fileWriter) {
								// Save export file
								fileWriter.write(JSON.stringify(data));
								
								fileWriter.onwriteend = function() {
									// Display message
									var platformStr = (vm.platformName === globals.Platforms.IOS) ? 
										constants.backupSuccess_IOS_Message : 
										constants.backupSuccess_Android_Message;
									var message = platformStr.message.replace(
										'{fileName}',
										fileEntry.name);
									
									$scope.$apply(function() {
										vm.settings.backupRestoreResult = message;
									});

									return deferred.resolve();
								};
								
								fileWriter.onerror = onError;
							},
							onError);
						},
						onError);
					},
					onError);
				},
				onError);
			});
		
		return deferred.promise;
	};
	
	var clearBookmarks = function() {
		return $q.resolve();
	};

	var displayLoading = function(id, deferred) {
		// Return if loading overlay already displayed
		if (!!loadingId) {
			return;
		}
		
		switch (id) {
			// Loading bookmark metadata, display cancellable overlay
			case 'retrievingMetadata':
				$timeout(function() {
					SpinnerDialog.show(null, platform.GetConstant(globals.Constants.GetPageMetadata_Message), function () {
						deferred.resolve({ url: currentUrl });
					});
				}, 500);
				break;
			// Display default overlay
			default:
				$timeout(function() {
					SpinnerPlugin.activityStart(getConstant(globals.Constants.Working_Title), { dimBackground: true });
				});
				break;
		}

		loadingId = id;
	};

	var getBookmarks = function() {
		return $q.resolve();
	};
	
	var getConstant = function(constName) {
		return constants[constName].message;
	};
	
	var getCurrentUrl = function() {
        return $q.resolve(currentUrl);
    };
    
    var getFromLocalStorage = function(itemName) {
		return localStorage.getItem(itemName);
	};
    
    var getPageMetadata = function(deferred) {
		// If current url not set, return with default url
		if (!currentUrl) {
			return $q.resolve({ url: 'http://' });
		}

		// If current url is not valid, return with default url
		var matches = currentUrl.match(/^https?:\/\/\w+/i);    
		if (!matches || matches.length <= 0) {
			return $q.resolve({ url: 'http://' });
		}
		
		// Otherwise get metadata for current url
        var metadata = {
			title: null,
			url: currentUrl,
			description: null,
			tags: null
		};

		var callback = function(pageContent, err) {
			// Close InAppBrowser
			inAppBrowser.close();
			inAppBrowser = null;
			
			// Check html content was returned
			if (!!err || !pageContent) {
				// Log error
				utility.LogMessage(
					moduleName, 'getPageMetadata', utility.LogType.Error,
					JSON.stringify(err));
				
				var errObj = { code: globals.ErrorCodes.FailedGetPageMetadata, url: currentUrl };

				// Reset current url
				currentUrl = null;
				
				return deferred.reject(errObj);
			}

			// Reset current url
			currentUrl = null;

			var parser, html, title, description, tagElements, tags;

			// Extract metadata properties
			parser = new DOMParser();
			html = parser.parseFromString(pageContent, 'text/html');

			// Get all meta tags
			var metaTagsArr = html.getElementsByTagName('meta');

			// Get page title
			title = _.find(metaTagsArr, function(tag) { 
				return (!!tag.getAttribute('property') && tag.getAttribute('property').toUpperCase() === 'OG:TITLE' && !!tag.getAttribute('content')) || 
					   (!!tag.getAttribute('name') && tag.getAttribute('name').toUpperCase() === 'TWITTER:TITLE' && !!tag.getAttribute('content')); 
			}); 
			
			if (!!title) {
				metadata.title = title.getAttribute('content');
			} 
			else { 
				metadata.title = html.title || '';
			} 

			// Get page description
			description = _.find(metaTagsArr, function(tag) { 
				return (!!tag.getAttribute('property') && tag.getAttribute('property').toUpperCase() === 'OG:DESCRIPTION' && !!tag.getAttribute('content')) ||
					   (!!tag.getAttribute('name') && tag.getAttribute('name').toUpperCase() === 'TWITTER:DESCRIPTION' && !!tag.getAttribute('content')) ||
					   (!!tag.getAttribute('name') && tag.getAttribute('name').toUpperCase() === 'DESCRIPTION' && !!tag.getAttribute('content'));
			});

			if (!!description) {
				metadata.description = utility.StripTags(description.getAttribute('content'));
			}

			// Get page tags
			tagElements = _.filter(metaTagsArr, function(tag) { 
				return !!tag.getAttribute('property') && 
					   !!tag.getAttribute('property').match(/video\:tag$/i) &&
					   !!tag.getAttribute('content');
			}); 

			if (!!tagElements && tagElements.length > 0) {
				tags = '';
				
				for (var i = 0; i < tagElements.length; i++) {
					tags += tagElements[i].getAttribute('content') + ',';
				}

				metadata.tags = tags;
			}

			// Get meta tag values
			tagElements = _.find(metaTagsArr, function(tag) { 
				return !!tag.getAttribute('name') && 
					   tag.getAttribute('name').toUpperCase() === 'KEYWORDS' &&
					   !!tag.getAttribute('content');
			}); 

			if (!!tagElements) {
				metadata.tags = tagElements.getAttribute('content');
			}

			// Return metadata
			deferred.resolve(metadata);
		};

		deferred = deferred || $q.defer();
		var inAppBrowser = cordova.InAppBrowser.open(currentUrl, '_blank', 'location=yes,hidden=yes');

		inAppBrowser.addEventListener('loaderror', function(err) {
			if (!!err && !!err.code && err.code === -999) {
				return;
			}
			
			callback(null, err);
		});
		
		inAppBrowser.addEventListener('loadstop', function() {
			// Remove invasive content and return doc html
			inAppBrowser.executeScript({
				code: 
					"(function() { var elements = document.querySelectorAll('video,script'); for (var i = 0; i < elements.length; i++) { elements[i].parentNode.removeChild(elements[i]); } })();" +
					"document.querySelector('html').outerHTML;"
			},
			callback);
		});

		// Time out metadata load after 10 secs
		$timeout(function() {
			if (deferred.promise.$$state.status === 0) {
				callback(null, 'Timed out retrieving page metadata.');
			}
		}, 10000);

		return deferred.promise;
    };

	var hideLoading = function(id) {
		// Hide loading panels if supplied if matches current
		if (!loadingId || id === loadingId) {
			SpinnerPlugin.activityStop();
			SpinnerDialog.hide();

			loadingId = null;
		}
	};

	var init = function(viewModel, scope) {
		// Set global variables
		vm = viewModel;
		$scope = scope;

		// Set window height
		var e = window;
		var a = 'inner';
		if (!('innerWidth' in window))
		{
			a = 'client';
			e = document.documentElement || document.body;
		}
		document.querySelector('html').style.height = e[a + 'Height'] + 'px';
		document.querySelector('.background').style.height = e[a + 'Height'] + 'px';

		// Load cordova.js
		var script = document.createElement('script');
		script.src = 'cordova.js';
		script.onload = function() {
            // Bind to device events
			document.addEventListener('deviceready', deviceReady, false);
			document.addEventListener('resume', resume, false);
        };
		document.getElementsByTagName('head')[0].appendChild(script);

		// Set async channel to view model
		vm.sync.asyncChannel = vm;

		// Set required events to mobile app handlers
		vm.events.bookmarkPanel_Close_Click = bookmarkPanel_Close_Click;
		vm.events.introPanel11_Next_Click = introPanel11_Next_Click;
		vm.events.introPanel13_Prev_Click = introPanel13_Prev_Click;
		vm.events.syncForm_EnableSync_Click = syncForm_EnableSync_Click;

		// Set clear search button to display all bookmarks
		vm.search.displayDefaultState = displayDefaultSearchState;

		// Set backup file change event
		document.getElementById('backupFile').addEventListener('change', backupFile_Change, false);

		// Increase search results timeout to avoid display lag
		vm.settings.getSearchResultsDelay = 500;

		// Attach event handler for iOS Share activity
		window.handleOpenURL = handleSharedIosUrl;
	};

	var openUrl = function(url) {
		cordova.InAppBrowser.open(url, '_system');
	};
	
	var populateBookmarks = function(xBookmarks) {
		return $q.resolve();
	};
	
	var refreshInterface = function() {
	};
	
	var setInLocalStorage = function(itemName, itemValue) {
		localStorage.setItem(itemName, itemValue);
	};

    var scanId = function() {
        var options = {
			'preferFrontCamera': false, 
			'showFlipCameraButton': false, 
			'prompt': getConstant(vm.globals.Constants.Button_ScanCode_Label), 
			'formats': 'QR_CODE' 
		};

		var onSuccess = function (result) {
			// Set result as id
			if (!!result && !!result.text) {
				$scope.$apply(function() {
					vm.settings.id(result.text);
				});
			}
		};

		var onError = function (err) {
			// Display alert
			var errMessage = utility.GetErrorMessageFromException({ code: globals.ErrorCodes.FailedScanID });
			vm.alert.display(errMessage.title, err);
		};
		
		// Activate barcode scanner
		cordova.plugins.barcodeScanner.scan(onSuccess, onError, options);
    };

    var selectBackupFile = function() {
		// Open file dialog
		document.querySelector('#backupFile').click();
    };

    var shareBookmark = function(bookmark) {
        var options = {
			subject: bookmark.title + ' (' + getConstant(vm.globals.Constants.ShareBookmark_Title) + ')', 
			url: bookmark.url,
			chooserTitle: getConstant(vm.globals.Constants.ShareBookmark_Prompt)
		};
			
		var onError = function(err) {
			// Display alert
			var errMessage = utility.GetErrorMessageFromException({ code: globals.ErrorCodes.FailedShareBookmark });
			vm.alert.display(errMessage.title, err);
		};
		
		// Display share sheet
		window.plugins.socialsharing.shareWithOptions(options, null, onError);
    };
	
	var sync = function(vm, syncData, command) {
		syncData.command = (!!command) ? command : globals.Commands.SyncBookmarks;

		// Start sync
		return bookmarks.Sync(syncData)
			.then(function(initialSyncFailed) {
				// Reset network disconnected flag
				globals.Network.Disconnected.Set(false);

				// If this sync initially failed, alert the user and refresh search results
				if (!!initialSyncFailed) {
					vm.alert.display(platform.GetConstant(globals.Constants.ConnRestored_Title), platform.GetConstant(globals.Constants.ConnRestored_Message));

					// Update search results if currently on the search panel and no query present
					if (vm.view.current === vm.view.views.search && !vm.search.query) {
						displayDefaultSearchState();
					}
				}
				
				vm.events.handleSyncResponse({ command: syncData.command, success: true, syncData: syncData });
			})
			.catch(function(err) {
				// Log error
				utility.LogMessage(
					moduleName, 'sync', utility.LogType.Error,
					JSON.stringify(err));
				utility.LogMessage(
					moduleName, 'sync', utility.LogType.Info,
					'syncData: ' + JSON.stringify(syncData));
				
				// Don't display another alert if sync retry failed
				if (!syncData.changeInfo && err.code === globals.ErrorCodes.HttpRequestFailedWhileUpdating) {
					return;
				}
					
				vm.events.handleSyncResponse({ command: syncData.command, success: false, error: err });
			});
	};


/* ------------------------------------------------------------------------------------
 * Private functions
 * ------------------------------------------------------------------------------------ */

	var backupFile_Change = function(event) {
		var fileInput = document.getElementById('backupFile');
		
		if (fileInput.files.length > 0) {
            var file = fileInput.files[0];
            vm.settings.backupFileName = file.name;
            var reader = new FileReader();

            reader.onload = (function(data) {
                return function(event) {
                    $scope.$apply(function() {
                        vm.settings.dataToRestore = event.target.result;
                    });
                };
            })(file);

            // Read the backup file data
            reader.readAsText(file);
        }
    };

	var bookmarkPanel_Close_Click = function() {
        // Reset current url before switching to main view
		currentUrl = null;
		vm.view.displayMainView();
    };

	var checkForInterruptedSync = function () {
		// Check if a sync was interrupted
		if (!!globals.IsSyncing.Get()) {
			globals.IsSyncing.Set(false);
			
			// Disable sync
			globals.SyncEnabled.Set(false);

			// Display login panel
			vm.view.displayMainView();
			
			// Display alert
			vm.alert.display(
				getConstant(globals.Constants.Error_SyncInterrupted_Title), 
				getConstant(globals.Constants.Error_SyncInterrupted_Message));
            
            return true;
		}

		return false;
	};

	var checkForSharedUrl = function(data) {
		var deferred = $q.defer();
		
		if (vm.platformName === vm.globals.Platforms.Android) {
			// If there is a current intent, retrieve it
			window.plugins.webintent.hasExtra(window.plugins.webintent.EXTRA_TEXT,
				function(has) {
					if (!!has) {
						// Only use the intent if sync is enabled
						if (!!globals.SyncEnabled.Get()) {
							window.plugins.webintent.getExtra(window.plugins.webintent.EXTRA_TEXT,
								function(url) {
									// Remove the intent
									window.plugins.webintent.removeExtra(window.plugins.webintent.EXTRA_TEXT);

									// Return the shared url
									return deferred.resolve(url);
								});
						}
						else {
							// Can't use it so remove the intent
							window.plugins.webintent.removeExtra(window.plugins.webintent.EXTRA_TEXT);
							deferred.resolve();
						}
					}
					else {
						deferred.resolve();
					}
				}
			);
		}
		else if (vm.platformName === vm.globals.Platforms.IOS) {
			// If current url is set, return it
			if (!!currentUrl) {
				deferred.resolve(currentUrl);
			}
			else {
				deferred.resolve();
			}
		}
		else {
			deferred.resolve();
		}

		return deferred.promise;
	};

	var displayDefaultSearchState = function() {
        // Clear search and display all bookmarks
		vm.search.query = null;
        vm.search.lookahead = null;
        vm.search.results = null;
		vm.search.execute();
    };

	var deviceReady = function() {
		// Set platform
		vm.platformName = cordova.platformId;
		
		// Set back button event
		document.addEventListener('backbutton', handleBackButton, false);

		// Set network online event
		document.addEventListener('online', handleNetworkReconnected, false);

		// Don't display iOS specific help panels
		if (vm.platformName === vm.globals.Platforms.Android) {
			vm.events.introPanel8_Next_Click = introPanel8_Android_Next_Click;
			vm.events.introPanel10_Prev_Click = introPanel10_Android_Prev_Click;
		}

		// Use toasts for alerts
		vm.alert.display = displayToast;

		// Check if a sync was interrupted
		if (checkForInterruptedSync()) {
			return;
		}

		// If synced, refresh synced bookmarks and display all
		if (!!globals.SyncEnabled.Get()) {
			// Check if a url was shared
			checkForSharedUrl()
				.then(function(sharedUrl) {
					if (!!sharedUrl) {
						// Set shared url to current url and display bookmark panel
						currentUrl = sharedUrl;
						vm.view.change(vm.view.views.bookmark);
					}
					else {
						// Display search results if currently on the search panel and no query present
						if (vm.view.current === vm.view.views.search && !vm.search.query) {
							displayDefaultSearchState();
						}
					}

					// Check if bookmarks need updating
					bookmarks.CheckForUpdates()
						.then(function(updatesAvailable) {
							if (!updatesAvailable) {
								return;
							}

							// Show loading overlay if currently on the search panel and no query present
							if (vm.view.current === vm.view.views.search && !vm.search.query) {
								displayLoading('checkingForUpdates');
							}

							// Get bookmark updates
							return sync(vm, { type: globals.SyncType.Pull });
						})
						.catch(function(err) {
							// If ID was removed disable sync, otherwise display search panel
							if (err.code === globals.ErrorCodes.NoDataFound) {
								err.code = globals.ErrorCodes.IdRemoved;
								globals.SyncEnabled.Set(false);
								vm.view.change(vm.view.views.login);
							}
							
							// Log error
							utility.LogMessage(
								moduleName, 'deviceReady', utility.LogType.Error,
								JSON.stringify(err));

							// Display alert
							var errMessage = utility.GetErrorMessageFromException(err);
							vm.alert.display(errMessage.title, errMessage.message);
						})
						.finally(function() {
							hideLoading('checkingForUpdates');
							
							// Display updated search results if currently on the search panel and no query present
							if (vm.view.current === vm.view.views.search && !vm.search.query) {
								displayDefaultSearchState();
							}
						});
				});
		}

		// Check for updates regularly
		$interval(function() {
			getLatestUpdates();
		}, globals.Alarm.Period.Get() * 60000);
	};

	var displayToast = function(title, description) {
		var message = (!!title) ? title + '. ' + description : description;
		
		window.plugins.toast.showWithOptions({
			message: message,
			duration: 6000, 
			position: 'bottom',
			addPixelsY: -50
		});
	};

	var getLatestUpdates = function() {
		// Exit if sync isn't enabled or event listeners disabled
		if (!globals.SyncEnabled.Get() || globals.DisableEventListeners.Get()) {
			return;
		}

		bookmarks.CheckForUpdates()
			.then(function(updatesAvailable) {
				if (!updatesAvailable) {
					return;
				}

				// Get bookmark updates
				return sync(vm, { type: globals.SyncType.Pull });
			})
			.catch(function(err) {
				// Log error
				utility.LogMessage(
					moduleName, 'getLatestUpdates', utility.LogType.Error,
					JSON.stringify(err));
			});
	};

	var handleBackButton = function(event) {
		if (vm.view.current === vm.view.views.bookmark ||
			vm.view.current === vm.view.views.settings ||
			vm.view.current === vm.view.views.about
		) {
			// Back to login/search panel
			event.preventDefault();
			vm.view.displayMainView();
		}
		else {
			// On main view, exit app
			event.preventDefault();
			navigator.app.exitApp();
		}
	};

	var handleNetworkReconnected = function () {
		// If a previous sync failed due to lost connection, check for updates now
		if (!!globals.Network.Disconnected.Get()) {
			getLatestUpdates();
		}
	};

	var handleSharedIosUrl = function(sharedUrl) {
		// Process requested url if sync is enabled
		if (!!sharedUrl && !!globals.SyncEnabled.Get()) {
			var url = utility.ParseUrl(sharedUrl);

			// Check url scheme is valid
			if (!!url && !!url.searchObject && !!url.searchObject.url && 
				'/' + url.hostname === globals.URL.Bookmarks && url.pathname === globals.URL.Current) {
				// Set shared url to current url
				currentUrl = decodeURIComponent(url.searchObject.url);
			}
		}
	};

	var introPanel8_Android_Next_Click = function() {
		vm.introduction.displayPanel(10);
	};

	var introPanel10_Android_Prev_Click = function() {
		vm.introduction.displayPanel(8);
	};

	var introPanel11_Next_Click = function() {
		vm.introduction.displayPanel(13);
	};

	var introPanel13_Prev_Click = function() {
		vm.introduction.displayPanel(11);
	};

	var resume = function() {
		if (!!globals.SyncEnabled.Get()) {
			// Check if a url was shared
			checkForSharedUrl()
				.then(function(sharedUrl) {
					if (!!sharedUrl) {
						// Set shared url to current url and display bookmark panel
						currentUrl = sharedUrl;
						vm.view.change(vm.view.views.bookmark);
					}

					// Check if bookmarks need updating
					bookmarks.CheckForUpdates()
						.then(function(updatesAvailable) {
							if (!updatesAvailable) {
								return;
							}
							
							// Show loading overlay if currently on the search panel and no query present
							if (vm.view.current === vm.view.views.search && !vm.search.query) {
								displayLoading('checkingForUpdates');
							}

							// Get bookmark updates
							return sync(vm, { type: globals.SyncType.Pull });
						})
						.catch(function(err) {
							// If ID was removed disable sync, otherwise display search panel
							if (err.code === globals.ErrorCodes.NoDataFound) {
								err.code = globals.ErrorCodes.IdRemoved;
								globals.SyncEnabled.Set(false);
								vm.view.change(vm.view.views.login);
							}
							
							// Log error
							utility.LogMessage(
								moduleName, 'resume', utility.LogType.Error,
								JSON.stringify(err));

							// Display alert
							var errMessage = utility.GetErrorMessageFromException(err);
							vm.alert.display(errMessage.title, errMessage.message);
						})
						.finally(function() {
							hideLoading('checkingForUpdates');

							// Update search results if currently on the search panel and no query present
							if (vm.view.current === vm.view.views.search && !vm.search.query) {
								displayDefaultSearchState();
							}
						});
				});
		}
	};

	var syncForm_EnableSync_Click = function() {
		if (!globals.Id.Get()) {
			vm.sync.displaySyncConfirmation = true;
			$timeout(function() {
				document.querySelector('#btnSync_Confirm').focus();
			});
		}
		else {
			vm.events.syncForm_ConfirmSync_Click();
		}
	};
	
	
	// Call constructor
	return new MobileAppsImplementation();
};