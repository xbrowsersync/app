export interface ApiCreateBookmarksRequest {
  version: string;
}

export interface ApiCreateBookmarksResponse {
  id: string;
  lastUpdated: string;
  version: string;
}

export interface ApiGetBookmarksResponse {
  bookmarks: string;
  lastUpdated: string;
  version: string;
}

export interface ApiGetLastUpdatedResponse {
  lastUpdated: string;
}

export interface ApiGetSyncVersionResponse {
  version: string;
}

export interface ApiService {
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

export interface ApiServiceInfoResponse {}

export interface ApiUpdateBookmarksRequest {
  bookmarks: string;
  lastUpdated: string;
  version?: string;
}

export interface ApiUpdateBookmarksResponse {
  lastUpdated: string;
}
