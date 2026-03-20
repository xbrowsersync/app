import '../../../test/mock-angular';
import { TextDecoder as NodeTextDecoder, TextEncoder as NodeTextEncoder } from 'util';
import { $q } from '../../../test/mock-services';
import { ArgumentError, InvalidCredentialsError } from '../errors/errors';
import { CryptoService } from './crypto.service';

(global as any).TextEncoder = (global as any).TextEncoder || NodeTextEncoder;
(global as any).TextDecoder = (global as any).TextDecoder || NodeTextDecoder;

jest.mock('lzutf8', () => {
  const impl = {
    compress: (data: string) => new (global as any).TextEncoder().encode(data),
    decompress: (data: Uint8Array) => new (global as any).TextDecoder().decode(data)
  };
  return { ...impl, default: impl, __esModule: true };
});

jest.mock('base64-js', () => {
  const impl = {
    toByteArray: (base64: string) => new Uint8Array(Buffer.from(base64, 'base64')),
    fromByteArray: (bytes: Uint8Array) => Buffer.from(bytes).toString('base64')
  };
  return {
    ...impl,
    default: impl,
    __esModule: true
  };
});

describe('CryptoService', () => {
  let cryptoSvc: CryptoService;
  const mockLogSvc = { logWarning: jest.fn(), logInfo: jest.fn() } as any;
  const mockStoreSvc = { get: jest.fn(), set: jest.fn() } as any;
  const mockUtilitySvc = {
    checkSyncCredentialsExist: jest.fn(),
    getSyncVersion: jest.fn()
  } as any;

  beforeEach(() => {
    cryptoSvc = new CryptoService($q, mockLogSvc, mockStoreSvc, mockUtilitySvc);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  test('concatUint8Arrays: Concatenates two arrays', () => {
    const first = new Uint8Array([1, 2, 3]);
    const second = new Uint8Array([4, 5, 6]);

    const result = cryptoSvc.concatUint8Arrays(first, second);

    expect(result).toStrictEqual(new Uint8Array([1, 2, 3, 4, 5, 6]));
  });

  test('concatUint8Arrays: Returns second array when first is empty', () => {
    const result = cryptoSvc.concatUint8Arrays(new Uint8Array(), new Uint8Array([4, 5]));

    expect(result).toStrictEqual(new Uint8Array([4, 5]));
  });

  test('concatUint8Arrays: Returns first array when second is empty', () => {
    const result = cryptoSvc.concatUint8Arrays(new Uint8Array([1, 2]), new Uint8Array());

    expect(result).toStrictEqual(new Uint8Array([1, 2]));
  });

  test('concatUint8Arrays: Handles undefined arguments with defaults', () => {
    const result = cryptoSvc.concatUint8Arrays();

    expect(result).toStrictEqual(new Uint8Array());
  });

  test('decryptData: Returns empty string when no data provided', async () => {
    const result = await cryptoSvc.decryptData('');

    expect(result).toBe('');
  });

  test('decryptData: Returns empty string when undefined data provided', async () => {
    const result = await cryptoSvc.decryptData(undefined as any);

    expect(result).toBe('');
  });

  test('encryptData: Returns empty string when no data provided', async () => {
    const result = await cryptoSvc.encryptData('');

    expect(result).toBe('');
  });

  test('encryptData: Returns empty string when undefined data provided', async () => {
    const result = await cryptoSvc.encryptData(undefined as any);

    expect(result).toBe('');
  });

  test('encryptData: Throws ArgumentError when data is not a string', () => {
    expect(() => cryptoSvc.encryptData(123 as any)).toThrow(ArgumentError);
  });

  test('decryptData: Throws InvalidCredentialsError when credentials check fails', async () => {
    mockUtilitySvc.checkSyncCredentialsExist.mockRejectedValue(new Error('no creds'));

    await expect(cryptoSvc.decryptData('someEncryptedData')).rejects.toThrow(InvalidCredentialsError);
  });

  test('encryptData: Throws InvalidCredentialsError when credentials check fails', async () => {
    mockUtilitySvc.checkSyncCredentialsExist.mockRejectedValue(new Error('no creds'));

    await expect(cryptoSvc.encryptData('test data')).rejects.toThrow(InvalidCredentialsError);
  });

  test('getPasswordHash: Returns plain password for old sync version (no version)', async () => {
    mockUtilitySvc.getSyncVersion.mockResolvedValue(undefined);

    const result = await cryptoSvc.getPasswordHash('mypassword', 'salt');

    expect(result).toBe('mypassword');
  });

  test('getPasswordHash: Calls crypto.subtle.importKey for current sync version', async () => {
    mockUtilitySvc.getSyncVersion.mockResolvedValue('1.5.0');
    const mockExportedKey = new ArrayBuffer(32);
    const mockImportKey = jest.fn().mockResolvedValue('imported-key');
    const mockDeriveKey = jest.fn().mockResolvedValue('derived-key');
    const mockExportKey = jest.fn().mockResolvedValue(mockExportedKey);
    Object.defineProperty(global, 'crypto', {
      value: {
        subtle: {
          importKey: mockImportKey,
          deriveKey: mockDeriveKey,
          exportKey: mockExportKey
        },
        getRandomValues: (arr: Uint8Array) => arr
      },
      configurable: true
    });

    const result = await cryptoSvc.getPasswordHash('mypassword', 'salt123');

    expect(mockImportKey).toBeCalled();
    expect(mockDeriveKey).toBeCalled();
    expect(mockExportKey).toBeCalled();
    expect(typeof result).toBe('string');
  });

  test('encryptData: Calls crypto.subtle.encrypt with correct algorithm', async () => {
    const mockEncrypted = new ArrayBuffer(32);
    const mockImportKey = jest.fn().mockResolvedValue('key');
    const mockEncrypt = jest.fn().mockResolvedValue(mockEncrypted);
    const originalCryptoDescriptor = Object.getOwnPropertyDescriptor(global, 'crypto');
    Object.defineProperty(global, 'crypto', {
      value: {
        subtle: {
          importKey: mockImportKey,
          encrypt: mockEncrypt
        },
        getRandomValues: (arr: Uint8Array) => arr
      },
      configurable: true
    });
    mockUtilitySvc.checkSyncCredentialsExist.mockResolvedValue({
      id: 'test-id',
      password: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='
    });

    const result = await cryptoSvc.encryptData('test data');

    expect(mockImportKey).toBeCalled();
    expect(mockEncrypt).toBeCalledWith(expect.objectContaining({ name: 'AES-GCM' }), 'key', expect.anything());
    expect(typeof result).toBe('string');

    if (originalCryptoDescriptor) {
      Object.defineProperty(global, 'crypto', originalCryptoDescriptor);
    } else {
      delete (global as any).crypto;
    }
  });

  test('decryptData: Calls crypto.subtle.decrypt with correct algorithm', async () => {
    const mockDecrypted = new TextEncoder().encode('decrypted data').buffer;
    const mockImportKey = jest.fn().mockResolvedValue('key');
    const mockDecrypt = jest.fn().mockResolvedValue(mockDecrypted);
    const originalCryptoDescriptor = Object.getOwnPropertyDescriptor(global, 'crypto');
    Object.defineProperty(global, 'crypto', {
      value: {
        subtle: {
          importKey: mockImportKey,
          decrypt: mockDecrypt
        },
        getRandomValues: (arr: Uint8Array) => arr
      },
      configurable: true
    });
    mockUtilitySvc.checkSyncCredentialsExist.mockResolvedValue({
      id: 'test-id',
      password: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='
    });
    // Create fake base64 data (16 byte IV + some encrypted bytes)
    const fakeData = 'AAAAAAAAAAAAAAAAAAAAAA==AAAAAAAAAA==';
    const base64js = require('base64-js');
    const iv = new Uint8Array(16);
    const encrypted = new Uint8Array(16);
    const combined = new Uint8Array(32);
    combined.set(iv, 0);
    combined.set(encrypted, 16);
    const encodedData = base64js.fromByteArray(combined);

    const result = await cryptoSvc.decryptData(encodedData);

    expect(mockImportKey).toBeCalled();
    expect(mockDecrypt).toBeCalledWith(expect.objectContaining({ name: 'AES-GCM' }), 'key', expect.any(ArrayBuffer));
    expect(result).toBe('decrypted data');

    if (originalCryptoDescriptor) {
      Object.defineProperty(global, 'crypto', originalCryptoDescriptor);
    } else {
      delete (global as any).crypto;
    }
  });
});
