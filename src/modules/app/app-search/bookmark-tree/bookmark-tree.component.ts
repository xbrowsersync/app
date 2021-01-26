import { Component, Input, Output } from 'angular-ts-decorators';
import autobind from 'autobind-decorator';
import { BookmarkType } from '../../../shared/bookmark/bookmark.enum';
import { Bookmark } from '../../../shared/bookmark/bookmark.interface';
import BookmarkHelperService from '../../../shared/bookmark/bookmark-helper/bookmark-helper.service';
import { PlatformService } from '../../../shared/global-shared.interface';
import UtilityService from '../../../shared/utility/utility.service';
import AppHelperService from '../../shared/app-helper/app-helper.service';
import { BookmarkTreeItem } from '../app-search.interface';

@autobind
@Component({
  controllerAs: 'vm',
  selector: 'bookmarkTree',
  styles: [require('./bookmark-tree.component.scss')],
  template: require('./bookmark-tree.component.html')
})
export default class BookmarkTreeComponent {
  Strings = require('../../../../../res/strings/en.json');

  appHelperSvc: AppHelperService;
  bookmarkHelperSvc: BookmarkHelperService;
  platformSvc: PlatformService;
  utilitySvc: UtilityService;

  @Input('<ngModel') nodes: Bookmark[];
  @Input() selectedBookmark: Bookmark;

  @Output() deleteBookmark: () => any;
  @Output() editBookmark: () => any;
  @Output() selectBookmark: () => any;
  @Output() shareBookmark: () => any;

  static $inject = ['AppHelperService', 'BookmarkHelperService', 'PlatformService', 'UtilityService'];
  constructor(
    AppHelperSvc: AppHelperService,
    BookmarkHelperSvc: BookmarkHelperService,
    PlatformSvc: PlatformService,
    UtilitySvc: UtilityService
  ) {
    this.appHelperSvc = AppHelperSvc;
    this.bookmarkHelperSvc = BookmarkHelperSvc;
    this.platformSvc = PlatformSvc;
    this.utilitySvc = UtilitySvc;
  }

  isFolder(bookmark: BookmarkTreeItem): boolean {
    const bookmarkType = this.bookmarkHelperSvc.getBookmarkType(bookmark);
    return bookmarkType === BookmarkType.Container || bookmarkType === BookmarkType.Folder;
  }
}
