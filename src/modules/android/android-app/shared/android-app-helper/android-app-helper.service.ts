import { Injectable } from 'angular-ts-decorators';
import { boundMethod } from 'autobind-decorator';
import { AppHelperService } from '../../../../app/shared/app-helper/app-helper.service';
import { Bookmark } from '../../../../shared/bookmark/bookmark.interface';
import { ExceptionHandler } from '../../../../shared/errors/errors.interface';
import { LogService } from '../../../../shared/log/log.service';
import { StoreService } from '../../../../shared/store/store.service';
import { Sync } from '../../../../shared/sync/sync.interface';
import { SyncService } from '../../../../shared/sync/sync.service';
import { UtilityService } from '../../../../shared/utility/utility.service';
import { WorkingService } from '../../../../shared/working/working.service';
import { AndroidPlatformService } from '../../../android-shared/android-platform/android-platform.service';

@Injectable('AppHelperService')
export class AndroidAppHelperService extends AppHelperService {
  $interval: ng.IIntervalService;
  platformSvc: AndroidPlatformService;

  static $inject = [
    '$exceptionHandler',
    '$interval',
    '$location',
    '$q',
    '$timeout',
    'LogService',
    'PlatformService',
    'StoreService',
    'SyncService',
    'UtilityService',
    'WorkingService'
  ];
  constructor(
    $exceptionHandler: ExceptionHandler,
    $interval: ng.IIntervalService,
    $location: ng.ILocationService,
    $q: ng.IQService,
    $timeout: ng.ITimeoutService,
    LogSvc: LogService,
    PlatformSvc: AndroidPlatformService,
    StoreSvc: StoreService,
    SyncSvc: SyncService,
    UtilitySvc: UtilityService,
    WorkingSvc: WorkingService
  ) {
    super($exceptionHandler, $location, $q, $timeout, LogSvc, PlatformSvc, StoreSvc, SyncSvc, UtilitySvc, WorkingSvc);

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

  exitApp(): void {
    window.cordova.plugins.exit();
  }

  getCurrentSync(): ng.IPromise<Sync> {
    return this.$q.resolve(this.syncSvc.getCurrentSync());
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

  getNextScheduledSyncUpdateCheck(): ng.IPromise<Date> {
    return this.$q.resolve(new Date(''));
  }

  getSyncQueueLength(): ng.IPromise<number> {
    return this.$q.resolve(this.syncSvc.getSyncQueueLength());
  }

  @boundMethod
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
