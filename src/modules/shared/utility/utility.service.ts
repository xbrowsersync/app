/* eslint-disable @typescript-eslint/naming-convention */

import angular from 'angular';
import { Injectable } from 'angular-ts-decorators';
import { boundMethod } from 'autobind-decorator';
import { compare } from 'compare-versions';
import * as detectBrowser from 'detect-browser';
import XRegExp from 'xregexp';
import { AppEventType, RoutePath } from '../../app/app.enum';
import { ApiServiceType } from '../api/api.enum';
import { ApiService, ApiServiceNames, ApiSyncInfo } from '../api/api.interface';
import { IncompleteSyncInfoError } from '../errors/errors';
import { ExceptionHandler } from '../errors/errors.interface';
import Globals from '../global-shared.constants';
import { BrowserName, PlatformType } from '../global-shared.enum';
import { Url } from '../global-shared.interface';
import { LogService } from '../log/log.service';
import { NetworkService } from '../network/network.service';
import { StoreKey } from '../store/store.enum';
import { StoreService } from '../store/store.service';

@Injectable('UtilityService')
export class UtilityService {
  $exceptionHandler: ExceptionHandler;
  $http: ng.IHttpService;
  $injector: ng.auto.IInjectorService;
  $location: ng.ILocationService;
  $q: ng.IQService;
  $rootScope: ng.IRootScopeService;
  logSvc: LogService;
  networkSvc: NetworkService;
  storeSvc: StoreService;

  static $inject = [
    '$exceptionHandler',
    '$http',
    '$injector',
    '$location',
    '$q',
    '$rootScope',
    'LogService',
    'NetworkService',
    'StoreService'
  ];
  constructor(
    $exceptionHandler: ExceptionHandler,
    $http: ng.IHttpService,
    $injector: ng.auto.IInjectorService,
    $location: ng.ILocationService,
    $q: ng.IQService,
    $rootScope: ng.IRootScopeService,
    LogSvc: LogService,
    NetworkSvc: NetworkService,
    StoreSvc: StoreService
  ) {
    this.$exceptionHandler = $exceptionHandler;
    this.$http = $http;
    this.$injector = $injector;
    this.$location = $location;
    this.$q = $q;
    this.$rootScope = $rootScope;
    this.logSvc = LogSvc;
    this.networkSvc = NetworkSvc;
    this.storeSvc = StoreSvc;
  }

  asyncWhile<T = any>(data: T, condition: (data: T) => ng.IPromise<boolean>, action: (data: T) => ng.IPromise<T>) {
    const whilst = (whilstData: T): ng.IPromise<T> => {
      return condition(whilstData).then((conditionIsTrue) =>
        conditionIsTrue ? action(whilstData).then(whilst) : this.$q.resolve(whilstData)
      );
    };

    return whilst(data);
  }

  broadcastEvent(eventType: AppEventType, eventData?: any[]): void {
    this.$rootScope.$broadcast(eventType, eventData);
  }

  checkCurrentRoute(route: RoutePath): boolean {
    return this.$location.path().indexOf(route) === 0;
  }

  checkForNewVersion(currentVersion: string): ng.IPromise<string> {
    if (!this.networkSvc.isNetworkConnected()) {
      return this.$q.resolve('');
    }

    // Get latest app version info
    return this.$http
      .get<any>(Globals.ReleaseLatestUrl)
      .then((response) => {
        const latestVersion = this.getSemVerAlignedVersion(response?.data?.tag_name ?? '');
        if (!this.compareVersions(latestVersion, currentVersion, '>', true)) {
          return '';
        }
        this.logSvc.logInfo(`${latestVersion} update available`);
        return latestVersion;
      })
      .catch(() => {
        this.logSvc.logInfo('Couldn’t check for new version');
        return '';
      });
  }

  checkSyncCredentialsExist(): ng.IPromise<ApiSyncInfo> {
    return this.storeSvc.get<ApiSyncInfo>(StoreKey.SyncInfo).then((syncInfo) => {
      if (!syncInfo?.id || !syncInfo?.password) {
        throw new IncompleteSyncInfoError();
      }
      return syncInfo;
    });
  }

