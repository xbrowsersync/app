import { Injectable } from 'angular-ts-decorators';
import { autobind } from 'core-decorators';
import { browser } from 'webextension-polyfill-ts';
import Strings from '../../../../../res/strings/en.json';
import { PlatformService } from '../../../shared/global-shared.interface';
import WebExtPlatformService from '../../webext-platform/webext-platform.service';

@autobind
@Injectable('PlatformService')
export default class FirefoxPlatformService extends WebExtPlatformService implements PlatformService {
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
