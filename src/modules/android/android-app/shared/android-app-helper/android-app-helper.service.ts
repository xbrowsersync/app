import { Injectable } from 'angular-ts-decorators';
import autobind from 'autobind-decorator';
import AppHelperService from '../../../../app/shared/app-helper/app-helper.service';
import { ApiService } from '../../../../shared/api/api.interface';
import { Bookmark } from '../../../../shared/bookmark/bookmark.interface';
import * as Exceptions from '../../../../shared/exception/exception';
import { ExceptionHandler } from '../../../../shared/exception/exception.interface';
import LogService from '../../../../shared/log/log.service';
import StoreService from '../../../../shared/store/store.service';
import { Sync } from '../../../../shared/sync/sync.interface';
import SyncEngineService from '../../../../shared/sync/sync-engine/sync-engine.service';
import UtilityService from '../../../../shared/utility/utility.service';
import WorkingService from '../../../../shared/working/working.service';
import AndroidPlatformService from '../../../android-shared/android-platform/android-platform.service';

@autobind
@Injectable('AppHelperService')
export default class AndroidAppHelperService extends AppHelperService {
  $interval: ng.IIntervalService;
  platformSvc: AndroidPlatformService;

  static $inject = [
    '$exceptionHandler',
    '$interval',
    '$q',
    '$timeout',
    'ApiService',
    'LogService',
    'PlatformService',
    'StoreService',
    'SyncEngineService',
    'UtilityService',
    'WorkingService'
  ];
  constructor(
    $exceptionHandler: ExceptionHandler,
    $interval: ng.IIntervalService,
    $q: ng.IQService,
    $timeout: ng.ITimeoutService,
    ApiSvc: ApiService,
    LogSvc: LogService,
    PlatformSvc: AndroidPlatformService,
    StoreSvc: StoreService,
    SyncEngineSvc: SyncEngineService,
    UtilitySvc: UtilityService,
    WorkingSvc: WorkingService
  ) {
    super(
      $exceptionHandler,
      $q,
      $timeout,
      ApiSvc,
      LogSvc,
      PlatformSvc,
      StoreSvc,
      SyncEngineSvc,
      UtilitySvc,
      WorkingSvc
    );

    this.$exceptionHandler = $exceptionHandler;
    this.$interval = $interval;
  }

  confirmBeforeSyncing(): boolean {
    return false;
  }

  copyTextToClipboard(text: string): ng.IPromise<void> {
    return this.$q<void>((resolve, reject) => {
      window.cordova.plugins.clipboard.copy(text, resolve, reject);
    }).then(() => {});
  }

  downloadFile(fileName: string, textContents: string): ng.IPromise<string> {
    if (!fileName) {
      throw new Error('File name not supplied.');
    }

    // Set file storage location to external storage root directory
    const storageLocation = `${window.cordova.file.externalRootDirectory}Download`;

    return this.$q((resolve, reject) => {
      const onError = (err: Error) => {
        return reject(new Exceptions.FailedDownloadFileException(undefined, err));
      };

      this.logSvc.logInfo(`Downloading file ${fileName}`);

      // Save file to storage location
      window.resolveLocalFileSystemURL(
        storageLocation,
        (dirEntry) => {
          dirEntry.getFile(
            fileName,
            { create: true },
            (fileEntry) => {
              fileEntry.createWriter((fileWriter) => {
                fileWriter.write(textContents);
                fileWriter.onerror = onError;
                fileWriter.onwriteend = () => {
                  // Return message to be displayed
                  const message = this.platformSvc
                    .getI18nString(this.Strings.View.Settings.FileDownloaded)
                    .replace('{fileName}', fileEntry.name);
                  resolve(message);
                };
              }, onError);
            },
            onError
          );
        },
        onError
      );
    });
  }

  exitApp(): void {
    window.cordova.plugins.exit();
  }

  getCurrentSync(): ng.IPromise<Sync> {
    return this.$q.resolve(this.syncEngineSvc.getCurrentSync());
  }

  getHelpPages(): string[] {
    const pages = [
      this.platformSvc.getI18nString(this.Strings.View.Help.Welcome),
      this.platformSvc.getI18nString(this.Strings.View.Help.FirstSync),
      this.platformSvc.getI18nString(this.Strings.View.Help.ExistingId),
      this.platformSvc.getI18nString(this.Strings.View.Help.Searching),
      this.platformSvc.getI18nString(this.Strings.View.Help.AddingBookmarks),
      this.platformSvc.getI18nString(this.Strings.View.Help.BackingUp),
      this.platformSvc.getI18nString(this.Strings.View.Help.FurtherSupport)
    ];

    return pages;
  }

  getNextScheduledSyncUpdateCheck(): ng.IPromise<string> {
    return this.$q.resolve('');
  }

  getSyncQueueLength(): ng.IPromise<number> {
    return this.$q.resolve(this.syncEngineSvc.getSyncQueueLength());
  }

  openUrl(event?: Event, url?: string): void {
    // Stop event propogation
    this.utilitySvc.stopEventPropagation(event);

    // Open the target url
    if (url) {
      this.platformSvc.openUrl(url);
    } else if (event?.currentTarget) {
      this.platformSvc.openUrl((event.currentTarget as HTMLLinkElement).href);
    } else {
      this.logSvc.logWarning('Couldn’t open url');
    }
  }

  removePermissions(): ng.IPromise<void> {
    return this.$q.resolve();
  }

  requestPermissions(): ng.IPromise<boolean> {
    return this.$q.resolve(true);
  }

  shareBookmark(bookmark: Bookmark): void {
    const options = {
      url: bookmark.url
    };

    const onError = (err: Error) => {
      this.$exceptionHandler(err);
    };

    // Display share sheet
    window.plugins.socialsharing.shareWithOptions(options, null, onError);
  }
}
