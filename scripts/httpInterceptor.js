var xBrowserSync = xBrowserSync || {};
xBrowserSync.App = xBrowserSync.App || {};

/* ------------------------------------------------------------------------------------
 * Class name:	xBrowserSync.App.HttpInterceptor
 * Description:	Contains functions that call the API service.
 * ------------------------------------------------------------------------------------ */

xBrowserSync.App.HttpInterceptor = function($q, global) {
    'use strict';
    
/* ------------------------------------------------------------------------------------
 * Public functions
 * ------------------------------------------------------------------------------------ */
	
	var httpInterceptor = function () {
		// Intercept the all http requests
		return {
			'request': function (config) {
				// Add the api version to the http Accept-Version header
				config.headers['Accept-Version'] = global.ApiVersion;
				return config || $q.when(config);
			}
		};
	};
   
	return httpInterceptor();
};