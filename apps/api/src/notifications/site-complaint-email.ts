function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function adminComplaintsUrl(): string {
  const base = process.env.NEXT_PUBLIC_ADMIN_URL ?? 'http://localhost:3002';
  return `${base.replace(/\/$/, '')}/en/complaints`;
}

export function siteComplaintEmailHtml(input: {
  fullName: string;
  phone: string;
  email?: string | null;
  message: string;
  complaintId: string;
}) {
  const messageHtml = escapeHtml(input.message).replace(/\n/g, '<br />');
  return `<!DOCTYPE html>
<html>
  <body style="font-family:system-ui,-apple-system,sans-serif;line-height:1.5;color:#14221f;max-width:560px;">
    <p style="margin:0 0 8px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#6b7280;">New customer complaint</p>
    <h1 style="margin:0 0 16px;font-size:20px;">${escapeHtml(input.fullName)}</h1>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr><td style="padding:4px 0;color:#6b7280;width:88px;">Phone</td><td style="padding:4px 0;font-weight:600;"><a href="tel:${escapeHtml(input.phone)}">${escapeHtml(input.phone)}</a></td></tr>
      ${
        input.email
          ? `<tr><td style="padding:4px 0;color:#6b7280;">Email</td><td style="padding:4px 0;"><a href="mailto:${escapeHtml(input.email)}">${escapeHtml(input.email)}</a></td></tr>`
          : ''
      }
    </table>
    <p style="margin:20px 0 8px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#6b7280;">Complaint</p>
    <p style="margin:0;padding:12px 14px;background:#f4f7f6;border-radius:10px;font-size:14px;">${messageHtml}</p>
    <p style="margin:24px 0 0;">
      <a href="${escapeHtml(adminComplaintsUrl())}" style="display:inline-block;padding:10px 18px;background:#1f4a3f;color:#fff;font-weight:700;text-decoration:none;border-radius:999px;font-size:14px;">Open complaints desk</a>
    </p>
    <p style="margin:16px 0 0;font-size:11px;color:#9ca3af;">Ref: ${escapeHtml(input.complaintId)}</p>
  </body>
</html>`;
}