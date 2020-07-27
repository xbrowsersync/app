import './app-support.component.scss';
import { Component, Output } from 'angular-ts-decorators';
import { autobind } from 'core-decorators';
import Strings from '../../../../res/strings/en.json';
import { PlatformService } from '../../shared/global-shared.interface';
import UtilityService from '../../shared/utility/utility.service';

@autobind
@Component({
  controllerAs: 'vm',
  selector: 'supportPanel',
  template: require('./app-support.component.html')
})
export default class AppSupportComponent {
  platformSvc: PlatformService;
  utilitySvc: UtilityService;

  strings = Strings;

  @Output() close: () => any;
  @Output() openUrl: () => any;

  static $inject = ['PlatformService', 'UtilityService'];
  constructor(PlatformSvc: PlatformService, UtilitySvc: UtilityService) {
    this.platformSvc = PlatformSvc;
    this.utilitySvc = UtilitySvc;
  }
}
