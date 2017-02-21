var xBrowserSync = xBrowserSync || {};
xBrowserSync.App = xBrowserSync.App || {};

/* ------------------------------------------------------------------------------------
 * Class name:  xBrowserSync.App.Platform
 * Description:	Defines an interface for platform-specific functionality in order
 *              to separate from common functionality. This interface must be
 *              implemented for all supported platforms, e.g. see 
 *              platform/chrome//platformImplementation.js.
 * ------------------------------------------------------------------------------------ */

xBrowserSync.App.Platform = function($q) {
    'use strict';
	
	var notImplemented = function() {
		function NotImplementedException() {
			this.name = 'NotImplementedException';
			this.code = 10400;
		}
		
		// Throw not implemented exception
		throw new NotImplementedException();
	};
    
	return {
		BackupData: notImplemented,
		Bookmarks: {
			AddIds: notImplemented,
			Clear: notImplemented,
			Created: notImplemented,
			Deleted: notImplemented,
			Get: notImplemented,
			Moved: notImplemented,
            Populate: notImplemented,
			Share: notImplemented,
			Updated: notImplemented
		},
		GetConstant: notImplemented,
        GetCurrentUrl: notImplemented,
        GetPageMetadata: notImplemented,
		Init: notImplemented,
		Interface: {
			Loading: {
				Hide: notImplemented,
				Show: notImplemented
			},
			Refresh: notImplemented
		},
		LocalStorage: {
			Get: notImplemented,
			Set: notImplemented
		},
		OpenUrl: notImplemented, 
		ScanID: notImplemented,
		SelectFile: notImplemented,
		Sync: notImplemented
	};
};