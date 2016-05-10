var xBrowserSync = xBrowserSync || {};
xBrowserSync.App = xBrowserSync.App || {};

/* ------------------------------------------------------------------------------------
 * Class name:	xBrowserSync.App.API
 * Description:	Contains functions that call the API service.
 * ------------------------------------------------------------------------------------ */

xBrowserSync.App.API = function($http, $q, global) {
    'use strict';
    
/* ------------------------------------------------------------------------------------
 * Public functions
 * ------------------------------------------------------------------------------------ */
   
	var getStatus = function(url) {
		if (!url) {
			url = global.URL.Host.Get() + global.URL.Status;
		}
		else {
			url = url + global.URL.Status;
		}
		
		return $http.get(url)
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
	
	var getBookmarks = function() {
		// Check secret and sync ID are present
		if (!global.ClientSecret.Get() || !global.Id.Get()) {
			return $q.reject({ code: global.ErrorCodes.MissingClientData });
		}
		
		var secretHash = Crypto.SHA1(global.ClientSecret.Get()).toString();
		
		return $http.get(global.URL.Host.Get() + global.URL.Bookmarks + '/' + 
			             global.Id.Get() + '/' + secretHash)
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
	
	var createBookmarks = function(encryptedBookmarks) {
		// Check secret is present
		if (!global.ClientSecret.Get()) {
			return $q.reject({ code: global.ErrorCodes.MissingClientData });
		}
		
		var secretHash = Crypto.SHA1(global.ClientSecret.Get()).toString();
		
		var data = { 
			bookmarks: encryptedBookmarks,
			secretHash: secretHash
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
                // Check for 405 Method Not Allowed: server not accepting new syncs
				if (!!err && err.status === 405) {
					return $q.reject({ code: global.ErrorCodes.NotAcceptingNewSyncs });
				}
				
				return $q.reject(getErrorCodeFromHttpError(err));
            });
	};
	
	var updateBookmarks = function(encryptedBookmarks) {
		// Check secret and sync ID are present
		if (!global.ClientSecret.Get() || !global.Id.Get()) {
			return $q.reject({ code: global.ErrorCodes.MissingClientData });
		}
		
		var secretHash = Crypto.SHA1(global.ClientSecret.Get()).toString();
		
		var data = { 
			bookmarks: encryptedBookmarks,
			secretHash: secretHash
		};
		
		return $http.post(global.URL.Host.Get() + global.URL.Bookmarks + '/' + global.Id.Get(),
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

	var getBookmarksLastUpdated = function() {
		// Check secret and sync ID are present
		if (!global.ClientSecret.Get() || !global.Id.Get()) {
			return $q.reject({ code: global.ErrorCodes.MissingClientData });
		}
		
		var secretHash = Crypto.SHA1(global.ClientSecret.Get()).toString();
		
		return $http.get(global.URL.Host.Get() + global.URL.Bookmarks + '/' + 
			             global.Id.Get() + global.URL.LastUpdated + '/' + secretHash)
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
   
	return {
		GetStatus: getStatus,
		GetBookmarks: getBookmarks,
		CreateBookmarks: createBookmarks,
		UpdateBookmarks: updateBookmarks,
		GetBookmarksLastUpdated: getBookmarksLastUpdated
	};
};