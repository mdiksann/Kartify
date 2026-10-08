import { z } from 'zod';
import { emailSchema } from './auth';
import { workspaceTargetSchema, zId, roles } from './workspace';
const editableRole = z.enum(roles).exclude(['OWNER']);
export const addMemberSchema = workspaceTargetSchema.extend({
  email: emailSchema,
  role: editableRole,
});
export const memberTargetSchema = workspaceTargetSchema.extend({
  memberId: zId,
});
export const changeRoleSchema = memberTargetSchema.extend({
  role: editableRole,
});
