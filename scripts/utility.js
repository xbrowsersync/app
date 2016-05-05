var xBrowserSync = xBrowserSync || {};
xBrowserSync.App = xBrowserSync.App || {};

/* ------------------------------------------------------------------------------------
 * Class name:	xBrowserSync.App.Utility
 * Description:	Defines utility functions used in all app implementations.
 * ------------------------------------------------------------------------------------ */

xBrowserSync.App.Utility = function($q, browser, global, api) { 
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
    
    var checkServiceStatus = function(url) {
		return api.GetStatus(url)
			.then(function(response) {
				if (!(!!response.status && response.status === 'Online')) {
					return $q.reject();
				}
			});
	};
	
	var encryptData = function(data, errorCallback) {
		return Crypto.AES.encrypt(data, global.ClientSecret.Get());
	};
	
	var decryptData = function(data, errorCallback) {
		return Crypto.AES.decrypt(data, global.ClientSecret.Get());
	};
	
	var getErrorMessageFromException = function(err) {
		var errorMessage = { 
			title: '',
			message: ''
		};
		 
		if (!err || !err.code) {
			errorMessage.title = browser.Constants.Error_Default_Title;
			errorMessage.message = browser.Constants.Error_Default_Message;
			return errorMessage;
		}
		
		err.details = (!err.details) ? '' : err.details;
		
		switch(err.code) {
            case global.ErrorCodes.HttpRequestFailed:
				errorMessage.title = browser.Constants.Error_HttpRequestFailed_Title;
				errorMessage.message = browser.Constants.Error_HttpRequestFailed_Message; 
				break;
            case global.ErrorCodes.TooManyRequests:
				errorMessage.title = browser.Constants.Error_TooManyRequests_Title;
				errorMessage.message = browser.Constants.Error_TooManyRequests_Message; 
				break;
            case global.ErrorCodes.RequestEntityTooLarge:
				errorMessage.title = browser.Constants.Error_RequestEntityTooLarge_Title;
				errorMessage.message = browser.Constants.Error_RequestEntityTooLarge_Message + err.details; 
				break;
            case global.ErrorCodes.MissingClientData:
				errorMessage.title = browser.Constants.Error_MissingClientData_Title;
				errorMessage.message = browser.Constants.Error_MissingClientData_Message; 
				break;
            case global.ErrorCodes.FailedGetLocalBookmarks:
				errorMessage.title = browser.Constants.Error_FailedGetLocalBookmarks_Title;
				errorMessage.message = browser.Constants.Error_FailedGetLocalBookmarks_Message; 
				break;
            case global.ErrorCodes.FailedCreateLocalBookmarks:
				errorMessage.title = browser.Constants.Error_FailedCreateLocalBookmarks_Title;
				errorMessage.message = browser.Constants.Error_FailedCreateLocalBookmarks_Message + err.details;
				break;
            case global.ErrorCodes.FailedRemoveLocalBookmarks:
				errorMessage.title = browser.Constants.Error_FailedRemoveLocalBookmarks_Title;
				errorMessage.message = browser.Constants.Error_FailedRemoveLocalBookmarks_Message; 
				break;
            case global.ErrorCodes.NoDataFound:
				errorMessage.title = browser.Constants.Error_NoDataFound_Title;
				errorMessage.message = browser.Constants.Error_NoDataFound_Message;
				break;
			case global.ErrorCodes.InvalidData:
				errorMessage.title = browser.Constants.Error_InvalidData_Title;
				errorMessage.message = browser.Constants.Error_InvalidData_Message; 
				break;
			case global.ErrorCodes.FailedFindUpdatedBookmark:
				errorMessage.title = browser.Constants.Error_FailedFindUpdatedBookmark_Title;
				errorMessage.message = browser.Constants.Error_FailedFindUpdatedBookmark_Message; 
				break;
			case global.ErrorCodes.NumBookmarksMismatch:
				errorMessage.title = browser.Constants.Error_NumBookmarksMismatch_Title;
				errorMessage.message = browser.Constants.Error_NumBookmarksMismatch_Message; 
				break;
            default:
				errorMessage.title = browser.Constants.Error_Default_Title;
                errorMessage.message = browser.Constants.Error_Default_Message;
		}
		
		return errorMessage;
	};
	
	return {
		Bookmark: bookmark,
		CheckServiceStatus: checkServiceStatus,
		DecryptData: decryptData,
		EncryptData: encryptData,
		GetErrorMessageFromException: getErrorMessageFromException
	};
};