import './app-support.component.scss';
import { Component, Output } from 'angular-ts-decorators';
import { autobind } from 'core-decorators';
import Strings from '../../../../res/strings/en.json';
import { PlatformService } from '../../shared/global-shared.interface';
import UtilityService from '../../shared/utility/utility.service';
import { AppHelperService } from '../app.interface';

@autobind
@Component({
  controllerAs: 'vm',
  selector: 'appSupport',
  template: require('./app-support.component.html')
})
export default class AppSupportComponent {
  appHelperSvc: AppHelperService;
  platformSvc: PlatformService;
  utilitySvc: UtilityService;

  strings = Strings;

  @Output() close: () => any;

  static $inject = ['AppHelperService', 'PlatformService', 'UtilityService'];
  constructor(AppHelperSvc: AppHelperService, PlatformSvc: PlatformService, UtilitySvc: UtilityService) {
    this.appHelperSvc = AppHelperSvc;
    this.platformSvc = PlatformSvc;
    this.utilitySvc = UtilitySvc;
  }
}
