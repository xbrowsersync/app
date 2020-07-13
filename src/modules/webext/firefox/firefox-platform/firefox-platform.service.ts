import { Injectable } from 'angular-ts-decorators';
import { autobind } from 'core-decorators';
import { browser } from 'webextension-polyfill-ts';
import Strings from '../../../../../res/strings/en.json';
import { PlatformService } from '../../../shared/global-shared.interface';
import WebExtPlatformService from '../../webext-platform/webext-platform.service';

@autobind
@Injectable('PlatformService')
export default class FirefoxPlatformService extends WebExtPlatformService implements PlatformService {
  getHelpPages(): string[] {
    const pages = [
      this.getConstant(Strings.help_Page_Welcome_Desktop_Content),
      this.getConstant(Strings.help_Page_BeforeYouBegin_Firefox_Content),
      this.getConstant(Strings.help_Page_FirstSync_Desktop_Content),
      this.getConstant(Strings.help_Page_Service_Content),
      this.getConstant(Strings.help_Page_SyncId_Content),
      this.getConstant(Strings.help_Page_ExistingId_Desktop_Content),
      this.getConstant(Strings.help_Page_Searching_Desktop_Content),
      this.getConstant(Strings.help_Page_AddingBookmarks_Firefox_Content),
      this.getConstant(Strings.help_Page_NativeFeatures_Firefox_Content),
      this.getConstant(Strings.help_Page_BackingUp_Desktop_Content),
      this.getConstant(Strings.help_Page_Shortcuts_Firefox_Content),
      this.getConstant(Strings.help_Page_Mobile_Content),
      this.getConstant(Strings.help_Page_FurtherSupport_Content)
    ];

    return pages;
  }

  getNewTabUrl(): string {
    return 'about:newtab';
  }

  openUrl(url: string): void {
    // If url is native config page, open new tab intead
    if (this.urlIsNativeConfigPage(url)) {
      browser.tabs.create({}).then(window.close);
      return;
    }
    super.openUrl(url);
  }

  urlIsNativeConfigPage(url: string): boolean {
    return /^about:/i.test(url);
  }

  urlIsSupported(url: string): boolean {
    return /^(?!chrome|data)[\w-]+:/i.test(url);
  }
}
