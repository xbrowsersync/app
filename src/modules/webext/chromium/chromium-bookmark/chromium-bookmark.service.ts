import { Injectable } from 'angular-ts-decorators';
import { autobind } from 'core-decorators';
import { BookmarkContainer } from '../../../shared/bookmark/bookmark.enum';
import { BookmarkService } from '../../../shared/bookmark/bookmark.interface';
import WebExtBookmarkService from '../../webext-bookmark/webext-bookmark.service';

@autobind
@Injectable('BookmarkService')
export default class ChromiumBookmarkService extends WebExtBookmarkService implements BookmarkService {
  unsupportedContainers = [BookmarkContainer.Menu, BookmarkContainer.Mobile];
}
