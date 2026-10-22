type InviteEmailParams = {
  code: string;
  workspaceName: string;
  role: 'admin' | 'member';
  inviterName?: string;
  expiresInHours: number;
};

export function inviteEmailTemplate({
  code,
  workspaceName,
  role,
  inviterName,
  expiresInHours
}: InviteEmailParams) {
  const subject = `You have been invited to join ${workspaceName} on Clovars`;

  const text = [
    `${inviterName ?? 'A teammate'} invited you to join the workspace "${workspaceName}" on Clovars.`,
    '',
    `Role: ${role}`,
    `Invite code: ${code}`,
    `This code expires in ${expiresInHours} hours.`,
    '',
    'Open Clovars, go to Workspaces and choose "Join with invite code" to accept.'
  ].join('\n');

  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; color: #1f2933;">
      <h2>Join ${workspaceName} on Clovars</h2>
      <p>${inviterName ?? 'A teammate'} invited you to join the workspace <strong>${workspaceName}</strong>.</p>
      <p>Role: <strong>${role}</strong></p>
      <p style="font-size: 20px; letter-spacing: 2px;"><strong>${code}</strong></p>
      <p>This code expires in ${expiresInHours} hours.</p>
      <p>Open Clovars, go to Workspaces and choose "Join with invite code" to accept.</p>
    </div>
  `;

  return {subject, text, html};
}
