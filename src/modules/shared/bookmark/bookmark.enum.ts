enum BookmarkChangeType {
  Add = 'add',
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
