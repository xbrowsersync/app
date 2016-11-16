var xBrowserSync = xBrowserSync || {};
xBrowserSync.App = xBrowserSync.App || {};

/* ------------------------------------------------------------------------------------
 * Class name:  xBrowserSync.App.PlatformImplementation 
 * Description: Implements xBrowserSync.App.Platform for web app.
 * ------------------------------------------------------------------------------------ */

xBrowserSync.App.PlatformImplementation = function($http, $interval, $q, $timeout, platform, global, utility, bookmarks) {
	'use strict';

/* ------------------------------------------------------------------------------------
 * Platform variables
 * ------------------------------------------------------------------------------------ */

	var $scope, currentUrl, moduleName = 'xBrowserSync.App.PlatformImplementation', showMainViewOnFocus = true, vm;
	
	var constants = {
		"title": {
			"message": "xBrowserSync"
		},
		"description": {
			"message": "Browser syncing as it should be: secure, anonymous and free!"
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
			"message": "<h4>Welcome</h4><p>Thanks for using xBrowserSync - browser syncing as it should be: secure, anonymous and free!</p><p>Have a read through the following pages to help you get started. Should you require futher help, check out the <a href='https://www.xbrowsersync.org/#faqs' class='new-tab'>FAQs</a>.</p>"
		},
		"introPanel2_Message": {
			"message": "<h4>Creating a new sync</h4><p>The xBrowserSync app allows you to access a sync created using the xBrowserSync <a href='https://chrome.google.com/webstore/detail/xbrowsersync/lcbjdhceifofjlpecfpeimnnphbcjgnc' class='new-tab'>Chrome extension</a>. If you haven't already created a sync, download the extension and create a new sync before continuing.</p>"
		},
		"introPanel3_Message": {
			"message": "<h4>Accessing your synced data</h4><p>Enter your xBrowserSync ID along with the secret word or phrase used when you created the sync.</p><p>Avoid typing your ID by hand by tapping on the camera icon and scanning the QR code for your sync. You can view the QR code by opening the Chrome extension (make sure you're synced) and in the Settings panel click on the QR code icon below your ID.</p>"
		},
		"introPanel4_Message": {
			"message": "<h4>Searching your bookmarks</h4><p>Simply type some keywords or a URL to search your synced bookmarks.</p><p>You can also modify or delete a bookmark from the search results by long pressing on the bookmark.</p>"
		},
		"introPanel5_Message": {
			"message": "<h4>Adding a bookmark</h4><p>You can add a new bookmark by clicking on the bookmark icon above the search box.</p><p>Include a description which will be displayed in search results, and add tags to help find the bookmark more easily when searching.</p>"
		},
		"introPanel6_Message": {
			"message": "<h4>Checking service status</h4><p>If you are having problems accessing or updating your synced data, it could be due to problems with the xBrowserSync service you are syncing to.</p><p>Open the Settings panel and check the Service tab to view the current service status.</p>"
		},
		"introPanel7_Message": {
			"message": "<h4>Switching to another service</h4><p>If you would like to switch to a different xBrowserSync service, you can update the service URL in the Settings panel, Service tab (remember you will need to have created a sync on the service using the <a href='https://chrome.google.com/webstore/detail/xbrowsersync/lcbjdhceifofjlpecfpeimnnphbcjgnc' class='new-tab'>Chrome extension</a> to access the sync via the app).</p><p>You can view all of the available public xBrowserSync services on the <a href='https://www.xbrowsersync.org/#status' class='new-tab'>xBrowserSync website</a>.</p>"
		},
		"introPanel8_Message": {
			"message": "<h4>Use it or lose it</h4><p>Service space is limited. If you do not use xBrowserSync for an extended period, any syncs you have created may be deleted to make room for others.</p><p>If you're synced, xBrowserSync will check for changes regularly in the background which will prevent your sync from being deleted.</p>"
		},
		"introPanel9_Message": {
			"message": "<h4>Run your own service</h4><p>If you need to sync more data or are concerned about syncing to public servers, it's easy to run your own xBrowserSync service on your web server. Check out the <a href='https://github.com/xBrowserSync/API' class='new-tab'>API Git Hub repo</a> for more information.</p><p>If you would like to make your service available to others to sync to, <a href='https://www.xbrowsersync.org/#contact' class='new-tab'>let us know</a> the URL of your service so it can be added to the list of public xBrowserSync services.</p>"
		},
		"introPanel10_Message": {
			"message": "<h4>Remember to back up</h4><p>xBrowserSync services are run voluntarily, plus servers can break and go wrong so please look after your data and make sure to keep backups.</p><p>Open the Settings panel and in the Back up and restore tab you can back up your unencrypted synced data to a local file, which can then restored at a later date should you need to.</p>"
		},
		"introPanel11_Message": {
			"message": ""
		},
		"introPanel12_Message": {
			"message": ""
		},
		"introPanel13_Message": {
			"message": ""
		},
		"introPanel14_Message": {
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
			"message": "Your xBrowserSync ID"
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
			"message":  "Your unencrypted data has been saved to {fileName} in the xBrowserSync folder on external storage (if available, otherwise check internal storage)."
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
		"bookmarkPanel_Button_RemoveBookmark_Label": {
			"message": "Remove"
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
		"error_Default_Title" : {
			"message":  "Something went wrong"
		},
		"error_Default_Message" : {
			"message":  "If the problem persists, submit an issue for the xBrowserSync team at https://github.com/xBrowserSync/App."
		},
		"error_HttpRequestFailed_Title" : {
			"message":  "Connection lost"
		},
		"error_HttpRequestFailed_Message" : {
			"message":  "Couldn't connect to the xBrowserSync service, check the service status in the Settings panel."
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
			"message":  "Couldn't get URL metadata"
		},
		"error_FailedGetPageMetadata_Message" : {
			"message":  "URL is invalid or webpage data could not be retrieved."
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
		}
	};


/* ------------------------------------------------------------------------------------
 * Constructor
 * ------------------------------------------------------------------------------------ */
    
	var WebAppImplementation = function() {
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
				
				// Ensure view isn't reset if permissions dialog displays
				showMainViewOnFocus = false;

				var onError = function() {
					return deferred.reject({ code: global.ErrorCodes.FailedBackupData });
				};
				
				// TODO: Add iOS support
				window.resolveLocalFileSystemURL(cordova.file.externalRootDirectory, function (dirEntry) { 
					dirEntry.getDirectory('xBrowserSync', { create: true }, function (dirEntry) {
						dirEntry.getFile(fileName, { create: true }, function (fileEntry) {
							fileEntry.createWriter(function (fileWriter) {
								fileWriter.write(JSON.stringify(data));
								
								fileWriter.onwriteend = function() {
									// Display message
									var message = getConstant(global.Constants.BackupSuccess_Message).replace(
										'{fileName}',
										fileEntry.name);
									
									$scope.$apply(function() {
										vm.settings.backupRestoreResult = message;
									});

									// Reset view on resume
									showMainViewOnFocus = true;

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

	var displayLoading = function() {
		SpinnerPlugin.activityStart(getConstant(global.Constants.Working_Title), { dimBackground: true });
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
    
    var getPageMetadata = function() {
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

		return $http.get(currentUrl)
            .then(function(response) {
				if (!response || !response.data) {
					return $q.reject({ code: global.ErrorCodes.FailedGetPageMetadata });
				}

				var parser, html, title, description, tagElements, tags;

				// Extract metadata properties
				parser = new DOMParser();
				html = parser.parseFromString(response.data, 'text/html');

				// Get page title
				title = html.querySelector('meta[property="og:title"]');
				if (!!title && !!title.getAttribute('content')) {
					metadata.title = title.getAttribute('content');
				}
				else {
					metadata.title = html.title || '';
				}

				// Get page description
				description = html.querySelector('meta[property="og:description"]') ||
				html.querySelector('meta[name="description"]');				
				if (!!description && !!description.getAttribute('content')) {
					metadata.description = description.getAttribute('content');
				}

				// Get page tags
				tagElements = html.querySelectorAll('meta[property$="video:tag"]');
				if (!!tagElements && tagElements.length > 0) {
					tags = '';
					
					for (var i = 0; i < tagElements.length; i++) {
						tags += tagElements[i].getAttribute('content') + ',';
					}

					metadata.tags = tags;
					return metadata;
				}

				// Get meta tag values
				tagElements = html.querySelector('meta[name="keywords"]');
				if (!!tagElements && !!tagElements.getAttribute('content')) {
					metadata.tags = tagElements.getAttribute('content');
				}

				return metadata;
			})
            .catch(function(err) {
                // Log error
				utility.LogMessage(
					moduleName, 'getPageMetadata', utility.LogType.Error,
					JSON.stringify(err));
					
				return $q.reject({ code: global.ErrorCodes.FailedGetPageMetadata });
            })
			.finally(function() {
				// Reset current url
				currentUrl = null;
			});
    };

	var hideLoading = function() {
		SpinnerPlugin.activityStop();
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

		// If no ID provided, display confirmation panel
		vm.events.syncForm_EnableSync_Click = function() {
			if (!global.Id.Get()) {
				vm.sync.displaySyncConfirmation = true;
				$timeout(function() {
					document.querySelector('#btnSync_Confirm').focus();
				});
			}
			else {
				vm.events.syncForm_ConfirmSync_Click();
			}
		};

		// Set intro panel button events
		vm.events.introPanel10_Next_Click = function() {
			vm.introduction.displayPanel(14);
		};
		vm.events.introPanel14_Prev_Click = function() {
			vm.introduction.displayPanel(10);
		};

		// Set backup file change event
		document.getElementById('backupFile').addEventListener('change', backupFile_Change, false);

		// Increase search results timeout to avoid display lag
		vm.settings.getSearchResultsDelay = 500;

		// Check for updates regularly
		bookmarks.CheckForUpdates();
		$interval(function() {
			bookmarks.CheckForUpdates();
		}, global.Alarm.Period.Get() * 60000);
	};

	var openUrl = function(url) {
		window.open(url, '_blank');
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
			'prompt': getConstant(vm.global.Constants.Button_ScanCode_Label), 
			'formats': 'QR_CODE' 
		};

		var onSuccess = function (result) {
			// Set result as id
			if (!!result && !!result.text) {
				$scope.$apply(function() {
					vm.settings.id(result.text);
				});
			}

			// Reset view on resume
			showMainViewOnFocus = true;
		};

		var onError = function (err) {
			// Display alert
			var errMessage = utility.GetErrorMessageFromException({ code: global.ErrorCodes.FailedScanID });
			vm.alert.display(errMessage.title, err);

			// Reset view on resume
			showMainViewOnFocus = true;
		};

		// Ensure view isn't reset if permissions dialog displays
		showMainViewOnFocus = false;
		
		// Activate barcode scanner
		cordova.plugins.barcodeScanner.scan(onSuccess, onError, options);
    };

    var selectBackupFile = function() {
        // Ensure view isn't reset once app regains focus
		showMainViewOnFocus = false;
		
		// Open file dialog
		document.querySelector('#backupFile').click();
    };

    var shareBookmark = function(event, result) {
        var options = {
			subject: result.title + ' (' + getConstant(vm.global.Constants.ShareBookmark_Title) + ')', 
			url: result.url,
			chooserTitle: getConstant(vm.global.Constants.ShareBookmark_Prompt)
		};
			
		var onError = function(err) {
			// Display alert
			var errMessage = utility.GetErrorMessageFromException({ code: global.ErrorCodes.FailedShareBookmark });
			vm.alert.display(errMessage.title, err);
		};
		
		// Display share sheet
		window.plugins.socialsharing.shareWithOptions(options, null, onError);
    };
	
	var sync = function(vm, syncData, command) {
		syncData.command = (!!command) ? command : global.Commands.SyncBookmarks;

		// Start sync
		bookmarks.Sync(syncData)
			.then(function() {
				vm.events.handleSyncResponse({ command: syncData.command, success: true });
			})
			.catch(function(err) {
				// Log error
				utility.LogMessage(
					moduleName, 'sync', utility.LogType.Error,
					JSON.stringify(err));
				utility.LogMessage(
					moduleName, 'sync', utility.LogType.Info,
					'syncData: ' + JSON.stringify(syncData));
					
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

		// Reset view on resume
		showMainViewOnFocus = true;
    };

	var checkForSharedLink = function(intent) {
		if (vm.platformName === vm.global.Platforms.Android) {
			// If there is a current intent, retrieve it
			window.plugins.webintent.hasExtra(window.plugins.webintent.EXTRA_TEXT,
				function(has) {
					if (!!has) {
						// Only use the intent if sync is enabled
						if (!!global.SyncEnabled.Get()) {
							window.plugins.webintent.getExtra(window.plugins.webintent.EXTRA_TEXT,
								function(url) {
									// Set shared link url to current url
									currentUrl = url;

									// Display bookmark panel
									vm.view.change(vm.view.views.bookmark);
									
									// Remove the intent
									window.plugins.webintent.removeExtra(window.plugins.webintent.EXTRA_TEXT);
								});
						}
						else {
							// Can't use it so remove the intent
							window.plugins.webintent.removeExtra(window.plugins.webintent.EXTRA_TEXT);
						}
					}
				}
			);
		}
	};

	var deviceReady = function() {
		// Set platform
		vm.platformName = device.platform;
		
		// Set back button event
		document.addEventListener('backbutton', handleBackButton, false);
		
		if (vm.view.current === vm.view.views.search) {
			// Focus on search box and show keyboard
			$timeout(function() {
				document.querySelector('input[name=txtSearch]').focus();
				cordova.plugins.Keyboard.show();
			}, 100);
		}

		// Use toasts for alerts
		vm.alert.display = displayToast;

		// Check if a sync was interrupted
		if (!!global.IsSyncing.Get()) {
			global.IsSyncing.Set(false);
			
			// Disable sync
			global.SyncEnabled.Set(false);
			
			// Display alert
			vm.alert.display(
				getConstant(global.Constants.Error_SyncInterrupted_Title), 
				getConstant(global.Constants.Error_SyncInterrupted_Message));
            
            return;
		}

		// Check if a link was shared
		checkForSharedLink();
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

	var handleBackButton = function(event) {
		if (vm.view.current === vm.view.views.bookmark ||
			vm.view.current === vm.view.views.settings ||
			vm.view.current === vm.view.views.about
		) {
			// Back to login/search panel
			event.preventDefault();
			vm.view.displayMainView();

			if (vm.view.current === vm.view.views.search) {
				// Focus on search box and show keyboard
				$timeout(function() {
					document.querySelector('input[name=txtSearch]').focus();
					cordova.plugins.Keyboard.show();
				}, 100);
			}
		}
		else {
			// On main view, exit app
			event.preventDefault();
			navigator.app.exitApp();
		}
	};

	var resume = function() {
		// Reset view to login/search panel
		if (!!showMainViewOnFocus) {
			vm.view.displayMainView();
		}
		else {
			// Reset view on resume
			showMainViewOnFocus = true;
		}
		
		// Check if a sync was interrupted
		if (!!global.IsSyncing.Get()) {
			global.IsSyncing.Set(false);
			
			// Disable sync
			global.SyncEnabled.Set(false);
			
			// Display alert
			vm.alert.display(
				getConstant(global.Constants.Error_SyncInterrupted_Title), 
				getConstant(global.Constants.Error_SyncInterrupted_Message));
            
            return;
		}
		
		if (vm.view.current === vm.view.views.search) {
			// Focus on search box and show keyboard
			$timeout(function() {
				document.querySelector('input[name=txtSearch]').focus();
				cordova.plugins.Keyboard.show();
			}, 100);
		}

		// Check for bookmarks updates
		if (!!global.SyncEnabled.Get()) {
			bookmarks.CheckForUpdates();
		}

		// Check if a link was shared
		checkForSharedLink();
	};
	
	
	// Call constructor
	return new WebAppImplementation();
};