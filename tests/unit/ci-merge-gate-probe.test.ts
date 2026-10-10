import { expect, it } from 'vitest';

it('intentionally fails to verify the required CI merge gate', () => {
  expect(true).toBe(false);
});
