var xBrowserSync = xBrowserSync || {};
xBrowserSync.App = xBrowserSync.App || {};

/* ------------------------------------------------------------------------------------
 * Class name:	xBrowserSync.App.Global
 * Description:	Defines global properties used across all platforms.
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
                    return 1;
                }
            }
        },
        ApiVersion: '1.1.3',
        AppVersion: '1.4.0 BETA (c)',
        Bookmarks: {
            ContainerPrefix: '[xbs]',
            DescriptionMaxLength: 300,
            MenuContainerName: '[xbs] Menu',
            MobileContainerName: '[xbs] Mobile',
            OtherContainerName: '[xbs] Other',
            OtherContainerNameOld: '_other_',
            RootContainerName: 'root',
            ToolbarContainerName: '[xbs] Toolbar',
            ToolbarContainerNameOld: '_toolbar_',
            UnfiledContainerName: '[xbs] Unfiled',
            UnfiledContainerNameOld: '_xBrowserSync_'
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
                        catch (err) {
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
                        catch (err) { }
                    }
                    
                    platform.LocalStorage.Set(
                        'xBrowserSync-cachedBookmarks', 
                        bookmarks);
                }
            }
        },
        Debug: {
            ActivationKeyword: '#debug'
        },
        Password: {
            Get: function() {
                return platform.LocalStorage.Get(
                    'xBrowserSync-password');
            },
            Set: function(value) {
                value = (!value) ? '' : value.trim();
                
                platform.LocalStorage.Set(
                    'xBrowserSync-password', 
                    value);
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
			Containers_Toolbar_Title: 'containers_Toolbar_Title',
            Containers_Other_Title: 'containers_Other_Title',
			TooltipSyncEnabled_Label: 'tooltipSyncEnabled_Label',
			TooltipWorking_Label: 'tooltipWorking_Label',
            Button_Settings_Label: 'button_Settings_Label',
			Button_AddBookmark_Label: 'button_AddBookmark_Label',
			Button_DeleteBookmark_Label: 'button_DeleteBookmark_Label',
            Button_EditBookmark_Label: 'button_EditBookmark_Label',
            Button_ShareBookmark_Label: 'button_ShareBookmark_Label',
			Button_Help_Label: 'button_Help_Label',
			Button_Next_Label: 'button_Next_Label',
			Button_Previous_Label: 'button_Previous_Label',
            Login_GetSyncId_Title: 'login_GetSyncId_Title',
            Login_GetSyncId_Message: 'login_GetSyncId_Message',
            Login_introPanel1_Message: 'login_introPanel1_Message',
            Login_introPanel2_Message: 'login_introPanel2_Message',
            Login_introPanel3_Message: 'login_introPanel3_Message',
            Login_introPanel4_Message: 'login_introPanel4_Message',
            Login_introPanel5_Message: 'login_introPanel5_Message',
            Login_introPanel6_Message: 'login_introPanel6_Message',
            Login_introPanel7_Message: 'login_introPanel7_Message',
            Login_introPanel8_Message: 'login_introPanel8_Message',
            Login_introPanel9_Message: 'login_introPanel9_Message',
            Login_introPanel10_Message: 'login_introPanel10_Message',
            Login_introPanel11_Message: 'login_introPanel11_Message',
            Login_introPanel12_Message: 'login_introPanel12_Message',
            IntroPanel13_Message: 'introPanel13_Message',
            Login_PasswordConfirmationField_Label: 'login_PasswordConfirmationField_Label',
            Login_PasswordField_Label: 'login_PasswordField_Label',
			Login_PasswordField_Existing_Description: 'login_PasswordField_Existing_Description',
            Login_PasswordField_New_Description: 'login_PasswordField_New_Description',
			Login_IdField_Label: 'login_IdField_Label',
			Login_IdField_Description: 'login_IdField_Description',
			Button_ScanCode_Label: 'button_ScanCode_Label',
			Button_DisableSync_Label: 'button_DisableSync_Label',
            Button_EnableSync_Label: 'button_EnableSync_Label',
            Button_ExistingSync_Label: 'button_ExistingSync_Label',
            Button_NewSync_Label: 'button_NewSync_Label',
			Login_ConfirmSync_Title: 'login_ConfirmSync_Title',
			Login_ConfirmSync_Message: 'login_ConfirmSync_Message',
			Login_UpgradeSync_Title: 'login_UpgradeSync_Title',
			Login_UpgradeSync_Message: 'login_UpgradeSync_Message',
			Button_Confirm_Label: 'button_Confirm_Label',
			Button_Deny_Label: 'button_Deny_Label',
			Search_Field_Description: 'search_Field_Description',
            Search_NoBookmarks_Message: 'search_NoBookmarks_Message',
            Search_NoResults_Message: 'search_NoResults_Message',
            ShareBookmark_Message: 'shareBookmark_Message',
            BookmarkShared_Message: 'bookmarkShared_Message',
            Settings_Sync_SyncToolbarConfirmation_Message: 'settings_Sync_SyncToolbarConfirmation_Message',
            Settings_Sync_ConfirmCancelSync_Message: 'settings_Sync_ConfirmCancelSync_Message',
            Settings_Sync_Id_Description: 'settings_Sync_Id_Description',
            Settings_Sync_SyncToolbar_Description: 'settings_Sync_SyncToolbar_Description',
            Settings_Service_ServiceUrl_Label: 'settings_Service_ServiceUrl_Label',
            Settings_Service_ServiceUrl_Description: 'settings_Service_ServiceUrl_Description',
            Settings_Service_Status_Label: 'settings_Service_Status_Label',
            Settings_Service_Status_Description: 'settings_Service_Status_Description',
            Settings_Service_ServiceMessage_Label: 'settings_Service_ServiceMessage_Label',
            Settings_Service_ChangeService_Label: 'settings_Service_ChangeService_Label',
            Settings_Service_ChangeService_Description: 'settings_Service_ChangeService_Description',
            Settings_BackupRestore_Backup_Label: 'settings_BackupRestore_Backup_Label',
            Settings_BackupRestore_BackupLocal_Description: 'settings_BackupRestore_BackupLocal_Description',
            Settings_BackupRestore_BackupSynced_Description: 'settings_BackupRestore_BackupSynced_Description',
            Settings_BackupRestore_Restore_Label: 'settings_BackupRestore_Restore_Label',
            Settings_BackupRestore_RestoreLocal_Description: 'settings_BackupRestore_RestoreLocal_Description',
            Settings_BackupRestore_RestoreSynced_Description: 'settings_BackupRestore_RestoreSynced_Description',
            Settings_About_Title: 'settings_About_Title',
            Settings_About_AppVersion_Label: 'settings_About_AppVersion_Label',
            Settings_About_AppVersion_Description: 'settings_About_AppVersion_Description',
            Settings_About_ReleaseNotes_Label: 'settings_About_ReleaseNotes_Label',
            Settings_About_FAQs_Label: 'settings_About_FAQs_Label',
            Settings_About_FAQs_Description: 'settings_About_FAQs_Description',
            Settings_About_ViewFAQs_Label: 'settings_About_ViewFAQs_Label',
            Settings_About_Issues_Label: 'settings_About_Issues_Label',
            Settings_About_Issues_Description: 'settings_About_Issues_Description',
            Settings_About_RaiseIssue_Label: 'settings_About_RaiseIssue_Label',
            Settings_About_Contributions_Label: 'settings_About_Contributions_Label',
            Settings_About_Contributions_Description: 'settings_About_Contributions_Description',
            Settings_About_Contribute_Label: 'settings_About_Contribute_Label',
            Settings_Debug_Title: 'settings_Debug_Title',
            Settings_Debug_DeviceWidth_Label: 'settings_Debug_DeviceWidth_Label',
            Settings_Debug_DeviceHeight_Label: 'settings_Debug_DeviceHeight_Label',
            DebugEnabled_Message: 'debugEnabled_Message',
            Settings_Service_Title: 'settings_Service_Title',
            Settings_Service_Status_NoNewSyncs: 'settings_Service_Status_NoNewSyncs',
            Settings_Service_Status_Error: 'settings_Service_Status_Error',
            Settings_Service_Status_Loading: 'settings_Service_Status_Loading',
            Settings_Service_Status_Online: 'settings_Service_Status_Online',
			Settings_Service_Status_Offline: 'settings_Service_Status_Offline',
			Button_UpdateServiceUrl_Label: 'button_UpdateServiceUrl_Label',
			Settings_Service_UpdateForm_Message: 'settings_Service_UpdateForm_Message',
			Settings_Service_UpdateForm_Field_Description: 'settings_Service_UpdateForm_Field_Description',
			Button_Update_Label: 'button_Update_Label',
			Button_Cancel_Label: 'button_Cancel_Label',
            Settings_Service_UpdateForm_Confirm_Message: 'settings_Service_UpdateForm_Confirm_Message',
            Settings_Service_UpdateForm_InvalidService_Label: 'settings_Service_UpdateForm_InvalidService_Label',
            Settings_Service_UpdateForm_ServiceVersionNotSupported_Label: 'settings_Service_UpdateForm_ServiceVersionNotSupported_Label',
            Settings_Service_UpdateForm_ServiceOffline_Label: 'settings_Service_UpdateForm_ServiceOffline_Label',
			Settings_BackupRestore_Title: 'settings_BackupRestore_Title',
            Settings_BackupRestore_NotAvailable_Message: 'settings_BackupRestore_NotAvailable_Message',
            Settings_BackupRestore_ICloudNotAvailable_Message: 'settings_BackupRestore_ICloudNotAvailable_Message',
			Button_Backup_Label: 'button_Backup_Label',
			Button_Restore_Label: 'button_Restore_Label',
			Button_Done_Label: 'button_Done_Label',
			Button_Clear_Label: 'button_Clear_Label',
            Button_Close_Label: 'button_Close_Label',
            Button_Back_Label: 'button_Back_Label',
			Settings_BackupRestore_BackupSuccess_Message: 'settings_BackupRestore_BackupSuccess_Message',
			Settings_BackupRestore_RestoreSuccess_Message: 'settings_BackupRestore_RestoreSuccess_Message',
			Settings_BackupRestore_RestoreForm_Message: 'settings_BackupRestore_RestoreForm_Message',
			Settings_BackupRestore_RestoreForm_DataField_Label: 'settings_BackupRestore_RestoreForm_DataField_Label',
            Button_SelectBackupFile_Label: 'button_SelectBackupFile_Label',
			Button_RestoreData_Label: 'button_RestoreData_Label',
			Button_RestoreData_Invalid_Label: 'button_RestoreData_Invalid_Label',
			Button_RestoreData_Ready_Label: 'button_RestoreData_Ready_Label',
			Settings_Sync_Title: 'settings_Sync_Title',
            Settings_Sync_NotAvailable_Message: 'settings_Sync_NotAvailable_Message',
            Settings_Sync_Id_Label: 'settings_Sync_Id_Label',
            Settings_Sync_DisplayQRCode_Message: 'settings_Sync_DisplayQRCode_Message',
            Settings_Service_DataUsage_Label: 'settings_Service_DataUsage_Label',
			Settings_Sync_SyncToolbar_Label: 'settings_Sync_SyncToolbar_Label',
            Settings_Service_DataUsage_Description: 'settings_Service_DataUsage_Description',
            Settings_BackupRestore_ConfirmRestore_Sync_Message: 'settings_BackupRestore_ConfirmRestore_Sync_Message',
            Settings_BackupRestore_ConfirmRestore_NoSync_Message: 'settings_BackupRestore_ConfirmRestore_NoSync_Message',
            Bookmark_Title_Add: 'bookmark_Title_Add',
            Bookmark_Title_Edit: 'bookmark_Title_Edit',
            Bookmark_TitleField_Label: 'bookmark_TitleField_Label',
            Bookmark_UrlField_Label: 'bookmark_UrlField_Label',
            Bookmark_DescriptionField_Label: 'bookmark_DescriptionField_Label',
            Bookmark_TagsField_Label: 'bookmark_TagsField_Label',
            Bookmark_TagsField_Description: 'bookmark_TagsField_Description',
            Button_AddTags_Label: 'button_AddTags_Label',
            Button_DeleteTag_Label: 'button_DeleteTag_Label',
            Button_Delete_Label: 'button_Delete_Label',
            Button_Share_Label: 'button_Share_Label',
            Working_Title: 'working_Title',
            Working_Message: 'working_Message',
            ConnRestored_Title: 'connRestored_Title',
            ConnRestored_Message: 'connRestored_Message',
            Notification_Upgrade_Message: 'notification_Upgrade_Message',
            Bookmark_Metadata_Message: 'bookmark_Metadata_Message',
            Error_Default_Title: 'error_Default_Title',
            Error_Default_Message: 'error_Default_Message',
            Error_HttpRequestFailed_Title: 'error_HttpRequestFailed_Title',
            Error_HttpRequestFailed_Message: 'error_HttpRequestFailed_Message',
            Error_HttpRequestFailedWhileUpdating_Title: 'error_HttpRequestFailedWhileUpdating_Title',
            Error_HttpRequestFailedWhileUpdating_Message: 'error_HttpRequestFailedWhileUpdating_Message',
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
			Error_IdRemoved_Title: 'error_IdRemoved_Title',
			Error_IdRemoved_Message: 'error_IdRemoved_Message',
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
            Error_BookmarkNotFound_Title: 'error_BookmarkNotFound_Title',
			Error_BookmarkNotFound_Message: 'error_BookmarkNotFound_Message',
            Error_OutOfSync_Title: 'error_OutOfSync_Title',
            Error_OutOfSync_Message: 'error_OutOfSync_Message',
            Error_ApiInvalid_Title: 'error_ApiInvalid_Title',
            Error_ApiInvalid_Message: 'error_ApiInvalid_Message',
            Error_ApiVersionNotSupported_Title: 'error_ApiVersionNotSupported_Title',
            Error_ApiVersionNotSupported_Message: 'error_ApiVersionNotSupported_Message',
            Error_ContainerChanged_Title: 'error_ContainerChanged_Title',
            Error_ContainerChanged_Message: 'error_ContainerChanged_Message',
            Error_NotImplemented_Title: 'error_NotImplemented_Title',
			Error_NotImplemented_Message: 'error_NotImplemented_Message',
            Error_FailedGetPageMetadata_Title: 'error_FailedGetPageMetadata_Title',
            Error_FailedGetPageMetadata_Message: 'error_FailedGetPageMetadata_Message',
            Error_SyncInterrupted_Title: 'error_SyncInterrupted_Title',
            Error_SyncInterrupted_Message: 'error_SyncInterrupted_Message',
            Error_ScanFailed_Title: 'error_ScanFailed_Title',
            Error_ShareFailed_Title: 'error_ShareFailed_Title',
            Error_FailedBackupData_Title: 'error_FailedBackupData_Title',
            Error_FailedGetDataToRestore_Title: 'error_FailedGetDataToRestore_Title',
            Error_FailedRestoreData_Title: 'error_FailedRestoreData_Title',
            Error_FailedShareUrl_Title: 'error_FailedShareUrl_Title',
            Error_FailedShareUrlNotSynced_Title: 'error_FailedShareUrlNotSynced_Title'
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
        DisplayIntro: {
            Get: function() {
                var value;
                
                value = platform.LocalStorage.Get(
                    'xBrowserSync-displayIntro');
                
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
                    'xBrowserSync-displayIntro', 
                    value);
            }
        },
        ErrorCodes: {
            HttpRequestFailed: 10000,
            HttpRequestFailedWhileUpdating: 10001,
            HttpRequestCancelled: 10002,
            TooManyRequests: 10003,
            RequestEntityTooLarge: 10004,
            NotAcceptingNewSyncs: 10005,
            DailyNewSyncLimitReached: 10006,
            MissingClientData: 10100, 
            AmbiguousSyncRequest: 10101,
            FailedGetLocalBookmarks: 10102,
            FailedCreateLocalBookmarks: 10103,
            FailedRemoveLocalBookmarks: 10104,            
            NoDataFound: 10105,
            IdRemoved: 10106,
            PasswordRemoved: 10107,
            InvalidData: 10108,
            UpdatedBookmarkNotFound: 10109,
            XBookmarkNotFound: 10110,
            ContainerChanged: 10111,
            DataOutOfSync: 10112,
            ApiInvalid: 10200,
            ApiOffline: 10201,
            ApiVersionNotSupported: 10202,
            FailedGetPageMetadata: 10300,
            FailedSaveBackup: 10301,
            FailedScanID: 10302,
            FailedShareBookmark: 10303,
            FailedBackupData: 10304,
            FailedGetDataToRestore: 10305,
            FailedRestoreData: 10306,
            FailedShareUrl: 10400,
            FailedShareUrlNotSynced: 10401,
            FailedRegisterAutoUpdates: 10500,
            NotImplemented: 10600
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
        LogType: {
            Info: 0, 
            Warning: 1, 
            Error: 2
        },
        LookaheadMinChars: 1,
        Network: {
            Disconnected: {
                Get: function() {
                    var value;
                    
                    value = platform.LocalStorage.Get(
                        'xBrowserSync-networkDisconnected');
                    
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
                        'xBrowserSync-networkDisconnected', 
                        value);
                }
            }
        },
        Platforms: {
            Android: 'android',
            Chrome: 'chrome',
            IOS: 'ios'
        },
        Regex : {
            Url: /(https?|ftp):\/\/(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)?(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i
        },
        SyncPollTimeout: 100,
        ServiceStatus: {
            Error: -1,
            Online: 1,
            Offline: 2,
            NoNewSyncs: 3
        },
        SyncBookmarksToolbar: {
            Get: function() {
                var value;
                
                value = platform.LocalStorage.Get(
                    'xBrowserSync-syncBookmarksToolbar');
                
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
                    'xBrowserSync-syncBookmarksToolbar', 
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
                
                // Reset network disconnected flag
                platform.LocalStorage.Set(
                    'xBrowserSync-networkDisconnected', 
                    false);
                
                // Update icon
                platform.Interface.Refresh();
            }
        },
        SyncType: { 
            Push: 1, 
            Pull: 2,
            Both: 3,
            Upgrade: 4
        },
        SyncVersion: {
            Get: function() {
                return platform.LocalStorage.Get(
                    'xBrowserSync-syncVersion');
            },
            Set: function(value) {
                value = (!value) ? '' : value.trim();
                
                platform.LocalStorage.Set(
                    'xBrowserSync-syncVersion', 
                    value);
            }
        },
        Title: {
            Get: function() {
                return 'xBrowserSync';
            }
        },
        UpdateMessage: {
            Get: function(syncEnabled) {
                var message = 'This update includes support for Firefox, stronger encryption and much more!';
                message += syncEnabled ? '\n\nYour current sync has been disabled, re-enable sync to complete the update process.' : '';
                return message;
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
                    var defaultUrl = 'https://api.xbrowsersync.org';
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
            BookmarkletRegex: /^(javascript:)(.+)/i,
            Bookmarks: '/bookmarks',
            Current: '/current',
            LastUpdated: '/lastUpdated',
            Version: '/version',
            ServiceInformation: '/info',
            Regex: /^(\w+:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]+\.[a-z]+\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)$/i,
            ProtocolRegex: /^\w+:.*$/,
            CustomScheme: 'xbrowsersync:/'
        }
    };
    
    return Global;
};