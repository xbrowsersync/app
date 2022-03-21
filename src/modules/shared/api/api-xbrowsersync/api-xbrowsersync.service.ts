import angular from 'angular';
import { Injectable } from 'angular-ts-decorators';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import {
  BaseError,
  DailyNewSyncLimitReachedError,
  DataOutOfSyncError,
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
  ApiUpdateBookmarksRequest,
  ApiUpdateBookmarksResponse
} from '../api.interface';
import { ApiXbrowsersyncResource } from './api-xbrowsersync.enum';
import {
  ApiXbrowsersyncErrorResponse,
  ApiXbrowsersyncServiceInfo,
  ApiXbrowsersyncServiceInfoResponse,
  ApiXbrowsersyncSyncInfo
} from './api-xbrowsersync.interface';

@Injectable('ApiXbrowsersyncService')
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

  checkServiceStatus(url?: string): ng.IPromise<ApiXbrowsersyncServiceInfoResponse> {
    return this.checkNetworkConnection().then(() => {
      // Get current service url if not provided
      return (!url ? this.getServiceUrl() : this.$q.resolve(url))
        .then((serviceUrl) => {
          // Request service info
          const requestConfig: ng.IRequestConfig = {
            method: 'GET',
            url: `${serviceUrl}/${ApiXbrowsersyncResource.ServiceInformation}`,
            timeout: 3000
          };
          return this.$http<ApiXbrowsersyncServiceInfoResponse>(requestConfig).catch((err) =>
            this.handleFailedRequest(err)
          );
        })
        .then((response) => this.apiRequestSucceeded(response))
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
          .all([this.platformSvc.getAppVersion(), this.getServiceUrl()])
          .then((data) => {
            const [appVersion, serviceUrl] = data;
            const requestUrl = `${serviceUrl}/${ApiXbrowsersyncResource.Bookmarks}`;
            const requestBody: ApiCreateBookmarksRequest = {
              version: appVersion
            };
            return this.$http
              .post<ApiCreateBookmarksResponse>(requestUrl, JSON.stringify(requestBody))
              .catch((err) => this.handleFailedRequest(err));
          })
          .then((response) => this.apiRequestSucceeded(response))
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
    // Ensure sync credentials
    return this.utilitySvc
      .checkSyncCredentialsExist()
      .then((syncInfo) => {
        const requestUrl = `${(syncInfo as ApiXbrowsersyncSyncInfo).serviceUrl}/${ApiXbrowsersyncResource.Bookmarks}/${
          syncInfo.id
        }`;
        return this.$http.get<ApiGetBookmarksResponse>(requestUrl).catch((err) => this.handleFailedRequest(err));
      })
      .then((response) => this.apiRequestSucceeded(response))
      .then((response) => {
        // Check response data is valid before returning
        const { data } = response;
        if (!data?.lastUpdated) {
          throw new UnexpectedResponseDataError();
        }
        return data;
      })
      .catch((err) => {
        if (err instanceof InvalidServiceError) {
          throw new ServiceOfflineError();
        }
        throw err;
      });
  }

  getBookmarksLastUpdated(skipNetworkConnectionCheck = false): ng.IPromise<ApiGetLastUpdatedResponse> {
    // Ensure sync credentials
    return this.utilitySvc
      .checkSyncCredentialsExist()
      .then((syncInfo) => {
        return (skipNetworkConnectionCheck ? this.$q.resolve() : this.checkNetworkConnection()).then(() => {
          return this.$q
            .resolve()
            .then(() => {
              const requestUrl = `${(syncInfo as ApiXbrowsersyncSyncInfo).serviceUrl}/${
                ApiXbrowsersyncResource.Bookmarks
              }/${syncInfo.id}/${ApiXbrowsersyncResource.LastUpdated}`;
              return this.$http
                .get<ApiGetLastUpdatedResponse>(requestUrl)
                .catch((err) => this.handleFailedRequest(err));
            })
            .then((response) => this.apiRequestSucceeded(response))
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

  getServiceUrl(): ng.IPromise<string> {
    // Get service url from store
    return this.storeSvc.get<ApiXbrowsersyncSyncInfo>(StoreKey.SyncInfo).then((syncInfo) => syncInfo?.serviceUrl);
  }

  getSyncVersion(syncId: string): ng.IPromise<ApiGetSyncVersionResponse> {
    return this.checkNetworkConnection()
      .then(() => {
        // Get current service url
        return this.getServiceUrl()
          .then((serviceUrl) => {
            const requestUrl = `${serviceUrl}/${ApiXbrowsersyncResource.Bookmarks}/${syncId}/${ApiXbrowsersyncResource.Version}`;
            return this.$http.get<ApiGetSyncVersionResponse>(requestUrl).catch((err) => this.handleFailedRequest(err));
          })
          .then((response) => this.apiRequestSucceeded(response))
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
      default:
        error = this.networkSvc.getErrorFromHttpResponse(response);
    }
    return error;
  }

  handleFailedRequest(response: ng.IHttpResponse<ApiXbrowsersyncErrorResponse>): never {
    throw this.getErrorFromHttpResponse(response);
  }

  formatServiceInfo(serviceInfoResponse?: ApiXbrowsersyncServiceInfoResponse): ApiXbrowsersyncServiceInfo {
    if (!serviceInfoResponse) {
      return;
    }

    // Render markdown and add link classes to service message
    let message = serviceInfoResponse.message ? marked(serviceInfoResponse.message) : '';
    if (message) {
      const messageDom = new DOMParser().parseFromString(message, 'text/html');
      messageDom.querySelectorAll('a').forEach((hyperlink) => {
        hyperlink.className = 'new-tab';
      });
      message = DOMPurify.sanitize(messageDom.body.firstElementChild.innerHTML);
    }

    return {
      location: serviceInfoResponse.location,
      maxSyncSize: serviceInfoResponse.maxSyncSize / 1024,
      message,
      status: serviceInfoResponse.status,
      version: serviceInfoResponse.version
    };
  }

  updateBookmarks(
    encryptedBookmarks: string,
    updateSyncVersion = false,
    skipNetworkConnectionCheck = false
  ): ng.IPromise<ApiUpdateBookmarksResponse> {
    // Ensure sync credentials
    return this.$q
      .all([this.utilitySvc.checkSyncCredentialsExist(), this.storeSvc.get<string>(StoreKey.LastUpdated)])
      .then((data) => {
        const [syncInfo, lastUpdated] = data;
        return (skipNetworkConnectionCheck ? this.$q.resolve() : this.checkNetworkConnection()).then(() => {
          return this.platformSvc
            .getAppVersion()
            .then((appVersion) => {
              const requestUrl = `${(syncInfo as ApiXbrowsersyncSyncInfo).serviceUrl}/${
                ApiXbrowsersyncResource.Bookmarks
              }/${syncInfo.id}`;
              const requestBody: ApiUpdateBookmarksRequest = {
                bookmarks: encryptedBookmarks,
                lastUpdated
              };

              // If updating sync version, set as current app version
              if (updateSyncVersion) {
                requestBody.version = appVersion;
              }

              return this.$http
                .put<ApiUpdateBookmarksResponse>(requestUrl, JSON.stringify(requestBody))
                .catch((err) => this.handleFailedRequest(err));
            })
            .then((response) => this.apiRequestSucceeded(response))
            .then((response) => {
              // Check response data is valid before returning
              const { data: responseData } = response;
              if (!responseData?.lastUpdated) {
                throw new UnexpectedResponseDataError();
              }
              return responseData;
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
