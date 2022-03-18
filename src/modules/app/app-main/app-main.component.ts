import './app-main.component.scss';
import { OnInit } from 'angular-ts-decorators';
import { AlertService } from '../../shared/alert/alert.service';
import { BookmarkHelperService } from '../../shared/bookmark/bookmark-helper/bookmark-helper.service.js';
import { PlatformService } from '../../shared/global-shared.interface';
import { LogService } from '../../shared/log/log.service';
import { NetworkService } from '../../shared/network/network.service';
import { SettingsService } from '../../shared/settings/settings.service';
import { StoreService } from '../../shared/store/store.service';
import { UtilityService } from '../../shared/utility/utility.service';
import { WorkingService } from '../../shared/working/working.service';
import { RoutePath } from '../app.enum';
import { AppHelperService } from '../shared/app-helper/app-helper.service';

export abstract class AppMainComponent implements OnInit {
  Strings = require('../../../../res/strings/en.json');

  $location: ng.ILocationService;
  $q: ng.IQService;
  $timeout: ng.ITimeoutService;
  alertSvc: AlertService;
  appHelperSvc: AppHelperService;
  bookmarkHelperSvc: BookmarkHelperService;
  logSvc: LogService;
  networkSvc: NetworkService;
  platformSvc: PlatformService;
  settingsSvc: SettingsService;
  storeSvc: StoreService;
  utilitySvc: UtilityService;
  workingSvc: WorkingService;

  RoutePath = RoutePath;
  darkModeEnabled: boolean;
  disableTransitions = true;
  initialised = false;
  vm: AppMainComponent = this;

  constructor(
    $location: ng.ILocationService,
    $q: ng.IQService,
    $scope: ng.IScope,
    $timeout: ng.ITimeoutService,
    AlertSvc: AlertService,
    AppHelperSvc: AppHelperService,
    BookmarkHelperSvc: BookmarkHelperService,
    LogSvc: LogService,
    NetworkSvc: NetworkService,
    PlatformSvc: PlatformService,
    SettingsSvc: SettingsService,
    StoreSvc: StoreService,
    UtilitySvc: UtilityService,
    WorkingSvc: WorkingService
  ) {
    this.$location = $location;
    this.$q = $q;
    this.$timeout = $timeout;
    this.alertSvc = AlertSvc;
    this.appHelperSvc = AppHelperSvc;
    this.bookmarkHelperSvc = BookmarkHelperSvc;
    this.logSvc = LogSvc;
    this.networkSvc = NetworkSvc;
    this.platformSvc = PlatformSvc;
    this.settingsSvc = SettingsSvc;
    this.storeSvc = StoreSvc;
    this.utilitySvc = UtilitySvc;
    this.workingSvc = WorkingSvc;

    $scope.$watch(
      () => this.settingsSvc.darkMode,
      (newVal, oldVal) => {
        if (newVal !== oldVal) {
          this.darkModeEnabled = newVal;
        }
      }
    );
  }

  ngOnInit(): ng.IPromise<void> {
    // Get required view model data from store
    return this.settingsSvc
      .darkModeEnabled()
      .then((darkModeEnabled) => {
        this.darkModeEnabled = darkModeEnabled;

        // Check if a sync is currently in progress
        return this.appHelperSvc.getCurrentSync().then((currentSync) => {
          // Return here if view has already been set or waiting for syncs to finish
          if (this.$location.path() !== '/' || currentSync) {
            return;
          }

          // Set initial view
          return this.appHelperSvc.switchView();
        });
      })
      .catch((err) => {
        this.appHelperSvc.switchView().then(() => {
          throw err;
        });
      })
      .finally(() => {
        this.initialised = true;
        this.disableTransitions = false;
      });
  }

  protected abstract workingCancelAction(): ng.IPromise<void>;
}
