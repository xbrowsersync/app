import { Component } from 'angular-ts-decorators';
import { autobind } from 'core-decorators';
import PlatformType from '../../shared/platform-type.enum';
import WebExtAppComponent from '../../webext/webext-app/webext-app.component';

@autobind
@Component({
  controllerAs: 'vm',
  selector: 'app',
  template: require('../../app/app.component.html')
})
export default class FirefoxAppComponent extends WebExtAppComponent {
  init() {
    this.platformName = PlatformType.Firefox;
    return super.init();
  }
}
