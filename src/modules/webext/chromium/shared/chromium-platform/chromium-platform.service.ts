import { Injectable } from 'angular-ts-decorators';
import { BrowserName, PlatformType } from '../../../../shared/global-shared.enum';
import { WebExtPlatformService } from '../../../shared/webext-platform/webext-platform.service';

@Injectable('PlatformService')
export class ChromiumPlatformService extends WebExtPlatformService {
  platformName = PlatformType.Chromium;

  getNewTabUrl(): string {
    const browserName = this.utilitySvc.getBrowserName();
    switch (browserName) {
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
