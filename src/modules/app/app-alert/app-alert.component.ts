import './app-alert.component.scss';
import { Component, Input, OnInit, Output } from 'angular-ts-decorators';
import { autobind } from 'core-decorators';
import Strings from '../../../../res/strings/en.json';
import { Alert } from '../../shared/alert/alert.interface';
import { PlatformService } from '../../shared/global-shared.interface';
import UtilityService from '../../shared/utility/utility.service';

@autobind
@Component({
  controllerAs: 'vm',
  selector: 'alertPanel',
  template: require('./app-alert.component.html')
})
export default class AppAlertComponent {
  platformSvc: PlatformService;
  utilitySvc: UtilityService;

  strings = Strings;

  @Input() alert: Alert;

  @Output() close: () => void;

  static $inject = ['PlatformService', 'UtilityService'];
  constructor(PlatformSvc: PlatformService, UtilitySvc: UtilityService) {
    this.platformSvc = PlatformSvc;
    this.utilitySvc = UtilitySvc;
  }
}
