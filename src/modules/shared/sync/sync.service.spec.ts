import '../../../test/mock-angular';
import { $q } from '../../../test/mock-services';
import {
  BookmarkMappingNotFoundError,
  BookmarkNotFoundError,
  ContainerChangedError,
  DataOutOfSyncError,
  FailedCreateNativeBookmarksError,
  FailedGetNativeBookmarksError,
  FailedRemoveNativeBookmarksError,
  IncompleteSyncInfoError,
  NativeBookmarkNotFoundError,
  SyncDisabledError,
  SyncNotFoundError,
  SyncUncommittedError,
  SyncVersionNotSupportedError,
  TooManyRequestsError
} from '../errors/errors';
import { SyncService } from './sync.service';

describe('SyncService', () => {
  let syncSvc: SyncService;
  const mock$exceptionHandler = jest.fn();
  const mock$timeout = jest.fn((fn: Function) => fn()) as any;
  const mockBookmarkHelperSvc = {
    getCachedBookmarks: jest.fn(),
    updateCachedBookmarks: jest.fn()
  } as any;
  const mockBookmarkSyncProviderSvc = {
    disable: jest.fn(),
    enable: jest.fn(),
    processSync: jest.fn(),
    handleUpdateRemoteFailed: jest.fn()
  } as any;
  const mockCryptoSvc = { encryptData: jest.fn() } as any;
  const mockLogSvc = { logInfo: jest.fn(), logWarning: jest.fn(), logError: jest.fn() } as any;
  const mockNetworkSvc = { isNetworkConnectionError: jest.fn() } as any;
  const mockPlatformSvc = {
    stopSyncUpdateChecks: jest.fn().mockResolvedValue(undefined),
    startSyncUpdateChecks: jest.fn().mockResolvedValue(undefined),
    refreshNativeInterface: jest.fn().mockResolvedValue(undefined),
    queueLocalResync: jest.fn().mockResolvedValue(undefined),
    getAppVersion: jest.fn().mockResolvedValue('1.6.0')
  } as any;
  const mockStoreSvc = {
    get: jest.fn(),
    set: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn().mockResolvedValue(undefined)
  } as any;
  const mockUtilitySvc = {
    isSyncEnabled: jest.fn(),
    getApiService: jest.fn(),
    checkSyncCredentialsExist: jest.fn(),
    compareVersions: jest.fn(),
    getUniqueishId: jest.fn().mockReturnValue('test-id'),
    asyncWhile: jest.fn()
  } as any;

  beforeEach(() => {
    syncSvc = new SyncService(
      mock$exceptionHandler,
      $q,
      mock$timeout,
      mockBookmarkHelperSvc,
      mockBookmarkSyncProviderSvc,
      mockCryptoSvc,
      mockLogSvc,
      mockNetworkSvc,
      mockPlatformSvc,
      mockStoreSvc,
      mockUtilitySvc
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  test('constructor: Registers sync providers', () => {
    expect(syncSvc.providers).toContain(mockBookmarkSyncProviderSvc);
  });

  test('constructor: Initializes empty sync queue', () => {
    expect(syncSvc.syncQueue).toStrictEqual([]);
  });

  test('getCurrentSync: Returns current sync', () => {
    const testSync = { type: 'local' } as any;
    syncSvc.currentSync = testSync;

    expect(syncSvc.getCurrentSync()).toBe(testSync);
  });

  test('getSyncQueueLength: Returns queue length', () => {
    syncSvc.syncQueue = [{} as any, {} as any];

    expect(syncSvc.getSyncQueueLength()).toBe(2);
  });

  test('getSyncQueueLength: Returns 0 for empty queue', () => {
    expect(syncSvc.getSyncQueueLength()).toBe(0);
  });

  // checkIfDisableSyncOnError tests
  test('checkIfDisableSyncOnError: Returns true for IncompleteSyncInfoError', () => {
    expect(syncSvc.checkIfDisableSyncOnError(new IncompleteSyncInfoError())).toBe(true);
  });

  test('checkIfDisableSyncOnError: Returns true for SyncNotFoundError', () => {
    expect(syncSvc.checkIfDisableSyncOnError(new SyncNotFoundError())).toBe(true);
  });

  test('checkIfDisableSyncOnError: Returns true for SyncVersionNotSupportedError', () => {
    expect(syncSvc.checkIfDisableSyncOnError(new SyncVersionNotSupportedError())).toBe(true);
  });

  test('checkIfDisableSyncOnError: Returns true for TooManyRequestsError', () => {
    expect(syncSvc.checkIfDisableSyncOnError(new TooManyRequestsError())).toBe(true);
  });

  test('checkIfDisableSyncOnError: Returns false for generic Error', () => {
    expect(syncSvc.checkIfDisableSyncOnError(new Error())).toBe(false);
  });

  test('checkIfDisableSyncOnError: Returns falsy for null', () => {
    expect(syncSvc.checkIfDisableSyncOnError(null as any)).toBeFalsy();
  });

  // checkIfRefreshSyncedDataOnError tests
  test('checkIfRefreshSyncedDataOnError: Returns true for BookmarkMappingNotFoundError', () => {
    expect(syncSvc.checkIfRefreshSyncedDataOnError(new BookmarkMappingNotFoundError())).toBe(true);
  });

  test('checkIfRefreshSyncedDataOnError: Returns true for ContainerChangedError', () => {
    expect(syncSvc.checkIfRefreshSyncedDataOnError(new ContainerChangedError())).toBe(true);
  });

  test('checkIfRefreshSyncedDataOnError: Returns true for DataOutOfSyncError', () => {
    expect(syncSvc.checkIfRefreshSyncedDataOnError(new DataOutOfSyncError())).toBe(true);
  });

  test('checkIfRefreshSyncedDataOnError: Returns true for FailedCreateNativeBookmarksError', () => {
    expect(syncSvc.checkIfRefreshSyncedDataOnError(new FailedCreateNativeBookmarksError())).toBe(true);
  });

  test('checkIfRefreshSyncedDataOnError: Returns true for FailedGetNativeBookmarksError', () => {
    expect(syncSvc.checkIfRefreshSyncedDataOnError(new FailedGetNativeBookmarksError())).toBe(true);
  });

  test('checkIfRefreshSyncedDataOnError: Returns true for FailedRemoveNativeBookmarksError', () => {
    expect(syncSvc.checkIfRefreshSyncedDataOnError(new FailedRemoveNativeBookmarksError())).toBe(true);
  });

  test('checkIfRefreshSyncedDataOnError: Returns true for NativeBookmarkNotFoundError', () => {
    expect(syncSvc.checkIfRefreshSyncedDataOnError(new NativeBookmarkNotFoundError())).toBe(true);
  });

  test('checkIfRefreshSyncedDataOnError: Returns true for BookmarkNotFoundError', () => {
    expect(syncSvc.checkIfRefreshSyncedDataOnError(new BookmarkNotFoundError())).toBe(true);
  });

  test('checkIfRefreshSyncedDataOnError: Returns false for generic Error', () => {
    expect(syncSvc.checkIfRefreshSyncedDataOnError(new Error())).toBe(false);
  });

  // shouldDisplayDefaultPageOnError tests
  test('shouldDisplayDefaultPageOnError: Returns true for IncompleteSyncInfoError', () => {
    expect(syncSvc.shouldDisplayDefaultPageOnError(new IncompleteSyncInfoError())).toBe(true);
  });

  test('shouldDisplayDefaultPageOnError: Returns true for SyncUncommittedError', () => {
    expect(syncSvc.shouldDisplayDefaultPageOnError(new SyncUncommittedError())).toBe(true);
  });

  test('shouldDisplayDefaultPageOnError: Returns false for generic Error', () => {
    expect(syncSvc.shouldDisplayDefaultPageOnError(new Error())).toBe(false);
  });

  // checkSyncExists tests
  test('checkSyncExists: Throws SyncDisabledError when sync not enabled', async () => {
    mockUtilitySvc.isSyncEnabled.mockResolvedValue(false);

    await expect(syncSvc.checkSyncExists()).rejects.toThrow(SyncDisabledError);
  });

  test('checkSyncExists: Returns true when last updated succeeds', async () => {
    mockUtilitySvc.isSyncEnabled.mockResolvedValue(true);
    const mockApiSvc = { getBookmarksLastUpdated: jest.fn().mockResolvedValue({ lastUpdated: '2023-01-01' }) };
    mockUtilitySvc.getApiService.mockResolvedValue(mockApiSvc);

    const result = await syncSvc.checkSyncExists();

    expect(result).toBe(true);
  });

  test('checkSyncExists: Returns false when SyncNotFoundError thrown', async () => {
    mockUtilitySvc.isSyncEnabled.mockResolvedValue(true);
    const mockApiSvc = { getBookmarksLastUpdated: jest.fn().mockRejectedValue(new SyncNotFoundError()) };
    mockUtilitySvc.getApiService.mockResolvedValue(mockApiSvc);
    mockBookmarkHelperSvc.getCachedBookmarks.mockResolvedValue([]);
    mockStoreSvc.get.mockResolvedValue({
      lastUpdated: '2023-01-01',
      syncInfo: { id: 'test', password: 'pass', version: '1.5.0' }
    });

    const result = await syncSvc.checkSyncExists();

    expect(result).toBe(false);
  });

  // executeSync tests
  test('executeSync: Throws SyncDisabledError when sync is not enabled', async () => {
    mockUtilitySvc.isSyncEnabled.mockResolvedValue(false);

    await expect(syncSvc.executeSync()).rejects.toThrow(SyncDisabledError);
  });

  // disableSync tests
  test('disableSync: Returns early when sync is not enabled', async () => {
    mockUtilitySvc.isSyncEnabled.mockResolvedValue(false);

    await syncSvc.disableSync();

    // When sync is not enabled, storeSvc.remove should not be called (no cleanup needed)
    expect(mockStoreSvc.remove).not.toBeCalled();
  });

  // processSyncQueue tests
  test('processSyncQueue: Resolves immediately when queue is empty', async () => {
    syncSvc.syncQueue = [];
    syncSvc.currentSync = undefined;

    await syncSvc.processSyncQueue();

    // Should not attempt to stop update checks when nothing to process
    expect(mockPlatformSvc.stopSyncUpdateChecks).not.toBeCalled();
  });

  test('processSyncQueue: Resolves immediately when currentSync is set', async () => {
    syncSvc.currentSync = { type: 'local' } as any;
    syncSvc.syncQueue = [{ type: 'remote' } as any];

    await syncSvc.processSyncQueue();

    // Should not attempt to stop update checks when sync already in progress
    expect(mockPlatformSvc.stopSyncUpdateChecks).not.toBeCalled();
  });
});
