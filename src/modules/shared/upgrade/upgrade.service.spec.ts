import '../../../test/mock-angular';
import { $q } from '../../../test/mock-services';
import { SyncVersionNotSupportedError, UpgradeFailedError } from '../errors/errors';
import { StoreKey } from '../store/store.enum';
import { UpgradeService } from './upgrade.service';

describe('UpgradeService', () => {
  let upgradeSvc: UpgradeService;
  const mockLogSvc = { logInfo: jest.fn(), logError: jest.fn() } as any;
  const mockPlatformSvc = { disableSync: jest.fn() } as any;
  const mockStoreSvc = { get: jest.fn(), set: jest.fn() } as any;
  const mockUtilitySvc = {
    compareVersions: jest.fn(),
    asyncWhile: jest.fn()
  } as any;
  const mockV160UpgradeProviderSvc = {
    upgradeApp: jest.fn(),
    upgradeBookmarks: jest.fn()
  } as any;

  beforeEach(() => {
    upgradeSvc = new UpgradeService(
      $q,
      mockLogSvc,
      mockPlatformSvc,
      mockStoreSvc,
      mockUtilitySvc,
      mockV160UpgradeProviderSvc
    );
  });

  afterEach(() => jest.restoreAllMocks());

  test('constructor: Initializes upgrade map with v1.6.0 provider', () => {
    expect(upgradeSvc.upgradeMap.has('1.6.0')).toBe(true);
    expect(upgradeSvc.upgradeMap.get('1.6.0')).toBe(mockV160UpgradeProviderSvc);
  });

  test('getLastUpgradeVersion: Returns version from store', async () => {
    mockStoreSvc.get.mockResolvedValue('1.5.0');

    const result = await upgradeSvc.getLastUpgradeVersion();

    expect(result).toBe('1.5.0');
    expect(mockStoreSvc.get).toBeCalledWith(StoreKey.LastUpgradeVersion);
  });

  test('setLastUpgradeVersion: Sets version in store', async () => {
    mockStoreSvc.set.mockResolvedValue();

    await upgradeSvc.setLastUpgradeVersion('1.6.0');

    expect(mockStoreSvc.set).toBeCalledWith(StoreKey.LastUpgradeVersion, '1.6.0');
  });

  test('checkIfUpgradeRequired: Returns true when no previous upgrade version', async () => {
    mockStoreSvc.get.mockResolvedValue(undefined);

    const result = await upgradeSvc.checkIfUpgradeRequired('1.6.0');

    expect(result).toBe(true);
  });

  test('checkIfUpgradeRequired: Returns true when last version is less than current', async () => {
    mockStoreSvc.get.mockResolvedValue('1.5.0');
    mockUtilitySvc.compareVersions.mockReturnValue(true);

    const result = await upgradeSvc.checkIfUpgradeRequired('1.6.0');

    expect(result).toBe(true);
  });

  test('checkIfUpgradeRequired: Returns false when versions are equal', async () => {
    mockStoreSvc.get.mockResolvedValue('1.6.0');
    mockUtilitySvc.compareVersions.mockReturnValue(false);

    const result = await upgradeSvc.checkIfUpgradeRequired('1.6.0');

    expect(result).toBe(false);
  });

  test('upgrade: Throws UpgradeFailedError when target version is undefined', () => {
    expect(() => upgradeSvc.upgrade(undefined as any)).toThrow(UpgradeFailedError);
  });

  test('upgradeBookmarks: Returns empty bookmarks unchanged', async () => {
    const result = await upgradeSvc.upgradeBookmarks('1.6.0', '1.5.0', []);

    expect(result).toStrictEqual([]);
  });

  test('upgradeBookmarks: Throws UpgradeFailedError when target version is undefined', () => {
    const bookmarks = [{ id: 1, title: 'Test', url: 'https://test.com' }];

    expect(() => upgradeSvc.upgradeBookmarks(undefined as any, '1.0.0', bookmarks)).toThrow(UpgradeFailedError);
  });

  test('upgradeBookmarks: Throws SyncVersionNotSupportedError when sync version is greater', () => {
    const bookmarks = [{ id: 1, title: 'Test', url: 'https://test.com' }];
    mockUtilitySvc.compareVersions.mockReturnValue(true);

    expect(() => upgradeSvc.upgradeBookmarks('1.5.0', '2.0.0', bookmarks)).toThrow(SyncVersionNotSupportedError);
  });
});
