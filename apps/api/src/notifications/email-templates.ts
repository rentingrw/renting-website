const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://renting.rw';

const TEAL = '#0d9488';
const DARK = '#111827';
const MUTED = '#6b7280';
const BG = '#f9fafb';
const WHITE = '#ffffff';

function layout(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:${BG};font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:${WHITE};border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:${DARK};padding:24px 32px;">
              <span style="color:${WHITE};font-size:22px;font-weight:700;letter-spacing:-0.5px;">
                renting.rw
              </span>
              <span style="color:${TEAL};font-size:11px;font-weight:500;margin-left:8px;letter-spacing:1px;text-transform:uppercase;">
                by CARIRWA
              </span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              ${bodyHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:${BG};padding:20px 32px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:12px;color:${MUTED};text-align:center;">
                &copy; ${new Date().getFullYear()} renting.rw &mdash; A property of <strong>CARIRWA</strong>. All rights reserved.<br/>
                <a href="${BASE_URL}" style="color:${TEAL};text-decoration:none;">renting.rw</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function button(text: string, href: string): string {
  return `<a href="${href}" style="display:inline-block;background:${TEAL};color:${WHITE};font-size:14px;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:8px;margin-top:16px;">${text}</a>`;
}

function heading(text: string): string {
  return `<h2 style="margin:0 0 12px;font-size:20px;font-weight:700;color:${DARK};">${text}</h2>`;
}

function paragraph(text: string): string {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${DARK};">${text}</p>`;
}

function muted(text: string): string {
  return `<p style="margin:0;font-size:13px;color:${MUTED};line-height:1.5;">${text}</p>`;
}

function infoBox(label: string, value: string): string {
  return `
  <tr>
    <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;">
      <span style="font-size:13px;color:${MUTED};">${label}</span>
    </td>
    <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;text-align:right;">
      <span style="font-size:13px;font-weight:600;color:${DARK};">${value}</span>
    </td>
  </tr>`;
}

// ─── Template functions ────────────────────────────────────────────────────────

export function welcomeEmailHtml(fullName: string): string {
  const body = `
    ${heading(`Welcome to renting.rw, ${fullName}!`)}
    ${paragraph('We\'re glad you\'re here. renting.rw is Rwanda\'s premium marketplace for car rentals and professional drivers — built for trust, speed, and convenience.')}
    ${paragraph('Here\'s what you can do:')}
    <ul style="margin:0 0 20px;padding-left:20px;font-size:15px;line-height:1.8;color:${DARK};">
      <li>Browse and book verified cars</li>
      <li>Hire professional drivers for city, airport, tours, and more</li>
      <li>List your car and earn</li>
      <li>Register as a driver and grow your clientele</li>
    </ul>
    ${button('Start Exploring', BASE_URL)}
    <br/><br/>
    ${muted('If you have questions, reply to this email or visit our support centre.')}
  `;
  return layout('Welcome to renting.rw', body);
}

export function subscriptionActivatedEmailHtml(fullName: string, tier: string, renewsAt: Date | null): string {
  const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1);
  const renewDate = renewsAt ? renewsAt.toLocaleDateString('en-RW', { dateStyle: 'long' }) : 'N/A';
  const body = `
    ${heading('Subscription Activated')}
    ${paragraph(`Hi ${fullName}, your <strong>${tierLabel}</strong> subscription is now active. Your listings are live and ready to receive bookings.`)}
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tbody>
        ${infoBox('Plan', tierLabel)}
        ${infoBox('Status', 'Active')}
        ${infoBox('Renews on', renewDate)}
      </tbody>
    </table>
    ${button('Go to Dashboard', `${BASE_URL}/app`)}
    <br/><br/>
    ${muted('To manage your subscription, visit your dashboard settings.')}
  `;
  return layout('Subscription Activated — renting.rw', body);
}

export function subscriptionPaymentConfirmedEmailHtml(fullName: string, tier: string, renewsAt: Date | null, reference: string): string {
  const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1);
  const renewDate = renewsAt ? renewsAt.toLocaleDateString('en-RW', { dateStyle: 'long' }) : 'N/A';
  const body = `
    ${heading('Payment Confirmed')}
    ${paragraph(`Hi ${fullName}, your payment was received and your <strong>${tierLabel}</strong> subscription is now active.`)}
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tbody>
        ${infoBox('Plan', tierLabel)}
        ${infoBox('Status', 'Active')}
        ${infoBox('Renews on', renewDate)}
        ${infoBox('Reference', reference)}
      </tbody>
    </table>
    ${button('View My Listings', `${BASE_URL}/app`)}
    <br/><br/>
    ${muted('Keep this email for your records. Contact support if you have any questions about this payment.')}
  `;
  return layout('Payment Confirmed — renting.rw', body);
}

