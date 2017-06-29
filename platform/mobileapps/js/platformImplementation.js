var xBrowserSync = xBrowserSync || {};
xBrowserSync.App = xBrowserSync.App || {};
var SpinnerDialog = {};
SpinnerDialog.hide = function() {};
SpinnerDialog.show = function() {};

/* ------------------------------------------------------------------------------------
 * Class name:  xBrowserSync.App.PlatformImplementation 
 * Description: Implements xBrowserSync.App.Platform for mobile apps.
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
		"containers_Toolbar_Title": {
			"message": "Bookmarks bar"
		},
		"containers_Other_Title": {
			"message": "Other bookmarks"
		},
		"tooltipSyncEnabled_Label": {
			"message": "sync enabled"
		},
		"tooltipWorking_Label": {
			"message": "syncing..."
		},
		"button_Help_Label": {
			"message": "Display help"
		},
		"button_Next_Label": {
			"message": "Next"
		},
		"button_Previous_Label": {
			"message": "Previous"
		},
		"login_introPanel1_Message": {
			"message": "<h4>Welcome</h4><p>Thanks for using xBrowserSync — browser syncing as it should be: secure, anonymous and free!</p><p>Take some time to read through the following pages to get aquainted with xBrowserSync’s features. Futher information is available in the <a href='https://www.xbrowsersync.org/#faqs' class='new-tab'>FAQs</a>.</p>"
		},
		"login_introPanel2_Message": {
			"message": "<h4>Syncing for the first time</h4><p>Before you can sync your data it needs to be encrypted so that only you can read it. Enter an encryption password — make it strong but also memorable, there are no resets or reminders so if you forget it you won’t be able to decrypt your synced data.</p><p>Once you click the Sync button you’re synced and ready to start adding bookmarks.</p>"
		},
		"login_introPanel3_Message": {
			"message": "<h4>Already synced (got an ID)</h4><p>When you create a new sync you are given a unique xBrowserSync ID which you can use along with your password to sync your data on other devices. Your anonymity is ensured as no personal data is collected or stored with your synced data.</p><p>Once synced you can view your ID in the Settings panel. Tap it to reveal a handy QR code to scan when syncing on mobile devices.</p>"
		},
		"login_introPanel4_Message": {
			"message": "<h4>Syncing to another service</h4><p>By default your data is synced to the official xBrowserSync service, though anyone can <a href='https://github.com/xBrowserSync/API' class='new-tab'>run their own xBrowserSync service</a>, either for private use (for ultimate security and privacy) or to make available for public use so that more people can enjoy xBrowserSync.</p><p>Check the available <a href='https://www.xbrowsersync.org/#status' class='new-tab'>xBrowserSync services</a> and switch services in the Settings panel.</p>"
		},
		"login_introPanel5_Message": {
			"message": "<h4>New service, new ID</h4><p>Your xBrowserSync ID will only work with the service on which it was first synced.</p><p>Whenever you change services you must create a new sync and receive a new ID. It’s easy to move your synced data by backing it up using the former service and simply restoring it on the latter.</p>"
		},
		"login_introPanel6_Message": {
			"message": "<h4>Searching your bookmarks</h4><p>Once synced, your bookmarks are displayed in chronological order when you open xBrowserSync. Type some keywords or a URL in the search box to search your bookmarks.</p><p>Long pressing on a bookmark will allow you to directly share, modify or delete the bookmark.</p>"
		},
		"login_introPanel7_Message": {
			"message": "<h4>Adding a bookmark</h4><p>Add bookmarks easily by sharing to xBrowserSync from any apps that share URLs such as browsers, YouTube, Spotify and many more.</p><p>The bookmark’s properties will be fetched for you, otherwise add a description and some tags to ensure better search results.</p>"
		},
		"login_introPanel8_Message": {
			"message": "<h4>Remember to back up</h4><p>When you use xBrowserSync your data is your reponsibility so be smart and make sure to take backups.</p><p>You can do this easily in the Settings panel, you can back up your unencrypted data to a local file which can then restored at a later date should you need to.</p>"
		},
		"login_introPanel9_Message": {
			"message": "<h4>Got desktop?</h4><p>Sync your xBrowserSync data with your desktop browser using the xBrowserSync web extension, currently available for Chrome and with Firefox support coming very soon.</p>"
		},
		"login_introPanel10_Message": {
			"message": ""
		},
		"login_introPanel11_Message": {
			"message": ""
		},
		"login_introPanel12_Message": {
			"message": "<h4>Noticed an issue?</h4><p>If you’ve found a bug in xBrowserSync or would like to request a new feature, head on over to GitHub and <a href='https://github.com/xBrowserSync/App/issues' class='new-tab'>submit an issue</a>.</p><p>Calling all coders! If you would like to help make xBrowserSync better, go ahead and fork the <a href='https://github.com/xBrowserSync/App' class='new-tab'>xBrowserSync GitHub repo</a> and submit a pull request.</p>"
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
		"login_PasswordField_Label": {
			"message": "Encryption password"
		},
		"login_PasswordField_New_Description": {
			"message": "Enter an encryption password"
		},
		"login_PasswordField_Existing_Description": {
			"message": "Your encryption password"
		},
		"login_IdField_Label": {
			"message": "ID"
		},
		"login_IdField_Description": {
			"message": "Your xBrowserSync ID"
		},
		"button_ScanCode_Label": {
			"message": "Scan your xBrowserSync ID"
		},
		"button_DisableSync_Label": {
			"message": "Disable Sync"
		},
		"button_EnableSync_Label": {
			"message": "Sync"
		},
		"button_ExistingSync_Label": {
			"message": "Got an ID?"
		},
		"button_NewSync_Label": {
			"message": "Create new sync"
		},
		"login_ConfirmSync_Title" : {
			"message":  "Create new sync?"
		},
		"login_ConfirmSync_Message" : {
			"message":  "No xBrowserSync ID has been provided so a new sync will be created for you. OK to proceed?"
		},
		"button_Confirm_Label" : {
			"message":  "Yes"
		},
		"button_Deny_Label" : {
			"message":  "No"
		},
		"search_Field_Description" : {
			"message":  "Find a bookmark"
		},
		"search_NoBookmarks_Message" : {
			"message":  "You currently have no bookmarks.<br/><br/>Start bookmarking web pages, videos, music and more from your favourite apps by sharing them to xBrowserSync."
		},
		"search_NoResults_Message" : {
			"message":  "No bookmarks found"
		},
		"shareBookmark_Message": {
			"message":  "Share bookmark with"
		},
		"bookmarkShared_Message": {
			"message":  "shared from xBrowserSync"
		},
		"settings_Sync_SyncToolbarConfirmation_Message": {
			"message":  "<p>Enabling syncing of the bookmarks bar will replace the bookmarks currently in the bookmarks bar with your synced bookmarks.</p><p>OK to proceed?</p>"
		},
		"settings_Sync_ConfirmCancelSync_Message": {
			"message":  "<p>There is currently a sync in progress, if you proceed your local synced data will be incomplete.</p><p>OK to proceed?</p>"
		},
		"settings_Sync_Id_Description": {
			"message": "Use your ID to sync on other devices (click for QR code)."
		},
		"settings_Sync_SyncToolbar_Description": {
			"message": "Disable this setting if you wish to display local bookmarks in the bookmarks bar rather than synced bookmarks. Useful when syncing to multiple browsers."
		},
		"settings_Service_ServiceUrl_Label": {
			"message": "Url"
		},
		"settings_Service_ServiceUrl_Description": {
			"message": "xBrowserSync service currently in use."
		},
		"settings_Service_Status_Label": {
			"message": "Status"
		},
		"settings_Service_Status_Description": {
			"message": "Current service status."
		},
		"settings_Service_ServiceMessage_Label": {
			"message": "Service message"
		},
		"settings_Service_ApiVersion_Label": {
			"message": "API version"
		},
		"settings_Service_ApiVersion_Description": {
			"message": "xBrowserSync API version used by the service."
		},
		"settings_Service_ChangeService_Label": {
			"message": "Change service"
		},
		"settings_Service_ChangeService_Description": {
			"message": "Switch to a different xBrowserSync service."
		},
		"settings_BackupRestore_Backup_Label": {
			"message": "Back up"
		},
		"settings_BackupRestore_BackupLocal_Description": {
			"message": "Back up local browser data to a file."
		},
		"settings_BackupRestore_BackupSynced_Description": {
			"message": "Back up synced data to a file."
		},
		"settings_BackupRestore_Restore_Label": {
			"message": "Restore"
		},
		"settings_BackupRestore_RestoreLocal_Description": {
			"message": "Restore local browser data from a backup."
		},
		"settings_BackupRestore_RestoreSynced_Description": {
			"message": "Restore synced data from a backup."
		},
		"settings_About_Title" : {
			"message":  "About"
		},
		"settings_About_AppVersion_Label": {
			"message": "Version"
		},
		"settings_About_AppVersion_Description": {
			"message": "xBrowserSync app version number."
		},
		"settings_About_Updates_Label": {
			"message": "Latest updates"
		},
		"settings_About_Updates_Link_Label": {
			"message": "Full release history"
		},
		"settings_About_Updates_Description": {
			"message": "Notable updates for this version."
		},
		"settings_About_Website_Label": {
			"message": "Website"
		},
		"settings_About_Website_Description": {
			"message": "xBrowserSync website URL."
		},
		"settings_About_GitHub_Label": {
			"message": "GitHub"
		},
		"settings_About_GitHub_Description": {
			"message": "xBrowserSync is open-source — dig through the code and contribute to the project by creating a pull request."
		},
		"settings_About_Issues_Label": {
			"message": "Issues tracker / feature requests"
		},
		"settings_About_Issues_Description": {
			"message": "Raise an issue with the app or request a new feature."
		},
		"settings_About_Acknowledgements_Label": {
			"message": "Acknowledgements"
		},
		"settings_About_Acknowledgements_Description": {
			"message": "xBrowserSync would not be possible without these open-source libraries (and their depedencies) and the talented devs who give up their free time to make them possible. Respect."
		},
		"settings_Debug_Title" : {
			"message":  "Debug"
		},
		"settings_Debug_DeviceWidth_Label" : {
			"message":  "Device width"
		},
		"settings_Debug_DeviceHeight_Label" : {
			"message":  "Device height"
		},
		"debugEnabled_Message" : {
			"message":  "Debug mode enabled"
		},
		"settings_Service_Title" : {
			"message":  "Service"
		},
		"settings_Service_Status_NoNewSyncs" : {
			"message":  "Not accepting new syncs"
		},
		"settings_Service_Status_Online" : {
			"message":  "Online"
		},
		"settings_Service_Status_Offline" : {
			"message":  "Offline"
		},
		"button_UpdateServiceUrl_Label" : {
			"message":  "Change Service"
		},
		"settings_Service_UpdateForm_Message" : {
			"message":  "Enter the URL of an alternative xBrowserSync service. Browse the list of public xBrowserSync services <a href='https://www.xbrowsersync.org/#status' class='new-tab'>here</a>."
		},
		"settings_Service_UpdateForm_Field_Description" : {
			"message":  "xBrowserSync service URL"
		},
		"button_Update_Label" : {
			"message":  "Update"
		},
		"button_Cancel_Label" : {
			"message":  "Cancel"
		},
		"settings_Service_UpdateForm_Confirm_Message": {
			"message":  "<p>After changing the service, the current sync will be disabled and you’ll need to create a new sync.</p><p>If you have previously created a sync using this service and would like to retrieve your data, you can use the xBrowserSync ID provided at the time.</p><p>OK to proceed?</p>"
		},
		"settings_BackupRestore_Title" : {
			"message":  "Back up and restore"
		},
		"settings_BackupRestore_NotAvailable_Message": {
			"message": "Back up and restore will be available here once you are synced."
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
		"settings_BackupRestore_BackupSuccess_Message" : {
			"message":  ""
		},
		"settings_BackupRestore_BackupSuccess_Android_Message" : {
			"message":  "Backup file {fileName} saved to internal storage."
		},
		"settings_BackupRestore_BackupSuccess_IOS_Message" : {
			"message":  "Backup file {fileName} saved to Documents folder."
		},
		"settings_BackupRestore_RestoreSuccess_Message" : {
			"message":  "Your data has been restored."
		},
		"settings_BackupRestore_RestoreForm_Message" : {
			"message":  "Select an xBrowserSync backup file to restore."
		},
		"settings_BackupRestore_RestoreForm_DataField_Label" : {
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
		"settings_Sync_Title" : {
			"message":  "Sync"
		},
		"settings_Sync_NotAvailable_Message" : {
			"message":  "Sync settings will be available here once you are synced."
		},
		"settings_Sync_Id_Label" : {
			"message":  "Sync ID"
		},
		"settings_Sync_DisplayQRCode_Message" : {
			"message":  "Display QR code"
		},
		"settings_Service_DataUsage_Label" : {
			"message": "Data usage"
		},
		"settings_Sync_SyncToolbar_Label" : {
			"message":  "Include bookmarks bar"
		},
		"settings_Service_DataUsage_Description" : {
			"message":  "How much of the sync data allowed by the service are you using."
		},
		"settings_BackupRestore_ConfirmRestore_Sync_Message" : {
			"message":  "<p>The data being restored will overwrite your synced data.</p><p>OK to proceed?</p>"
		},
		"settings_BackupRestore_ConfirmRestore_NoSync_Message" : {
			"message":  "<p>As sync is currently disabled, the data being restored will overwrite the local browser data.</p><p>OK to proceed?</p>"
		},
		"bookmark_Title_Add" : {
			"message":  "Add bookmark"
		},
		"bookmark_Title_Edit" : {
			"message":  "Edit bookmark"
		},
		"bookmark_TitleField_Label": {
			"message": "Title"
		},
		"bookmark_UrlField_Label": {
			"message": "URL"
		},
		"bookmark_DescriptionField_Label": {
			"message": "Description"
		},
		"bookmark_TagsField_Label": {
			"message": "Tags"
		},
		"bookmark_TagsField_Description": {
			"message": "tag 1, tag 2, tag 3, etc..."
		},
		"button_AddTags_Label": {
			"message": "Add"
		},
		"button_DeleteTag_Label": {
			"message": "Remove tag"
		},
		"button_Delete_Label": {
			"message": "Delete"
		},
		"button_Share_Label": {
			"message": "Share"
		},
		"working_Title" : {
			"message":  "Working on it..."
		},
		"working_Message" : {
			"message":  "Don’t close the window yet."
		},
		"connRestored_Title" : {
			"message":  "Connection restored"
		},
		"connRestored_Message" : {
			"message":  "Your xBrowserSync changes have been synced."
		},
		"bookmark_Metadata_Message" : {
			"message":  "Fetching bookmark properties, touch to cancel."
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
			"message":  "Couldn’t connect to the xBrowserSync service."
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
			"message":  "Missing xBrowserSync ID or password"
		},
		"error_MissingClientData_Message" : {
			"message":  "Re-enable sync and try again."
		},
		"error_NoDataFound_Title" : {
			"message":  "No data found"
		},
		"error_NoDataFound_Message" : {
			"message":  "Double check your xBrowserSync ID and password and try again."
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
			"message":  "Couldn’t get local bookmarks"
		},
		"error_FailedGetLocalBookmarks_Message" : {
			"message":  "An error occurred when trying to retrieve local bookmarks."
		},
		"error_FailedCreateLocalBookmarks_Title" : {
			"message":  "Couldn’t create bookmarks"
		},
		"error_FailedCreateLocalBookmarks_Message" : {
			"message":  "An error occurred when trying to create a local bookmark."
		},
		"error_FailedRemoveLocalBookmarks_Title" : {
			"message":  "Couldn’t overwrite bookmark"
		},
		"error_FailedRemoveLocalBookmarks_Message" : {
			"message":  "An error occurred when trying to overwrite local bookmarks."
		},
		"error_InvalidData_Title" : {
			"message":  "Couldn’t decrypt xBrowserSync data"
		},
		"error_InvalidData_Message" : {
			"message":  "Ensure your encryption password is identical to the one used when you created the sync for this ID."
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
			"message":  "Couldn’t retrieve bookmark metadata"
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
		"error_FailedGetDataToRestore_Title" : {
			"message":  "Browse files failed"
		},
		"error_FailedRestoreData_Title" : {
			"message":  "Unable to read the selected file"
		},
		"error_FailedShareUrl_Title": {
			"message":  "Unable to retrieve shared bookmark URL"
		},
		"error_FailedShareUrlNotSynced_Title": {
			"message":  "You must be synced to add a bookmark"
		},
		"settings_About_Updates_ListHtml": {
			"message": "<li>iOS and Android apps released!</li><li>Redesigned, more intuitive sync/login panel and settings panel.</li><li>Search queries now allow commas between keywords.</li><li>Titleless bookmarks now display their URL host as a title.</li><li>Bookmark descriptions are now shortened to 300 characters to the nearest word.</li><li>“Connection Lost” warnings are no longer shown when checking for updates in the background.</li><li>Many, many more minor enhancements and bug fixes.</li>"
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

				var saveBackupFileError = function() {
					return deferred.reject({ code: globals.ErrorCodes.FailedBackupData });
				};

				// Set backup file storage location to synced app data on iOS and external storage on Android
				var storageLocation = (vm.platformName === globals.Platforms.IOS) ? cordova.file.syncedDataDirectory : cordova.file.externalRootDirectory;
				
				// Save backup file to storage location
				window.resolveLocalFileSystemURL(storageLocation, function (dirEntry) {
					dirEntry.getFile(fileName, { create: true }, function (fileEntry) {
						fileEntry.createWriter(function (fileWriter) {
							// Save export file
							fileWriter.write(JSON.stringify(data));
							
							fileWriter.onwriteend = function() {
								var platformStr = (vm.platformName === globals.Platforms.IOS) ? 
									constants.settings_BackupRestore_BackupSuccess_IOS_Message : 
									constants.settings_BackupRestore_BackupSuccess_Android_Message;
								var message = platformStr.message.replace(
									'{fileName}',
									fileEntry.name);
								
								$scope.$apply(function() {
									vm.settings.backupCompletedMessage = message;
								});

								return deferred.resolve();
							};
							
							fileWriter.onerror = saveBackupFileError;
						},
						saveBackupFileError);
					},
					saveBackupFileError);
				},
				saveBackupFileError);
			});
		
		return deferred.promise;
	};
	
	var clearBookmarks = function() {
		return $q.resolve();
	};

	var displayLoading = function(id, deferred) {
		var timeout;
		
		// Return if loading overlay already displayed
		if (!!loadingId) {
			return;
		}
		
		switch (id) {
			// Checking updated service url, wait a moment before displaying loading overlay
			case 'checkingNewServiceUrl':
				timeout = $timeout(function() {
					SpinnerDialog.show(null, getConstant(globals.Constants.Working_Title), false, { overlayOpacity: 0.75 });
				}, 100);
				break;
			// Loading bookmark metadata, display cancellable overlay
			case 'retrievingMetadata':
				var cancel = function() {
					deferred.resolve({ url: currentUrl });
				};
				timeout = $timeout(function() {
					SpinnerDialog.show(null, getConstant(globals.Constants.Bookmark_Metadata_Message), cancel, { overlayOpacity: 0.75 });
				}, 250);
				break;
			// Display default overlay
			default:
				timeout = $timeout(function() {
					SpinnerDialog.show(null, getConstant(globals.Constants.Working_Title), false, { overlayOpacity: 0.75 });
				});
				break;
		}

		loadingId = id;
		return timeout;
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
		
		var handleResponse = function(pageContent, err) {
			var parser, html;

			// Check html content was returned
			if (!!err || !pageContent) {
				// Log error
				utility.LogMessage(
					moduleName, 'getPageMetadata', globals.LogType.Warning,
					JSON.stringify(err));
				
				var errObj = { code: globals.ErrorCodes.FailedGetPageMetadata, url: currentUrl };

				// Reset current url
				currentUrl = null;
				
				return deferred.reject(errObj);
			}

			// Extract metadata properties
			parser = new DOMParser();
			html = parser.parseFromString(pageContent, 'text/html');

			// Get all meta tags
			var metaTagsArr = html.getElementsByTagName('meta');

			var getPageDescription = function() { 
				for (var i = 0; i < metaTagsArr.length; i++) {
					var currentTag = metaTagsArr[i];
					if ((!!currentTag.getAttribute('property') && currentTag.getAttribute('property').toUpperCase().trim() === 'OG:DESCRIPTION' && !!currentTag.getAttribute('content')) ||
					(!!currentTag.getAttribute('name') && currentTag.getAttribute('name').toUpperCase().trim() === 'TWITTER:DESCRIPTION' && !!currentTag.getAttribute('content')) ||
					(!!currentTag.getAttribute('name') && currentTag.getAttribute('name').toUpperCase().trim() === 'DESCRIPTION' && !!currentTag.getAttribute('content'))) {
						return (!!currentTag.getAttribute('content')) ? currentTag.getAttribute('content').trim() : '';
					}
				} 
				
				return null;
			};
			
			var getPageKeywords = function() { 
				// Get open graph tag values 
				var currentTag, i, keywords = [];
				for (i = 0; i < metaTagsArr.length; i++) {
					currentTag = metaTagsArr[i];
					if (!!currentTag.getAttribute('property') && 
						!!currentTag.getAttribute('property').trim().match(/VIDEO\:TAG$/i) && 
						!!currentTag.getAttribute('content')) {
						keywords.push(currentTag.getAttribute('content').trim());
					}
				}
				
				// Get meta tag values 
				for (i = 0; i < metaTagsArr.length; i++) {
					currentTag = metaTagsArr[i];
					if (!!currentTag.getAttribute('name') && 
						currentTag.getAttribute('name').toUpperCase().trim() === 'KEYWORDS' && 
						!!currentTag.getAttribute('content')) {
						var metaKeywords = currentTag.getAttribute('content').split(',');
						for (i = 0; i < metaKeywords.length; i++) {
							var currentKeyword = metaKeywords[i];
							if (!!currentKeyword && !!currentKeyword.trim()) {
								keywords.push(currentKeyword.trim());
							}
						}
						break;
					}
				}
				
				if (keywords.length > 0) { 
					return keywords.join();
				} 
				
				return null; 
			};
			
			var getPageTitle = function() { 
				for (var i = 0; i < metaTagsArr.length; i++) {
					var tag = metaTagsArr[i];
					if ((!!tag.getAttribute('property') && tag.getAttribute('property').toUpperCase().trim() === 'OG:TITLE' && !!tag.getAttribute('content')) || 
					(!!tag.getAttribute('name') && tag.getAttribute('name').toUpperCase().trim() === 'TWITTER:TITLE' && !!tag.getAttribute('content'))) {
						return (!!tag.getAttribute('content')) ? tag.getAttribute('content').trim() : '';
					}
				} 
				
				return html.title;
			};
		
			var metadata = { 
				title: getPageTitle(),
				url: currentUrl,
				description: getPageDescription(),
				tags: getPageKeywords()
			};

			// Reset current url
			currentUrl = null;

			// Return metadata
			deferred.resolve(metadata);

			// Close InAppBrowser
			inAppBrowser.close();
			inAppBrowser = null;
		};

		deferred = deferred || $q.defer();

		// If network disconnected fail immediately, otherwise retrieve page metadata
		if (!!globals.Network.Disconnected.Get()) {
			handleResponse(null, "network disconnected");
		}
		else {
			var inAppBrowser = cordova.InAppBrowser.open(currentUrl, '_blank', 'location=yes,hidden=yes');

			inAppBrowser.addEventListener('loaderror', function(err) {
				if (!!err && !!err.code && err.code === -999) {
					return;
				}
				
				handleResponse(null, err);
			});
			
			inAppBrowser.addEventListener('loadstop', function() {
				// Remove invasive content and return doc html
				inAppBrowser.executeScript({
					code: 
						"(function() { var elements = document.querySelectorAll('video,script'); for (var i = 0; i < elements.length; i++) { elements[i].parentNode.removeChild(elements[i]); } })();" +
						"document.querySelector('html').outerHTML;"
				},
				handleResponse);
			});

			// Time out metadata load after 10 secs
			$timeout(function() {
				if (deferred.promise.$$state.status === 0) {
					handleResponse(null, 'Timed out retrieving page metadata.');
				}
			}, 10000);
		}

		return deferred.promise;
    };

	var hideLoading = function(id, timeout) {
		if (!!timeout) {
			$timeout.cancel(timeout);
		}
		
		// Hide loading panel if supplied if matches current
		if (!loadingId || id === loadingId) {
			SpinnerDialog.hide();
			loadingId = null;
		}
	};

	var init = function(viewModel, scope) {
		// Set global variables
		vm = viewModel;
		$scope = scope;

		// Set window and panel heights
		var e = window;
		var a = 'inner';
		if (!('innerWidth' in window))
		{
			a = 'client';
			e = document.documentElement || document.body;
		}
		document.querySelector('html').style.height = e[a + 'Height'] + 'px';
		document.querySelector('.view').style.height = e[a + 'Height'] + 'px';

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
		vm.events.introPanel9_Next_Click = introPanel9_Next_Click;
		vm.events.introPanel12_Prev_Click = introPanel12_Prev_Click;
		vm.events.syncForm_EnableSync_Click = syncForm_EnableSync_Click;

		// Set clear search button to display all bookmarks
		vm.search.displayDefaultState = displayDefaultSearchState;

		// Enable select file to restore
		vm.settings.fileRestoreEnabled = true;

		// Increase search results timeout to avoid display lag
		vm.settings.getSearchResultsDelay = 500;

		// Attach event handler for iOS Share activity
		/*$timeout(function() {
			window.handleOpenURL = handleSharedUrlIos;
		}, 2000);*/
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
			'prompt': getConstant(globals.Constants.Button_ScanCode_Label), 
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
		// Open select file dialog
		if (vm.platformName === globals.Platforms.Android) {
			document.querySelector('#backupFile').click();
		}
		else if (vm.platformName === globals.Platforms.IOS) {
			var getPickedFileError = function() {
				var err = { code: globals.ErrorCodes.FailedRestoreData };
				
				// Log error
				utility.LogMessage(
					moduleName, 'getPickedFileError', globals.LogType.Warning,
					JSON.stringify(err));

				// Display alert
				var errMessage = utility.GetErrorMessageFromException(err);
				vm.alert.display(errMessage.title, errMessage.message);
			};
			
			var pickFileSuccess = function(selectedFilePath) {
				// Get directory and file name within temp folder
				var selectedFileProps = selectedFilePath.replace(cordova.file.tempDirectory.substring(7), '').split('/');
				var fileDir = selectedFileProps[0];
				var fileName = selectedFileProps[1];
				
				// Read the file data
				window.requestFileSystem(window.TEMPORARY, 0, function(fs) {
					fs.root.getDirectory(fileDir, { create: false }, function(dirEntry) {
						dirEntry.getFile(fileName, { create: false}, function(fileEntry) {
							fileEntry.file(function(file) {
								var reader = new FileReader();
						
								reader.onloadend = function() {
									// Set the backup file data to restore
									var data = this.result;
									vm.settings.backupFileName = fileName;
									$scope.$apply(function() {
										vm.settings.dataToRestore = data;
									});
								};
						
								reader.readAsText(file);
							},
							getPickedFileError);
						},
						getPickedFileError);
					},
					getPickedFileError);
				},
				getPickedFileError);
			};

			var pickFileFailed = function(err) {
				if (!err || err === 'canceled') {
					return;
				}
				
				err = { code: globals.ErrorCodes.FailedGetDataToRestore };
				
				// Log error
				utility.LogMessage(
					moduleName, 'pickFileFailed', globals.LogType.Warning,
					JSON.stringify(err));

				// Display alert
				var errMessage = utility.GetErrorMessageFromException(err);
				vm.alert.display(errMessage.title, errMessage.message);
			};
			
			// Use iOS file picker plugin to allow user to select file from iCloud
			FilePicker.pickFile(pickFileSuccess, pickFileFailed, 'public.data');
		}
    };

    var shareBookmark = function(bookmark) {
        var options = {
			subject: bookmark.title + ' (' + getConstant(globals.Constants.ShareBookmark_Message) + ')', 
			url: bookmark.url,
			chooserTitle: getConstant(globals.Constants.ShareBookmark_Message)
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

					// Update search results
					displayDefaultSearchState();
				}
				
				vm.events.handleSyncResponse({ command: syncData.command, success: true, syncData: syncData });
			})
			.catch(function(err) {
				// Log error
				utility.LogMessage(
					moduleName, 'sync', globals.LogType.Warning,
					JSON.stringify(err));
				utility.LogMessage(
					moduleName, 'sync', globals.LogType.Info,
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

	var backupFile_Change_Android = function(event) {
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

	var checkForDeletedSync = function(err) {
		// If ID was removed disable sync and delete saved ID and password
		if (err.code === globals.ErrorCodes.NoDataFound) {
			err.code = globals.ErrorCodes.IdRemoved;
			globals.SyncEnabled.Set(false);
			globals.ID.Set(null);
			globals.Password.Set(null);
			vm.view.change(vm.view.views.login);
		}
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

	var checkForSharedUrl = function() {
		var deferred = $q.defer();
		vm.device.messageLog.push("checkForSharedUrl");
		
		if (vm.platformName === globals.Platforms.Android) {
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

									// Check the URL is valid
									var match = (!!url) ? url.match(globals.Regex.Url) : null;
									if (!match || match.length === 0) {
										return deferred.reject({ code: globals.ErrorCodes.FailedShareUrl });
									}

									// Return the shared url
									return deferred.resolve(match[0]);
								});
						}
						else {
							// Can't use it so remove the intent
							window.plugins.webintent.removeExtra(window.plugins.webintent.EXTRA_TEXT);

							// Display alert
							vm.alert.display(null, getConstant(globals.Constants.Error_FailedShareUrlNotSynced_Title));

							deferred.resolve();
						}
					}
					else {
						deferred.resolve();
					}
				}
			);
		}
		else if (vm.platformName === globals.Platforms.IOS) {
			$timeout(function() {
				// If current url is set, return it
				if (!!currentUrl) {
					vm.device.messageLog.push("currentUrl found: " + currentUrl);
					switch (currentUrl) {
						case 'NOSHAREDURL':
							currentUrl = null;
							deferred.reject({ code: globals.ErrorCodes.FailedShareUrl });
							break;
						case 'NOTSYNCED':
							currentUrl = null;
							deferred.reject({ code: globals.ErrorCodes.FailedShareUrlNotSynced });
							break;
						default:
							// Check the URL is valid
							if (!utility.ParseUrl(currentUrl)) {
								currentUrl = null;
								deferred.reject({ code: globals.ErrorCodes.FailedShareUrl });
							}
							else {
								deferred.resolve(currentUrl);
							}
					}				
				}
				else {
					vm.device.messageLog.push("currentUrl empty");
					deferred.resolve();
				}
			}, 250);
		}
		else {
			deferred.resolve();
		}

		return deferred.promise;
	};

	var checkForTextInputBlur = function(event) {
		if (!isTextInput(event.target) && isTextInput(document.activeElement)) {
			$timeout(function() {
				document.activeElement.blur();
			}, 100);
		}
	};

	var displayDefaultSearchState = function() {
        if (vm.view.current !== vm.view.views.search) {
			return;
		}
		
		// Clear search and display all bookmarks
		document.activeElement.blur();
		vm.search.query = null;
        vm.search.lookahead = null;
        vm.search.results = null;
		vm.search.execute();
    };

	var deviceReady = function() {
		// Set platform
		vm.platformName = cordova.platformId;

		// Reset network disconnected flag
        globals.Network.Disconnected.Set(!utility.CheckConnection());
		
		// Set back button event
		document.addEventListener('backbutton', handleBackButton, false);

		// Set network offline event
		document.addEventListener('offline', handleNetworkDisconnected, false);
		
		// Set network online event
		document.addEventListener('online', handleNetworkReconnected, false);

		// Blur focus (and hide keyboard) when pressing out of text fields
		document.addEventListener('touchstart', checkForTextInputBlur, false);

		// Platform-specific configs
		if (vm.platformName === globals.Platforms.Android) {
			// Set backup file change event
			document.getElementById('backupFile').addEventListener('change', backupFile_Change_Android, false);
		}
		else if (vm.platformName === globals.Platforms.IOS) {
			// Attach event handler for iOS Share activity
			window.handleOpenURL = handleSharedUrlIos;
			
			// On iOS check if FilePicker is available, otherwise disable file restore
			FilePicker.isAvailable(function(isAvailable) {
				vm.settings.fileRestoreEnabled = isAvailable;
			});
		}

		// Use toasts for alerts
		vm.alert.display = displayToast;

		// Check if a sync was interrupted
		if (checkForInterruptedSync()) {
			return;
		}

		// Check if a url was shared
		checkForSharedUrl()
			.then(function(sharedUrl) {
				if (!globals.SyncEnabled.Get()) {
					return;
				}
				
				if (!!sharedUrl) {
					// Set shared url to current url and display bookmark panel
					currentUrl = sharedUrl;
					vm.view.change(vm.view.views.bookmark);
				}
				else {
					displayDefaultSearchState();
				}

				// Check if bookmarks need updating, return immediately if network is disconnected
				var checkForUpdates;
				if (!globals.Network.Disconnected.Get()) {
					checkForUpdates = bookmarks.CheckForUpdates();
				}
				else {
					checkForUpdates = $q.reject({ code: globals.ErrorCodes.HttpRequestFailed });
				}
				
				checkForUpdates
					.then(function(updatesAvailable) {
						if (!updatesAvailable) {
							return;
						}

						// Show loading overlay if currently on the search panel and no query present
						if (vm.view.current === vm.view.views.search) {
							displayLoading('syncingUpdates');
						}

						// Get bookmark updates
						return sync(vm, { type: globals.SyncType.Pull });
					})
					.catch(function(err) {
						// If ID was removed disable sync, otherwise display search panel
						checkForDeletedSync(err);
						
						// Log error
						utility.LogMessage(
							moduleName, 'deviceReady', globals.LogType.Warning,
							JSON.stringify(err));

						// Display alert if not retrieving bookmark metadata
						if (!sharedUrl) {
							var errMessage = utility.GetErrorMessageFromException(err);
							vm.alert.display(errMessage.title, errMessage.message);
						}
					})
					.finally(function() {
						hideLoading('syncingUpdates');

						// Update search results
						displayDefaultSearchState();
					});
			})
			.catch(function(err) {
				// Display alert
				var errMessage = utility.GetErrorMessageFromException(err);
				vm.alert.display(errMessage.title, errMessage.message);
			});

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
		if (!globals.SyncEnabled.Get()) {
			return $q.resolve();
		}

		return bookmarks.CheckForUpdates()
			.then(function(updatesAvailable) {
				if (!updatesAvailable) {
					return;
				}

				// Show loading overlay if currently on the search panel and no query present
				if (vm.view.current === vm.view.views.search) {
					displayLoading('syncingUpdates');
				}

				// Get bookmark updates
				return sync(vm, { type: globals.SyncType.Pull });
			})
			.catch(function(err) {
				// If ID was removed disable sync, otherwise display search panel
				checkForDeletedSync(err);
				
				// Log error
				utility.LogMessage(
					moduleName, 'getLatestUpdates', globals.LogType.Warning,
					JSON.stringify(err));

				// Display alert if not retrieving bookmark metadata
				if (!sharedUrl) {
					var errMessage = utility.GetErrorMessageFromException(err);
					vm.alert.display(errMessage.title, errMessage.message);
				}
			})
			.finally(function() {
				hideLoading('syncingUpdates');

				// Update search results
				displayDefaultSearchState();
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

	var handleNetworkDisconnected = function () {
		globals.Network.Disconnected.Set(true);
	};

	var handleNetworkReconnected = function () {
		// If a previous sync failed due to lost connection, check for updates now
		if (!!globals.Network.Disconnected.Get()) {
			getLatestUpdates()
				.then(function() {
					// Update search results
					refreshSearchResults();
				});
		}
	};

	var handleSharedUrlIos = function(sharedUrl) {
		var regex = new RegExp('^' + globals.URL.CustomScheme + globals.URL.Bookmarks + globals.URL.Current, 'i');
		if (!!sharedUrl && !regex.test(sharedUrl)) {
			// User clicked on a normal link, return
			return;
		}

		if (!globals.SyncEnabled.Get()) {
			// Not synced, display alert and return
			currentUrl = "NOTSYNCED";
			return;
		}

		var url = utility.ParseUrl(sharedUrl);
		if (!!url && !!url.searchObject && !!url.searchObject.url) {
			// Set shared url to current url
			currentUrl = decodeURIComponent(url.searchObject.url);
			vm.device.messageLog.push("Shared URL: " + currentUrl);
		}
		else {
			// No shared url found
			currentUrl = "NOSHAREDURL";
		}
	};

	var introPanel7_Android_Next_Click = function() {
		vm.introduction.displayPanel(9);
	};

	var introPanel9_Android_Prev_Click = function() {
		vm.introduction.displayPanel(7);
	};

	var introPanel9_Next_Click = function() {
		vm.introduction.displayPanel(12);
	};

	var introPanel12_Prev_Click = function() {
		vm.introduction.displayPanel(9);
	};

	var isTextInput = function(node) {
		return ['INPUT', 'TEXTAREA'].indexOf(node.nodeName) !== -1;
	};
	
	var refreshSearchResults = function() {
        if (vm.view.current !== vm.view.views.search) {
			return;
		}
		
		// Refresh search results
		document.activeElement.blur();
		vm.search.execute();
	};

	var resume = function() {
		// Reset network disconnected flag
        globals.Network.Disconnected.Set(!utility.CheckConnection());

		// Deselect bookmark
		vm.search.selectedBookmark = null;
		
		// Check if a url was shared
		checkForSharedUrl()
			.then(function(sharedUrl) {
				if (!globals.SyncEnabled.Get()) {
					return;
				}
				
				if (!!sharedUrl) {
					// Set shared url to current url and display bookmark panel
					currentUrl = sharedUrl;
					vm.view.change(vm.view.views.bookmark);
				}

				// Check if bookmarks need updating, return immediately if network is disconnected
				var checkForUpdates;
				if (!globals.Network.Disconnected.Get()) {
					checkForUpdates = bookmarks.CheckForUpdates();
				}
				else {
					checkForUpdates = $q.reject({ code: globals.ErrorCodes.HttpRequestFailed });
				}
				
				checkForUpdates
					.then(function(updatesAvailable) {
						if (!updatesAvailable) {
							return;
						}
						
						// Show loading overlay if currently on the search panel
						if (vm.view.current === vm.view.views.search) {
							displayLoading('syncingUpdates');
						}

						// Get bookmark updates
						return sync(vm, { type: globals.SyncType.Pull });
					})
					.catch(function(err) {
						// If ID was removed disable sync, otherwise display search panel
						checkForDeletedSync(err);
						
						// Log error
						utility.LogMessage(
							moduleName, 'resume', globals.LogType.Warning,
							JSON.stringify(err));

						// Display alert if not retrieving bookmark metadata
						if (!sharedUrl) {
							var errMessage = utility.GetErrorMessageFromException(err);
							vm.alert.display(errMessage.title, errMessage.message);
						}
					})
					.finally(function() {
						hideLoading('syncingUpdates');

						// Update search results
						refreshSearchResults();
					});
			})
			.catch(function(err) {
				// Display alert
				var errMessage = utility.GetErrorMessageFromException(err);
				vm.alert.display(errMessage.title, errMessage.message);
			});
	};

	var syncForm_EnableSync_Click = function() {
		// Don't display confirmation before syncing
		vm.events.syncForm_ConfirmSync_Click();
	};
	
	// Call constructor
	return new MobileAppsImplementation();
};