  compareVersions(firstVersion: string, secondVersion: string, operator: string, includeBeta = false): boolean {
    const regex = includeBeta
      ? /^[vV]?(\d+\.\d+\.\d+(-\w+\.\d+)?)(\.\d+)?$/
      : /^[vV]?(\d+\.\d+\.\d+)(\.\d+|-\w+\.\d+)?$/;
    return compare(firstVersion?.replace(regex, '$1'), secondVersion?.replace(regex, '$1'), operator as any);
  }

  filterFalsyValues(values: string[]): string[] {
    return values.filter((x) => x);
  }

  getCurrentApiServiceType(): ng.IPromise<ApiServiceType> {
    return this.$q.resolve(ApiServiceType.xBrowserSync);
  }

  getApiService(): ng.IPromise<ApiService> {
    let apiServiceName: string;

    return this.getCurrentApiServiceType().then((currentServiceType) => {
      switch (currentServiceType) {
        case ApiServiceType.xBrowserSync:
          apiServiceName = ApiServiceNames.XbrowsersyncService;
          break;
        default:
          apiServiceName = ApiServiceNames.XbrowsersyncService;
      }

      return this.$injector.get(apiServiceName) as ApiService;
    });
  }

  getBrowserName(): string {
    const browserName = detectBrowser.detect()?.name.replace('edge-chromium', BrowserName.Edge) ?? BrowserName.Chrome;
    return this.isBraveBrowser() ? BrowserName.Brave : browserName;
  }

  getDateTimeString(date: Date): string {
    if (!date) {
      return '';
    }

    const second = `0${date.getSeconds()}`.slice(-2);
    const minute = `0${date.getMinutes()}`.slice(-2);
    const hour = `0${date.getHours()}`.slice(-2);
    const day = `0${date.getDate()}`.slice(-2);
    const month = `0${date.getMonth() + 1}`.slice(-2);
    const year = date.getFullYear();
    return year + month + day + hour + minute + second;
  }

  getInstallationId(): ng.IPromise<string> {
    return this.storeSvc.get<string>(StoreKey.InstallationId).then((installationId) => {
      if (!installationId) {
        installationId = this.uuidv4();
        return this.storeSvc.set(StoreKey.InstallationId, installationId).then(() => installationId);
      }
      return installationId;
    });
  }

  getSemVerAlignedVersion(version: string): string {
    return version.replace(/^[vV]?(\d+\.\d+\.\d+)(\.\d+|-\w+\.\d+)?$/, '$1');
  }

  getSyncVersion(): ng.IPromise<string> {
    return this.storeSvc.get<ApiSyncInfo>(StoreKey.SyncInfo).then((syncInfo) => syncInfo?.version);
  }

  getTagArrayFromText(tagText: string): string[] | undefined {
    if (angular.isUndefined(tagText ?? undefined)) {
      return;
    }

    // Split tags by comma or semi colon and filter by minimum length
    const tags = tagText.split(/[,;]/).filter((x) => x.length > Globals.LookaheadMinChars);

    // Clean and sort tags
    const cleanedTags = this.sortWords(tags.filter((x) => !!x?.trim()).map((x) => x.trim()));
    return cleanedTags;
  }

  getUniqueishId(): string {
    return window.crypto.getRandomValues(new Uint32Array(1))[0].toString(36);
  }

  @boundMethod
  handleEvent(eventHandler: (...args: any[]) => any, ...args: any[]): void {
    try {
      this.$q
        .resolve()
        .then(() => eventHandler(...args))
        .catch((err) => this.$exceptionHandler(err));
    } catch (err) {
      this.$exceptionHandler(err);
    }
  }

  isBraveBrowser(): boolean {
    return !angular.isUndefined(window.navigator.brave);
  }

  @boundMethod
  isMobilePlatform(platformName: string): boolean {
    return platformName === PlatformType.Android;
  }

