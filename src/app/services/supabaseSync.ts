import { supabase, isSupabaseConfigured } from '../lib/supabase';

const KEY_TO_TABLE: Record<string, string> = {
  'pos-products': 'products',
  'pos-orders': 'orders',
  'pos-customers': 'customers',
  'pos-categories': 'categories',
  'pos-users': 'staff',
  'pos-payments': 'payment_methods',
  'pos-taxrules': 'tax_rules',
  'pos-discounts': 'discount_settings',
  'pos-refunds': 'refund_settings',
  'pos-loyalty': 'loyalty_settings',
};

export async function loadFromSupabase<T>(key: string): Promise<T | null> {
  if (!isSupabaseConfigured) return null;
  const table = KEY_TO_TABLE[key];
  if (!table) return null;

  try {
    const { data, error } = await supabase.from(table).select('*');
    if (error) {
      console.warn(`Supabase load error for ${table}:`, error.message);
      return null;
    }
    if (!data || data.length === 0) return null;

    if (key === 'pos-orders') {
      return data.map((row: any) => ({
        id: row.id,
        orderNumber: row.order_number,
        itemCount: row.item_count,
        subtotalBeforeDiscount: row.subtotal_before_discount,
        discountTotal: row.discount_total,
        promoCode: row.promo_code,
        subtotal: row.subtotal,
        tax: row.tax,
        total: row.total,
        totalCost: row.total_cost,
        paymentMethod: row.payment_method,
        splitPaymentMethod: row.split_payment_method,
        splitAmount: row.split_amount,
        orderType: row.order_type,
        status: row.status,
        createdAt: row.created_at,
        cashier: row.cashier,
        refundReason: row.refund_reason,
        items: row.items_json || [],
        customerId: row.customer_id,
        pointsEarned: row.points_earned,
        pointsRedeemed: row.points_redeemed,
        pointsDiscountAmt: row.points_discount_amt,
      })) as unknown as T;
    }

    if (key === 'pos-products') {
      return data.map((row: any) => ({
        id: row.id,
        name: row.name,
        price: row.price,
        costPrice: row.cost_price,
        category: row.category,
        stock: row.stock,
        emoji: row.emoji,
        image: row.image_url,
        lowStockThreshold: row.low_stock_threshold,
        sku: row.sku,
        barcode: row.barcode,
        trackInventory: row.track_inventory,
        allowDiscount: row.allow_discount,
      })) as unknown as T;
    }

    if (key === 'pos-customers') {
      return data.map((row: any) => ({
        id: row.id,
        name: row.name,
        phone: row.phone,
        email: row.email,
        pointsBalance: row.points_balance,
        totalSpend: row.total_spend,
        totalTransactions: row.total_transactions,
        averageTransactionValue: row.average_transaction_value,
        tierId: row.tier_id,
        dateOfBirth: row.date_of_birth,
        marketingConsent: row.marketing_consent,
        blacklistFlag: row.blacklist_flag,
        tags: row.tags || [],
        lastPurchaseDate: row.last_purchase_date,
        favoriteCategory: row.favorite_category,
        registrationDate: row.registration_date,
      })) as unknown as T;
    }

    if (key === 'pos-categories') {
      return data.map((row: any) => ({
        id: row.id,
        name: row.name,
        isTaxable: row.is_taxable,
        isDiscountable: row.is_discountable,
      })) as unknown as T;
    }

    if (key === 'pos-users') {
      return data.map((row: any) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
        pin: row.pin,
      })) as unknown as T;
    }

    if (key === 'pos-payments') {
      return data.map((row: any) => ({
        id: row.id,
        label: row.label,
        enabled: row.enabled,
      })) as unknown as T;
    }

    return data as unknown as T;
  } catch (e) {
    console.warn(`Supabase fetch failed for ${key}:`, e);
    return null;
  }
}

