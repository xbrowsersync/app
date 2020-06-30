/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/explicit-function-return-type */

import { Injectable } from 'angular-ts-decorators';
import compareVersions from 'compare-versions';
import { autobind } from 'core-decorators';
import * as Exceptions from '../exceptions/exception';
import Globals from '../globals';
import NetworkService from '../network/network.service';
import StoreService from '../store/store.service';
import StoreKey from '../store/store-key.enum';
import UtilityService from '../utility/utility.service';

@autobind
@Injectable('ApiService')
export default class ApiService {
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

  apiRequestSucceeded(response) {
    this.skipOnlineCheck = false;
    return this.$q.resolve(response);
  }

  checkNetworkIsOnline() {
    return this.$q((resolve, reject) => {
      if (this.skipOnlineCheck || this.networkSvc.isNetworkConnected()) {
        return resolve();
      }
      return reject(new Exceptions.NetworkOfflineException());
    });
  }

  checkServiceStatus(url?) {
    let data;

    return this.checkNetworkIsOnline().then(() => {
      // Get current service url if not provided
      return (!url ? this.utilitySvc.getServiceUrl() : this.$q.resolve(url))
        .then((serviceUrl) => {
          // Request service info
          return this.$http({
            method: 'GET',
            url: serviceUrl + Globals.URL.ServiceInformation,
            timeout: 3000
          }).catch((response) => {
            throw this.getExceptionFromHttpResponse(response);
          });
        })
        .then(this.apiRequestSucceeded)
        .then((response) => {
          data = response.data;

          // Check service is a valid xBrowserSync API
          if (!data || data.status == null || data.version == null) {
            throw new Exceptions.InvalidServiceException();
          }

          // Check service version is supported by this client
          if (compareVersions.compare(data.version, Globals.MinApiVersion, '<')) {
            throw new Exceptions.UnsupportedApiVersionException();
          }

          return data;
        });
    });
  }

  createNewSync() {
    return this.checkNetworkIsOnline()
      .then(() => {
        return this.utilitySvc
          .getServiceUrl()
          .then((serviceUrl) => {
            const data = {
              version: Globals.AppVersion
            };

            return this.$http.post(serviceUrl + Globals.URL.Bookmarks, JSON.stringify(data)).catch((response) => {
              throw this.getExceptionFromHttpResponse(response);
            });
          })
          .then(this.apiRequestSucceeded)
          .then((response) => {
            const { data } = response as any;

            // Check response data is valid before returning
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

  getBookmarks() {
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
              return this.$http
                .get(`${serviceUrl + Globals.URL.Bookmarks}/${storeContent.syncId}`)
                .catch((response) => {
                  throw this.getExceptionFromHttpResponse(response);
                });
            })
            .then(this.apiRequestSucceeded)
            .then((response) => {
              const { data } = response;

              // Check response data is valid before returning
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

  getBookmarksLastUpdated() {
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
              return this.$http
                .get(`${serviceUrl + Globals.URL.Bookmarks}/${storeContent.syncId}${Globals.URL.LastUpdated}`)
                .catch((response) => {
                  throw this.getExceptionFromHttpResponse(response);
                });
            })
            .then(this.apiRequestSucceeded)
            .then((response) => {
              const { data } = response;

              // Check response data is valid before returning
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

  getBookmarksVersion(syncId) {
    return this.checkNetworkIsOnline()
      .then(() => {
        // Get current service url
        return this.utilitySvc
          .getServiceUrl()
          .then((serviceUrl) => {
            return this.$http
              .get(`${serviceUrl + Globals.URL.Bookmarks}/${syncId}${Globals.URL.Version}`)
              .catch((response) => {
                throw this.getExceptionFromHttpResponse(response);
              });
          })
          .then(this.apiRequestSucceeded)
          .then((response) => {
            const { data } = response;

            // Check response data is valid before returning
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

  getExceptionFromHttpResponse(response) {
    let message;
    if (response && response.data && response.data.message) {
      message = response.data.message;
    }

    let exception;
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

  updateBookmarks(encryptedBookmarks, updateSyncVersion?, backgroundUpdate?) {
    // Check secret and sync ID are present
    return this.storeSvc
      .get([StoreKey.LastUpdated, StoreKey.Password, StoreKey.SyncId])
      .then((storeContent) => {
        if (!storeContent.lastUpdated || !storeContent.password || !storeContent.syncId) {
          throw new Exceptions.MissingClientDataException();
        }

        // If this is a background update, ensure online check is skipped until successfull request
        this.skipOnlineCheck = !!backgroundUpdate;
        return this.checkNetworkIsOnline().then(() => {
          // Get current service url
          return this.utilitySvc
            .getServiceUrl()
            .then((serviceUrl) => {
              const data = {
                bookmarks: encryptedBookmarks,
                lastUpdated: storeContent.lastUpdated,
                version: undefined
              };

              // If updating sync version, set as current app version
              if (updateSyncVersion) {
                data.version = Globals.AppVersion;
              }

              return this.$http
                .put(`${serviceUrl + Globals.URL.Bookmarks}/${storeContent.syncId}`, JSON.stringify(data))
                .catch((response) => {
                  throw this.getExceptionFromHttpResponse(response);
                });
            })
            .then(this.apiRequestSucceeded)
            .then((response) => {
              const { data } = response;

              // Check response data is valid before returning
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
