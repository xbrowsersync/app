import { Bookmark } from '../shared/bookmark/bookmark.interface';
import { AppViewType } from './app.enum';

export interface AppView {
  data?: AppViewData;
  view: AppViewType;
}

export interface AppViewData {
  addButtonDisabledByDefault?: boolean;
  bookmark?: Bookmark;
}
