import ApiCreateBookmarksResponse from './api-create-bookmarks-response.interface';
import ApiGetBookmarksResponse from './api-get-bookmarks-response.interface';
import ApiGetLastUpdatedResponse from './api-get-last-updated-response.interface';
import ApiGetSyncVersionResponse from './api-get-sync-version-response.interface';
import ApiServiceInfoResponse from './api-service-info-response.interface';
import ApiUpdateBookmarksResponse from './api-update-bookmarks-response.interface';

export default interface ApiService {
  checkServiceStatus: (url?: string) => ng.IPromise<ApiServiceInfoResponse>;
  createNewSync: () => ng.IPromise<ApiCreateBookmarksResponse>;
  getBookmarks: () => ng.IPromise<ApiGetBookmarksResponse>;
  getBookmarksLastUpdated: () => ng.IPromise<ApiGetLastUpdatedResponse>;
  getBookmarksVersion: (syncId: string) => ng.IPromise<ApiGetSyncVersionResponse>;
  updateBookmarks: (
    encryptedBookmarks: string,
    updateSyncVersion?: boolean,
    backgroundUpdate?: boolean
  ) => ng.IPromise<ApiUpdateBookmarksResponse>;
}