export function subscriptionRenewalReminderEmailHtml(fullName: string, tier: string, renewDate: string): string {
  const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1);
  const body = `
    ${heading('Subscription Renewal Reminder')}
    ${paragraph(`Hi ${fullName}, your <strong>${tierLabel}</strong> subscription is set to renew on <strong>${renewDate}</strong>.`)}
    ${paragraph('Please ensure your mobile money wallet is funded to avoid any interruption to your listings.')}
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tbody>
        ${infoBox('Plan', tierLabel)}
        ${infoBox('Renewal date', renewDate)}
      </tbody>
    </table>
    ${button('Manage Subscription', `${BASE_URL}/app`)}
    <br/><br/>
    ${muted('If you no longer want to renew, you can cancel your subscription from your dashboard before the renewal date.')}
  `;
  return layout('Renewal Reminder — renting.rw', body);
}

export function subscriptionExpiredEmailHtml(fullName: string, tier: string): string {
  const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1);
  const body = `
    ${heading('Subscription Expired')}
    ${paragraph(`Hi ${fullName}, your <strong>${tierLabel}</strong> subscription has expired and your active listings have been paused.`)}
    ${paragraph('Renew your subscription to reactivate your listings and continue receiving bookings.')}
    ${button('Renew Now', `${BASE_URL}/app`)}
    <br/><br/>
    ${muted('Your listing data is safe. Renewing will restore all paused listings automatically.')}
  `;
  return layout('Subscription Expired — renting.rw', body);
}

export function disputeOpenedEmailHtml(fullName: string): string {
  const body = `
    ${heading('A Dispute Has Been Opened')}
    ${paragraph(`Hi ${fullName}, a dispute has been opened for one of your bookings.`)}
    ${paragraph('Our support team will review the case and may reach out to both parties for additional information. Please be ready to provide any evidence or context.')}
    ${button('View Dispute', `${BASE_URL}/app`)}
    <br/><br/>
    ${muted('We aim to resolve disputes within 3–5 business days. Thank you for your patience.')}
  `;
  return layout('Dispute Opened — renting.rw', body);
}

export function disputeResolvedEmailHtml(fullName: string): string {
  const body = `
    ${heading('Your Dispute Has Been Resolved')}
    ${paragraph(`Hi ${fullName}, the dispute for your booking has been reviewed and resolved by our support team.`)}
    ${paragraph('Please check your booking details for the final outcome and any applicable adjustments.')}
    ${button('View Booking', `${BASE_URL}/app`)}
    <br/><br/>
    ${muted('If you have concerns about this decision, please contact our support team within 48 hours.')}
  `;
  return layout('Dispute Resolved — renting.rw', body);
}

export function bookingRequestEmailHtml(
  ownerName: string,
  renterName: string,
  carTitle: string,
  startDate: Date,
  endDate: Date,
): string {
  const fmt = (d: Date) => d.toLocaleDateString('en-RW', { dateStyle: 'long' });
  const body = `
    ${heading(`New Booking Request`)}
    ${paragraph(`Hi ${ownerName}, <strong>${renterName}</strong> has sent a booking request for your listing.`)}
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tbody>
        ${infoBox('Car', carTitle)}
        ${infoBox('From', fmt(startDate))}
        ${infoBox('To', fmt(endDate))}
      </tbody>
    </table>
    ${paragraph('Please confirm or decline the request within 1 hour to avoid auto-cancellation.')}
    ${button('Review Request', `${BASE_URL}/app`)}
    <br/><br/>
    ${muted('Responding quickly improves your trust score and listing visibility.')}
  `;
  return layout('New Booking Request — renting.rw', body);
}

export function bookingConfirmedEmailHtml(
  renterName: string,
  carTitle: string,
  startDate: Date,
  endDate: Date,
): string {
  const fmt = (d: Date) => d.toLocaleDateString('en-RW', { dateStyle: 'long' });
  const body = `
    ${heading('Booking Confirmed!')}
    ${paragraph(`Hi ${renterName}, your booking has been confirmed by the car owner.`)}
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tbody>
        ${infoBox('Car', carTitle)}
        ${infoBox('From', fmt(startDate))}
        ${infoBox('To', fmt(endDate))}
      </tbody>
    </table>
    ${paragraph('Coordinate pickup details with the owner through the in-app chat.')}
    ${button('View Booking', `${BASE_URL}/app`)}
  `;
  return layout('Booking Confirmed — renting.rw', body);
}

