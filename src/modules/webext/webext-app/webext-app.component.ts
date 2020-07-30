import './webext-app.component.scss';
import { Component, OnInit } from 'angular-ts-decorators';
import { autobind } from 'core-decorators';
import AppMainComponent from '../../app/app-main/app-main.component';
import { StoreKey } from '../../shared/store/store.enum';
import WebExtPlatformService from '../webext-platform/webext-platform.service';

@autobind
@Component({
  controllerAs: 'vm',
  selector: 'app',
  template: require('../../app/app-main/app-main.component.html')
})
export default class WebExtAppComponent extends AppMainComponent implements OnInit {
  platformSvc: WebExtPlatformService;

  copyTextToClipboard(text: string): ng.IPromise<void> {
    return navigator.clipboard.writeText(text);
  }

  init(): ng.IPromise<void> {
    // Run init then check if current page is a bookmark
    return super.init().then(this.setBookmarkStatus);
  }

  ngOnInit(): void {
    this.init();
  }

  restoreBookmarksSuccess(): ng.IPromise<void> {
    // Update current bookmark status before continuing
    return this.setBookmarkStatus().then(super.restoreBookmarksSuccess);
  }

  setBookmarkStatus(isActive?: boolean): ng.IPromise<void> {
    if (isActive !== undefined) {
      this.bookmark.active = isActive;
      return this.$q.resolve();
    }

    return this.storeSvc.get<boolean>(StoreKey.SyncEnabled).then((syncEnabled) => {
      if (!syncEnabled) {
        return;
      }

      // If current page is a bookmark, actvate bookmark icon
      return this.bookmarkHelperSvc.findCurrentUrlInBookmarks().then((result) => {
        this.bookmark.active = !!result;
      });
    });
  }

  syncBookmarksSuccess(bookmarkStatusActive?: boolean): ng.IPromise<void> {
    return super.syncBookmarksSuccess(bookmarkStatusActive).then(() => {
      // Update bookmark icon
      return this.setBookmarkStatus(bookmarkStatusActive);
    });
  }
}
