var xBrowserSync = xBrowserSync || {};
xBrowserSync.App = xBrowserSync.App || {};

/* ------------------------------------------------------------------------------------
 * Class name:	xBrowserSync.App.Utility
 * Description:	Defines utility functions used across all platforms.
 * ------------------------------------------------------------------------------------ */

xBrowserSync.App.Utility = function($q, platform, globals) { 
    'use strict';

/* ------------------------------------------------------------------------------------
 * Public functions
 * ------------------------------------------------------------------------------------ */
 
	var closest = function(element, predicate) {
		// Find closest element where predicate is true 
		return predicate(element) ? element : (
			element && closest(element.parentNode, predicate)
		);
	};
	
	var decryptData = function(data, errorCallback) {
		// Decrypt using AES
		return CryptoJS.AES.decrypt(data, globals.ClientSecret.Get()).toString(CryptoJS.enc.Utf8);
	};
	
	var encryptData = function(data, errorCallback) {
		// Encrypt using AES
		return CryptoJS.AES.encrypt(data, globals.ClientSecret.Get()).toString();
	};

	var getErrorMessageFromException = function(err) {
		var errorMessage = { 
			title: '',
			message: ''
		};
		 
		if (!err || !err.code) {
			errorMessage.title = platform.GetConstant(globals.Constants.Error_Default_Title);
			errorMessage.message = platform.GetConstant(globals.Constants.Error_Default_Message);
			return errorMessage;
		}
		
		err.details = (!err.details) ? '' : err.details;
		
		switch(err.code) {
            case globals.ErrorCodes.HttpRequestFailed:
				errorMessage.title = platform.GetConstant(globals.Constants.Error_HttpRequestFailed_Title);
				errorMessage.message = platform.GetConstant(globals.Constants.Error_HttpRequestFailed_Message); 
				break;
            case globals.ErrorCodes.HttpRequestFailedWhileUpdating:
				errorMessage.title = platform.GetConstant(globals.Constants.Error_HttpRequestFailedWhileUpdating_Title);
				errorMessage.message = platform.GetConstant(globals.Constants.Error_HttpRequestFailedWhileUpdating_Message); 
				break;
            case globals.ErrorCodes.TooManyRequests:
				errorMessage.title = platform.GetConstant(globals.Constants.Error_TooManyRequests_Title);
				errorMessage.message = platform.GetConstant(globals.Constants.Error_TooManyRequests_Message); 
				break;
            case globals.ErrorCodes.RequestEntityTooLarge:
				errorMessage.title = platform.GetConstant(globals.Constants.Error_RequestEntityTooLarge_Title);
				errorMessage.message = platform.GetConstant(globals.Constants.Error_RequestEntityTooLarge_Message); 
				break;
            case globals.ErrorCodes.NotAcceptingNewSyncs:
				errorMessage.title = platform.GetConstant(globals.Constants.Error_NotAcceptingNewSyncs_Title);
				errorMessage.message = platform.GetConstant(globals.Constants.Error_NotAcceptingNewSyncs_Message); 
				break;
            case globals.ErrorCodes.DailyNewSyncLimitReached:
				errorMessage.title = platform.GetConstant(globals.Constants.Error_DailyNewSyncLimitReached_Title);
				errorMessage.message = platform.GetConstant(globals.Constants.Error_DailyNewSyncLimitReached_Message); 
				break;
            case globals.ErrorCodes.MissingClientData:
				errorMessage.title = platform.GetConstant(globals.Constants.Error_MissingClientData_Title);
				errorMessage.message = platform.GetConstant(globals.Constants.Error_MissingClientData_Message); 
				break;
            case globals.ErrorCodes.FailedGetLocalBookmarks:
				errorMessage.title = platform.GetConstant(globals.Constants.Error_FailedGetLocalBookmarks_Title);
				errorMessage.message = platform.GetConstant(globals.Constants.Error_FailedGetLocalBookmarks_Message); 
				break;
            case globals.ErrorCodes.FailedCreateLocalBookmarks:
				errorMessage.title = platform.GetConstant(globals.Constants.Error_FailedCreateLocalBookmarks_Title);
				errorMessage.message = platform.GetConstant(globals.Constants.Error_FailedCreateLocalBookmarks_Message);
				break;
            case globals.ErrorCodes.FailedRemoveLocalBookmarks:
				errorMessage.title = platform.GetConstant(globals.Constants.Error_FailedRemoveLocalBookmarks_Title);
				errorMessage.message = platform.GetConstant(globals.Constants.Error_FailedRemoveLocalBookmarks_Message); 
				break;
            case globals.ErrorCodes.NoDataFound:
				errorMessage.title = platform.GetConstant(globals.Constants.Error_NoDataFound_Title);
				errorMessage.message = platform.GetConstant(globals.Constants.Error_NoDataFound_Message);
				break;
			case globals.ErrorCodes.IdRemoved:
				errorMessage.title = platform.GetConstant(globals.Constants.Error_IdRemoved_Title);
				errorMessage.message = platform.GetConstant(globals.Constants.Error_IdRemoved_Message);
				break;
			case globals.ErrorCodes.InvalidData:
				errorMessage.title = platform.GetConstant(globals.Constants.Error_InvalidData_Title);
				errorMessage.message = platform.GetConstant(globals.Constants.Error_InvalidData_Message); 
				break;
			case globals.ErrorCodes.UpdatedBookmarkNotFound:
				errorMessage.title = platform.GetConstant(globals.Constants.Error_LastChangeNotSynced_Title);
				errorMessage.message = platform.GetConstant(globals.Constants.Error_LastChangeNotSynced_Message); 
				break;
			case globals.ErrorCodes.XBookmarkNotFound:
				errorMessage.title = platform.GetConstant(globals.Constants.Error_BookmarkNotFound_Title);
				errorMessage.message = platform.GetConstant(globals.Constants.Error_BookmarkNotFound_Message); 
				break;
			case globals.ErrorCodes.ContainerChanged:
				errorMessage.title = platform.GetConstant(globals.Constants.Error_ContainerChanged_Title);
				errorMessage.message = platform.GetConstant(globals.Constants.Error_ContainerChanged_Message); 
				break;
			case globals.ErrorCodes.DataOutOfSync:
				errorMessage.title = platform.GetConstant(globals.Constants.Error_OutOfSync_Title);
				errorMessage.message = platform.GetConstant(globals.Constants.Error_OutOfSync_Message); 
				break;
			case globals.ErrorCodes.NotImplemented:
				errorMessage.title = platform.GetConstant(globals.Constants.Error_NotImplemented_Title);
				errorMessage.message = platform.GetConstant(globals.Constants.Error_NotImplemented_Message); 
				break;
			case globals.ErrorCodes.FailedGetPageMetadata:
				errorMessage.title = platform.GetConstant(globals.Constants.Error_FailedGetPageMetadata_Title);
				errorMessage.message = platform.GetConstant(globals.Constants.Error_FailedGetPageMetadata_Message); 
				break;
			case globals.ErrorCodes.FailedScanID:
				errorMessage.title = platform.GetConstant(globals.Constants.Error_ScanFailed_Title);
				break;
			case globals.ErrorCodes.FailedShareBookmark:
				errorMessage.title = platform.GetConstant(globals.Constants.Error_ShareFailed_Title);
				break;
			case globals.ErrorCodes.FailedBackupData:
				errorMessage.title = platform.GetConstant(globals.Constants.Error_FailedBackupData_Title);
				break;
			case globals.ErrorCodes.InvalidUrlScheme:
				errorMessage.title = platform.GetConstant(globals.Constants.Error_InvalidUrlScheme_Title);
				break;
            default:
				errorMessage.title = platform.GetConstant(globals.Constants.Error_Default_Title);
                errorMessage.message = platform.GetConstant(globals.Constants.Error_Default_Message);
		}
		
		return errorMessage;
	};

	var getHostFromUrl = function(url) {
		if (!url) {
			return '';
		}
		
		var hyperlinkElement = document.createElement('a');
		hyperlinkElement.href = url;
		return hyperlinkElement.host;
	};

	var getStringSizeInBytes = function(str) {
		return encodeURI(str).split(/%..|./).length - 1;
	};

	var getTagArrayFromText = function(tagText) {
        if (!tagText) {
            return null;
        }
        
        // Conver to lowercase and split tags into array
        var tags = tagText.toLowerCase().replace(/['"]/g, '').split(',');
        
        // Clean and sort tags
        tags = _.chain(tags)
            .map(function(tag) {
                return tag.trim();
            })
            .compact()
			.uniq()
            .sortBy(function(tag) {
                return tag;
            })
            .value();
        
        return tags;
    };

	var logMessage = function(moduleName, functionName, messageType, message) {
		switch (messageType) {
			case logType.Error:
				messageType = 'ERROR';
				console.error(moduleName + ':' + functionName + ', ' + messageType + ': ' + message);
				break;
			case logType.Warning:
				messageType = 'WARNING';
				console.warn(moduleName + ':' + functionName + ', ' + messageType + ': ' + message);
				break;
			case logType.Info:
				/* falls through */
			default:
				messageType = 'INFO';
				console.info(moduleName + ':' + functionName + ', ' + messageType + ': ' + message);
				break;
		}
	};

	var logType = { Info: 0, Warning: 1, Error: 2};

	var parseUrl = function(url) {
		var parser = document.createElement('a'),
			searchObject = {},
			queries, split, i;

		parser.href = url;
		queries = parser.search.replace(/^\?/, '').split('&');
		for( i = 0; i < queries.length; i++ ) {
			split = queries[i].split('=');
			searchObject[split[0]] = split[1];
		}

		return {
			protocol: parser.protocol,
			host: parser.host,
			hostname: parser.hostname,
			port: parser.port,
			pathname: parser.pathname,
			search: parser.search,
			searchObject: searchObject,
			hash: parser.hash
		};
	};

	var stripTags = function(str) {
		return (!!str) ? str.replace(/<(?:.|\n)*?>/gm, '') : str;
	};

	var trimToNearestWord = function(text, limit) {
		if (!text) { return ''; }

		text = text.trim();

		if (limit >= text.length) {
			return text;
		}

		var trimmedText = text.substring(0, text.lastIndexOf(' ', limit)) + '\u2026';
  		return trimmedText;
	};

	
	return {
		Closest: closest,
		DecryptData: decryptData,
		EncryptData: encryptData,
		GetErrorMessageFromException: getErrorMessageFromException,
		GetHostFromUrl: getHostFromUrl,
		GetStringSizeInBytes: getStringSizeInBytes,
		GetTagArrayFromText: getTagArrayFromText,
		LogMessage: logMessage,
		LogType: logType,
		ParseUrl: parseUrl,
		StripTags: stripTags,
		TrimToNearestWord: trimToNearestWord
	};
};