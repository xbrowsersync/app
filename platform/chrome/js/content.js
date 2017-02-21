var xBrowserSync = xBrowserSync || {};
xBrowserSync.App = xBrowserSync.App || {};

/* ------------------------------------------------------------------------------------
 * Class name:	xBrowserSync.App.Content
 * Description:	Chrome content script that accesses page metadata and returns it to the
 *              xBrowserSync extension.
 * ------------------------------------------------------------------------------------ */

xBrowserSync.App.Content = function() {
    'use strict';

/* ------------------------------------------------------------------------------------
 * Constructor
 * ------------------------------------------------------------------------------------ */
 
	var Content = function() {
		// Get page metadata
        var metadata = {
            title: getPageTitle(),
            url: document.location.href,
            description: getPageDescription(),
            tags: getPageTags()
        };
        
        // Return metadata to caller
        chrome.runtime.sendMessage({
            command: 4,
            metadata: metadata
        });
	};
    
    var getPageDescription = function() {
        var metaElement = document.querySelector('meta[property="og:description" i]') ||
            document.querySelector('meta[name="twitter:description" i]') || 
            document.querySelector('meta[name="description" i]');
        
        if (!!metaElement && !!metaElement.getAttribute('content')) {
            return metaElement.getAttribute('content');
        }
        
        return null;
    };
    
    var getPageTags = function() {
        // Get open graph tag values
        var tagElements = document.querySelectorAll('meta[property$="video:tag" i]');
        
        if (!!tagElements && tagElements.length > 0) {
            var tags = '';
            
            for (var i = 0; i < tagElements.length; i++) {
                tags += tagElements[i].getAttribute('content') + ',';
            }
            
            return tags;
        }
        
        // Get meta tag values
        var metaElement = document.querySelector('meta[name="keywords" i]');
        
        if (!!metaElement && !!metaElement.getAttribute('content')) {
            return metaElement.getAttribute('content');
        }
        
        return null;
    };
    
    var getPageTitle = function() {
        var metaElement = document.querySelector('meta[property="og:title" i]') || 
            document.querySelector('meta[name="twitter:title" i]');

        if (!!metaElement && !!metaElement.getAttribute('content')) {
            return metaElement.getAttribute('content');
        }
        else {
            return document.title;
        }
    };
	
	// Call constructor
    return new Content();
}();