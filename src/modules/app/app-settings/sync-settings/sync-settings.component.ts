import { Component, OnInit } from 'angular-ts-decorators';
import autobind from 'autobind-decorator';
import { ApiServiceStatus } from '../../../shared/api/api.enum';
import { ApiXbrowsersyncServiceInfo } from '../../../shared/api/api-xbrowsersync/api-xbrowsersync.interface';
import { ApiXbrowsersyncService } from '../../../shared/api/api-xbrowsersync/api-xbrowsersync.service';
import { BookmarkHelperService } from '../../../shared/bookmark/bookmark-helper/bookmark-helper.service';
import { PlatformService } from '../../../shared/global-shared.interface';
import { NetworkService } from '../../../shared/network/network.service';
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
  bookmarkHelperSvc: BookmarkHelperService;
  networkSvc: NetworkService;
  platformSvc: PlatformService;
  storeSvc: StoreService;
  syncSvc: SyncService;
  utilitySvc: UtilityService;
  workingSvc: WorkingService;

  apiServiceStatus = ApiServiceStatus;
  dataUsageProgressWidth = 0;
  displayQr = false;
  lastUpdated: string;
  nextUpdate: string;
  serviceInfo: ApiXbrowsersyncServiceInfo;
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
    'ApiService',
    'AppHelperService',
    'BookmarkHelperService',
    'NetworkService',
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
    BookmarkHelperSvc: BookmarkHelperService,
    NetworkSvc: NetworkService,
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
    this.bookmarkHelperSvc = BookmarkHelperSvc;
    this.networkSvc = NetworkSvc;
    this.platformSvc = PlatformSvc;
    this.storeSvc = StoreSvc;
    this.syncSvc = SyncSvc;
    this.utilitySvc = UtilitySvc;
    this.workingSvc = WorkingSvc;

    $scope.$on(AppEventType.SyncDisabled, () => {
      this.syncEnabled = false;
    });
    $scope.$on(AppEventType.RefreshSyncDataUsage, () => this.refreshSyncDataUsage());
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
        this.utilitySvc.getServiceUrl(),
        this.utilitySvc.isSyncEnabled()
      ])
      .then((data) => {
        const [syncId, serviceUrl, syncEnabled] = data;
        this.syncId = syncId;
        this.serviceInfo = {
          url: serviceUrl
        };
        this.syncEnabled = syncEnabled;

        // Check for available sync updates on non-mobile platforms
        if (this.syncEnabled && !this.utilitySvc.isMobilePlatform(this.platformSvc.platformName)) {
          this.checkForSyncUpdates();
        }

        // Update service status and display info
        this.refreshServiceStatus()
          // Set service message links to open in new tabs
          .then(() => this.appHelperSvc.attachClickEventsToNewTabLinks(document.querySelector('.service-message')))
          // Refresh data usage meter
          .then(() => this.refreshSyncDataUsage());
      });
  }

  refreshServiceStatus(): ng.IPromise<void> {
    return this.apiSvc.formatServiceInfo().then((formattedServiceInfo) => {
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
