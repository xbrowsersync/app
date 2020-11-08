import { Component, OnInit } from 'angular-ts-decorators';
import autobind from 'autobind-decorator';
import { PlatformService } from '../../../shared/global-shared.interface';
import UtilityService from '../../../shared/utility/utility.service';
import AppHelperService from '../../shared/app-helper/app-helper.service';

@autobind
@Component({
  controllerAs: 'vm',
  selector: 'permissionsSettings',
  styles: [require('./permissions-settings.component.scss')],
  template: require('./permissions-settings.component.html')
})
export default class PermissionsSettingsComponent implements OnInit {
  Strings = require('../../../../../res/strings/en.json');

  appHelperSvc: AppHelperService;
  platformSvc: PlatformService;
  utilitySvc: UtilityService;

  readWebsiteDataPermissionsGranted = false;

  static $inject = ['AppHelperService', 'PlatformService', 'UtilityService'];
  constructor(AppHelperSvc: AppHelperService, PlatformSvc: PlatformService, UtilitySvc: UtilityService) {
    this.appHelperSvc = AppHelperSvc;
    this.platformSvc = PlatformSvc;
    this.utilitySvc = UtilitySvc;
  }

  ngOnInit(): void {
    // Initialise view model values
    this.platformSvc.checkOptionalNativePermissions().then((permissionsGranted) => {
      this.readWebsiteDataPermissionsGranted = permissionsGranted;
    });
  }

  requestPermissions(): void {
    this.appHelperSvc.requestPermissions().then((granted) => {
      this.readWebsiteDataPermissionsGranted = granted;
    });
  }

  revokePermissions(): void {
    this.appHelperSvc.removePermissions().then(() => {
      this.readWebsiteDataPermissionsGranted = false;
    });
  }
}
