import { ApiServiceStatus } from '../api.enum';
import { ApiServiceInfoResponse } from '../api.interface';

export interface XbrowsersyncApiErrorResponse {
  code: string;
  message: string;
}

export interface XbrowsersyncApiServiceInfoResponse extends ApiServiceInfoResponse {
  maxSyncSize: number;
  message?: string;
  status: ApiServiceStatus;
  version: string;
}
