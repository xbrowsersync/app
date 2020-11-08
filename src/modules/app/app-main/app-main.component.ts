import './app-main.component.scss';
import { OnInit } from 'angular-ts-decorators';
import autobind from 'autobind-decorator';
import AlertService from '../../shared/alert/alert.service';
import BookmarkHelperService from '../../shared/bookmark/bookmark-helper/bookmark-helper.service.js';
import { PlatformService } from '../../shared/global-shared.interface';
import LogService from '../../shared/log/log.service';
import NetworkService from '../../shared/network/network.service';
import SettingsService from '../../shared/settings/settings.service';
import StoreService from '../../shared/store/store.service';
import UtilityService from '../../shared/utility/utility.service';
import WorkingService from '../../shared/working/working.service';
import { AppViewType } from '../app.enum';
import AppHelperService from '../shared/app-helper/app-helper.service';

@autobind
export default class AppMainComponent implements OnInit {
  Strings = require('../../../../res/strings/en.json');

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

  AppViewType = AppViewType;
  currentView: AppViewType;
  darkModeEnabled: boolean;
  initialised = false;
  syncEnabled: boolean;
  vm: AppMainComponent = this;

  constructor(
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
      () => this.appHelperSvc.getCurrentView(),
      (newVal, oldVal) => {
        if (newVal !== oldVal) {
          this.changeView(newVal.view);
        }
      }
    );

    $scope.$watch(
      () => this.settingsSvc.darkMode,
      (newVal, oldVal) => {
        if (newVal !== oldVal) {
          this.darkModeEnabled = newVal;
        }
      }
    );
  }

  changeView(view: AppViewType): void {
    if (this.currentView === view) {
      return;
    }

    // Hide loading panel and alert messages, and set current view
    this.workingSvc.hide();
    this.alertSvc.clearCurrentAlert();
    this.currentView = view;
  }

  ngOnInit(): ng.IPromise<void> {
    // Get required view model data from store
    return this.settingsSvc
      .darkModeEnabled()
      .then((darkModeEnabled) => {
        this.darkModeEnabled = darkModeEnabled;

        // Return here if view has already been set
        if (this.currentView) {
          return;
        }

        // Set initial view
        return this.appHelperSvc.switchView();
      })
      .catch((err) => {
        this.appHelperSvc.switchView().then(() => {
          throw err;
        });
      })
      .finally(() => {
        this.initialised = true;
      });
  }
}
