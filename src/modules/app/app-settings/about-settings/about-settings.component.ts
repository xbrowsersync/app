import { Component, OnInit } from 'angular-ts-decorators';
import { boundMethod } from 'autobind-decorator';
import Globals from '../../../shared/global-shared.constants';
import { PlatformService } from '../../../shared/global-shared.interface';
import { UtilityService } from '../../../shared/utility/utility.service';
import { RoutePath } from '../../app.enum';
import { AppHelperService } from '../../shared/app-helper/app-helper.service';

@Component({
  controllerAs: 'vm',
  selector: 'aboutSettings',
  styles: [require('./about-settings.component.scss')],
  template: require('./about-settings.component.html')
})
export class AboutSettingsComponent implements OnInit {
  Strings = require('../../../../../res/strings/en.json');

  appHelperSvc: AppHelperService;
  platformSvc: PlatformService;
  utilitySvc: UtilityService;

  appVersion: string;
  releaseNotesUrl: string;

  static $inject = ['AppHelperService', 'PlatformService', 'UtilityService'];
  constructor(AppHelperSvc: AppHelperService, PlatformSvc: PlatformService, UtilitySvc: UtilityService) {
    this.appHelperSvc = AppHelperSvc;
    this.platformSvc = PlatformSvc;
    this.utilitySvc = UtilitySvc;
  }

  ngOnInit(): void {
    // Initialise view model values
    this.platformSvc.getAppVersionName().then((appVersion) => {
      this.appVersion = appVersion;
      this.releaseNotesUrl = `${Globals.ReleaseNotesUrlStem}${appVersion}`;
    });
  }

  @boundMethod
  switchToSupportView(): void {
    this.appHelperSvc.switchView(RoutePath.Support);
  }
}
