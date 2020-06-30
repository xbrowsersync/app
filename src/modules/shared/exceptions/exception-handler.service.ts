/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

import angular from 'angular';
import { autobind } from 'core-decorators';
import { Injectable } from 'angular-ts-decorators';
import Alert from '../alert/alert.interface';
import AlertService from '../alert/alert.service';
import AlertType from '../alert/alert-type.enum';
import * as Exceptions from './exception';
import PlatformService from '../../../interfaces/platform-service.interface';
import LogService from '../log/log.service';
import Strings from '../../../../res/strings/en.json';

@autobind
@Injectable('ExceptionHandler')
export default class ExceptionHandlerService {
  $injector: ng.auto.IInjectorService;
  alertSvc: AlertService;
  logSvc: LogService;
  _platformSvc: PlatformService;

  static $inject = ['$injector', 'AlertService', 'LogService'];
  constructor($injector: ng.auto.IInjectorService, AlertSvc: AlertService, LogSvc: LogService) {
    this.$injector = $injector;
    this.alertSvc = AlertSvc;
    this.logSvc = LogSvc;
  }

  get platformSvc(): PlatformService {
    if (angular.isUndefined(this._platformSvc)) {
      this._platformSvc = this.$injector.get('PlatformService');
    }
    return this._platformSvc;
  }

