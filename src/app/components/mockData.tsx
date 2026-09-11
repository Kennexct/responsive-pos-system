export type BusinessType = 'retail' | 'fnb';
export type ViewType = 'pos' | 'dashboard' | 'daily-sales' | 'inventory' | 'reports' | 'customers' | 'settings';
export type OrderType = 'dine-in' | 'takeaway' | 'delivery';
export type PaymentMethod = 'cash' | 'qris' | 'card' | 'bank-transfer';

export interface PaymentMethodEntry { id: PaymentMethod; label: string; enabled: boolean; }
export const INITIAL_PAYMENTS: PaymentMethodEntry[] = [
  { id: 'cash',          label: 'Cash',                enabled: true  },
  { id: 'qris',          label: 'QRIS',                enabled: true  },
  { id: 'card',          label: 'Debit / Credit Card', enabled: true  },
  { id: 'bank-transfer', label: 'Bank Transfer',       enabled: true  },
];
export type OrderStatus = 'completed' | 'held' | 'cancelled' | 'refunded' | 'voided';
export type Role = 'owner' | 'manager' | 'cashier';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  pin: string;
  merchantId?: string;
  businessName?: string;
}

export type RolePermissions = Record<Role, ViewType[]>;

export const DEFAULT_PERMISSIONS: RolePermissions = {
  owner: ['pos', 'dashboard', 'daily-sales', 'inventory', 'reports', 'customers', 'settings'],
  manager: ['pos', 'dashboard', 'daily-sales', 'inventory', 'reports', 'customers'],
  cashier: ['pos', 'daily-sales', 'customers'],
};

export const INITIAL_USERS: User[] = [
  { id: '1', name: 'Owner', email: 'owner@vpos.app', role: 'owner', pin: '9999', merchantId: 'm_default' },
];

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  pointsBalance: number;
  totalSpend: number;
  registrationDate: string;
  tierId?: string;
  dateOfBirth?: string;
  marketingConsent?: boolean;
  blacklistFlag?: boolean;
  tags?: string[];
  totalTransactions: number;
  averageTransactionValue: number;
  lastPurchaseDate?: string;
  favoriteCategory?: string;
}

export const INITIAL_CUSTOMERS: Customer[] = [];

export interface LoyaltyTier {
  id: string;
  name: string;
  minSpend: number;
  discountPercent: number;
}

export interface LoyaltySettings {
  enabled: boolean;
  earnRateSpend: number; // e.g. 10000 spend = 1 point
  earnRatePoints: number; // e.g. 1 point
  redemptionValue: number; // e.g. 1 point = 100 rupiah
  tiers: LoyaltyTier[];
}

export const INITIAL_LOYALTY_SETTINGS: LoyaltySettings = {
  enabled: true,
  earnRateSpend: 10000,
  earnRatePoints: 1,
  redemptionValue: 100,
  tiers: [
    { id: 'bronze', name: 'Bronze', minSpend: 0, discountPercent: 0 },
    { id: 'silver', name: 'Silver', minSpend: 1000000, discountPercent: 5 },
    { id: 'gold', name: 'Gold', minSpend: 5000000, discountPercent: 10 },
  ],
};

export interface Category {
  id: string;
  name: string;
  isTaxable: boolean;
  isDiscountable?: boolean;
}

export const CATEGORIES: Category[] = [
  { id: 'cat-all', name: 'All', isTaxable: true, isDiscountable: true },
  { id: 'cat-coffee', name: 'Coffee', isTaxable: true, isDiscountable: true },
  { id: 'cat-tea', name: 'Tea', isTaxable: true, isDiscountable: true },
  { id: 'cat-food', name: 'Food', isTaxable: true, isDiscountable: true },
  { id: 'cat-snacks', name: 'Snacks', isTaxable: true, isDiscountable: true },
  { id: 'cat-dessert', name: 'Dessert', isTaxable: true, isDiscountable: true },
  { id: 'cat-juice', name: 'Juice', isTaxable: true, isDiscountable: true },
  { id: 'cat-others', name: 'Others', isTaxable: true, isDiscountable: false },
];

export interface ProductVariant {
  id: string;
  name: string;
  priceModifier: number;
  sku?: string;
  barcode?: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  costPrice: number;
  category: string;
  stock: number;
  emoji: string;
  image?: string;
  lowStockThreshold: number;
  sku?: string;
  barcode?: string;
  variants?: ProductVariant[];
  trackInventory: boolean;
  allowDiscount: boolean;
}

