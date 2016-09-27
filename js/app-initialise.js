// Initialise the angular app
xBrowserSync.App.UI = angular.module('xBrowserSync.App.UI', ['ngSanitize', 'ngAnimate', 'angular-complexify']);

// Disable debug info
xBrowserSync.App.UI.config(['$compileProvider', function($compileProvider) {
$compileProvider.debugInfoEnabled(false);
}]);

// Add platform service
xBrowserSync.App.Platform.$inject = ['$q'];
xBrowserSync.App.UI.factory('platform', xBrowserSync.App.Platform);

// Add global service
xBrowserSync.App.Global.$inject = ['platform'];
xBrowserSync.App.UI.factory('global', xBrowserSync.App.Global);

// Add httpInterceptor service
xBrowserSync.App.HttpInterceptor.$inject = ['$q', 'global'];
xBrowserSync.App.UI.factory('httpInterceptor', xBrowserSync.App.HttpInterceptor);
xBrowserSync.App.UI.config(['$httpProvider', function($httpProvider) {
$httpProvider.interceptors.push('httpInterceptor');
}]);

// Add utility service
xBrowserSync.App.Utility.$inject = ['$q', 'platform', 'global'];
xBrowserSync.App.UI.factory('utility', xBrowserSync.App.Utility);

// Add api service
xBrowserSync.App.API.$inject = ['$http', '$q', 'global', 'utility'];
xBrowserSync.App.UI.factory('api', xBrowserSync.App.API);

// Add bookmarks service
xBrowserSync.App.Bookmarks.$inject = ['$q', 'platform', 'global', 'api', 'utility'];
xBrowserSync.App.UI.factory('bookmarks', xBrowserSync.App.Bookmarks);

// Add platform implementation service
xBrowserSync.App.PlatformImplementation.$inject = ['$q', '$timeout', 'platform', 'global', 'utility', 'bookmarks'];
xBrowserSync.App.UI.factory('platformImplementation', xBrowserSync.App.PlatformImplementation);

// Add main controller
xBrowserSync.App.Controller.$inject = ['$scope', '$q', '$timeout', 'Complexify', 'platform', 'global', 'api', 'utility', 'bookmarks', 'platformImplementation'];
xBrowserSync.App.UI.controller('Controller', xBrowserSync.App.Controller);