var xBrowserSync = xBrowserSync || {};
xBrowserSync.App = xBrowserSync.App || {};

/* ------------------------------------------------------------------------------------
 * Class name:	xBrowserSync.App.API
 * Description:	Responsible for communicating with the xBrowserSync API service.
 * ------------------------------------------------------------------------------------ */

xBrowserSync.App.API = function($http, $q, globals, utility) {
    'use strict';

	var moduleName = 'xBrowserSync.App.API';
    
/* ------------------------------------------------------------------------------------
 * Public functions
 * ------------------------------------------------------------------------------------ */
	
	var checkServiceStatus = function(url) {
		if (!url) {
			url = globals.URL.Host.Get() + globals.URL.ServiceInformation;
		}
		else {
			url = url + globals.URL.ServiceInformation;
		}
		
		return $http({
			method: 'GET',
			url: url,
			timeout: 3000,
		})
        	.then(function(response) {
				// Reset network disconnected flag
				globals.Network.Disconnected.Set(false);
				
				var data = response.data;
				
				// Check service is a valid xBrowserSync API
				if (!data || data.status === null || data.version === null) {
					return $q.reject({ code: globals.ErrorCodes.ApiInvalid });
				}

				// Check service is online
                if (data.status === globals.ServiceStatus.Offline) {
                    return $q.reject({ code: globals.ErrorCodes.ApiOffline });
                }

                // Check service version is supported by this client
                if (compareVersions(data.version, globals.ApiVersion) < 0) {
                    return $q.reject({ code: globals.ErrorCodes.ApiVersionNotSupported });
                }

				return data;
			})
            .catch(function(err) {
                utility.LogError(moduleName, 'checkServiceStatus', err);
				return $q.reject(err.status === undefined ?
					err : getErrorCodeFromHttpError(err));
            });
	};
	
	var createNewSync = function() {
		var data = { 
			version: globals.AppVersion
		};
		
		return $http.post(globals.URL.Host.Get() + globals.URL.Bookmarks,
			JSON.stringify(data))
            .then(function(response) {
				// Reset network disconnected flag
				globals.Network.Disconnected.Set(false);

				// Check response data is valid before returning
				var data = response.data;
				if (!data || !data.id || !data.lastUpdated || !data.version) {
					return $q.reject({ code: globals.ErrorCodes.NoDataFound });
				}

				return data;
			})
            .catch(function(err) {
                utility.LogError(moduleName, 'createBookmarks', err);
                return $q.reject(err.status === undefined ?
					err : getErrorCodeFromHttpError(err));
            });
	};
	
	var getBookmarks = function(canceller) {
		// Check secret and sync ID are present
		if (!globals.Password.Get() || !globals.Id.Get()) {
			globals.SyncEnabled.Set(false);
			return $q.reject({ code: globals.ErrorCodes.MissingClientData });
		}
		
		return $http.get(globals.URL.Host.Get() + globals.URL.Bookmarks + '/' + globals.Id.Get(), 
						 { timeout: canceller })
            .then(function(response) {
				// Reset network disconnected flag
				globals.Network.Disconnected.Set(false);

				// Check response data is valid before returning
				var data = response.data;
				if (!data || !data.lastUpdated) {
					return $q.reject({ code: globals.ErrorCodes.NoDataFound });
				}
				
				return data;
			})
            .catch(function(err) {
                // Return if request was cancelled
				if (err.config &&
					err.config.timeout &&
					err.config.timeout.$$state &&
					err.config.timeout.$$state.status &&
					err.config.timeout.$$state.status === 1) {
					return $q.reject({ code: globals.ErrorCodes.HttpRequestCancelled });
				}
				
				utility.LogError(moduleName, 'getBookmarks', err);
                return $q.reject(err.status === undefined ?
					err : getErrorCodeFromHttpError(err));
            });
	};

	var getBookmarksLastUpdated = function() {
		// Check secret and sync ID are present
		if (!globals.Password.Get() || !globals.Id.Get()) {
			globals.SyncEnabled.Set(false);
			return $q.reject({ code: globals.ErrorCodes.MissingClientData });
		}
		
		return $http.get(globals.URL.Host.Get() + globals.URL.Bookmarks + 
			'/' + globals.Id.Get() + globals.URL.LastUpdated)
            .then(function(response) {
				// Reset network disconnected flag
				globals.Network.Disconnected.Set(false);

				// Check response data is valid before returning
				var data = response.data;
				if (!data || !data.lastUpdated) {
					return $q.reject({ code: globals.ErrorCodes.NoDataFound });
				}
				
				return data;
			})
            .catch(function(err) {
                utility.LogError(moduleName, 'getBookmarksLastUpdated', err);
                return $q.reject(err.status === undefined ?
					err : getErrorCodeFromHttpError(err));
            });
	};

	var getBookmarksVersion = function() {
		// Check sync ID is present
		if (!globals.Id.Get()) {
			globals.SyncEnabled.Set(false);
			return $q.reject({ code: globals.ErrorCodes.MissingClientData });
		}
		
		return $http.get(globals.URL.Host.Get() + globals.URL.Bookmarks + 
			'/' + globals.Id.Get() + globals.URL.Version)
            .then(function(response) {
				// Reset network disconnected flag
				globals.Network.Disconnected.Set(false);

				// Check response data is valid before returning
				var data = response.data;
				if (!data) {
					return $q.reject({ code: globals.ErrorCodes.NoDataFound });
				}
				
				return data;
			})
            .catch(function(err) {
                utility.LogError(moduleName, 'getBookmarksVersion', err);
                return $q.reject(err.status === undefined ?
					err : getErrorCodeFromHttpError(err));
            });
	};
	
	var updateBookmarks = function(encryptedBookmarks, updateSyncVersion) {
		// Check secret and sync ID are present
		if (!globals.Password.Get() || !globals.Id.Get()) {
			globals.SyncEnabled.Set(false);
			return $q.reject({ code: globals.ErrorCodes.MissingClientData });
		}
		
		var data = { 
			bookmarks: encryptedBookmarks
		};

		// If updating sync version, set as current app version
		if (updateSyncVersion) {
			data.version = globals.AppVersion;
		}
		
		return $http.put(globals.URL.Host.Get() + globals.URL.Bookmarks + '/' + globals.Id.Get(),
			JSON.stringify(data))
            .then(function(response) {
				// Reset network disconnected flag
				globals.Network.Disconnected.Set(false);

				// Check response data is valid before returning
				var data = response.data;
				if (!data || !data.lastUpdated) {
					return $q.reject({ code: globals.ErrorCodes.NoDataFound });
				}
				
				return data;
			})
            .catch(function(err) {
                utility.LogError(moduleName, 'updateBookmarks', err);
                return $q.reject(err.status === undefined ?
					err : getErrorCodeFromHttpError(err));
            });
	};
    
    
/* ------------------------------------------------------------------------------------
 * Private functions
 * ------------------------------------------------------------------------------------ */
    
    var getErrorCodeFromHttpError = function(httpErr) {
        // Reset network disconnected flag
		globals.Network.Disconnected.Set(false);
       
        var err = {};
        switch (httpErr.status) {
            // 405 Method Not Allowed: server not accepting new syncs
			case 405:
				err.code = globals.ErrorCodes.NotAcceptingNewSyncs;
				break;
			// 406 Not Acceptable: daily new sync limit reached
			case 406:
				err.code = globals.ErrorCodes.DailyNewSyncLimitReached;
				break;
			// 409 Conflict: invalid id
			case 409:
				err.code = globals.ErrorCodes.NoDataFound;
				break;
			// 413 Request Entity Too Large: sync data size exceeds server limit
			case 413:
				err.code = globals.ErrorCodes.RequestEntityTooLarge;
				break;
			// 429 Too Many Requests: daily new sync limit reached
			case 429:
				err.code = globals.ErrorCodes.TooManyRequests;
				globals.SyncEnabled.Set(false); // Disable sync				
				break;
			// -1: No network connection
			case -1:
				globals.Network.Disconnected.Set(true);
				/* falls through */
			// Otherwise generic request failed
			default:
                err.code = globals.ErrorCodes.HttpRequestFailed;
        }
       
        return err;
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