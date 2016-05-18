var xBrowserSync = xBrowserSync || {};
xBrowserSync.App = xBrowserSync.App || {};

/* ------------------------------------------------------------------------------------
 * Class name:	xBrowserSync.App.Utility
 * Description:	Defines utility functions.
 * ------------------------------------------------------------------------------------ */

xBrowserSync.App.Utility = function($q, platform, global) { 
    'use strict';

/* ------------------------------------------------------------------------------------
 * Public functions
 * ------------------------------------------------------------------------------------ */
 
	var bookmark = function(title, url, description, tags) {
		var object = {};
		
		if (!!title) {
			object.Title = title.trim();
		}
		
		if (!!url) {
			object.Url = url.trim();
		}
		else {
			object.Children = [];
		}
		
		if (!!description) {
			object.Description = description.trim().substring(0, global.Bookmark.DescriptionMaxLength);
		}
		
		if (!!tags && tags.length > 0) {
			object.Tags = tags;
		}
		
		return object;
	};
    
    var encryptData = function(data, errorCallback) {
		return CryptoJS.AES.encrypt(data, global.ClientSecret.Get()).toString();
	};
	
	var decryptData = function(data, errorCallback) {
		return CryptoJS.AES.decrypt(data, global.ClientSecret.Get()).toString(CryptoJS.enc.Utf8);
	};
	
	var getErrorMessageFromException = function(err) {
		var errorMessage = { 
			title: '',
			message: ''
		};
		 
		if (!err || !err.code) {
			errorMessage.title = platform.Constants.Get(global.Constants.Error_Default_Title);
			errorMessage.message = platform.Constants.Get(global.Constants.Error_Default_Message);
			return errorMessage;
		}
		
		err.details = (!err.details) ? '' : err.details;
		
		switch(err.code) {
            case global.ErrorCodes.HttpRequestFailed:
				errorMessage.title = platform.Constants.Get(global.Constants.Error_HttpRequestFailed_Title);
				errorMessage.message = platform.Constants.Get(global.Constants.Error_HttpRequestFailed_Message); 
				break;
            case global.ErrorCodes.TooManyRequests:
				errorMessage.title = platform.Constants.Get(global.Constants.Error_TooManyRequests_Title);
				errorMessage.message = platform.Constants.Get(global.Constants.Error_TooManyRequests_Message); 
				break;
            case global.ErrorCodes.RequestEntityTooLarge:
				errorMessage.title = platform.Constants.Get(global.Constants.Error_RequestEntityTooLarge_Title);
				errorMessage.message = platform.Constants.Get(global.Constants.Error_RequestEntityTooLarge_Message) + err.details; 
				break;
            case global.ErrorCodes.NotAcceptingNewSyncs:
				errorMessage.title = platform.Constants.Get(global.Constants.Error_NotAcceptingNewSyncs_Title);
				errorMessage.message = platform.Constants.Get(global.Constants.Error_NotAcceptingNewSyncs_Message); 
				break;
            case global.ErrorCodes.DailyNewSyncLimitReached:
				errorMessage.title = platform.Constants.Get(global.Constants.Error_DailyNewSyncLimitReached_Title);
				errorMessage.message = platform.Constants.Get(global.Constants.Error_DailyNewSyncLimitReached_Message); 
				break;
            case global.ErrorCodes.MissingClientData:
				errorMessage.title = platform.Constants.Get(global.Constants.Error_MissingClientData_Title);
				errorMessage.message = platform.Constants.Get(global.Constants.Error_MissingClientData_Message); 
				break;
            case global.ErrorCodes.FailedGetLocalBookmarks:
				errorMessage.title = platform.Constants.Get(global.Constants.Error_FailedGetLocalBookmarks_Title);
				errorMessage.message = platform.Constants.Get(global.Constants.Error_FailedGetLocalBookmarks_Message); 
				break;
            case global.ErrorCodes.FailedCreateLocalBookmarks:
				errorMessage.title = platform.Constants.Get(global.Constants.Error_FailedCreateLocalBookmarks_Title);
				errorMessage.message = platform.Constants.Get(global.Constants.Error_FailedCreateLocalBookmarks_Message);
				break;
            case global.ErrorCodes.FailedRemoveLocalBookmarks:
				errorMessage.title = platform.Constants.Get(global.Constants.Error_FailedRemoveLocalBookmarks_Title);
				errorMessage.message = platform.Constants.Get(global.Constants.Error_FailedRemoveLocalBookmarks_Message); 
				break;
            case global.ErrorCodes.NoDataFound:
				errorMessage.title = platform.Constants.Get(global.Constants.Error_NoDataFound_Title);
				errorMessage.message = platform.Constants.Get(global.Constants.Error_NoDataFound_Message);
				break;
			case global.ErrorCodes.InvalidData:
				errorMessage.title = platform.Constants.Get(global.Constants.Error_InvalidData_Title);
				errorMessage.message = platform.Constants.Get(global.Constants.Error_InvalidData_Message); 
				break;
			case global.ErrorCodes.UpdatedBookmarkNotFound:
				errorMessage.title = platform.Constants.Get(global.Constants.Error_LastChangeNotSynced_Title);
				errorMessage.message = platform.Constants.Get(global.Constants.Error_LastChangeNotSynced_Message); 
				break;
			case global.ErrorCodes.SyncedBookmarkNotFound:
				errorMessage.title = platform.Constants.Get(global.Constants.Error_OutOfSync_Title);
				errorMessage.message = platform.Constants.Get(global.Constants.Error_OutOfSync_Message); 
				break;
			case global.ErrorCodes.NotImplemented:
				errorMessage.title = platform.Constants.Get(global.Constants.Error_NotImplemented_Title);
				errorMessage.message = platform.Constants.Get(global.Constants.Error_NotImplemented_Message); 
				break;
            default:
				errorMessage.title = platform.Constants.Get(global.Constants.Error_Default_Title);
                errorMessage.message = platform.Constants.Get(global.Constants.Error_Default_Message);
		}
		
		return errorMessage;
	};
	
	var hash = function(message) {
		return CryptoJS.SHA1(message).toString();
	};
	
	return {
		Bookmark: bookmark,
		DecryptData: decryptData,
		EncryptData: encryptData,
		GetErrorMessageFromException: getErrorMessageFromException,
		Hash: hash
	};
};