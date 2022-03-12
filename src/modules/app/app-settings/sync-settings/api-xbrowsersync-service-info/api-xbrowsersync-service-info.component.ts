import { Component, Input, OnInit } from 'angular-ts-decorators';
import autobind from 'autobind-decorator';
import { ApiServiceStatus } from '../../../../shared/api/api.enum';
import { ApiXbrowsersyncServiceInfo } from '../../../../shared/api/api-xbrowsersync/api-xbrowsersync.interface';
import { ApiXbrowsersyncService } from '../../../../shared/api/api-xbrowsersync/api-xbrowsersync.service';
import { PlatformService } from '../../../../shared/global-shared.interface';
import { SyncService } from '../../../../shared/sync/sync.service';
import { UtilityService } from '../../../../shared/utility/utility.service';
import { AppEventType } from '../../../app.enum';
import { AppHelperService } from '../../../shared/app-helper/app-helper.service';

@autobind
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
  syncSvc: SyncService;
  utilitySvc: UtilityService;

  @Input() serviceInfo: ApiXbrowsersyncServiceInfo;

  apiServiceStatus = ApiServiceStatus;
  dataUsageProgressWidth = 0;
  syncDataSize: number;
  syncDataUsed: number;

  static $inject = [
    '$q',
    '$timeout',
    '$scope',
    'ApiService',
    'AppHelperService',
    'PlatformService',
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
    SyncSvc: SyncService,
    UtilitySvc: UtilityService
  ) {
    this.$q = $q;
    this.$timeout = $timeout;
    this.apiSvc = ApiSvc;
    this.appHelperSvc = AppHelperSvc;
    this.platformSvc = PlatformSvc;
    this.syncSvc = SyncSvc;
    this.utilitySvc = UtilitySvc;

    $scope.$on(AppEventType.RefreshSyncDataUsage, () => this.refreshSyncDataUsage());

    $scope.$watch(
      () => this.serviceInfo,
      (newVal, oldVal) => {
        if (newVal !== oldVal) {
          this.refreshSyncDataUsage();
        }
      }
    );
  }

  ngOnInit(): void {
    // Set service message links to open in new tabs
    this.appHelperSvc.attachClickEventsToNewTabLinks(document.querySelector('.service-message'));
  }

  refreshSyncDataUsage(): ng.IPromise<void> {
    return this.utilitySvc.isSyncEnabled().then((syncEnabled) => {
      // Return if not synced
      if (!syncEnabled) {
        return;
      }

      // Get bookmarks sync size and calculate sync data percentage used
      return this.syncSvc.getSyncSize().then((bookmarksSyncSize) => {
        this.syncDataSize = bookmarksSyncSize / 1024;
        this.syncDataUsed = Math.ceil((this.syncDataSize / this.serviceInfo.maxSyncSize) * 150);
        this.$timeout(() => {
          // Add a slight delay when setting progress bar width to ensure transitions are enabled
          this.dataUsageProgressWidth = this.syncDataUsed;
        }, 250);
      });
    });
  }
}
