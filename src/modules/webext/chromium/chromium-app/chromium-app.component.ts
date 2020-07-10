import { Component } from 'angular-ts-decorators';
import { autobind } from 'core-decorators';
import { PlatformType } from '../../../shared/global-shared.enum';
import WebExtAppComponent from '../../webext-app/webext-app.component';

@autobind
@Component({
  controllerAs: 'vm',
  selector: 'app',
  template: require('../../../app/app.component.html')
})
export default class ChromiumAppComponent extends WebExtAppComponent {
  init(): ng.IPromise<void> {
    this.platformName = PlatformType.Chromium;
    return super.init();
  }
}
