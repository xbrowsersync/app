import { Component, Input, Output } from 'angular-ts-decorators';
import { autobind } from 'core-decorators';
import Strings from '../../../res/strings/en.json';
import BookmarkHelperService from '../shared/bookmark/bookmark-helper/bookmark-helper.service';
import { PlatformService } from '../shared/global-shared.interface';
import UtilityService from '../shared/utility/utility.service';

@autobind
@Component({
  controllerAs: 'vm',
  selector: 'bookmarkTree',
  template: require('./bookmark-tree.component.html')
})
export default class BookmarkTreeComponent {
  $timeout: ng.ITimeoutService;
  bookmarkHelperSvc: BookmarkHelperService;
  platformSvc: PlatformService;
  utilitySvc: UtilityService;

  strings = Strings;

  @Input('=') nodes: any;
  @Input() platformName: any;
  @Input() selectedBookmark: any;

  @Output() deleteBookmark: any;
  @Output() editBookmark: any;
  @Output() openUrl: any;
  @Output() selectBookmark: any;
  @Output() shareBookmark: any;

  static $inject = ['$timeout', 'BookmarkHelperService', 'PlatformService', 'UtilityService'];
  constructor(
    $timeout: ng.ITimeoutService,
    BookmarkHelperSvc: BookmarkHelperService,
    PlatformSvc: PlatformService,
    UtilitySvc: UtilityService
  ) {
    this.$timeout = $timeout;
    this.bookmarkHelperSvc = BookmarkHelperSvc;
    this.platformSvc = PlatformSvc;
    this.utilitySvc = UtilitySvc;
  }

  bookmark_Heading_Click(event, bookmark) {
    event.stopPropagation();

    // If this is not a folder, return
    if (bookmark.url) {
      return;
    }

    // Toggle display children for this folder
    bookmark.open = !bookmark.open;
    this.$timeout(() => {
      bookmark.displayChildren = !bookmark.displayChildren;

      // Close any open child folders
      if (!bookmark.open) {
        this.bookmarkHelperSvc.eachBookmark(bookmark.children, (child) => {
          if ((child as any).open) {
            (child as any).open = false;
            (child as any).displayChildren = false;
          }
        });
      }
    }, 100);
  }
}
