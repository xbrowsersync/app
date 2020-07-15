import { Injectable } from 'angular-ts-decorators';
import { autobind } from 'core-decorators';
import { PlatformService } from '../../../shared/global-shared.interface';
import WebExtPlatformService from '../../webext-platform/webext-platform.service';

@autobind
@Injectable('PlatformService')
export default class ChromiumPlatformService extends WebExtPlatformService implements PlatformService {
  urlIsNativeConfigPage(url: string): boolean {
    return /chrome:\/\//i.test(url ?? '');
  }

  urlIsSupported(url: string): boolean {
    return /^[\w-]+:/i.test(url ?? '');
  }
}
