import { Component, OnInit } from 'angular-ts-decorators';
import autobind from 'autobind-decorator';
import { ApiServiceStatus, ApiServiceType } from '../../../shared/api/api.enum';
import { ApiXbrowsersyncServiceInfo } from '../../../shared/api/api-xbrowsersync/api-xbrowsersync.interface';
import { ApiXbrowsersyncService } from '../../../shared/api/api-xbrowsersync/api-xbrowsersync.service';
import { PlatformService } from '../../../shared/global-shared.interface';
import { StoreKey } from '../../../shared/store/store.enum';
import { StoreService } from '../../../shared/store/store.service';
import { SyncService } from '../../../shared/sync/sync.service';
import { UtilityService } from '../../../shared/utility/utility.service';
import { WorkingService } from '../../../shared/working/working.service';
import { AppEventType, RoutePath } from '../../app.enum';
import { AppHelperService } from '../../shared/app-helper/app-helper.service';

@autobind
@Component({
  controllerAs: 'vm',
  selector: 'syncSettings',
  styles: [require('./sync-settings.component.scss')],
  template: require('./sync-settings.component.html')
})
export class SyncSettingsComponent implements OnInit {
  Strings = require('../../../../../res/strings/en.json');

  $q: ng.IQService;
  $timeout: ng.ITimeoutService;
  apiSvc: ApiXbrowsersyncService;
  appHelperSvc: AppHelperService;
  platformSvc: PlatformService;
  storeSvc: StoreService;
  syncSvc: SyncService;
  utilitySvc: UtilityService;
  workingSvc: WorkingService;

  apiServiceStatus = ApiServiceStatus;
  apiServiceType = ApiServiceType;
  displayQr = false;
  lastUpdated: string;
  nextUpdate: string;
  selectedServiceType: ApiServiceType;
  serviceInfo: ApiXbrowsersyncServiceInfo;
  syncEnabled: boolean;
  syncId: string;
  syncIdCopied = false;
  updatesAvailable: boolean;

  static $inject = [
    '$q',
    '$timeout',
    '$scope',
    'ApiService',
    'AppHelperService',
    'PlatformService',
    'StoreService',
    'SyncService',
    'UtilityService',
    'WorkingService'
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
    UtilitySvc: UtilityService,
    WorkingSvc: WorkingService
  ) {
    this.$q = $q;
    this.$timeout = $timeout;
    this.apiSvc = ApiSvc;
    this.appHelperSvc = AppHelperSvc;
    this.platformSvc = PlatformSvc;
    this.storeSvc = StoreSvc;
    this.syncSvc = SyncSvc;
    this.utilitySvc = UtilitySvc;
    this.workingSvc = WorkingSvc;

    $scope.$on(AppEventType.SyncDisabled, () => {
      this.syncEnabled = false;
    });
  }

  checkForSyncUpdates(): ng.IPromise<void> {
    return this.$q
      .all([
        this.syncSvc.checkForUpdates().catch(() => {}),
        this.appHelperSvc.getNextScheduledSyncUpdateCheck(),
        this.appHelperSvc.getSyncQueueLength(),
        this.storeSvc.get<string>(StoreKey.LastUpdated)
      ])
      .then((data) => {
        const [updatesAvailable, nextUpdateDate, syncQueueLength, lastUpdated] = data;
        if (updatesAvailable || syncQueueLength > 0) {
          this.updatesAvailable = true;
          this.nextUpdate = this.platformSvc
            .getI18nString(this.Strings.View.Settings.Sync.UpdatesAvailable.True)
            .replace('{date}', nextUpdateDate.toLocaleTimeString());
        } else {
          this.updatesAvailable = false;
          const lastUpdatedDate = new Date(lastUpdated);
          this.lastUpdated = this.platformSvc
            .getI18nString(this.Strings.View.Settings.Sync.UpdatesAvailable.False)
            .replace('{date}', lastUpdatedDate.toLocaleString());
        }
      });
  }

  closeQrPanel(): void {
    this.displayQr = false;
  }

  disableSync(): void {
    this.platformSvc.disableSync().then(() => this.appHelperSvc.switchView(RoutePath.Login));
  }

  displayQrPanel(): void {
    this.displayQr = true;
  }

  ngOnInit(): void {
    // Get required view model data from store
    this.$q
      .all([
        this.storeSvc.get<string>(StoreKey.SyncId),
        this.utilitySvc.getServiceType(),
        this.utilitySvc.getServiceUrl(),
        this.utilitySvc.isSyncEnabled()
      ])
      .then((data) => {
        const [syncId, selectedServiceType, serviceUrl, syncEnabled] = data;
        this.selectedServiceType = selectedServiceType;
        this.syncId = syncId;
        this.syncEnabled = syncEnabled;
        this.serviceInfo = {
          url: serviceUrl
        };

        // Check for available sync updates on non-mobile platforms
        if (this.syncEnabled && !this.utilitySvc.isMobilePlatform(this.platformSvc.platformName)) {
          this.checkForSyncUpdates();
        }

        // Update service status and display info
        this.refreshServiceStatus();
      });
  }

  refreshServiceStatus(): ng.IPromise<void> {
    return this.apiSvc.formatServiceInfo().then((formattedServiceInfo) => {
      this.serviceInfo = {
        ...this.serviceInfo,
        ...formattedServiceInfo
      };
    });
  }

  syncUpdates() {
    // Display loading panel and sync updates
    this.workingSvc.show();
    return this.platformSvc
      .queueSync()
      .then(() => this.appHelperSvc.syncBookmarksSuccess())
      .catch((err) => {
        return this.appHelperSvc.syncBookmarksFailed(err).then(() => {
          throw err;
        });
      });
  }
}