export interface CartItem {
  id: string;
  product: Product;
  qty: number;
  discount: number;
  itemDiscountNominal?: number;
  itemDiscountPercent?: number;
  variant?: ProductVariant;
}

export interface HeldOrder {
  id: string;
  items: CartItem[];
  orderType: OrderType;
  heldAt: string;
  tableNote?: string;
}

export interface RecentOrder {
  id: string;
  orderNumber: string;
  itemCount: number;
  subtotalBeforeDiscount: number;
  discountTotal: number;
  promoCode?: string;
  subtotal: number;
  tax: number;
  total: number;
  totalCost: number;
  paymentMethod: PaymentMethod;
  splitPaymentMethod?: PaymentMethod;
  splitAmount?: number;
  orderType: OrderType;
  status: OrderStatus;
  createdAt: string;
  cashier: string;
  refundReason?: string;
  items?: CartItem[];
  customerId?: string;
  pointsEarned?: number;
  pointsRedeemed?: number;
  pointsDiscountAmt?: number;
}

export interface PromoCode {
  id: string;
  code: string;
  type: 'nominal' | 'percent';
  value: number;
  active: boolean;
  activeDate?: string;
  expiryDate?: string;
  minSpend?: number;
  categories?: string[];
  cannotCombine?: boolean;
}

export interface DiscountSettings {
  enabled: boolean;
  allowItemDiscount: boolean;
  promoCodes: PromoCode[];
}

export interface RefundSettings {
  managerPinRequired: boolean;
}

export const formatCurrency = (amount: number, currency: string = 'IDR'): string => {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const code = (currency || 'IDR').toUpperCase();

  const localeMap: Record<string, string> = {
    IDR: 'id-ID',
    USD: 'en-US',
    EUR: 'de-DE',
    GBP: 'en-GB',
    SGD: 'en-SG',
    MYR: 'ms-MY',
    JPY: 'ja-JP',
    AUD: 'en-AU',
    CAD: 'en-CA',
    CNY: 'zh-CN',
    THB: 'th-TH',
    PHP: 'en-PH',
    VND: 'vi-VN',
    INR: 'en-IN',
  };

  const locale = localeMap[code] || 'id-ID';
  const zeroDecimalCurrencies = ['IDR', 'JPY', 'VND', 'KRW'];
  const hasZeroDecimals = zeroDecimalCurrencies.includes(code);

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: code,
      minimumFractionDigits: hasZeroDecimals ? 0 : 2,
      maximumFractionDigits: hasZeroDecimals ? 0 : 2,
    }).format(safeAmount);
  } catch {
    const formattedNum = new Intl.NumberFormat('id-ID', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(safeAmount);
    return `${code} ${formattedNum}`;
  }
};

export const formatIDR = (amount: number, currency?: string): string => {
  if (currency && currency !== 'IDR') {
    return formatCurrency(amount, currency);
  }
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(safeAmount);
};

export const formatNumberWithDots = (val: number | string): string => {
  if (val === '' || val === undefined || val === null) return '';
  const clean = String(val).replace(/\D/g, '');
  if (!clean) return '';
  return new Intl.NumberFormat('id-ID').format(Number(clean));
};

export const parseNumberWithDots = (val: string): number => {
  if (!val) return 0;
  const clean = val.replace(/\D/g, '');
  return clean ? Number(clean) : 0;
};

export const formatIndonesianPhone = (val: string): string => {
  if (!val) return '+62 ';
  if (!val.startsWith('+62')) {
    let digits = val.replace(/\D/g, '');
    if (digits.startsWith('0')) digits = digits.slice(1);
    if (digits.startsWith('62')) digits = digits.slice(2);
    return `+62 ${digits}`;
  }
  const rest = val.slice(3).replace(/\D/g, '');
  return `+62 ${rest}`;
};

export interface TaxRule {
  id: string;
  name: string;
  rate: number;
  isInclusive: boolean;
  order: number;
}

export type TerminalViewMode = 'grid' | 'scanner';

export const INITIAL_TAX_RULES: TaxRule[] = [
  { id: 'tax-pb1', name: 'PB1 / PPN', rate: 11, isInclusive: false, order: 2 }
];

export const PRODUCTS: Product[] = [];

export const RECENT_ORDERS: RecentOrder[] = [];

export const WEEKLY_SALES: { day: string; sales: number }[] = [];

export const TOP_PRODUCTS: { name: string; sold: number; revenue: number }[] = [];

export const PAYMENT_BREAKDOWN: { name: string; value: number; color: string }[] = [];

