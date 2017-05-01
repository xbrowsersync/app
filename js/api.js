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
		return getServiceInformation(url)
			.then(function(response) {
				// Reset network disconnected flag
				globals.Network.Disconnected.Set(false);

				if (!response) {
					return $q.reject();
				}
				
				return response;
			});
	};
	
	var createBookmarks = function(encryptedBookmarks) {
		// Check secret is present
		if (!globals.Password.Get()) {
			globals.SyncEnabled.Set(false);
			return $q.reject({ code: globals.ErrorCodes.MissingClientData });
		}
		
		var data = { 
			bookmarks: encryptedBookmarks
		};
		
		return $http.post(globals.URL.Host.Get() + globals.URL.Bookmarks,
			JSON.stringify(data))
            .then(function(response) {
				// Reset network disconnected flag
				globals.Network.Disconnected.Set(false);

				if (!!response && !!response.data) {
					return response.data;
				}
				else {
					return $q.reject({ code: globals.ErrorCodes.NoDataFound });
				}
			})
            .catch(function(err) {
                // Log error
                utility.LogMessage(
                    moduleName, 'createBookmarks', utility.LogType.Error,
                    JSON.stringify(err));
                
                return $q.reject(getErrorCodeFromHttpError(err));
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

				if (!!response && !!response.data) {
					return response.data;
				}
				else {
					return $q.reject({ code: globals.ErrorCodes.NoDataFound });
				}
			})
            .catch(function(err) {
                // Return if request was cancelled
				if (!!err.config.timeout.$$state &&
					!!err.config.timeout.$$state.status &&
					err.config.timeout.$$state.status === 1) {
					return $q.reject({ code: globals.ErrorCodes.HttpRequestCancelled });
				}
				
				// Log error
                utility.LogMessage(
                    moduleName, 'getBookmarks', utility.LogType.Error,
                    JSON.stringify(err));
                
                return $q.reject(getErrorCodeFromHttpError(err));
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

				if (!response || !response.data) {
					return response;
				}
				
				return response.data;
			})
            .catch(function(err) {
                // Log error
                utility.LogMessage(
                    moduleName, 'getBookmarksLastUpdated', utility.LogType.Error,
                    JSON.stringify(err));
                
                return $q.reject(getErrorCodeFromHttpError(err));
            });
	};
	
	var updateBookmarks = function(encryptedBookmarks) {
		// Check secret and sync ID are present
		if (!globals.Password.Get() || !globals.Id.Get()) {
			globals.SyncEnabled.Set(false);
			return $q.reject({ code: globals.ErrorCodes.MissingClientData });
		}
		
		var data = { 
			bookmarks: encryptedBookmarks
		};
		
		return $http.put(globals.URL.Host.Get() + globals.URL.Bookmarks + '/' + globals.Id.Get(),
			JSON.stringify(data))
            .then(function(response) {
				// Reset network disconnected flag
				globals.Network.Disconnected.Set(false);

				if (!!response && !!response.data) {
					return response.data;
				}
				else {
					return $q.reject({ code: globals.ErrorCodes.NoDataFound });
				}
			})
            .catch(function(err) {
                // Log error
                utility.LogMessage(
                    moduleName, 'updateBookmarks', utility.LogType.Error,
                    JSON.stringify(err));
                
                return $q.reject(getErrorCodeFromHttpError(err));
            });
	};
    
    
/* ------------------------------------------------------------------------------------
 * Private functions
 * ------------------------------------------------------------------------------------ */
    
    var getErrorCodeFromHttpError = function(httpErr) {
        var err = { };
       
        if (!httpErr || !httpErr.status) {
            err.code = globals.ErrorCodes.HttpRequestFailed;
            return err;
        }

		// Reset network disconnected flag
		globals.Network.Disconnected.Set(false);
       
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
	
	var getServiceInformation = function(url) {
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
				if (!!response && !!response.data) {
					return response.data;
				}
				else {
					return $q.reject({ code: globals.ErrorCodes.NoStatus });
				}
			})
            .catch(function(err) {
                // Log error
                utility.LogMessage(
                    moduleName, 'getServiceInformation', utility.LogType.Error,
                    JSON.stringify(err));
                
                return $q.reject(getErrorCodeFromHttpError(err));
            });
	};
   
	return {
		CheckServiceStatus: checkServiceStatus,
		GetBookmarks: getBookmarks,
		CreateBookmarks: createBookmarks,
		UpdateBookmarks: updateBookmarks,
		GetBookmarksLastUpdated: getBookmarksLastUpdated
	};
};