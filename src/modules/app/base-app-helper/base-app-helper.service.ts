import angular from 'angular';
import autobind from 'autobind-decorator';
import DOMPurify from 'dompurify';
import marked from 'marked';
import _ from 'underscore';
import { ApiServiceStatus } from '../../shared/api/api.enum';
import { ApiService, ApiServiceInfo, ApiServiceInfoResponse } from '../../shared/api/api.interface';
import * as Exceptions from '../../shared/exception/exception';
import { ExceptionHandler } from '../../shared/exception/exception.interface';
import Globals from '../../shared/global-shared.constants';
import { MessageCommand } from '../../shared/global-shared.enum';
import { PlatformService } from '../../shared/global-shared.interface';
import LogService from '../../shared/log/log.service';
import { StoreKey } from '../../shared/store/store.enum';
import StoreService from '../../shared/store/store.service';
import SyncEngineService from '../../shared/sync/sync-engine/sync-engine.service';
import { Sync } from '../../shared/sync/sync.interface';
import UtilityService from '../../shared/utility/utility.service';
import WorkingService from '../../shared/working/working.service';
import { AppViewType } from '../app.enum';
import { AppHelperService, AppView } from '../app.interface';

@autobind
export default class BaseAppHelperService {
  $exceptionHandler: ExceptionHandler;
  $q: ng.IQService;
  $timeout: ng.ITimeoutService;
  apiSvc: ApiService;
  logSvc: LogService;
  platformSvc: PlatformService;
  storeSvc: StoreService;
  syncEngineSvc: SyncEngineService;
  utilitySvc: UtilityService;
  workingSvc: WorkingService;

  currentView: AppView;

  constructor(
    $exceptionHandler: ng.IExceptionHandlerService,
    $q: ng.IQService,
    $timeout: ng.ITimeoutService,
    ApiSvc: ApiService,
    LogSvc: LogService,
    PlatformSvc: PlatformService,
    StoreSvc: StoreService,
    SyncEngineSvc: SyncEngineService,
    UtilitySvc: UtilityService,
    WorkingSvc: WorkingService
  ) {
    this.$exceptionHandler = $exceptionHandler;
    this.$q = $q;
    this.$timeout = $timeout;
    this.apiSvc = ApiSvc;
    this.logSvc = LogSvc;
    this.platformSvc = PlatformSvc;
    this.storeSvc = StoreSvc;
    this.syncEngineSvc = SyncEngineSvc;
    this.utilitySvc = UtilitySvc;
    this.workingSvc = WorkingSvc;
  }

  attachClickEventsToNewTabLinks(element?: HTMLElement): void {
    this.$timeout(() => {
      const links = (element ?? document).querySelectorAll('a.new-tab');
      for (let i = 0; i < links.length; i += 1) {
        const link = links[i] as any;
        link.onclick = ((this as unknown) as AppHelperService).openUrl;
      }
    }, Globals.InterfaceReadyTimeout);
  }

  focusOnElement(domSelector: string, select = false): void {
    this.$timeout(() => {
      const element = document.querySelector(domSelector) as HTMLInputElement;
      if (angular.isUndefined(element ?? undefined)) {
        return;
      }
      if (select && element.select) {
        element.select();
      } else if (element.focus) {
        element.focus();
      }
    }, Globals.InterfaceReadyTimeout);
  }

  formatServiceInfo(serviceInfoResponse?: ApiServiceInfoResponse): ng.IPromise<ApiServiceInfo> {
    // If no service info response provide, get response from stored service
    return (serviceInfoResponse ? this.$q.resolve(serviceInfoResponse) : this.apiSvc.checkServiceStatus())
      .then((response) => {
        if (angular.isUndefined(response ?? undefined)) {
          return;
        }

        // Render markdown and add link classes to service message
        let message = response.message ? marked(response.message) : '';
        if (message) {
          const messageDom = new DOMParser().parseFromString(message, 'text/html');
          _.each(messageDom.querySelectorAll('a'), (hyperlink) => {
            hyperlink.className = 'new-tab';
          });
          message = DOMPurify.sanitize(messageDom.body.firstElementChild.innerHTML);
        }

        return {
          location: response.location,
          maxSyncSize: response.maxSyncSize / 1024,
          message,
          status: response.status,
          version: response.version
        };
      })
      .catch((err) => {
        const status =
          err instanceof Exceptions.ServiceOfflineException ? ApiServiceStatus.Offline : ApiServiceStatus.Error;
        return {
          status
        };
      });
  }

  getCurrentView(): AppView {
    return this.currentView;
  }

  switchToDefaultView(): ng.IPromise<void> {
    return this.storeSvc
      .get([StoreKey.DisplayHelp, StoreKey.DisplayPermissions, StoreKey.DisplayUpdated, StoreKey.SyncEnabled])
      .then((storeContent) => {
        switch (true) {
          case storeContent.displayUpdated:
            return AppViewType.Updated;
          case storeContent.displayPermissions:
            return AppViewType.Permissions;
          case storeContent.displayHelp:
            return AppViewType.Help;
          case storeContent.syncEnabled:
            return AppViewType.Search;
          default:
            return AppViewType.Login;
        }
      })
      .then((view) => {
        this.currentView = { view };
      });
  }

  switchView(view?: AppView): ng.IPromise<void> {
    return this.$q.resolve().then(() => {
      if (angular.isUndefined(view ?? undefined)) {
        return this.switchToDefaultView();
      }
      this.currentView = angular.copy(view);
    });
  }

  syncBookmarksSuccess(): ng.IPromise<void> {
    // Hide loading panel and switch to default view
    this.workingSvc.hide();
    return this.switchView();
  }

  queueSync(sync: Sync, command = MessageCommand.SyncBookmarks): ng.IPromise<any> {
    return this.platformSvc
      .queueSync(sync, command)
      .catch((err) => {
        // Swallow error if sync was processed but not committed (offline)
        if (err instanceof Exceptions.SyncUncommittedException) {
          this.$timeout(() => {
            this.$exceptionHandler(err);
          }, Globals.InterfaceReadyTimeout);
          return;
        }

        // If data out of sync switch to default view
        return (this.syncEngineSvc.checkIfRefreshSyncedDataOnError(err) ? this.switchView() : this.$q.resolve()).then(
          () => {
            throw err;
          }
        );
      })
      .finally(this.workingSvc.hide);
  }

  updateServiceUrl(newServiceUrl: string): ng.IPromise<ApiServiceInfo> {
    // Update service url in store and refresh service info
    const url = newServiceUrl.replace(/\/$/, '');
    return this.storeSvc.set(StoreKey.ServiceUrl, url).then(() => {
      this.logSvc.logInfo(`Service url changed to: ${url}`);
      return this.formatServiceInfo();
    });
  }
}
