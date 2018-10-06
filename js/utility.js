var xBrowserSync = xBrowserSync || {};
xBrowserSync.App = xBrowserSync.App || {};

/* ------------------------------------------------------------------------------------
 * Class name:	xBrowserSync.App.Utility
 * Description:	Defines utility functions used across all platforms.
 * ------------------------------------------------------------------------------------ */

xBrowserSync.App.Utility = function ($q, platform, globals) {
	'use strict';

	var moduleName = 'xBrowserSync.App.Utility';

	/* ------------------------------------------------------------------------------------
	 * Public functions
	 * ------------------------------------------------------------------------------------ */

	var asyncReduce = function (initialValue, itemArray, iterator) {
		return itemArray.reduce(function (promiseChain, currentItem) {
			return promiseChain.then(function (prevResult) {
				return iterator(prevResult, currentItem);
			});
		}, $q.resolve(initialValue));
	};

	var closest = function (element, predicate) {
		// Find closest element where predicate is true 
		return predicate(element) ? element : (
			element && closest(element.parentNode, predicate)
		);
	};

	var concatUint8Arrays = function concatUint8Arrays(firstArr, secondArr) {
		firstArr = firstArr || new Uint8Array();
		secondArr = secondArr || new Uint8Array();

		var totalLength = firstArr.length + secondArr.length;
		var result = new Uint8Array(totalLength);
		result.set(firstArr, 0);
		result.set(secondArr, firstArr.length);
		return result;
	};

	var decryptData = function (encryptedData) {
		// Determine which decryption method to use based on sync version
		if (!globals.SyncVersion.Get()) {
			return decryptData_v1(encryptedData);
		}

		return decryptData_v2(encryptedData);
	};

	var decryptData_v1 = function (encryptedData) {
		// If no data provided, return an empty string
		if (!encryptedData) {
			return $q.resolve('');
		}

		// Ensure password is in local storage
		if (!globals.Password.Get()) {
			return $q.reject({ code: globals.ErrorCodes.PasswordRemoved });
		}

		return $q(function (resolve, reject) {
			try {
				// Decrypt using legacy crypto-js AES
				var decryptedData = CryptoJS.AES.decrypt(encryptedData, globals.Password.Get()).toString(CryptoJS.enc.Utf8);

				if (!decryptedData) {
					throw new Error('Unable to decrypt data.');
				}

				resolve(decryptedData);
			}
			catch (err) {
				reject({ code: globals.ErrorCodes.InvalidData });
			}
		});
	};

	var decryptData_v2 = function (encryptedData) {
		// If no data provided, return an empty string
		if (!encryptedData) {
			return $q.resolve('');
		}

		// Ensure both id and password are in local storage
		if (!globals.Id.Get()) {
			return $q.reject({ code: globals.ErrorCodes.IdRemoved });
		}
		if (!globals.Password.Get()) {
			return $q.reject({ code: globals.ErrorCodes.PasswordRemoved });
		}

		// Retrieve the hashed password from local storage and convert to bytes
		var keyData = base64js.toByteArray(globals.Password.Get());

		// Convert base64 encoded encrypted data to bytes and extract initialization vector
		var encryptedBytes = base64js.toByteArray(encryptedData);
		var iv = encryptedBytes.slice(0, 16);
		var encryptedDataBytes = encryptedBytes.slice(16).buffer;

		// Generate a cryptokey using the stored password hash for decryption
		return crypto.subtle.importKey('raw', keyData, { name: 'AES-GCM', iv: iv }, false, ['decrypt'])
			.then(function (key) {
				// Convert base64 encoded encrypted data to bytes
				return crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, key, encryptedDataBytes);
			})
			.then(function (decryptedBytes) {
				if (!decryptedBytes) {
					throw new Error('Unable to decrypt data.');
				}

				// Uncompress the decrypted data and return
				var decryptedData = LZUTF8.decompress(new Uint8Array(decryptedBytes));
				return decryptedData;
			})
			.catch(function (err) {
				if (err && err.name !== 'OperationError') {
					logError(err);
				}

				return $q.reject({ code: globals.ErrorCodes.InvalidData });
			});
	};

	var deepCopy = function (obj) {
		return (!obj || (typeof obj !== 'object')) ? obj :
			(_.isString(obj)) ? String.prototype.slice.call(obj) :
				(_.isDate(obj)) ? new Date(obj.valueOf()) :
					(_.isFunction(obj.clone)) ? obj.clone() :
						(_.isArray(obj)) ? _.map(obj, function (t) { return deepCopy(t) }) :
							_.mapObject(obj, function (val, key) { return deepCopy(val) });
	};

	var encryptData = function (data) {
		// If no data provided, return an empty string
		if (!data) {
			return $q.resolve('');
		}

		// Ensure both id and password are in local storage
		if (!globals.Id.Get()) {
			return $q.reject({ code: globals.ErrorCodes.IdRemoved });
		}
		if (!globals.Password.Get()) {
			return $q.reject({ code: globals.ErrorCodes.PasswordRemoved });
		}

		// Retrieve the hashed password from local storage and convert to bytes
		var keyData = base64js.toByteArray(globals.Password.Get());

		// Generate a random 16 byte initialization vector
		var iv = crypto.getRandomValues(new Uint8Array(16));

		// Generate a new cryptokey using the stored password hash
		return crypto.subtle.importKey('raw', keyData, { name: 'AES-GCM', iv: iv }, false, ['encrypt'])
			.then(function (key) {
				// Compress the data before encryption
				var compressedData = LZUTF8.compress(data);

				// Encrypt the data using AES
				return crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, compressedData);
			})
			.then(function (encryptedData) {
				// Combine initialization vector and encrypted data and return as base64 encoded string
				var combinedData = concatUint8Arrays(iv, new Uint8Array(encryptedData));
				return base64js.fromByteArray(combinedData);
			})
			.catch(function (err) {
				logError(err);
				return $q.reject({ code: globals.ErrorCodes.InvalidData });
			});
	};

	var getBackupFileName = function () {
		var date = new Date();
		var minute = ('0' + date.getMinutes()).slice(-2);
		var hour = ('0' + date.getHours()).slice(-2);
		var day = ('0' + date.getDate()).slice(-2);
		var month = ('0' + (date.getMonth() + 1)).slice(-2);
		var year = date.getFullYear();
		var dateString = year + month + day + hour + minute;
		var fileName = 'xBrowserSyncBackup_' + dateString + '.json';
		return fileName;
	};

	var getErrorMessageFromException = function (err) {
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

		switch (err.code) {
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
			case globals.ErrorCodes.ApiInvalid:
				errorMessage.title = platform.GetConstant(globals.Constants.Error_ApiInvalid_Title);
				errorMessage.message = platform.GetConstant(globals.Constants.Error_ApiInvalid_Message);
				break;
			case globals.ErrorCodes.ApiOffline:
				errorMessage.title = platform.GetConstant(globals.Constants.Error_HttpRequestFailed_Title);
				errorMessage.message = platform.GetConstant(globals.Constants.Error_HttpRequestFailed_Message);
				break;
			case globals.ErrorCodes.ApiVersionNotSupported:
				errorMessage.title = platform.GetConstant(globals.Constants.Error_ApiVersionNotSupported_Title);
				errorMessage.message = platform.GetConstant(globals.Constants.Error_ApiVersionNotSupported_Message);
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
			case globals.ErrorCodes.FailedGetDataToRestore:
				errorMessage.title = platform.GetConstant(globals.Constants.Error_FailedGetDataToRestore_Title);
				break;
			case globals.ErrorCodes.FailedRestoreData:
				errorMessage.title = platform.GetConstant(globals.Constants.Error_FailedRestoreData_Title);
				break;
			case globals.ErrorCodes.FailedShareUrl:
				errorMessage.title = platform.GetConstant(globals.Constants.Error_FailedShareUrl_Title);
				break;
			case globals.ErrorCodes.FailedShareUrlNotSynced:
				errorMessage.title = platform.GetConstant(globals.Constants.Error_FailedShareUrlNotSynced_Title);
				break;
			default:
				errorMessage.title = platform.GetConstant(globals.Constants.Error_Default_Title);
				errorMessage.message = platform.GetConstant(globals.Constants.Error_Default_Message);
		}

		return errorMessage;
	};

	var getPasswordHash = function (password, salt) {
		// If old sync version, don't hash password for legacy encryption
		if (!globals.SyncVersion.Get()) {
			return $q.resolve(password);
		}

		var encoder = new TextEncoder('utf-8');

		// Generate a new cryptokey using the stored password hash
		var keyData = encoder.encode(password);
		return crypto.subtle.importKey('raw', keyData, { name: 'PBKDF2' }, false, ['deriveKey'])
			.then(function (importedKey) {
				// Run the key through PBKDF2 with many iterations using the provided salt
				var encodedSalt = encoder.encode(salt);
				return crypto.subtle.deriveKey(
					{
						name: 'PBKDF2',
						salt: encodedSalt,
						iterations: 250000,
						hash: 'SHA-256'
					},
					importedKey,
					{ name: 'AES-GCM', length: 256 },
					true,
					['encrypt', 'decrypt']
				);
			})
			.then(function (derivedKey) {
				// Export the hashed key
				return crypto.subtle.exportKey('raw', derivedKey);
			})
			.then(function (exportedKey) {
				// Convert exported key to base64 encoded string and return
				var base64Key = base64js.fromByteArray(new Uint8Array(exportedKey));
				return base64Key;
			});
	};

	var getTagArrayFromText = function (tagText) {
		if (!tagText) {
			return null;
		}

		// Conver to lowercase and split tags into array
		var tags = tagText.toLowerCase().replace(/['"]/g, '').split(',');

		// Clean and sort tags
		tags = _.chain(tags)
			.map(function (tag) {
				return tag.trim();
			})
			.compact()
			.uniq()
			.sortBy(function (tag) {
				return tag;
			})
			.value();

		return tags;
	};

	var isMobilePlatform = function (platformName) {
		return platformName === globals.Platforms.Android || platformName === globals.Platforms.IOS;
	};

	var isNetworkConnected = function () {
		return window.navigator.onLine;
	};

	var logError = function (err) {
		if (!err || !(err instanceof Error)) {
			return;
		}

		logMessage(globals.LogType.Error, err);
	};

	var logMessage = function (messageType, message) {
		var messageLogText;
		
		switch (messageType) {
			case globals.LogType.Error:
				messageLogText = 'ERROR: ';
				console.error(message);
				break;
			case globals.LogType.Warning:
				messageLogText = 'WARNING: ';
				console.warn(message);
				break;
			case globals.LogType.Info:
			/* falls through */
			default:
				messageLogText = 'INFO: ';
				if (globals.Debug.Enabled.Get()) {
					console.info(message);
				}
				break;
		}

		if (globals.Debug.Enabled.Get()) {
			messageLogText += message.stack || message;
			globals.Debug.MessageLog.Set(messageLogText);
		}
	};

	var parseUrl = function (url) {
		var parser = document.createElement('a'),
			searchObject = {},
			queries, split, i;

		parser.href = url;
		queries = parser.search.replace(/^\?/, '').split('&');
		for (i = 0; i < queries.length; i++) {
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

	var stripTags = function (str) {
		return (!!str) ? str.replace(/<(?:.|\n)*?>/gm, '') : str;
	};

	var toggleDebugMode = function () {
		var debugModeEnabled = !globals.Debug.Enabled.Get();
		globals.Debug.Enabled.Set(debugModeEnabled);
		return debugModeEnabled;
	};

	var trimToNearestWord = function (text, limit) {
		if (!text) { return ''; }

		text = text.trim();

		if (limit >= text.length) {
			return text;
		}

		var trimmedText = text.substring(0, text.lastIndexOf(' ', limit)) + '\u2026';
		return trimmedText;
	};

	return {
		AsyncReduce: asyncReduce,
		Closest: closest,
		DecryptData: decryptData,
		EncryptData: encryptData,
		DeepCopy: deepCopy,
		GetBackupFileName: getBackupFileName,
		GetErrorMessageFromException: getErrorMessageFromException,
		GetTagArrayFromText: getTagArrayFromText,
		GetPasswordHash: getPasswordHash,
		IsMobilePlatform: isMobilePlatform,
		IsNetworkConnected: isNetworkConnected,
		LogError: logError,
		LogMessage: logMessage,
		ParseUrl: parseUrl,
		StripTags: stripTags,
		ToggleDebugMode: toggleDebugMode,
		TrimToNearestWord: trimToNearestWord
	};
};