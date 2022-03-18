import { Injectable } from 'angular-ts-decorators';
import { boundMethod } from 'autobind-decorator';
import browser from 'webextension-polyfill';
import { PlatformType } from '../../../../shared/global-shared.enum';
import { WebExtPlatformService } from '../../../shared/webext-platform/webext-platform.service';

@Injectable('PlatformService')
export class FirefoxPlatformService extends WebExtPlatformService {
  platformName = PlatformType.Firefox;

  getNewTabUrl(): string {
    return 'about:newtab';
  }

  @boundMethod
  openUrl(url: string): void {
    // If url is native config page, open new tab intead
    if (this.urlIsNativeConfigPage(url)) {
      browser.tabs.create({}).then(window.close);
      return;
    }
    super.openUrl(url);
  }

  urlIsNativeConfigPage(url: string): boolean {
    return /^about:/i.test(url ?? '');
  }

  urlIsSupported(url: string): boolean {
    return /^(?!chrome|data)[\w-]+:/i.test(url ?? '');
  }
}
