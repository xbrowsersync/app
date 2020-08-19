import './about-settings.component.scss';
import { Component, OnInit } from 'angular-ts-decorators';
import autobind from 'autobind-decorator';
import Globals from '../../../shared/global-shared.constants';
import { PlatformService } from '../../../shared/global-shared.interface';
import UtilityService from '../../../shared/utility/utility.service';
import { AppViewType } from '../../app.enum';
import { AppHelperService } from '../../app.interface';

@autobind
@Component({
  controllerAs: 'vm',
  selector: 'aboutSettings',
  template: require('./about-settings.component.html')
})
export default class AboutSettingsComponent implements OnInit {
  Strings = require('../../../../../res/strings/en.json');

  appHelperSvc: AppHelperService;
  platformSvc: PlatformService;
  utilitySvc: UtilityService;

  appVersion: string;

  static $inject = ['AppHelperService', 'PlatformService', 'UtilityService'];
  constructor(AppHelperSvc: AppHelperService, PlatformSvc: PlatformService, UtilitySvc: UtilityService) {
    this.appHelperSvc = AppHelperSvc;
    this.platformSvc = PlatformSvc;
    this.utilitySvc = UtilitySvc;
  }

  displayReleaseNotes(): void {
    this.platformSvc.getAppVersion().then((appVersion) => {
      const versionTag = appVersion.replace(/([a-z]+)\d+$/i, '$1');
      const url = Globals.ReleaseNotesUrlStem + versionTag;
      this.appHelperSvc.openUrl(null, url);
    });
  }

  ngOnInit(): void {
    // Initialise view model values
    this.platformSvc.getAppVersion().then((appVersion) => {
      this.appVersion = appVersion;
    });
  }

  switchToSupportView(): void {
    this.appHelperSvc.switchView({ view: AppViewType.Support });
  }
}
