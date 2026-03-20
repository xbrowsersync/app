import '../../../../test/mock-angular';
import { $q } from '../../../../test/mock-services';
import Globals from '../../global-shared.constants';
import { BookmarkContainer, BookmarkType } from '../bookmark.enum';
import { Bookmark } from '../bookmark.interface';
import { BookmarkHelperService } from './bookmark-helper.service';

describe('BookmarkHelperService', () => {
  let bookmarkHelperSvc: BookmarkHelperService;
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
  const mockCryptoSvc = { decryptData: jest.fn() } as any;
  const mockStoreSvc = { get: jest.fn(), set: jest.fn() } as any;
  const mockUtilitySvc = {
    trimToNearestWord: jest.fn((text: string) => text),
    splitTextIntoWords: jest.fn((text: string) => (text ? text.toLowerCase().split(/\s+/).filter(Boolean) : [])),
    sortWords: jest.fn((words: string[]) => [...new Set(words)].sort()),
    stringsAreEquivalent: jest.fn((a: string, b: string) => a === b),
    filterFalsyValues: jest.fn((values: string[]) => values.filter((x) => x))
  } as any;

  beforeEach(() => {
    bookmarkHelperSvc = new BookmarkHelperService(mock$injector, $q, mockCryptoSvc, mockStoreSvc, mockUtilitySvc);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  // cleanBookmark tests
  test('cleanBookmark: Removes invalid keys from bookmark', () => {
    const bookmark: any = {
      title: 'Test',
      url: 'https://example.com',
      invalidKey: 'should be removed',
      anotherInvalid: 123
    };

    const result = bookmarkHelperSvc.cleanBookmark(bookmark);

    expect(result.title).toBe('Test');
    expect(result.url).toBe('https://example.com');
    expect((result as any).invalidKey).toBeUndefined();
    expect((result as any).anotherInvalid).toBeUndefined();
  });

  test('cleanBookmark: Removes empty description', () => {
    const bookmark: Bookmark = {
      title: 'Test',
      url: 'https://example.com',
      description: '   '
    };

    const result = bookmarkHelperSvc.cleanBookmark(bookmark);

    expect(result.description).toBeUndefined();
  });

  test('cleanBookmark: Keeps non-empty description', () => {
    const bookmark: Bookmark = {
      title: 'Test',
      url: 'https://example.com',
      description: 'A valid description'
    };

    const result = bookmarkHelperSvc.cleanBookmark(bookmark);

    expect(result.description).toBe('A valid description');
  });

  test('cleanBookmark: Removes empty tags array', () => {
    const bookmark: Bookmark = {
      title: 'Test',
      url: 'https://example.com',
      tags: []
    };

    const result = bookmarkHelperSvc.cleanBookmark(bookmark);

    expect(result.tags).toBeUndefined();
  });

  test('cleanBookmark: Keeps non-empty tags array', () => {
    const bookmark: Bookmark = {
      title: 'Test',
      url: 'https://example.com',
      tags: ['tag1', 'tag2']
    };

    const result = bookmarkHelperSvc.cleanBookmark(bookmark);

    expect(result.tags).toStrictEqual(['tag1', 'tag2']);
  });

  // cleanAllBookmarks tests
  test('cleanAllBookmarks: Cleans all bookmarks recursively', () => {
    const bookmarks: any[] = [
      {
        title: 'Folder',
        children: [{ title: 'Child', url: 'https://example.com', invalidKey: 'removed' }],
        invalidKey: 'removed'
      }
    ];

    const result = bookmarkHelperSvc.cleanAllBookmarks(bookmarks);

    expect(result[0].title).toBe('Folder');
    expect((result[0] as any).invalidKey).toBeUndefined();
    expect(result[0].children[0].title).toBe('Child');
    expect((result[0].children[0] as any).invalidKey).toBeUndefined();
  });

  // getBookmarkType tests
  test('getBookmarkType: Returns Container for Menu bookmark', () => {
    const bookmark: Bookmark = { title: BookmarkContainer.Menu, children: [] };

    const result = bookmarkHelperSvc.getBookmarkType(bookmark);

    expect(result).toBe(BookmarkType.Container);
  });

  test('getBookmarkType: Returns Container for Other bookmark', () => {
    const bookmark: Bookmark = { title: BookmarkContainer.Other, children: [] };

    const result = bookmarkHelperSvc.getBookmarkType(bookmark);

    expect(result).toBe(BookmarkType.Container);
  });

  test('getBookmarkType: Returns Container for Toolbar bookmark', () => {
    const bookmark: Bookmark = { title: BookmarkContainer.Toolbar, children: [] };

    const result = bookmarkHelperSvc.getBookmarkType(bookmark);

    expect(result).toBe(BookmarkType.Container);
  });

  test('getBookmarkType: Returns Folder for bookmark with children array', () => {
    const bookmark: Bookmark = { title: 'My Folder', children: [] };

    const result = bookmarkHelperSvc.getBookmarkType(bookmark);

    expect(result).toBe(BookmarkType.Folder);
  });

  test('getBookmarkType: Returns Separator for bookmark with separator URL', () => {
    const bookmark: Bookmark = { url: Globals.Bookmarks.SeparatorUrl };

    const result = bookmarkHelperSvc.getBookmarkType(bookmark);

    expect(result).toBe(BookmarkType.Separator);
  });

  test('getBookmarkType: Returns Bookmark for regular bookmark', () => {
    const bookmark: Bookmark = { title: 'Test', url: 'https://example.com' };

    const result = bookmarkHelperSvc.getBookmarkType(bookmark);

    expect(result).toBe(BookmarkType.Bookmark);
  });

  // findBookmarkById tests
  test('findBookmarkById: Finds bookmark at top level', () => {
    const bookmarks: Bookmark[] = [
      { id: 1, title: 'First', url: 'https://first.com' },
      { id: 2, title: 'Second', url: 'https://second.com' }
    ];

    const result = bookmarkHelperSvc.findBookmarkById(2, bookmarks);

    expect(result).toBeDefined();
    expect((result as Bookmark).title).toBe('Second');
  });

  test('findBookmarkById: Finds bookmark in nested children', () => {
    const bookmarks: Bookmark[] = [
      {
        id: 1,
        title: 'Folder',
        children: [{ id: 2, title: 'Child', url: 'https://child.com' }]
      }
    ];

    const result = bookmarkHelperSvc.findBookmarkById(2, bookmarks);

    expect(result).toBeDefined();
    expect((result as Bookmark).title).toBe('Child');
  });

  test('findBookmarkById: Returns undefined when id not found', () => {
    const bookmarks: Bookmark[] = [{ id: 1, title: 'First', url: 'https://first.com' }];

    const result = bookmarkHelperSvc.findBookmarkById(999, bookmarks);

    expect(result).toBeUndefined();
  });

  test('findBookmarkById: Returns undefined for undefined id', () => {
    const bookmarks: Bookmark[] = [{ id: 1, title: 'Test' }];

    const result = bookmarkHelperSvc.findBookmarkById(undefined as any, bookmarks);

    expect(result).toBeUndefined();
  });

  // eachBookmark tests
  test('eachBookmark: Iterates through all bookmarks', () => {
    const titles: string[] = [];
    const bookmarks: Bookmark[] = [
      {
        title: 'Folder',
        children: [
          { title: 'Child1', url: 'https://child1.com' },
          { title: 'Child2', url: 'https://child2.com' }
        ]
      },
      { title: 'Root', url: 'https://root.com' }
    ];

    bookmarkHelperSvc.eachBookmark((bookmark) => {
      titles.push(bookmark.title);
    }, bookmarks);

    expect(titles).toStrictEqual(['Folder', 'Child1', 'Child2', 'Root']);
  });

  test('eachBookmark: Stops iterating when condition is met', () => {
    const titles: string[] = [];
    const bookmarks: Bookmark[] = [
      { title: 'First', url: 'https://first.com' },
      { title: 'Second', url: 'https://second.com' },
      { title: 'Third', url: 'https://third.com' }
    ];
    let found = false;

    bookmarkHelperSvc.eachBookmark(
      (bookmark) => {
        titles.push(bookmark.title);
        if (bookmark.title === 'Second') {
          found = true;
        }
      },
      bookmarks,
      () => found
    );

    expect(titles).toStrictEqual(['First', 'Second']);
  });

  // getContainer tests
  test('getContainer: Returns container by name', () => {
    const bookmarks: Bookmark[] = [
      { title: BookmarkContainer.Menu, children: [] },
      { title: BookmarkContainer.Other, children: [] }
    ];

    const result = bookmarkHelperSvc.getContainer(BookmarkContainer.Menu, bookmarks);

    expect(result).toBeDefined();
    expect(result.title).toBe(BookmarkContainer.Menu);
  });

  test('getContainer: Returns undefined when container not found', () => {
    const bookmarks: Bookmark[] = [{ title: BookmarkContainer.Menu, children: [] }];

    const result = bookmarkHelperSvc.getContainer(BookmarkContainer.Other, bookmarks);

    expect(result).toBeUndefined();
  });

  test('getContainer: Creates container when not found and createIfNotPresent is true', () => {
    const bookmarks: Bookmark[] = [{ title: BookmarkContainer.Menu, children: [] }];

    const result = bookmarkHelperSvc.getContainer(BookmarkContainer.Other, bookmarks, true);

    expect(result).toBeDefined();
    expect(bookmarks.length).toBe(2);
  });

  // getNewBookmarkId tests
  test('getNewBookmarkId: Returns highest id + 1', () => {
    const bookmarks: Bookmark[] = [
      { id: 1, title: 'First', url: 'https://first.com' },
      { id: 5, title: 'Second', url: 'https://second.com' },
      { id: 3, title: 'Third', url: 'https://third.com' }
    ];

    const result = bookmarkHelperSvc.getNewBookmarkId(bookmarks);

    expect(result).toBe(6);
  });

  test('getNewBookmarkId: Considers taken ids', () => {
    const bookmarks: Bookmark[] = [{ id: 1, title: 'First', url: 'https://first.com' }];

    const result = bookmarkHelperSvc.getNewBookmarkId(bookmarks, [0, 10]);

    expect(result).toBe(11);
  });

  test('getNewBookmarkId: Returns 1 for empty bookmarks', () => {
    const result = bookmarkHelperSvc.getNewBookmarkId([]);

    expect(result).toBe(1);
  });

  // newBookmark tests
  test('newBookmark: Creates a bookmark with url (no children)', () => {
    const result = bookmarkHelperSvc.newBookmark('Test', 'https://example.com', 'Description', ['tag1']);

    expect(result.title).toBe('Test');
    expect(result.url).toBe('https://example.com');
    expect(result.children).toBeUndefined();
  });

  test('newBookmark: Creates a folder without url (with children)', () => {
    const result = bookmarkHelperSvc.newBookmark('Folder');

    expect(result.title).toBe('Folder');
    expect(result.url).toBeUndefined();
    expect(result.children).toStrictEqual([]);
  });

  test('newBookmark: Generates id when bookmarks provided', () => {
    const existingBookmarks: Bookmark[] = [{ id: 5, title: 'Existing', url: 'https://existing.com' }];

    const result = bookmarkHelperSvc.newBookmark('New', 'https://new.com', undefined, undefined, existingBookmarks);

    expect(result.id).toBe(6);
  });

  // removeEmptyContainers tests
  test('removeEmptyContainers: Removes containers with no children', () => {
    const bookmarks: Bookmark[] = [
      { title: BookmarkContainer.Menu, children: [] },
      { title: BookmarkContainer.Other, children: [{ title: 'Child', url: 'https://child.com' }] },
      { title: BookmarkContainer.Toolbar, children: [] }
    ];

    const result = bookmarkHelperSvc.removeEmptyContainers(bookmarks);

    expect(result.length).toBe(1);
    expect(result[0].title).toBe(BookmarkContainer.Other);
  });

  test('removeEmptyContainers: Keeps all containers when all have children', () => {
    const bookmarks: Bookmark[] = [
      { title: BookmarkContainer.Menu, children: [{ title: 'A', url: 'https://a.com' }] },
      { title: BookmarkContainer.Other, children: [{ title: 'B', url: 'https://b.com' }] },
      { title: BookmarkContainer.Toolbar, children: [{ title: 'C', url: 'https://c.com' }] }
    ];

    const result = bookmarkHelperSvc.removeEmptyContainers(bookmarks);

    expect(result.length).toBe(3);
  });

  // getContainerByBookmarkId tests
  test('getContainerByBookmarkId: Returns container when id matches container', () => {
    const bookmarks: Bookmark[] = [
      { id: 1, title: BookmarkContainer.Menu, children: [] },
      { id: 2, title: BookmarkContainer.Other, children: [] }
    ];

    const result = bookmarkHelperSvc.getContainerByBookmarkId(1, bookmarks);

    expect(result).toBeDefined();
    expect(result.title).toBe(BookmarkContainer.Menu);
  });

  test('getContainerByBookmarkId: Returns parent container for child bookmark', () => {
    const bookmarks: Bookmark[] = [
      {
        id: 1,
        title: BookmarkContainer.Menu,
        children: [{ id: 10, title: 'Child', url: 'https://child.com' }]
      },
      { id: 2, title: BookmarkContainer.Other, children: [] }
    ];

    const result = bookmarkHelperSvc.getContainerByBookmarkId(10, bookmarks);

    expect(result).toBeDefined();
    expect(result.title).toBe(BookmarkContainer.Menu);
  });

  // searchBookmarksByKeywords tests
  test('searchBookmarksByKeywords: Returns matching bookmarks', () => {
    const bookmarks: Bookmark[] = [
      { id: 1, title: 'JavaScript Tutorial', url: 'https://js.com', tags: ['javascript'] },
      { id: 2, title: 'Python Guide', url: 'https://py.com', tags: ['python'] }
    ];

    const results = bookmarkHelperSvc.searchBookmarksByKeywords(bookmarks, 'en', ['javascript']);

    expect(results.length).toBe(1);
    expect(results[0].title).toBe('JavaScript Tutorial');
  });

  test('searchBookmarksByKeywords: Returns empty array when no matches', () => {
    const bookmarks: Bookmark[] = [{ id: 1, title: 'JavaScript Tutorial', url: 'https://js.com' }];

    const results = bookmarkHelperSvc.searchBookmarksByKeywords(bookmarks, 'en', ['ruby']);

    expect(results.length).toBe(0);
  });

  test('searchBookmarksByKeywords: Searches children of folders', () => {
    const bookmarks: Bookmark[] = [
      {
        title: 'Dev Folder',
        children: [{ id: 1, title: 'JavaScript Tutorial', url: 'https://js.com', tags: ['javascript'] }]
      }
    ];

    const results = bookmarkHelperSvc.searchBookmarksByKeywords(bookmarks, 'en', ['javascript']);

    expect(results.length).toBe(1);
  });

  test('searchBookmarksByKeywords: Ignores separators', () => {
    const bookmarks: Bookmark[] = [
      { url: Globals.Bookmarks.SeparatorUrl },
      { id: 1, title: 'Test', url: 'https://test.com', tags: ['test'] }
    ];

    const results = bookmarkHelperSvc.searchBookmarksByKeywords(bookmarks, 'en', ['test']);

    expect(results.length).toBe(1);
  });

  // searchBookmarksByUrl tests
  test('searchBookmarksByUrl: Finds bookmarks by URL', () => {
    const bookmarks: Bookmark[] = [
      { id: 1, title: 'Example', url: 'https://example.com/page1' },
      { id: 2, title: 'Other', url: 'https://other.com' }
    ];

    const results = bookmarkHelperSvc.searchBookmarksByUrl(bookmarks, 'example.com', 'en');

    expect(results.length).toBe(1);
    expect(results[0].title).toBe('Example');
  });

  test('searchBookmarksByUrl: Searches recursively in children', () => {
    const bookmarks: Bookmark[] = [
      {
        title: 'Folder',
        children: [{ id: 1, title: 'Deep', url: 'https://example.com/deep' }]
      }
    ];

    const results = bookmarkHelperSvc.searchBookmarksByUrl(bookmarks, 'example.com', 'en');

    expect(results.length).toBe(1);
  });

  // extractBookmarkMetadata tests
  test('extractBookmarkMetadata: Extracts metadata from bookmark', () => {
    const bookmark: Bookmark = {
      title: 'Test',
      url: 'https://example.com',
      description: 'A description',
      tags: ['tag1']
    };

    const result = bookmarkHelperSvc.extractBookmarkMetadata(bookmark);

    expect(result.title).toBe('Test');
    expect(result.url).toBe('https://example.com');
    expect(result.description).toBe('A description');
    expect(result.tags).toStrictEqual(['tag1']);
  });

  test('extractBookmarkMetadata: Removes undefined properties', () => {
    const bookmark: Bookmark = {
      title: 'Test',
      url: 'https://example.com'
    };

    const result = bookmarkHelperSvc.extractBookmarkMetadata(bookmark);

    expect(result.title).toBe('Test');
    expect(result.url).toBe('https://example.com');
    expect(result.description).toBeUndefined();
    expect(result.tags).toBeUndefined();
  });

  // modifyBookmarkById tests
  test('modifyBookmarkById: Throws BookmarkNotFoundError when bookmark not found', () => {
    const bookmarks: Bookmark[] = [{ id: 1, title: 'Test', url: 'https://test.com' }];

    expect(() => bookmarkHelperSvc.modifyBookmarkById(999, { title: 'Updated' }, bookmarks)).toThrow();
  });

  test('modifyBookmarkById: Updates bookmark metadata', async () => {
    const bookmarks: Bookmark[] = [
      {
        id: 1,
        title: BookmarkContainer.Menu,
        children: [{ id: 2, title: 'Old Title', url: 'https://old.com' }]
      }
    ];

    const result = await bookmarkHelperSvc.modifyBookmarkById(
      2,
      { title: 'New Title', url: 'https://new.com' },
      bookmarks
    );

    const modified = bookmarkHelperSvc.findBookmarkById(2, result) as Bookmark;
    expect(modified.title).toBe('New Title');
  });

  // removeBookmarkById tests
  test('removeBookmarkById: Removes bookmark from children', async () => {
    const bookmarks: Bookmark[] = [
      {
        id: 1,
        title: BookmarkContainer.Menu,
        children: [
          { id: 2, title: 'Keep', url: 'https://keep.com' },
          { id: 3, title: 'Remove', url: 'https://remove.com' }
        ]
      }
    ];

    const result = await bookmarkHelperSvc.removeBookmarkById(3, bookmarks);

    expect(result[0].children.length).toBe(1);
    expect(result[0].children[0].title).toBe('Keep');
  });

  // searchBookmarksForLookaheads tests
  test('searchBookmarksForLookaheads: Returns matching words starting with input', () => {
    mockUtilitySvc.splitTextIntoWords.mockReturnValue(['javascript', 'java', 'python']);

    const bookmarks: Bookmark[] = [
      { id: 1, title: 'JavaScript Tutorial', url: 'https://js.com', tags: ['javascript'] }
    ];

    const results = bookmarkHelperSvc.searchBookmarksForLookaheads('jav', 'en', false, bookmarks);

    expect(results).toContain('javascript');
    expect(results).toContain('java');
    expect(results).not.toContain('python');
  });
});
