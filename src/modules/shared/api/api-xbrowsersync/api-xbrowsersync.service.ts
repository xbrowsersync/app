import angular from 'angular';
import { Injectable } from 'angular-ts-decorators';
import autobind from 'autobind-decorator';
import {
  BaseError,
  ClientDataNotFoundError,
  DailyNewSyncLimitReachedError,
  DataOutOfSyncError,
  HttpRequestAbortedError,
  HttpRequestFailedError,
  HttpRequestTimedOutError,
  InvalidServiceError,
  NetworkConnectionError,
  NotAcceptingNewSyncsError,
  RequestEntityTooLargeError,
  ServiceOfflineError,
  SyncNotFoundError,
  TooManyRequestsError,
  UnexpectedResponseDataError,
  UnsupportedApiVersionError
} from '../../errors/errors';
import Globals from '../../global-shared.constants';
import { PlatformService } from '../../global-shared.interface';
import { NetworkService } from '../../network/network.service';
import { StoreKey } from '../../store/store.enum';
import { StoreService } from '../../store/store.service';
import { UtilityService } from '../../utility/utility.service';
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
export class ApiXbrowsersyncService implements ApiService {
  $injector: ng.auto.IInjectorService;
  $http: ng.IHttpService;
  $q: ng.IQService;
  networkSvc: NetworkService;
  _platformSvc: PlatformService | undefined;
  storeSvc: StoreService;
  utilitySvc: UtilityService;

  static $inject = ['$injector', '$http', '$q', 'NetworkService', 'StoreService', 'UtilityService'];
  constructor(
    $injector: ng.auto.IInjectorService,
    $http: ng.IHttpService,
    $q: ng.IQService,
    NetworkSvc: NetworkService,
    StoreSvc: StoreService,
    UtilitySvc: UtilityService
  ) {
    this.$injector = $injector;
    this.$http = $http;
    this.$q = $q;
    this.networkSvc = NetworkSvc;
    this.storeSvc = StoreSvc;
    this.utilitySvc = UtilitySvc;
  }

  get platformSvc(): PlatformService {
    if (angular.isUndefined(this._platformSvc)) {
      this._platformSvc = this.$injector.get('PlatformService');
    }
    return this._platformSvc as PlatformService;
  }

  apiRequestSucceeded<T>(response: T): ng.IPromise<T> {
    return this.$q.resolve(response);
  }

  checkNetworkConnection(): ng.IPromise<void> {
    return this.$q((resolve, reject) => {
      if (this.networkSvc.isNetworkConnected()) {
        return resolve();
      }
      reject(new NetworkConnectionError());
    });
  }

  checkServiceStatus(url?: string): ng.IPromise<ApiServiceInfoResponse> {
    return this.checkNetworkConnection().then(() => {
      // Get current service url if not provided
      return (!url ? this.utilitySvc.getServiceUrl() : this.$q.resolve(url))
        .then((serviceUrl) => {
          // Request service info
          const requestConfig: ng.IRequestConfig = {
            method: 'GET',
            url: `${serviceUrl}/${ApiXbrowsersyncResource.ServiceInformation}`,
            timeout: 3000
          };
          return this.$http<ApiXbrowsersyncServiceInfoResponse>(requestConfig).catch(this.handleFailedRequest);
        })
        .then(this.apiRequestSucceeded)
        .then((response) => {
          // Check service is a valid xBrowserSync API
          const { data: serviceInfo } = response;
          if (!serviceInfo?.status || !serviceInfo?.version) {
            throw new InvalidServiceError();
          }

          // Check service version is supported by this client
          if (this.utilitySvc.compareVersions(serviceInfo.version, Globals.MinApiVersion, '<')) {
            throw new UnsupportedApiVersionError();
          }

          return serviceInfo;
        });
    });
  }

