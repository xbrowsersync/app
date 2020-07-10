import { Injectable } from 'angular-ts-decorators';
import compareVersions from 'compare-versions';
import { autobind } from 'core-decorators';
import * as Exceptions from '../../exception/exception';
import Globals from '../../global-shared.constants';
import NetworkService from '../../network/network.service';
import { StoreKey } from '../../store/store.enum';
import StoreService from '../../store/store.service';
import UtilityService from '../../utility/utility.service';
import {
  ApiCreateBookmarksRequest,
  ApiCreateBookmarksResponse,
  ApiGetBookmarksResponse,
  ApiGetLastUpdatedResponse,
  ApiGetSyncVersionResponse,
  ApiService,
  ApiServiceInfoResponse,
  ApiUpdateBookmarksRequest,
  ApiUpdateBookmarksResponse
} from '../api.interface';
import { ApiXbrowsersyncResource } from './api-xbrowsersync.enum';
import { ApiXbrowsersyncErrorResponse, ApiXbrowsersyncServiceInfoResponse } from './api-xbrowsersync.interface';

@autobind
@Injectable('ApiService')
export default class ApiXbrowsersyncService implements ApiService {
  $http: ng.IHttpService;
  $q: ng.IQService;
  networkSvc: NetworkService;
  storeSvc: StoreService;
  utilitySvc: UtilityService;

  skipOnlineCheck = false;

  static $inject = ['$http', '$q', 'NetworkService', 'StoreService', 'UtilityService'];
  constructor(
    $http: ng.IHttpService,
    $q: ng.IQService,
    NetworkSvc: NetworkService,
    StoreSvc: StoreService,
    UtilitySvc: UtilityService
  ) {
    this.$http = $http;
    this.$q = $q;
    this.networkSvc = NetworkSvc;
    this.storeSvc = StoreSvc;
    this.utilitySvc = UtilitySvc;
  }

  apiRequestSucceeded<T>(response: T): ng.IPromise<T> {
    this.skipOnlineCheck = false;
    return this.$q.resolve(response);
  }

  checkNetworkIsOnline(): ng.IPromise<void> {
    return this.$q((resolve, reject) => {
      if (this.skipOnlineCheck || this.networkSvc.isNetworkConnected()) {
        return resolve();
      }
      return reject(new Exceptions.NetworkOfflineException());
    });
  }

  checkServiceStatus(url?: string): ng.IPromise<ApiServiceInfoResponse> {
    return this.checkNetworkIsOnline().then(() => {
      // Get current service url if not provided
      return (!url ? this.utilitySvc.getServiceUrl() : this.$q.resolve(url))
        .then((serviceUrl) => {
          // Request service info
          const requestConfig: ng.IRequestConfig = {
            method: 'GET',
            url: `${serviceUrl}/${ApiXbrowsersyncResource.ServiceInformation}`,
            timeout: 3000
          };
          return this.$http<ApiXbrowsersyncServiceInfoResponse>(requestConfig).catch((response) => {
            throw this.getExceptionFromHttpResponse(response);
          });
        })
        .then(this.apiRequestSucceeded)
        .then((response) => {
          // Check service is a valid xBrowserSync API
          const { data: serviceInfo } = response;
          if (!serviceInfo || serviceInfo.status == null || serviceInfo.version == null) {
            throw new Exceptions.InvalidServiceException();
          }

          // Check service version is supported by this client
          if (compareVersions.compare(serviceInfo.version, Globals.MinApiVersion, '<')) {
            throw new Exceptions.UnsupportedApiVersionException();
          }

          return serviceInfo;
        });
    });
  }

