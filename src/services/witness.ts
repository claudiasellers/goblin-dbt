/** Witness voice callables (A5-2). The beat (A5-3) serves through getWitnessLines and logs through recordWitnessBeat. */
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
import type {
  GetWitnessLinesRequest, GetWitnessLinesResponse, RecordWitnessBeatRequest, RecordWitnessBeatResponse,
} from '../data/witnessTypes';

const getFn = httpsCallable<GetWitnessLinesRequest, GetWitnessLinesResponse>(functions, 'getWitnessLines', { timeout: 15_000 });
const recordFn = httpsCallable<RecordWitnessBeatRequest, RecordWitnessBeatResponse>(functions, 'recordWitnessBeat', { timeout: 20_000 });

export async function getWitnessLines(req: GetWitnessLinesRequest): Promise<GetWitnessLinesResponse> {
  return (await getFn(req)).data;
}

export async function recordWitnessBeat(req: RecordWitnessBeatRequest): Promise<RecordWitnessBeatResponse> {
  return (await recordFn(req)).data;
}
