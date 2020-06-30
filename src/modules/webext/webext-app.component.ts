import { autobind } from 'core-decorators';
import AppComponent from '../app/app.component';
import StoreKey from '../shared/store/store-key.enum';

@autobind
export default class WebExtAppComponent extends AppComponent {
  init() {
    // Run init then check if current page is a bookmark
    return super.init().then(this.setBookmarkStatus);
  }

  restoreBookmarksSuccess() {
    // Update current bookmark status before continuing
    return this.setBookmarkStatus().then(super.restoreBookmarksSuccess);
  }

  setBookmarkStatus(isActive?) {
    if (isActive !== undefined) {
      this.bookmark.active = isActive;
      return this.$q.resolve();
    }

    return this.storeSvc.get<boolean>(StoreKey.SyncEnabled).then((syncEnabled) => {
      if (!syncEnabled) {
        return null;
      }

      // If current page is a bookmark, actvate bookmark icon
      return this.bookmarkSvc.findCurrentUrlInBookmarks().then((result) => {
        this.bookmark.active = !!result;
      });
    });
  }

  syncBookmarksSuccess(loadingTimeout?, bookmarkStatusActive?) {
    return super.syncBookmarksSuccess(loadingTimeout, bookmarkStatusActive).then(() => {
      // Update bookmark icon
      return this.setBookmarkStatus(bookmarkStatusActive);
    });
  }
}
