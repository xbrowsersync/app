import { WorkingContext } from './working.enum';
import { WorkingService } from './working.service';

describe('WorkingService', () => {
  afterEach(() => jest.restoreAllMocks());

  test('constructor: Initializes status as not activated', () => {
    const workingSvc = new WorkingService();

    expect(workingSvc.status).toStrictEqual({ activated: false });
  });

  test('hide: Sets status to not activated', () => {
    const workingSvc = new WorkingService();
    workingSvc.status = { activated: true, context: WorkingContext.Syncing };

    workingSvc.hide();

    expect(workingSvc.status).toStrictEqual({ activated: false });
  });

  test('show: Sets status to activated without context', () => {
    const workingSvc = new WorkingService();

    workingSvc.show();

    expect(workingSvc.status).toStrictEqual({ activated: true, context: undefined });
  });

  test('show: Sets status to activated with context', () => {
    const workingSvc = new WorkingService();

    workingSvc.show(WorkingContext.Syncing);

    expect(workingSvc.status).toStrictEqual({ activated: true, context: WorkingContext.Syncing });
  });

  test('show: Sets status to activated with Restoring context', () => {
    const workingSvc = new WorkingService();

    workingSvc.show(WorkingContext.Restoring);

    expect(workingSvc.status).toStrictEqual({ activated: true, context: WorkingContext.Restoring });
  });
});
