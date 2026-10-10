import { Alert, Linking } from 'react-native';
import { formatNaira } from './currency';
import { Sale } from '../api/types';

/**
 * Turns a Nigerian phone number as people actually type it (0805 285 5880,
 * +234 805..., 234805...) into the digits-only international form WhatsApp
 * links need. Returns undefined when it doesn't look like a usable number.
 */
export function normalizeNgPhone(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('234')) digits = digits.slice(3);
  else if (digits.startsWith('0')) digits = digits.slice(1);
  return digits.length === 10 ? `234${digits}` : undefined;
}

export function buildReceiptText(businessName: string, sale: Sale): string {
  const lines = sale.items.map((i) => `• ${i.quantity} x ${i.productName} — ${formatNaira(i.lineTotal)}`);
  const parts = [`*${businessName}* — receipt`, ...lines, '', `Total: ${formatNaira(sale.totalAmount)}`];
  if (sale.amountPaid > 0) parts.push(`Paid: ${formatNaira(sale.amountPaid)}`);
  if (sale.outstandingBalance > 0) parts.push(`Balance owed: ${formatNaira(sale.outstandingBalance)}`);
  parts.push('', 'Thank you for your business!');
  return parts.join('\n');
}

export function buildDebtReminderText(businessName: string, customerName: string, balance: number): string {
  return (
    `Hello ${customerName}, this is a friendly reminder from ${businessName}. ` +
    `You have an outstanding balance of ${formatNaira(balance)}. ` +
    `Please let us know when you can settle it. Thank you!`
  );
}

/** Opens WhatsApp with the message prefilled. Without a valid phone, WhatsApp lets the user pick a contact. */
export async function openWhatsApp(text: string, phone?: string | null): Promise<void> {
  const normalized = normalizeNgPhone(phone);
  const query = `text=${encodeURIComponent(text)}`;
  const appUrl = normalized ? `whatsapp://send?phone=${normalized}&${query}` : `whatsapp://send?${query}`;
  const webUrl = normalized ? `https://wa.me/${normalized}?${query}` : `https://wa.me/?${query}`;
  try {
    await Linking.openURL(appUrl);
  } catch {
    try {
      await Linking.openURL(webUrl);
    } catch {
      Alert.alert('Could not open WhatsApp', 'Make sure WhatsApp is installed on this phone.');
    }
  }
}
