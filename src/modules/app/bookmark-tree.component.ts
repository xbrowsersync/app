/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { Component, Input, Output } from 'angular-ts-decorators';
import { autobind } from 'core-decorators';
import Strings from '../../../res/strings/en.json';
import PlatformService from '../../interfaces/platform-service.interface';
import BookmarkService from '../shared/bookmark/bookmark.service';
import UtilityService from '../shared/utility/utility.service';

@autobind
@Component({
  controllerAs: 'vm',
  selector: 'bookmarkTree',
  template: require('./bookmark-tree.component.html')
})
export default class BookmarkTreeComponent {
  $timeout: ng.ITimeoutService;
  bookmarkSvc: BookmarkService;
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

  static $inject = ['$timeout', 'BookmarkService', 'PlatformService', 'UtilityService'];
  constructor(
    $timeout: ng.ITimeoutService,
    BookmarkSvc: BookmarkService,
    PlatformSvc: PlatformService,
    UtilitySvc: UtilityService
  ) {
    this.$timeout = $timeout;
    this.bookmarkSvc = BookmarkSvc;
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
        this.bookmarkSvc.eachBookmark(bookmark.children, (child) => {
          if ((child as any).open) {
            (child as any).open = false;
            (child as any).displayChildren = false;
          }
        });
      }
    }, 100);
  }
}
