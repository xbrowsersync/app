import { Injectable } from 'angular-ts-decorators';
import autobind from 'autobind-decorator';
import { Bookmark, BookmarkService } from '../../shared/bookmark/bookmark.interface';

@autobind
@Injectable('BookmarkService')
export default class AndroidBookmarkService implements BookmarkService {
  $q: ng.IQService;

  supportedNativeBookmarkUrlRegex = new RegExp('');
  unsupportedContainers = [];

  static $inject = ['$q'];
  constructor($q: ng.IQService) {
    this.$q = $q;
  }

  buildIdMappings(): ng.IPromise<void> {
    return this.methodNotApplicable();
  }

  clearNativeBookmarks(): ng.IPromise<void> {
    return this.methodNotApplicable();
  }

  createNativeBookmarksFromBookmarks(): ng.IPromise<void> {
    return this.methodNotApplicable();
  }

  getNativeBookmarksAsBookmarks(): ng.IPromise<Bookmark[]> {
    return this.methodNotApplicable();
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
