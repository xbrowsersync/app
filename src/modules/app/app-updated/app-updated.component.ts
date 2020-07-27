import './app-updated.component.scss';
import { Component, OnInit, Output } from 'angular-ts-decorators';
import { autobind } from 'core-decorators';
import Strings from '../../../../res/strings/en.json';
import { PlatformService } from '../../shared/global-shared.interface';
import UtilityService from '../../shared/utility/utility.service';

@autobind
@Component({
  controllerAs: 'vm',
  selector: 'updatedPanel',
  template: require('./app-updated.component.html')
})
export default class AppUpdatedComponent implements OnInit {
  platformSvc: PlatformService;
  utilitySvc: UtilityService;

  appVersion: string;
  strings = Strings;

  @Output() close: () => any;
  @Output() displayReleaseNotes: () => any;

  static $inject = ['PlatformService', 'UtilityService'];
  constructor(PlatformSvc: PlatformService, UtilitySvc: UtilityService) {
    this.platformSvc = PlatformSvc;
    this.utilitySvc = UtilitySvc;
  }

  ngOnInit(): void {
    this.platformSvc.getAppVersion().then((appVersion) => {
      this.appVersion = appVersion;
    });
  }
}
