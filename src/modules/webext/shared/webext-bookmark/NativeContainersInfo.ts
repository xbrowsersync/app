import { BookmarkContainer } from '../../../shared/bookmark/bookmark.enum';

export class NativeContainersInfo extends Map<BookmarkContainer, string> {
  platformDefaultBookmarksNodeId: string;
}
