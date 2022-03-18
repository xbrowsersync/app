import { Component, OnInit } from 'angular-ts-decorators';
import { boundMethod } from 'autobind-decorator';
import { PlatformService } from '../../shared/global-shared.interface';
import { UtilityService } from '../../shared/utility/utility.service';
import { AppHelperService } from '../shared/app-helper/app-helper.service';

@Component({
  controllerAs: 'vm',
  selector: 'appSupport',
  styles: [require('./app-support.component.scss')],
  template: require('./app-support.component.html')
})
export class AppSupportComponent implements OnInit {
  Strings = require('../../../../res/strings/en.json');

  $timeout: ng.ITimeoutService;
  appHelperSvc: AppHelperService;
  platformSvc: PlatformService;
  utilitySvc: UtilityService;

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

  @boundMethod
  close(event?: Event): void {
    event?.preventDefault();
    this.appHelperSvc.switchView();
  }

  ngOnInit(): void {
    // Set initial focus
    this.appHelperSvc.focusOnElement('.focused');

    // Set links to open in new tabs
    this.appHelperSvc.attachClickEventsToNewTabLinks();
  }
}
