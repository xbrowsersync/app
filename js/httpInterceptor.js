var xBrowserSync = xBrowserSync || {};
xBrowserSync.App = xBrowserSync.App || {};

/* ------------------------------------------------------------------------------------
 * Class name:	xBrowserSync.App.HttpInterceptor
 * Description:	Adds Accept-Version HTTP header to all requests.
 * ------------------------------------------------------------------------------------ */

xBrowserSync.App.HttpInterceptor = function($q, globals) {
    'use strict';
    
/* ------------------------------------------------------------------------------------
 * Public functions
 * ------------------------------------------------------------------------------------ */
	
	var httpInterceptor = function () {
		// Intercept the all http requests
		return {
			'request': function (config) {
				// Add the api version to the http Accept-Version header
				config.headers['Accept-Version'] = globals.ApiVersion;

				// Set default request timeout
				config.timeout = (!config.timeout) ? 10000 : config.timeout;

				return config || $q.when(config);
			}
		};
	};
   
	return httpInterceptor();
};