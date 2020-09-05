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

export { BookmarkChangeType, BookmarkContainer };
