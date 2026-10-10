/**
 * The Privacy Policy and Terms of Service, served as public web pages at
 * /legal/privacy and /legal/terms (app stores need public URLs) and linked
 * from the app.
 *
 * DRAFT: written to describe what BizLedger actually does today, but it must
 * be reviewed by a qualified Nigerian lawyer before real merchants rely on
 * it. Until LEGAL_REVIEWED=true is set, both pages carry a draft banner.
 * Bump TERMS_VERSION whenever the substance changes; new sign-ups record it.
 */
export const TERMS_VERSION = '2026-10-09';
export const LAST_UPDATED = '9 October 2026';

export interface LegalDetails {
  entityName: string | null;
  address: string | null;
  email: string | null;
  reviewed: boolean;
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fill = (value: string | null, placeholder: string) =>
  value ? esc(value) : `<span class="ph">[${esc(placeholder)}]</span>`;

function page(title: string, d: LegalDetails, body: string) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} · BizLedger</title>
<style>
  :root { color-scheme: light; }
  body { margin: 0; background: #F5F7FA; color: #12181F; font: 16px/1.6 -apple-system, "Segoe UI", Roboto, Arial, sans-serif; }
  main { max-width: 760px; margin: 0 auto; padding: 32px 20px 64px; }
  h1 { font-size: 28px; line-height: 1.2; margin: 0 0 4px; }
  h2 { font-size: 19px; margin: 32px 0 8px; }
  p, li { color: #2A333D; }
  ul { padding-left: 22px; }
  .brand { color: #0F7A4B; font-weight: 700; letter-spacing: 1px; font-size: 14px; }
  .meta { color: #5E6978; font-size: 14px; margin: 0 0 24px; }
  .draft { background: #FCF3E3; border-left: 4px solid #8F5E12; padding: 12px 16px; border-radius: 6px; color: #5A3B0B; }
  .ph { background: #FCF3E3; color: #5A3B0B; padding: 0 3px; border-radius: 3px; }
  a { color: #0F7A4B; }
</style>
</head>
<body><main>
<div class="brand">BIZLEDGER</div>
<h1>${esc(title)}</h1>
<p class="meta">Last updated ${LAST_UPDATED} · Version ${TERMS_VERSION}</p>
${d.reviewed ? '' : '<p class="draft"><strong>Draft.</strong> This document is pending review by a qualified Nigerian lawyer and may change before BizLedger is offered generally. Text in highlighted brackets will be completed before then.</p>'}
${body}
<h2>Contact</h2>
<p>${fill(d.entityName, 'Legal name of the company operating BizLedger')}, ${fill(d.address, 'registered address')}. Email: ${
    d.email ? `<a href="mailto:${esc(d.email)}">${esc(d.email)}</a>` : fill(null, 'privacy and support email')
  }.</p>
</main></body></html>`;
}

export function privacyPolicyHtml(d: LegalDetails) {
  const us = fill(d.entityName, 'Company name');
  return page(
    'Privacy Policy',
    d,
    `
<p>BizLedger is a business record-keeping app for small businesses in Nigeria. This policy explains what information we collect, why, who we share it with and the choices you have. It is written with the Nigeria Data Protection Act 2023 (NDPA) in mind.</p>

<h2>1. Who is responsible for your information</h2>
<p>${us} operates BizLedger and is the data controller for information about you as an account holder. When you record information about <em>your</em> customers, suppliers or staff in BizLedger, your business decides why and how that information is used; we process it on your behalf to provide the service.</p>

<h2>2. Information we collect</h2>
<ul>
  <li><strong>Account details:</strong> business name, your name, email address, phone number (optional), your password (stored only as a one-way hash, never in readable form), and records of when you confirmed you are 18 or older and accepted these terms.</li>
  <li><strong>Business records you enter:</strong> products, prices, costs, stock levels and product photos you choose to add; sales, payment methods, transfer channels and references; expenses; branches; and staff accounts you create.</li>
  <li><strong>Information about your customers:</strong> names, phone numbers, purchases, amounts owed and repayments that you record.</li>
  <li><strong>Technical information:</strong> the app version and device type, and IP addresses in our server logs, used for security, rate limiting and troubleshooting.</li>
</ul>
<p>BizLedger does not collect your location, your phone contacts, your BVN or NIN, or card details. The camera is used only when you scan a barcode or take a product photo, and only the photos you choose to save are uploaded.</p>

<h2>3. How we use it, and our lawful basis</h2>
<ul>
  <li><strong>To provide the service</strong> you signed up for: storing your records, calculating your dashboard, reports and insights, and letting your staff work under the permissions you set (performance of a contract).</li>
  <li><strong>To keep accounts and data safe:</strong> sign-in protection, rate limiting, fraud prevention, audit trails and backups (our legitimate interests and legal obligations).</li>
  <li><strong>To contact you about your account,</strong> for example sending a password reset code or telling you about important changes (performance of a contract).</li>
  <li><strong>To improve BizLedger</strong> using aggregated usage statistics, such as how many businesses record sales each week (legitimate interests). We do not sell your information or use it for third-party advertising.</li>
  <li><strong>With your consent,</strong> for optional features. In future this may include sharing a business profile with a financing partner; that will only ever happen if you approve a specific request, and you can withdraw consent at any time.</li>
</ul>

<h2>4. Who we share it with</h2>
<ul>
  <li><strong>Service providers</strong> who host and run BizLedger on our behalf under contract: our application host (Render), our database provider (Supabase) and our email delivery provider. They may only use the information to provide their service to us.</li>
  <li><strong>WhatsApp,</strong> only when you choose to send a receipt or reminder: BizLedger opens WhatsApp with the message filled in and you decide whether to send it. WhatsApp's own terms and privacy policy apply to that message.</li>
  <li><strong>Authorities,</strong> when the law requires it or to protect the rights, property or safety of our users or others.</li>
</ul>
<p>We never sell personal information.</p>

<h2>5. Transfers outside Nigeria</h2>
<p>Our service providers may store or process information outside Nigeria, ${fill(null, 'hosting regions to be confirmed')}. Where that happens, we rely on the safeguards the NDPA requires for cross-border transfers.</p>

<h2>6. How long we keep it</h2>
<p>We keep your account and business records for as long as your account is open. If you ask us to delete your account, we delete or anonymise it within ${fill(null, 'number')} days, except where the law requires us to keep certain records for longer. Backups are kept for a limited period and expire on a rolling basis.</p>

<h2>7. How we protect it</h2>
<p>Information travels over encrypted connections; passwords are hashed; every business's records are kept separate from every other business's; staff see only what the owner allows; and sign-in attempts are rate-limited. No system is perfectly secure, so if a breach affects your information we will notify you and the Nigeria Data Protection Commission as the law requires.</p>

<h2>8. Your rights</h2>
<p>Under the NDPA you can ask to access the information we hold about you, correct it, delete it, restrict or object to its use, receive a copy in a portable format, and withdraw any consent you have given. Email us using the details below. If you are not satisfied with our response, you can complain to the Nigeria Data Protection Commission.</p>
<p>If you are a customer of a business that uses BizLedger, please contact that business first; we will help them respond.</p>

<h2>9. If you record other people's information</h2>
<p>When you record your customers' or staff members' details, you are responsible for having a lawful reason to do so and for letting them know how you use their information, including messages you send them through WhatsApp.</p>

<h2>10. Age</h2>
<p>BizLedger is for people aged 18 and over. We do not knowingly collect information from anyone younger.</p>

<h2>11. Changes to this policy</h2>
<p>If we make important changes, we will tell you in the app or by email before they take effect. The version and date at the top show which policy applies.</p>
`,
  );
}

export function termsHtml(d: LegalDetails) {
  const us = fill(d.entityName, 'Company name');
  return page(
    'Terms of Service',
    d,
    `
<p>These terms are an agreement between you and ${us} ("we", "us") about your use of BizLedger. By creating an account or using the app, you accept them. Please also read our <a href="/legal/privacy">Privacy Policy</a>.</p>

<h2>1. Who can use BizLedger</h2>
<p>You must be at least 18 years old and able to enter into a binding agreement. If you use BizLedger for a business, you confirm you are authorised to accept these terms for it.</p>

<h2>2. Your account</h2>
<p>Keep your sign-in details secret and tell us promptly if you think someone else has used your account. You are responsible for activity under your account, including the staff accounts you create and the permissions you give them. Keep your details accurate.</p>

<h2>3. What BizLedger does, and doesn't do</h2>
<p>BizLedger helps you record and understand your sales, stock, expenses and customer debts. We improve it over time, so features may change; we will tell you before removing anything important.</p>
<p>BizLedger is a record-keeping and business-information tool. It is <strong>not</strong> financial, accounting, tax or legal advice, and figures, insights and estimates depend on the records entered, so check them before relying on them for important decisions. BizLedger does not hold money, make or receive payments, or lend money. If financing options are offered in future, they will come from independent licensed providers, who alone decide whether to offer financing and on what terms.</p>

<h2>4. Your data</h2>
<p>Your business records belong to you. You allow us to store and process them only as needed to provide BizLedger to you, as described in the Privacy Policy. You can ask for a copy of your records or for your account to be deleted at any time.</p>

<h2>5. Information about other people</h2>
<p>You are responsible for having the right to record information about your customers, suppliers and staff, and for how you use it, including messages you send through WhatsApp from BizLedger.</p>

<h2>6. Acceptable use</h2>
<p>Do not use BizLedger to break the law, commit fraud or launder money; to access another business's data or our systems without permission; to interfere with or overload the service; to upload harmful code or unlawful content; or to copy, resell or reverse-engineer the app except where the law allows.</p>

<h2>7. Fees</h2>
<p>BizLedger is currently free. If we introduce paid plans, we will tell you the price and what is included in advance, and you will not be charged unless you choose a paid plan.</p>

<h2>8. Availability</h2>
<p>We work to keep BizLedger available and your records safe, but we cannot promise it will always be uninterrupted or error-free, particularly during pilot periods. We may pause the service for maintenance or security reasons.</p>

<h2>9. Third-party services</h2>
<p>Some features rely on services we do not control, such as WhatsApp and app stores. Their own terms apply to your use of them.</p>

<h2>10. Our rights</h2>
<p>We own BizLedger, its software and its brand. These terms give you a personal, non-transferable right to use it; they do not transfer ownership of anything to you.</p>

<h2>11. Ending the agreement</h2>
<p>You can stop using BizLedger at any time and ask us to delete your account. We may suspend or close an account that breaks these terms or puts other users or the service at risk; where reasonable we will tell you first and give you a chance to export your records.</p>

<h2>12. Liability</h2>
<p>To the extent permitted by Nigerian law, BizLedger is provided "as is", and we are not liable for indirect or consequential losses, such as lost profits, or for losses caused by inaccurate records entered into the app. Our total liability to you is limited to the fees you paid us in the 12 months before the claim or ${fill(null, 'a fixed amount in naira')}, whichever is greater. Nothing in these terms limits liability that the law does not allow to be limited.</p>

<h2>13. Governing law and disputes</h2>
<p>These terms are governed by the laws of the Federal Republic of Nigeria. If a dispute arises, please contact us first so we can try to resolve it; otherwise, the courts of ${fill(null, 'State')} will have jurisdiction.</p>

<h2>14. Changes to these terms</h2>
<p>If we make important changes, we will tell you in the app or by email before they take effect. If you keep using BizLedger after that, the new terms apply.</p>
`,
  );
}
