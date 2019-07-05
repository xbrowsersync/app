var xBrowserSync = xBrowserSync || {};
xBrowserSync.App = xBrowserSync.App || {};
var SpinnerDialog = {};
SpinnerDialog.hide = function () { };
SpinnerDialog.show = function () { };

/* ------------------------------------------------------------------------------------
 * Class name:  xBrowserSync.App.PlatformImplementation 
 * Description: Implements xBrowserSync.App.Platform for mobile apps.
 * ------------------------------------------------------------------------------------ */

xBrowserSync.App.PlatformImplementation = function ($interval, $q, $timeout, platform, globals, utility, bookmarks) {
  'use strict';

  var $scope, autoUpdatesInterval, currentUrl, loadingId, vm;

  var constants = {
    "title": {
      "message": "xBrowserSync"
    },
    "description": {
      "message": "Browser syncing as it should be: secure, anonymous and free! Sync bookmarks across your browsers and devices, no sign up required."
    },
    "tooltip_NotSynced_Label": {
      "message": "not synced"
    },
    "tooltip_Synced_Label": {
      "message": "synced"
    },
    "tooltip_Syncing_Label": {
      "message": "syncing"
    },
    "button_Help_Label": {
      "message": "Help guide"
    },
    "button_Next_Label": {
      "message": "Next"
    },
    "button_Previous_Label": {
      "message": "Previous"
    },
    "login_GetSyncId_Title": {
      "message": "Need a sync ID?"
    },
    "login_GetSyncId_Message": {
      "message": "<a href='https://www.xbrowsersync.org/#download' class='new-tab'>Download</a> the xBrowserSync desktop browser extension available for Chrome and Firefox, create a new sync and then scan your sync ID QR code on the previous screen."
    },
    "login_helpPanel1_Message": {
      "message": "<h4>Welcome</h4><p>Thank you for choosing xBrowserSync!</p><p>Before you begin, take some time to read through the following pages to get aquainted with xBrowserSync’s features. Futher information is available in the <a href='https://www.xbrowsersync.org/#faqs' class='new-tab'>FAQs</a>.</p>"
    },
    "login_helpPanel2_Message": {
      "message": "<h4>Syncing for the first time</h4><p>First things first, head over to your desktop browser and <a href='https://www.xbrowsersync.org/#download' class='new-tab'>download</a> the xBrowserSync extension (available for Chrome and Firefox).</p><p>When you create a new sync, your existing browser data will be encrypted locally and synced, and you will receive a sync ID which you can use here in this app to access your synced data.</p>"
    },
    "login_helpPanel3_Message": {
      "message": "<h4>Already synced (got an ID)</h4><p>When you create a new sync you are given a unique xBrowserSync ID which you can use along with your password to sync your data on other devices. Your anonymity is ensured as no personal data is collected or stored with your synced data.</p><p>Once synced you can view your ID in the Settings panel.</p>"
    },
    "login_helpPanel4_Message": {
      "message": "<h4>Syncing to another service</h4><p>By default your data is synced to the official xBrowserSync service, though anyone can <a href='https://github.com/xbrowsersync/api' class='new-tab'>run their own xBrowserSync service</a>, either for private use (for ultimate security and privacy) or to make available for public use so that more people can enjoy xBrowserSync.</p><p>Check the available <a href='https://www.xbrowsersync.org/#status' class='new-tab'>xBrowserSync services</a> and switch services in the Settings panel.</p>"
    },
    "login_helpPanel5_Message": {
      "message": "<h4>New service, new ID</h4><p>Your xBrowserSync ID will only work with the service on which it was created.</p><p>Whenever you change services you must create a new sync and then you’ll receive a new ID. You can move your existing synced data over from the old service by backing up on the old service and then restoring it once synced on the new service.</p>"
    },
    "login_helpPanel6_Message": {
      "message": "<h4>Searching your bookmarks</h4><p>Once synced, your bookmarks are displayed in chronological order when you open xBrowserSync. Type some keywords or a URL in the search box to search your bookmarks.</p><p>Long pressing on a bookmark will allow you to directly share, modify or delete the bookmark.</p>"
    },
    "login_helpPanel7_Message": {
      "message": "<h4>Adding a bookmark</h4><p>Add bookmarks easily by sharing to xBrowserSync from any apps that share URLs such as browsers, YouTube, Spotify and many more.</p><p>The bookmark’s properties will be fetched for you, otherwise add a description and some tags to ensure better search results.</p>"
    },
    "login_helpPanel8_Message": {
      "message": "<h4>Remember to back up</h4><p>When you use xBrowserSync your data is your reponsibility so be smart and make sure to take backups.</p><p>You can do this easily in the Settings panel, you can back up your unencrypted data to a local file which can then restored at a later date should you need to.</p>"
    },
    "login_helpPanel9_Message": {
      "message": "<h4>Got desktop?</h4><p>Sync your bookmarks across desktop and mobile devices by using the xBrowserSync desktop browser web extension alongside the mobile app.</p><p>Currently available for Chrome and Firefox, Opera support coming very soon.</p>"
    },
    "login_helpPanel10_Message": {
      "message": ""
    },
    "login_helpPanel11_Message": {
      "message": ""
    },
    "login_helpPanel12_Message": {
      "message": "<h4>Noticed an issue?</h4><p>If you’ve found a bug in xBrowserSync or would like to request a new feature, head on over to GitHub and <a href='https://github.com/xbrowsersync/app/issues' class='new-tab'>submit an issue</a>.</p><p>Calling all coders! If you would like to help make xBrowserSync better, go ahead and fork the <a href='https://github.com/xbrowsersync/app' class='new-tab'>xBrowserSync GitHub repo</a> and submit a pull request.</p>"
    },
    "button_Settings_Label": {
      "message": "Settings"
    },
    "button_AddBookmark_Label": {
      "message": "Add Bookmark"
    },
    "button_DeleteBookmark_Label": {
      "message": "Delete Bookmark"
    },
    "button_EditBookmark_Label": {
      "message": "Edit Bookmark"
    },
    "button_ShareBookmark_Label": {
      "message": "Share Bookmark"
    },
    "login_PasswordConfirmationField_Label": {
      "message": "Confirm password"
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
      "message": "Disable sync"
    },
    "button_EnableSync_Label": {
      "message": "Sync"
    },
    "button_ExistingSync_Label": {
      "message": "Back"
    },
    "button_NewSync_Label": {
      "message": "Don’t have a sync ID?"
    },
    "login_ConfirmSync_Title": {
      "message": "Create new sync?"
    },
    "login_ConfirmSync_Message": {
      "message": "No xBrowserSync ID has been provided so a new sync will be created for you. OK to proceed?"
    },
    "login_DisableOtherSyncs_Title": {
      "message": "Disable active browser sync tools"
    },
    "login_DisableOtherSyncs_Message": {
      "message": "Syncing your browser data with xBrowserSync whilst other browser sync tools (such as <a href='https://support.google.com/chrome/answer/185277?co=GENIE.Platform=Desktop' class='new-tab'>Google Chrome Sync</a>) are active can lead to corrupted bookmarks. Please disable them before continuing."
    },
    "login_UpgradeSync_Title": {
      "message": "Ready to upgrade sync?"
    },
    "login_UpgradeSync_Message": {
      "message": "<p>This sync ID must be upgraded in order to sync with this version of xBrowserSync. After upgrading, you will not be able to sync with previous versions of xBrowserSync.</p><p>Ensure you have updated all of your xBrowserSync apps before continuing. Ready to proceed?</p>"
    },
    "updated_Message": {
      "message": "xBrowserSync has been updated with the latest features and fixes. For more details about the changes contained in this release, check out the release notes."
    },
    "updated_Title": {
      "message": "Updated to v"
    },
    "permissions_Message": {
      "message": "<p>xBrowserSync automatically enriches bookmarks added using the browser’s Add Bookmark button with available metadata. To enable this, xBrowserSync <a href='https://www.xbrowsersync.org/?id=25#faqs' class='new-tab'>requires additional permissions</a> to be able to read visited website data.</p><p>Please indicate if prompted if you are happy to grant these permissions, alternatively you can add or remove permissions at any time in the Settings panel.</p>"
    },
    "permissions_Title": {
      "message": "Optional permissions"
    },
    "button_Confirm_Label": {
      "message": "Yes"
    },
    "button_Deny_Label": {
      "message": "No"
    },
    "search_Field_Description": {
      "message": "Find a bookmark"
    },
    "search_NoBookmarks_Message": {
      "message": "You currently have no bookmarks.<br/><br/>Start bookmarking web pages, videos, music and more from your favourite apps by sharing them to xBrowserSync."
    },
    "search_NoResults_Message": {
      "message": "No bookmarks found"
    },
    "shareBookmark_Message": {
      "message": "Share bookmark with"
    },
    "bookmarkShared_Message": {
      "message": "shared from xBrowserSync"
    },
    "settings_Sync_SyncToolbarConfirmation_Message": {
      "message": "<p>Enabling syncing of the bookmarks bar will replace the bookmarks currently in the bookmarks bar with your synced bookmarks.</p><p>OK to proceed?</p>"
    },
    "settings_Sync_ConfirmCancelSync_Message": {
      "message": "<p>There is currently a sync in progress, if you proceed your local synced data will be incomplete.</p><p>OK to proceed?</p>"
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
    "settings_About_Title": {
      "message": "About"
    },
    "settings_About_AppVersion_Label": {
      "message": "Version"
    },
    "settings_About_AppVersion_Description": {
      "message": "Source code release version number."
    },
    "button_ReleaseNotes_Label": {
      "message": "View release notes"
    },
    "settings_Issues_Help_Label": {
      "message": "Help"
    },
    "settings_Issues_Help_Description": {
      "message": "Got a question or having an issue? Make sure to read through the help guide, otherwise the answer may be in the FAQs."
    },
    "settings_Issues_ViewFAQs_Label": {
      "message": "View FAQs"
    },
    "settings_About_Contributions_Label": {
      "message": "Support xBrowserSync"
    },
    "settings_About_Contributions_Description": {
      "message": "If you enjoy using xBrowserSync consider supporting the project."
    },
    "settings_About_Cryptos_Label": {
      "message": "Donate crypto"
    },
    "settings_About_Liberapay_Label": {
      "message": "Via Liberapay"
    },
    "settings_Issues_Title": {
      "message": "Issues"
    },
    "settings_Issues_Tracker_Label": {
      "message": "Issues tracker"
    },
    "settings_Issues_Tracker_Description": {
      "message": "Report an issue to report a bug or request a new feature."
    },
    "settings_Issues_RaiseIssue_Label": {
      "message": "Report issue"
    },
    "settings_Issues_Log_Label": {
      "message": "Application log"
    },
    "settings_Issues_Log_Description": {
      "message": "Download and include the application log when you log an issue."
    },
    "settings_Issues_ClearLog_Label": {
      "message": "Clear log"
    },
    "settings_Issues_DownloadLog_Label": {
      "message": "Download log"
    },
    "settings_Issues_LogDownloaded_Message": {
      "message": "If the log file does not download automatically, right click on the link below and 'Save link as...'."
    },
    "settings_Issues_LogSize_Label": {
      "message": "Current log size"
    },
    "settings_Permissions_Title": {
      "message": "Optional permissions"
    },
    "settings_Permissions_ReadWebsiteData_Title": {
      "message": "Read website data"
    },
    "settings_Permissions_ReadWebsiteData_Description": {
      "message": "Required to automatically add metadata to bookmarks when using the browser’s native bookmark button (<a href='https://www.xbrowsersync.org/?id=25#faqs' class='new-tab'>more info</a>)."
    },
    "settings_Permissions_ReadWebsiteData_Granted_Label": {
      "message": "Granted"
    },
    "settings_Permissions_ReadWebsiteData_NotGranted_Label": {
      "message": "Not granted"
    },
    "button_Permissions_Remove_Label": {
      "message": "Remove permissions"
    },
    "button_Permissions_Add_Label": {
      "message": "Grant permissions"
    },
    "settings_Service_Title": {
      "message": "Service"
    },
    "settings_Service_Status_NoNewSyncs": {
      "message": "Not accepting new syncs"
    },
    "settings_Service_Status_Error": {
      "message": "Connection error"
    },
    "Settings_Service_Status_Loading": {
      "message": "Checking..."
    },
    "settings_Service_Status_Online": {
      "message": "Online"
    },
    "settings_Service_Status_Offline": {
      "message": "Offline"
    },
    "button_UpdateServiceUrl_Label": {
      "message": "Change Service"
    },
    "settings_Service_UpdateForm_Message": {
      "message": "Enter the URL of an alternative xBrowserSync service. Browse the list of public xBrowserSync services <a href='https://www.xbrowsersync.org/#status' class='new-tab'>here</a>."
    },
    "settings_Service_UpdateForm_Field_Description": {
      "message": "xBrowserSync service URL"
    },
    "button_Update_Label": {
      "message": "Update"
    },
    "button_Cancel_Label": {
      "message": "Cancel"
    },
    "settings_Service_UpdateForm_Confirm_Message": {
      "message": "<p>After changing the service, the current sync will be disabled and you'll need to create a new sync.</p><p>If you have previously created a sync using this service and would like to retrieve your data, you can use the xBrowserSync ID provided at the time.</p><p>OK to proceed?</p>"
    },
    "settings_Service_UpdateForm_Required_Label": {
      "message": "xBrowserSync service URL is required"
    },
    "settings_Service_UpdateForm_InvalidService_Label": {
      "message": "Not a valid xBrowserSync service"
    },
    "settings_Service_UpdateForm_ServiceVersionNotSupported_Label": {
      "message": "This service is running an unsupported API version"
    },
    "settings_Service_UpdateForm_ServiceOffline_Label": {
      "message": "This service is currently offline"
    },
    "settings_BackupRestore_Title": {
      "message": "Back up and restore"
    },
    "settings_BackupRestore_NotAvailable_Message": {
      "message": "Back up and restore will be available here once you are synced."
    },
    "button_Backup_Label": {
      "message": "Back up"
    },
    "button_Restore_Label": {
      "message": "Restore"
    },
    "button_Saving_Label": {
      "message": "Saving..."
    },
    "button_Done_Label": {
      "message": "Done"
    },
    "button_Clear_Label": {
      "message": "Clear"
    },
    "button_Close_Label": {
      "message": "Close"
    },
    "button_Continue_Label": {
      "message": "Continue"
    },
    "button_Back_Label": {
      "message": "Back"
    },
    "settings_BackupRestore_BackupSuccess_Message": {
      "message": "Backup file {fileName} saved to internal storage."
    },
    "settings_BackupRestore_RestoreSuccess_Message": {
      "message": "Your data has been restored."
    },
    "settings_BackupRestore_RestoreForm_Message": {
      "message": "Select an xBrowserSync backup file to restore."
    },
    "settings_BackupRestore_RestoreForm_DataField_Label": {
      "message": "Paste backup data"
    },
    "button_SelectBackupFile_Label": {
      "message": "Select file"
    },
    "button_RestoreData_Label": {
      "message": "Restore data"
    },
    "button_RestoreData_Invalid_Label": {
      "message": "Invalid data"
    },
    "button_RestoreData_Ready_Label": {
      "message": "Ready to restore"
    },
    "settings_Sync_Title": {
      "message": "Sync"
    },
    "settings_Sync_NotAvailable_Message": {
      "message": "Sync settings will be available here once you are synced."
    },
    "settings_Sync_Id_Label": {
      "message": "Sync ID"
    },
    "settings_Sync_DisplayQRCode_Message": {
      "message": "Display QR code"
    },
    "settings_Service_DataUsage_Label": {
      "message": "Data usage"
    },
    "settings_Sync_SyncToolbar_Label": {
      "message": "Include bookmarks bar"
    },
    "settings_Service_DataUsage_Description": {
      "message": "How much of the data limit for this service is your current sync using."
    },
    "settings_BackupRestore_ConfirmRestore_Sync_Message": {
      "message": "<p>The data being restored will overwrite your synced data.</p><p>OK to proceed?</p>"
    },
    "settings_BackupRestore_ConfirmRestore_NoSync_Message": {
      "message": "<p>As sync is currently disabled, the data being restored will overwrite the local browser data.</p><p>OK to proceed?</p>"
    },
    "bookmark_Title_Add": {
      "message": "Add bookmark"
    },
    "bookmark_Title_Edit": {
      "message": "Edit bookmark"
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
    "bookmark_BookmarkForm_Required_Label": {
      "message": "Bookmark URL is required"
    },
    "bookmark_BookmarkForm_Exists_Label": {
      "message": "URL has already been bookmarked"
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
    "button_ClearTags_Label": {
      "message": "Clear tags"
    },
    "qr_Copied_Label": {
      "message": "Copied!"
    },
    "qr_CopySyncId_Label": {
      "message": "Copy Sync ID to clipboard"
    },
    "qr_Message": {
      "message": "Scan this QR code using the xBrowserSync Android app to access your synced data on your mobile device."
    },
    "working_Title": {
      "message": "Syncing..."
    },
    "connRestored_Title": {
      "message": "Connection restored"
    },
    "connRestored_Message": {
      "message": "Your xBrowserSync changes have been synced."
    },
    "bookmark_Metadata_Message": {
      "message": "Fetching bookmark properties, touch to cancel."
    },
    "error_Default_Title": {
      "message": "Something went wrong"
    },
    "error_Default_Message": {
      "message": "Try again, if the problem persists click <a href='https://github.com/xbrowsersync/app/issues' class='new-tab'>here</a> to report an issue."
    },
    "error_HttpRequestFailed_Title": {
      "message": "Connection lost"
    },
    "error_HttpRequestFailed_Message": {
      "message": "Couldn’t connect to the xBrowserSync service, check the service status in the Settings panel."
    },
    "error_HttpRequestFailedWhileUpdating_Title": {
      "message": "Connection lost"
    },
    "error_HttpRequestFailedWhileUpdating_Message": {
      "message": "Sync will be retried automatically when connection is restored."
    },
    "error_TooManyRequests_Title": {
      "message": "Service request limit hit"
    },
    "error_TooManyRequests_Message": {
      "message": "Sync has been disabled, re-enable sync to resume syncing."
    },
    "error_RequestEntityTooLarge_Title": {
      "message": "Sync data limit exceeded"
    },
    "error_RequestEntityTooLarge_Message": {
      "message": "Unable to sync your data as it exceeds the size limit set by the xBrowserSync service. Remove some old bookmarks and try again or switch to a different xBrowserSync service that allows for larger syncs."
    },
    "error_NotAcceptingNewSyncs_Title": {
      "message": "Service not accepting new syncs"
    },
    "error_NotAcceptingNewSyncs_Message": {
      "message": "Unable to sync as this xBrowserSync service is not currently accepting new syncs. If you have already created a sync using this service enter your xBrowserSync ID, or change to an alternative service."
    },
    "error_DailyNewSyncLimitReached_Title": {
      "message": "Daily new sync limit reached"
    },
    "error_DailyNewSyncLimitReached_Message": {
      "message": "Unable to create new sync as you have reached your daily new sync limit for this xBrowserSync service. Sync with an existing xBrowserSync ID, choose a different service or try again tomorrow."
    },
    "error_MissingClientData_Title": {
      "message": "Missing xBrowserSync ID or password"
    },
    "error_MissingClientData_Message": {
      "message": "Re-enable sync and try again."
    },
    "error_InvalidCredentials_Title": {
      "message": "Invalid Sync ID/Password"
    },
    "error_InvalidCredentials_Message": {
      "message": "Check your xBrowserSync ID and password, ensure the current service URL is where the sync was created and then try again."
    },
    "error_SyncRemoved_Title": {
      "message": "Sync data removed"
    },
    "error_SyncRemoved_Message": {
      "message": "Sync data no longer exists on the service, it may have been removed due to inactivity. Create a new sync and restore your data from a backup."
    },
    "error_NoDataToRestore_Title": {
      "message": "No data to restore"
    },
    "error_NoDataToRestore_Message": {
      "message": "Ensure you have provided a valid xBrowserSync back up before restoring."
    },
    "error_LocalSyncError_Title": {
      "message": "Sync error"
    },
    "error_LocalSyncError_Message": {
      "message": "An error occurred whilst syncing local changes. Your local bookmarks have now been refreshed so you may need to redo the previous change."
    },
    "error_OutOfSync_Title": {
      "message": "Data out of sync"
    },
    "error_OutOfSync_Message": {
      "message": "Local data was out of sync but has now been refreshed. Your local bookmarks have now been refreshed so you may need to redo the previous change."
    },
    "error_ApiInvalid_Title": {
      "message": "Invalid xBrowserSync service"
    },
    "error_ApiInvalid_Message": {
      "message": "The selected service URL is not pointing to a valid xBrowserSync service."
    },
    "error_ApiVersionNotSupported_Title": {
      "message": "Service not supported"
    },
    "error_ApiVersionNotSupported_Message": {
      "message": "This service is running an unsupported API version"
    },
    "error_ContainerChanged_Title": {
      "message": "xBrowserSync folder changed"
    },
    "error_ContainerChanged_Message": {
      "message": "Modifying xBrowserSync [xbs] folders can cause sync issues. The previous change was not synced and your local bookmarks have been refreshed."
    },
    "error_LocalContainerNotFound_Title": {
      "message": "Unexpected bookmarks structure"
    },
    "error_LocalContainerNotFound_Message": {
      "message": "This could be caused by a corrupt browser profile. Try syncing with a fresh profile before importing any existing bookmarks."
    },
    "error_FailedGetPageMetadata_Title": {
      "message": "Couldn’t get URL metadata"
    },
    "error_FailedGetPageMetadata_Message": {
      "message": "Try sharing the URL again or enter metadata manually."
    },
    "error_SyncInterrupted_Title": {
      "message": "Sync interrupted"
    },
    "error_SyncInterrupted_Message": {
      "message": "A previous sync was interrupted and failed to complete. Re-enable sync to restore your synced data."
    },
    "error_ScanFailed_Title": {
      "message": "Scan failed"
    },
    "error_ShareFailed_Title": {
      "message": "Share failed"
    },
    "error_FailedBackupData_Title": {
      "message": "Backup failed"
    },
    "error_FailedGetDataToRestore_Title": {
      "message": "Browse files failed"
    },
    "error_FailedRestoreData_Title": {
      "message": "Unable to read the selected file"
    },
    "error_FailedRestoreData_Message": {
      "message": ""
    },
    "error_FailedShareUrl_Title": {
      "message": "Unable to retrieve shared bookmark URL"
    },
    "error_FailedShareUrlNotSynced_Title": {
      "message": "You must be synced to add a bookmark"
    }
  };


	/* ------------------------------------------------------------------------------------
	 * Constructor
	 * ------------------------------------------------------------------------------------ */

  var AndroidImplementation = function () {
    // Inject required platform implementation functions
    platform.AutomaticUpdates.Start = startAutoUpdates;
    platform.AutomaticUpdates.Stop = stopAutoUpdates;
    platform.BackupData = backupData;
    platform.Bookmarks.Clear = clearBookmarks;
    platform.Bookmarks.CreateSingle = createSingle;
    platform.Bookmarks.DeleteSingle = deleteSingle;
    platform.Bookmarks.Get = getBookmarks;
    platform.Bookmarks.Populate = populateBookmarks;
    platform.Bookmarks.Share = shareBookmark;
    platform.Bookmarks.UpdateSingle = updateSingle;
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
    platform.Sync.Execute = sync;
  };


	/* ------------------------------------------------------------------------------------
	 * Public functions
	 * ------------------------------------------------------------------------------------ */

  var backupData = function () {
    var deferred = $q.defer();

    // Export bookmarks
    bookmarks.Export()
      .then(function (data) {
        var fileName = utility.GetBackupFileName();
        var saveBackupFileError = function () {
          return deferred.reject({ code: globals.ErrorCodes.FailedBackupData });
        };

        // Set backup file storage location to external storage
        var storageLocation = cordova.file.externalRootDirectory;

        // Save backup file to storage location
        window.resolveLocalFileSystemURL(storageLocation, function (dirEntry) {
          dirEntry.getFile(fileName, { create: true }, function (fileEntry) {
            fileEntry.createWriter(function (fileWriter) {
              // Save export file
              fileWriter.write(JSON.stringify(data));

              var success = function () {
                var message = constants.settings_BackupRestore_BackupSuccess_Message.message.replace(
                  '{fileName}',
                  fileEntry.name);

                $scope.$apply(function () {
                  vm.settings.backupCompletedMessage = message;
                });

                deferred.resolve();
              };

              fileWriter.onwriteend = function () {
                success();
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

  var clearBookmarks = function () {
    return $q.resolve();
  };

  var createSingle = function () {
    return $q.resolve();
  };

  var deleteSingle = function () {
    return $q.resolve();
  };

  var displayLoading = function (id, deferred) {
    var timeout;

    // Return if loading overlay already displayed
    if (loadingId) {
      return;
    }

    switch (id) {
      // Checking updated service url, wait a moment before displaying loading overlay
      case 'checkingNewServiceUrl':
        timeout = $timeout(function () {
          SpinnerDialog.show(null, getConstant(globals.Constants.Working_Title), false, { overlayOpacity: 0.75 });
        }, 100);
        break;
      // Loading bookmark metadata, display cancellable overlay
      case 'retrievingMetadata':
        var cancel = function () {
          deferred.resolve({ url: currentUrl });
        };
        timeout = $timeout(function () {
          SpinnerDialog.show(null, getConstant(globals.Constants.Bookmark_Metadata_Message), cancel, { overlayOpacity: 0.75 });
        }, 250);
        break;
      // Display default overlay
      default:
        timeout = $timeout(function () {
          SpinnerDialog.show(null, getConstant(globals.Constants.Working_Title), false, { overlayOpacity: 0.75 });
        });
        break;
    }

    loadingId = id;
    return timeout;
  };

  var getBookmarks = function () {
    return $q.resolve();
  };

  var getConstant = function (constName) {
    return constants[constName].message;
  };

  var getCurrentUrl = function () {
    return $q.resolve(currentUrl);
  };

  var getFromLocalStorage = function (itemName) {
    return localStorage.getItem(itemName);
  };

  var getPageMetadata = function (deferred) {
    var inAppBrowser, inAppBrowserTimeout;

    // If current url not set, return with default url
    if (!currentUrl) {
      return $q.resolve({ url: 'http://' });
    }

    // If current url is not valid, return with default url
    var matches = currentUrl.match(/^https?:\/\/\w+/i);
    if (!matches || matches.length <= 0) {
      return $q.resolve({ url: 'http://' });
    }

    var handleResponse = function (pageContent, err) {
      var parser, html;

      // Cancel timeout
      if (inAppBrowserTimeout) {
        $timeout.cancel(inAppBrowserTimeout);
        inAppBrowserTimeout = null;
      }

      // Check html content was returned
      if (err || !pageContent) {
        if (err) {
          utility.LogError(err, 'platform.handleResponse');
        }

        var errObj = { code: globals.ErrorCodes.FailedGetPageMetadata, url: currentUrl };

        // Reset current url
        currentUrl = null;

        // Return error
        deferred.reject(errObj);

        // Close InAppBrowser
        inAppBrowser.close();
        inAppBrowser = null;

        return;
      }

      // Extract metadata properties
      parser = new DOMParser();
      html = parser.parseFromString(pageContent, 'text/html');

      // Get all meta tags
      var metaTagsArr = html.getElementsByTagName('meta');

      var getPageDescription = function () {
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

      var getPageKeywords = function () {
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

      var getPageTitle = function () {
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
    if (!utility.isNetworkConnected()) {
      handleResponse(null, 'Network disconnected.');
    }
    else {
      inAppBrowser = cordova.InAppBrowser.open(currentUrl, '_blank', 'location=yes,hidden=yes');

      inAppBrowser.addEventListener('loaderror', function (err) {
        if (err && err.code && err.code === -999) {
          return;
        }

        handleResponse(null, err);
      });

      inAppBrowser.addEventListener('loadstop', function () {
        // Remove invasive content and return doc html
        inAppBrowser.executeScript({
          code:
            "(function() { var elements = document.querySelectorAll('video,script'); for (var i = 0; i < elements.length; i++) { elements[i].parentNode.removeChild(elements[i]); } })();" +
            "document.querySelector('html').outerHTML;"
        },
          handleResponse);
      });

      // Time out metadata load after 10 secs
      inAppBrowserTimeout = $timeout(function () {
        if (deferred.promise.$$state.status === 0) {
          handleResponse(null, 'Timed out retrieving page metadata.');
        }
      }, 20000);
    }

    return deferred.promise;
  };

  var hideLoading = function (id, timeout) {
    if (timeout) {
      $timeout.cancel(timeout);
    }

    // Hide loading panel if supplied if matches current
    if (!loadingId || id === loadingId) {
      SpinnerDialog.hide();
      loadingId = null;
    }
  };

  var init = function (viewModel, scope) {
    // Set global variables
    vm = viewModel;
    $scope = scope;

    // Set window and panel heights
    var e = window;
    var a = 'inner';
    if (!('innerWidth' in window)) {
      a = 'client';
      e = document.documentElement || document.body;
    }
    var height = e[a + 'Height'] + 'px';
    document.querySelector('html').style.height = height;
    document.querySelector('.view').style.height = height;
    document.querySelector('.background').style.minHeight = height;

    // Load cordova.js
    var script = document.createElement('script');
    script.src = 'cordova.js';
    script.onload = function () {
      // Bind to device events
      document.addEventListener('deviceready', deviceReady, false);
      document.addEventListener('resume', resume, false);
    };
    document.getElementsByTagName('head')[0].appendChild(script);

    // Set async channel to view model
    vm.sync.asyncChannel = vm;

    // Set required events to mobile app handlers
    vm.events.bookmarkPanel_Close_Click = bookmarkPanel_Close_Click;
    vm.events.helpPanel9_Next_Click = helpPanel9_Next_Click;
    vm.events.helpPanel12_Prev_Click = helpPanel12_Prev_Click;
    vm.events.syncForm_EnableSync_Click = syncForm_EnableSync_Click;

    // Set clear search button to display all bookmarks
    vm.search.displayDefaultState = displayDefaultSearchState;

    // Enable select file to restore
    vm.settings.fileRestoreEnabled = true;

    // Increase search results timeout to avoid display lag
    vm.settings.getSearchResultsDelay = 500;

    // Display existing sync panel by default
    vm.sync.displayNewSyncPanel = false;

    // Check stored app version for upgrade
    checkForUpgrade();
  };

  var openUrl = function (url) {
    OpenUrlExt.open(url, function () { }, function (err) {
      utility.LogInfo('Unable to open url' + (url ? (' ' + url + ': ') : ': '));
      utility.LogError(err, 'platform.openUrl');
    });
  };

  var populateBookmarks = function (xBookmarks) {
    return $q.resolve();
  };

  var refreshInterface = function () {
  };

  var setInLocalStorage = function (itemName, itemValue) {
    localStorage.setItem(itemName, itemValue);
  };

  var scanId = function () {
    var options = {
      'preferFrontCamera': false,
      'showFlipCameraButton': false,
      'prompt': getConstant(globals.Constants.Button_ScanCode_Label),
      'formats': 'QR_CODE'
    };

    var onSuccess = function (result) {
      // Set result as id
      if (result && result.text) {
        $scope.$apply(function () {
          vm.sync.id = result.text;
          platform.LocalStorage.Set(globals.CacheKeys.SyncId, result.text);
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

  var selectBackupFile = function () {
    // Open select file dialog
    document.querySelector('#backupFile').click();
  };

  var shareBookmark = function (bookmark) {
    var options = {
      subject: bookmark.title + ' (' + getConstant(globals.Constants.ShareBookmark_Message) + ')',
      url: bookmark.url,
      chooserTitle: getConstant(globals.Constants.ShareBookmark_Message)
    };

    var onError = function (err) {
      // Display alert
      var errMessage = utility.GetErrorMessageFromException({ code: globals.ErrorCodes.FailedShareBookmark });
      vm.alert.display(errMessage.title, err);
    };

    // Display share sheet
    window.plugins.socialsharing.shareWithOptions(options, null, onError);
  };

  var startAutoUpdates = function () {
    // Check for updates at intervals
    autoUpdatesInterval = $interval(getLatestUpdates, globals.Alarm.Period * 60000);
    return $q.resolve();
  };

  var stopAutoUpdates = function () {
    if (!autoUpdatesInterval) {
      return;
    }

    // Cancel interval
    $interval.cancel(autoUpdatesInterval);
    autoUpdatesInterval = undefined;
  };

  var sync = function (vm, syncData, command) {
    syncData.command = (command) ? command : globals.Commands.SyncBookmarks;

    // Start sync
    return bookmarks.Sync(syncData)
      .then(function (bookmarks, initialSyncFailed) {
        // Reset network disconnected flag
        platform.LocalStorage.Set(globals.CacheKeys.NetworkDisconnected, false);

        // If this sync initially failed, alert the user and refresh search results
        if (initialSyncFailed) {
          vm.alert.display(platform.GetConstant(globals.Constants.ConnRestored_Title), platform.GetConstant(globals.Constants.ConnRestored_Message));

          // Update search results
          displayDefaultSearchState();
        }

        vm.events.handleSyncResponse({
          command: syncData.command,
          bookmarks: bookmarks,
          success: true,
          syncData: syncData
        });
      })
      .catch(function (err) {
        // Don't display another alert if sync retry failed
        if (!syncData.changeInfo && err.code === globals.ErrorCodes.HttpRequestFailedWhileUpdating) {
          return;
        }

        vm.events.handleSyncResponse({ command: syncData.command, success: false, error: err });

        // If sync was disabled, display login panel
        platform.LocalStorage.Get(globals.CacheKeys.SyncEnabled)
          .then(function (syncEnabled) {
            if (!syncEnabled) {
              vm.view.change(vm.view.views.login);
            }
          });
      });
  };

  var updateSingle = function () {
    return $q.resolve();
  };


	/* ------------------------------------------------------------------------------------
	 * Private functions
	 * ------------------------------------------------------------------------------------ */

  var backupFile_Change_Android = function (event) {
    var fileInput = document.getElementById('backupFile');

    if (fileInput.files.length > 0) {
      var file = fileInput.files[0];
      vm.settings.backupFileName = file.name;
      var reader = new FileReader();

      reader.onload = (function (data) {
        return function (event) {
          $scope.$apply(function () {
            vm.settings.dataToRestore = event.target.result;
          });
        };
      })(file);

      // Read the backup file data
      reader.readAsText(file);
    }
  };

  var bookmarkPanel_Close_Click = function () {
    // Reset current url before switching to main view
    currentUrl = null;
    vm.view.displayMainView();
  };

  var checkForInterruptedSync = function () {
    // TODO: Android: can we remove this?
    return platform.LocalStorage.Get(globals.CacheKeys.IsSyncing)
      .then(function (isSyncing) {
        // Check if a sync was interrupted
        if (isSyncing) {
          // Display login panel
          vm.view.displayMainView();

          // Disable sync
          return bookmarks.DisableSync()
            .then(function () {
              // Display alert
              displayAlert(
                getConstant(globals.Constants.Error_SyncInterrupted_Title),
                getConstant(globals.Constants.Error_SyncInterrupted_Message));
            });
        }
      });
  };

  var checkForSharedUrl = function (syncEnabled) {
    var deferred = $q.defer();

    // If there is a current intent, retrieve it
    window.plugins.webintent.hasExtra(window.plugins.webintent.EXTRA_TEXT,
      function (has) {
        if (has) {
          // Only use the intent if sync is enabled
          if (syncEnabled) {
            window.plugins.webintent.getExtra(window.plugins.webintent.EXTRA_TEXT,
              function (url) {
                // Remove the intent
                window.plugins.webintent.removeExtra(
                  window.plugins.webintent.EXTRA_TEXT,
                  function () { }
                );

                // Check the URL is valid
                var match = url ? url.match(globals.Regex.Url) : null;
                if (!match || match.length === 0) {
                  return deferred.reject({ code: globals.ErrorCodes.FailedShareUrl });
                }

                // Return the shared url
                return deferred.resolve(match[0]);
              });
          }
          else {
            // Can't use it so remove the intent
            window.plugins.webintent.removeExtra(
              window.plugins.webintent.EXTRA_TEXT,
              function () { }
            );

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

    return deferred.promise;
  };

  var checkForUpgrade = function () {
    // Disable sync and display updated message if stored app version older than current
    return platform.LocalStorage.Get(globals.CacheKeys.MobileAppVersion)
      .then(function (mobileAppVersion) {
        // If upgrade is available disable sync and display updated panel
        if (compareVersions(mobileAppVersion, globals.AppVersion) < 0) {
          return $q.all([
            platform.LocalStorage.Set(globals.CacheKeys.DisplayUpdated, true),
            bookmarks.DisableSync()
          ]);
        }
      })
      .then(function () {
        // Update stored version to current app version
        return platform.LocalStorage.Set(globals.CacheKeys.MobileAppVersion, globals.AppVersion);
      });
  };

  var displayDefaultSearchState = function () {
    if (vm.view.current !== vm.view.views.search) {
      return;
    }

    // Clear search and display all bookmarks
    document.activeElement.blur();
    vm.search.query = null;
    vm.search.queryMeasure = null;
    vm.search.lookahead = null;
    vm.search.execute();
  };

  var deviceReady = function () {
    // Set platform
    vm.platformName = cordova.platformId;

    // Set back button event
    document.addEventListener('backbutton', handleBackButton, false);

    // Set network offline event
    document.addEventListener('offline', handleNetworkDisconnected, false);

    // Set network online event
    document.addEventListener('online', handleNetworkReconnected, false);

    // Set touchstart event
    document.addEventListener('touchstart', handleTouchStart, false);

    // Set backup file change event
    document.getElementById('backupFile').addEventListener('change', backupFile_Change_Android, false);

    // Use toasts for alerts
    vm.alert.display = displayToast;

    // Reset network disconnected flag
    var networkDisconnected = !utility.IsNetworkConnected();
    platform.LocalStorage.Set(globals.CacheKeys.NetworkDisconnected, networkDisconnected);

    // Check if a sync was interrupted
    checkForInterruptedSync()
      .then(function () {
        return platform.LocalStorage.Get(globals.CacheKeys.SyncEnabled);
      })
      .then(function (syncEnabled) {
        // If sync enabled start regular updates check and display default search results
        if (syncEnabled) {
          startAutoUpdates();
          displayDefaultSearchState();
        }

        // Check if a url was shared
        return checkForSharedUrl(syncEnabled)
          .then(function (sharedUrl) {
            if (syncEnabled && sharedUrl) {
              // Set shared url to current url and display bookmark panel
              currentUrl = sharedUrl;
              return vm.view.change(vm.view.views.bookmark);
            }
          });
      })
      .then(function () {
        // Check if bookmarks need updating, return immediately if network is disconnected
        var checkForUpdates;
        if (!networkDisconnected) {
          checkForUpdates = bookmarks.CheckForUpdates();
        }
        else {
          checkForUpdates = $q.reject({ code: globals.ErrorCodes.HttpRequestFailed });
        }

        checkForUpdates
          .then(function (updatesAvailable) {
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
          // Update search results
          .then(displayDefaultSearchState)
          .catch(function (err) {
            // Display alert if not retrieving bookmark metadata
            if (!sharedUrl) {
              var errMessage = utility.GetErrorMessageFromException(err);
              vm.alert.display(errMessage.title, errMessage.message);
            }
          })
          .finally(function () {
            hideLoading('syncingUpdates');
          });
      })
      .catch(function (err) {
        // Display alert
        var errMessage = utility.GetErrorMessageFromException(err);
        vm.alert.display(errMessage.title, errMessage.message);
      });
  };

  var displayToast = function (title, description) {
    var message = (title) ? title + '. ' + description : description;

    window.plugins.toast.showWithOptions({
      message: message,
      duration: 6000,
      position: 'bottom',
      addPixelsY: -50
    });
  };

  var getLatestUpdates = function () {
    return bookmarks.CheckForUpdates()
      .then(function (updatesAvailable) {
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
      // Update search results
      .then(displayDefaultSearchState)
      .finally(function () {
        hideLoading('syncingUpdates');
      });
  };

  var handleBackButton = function (event) {
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
    platform.LocalStorage.Set(globals.CacheKeys.NetworkDisconnected, true);
  };

  var handleNetworkReconnected = function () {
    // If a previous sync failed due to lost connection, check for updates now
    platform.LocalStorage.Get([
      globals.CacheKeys.NetworkDisconnected,
      globals.CacheKeys.SyncEnabled
    ])
      .then(function (cachedData) {
        networkDisconnected = cachedData[globals.CacheKeys.NetworkDisconnected];
        syncEnabled = cachedData[globals.CacheKeys.SyncEnabled];

        if (syncEnabled && networkDisconnected) {
          getLatestUpdates()
            // Update search results
            .then(refreshSearchResults);
        }
      });
  };

  var handleTouchStart = function (event) {
    // Blur focus (and hide keyboard) when pressing out of text fields
    if (!isTextInput(event.target) && isTextInput(document.activeElement)) {
      $timeout(function () {
        document.activeElement.blur();
      }, 100);
    }
    // Deselect selected bookmark
    else if (vm.search.selectedBookmark) {
      vm.search.selectedBookmark = null;
    }
  };

  var initICloudDocStorage = function () {
    iCloudDocStorage.initUbiquitousContainer(
      null,
      function () {
        $scope.$apply(function () {
          vm.settings.iCloudNotAvailable = false;
        });
      },
      function () {
        $scope.$apply(function () {
          vm.settings.iCloudNotAvailable = true;
        });
      }
    );
  };

  var helpPanel7_Android_Next_Click = function () {
    vm.help.displayPanel(9);
  };

  var helpPanel9_Android_Prev_Click = function () {
    vm.help.displayPanel(7);
  };

  var helpPanel9_Next_Click = function () {
    vm.help.displayPanel(12);
  };

  var helpPanel12_Prev_Click = function () {
    vm.help.displayPanel(9);
  };

  var isTextInput = function (node) {
    return ['INPUT', 'TEXTAREA'].indexOf(node.nodeName) !== -1;
  };

  var refreshSearchResults = function () {
    if (vm.view.current !== vm.view.views.search) {
      return;
    }

    // Refresh search results
    document.activeElement.blur();
    vm.search.execute();
  };

  var resume = function () {
    var sharedUrl, syncEnabled;
    var networkDisconnected = !utility.IsNetworkConnected();

    // Check if sync enalbed and reset network disconnected flag
    $q.all([
      platform.LocalStorage.Get(globals.CacheKeys.SyncEnabled),
      platform.LocalStorage.Set(globals.CacheKeys.NetworkDisconnected, networkDisconnected)
    ])
      .then(function (cachedData) {
        syncEnabled = cachedData[globals.CacheKeys.SyncEnabled];

        // Deselect bookmark
        vm.search.selectedBookmark = null;

        // Check if a url was shared
        return checkForSharedUrl(syncEnabled);
      })
      .then(function (checkForSharedUrlResponse) {
        sharedUrl = checkForSharedUrlResponse;

        if (!syncEnabled) {
          return;
        }

        if (sharedUrl) {
          // Set shared url to current url and display bookmark panel
          currentUrl = sharedUrl;
          vm.view.change(vm.view.views.bookmark);
        }

        // Check if bookmarks need updating, return immediately if network is disconnected
        var checkForUpdates;
        if (!networkDisconnected) {
          checkForUpdates = bookmarks.CheckForUpdates();
        }
        else {
          checkForUpdates = $q.reject({ code: globals.ErrorCodes.HttpRequestFailed });
        }

        return checkForUpdates
          .then(function (updatesAvailable) {
            if (!updatesAvailable) {
              return;
            }

            // Show loading overlay if currently on the search panel
            if (vm.view.current === vm.view.views.search) {
              displayLoading('syncingUpdates');
            }

            // Get bookmark updates
            return sync(vm, { type: globals.SyncType.Pull })
              .then(function () {
                // Update search results if currently on the search panel and no query entered
                if (vm.view.current === vm.view.views.search && !vm.search.query) {
                  refreshSearchResults();
                }
              });
          })
          .finally(function () {
            hideLoading('syncingUpdates');
          });
      })
      .catch(function (err) {
        // Don't display alert if url was shared or if network error encountered
        if (!sharedUrl && err.code !== globals.ErrorCodes.HttpRequestFailed) {
          var errMessage = utility.GetErrorMessageFromException(err);
          vm.alert.display(errMessage.title, errMessage.message);
        }
      });
  };

  var syncForm_EnableSync_Click = function () {
    // Don't display confirmation before syncing
    vm.events.syncForm_ConfirmSync_Click();
  };

  // Call constructor
  return new AndroidImplementation();
};