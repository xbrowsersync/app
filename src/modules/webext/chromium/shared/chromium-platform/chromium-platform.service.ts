import { Injectable } from 'angular-ts-decorators';
import autobind from 'autobind-decorator';
import * as detectBrowser from 'detect-browser';
import { BrowserName, PlatformType } from '../../../../shared/global-shared.enum';
import WebExtPlatformService from '../../../shared/webext-platform/webext-platform.service';

@autobind
@Injectable('PlatformService')
export default class ChromiumPlatformService extends WebExtPlatformService {
  platformName = PlatformType.Chromium;

  getNewTabUrl(): string {
    const browser = this.utilitySvc.isBraveBrowser() ? BrowserName.Brave : detectBrowser.detect().name;
    switch (browser) {
      case BrowserName.Brave:
        return 'brave://newtab/';
      case BrowserName.Edge:
        return 'edge://newtab/';
      default:
        return 'chrome://newtab/';
    }
  }

  urlIsNativeConfigPage(url: string): boolean {
    return /(chrome|edge):\/\//i.test(url ?? '');
  }

  urlIsSupported(url: string): boolean {
    return /^[\w-]+:/i.test(url ?? '');
  }
}
