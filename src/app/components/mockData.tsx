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
}

export type RolePermissions = Record<Role, ViewType[]>;

export const DEFAULT_PERMISSIONS: RolePermissions = {
  owner: ['pos', 'dashboard', 'daily-sales', 'inventory', 'reports', 'customers', 'settings'],
  manager: ['pos', 'dashboard', 'daily-sales', 'inventory', 'reports', 'customers'],
  cashier: ['pos', 'daily-sales', 'customers'],
};

export const INITIAL_USERS: User[] = [
  { id: '1', name: 'Budi Santoso', email: 'budi@warkop.id',  role: 'owner',   pin: '9999' },
  { id: '2', name: 'Ani Wijaya',   email: 'ani@warkop.id',   role: 'cashier', pin: '1234' },
  { id: '3', name: 'Citra Dewi',   email: 'citra@warkop.id', role: 'cashier', pin: '5678' },
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

export const INITIAL_CUSTOMERS: Customer[] = [
  { id: 'c1', name: 'Andi Pratama', phone: '081234567890', pointsBalance: 1500, totalSpend: 250000, registrationDate: '2023-11-10T10:00:00Z', tierId: 'silver', totalTransactions: 5, averageTransactionValue: 50000, lastPurchaseDate: '2024-05-12T10:00:00Z', marketingConsent: true },
  { id: 'c2', name: 'Rina Wijaya', phone: '081987654321', pointsBalance: 0, totalSpend: 45000, registrationDate: '2024-01-15T14:30:00Z', tierId: 'bronze', totalTransactions: 1, averageTransactionValue: 45000, lastPurchaseDate: '2024-01-15T14:30:00Z', tags: ['VIP'] },
];

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

export const formatIDR = (amount: number): string =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

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

export const PRODUCTS: Product[] = [
  { id: '1',  name: 'Americano',         price: 28000, costPrice: 8000,  category: 'Coffee',  stock: 50,  emoji: '☕', lowStockThreshold: 10, trackInventory: true, allowDiscount: true, sku: 'COF-AME-01', variants: [{id: 'v1', name: 'Large', priceModifier: 5000, sku: 'COF-AME-01-L'}] },
  { id: '2',  name: 'Cappuccino',         price: 35000, costPrice: 12000, category: 'Coffee',  stock: 45,  emoji: '☕', lowStockThreshold: 10, trackInventory: true, allowDiscount: true, sku: 'COF-CAP-01' },
  { id: '3',  name: 'Caramel Latte',      price: 40000, costPrice: 14000, category: 'Coffee',  stock: 38,  emoji: '🥛', lowStockThreshold: 10, trackInventory: true, allowDiscount: true, sku: 'COF-CAR-01' },
  { id: '4',  name: 'Cold Brew',          price: 42000, costPrice: 15000, category: 'Coffee',  stock: 8,   emoji: '🧊', lowStockThreshold: 10, trackInventory: true, allowDiscount: true },
  { id: '5',  name: 'Matcha Latte',       price: 42000, costPrice: 16000, category: 'Tea',     stock: 30,  emoji: '🍵', lowStockThreshold: 8,  trackInventory: true, allowDiscount: true },
  { id: '6',  name: 'Teh Tarik',          price: 18000, costPrice: 6000,  category: 'Tea',     stock: 60,  emoji: '🍵', lowStockThreshold: 10, trackInventory: true, allowDiscount: true },
  { id: '7',  name: 'Chamomile Tea',      price: 30000, costPrice: 8000,  category: 'Tea',     stock: 25,  emoji: '🫖', lowStockThreshold: 8,  trackInventory: true, allowDiscount: true },
  { id: '8',  name: 'Nasi Goreng',        price: 38000, costPrice: 15000, category: 'Food',    stock: 15,  emoji: '🍳', lowStockThreshold: 5,  trackInventory: true, allowDiscount: false }, // No discount on food
  { id: '9',  name: 'Mie Goreng',         price: 35000, costPrice: 14000, category: 'Food',    stock: 12,  emoji: '🍜', lowStockThreshold: 5,  trackInventory: true, allowDiscount: true },
  { id: '10', name: 'Club Sandwich',      price: 45000, costPrice: 18000, category: 'Food',    stock: 10,  emoji: '🥪', lowStockThreshold: 5,  trackInventory: true, allowDiscount: true },
  { id: '11', name: 'Avocado Toast',      price: 48000, costPrice: 20000, category: 'Food',    stock: 4,   emoji: '🥑', lowStockThreshold: 5,  trackInventory: true, allowDiscount: true },
  { id: '12', name: 'Pisang Goreng',      price: 18000, costPrice: 6000,  category: 'Snacks',  stock: 30,  emoji: '🍌', lowStockThreshold: 10, trackInventory: true, allowDiscount: true },
  { id: '13', name: 'Risoles',            price: 12000, costPrice: 4000,  category: 'Snacks',  stock: 40,  emoji: '🥟', lowStockThreshold: 10, trackInventory: true, allowDiscount: true },
  { id: '14', name: 'Croissant',          price: 28000, costPrice: 10000, category: 'Snacks',  stock: 15,  emoji: '🥐', lowStockThreshold: 8,  trackInventory: true, allowDiscount: true },
  { id: '15', name: 'Brownies Slice',     price: 25000, costPrice: 8000,  category: 'Dessert', stock: 20,  emoji: '🍫', lowStockThreshold: 8,  trackInventory: true, allowDiscount: true },
  { id: '16', name: 'Cheesecake',         price: 48000, costPrice: 16000, category: 'Dessert', stock: 5,   emoji: '🍰', lowStockThreshold: 8,  trackInventory: true, allowDiscount: true },
  { id: '17', name: 'Tiramisu',           price: 52000, costPrice: 18000, category: 'Dessert', stock: 8,   emoji: '🍮', lowStockThreshold: 8,  trackInventory: true, allowDiscount: true },
  { id: '18', name: 'Avocado Juice',      price: 32000, costPrice: 12000, category: 'Juice',   stock: 28,  emoji: '🥑', lowStockThreshold: 8,  trackInventory: true, allowDiscount: true },
  { id: '19', name: 'Orange Juice',       price: 25000, costPrice: 8000,  category: 'Juice',   stock: 35,  emoji: '🍊', lowStockThreshold: 8,  trackInventory: true, allowDiscount: true },
  { id: '20', name: 'Strawberry Smoothie',price: 38000, costPrice: 14000, category: 'Juice',   stock: 22,  emoji: '🍓', lowStockThreshold: 8,  trackInventory: true, allowDiscount: true },
  { id: '21', name: 'Mineral Water',      price: 8000,  costPrice: 2000,  category: 'Others',  stock: 100, emoji: '💧', lowStockThreshold: 20, trackInventory: true, allowDiscount: false },
  { id: '22', name: 'Sparkling Water',    price: 15000, costPrice: 4000,  category: 'Others',  stock: 3,   emoji: '💦', lowStockThreshold: 15, trackInventory: true, allowDiscount: false },
];

export const RECENT_ORDERS: RecentOrder[] = [
  { id: '1',  orderNumber: 'INV-001241', itemCount: 3, subtotalBeforeDiscount: 101000, discountTotal: 0, subtotal: 101000, tax: 11110, total: 112110, totalCost: 35000, paymentMethod: 'qris',          orderType: 'dine-in',  status: 'completed', createdAt: '2026-07-01T11:42:00', cashier: 'Budi'   },
  { id: '2',  orderNumber: 'INV-001240', itemCount: 2, subtotalBeforeDiscount: 63000,  discountTotal: 0, subtotal: 63000,  tax: 6930,  total: 69930,  totalCost: 20000, paymentMethod: 'cash',          orderType: 'takeaway', status: 'completed', createdAt: '2026-07-01T11:28:00', cashier: 'Ani'    },
  { id: '3',  orderNumber: 'INV-001239', itemCount: 5, subtotalBeforeDiscount: 175000, discountTotal: 0, subtotal: 175000, tax: 19250, total: 194250, totalCost: 65000, paymentMethod: 'card',          orderType: 'dine-in',  status: 'completed', createdAt: '2026-07-01T10:55:00', cashier: 'Budi'   },
  { id: '4',  orderNumber: 'INV-001238', itemCount: 1, subtotalBeforeDiscount: 28000,  discountTotal: 0, subtotal: 28000,  tax: 3080,  total: 31080,  totalCost: 8000,  paymentMethod: 'cash',          orderType: 'takeaway', status: 'completed', createdAt: '2026-07-01T10:33:00', cashier: 'Ani'    },
  { id: '5',  orderNumber: 'INV-001237', itemCount: 4, subtotalBeforeDiscount: 133000, discountTotal: 0, subtotal: 133000, tax: 14630, total: 147630, totalCost: 45000, paymentMethod: 'bank-transfer', orderType: 'delivery', status: 'completed', createdAt: '2026-07-01T10:10:00', cashier: 'Budi'   },
  { id: '6',  orderNumber: 'INV-001236', itemCount: 2, subtotalBeforeDiscount: 70000,  discountTotal: 0, subtotal: 70000,  tax: 7700,  total: 77700,  totalCost: 25000, paymentMethod: 'qris',          orderType: 'dine-in',  status: 'completed', createdAt: '2026-07-01T09:48:00', cashier: 'Citra'  },
  { id: '7',  orderNumber: 'INV-001235', itemCount: 3, subtotalBeforeDiscount: 93000,  discountTotal: 0, subtotal: 93000,  tax: 10230, total: 103230, totalCost: 30000, paymentMethod: 'cash',          orderType: 'dine-in',  status: 'completed', createdAt: '2026-07-01T09:22:00', cashier: 'Citra'  },
  { id: '8',  orderNumber: 'INV-001234', itemCount: 2, subtotalBeforeDiscount: 56000,  discountTotal: 0, subtotal: 56000,  tax: 6160,  total: 62160,  totalCost: 18000, paymentMethod: 'qris',          orderType: 'takeaway', status: 'completed', createdAt: '2026-07-01T09:05:00', cashier: 'Budi'   },
];

export const WEEKLY_SALES = [
  { day: 'Mon', sales: 1820000 },
  { day: 'Tue', sales: 2150000 },
  { day: 'Wed', sales: 1950000 },
  { day: 'Thu', sales: 2480000 },
  { day: 'Fri', sales: 3100000 },
  { day: 'Sat', sales: 3750000 },
  { day: 'Sun', sales: 2890000 },
];

export const TOP_PRODUCTS = [
  { name: 'Americano',    sold: 87, revenue: 2436000 },
  { name: 'Cappuccino',   sold: 72, revenue: 2520000 },
  { name: 'Caramel Latte',sold: 58, revenue: 2320000 },
  { name: 'Nasi Goreng',  sold: 54, revenue: 2052000 },
  { name: 'Matcha Latte', sold: 49, revenue: 2058000 },
];

export const PAYMENT_BREAKDOWN = [
  { name: 'Cash',          value: 35, color: '#22C55E' },
  { name: 'QRIS',          value: 40, color: '#3B82F6' },
  { name: 'Card',          value: 18, color: '#A855F7' },
  { name: 'Bank Transfer', value: 7,  color: '#F59E0B' },
];
