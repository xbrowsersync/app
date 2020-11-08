import { Component, OnInit } from 'angular-ts-decorators';
import autobind from 'autobind-decorator';
import { PlatformService } from '../../shared/global-shared.interface';
import UtilityService from '../../shared/utility/utility.service';
import { AppEventType } from '../app.enum';
import AppHelperService from '../shared/app-helper/app-helper.service';

@autobind
@Component({
  controllerAs: 'vm',
  selector: 'appSettings',
  styles: [require('./app-settings.component.scss')],
  template: require('./app-settings.component.html')
})
export default class AppSettingsComponent implements OnInit {
  Strings = require('../../../../res/strings/en.json');

  $timeout: ng.ITimeoutService;
  appHelperSvc: AppHelperService;
  platformSvc: PlatformService;
  utilitySvc: UtilityService;

  syncEnabled: boolean;

  static $inject = ['$timeout', 'AppHelperService', 'PlatformService', 'UtilityService'];
  constructor(
    $timeout: ng.ITimeoutService,
    AppHelperSvc: AppHelperService,
    PlatformSvc: PlatformService,
    UtilitySvc: UtilityService
  ) {
    this.$timeout = $timeout;
    this.appHelperSvc = AppHelperSvc;
    this.platformSvc = PlatformSvc;
    this.utilitySvc = UtilitySvc;
  }

  close(): void {
    this.appHelperSvc.switchView();
  }

  ngOnInit(): void {
    // Initialise view model values
    this.utilitySvc.isSyncEnabled().then((syncEnabled) => {
      this.syncEnabled = syncEnabled;

      // Set links to open in new tabs
      this.appHelperSvc.attachClickEventsToNewTabLinks();
    });
  }

  refreshSyncDataUsage(): void {
    this.utilitySvc.broadcastEvent(AppEventType.RefreshSyncDataUsage);
  }
}
