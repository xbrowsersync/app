var xBrowserSync = xBrowserSync || {};
xBrowserSync.App = xBrowserSync.App || {};

/* ------------------------------------------------------------------------------------
 * Class name:	xBrowserSync.App.Global
 * Description:	Defines global properties.
 * ------------------------------------------------------------------------------------ */ 

xBrowserSync.App.Global = function(platform) {
    'use strict';
    
	var Global = {
        Alarm: {
            Name: {
                Get: function() {
                    return 'xBrowserSync-alarm';
                }
            },
            Period: {
                Get: function() {
                    return 5;
                }
            }
        },
        Bookmark: {
            DescriptionMaxLength: 500
        },
        Cache: {
            Bookmarks: {
                Get: function() {
                    var bookmarks = platform.LocalStorage.Get(
                        'xBrowserSync-cachedBookmarks');
                    
                    if (!!bookmarks) {
                        try {
                            bookmarks = JSON.parse(bookmarks);
                        }
                        catch(err) {
                            bookmarks = null;
                        }
                    }
                    
                    return bookmarks;
                },
                Set: function(value) {
                    var bookmarks = '';
                    
                    if (!!value) {
                        try {
                            bookmarks = JSON.stringify(value);
                        }
                        catch(err) { }
                    }
                    
                    platform.LocalStorage.Set(
                        'xBrowserSync-cachedBookmarks', 
                        bookmarks);
                }
            }
        },
        Commands: {
            SyncBookmarks: 1,
            RestoreBookmarks: 2
        },
        ClientSecret: {
            Get: function() {
                return platform.LocalStorage.Get(
                    'xBrowserSync-clientSecret');
            },
            Set: function(value) {
                value = (!value) ? '' : value.trim();
                
                platform.LocalStorage.Set(
                    'xBrowserSync-clientSecret', 
                    value);
            }
        },
        DisableEventListeners: {
            Get: function() {
                var value;
                
                value = platform.LocalStorage.Get(
                    'xBrowserSync-disableEventListeners');
                
                if (!value) {
                    return false;
                }
                else {
                    if (value === 'true') {
                        return true;
                    }
                    else {
                        return false;
                    }
                }
            },
            Set: function(value) {
                platform.LocalStorage.Set(
                    'xBrowserSync-disableEventListeners', 
                    value);
            }
        },
        ErrorCodes: {
            HttpRequestFailed: 10000,
            TooManyRequests: 10001,
            RequestEntityTooLarge: 10002,
            MissingClientData: 10100, 
            AmbiguousSyncRequest: 10101,
            FailedGetLocalBookmarks: 10102,
            FailedCreateLocalBookmarks: 10103,
            FailedRemoveLocalBookmarks: 10104,            
            NoDataFound: 10105,
            InvalidData: 10106,
            FailedFindUpdatedBookmark: 10107,
            NumBookmarksMismatch: 10108,
            FailedFindBookmark: 10109,
            NoStatus: 10200,
            FailedGetPageMetadata: 10300
        },
        Id: {
            Get: function() {
                var value = platform.LocalStorage.Get(
                    'xBrowserSync-Id');
                value = (value === '' || value === 'null') ? null : value;
                
                return value;
            },
            Set: function(value) {
                value = (!value) ? '' : value.trim();
                
                platform.LocalStorage.Set(
                    'xBrowserSync-Id', 
                    value);
            }
        },
        Images: {
            BrowserAction: {
                Off: 'images/browser-action-off.png',
                On: 'images/browser-action-on.png',
                Working: 'images/browser-action-working.png'
            },
            Logo64: 'images/logo-64.png',
            Logo150: 'images/logo-150.png'
        },
        IncludeBookmarksBar: {
            Get: function() {
                var value;
                
                value = platform.LocalStorage.Get(
                    'xBrowserSync-includeBookmarksBar');
                
                if (!value) {
                    return true;
                }
                else {
                    if (value === 'true') {
                        return true;
                    }
                    else {
                        return false;
                    }
                }
            },
            Set: function(value) {
                platform.LocalStorage.Set(
                    'xBrowserSync-includeBookmarksBar', 
                    value);
                
                // Clear LastUpdated to ensure next update check refreshes local
                // bookmarks
                Global.LastUpdated.Set('');
            }
        },
        IsSyncing: {
            Get: function() {
                var value;
                
                value = platform.LocalStorage.Get(
                    'xBrowserSync-isSyncing');
                
                if (!value) {
                    return false;
                }
                else {
                    if (value === 'true') {
                        return true;
                    }
                    else {
                        return false;
                    }
                }
            },
            Set: function(value) {
                platform.LocalStorage.Set(
                    'xBrowserSync-isSyncing', 
                    value);
                
                platform.Interface.Refresh();
            }
        },
        LastUpdated: {
            Get: function() {
                var lastUpdatedVal = platform.LocalStorage.Get(
                    'xBrowserSync-lastUpdated');
                
                if (!!lastUpdatedVal) {
                    return new Date(lastUpdatedVal);
                }
                else {
                    return null;
                }
            },
            Set: function(value) {
                platform.LocalStorage.Set(
                    'xBrowserSync-lastUpdated', 
                    value);
            }
        },
        RetrySyncTimeout: 100,
        ShowHints: {
            Get: function() {
                var value;
                
                value = platform.LocalStorage.Get(
                    'xBrowserSync-showHints');
                
                if (!value) {
                    return true;
                }
                else {
                    if (value === 'true') {
                        return true;
                    }
                    else {
                        return false;
                    }
                }
            },
            Set: function(value) {
                platform.LocalStorage.Set(
                    'xBrowserSync-showHints', 
                    value);
            }
        },
        SyncEnabled: {
            Get: function() {
                var value;
                
                value = platform.LocalStorage.Get(
                    'xBrowserSync-syncEnabled');
                
                if (!value) {
                    return false;
                }
                else {
                    if (value === 'true') {
                        return true;
                    }
                    else {
                        return false;
                    }
                }
            },
            Set: function(value) {
                platform.LocalStorage.Set(
                    'xBrowserSync-syncEnabled', 
                    value);
                
                platform.Interface.Refresh();
            }
        },
        SyncInterrupted: {
            Get: function() {
                var value;
                
                value = platform.LocalStorage.Get(
                    'xBrowserSync-syncInterrupted');
                
                if (!value) {
                    return false;
                }
                else {
                    if (value === 'true') {
                        return true;
                    }
                    else {
                        return false;
                    }
                }
            },
            Set: function(value) {
                platform.LocalStorage.Set(
                    'xBrowserSync-syncInterrupted', 
                    value);
            }
        },
        SyncType: { 
            Push: 1, 
            Pull: 2,
            Both: 3
        },
        Title: {
            Get: function() {
                return 'xBrowserSync';
            }
        },
        UpdateType: {
            Create: 1,
            Delete: 2,
            Update: 3,
            Move: 4
        },
        URL: {
            Host: {
                Get: function() {
                    var defaultUrl = 'https://api-xbrowsersync.rhcloud.com';
                    var urlHost = platform.LocalStorage.Get(
                        'xBrowserSync-urlHost');
                    
                    urlHost = (urlHost === null || urlHost === undefined) ?
                        defaultUrl :
                        urlHost;
                    
                    return urlHost;
                },
                Set: function(value) {
                    value = (!value) ? '' : value;
                    
                    platform.LocalStorage.Set(
                        'xBrowserSync-urlHost', 
                        value);
                }
            },
            Bookmarks: '/bookmarks',
            LastUpdated: '/lastUpdated',
            Status: '/status'
        }
    };
    
    return Global;
};