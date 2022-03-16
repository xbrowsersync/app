/* eslint-disable max-classes-per-file */

export class BaseError extends Error {
  logged: boolean;

  constructor(message?: string, error?: Error) {
    let errMessage = message;
    if (error && !message) {
      errMessage = error.message;
    }

    super(errMessage);

    // Use error param stacktrace if provided and add error class name
    if (error && error.stack) {
      this.stack = error.stack;
    }
    this.stack = this.stack.replace(/^(Error)/, `$1 (${this.constructor.name})`);

    // Set logged flag to default value
    this.logged = false;
  }
}

export class AmbiguousSyncRequestError extends BaseError {}

export class AndroidError extends BaseError {}

export class ApiRequestError extends BaseError {}

export class ArgumentError extends BaseError {}

export class BookmarkMappingNotFoundError extends BaseError {}

export class BookmarkNotFoundError extends BaseError {}

export class ContainerChangedError extends BaseError {}

export class ContainerNotFoundError extends BaseError {}

export class DailyNewSyncLimitReachedError extends BaseError {}

export class DataOutOfSyncError extends BaseError {}

export class FailedGetNativeBookmarksError extends BaseError {}

export class FailedCreateNativeBookmarksError extends BaseError {}

export class FailedDownloadFileError extends BaseError {}

export class FailedGetDataToRestoreError extends BaseError {}

export class FailedGetPageMetadataError extends BaseError {}

export class FailedLocalStorageError extends BaseError {}

export class FailedRefreshBookmarksError extends BaseError {}

export class FailedRegisterAutoUpdatesError extends BaseError {}

export class FailedRemoveNativeBookmarksError extends BaseError {}

export class FailedRestoreDataError extends BaseError {}

export class FailedSaveBackupError extends BaseError {}

export class FailedScanError extends BaseError {}

export class FailedShareBookmarkError extends BaseError {}

export class FailedShareUrlError extends BaseError {}

export class FailedShareUrlNotSyncedError extends BaseError {}

export class FailedUpdateNativeBookmarksError extends BaseError {}

export class HttpRequestAbortedError extends BaseError {}

export class HttpRequestFailedError extends BaseError {}

export class HttpRequestTimedOutError extends BaseError {}

export class I18nError extends BaseError {}

export class IncompleteSyncInfoError extends BaseError {}

export class InvalidBookmarkIdsError extends BaseError {}

export class InvalidCredentialsError extends BaseError {}

export class InvalidServiceError extends BaseError {}

export class InvalidSyncInfoError extends BaseError {}

export class NativeBookmarkNotFoundError extends BaseError {}

export class LocalStorageNotAvailableError extends BaseError {}

export class NetworkConnectionError extends BaseError {}

export class NotAcceptingNewSyncsError extends BaseError {}

export class RequestEntityTooLargeError extends BaseError {}

export class ServiceOfflineError extends BaseError {}

export class SyncDisabledError extends BaseError {}

export class SyncFailedError extends BaseError {}

export class SyncNotFoundError extends BaseError {}

export class SyncUncommittedError extends BaseError {}

export class SyncVersionNotSupportedError extends BaseError {}

export class TooManyRequestsError extends BaseError {}

export class UnexpectedResponseDataError extends BaseError {}

export class UnsupportedApiVersionError extends BaseError {}

export class UpgradeFailedError extends BaseError {}
