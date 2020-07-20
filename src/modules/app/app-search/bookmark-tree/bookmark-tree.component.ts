import './bookmark-tree.component.scss';
import { Component, Input, Output } from 'angular-ts-decorators';
import { autobind } from 'core-decorators';
import Strings from '../../../../../res/strings/en.json';
import BookmarkHelperService from '../../../shared/bookmark/bookmark-helper/bookmark-helper.service';
import { Bookmark } from '../../../shared/bookmark/bookmark.interface';
import UtilityService from '../../../shared/utility/utility.service';

@autobind
@Component({
  controllerAs: 'vm',
  selector: 'bookmarkTree',
  template: require('./bookmark-tree.component.html')
})
export default class BookmarkTreeComponent {
  bookmarkHelperSvc: BookmarkHelperService;
  utilitySvc: UtilityService;

  strings = Strings;

  @Input('<ngModel') nodes: Bookmark[];
  @Input() platformName: string;
  @Input() selectedBookmark: Bookmark;

  @Output() deleteBookmark: () => any;
  @Output() editBookmark: () => any;
  @Output() openUrl: () => any;
  @Output() selectBookmark: () => any;
  @Output() shareBookmark: () => any;

  static $inject = ['BookmarkHelperService', 'UtilityService'];
  constructor(BookmarkHelperSvc: BookmarkHelperService, UtilitySvc: UtilityService) {
    this.bookmarkHelperSvc = BookmarkHelperSvc;
    this.utilitySvc = UtilitySvc;
  }
}
