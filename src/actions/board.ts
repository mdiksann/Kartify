'use server';
import {
  readTaskDetails,
  readComments,
  readActivities,
} from '@/lib/board-queries';
import { actionFailure } from '@/lib/action-result';
export async function getTaskDetails(input: unknown) {
  try {
    return { ok: true as const, data: await readTaskDetails(input) };
  } catch (error) {
    return actionFailure(error, '/w/board/task');
  }
}
export async function listComments(input: unknown) {
  try {
    return { ok: true as const, data: await readComments(input) };
  } catch (error) {
    return actionFailure(error, '/w/board/comments');
  }
}
export async function listActivities(input: unknown) {
  try {
    return { ok: true as const, data: await readActivities(input) };
  } catch (error) {
    return actionFailure(error, '/w/board/activity');
  }
}
