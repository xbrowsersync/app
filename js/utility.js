var xBrowserSync = xBrowserSync || {};
xBrowserSync.App = xBrowserSync.App || {};

/* ------------------------------------------------------------------------------------
 * Class name:	xBrowserSync.App.Utility
 * Description:	Defines utility functions used across all platforms.
 * ------------------------------------------------------------------------------------ */

xBrowserSync.App.Utility = function($q, platform, global) { 
    'use strict';

/* ------------------------------------------------------------------------------------
 * Public functions
 * ------------------------------------------------------------------------------------ */
 
	var encryptData = function(data, errorCallback) {
		// Encrypt using AES
		return CryptoJS.AES.encrypt(data, global.ClientSecret.Get()).toString();
	};
	
	var decryptData = function(data, errorCallback) {
		// Decrypt using AES
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
				errorMessage.message = platform.Constants.Get(global.Constants.Error_RequestEntityTooLarge_Message); 
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
			case global.ErrorCodes.XBookmarkNotFound:
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

	var getOtherContainer = function(bookmarks, createIfNotPresent) {
        var container = _.findWhere(bookmarks, { title: global.Bookmarks.OtherContainerName });

        // If container does not exist, create it if specified
        if (!container && !!createIfNotPresent) {
            container = new xBookmark(global.Bookmarks.OtherContainerName);
            bookmarks.push(container);
        }

        return container;
    };

	var getToolbarContainer = function(bookmarks, createIfNotPresent) {
        var container = _.findWhere(bookmarks, { title: global.Bookmarks.ToolbarContainerName });

        // If container does not exist, create it if specified
        if (!container && !!createIfNotPresent) {
            container = new xBookmark(global.Bookmarks.ToolbarContainerName);
            bookmarks.push(container);
        }

        return container;
    };

	var getXBrowserSyncContainer = function(bookmarks, createIfNotPresent) {
        var container = _.findWhere(bookmarks, { title: global.Bookmarks.xBrowserSyncContainerName });

        // If container does not exist, create it if specified
        if (!container && !!createIfNotPresent) {
            container = new xBookmark(global.Bookmarks.xBrowserSyncContainerName);
            bookmarks.push(container);
        }

        return container;
    };
	
	var xBookmark = function(title, url, description, tags, children) {
		var xBookmark = {};
		
		if (!!title) {
			xBookmark.title = title.trim();
		}
		
		if (!!url) {
			xBookmark.url = url.trim();
		}
		else {
			xBookmark.children = children || [];
		}
		
		if (!!description) {
			xBookmark.description = description.trim().substring(0, global.Bookmarks.DescriptionMaxLength);
		}
		
		if (!!tags && tags.length > 0) {
			xBookmark.tags = tags;
		}
		
		return xBookmark;
	};
	
	return {
		DecryptData: decryptData,
		EncryptData: encryptData,
		GetErrorMessageFromException: getErrorMessageFromException,
		GetOtherContainer: getOtherContainer,
		GetToolbarContainer: getToolbarContainer,
		GetXBrowserSyncContainer: getXBrowserSyncContainer,
		XBookmark: xBookmark		
	};
};