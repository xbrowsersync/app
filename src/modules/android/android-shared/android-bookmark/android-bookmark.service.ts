import { Injectable } from 'angular-ts-decorators';
import { Bookmark, BookmarkService } from '../../../shared/bookmark/bookmark.interface';
import { BookmarkHelperService } from '../../../shared/bookmark/bookmark-helper/bookmark-helper.service';
import { UtilityService } from '../../../shared/utility/utility.service';

@Injectable('BookmarkService')
export class AndroidBookmarkService implements BookmarkService {
  $q: ng.IQService;
  bookmarkHelperSvc: BookmarkHelperService;
  utilitySvc: UtilityService;

  static $inject = ['$q', 'BookmarkHelperService', 'UtilityService'];
  constructor($q: ng.IQService, BookmarkHelperSvc: BookmarkHelperService, UtilitySvc: UtilityService) {
    this.$q = $q;
    this.bookmarkHelperSvc = BookmarkHelperSvc;
    this.utilitySvc = UtilitySvc;
  }

  buildIdMappings(): ng.IPromise<void> {
    return this.methodNotApplicable();
  }

  clearNativeBookmarks(): ng.IPromise<void> {
    return this.methodNotApplicable();
  }

  createNativeBookmarksFromBookmarks(): ng.IPromise<number> {
    return this.methodNotApplicable();
  }

  ensureContainersExist(bookmarks: Bookmark[]): Bookmark[] {
    return bookmarks;
  }

  getBookmarksForExport(): ng.IPromise<Bookmark[]> {
    return this.utilitySvc.isSyncEnabled().then((syncEnabled) => {
      if (!syncEnabled) {
        return;
      }
      return this.bookmarkHelperSvc.getCachedBookmarks().then((bookmarks) => {
        // Clean bookmarks for export
        return this.bookmarkHelperSvc.cleanAllBookmarks(this.bookmarkHelperSvc.removeEmptyContainers(bookmarks));
      });
    });
  }

  methodNotApplicable(): ng.IPromise<any> {
    // Unused for this platform
    return this.$q.resolve();
  }

  processNativeChangeOnBookmarks(): ng.IPromise<Bookmark[]> {
    return this.methodNotApplicable();
  }

  processChangeOnNativeBookmarks(): ng.IPromise<void> {
    return this.methodNotApplicable();
  }
}
