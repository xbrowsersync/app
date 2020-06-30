import { Injectable } from 'angular-ts-decorators';
import compareVersions from 'compare-versions';
import { autobind } from 'core-decorators';
import _ from 'underscore';
import ExceptionHandler from '../exceptions/exception-handler.interface';
import Globals from '../globals';
import Url from '../../../interfaces/url.interface';
import LogService from '../log/log.service';
import NetworkService from '../network/network.service';
import PlatformType from '../platform-type.enum';
import StoreService from '../store/store.service';
import StoreKey from '../store/store-key.enum';

@autobind
@Injectable('UtilityService')
export default class UtilityService {
  $exceptionHandler: ExceptionHandler;
  $http: ng.IHttpService;
  $q: ng.IQService;
  logSvc: LogService;
  networkSvc: NetworkService;
  storeSvc: StoreService;

  static $inject = ['$exceptionHandler', '$http', '$q', 'LogService', 'NetworkService', 'StoreService'];
  constructor(
    $exceptionHandler: ExceptionHandler,
    $http: ng.IHttpService,
    $q: ng.IQService,
    LogSvc: LogService,
    NetworkSvc: NetworkService,
    StoreSvc: StoreService
  ) {
    this.$exceptionHandler = $exceptionHandler;
    this.$http = $http;
    this.$q = $q;
    this.logSvc = LogSvc;
    this.networkSvc = NetworkSvc;
    this.storeSvc = StoreSvc;
  }

  checkForNewVersion(): ng.IPromise<string> {
    if (!this.networkSvc.isNetworkConnected()) {
      return this.$q.resolve('');
    }

    // Get latest app version info
    return this.$http
      .get<any>(Globals.ReleaseLatestUrl)
      .then((response) => {
        const latestVersion = response && response.data ? response.data.tag_name : '';
        if (!compareVersions.compare(latestVersion, Globals.AppVersion, '>')) {
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

  getServiceUrl(): ng.IPromise<string> {
    // Get service url from local storage
    return this.storeSvc.get<string>(StoreKey.ServiceUrl).then((cachedServiceUrl) => {
      // If no service url cached, use default
      return cachedServiceUrl || Globals.URL.DefaultServiceUrl;
    });
  }

  getTagArrayFromText(tagText: string): string[] {
    if (!tagText) {
      return null;
    }

    // Conver to lowercase and split tags into array
    let tags = tagText.toLowerCase().replace(/['"]/g, '').split(',');

    // Clean and sort tags
    tags = _.chain(tags)
      .map((tag) => {
        return tag.trim();
      })
      .compact()
      .uniq()
      .sortBy((tag) => {
        return tag;
      })
      .value();

    return tags;
  }

  getUniqueishId(): string {
    return window.crypto.getRandomValues(new Uint32Array(1))[0].toString(36);
  }

  getVersionTag(): string {
    const versionTag = Globals.AppVersion.replace(/([a-z]+)\d+$/i, '$1');
    return versionTag;
  }

  handleEvent(eventHandler: (...args) => any, ...args): void {
    try {
      this.$q
        .resolve()
        .then(() => eventHandler(...args))
        .catch(this.$exceptionHandler);
    } catch (err) {
      this.$exceptionHandler(err);
    }
  }

  isMobilePlatform(platformName: string): boolean {
    return platformName === PlatformType.Android;
  }

  parseUrl(url: string): Url {
    const searchObject = {};
    const parser = document.createElement('a');
    parser.href = url;
    const queries = parser.search.replace(/^\?/, '').split('&');

    let split;
    for (let i = 0; i < queries.length; i += 1) {
      split = queries[i].split('=');
      // eslint-disable-next-line prefer-destructuring
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

  promiseWhile(data: any, condition: (data: any) => PromiseLike<any>, action: (data: any) => PromiseLike<any>) {
    const whilst = (whilstData): PromiseLike<any> => {
      return condition(whilstData).then((conditionIsTrue) => {
        if (conditionIsTrue) {
          return this.$q.resolve(whilstData);
        }

        return action(whilstData).then(whilst);
      });
    };

    return whilst(data);
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

    const bytesToGuidString = (bytes: Uint8Array): string => {
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

      const _toString = (format: string): string => {
        if (format == null || format.length === 0) format = 'D';

        let guidChars = [];
        let offset = 0;
        let dash = true;
        let hex = false;

        if (format.length !== 1) {
          // all acceptable format strings are of length 1
          return null;
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
          return null;
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

      return _toString('D').split(',').join('');
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
}
