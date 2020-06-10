/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/explicit-function-return-type */

import { Injectable } from 'angular-ts-decorators';
import compareVersions from 'compare-versions';
import _ from 'underscore';
import { autobind } from 'core-decorators';
import Globals from './globals';
import StoreService from './store.service';
import UtilityService from './utility.service';

@autobind
@Injectable('ApiService')
export default class ApiService {
  $http: ng.IHttpService;
  $q: ng.IQService;
  storeSvc: StoreService;
  utilitySvc: UtilityService;

  skipOnlineCheck = false;

  static $inject = ['$http', '$q', 'StoreService', 'UtilityService'];
  constructor($http: ng.IHttpService, $q: ng.IQService, StoreSvc: StoreService, UtilitySvc: UtilityService) {
    this.$http = $http;
    this.$q = $q;
    this.storeSvc = StoreSvc;
    this.utilitySvc = UtilitySvc;
  }

  apiRequestFailed(err, invalidServiceIsServiceOffline?) {
    this.utilitySvc.logError(err);

    // Get error code from code name in error message
    const codeName = err.message.match(/\w+$/)[0];
    err.code = Globals.ErrorCodes[codeName];

    // If 404 response, service is likely offline
    if (invalidServiceIsServiceOffline && err.code === Globals.ErrorCodes.InvalidService) {
      err.code = Globals.ErrorCodes.ServiceOffline;
    }

    throw err;
  }

  apiRequestSucceeded(response) {
    this.skipOnlineCheck = false;
    return this.$q.resolve(response);
  }

