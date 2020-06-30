import { Component } from 'angular-ts-decorators';
import { autobind } from 'core-decorators';
import PlatformType from '../shared/platform-type.enum';
import WebExtAppComponent from '../webext/webext-app.component';

@autobind
@Component({
  controllerAs: 'vm',
  selector: 'app',
  template: require('../app/app.component.html')
})
export default class ChromiumAppComponent extends WebExtAppComponent {
  init() {
    this.platformName = PlatformType.Chromium;
    return super.init();
  }
}
