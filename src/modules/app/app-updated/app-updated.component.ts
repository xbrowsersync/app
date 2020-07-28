import './app-updated.component.scss';
import { Component, OnInit, Output } from 'angular-ts-decorators';
import { autobind } from 'core-decorators';
import Strings from '../../../../res/strings/en.json';
import Globals from '../../shared/global-shared.constants';
import { PlatformService } from '../../shared/global-shared.interface';
import UtilityService from '../../shared/utility/utility.service';
import { AppHelperService } from '../app.interface';

@autobind
@Component({
  controllerAs: 'vm',
  selector: 'appUpdated',
  template: require('./app-updated.component.html')
})
export default class AppUpdatedComponent implements OnInit {
  appHelperSvc: AppHelperService;
  platformSvc: PlatformService;
  utilitySvc: UtilityService;

  appVersion: string;
  strings = Strings;

  @Output() close: () => any;
  @Output() displayMainView: () => any;

  static $inject = ['AppHelperService', 'PlatformService', 'UtilityService'];
  constructor(AppHelperSvc: AppHelperService, PlatformSvc: PlatformService, UtilitySvc: UtilityService) {
    this.appHelperSvc = AppHelperSvc;
    this.platformSvc = PlatformSvc;
    this.utilitySvc = UtilitySvc;
  }

  displayReleaseNotes() {
    return this.platformSvc
      .getAppVersion()
      .then((appVersion) => {
        const versionTag = appVersion.replace(/([a-z]+)\d+$/i, '$1');
        const url = Globals.ReleaseNotesUrlStem + versionTag;
        this.appHelperSvc.openUrl(null, url);
      })
      .then(this.displayMainView);
  }

  ngOnInit(): void {
    this.platformSvc.getAppVersion().then((appVersion) => {
      this.appVersion = appVersion;
    });
  }
}
