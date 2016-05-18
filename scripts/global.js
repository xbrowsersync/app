var xBrowserSync = xBrowserSync || {};
xBrowserSync.App = xBrowserSync.App || {};

/* ------------------------------------------------------------------------------------
 * Class name:	xBrowserSync.App.Global
 * Description:	Defines global properties.
 * ------------------------------------------------------------------------------------ */ 

xBrowserSync.App.Global = function(platform) {
    'use strict';
    
	var Global = {
        Alarm: {
            Name: {
                Get: function() {
                    return 'xBrowserSync-alarm';
                }
            },
            Period: {
                Get: function() {
                    return 5;
                }
            }
        },
        ApiVersion: '1.0.0',
        Bookmark: {
            DescriptionMaxLength: 500
        },
        Cache: {
            Bookmarks: {
                Get: function() {
                    var bookmarks = platform.LocalStorage.Get(
                        'xBrowserSync-cachedBookmarks');
                    
                    if (!!bookmarks) {
                        try {
                            bookmarks = JSON.parse(bookmarks);
                        }
                        catch(err) {
                            bookmarks = null;
                        }
                    }
                    
                    return bookmarks;
                },
                Set: function(value) {
                    var bookmarks = '';
                    
                    if (!!value) {
                        try {
                            bookmarks = JSON.stringify(value);
                        }
                        catch(err) { }
                    }
                    
                    platform.LocalStorage.Set(
                        'xBrowserSync-cachedBookmarks', 
                        bookmarks);
                }
            }
        },
        Commands: {
            SyncBookmarks: 1,
            RestoreBookmarks: 2,
            NoCallback: 3
        },
        Constants: {
            Title: 'title',
			Description: 'description',
			BookmarksBarTitle: 'bookmarksBarTitle',
			TooltipSyncEnabled: 'tooltipSyncEnabled',
			TooltipWorking: 'tooltipWorking',
			Button_Settings_Label: 'button_Settings_Label',
			Button_AddBookmark_Label: 'button_AddBookmark_Label',
			Button_EditBookmark_Label: 'button_EditBookmark_Label',
            ShowHelp: 'showHelp',
            Introduction: 'introduction',
			Field_ClientSecret_Label: 'field_ClientSecret_Label',
			Field_ClientSecret_Description: 'field_ClientSecret_Description',
			Field_Id_Label: 'field_Id_Label',
			Field_Id_Description: 'field_Id_Description',
			Button_Sync_Enable_Label: 'button_Sync_Enable_Label',
			Button_Sync_Disable_Label: 'button_Sync_Disable_Label',
			Button_Sync_Enabled_Label: 'button_Sync_Enabled_Label',
			Button_Sync_InProgress_Label: 'button_Sync_InProgress_Label',
			ConfirmReplaceBookmarks_Title: 'confirmReplaceBookmarks_Title',
			ConfirmReplaceBookmarks_Message: 'confirmReplaceBookmarks_Message',
			Button_ReplaceBookmarks_Confirm: 'button_ReplaceBookmarks_Confirm',
			Button_ReplaceBookmarks_Cancel: 'button_ReplaceBookmarks_Cancel',
			Field_Search_Description: 'field_Search_Description',
            NoSearchResults_Message: 'noSearchResults_Message', 
            ServiceStatus_Label: 'serviceStatus_Label',
			ServiceStatus_Message: 'serviceStatus_Message',
            ServiceStatus_NoNewSyncs: 'serviceStatus_NoNewSyncs',
			ServiceStatus_Online: 'serviceStatus_Online',
			ServiceStatus_Offline: 'serviceStatus_Offline',
			Button_UpdateServiceUrl_Label: 'button_UpdateServiceUrl_Label',
			UpdateServiceUrlForm_Description: 'updateServiceUrlForm_Description',
			UpdateServiceUrlForm_Placeholder: 'updateServiceUrlForm_Placeholder',
			Button_UpdateServiceUrl_Submit_Label: 'button_UpdateServiceUrl_Submit_Label',
			Button_UpdateServiceUrl_Cancel_Label: 'button_UpdateServiceUrl_Cancel_Label',
			BackupRestore_Title: 'backupRestore_Title',
            BackupRestore_Message: 'backupRestore_Message',
			Button_Backup_Label: 'button_Backup_Label',
			Button_Restore_Label: 'button_Restore_Label',
			Button_Restore_Cancel_Label: 'button_Restore_Cancel_Label',
			Button_Restore_Done_Label: 'button_Restore_Done_Label',
			Button_Close_Label: 'button_Close_Label',
			BackupSuccess_Message: 'backupSuccess_Message',
			RestoreSuccess_Message: 'restoreSuccess_Message',
			RestoreForm_Message: 'restoreForm_Message',
			DataToRestore_Label: 'dataToRestore_Label',
			Button_RestoreData_Label: 'button_RestoreData_Label',
			Button_RestoreData_Invalid_Label: 'button_RestoreData_Invalid_Label',
			Button_RestoreData_Ready_Label: 'button_RestoreData_Ready_Label',
			SyncPanel_Title: 'syncPanel_Title',
            SyncPanel_Message: 'syncPanel_Message',
            SyncPanel_Id_Label: 'syncPanel_Id_Label',
			SyncPanel_IncludeBookmarksBar_Label: 'syncPanel_IncludeBookmarksBar_Label',
			Button_ConfirmRestore_Confirm_Label: 'button_ConfirmRestore_Confirm_Label',
            Button_ConfirmRestore_Cancel_Label: 'button_ConfirmRestore_Cancel_Label',
            ConfirmRestore_Sync_Message: 'confirmRestore_Sync_Message',
            ConfirmRestore_NoSync_Message: 'confirmRestore_NoSync_Message',
            BookmarkPanel_Title_Add: 'bookmarkPanel_Title_Add',
            BookmarkPanel_Title_Edit: 'bookmarkPanel_Title_Edit',
            BookmarkPanel_Field_Title_Label: 'bookmarkPanel_Field_Title_Label',
            BookmarkPanel_Field_Url_Label: 'bookmarkPanel_Field_Url_Label',
            BookmarkPanel_Field_Description_Label: 'bookmarkPanel_Field_Description_Label',
            BookmarkPanel_Field_Tags_Label: 'bookmarkPanel_Field_Tags_Label',
            BookmarkPanel_Field_Tags_Placeholder: 'bookmarkPanel_Field_Tags_Placeholder',
            BookmarkPanel_Button_AddTags_Label: 'bookmarkPanel_Button_AddTags_Label',
            BookmarkPanel_Button_RemoveTag_Label: 'bookmarkPanel_Button_RemoveTag_Label',
            BookmarkPanel_Button_AddBookmark_Label: 'bookmarkPanel_Button_AddBookmark_Label',
            BookmarkPanel_Button_RemoveBookmark_Label: 'bookmarkPanel_Button_RemoveBookmark_Label',
            BookmarkPanel_Button_UpdateBookmark_Label: 'bookmarkPanel_Button_UpdateBookmark_Label',
            Working_Title: 'working_Title',
            Working_Message: 'working_Message',
            SyncInterrupted_Title: 'syncInterrupted_Title',
            SyncInterrupted_Message: 'syncInterrupted_Message',
            Error_Default_Title: 'error_Default_Title',
            Error_Default_Message: 'error_Default_Message',
            Error_HttpRequestFailed_Title: 'error_HttpRequestFailed_Title',
            Error_HttpRequestFailed_Message: 'error_HttpRequestFailed_Message',
            Error_TooManyRequests_Title: 'error_TooManyRequests_Title',
            Error_TooManyRequests_Message: 'error_TooManyRequests_Message',
			Error_RequestEntityTooLarge_Title: 'error_RequestEntityTooLarge_Title',
            Error_RequestEntityTooLarge_Message: 'error_RequestEntityTooLarge_Message',
            Error_NotAcceptingNewSyncs_Title: 'error_NotAcceptingNewSyncs_Title',
            Error_NotAcceptingNewSyncs_Message: 'error_NotAcceptingNewSyncs_Message',
            Error_DailyNewSyncLimitReached_Title: 'error_DailyNewSyncLimitReached_Title',
            Error_DailyNewSyncLimitReached_Message: 'error_DailyNewSyncLimitReached_Message',
            Error_MissingClientData_Title: 'error_MissingClientData_Title',
            Error_MissingClientData_Message: 'error_MissingClientData_Message',
			Error_NoDataFound_Title: 'error_NoDataFound_Title',
			Error_NoDataFound_Message: 'error_NoDataFound_Message',
			Error_NoDataToRestore_Title: 'error_NoDataToRestore_Title',
			Error_NoDataToRestore_Message: 'error_NoDataToRestore_Message',
			Error_FailedGetLocalBookmarks_Title: 'error_FailedGetLocalBookmarks_Title',
			Error_FailedGetLocalBookmarks_Message: 'error_FailedGetLocalBookmarks_Message',
            Error_FailedCreateLocalBookmarks_Title: 'error_FailedCreateLocalBookmarks_Title',
            Error_FailedCreateLocalBookmarks_Message: 'error_FailedCreateLocalBookmarks_Message',
			Error_FailedRemoveLocalBookmarks_Title: 'error_FailedRemoveLocalBookmarks_Title',
			Error_FailedRemoveLocalBookmarks_Message: 'error_FailedRemoveLocalBookmarks_Message',
			Error_InvalidData_Title: 'error_InvalidData_Title',
			Error_InvalidData_Message: 'error_InvalidData_Message',
			Error_LastChangeNotSynced_Title: 'error_LastChangeNotSynced_Title',
			Error_LastChangeNotSynced_Message: 'error_LastChangeNotSynced_Message',
			Error_OutOfSync_Title: 'error_OutOfSync_Title',
			Error_OutOfSync_Message: 'error_OutOfSync_Message',
            Error_BrowserImportBookmarksNotSupported_Title: 'error_BrowserImportBookmarksNotSupported_Title',
			Error_BrowserImportBookmarksNotSupported_Message: 'error_BrowserImportBookmarksNotSupported_Message',
            Error_NotImplemented_Title: 'error_NotImplemented_Title',
			Error_NotImplemented_Message: 'error_NotImplemented_Message'
        },
        ClientSecret: {
            Get: function() {
                return platform.LocalStorage.Get(
                    'xBrowserSync-clientSecret');
            },
            Set: function(value) {
                value = (!value) ? '' : value.trim();
                
                platform.LocalStorage.Set(
                    'xBrowserSync-clientSecret', 
                    value);
            }
        },
        DisableEventListeners: {
            Get: function() {
                var value;
                
                value = platform.LocalStorage.Get(
                    'xBrowserSync-disableEventListeners');
                
                if (!value) {
                    return false;
                }
                else {
                    if (value === 'true') {
                        return true;
                    }
                    else {
                        return false;
                    }
                }
            },
            Set: function(value) {
                platform.LocalStorage.Set(
                    'xBrowserSync-disableEventListeners', 
                    value);
            }
        },
        ErrorCodes: {
            HttpRequestFailed: 10000,
            TooManyRequests: 10001,
            RequestEntityTooLarge: 10002,
            NotAcceptingNewSyncs: 10003,
            DailyNewSyncLimitReached: 10004,
            MissingClientData: 10100, 
            AmbiguousSyncRequest: 10101,
            FailedGetLocalBookmarks: 10102,
            FailedCreateLocalBookmarks: 10103,
            FailedRemoveLocalBookmarks: 10104,            
            NoDataFound: 10105,
            InvalidData: 10106,
            UpdatedBookmarkNotFound: 10107,
            SyncedBookmarkNotFound: 10108,
            NoStatus: 10200,
            FailedGetPageMetadata: 10300,
            NotImplemented: 10400
        },
        Id: {
            Get: function() {
                var value = platform.LocalStorage.Get(
                    'xBrowserSync-Id');
                value = (value === '' || value === 'null') ? null : value;
                
                return value;
            },
            Set: function(value) {
                value = (!value) ? '' : value.trim();
                
                platform.LocalStorage.Set(
                    'xBrowserSync-Id', 
                    value);
            }
        },
        IncludeBookmarksBar: {
            Get: function() {
                var value;
                
                value = platform.LocalStorage.Get(
                    'xBrowserSync-includeBookmarksBar');
                
                if (!value) {
                    return true;
                }
                else {
                    if (value === 'true') {
                        return true;
                    }
                    else {
                        return false;
                    }
                }
            },
            Set: function(value) {
                platform.LocalStorage.Set(
                    'xBrowserSync-includeBookmarksBar', 
                    value);
                
                // Clear LastUpdated to ensure next update check refreshes local
                // bookmarks
                Global.LastUpdated.Set('');
            }
        },
        IsSyncing: {
            Get: function() {
                var value;
                
                value = platform.LocalStorage.Get(
                    'xBrowserSync-isSyncing');
                
                if (!value) {
                    return false;
                }
                else {
                    if (value === 'true') {
                        return true;
                    }
                    else {
                        return false;
                    }
                }
            },
            Set: function(value) {
                platform.LocalStorage.Set(
                    'xBrowserSync-isSyncing', 
                    value);
                
                platform.Interface.Refresh();
            }
        },
        LastUpdated: {
            Get: function() {
                var lastUpdatedVal = platform.LocalStorage.Get(
                    'xBrowserSync-lastUpdated');
                
                if (!!lastUpdatedVal) {
                    return new Date(lastUpdatedVal);
                }
                else {
                    return null;
                }
            },
            Set: function(value) {
                platform.LocalStorage.Set(
                    'xBrowserSync-lastUpdated', 
                    value);
            }
        },
        RetrySyncTimeout: 100,
        ServiceStatus: {
            Online: 1,
            Offline: 2,
            NoNewSyncs: 3
        },
        ShowHints: {
            Get: function() {
                var value;
                
                value = platform.LocalStorage.Get(
                    'xBrowserSync-showHints');
                
                if (!value) {
                    return true;
                }
                else {
                    if (value === 'true') {
                        return true;
                    }
                    else {
                        return false;
                    }
                }
            },
            Set: function(value) {
                platform.LocalStorage.Set(
                    'xBrowserSync-showHints', 
                    value);
            }
        },
        SyncEnabled: {
            Get: function() {
                var value;
                
                value = platform.LocalStorage.Get(
                    'xBrowserSync-syncEnabled');
                
                if (!value) {
                    return false;
                }
                else {
                    if (value === 'true') {
                        return true;
                    }
                    else {
                        return false;
                    }
                }
            },
            Set: function(value) {
                platform.LocalStorage.Set(
                    'xBrowserSync-syncEnabled', 
                    value);
                
                platform.Interface.Refresh();
            }
        },
        SyncInterrupted: {
            Get: function() {
                var value;
                
                value = platform.LocalStorage.Get(
                    'xBrowserSync-syncInterrupted');
                
                if (!value) {
                    return false;
                }
                else {
                    if (value === 'true') {
                        return true;
                    }
                    else {
                        return false;
                    }
                }
            },
            Set: function(value) {
                platform.LocalStorage.Set(
                    'xBrowserSync-syncInterrupted', 
                    value);
            }
        },
        SyncType: { 
            Push: 1, 
            Pull: 2,
            Both: 3
        },
        Title: {
            Get: function() {
                return 'xBrowserSync';
            }
        },
        UpdateType: {
            Create: 1,
            Delete: 2,
            Update: 3,
            Move: 4
        },
        URL: {
            Host: {
                Get: function() {
                    var defaultUrl = 'https://api-xbrowsersync.rhcloud.com';
                    var urlHost = platform.LocalStorage.Get(
                        'xBrowserSync-urlHost');
                    
                    urlHost = (urlHost === null || urlHost === undefined) ?
                        defaultUrl :
                        urlHost;
                    
                    return urlHost;
                },
                Set: function(value) {
                    value = (!value) ? '' : value;
                    
                    platform.LocalStorage.Set(
                        'xBrowserSync-urlHost', 
                        value);
                }
            },
            Bookmarks: '/bookmarks',
            LastUpdated: '/lastupdated',
            Status: '/status'
        }
    };
    
    return Global;
};