  isSyncEnabled(): ng.IPromise<boolean> {
    return this.storeSvc.get<boolean>(StoreKey.SyncEnabled);
  }

  isTextInput(element: Element): boolean {
    return ['INPUT', 'TEXTAREA'].indexOf(element.nodeName) !== -1;
  }

  parseUrl(url: string): Url {
    const searchObject: any = {};
    const parser = document.createElement('a');
    parser.href = url;
    const queries = parser.search.replace(/^\?/, '').split('&');

    let split;
    for (let i = 0; i < queries.length; i += 1) {
      split = queries[i].split('=');
      searchObject[split[0]] = split[1];
    }

    return {
      protocol: parser.protocol,
      host: parser.host,
      hostname: parser.hostname,
      port: parser.port,
      pathname: parser.pathname,
      search: parser.search,
      searchObject,
      hash: parser.hash
    };
  }

  sortWords(words: string[]): string[] {
    return [...new Set(words)].sort();
  }

  splitTextIntoWords(text: string, locale: string): string[] {
    if (angular.isUndefined(text ?? undefined)) {
      return [];
    }
    const words = text!.toLocaleLowerCase(locale).replace(/['"]/g, '');
    const wordsArr = words.split(XRegExp('[^\\p{L}\\p{Nd}]', 'g'));
    return this.filterFalsyValues(wordsArr);
  }

  stopEventPropagation(event: Event): void {
    // Stop event propogation
    event?.preventDefault();
    (event as any)?.srcEvent?.stopPropagation();
  }

  stringsAreEquivalent(str1 = '', str2 = '', locale?: string): boolean {
    return str1.localeCompare(str2, locale, { sensitivity: 'base' }) === 0;
  }

  stripTags(input: string): string {
    return input ? input.replace(/<(?:.|\n)*?>/gm, '') : input;
  }

  syncIdIsValid(syncId: string): boolean {
    if (!syncId) {
      return false;
    }

    const hexStringToBytes = (hexString: string): Uint8Array => {
      const bytes = new Uint8Array(hexString.length / 2);
      for (let i = 0; i !== bytes.length; i += 1) {
        bytes[i] = parseInt(hexString.substr(i * 2, 2), 16);
      }
      return bytes;
    };

    const bytesToGuidString = (bytes: Uint8Array): string | undefined => {
      if (bytes == null) {
        return '';
      }

      if (bytes.length !== 16) {
        return '';
      }

      const _a = (bytes[3] << 24) | (bytes[2] << 16) | (bytes[1] << 8) | bytes[0];
      const _b = (bytes[5] << 8) | bytes[4];
      const _c = (bytes[7] << 8) | bytes[6];
      const _d = bytes[8];
      const _e = bytes[9];
      const _f = bytes[10];
      const _g = bytes[11];
      const _h = bytes[12];
      const _i = bytes[13];
      const _j = bytes[14];
      const _k = bytes[15];

      const hexToChar = (a: number): string => {
        a &= 0xf;
        return String.fromCharCode(a > 9 ? a - 10 + 0x61 : a + 0x30);
      };

      const hexsToChars = (guidChars: any[], offset: number, a: number, b: number, hex?: boolean): number => {
        hex = hex === undefined ? false : hex;

        if (hex) {
          guidChars[(offset += 1)] = '0';
          guidChars[(offset += 1)] = 'x';
        }
        guidChars[(offset += 1)] = hexToChar(a >> 4);
        guidChars[(offset += 1)] = hexToChar(a);
        if (hex) {
          guidChars[(offset += 1)] = ',';
          guidChars[(offset += 1)] = '0';
          guidChars[(offset += 1)] = 'x';
        }
        guidChars[(offset += 1)] = hexToChar(b >> 4);
        guidChars[(offset += 1)] = hexToChar(b);
        return offset;
      };

      const _toString = (format: string): string | undefined => {
        if (!format?.length) format = 'D';

        let guidChars = [];
        let offset = 0;
        let dash = true;
        let hex = false;

        if (format.length !== 1) {
          // all acceptable format strings are of length 1
          return;
        }

        const formatCh = format[0];

        if (formatCh === 'D' || formatCh === 'd') {
          guidChars = new Array(36);
        } else if (formatCh === 'N' || formatCh === 'n') {
          guidChars = new Array(32);
          dash = false;
        } else if (formatCh === 'B' || formatCh === 'b') {
          guidChars = new Array(38);
          guidChars[(offset += 1)] = '{';
          guidChars[37] = '}';
        } else if (formatCh === 'P' || formatCh === 'p') {
          guidChars = new Array(38);
          guidChars[(offset += 1)] = '(';
          guidChars[37] = ')';
        } else if (formatCh === 'X' || formatCh === 'x') {
          guidChars = new Array(68);
          guidChars[(offset += 1)] = '{';
          guidChars[67] = '}';
          dash = false;
          hex = true;
        } else {
          return;
        }

        if (hex) {
          // {0xdddddddd,0xdddd,0xdddd,{0xdd,0xdd,0xdd,0xdd,0xdd,0xdd,0xdd,0xdd}}
          guidChars[(offset += 1)] = '0';
          guidChars[(offset += 1)] = 'x';
          offset = hexsToChars(guidChars, offset, _a >> 24, _a >> 16);
          offset = hexsToChars(guidChars, offset, _a >> 8, _a);
          guidChars[(offset += 1)] = ',';
          guidChars[(offset += 1)] = '0';
          guidChars[(offset += 1)] = 'x';
          offset = hexsToChars(guidChars, offset, _b >> 8, _b);
          guidChars[(offset += 1)] = ',';
          guidChars[(offset += 1)] = '0';
          guidChars[(offset += 1)] = 'x';
          offset = hexsToChars(guidChars, offset, _c >> 8, _c);
          guidChars[(offset += 1)] = ',';
          guidChars[(offset += 1)] = '{';
          offset = hexsToChars(guidChars, offset, _d, _e, true);
          guidChars[(offset += 1)] = ',';
          offset = hexsToChars(guidChars, offset, _f, _g, true);
          guidChars[(offset += 1)] = ',';
          offset = hexsToChars(guidChars, offset, _h, _i, true);
          guidChars[(offset += 1)] = ',';
          offset = hexsToChars(guidChars, offset, _j, _k, true);
          guidChars[(offset += 1)] = '}';
        } else {
          // [{|(]dddddddd[-]dddd[-]dddd[-]dddd[-]dddddddddddd[}|)]
          offset = hexsToChars(guidChars, offset, _a >> 24, _a >> 16);
          offset = hexsToChars(guidChars, offset, _a >> 8, _a);
          if (dash) guidChars[(offset += 1)] = '-';
          offset = hexsToChars(guidChars, offset, _b >> 8, _b);
          if (dash) guidChars[(offset += 1)] = '-';
          offset = hexsToChars(guidChars, offset, _c >> 8, _c);
          if (dash) guidChars[(offset += 1)] = '-';
          offset = hexsToChars(guidChars, offset, _d, _e);
          if (dash) guidChars[(offset += 1)] = '-';
          offset = hexsToChars(guidChars, offset, _f, _g);
          offset = hexsToChars(guidChars, offset, _h, _i);
          offset = hexsToChars(guidChars, offset, _j, _k);
        }

        return guidChars.join('');
      };

      return _toString('D')?.split(',').join('');
    };

    return !!bytesToGuidString(hexStringToBytes(syncId));
  }

  trimToNearestWord(text: string, limit: number): string {
    if (!text) {
      return '';
    }

    text = text.trim();

    if (limit >= text.length) {
      return text;
    }

    const trimmedText = `${text.substring(0, text.lastIndexOf(' ', limit))}\u2026`;
    return trimmedText;
  }

  uuidv4(): string {
    return `${1e7}-${1e3}-${4e3}-${8e3}-${1e11}`.replace(/[018]/g, (c) => {
      const num = parseInt(c, 10);
      return (num ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (num / 4)))).toString(16);
    });
  }
}
