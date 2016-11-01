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

	var findXBookmarkInContainers = function(xBookmarks, predicate) {
		// Search for bookmark in other container
		var checkOtherContainer = $q(function(resolve, reject) {
			var otherContainer = getOtherContainer(xBookmarks, true);
			var result = {
				found: false,
				xBookmark: null
			};

			var foundXBookmarks = findXBookmark([otherContainer], predicate);
			if (!foundXBookmarks || foundXBookmarks.length === 0 || foundXBookmarks.length > 1) {
				return resolve(result);
			}

			result.found = true;
			result.xBookmark = foundXBookmarks[0];
			return resolve(result);
		});

		// Search for bookmark in toolbar container
		var checkToolbarContainer = $q(function(resolve, reject) {
			var toolbarContainer = getToolbarContainer(xBookmarks, true);
			var result = {
				found: false,
				xBookmark: null
			};

			var foundXBookmarks = findXBookmark([toolbarContainer], predicate);
			if (!foundXBookmarks || foundXBookmarks.length === 0 || foundXBookmarks.length > 1) {
				return resolve(result);
			}

			result.found = true;
			result.xBookmark = foundXBookmarks[0];
			return resolve(result);
		});

		// Search for bookmark in xbs container
		var checkXbsContainer = $q(function(resolve, reject) {
			var xbsContainer = getXBrowserSyncContainer(xBookmarks, true);
			var result = {
				found: false,
				xBookmark: null
			};

			var foundXBookmarks = findXBookmark([xbsContainer], predicate);
			if (!foundXBookmarks || foundXBookmarks.length === 0 || foundXBookmarks.length > 1) {
				return resolve(result);
			}

			result.found = true;
			result.xBookmark = foundXBookmarks[0];
			return resolve(result);
		});

		return $q.all([checkOtherContainer, checkToolbarContainer, checkXbsContainer])
			.then(function(results) {
				var otherContainerResult = results[0];
				var toolbarContainerResult = results[1];
				var xbsContainerResult = results[2];
				var result = {
					container: null,
					xBookmark: null
				};

				if (!!otherContainerResult.found) {
					result.container = global.Bookmarks.OtherContainerName;
					result.xBookmark = otherContainerResult.xBookmark;
				}
				else if (!!toolbarContainerResult.found) {
					result.container = global.Bookmarks.ToolbarContainerName;
					result.xBookmark = toolbarContainerResult.xBookmark;
				}
				else if (!!xbsContainerResult.found) {
					result.container = global.Bookmarks.xBrowserSyncContainerName;
					result.xBookmark = xbsContainerResult.xBookmark;
				}

				return result;
			}); 
	};
	
	var getErrorMessageFromException = function(err) {
		var errorMessage = { 
			title: '',
			message: ''
		};
		 
		if (!err || !err.code) {
			errorMessage.title = platform.GetConstant(global.Constants.Error_Default_Title);
			errorMessage.message = platform.GetConstant(global.Constants.Error_Default_Message);
			return errorMessage;
		}
		
		err.details = (!err.details) ? '' : err.details;
		
		switch(err.code) {
            case global.ErrorCodes.HttpRequestFailed:
				errorMessage.title = platform.GetConstant(global.Constants.Error_HttpRequestFailed_Title);
				errorMessage.message = platform.GetConstant(global.Constants.Error_HttpRequestFailed_Message); 
				break;
            case global.ErrorCodes.TooManyRequests:
				errorMessage.title = platform.GetConstant(global.Constants.Error_TooManyRequests_Title);
				errorMessage.message = platform.GetConstant(global.Constants.Error_TooManyRequests_Message); 
				break;
            case global.ErrorCodes.RequestEntityTooLarge:
				errorMessage.title = platform.GetConstant(global.Constants.Error_RequestEntityTooLarge_Title);
				errorMessage.message = platform.GetConstant(global.Constants.Error_RequestEntityTooLarge_Message); 
				break;
            case global.ErrorCodes.NotAcceptingNewSyncs:
				errorMessage.title = platform.GetConstant(global.Constants.Error_NotAcceptingNewSyncs_Title);
				errorMessage.message = platform.GetConstant(global.Constants.Error_NotAcceptingNewSyncs_Message); 
				break;
            case global.ErrorCodes.DailyNewSyncLimitReached:
				errorMessage.title = platform.GetConstant(global.Constants.Error_DailyNewSyncLimitReached_Title);
				errorMessage.message = platform.GetConstant(global.Constants.Error_DailyNewSyncLimitReached_Message); 
				break;
            case global.ErrorCodes.MissingClientData:
				errorMessage.title = platform.GetConstant(global.Constants.Error_MissingClientData_Title);
				errorMessage.message = platform.GetConstant(global.Constants.Error_MissingClientData_Message); 
				break;
            case global.ErrorCodes.FailedGetLocalBookmarks:
				errorMessage.title = platform.GetConstant(global.Constants.Error_FailedGetLocalBookmarks_Title);
				errorMessage.message = platform.GetConstant(global.Constants.Error_FailedGetLocalBookmarks_Message); 
				break;
            case global.ErrorCodes.FailedCreateLocalBookmarks:
				errorMessage.title = platform.GetConstant(global.Constants.Error_FailedCreateLocalBookmarks_Title);
				errorMessage.message = platform.GetConstant(global.Constants.Error_FailedCreateLocalBookmarks_Message);
				break;
            case global.ErrorCodes.FailedRemoveLocalBookmarks:
				errorMessage.title = platform.GetConstant(global.Constants.Error_FailedRemoveLocalBookmarks_Title);
				errorMessage.message = platform.GetConstant(global.Constants.Error_FailedRemoveLocalBookmarks_Message); 
				break;
            case global.ErrorCodes.NoDataFound:
				errorMessage.title = platform.GetConstant(global.Constants.Error_NoDataFound_Title);
				errorMessage.message = platform.GetConstant(global.Constants.Error_NoDataFound_Message);
				break;
			case global.ErrorCodes.InvalidData:
				errorMessage.title = platform.GetConstant(global.Constants.Error_InvalidData_Title);
				errorMessage.message = platform.GetConstant(global.Constants.Error_InvalidData_Message); 
				break;
			case global.ErrorCodes.UpdatedBookmarkNotFound:
				errorMessage.title = platform.GetConstant(global.Constants.Error_LastChangeNotSynced_Title);
				errorMessage.message = platform.GetConstant(global.Constants.Error_LastChangeNotSynced_Message); 
				break;
			case global.ErrorCodes.XBookmarkNotFound:
				errorMessage.title = platform.GetConstant(global.Constants.Error_BookmarkNotFound_Title);
				errorMessage.message = platform.GetConstant(global.Constants.Wrror_BookmarkNotFound_Message); 
				break;
			case global.ErrorCodes.ContainerChanged:
				errorMessage.title = platform.GetConstant(global.Constants.Error_ContainerChanged_Title);
				errorMessage.message = platform.GetConstant(global.Constants.Error_ContainerChanged_Message); 
				break;
			case global.ErrorCodes.DataOutOfSync:
				errorMessage.title = platform.GetConstant(global.Constants.Error_OutOfSync_Title);
				errorMessage.message = platform.GetConstant(global.Constants.Error_OutOfSync_Message); 
				break;
			case global.ErrorCodes.NotImplemented:
				errorMessage.title = platform.GetConstant(global.Constants.Error_NotImplemented_Title);
				errorMessage.message = platform.GetConstant(global.Constants.Error_NotImplemented_Message); 
				break;
			case global.ErrorCodes.FailedGetPageMetadata:
				errorMessage.title = platform.GetConstant(global.Constants.Error_FailedGetPageMetadata_Title);
				errorMessage.message = platform.GetConstant(global.Constants.Error_FailedGetPageMetadata_Message); 
				break;
			case global.ErrorCodes.FailedScanID:
				errorMessage.title = platform.GetConstant(global.Constants.Error_ScanFailed_Title);
				break;
			case global.ErrorCodes.FailedShareBookmark:
				errorMessage.title = platform.GetConstant(global.Constants.Error_ShareFailed_Title);
				break;
			case global.ErrorCodes.FailedBackupData:
				errorMessage.title = platform.GetConstant(global.Constants.Error_FailedBackupData_Title);
				break;
            default:
				errorMessage.title = platform.GetConstant(global.Constants.Error_Default_Title);
                errorMessage.message = platform.GetConstant(global.Constants.Error_Default_Message);
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

	var getStringSizeInBytes = function(str) {
		return encodeURI(str).split(/%..|./).length - 1;
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

	var isBookmarkContainer = function(bookmark) {
		return (bookmark.title === global.Bookmarks.OtherContainerName ||
				bookmark.title === global.Bookmarks.ToolbarContainerName ||
				bookmark.title === global.Bookmarks.xBrowserSyncContainerName);
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


/* ------------------------------------------------------------------------------------
 * Private functions
 * ------------------------------------------------------------------------------------ */
	
	var findXBookmark = function(xBookmarks, predicate) {
		var results = [];
		
		// Filter array
		results = _.union(results, _.filter(xBookmarks, function(xBookmark) {
			// Match based on supplied predicate
			return predicate(xBookmark);
		}));
		
		// Process children
		var children = _.pluck(xBookmarks, 'children');		
		for (var i = 0; i < children.length; i++) {
			results = _.union(results, findXBookmark(children[i], predicate));
		}
		
		return results;
	};
	

	return {
		DecryptData: decryptData,
		EncryptData: encryptData,
		FindXBookmarkInContainers: findXBookmarkInContainers,
		GetErrorMessageFromException: getErrorMessageFromException,
		GetOtherContainer: getOtherContainer,
		GetStringSizeInBytes: getStringSizeInBytes,
		GetToolbarContainer: getToolbarContainer,
		GetXBrowserSyncContainer: getXBrowserSyncContainer,
		IsBookmarkContainer: isBookmarkContainer,
		XBookmark: xBookmark		
	};
};