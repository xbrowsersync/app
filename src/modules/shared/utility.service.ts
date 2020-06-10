/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable consistent-return */
/* eslint-disable prefer-const */
/* eslint-disable eqeqeq */
/* eslint-disable no-bitwise */
/* eslint-disable no-underscore-dangle */
/* eslint-disable no-plusplus */
/* eslint-disable prefer-destructuring */
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable no-param-reassign */

import { Injectable } from 'angular-ts-decorators';
import base64js from 'base64-js';
import compareVersions from 'compare-versions';
import * as countriesList from 'countries-list';
import lzutf8 from 'lzutf8';
import _ from 'underscore';
import { autobind } from 'core-decorators';
import Globals from './globals';
import StoreService from './store.service';

@autobind
@Injectable('UtilityService')
export default class UtilityService {
  $http: ng.IHttpService;
  $q: ng.IQService;
  storeSvc: StoreService;

  currentMessageQueueItem: any;
  messageQueue = [];

  static $inject = ['$http', '$q', 'StoreService'];
  constructor($http: ng.IHttpService, $q: ng.IQService, StoreSvc: StoreService) {
    this.$http = $http;
    this.$q = $q;
    this.storeSvc = StoreSvc;
  }

  checkForNewVersion() {
    if (!this.isNetworkConnected()) {
      return this.$q.resolve();
    }

    // Get latest app version info
    let latestVersion: string;
    return this.$http
      .get(Globals.ReleaseLatestUrl)
      .then((response) => {
        latestVersion = response && response.data ? (response.data as any).tag_name : null;
        if (!compareVersions.compare(latestVersion, Globals.AppVersion, '>')) {
          return;
        }
        this.logInfo(`${latestVersion} update available`);
        return latestVersion;
      })
      .catch(() => {
        this.logInfo('Couldn’t check for new version');
      });
  }

  concatUint8Arrays(firstArr, secondArr) {
    firstArr = firstArr || new Uint8Array();
    secondArr = secondArr || new Uint8Array();

    const totalLength = firstArr.length + secondArr.length;
    const result = new Uint8Array(totalLength);
    result.set(firstArr, 0);
    result.set(secondArr, firstArr.length);
    return result;
  }

  createBackupData(bookmarksData, syncId, serviceUrl) {
    const data = {
      xbrowsersync: {
        date: this.getDateTimeString(new Date()),
        sync: {},
        data: {}
      }
    };

    // Add sync info if provided
    if (syncId) {
      data.xbrowsersync.sync = this.createSyncInfoObject(syncId, serviceUrl);
    }

    // Add bookmarks data
    (data.xbrowsersync.data as any).bookmarks = bookmarksData;

    return data;
  }

  createSyncInfoObject(syncId, serviceUrl) {
    return {
      id: syncId,
      type: 'xbrowsersync',
      url: serviceUrl
    };
  }

  decodeQrCode(qrCodeValue) {
    let serviceUrl;
    let syncId;
    try {
      // For v1.5.3 or later codes, expect sync info object
      const syncInfo = JSON.parse(qrCodeValue);
      syncId = syncInfo.id;
      serviceUrl = syncInfo.url;
    } catch (err) {
      // For pre-v1.5.3 codes, split the scanned value into it's components
      const arr = qrCodeValue.split(Globals.QrCode.Delimiter);
      syncId = arr[0];
      serviceUrl = arr[1];
    }

    // Validate decoded values
    const urlRegex = new RegExp(`^${Globals.URL.ValidUrlRegex}$`, 'i');
    if (!this.syncIdIsValid(syncId) || (serviceUrl && !urlRegex.test(serviceUrl))) {
      throw new Error('Invalid QR code');
    }

    return {
      id: syncId,
      url: serviceUrl
    };
  }

