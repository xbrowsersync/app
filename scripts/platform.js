var xBrowserSync = xBrowserSync || {};
xBrowserSync.App = xBrowserSync.App || {};

/* ------------------------------------------------------------------------------------
 * Class name:  xBrowserSync.App.Platform
 * Description:	Defines an interface for platform-specific functionality in order
 *              to separate from common functionality. This interface must be
 *              implemented for all supported browsers, e.g. see 
 *              platform/chrome/scripts/platformImplementation.js.
 * ------------------------------------------------------------------------------------ */

xBrowserSync.App.Platform = function($q) {
    'use strict';
	
	var notImplemented = function() {
		// Throw not implemented exception
		return $q.reject({ code: 10400 });
	};
    
	return {
		AsyncChannel: {
            Get: notImplemented
        },
		Bookmarks: {
			Clear: notImplemented,
            ContainsCurrentPage: notImplemented,
			Created: notImplemented,
			Deleted: notImplemented,
			Get: notImplemented,
			Moved: notImplemented,
            Populate: notImplemented,
			Updated: notImplemented
		},
		Constants: {
			Get: notImplemented
		},
        CurrentUrl: {
            Get: notImplemented
        },
		Interface: {
			Refresh: notImplemented
		},
		LocalStorage: {
			Get: notImplemented,
			Set: notImplemented
		},
        PageMetadata: {
            Get: notImplemented
        },
		Sync: notImplemented
	};
};