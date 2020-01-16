// Initialise the angular app
xBrowserSync.App.UI = angular.module('xBrowserSync.App.UI', [
  'angular.filter',
  'hmTouchEvents',
  'infinite-scroll',
  'ngAnimate',
  'ngSanitize',
  'zxcvbn'
]);

// Disable debug info
xBrowserSync.App.UI.config(['$compileProvider', function ($compileProvider) {
  $compileProvider.debugInfoEnabled(false);
  $compileProvider.aHrefSanitizationWhitelist(/^[\w\-]+:.*$/);
}]);

// Restrict animations to elements with class prefix "animate-"
xBrowserSync.App.UI.config(['$animateProvider', function ($animateProvider) {
  $animateProvider.classNameFilter(/animate/);
}]);

xBrowserSync.App.UI.run(['$templateRequest', function ($templateRequest) {
  // Pre-load templates
  $templateRequest('./views/bookmark.html', true);
  $templateRequest('./views/help.html', true);
  $templateRequest('./views/login.html', true);
  $templateRequest('./views/qr.html', true);
  $templateRequest('./views/search.html', true);
  $templateRequest('./views/settings.html', true);
  $templateRequest('./views/support.html', true);
  $templateRequest('./views/updated.html', true);
}]);

// Add platform service
xBrowserSync.App.Platform.$inject = ['$q'];
xBrowserSync.App.UI.factory('platform', xBrowserSync.App.Platform);

// Add global service
xBrowserSync.App.Global.$inject = ['platform'];
xBrowserSync.App.UI.factory('globals', xBrowserSync.App.Global);

// Add httpInterceptor service
xBrowserSync.App.HttpInterceptor.$inject = ['$q', 'globals'];
xBrowserSync.App.UI.factory('httpInterceptor', xBrowserSync.App.HttpInterceptor);
xBrowserSync.App.UI.config(['$httpProvider', function ($httpProvider) {
  $httpProvider.interceptors.push('httpInterceptor');
}]);

// Add utility service
xBrowserSync.App.Utility.$inject = ['$q', 'platform', 'globals'];
xBrowserSync.App.UI.factory('utility', xBrowserSync.App.Utility);

// Add api service
xBrowserSync.App.API.$inject = ['$http', '$q', 'platform', 'globals', 'utility'];
xBrowserSync.App.UI.factory('api', xBrowserSync.App.API);

// Add bookmarks service
xBrowserSync.App.Bookmarks.$inject = ['$q', '$timeout', 'platform', 'globals', 'api', 'utility'];
xBrowserSync.App.UI.factory('bookmarks', xBrowserSync.App.Bookmarks);

// Add platform implementation service
xBrowserSync.App.PlatformImplementation.$inject = ['$interval', '$q', '$timeout', 'platform', 'globals', 'utility', 'bookmarks'];
xBrowserSync.App.UI.factory('platformImplementation', xBrowserSync.App.PlatformImplementation);

// Add bookmark tree component
xBrowserSync.App.Components.BookmarkTree.$inject = ['platform', 'globals', 'utility', 'bookmarks', 'platformImplementation'];
xBrowserSync.App.UI.component('bookmarkTree', {
  templateUrl: './views/bookmarkTree.html',
  bindings: {
    deleteBookmark: '&',
    editBookmark: '&',
    nodes: '=',
    openUrl: '&',
    platformName: '<',
    selectBookmark: '&',
    selectedBookmark: '<',
    shareBookmark: '&',
  },
  controller: xBrowserSync.App.Components.BookmarkTree
});

// Add main controller
xBrowserSync.App.Controller.$inject = ['$q', '$timeout', 'platform', 'globals', 'api', 'utility', 'bookmarks', 'platformImplementation'];
xBrowserSync.App.UI.controller('Controller', xBrowserSync.App.Controller);