  decryptData(encryptedData) {
    let encryptedDataBytes;
    let iv;

    // If no data provided, return an empty string
    if (!encryptedData) {
      return this.$q.resolve('');
    }

    // Ensure both id and password are in local storage
    return this.storeSvc
      .get([Globals.CacheKeys.Password, Globals.CacheKeys.SyncId])
      .then((cachedData) => {
        const password = cachedData[Globals.CacheKeys.Password];
        const syncId = cachedData[Globals.CacheKeys.SyncId];

        if (!syncId) {
          return this.$q.reject({ code: Globals.ErrorCodes.SyncRemoved });
        }
        if (!password) {
          return this.$q.reject({ code: Globals.ErrorCodes.PasswordRemoved });
        }

        // Retrieve the hashed password from local storage and convert to bytes
        const keyData = base64js.toByteArray(password);

        // Convert base64 encoded encrypted data to bytes and extract initialization vector
        const encryptedBytes = base64js.toByteArray(encryptedData);
        iv = encryptedBytes.slice(0, 16);
        encryptedDataBytes = encryptedBytes.slice(16).buffer;

        // Generate a cryptokey using the stored password hash for decryption
        return (crypto.subtle.importKey as any)('raw', keyData, { name: 'AES-GCM', iv }, false, ['decrypt']);
      })
      .then((key) => {
        // Convert base64 encoded encrypted data to bytes
        return crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encryptedDataBytes);
      })
      .then((decryptedBytes) => {
        if (!decryptedBytes) {
          throw new Error('Unable to decrypt data.');
        }

        // Uncompress the decrypted data and return
        const decryptedData = lzutf8.decompress(new Uint8Array(decryptedBytes));
        return decryptedData;
      })
      .catch((err) => {
        this.logInfo('Decryption failed');
        return this.$q.reject({
          code: Globals.ErrorCodes.InvalidCredentials,
          stack: err.stack
        });
      });
  }

  encryptData(data) {
    let iv;

    // If no data provided, return an empty string
    if (!data) {
      return this.$q.resolve('');
    }

    // Ensure both id and password are in local storage
    return this.storeSvc
      .get([Globals.CacheKeys.Password, Globals.CacheKeys.SyncId])
      .then((cachedData) => {
        const password = cachedData[Globals.CacheKeys.Password];
        const syncId = cachedData[Globals.CacheKeys.SyncId];

        if (!syncId) {
          return this.$q.reject({ code: Globals.ErrorCodes.SyncRemoved });
        }
        if (!password) {
          return this.$q.reject({ code: Globals.ErrorCodes.PasswordRemoved });
        }

        // Retrieve the hashed password from local storage and convert to bytes
        const keyData = base64js.toByteArray(password);

        // Generate a random 16 byte initialization vector
        iv = crypto.getRandomValues(new Uint8Array(16));

        // Generate a new cryptokey using the stored password hash
        return (crypto.subtle.importKey as any)('raw', keyData, { name: 'AES-GCM', iv }, false, ['encrypt']);
      })
      .then((key) => {
        // Compress the data before encryption
        const compressedData = lzutf8.compress(data);

        // Encrypt the data using AES
        return crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, compressedData);
      })
      .then((encryptedData) => {
        // Combine initialization vector and encrypted data and return as base64 encoded string
        const combinedData = this.concatUint8Arrays(iv, new Uint8Array(encryptedData));
        return base64js.fromByteArray(combinedData);
      })
      .catch((err) => {
        this.logInfo('Encryption failed');
        return this.$q.reject({
          code: Globals.ErrorCodes.InvalidCredentials,
          stack: err.stack
        });
      });
  }

  get24hrTimeFromDate(date) {
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }

  getBackupFileName() {
    const fileName = `xbs_backup_${this.getDateTimeString(new Date())}.json`;
    return fileName;
  }

  getCountryNameFrom2LetterISOCode(isoCode) {
    if (!isoCode) {
      return null;
    }

    const country = countriesList.countries[isoCode];
    if (!country) {
      this.logInfo(`No country found matching ISO code: ${isoCode}`);
    }
    return country.name;
  }

  getDateTimeString(date) {
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

  getLogFileName() {
    const fileName = `xbs_log_${this.getDateTimeString(new Date())}.txt`;
    return fileName;
  }

  getPasswordHash(password, salt) {
    const encoder = new TextEncoder();
    const encodedSalt = encoder.encode(salt);

    // Get cached sync version
    return this.storeSvc.get(Globals.CacheKeys.SyncVersion).then((syncVersion) => {
      // If old sync version, don't hash password for legacy encryption
      if (!syncVersion) {
        return this.$q.resolve(password);
      }

      // Generate a new cryptokey using the stored password hash
      const keyData = encoder.encode(password);
      return (crypto.subtle.importKey as any)('raw', keyData, { name: 'PBKDF2' }, false, ['deriveKey'])
        .then((importedKey) => {
          // Run the key through PBKDF2 with many iterations using the provided salt
          return crypto.subtle.deriveKey(
            {
              name: 'PBKDF2',
              salt: encodedSalt,
              iterations: 250000,
              hash: 'SHA-256'
            },
            importedKey,
            { name: 'AES-GCM', length: 256 },
            true,
            ['encrypt', 'decrypt']
          );
        })
        .then((derivedKey) => {
          // Export the hashed key
          return crypto.subtle.exportKey('raw', derivedKey);
        })
        .then((exportedKey) => {
          // Convert exported key to base64 encoded string and return
          const base64Key = base64js.fromByteArray(new Uint8Array(exportedKey));
          return base64Key;
        });
    });
  }

  getServiceUrl() {
    // Get service url from local storage
    return this.storeSvc.get(Globals.CacheKeys.ServiceUrl).then((cachedServiceUrl) => {
      // If no service url cached, use default
      return cachedServiceUrl || Globals.URL.DefaultServiceUrl;
    });
  }

  getTagArrayFromText(tagText: string) {
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

  getUniqueishId() {
    return window.crypto.getRandomValues(new Uint32Array(1))[0].toString(36);
  }

  getVersionTag() {
    const versionTag = Globals.AppVersion.replace(/([a-z]+)\d+$/i, '$1');
    return versionTag;
  }

  isMobilePlatform(platformName) {
    return platformName === Globals.Platforms.Android;
  }

  isNetworkConnected() {
    return (window as any).Connection &&
      (window.navigator as any).connection &&
      (window.navigator as any).connection.type
      ? (window.navigator as any).connection.type !== (window as any).Connection.NONE &&
          (window.navigator as any).connection.type !== (window as any).Connection.UNKNOWN
      : window.navigator.onLine;
  }

  isNetworkConnectionError(err) {
    return err.code === Globals.ErrorCodes.HttpRequestFailed || err.code === Globals.ErrorCodes.NetworkOffline;
  }

  isPlatform(currentPlatform, platformName) {
    return currentPlatform === platformName;
  }

  logError(err, message?) {
    let errMessage;

    // Return if no error supplied or has already been logged
    if (!err || err.logged) {
      return;
    }

    if (err instanceof Error) {
      errMessage = message ? `${message}: ` : '';
    } else if (err.code) {
      const codeName = _.findKey(Globals.ErrorCodes, (key) => {
        return key === err.code;
      });
      errMessage = message ? `${message}: ` : '';
      errMessage += `[${err.code}] ${codeName}`;
    }

    // Output message to console, add to queue and process
    this.logToConsole(Globals.LogType.Error, errMessage, err);
    this.messageQueue.push([Globals.LogType.Error, errMessage, err]);
    this.processMessageQueue();

    // Mark this error as logged to prevent duplication in logs
    err.logged = true;
  }

  logInfo(message) {
    if (!message) {
      return;
    }

    // Output message to console, add to queue and process
    this.logToConsole(Globals.LogType.Trace, message);
    this.messageQueue.push([Globals.LogType.Trace, message]);
    this.processMessageQueue();
  }

  logToConsole(messageType, message, err?) {
    switch (messageType) {
      case Globals.LogType.Error:
        if (err instanceof Error) {
          console.error(message, err);
        } else if (err.stack) {
          console.error(message, err.stack);
        } else {
          console.error(message);
        }
        break;
      case Globals.LogType.Warn:
        console.warn(message);
        break;
      case Globals.LogType.Trace:
      default:
        console.info(message);
    }
  }

  logWarning(message) {
    if (!message) {
      return;
    }

    // Output message to console, add to queue and process
    this.logToConsole(Globals.LogType.Warn, message);
    this.messageQueue.push([Globals.LogType.Warn, message]);
    this.processMessageQueue();
  }

  parseUrl(url) {
    const searchObject = {};
    const parser = document.createElement('a');
    parser.href = url;
    const queries = parser.search.replace(/^\?/, '').split('&');

    let split;
    for (let i = 0; i < queries.length; i++) {
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

  processMessageQueue(): angular.IPromise<void> {
    // Return if currently processing or no more messages to process
    if (this.currentMessageQueueItem || this.messageQueue.length === 0) {
      return this.$q.resolve();
    }

    // Get the next log message to process
    this.currentMessageQueueItem = this.messageQueue.shift();
    const messageType = this.currentMessageQueueItem[0];
    const message = this.currentMessageQueueItem[1];
    const err = this.currentMessageQueueItem[2];

    // Format the log message with current time stamp and log type
    let messageLogText = `${new Date().toISOString().replace(/[A-Z]/g, ' ').trim()}\t`;
    switch (messageType) {
      case Globals.LogType.Error:
        messageLogText += '[error]\t';
        break;
      case Globals.LogType.Warn:
        messageLogText += '[warn]\t';
        break;
      case Globals.LogType.Trace:
      default:
        messageLogText += '[trace]\t';
    }

    // Add message text to log item and add to end of log
    return this.storeSvc
      .get(Globals.CacheKeys.TraceLog)
      .then((debugMessageLog) => {
        debugMessageLog = debugMessageLog || [];
        messageLogText += typeof message === 'object' ? JSON.stringify(message) : message;
        if (err && err.stack) {
          messageLogText += `\t${err.stack.replace(/\s+/g, ' ')}`;
        }
        debugMessageLog.push(messageLogText);
        return this.storeSvc.set(Globals.CacheKeys.TraceLog, debugMessageLog);
      })
      .then(() => {
        // Process remaining messages
        this.currentMessageQueueItem = undefined;
        this.processMessageQueue();
      });
  }

  promiseWhile(data, condition, action) {
    const whilst = (whilstData) => {
      return condition(whilstData).then((conditionIsTrue) => {
        if (conditionIsTrue) {
          return this.$q.resolve(whilstData);
        }

        return action(whilstData).then(whilst);
      });
    };

    return whilst(data);
  }

  stripTags(str) {
    return str ? str.replace(/<(?:.|\n)*?>/gm, '') : str;
  }

  syncIdIsValid(syncId) {
    if (!syncId) {
      return false;
    }

    const hexStringToBytes = (hexString) => {
      const bytes = new Uint8Array(hexString.length / 2);
      for (let i = 0; i !== bytes.length; i++) {
        bytes[i] = parseInt(hexString.substr(i * 2, 2), 16);
      }
      return bytes;
    };

    const bytesToGuidString = (bytes) => {
      let _a;
      let _b;
      let _c;
      let _d;
      let _e;
      let _f;
      let _g;
      let _h;
      let _i;
      let _j;
      let _k;

      if (bytes == null) {
        return;
      }
      if (bytes.length != 16) {
        return;
      }

      _a = (bytes[3] << 24) | (bytes[2] << 16) | (bytes[1] << 8) | bytes[0];
      _b = (bytes[5] << 8) | bytes[4];
      _c = (bytes[7] << 8) | bytes[6];
      _d = bytes[8];
      _e = bytes[9];
      _f = bytes[10];
      _g = bytes[11];
      _h = bytes[12];
      _i = bytes[13];
      _j = bytes[14];
      _k = bytes[15];

      const hexToChar = (a) => {
        a &= 0xf;
        return String.fromCharCode(a > 9 ? a - 10 + 0x61 : a + 0x30);
      };

      const hexsToChars = (guidChars, offset, a, b, hex?) => {
        hex = hex === undefined ? false : hex;

        if (hex) {
          guidChars[offset++] = '0';
          guidChars[offset++] = 'x';
        }
        guidChars[offset++] = hexToChar(a >> 4);
        guidChars[offset++] = hexToChar(a);
        if (hex) {
          guidChars[offset++] = ',';
          guidChars[offset++] = '0';
          guidChars[offset++] = 'x';
        }
        guidChars[offset++] = hexToChar(b >> 4);
        guidChars[offset++] = hexToChar(b);
        return offset;
      };

      const _toString = (format) => {
        if (format == null || format.length == 0) format = 'D';

        let guidChars = [];
        let offset = 0;
        let dash = true;
        let hex = false;

        if (format.length != 1) {
          // all acceptable format strings are of length 1
          return null;
        }

        const formatCh = format[0];

        if (formatCh == 'D' || formatCh == 'd') {
          guidChars = new Array(36);
        } else if (formatCh == 'N' || formatCh == 'n') {
          guidChars = new Array(32);
          dash = false;
        } else if (formatCh == 'B' || formatCh == 'b') {
          guidChars = new Array(38);
          guidChars[offset++] = '{';
          guidChars[37] = '}';
        } else if (formatCh == 'P' || formatCh == 'p') {
          guidChars = new Array(38);
          guidChars[offset++] = '(';
          guidChars[37] = ')';
        } else if (formatCh == 'X' || formatCh == 'x') {
          guidChars = new Array(68);
          guidChars[offset++] = '{';
          guidChars[67] = '}';
          dash = false;
          hex = true;
        } else {
          return null;
        }

        if (hex) {
          // {0xdddddddd,0xdddd,0xdddd,{0xdd,0xdd,0xdd,0xdd,0xdd,0xdd,0xdd,0xdd}}
          guidChars[offset++] = '0';
          guidChars[offset++] = 'x';
          offset = hexsToChars(guidChars, offset, _a >> 24, _a >> 16);
          offset = hexsToChars(guidChars, offset, _a >> 8, _a);
          guidChars[offset++] = ',';
          guidChars[offset++] = '0';
          guidChars[offset++] = 'x';
          offset = hexsToChars(guidChars, offset, _b >> 8, _b);
          guidChars[offset++] = ',';
          guidChars[offset++] = '0';
          guidChars[offset++] = 'x';
          offset = hexsToChars(guidChars, offset, _c >> 8, _c);
          guidChars[offset++] = ',';
          guidChars[offset++] = '{';
          offset = hexsToChars(guidChars, offset, _d, _e, true);
          guidChars[offset++] = ',';
          offset = hexsToChars(guidChars, offset, _f, _g, true);
          guidChars[offset++] = ',';
          offset = hexsToChars(guidChars, offset, _h, _i, true);
          guidChars[offset++] = ',';
          offset = hexsToChars(guidChars, offset, _j, _k, true);
          guidChars[offset++] = '}';
        } else {
          // [{|(]dddddddd[-]dddd[-]dddd[-]dddd[-]dddddddddddd[}|)]
          offset = hexsToChars(guidChars, offset, _a >> 24, _a >> 16);
          offset = hexsToChars(guidChars, offset, _a >> 8, _a);
          if (dash) guidChars[offset++] = '-';
          offset = hexsToChars(guidChars, offset, _b >> 8, _b);
          if (dash) guidChars[offset++] = '-';
          offset = hexsToChars(guidChars, offset, _c >> 8, _c);
          if (dash) guidChars[offset++] = '-';
          offset = hexsToChars(guidChars, offset, _d, _e);
          if (dash) guidChars[offset++] = '-';
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

  trimToNearestWord(text, limit) {
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
