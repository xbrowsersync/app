import '../../../../test/mock-angular';
import { $q } from '../../../../test/mock-services';
import { BookmarkMappingNotFoundError } from '../../../shared/errors/errors';
import { StoreKey } from '../../../shared/store/store.enum';
import { BookmarkIdMapperService } from './bookmark-id-mapper.service';

describe('BookmarkIdMapperService', () => {
  let idMapperSvc: BookmarkIdMapperService;
  const mockStoreSvc = { get: jest.fn(), set: jest.fn(), remove: jest.fn() } as any;

  beforeEach(() => {
    idMapperSvc = new BookmarkIdMapperService($q, mockStoreSvc);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  test('createMapping: Creates mapping object with syncedId and nativeId', () => {
    const mapping = idMapperSvc.createMapping(42, 'native-123');

    expect(mapping).toStrictEqual({ syncedId: 42, nativeId: 'native-123' });
  });

  test('createMapping: Creates mapping with undefined nativeId', () => {
    const mapping = idMapperSvc.createMapping(42);

    expect(mapping).toStrictEqual({ syncedId: 42, nativeId: undefined });
  });

  test('clear: Removes bookmark id mappings from store', async () => {
    mockStoreSvc.remove.mockResolvedValue();

    await idMapperSvc.clear();

    expect(mockStoreSvc.remove).toBeCalledWith(StoreKey.BookmarkIdMappings);
  });

  test('get: Finds mapping by nativeId', async () => {
    const mappings = [
      { syncedId: 1, nativeId: 'a' },
      { syncedId: 2, nativeId: 'b' }
    ];
    mockStoreSvc.get.mockResolvedValue(mappings);

    const result = await idMapperSvc.get('b');

    expect(result).toStrictEqual({ syncedId: 2, nativeId: 'b' });
  });

  test('get: Finds mapping by syncedId', async () => {
    const mappings = [
      { syncedId: 1, nativeId: 'a' },
      { syncedId: 2, nativeId: 'b' }
    ];
    mockStoreSvc.get.mockResolvedValue(mappings);

    const result = await idMapperSvc.get(null as any, 1);

    expect(result).toStrictEqual({ syncedId: 1, nativeId: 'a' });
  });

  test('get: Returns undefined when mapping not found', async () => {
    mockStoreSvc.get.mockResolvedValue([]);

    const result = await idMapperSvc.get('nonexistent');

    expect(result).toBeUndefined();
  });

  test('add: Adds single mapping to existing mappings', async () => {
    const existingMappings = [{ syncedId: 1, nativeId: 'a' }];
    mockStoreSvc.get.mockResolvedValue(existingMappings);
    mockStoreSvc.set.mockResolvedValue();

    await idMapperSvc.add({ syncedId: 2, nativeId: 'b' });

    expect(mockStoreSvc.set).toBeCalledWith(
      StoreKey.BookmarkIdMappings,
      expect.arrayContaining([
        { syncedId: 1, nativeId: 'a' },
        { syncedId: 2, nativeId: 'b' }
      ])
    );
  });

  test('add: Adds array of mappings', async () => {
    mockStoreSvc.get.mockResolvedValue([]);
    mockStoreSvc.set.mockResolvedValue();

    await idMapperSvc.add([
      { syncedId: 1, nativeId: 'a' },
      { syncedId: 2, nativeId: 'b' }
    ]);

    expect(mockStoreSvc.set).toBeCalled();
  });

  test('set: Sorts mappings by syncedId and saves to store', async () => {
    mockStoreSvc.set.mockResolvedValue();
    const unsortedMappings = [
      { syncedId: 3, nativeId: 'c' },
      { syncedId: 1, nativeId: 'a' },
      { syncedId: 2, nativeId: 'b' }
    ];

    await idMapperSvc.set(unsortedMappings);

    expect(mockStoreSvc.set).toBeCalledWith(StoreKey.BookmarkIdMappings, [
      { syncedId: 1, nativeId: 'a' },
      { syncedId: 2, nativeId: 'b' },
      { syncedId: 3, nativeId: 'c' }
    ]);
  });

  test('remove: Removes mapping by syncedId', async () => {
    const mappings = [
      { syncedId: 1, nativeId: 'a' },
      { syncedId: 2, nativeId: 'b' },
      { syncedId: 3, nativeId: 'c' }
    ];
    mockStoreSvc.get.mockResolvedValue(mappings);
    mockStoreSvc.set.mockResolvedValue();

    await idMapperSvc.remove(2);

    expect(mockStoreSvc.set).toBeCalledWith(
      StoreKey.BookmarkIdMappings,
      expect.arrayContaining([
        { syncedId: 1, nativeId: 'a' },
        { syncedId: 3, nativeId: 'c' }
      ])
    );
  });

  test('remove: Throws BookmarkMappingNotFoundError when syncedId not found', async () => {
    mockStoreSvc.get.mockResolvedValue([{ syncedId: 1, nativeId: 'a' }]);

    await expect(idMapperSvc.remove(999)).rejects.toThrow(BookmarkMappingNotFoundError);
  });

  test('remove: Removes mapping by nativeId', async () => {
    const mappings = [
      { syncedId: 1, nativeId: 'a' },
      { syncedId: 2, nativeId: 'b' }
    ];
    mockStoreSvc.get.mockResolvedValue(mappings);
    mockStoreSvc.set.mockResolvedValue();

    await idMapperSvc.remove(null as any, 'a');

    expect(mockStoreSvc.set).toBeCalledWith(StoreKey.BookmarkIdMappings, [{ syncedId: 2, nativeId: 'b' }]);
  });
});
