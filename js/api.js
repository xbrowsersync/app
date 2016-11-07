var xBrowserSync = xBrowserSync || {};
xBrowserSync.App = xBrowserSync.App || {};

/* ------------------------------------------------------------------------------------
 * Class name:	xBrowserSync.App.API
 * Description:	Responsible for communicating with the xBrowserSync API service.
 * ------------------------------------------------------------------------------------ */

xBrowserSync.App.API = function($http, $q, global, utility) {
    'use strict';

	var moduleName = 'xBrowserSync.App.API';
    
/* ------------------------------------------------------------------------------------
 * Public functions
 * ------------------------------------------------------------------------------------ */
	
	var checkServiceStatus = function(url) {
		return getServiceInformation(url)
			.then(function(response) {
				if (!response) {
					return $q.reject();
				}
				
				return response;
			});
	};
	
	var createBookmarks = function(encryptedBookmarks) {
		// Check secret is present
		if (!global.ClientSecret.Get()) {
			global.SyncEnabled.Set(false);
			return $q.reject({ code: global.ErrorCodes.MissingClientData });
		}
		
		var data = { 
			bookmarks: encryptedBookmarks
		};
		
		return $http.post(global.URL.Host.Get() + global.URL.Bookmarks,
			JSON.stringify(data))
            .then(function(response) {
				if (!!response && !!response.data) {
					return response.data;
				}
				else {
					return $q.reject({ code: global.ErrorCodes.NoDataFound });
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
	
	var getBookmarks = function() {
		// Check secret and sync ID are present
		if (!global.ClientSecret.Get() || !global.Id.Get()) {
			global.SyncEnabled.Set(false);
			return $q.reject({ code: global.ErrorCodes.MissingClientData });
		}
		
		return $http.get(global.URL.Host.Get() + global.URL.Bookmarks + '/' + 
			             global.Id.Get())
            .then(function(response) {
				if (!!response && !!response.data) {
					return response.data;
				}
				else {
					return $q.reject({ code: global.ErrorCodes.NoDataFound });
				}
			})
            .catch(function(err) {
                // Log error
                utility.LogMessage(
                    moduleName, 'getBookmarks', utility.LogType.Error,
                    JSON.stringify(err));
                
                return $q.reject(getErrorCodeFromHttpError(err));
            });
	};

	var getBookmarksLastUpdated = function() {
		// Check secret and sync ID are present
		if (!global.ClientSecret.Get() || !global.Id.Get()) {
			global.SyncEnabled.Set(false);
			return $q.reject({ code: global.ErrorCodes.MissingClientData });
		}
		
		return $http.get(global.URL.Host.Get() + global.URL.Bookmarks + 
			'/' + global.Id.Get() + global.URL.LastUpdated)
            .then(function(response) {
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
		if (!global.ClientSecret.Get() || !global.Id.Get()) {
			global.SyncEnabled.Set(false);
			return $q.reject({ code: global.ErrorCodes.MissingClientData });
		}
		
		var data = { 
			bookmarks: encryptedBookmarks
		};
		
		return $http.put(global.URL.Host.Get() + global.URL.Bookmarks + '/' + global.Id.Get(),
			JSON.stringify(data))
            .then(function(response) {
				if (!!response && !!response.data) {
					return response.data;
				}
				else {
					return $q.reject({ code: global.ErrorCodes.NoDataFound });
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
            err.code = global.ErrorCodes.HttpRequestFailed;
            return err;
        }
       
        switch (httpErr.status) {
            // 405 Method Not Allowed: server not accepting new syncs
			case 405:
				err.code = global.ErrorCodes.NotAcceptingNewSyncs;
				break;
			// 406 Not Acceptable: daily new sync limit reached
			case 406:
				err.code = global.ErrorCodes.DailyNewSyncLimitReached;
				break;
			// 409 Conflict: invalid id
			case 409:
				err.code = global.ErrorCodes.NoDataFound;
				break;
			// 413 Request Entity Too Large: sync data size exceeds server limit
			case 413:
				err.code = global.ErrorCodes.RequestEntityTooLarge;
				break;
			// 429 Too Many Requests: daily new sync limit reached
			case 429:
				err.code = global.ErrorCodes.TooManyRequests;
				global.SyncEnabled.Set(false); // Disable sync				
				break;
			// Otherwise generic request failed
			default:
                err.code = global.ErrorCodes.HttpRequestFailed;
        }
       
        return err;
    };
	
	var getServiceInformation = function(url) {
		if (!url) {
			url = global.URL.Host.Get() + global.URL.ServiceInformation;
		}
		else {
			url = url + global.URL.ServiceInformation;
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
					return $q.reject({ code: global.ErrorCodes.NoStatus });
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