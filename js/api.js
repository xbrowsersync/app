var xBrowserSync = xBrowserSync || {};
xBrowserSync.App = xBrowserSync.App || {};

/* ------------------------------------------------------------------------------------
 * Class name:	xBrowserSync.App.API
 * Description:	Responsible for communicating with the xBrowserSync API service.
 * ------------------------------------------------------------------------------------ */

xBrowserSync.App.API = function($http, $q, global, utility) {
    'use strict';
    
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
                if (!!err) {
					switch (err.status) {
						// 405 Method Not Allowed: server not accepting new syncs
						case 405:
							return $q.reject({ code: global.ErrorCodes.NotAcceptingNewSyncs });
						// 429 Too Many Requests: daily new sync limit reached
						case 429:
							return $q.reject({ code: global.ErrorCodes.DailyNewSyncLimitReached });
					}
				}
				
				return $q.reject(getErrorCodeFromHttpError(err));
            });
	};
	
	var getBookmarks = function() {
		// Check secret and sync ID are present
		if (!global.ClientSecret.Get() || !global.Id.Get()) {
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
                return $q.reject(getErrorCodeFromHttpError(err));
            });
	};

	var getBookmarksLastUpdated = function() {
		// Check secret and sync ID are present
		if (!global.ClientSecret.Get() || !global.Id.Get()) {
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
                return $q.reject(getErrorCodeFromHttpError(err));
            });
	};
	
	var updateBookmarks = function(encryptedBookmarks) {
		// Check secret and sync ID are present
		if (!global.ClientSecret.Get() || !global.Id.Get()) {
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
            case 413:
				err.code = global.ErrorCodes.RequestEntityTooLarge;
				err.details = (!!httpErr.data.message) ? 
					httpErr.data.message.match(/\d+$/)[0] + 'kB.' : '.';
				break;
			case 429:
				err.code = global.ErrorCodes.TooManyRequests;
				
				// Disable sync
				global.SyncEnabled.Set(false);				
				break;
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