import { Component, OnInit } from 'angular-ts-decorators';
import { ApiServiceStatus } from '../../../../shared/api/api.enum';
import { ApiSyncInfo } from '../../../../shared/api/api.interface';
import {
  ApiXbrowsersyncServiceInfo,
  ApiXbrowsersyncSyncInfo
} from '../../../../shared/api/api-xbrowsersync/api-xbrowsersync.interface';
import { ApiXbrowsersyncService } from '../../../../shared/api/api-xbrowsersync/api-xbrowsersync.service';
import { ServiceOfflineError } from '../../../../shared/errors/errors';
import { PlatformService } from '../../../../shared/global-shared.interface';
import { StoreKey } from '../../../../shared/store/store.enum';
import { StoreService } from '../../../../shared/store/store.service';
import { SyncService } from '../../../../shared/sync/sync.service';
import { UtilityService } from '../../../../shared/utility/utility.service';
import { AppEventType } from '../../../app.enum';
import { AppHelperService } from '../../../shared/app-helper/app-helper.service';

@Component({
  controllerAs: 'vm',
  selector: 'apiXbrowsersyncServiceInfo',
  styles: [require('./api-xbrowsersync-service-info.component.scss')],
  template: require('./api-xbrowsersync-service-info.component.html')
})
export class ApiXbrowsersyncServiceInfoComponent implements OnInit {
  Strings = require('../../../../../../res/strings/en.json');

  $q: ng.IQService;
  $timeout: ng.ITimeoutService;
  apiSvc: ApiXbrowsersyncService;
  appHelperSvc: AppHelperService;
  platformSvc: PlatformService;
  storeSvc: StoreService;
  syncSvc: SyncService;
  utilitySvc: UtilityService;

  apiServiceStatus = ApiServiceStatus;
  dataUsageProgressWidth = 0;
  maxSyncSize = 0;
  serviceInfo: ApiXbrowsersyncServiceInfo;
  syncDataSize: number;
  syncDataUsed: number;
  syncEnabled: boolean;

  static $inject = [
    '$q',
    '$timeout',
    '$scope',
    'ApiXbrowsersyncService',
    'AppHelperService',
    'PlatformService',
    'StoreService',
    'SyncService',
    'UtilityService'
  ];
  constructor(
    $q: ng.IQService,
    $timeout: ng.ITimeoutService,
    $scope: ng.IScope,
    ApiSvc: ApiXbrowsersyncService,
    AppHelperSvc: AppHelperService,
    PlatformSvc: PlatformService,
    StoreSvc: StoreService,
    SyncSvc: SyncService,
    UtilitySvc: UtilityService
  ) {
    this.$q = $q;
    this.$timeout = $timeout;
    this.apiSvc = ApiSvc;
    this.appHelperSvc = AppHelperSvc;
    this.platformSvc = PlatformSvc;
    this.storeSvc = StoreSvc;
    this.syncSvc = SyncSvc;
    this.utilitySvc = UtilitySvc;

    $scope.$on(AppEventType.RefreshSyncDataUsage, () => this.refreshSyncDataUsage());
  }

  ngOnInit(): void {
    this.$q.all([this.storeSvc.get<ApiSyncInfo>(StoreKey.SyncInfo), this.utilitySvc.isSyncEnabled()]).then((data) => {
      const [syncInfo, syncEnabled] = data;
      this.syncEnabled = syncEnabled;
      this.serviceInfo = {
        url: (syncInfo as ApiXbrowsersyncSyncInfo).serviceUrl
      };

      // Update displayed service info
      this.refreshServiceStatus().then(() => this.refreshSyncDataUsage());
    });
  }

  refreshServiceStatus(): ng.IPromise<void> {
    return this.apiSvc
      .checkServiceStatus()
      .then((serviceInfoResponse) => {
        this.serviceInfo = {
          ...this.serviceInfo,
          ...this.apiSvc.formatServiceInfo(serviceInfoResponse)
        };

        // Set service message links to open in new tabs
        this.appHelperSvc.attachClickEventsToNewTabLinks(document.querySelector('.service-message'));
      })
      .catch((err) => {
        const status = err instanceof ServiceOfflineError ? ApiServiceStatus.Offline : ApiServiceStatus.Error;
        this.serviceInfo = {
          ...this.serviceInfo,
          status
        };
      });
  }

  refreshSyncDataUsage(): ng.IPromise<void> {
    return this.utilitySvc.isSyncEnabled().then((syncEnabled) => {
      // Return if not synced
      if (!syncEnabled) {
        return;
      }

      // Get bookmarks sync size and calculate sync data percentage used
      return this.syncSvc.getSyncSize().then((bookmarksSyncSize) => {
        this.maxSyncSize = this.serviceInfo.maxSyncSize * 1024;
        this.syncDataSize = bookmarksSyncSize;
        this.syncDataUsed = Math.ceil((this.syncDataSize / this.maxSyncSize) * 100);
        this.$timeout(() => {
          // Add a slight delay when setting progress bar width to ensure transitions are enabled
          this.dataUsageProgressWidth = this.syncDataUsed;
        }, 250);
      });
    });
  }
}
