import { ApiServiceStatus, ApiServiceType } from './api.enum';

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
  getBookmarksLastUpdated: (skipNetworkConnectionCheck?: boolean) => ng.IPromise<ApiGetLastUpdatedResponse>;
  getSyncVersion: (syncId: string) => ng.IPromise<ApiGetSyncVersionResponse>;
  updateBookmarks: (
    encryptedBookmarks: string,
    updateSyncVersion?: boolean,
    backgroundUpdate?: boolean
  ) => ng.IPromise<ApiUpdateBookmarksResponse>;
}

export interface ApiServiceInfo {
  status?: ApiServiceStatus;
}

export interface ApiServiceInfoResponse {}

export enum ApiServiceNames {
  XbrowsersyncService = 'ApiXbrowsersyncService'
}

export interface ApiSyncInfo {
  id?: string;
  password?: string;
  serviceType: ApiServiceType;
  version?: string;
}

export interface ApiUpdateBookmarksRequest {
  bookmarks: string;
  lastUpdated: string;
  version?: string;
}

export interface ApiUpdateBookmarksResponse {
  lastUpdated: string;
}