export function bookingDeclinedEmailHtml(renterName: string, carTitle: string): string {
  const body = `
    ${heading('Booking Request Declined')}
    ${paragraph(`Hi ${renterName}, your booking request for <strong>${carTitle}</strong> was declined by the owner.`)}
    ${paragraph('Don\'t worry — there are many other great options available.')}
    ${button('Browse More Cars', `${BASE_URL}/cars`)}
    <br/><br/>
    ${muted('If you have any concerns, please contact our support team.')}
  `;
  return layout('Booking Declined — renting.rw', body);
}

export function bookingSubmittedEmailHtml(
  renterName: string,
  title: string,
  startDate: Date,
  endDate: Date,
): string {
  const fmt = (d: Date) => d.toLocaleDateString('en-RW', { dateStyle: 'long' });
  const body = `
    ${heading('Booking Request Submitted!')}
    ${paragraph(`Hi ${renterName}, your booking request has been sent and is waiting for the owner to confirm.`)}
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tbody>
        ${infoBox('Listing', title)}
        ${infoBox('From', fmt(startDate))}
        ${infoBox('To', fmt(endDate))}
      </tbody>
    </table>
    ${paragraph("You'll receive another email once the owner confirms or declines. Owners typically respond within 1 hour.")}
    ${button('View My Bookings', `${BASE_URL}/app`)}
    <br/><br/>
    ${muted('If the owner does not respond within 1 hour, your request will be automatically cancelled and you can try another listing.')}
  `;
  return layout('Booking Submitted — renting.rw', body);
}

export function bookingAutoCancelledEmailHtml(name: string, carTitle: string): string {
  const body = `
    ${heading('Booking Auto-Cancelled')}
    ${paragraph(`Hi ${name}, your booking request for <strong>${carTitle}</strong> was automatically cancelled because the owner did not respond within 1 hour.`)}
    ${paragraph('You can browse other available listings and submit a new request.')}
    ${button('Browse Cars', `${BASE_URL}/cars`)}
  `;
  return layout('Booking Auto-Cancelled — renting.rw', body);
}

export function bookingCompletedEmailHtml(name: string, carTitle: string): string {
  const body = `
    ${heading('Booking Completed — Leave a Review')}
    ${paragraph(`Hi ${name}, your booking for <strong>${carTitle}</strong> has been completed.`)}
    ${paragraph('Your review helps build trust for the entire renting.rw community. It takes less than a minute.')}
    ${button('Leave a Review', `${BASE_URL}/app`)}
    <br/><br/>
    ${muted('Reviews contribute to your trust score and help others make informed decisions.')}
  `;
  return layout('Booking Complete — renting.rw', body);
}

export function listingApprovedEmailHtml(ownerName: string, title: string): string {
  const body = `
    ${heading('Your Listing is Live!')}
    ${paragraph(`Hi ${ownerName}, your listing <strong>${title}</strong> has been approved and is now live on renting.rw.`)}
    ${paragraph('Customers can now find and book your car. Make sure your availability calendar is up to date.')}
    ${button('View My Listing', `${BASE_URL}/app`)}
  `;
  return layout('Listing Approved — renting.rw', body);
}

export function listingRejectedEmailHtml(ownerName: string, title: string, reason: string): string {
  const body = `
    ${heading('Listing Not Approved')}
    ${paragraph(`Hi ${ownerName}, your listing <strong>${title}</strong> was not approved by our review team.`)}
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tbody>
        ${infoBox('Reason', reason)}
      </tbody>
    </table>
    ${paragraph('Please update your listing to address the feedback and resubmit for approval.')}
    ${button('Edit My Listing', `${BASE_URL}/app`)}
    <br/><br/>
    ${muted('Contact support if you need help or believe this decision was made in error.')}
  `;
  return layout('Listing Not Approved — renting.rw', body);
}

export function disputeDismissedEmailHtml(fullName: string): string {
  const body = `
    ${heading('Dispute Update')}
    ${paragraph(`Hi ${fullName}, the dispute for your booking was reviewed by our support team and has been dismissed.`)}
    ${paragraph('If you believe this was in error or need further clarification, please contact our support team.')}
    ${button('Contact Support', `${BASE_URL}/app`)}
    <br/><br/>
    ${muted('We appreciate your patience throughout this process.')}
  `;
  return layout('Dispute Update — renting.rw', body);
}
