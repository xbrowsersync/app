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

  var createBackupData = function (bookmarksData, syncId, serviceUrl) {
    var data = {
      xbrowsersync: {
        date: getDateTimeString(new Date()),
        sync: {},
        data: {}
      }
    };

    // Add sync info if provided
    if (syncId) {
      data.xbrowsersync.sync.id = syncId;
      data.xbrowsersync.sync.type = 'xbrowsersync';
      data.xbrowsersync.sync.url = serviceUrl;
    }

    // Add bookmarks data
    data.xbrowsersync.data.bookmarks = bookmarksData;

    return data;
  };

  var decryptData = function (encryptedData) {
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
      })
      .catch(function (err) {
        logInfo('Decryption failed.');
        return $q.reject({
          code: globals.ErrorCodes.InvalidCredentials,
          stack: err.stack
        });
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
    var fileName = 'xbs_backup_' + getDateTimeString(new Date()) + '.json';
    return fileName;
  };

  var getDateTimeString = function (date) {
    if (!date) {
      return '';
    }

    var second = ('0' + date.getSeconds()).slice(-2);
    var minute = ('0' + date.getMinutes()).slice(-2);
    var hour = ('0' + date.getHours()).slice(-2);
    var day = ('0' + date.getDate()).slice(-2);
    var month = ('0' + (date.getMonth() + 1)).slice(-2);
    var year = date.getFullYear();
    return year + month + day + hour + minute + second;
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
      case globals.ErrorCodes.NetworkOffline:
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
      case globals.ErrorCodes.InvalidService:
        errorMessage.title = platform.GetConstant(globals.Constants.Error_InvalidService_Title);
        errorMessage.message = platform.GetConstant(globals.Constants.Error_InvalidService_Message);
        break;
      case globals.ErrorCodes.ServiceOffline:
        errorMessage.title = platform.GetConstant(globals.Constants.Error_ServiceOffline_Title);
        errorMessage.message = platform.GetConstant(globals.Constants.Error_ServiceOffline_Message);
        break;
      case globals.ErrorCodes.UnsupportedServiceApiVersion:
        errorMessage.title = platform.GetConstant(globals.Constants.Error_UnsupportedServiceApiVersion_Title);
        errorMessage.message = platform.GetConstant(globals.Constants.Error_UnsupportedServiceApiVersion_Message);
        break;
      case globals.ErrorCodes.FailedGetPageMetadata:
        errorMessage.title = platform.GetConstant(globals.Constants.Error_FailedGetPageMetadata_Title);
        errorMessage.message = platform.GetConstant(globals.Constants.Error_FailedGetPageMetadata_Message);
        break;
      case globals.ErrorCodes.FailedScan:
        errorMessage.title = platform.GetConstant(globals.Constants.Error_ScanFailed_Message);
        break;
      case globals.ErrorCodes.FailedShareBookmark:
        errorMessage.title = platform.GetConstant(globals.Constants.Error_ShareFailed_Title);
        break;
      case globals.ErrorCodes.FailedDownloadFile:
        errorMessage.title = platform.GetConstant(globals.Constants.Error_FailedDownloadFile_Title);
        break;
      case globals.ErrorCodes.FailedGetDataToRestore:
        errorMessage.title = platform.GetConstant(globals.Constants.Error_FailedGetDataToRestore_Title);
        break;
      case globals.ErrorCodes.FailedRestoreData:
        errorMessage.title = platform.GetConstant(globals.Constants.Error_FailedRestoreData_Title);
        errorMessage.message = platform.GetConstant(globals.Constants.Error_FailedRestoreData_Message);
        break;
      case globals.ErrorCodes.FailedShareUrl:
        errorMessage.title = platform.GetConstant(globals.Constants.Error_FailedShareUrl_Title);
        break;
      case globals.ErrorCodes.FailedShareUrlNotSynced:
        errorMessage.title = platform.GetConstant(globals.Constants.Error_FailedShareUrlNotSynced_Title);
        break;
      case globals.ErrorCodes.FailedRefreshBookmarks:
        errorMessage.title = platform.GetConstant(globals.Constants.Error_FailedRefreshBookmarks_Title);
        break;
      case globals.ErrorCodes.SyncUncommitted:
        errorMessage.title = platform.GetConstant(globals.Constants.Error_UncommittedSyncs_Title);
        errorMessage.message = platform.GetConstant(globals.Constants.Error_UncommittedSyncs_Message);
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
    var fileName = 'xbs_log_' + getDateTimeString(new Date()) + '.txt';
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

  var getVersionTag = function () {
    var versionTag = globals.AppVersion.replace(/([a-z]+)\d+$/i, '$1');
    return versionTag;
  };

  var isMobilePlatform = function (platformName) {
    return platformName === globals.Platforms.Android;
  };

  var isNetworkConnected = function () {
    return window.Connection && window.navigator.connection && window.navigator.connection.type ?
      (window.navigator.connection.type !== window.Connection.NONE &&
        window.navigator.connection.type !== window.Connection.UNKNOWN) :
      window.navigator.onLine;
  };

  var isNetworkConnectionError = function (err) {
    return err.code === globals.ErrorCodes.HttpRequestFailed || err.code === globals.ErrorCodes.NetworkOffline;
  };

  var isPlatform = function (currentPlatform, platformName) {
    return currentPlatform === platformName;
  };

  var logError = function (err, message) {
    var errMessage;

    // Return if no error supplied or has already been logged
    if (!err || err.logged) {
      return;
    }

    if (err instanceof Error) {
      errMessage = message ? message + ': ' : '';
    }
    else if (err.code) {
      var codeName = _.findKey(globals.ErrorCodes, function (key) { return key === err.code; });
      errMessage = message ? message + ': ' : '';
      errMessage += '[' + err.code + '] ' + codeName;
    }

    // Output message to console, add to queue and process
    logToConsole(globals.LogType.Error, errMessage, err);
    messageQueue.push([globals.LogType.Error, errMessage, err]);
    processMessageQueue();

    // Mark this error as logged to prevent duplication in logs
    err.logged = true;
  };

  var logInfo = function (message) {
    if (!message) {
      return;
    }

    // Output message to console, add to queue and process
    logToConsole(globals.LogType.Trace, message);
    messageQueue.push([globals.LogType.Trace, message]);
    processMessageQueue();
  };

  var logToConsole = function (messageType, message, err) {
    switch (messageType) {
      case globals.LogType.Error:
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
        console.warn(message);
        break;
      case globals.LogType.Trace:
      default:
        console.info(message);
    }
  };

  var logWarning = function (message) {
    if (!message) {
      return;
    }

    // Output message to console, add to queue and process
    logToConsole(globals.LogType.Warn, message);
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

  var processMessageQueue = function () {
    // Return if currently processing or no more messages to process
    if (currentMessageQueueItem || messageQueue.length === 0) {
      return;
    }

    // Get the next log message to process
    currentMessageQueueItem = messageQueue.shift();
    var messageType = currentMessageQueueItem[0];
    var message = currentMessageQueueItem[1];
    var err = currentMessageQueueItem[2];

    // Format the log message with current time stamp and log type
    var messageLogText = new Date().toISOString().replace(/[A-Z]/g, ' ').trim() + '\t';
    switch (messageType) {
      case globals.LogType.Error:
        messageLogText += '[error]\t';
        break;
      case globals.LogType.Warn:
        messageLogText += '[warn]\t';
        break;
      case globals.LogType.Trace:
      default:
        messageLogText += '[trace]\t';
    }

    // Add message text to log item and add to end of log
    return platform.LocalStorage.Get(globals.CacheKeys.TraceLog)
      .then(function (debugMessageLog) {
        debugMessageLog = debugMessageLog || [];
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

  var promiseWhile = function (data, condition, action) {
    var whilst = function (data) {
      return condition(data)
        .then(function (conditionIsTrue) {
          if (conditionIsTrue) {
            return $q.resolve(data);
          }

          return action(data).then(whilst);
        });
    };

    return whilst(data);
  };

  var stripTags = function (str) {
    return str ? str.replace(/<(?:.|\n)*?>/gm, '') : str;
  };

  var syncIdIsValid = function (syncId) {
    if (!syncId) {
      return false;
    }

    var hexStringToBytes = function (hexString) {
      var bytes = new Uint8Array(hexString.length / 2);
      for (var i = 0; i !== bytes.length; i++) {
        bytes[i] = parseInt(hexString.substr(i * 2, 2), 16);
      }
      return bytes;
    };

    var bytesToGuidString = function (bytes) {
      var _a;
      var _b;
      var _c;
      var _d;
      var _e;
      var _f;
      var _g;
      var _h;
      var _i;
      var _j;
      var _k;

      if (bytes == null) {
        return;
      }
      if (bytes.length != 16) {
        return;
      }

      _a = ((bytes[3]) << 24) | ((bytes[2]) << 16) | ((bytes[1]) << 8) | bytes[0];
      _b = (((bytes[5]) << 8) | bytes[4]);
      _c = (((bytes[7]) << 8) | bytes[6]);
      _d = bytes[8];
      _e = bytes[9];
      _f = bytes[10];
      _g = bytes[11];
      _h = bytes[12];
      _i = bytes[13];
      _j = bytes[14];
      _k = bytes[15];

      var hexToChar = function (a) {
        a = a & 0xf;
        return String.fromCharCode(((a > 9) ? a - 10 + 0x61 : a + 0x30));
      };

      var hexsToChars = function (guidChars, offset, a, b, hex) {
        hex = hex === undefined ? false : hex;

        if (hex) {
          guidChars[offset++] = '0';
          guidChars[offset++] = 'x';
        }
        guidChars[offset++] = hexToChar(a >> 4);
        guidChars[offset++] = hexToChar(a);
        if (hex) {
          guidChars[offset++] = ',';
          guidChars[offset++] = '0';
          guidChars[offset++] = 'x';
        }
        guidChars[offset++] = hexToChar(b >> 4);
        guidChars[offset++] = hexToChar(b);
        return offset;
      };

      var _toString = function (format) {
        if (format == null || format.length == 0)
          format = "D";

        var guidChars = [];
        var offset = 0;
        var dash = true;
        var hex = false;

        if (format.length != 1) {
          // all acceptable format strings are of length 1
          return null;
        }

        var formatCh = format[0];

        if (formatCh == 'D' || formatCh == 'd') {
          guidChars = new Array(36);
        } else if (formatCh == 'N' || formatCh == 'n') {
          guidChars = new Array(32);
          dash = false;
        } else if (formatCh == 'B' || formatCh == 'b') {
          guidChars = new Array(38);
          guidChars[offset++] = '{';
          guidChars[37] = '}';
        } else if (formatCh == 'P' || formatCh == 'p') {
          guidChars = new Array(38);
          guidChars[offset++] = '(';
          guidChars[37] = ')';
        } else if (formatCh == 'X' || formatCh == 'x') {
          guidChars = new Array(68);
          guidChars[offset++] = '{';
          guidChars[67] = '}';
          dash = false;
          hex = true;
        } else {
          return null;
        }

        if (hex) {
          // {0xdddddddd,0xdddd,0xdddd,{0xdd,0xdd,0xdd,0xdd,0xdd,0xdd,0xdd,0xdd}}
          guidChars[offset++] = '0';
          guidChars[offset++] = 'x';
          offset = hexsToChars(guidChars, offset, _a >> 24, _a >> 16);
          offset = hexsToChars(guidChars, offset, _a >> 8, _a);
          guidChars[offset++] = ',';
          guidChars[offset++] = '0';
          guidChars[offset++] = 'x';
          offset = hexsToChars(guidChars, offset, _b >> 8, _b);
          guidChars[offset++] = ',';
          guidChars[offset++] = '0';
          guidChars[offset++] = 'x';
          offset = hexsToChars(guidChars, offset, _c >> 8, _c);
          guidChars[offset++] = ',';
          guidChars[offset++] = '{';
          offset = hexsToChars(guidChars, offset, _d, _e, true);
          guidChars[offset++] = ',';
          offset = hexsToChars(guidChars, offset, _f, _g, true);
          guidChars[offset++] = ',';
          offset = hexsToChars(guidChars, offset, _h, _i, true);
          guidChars[offset++] = ',';
          offset = hexsToChars(guidChars, offset, _j, _k, true);
          guidChars[offset++] = '}';
        } else {
          // [{|(]dddddddd[-]dddd[-]dddd[-]dddd[-]dddddddddddd[}|)]
          offset = hexsToChars(guidChars, offset, _a >> 24, _a >> 16);
          offset = hexsToChars(guidChars, offset, _a >> 8, _a);
          if (dash) guidChars[offset++] = '-';
          offset = hexsToChars(guidChars, offset, _b >> 8, _b);
          if (dash) guidChars[offset++] = '-';
          offset = hexsToChars(guidChars, offset, _c >> 8, _c);
          if (dash) guidChars[offset++] = '-';
          offset = hexsToChars(guidChars, offset, _d, _e);
          if (dash) guidChars[offset++] = '-';
          offset = hexsToChars(guidChars, offset, _f, _g);
          offset = hexsToChars(guidChars, offset, _h, _i);
          offset = hexsToChars(guidChars, offset, _j, _k);
        }

        return guidChars.join('');
      };

      return _toString('D', null).split(',').join('');
    };

    return !!bytesToGuidString(hexStringToBytes(syncId));
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
    GetVersionTag: getVersionTag,
    IsMobilePlatform: isMobilePlatform,
    IsNetworkConnected: isNetworkConnected,
    IsNetworkConnectionError: isNetworkConnectionError,
    IsPlatform: isPlatform,
    LogError: logError,
    LogInfo: logInfo,
    LogWarning: logWarning,
    ParseUrl: parseUrl,
    PromiseWhile: promiseWhile,
    StripTags: stripTags,
    SyncIdIsValid: syncIdIsValid,
    TrimToNearestWord: trimToNearestWord
  };
};