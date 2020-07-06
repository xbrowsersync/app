import BookmarkMetadata from './bookmark-metadata.interface';

export default interface Bookmark extends BookmarkMetadata {
  children?: Bookmark[];
  id?: number;
}
