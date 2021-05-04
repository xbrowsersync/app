enum BookmarkChangeType {
  Add = 'add',
  ChildrenReordered = 'childrenReordered',
  Modify = 'modify',
  Move = 'move',
  Remove = 'remove'
}

// when adding a new container, add a translation to bookmark-helper.service.ts getBookmarkTitleForDisplay(...)
// do NOT reference any of these constants unless you absolutely have to
// (e.g. .Toolbar in conjunction with SettingsSvc.syncBookmarksToolbar() )
enum BookmarkContainer {
  Menu = '[xbs] Menu',
  Mobile = '[xbs] Mobile',
  Other = '[xbs] Other',
  Toolbar = '[xbs] Toolbar'
}

enum BookmarkType {
  Bookmark = 'bookmark',
  Container = 'container',
  Folder = 'folder',
  Separator = 'separator'
}

export { BookmarkChangeType, BookmarkContainer, BookmarkType };
