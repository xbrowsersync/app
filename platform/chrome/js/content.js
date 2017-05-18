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
		var metaTagsArr = document.getElementsByTagName('meta');
		
		var getPageDescription = function() { 
			for (var i = 0; i < metaTagsArr.length; i++) {
				var currentTag = metaTagsArr[i];
				if ((!!currentTag.getAttribute('property') && currentTag.getAttribute('property').toUpperCase().trim() === 'OG:DESCRIPTION' && !!currentTag.getAttribute('content')) ||
				   (!!currentTag.getAttribute('name') && currentTag.getAttribute('name').toUpperCase().trim() === 'TWITTER:DESCRIPTION' && !!currentTag.getAttribute('content')) ||
				   (!!currentTag.getAttribute('name') && currentTag.getAttribute('name').toUpperCase().trim() === 'DESCRIPTION' && !!currentTag.getAttribute('content'))) {
					   return (!!currentTag.getAttribute('content')) ? currentTag.getAttribute('content').trim() : '';
				   }
			} 
			
			return null;
		};
		
		var getPageKeywords = function() { 
			// Get open graph tag values 
			var currentTag, i, keywords = [];
			for (i = 0; i < metaTagsArr.length; i++) {
				currentTag = metaTagsArr[i];
				if (!!currentTag.getAttribute('property') && 
					!!currentTag.getAttribute('property').trim().match(/VIDEO\:TAG$/i) && 
					!!currentTag.getAttribute('content')) {
					   keywords.push(currentTag.getAttribute('content').trim());
				   }
			}
			
			// Get meta tag values 
			for (i = 0; i < metaTagsArr.length; i++) {
				currentTag = metaTagsArr[i];
				if (!!currentTag.getAttribute('name') && 
					currentTag.getAttribute('name').toUpperCase().trim() === 'KEYWORDS' && 
					!!currentTag.getAttribute('content')) {
					   var metaKeywords = currentTag.getAttribute('content').split(',');
					   for (i = 0; i < metaKeywords.length; i++) {
						   var currentKeyword = metaKeywords[i];
						   if (!!currentKeyword && !!currentKeyword.trim()) {
							   keywords.push(currentKeyword.trim());
						   }
					   }
					   break;
				   }
			}
			
			if (keywords.length > 0) { 
				return keywords.join();
			} 
			
			return null; 
		};
		
		var getPageTitle = function() { 
			for (var i = 0; i < metaTagsArr.length; i++) {
				var tag = metaTagsArr[i];
				if ((!!tag.getAttribute('property') && tag.getAttribute('property').toUpperCase().trim() === 'OG:TITLE' && !!tag.getAttribute('content')) || 
				   (!!tag.getAttribute('name') && tag.getAttribute('name').toUpperCase().trim() === 'TWITTER:TITLE' && !!tag.getAttribute('content'))) {
					   return (!!tag.getAttribute('content')) ? tag.getAttribute('content').trim() : '';
				   }
			} 
			
			return document.title;
		};
        
        // Get page metadata
        var metadata = {
            title: getPageTitle(),
            url: document.location.href,
            description: getPageDescription(),
            tags: getPageKeywords()
        };
        
        // Return metadata to caller
        chrome.runtime.sendMessage({
            command: 4,
            metadata: metadata
        });
	};
	
	// Call constructor
    return new Content();
}();