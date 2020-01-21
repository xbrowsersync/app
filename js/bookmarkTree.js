var xBrowserSync = xBrowserSync || {};
xBrowserSync.App = xBrowserSync.App || {};
xBrowserSync.App.Components = xBrowserSync.App.Components || {};

/* ------------------------------------------------------------------------------------
 * Class name:	xBrowserSync.App.Components.BookmarkTree
 * Description:	Reccursive component that displays bookmark tree view.
 * ------------------------------------------------------------------------------------ */

xBrowserSync.App.Components.BookmarkTree = function ($timeout, platform, globals, utility, bookmarks) {
  'use strict';

	/* ------------------------------------------------------------------------------------
	 * Public functions
	 * ------------------------------------------------------------------------------------ */

  var ctrl;

  /* ------------------------------------------------------------------------------------
   * Constructor
   * ------------------------------------------------------------------------------------ */

  function Controller() {
    ctrl = this;
    ctrl.bookmarks = bookmarks;
    ctrl.globals = globals;
    ctrl.platform = platform;
    ctrl.utility = utility;

    ctrl.deleteBookmark = undefined;
    ctrl.editBookmark = undefined;
    ctrl.nodes = undefined;
    ctrl.openUrl = undefined;
    ctrl.platformName = undefined;
    ctrl.selectBookmark = undefined;
    ctrl.selectedBookmark = undefined;
    ctrl.shareBookmark = undefined;

    ctrl.events = {
      bookmark_Heading_Click: bookmark_Heading_Click,
    };
  }


  /* ------------------------------------------------------------------------------------
   * Private functions
   * ------------------------------------------------------------------------------------ */

  var bookmark_Heading_Click = function (event, bookmark) {
    event.stopPropagation();

    // If this is not a folder, return
    if (bookmark.url) {
      return;
    }

    // Toggle display children for this folder
    bookmark.open = !bookmark.open;
    $timeout(function () {
      bookmark.displayChildren = !bookmark.displayChildren;
    });
  };


  return new Controller();
};