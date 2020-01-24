var xBrowserSync = xBrowserSync || {};
xBrowserSync.App = xBrowserSync.App || {};
var SpinnerDialog = {};
SpinnerDialog.hide = function () { };
SpinnerDialog.show = function () { };

/* ------------------------------------------------------------------------------------
 * Class name:  xBrowserSync.App.PlatformImplementation 
 * Description: Implements xBrowserSync.App.Platform for Android app.
 * ------------------------------------------------------------------------------------ */

xBrowserSync.App.PlatformImplementation = function ($interval, $q, $timeout, platform, globals, utility, bookmarks) {
  'use strict';

  var backgroundSyncInterval, currentPage, loadingId, sharedBookmark, vm;

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
      "message": "<a href='https://link.xbrowsersync.org/download' class='new-tab'>Download</a> the xBrowserSync desktop browser extension and create a new sync to access your bookmarks here."
    },
    "help_Page_Welcome_Desktop_Content": {
      "message": "<h4>Welcome to xBrowserSync!</h4><p>xBrowserSync is a free and open-source alternative to browser sync services offered by Google, Mozilla, Opera and others, that respects your privacy and gives you complete anonymity (check out the <a href='https://link.xbrowsersync.org/www' class='new-tab'>website</a> for more info).</p><p>Take a moment to read through this help guide to familiarise yourself with xBrowserSync, using the paging links below or the arrow keys to move between pages.</p><p>Please note: xBrowserSync currently only syncs bookmarks. Syncing of additional browser data will be added in future versions, check out the development <a href='https://link.xbrowsersync.org/roadmap' class='new-tab'>roadmap</a> to see what’s planned.</p>"
    },
    "help_Page_Welcome_Android_Content": {
      "message": "<h4>Welcome to xBrowserSync!</h4><p>xBrowserSync is a free and open-source alternative to browser sync services offered by Google, Mozilla, Opera and others, that respects your privacy and gives you complete anonymity (check out the <a href='https://link.xbrowsersync.org/www' class='new-tab'>website</a> for more info)..</p><p>Take a moment to read through this help guide to familiarise yourself with xBrowserSync, using the paging links below or swiping to move between pages.</p><p>Please note: xBrowserSync currently only syncs bookmarks. Syncing of additional browser data will be added in future versions, check out the development <a href='https://link.xbrowsersync.org/roadmap' class='new-tab'>roadmap</a> to see what’s planned.</p>"
    },
    "help_Page_BeforeYouBegin_Chrome_Content": {
      "message": "<h4>Before you begin</h4><p>xBrowserSync modifies your local browser data so it’s a good idea to back up your bookmarks and other browser data just in case, and if you are using any other browser sync services or tools (such as <a href='https://link.xbrowsersync.org/chrome-sync' class='new-tab'>Google Chrome Sync</a>) please disable them to avoid conflicts.</p>"
    },
    "help_Page_BeforeYouBegin_Firefox_Content": {
      "message": "<h4>Before you begin</h4><p>xBrowserSync modifies your local browser data so it’s a good idea to back up your bookmarks and other browser data just in case, and if you are using any other browser sync services or tools (such as <a href='https://link.xbrowsersync.org/firefox-sync' class='new-tab'>Firefox Sync</a>) please disable them to avoid conflicts.</p>"
    },
    "help_Page_FirstSync_Desktop_Content": {
      "message": "<h4>Syncing for the first time</h4><p>Before xBrowserSync can sync your browser data you will need to provide an encryption password. Be sure to make it strong but also memorable, there are no resets or reminders so if you forget it you won’t be able to access your synced data.</p><p>Your browser data will be encrypted using your password and saved to the active xBrowserSync service configured in the Settings panel.</p><p>Once synced, any changes you make to your local bookmarks will be synced automatically by xBrowserSync.</p>"
    },
    "help_Page_FirstSync_Android_Content": {
      "message": "<h4>Syncing for the first time</h4><p>xBrowserSync actively syncs your browser data between your desktop browsers (syncing to mobile browsers is not supported at this time), you can use this app to access your synced data on your Android mobile device.</p><p>If you have not already created a sync ID, head over to your desktop browser and <a href='https://link.xbrowsersync.org/download' class='new-tab'>download</a> the xBrowserSync extension (available for Chrome and Firefox). Once you have created a sync you can use your new sync ID within this app to access your data.</p>"
    },
    "help_Page_SyncId_Content": {
      "message": "<h4>Your sync ID</h4><p>xBrowserSync ensures your privacy as no personal data is ever collected and your browser data is encrypted before being synced. To identify your synced data you are provided with an anonymous sync ID which can be used along with your password to sync your data on other browsers and devices.</p><p>Remember that your sync ID will only work with the xBrowserSync service on which it was created, when you change the active xBrowserSync service in the Settings panel you must create a new sync or use an existing sync ID created using that service.</p><p>Whenever you are synced you can view your sync ID in the Settings panel, click it to reveal a handy QR code to scan when syncing on mobile devices.</p>"
    },
    "help_Page_ExistingId_Desktop_Content": {
      "message": "<h4>Syncing with your existing ID</h4><p>Click on “Already got a sync ID?” to enter your existing sync ID and password. If you are synced to a different xBrowserSync service make sure it is configured as the active service in the Settings panel.</p><p>xBrowserSync will retrieve and decrypt your encrypted data using your locally stored password, then clear your local bookmarks before re-populating them from the decrypted data.</p><p>When synced, xBrowserSync checks in the background every fifteen minutes for updates to your synced data and will automatically update your local bookmarks when required. You can also manually sync available updates to your synced data in the Settings panel.</p>"
    },
    "help_Page_ExistingId_Android_Content": {
      "message": "<h4>Syncing with your existing ID</h4><p>Start by scanning the sync ID QR code in the Settings panel of the xBrowserSync desktop browser extension (click on your sync ID to reveal it). Make sure you enter the same encryption password used when creating the sync otherwise xBrowserSync will not be able to decrypt your data.</p><p>Also, if you are synced to a different xBrowserSync service make sure it is the active service configured in the Settings panel.</p>"
    },
    "help_Page_Service_Content": {
      "message": "<h4>Syncing to another service</h4><p>By default your data is synced to the <a href='https://link.xbrowsersync.org/api' class='new-tab'>official xBrowserSync service</a>, but you can control where your data is synced if you do not want to use the default service.</p><p>Check the list of available <a href='https://link.xbrowsersync.org/service-list' class='new-tab'>public xBrowserSync services</a> or <a href='https://link.xbrowsersync.org/api-repo' class='new-tab'>run your own service</a>, either for private use for ultimate security and privacy, or for public use so that more people can enjoy xBrowserSync.</p><p>At any time you can configure the active xBrowserSync service in the Settings panel.</p>"
    },
    "help_Page_Searching_Desktop_Content": {
      "message": "<h4>Searching your bookmarks</h4><p>Once synced, simply press Enter to display your recent bookmarks or type some keywords or a URL to search your bookmarks.</p><p>Toggle between search results and bookmark folders to browse the entire hierarchy.</p><p>To edit or delete a bookmark, hover over the bookmark and click the now visible edit icon next to the bookmark’s title.</p>"
    },
    "help_Page_Searching_Android_Content": {
      "message": "<h4>Searching your bookmarks</h4><p>Once synced, your bookmarks are displayed in chronological order when you open xBrowserSync. Type some keywords or a URL in the search box to search your bookmarks.</p><p>Toggle between search results and bookmark folders to browse the entire hierarchy.</p><p>Long pressing on a bookmark will allow you to directly share, modify or delete the bookmark.</p>"
    },
    "help_Page_AddingBookmarks_Chrome_Content": {
      "message": "<h4>Adding a bookmark</h4><p>Bookmark the current page by clicking on the bookmark icon in the Search panel. The bookmark’s properties will be populated for you automatically, otherwise add a description and some tags to ensure better search results.</p><p>Alternatively, simply click the browser’s “Bookmark this page” button as normal and xBrowserSync will automatically populate the bookmark’s properties (optional permissions must be granted for this to work, check the Settings panel).</p>"
    },
    "help_Page_AddingBookmarks_Firefox_Content": {
      "message": "<h4>Adding a bookmark</h4><p>Bookmark the current page by clicking on the bookmark icon in the Search panel. The bookmark’s properties will be populated for you automatically, otherwise add a description and some tags to ensure better search results.</p><p>Alternatively, simply click the browser’s “Bookmark this page” button as normal and xBrowserSync will automatically populate the bookmark’s properties.</p>"
    },
    "help_Page_AddingBookmarks_Android_Content": {
      "message": "<h4>Adding a bookmark</h4><p>Add bookmarks easily by sharing to xBrowserSync from any apps that share URLs such as browsers, YouTube, Spotify and many more.</p><p>The bookmark’s properties will be fetched for you, otherwise add a description and some tags to ensure better search results.</p>"
    },
    "help_Page_NativeFeatures_Chrome_Content": {
      "message": "<h4>Native features supported</h4><p>Feel free to continue using your browser’s native bookmarking features such as the bookmarks bar and bookmarks manager, any changes you make will be synced automatically in the background.</p><p>If you have organised your existing bookmarks into folders don’t worry, xBrowserSync will respect and maintain your existing bookmarks hierarchy.</p>"
    },
    "help_Page_NativeFeatures_Firefox_Content": {
      "message": "<h4>Native features supported</h4><p>Feel free to continue using your browser’s native bookmarking features such as the bookmarks toolbar and bookmarks library, any changes you make will be synced automatically in the background.</p><p>If you have organised your existing bookmarks into folders don’t worry, xBrowserSync will respect and maintain your existing bookmarks hierarchy.</p><p>Please note however, as Firefox’s bookmarks API does not yet support accessing native bookmark tags, any existing tags will be lost when syncing and tags added via xBrowserSync will not be saved as native tags.</p>"
    },
    "help_Page_BackingUp_Desktop_Content": {
      "message": "<h4>Remember to back up</h4><p>When you use xBrowserSync your data is your reponsibility so be smart and make sure to take backups.</p><p>Head over to the Settings panel and back up your unencrypted data to a local file which can be used to restore your data should you need to.</p><p>If your local browser data becomes corrupted and you don’t have any backups, you can at any time revert your data back to it’s original state from when xBrowserSync was installed.</p>"
    },
    "help_Page_BackingUp_Android_Content": {
      "message": "<h4>Remember to back up</h4><p>When you use xBrowserSync your data is your reponsibility so be smart and make sure to take backups.</p><p>Head over to the Settings panel and back up your unencrypted data to a local file which can be used to restore your data should you need to.</p>"
    },
    "help_Page_Shortcuts_Chrome_Content": {
      "message": "<h4>Use shortcuts!</h4><p>To search your bookmarks quickly, use the default keyboard shortcut (Ctrl+Space) to activate the extension, then simply press Enter to view your recent bookmarks or start typing to search.</p><p>To change the shortcut, browse to chrome://extensions/shortcuts and update the available shortcuts under xBrowserSync."
    },
    "help_Page_Shortcuts_Firefox_Content": {
      "message": "<h4>Use shortcuts!</h4><p>To search your bookmarks quickly, use the default keyboard shortcut (Ctrl+Space) to activate the extension, then simply press Enter to view your recent bookmarks or start typing to search.</p><p>To change the shortcut, browse to about:addons, click on “Manage Extension Shortcuts” in the Settings menu and update the available shortcuts under xBrowserSync."
    },
    "help_Page_Mobile_Content": {
      "message": "<h4>Go mobile</h4><p>Access your synced bookmarks on the move with the xBrowserSync Android app, available on <a href='https://link.xbrowsersync.org/download-android' class='new-tab'>Google Play</a> store, <a href='https://link.xbrowsersync.org/fdroid' class='new-tab'>F-Droid</a> or <a href='https://link.xbrowsersync.org/app-releases-latest' class='new-tab'>direct download</a>.</p>"
    },
    "help_Page_FurtherSupport_Content": {
      "message": "<h4>Further support</h4><p>You can find the answers to most common questions in the <a href='https://link.xbrowsersync.org/faqs' class='new-tab'>FAQs</a>, also check the current <a href='https://link.xbrowsersync.org/known-issues' class='new-tab'>known issues</a> to see if your issue is listed there.</p><p>Alternatively, use the <a href='https://link.xbrowsersync.org/app-issues' class='new-tab'>issue tracker</a> to report an issue or request a new feature.</p>"
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
      "message": "Your sync ID"
    },
    "login_IdField_InvalidSyncId_Label": {
      "message": "Not a valid sync ID"
    },
    "button_ScanCode_Label": {
      "message": "Scan ID"
    },
    "button_ToggleLight_Label": {
      "message": "Toggle light"
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
    "button_GetSyncId_Label": {
      "message": "Get a Sync ID"
    },
    "login_ConfirmSync_Title": {
      "message": "Create new sync?"
    },
    "login_ConfirmSync_Message": {
      "message": "No sync ID has been provided so a new sync will be created for you. OK to proceed?"
    },
    "login_DisableOtherSyncs_Title": {
      "message": "Disable bookmark sync tools"
    },
    "login_DisableOtherSyncs_Message": {
      "message": "Syncing your browser data with xBrowserSync whilst other bookmark sync tools (such as <a href='https://link.xbrowsersync.org/chrome-sync' class='new-tab'>Google Chrome Sync</a>) are active can cause duplication and possibly corrupted data. Please disable them before continuing."
    },
    "login_UpgradeSync_Title": {
      "message": "Ready to upgrade sync?"
    },
    "login_UpgradeSync_Message": {
      "message": "<p>This sync ID must be upgraded in order to sync with this version of xBrowserSync. After upgrading, you will not be able to sync with previous versions of xBrowserSync.</p><p>Ensure you have updated all of your xBrowserSync apps before continuing. Ready to proceed?</p>"
    },
    "login_ScanId_Title": {
      "message": "Scan your sync ID"
    },
    "login_ScanId_Message": {
      "message": "Open xBrowserSync on your desktop browser, go to the Settings panel and click on your sync ID to display a QR code which you can scan here."
    },
    "updated_Message": {
      "message": "xBrowserSync has been updated with the latest features and fixes. For more details about the changes contained in this release, check out the release notes."
    },
    "updated_Title": {
      "message": "Updated to v"
    },
    "support_Message": {
      "message": "<p>We want to make xBrowserSync the number one browser sync tool, but there’s still a lot to do:</p><ul><li>Add syncing of browser tabs and history</li><li>Support all major desktop browsers</li><li>Translate into other languages</li><li>And <a href='https://link.xbrowsersync.org/roadmap' class='new-tab'>much more</a>!</li></ul><p>Only with your support can we continue to improve xBrowserSync and ensure that it remains an effective tool in protecting our privacy and productivity against the rot of big tech!</p>"
    },
    "support_Title": {
      "message": "Support xBrowserSync!"
    },
    "permissions_Message": {
      "message": "<p>xBrowserSync automatically enriches bookmarks added using the browser’s Add Bookmark button with available metadata. To enable this, xBrowserSync <a href='https://link.xbrowsersync.org/optional-perms-faq' class='new-tab'>requires additional permissions</a> to be able to read visited website data.</p><p>Please indicate if prompted if you are happy to grant these permissions, alternatively you can add or remove permissions at any time in the Settings panel.</p>"
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
    "search_FolderEmpty_Message": {
      "message": "Folder empty"
    },
    "shareBookmark_Message": {
      "message": "Share bookmark with"
    },
    "bookmarkShared_Message": {
      "message": "shared from xBrowserSync"
    },
    "bookmarkCreated_Message": {
      "message": "Bookmark created"
    },
    "bookmarkDeleted_Message": {
      "message": "Bookmark deleted"
    },
    "bookmarkUpdated_Message": {
      "message": "Bookmark updated"
    },
    "scan_Title": {
      "message": "Scan your Sync ID QR code"
    },
    "settings_Sync_SyncToolbarConfirmation_Message": {
      "message": "<p>Enabling this setting will replace the bookmarks currently in the bookmarks toolbar with your synced bookmarks.</p><p>OK to proceed?</p>"
    },
    "settings_Sync_ConfirmCancelSync_Message": {
      "message": "<p>There is currently a sync in progress, if you proceed your local synced data will be incomplete.</p><p>OK to proceed?</p>"
    },
    "settings_Sync_Id_Description": {
      "message": "Use your sync ID to access your synced data on other devices."
    },
    "settings_Sync_SyncToolbar_Label": {
      "message": "Sync bookmarks toolbar"
    },
    "settings_Sync_SyncToolbar_Description": {
      "message": "Disable this setting to display different toolbar bookmarks across synced browers."
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
    "settings_BackupRestore_Revert_Label": {
      "message": "Revert"
    },
    "settings_BackupRestore_Revert_Description": {
      "message": "Revert local browser data to initial installation state."
    },
    "settings_BackupRestore_Revert_Confirmation_Message": {
      "message": "<p>If you continue, any active sync will be disabled and your local data will be reverted to when xBrowserSync was installed on {date}.</p><p>OK to proceed?</p>"
    },
    "settings_BackupRestore_Revert_Completed_Label": {
      "message": "Your data has been reverted to initial installation state."
    },
    "settings_BackupRestore_Revert_Unavailable_Label": {
      "message": "Installation state data not available, unable to revert."
    },
    "settings_About_Title": {
      "message": "About"
    },
    "settings_About_AppVersion_Label": {
      "message": "Version"
    },
    "button_ReleaseNotes_Label": {
      "message": "View release notes"
    },
    "button_Support_Label": {
      "message": "Support xBrowserSync"
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
    "button_Cryptos_Label": {
      "message": "Cryptos"
    },
    "button_Liberapay_Label": {
      "message": "Liberapay"
    },
    "button_Patreon_Label": {
      "message": "Patreon"
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
      "message": "Required to automatically add metadata to bookmarks when using the browser’s “Bookmark this page” button (<a href='https://link.xbrowsersync.org/optional-perms-faq' class='new-tab'>more info</a>)."
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
    "button_SearchResults_Label": {
      "message": "View search results"
    },
    "button_BookmarkTree_Label": {
      "message": "View bookmark folders"
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
    "settings_Service_Status_Loading": {
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
      "message": "Enter the URL of an alternative xBrowserSync service. Browse the list of public xBrowserSync services <a href='https://link.xbrowsersync.org/service-list' class='new-tab'>here</a>."
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
      "message": "<p>After changing the service, the current sync will be disabled and you’ll need to create a new sync.</p><p>If you have previously created a sync using this service and would like to retrieve your data, you can use the sync ID provided at the time.</p><p>OK to proceed?</p>"
    },
    "settings_Service_UpdateForm_Required_Label": {
      "message": "xBrowserSync service URL is required"
    },
    "settings_Service_UpdateForm_InvalidService_Label": {
      "message": "Not a valid xBrowserSync service"
    },
    "settings_Service_UpdateForm_RequestFailed_Label": {
      "message": "Unable to connect to the service"
    },
    "settings_Service_UpdateForm_ServiceVersionNotSupported_Label": {
      "message": "This service is running an unsupported API version"
    },
    "settings_BackupRestore_Title": {
      "message": "Back up and restore"
    },
    "settings_NotAvailable_Message": {
      "message": "Settings available when sync is enabled."
    },
    "settings_Prefs_Title": {
      "message": "Preferences"
    },
    "settings_Prefs_SearchBar_Label": {
      "message": "Display search bar beneath results"
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
    "button_ShowPassword_Label": {
      "message": "Reveal password"
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
    "button_OK_Label": {
      "message": "Got it"
    },
    "button_Dismiss_Label": {
      "message": "Dismiss"
    },
    "downloadFile_Success_Message": {
      "message": "File saved as {fileName}."
    },
    "settings_BackupRestore_RestoreSuccess_Message": {
      "message": "Your data has been restored."
    },
    "settings_BackupRestore_RestoreForm_BackupFile_Description": {
      "message": "Select a backup file to restore..."
    },
    "settings_BackupRestore_RestoreForm_Message": {
      "message": "Copy the contents of a backup file to restore data."
    },
    "settings_BackupRestore_RestoreForm_DataField_Label": {
      "message": "Paste backup data"
    },
    "settings_BackupRestore_RestoreForm_Invalid_Label": {
      "message": "Invalid xBrowserSync backup data"
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
    "settings_Sync_Id_Label": {
      "message": "Sync ID"
    },
    "settings_Sync_DisplayQRCode_Message": {
      "message": "Display QR code"
    },
    "settings_Service_DataUsage_Label": {
      "message": "Data usage"
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
    "button_UpdateBookmarkProperties_Label": {
      "message": "Update bookmark properties"
    },
    "button_ClearTags_Label": {
      "message": "Clear tags"
    },
    "button_Revert_Label": {
      "message": "Revert"
    },
    "qr_Copied_Label": {
      "message": "Copied!"
    },
    "qr_CopySyncId_Label": {
      "message": "Copy sync ID to clipboard"
    },
    "qr_Message": {
      "message": "Scan this QR code using the xBrowserSync Android app to access your synced data on your mobile device."
    },
    "working_Title": {
      "message": "Syncing..."
    },
    "workingOffline_Title": {
      "message": "Working offline"
    },
    "workingOffline_Message": {
      "message": "Any changes will be synced once connection is restored."
    },
    "getMetadata_Message": {
      "message": "Fetching bookmark properties, touch to cancel."
    },
    "getMetadata_Success_Message": {
      "message": "Bookmark properties updated."
    },
    "bookmarks_Container_Menu_Title": {
      "message": "Menu bookmarks"
    },
    "bookmarks_Container_Mobile_Title": {
      "message": "Mobile bookmarks"
    },
    "bookmarks_Container_Other_Title": {
      "message": "Other bookmarks"
    },
    "bookmarks_Container_Toolbar_Title": {
      "message": "Toolbar bookmarks"
    },
    "error_Default_Title": {
      "message": "Something went wrong"
    },
    "error_Default_Message": {
      "message": "If the problem persists please report the issue: link.xbrowsersync.org/app-issues."
    },
    "error_HttpRequestFailed_Title": {
      "message": "Connection to service lost"
    },
    "error_HttpRequestFailed_Message": {
      "message": "Check your network connection and try again."
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
      "message": "Delete some bookmarks and try again or switch to a service with a larger sync limit."
    },
    "error_NotAcceptingNewSyncs_Title": {
      "message": "Service not accepting new syncs"
    },
    "error_NotAcceptingNewSyncs_Message": {
      "message": "Switch to a different service or try again later."
    },
    "error_DailyNewSyncLimitReached_Title": {
      "message": "Daily new sync limit reached"
    },
    "error_DailyNewSyncLimitReached_Message": {
      "message": "Sync to an existing sync ID, switch to a different service or try again tomorrow."
    },
    "error_MissingClientData_Title": {
      "message": "Missing credentials"
    },
    "error_MissingClientData_Message": {
      "message": "Unable to find stored credentials. Re-enable sync and try again."
    },
    "error_InvalidCredentials_Title": {
      "message": "Invalid credentials"
    },
    "error_InvalidCredentials_Message": {
      "message": "Check your sync ID and password, and ensure the active service is where the sync was created."
    },
    "error_SyncRemoved_Title": {
      "message": "Sync not found"
    },
    "error_SyncRemoved_Message": {
      "message": "The requested sync does not exist, it may have been removed due to inactivity."
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
      "message": "Local data has been refreshed, please redo previous unsynced changes."
    },
    "error_OutOfSync_Title": {
      "message": "Sync conflict detected"
    },
    "error_OutOfSync_Message": {
      "message": "Local data was out of sync and has now been refreshed. Please redo previous unsynced changes."
    },
    "error_InvalidService_Title": {
      "message": "Invalid xBrowserSync service"
    },
    "error_InvalidService_Message": {
      "message": "The service URL is not a valid xBrowserSync service."
    },
    "error_ServiceOffline_Title": {
      "message": "Service offline"
    },
    "error_ServiceOffline_Message": {
      "message": "The xBrowserSync service is currently offline, try again later."
    },
    "error_UnsupportedServiceApiVersion_Title": {
      "message": "Service not supported"
    },
    "error_UnsupportedServiceApiVersion_Message": {
      "message": "This service is running an unsupported API version."
    },
    "error_ContainerChanged_Title": {
      "message": "xBrowserSync folder changed"
    },
    "error_ContainerChanged_Message": {
      "message": "Please avoid modifying [xbs] folders as it can cause sync issues."
    },
    "error_LocalContainerNotFound_Title": {
      "message": "Unexpected bookmarks structure"
    },
    "error_LocalContainerNotFound_Message": {
      "message": "Possible corrupt browser profile, try creating a new profile as it may resolve the issue."
    },
    "error_FailedGetPageMetadata_Title": {
      "message": "Couldn’t get bookmark properties"
    },
    "error_FailedGetPageMetadata_Message": {
      "message": "URL is invalid or webpage data could not be retrieved."
    },
    "error_ScanFailed_Message": {
      "message": "Scan failed. Check permission has been granted and try again."
    },
    "error_ShareFailed_Title": {
      "message": "Share failed"
    },
    "error_FailedDownloadFile_Title": {
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
    },
    "error_FailedRefreshBookmarks_Title": {
      "message": "Couldn’t retrieve updates"
    },
    "error_UncommittedSyncs_Title": {
      "message": "Changes not synced"
    },
    "error_UncommittedSyncs_Message": {
      "message": "Sync will be committed once connection to service is restored."
    }
  };


	/* ------------------------------------------------------------------------------------
	 * Constructor
	 * ------------------------------------------------------------------------------------ */

  var AndroidImplementation = function () {
    // Inject required platform implementation functions
    platform.AutomaticUpdates.NextUpdate = getAutoUpdatesNextRun;
    platform.AutomaticUpdates.Start = startAutoUpdates;
    platform.AutomaticUpdates.Stop = stopAutoUpdates;
    platform.Bookmarks.Clear = clearBookmarks;
    platform.Bookmarks.CreateSingle = createSingle;
    platform.Bookmarks.DeleteSingle = deleteSingle;
    platform.Bookmarks.Get = getBookmarks;
    platform.Bookmarks.Populate = populateBookmarks;
    platform.Bookmarks.Share = shareBookmark;
    platform.Bookmarks.UpdateSingle = updateSingle;
    platform.CopyToClipboard = copyToClipboard;
    platform.DownloadFile = downloadFile;
    platform.GetConstant = getConstant;
    platform.GetCurrentUrl = getCurrentUrl;
    platform.GetHelpPages = getHelpPages;
    platform.GetPageMetadata = getPageMetadata;
    platform.GetSupportedUrl = getSupportedUrl;
    platform.Init = init;
    platform.Interface.Loading.Show = displayLoading;
    platform.Interface.Loading.Hide = hideLoading;
    platform.Interface.Refresh = refreshInterface;
    platform.LocalStorage.Get = getFromLocalStorage;
    platform.LocalStorage.Set = setInLocalStorage;
    platform.OpenUrl = openUrl;
    platform.Scanner.Start = startScanning;
    platform.Scanner.Stop = stopScanning;
    platform.Scanner.ToggleLight = toggleLight;
    platform.Sync.Await = awaitSync;
    platform.Sync.Current = getCurrentSync;
    platform.Sync.Queue = queueSync;
  };


	/* ------------------------------------------------------------------------------------
	 * Public functions
	 * ------------------------------------------------------------------------------------ */

  var awaitSync = function (syncToAwait) {
    return bookmarks.QueueSync()
      .then(function () {
        return syncToAwait.deferred.promise;
      })
      .then(function () {
        utility.LogInfo('Awaited sync complete: ' + syncToAwait.uniqueId);
        return true;
      });
  };

  var clearBookmarks = function () {
    return $q.resolve();
  };

  var copyToClipboard = function (textToCopy) {
    return $q(function (resolve, reject) {
      cordova.plugins.clipboard.copy(textToCopy, resolve, reject);
    });
  };

  var createSingle = function () {
    return $q.resolve();
  };

  var deleteSingle = function () {
    return $q.resolve();
  };

  var displayLoading = function (id, cancelledCallback) {
    var timeout;

    // Return if loading overlay already displayed
    if (loadingId) {
      return;
    }

    switch (id) {
      // Checking updated service url, wait a moment before displaying loading overlay
      case 'checkingNewServiceUrl':
        timeout = $timeout(function () {
          SpinnerDialog.show(null, getConstant(globals.Constants.Working_Title), true);
        }, 100);
        break;
      // Loading bookmark metadata, display cancellable overlay
      case 'retrievingMetadata':
        var cancel = function () {
          SpinnerDialog.hide();
          loadingId = null;
          cancelledCallback();
        };
        SpinnerDialog.hide();
        timeout = $timeout(function () {
          SpinnerDialog.show(null, getConstant(globals.Constants.GetMetadata_Message), cancel);
        }, 250);
        break;
      // Display default overlay
      default:
        timeout = $timeout(function () {
          SpinnerDialog.show(null, getConstant(globals.Constants.Working_Title), true);
        });
        break;
    }

    loadingId = id;
    return timeout;
  };

  var downloadFile = function (fileName, textContents) {
    if (!fileName) {
      throw new Error('File name not supplied.');
    }

    // Set file storage location to external storage root directory
    var storageLocation = cordova.file.externalRootDirectory + "Download";

    return $q(function (resolve, reject) {
      var onError = function () {
        return reject({ code: globals.ErrorCodes.FailedDownloadFile });
      };

      utility.LogInfo('Downloading file ' + fileName);

      // Save file to storage location
      window.resolveLocalFileSystemURL(storageLocation, function (dirEntry) {
        dirEntry.getFile(fileName, { create: true }, function (fileEntry) {
          fileEntry.createWriter(function (fileWriter) {
            fileWriter.write(textContents);
            fileWriter.onerror = onError;
            fileWriter.onwriteend = function () {
              // Return message to be displayed
              var message = getConstant(globals.Constants.DownloadFile_Success_Message).replace('{fileName}', fileEntry.name);
              resolve(message);
            };
          }, onError);
        }, onError);
      }, onError);
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

  var getBookmarks = function () {
    return $q.resolve();
  };

  var getConstant = function (constName) {
    return constants[constName].message;
  };

  var getCurrentSync = function () {
    // Platform doesnt support checking for syncs in progress on startup
    return $q.resolve();
  };

  var getCurrentUrl = function () {
    return $q.resolve(currentPage && currentPage.url);
  };

  var getHelpPages = function () {
    var pages = [
      getConstant(globals.Constants.Help_Page_Welcome_Android_Content),
      getConstant(globals.Constants.Help_Page_FirstSync_Android_Content),
      getConstant(globals.Constants.Help_Page_SyncId_Content),
      getConstant(globals.Constants.Help_Page_ExistingId_Android_Content),
      getConstant(globals.Constants.Help_Page_Service_Content),
      getConstant(globals.Constants.Help_Page_Searching_Android_Content),
      getConstant(globals.Constants.Help_Page_AddingBookmarks_Android_Content),
      getConstant(globals.Constants.Help_Page_BackingUp_Android_Content),
      getConstant(globals.Constants.Help_Page_FurtherSupport_Content)
    ];

    return pages;
  };

  var getAllFromLocalStorage = function () {
    return $q(function (resolve, reject) {
      var cachedData = {};

      var failure = function (err) {
        err = err || new Error();
        if (err.code === 2) {
          // Item not found
          return resolve(null);
        }

        utility.LogError(err, 'platform.getAllFromLocalStorage');
        err.code = globals.ErrorCodes.FailedLocalStorage;
        reject(err);
      };

      var success = function (keys) {
        $q.all(keys.map(function (key) {
          return $q(function (resolveGetItem, rejectGetItem) {
            NativeStorage.getItem(key,
              function (result) {
                cachedData[key] = result;
                resolveGetItem();
              }, rejectGetItem);
          });
        }))
          .then(function () {
            resolve(cachedData);
          })
          .catch(failure);
      };

      NativeStorage.keys(success, failure);
    });
  };

  var getFromLocalStorage = function (storageKeys) {
    var getItem = function (key) {
      return $q(function (resolve, reject) {
        var failure = function (err) {
          err = err || new Error();
          if (err.code === 2) {
            // Item not found
            return resolve(null);
          }

          utility.LogError(err, 'platform.getFromLocalStorage');
          err.code = globals.ErrorCodes.FailedLocalStorage;
          reject(err);
        };

        NativeStorage.getItem(key, resolve, failure);
      });
    };

    // Filter by requested keys
    var getCachedData;
    switch (true) {
      case storageKeys == null:
        // No keys supplied, get all
        getCachedData = getAllFromLocalStorage();
        break;
      case Array.isArray(storageKeys):
        // Array of keys supplied, get all then filter
        getCachedData = getAllFromLocalStorage()
          .then(function (cachedData) {
            return _.pick(cachedData, storageKeys);
          });
        break;
      default:
        // Single key supplied, get single item
        getCachedData = getItem(storageKeys);
    }

    return getCachedData;
  };

  var getPageMetadata = function (getFullMetadata, pageUrl) {
    var inAppBrowser, timeout;

    // Set default metadata from provided page url or current page
    var metadata = {
      title: currentPage ? currentPage.title : null,
      url: pageUrl ? pageUrl : currentPage ? currentPage.url : null
    };

    return $q(function (resolve, reject) {
      // Return if no url set
      if (!metadata.url) {
        vm.bookmark.addButtonDisabledUntilEditForm = true;
        return resolve();
      }

      // If url was provided, check connection and is valid http url
      var httpRegex = new RegExp(globals.URL.HttpRegex, 'i');
      if (pageUrl && (!utility.IsNetworkConnected() || !httpRegex.test(pageUrl))) {
        utility.LogWarning('Didn’t get page metadata');
        return reject({ code: globals.ErrorCodes.FailedGetPageMetadata });
      }

      var handleResponse = function (pageContent, err) {
        var parser;
        platform.Interface.Loading.Hide('retrievingMetadata', timeout);

        // Check html content was returned
        if (err || !pageContent) {
          if (err) {
            utility.LogError(err, 'platform.handleResponse');
          }
          utility.LogWarning('Didn’t get page metadata');
          return reject({ code: globals.ErrorCodes.FailedGetPageMetadata });
        }

        // Extract metadata properties
        parser = new DOMParser();
        var document = parser.parseFromString(pageContent, 'text/html');

        // Get all meta tags
        var metaTagsArr = document.getElementsByTagName('meta');

        var getPageDescription = function () {
          for (var i = 0; i < metaTagsArr.length; i++) {
            var currentTag = metaTagsArr[i];
            if ((currentTag.getAttribute('property') && currentTag.getAttribute('property').toUpperCase().trim() === 'OG:DESCRIPTION' && currentTag.getAttribute('content')) ||
              (currentTag.getAttribute('name') && currentTag.getAttribute('name').toUpperCase().trim() === 'TWITTER:DESCRIPTION' && currentTag.getAttribute('content')) ||
              (currentTag.getAttribute('name') && currentTag.getAttribute('name').toUpperCase().trim() === 'DESCRIPTION' && currentTag.getAttribute('content'))) {
              return (currentTag.getAttribute('content')) ? currentTag.getAttribute('content').trim() : '';
            }
          }

          return null;
        };

        var getPageKeywords = function () {
          // Get open graph tag values 
          var currentTag, i, keywords = [];
          for (i = 0; i < metaTagsArr.length; i++) {
            currentTag = metaTagsArr[i];
            if (currentTag.getAttribute('property') &&
              currentTag.getAttribute('property').trim().match(/VIDEO\:TAG$/i) &&
              currentTag.getAttribute('content')) {
              keywords.push(currentTag.getAttribute('content').trim());
            }
          }

          // Get meta tag values 
          for (i = 0; i < metaTagsArr.length; i++) {
            currentTag = metaTagsArr[i];
            if (currentTag.getAttribute('name') &&
              currentTag.getAttribute('name').toUpperCase().trim() === 'KEYWORDS' &&
              currentTag.getAttribute('content')) {
              var metaKeywords = currentTag.getAttribute('content').split(',');
              for (i = 0; i < metaKeywords.length; i++) {
                var currentKeyword = metaKeywords[i];
                if (currentKeyword && currentKeyword.trim()) {
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
            if ((tag.getAttribute('property') && tag.getAttribute('property').toUpperCase().trim() === 'OG:TITLE' && tag.getAttribute('content')) ||
              (tag.getAttribute('name') && tag.getAttribute('name').toUpperCase().trim() === 'TWITTER:TITLE' && tag.getAttribute('content'))) {
              return (tag.getAttribute('content')) ? tag.getAttribute('content').trim() : '';
            }
          }

          return document.title;
        };

        // Update metadata with retrieved page data and return
        metadata.title = getPageTitle();
        metadata.description = getPageDescription();
        metadata.tags = getPageKeywords();
        resolve(metadata);
      };

      // If network disconnected fail immediately, otherwise retrieve page metadata
      if (!utility.IsNetworkConnected()) {
        return handleResponse();
      }

      var cancelledCallback = function () { resolve(metadata); };
      timeout = platform.Interface.Loading.Show('retrievingMetadata', cancelledCallback);
      inAppBrowser = cordova.InAppBrowser.open(metadata.url, '_blank', 'hidden=yes');

      inAppBrowser.addEventListener('loaderror', function (event) {
        var errMessage = event && event.message ? event.message : 'Failed to load webpage';
        handleResponse(null, new Error(errMessage));
      });

      inAppBrowser.addEventListener('loadstop', function () {
        // Return if inAppBrowser has already been closed
        if (!inAppBrowser) {
          return;
        }

        // Remove invasive content and return doc html
        inAppBrowser.executeScript({
          code:
            "(function() { var elements = document.querySelectorAll('video,script'); for (var i = 0; i < elements.length; i++) { elements[i].parentNode.removeChild(elements[i]); } })();" +
            "document.querySelector('html').outerHTML;"
        },
          handleResponse);
      });
    })
      .finally(function () {
        // Close InAppBrowser
        if (inAppBrowser) {
          inAppBrowser.close();
          inAppBrowser = null;
        }
      });
  };

  var getSupportedUrl = function (url) {
    return url;
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

  var init = function (viewModel) {
    return $q(function (resolve, reject) {
      // Load cordova.js
      var script = document.createElement('script');
      script.src = 'cordova.js';
      script.onload = function () {
        // Bind to device events
        document.addEventListener('deviceready', function () {
          handleDeviceReady(viewModel, resolve, reject);
        }, false);
        document.addEventListener('resume', handleResume, false);
      };
      document.getElementsByTagName('head')[0].appendChild(script);
    });
  };

  var openUrl = function (url) {
    window.open(url, '_system', '');
  };

  var populateBookmarks = function () {
    // Unused for this platform
    return $q.resolve();
  };

  var queueSync = function (syncData, command) {
    syncData.command = command || globals.Commands.SyncBookmarks;

    // Add sync data to queue and run sync
    return bookmarks.QueueSync(syncData)
      .then(function () {
        if (syncData.changeInfo === undefined) {
          return;
        }
        switch (true) {
          case syncData.changeInfo.type === globals.UpdateType.Create:
            $timeout(function () {
              vm.alert.display(null, getConstant(globals.Constants.BookmarkCreated_Message));
            }, 200);
            break;
          case syncData.changeInfo.type === globals.UpdateType.Delete:
            $timeout(function () {
              vm.alert.display(null, getConstant(globals.Constants.BookmarkDeleted_Message));
            }, 200);
            break;
          case syncData.changeInfo.type === globals.UpdateType.Update:
            $timeout(function () {
              vm.alert.display(null, getConstant(globals.Constants.BookmarkUpdated_Message));
            }, 200);
            break;
        }
      })
      .catch(function (err) {
        // If local data out of sync, queue refresh sync
        return (bookmarks.CheckIfRefreshSyncedDataOnError(err) ? refreshLocalSyncData() : $q.resolve())
          .then(function () {
            // Check for uncommitted syncs
            if (err.code === globals.ErrorCodes.SyncUncommitted) {
              vm.alert.display(
                getConstant(globals.Constants.Error_UncommittedSyncs_Title),
                getConstant(globals.Constants.Error_UncommittedSyncs_Message)
              );

              enableBackgroundSync();
              return;
            }

            throw err;
          });
      });
  };

  var refreshInterface = function () {
    // Unused for this platform
    return $q.resolve();
  };

  var setInLocalStorage = function (storageKey, value) {
    return $q(function (resolve, reject) {
      var errorCallback = function (err) {
        err = err || new Error();
        err.code = globals.ErrorCodes.FailedLocalStorage;
        reject(err);
      };

      if (value != null) {
        NativeStorage.setItem(storageKey, value, resolve, errorCallback);
      }
      else {
        NativeStorage.remove(storageKey, resolve, errorCallback);
      }
    });
  };

  var startScanning = function () {
    vm.scanner.lightEnabled = false;
    vm.scanner.invalidSyncId = false;

    return $q(function (resolve, reject) {
      var waitForScan = function () {
        $timeout(function () {
          vm.scanner.invalidSyncId = false;
        }, 100);

        QRScanner.scan(function (err, scannedText) {
          if (err) {
            var scanError = new Error(err._message || err.name || err.code);
            utility.LogError(scanError, 'platform.startScanning');
            return reject(scanError);
          }

          QRScanner.pausePreview(function () {
            utility.LogInfo('Scanned: ' + scannedText);

            if (!utility.SyncIdIsValid(scannedText)) {
              vm.scanner.invalidSyncId = true;
              $timeout(function () {
                QRScanner.resumePreview(waitForScan);
              }, 3e3);
              return;
            }

            $timeout(function () {
              resolve(scannedText);
            }, 1e3);
          });
        });
      };

      QRScanner.prepare(function (err, status) {
        if (err) {
          var authError = new Error(err._message || err.name || err.code);
          utility.LogError(authError, 'platform.startScanning');
          return reject(authError);
        }

        if (status.authorized) {
          QRScanner.show(function () {
            $timeout(function () {
              vm.view.change(vm.view.views.scan);
              waitForScan();
            }, 500);
          });
        } else {
          var noAuthError = new Error('Not authorised');
          utility.LogError(noAuthError, 'platform.startScanning');
          reject(noAuthError);
        }
      });
    })
      .catch(function (err) {
        return $q.reject({
          code: globals.ErrorCodes.FailedScan,
          stack: err.stack
        });
      });
  };

  var stopScanning = function () {
    disableLight()
      .catch(function () { })
      .finally(function () {
        QRScanner.hide(function () {
          QRScanner.destroy();
        });
      });
    return $q.resolve();
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
      vm.alert.display(errMessage.title, errMessage.message, 'danger');
    };

    // Display share sheet
    window.plugins.socialsharing.shareWithOptions(options, null, onError);
  };

  var startAutoUpdates = function () {
    return $q.resolve();
  };

  var stopAutoUpdates = function () {

  };

  var toggleLight = function (switchOn) {
    // If state was elected toggle light based on value
    if (switchOn !== undefined) {
      return (switchOn ? enableLight() : disableLight())
        .then(function () {
          return switchOn;
        });
    }

    // Otherwise toggle light based on current state
    return $q(function (resolve, reject) {
      QRScanner.getStatus(function (status) {
        (status.lightEnabled ? disableLight() : enableLight())
          .then(function () {
            resolve(!status.lightEnabled);
          })
          .catch(reject);
      });
    });
  };

  var updateSingle = function () {
    return $q.resolve();
  };


	/* ------------------------------------------------------------------------------------
	 * Private functions
	 * ------------------------------------------------------------------------------------ */

  var checkForInstallOrUpgrade = function () {
    // Check for stored app version and compare it to current
    return getFromLocalStorage(globals.CacheKeys.AppVersion)
      .then(function (currentVersion) {
        return currentVersion ? handleUpgrade(currentVersion, globals.AppVersion) : handleInstall(globals.AppVersion);
      });
  };

  var checkForSharedBookmark = function () {
    var bookmark = getSharedBookmark();
    if (!bookmark) {
      return $q.resolve();
    }

    // Set current page as shared bookmark and display bookmark panel
    currentPage = bookmark;
    return vm.view.change(vm.view.views.bookmark)
      .finally(function () {
        // Clear current page
        currentPage = null;
      });
  };

  var disableBackgroundSync = function () {
    if (!backgroundSyncInterval) {
      return;
    }

    $interval.cancel(backgroundSyncInterval);
    backgroundSyncInterval = null;
    cordova.plugins.backgroundMode.disable();
  };

  var disableLight = function () {
    return $q(function (resolve, reject) {
      QRScanner.disableLight(function (err) {
        if (err) {
          var error = new Error(err._message || err.name || err.code);
          utility.LogError(error, 'platform.disableLight');
          return reject(error);
        }

        resolve();
      });
    });
  };

  var displayDefaultSearchState = function () {
    // Clear search and display all bookmarks
    document.activeElement.blur();
    vm.search.query = null;
    vm.search.queryMeasure = null;
    vm.search.lookahead = null;
    return vm.search.execute();
  };

  var displayErrorAlert = function (err) {
    // Display alert
    var errMessage = utility.GetErrorMessageFromException(err);
    vm.alert.display(errMessage.title, errMessage.message, 'danger');
  };

  var displaySnackbar = function (title, description, level, action, actionCallback) {
    var text = (title ? title + '. ' + description : description).replace(/\.$/, '') + '.';
    var textColor = '#ffffff';
    var bgColor = null;
    switch (level) {
      case 'danger':
        bgColor = '#ea3869';
        break;
      case 'success':
        bgColor = '#30d278';
        break;
      case 'warning':
        bgColor = '#30d278';
        break;
      default:
        bgColor = '#083039';
        break;
    }
    var success = function (clicked) {
      if (clicked && actionCallback) {
        actionCallback();
      }
    };
    var failure = function (errMessage) {
      utility.LogError(new Error(errMessage), 'platform.displaySnackbar');
    };

    // Ensure soft keyboard is hidden
    if (document.activeElement) {
      document.activeElement.blur();
    }

    // Display snackbar
    cordova.plugins.snackbar.create(
      text,
      5000,
      bgColor,
      textColor,
      3,
      action,
      success,
      failure);
  };

  var enableBackgroundSync = function () {
    // Exit if background sync already enabled
    if (backgroundSyncInterval) {
      return;
    }

    // Keep app running in background
    cordova.plugins.backgroundMode.enable();

    // Try executing sync periodically
    backgroundSyncInterval = $interval(function () {
      // Only execute sync if app running in background
      if (!cordova.plugins.backgroundMode.isActive()) {
        return;
      }

      executeSync(true);
    }, 120e3);
  };

  var enableLight = function () {
    return $q(function (resolve, reject) {
      QRScanner.enableLight(function (err) {
        if (err) {
          var error = new Error(err._message || err.name || err.code);
          utility.LogError(error, 'platform.enableLight');
          return reject(error);
        }

        resolve();
      });
    });
  };

  var executeSync = function (isBackgroundSync) {
    // Display loading panel if not background sync
    if (!isBackgroundSync) {
      displayLoading();
    }

    // Sync bookmarks
    return bookmarks.Sync(isBackgroundSync)
      .then(function () {
        // Disable background sync if sync successfull
        if (isBackgroundSync) {
          disableBackgroundSync();
        }
      })
      .catch(function (err) {
        // Display alert if not background sync
        if (!isBackgroundSync) {
          displayErrorAlert(err);
        }
      })
      .finally(hideLoading);
  };

  var executeSyncIfOnline = function () {
    var isOnline = utility.IsNetworkConnected();

    // If not online display an alert and return
    if (!isOnline) {
      vm.alert.display(
        getConstant(globals.Constants.WorkingOffline_Title),
        getConstant(globals.Constants.WorkingOffline_Message)
      );

      return $q.resolve(false);
    }

    // Sync bookmarks
    return executeSync();
  };

  var getSharedBookmark = function () {
    if (!sharedBookmark) {
      return;
    }

    var bookmark = sharedBookmark;
    sharedBookmark = null;
    return bookmark;
  };

  var handleBackButton = function (event) {
    if (vm.view.current === vm.view.views.bookmark ||
      vm.view.current === vm.view.views.settings ||
      vm.view.current === vm.view.views.help ||
      vm.view.current === vm.view.views.support ||
      vm.view.current === vm.view.views.updated ||
      vm.view.current === vm.view.views.scan
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

  var handleDeviceReady = function (viewModel, success, failure) {
    // Set global variables
    vm = viewModel;

    // Set platform
    vm.platformName = globals.Platforms.Android;

    // Configure events
    document.addEventListener('backbutton', handleBackButton, false);
    document.addEventListener('touchstart', handleTouchStart, false);
    window.addEventListener('keyboardDidShow', handleKeyboardDidShow);
    window.addEventListener('keyboardWillHide', handleKeyboardWillHide);

    // Check if an intent started the app and detect future shared intents 
    window.plugins.intentShim.getIntent(handleNewIntent, function () { });
    window.plugins.intentShim.onIntent(handleNewIntent);

    // Enable app working in background to check for uncommitted syncs
    cordova.plugins.backgroundMode.setDefaults({ hidden: true, silent: true });
    cordova.plugins.backgroundMode.on('activate', function () {
      cordova.plugins.backgroundMode.disableWebViewOptimizations();
    });

    // Set required events to mobile app handlers
    vm.events.syncForm_EnableSync_Click = syncForm_EnableSync_Click;

    // Set clear search button to display all bookmarks
    vm.search.displayDefaultState = displayDefaultSearchState;

    // Enable select file to restore
    vm.settings.fileRestoreEnabled = true;

    // Increase search results timeout to avoid display lag
    vm.settings.getSearchResultsDelay = 500;

    // Display existing sync panel by default
    vm.sync.displayNewSyncPanel = false;

    // Use snackbar for alerts
    vm.alert.display = displaySnackbar;

    // Check for upgrade or do fresh install
    return checkForInstallOrUpgrade()
      // Run startup process after install/upgrade
      .then(handleStartup)
      .then(success)
      .catch(failure);
  };

  var handleInstall = function (installedVersion) {
    return $q.all([
      setInLocalStorage(globals.CacheKeys.AppVersion, installedVersion),
      setInLocalStorage(globals.CacheKeys.DisplayHelp, true)
    ])
      .then(function () {
        utility.LogInfo('Installed v' + installedVersion);
      });
  };

  var handleKeyboardDidShow = function (event) {
    document.body.style.height = 'calc(100% - ' + event.keyboardHeight + 'px)';
    setTimeout(function () {
      document.activeElement.scrollIntoViewIfNeeded();
    }, 100);
  };

  var handleKeyboardWillHide = function () {
    document.body.style.removeProperty('height');
  };

  var handleNewIntent = function (intent) {
    if (!intent || !intent.extras) {
      return;
    }

    utility.LogInfo('Detected new intent: ' + intent.extras['android.intent.extra.TEXT']);

    // Set shared bookmark with shared intent data
    sharedBookmark = {
      title: intent.extras['android.intent.extra.SUBJECT'],
      url: intent.extras['android.intent.extra.TEXT']
    };
  };

  var handleResume = function () {
    // Check if sync enabled and reset network disconnected flag
    platform.LocalStorage.Get(globals.CacheKeys.SyncEnabled)
      .then(function (syncEnabled) {
        // Deselect bookmark
        vm.search.selectedBookmark = null;

        if (!syncEnabled) {
          return;
        }

        // Check if a bookmark was shared
        checkForSharedBookmark();

        // Run sync
        return executeSyncIfOnline()
          .then(function (isOnline) {
            if (isOnline === false) {
              return;
            }

            // Refresh search results if query not present
            if (vm.view.current === vm.view.views.search && !vm.search.query) {
              displayDefaultSearchState();
            }
          });
      })
      .catch(displayErrorAlert);
  };

  var handleStartup = function () {
    var syncEnabled;

    utility.LogInfo('Starting up');

    // Prime bookmarks cache and retrieve cached data
    var primeBookmarksCache = bookmarks.GetBookmarks().catch(function () { });
    return getFromLocalStorage()
      .then(function (cachedData) {
        syncEnabled = cachedData[globals.CacheKeys.SyncEnabled];

        // Add useful debug info to beginning of trace log
        cachedData.platform = {
          name: device.platform,
          device: device.manufacturer + ' ' + device.model
        };
        utility.LogInfo(_.omit(
          cachedData,
          'debugMessageLog',
          globals.CacheKeys.Bookmarks,
          globals.CacheKeys.TraceLog,
          globals.CacheKeys.Password
        ));

        // Exit if sync not enabled
        if (!syncEnabled) {
          return;
        }

        // If network is online, commit any updates made whilst offline
        executeSyncIfOnline();

        // Check if a bookmark was shared
        return checkForSharedBookmark()
          .then(function () {
            return primeBookmarksCache;
          });
      })
      .catch(displayErrorAlert);
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

  var handleUpgrade = function (currentVersion, newVersion) {
    if (compareVersions(currentVersion, newVersion) >= 0) {
      // No upgrade
      return;
    }

    // Clear trace log
    return setInLocalStorage(globals.CacheKeys.TraceLog)
      .then(function () {
        utility.LogInfo('Upgrading from ' + currentVersion + ' to ' + newVersion);

        return $q.all([
          setInLocalStorage(globals.CacheKeys.AppVersion, newVersion),
          setInLocalStorage(globals.CacheKeys.DisplayUpdated, true)
        ]);
      });
  };

  var isTextInput = function (node) {
    return ['INPUT', 'TEXTAREA'].indexOf(node.nodeName) !== -1;
  };

  var refreshLocalSyncData = function () {
    return queueSync({ type: globals.SyncType.Pull })
      .then(function () {
        utility.LogInfo('Local sync data refreshed');
      });
  };

  var syncForm_EnableSync_Click = function () {
    // Don't display confirmation before syncing
    vm.events.syncForm_ConfirmSync_Click();
  };

  // Call constructor
  return new AndroidImplementation();
};