  getAlertFromException(exception: Exceptions.Exception): Alert {
    const alertMessage: Alert = {
      message: '',
      title: '',
      type: AlertType.Error
    };

    switch (exception.constructor) {
      case Exceptions.NetworkOfflineException:
      case Exceptions.HttpRequestFailedException:
        alertMessage.title = this.platformSvc.getConstant(Strings.error_HttpRequestFailed_Title);
        alertMessage.message = this.platformSvc.getConstant(Strings.error_HttpRequestFailed_Message);
        break;
      case Exceptions.TooManyRequestsException:
        alertMessage.title = this.platformSvc.getConstant(Strings.error_TooManyRequests_Title);
        alertMessage.message = this.platformSvc.getConstant(Strings.error_TooManyRequests_Message);
        break;
      case Exceptions.RequestEntityTooLargeException:
        alertMessage.title = this.platformSvc.getConstant(Strings.error_RequestEntityTooLarge_Title);
        alertMessage.message = this.platformSvc.getConstant(Strings.error_RequestEntityTooLarge_Message);
        break;
      case Exceptions.NotAcceptingNewSyncsException:
        alertMessage.title = this.platformSvc.getConstant(Strings.error_NotAcceptingNewSyncs_Title);
        alertMessage.message = this.platformSvc.getConstant(Strings.error_NotAcceptingNewSyncs_Message);
        break;
      case Exceptions.DailyNewSyncLimitReachedException:
        alertMessage.title = this.platformSvc.getConstant(Strings.error_DailyNewSyncLimitReached_Title);
        alertMessage.message = this.platformSvc.getConstant(Strings.error_DailyNewSyncLimitReached_Message);
        break;
      case Exceptions.MissingClientDataException:
        alertMessage.title = this.platformSvc.getConstant(Strings.error_MissingClientData_Title);
        alertMessage.message = this.platformSvc.getConstant(Strings.error_MissingClientData_Message);
        break;
      case Exceptions.NoDataFoundException:
        alertMessage.title = this.platformSvc.getConstant(Strings.error_InvalidCredentials_Title);
        alertMessage.message = this.platformSvc.getConstant(Strings.error_InvalidCredentials_Message);
        break;
      case Exceptions.SyncRemovedException:
        alertMessage.title = this.platformSvc.getConstant(Strings.error_SyncRemoved_Title);
        alertMessage.message = this.platformSvc.getConstant(Strings.error_SyncRemoved_Message);
        break;
      case Exceptions.InvalidCredentialsException:
        alertMessage.title = this.platformSvc.getConstant(Strings.error_InvalidCredentials_Title);
        alertMessage.message = this.platformSvc.getConstant(Strings.error_InvalidCredentials_Message);
        break;
      case Exceptions.ContainerChangedException:
        alertMessage.title = this.platformSvc.getConstant(Strings.error_ContainerChanged_Title);
        alertMessage.message = this.platformSvc.getConstant(Strings.error_ContainerChanged_Message);
        break;
      case Exceptions.LocalContainerNotFoundException:
        alertMessage.title = this.platformSvc.getConstant(Strings.error_LocalContainerNotFound_Title);
        alertMessage.message = this.platformSvc.getConstant(Strings.error_LocalContainerNotFound_Message);
        break;
      case Exceptions.DataOutOfSyncException:
        alertMessage.title = this.platformSvc.getConstant(Strings.error_OutOfSync_Title);
        alertMessage.message = this.platformSvc.getConstant(Strings.error_OutOfSync_Message);
        break;
      case Exceptions.InvalidServiceException:
        alertMessage.title = this.platformSvc.getConstant(Strings.error_InvalidService_Title);
        alertMessage.message = this.platformSvc.getConstant(Strings.error_InvalidService_Message);
        break;
      case Exceptions.ServiceOfflineException:
        alertMessage.title = this.platformSvc.getConstant(Strings.error_ServiceOffline_Title);
        alertMessage.message = this.platformSvc.getConstant(Strings.error_ServiceOffline_Message);
        break;
      case Exceptions.UnsupportedApiVersionException:
        alertMessage.title = this.platformSvc.getConstant(Strings.error_UnsupportedServiceApiVersion_Title);
        alertMessage.message = this.platformSvc.getConstant(Strings.error_UnsupportedServiceApiVersion_Message);
        break;
      case Exceptions.FailedGetPageMetadataException:
        alertMessage.title = this.platformSvc.getConstant(Strings.error_FailedGetPageMetadata_Title);
        alertMessage.message = this.platformSvc.getConstant(Strings.error_FailedGetPageMetadata_Message);
        break;
      case Exceptions.FailedScanException:
        alertMessage.title = this.platformSvc.getConstant(Strings.error_ScanFailed_Message);
        break;
      case Exceptions.FailedShareBookmarkException:
        alertMessage.title = this.platformSvc.getConstant(Strings.error_ShareFailed_Title);
        break;
      case Exceptions.FailedDownloadFileException:
        alertMessage.title = this.platformSvc.getConstant(Strings.error_FailedDownloadFile_Title);
        break;
      case Exceptions.FailedGetDataToRestoreException:
        alertMessage.title = this.platformSvc.getConstant(Strings.error_FailedGetDataToRestore_Title);
        break;
      case Exceptions.FailedRestoreDataException:
        alertMessage.title = this.platformSvc.getConstant(Strings.error_FailedRestoreData_Title);
        alertMessage.message = this.platformSvc.getConstant(Strings.error_FailedRestoreData_Message);
        break;
      case Exceptions.FailedShareUrlException:
        alertMessage.title = this.platformSvc.getConstant(Strings.error_FailedShareUrl_Title);
        break;
      case Exceptions.FailedShareUrlNotSyncedException:
        alertMessage.title = this.platformSvc.getConstant(Strings.error_FailedShareUrlNotSynced_Title);
        break;
      case Exceptions.FailedRefreshBookmarksException:
        alertMessage.title = this.platformSvc.getConstant(Strings.error_FailedRefreshBookmarks_Title);
        break;
      case Exceptions.SyncUncommittedException:
        alertMessage.title = this.platformSvc.getConstant(Strings.error_UncommittedSyncs_Title);
        alertMessage.message = this.platformSvc.getConstant(Strings.error_UncommittedSyncs_Message);
        break;
      case Exceptions.FailedCreateLocalBookmarksException:
      case Exceptions.FailedGetLocalBookmarksException:
      case Exceptions.FailedRemoveLocalBookmarksException:
      case Exceptions.LocalBookmarkNotFoundException:
      case Exceptions.SyncedBookmarkNotFoundException:
        alertMessage.title = this.platformSvc.getConstant(Strings.error_LocalSyncError_Title);
        alertMessage.message = this.platformSvc.getConstant(Strings.error_LocalSyncError_Message);
        break;
      default:
        alertMessage.title = this.platformSvc.getConstant(Strings.error_Default_Title);
        alertMessage.message = this.platformSvc.getConstant(Strings.error_Default_Message);
    }

    return alertMessage;
  }

  handleException(exception: Exceptions.Exception, cause?: string, displayAlert = true): void {
    switch (exception.constructor) {
      case Exceptions.HttpRequestCancelledException:
        displayAlert = false;
        return;
      case Exceptions.NetworkOfflineException:
        if (!exception.logged) {
          this.logSvc.logWarning('Network offline');
        }
        exception.logged = true;
        break;
      case Exceptions.ServiceOfflineException:
        if (!exception.logged) {
          this.logSvc.logWarning('Service offline');
        }
        exception.logged = true;
        break;
      case Exceptions.InvalidCredentialsException:
      case Exceptions.SyncUncommittedException:
        break;
      default:
        this.logSvc.logError(exception, cause);
    }

    if (displayAlert) {
      this.alertSvc.setCurrentAlert(this.getAlertFromException(exception));
    }
  }

  static Factory($injector: ng.auto.IInjectorService, AlertSvc: AlertService, LogSvc: LogService) {
    const exceptionHandler = new ExceptionHandlerService($injector, AlertSvc, LogSvc);
    return exceptionHandler.handleException;
  }
}
