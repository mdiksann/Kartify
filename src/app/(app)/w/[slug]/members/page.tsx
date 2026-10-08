import { workspacePageAccess } from '@/lib/workspace-access';
import { db } from '@/lib/db';
import { can } from '@/lib/permissions';
import { utcDate } from '@/lib/task-indicators';
import { AddMember } from '@/components/member/AddMember';
import { MemberControls } from '@/components/member/MemberControls';
export default async function MembersPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { workspace, member: actor } = await workspacePageAccess(slug);
  const members = await db.workspaceMember.findMany({
    where: { workspaceId: workspace.id },
    select: {
      id: true,
      role: true,
      createdAt: true,
      user: { select: { name: true, email: true } },
    },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    take: 100,
  });
  const manage = can(actor.role, 'addMember');
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold">Members</h1>
        <p className="mt-1 text-sm text-gray-500">
          People with access to this workspace.
        </p>
      </header>
      {manage && <AddMember slug={slug} />}
      <div className="relative overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-left text-sm max-md:block">
          <caption className="sr-only">Workspace members and roles</caption>
          <thead className="bg-gray-50 text-xs text-gray-500 max-md:sr-only">
            <tr>
              {['Member', 'Role', 'Joined', ...(manage ? ['Actions'] : [])].map(
                (label) => (
                  <th key={label} scope="col" className="px-4 py-3 font-medium">
                    {label}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody className="max-md:block">
            {members.map((member) => (
              <tr
                key={member.id}
                className="border-t border-gray-100 max-md:block max-md:py-2"
              >
                <td className="px-4 py-3 max-md:block max-md:py-2">
                  <span className="block font-medium">{member.user.name}</span>
                  <span className="break-all text-xs text-gray-500">
                    {member.user.email}
                  </span>
                </td>
                <td className="px-4 py-3 max-md:flex max-md:items-center max-md:gap-3 max-md:py-2">
                  <span className="text-xs text-gray-500 md:hidden">Role</span>
                  <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700">
                    {member.role.charAt(0) + member.role.slice(1).toLowerCase()}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500 max-md:flex max-md:gap-3 max-md:py-2">
                  <span className="md:hidden">Joined</span>
                  <time dateTime={utcDate(member.createdAt)}>
                    {utcDate(member.createdAt)}
                  </time>
                </td>
                {manage && (
                  <td className="px-4 py-3 max-md:block max-md:py-2">
                    {member.role === 'OWNER' ? (
                      <span className="text-xs text-gray-500">
                        Owner cannot be changed
                      </span>
                    ) : (
                      <MemberControls
                        key={`${member.id}-${member.role}`}
                        slug={slug}
                        member={{ ...member, role: member.role }}
                      />
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {members.length === 0 && (
        <p className="py-6 text-center text-sm text-gray-500">
          No members found. Refresh to reload the workspace.
        </p>
      )}
      {members.length === 100 && (
        <p className="text-xs text-gray-500">Showing the first 100 members.</p>
      )}
    </div>
  );
}
