import '../../../test/mock-angular';
import { $q } from '../../../test/mock-services';
import { StoreKey } from '../store/store.enum';
import { UtilityService } from './utility.service';

jest.mock('xregexp', () => {
  return {
    default: (pattern: string, flags: string) => new RegExp(pattern, `${flags}u`),
    __esModule: true
  };
});

jest.mock('detect-browser', () => ({
  detect: () => ({ name: 'chrome', version: '100.0' })
}));

describe('UtilityService', () => {
  let utilitySvc: UtilityService;
  const mock$exceptionHandler = jest.fn();
  const mock$http = { get: jest.fn() } as any;
  const mock$injector = {
    get: jest.fn(),
    annotate: jest.fn(),
    has: jest.fn(),
    instantiate: jest.fn(),
    invoke: jest.fn(),
    loadNewModules: jest.fn(),
    modules: {},
    strictDi: false
  } as any;
  const mock$location = { path: jest.fn() } as any;
  const mock$rootScope = { $broadcast: jest.fn() } as any;
  const mockLogSvc = { logInfo: jest.fn(), logWarning: jest.fn() } as any;
  const mockNetworkSvc = { isNetworkConnected: jest.fn() } as any;
  const mockStoreSvc = { get: jest.fn(), set: jest.fn() } as any;

  beforeEach(() => {
    utilitySvc = new UtilityService(
      mock$exceptionHandler,
      mock$http,
      mock$injector,
      mock$location,
      $q,
      mock$rootScope,
      mockLogSvc,
      mockNetworkSvc,
      mockStoreSvc
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  test('filterFalsyValues: Removes falsy values from string array', () => {
    const result = utilitySvc.filterFalsyValues(['hello', '', 'world', '', 'test']);

    expect(result).toStrictEqual(['hello', 'world', 'test']);
  });

  test('filterFalsyValues: Returns empty array when all values are falsy', () => {
    const result = utilitySvc.filterFalsyValues(['', '', '']);

    expect(result).toStrictEqual([]);
  });

  test('getDateTimeString: Returns empty string when no date provided', () => {
    const result = utilitySvc.getDateTimeString(undefined as any);

    expect(result).toBe('');
  });

  test('getDateTimeString: Returns formatted date string', () => {
    const testDate = new Date(2023, 0, 15, 10, 30, 45);

    const result = utilitySvc.getDateTimeString(testDate);

    expect(result).toBe('20230115103045');
  });

  test('getDateTimeString: Pads single digit values with zero', () => {
    const testDate = new Date(2023, 0, 5, 3, 5, 9);

    const result = utilitySvc.getDateTimeString(testDate);

    expect(result).toBe('20230105030509');
  });

  test('getSemVerAlignedVersion: Strips v prefix from version', () => {
    const result = utilitySvc.getSemVerAlignedVersion('v1.2.3');

    expect(result).toBe('1.2.3');
  });

  test('getSemVerAlignedVersion: Returns version without v prefix as is', () => {
    const result = utilitySvc.getSemVerAlignedVersion('1.2.3');

    expect(result).toBe('1.2.3');
  });

  test('getSemVerAlignedVersion: Strips extra build number', () => {
    const result = utilitySvc.getSemVerAlignedVersion('v1.2.3.4');

    expect(result).toBe('1.2.3');
  });

  test('compareVersions: Returns true when first version is greater', () => {
    const result = utilitySvc.compareVersions('1.2.0', '1.1.0', '>');

    expect(result).toBe(true);
  });

  test('compareVersions: Returns false when first version is not greater', () => {
    const result = utilitySvc.compareVersions('1.0.0', '1.1.0', '>');

    expect(result).toBe(false);
  });

  test('compareVersions: Returns true for equal versions with equality operator', () => {
    const result = utilitySvc.compareVersions('1.2.3', '1.2.3', '=');

    expect(result).toBe(true);
  });

  test('getTagArrayFromText: Returns undefined when text is undefined', () => {
    const result = utilitySvc.getTagArrayFromText(undefined as any);

    expect(result).toBeUndefined();
  });

  test('getTagArrayFromText: Splits tags by comma', () => {
    const result = utilitySvc.getTagArrayFromText('javascript,typescript,testing');

    expect(result).toStrictEqual(['javascript', 'testing', 'typescript']);
  });

  test('getTagArrayFromText: Splits tags by semicolon', () => {
    const result = utilitySvc.getTagArrayFromText('javascript;typescript;testing');

    expect(result).toStrictEqual(['javascript', 'testing', 'typescript']);
  });

  test('getTagArrayFromText: Filters out tags shorter than minimum length', () => {
    const result = utilitySvc.getTagArrayFromText('js,typescript,go');

    expect(result).toStrictEqual(['typescript']);
  });

  test('getTagArrayFromText: Trims whitespace from tags', () => {
    const result = utilitySvc.getTagArrayFromText(' javascript , typescript ');

    expect(result).toStrictEqual(['javascript', 'typescript']);
  });

  test('isMobilePlatform: Returns true for Android platform', () => {
    const result = utilitySvc.isMobilePlatform('android');

    expect(result).toBe(true);
  });

  test('isMobilePlatform: Returns false for non-Android platform', () => {
    const result = utilitySvc.isMobilePlatform('chromium');

    expect(result).toBe(false);
  });

  test('isTextInput: Returns true for INPUT element', () => {
    const element = document.createElement('input');

    const result = utilitySvc.isTextInput(element);

    expect(result).toBe(true);
  });

  test('isTextInput: Returns true for TEXTAREA element', () => {
    const element = document.createElement('textarea');

    const result = utilitySvc.isTextInput(element);

    expect(result).toBe(true);
  });

  test('isTextInput: Returns false for DIV element', () => {
    const element = document.createElement('div');

    const result = utilitySvc.isTextInput(element);

    expect(result).toBe(false);
  });

  test('parseUrl: Parses URL correctly', () => {
    const result = utilitySvc.parseUrl('https://example.com:8080/path?key=value#hash');

    expect(result.protocol).toBe('https:');
    expect(result.hostname).toBe('example.com');
    expect(result.port).toBe('8080');
    expect(result.pathname).toBe('/path');
    expect(result.hash).toBe('#hash');
    expect(result.searchObject.key).toBe('value');
  });

  test('sortWords: Sorts words alphabetically and removes duplicates', () => {
    const result = utilitySvc.sortWords(['banana', 'apple', 'cherry', 'apple']);

    expect(result).toStrictEqual(['apple', 'banana', 'cherry']);
  });

  test('splitTextIntoWords: Returns empty array for undefined text', () => {
    const result = utilitySvc.splitTextIntoWords(undefined as any, 'en');

    expect(result).toStrictEqual([]);
  });

  test('splitTextIntoWords: Splits text into lowercase words', () => {
    const result = utilitySvc.splitTextIntoWords('Hello World Test', 'en');

    expect(result).toStrictEqual(['hello', 'world', 'test']);
  });

  test('splitTextIntoWords: Removes quotes and splits into words', () => {
    const result = utilitySvc.splitTextIntoWords('"hello" \'world\' "test"', 'en');

    expect(result).toStrictEqual(['hello', 'world', 'test']);
  });

  test('stringsAreEquivalent: Returns true for equivalent strings ignoring case', () => {
    const result = utilitySvc.stringsAreEquivalent('Hello', 'hello');

    expect(result).toBe(true);
  });

  test('stringsAreEquivalent: Returns false for different strings', () => {
    const result = utilitySvc.stringsAreEquivalent('Hello', 'World');

    expect(result).toBe(false);
  });

  test('stringsAreEquivalent: Returns true for empty strings by default', () => {
    const result = utilitySvc.stringsAreEquivalent();

    expect(result).toBe(true);
  });

  test('stripTags: Removes HTML tags from input', () => {
    const result = utilitySvc.stripTags('<p>Hello <strong>World</strong></p>');

    expect(result).toBe('Hello World');
  });

  test('stripTags: Returns falsy input as is', () => {
    const result = utilitySvc.stripTags('');

    expect(result).toBe('');
  });

  test('syncIdIsValid: Returns false for empty syncId', () => {
    const result = utilitySvc.syncIdIsValid('');

    expect(result).toBe(false);
  });

  test('syncIdIsValid: Returns false for null syncId', () => {
    const result = utilitySvc.syncIdIsValid(null as any);

    expect(result).toBe(false);
  });

  test('syncIdIsValid: Returns true for valid 32-char hex syncId', () => {
    const result = utilitySvc.syncIdIsValid('a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6');

    expect(result).toBe(true);
  });

  test('syncIdIsValid: Returns false for invalid syncId', () => {
    const result = utilitySvc.syncIdIsValid('invalid');

    expect(result).toBe(false);
  });

  test('trimToNearestWord: Returns empty string for falsy text', () => {
    const result = utilitySvc.trimToNearestWord('', 10);

    expect(result).toBe('');
  });

  test('trimToNearestWord: Returns full text when within limit', () => {
    const result = utilitySvc.trimToNearestWord('Hello World', 100);

    expect(result).toBe('Hello World');
  });

  test('trimToNearestWord: Trims to nearest word when over limit', () => {
    const result = utilitySvc.trimToNearestWord('Hello World Test String', 12);

    expect(result).toBe('Hello World\u2026');
  });

  test('checkSyncCredentialsExist: Returns sync info when id and password exist', async () => {
    const testSyncInfo = { id: 'test-id', password: 'test-password' };
    mockStoreSvc.get.mockResolvedValue(testSyncInfo);

    const result = await utilitySvc.checkSyncCredentialsExist();

    expect(result).toStrictEqual(testSyncInfo);
  });

  test('checkSyncCredentialsExist: Throws IncompleteSyncInfoError when id is missing', async () => {
    mockStoreSvc.get.mockResolvedValue({ password: 'test-password' });

    await expect(utilitySvc.checkSyncCredentialsExist()).rejects.toThrow();
  });

  test('checkSyncCredentialsExist: Throws IncompleteSyncInfoError when password is missing', async () => {
    mockStoreSvc.get.mockResolvedValue({ id: 'test-id' });

    await expect(utilitySvc.checkSyncCredentialsExist()).rejects.toThrow();
  });

  test('isSyncEnabled: Returns value from store', async () => {
    mockStoreSvc.get.mockResolvedValue(true);

    const result = await utilitySvc.isSyncEnabled();

    expect(result).toBe(true);
    expect(mockStoreSvc.get).toBeCalledWith(StoreKey.SyncEnabled);
  });

  test('getSyncVersion: Returns version from sync info', async () => {
    mockStoreSvc.get.mockResolvedValue({ version: '1.5.0' });

    const result = await utilitySvc.getSyncVersion();

    expect(result).toBe('1.5.0');
  });

  test('getSyncVersion: Returns undefined when no sync info', async () => {
    mockStoreSvc.get.mockResolvedValue(undefined);

    const result = await utilitySvc.getSyncVersion();

    expect(result).toBeUndefined();
  });

  test('broadcastEvent: Broadcasts event on rootScope', () => {
    utilitySvc.broadcastEvent('testEvent' as any, ['data']);

    expect(mock$rootScope.$broadcast).toBeCalledWith('testEvent', ['data']);
  });

  test('checkCurrentRoute: Returns true when current path starts with route', () => {
    mock$location.path.mockReturnValue('/login/step1');

    const result = utilitySvc.checkCurrentRoute('/login' as any);

    expect(result).toBe(true);
  });

  test('checkCurrentRoute: Returns false when current path does not match route', () => {
    mock$location.path.mockReturnValue('/settings');

    const result = utilitySvc.checkCurrentRoute('/login' as any);

    expect(result).toBe(false);
  });

  test('getCurrentApiServiceType: Returns xBrowserSync service type', async () => {
    const result = await utilitySvc.getCurrentApiServiceType();

    expect(result).toBe('xbrowsersync');
  });

  test('getInstallationId: Returns existing installation id from store', async () => {
    mockStoreSvc.get.mockResolvedValue('existing-id');

    const result = await utilitySvc.getInstallationId();

    expect(result).toBe('existing-id');
  });

  test('getInstallationId: Generates and stores new id when not in store', async () => {
    mockStoreSvc.get.mockResolvedValue(undefined);
    mockStoreSvc.set.mockResolvedValue();

    const result = await utilitySvc.getInstallationId();

    expect(result).toBeTruthy();
    expect(mockStoreSvc.set).toBeCalled();
  });

  test('uuidv4: Generates a valid UUID v4 string', () => {
    const result = utilitySvc.uuidv4();

    expect(result).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  test('getUniqueishId: Returns a non-empty string', () => {
    const result = utilitySvc.getUniqueishId();

    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });

  test('checkForNewVersion: Returns empty string when not connected', async () => {
    mockNetworkSvc.isNetworkConnected.mockReturnValue(false);

    const result = await utilitySvc.checkForNewVersion('1.0.0');

    expect(result).toBe('');
  });

  test('asyncWhile: Executes action while condition is true', async () => {
    let count = 0;
    const condition = (data: number) => Promise.resolve(data < 3) as any;
    const action = (data: number) => {
      count += 1;
      return Promise.resolve(data + 1) as any;
    };

    const result = await utilitySvc.asyncWhile(0, condition, action);

    expect(result).toBe(3);
    expect(count).toBe(3);
  });
});
