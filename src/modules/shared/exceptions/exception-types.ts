/* eslint-disable max-classes-per-file */

export class Exception extends Error {
  logged: boolean;

  constructor(message?: string, error?: Error) {
    let errMessage = message;
    if (error && !message) {
      errMessage = error.message;
    }

    super(errMessage);

    this.logged = false;
    this.name = this.constructor.name;
  }
}

export class AmbiguousSyncRequestException extends Exception {}

export class AndroidException extends Exception {}

export class ApiRequestException extends Exception {}

export class BookmarkMappingNotFoundException extends Exception {}

export class ContainerChangedException extends Exception {}

export class ContainerNotFoundException extends Exception {}

export class DailyNewSyncLimitReachedException extends Exception {}

export class DataOutOfSyncException extends Exception {}

export class FailedGetLocalBookmarksException extends Exception {}

export class FailedCreateLocalBookmarksException extends Exception {}

export class FailedDownloadFileException extends Exception {}

export class FailedGetDataToRestoreException extends Exception {}

export class FailedGetPageMetadataException extends Exception {}

export class FailedLocalStorageException extends Exception {}

export class FailedRefreshBookmarksException extends Exception {}

export class FailedRegisterAutoUpdatesException extends Exception {}

export class FailedRemoveLocalBookmarksException extends Exception {}

export class FailedRestoreDataException extends Exception {}

export class FailedSaveBackupException extends Exception {}

export class FailedScanException extends Exception {}

export class FailedShareBookmarkException extends Exception {}

export class FailedShareUrlException extends Exception {}

export class FailedShareUrlNotSyncedException extends Exception {}

export class FailedUpdateLocalBookmarksException extends Exception {}

export class HttpRequestCancelledException extends Exception {}

export class HttpRequestFailedException extends Exception {}

export class I18nException extends Exception {}

export class InvalidBookmarkIdsException extends Exception {}

export class InvalidCredentialsException extends Exception {}

export class InvalidServiceException extends Exception {}

export class LocalBookmarkNotFoundException extends Exception {}

export class LocalContainerNotFoundException extends Exception {}

export class LocalStorageNotAvailableException extends Exception {}

export class MissingClientDataException extends Exception {}

export class NetworkOfflineException extends Exception {}

export class NoDataFoundException extends Exception {}

export class NotAcceptingNewSyncsException extends Exception {}

export class NotImplementedException extends Exception {}

export class PasswordRemovedException extends Exception {}

export class RequestEntityTooLargeException extends Exception {}

export class ServiceOfflineException extends Exception {}

export class SyncDisabledException extends Exception {}

export class SyncedBookmarkNotFoundException extends Exception {}

export class SyncFailedException extends Exception {}

export class SyncRemovedException extends Exception {}

export class SyncUncommittedException extends Exception {}

export class TooManyRequestsException extends Exception {}

export class UnspecifiedException extends Exception {}

export class UnsupportedApiVersionException extends Exception {}
