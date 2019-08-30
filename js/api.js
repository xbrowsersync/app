var xBrowserSync = xBrowserSync || {};
xBrowserSync.App = xBrowserSync.App || {};

/* ------------------------------------------------------------------------------------
 * Class name:	xBrowserSync.App.API
 * Description:	Responsible for communicating with the xBrowserSync API service.
 * ------------------------------------------------------------------------------------ */

xBrowserSync.App.API = function ($http, $q, platform, globals, utility) {
  'use strict';

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
            });
          })
          .then(apiRequestSucceeded)
          .then(function (response) {
            data = response.data;

            // Check service is a valid xBrowserSync API
            if (!data || data.status == null || data.version == null) {
              return $q.reject({ code: globals.ErrorCodes.InvalidService });
            }

            // Check service version is supported by this client
            if (compareVersions(data.version, globals.MinApiVersion) < 0) {
              return $q.reject({ code: globals.ErrorCodes.UnsupportedServiceApiVersion });
            }

            return data;
          })
          .catch(function (err) {
            if (err.status != null) {
              var httpErr = new Error(err.status + ' ' + err.statusText);
              return getErrorCodeFromHttpError(err, httpErr.stack)
                .then(function (errObj) {
                  var codeName = _.findKey(globals.ErrorCodes, function (key) { return key === errObj.code; });
                  utility.LogInfo('Service error: ' + codeName);
                  return $q.reject(errObj);
                });
            }
            else {
              var codeName = _.findKey(globals.ErrorCodes, function (key) { return key === err.code; });
              utility.LogInfo('Service error: ' + codeName);
              throw err;
            }
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

            return $http.post(serviceUrl + globals.URL.Bookmarks,
              JSON.stringify(data));
          })
          .then(apiRequestSucceeded)
          .then(function (response) {
            data = response.data;

            // Check response data is valid before returning
            if (!data || !data.id || !data.lastUpdated || !data.version) {
              return $q.reject({ code: globals.ErrorCodes.NoDataFound });
            }

            return data;
          })
          .catch(apiRequestFailed);
      });
  };

  var getBookmarks = function (canceller) {
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
                return $http.get(serviceUrl + globals.URL.Bookmarks + '/' + syncId,
                  { timeout: canceller });
              })
              .then(apiRequestSucceeded)
              .then(function (response) {
                data = response.data;

                // Check response data is valid before returning
                if (!data || !data.lastUpdated) {
                  return $q.reject({ code: globals.ErrorCodes.NoDataFound });
                }

                return data;
              })
              .catch(function (err) {
                // Return if request was cancelled
                if (err.config &&
                  err.config.timeout &&
                  err.config.timeout.$$state &&
                  err.config.timeout.$$state.status &&
                  err.config.timeout.$$state.status === 1) {
                  return $q.reject({ code: globals.ErrorCodes.HttpRequestCancelled });
                }

                return apiRequestFailed(err);
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
                  '/' + syncId + globals.URL.LastUpdated);
              })
              .then(apiRequestSucceeded)
              .then(function (response) {
                data = response.data;

                // Check response data is valid before returning
                if (!data || !data.lastUpdated) {
                  return $q.reject({ code: globals.ErrorCodes.NoDataFound });
                }

                return data;
              })
              .catch(apiRequestFailed);
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
              '/' + syncId + globals.URL.Version);
          })
          .then(apiRequestSucceeded)
          .then(function (response) {
            data = response.data;

            // Check response data is valid before returning
            if (!data) {
              return $q.reject({ code: globals.ErrorCodes.NoDataFound });
            }

            return data;
          })
          .catch(apiRequestFailed);
      });
  };

  var updateBookmarks = function (encryptedBookmarks, updateSyncVersion) {
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

                return $http.put(serviceUrl + globals.URL.Bookmarks + '/' + syncId,
                  JSON.stringify(data));
              })
              .then(apiRequestSucceeded)
              .then(function (response) {
                data = response.data;

                // Check response data is valid before returning
                if (!data || !data.lastUpdated) {
                  return $q.reject({ code: globals.ErrorCodes.NoDataFound });
                }

                return data;
              })
              .catch(apiRequestFailed);
          });
      });
  };


	/* ------------------------------------------------------------------------------------
	 * Private functions
	 * ------------------------------------------------------------------------------------ */

  var apiRequestFailed = function (err) {
    // Get error code from http response status
    if (err.status != null) {
      var httpErr = new Error(err.status + ' ' + err.statusText);
      return getErrorCodeFromHttpError(err, httpErr.stack)
        .then(function (errObj) {
          // If 404 response, service is likely offline
          if (errObj.code === globals.ErrorCodes.InvalidService) {
            errObj.code = globals.ErrorCodes.ServiceOffline;
          }

          return $q.reject(errObj);
        });
    }

    throw err;
  };

  var apiRequestSucceeded = function (response) {
    return $q.resolve(response);
  };

  var checkNetworkIsOnline = function () {
    return $q(function (resolve, reject) {
      if (utility.IsNetworkConnected()) {
        return resolve();
      }

      return reject({ code: globals.ErrorCodes.NetworkOffline });
    });
  };

  var getErrorCodeFromHttpError = function (httpErr, errStack) {
    var getErrorCodePromise;

    if (!httpErr) {
      getErrorCodePromise = $q.resolve(-1);
    }

    switch (httpErr.status) {
      // 404 Not Found: service offline or not an xBrowserSync service
      case 404:
        getErrorCodePromise = $q.resolve(globals.ErrorCodes.InvalidService);
        break;
      // 405 Method Not Allowed: service not accepting new syncs
      case 405:
        getErrorCodePromise = $q.resolve(globals.ErrorCodes.NotAcceptingNewSyncs);
        break;
      // 406 Not Acceptable: daily new sync limit reached
      case 406:
        getErrorCodePromise = $q.resolve(globals.ErrorCodes.DailyNewSyncLimitReached);
        break;
      // 409 Conflict: sync conflict / invalid id
      case 409:
        getErrorCodePromise = httpErr.data.code === 'SyncConflictException' ? $q.resolve(globals.ErrorCodes.DataOutOfSync) : $q.resolve(globals.ErrorCodes.NoDataFound);
        break;
      // 413 Request Entity Too Large: sync data size exceeds service limit
      case 413:
        getErrorCodePromise = $q.resolve(globals.ErrorCodes.RequestEntityTooLarge);
        break;
      // 429 Too Many Requests: daily new sync limit reached
      case 429:
        getErrorCodePromise = $q.resolve(globals.ErrorCodes.TooManyRequests);
        break;
      // 503 Service Unavailable: service offline
      case 503:
        getErrorCodePromise = $q.resolve(globals.ErrorCodes.ServiceOffline);
        break;
      // -1: No network connection
      case -1:
        getErrorCodePromise = $q.resolve(globals.ErrorCodes.HttpRequestFailed);
        break;
      // Otherwise generic request failed
      default:
        getErrorCodePromise = $q.resolve(globals.ErrorCodes.HttpRequestFailed);
    }

    return getErrorCodePromise
      .then(function (errorCode) {
        return {
          code: errorCode,
          stack: errStack
        };
      });
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