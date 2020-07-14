import { Component } from 'angular-ts-decorators';
import { autobind } from 'core-decorators';
import Strings from '../../../../../res/strings/en.json';
import { PlatformType } from '../../../shared/global-shared.enum';
import WebExtAppComponent from '../../webext-app/webext-app.component';

@autobind
@Component({
  controllerAs: 'vm',
  selector: 'app',
  template: require('../../../app/app.component.html')
})
export default class ChromiumAppComponent extends WebExtAppComponent {
  getHelpPages(): string[] {
    const pages = [
      this.platformSvc.getConstant(Strings.help_Page_Welcome_Desktop_Content),
      this.platformSvc.getConstant(Strings.help_Page_BeforeYouBegin_Chrome_Content),
      this.platformSvc.getConstant(Strings.help_Page_FirstSync_Desktop_Content),
      this.platformSvc.getConstant(Strings.help_Page_Service_Content),
      this.platformSvc.getConstant(Strings.help_Page_SyncId_Content),
      this.platformSvc.getConstant(Strings.help_Page_ExistingId_Desktop_Content),
      this.platformSvc.getConstant(Strings.help_Page_Searching_Desktop_Content),
      this.platformSvc.getConstant(Strings.help_Page_AddingBookmarks_Chrome_Content),
      this.platformSvc.getConstant(Strings.help_Page_NativeFeatures_Chrome_Content),
      this.platformSvc.getConstant(Strings.help_Page_BackingUp_Desktop_Content),
      this.platformSvc.getConstant(Strings.help_Page_Shortcuts_Chrome_Content),
      this.platformSvc.getConstant(Strings.help_Page_Mobile_Content),
      this.platformSvc.getConstant(Strings.help_Page_FurtherSupport_Content)
    ];

    return pages;
  }

  init(): ng.IPromise<void> {
    this.platformName = PlatformType.Chromium;
    return super.init();
  }
}
