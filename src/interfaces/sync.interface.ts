import Bookmark from '../modules/shared/bookmark/bookmark.interface';
import MessageCommand from '../modules/shared/message-command.enum';
import SyncType from '../modules/shared/sync-type.enum';
import BookmarkChange from './bookmark-change.interface';

export default interface Sync {
  bookmarks?: Bookmark[];
  changeInfo?: BookmarkChange;
  command?: MessageCommand;
  deferred?: PromiseConstructor;
  type: SyncType;
  uniqueId?: string;
}
