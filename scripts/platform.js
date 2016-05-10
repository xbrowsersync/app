var xBrowserSync = xBrowserSync || {};
xBrowserSync.App = xBrowserSync.App || {};

/* ------------------------------------------------------------------------------------
 * Class name:  xBrowserSync.App.Platform
 * Description:	Defines an interface for platform-specific functionality in order
 *              to separate from common functionality. This interface must be
 *              implemented for all supported browsers, e.g. see 
 *              platform/chrome/scripts/platformImplementation.js.
 * ------------------------------------------------------------------------------------ */

xBrowserSync.App.Platform = function() {
    'use strict';
    
	return {
		AsyncChannel: {
            Get: undefined
        },
		Bookmarks: {
			Clear: undefined,
            ContainsCurrentPage: undefined,
			Count: undefined,
            Populate: undefined,
			Retrieve: undefined,
			Updated_Create: undefined,
			Updated_Delete: undefined,
			Updated_Move: undefined,
			Updated_Update: undefined
		},
		Constants: {
			Get: undefined
		},
        CurrentUrl: {
            Get: undefined
        },
		DisplayAlert: undefined,
		Interface: {
			Refresh: undefined
		},
		LocalStorage: {
			Get: undefined,
			Set: undefined
		},
        PageMetadata: {
            Get: undefined
        },
		Sync: undefined
	};
};