  createNewSync(): ng.IPromise<ApiCreateBookmarksResponse> {
    return this.checkNetworkIsOnline()
      .then(() => {
        return this.utilitySvc
          .getServiceUrl()
          .then((serviceUrl) => {
            const requestUrl = `${serviceUrl}/${ApiXbrowsersyncResource.Bookmarks}`;
            const requestBody: ApiCreateBookmarksRequest = {
              version: Globals.AppVersion
            };
            return this.$http
              .post<ApiCreateBookmarksResponse>(requestUrl, JSON.stringify(requestBody))
              .catch((response) => {
                throw this.getExceptionFromHttpResponse(response);
              });
          })
          .then(this.apiRequestSucceeded)
          .then((response) => {
            // Check response data is valid before returning
            const { data } = response;
            if (!data || !data.id || !data.lastUpdated || !data.version) {
              throw new Exceptions.NoDataFoundException();
            }
            return data;
          });
      })
      .catch((err) => {
        if (err instanceof Exceptions.InvalidServiceException) {
          throw new Exceptions.ServiceOfflineException();
        }
        throw err;
      });
  }

  getBookmarks(): ng.IPromise<ApiGetBookmarksResponse> {
    // Check secret and sync ID are present
    return this.storeSvc
      .get([StoreKey.Password, StoreKey.SyncId])
      .then((storeContent) => {
        if (!storeContent.password || !storeContent.syncId) {
          throw new Exceptions.MissingClientDataException();
        }

        return this.checkNetworkIsOnline().then(() => {
          // Get current service url
          return this.utilitySvc
            .getServiceUrl()
            .then((serviceUrl) => {
              const requestUrl = `${serviceUrl}/${ApiXbrowsersyncResource.Bookmarks}/${storeContent.syncId}`;
              return this.$http.get<ApiGetBookmarksResponse>(requestUrl).catch((response) => {
                throw this.getExceptionFromHttpResponse(response);
              });
            })
            .then(this.apiRequestSucceeded)
            .then((response) => {
              // Check response data is valid before returning
              const { data } = response;
              if (!data || !data.lastUpdated) {
                throw new Exceptions.NoDataFoundException();
              }
              return data;
            });
        });
      })
      .catch((err) => {
        if (err instanceof Exceptions.InvalidServiceException) {
          throw new Exceptions.ServiceOfflineException();
        }
        throw err;
      });
  }

  getBookmarksLastUpdated(): ng.IPromise<ApiGetLastUpdatedResponse> {
    // Check secret and sync ID are present
    return this.storeSvc
      .get([StoreKey.Password, StoreKey.SyncId])
      .then((storeContent) => {
        if (!storeContent.password || !storeContent.syncId) {
          throw new Exceptions.MissingClientDataException();
        }

        return this.checkNetworkIsOnline().then(() => {
          // Get current service url
          return this.utilitySvc
            .getServiceUrl()
            .then((serviceUrl) => {
              const requestUrl = `${serviceUrl}/${ApiXbrowsersyncResource.Bookmarks}/${storeContent.syncId}/${ApiXbrowsersyncResource.LastUpdated}`;
              return this.$http.get<ApiGetLastUpdatedResponse>(requestUrl).catch((response) => {
                throw this.getExceptionFromHttpResponse(response);
              });
            })
            .then(this.apiRequestSucceeded)
            .then((response) => {
              // Check response data is valid before returning
              const { data } = response;
              if (!data || !data.lastUpdated) {
                throw new Exceptions.NoDataFoundException();
              }
              return data;
            });
        });
      })
      .catch((err) => {
        if (err instanceof Exceptions.InvalidServiceException) {
          throw new Exceptions.ServiceOfflineException();
        }
        throw err;
      });
  }

  getBookmarksVersion(syncId: string): ng.IPromise<ApiGetSyncVersionResponse> {
    return this.checkNetworkIsOnline()
      .then(() => {
        // Get current service url
        return this.utilitySvc
          .getServiceUrl()
          .then((serviceUrl) => {
            const requestUrl = `${serviceUrl}/${ApiXbrowsersyncResource.Bookmarks}/${syncId}/${ApiXbrowsersyncResource.Version}`;
            return this.$http.get<ApiGetSyncVersionResponse>(requestUrl).catch((response) => {
              throw this.getExceptionFromHttpResponse(response);
            });
          })
          .then(this.apiRequestSucceeded)
          .then((response) => {
            // Check response data is valid before returning
            const { data } = response;
            if (!data) {
              throw new Exceptions.NoDataFoundException();
            }
            return data;
          });
      })
      .catch((err) => {
        if (err instanceof Exceptions.InvalidServiceException) {
          throw new Exceptions.ServiceOfflineException();
        }
        throw err;
      });
  }

