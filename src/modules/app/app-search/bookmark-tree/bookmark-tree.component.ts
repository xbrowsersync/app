import './bookmark-tree.component.scss';
import { Component, Input, Output } from 'angular-ts-decorators';
import autobind from 'autobind-decorator';
import Strings from '../../../../../res/strings/en.json';
import BookmarkHelperService from '../../../shared/bookmark/bookmark-helper/bookmark-helper.service';
import { Bookmark } from '../../../shared/bookmark/bookmark.interface';
import UtilityService from '../../../shared/utility/utility.service';
import { AppHelperService } from '../../app.interface';

@autobind
@Component({
  controllerAs: 'vm',
  selector: 'bookmarkTree',
  template: require('./bookmark-tree.component.html')
})
export default class BookmarkTreeComponent {
  appHelperSvc: AppHelperService;
  bookmarkHelperSvc: BookmarkHelperService;
  utilitySvc: UtilityService;

  strings = Strings;

  @Input('<ngModel') nodes: Bookmark[];
  @Input() selectedBookmark: Bookmark;

  @Output() deleteBookmark: () => any;
  @Output() editBookmark: () => any;
  @Output() selectBookmark: () => any;
  @Output() shareBookmark: () => any;

  static $inject = ['AppHelperService', 'BookmarkHelperService', 'UtilityService'];
  constructor(AppHelperSvc: AppHelperService, BookmarkHelperSvc: BookmarkHelperService, UtilitySvc: UtilityService) {
    this.appHelperSvc = AppHelperSvc;
    this.bookmarkHelperSvc = BookmarkHelperSvc;
    this.utilitySvc = UtilitySvc;
  }
}
