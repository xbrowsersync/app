var xBrowserSync = xBrowserSync || {};
xBrowserSync.App = xBrowserSync.App || {};

/* ------------------------------------------------------------------------------------
 * Class name:	xBrowserSync.App.Utility
 * Description:	Defines utility functions used across all platforms.
 * ------------------------------------------------------------------------------------ */

xBrowserSync.App.Utility = function ($q, platform, globals) {
  'use strict';

  var currentMessageQueueItem, messageQueue = [];


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

  var convertLocalStorageToStorageApi = function () {
    var deferred = $q.defer();

    var syncEnabled = JSON.parse(localStorage.getItem('xBrowserSync-syncEnabled'));
    if (syncEnabled) {
      var displayIntro = JSON.parse(localStorage.getItem('xBrowserSync-displayIntro'));
      var lastUpdated = localStorage.getItem('xBrowserSync-lastUpdated');
      var password = localStorage.getItem('xBrowserSync-password');
      var serviceUrl = localStorage.getItem('xBrowserSync-urlHost');
      var syncBookmarksToolbar = localStorage.getItem('xBrowserSync-syncBookmarksToolbar');
      var syncId = localStorage.getItem('xBrowserSync-Id');
      var syncVersion = localStorage.getItem('xBrowserSync-syncVersion');

      // Set cached data
      $q.all([
        platform.LocalStorage.Set(globals.CacheKeys.DisplayIntro, displayIntro),
        platform.LocalStorage.Set(globals.CacheKeys.LastUpdated, lastUpdated),
        platform.LocalStorage.Set(globals.CacheKeys.Password, password),
        platform.LocalStorage.Set(globals.CacheKeys.ServiceUrl, serviceUrl),
        platform.LocalStorage.Set(globals.CacheKeys.SyncBookmarksToolbar, syncBookmarksToolbar),
        platform.LocalStorage.Set(globals.CacheKeys.SyncEnabled, syncEnabled),
        platform.LocalStorage.Set(globals.CacheKeys.SyncId, syncId),
        platform.LocalStorage.Set(globals.CacheKeys.SyncVersion, syncVersion)
      ])
        .then(deferred.resolve)
        .catch(deferred.reject);
    }
    else {
      deferred.resolve();
    }

    return deferred.promise
      .finally(function () {
        // Clear local storage
        _.keys(localStorage).forEach(function (key) { return localStorage.removeItem(key); });
      });
  };

  var createBackupData = function (bookmarksData, syncId, serviceUrl) {
    var data = {
      xbrowsersync: {
        date: getDateTimeString(new Date()),
        sync: {}
      }
    };

    // Add sync info if provided
    if (syncId) {
      data.xbrowsersync.sync = {
        id: syncId,
        service: {
          type: 'xbrowsersync',
          url: serviceUrl
        }
      };
    }

    // Add bookmarks data
    data.xbrowsersync.sync.bookmarks = bookmarksData;

    return data;
  };

  var decryptData = function (encryptedData) {
    // Determine which decryption method to use based on sync version
    return platform.LocalStorage.Get(globals.CacheKeys.SyncVersion)
      .then(function (syncVersion) {
        if (!syncVersion) {
          return decryptData_v1(encryptedData);
        }

        return decryptData_v2(encryptedData);
      })
      .catch(function (err) {
        logInfo('Decryption failed.');
        return $q.reject({
          code: globals.ErrorCodes.InvalidCredentials,
          stack: err.stack
        });
      });
  };

  var decryptData_v1 = function (encryptedData) {
    // If no data provided, return an empty string
    if (!encryptedData) {
      return $q.resolve('');
    }

    // Ensure password is in local storage
    return platform.LocalStorage.Get(globals.CacheKeys.Password)
      .then(function (password) {
        if (!password) {
          return $q.reject({ code: globals.ErrorCodes.PasswordRemoved });
        }

        // Decrypt using legacy crypto-js AES
        var decryptedData = CryptoJS.AES.decrypt(encryptedData, password).toString(CryptoJS.enc.Utf8);
        if (!decryptedData) {
          return $q.reject({ code: globals.ErrorCodes.InvalidCredentials });
        }

        return decryptedData;
      });
  };

  var decryptData_v2 = function (encryptedData) {
    var encryptedDataBytes, iv;

    // If no data provided, return an empty string
    if (!encryptedData) {
      return $q.resolve('');
    }

    // Ensure both id and password are in local storage
    return platform.LocalStorage.Get([
      globals.CacheKeys.Password,
      globals.CacheKeys.SyncId
    ])
      .then(function (cachedData) {
        var password = cachedData[globals.CacheKeys.Password];
        var syncId = cachedData[globals.CacheKeys.SyncId];

        if (!syncId) {
          return $q.reject({ code: globals.ErrorCodes.SyncRemoved });
        }
        if (!password) {
          return $q.reject({ code: globals.ErrorCodes.PasswordRemoved });
        }

        // Retrieve the hashed password from local storage and convert to bytes
        var keyData = base64js.toByteArray(password);

        // Convert base64 encoded encrypted data to bytes and extract initialization vector
        var encryptedBytes = base64js.toByteArray(encryptedData);
        iv = encryptedBytes.slice(0, 16);
        encryptedDataBytes = encryptedBytes.slice(16).buffer;

        // Generate a cryptokey using the stored password hash for decryption
        return crypto.subtle.importKey('raw', keyData, { name: 'AES-GCM', iv: iv }, false, ['decrypt']);
      })
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
      });
  };

  var deepCopy = function (obj) {
    return (!obj || (typeof obj !== 'object')) ? obj :
      (_.isString(obj)) ? String.prototype.slice.call(obj) :
        (_.isDate(obj)) ? new Date(obj.valueOf()) :
          (_.isFunction(obj.clone)) ? obj.clone() :
            (_.isArray(obj)) ? _.map(obj, function (t) { return deepCopy(t); }) :
              _.mapObject(obj, function (val, key) { return deepCopy(val); });
  };

  var encryptData = function (data) {
    var iv;

    // If no data provided, return an empty string
    if (!data) {
      return $q.resolve('');
    }

    // Ensure both id and password are in local storage
    return platform.LocalStorage.Get([
      globals.CacheKeys.Password,
      globals.CacheKeys.SyncId
    ])
      .then(function (cachedData) {
        var password = cachedData[globals.CacheKeys.Password];
        var syncId = cachedData[globals.CacheKeys.SyncId];

        if (!syncId) {
          return $q.reject({ code: globals.ErrorCodes.SyncRemoved });
        }
        if (!password) {
          return $q.reject({ code: globals.ErrorCodes.PasswordRemoved });
        }

        // Retrieve the hashed password from local storage and convert to bytes
        var keyData = base64js.toByteArray(password);

        // Generate a random 16 byte initialization vector
        iv = crypto.getRandomValues(new Uint8Array(16));

        // Generate a new cryptokey using the stored password hash
        return crypto.subtle.importKey('raw', keyData, { name: 'AES-GCM', iv: iv }, false, ['encrypt']);
      })
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
        logInfo('Encryption failed.');
        return $q.reject({
          code: globals.ErrorCodes.InvalidCredentials,
          stack: err.stack
        });
      });
  };

  var get24hrTimeFromDate = function (date) {
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  var getBackupFileName = function () {
    var fileName = 'xBrowserSyncBackup_' + getDateTimeString(new Date()) + '.json';
    return fileName;
  };

  var getDateTimeString = function (date) {
    if (!date) {
      return '';
    }

    var ms = ('00' + date.getMilliseconds()).slice(-3);
    var second = ('0' + date.getSeconds()).slice(-2);
    var minute = ('0' + date.getMinutes()).slice(-2);
    var hour = ('0' + date.getHours()).slice(-2);
    var day = ('0' + date.getDate()).slice(-2);
    var month = ('0' + (date.getMonth() + 1)).slice(-2);
    var year = date.getFullYear();
    return year + month + day + hour + minute + second + ms;
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
      case globals.ErrorCodes.NoDataFound:
        errorMessage.title = platform.GetConstant(globals.Constants.Error_InvalidCredentials_Title);
        errorMessage.message = platform.GetConstant(globals.Constants.Error_InvalidCredentials_Message);
        break;
      case globals.ErrorCodes.SyncRemoved:
        errorMessage.title = platform.GetConstant(globals.Constants.Error_SyncRemoved_Title);
        errorMessage.message = platform.GetConstant(globals.Constants.Error_SyncRemoved_Message);
        break;
      case globals.ErrorCodes.InvalidCredentials:
        errorMessage.title = platform.GetConstant(globals.Constants.Error_InvalidCredentials_Title);
        errorMessage.message = platform.GetConstant(globals.Constants.Error_InvalidCredentials_Message);
        break;
      case globals.ErrorCodes.ContainerChanged:
        errorMessage.title = platform.GetConstant(globals.Constants.Error_ContainerChanged_Title);
        errorMessage.message = platform.GetConstant(globals.Constants.Error_ContainerChanged_Message);
        break;
      case globals.ErrorCodes.LocalContainerNotFound:
        errorMessage.title = platform.GetConstant(globals.Constants.Error_LocalContainerNotFound_Title);
        errorMessage.message = platform.GetConstant(globals.Constants.Error_LocalContainerNotFound_Message);
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
      case globals.ErrorCodes.FailedCreateLocalBookmarks:
      case globals.ErrorCodes.FailedGetLocalBookmarks:
      case globals.ErrorCodes.FailedRemoveLocalBookmarks:
      case globals.ErrorCodes.LocalBookmarkNotFound:
      case globals.ErrorCodes.XBookmarkNotFound:
        errorMessage.title = platform.GetConstant(globals.Constants.Error_LocalSyncError_Title);
        errorMessage.message = platform.GetConstant(globals.Constants.Error_LocalSyncError_Message);
        break;
      default:
        errorMessage.title = platform.GetConstant(globals.Constants.Error_Default_Title);
        errorMessage.message = platform.GetConstant(globals.Constants.Error_Default_Message);
    }

    return errorMessage;
  };

  var getLogFileName = function () {
    var fileName = 'xBrowserSyncLog_' + getDateTimeString(new Date()) + '.txt';
    return fileName;
  };

  var getPasswordHash = function (password, salt) {
    var encoder = new TextEncoder('utf-8');
    var encodedSalt = encoder.encode(salt);

    // Get cached sync version
    return platform.LocalStorage.Get(globals.CacheKeys.SyncVersion)
      .then(function (syncVersion) {
        // If old sync version, don't hash password for legacy encryption
        if (!syncVersion) {
          return $q.resolve(password);
        }

        // Generate a new cryptokey using the stored password hash
        var keyData = encoder.encode(password);
        return crypto.subtle.importKey('raw', keyData, { name: 'PBKDF2' }, false, ['deriveKey'])
          .then(function (importedKey) {
            // Run the key through PBKDF2 with many iterations using the provided salt
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
      });
  };

  var getServiceUrl = function () {
    // Get service url from local storage
    return platform.LocalStorage.Get(globals.CacheKeys.ServiceUrl)
      .then(function (cachedServiceUrl) {
        // If no service url cached, use default
        return cachedServiceUrl || globals.URL.DefaultServiceUrl;
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

  var getUniqueishId = function () {
    return window.crypto.getRandomValues(new Uint32Array(1))[0].toString(36);
  };

  var isMobilePlatform = function (platformName) {
    return platformName === globals.Platforms.Android;
  };

  var isNetworkConnected = function () {
    return window.navigator.onLine;
  };

  var logError = function (err, message) {
    var errMessage;

    if (!err) {
      return;
    }

    if (err instanceof Error) {
      errMessage = err.message || err.name;
    }
    else if (err.code) {
      var codeName = _.findKey(globals.ErrorCodes, function (key) { return key === err.code; });
      errMessage = '[' + err.code + '] ' + codeName;
    }
    message = message ? message + ': ' + errMessage : errMessage;

    // Add message to queue and process
    messageQueue.push([globals.LogType.Error, message, err]);
    processMessageQueue();
  };

  var logInfo = function (message) {
    if (!message) {
      return;
    }

    // Add message to queue and process
    messageQueue.push([globals.LogType.Trace, message]);
    processMessageQueue();
  };

  var processMessageQueue = function () {
    // Return if currently processing or no more messages to process
    if (currentMessageQueueItem || messageQueue.length === 0) {
      return;
    }

    currentMessageQueueItem = messageQueue.shift();
    var messageType = currentMessageQueueItem[0];
    var message = currentMessageQueueItem[1];
    var err = currentMessageQueueItem[2];

    return platform.LocalStorage.Get(globals.CacheKeys.TraceLog)
      .then(function (debugMessageLog) {
        debugMessageLog = debugMessageLog || [];
        var messageLogText = new Date().toISOString().replace(/[A-Z]/g, ' ').trim() + '\t';

        switch (messageType) {
          case globals.LogType.Error:
            messageLogText += '[error]\t';
            if (err instanceof Error) {
              console.error(message, err);
            }
            else if (err.stack) {
              console.error(message, err.stack);
            }
            else {
              console.error(message);
            }
            break;
          case globals.LogType.Warn:
            messageLogText += '[warn]\t';
            console.warn(message);
            break;
          case globals.LogType.Trace:
          /* falls through */
          default:
            messageLogText += '[trace]\t';
            console.info(message);
        }

        messageLogText += typeof (message) === 'object' ? JSON.stringify(message) : message;
        if (err && err.stack) {
          messageLogText += '\t' + err.stack.replace(/\s+/g, ' ');
        }
        debugMessageLog.push(messageLogText);
        return platform.LocalStorage.Set(globals.CacheKeys.TraceLog, debugMessageLog);
      })
      .then(function () {
        // Process remaining messages
        currentMessageQueueItem = undefined;
        processMessageQueue();
      });
  };

  var logWarning = function (message) {
    if (!message) {
      return;
    }

    // Add message to queue and process
    messageQueue.push([globals.LogType.Warn, message]);
    processMessageQueue();
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
    return str ? str.replace(/<(?:.|\n)*?>/gm, '') : str;
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
    ConvertLocalStorageToStorageApi: convertLocalStorageToStorageApi,
    CreateBackupData: createBackupData,
    DecryptData: decryptData,
    EncryptData: encryptData,
    DeepCopy: deepCopy,
    Get24hrTimeFromDate: get24hrTimeFromDate,
    GetBackupFileName: getBackupFileName,
    GetDateTimeString: getDateTimeString,
    GetErrorMessageFromException: getErrorMessageFromException,
    GetLogFileName: getLogFileName,
    GetServiceUrl: getServiceUrl,
    GetTagArrayFromText: getTagArrayFromText,
    GetPasswordHash: getPasswordHash,
    GetUniqueishId: getUniqueishId,
    IsMobilePlatform: isMobilePlatform,
    IsNetworkConnected: isNetworkConnected,
    LogError: logError,
    LogInfo: logInfo,
    LogWarning: logWarning,
    ParseUrl: parseUrl,
    StripTags: stripTags,
    TrimToNearestWord: trimToNearestWord
  };
};