import '../../../test/mock-angular';
import { $q } from '../../../test/mock-services';
import { FailedRestoreDataError } from '../errors/errors';
import { BackupRestoreService } from './backup-restore.service';

describe('BackupRestoreService', () => {
  let backupRestoreSvc: BackupRestoreService;
  const mockBookmarkSvc = { getBookmarksForExport: jest.fn() } as any;
  const mockLogSvc = { logInfo: jest.fn() } as any;
  const mockPlatformSvc = {
    downloadFile: jest.fn(),
    getAppVersion: jest.fn(),
    queueSync: jest.fn()
  } as any;
  const mockStoreSvc = { get: jest.fn(), set: jest.fn() } as any;
  const mockUpgradeSvc = { upgradeBookmarks: jest.fn() } as any;
  const mockUtilitySvc = {
    getDateTimeString: jest.fn().mockReturnValue('20230115103045'),
    isSyncEnabled: jest.fn(),
    getApiService: jest.fn()
  } as any;

  beforeEach(() => {
    backupRestoreSvc = new BackupRestoreService(
      $q,
      mockBookmarkSvc,
      mockLogSvc,
      mockPlatformSvc,
      mockStoreSvc,
      mockUpgradeSvc,
      mockUtilitySvc
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  test('createBackupData: Creates backup object with correct structure', () => {
    const bookmarks = [{ id: 1, title: 'Test', url: 'https://test.com' }];
    const syncInfo = { id: 'sync-id', serviceType: 'xbrowsersync' } as any;

    const result = backupRestoreSvc.createBackupData(bookmarks, syncInfo);

    expect(result.xbrowsersync).toBeDefined();
    expect(result.xbrowsersync.date).toBe('20230115103045');
    expect(result.xbrowsersync.sync).toStrictEqual(syncInfo);
    expect(result.xbrowsersync.data.bookmarks).toStrictEqual(bookmarks);
  });

  test('getBackupFilename: Returns filename with timestamp', () => {
    const result = backupRestoreSvc.getBackupFilename();

    expect(result).toBe('xbs_backup_20230115103045.txt');
  });

  test('getSyncInfo: Returns sync info without password', async () => {
    mockStoreSvc.get.mockResolvedValue({
      id: 'sync-id',
      password: 'secret',
      serviceType: 'xbrowsersync',
      version: '1.5.0'
    });

    const result = await backupRestoreSvc.getSyncInfo();

    expect(result.id).toBe('sync-id');
    expect(result.serviceType).toBe('xbrowsersync');
    expect(result.version).toBe('1.5.0');
    expect((result as any).password).toBeUndefined();
  });

  test('getSetAutoBackUpSchedule: Gets value from store when no argument', async () => {
    const schedule = { autoBackUpHour: 2, autoBackUpMinute: 0, autoBackUpNumber: 1, autoBackUpUnit: 'day' };
    mockStoreSvc.get.mockResolvedValue(schedule);

    const result = await backupRestoreSvc.getSetAutoBackUpSchedule();

    expect(result).toStrictEqual(schedule);
  });

  test('getSetAutoBackUpSchedule: Sets and returns value when argument provided', async () => {
    const schedule = { autoBackUpHour: 3, autoBackUpMinute: 30, autoBackUpNumber: 2, autoBackUpUnit: 'day' };
    mockStoreSvc.set.mockResolvedValue();

    const result = await backupRestoreSvc.getSetAutoBackUpSchedule(schedule as any);

    expect(mockStoreSvc.set).toBeCalled();
    expect(result).toStrictEqual(schedule);
  });

  test('getSetAutoBackUpSchedule: Logs message when clearing schedule', async () => {
    mockStoreSvc.set.mockResolvedValue();

    await backupRestoreSvc.getSetAutoBackUpSchedule(null);

    expect(mockLogSvc.logInfo).toBeCalledWith('Auto back up schedule cleared');
  });

  test('restoreBackupData: Throws FailedRestoreDataError for invalid backup format', () => {
    const badData = { invalid: 'data' } as any;

    expect(() => backupRestoreSvc.restoreBackupData(badData)).toThrow(FailedRestoreDataError);
  });

  test('restoreBackupData: Handles v1.5.0+ backup format with xbrowsersync key', async () => {
    const backupData = {
      xbrowsersync: {
        date: '20230101120000',
        sync: { id: 'sync-id', serviceType: 'xbrowsersync', version: '1.5.0' },
        data: {
          bookmarks: [{ id: 1, title: 'Test', url: 'https://test.com' }]
        }
      }
    } as any;
    mockPlatformSvc.getAppVersion.mockResolvedValue('1.5.0');
    mockUpgradeSvc.upgradeBookmarks.mockResolvedValue(backupData.xbrowsersync.data.bookmarks);
    mockUtilitySvc.isSyncEnabled.mockResolvedValue(false);
    mockStoreSvc.set.mockResolvedValue();
    mockPlatformSvc.queueSync.mockResolvedValue();

    await backupRestoreSvc.restoreBackupData(backupData);

    expect(mockPlatformSvc.queueSync).toBeCalled();
  });

  test('restoreBackupData: Handles pre-v1.5.0 backup format with xBrowserSync key', async () => {
    const backupData = {
      xBrowserSync: {
        bookmarks: [{ id: 1, title: 'Test', url: 'https://test.com' }]
      }
    } as any;
    mockPlatformSvc.getAppVersion.mockResolvedValue('1.5.0');
    mockUpgradeSvc.upgradeBookmarks.mockResolvedValue(backupData.xBrowserSync.bookmarks);
    mockUtilitySvc.isSyncEnabled.mockResolvedValue(false);
    mockStoreSvc.set.mockResolvedValue();
    mockPlatformSvc.queueSync.mockResolvedValue();

    await backupRestoreSvc.restoreBackupData(backupData);

    expect(mockPlatformSvc.queueSync).toBeCalled();
  });

  test('saveBackupFile: Creates and downloads backup file', async () => {
    mockBookmarkSvc.getBookmarksForExport.mockResolvedValue([{ id: 1, title: 'Test' }]);
    mockStoreSvc.get.mockResolvedValue({ id: 'sync-id', serviceType: 'xbrowsersync' });
    mockUtilitySvc.isSyncEnabled.mockResolvedValue(true);
    mockPlatformSvc.downloadFile.mockResolvedValue();

    await backupRestoreSvc.saveBackupFile(true);

    expect(mockPlatformSvc.downloadFile).toBeCalled();
  });
});
