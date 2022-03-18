import { Component, OnInit } from 'angular-ts-decorators';
import { boundMethod } from 'autobind-decorator';
import { ApiServiceType } from '../../../shared/api/api.enum';
import { ApiSyncInfo } from '../../../shared/api/api.interface';
import { PlatformService } from '../../../shared/global-shared.interface';
import { StoreKey } from '../../../shared/store/store.enum';
import { StoreService } from '../../../shared/store/store.service';
import { SyncService } from '../../../shared/sync/sync.service';
import { UtilityService } from '../../../shared/utility/utility.service';
import { WorkingService } from '../../../shared/working/working.service';
import { AppEventType, RoutePath } from '../../app.enum';
import { AppHelperService } from '../../shared/app-helper/app-helper.service';

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
  appHelperSvc: AppHelperService;
  platformSvc: PlatformService;
  storeSvc: StoreService;
  syncSvc: SyncService;
  utilitySvc: UtilityService;
  workingSvc: WorkingService;

  apiServiceType = ApiServiceType;
  displayQr = false;
  lastUpdated: string;
  nextUpdate: string;
  selectedServiceType: ApiServiceType;
  syncEnabled: boolean;
  syncId: string;
  syncIdCopied = false;
  updatesAvailable: boolean;

  static $inject = [
    '$q',
    '$timeout',
    '$scope',
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
    AppHelperSvc: AppHelperService,
    PlatformSvc: PlatformService,
    StoreSvc: StoreService,
    SyncSvc: SyncService,
    UtilitySvc: UtilityService,
    WorkingSvc: WorkingService
  ) {
    this.$q = $q;
    this.$timeout = $timeout;
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

  @boundMethod
  closeQrPanel(): void {
    this.displayQr = false;
  }

  @boundMethod
  disableSync(): void {
    this.platformSvc.disableSync().then(() => this.appHelperSvc.switchView(RoutePath.Login));
  }

  @boundMethod
  displayQrPanel(): void {
    this.displayQr = true;
  }

  ngOnInit(): void {
    this.$q
      .all([
        this.storeSvc.get<ApiSyncInfo>(StoreKey.SyncInfo),
        this.utilitySvc.getCurrentApiServiceType(),
        this.utilitySvc.isSyncEnabled()
      ])
      .then((data) => {
        const [syncInfo, selectedServiceType, syncEnabled] = data;
        this.selectedServiceType = selectedServiceType;
        this.syncId = syncInfo?.id;
        this.syncEnabled = syncEnabled;

        // Check for available sync updates on non-mobile platforms
        if (this.syncEnabled && !this.utilitySvc.isMobilePlatform(this.platformSvc.platformName)) {
          this.checkForSyncUpdates();
        }
      });
  }

  @boundMethod
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
