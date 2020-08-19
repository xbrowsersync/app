import { Injectable } from 'angular-ts-decorators';
import autobind from 'autobind-decorator';
import { PlatformType } from '../../../../shared/global-shared.enum';
import { PlatformService } from '../../../../shared/global-shared.interface';
import WebExtPlatformService from '../../../webext-shared/webext-platform/webext-platform.service';

@autobind
@Injectable('PlatformService')
export default class ChromiumPlatformService extends WebExtPlatformService implements PlatformService {
  platformName = PlatformType.Chromium;

  urlIsNativeConfigPage(url: string): boolean {
    return /chrome:\/\//i.test(url ?? '');
  }

  urlIsSupported(url: string): boolean {
    return /^[\w-]+:/i.test(url ?? '');
  }
}