  checkNetworkIsOnline() {
    return this.$q((resolve, reject) => {
      if (this.skipOnlineCheck || this.utilitySvc.isNetworkConnected()) {
        return resolve();
      }

      this.utilitySvc.logWarning('API request failed: network offline');
      return reject({ code: Globals.ErrorCodes.NetworkOffline });
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
            this.apiRequestFailed(new Error(this.getHttpErrorMessageFromHttpStatus(response.status)));
          });
        })
        .then(this.apiRequestSucceeded)
        .then((response) => {
          data = response.data;

          // Check service is a valid xBrowserSync API
          if (!data || data.status == null || data.version == null) {
            this.apiRequestFailed(new Error(this.getHttpErrorMessageFromErrorCode(Globals.ErrorCodes.InvalidService)));
          }

          // Check service version is supported by this client
          if (compareVersions.compare(data.version, Globals.MinApiVersion, '<')) {
            this.apiRequestFailed(
              new Error(this.getHttpErrorMessageFromErrorCode(Globals.ErrorCodes.UnsupportedServiceApiVersion))
            );
          }

          return data;
        });
    });
  }

  createNewSync() {
    return this.checkNetworkIsOnline().then(() => {
      return this.utilitySvc
        .getServiceUrl()
        .then((serviceUrl) => {
          const data = {
            version: Globals.AppVersion
          };

          return this.$http.post(serviceUrl + Globals.URL.Bookmarks, JSON.stringify(data)).catch((response) => {
            this.apiRequestFailed(new Error(this.getHttpErrorMessageFromHttpStatus(response.status)), true);
          });
        })
        .then(this.apiRequestSucceeded)
        .then((response) => {
          const { data } = response as any;

          // Check response data is valid before returning
          if (!data || !data.id || !data.lastUpdated || !data.version) {
            this.apiRequestFailed(new Error(this.getHttpErrorMessageFromErrorCode(Globals.ErrorCodes.NoDataFound)));
          }

          return data;
        });
    });
  }

  getBookmarks() {
    let password;
    let syncId;

    // Check secret and sync ID are present
    return this.storeSvc.get([Globals.CacheKeys.Password, Globals.CacheKeys.SyncId]).then((cachedData) => {
      password = cachedData[Globals.CacheKeys.Password];
      syncId = cachedData[Globals.CacheKeys.SyncId];

      if (!password || !syncId) {
        return this.$q.reject({ code: Globals.ErrorCodes.MissingClientData });
      }

      return this.checkNetworkIsOnline().then(() => {
        // Get current service url
        return this.utilitySvc
          .getServiceUrl()
          .then((serviceUrl) => {
            return this.$http.get(`${serviceUrl + Globals.URL.Bookmarks}/${syncId}`).catch((response) => {
              this.apiRequestFailed(new Error(this.getHttpErrorMessageFromHttpStatus(response.status)), true);
            });
          })
          .then(this.apiRequestSucceeded)
          .then((response) => {
            const { data } = response;

            // Check response data is valid before returning
            if (!data || !data.lastUpdated) {
              this.apiRequestFailed(new Error(this.getHttpErrorMessageFromErrorCode(Globals.ErrorCodes.NoDataFound)));
            }

            return data;
          });
      });
    });
  }

  getBookmarksLastUpdated() {
    let password;
    let syncId;

    // Check secret and sync ID are present
    return this.storeSvc.get([Globals.CacheKeys.Password, Globals.CacheKeys.SyncId]).then((cachedData) => {
      password = cachedData[Globals.CacheKeys.Password];
      syncId = cachedData[Globals.CacheKeys.SyncId];

      if (!password || !syncId) {
        return this.$q.reject({ code: Globals.ErrorCodes.MissingClientData });
      }

      return this.checkNetworkIsOnline().then(() => {
        // Get current service url
        return this.utilitySvc
          .getServiceUrl()
          .then((serviceUrl) => {
            return this.$http
              .get(`${serviceUrl + Globals.URL.Bookmarks}/${syncId}${Globals.URL.LastUpdated}`)
              .catch((response) => {
                this.apiRequestFailed(new Error(this.getHttpErrorMessageFromHttpStatus(response.status)), true);
              });
          })
          .then(this.apiRequestSucceeded)
          .then((response) => {
            const { data } = response;

            // Check response data is valid before returning
            if (!data || !data.lastUpdated) {
              this.apiRequestFailed(new Error(this.getHttpErrorMessageFromErrorCode(Globals.ErrorCodes.NoDataFound)));
            }

            return data;
          });
      });
    });
  }

  getBookmarksVersion(syncId) {
    return this.checkNetworkIsOnline().then(() => {
      // Get current service url
      return this.utilitySvc
        .getServiceUrl()
        .then((serviceUrl) => {
          return this.$http
            .get(`${serviceUrl + Globals.URL.Bookmarks}/${syncId}${Globals.URL.Version}`)
            .catch((response) => {
              this.apiRequestFailed(new Error(this.getHttpErrorMessageFromHttpStatus(response.status)), true);
            });
        })
        .then(this.apiRequestSucceeded)
        .then((response) => {
          const { data } = response;

          // Check response data is valid before returning
          if (!data) {
            this.apiRequestFailed(new Error(this.getHttpErrorMessageFromErrorCode(Globals.ErrorCodes.NoDataFound)));
          }

          return data;
        });
    });
  }

  getErrorCodeFromHttpStatus(httpStatus) {
    let errorCode;
    switch (httpStatus) {
      // 401 Unauthorized: sync data not found
      case 401:
        errorCode = Globals.ErrorCodes.NoDataFound;
        break;
      // 404 Not Found: service offline or not an xBrowserSync service
      case 404:
        errorCode = Globals.ErrorCodes.InvalidService;
        break;
      // 405 Method Not Allowed: service not accepting new syncs
      case 405:
        errorCode = Globals.ErrorCodes.NotAcceptingNewSyncs;
        break;
      // 406 Not Acceptable: daily new sync limit reached
      case 406:
        errorCode = Globals.ErrorCodes.DailyNewSyncLimitReached;
        break;
      // 409 Conflict: sync update conflict
      case 409:
        errorCode = Globals.ErrorCodes.DataOutOfSync;
        break;
      // 413 Request Entity Too Large: sync data size exceeds service limit
      case 413:
        errorCode = Globals.ErrorCodes.RequestEntityTooLarge;
        break;
      // 429 Too Many Requests: daily new sync limit reached
      case 429:
        errorCode = Globals.ErrorCodes.TooManyRequests;
        break;
      // 503 Service Unavailable: service offline
      case 503:
        errorCode = Globals.ErrorCodes.ServiceOffline;
        break;
      // -1: No network connection
      case -1:
        errorCode = Globals.ErrorCodes.HttpRequestFailed;
        break;
      // Otherwise generic request failed
      default:
        errorCode = Globals.ErrorCodes.HttpRequestFailed;
    }

    return errorCode;
  }

  getHttpErrorMessageFromErrorCode(errorCode) {
    const codeName = _.findKey(Globals.ErrorCodes, (key) => {
      return key === errorCode;
    });
    const message = `[${errorCode}] ${codeName}`;
    return message;
  }

  getHttpErrorMessageFromHttpStatus(httpStatus) {
    const errorCode = this.getErrorCodeFromHttpStatus(httpStatus);
    return this.getHttpErrorMessageFromErrorCode(errorCode);
  }

  updateBookmarks(encryptedBookmarks, updateSyncVersion?, backgroundUpdate?) {
    // Check secret and sync ID are present
    return this.storeSvc
      .get([Globals.CacheKeys.LastUpdated, Globals.CacheKeys.Password, Globals.CacheKeys.SyncId])
      .then((cachedData) => {
        const cachedLastUpdated = cachedData[Globals.CacheKeys.LastUpdated];
        const password = cachedData[Globals.CacheKeys.Password];
        const syncId = cachedData[Globals.CacheKeys.SyncId];

        if (!cachedLastUpdated || !password || !syncId) {
          return this.$q.reject({ code: Globals.ErrorCodes.MissingClientData });
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
                lastUpdated: cachedLastUpdated,
                version: undefined
              };

              // If updating sync version, set as current app version
              if (updateSyncVersion) {
                data.version = Globals.AppVersion;
              }

              return this.$http
                .put(`${serviceUrl + Globals.URL.Bookmarks}/${syncId}`, JSON.stringify(data))
                .catch((response) => {
                  this.apiRequestFailed(new Error(this.getHttpErrorMessageFromHttpStatus(response.status)), true);
                });
            })
            .then(this.apiRequestSucceeded)
            .then((response) => {
              const { data } = response;

              // Check response data is valid before returning
              if (!data || !data.lastUpdated) {
                this.apiRequestFailed(new Error(this.getHttpErrorMessageFromErrorCode(Globals.ErrorCodes.NoDataFound)));
              }

              return data;
            });
        });
      });
  }
}