  createNewSync(): ng.IPromise<ApiCreateBookmarksResponse> {
    return this.checkNetworkConnection()
      .then(() => {
        return this.$q
          .all([this.platformSvc.getAppVersion(), this.utilitySvc.getServiceUrl()])
          .then((data) => {
            const [appVersion, serviceUrl] = data;
            const requestUrl = `${serviceUrl}/${ApiXbrowsersyncResource.Bookmarks}`;
            const requestBody: ApiCreateBookmarksRequest = {
              version: appVersion
            };
            return this.$http
              .post<ApiCreateBookmarksResponse>(requestUrl, JSON.stringify(requestBody))
              .catch(this.handleFailedRequest);
          })
          .then(this.apiRequestSucceeded)
          .then((response) => {
            // Check response data is valid before returning
            const { data } = response;
            if (!data?.id || !data?.lastUpdated || !data?.version) {
              throw new UnexpectedResponseDataError();
            }
            return data;
          });
      })
      .catch((err) => {
        if (err instanceof InvalidServiceError) {
          throw new ServiceOfflineError();
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
          throw new ClientDataNotFoundError();
        }

        return this.checkNetworkConnection().then(() => {
          // Get current service url
          return this.utilitySvc
            .getServiceUrl()
            .then((serviceUrl) => {
              const requestUrl = `${serviceUrl}/${ApiXbrowsersyncResource.Bookmarks}/${storeContent.syncId}`;
              return this.$http.get<ApiGetBookmarksResponse>(requestUrl).catch(this.handleFailedRequest);
            })
            .then(this.apiRequestSucceeded)
            .then((response) => {
              // Check response data is valid before returning
              const { data } = response;
              if (!data?.lastUpdated) {
                throw new UnexpectedResponseDataError();
              }
              return data;
            });
        });
      })
      .catch((err) => {
        if (err instanceof InvalidServiceError) {
          throw new ServiceOfflineError();
        }
        throw err;
      });
  }

  getBookmarksLastUpdated(skipNetworkConnectionCheck = false): ng.IPromise<ApiGetLastUpdatedResponse> {
    // Check secret and sync ID are present
    return this.storeSvc
      .get([StoreKey.Password, StoreKey.SyncId])
      .then((storeContent) => {
        if (!storeContent.password || !storeContent.syncId) {
          throw new ClientDataNotFoundError();
        }

        return (skipNetworkConnectionCheck ? this.$q.resolve() : this.checkNetworkConnection()).then(() => {
          // Get current service url
          return this.utilitySvc
            .getServiceUrl()
            .then((serviceUrl) => {
              const requestUrl = `${serviceUrl}/${ApiXbrowsersyncResource.Bookmarks}/${storeContent.syncId}/${ApiXbrowsersyncResource.LastUpdated}`;
              return this.$http.get<ApiGetLastUpdatedResponse>(requestUrl).catch(this.handleFailedRequest);
            })
            .then(this.apiRequestSucceeded)
            .then((response) => {
              // Check response data is valid before returning
              const { data } = response;
              if (!data?.lastUpdated) {
                throw new UnexpectedResponseDataError();
              }
              return data;
            });
        });
      })
      .catch((err) => {
        if (err instanceof InvalidServiceError) {
          throw new ServiceOfflineError();
        }
        throw err;
      });
  }

  getBookmarksVersion(syncId: string): ng.IPromise<ApiGetSyncVersionResponse> {
    return this.checkNetworkConnection()
      .then(() => {
        // Get current service url
        return this.utilitySvc
          .getServiceUrl()
          .then((serviceUrl) => {
            const requestUrl = `${serviceUrl}/${ApiXbrowsersyncResource.Bookmarks}/${syncId}/${ApiXbrowsersyncResource.Version}`;
            return this.$http.get<ApiGetSyncVersionResponse>(requestUrl).catch(this.handleFailedRequest);
          })
          .then(this.apiRequestSucceeded)
          .then((response) => {
            // Check response data is valid before returning
            const { data: version } = response;
            if (!version) {
              throw new UnexpectedResponseDataError();
            }
            return version;
          });
      })
      .catch((err) => {
        if (err instanceof InvalidServiceError) {
          throw new ServiceOfflineError();
        }
        throw err;
      });
  }

