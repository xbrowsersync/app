import { Injectable } from 'angular-ts-decorators';
import { autobind } from 'core-decorators';
import Strings from '../../../../../res/strings/en.json';
import { AppHelperService } from '../../../app/app.interface';
import { Bookmark } from '../../../shared/bookmark/bookmark.interface';
import * as Exceptions from '../../../shared/exception/exception';
import { ExceptionHandler } from '../../../shared/exception/exception.interface';
import { PlatformType } from '../../../shared/global-shared.enum';
import LogService from '../../../shared/log/log.service';
import SyncEngineService from '../../../shared/sync/sync-engine/sync-engine.service';
import { Sync } from '../../../shared/sync/sync.interface';
import WorkingService from '../../../shared/working/working.service';
import AndroidPlatformService from '../../android-platform.service';

@autobind
@Injectable('AppHelperService')
export default class AndroidAppHelperService implements AppHelperService {
  $exceptionHandler: ExceptionHandler;
  $interval: ng.IIntervalService;
  $q: ng.IQService;
  logSvc: LogService;
  platformSvc: AndroidPlatformService;
  syncEngineSvc: SyncEngineService;
  workingSvc: WorkingService;

  platformName = PlatformType.Android;

  static $inject = [
    '$exceptionHandler',
    '$interval',
    '$q',
    'LogService',
    'PlatformService',
    'SyncEngineService',
    'WorkingService'
  ];
  constructor(
    $exceptionHandler: ng.IExceptionHandlerService,
    $interval: ng.IIntervalService,
    $q: ng.IQService,
    LogSvc: LogService,
    PlatformSvc: AndroidPlatformService,
    SyncEngineSvc: SyncEngineService,
    WorkingSvc: WorkingService
  ) {
    this.$exceptionHandler = $exceptionHandler;
    this.$interval = $interval;
    this.$q = $q;
    this.logSvc = LogSvc;
    this.platformSvc = PlatformSvc;
    this.syncEngineSvc = SyncEngineSvc;
    this.workingSvc = WorkingSvc;
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
                    .getI18nString(Strings.downloadFile_Success_Android_Message)
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

  getCurrentSync(): ng.IPromise<Sync> {
    return this.$q.resolve(this.syncEngineSvc.getCurrentSync());
  }

  getHelpPages(): string[] {
    const pages = [
      this.platformSvc.getI18nString(Strings.help_Page_Welcome_Android_Content),
      this.platformSvc.getI18nString(Strings.help_Page_FirstSync_Android_Content),
      this.platformSvc.getI18nString(Strings.help_Page_ExistingId_Android_Content),
      this.platformSvc.getI18nString(Strings.help_Page_Searching_Android_Content),
      this.platformSvc.getI18nString(Strings.help_Page_AddingBookmarks_Android_Content),
      this.platformSvc.getI18nString(Strings.help_Page_BackingUp_Android_Content),
      this.platformSvc.getI18nString(Strings.help_Page_FurtherSupport_Content)
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
    event?.preventDefault();
    (event as any)?.srcEvent?.stopPropagation();

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
      subject: `${bookmark.title} (${this.platformSvc.getI18nString(Strings.shareBookmark_Message)})`,
      url: bookmark.url,
      chooserTitle: this.platformSvc.getI18nString(Strings.shareBookmark_Message)
    };

    const onError = (err: Error) => {
      this.$exceptionHandler(err);
    };

    // Display share sheet
    window.plugins.socialsharing.shareWithOptions(options, null, onError);
  }
}
