import './app-working.component.scss';
import { Component, Input, Output } from 'angular-ts-decorators';
import { autobind } from 'core-decorators';
import Strings from '../../../../res/strings/en.json';
import { PlatformService } from '../../shared/global-shared.interface';
import UtilityService from '../../shared/utility/utility.service';

@autobind
@Component({
  controllerAs: 'vm',
  selector: 'workingPanel',
  template: require('./app-working.component.html')
})
export default class AppWorkingComponent {
  platformSvc: PlatformService;
  utilitySvc: UtilityService;

  strings = Strings;

  @Input() darker: boolean;
  @Input() enableCancelSync: boolean;
  @Input() fullsize: boolean;
  @Input() message: string;
  @Input('<ngShow') show: boolean;

  @Output() cancelSync: () => any;

  static $inject = ['PlatformService', 'UtilityService'];
  constructor(PlatformSvc: PlatformService, UtilitySvc: UtilityService) {
    this.platformSvc = PlatformSvc;
    this.utilitySvc = UtilitySvc;
  }
}
