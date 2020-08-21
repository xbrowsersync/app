import './bookmark.component.scss';
import { Component, Input, Output } from 'angular-ts-decorators';
import autobind from 'autobind-decorator';
import BookmarkHelperService from '../../../shared/bookmark/bookmark-helper/bookmark-helper.service';
import { BookmarkContainer } from '../../../shared/bookmark/bookmark.enum';
import { Bookmark } from '../../../shared/bookmark/bookmark.interface';
import { PlatformService } from '../../../shared/global-shared.interface';
import UtilityService from '../../../shared/utility/utility.service';
import { AppHelperService } from '../../app.interface';
import { BookmarkTreeItem } from '../app-search.interface';

@autobind
@Component({
  controllerAs: 'vm',
  selector: 'bookmark',
  template: require('./bookmark.component.html'),
  transclude: true
})
export default class BookmarkComponent {
  Strings = require('../../../../../res/strings/en.json');

  $timeout: ng.ITimeoutService;
  appHelperSvc: AppHelperService;
  bookmarkHelperSvc: BookmarkHelperService;
  platformSvc: PlatformService;
  utilitySvc: UtilityService;

  @Input('<ngModel') bookmark: Bookmark;
  @Input() enableEditButton: boolean = true;
  @Input() enableSelect: boolean;
  @Input() isSelected: boolean;

  @Output() editBookmark: () => any;
  @Output() deleteBookmark: () => any;
  @Output() shareBookmark: () => any;

  static $inject = ['$timeout', 'AppHelperService', 'BookmarkHelperService', 'PlatformService', 'UtilityService'];
  constructor(
    $timeout: ng.ITimeoutService,
    AppHelperSvc: AppHelperService,
    BookmarkHelperSvc: BookmarkHelperService,
    PlatformSvc: PlatformService,
    UtilitySvc: UtilityService
  ) {
    this.$timeout = $timeout;
    this.appHelperSvc = AppHelperSvc;
    this.bookmarkHelperSvc = BookmarkHelperSvc;
    this.platformSvc = PlatformSvc;
    this.utilitySvc = UtilitySvc;
  }

  clickBookmarkHeading(event: Event, bookmark: BookmarkTreeItem): void {
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
          if ((child as BookmarkTreeItem).open) {
            (child as BookmarkTreeItem).open = false;
            (child as BookmarkTreeItem).displayChildren = false;
          }
        });
      }
    }, 100);
  }

  getBookmarkTitleForDisplay(bookmark: Bookmark): string {
    // If normal bookmark, return title or if blank url to display
    if (bookmark.url) {
      return bookmark.title ? bookmark.title : bookmark.url.replace(/^https?:\/\//i, '');
    }

    // Otherwise bookmark is a folder, return title if not a container
    if (!this.bookmarkHelperSvc.bookmarkIsContainer(bookmark)) {
      return bookmark.title;
    }
    let containerTitle: string;
    switch (bookmark.title) {
      case BookmarkContainer.Menu:
        containerTitle = this.platformSvc.getI18nString(this.Strings.Bookmarks.Container.Menu);
        break;
      case BookmarkContainer.Mobile:
        containerTitle = this.platformSvc.getI18nString(this.Strings.Bookmarks.Container.Mobile);
        break;
      case BookmarkContainer.Other:
        containerTitle = this.platformSvc.getI18nString(this.Strings.Bookmarks.Container.Other);
        break;
      case BookmarkContainer.Toolbar:
        containerTitle = this.platformSvc.getI18nString(this.Strings.Bookmarks.Container.Toolbar);
        break;
      default:
        containerTitle = `${undefined}`;
    }
    return containerTitle;
  }
}
