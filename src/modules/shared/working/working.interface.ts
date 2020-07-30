import { WorkingContext } from './working.enum';

export interface WorkingStatus {
  activated: boolean;
  context?: WorkingContext;
}
