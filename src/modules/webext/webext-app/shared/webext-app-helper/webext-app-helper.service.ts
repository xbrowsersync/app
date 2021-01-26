import angular from 'angular';
import autobind from 'autobind-decorator';
import { browser } from 'webextension-polyfill-ts';
import AppHelperService from '../../../../app/shared/app-helper/app-helper.service';
import { ApiService } from '../../../../shared/api/api.interface';
import BookmarkHelperService from '../../../../shared/bookmark/bookmark-helper/bookmark-helper.service';
import { ExceptionHandler } from '../../../../shared/exception/exception.interface';
import Globals from '../../../../shared/global-shared.constants';
import { MessageCommand } from '../../../../shared/global-shared.enum';
import LogService from '../../../../shared/log/log.service';
import StoreService from '../../../../shared/store/store.service';
import { Sync } from '../../../../shared/sync/sync.interface';
import SyncEngineService from '../../../../shared/sync/sync-engine/sync-engine.service';
import UtilityService from '../../../../shared/utility/utility.service';
import WorkingService from '../../../../shared/working/working.service';
import WebExtPlatformService from '../../../shared/webext-platform/webext-platform.service';

@autobind
export default abstract class WebExtAppHelperService extends AppHelperService {
  $filter: ng.FilterFactory;
  bookmarkHelperSvc: BookmarkHelperService;
  platformSvc: WebExtPlatformService;

  static $inject = [
    '$exceptionHandler',
    '$filter',
    '$q',
    '$timeout',
    'ApiService',
    'BookmarkHelperService',
    'LogService',
    'PlatformService',
    'StoreService',
    'SyncEngineService',
    'UtilityService',
    'WorkingService'
  ];
  constructor(
    $exceptionHandler: ExceptionHandler,
    $filter: ng.FilterFactory,
    $q: ng.IQService,
    $timeout: ng.ITimeoutService,
    ApiSvc: ApiService,
    BookmarkHelperSvc: BookmarkHelperService,
    LogSvc: LogService,
    PlatformSvc: WebExtPlatformService,
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

    this.$filter = $filter;
    this.bookmarkHelperSvc = BookmarkHelperSvc;
  }

  confirmBeforeSyncing(): boolean {
    return true;
  }

  copyTextToClipboard(text: string): ng.IPromise<void> {
    return this.$q.resolve().then(() => navigator.clipboard.writeText(text));
  }

  currentUrlBookmarked(): ng.IPromise<boolean> {
    return this.utilitySvc.isSyncEnabled().then((syncEnabled) => {
      if (!syncEnabled) {
        return false;
      }

      // Check if current url exists in bookmarks
      return this.bookmarkHelperSvc.findCurrentUrlInBookmarks().then((result) => {
        return !angular.isUndefined(result ?? undefined);
      });
    });
  }

  downloadFile(fileName: string, textContents: string, linkId: string): ng.IPromise<string> {
    if (!fileName) {
      throw new Error('File name not supplied.');
    }

    // Use provided hyperlink or create new one
    let downloadLink: HTMLAnchorElement;
    if (linkId) {
      downloadLink = document.getElementById(linkId) as HTMLAnchorElement;
    } else {
      downloadLink = document.createElement('a');
      downloadLink.style.display = 'none';
      document.body.appendChild(downloadLink);
    }

    if (!downloadLink) {
      throw new Error('Link element not found.');
    }

    this.logSvc.logInfo(`Downloading file ${fileName}`);

    // Use hyperlink to trigger file download
    const file = new Blob([textContents], { type: 'text/plain' });
    downloadLink.href = URL.createObjectURL(file);
    downloadLink.innerText = fileName;
    downloadLink.download = fileName;
    downloadLink.click();

    if (!linkId) {
      document.body.removeChild(downloadLink);
    }

    // Return message to be displayed
    const message = this.platformSvc.getI18nString(this.Strings.View.Settings.FileDownloaded);
    return this.$q.resolve(message);
  }

  getCurrentSync(): ng.IPromise<Sync> {
    return this.platformSvc.sendMessage({
      command: MessageCommand.GetCurrentSync
    });
  }

  abstract getHelpPages(): string[];

  getNextScheduledSyncUpdateCheck(): ng.IPromise<string> {
    return browser.alarms.get(Globals.Alarm.Name).then((alarm) => {
      if (!alarm) {
        return '';
      }

      return (this.$filter('date') as ng.IFilterDate)(new Date(alarm.scheduledTime), 'shortTime');
    });
  }

  getSyncQueueLength(): ng.IPromise<number> {
    return this.platformSvc.sendMessage({
      command: MessageCommand.GetSyncQueueLength
    });
  }

  openUrl(event?: Event, url?: string): void {
    // Stop event propogation
    event?.preventDefault();

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
    // Remove optional permissions
    return browser.permissions.remove(this.platformSvc.optionalPermissions).then(() => {
      this.logSvc.logInfo('Optional permissions removed');
    });
  }

  requestPermissions(): ng.IPromise<boolean> {
    // Request optional permissions
    return browser.permissions.request(this.platformSvc.optionalPermissions).then((granted) => {
      this.logSvc.logInfo(`Optional permissions ${!granted ? 'not ' : ''}granted`);
      return granted;
    });
  }
}