export async function saveToSupabase<T>(key: string, value: T): Promise<void> {
  if (!isSupabaseConfigured) return;
  const table = KEY_TO_TABLE[key];
  if (!table) return;

  try {
    if (Array.isArray(value)) {
      if (key === 'pos-orders') {
        const rows = value.map((o: any) => ({
          id: String(o.id),
          order_number: o.orderNumber,
          item_count: o.itemCount,
          subtotal_before_discount: o.subtotalBeforeDiscount,
          discount_total: o.discountTotal || 0,
          promo_code: o.promoCode || null,
          subtotal: o.subtotal,
          tax: o.tax || 0,
          total: o.total,
          total_cost: o.totalCost || 0,
          payment_method: o.paymentMethod,
          split_payment_method: o.splitPaymentMethod || null,
          split_amount: o.splitAmount || null,
          order_type: o.orderType,
          status: o.status,
          cashier: o.cashier,
          customer_id: o.customerId || null,
          refund_reason: o.refundReason || null,
          points_earned: o.pointsEarned || 0,
          points_redeemed: o.pointsRedeemed || 0,
          points_discount_amt: o.pointsDiscountAmt || 0,
          items_json: o.items || [],
          created_at: o.createdAt || new Date().toISOString(),
        }));
        await supabase.from(table).upsert(rows, { onConflict: 'id' });
      } else if (key === 'pos-products') {
        const rows = value.map((p: any) => ({
          id: String(p.id),
          name: p.name,
          price: p.price,
          cost_price: p.costPrice || 0,
          category: p.category,
          stock: p.stock || 0,
          emoji: p.emoji || '☕',
          image_url: p.image || null,
          low_stock_threshold: p.lowStockThreshold || 10,
          sku: p.sku || null,
          barcode: p.barcode || null,
          track_inventory: p.trackInventory ?? true,
          allow_discount: p.allowDiscount ?? true,
        }));
        await supabase.from(table).upsert(rows, { onConflict: 'id' });
      } else if (key === 'pos-customers') {
        const rows = value.map((c: any) => ({
          id: String(c.id),
          name: c.name,
          phone: c.phone,
          email: c.email || null,
          points_balance: c.pointsBalance || 0,
          total_spend: c.totalSpend || 0,
          total_transactions: c.totalTransactions || 0,
          average_transaction_value: c.averageTransactionValue || 0,
          tier_id: c.tierId || 'bronze',
          date_of_birth: c.dateOfBirth || null,
          marketing_consent: c.marketingConsent ?? false,
          blacklist_flag: c.blacklistFlag ?? false,
          tags: c.tags || [],
          last_purchase_date: c.lastPurchaseDate || null,
          favorite_category: c.favoriteCategory || null,
          registration_date: c.registrationDate || new Date().toISOString(),
        }));
        await supabase.from(table).upsert(rows, { onConflict: 'id' });
      } else if (key === 'pos-categories') {
        const rows = value.map((c: any) => ({
          id: String(c.id),
          name: c.name,
          is_taxable: c.isTaxable ?? true,
          is_discountable: c.isDiscountable ?? true,
        }));
        await supabase.from(table).upsert(rows, { onConflict: 'id' });
      } else if (key === 'pos-users') {
        const rows = value.map((u: any) => ({
          id: String(u.id),
          name: u.name,
          email: u.email,
          role: u.role,
          pin: String(u.pin),
        }));
        await supabase.from(table).upsert(rows, { onConflict: 'id' });
      } else if (key === 'pos-payments') {
        const rows = value.map((p: any) => ({
          id: p.id,
          label: p.label,
          enabled: p.enabled,
        }));
        await supabase.from(table).upsert(rows, { onConflict: 'id' });
      }
    }
  } catch (e) {
    console.warn(`Supabase save error for ${key}:`, e);
  }
}

export async function purgeAllSupabaseData(): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    await supabase.from('orders').delete().neq('id', '0');
    await supabase.from('products').delete().neq('id', '0');
    await supabase.from('customers').delete().neq('id', '0');
    await supabase.from('categories').delete().neq('id', '0');
  } catch (e) {
    console.error('Failed to purge Supabase data:', e);
  }
}
