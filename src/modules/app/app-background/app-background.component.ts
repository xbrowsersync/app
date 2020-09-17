import { Component, Input, OnInit } from 'angular-ts-decorators';
import autobind from 'autobind-decorator';
import Globals from '../../shared/global-shared.constants';
import { AppViewType } from '../app.enum';

@autobind
@Component({
  controllerAs: 'vm',
  selector: 'appBackground',
  styles: [require('./app-background.component.scss')],
  template: require('./app-background.component.html')
})
export default class AppBackgroundComponent implements OnInit {
  $timeout: ng.ITimeoutService;

  @Input() currentView: AppViewType;

  animateClouds = false;
  AppViewType = AppViewType;

  static $inject = ['$timeout'];
  constructor($timeout: ng.ITimeoutService) {
    this.$timeout = $timeout;
  }

  ngOnInit(): void {
    this.$timeout(() => {
      this.animateClouds = true;
    }, Globals.InterfaceReadyTimeout);
  }
}
