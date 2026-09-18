import { supabase, isSupabaseConfigured } from '../lib/supabase';

const KEY_TO_TABLE: Record<string, string> = {
  'pos-platform-merchants': 'merchants',
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

export async function loadFromSupabase<T>(key: string, merchantId?: string): Promise<T | null> {
  if (!isSupabaseConfigured) return null;
  const table = KEY_TO_TABLE[key];
  if (!table) return null;

  try {
    let query = supabase.from(table).select('*');
    if (merchantId) {
      query = query.eq('merchant_id', merchantId);
    }
    const { data, error } = await query;
    if (error) {
      console.warn(`Supabase load error for ${table}:`, error.message);
      return null;
    }
    if (!data || data.length === 0) return null;

    if (key === 'pos-platform-merchants') {
      return data.map((row: any) => ({
        id: row.id,
        name: row.name,
        ownerName: row.owner_name || 'Owner',
        email: row.email,
        phone: row.phone || '',
        address: row.address || '',
        type: row.type || 'fnb',
        ownerPin: '', // PINs never leave the database (migration 006)
        subscriptionPlan: row.subscription_plan || 'trial',
        subscriptionStatus: row.subscription_status || 'trial',
        subscriptionStartsAt: row.subscription_starts_at || row.created_at,
        subscriptionExpiresAt: row.subscription_expires_at || new Date(Date.now() + 14 * 86400000).toISOString(),
        isEnabled: row.is_enabled ?? true,
        notes: row.notes || '',
        createdAt: row.created_at,
      })) as unknown as T;
    }

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
        promoDiscountAmt: row.promo_discount_amt ?? 0,
        serviceCharge: row.service_charge ?? 0,
        taxBreakdown: row.tax_breakdown ?? [],
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
        variants: row.variants_json || [],
        optionGroups: row.option_groups_json || [],
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
        pin: '',
        merchantId: row.merchant_id,
      })) as unknown as T;
    }

    if (key === 'pos-taxrules') {
      return data.map((row: any) => ({
        id: row.id,
        name: row.name,
        rate: Number(row.rate),
        isInclusive: row.is_inclusive,
        order: row.sort_order ?? 0,
        compound: row.is_compound ?? false,
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

export async function saveToSupabase<T>(key: string, value: T, merchantId?: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  const table = KEY_TO_TABLE[key];
  if (!table) return;
  if (!merchantId) return; // never guess a tenant — RLS would reject it anyway
  const mId = merchantId;
  const upsert = async (rows: Record<string, unknown>[], onConflict = 'merchant_id,id') => {
    if (rows.length === 0) return;
    const { error } = await supabase.from(table).upsert(rows, { onConflict });
    // Supabase returns errors instead of throwing; surface them so sync failures aren't silent.
    if (error) console.warn(`Supabase save rejected for ${table}: ${error.message}`);
  };

  try {
    if (Array.isArray(value)) {
      if (key === 'pos-platform-merchants') {
        const rows = value.map((m: any) => ({
          id: String(m.id),
          name: m.name,
          owner_name: m.ownerName || 'Owner',
          email: m.email,
          phone: m.phone || null,
          address: m.address || null,
          type: m.type || 'fnb',
          subscription_plan: m.subscriptionPlan || 'trial',
          subscription_status: m.subscriptionStatus || 'trial',
          subscription_starts_at: m.subscriptionStartsAt || new Date().toISOString(),
          subscription_expires_at: m.subscriptionExpiresAt || new Date(Date.now() + 14 * 86400000).toISOString(),
          is_enabled: m.isEnabled ?? true,
          notes: m.notes || null,
          created_at: m.createdAt || new Date().toISOString(),
        }));
        await upsert(rows, 'id');
      } else if (key === 'pos-orders') {
        const rows = value.map((o: any) => ({
          id: String(o.id),
          merchant_id: mId,
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
          promo_discount_amt: o.promoDiscountAmt || 0,
          service_charge: o.serviceCharge || 0,
          tax_breakdown: o.taxBreakdown || [],
          created_at: o.createdAt || new Date().toISOString(),
        }));
        await upsert(rows);
      } else if (key === 'pos-products') {
        const rows = value.map((p: any) => ({
          id: String(p.id),
          merchant_id: mId,
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
          variants_json: p.variants || [],
          option_groups_json: p.optionGroups || [],
          track_inventory: p.trackInventory ?? true,
          allow_discount: p.allowDiscount ?? true,
        }));
        await upsert(rows);
      } else if (key === 'pos-customers') {
        const rows = value.map((c: any) => ({
          id: String(c.id),
          merchant_id: mId,
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
        await upsert(rows);
      } else if (key === 'pos-categories') {
        const rows = value.map((c: any) => ({
          id: String(c.id),
          merchant_id: mId,
          name: c.name,
          is_taxable: c.isTaxable ?? true,
          is_discountable: c.isDiscountable ?? true,
        }));
        await upsert(rows);
      } else if (key === 'pos-users') {
        const rows = value.map((u: any) => ({
          id: String(u.id),
          merchant_id: mId,
          name: u.name,
          email: u.email,
          role: u.role,
          // PIN is set separately through the set_staff_pin RPC and stored hashed.
        }));
        await upsert(rows);
      } else if (key === 'pos-taxrules') {
        const rows = value.map((t: any) => ({
          id: String(t.id),
          merchant_id: mId,
          name: t.name,
          rate: t.rate,
          is_inclusive: !!t.isInclusive,
          is_compound: !!t.compound,
          sort_order: t.order ?? 0,
        }));
        await upsert(rows);
      } else if (key === 'pos-payments') {
        const rows = value.map((p: any) => ({
          id: p.id,
          merchant_id: mId,
          label: p.label,
          enabled: p.enabled,
        }));
        await upsert(rows);
      }
    }
  } catch (e) {
    console.warn(`Supabase save error for ${key}:`, e);
  }
}

/** Delete one merchant's operational data. RLS additionally limits this to owners/managers of that merchant. */
export async function purgeMerchantSupabaseData(merchantId: string): Promise<void> {
  if (!isSupabaseConfigured || !merchantId) return;
  for (const table of ['orders', 'products', 'customers', 'categories']) {
    const { error } = await supabase.from(table).delete().eq('merchant_id', merchantId);
    if (error) throw new Error(`Could not clear ${table}: ${error.message}`);
  }
}
