var xBrowserSync = xBrowserSync || {};
xBrowserSync.App = xBrowserSync.App || {};

/* ------------------------------------------------------------------------------------
 * Class name:	xBrowserSync.App.API
 * Description:	Responsible for communicating with the xBrowserSync API service.
 * ------------------------------------------------------------------------------------ */

xBrowserSync.App.API = function ($http, $q, platform, globals, utility) {
  'use strict';

  var skipOnlineCheck = false;

	/* ------------------------------------------------------------------------------------
	 * Public functions
	 * ------------------------------------------------------------------------------------ */

  var checkServiceStatus = function (url) {
    var data;

    return checkNetworkIsOnline()
      .then(function () {
        // Get current service url if not provided
        return (!url ? utility.GetServiceUrl() : $q.resolve(url))
          .then(function (serviceUrl) {
            // Request service info
            return $http({
              method: 'GET',
              url: serviceUrl + globals.URL.ServiceInformation,
              timeout: 3000,
            })
              .catch(function (response) {
                apiRequestFailed(new Error(getHttpErrorMessageFromHttpStatus(response.status)));
              });
          })
          .then(apiRequestSucceeded)
          .then(function (response) {
            data = response.data;

            // Check service is a valid xBrowserSync API
            if (!data || data.status == null || data.version == null) {
              apiRequestFailed(new Error(getHttpErrorMessageFromErrorCode(globals.ErrorCodes.InvalidService)));
            }

            // Check service version is supported by this client
            if (compareVersions(data.version, globals.MinApiVersion) < 0) {
              apiRequestFailed(new Error(getHttpErrorMessageFromErrorCode(globals.ErrorCodes.UnsupportedServiceApiVersion)));
            }

            return data;
          });
      });
  };

  var createNewSync = function () {
    var data;

    return checkNetworkIsOnline()
      .then(function () {
        return utility.GetServiceUrl()
          .then(function (serviceUrl) {
            var data = {
              version: globals.AppVersion
            };

            return $http.post(serviceUrl + globals.URL.Bookmarks, JSON.stringify(data))
              .catch(function (response) {
                apiRequestFailed(new Error(getHttpErrorMessageFromHttpStatus(response.status)), true);
              });
          })
          .then(apiRequestSucceeded)
          .then(function (response) {
            data = response.data;

            // Check response data is valid before returning
            if (!data || !data.id || !data.lastUpdated || !data.version) {
              apiRequestFailed(new Error(getHttpErrorMessageFromErrorCode(globals.ErrorCodes.NoDataFound)));
            }

            return data;
          });
      });
  };

  var getBookmarks = function () {
    var data, password, syncId;

    // Check secret and sync ID are present
    return platform.LocalStorage.Get([
      globals.CacheKeys.Password,
      globals.CacheKeys.SyncId,
    ])
      .then(function (cachedData) {
        password = cachedData[globals.CacheKeys.Password];
        syncId = cachedData[globals.CacheKeys.SyncId];

        if (!password || !syncId) {
          return $q.reject({ code: globals.ErrorCodes.MissingClientData });
        }

        return checkNetworkIsOnline()
          .then(function () {
            // Get current service url
            return utility.GetServiceUrl()
              .then(function (serviceUrl) {
                return $http.get(serviceUrl + globals.URL.Bookmarks + '/' + syncId)
                  .catch(function (response) {
                    apiRequestFailed(new Error(getHttpErrorMessageFromHttpStatus(response.status)), true);
                  });
              })
              .then(apiRequestSucceeded)
              .then(function (response) {
                data = response.data;

                // Check response data is valid before returning
                if (!data || !data.lastUpdated) {
                  apiRequestFailed(new Error(getHttpErrorMessageFromErrorCode(globals.ErrorCodes.NoDataFound)));
                }

                return data;
              });
          });
      });
  };

  var getBookmarksLastUpdated = function () {
    var data, password, syncId;

    // Check secret and sync ID are present
    return platform.LocalStorage.Get([
      globals.CacheKeys.Password,
      globals.CacheKeys.SyncId,
    ])
      .then(function (cachedData) {
        password = cachedData[globals.CacheKeys.Password];
        syncId = cachedData[globals.CacheKeys.SyncId];

        if (!password || !syncId) {
          return $q.reject({ code: globals.ErrorCodes.MissingClientData });
        }

        return checkNetworkIsOnline()
          .then(function () {
            // Get current service url
            return utility.GetServiceUrl()
              .then(function (serviceUrl) {
                return $http.get(serviceUrl + globals.URL.Bookmarks +
                  '/' + syncId + globals.URL.LastUpdated)
                  .catch(function (response) {
                    apiRequestFailed(new Error(getHttpErrorMessageFromHttpStatus(response.status)), true);
                  });
              })
              .then(apiRequestSucceeded)
              .then(function (response) {
                data = response.data;

                // Check response data is valid before returning
                if (!data || !data.lastUpdated) {
                  apiRequestFailed(new Error(getHttpErrorMessageFromErrorCode(globals.ErrorCodes.NoDataFound)));
                }

                return data;
              });
          });
      });
  };

  var getBookmarksVersion = function (syncId) {
    var data;

    return checkNetworkIsOnline()
      .then(function () {
        // Get current service url
        return utility.GetServiceUrl()
          .then(function (serviceUrl) {
            return $http.get(serviceUrl + globals.URL.Bookmarks +
              '/' + syncId + globals.URL.Version)
              .catch(function (response) {
                apiRequestFailed(new Error(getHttpErrorMessageFromHttpStatus(response.status)), true);
              });
          })
          .then(apiRequestSucceeded)
          .then(function (response) {
            data = response.data;

            // Check response data is valid before returning
            if (!data) {
              apiRequestFailed(new Error(getHttpErrorMessageFromErrorCode(globals.ErrorCodes.NoDataFound)));
            }

            return data;
          });
      });
  };

  var updateBookmarks = function (encryptedBookmarks, updateSyncVersion, backgroundUpdate) {
    var data, password, cachedLastUpdated, syncId;

    // Check secret and sync ID are present
    return platform.LocalStorage.Get([
      globals.CacheKeys.LastUpdated,
      globals.CacheKeys.Password,
      globals.CacheKeys.SyncId,
    ])
      .then(function (cachedData) {
        cachedLastUpdated = cachedData[globals.CacheKeys.LastUpdated];
        password = cachedData[globals.CacheKeys.Password];
        syncId = cachedData[globals.CacheKeys.SyncId];

        if (!cachedLastUpdated || !password || !syncId) {
          return $q.reject({ code: globals.ErrorCodes.MissingClientData });
        }

        // If this is a background update, ensure online check is skipped until successfull request
        skipOnlineCheck = !!backgroundUpdate;
        return checkNetworkIsOnline()
          .then(function () {
            // Get current service url
            return utility.GetServiceUrl()
              .then(function (serviceUrl) {
                var data = {
                  bookmarks: encryptedBookmarks,
                  lastUpdated: cachedLastUpdated
                };

                // If updating sync version, set as current app version
                if (updateSyncVersion) {
                  data.version = globals.AppVersion;
                }

                return $http.put(serviceUrl + globals.URL.Bookmarks + '/' + syncId, JSON.stringify(data))
                  .catch(function (response) {
                    apiRequestFailed(new Error(getHttpErrorMessageFromHttpStatus(response.status)), true);
                  });
              })
              .then(apiRequestSucceeded)
              .then(function (response) {
                data = response.data;

                // Check response data is valid before returning
                if (!data || !data.lastUpdated) {
                  apiRequestFailed(new Error(getHttpErrorMessageFromErrorCode(globals.ErrorCodes.NoDataFound)));
                }

                return data;
              });
          });
      });
  };


	/* ------------------------------------------------------------------------------------
	 * Private functions
	 * ------------------------------------------------------------------------------------ */

  var apiRequestFailed = function (err, invalidServiceIsServiceOffline) {
    utility.LogError(err);

    // Get error code from code name in error message
    var codeName = err.message.match(/\w+$/)[0];
    err.code = globals.ErrorCodes[codeName];

    // If 404 response, service is likely offline
    if (invalidServiceIsServiceOffline && err.code === globals.ErrorCodes.InvalidService) {
      err.code = globals.ErrorCodes.ServiceOffline;
    }

    throw err;
  };

  var apiRequestSucceeded = function (response) {
    skipOnlineCheck = false;
    return $q.resolve(response);
  };

  var checkNetworkIsOnline = function () {
    return $q(function (resolve, reject) {
      if (skipOnlineCheck || utility.IsNetworkConnected()) {
        return resolve();
      }

      utility.LogWarning('API request failed: Network offline');
      return reject({ code: globals.ErrorCodes.NetworkOffline });
    });
  };

  var getErrorCodeFromHttpStatus = function (httpStatus) {
    var errorCode;
    switch (httpStatus) {
      // 401 Unauthorized: sync data not found
      case 401:
        errorCode = globals.ErrorCodes.NoDataFound;
        break;
      // 404 Not Found: service offline or not an xBrowserSync service
      case 404:
        errorCode = globals.ErrorCodes.InvalidService;
        break;
      // 405 Method Not Allowed: service not accepting new syncs
      case 405:
        errorCode = globals.ErrorCodes.NotAcceptingNewSyncs;
        break;
      // 406 Not Acceptable: daily new sync limit reached
      case 406:
        errorCode = globals.ErrorCodes.DailyNewSyncLimitReached;
        break;
      // 409 Conflict: sync update conflict
      case 409:
        errorCode = globals.ErrorCodes.DataOutOfSync;
        break;
      // 413 Request Entity Too Large: sync data size exceeds service limit
      case 413:
        errorCode = globals.ErrorCodes.RequestEntityTooLarge;
        break;
      // 429 Too Many Requests: daily new sync limit reached
      case 429:
        errorCode = globals.ErrorCodes.TooManyRequests;
        break;
      // 503 Service Unavailable: service offline
      case 503:
        errorCode = globals.ErrorCodes.ServiceOffline;
        break;
      // -1: No network connection
      case -1:
        errorCode = globals.ErrorCodes.HttpRequestFailed;
        break;
      // Otherwise generic request failed
      default:
        errorCode = globals.ErrorCodes.HttpRequestFailed;
    }

    return errorCode;
  };

  var getHttpErrorMessageFromErrorCode = function (errorCode) {
    var codeName = _.findKey(globals.ErrorCodes, function (key) { return key === errorCode; });
    var message = '[' + errorCode + '] ' + codeName;
    return message;
  };

  var getHttpErrorMessageFromHttpStatus = function (httpStatus) {
    var errorCode = getErrorCodeFromHttpStatus(httpStatus);
    return getHttpErrorMessageFromErrorCode(errorCode);
  };

  return {
    CheckServiceStatus: checkServiceStatus,
    CreateNewSync: createNewSync,
    GetBookmarks: getBookmarks,
    GetBookmarksLastUpdated: getBookmarksLastUpdated,
    GetBookmarksVersion: getBookmarksVersion,
    UpdateBookmarks: updateBookmarks
  };
};