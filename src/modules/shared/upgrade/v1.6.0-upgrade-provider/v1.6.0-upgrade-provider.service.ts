import angular from 'angular';
import { BookmarkContainer } from '../../bookmark/bookmark.enum';
import { Bookmark } from '../../bookmark/bookmark.interface';
import { BookmarkHelperService } from '../../bookmark/bookmark-helper/bookmark-helper.service';
import Globals from '../../global-shared.constants';
import { PlatformService } from '../../global-shared.interface';
import { StoreKey } from '../../store/store.enum';
import { StoreService } from '../../store/store.service';
import { UtilityService } from '../../utility/utility.service';
import { UpgradeProvider } from '../upgrade.interface';

export abstract class V160UpgradeProviderService implements UpgradeProvider {
  $q: ng.IQService;
  bookmarkHelperSvc: BookmarkHelperService;
  platformSvc: PlatformService;
  storeSvc: StoreService;
  utilitySvc: UtilityService;

  constructor(
    $q: ng.IQService,
    BookmarkHelperSvc: BookmarkHelperService,
    PlatformSvc: PlatformService,
    StoreSvc: StoreService,
    UtilitySvc: UtilityService
  ) {
    this.$q = $q;
    this.bookmarkHelperSvc = BookmarkHelperSvc;
    this.platformSvc = PlatformSvc;
    this.storeSvc = StoreSvc;
    this.utilitySvc = UtilitySvc;
  }

  upgradeApp(upgradingFromVersion?: string): ng.IPromise<void> {
    // Set help page to display
    return this.storeSvc.set(StoreKey.DisplayHelp, false);
  }

  upgradeBookmarks(bookmarks: Bookmark[], upgradingFromVersion?: string): ng.IPromise<Bookmark[]> {
    const upgradedBookmarks = angular.copy(bookmarks);

    // Upgrade separators
    this.bookmarkHelperSvc.eachBookmark((bookmark) => {
      if (bookmark.title === '-' && !bookmark.url && !bookmark.children) {
        bookmark.url = Globals.Bookmarks.SeparatorUrl;
        delete bookmark.title;
      }
    }, upgradedBookmarks);

    // Move mobile bookmarks container into other bookmarks if present
    const mobileContainerIndex = upgradedBookmarks.findIndex((bookmark) => bookmark.title === '[xbs] Mobile');
    if (mobileContainerIndex >= 0) {
      const mobileContainerArr = upgradedBookmarks.splice(mobileContainerIndex, 1);
      const [mobileContainer] = mobileContainerArr;
      mobileContainer.title = 'Mobile bookmarks';
      const otherContainer = this.bookmarkHelperSvc.getContainer(BookmarkContainer.Other, upgradedBookmarks, true);
      otherContainer.children = [...mobileContainerArr, ...otherContainer.children];
    }

    return this.$q.resolve(upgradedBookmarks);
  }
}
