import BookmarkChange from '../../../interfaces/bookmark-change.interface';
import Bookmark from '../bookmark/bookmark.interface';
import MessageCommand from '../message-command.enum';
import SyncType from '../sync-type.enum';

export default interface Sync {
  bookmarks?: Bookmark[];
  changeInfo?: BookmarkChange;
  command?: MessageCommand;
  deferred?: PromiseConstructor;
  type: SyncType;
  uniqueId?: string;
}