  getExceptionFromHttpResponse(response: ng.IHttpResponse<ApiXbrowsersyncErrorResponse>): Exceptions.Exception {
    let message: string;
    if (response && response.data && response.data.message) {
      message = response.data.message;
    }

    let exception: Exceptions.Exception;
    switch (response.status) {
      // 401 Unauthorized: sync data not found
      case 401:
        exception = new Exceptions.NoDataFoundException(message);
        break;
      // 404 Not Found: invalid service
      case 404:
        exception = new Exceptions.InvalidServiceException(message);
        break;
      // 405 Method Not Allowed: service not accepting new syncs
      case 405:
        exception = new Exceptions.NotAcceptingNewSyncsException(message);
        break;
      // 406 Not Acceptable: daily new sync limit reached
      case 406:
        exception = new Exceptions.DailyNewSyncLimitReachedException(message);
        break;
      // 409 Conflict: sync update conflict
      case 409:
        exception = new Exceptions.DataOutOfSyncException(message);
        break;
      // 413 Request Entity Too Large: sync data size exceeds service limit
      case 413:
        exception = new Exceptions.RequestEntityTooLargeException(message);
        break;
      // 429 Too Many Requests: daily new sync limit reached
      case 429:
        exception = new Exceptions.TooManyRequestsException(message);
        break;
      // 503 Service Unavailable: service offline
      case 503:
        exception = new Exceptions.ServiceOfflineException(message);
        break;
      // Otherwise generic request failed
      default:
        exception = new Exceptions.HttpRequestFailedException(message);
    }

    return exception;
  }

  updateBookmarks(
    encryptedBookmarks: string,
    updateSyncVersion = false,
    backgroundUpdate = false
  ): ng.IPromise<ApiUpdateBookmarksResponse> {
    // Check secret and sync ID are present
    return this.storeSvc
      .get([StoreKey.LastUpdated, StoreKey.Password, StoreKey.SyncId])
      .then((storeContent) => {
        if (!storeContent.lastUpdated || !storeContent.password || !storeContent.syncId) {
          throw new Exceptions.MissingClientDataException();
        }

        // If this is a background update, ensure online check is skipped until successfull request
        this.skipOnlineCheck = backgroundUpdate;
        return this.checkNetworkIsOnline().then(() => {
          // Get current service url
          return this.utilitySvc
            .getServiceUrl()
            .then((serviceUrl) => {
              const requestUrl = `${serviceUrl}/${ApiXbrowsersyncResource.Bookmarks}/${storeContent.syncId}`;
              const requestBody: ApiUpdateBookmarksRequest = {
                bookmarks: encryptedBookmarks,
                lastUpdated: storeContent.lastUpdated
              };

              // If updating sync version, set as current app version
              if (updateSyncVersion) {
                requestBody.version = Globals.AppVersion;
              }

              return this.$http
                .put<ApiUpdateBookmarksResponse>(requestUrl, JSON.stringify(requestBody))
                .catch((response) => {
                  throw this.getExceptionFromHttpResponse(response);
                });
            })
            .then(this.apiRequestSucceeded)
            .then((response) => {
              // Check response data is valid before returning
              const { data } = response;
              if (!data || !data.lastUpdated) {
                throw new Exceptions.NoDataFoundException();
              }
              return data;
            });
        });
      })
      .catch((err) => {
        if (err instanceof Exceptions.InvalidServiceException) {
          throw new Exceptions.ServiceOfflineException();
        }
        throw err;
      });
  }
}
