import { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { LedgerEvent } from '../api/types';
import { formatNaira } from '../utils/currency';
import { capitalise, relativeTime } from '../utils/format';
import { Colors, radius, spacing } from '../theme';
import { makeStyles, useTheme } from '../theming';

type Icon = ComponentProps<typeof Ionicons>['name'];
type Tone = 'in' | 'out' | 'neutral' | 'warning';

interface Described {
  icon: Icon;
  title: string;
  detail?: string;
  amount?: string;
  tone: Tone;
}

const FIELD: Record<string, string> = {
  name: 'name',
  sku: 'SKU',
  barcode: 'barcode',
  costPrice: 'cost',
  sellingPrice: 'price',
  lowStockThreshold: 'low-stock level',
  phone: 'phone',
  category: 'category',
  amount: 'amount',
  description: 'note',
};

function describeChanges(changes?: Record<string, { from: unknown; to: unknown }>): string | undefined {
  if (!changes) return undefined;
  return Object.entries(changes)
    .map(([k, v]) => {
      const money = ['costPrice', 'sellingPrice', 'amount'].includes(k);
      const fmt = (x: unknown) => (x === null || x === undefined || x === '' ? '—' : money ? formatNaira(Number(x)) : String(x));
      return `${FIELD[k] ?? k}: ${fmt(v.from)} → ${fmt(v.to)}`;
    })
    .join(' · ');
}

/** Turns one ledger event into a human sentence. Every event type the backend writes has a case here. */
export function describeEvent(e: LedgerEvent): Described {
  const m = (e.metadata ?? {}) as Record<string, any>;
  const amt = e.amount != null ? formatNaira(Number(e.amount)) : undefined;
  switch (e.type) {
    case 'SALE_CREATED':
      return { icon: 'receipt-outline', title: 'Sale recorded', detail: `${m.itemCount ?? ''} item${m.itemCount === 1 ? '' : 's'}`, amount: amt, tone: 'in' };
    case 'PAYMENT_RECEIVED':
      return { icon: 'cash-outline', title: 'Payment received', detail: m.method ? capitalise(String(m.method)) : undefined, amount: amt, tone: 'in' };
    case 'CUSTOMER_CREDIT_CREATED':
      return { icon: 'time-outline', title: 'Sold on credit', detail: 'Added to customer balance', amount: amt, tone: 'warning' };
    case 'CUSTOMER_CREDIT_REPAID':
      return { icon: 'checkmark-done-outline', title: 'Debt repaid', detail: m.channel ? capitalise(String(m.channel).replace('_', ' ')) : undefined, amount: amt, tone: 'in' };
    case 'INVENTORY_DECREASED':
      return { icon: 'cube-outline', title: `${m.quantity} × ${m.name ?? 'product'} sold`, detail: m.remainingStock != null ? `${m.remainingStock} left` : undefined, tone: 'neutral' };
    case 'INVENTORY_ADJUSTED':
      return {
        icon: 'swap-vertical-outline',
        title: `Stock ${Number(m.delta) >= 0 ? 'added' : 'removed'}: ${m.name ?? 'product'}`,
        detail: `${m.from} → ${m.to}${m.reason ? ` · ${m.reason}` : ''}`,
        amount: `${Number(m.delta) > 0 ? '+' : ''}${m.delta}`,
        tone: 'neutral',
      };
    case 'EXPENSE_CREATED':
      return { icon: 'wallet-outline', title: `Expense: ${capitalise(String(m.category ?? ''))}`, detail: m.description ?? undefined, amount: amt, tone: 'out' };
    case 'EXPENSE_UPDATED':
      return { icon: 'create-outline', title: 'Expense edited', detail: describeChanges(m.changes), tone: 'neutral' };
    case 'EXPENSE_DELETED':
      return { icon: 'trash-outline', title: 'Expense deleted', detail: capitalise(String(m.category ?? '')), amount: amt, tone: 'neutral' };
    case 'PRODUCT_CREATED':
      return { icon: 'add-circle-outline', title: `Product added: ${m.name ?? ''}`, detail: m.stockQty != null ? `${m.stockQty} in stock` : undefined, tone: 'neutral' };
    case 'PRODUCT_UPDATED':
      if (m.image) {
        return { icon: 'image-outline', title: `Photo ${m.image}`, detail: m.name, tone: 'neutral' };
      }
      return { icon: 'create-outline', title: `Product edited: ${m.name ?? ''}`, detail: describeChanges(m.changes), tone: 'neutral' };
    case 'PRODUCT_DELETED':
      return { icon: 'trash-outline', title: `Product deleted: ${m.name ?? ''}`, tone: 'neutral' };
    case 'CUSTOMER_CREATED':
      return { icon: 'person-add-outline', title: `Customer added: ${m.name ?? ''}`, tone: 'neutral' };
    case 'CUSTOMER_UPDATED':
      return { icon: 'create-outline', title: `Customer edited: ${m.name ?? ''}`, detail: describeChanges(m.changes), tone: 'neutral' };
    case 'CUSTOMER_DELETED':
      return { icon: 'person-remove-outline', title: `Customer removed: ${m.name ?? ''}`, tone: 'neutral' };
    default:
      return { icon: 'ellipse-outline', title: String(e.type).toLowerCase().replace(/_/g, ' '), tone: 'neutral' };
  }
}

// Money in = green, out = red, owed / attention = gold; each event also has its own icon.
const toneColor: Record<Tone, keyof Colors> = { in: 'primary', out: 'danger', neutral: 'text', warning: 'goldDeep' };
const toneBg: Record<Tone, keyof Colors> = { in: 'primaryMuted', out: 'dangerMuted', neutral: 'surfaceAlt', warning: 'goldMuted' };

interface Props {
  event: LedgerEvent;
  /** Resolves the acting user's id to a display name (owner can see the team list). */
  actorName?: (id: string) => string | undefined;
  last?: boolean;
}

export function ActivityItem({ event, actorName, last }: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  const d = describeEvent(event);
  const who = event.metadata?.actorId ? actorName?.(String(event.metadata.actorId)) : undefined;
  const meta = [relativeTime(event.createdAt), who].filter(Boolean).join(' · ');
  return (
    <View style={[styles.row, !last && styles.separator]} accessible accessibilityLabel={`${d.title}. ${d.detail ?? ''} ${d.amount ?? ''}. ${meta}`}>
      <View style={[styles.icon, { backgroundColor: colors[toneBg[d.tone]] }]}>
        <Ionicons name={d.icon} size={18} color={colors[toneColor[d.tone]]} />
      </View>
      <View style={styles.text}>
        <AppText variant="bodyStrong" numberOfLines={2}>
          {d.title}
        </AppText>
        {d.detail ? (
          <AppText variant="caption" tone="muted" numberOfLines={2}>
            {d.detail}
          </AppText>
        ) : null}
        <AppText variant="caption" tone="subtle">
          {meta}
        </AppText>
      </View>
      {d.amount ? (
        <AppText variant="bodyStrong" style={{ color: colors[toneColor[d.tone]] }}>
          {d.tone === 'out' ? `−${d.amount}` : d.amount}
        </AppText>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm + 4, paddingVertical: spacing.sm + 2 },
  separator: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  icon: { width: 36, height: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
}));
