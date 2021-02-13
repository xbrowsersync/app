enum BookmarkChangeType {
  Add = 'add',
  ChildrenReordered = 'childrenReordered',
  Modify = 'modify',
  Move = 'move',
  Remove = 'remove'
}

enum BookmarkContainer {
  Menu = '[xbs] Menu',
  Mobile = '[xbs] Mobile',
  Other = '[xbs] Other',
  Toolbar = '[xbs] Toolbar'
}

// TODO: maybe remove this new code and use solely (un)supported bookmark detection at runtime
//  OR! always create all containers, so that merging in the future is simpler?
const MandatoryBookmarkContainers: Array<BookmarkContainer> = [
  BookmarkContainer.Other,
  BookmarkContainer.Mobile,
  BookmarkContainer.Toolbar
];

enum BookmarkType {
  Bookmark = 'bookmark',
  Container = 'container',
  Folder = 'folder',
  Separator = 'separator'
}

export { BookmarkChangeType, BookmarkContainer, BookmarkType, MandatoryBookmarkContainers };
