function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function careersApplicationEmailHtml(input: {
  roleTitle: string;
  fullName: string;
  email: string;
  phone: string;
  message: string;
  applicationId: string;
  adminApplicationsUrl: string;
}) {
  const messageHtml = escapeHtml(input.message).replace(/\n/g, '<br />');
  return `<!DOCTYPE html>
<html>
  <body style="font-family:system-ui,-apple-system,sans-serif;line-height:1.5;color:#14221f;max-width:560px;">
    <p style="margin:0 0 8px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#6b7280;">New careers application</p>
    <h1 style="margin:0 0 16px;font-size:20px;">${escapeHtml(input.roleTitle)}</h1>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr><td style="padding:4px 0;color:#6b7280;width:88px;">Name</td><td style="padding:4px 0;font-weight:600;">${escapeHtml(input.fullName)}</td></tr>
      <tr><td style="padding:4px 0;color:#6b7280;">Email</td><td style="padding:4px 0;"><a href="mailto:${escapeHtml(input.email)}">${escapeHtml(input.email)}</a></td></tr>
      <tr><td style="padding:4px 0;color:#6b7280;">Phone</td><td style="padding:4px 0;"><a href="tel:${escapeHtml(input.phone)}">${escapeHtml(input.phone)}</a></td></tr>
    </table>
    <p style="margin:20px 0 8px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#6b7280;">Message</p>
    <p style="margin:0;padding:12px 14px;background:#f4f7f6;border-radius:10px;font-size:14px;">${messageHtml}</p>
    <p style="margin:24px 0 0;">
      <a href="${escapeHtml(input.adminApplicationsUrl)}" style="display:inline-block;padding:10px 18px;background:#1f4a3f;color:#fff;font-weight:700;text-decoration:none;border-radius:999px;font-size:14px;">View applications in admin</a>
    </p>
    <p style="margin:16px 0 0;font-size:11px;color:#9ca3af;">Application ID: ${escapeHtml(input.applicationId)}</p>
  </body>
</html>`;
}