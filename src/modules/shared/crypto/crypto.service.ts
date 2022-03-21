import angular from 'angular';
import { Injectable } from 'angular-ts-decorators';
import base64js from 'base64-js';
import lzutf8 from 'lzutf8';
import { ArgumentError, InvalidCredentialsError } from '../errors/errors';
import { LogService } from '../log/log.service';
import { StoreService } from '../store/store.service';
import { UtilityService } from '../utility/utility.service';

@Injectable('CryptoService')
export class CryptoService {
  $q: ng.IQService;
  logSvc: LogService;
  storeSvc: StoreService;
  utilitySvc: UtilityService;

  keyGenAlgorithm = 'PBKDF2';
  keyGenIterations = 250000;
  keyGenHashFunction = 'SHA-256';
  encryptionAlgorithm = 'AES-GCM';

  static $inject = ['$q', 'LogService', 'StoreService', 'UtilityService'];
  constructor($q: ng.IQService, LogSvc: LogService, StoreSvc: StoreService, UtilitySvc: UtilityService) {
    this.$q = $q;
    this.logSvc = LogSvc;
    this.storeSvc = StoreSvc;
    this.utilitySvc = UtilitySvc;
  }

  concatUint8Arrays(firstArr: Uint8Array = new Uint8Array(), secondArr: Uint8Array = new Uint8Array()): Uint8Array {
    const totalLength = firstArr.length + secondArr.length;
    const result = new Uint8Array(totalLength);
    result.set(firstArr, 0);
    result.set(secondArr, firstArr.length);
    return result;
  }

  decryptData(encryptedData: string): ng.IPromise<string> {
    // If no data provided, return an empty string
    if (!encryptedData) {
      return this.$q.resolve('');
    }

    // Ensure sync credentials
    return this.utilitySvc
      .checkSyncCredentialsExist()
      .then((syncInfo) => {
        // Convert hashed password to bytes
        const keyData = base64js.toByteArray(syncInfo.password);

        // Convert base64 encoded encrypted data to bytes and extract initialization vector
        const encryptedBytes = base64js.toByteArray(encryptedData);
        const iv = encryptedBytes.slice(0, 16);
        const encryptedDataBytes = encryptedBytes.slice(16).buffer;

        // Generate a cryptokey using the stored password hash for decryption
        return crypto.subtle
          .importKey('raw', keyData, { length: keyData.length, name: this.encryptionAlgorithm }, false, ['decrypt'])
          .then((key) => {
            // Convert base64 encoded encrypted data to bytes
            return crypto.subtle.decrypt({ name: this.encryptionAlgorithm, iv }, key, encryptedDataBytes);
          })
          .then((decryptedBytes) => {
            if (!decryptedBytes) {
              throw new Error('Failed to decrypt data.');
            }

            // Uncompress the decrypted data and return
            const decryptedData = lzutf8.decompress(new Uint8Array(decryptedBytes)) as string;
            return decryptedData;
          });
      })
      .catch((err) => {
        this.logSvc.logWarning('Decryption failed');
        throw new InvalidCredentialsError(undefined, err);
      });
  }

  encryptData(data: string): ng.IPromise<string> {
    // If no data provided, return an empty string
    if (!data) {
      return this.$q.resolve('');
    }

    // Ensure data is a string
    if (!angular.isString(data)) {
      throw new ArgumentError('Argument must be a string');
    }

    return this.utilitySvc
      .checkSyncCredentialsExist()
      .then((syncInfo) => {
        // Convert hashed password to bytes
        const keyData = base64js.toByteArray(syncInfo.password);

        // Generate a random 16 byte initialization vector
        const iv = crypto.getRandomValues(new Uint8Array(16));

        // Generate a new cryptokey using the stored password hash
        return crypto.subtle
          .importKey('raw', keyData, { length: keyData.length, name: this.encryptionAlgorithm }, false, ['encrypt'])
          .then((key) => {
            // Compress the data before encryption
            const compressedData = lzutf8.compress(data);

            // Encrypt the data using AES
            return crypto.subtle.encrypt({ name: this.encryptionAlgorithm, iv }, key, compressedData);
          })
          .then((encryptedData) => {
            // Combine initialization vector and encrypted data and return as base64 encoded string
            const combinedData = this.concatUint8Arrays(iv, new Uint8Array(encryptedData));
            return base64js.fromByteArray(combinedData);
          });
      })
      .catch((err) => {
        this.logSvc.logWarning('Encryption failed');
        throw new InvalidCredentialsError(undefined, err);
      });
  }

  getPasswordHash(password: string, salt: string): ng.IPromise<string> {
    const encoder = new TextEncoder();
    const encodedSalt = encoder.encode(salt);

    // Get cached sync version
    return this.utilitySvc.getSyncVersion().then((syncVersion) => {
      // If old sync version, don't hash password for legacy encryption
      if (!syncVersion) {
        return this.$q.resolve(password);
      }

      // Generate a new cryptokey using the stored password hash
      const keyData = encoder.encode(password);
      return crypto.subtle
        .importKey('raw', keyData, { length: keyData.length, name: this.keyGenAlgorithm }, false, ['deriveKey'])
        .then((importedKey) => {
          // Run the key through PBKDF2 with many iterations using the provided salt
          return crypto.subtle.deriveKey(
            {
              name: this.keyGenAlgorithm,
              salt: encodedSalt,
              iterations: this.keyGenIterations,
              hash: this.keyGenHashFunction
            },
            importedKey,
            { name: this.encryptionAlgorithm, length: 256 },
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
}
