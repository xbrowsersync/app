import { Component } from 'angular-ts-decorators';
import { autobind } from 'core-decorators';
import Globals from '../shared/globals';
import WebExtAppComponent from '../webext/webext-app.component';

@autobind
@Component({
  controllerAs: 'vm',
  selector: 'app',
  template: require('../app/app.component.html')
})
export default class ChromiumAppComponent extends WebExtAppComponent {
  init() {
    this.platformName = Globals.Platforms.Chrome;
    return super.init();
  }
}
