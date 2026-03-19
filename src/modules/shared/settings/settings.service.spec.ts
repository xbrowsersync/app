import '../../../test/mock-angular';
import { StoreKey } from '../store/store.enum';
import { SettingsService } from './settings.service';

describe('SettingsService', () => {
  let settingsSvc: SettingsService;
  const mockLogSvc = { logInfo: jest.fn() } as any;
  const mockStoreSvc = { get: jest.fn(), set: jest.fn() } as any;

  beforeEach(() => {
    settingsSvc = new SettingsService(mockLogSvc, mockStoreSvc);
  });

  afterEach(() => jest.restoreAllMocks());

  test('all: Returns all settings from store', async () => {
    const testSettings = {
      [StoreKey.AlternateSearchBarPosition]: false,
      [StoreKey.AutoFetchMetadata]: true,
      [StoreKey.CheckForAppUpdates]: true,
      [StoreKey.DarkModeEnabled]: false,
      [StoreKey.DefaultToFolderView]: false,
      [StoreKey.SyncBookmarksToolbar]: false,
      [StoreKey.TelemetryEnabled]: true
    };
    mockStoreSvc.get.mockResolvedValue(testSettings);

    const result = await settingsSvc.all();

    expect(result).toStrictEqual(testSettings);
  });

  test('alternateSearchBarPosition: Gets value from store when no argument provided', async () => {
    mockStoreSvc.get.mockResolvedValue(true);

    const result = await settingsSvc.alternateSearchBarPosition();

    expect(mockStoreSvc.get).toBeCalledWith(StoreKey.AlternateSearchBarPosition);
    expect(result).toBe(true);
  });

  test('alternateSearchBarPosition: Sets value in store when argument provided', async () => {
    mockStoreSvc.set.mockResolvedValue();

    const result = await settingsSvc.alternateSearchBarPosition(true);

    expect(mockStoreSvc.set).toBeCalledWith(StoreKey.AlternateSearchBarPosition, true);
    expect(result).toBe(true);
  });

  test('autoFetchMetadata: Gets value from store when no argument provided', async () => {
    mockStoreSvc.get.mockResolvedValue(false);

    const result = await settingsSvc.autoFetchMetadata();

    expect(mockStoreSvc.get).toBeCalledWith(StoreKey.AutoFetchMetadata);
    expect(result).toBe(false);
  });

  test('autoFetchMetadata: Sets value in store when argument provided', async () => {
    mockStoreSvc.set.mockResolvedValue();

    const result = await settingsSvc.autoFetchMetadata(true);

    expect(mockStoreSvc.set).toBeCalledWith(StoreKey.AutoFetchMetadata, true);
    expect(result).toBe(true);
  });

  test('checkForAppUpdates: Gets value from store when no argument provided', async () => {
    mockStoreSvc.get.mockResolvedValue(true);

    const result = await settingsSvc.checkForAppUpdates();

    expect(mockStoreSvc.get).toBeCalledWith(StoreKey.CheckForAppUpdates);
    expect(result).toBe(true);
  });

  test('checkForAppUpdates: Sets value in store when argument provided', async () => {
    mockStoreSvc.set.mockResolvedValue();

    const result = await settingsSvc.checkForAppUpdates(false);

    expect(mockStoreSvc.set).toBeCalledWith(StoreKey.CheckForAppUpdates, false);
    expect(result).toBe(false);
  });

  test('darkModeEnabled: Gets value from store and updates darkMode property', async () => {
    mockStoreSvc.get.mockResolvedValue(true);

    const result = await settingsSvc.darkModeEnabled();

    expect(mockStoreSvc.get).toBeCalledWith(StoreKey.DarkModeEnabled);
    expect(result).toBe(true);
    expect(settingsSvc.darkMode).toBe(true);
  });

  test('darkModeEnabled: Sets value in store and updates darkMode property', async () => {
    mockStoreSvc.set.mockResolvedValue();

    const result = await settingsSvc.darkModeEnabled(true);

    expect(mockStoreSvc.set).toBeCalledWith(StoreKey.DarkModeEnabled, true);
    expect(result).toBe(true);
    expect(settingsSvc.darkMode).toBe(true);
  });

  test('defaultToFolderView: Gets value from store when no argument provided', async () => {
    mockStoreSvc.get.mockResolvedValue(false);

    const result = await settingsSvc.defaultToFolderView();

    expect(mockStoreSvc.get).toBeCalledWith(StoreKey.DefaultToFolderView);
    expect(result).toBe(false);
  });

  test('defaultToFolderView: Sets value in store when argument provided', async () => {
    mockStoreSvc.set.mockResolvedValue();

    const result = await settingsSvc.defaultToFolderView(true);

    expect(mockStoreSvc.set).toBeCalledWith(StoreKey.DefaultToFolderView, true);
    expect(result).toBe(true);
  });

  test('syncBookmarksToolbar: Gets value from store when no argument provided', async () => {
    mockStoreSvc.get.mockResolvedValue(false);

    const result = await settingsSvc.syncBookmarksToolbar();

    expect(mockStoreSvc.get).toBeCalledWith(StoreKey.SyncBookmarksToolbar);
    expect(result).toBe(false);
  });

  test('syncBookmarksToolbar: Sets value in store when argument provided', async () => {
    mockStoreSvc.set.mockResolvedValue();

    const result = await settingsSvc.syncBookmarksToolbar(true);

    expect(mockStoreSvc.set).toBeCalledWith(StoreKey.SyncBookmarksToolbar, true);
    expect(result).toBe(true);
  });

  test('telemetryEnabled: Gets value from store when no argument provided', async () => {
    mockStoreSvc.get.mockResolvedValue(true);

    const result = await settingsSvc.telemetryEnabled();

    expect(mockStoreSvc.get).toBeCalledWith(StoreKey.TelemetryEnabled);
    expect(result).toBe(true);
  });

  test('telemetryEnabled: Sets value in store when argument provided', async () => {
    mockStoreSvc.set.mockResolvedValue();

    const result = await settingsSvc.telemetryEnabled(false);

    expect(mockStoreSvc.set).toBeCalledWith(StoreKey.TelemetryEnabled, false);
    expect(result).toBe(false);
  });

  test('darkModeEnabled: Logs message when setting value', async () => {
    mockStoreSvc.set.mockResolvedValue();

    await settingsSvc.darkModeEnabled(true);

    expect(mockLogSvc.logInfo).toBeCalled();
  });
});