  getErrorFromHttpResponse(response: ng.IHttpResponse<ApiXbrowsersyncErrorResponse>): BaseError {
    let error: BaseError;
    const message = response.data?.message;
    switch (true) {
      // 401 Unauthorized: sync data not found
      case response.status === 401:
        error = new SyncNotFoundError(message);
        break;
      // 404 Not Found: invalid service
      case response.status === 404:
        error = new InvalidServiceError(message);
        break;
      // 405 Method Not Allowed: service not accepting new syncs
      case response.status === 405:
        error = new NotAcceptingNewSyncsError(message);
        break;
      // 406 Not Acceptable: daily new sync limit reached
      case response.status === 406:
        error = new DailyNewSyncLimitReachedError(message);
        break;
      // 409 Conflict: sync update conflict
      case response.status === 409:
        error = new DataOutOfSyncError(message);
        break;
      // 413 Request Entity Too Large: sync data size exceeds service limit
      case response.status === 413:
        error = new RequestEntityTooLargeError(message);
        break;
      // 429 Too Many Requests: daily new sync limit reached
      case response.status === 429:
        error = new TooManyRequestsError(message);
        break;
      // 500 server error responses
      case response.status >= 500:
        error = new ServiceOfflineError(message);
        break;
      // Request timed out
      case response.xhrStatus === 'timeout':
        error = new HttpRequestTimedOutError();
        break;
      // Request timed out
      case response.xhrStatus === 'abort':
        error = new HttpRequestAbortedError();
        break;
      // Otherwise generic request failed
      default:
        error = new HttpRequestFailedError(message);
    }
    return error;
  }

  handleFailedRequest(response: ng.IHttpResponse<ApiXbrowsersyncErrorResponse>): never {
    throw this.getErrorFromHttpResponse(response);
  }

  updateBookmarks(
    encryptedBookmarks: string,
    updateSyncVersion = false,
    skipNetworkConnectionCheck = false
  ): ng.IPromise<ApiUpdateBookmarksResponse> {
    // Check secret and sync ID are present
    return this.storeSvc
      .get([StoreKey.LastUpdated, StoreKey.Password, StoreKey.SyncId])
      .then((storeContent) => {
        if (!storeContent.lastUpdated || !storeContent.password || !storeContent.syncId) {
          throw new ClientDataNotFoundError();
        }

        return (skipNetworkConnectionCheck ? this.$q.resolve() : this.checkNetworkConnection()).then(() => {
          return this.$q
            .all([this.platformSvc.getAppVersion(), this.utilitySvc.getServiceUrl()])
            .then((data) => {
              const [appVersion, serviceUrl] = data;
              const requestUrl = `${serviceUrl}/${ApiXbrowsersyncResource.Bookmarks}/${storeContent.syncId}`;
              const requestBody: ApiUpdateBookmarksRequest = {
                bookmarks: encryptedBookmarks,
                lastUpdated: storeContent.lastUpdated
              };

              // If updating sync version, set as current app version
              if (updateSyncVersion) {
                requestBody.version = appVersion;
              }

              return this.$http
                .put<ApiUpdateBookmarksResponse>(requestUrl, JSON.stringify(requestBody))
                .catch(this.handleFailedRequest);
            })
            .then(this.apiRequestSucceeded)
            .then((response) => {
              // Check response data is valid before returning
              const { data } = response;
              if (!data?.lastUpdated) {
                throw new UnexpectedResponseDataError();
              }
              return data;
            });
        });
      })
      .catch((err) => {
        if (err instanceof InvalidServiceError) {
          throw new ServiceOfflineError();
        }
        throw err;
      });
  }
}
