import angular from 'angular';
import { ExceptionHandler } from '../../../shared/errors/errors.interface';
import Globals from '../../../shared/global-shared.constants';
import { PlatformService } from '../../../shared/global-shared.interface';
import { LogService } from '../../../shared/log/log.service';
import { StoreKey } from '../../../shared/store/store.enum';
import { StoreService } from '../../../shared/store/store.service';
import { Sync } from '../../../shared/sync/sync.interface';
import { SyncService } from '../../../shared/sync/sync.service';
import { UtilityService } from '../../../shared/utility/utility.service';
import { WorkingService } from '../../../shared/working/working.service';
import { RoutePath } from '../../app.enum';

export abstract class AppHelperService {
  Strings = require('../../../../../res/strings/en.json');

  $exceptionHandler: ExceptionHandler;
  $location: ng.ILocationService;
  $q: ng.IQService;
  $timeout: ng.ITimeoutService;
  logSvc: LogService;
  platformSvc: PlatformService;
  storeSvc: StoreService;
  syncSvc: SyncService;
  utilitySvc: UtilityService;
  workingSvc: WorkingService;

  constructor(
    $exceptionHandler: ng.IExceptionHandlerService,
    $location: ng.ILocationService,
    $q: ng.IQService,
    $timeout: ng.ITimeoutService,
    LogSvc: LogService,
    PlatformSvc: PlatformService,
    StoreSvc: StoreService,
    SyncSvc: SyncService,
    UtilitySvc: UtilityService,
    WorkingSvc: WorkingService
  ) {
    this.$exceptionHandler = $exceptionHandler;
    this.$location = $location;
    this.$q = $q;
    this.$timeout = $timeout;
    this.logSvc = LogSvc;
    this.platformSvc = PlatformSvc;
    this.storeSvc = StoreSvc;
    this.syncSvc = SyncSvc;
    this.utilitySvc = UtilitySvc;
    this.workingSvc = WorkingSvc;
  }

  attachClickEventsToNewTabLinks(element?: HTMLElement): void {
    this.$timeout(() => {
      const links = (element ?? document).querySelectorAll('a.new-tab');
      for (let i = 0; i < links.length; i += 1) {
        const link = links[i] as any;
        link.onclick = this.openUrl;
      }
    }, Globals.InterfaceReadyTimeout);
  }

  abstract confirmBeforeSyncing(): boolean;

  abstract copyTextToClipboard(text: string): ng.IPromise<void>;

  focusOnElement(domSelector: string, select = false): void {
    this.$timeout(() => {
      const element = document.querySelector(domSelector) as HTMLInputElement;
      if (angular.isUndefined(element ?? undefined)) {
        return;
      }
      if (select && element.select) {
        element.select();
      } else if (element.setSelectionRange) {
        const strLength = element.value.length * 2;
        element.focus();
        element.setSelectionRange(strLength, strLength);
      } else if (element.focus) {
        element.focus();
      }
    }, Globals.InterfaceReadyTimeout);
  }

  abstract getHelpPages(): string[];

  abstract getCurrentSync(): ng.IPromise<Sync>;

  abstract getNextScheduledSyncUpdateCheck(): ng.IPromise<Date>;

  abstract getSyncQueueLength(): ng.IPromise<number>;

  abstract openUrl(event?: Event, url?: string): void;

  abstract removePermissions(): ng.IPromise<void>;

  abstract requestPermissions(): ng.IPromise<boolean>;

  switchView(view?: string): ng.IPromise<void> {
    return this.$q((resolve, reject) => {
      return this.$q
        .resolve()
        .then(() => {
          if (!angular.isUndefined(view)) {
            return view;
          }
          return this.$q
            .all([
              this.storeSvc.get([
                StoreKey.DisplayHelp,
                StoreKey.DisplayPermissions,
                StoreKey.DisplayTelemetryCheck,
                StoreKey.DisplayUpdated,
                StoreKey.RemovedSync
              ]),
              this.utilitySvc.isSyncEnabled()
            ])
            .then((data) => {
              const [storeContent, syncEnabled] = data;
              switch (true) {
                case storeContent.displayUpdated:
                  return RoutePath.Updated;
                case storeContent.displayHelp:
                  return RoutePath.Help;
                case storeContent.displayTelemetryCheck:
                  return RoutePath.TelemetryCheck;
                case storeContent.displayPermissions:
                  return RoutePath.Permissions;
                case !!storeContent.removedSync:
                  return RoutePath.SyncRemoved;
                case syncEnabled:
                  return RoutePath.Search;
                default:
                  return RoutePath.Login;
              }
            });
        })
        .then((newRoute) => {
          this.$location.path(newRoute);
          this.$timeout(resolve, Globals.InterfaceReadyTimeout);
        })
        .catch(reject);
    });
  }

  syncBookmarksFailed(err: Error): ng.IPromise<void> {
    return this.$q.resolve().then(() => {
      // Switch to default view if determined by sync error
      if (this.syncSvc.shouldDisplayDefaultPageOnError(err)) {
        return this.switchView();
      }
    });
  }

  syncBookmarksSuccess(): ng.IPromise<void> {
    // Switch to default view
    return this.switchView();
  }
}
