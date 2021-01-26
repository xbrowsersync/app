import { Component, OnInit } from 'angular-ts-decorators';
import autobind from 'autobind-decorator';
import { ApiServiceStatus } from '../../../shared/api/api.enum';
import { ApiServiceInfo } from '../../../shared/api/api.interface';
import BookmarkHelperService from '../../../shared/bookmark/bookmark-helper/bookmark-helper.service';
import * as Exceptions from '../../../shared/exception/exception';
import { PlatformService } from '../../../shared/global-shared.interface';
import NetworkService from '../../../shared/network/network.service';
import { StoreKey } from '../../../shared/store/store.enum';
import StoreService from '../../../shared/store/store.service';
import { SyncType } from '../../../shared/sync/sync.enum';
import SyncEngineService from '../../../shared/sync/sync-engine/sync-engine.service';
import UtilityService from '../../../shared/utility/utility.service';
import WorkingService from '../../../shared/working/working.service';
import { AppEventType, AppViewType } from '../../app.enum';
import AppHelperService from '../../shared/app-helper/app-helper.service';

@autobind
@Component({
  controllerAs: 'vm',
  selector: 'syncSettings',
  styles: [require('./sync-settings.component.scss')],
  template: require('./sync-settings.component.html')
})
export default class SyncSettingsComponent implements OnInit {
  Strings = require('../../../../../res/strings/en.json');

  $q: ng.IQService;
  $timeout: ng.ITimeoutService;
  appHelperSvc: AppHelperService;
  bookmarkHelperSvc: BookmarkHelperService;
  networkSvc: NetworkService;
  platformSvc: PlatformService;
  storeSvc: StoreService;
  syncEngineSvc: SyncEngineService;
  utilitySvc: UtilityService;
  workingSvc: WorkingService;

  apiServiceStatus = ApiServiceStatus;
  dataUsageProgressWidth = 0;
  displayQr = false;
  nextAutoUpdate: string;
  serviceInfo: ApiServiceInfo;
  syncDataSize: number;
  syncDataUsed: number;
  syncEnabled: boolean;
  syncId: string;
  syncIdCopied = false;
  updatesAvailable: boolean;

  static $inject = [
    '$q',
    '$timeout',
    '$scope',
    'AppHelperService',
    'BookmarkHelperService',
    'NetworkService',
    'PlatformService',
    'StoreService',
    'SyncEngineService',
    'UtilityService',
    'WorkingService'
  ];
  constructor(
    $q: ng.IQService,
    $timeout: ng.ITimeoutService,
    $scope: ng.IScope,
    AppHelperSvc: AppHelperService,
    BookmarkHelperSvc: BookmarkHelperService,
    NetworkSvc: NetworkService,
    PlatformSvc: PlatformService,
    StoreSvc: StoreService,
    SyncEngineSvc: SyncEngineService,
    UtilitySvc: UtilityService,
    WorkingSvc: WorkingService
  ) {
    this.$q = $q;
    this.$timeout = $timeout;
    this.appHelperSvc = AppHelperSvc;
    this.bookmarkHelperSvc = BookmarkHelperSvc;
    this.networkSvc = NetworkSvc;
    this.platformSvc = PlatformSvc;
    this.storeSvc = StoreSvc;
    this.syncEngineSvc = SyncEngineSvc;
    this.utilitySvc = UtilitySvc;
    this.workingSvc = WorkingSvc;

    $scope.$on(AppEventType.SyncDisabled, () => {
      this.syncEnabled = false;
    });
    $scope.$on(AppEventType.RefreshSyncDataUsage, () => this.refreshSyncDataUsage());
  }

  closeQrPanel(): void {
    this.displayQr = false;
  }

  disableSync(): void {
    this.platformSvc.disableSync().then(() => this.appHelperSvc.switchView({ view: AppViewType.Login }));
  }

  displayQrPanel(): void {
    this.displayQr = true;
  }

  ngOnInit(): void {
    // Get required view model data from store
    this.$q
      .all([
        this.storeSvc.get<string>(StoreKey.SyncId),
        this.utilitySvc.getServiceUrl(),
        this.utilitySvc.isSyncEnabled()
      ])
      .then((data) => {
        this.syncId = data[0];
        this.serviceInfo = {
          url: data[1]
        };
        this.syncEnabled = data[2];

        // Update service status and display info
        this.refreshServiceStatus()
          // Set service message links to open in new tabs
          .then(() => this.appHelperSvc.attachClickEventsToNewTabLinks(document.querySelector('.service-message')))
          // Refresh data usage meter
          .then(() => this.refreshSyncDataUsage());

        // Check for available sync updates on non-mobile platforms
        if (this.syncEnabled && !this.utilitySvc.isMobilePlatform(this.platformSvc.platformName)) {
          this.$q
            .all([this.syncEngineSvc.checkForUpdates(), this.appHelperSvc.getNextScheduledSyncUpdateCheck()])
            .then((results) => {
              if (results[0]) {
                this.updatesAvailable = true;
                this.nextAutoUpdate = results[1];
              } else {
                this.updatesAvailable = false;
              }
            })
            .catch((err) => {
              // Swallow error if sync failed due to network connection
              if (
                this.networkSvc.isNetworkConnectionError(err) ||
                err instanceof Exceptions.InvalidServiceException ||
                err instanceof Exceptions.ServiceOfflineException
              ) {
                return;
              }

              throw err;
            });
        }
      });
  }

  refreshServiceStatus(): ng.IPromise<void> {
    return this.appHelperSvc.formatServiceInfo().then((formattedServiceInfo) => {
      Object.assign(this.serviceInfo, formattedServiceInfo);
    });
  }

  refreshSyncDataUsage(): ng.IPromise<void> {
    return this.utilitySvc.isSyncEnabled().then((syncEnabled) => {
      // Return if not synced
      if (!syncEnabled) {
        return;
      }

      // Get bookmarks sync size and calculate sync data percentage used
      return this.syncEngineSvc.getSyncSize().then((bookmarksSyncSize) => {
        this.syncDataSize = bookmarksSyncSize / 1024;
        this.syncDataUsed = Math.ceil((this.syncDataSize / this.serviceInfo.maxSyncSize) * 150);
        this.dataUsageProgressWidth = this.syncDataUsed;
      });
    });
  }

  syncUpdates() {
    // Display loading panel and pull updates
    this.workingSvc.show();
    return this.platformSvc
      .queueSync({ type: SyncType.Local })
      .then(() => this.refreshSyncDataUsage())
      .then(this.appHelperSvc.syncBookmarksSuccess);
  }
}
