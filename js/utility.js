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
					result.container = globals.Bookmarks.OtherContainerName;
					result.xBookmark = otherContainerResult.xBookmark;
				}
				else if (!!toolbarContainerResult.found) {
					result.container = globals.Bookmarks.ToolbarContainerName;
					result.xBookmark = toolbarContainerResult.xBookmark;
				}
				else if (!!xbsContainerResult.found) {
					result.container = globals.Bookmarks.xBrowserSyncContainerName;
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
				errorMessage.message = platform.GetConstant(globals.Constants.Wrror_BookmarkNotFound_Message); 
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

	var getOtherContainer = function(bookmarks, createIfNotPresent) {
        var container = _.findWhere(bookmarks, { title: globals.Bookmarks.OtherContainerName });

        // If container does not exist, create it if specified
        if (!container && !!createIfNotPresent) {
            container = new xBookmark(globals.Bookmarks.OtherContainerName);
            bookmarks.push(container);
        }

        return container;
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
            .sortBy(function(tag) {
                return tag;
            })
            .value();
        
        return tags;
    };

	var getToolbarContainer = function(bookmarks, createIfNotPresent) {
        var container = _.findWhere(bookmarks, { title: globals.Bookmarks.ToolbarContainerName });

        // If container does not exist, create it if specified
        if (!container && !!createIfNotPresent) {
            container = new xBookmark(globals.Bookmarks.ToolbarContainerName);
            bookmarks.push(container);
        }

        return container;
    };

	var getXBrowserSyncContainer = function(bookmarks, createIfNotPresent) {
        var container = _.findWhere(bookmarks, { title: globals.Bookmarks.xBrowserSyncContainerName });

        // If container does not exist, create it if specified
        if (!container && !!createIfNotPresent) {
            container = new xBookmark(globals.Bookmarks.xBrowserSyncContainerName);
            bookmarks.push(container);
        }

        return container;
    };

	var isBookmarkContainer = function(bookmark) {
		return (bookmark.title === globals.Bookmarks.OtherContainerName ||
				bookmark.title === globals.Bookmarks.ToolbarContainerName ||
				bookmark.title === globals.Bookmarks.xBrowserSyncContainerName);
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
			xBookmark.description = description.trim().substring(0, globals.Bookmarks.DescriptionMaxLength);
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
		Closest: closest,
		DecryptData: decryptData,
		EncryptData: encryptData,
		FindXBookmarkInContainers: findXBookmarkInContainers,
		GetErrorMessageFromException: getErrorMessageFromException,
		GetOtherContainer: getOtherContainer,
		GetStringSizeInBytes: getStringSizeInBytes,
		GetTagArrayFromText: getTagArrayFromText,
		GetToolbarContainer: getToolbarContainer,
		GetXBrowserSyncContainer: getXBrowserSyncContainer,
		IsBookmarkContainer: isBookmarkContainer,
		LogMessage: logMessage,
		LogType: logType,
		ParseUrl: parseUrl,
		XBookmark: xBookmark		
	};
};