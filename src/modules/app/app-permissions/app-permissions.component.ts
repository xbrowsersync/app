import './app-permissions.component.scss';
import { Component, OnInit } from 'angular-ts-decorators';
import autobind from 'autobind-decorator';
import Strings from '../../../../res/strings/en.json';
import { PlatformService } from '../../shared/global-shared.interface';
import { StoreKey } from '../../shared/store/store.enum';
import StoreService from '../../shared/store/store.service';
import UtilityService from '../../shared/utility/utility.service';
import { AppHelperService } from '../app.interface';

@autobind
@Component({
  controllerAs: 'vm',
  selector: 'appPermissions',
  template: require('./app-permissions.component.html')
})
export default class AppPermissionsComponent implements OnInit {
  $q: ng.IQService;
  $timeout: ng.ITimeoutService;
  appHelperSvc: AppHelperService;
  platformSvc: PlatformService;
  storeSvc: StoreService;
  utilitySvc: UtilityService;

  strings = Strings;

  static $inject = ['$q', '$timeout', 'AppHelperService', 'PlatformService', 'StoreService', 'UtilityService'];
  constructor(
    $q: ng.IQService,
    $timeout: ng.ITimeoutService,
    AppHelperSvc: AppHelperService,
    PlatformSvc: PlatformService,
    StoreSvc: StoreService,
    UtilitySvc: UtilityService
  ) {
    this.$q = $q;
    this.$timeout = $timeout;
    this.appHelperSvc = AppHelperSvc;
    this.platformSvc = PlatformSvc;
    this.storeSvc = StoreSvc;
    this.utilitySvc = UtilitySvc;
  }

  ngOnInit(): void {
    // Set initial focus
    this.appHelperSvc.focusOnElement('.focused');
  }

  requestPermissions(): ng.IPromise<void> {
    return this.$q
      .all([this.appHelperSvc.requestPermissions(), this.storeSvc.set(StoreKey.DisplayPermissions, false)])
      .then(() => {})
      .finally(this.appHelperSvc.switchView);
  }
}
