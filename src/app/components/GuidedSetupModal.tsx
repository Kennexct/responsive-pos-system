import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Store, Tag, CreditCard, Receipt, Percent, CheckCircle2, ChevronRight,
  ChevronLeft, Plus, X, Sparkles, Building2, Smartphone, Banknote, Coffee,
  ShoppingBag, Scissors, ShoppingCart
} from 'lucide-react';
import type {
  BusinessType, Category, PaymentMethodEntry, TaxRule, DiscountSettings,
  User, PromoCode, PaymentMethod
} from './mockData';
import { formatIndonesianPhone } from './mockData';
import { VPosLogo } from './VPosLogo';

interface SetupData {
  bizName: string;
  bizPhone: string;
  bizEmail: string;
  bizAddress: string;
  businessType: BusinessType;
  categories: Category[];
  paymentMethods: PaymentMethodEntry[];
  taxRules: TaxRule[];
  discountSettings: DiscountSettings;
}

interface GuidedSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode: boolean;
  currentUser: User;
  initialData: {
    bizName: string;
    bizPhone: string;
    bizEmail: string;
    bizAddress: string;
    businessType: BusinessType;
    categories: Category[];
    paymentMethods: PaymentMethodEntry[];
    taxRules: TaxRule[];
    discountSettings: DiscountSettings;
  };
  onSaveSetup: (data: SetupData) => void;
}

const INDUSTRY_PRESETS = [
  {
    id: 'fnb-cafe',
    name: 'Cafe & Coffee Shop',
    type: 'fnb' as BusinessType,
    icon: Coffee,
    categories: ['Coffee', 'Non-Coffee', 'Pastry & Bakery', 'Meals', 'Dessert', 'Snacks']
  },
  {
    id: 'fnb-resto',
    name: 'Restaurant & Eatery',
    type: 'fnb' as BusinessType,
    icon: Store,
    categories: ['Appetizers', 'Main Courses', 'Beverages', 'Desserts', 'Side Dishes']
  },
  {
    id: 'retail-fashion',
    name: 'Retail & Fashion',
    type: 'retail' as BusinessType,
    icon: ShoppingBag,
    categories: ['Tops', 'Bottoms', 'Outerwear', 'Accessories', 'Footwear']
  },
  {
    id: 'retail-mart',
    name: 'Grocery & Minimart',
    type: 'retail' as BusinessType,
    icon: ShoppingCart,
    categories: ['Beverages', 'Snacks', 'Fresh Food', 'Pantry', 'Personal Care', 'Household']
  },
  {
    id: 'service-salon',
    name: 'Salon & Services',
    type: 'retail' as BusinessType,
    icon: Scissors,
    categories: ['Haircuts', 'Styling', 'Spa & Treatment', 'Packages', 'Products']
  }
];

export function GuidedSetupModal({
  isOpen,
  onClose,
  darkMode: dm,
  currentUser,
  initialData,
  onSaveSetup
}: GuidedSetupModalProps) {
  const [step, setStep] = useState<number>(1);
  const totalSteps = 6;

  // Step 1: Business Profile
  const [bizName, setBizName] = useState(initialData.bizName || currentUser.businessName || '');
  const [bizType, setBizType] = useState<BusinessType>(initialData.businessType || 'fnb');
  const [selectedIndustry, setSelectedIndustry] = useState('fnb-cafe');
  const [bizPhone, setBizPhone] = useState(initialData.bizPhone || '');
  const [bizEmail, setBizEmail] = useState(initialData.bizEmail || currentUser.email || '');
  const [bizAddress, setBizAddress] = useState(initialData.bizAddress || '');

  // Step 2: Categories
  const [categoryList, setCategoryList] = useState<string[]>(() => {
    if (initialData.categories && initialData.categories.length > 0) {
      const nonAll = initialData.categories.filter(c => c.id !== 'cat-all').map(c => c.name);
      if (nonAll.length > 0) return nonAll;
    }
    return INDUSTRY_PRESETS[0].categories;
  });
  const [newCatName, setNewCatName] = useState('');

  // Step 3: Payment Methods
  const [payments, setPayments] = useState<PaymentMethodEntry[]>(() => {
    return (initialData.paymentMethods && initialData.paymentMethods.length > 0)
      ? initialData.paymentMethods
      : [
          { id: 'cash' as PaymentMethod, label: 'Cash', enabled: true },
          { id: 'qris' as PaymentMethod, label: 'QRIS', enabled: true },
          { id: 'card' as PaymentMethod, label: 'Debit / Credit Card', enabled: false },
          { id: 'bank-transfer' as PaymentMethod, label: 'Bank Transfer', enabled: false },
        ];
  });

  // Step 4: Tax Rules
  const [enableTax, setEnableTax] = useState(() => initialData.taxRules && initialData.taxRules.length > 0);
  const [taxName, setTaxName] = useState(() => initialData.taxRules?.[0]?.name || 'PB1 / PPN');
  const [taxRate, setTaxRate] = useState<number>(() => initialData.taxRules?.[0]?.rate ?? 11);
  const [taxInclusive, setTaxInclusive] = useState(() => initialData.taxRules?.[0]?.isInclusive ?? false);

  // Step 5: Discounts & Promos
  const [enableDiscounts, setEnableDiscounts] = useState(() => initialData.discountSettings?.enabled ?? true);
  const [allowItemDiscount, setAllowItemDiscount] = useState(() => initialData.discountSettings?.allowItemDiscount ?? true);
  const [createStarterPromo, setCreateStarterPromo] = useState(true);
  const [promoCode, setPromoCode] = useState('WELCOME10');
  const [promoPercent, setPromoPercent] = useState('10');

  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSelectIndustry = (preset: typeof INDUSTRY_PRESETS[0]) => {
    setSelectedIndustry(preset.id);
    setBizType(preset.type);
    setCategoryList(preset.categories);
  };

  const handleAddCategory = () => {
    const trimmed = newCatName.trim();
    if (!trimmed) return;
    if (categoryList.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      setErrorMsg('Category already exists.');
      return;
    }
    setCategoryList([...categoryList, trimmed]);
    setNewCatName('');
    setErrorMsg('');
  };

  const handleRemoveCategory = (catName: string) => {
    setCategoryList(categoryList.filter(c => c !== catName));
  };

  const handleTogglePayment = (id: PaymentMethod) => {
    setPayments(prev => prev.map(p => p.id === id ? { ...p, enabled: !p.enabled } : p));
  };

  const validateStep = (currentStep: number): boolean => {
    setErrorMsg('');
    if (currentStep === 1) {
      if (!bizName.trim()) {
        setErrorMsg('Please enter your business or store name.');
        return false;
      }
    }
    if (currentStep === 2) {
      if (categoryList.length === 0) {
        setErrorMsg('Please add at least one product category.');
        return false;
      }
    }
    if (currentStep === 3) {
      if (!payments.some(p => p.enabled)) {
        setErrorMsg('Please enable at least one payment method (e.g. Cash).');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(prev => Math.min(prev + 1, totalSteps));
    }
  };

  const handleBack = () => {
    setErrorMsg('');
    setStep(prev => Math.max(prev - 1, 1));
  };

  const handleComplete = () => {
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) return;

    // Construct full categories array with 'All'
    const fullCategories: Category[] = [
      { id: 'cat-all', name: 'All', isTaxable: true, isDiscountable: true },
      ...categoryList.map(name => ({
        id: `cat-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString().slice(-4)}`,
        name,
        isTaxable: true,
        isDiscountable: true
      }))
    ];

    // Construct Tax Rules
    const builtTaxRules: TaxRule[] = enableTax ? [
      {
        id: 'tax-default',
        name: taxName.trim() || 'PPN/PB1',
        rate: Number(taxRate) || 0,
        isInclusive: taxInclusive,
        order: 1
      }
    ] : [];

    // Construct Promos
    const builtPromos: PromoCode[] = [];
    if (enableDiscounts && createStarterPromo && promoCode.trim()) {
      builtPromos.push({
        id: Date.now().toString(),
        code: promoCode.trim().toUpperCase(),
        type: 'percent',
        value: Number(promoPercent) || 10,
        active: true,
      });
    }

    const builtDiscountSettings: DiscountSettings = {
      enabled: enableDiscounts,
      allowItemDiscount: allowItemDiscount,
      promoCodes: builtPromos
    };

    onSaveSetup({
      bizName: bizName.trim(),
      bizPhone: bizPhone.trim(),
      bizEmail: bizEmail.trim(),
      bizAddress: bizAddress.trim(),
      businessType: bizType,
      categories: fullCategories,
      paymentMethods: payments,
      taxRules: builtTaxRules,
      discountSettings: builtDiscountSettings,
    });

    onClose();
  };

  const inputCls = `w-full px-4 py-3 rounded-xl text-sm border transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 ${
    dm
      ? 'bg-ink-800 border-ink-700 text-ink-100 placeholder-ink-500 focus:border-brand-500'
      : 'bg-ink-50 border-ink-200 text-ink-800 placeholder-ink-400 focus:border-brand-500 focus:bg-white'
  }`;

  const labelCls = `block text-xs font-semibold mb-1.5 ${dm ? 'text-ink-300' : 'text-ink-600'}`;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/75"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ duration: 0.25 }}
          className={`relative w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden my-auto ${
            dm ? 'bg-ink-900 border border-ink-800 text-ink-100' : 'bg-white text-ink-900'
          }`}
        >
          {/* Header Banner */}
          <div className="bg-brand-700 p-6 text-white relative">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <VPosLogo size={32} />
                <span className="font-bold tracking-tight text-lg">Store Setup Guide</span>
              </div>
              <div className="text-xs font-boldr px-3 py-1 rounded-full bg-white/20">
                Step {step} of {totalSteps}
              </div>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold">
              {step === 1 && "Let's set up your Business Profile"}
              {step === 2 && "Configure Product Categories"}
              {step === 3 && "Select Accepted Payment Methods"}
              {step === 4 && "Configure Tax Rates & Rules"}
              {step === 5 && "Set Up Promos & Discount Rules"}
              {step === 6 && "Ready to Start Selling!"}
            </h2>
            <p className="text-white/80 text-xs sm:text-sm mt-1">
              {step === 1 && "Personalize your store details for invoices and staff receipts."}
              {step === 2 && "Organize your items into clear categories for fast checkout."}
              {step === 3 && "Choose the payment channels customers can use at your register."}
              {step === 4 && "Set up standard governmental or restaurant taxes (PPN/PB1)."}
              {step === 5 && "Enable store-wide promos, seasonal vouchers, and cashier item discounts."}
              {step === 6 && "Review your store configuration and launch your POS terminal."}
            </p>

            {/* Stepper Dots */}
            <div className="flex items-center gap-2 mt-4">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i + 1 === step
                      ? 'w-8 bg-white'
                      : i + 1 < step
                      ? 'w-4 bg-white'
                      : 'w-2.5 bg-white/30'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Modal Content Body */}
          <div className="p-6 max-h-[62vh] overflow-y-auto">
            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl text-xs font-medium bg-chili-500/10 border border-chili-500/30 text-chili-600 dark:text-chili-400">
                {errorMsg}
              </div>
            )}

            {/* ── STEP 1: Business Profile ── */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <label className={labelCls}>Business / Store Name *</label>
                  <input
                    type="text"
                    value={bizName}
                    onChange={e => setBizName(e.target.value)}
                    placeholder="e.g. Kopi Kulo, Bloom Boutique"
                    className={inputCls}
                    autoFocus
                  />
                </div>

                <div>
                  <label className={labelCls}>Business Industry</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {INDUSTRY_PRESETS.map(preset => {
                      const Icon = preset.icon;
                      const isSelected = selectedIndustry === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => handleSelectIndustry(preset)}
                          className={`flex items-center gap-3 p-3 rounded-2xl border text-left transition-all ${
                            isSelected
                              ? 'border-brand-600 bg-brand-600/10 text-brand-600 dark:text-brand-400 ring-2 ring-brand-500/30 font-semibold'
                              : dm
                              ? 'border-ink-800 bg-ink-800 hover:bg-ink-800 text-ink-300'
                              : 'border-ink-200 bg-ink-50 hover:bg-ink-100 text-ink-700'
                          }`}
                        >
                          <div className={`p-2 rounded-xl ${isSelected ? 'bg-brand-600 text-white' : dm ? 'bg-ink-700 text-ink-300' : 'bg-white text-ink-600 shadow-sm'}`}>
                            <Icon size={18} />
                          </div>
                          <div>
                            <p className="text-xs sm:text-sm">{preset.name}</p>
                            <p className={`text-[10px] ${dm ? 'text-ink-400' : 'text-ink-500'}`}>{preset.categories.slice(0, 3).join(', ')}...</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Store Phone Number</label>
                    <input
                      type="tel"
                      value={bizPhone}
                      onChange={e => setBizPhone(formatIndonesianPhone(e.target.value))}
                      onFocus={() => { if (!bizPhone) setBizPhone('+62 '); }}
                      placeholder="+62 812-3456-7890"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Store Email</label>
                    <input
                      type="email"
                      value={bizEmail}
                      onChange={e => setBizEmail(e.target.value)}
                      placeholder="store@example.com"
                      className={inputCls}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Store Address</label>
                  <input
                    type="text"
                    value={bizAddress}
                    onChange={e => setBizAddress(e.target.value)}
                    placeholder="e.g. Jl. Senopati No. 12, Jakarta Selatan"
                    className={inputCls}
                  />
                </div>
              </div>
            )}

            {/* ── STEP 2: Categories ── */}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <p className="text-xs mb-2 font-medium opacity-80">
                    Product categories organize your menu or catalog for rapid ordering on the sales screen.
                  </p>
                  
                  {/* Category Add Box */}
                  <div className="flex gap-2 mb-4">
                    <input
                      type="text"
                      value={newCatName}
                      onChange={e => setNewCatName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCategory(); } }}
                      placeholder="Type category name (e.g. Mocktails, Shoes)"
                      className={inputCls}
                    />
                    <button
                      type="button"
                      onClick={handleAddCategory}
                      className="px-5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-semibold text-sm shrink-0 flex items-center gap-1.5 transition-colors"
                    >
                      <Plus size={16} /> Add
                    </button>
                  </div>
                </div>

                {/* Categories Chips */}
                <div>
                  <label className={labelCls}>Current Categories ({categoryList.length})</label>
                  <div className={`p-4 rounded-2xl border min-h-[140px] flex flex-wrap gap-2 items-start content-start ${
                    dm ? 'bg-ink-800 border-ink-700' : 'bg-ink-50 border-ink-200'
                  }`}>
                    {categoryList.length === 0 ? (
                      <p className={`text-xs ${dm ? 'text-ink-500' : 'text-ink-400'} italic`}>
                        No categories added. Add one above or select an industry preset.
                      </p>
                    ) : (
                      categoryList.map(cat => (
                        <span
                          key={cat}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shadow-sm transition-colors ${
                            dm ? 'bg-ink-800 text-ink-200 border border-ink-700' : 'bg-white text-ink-800 border border-ink-200'
                          }`}
                        >
                          <Tag size={12} className="text-brand-500" />
                          {cat}
                          <button
                            type="button"
                            onClick={() => handleRemoveCategory(cat)}
                            className="hover:text-chili-500 text-ink-400 ml-1 transition-colors"
                            title="Remove"
                          >
                            <X size={13} />
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 3: Payment Methods ── */}
            {step === 3 && (
              <div className="space-y-4">
                <p className="text-xs mb-2 opacity-80">
                  Select which payment options are active on your POS checkout modal:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {payments.map(pm => {
                    const iconMap: Record<string, any> = {
                      cash: Banknote,
                      qris: Smartphone,
                      card: CreditCard,
                      'bank-transfer': Building2,
                    };
                    const Icon = iconMap[pm.id] || CreditCard;

                    return (
                      <div
                        key={pm.id}
                        onClick={() => handleTogglePayment(pm.id)}
                        className={`p-4 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                          pm.enabled
                            ? 'border-brand-600 bg-brand-600/10 text-brand-600 dark:text-brand-400 font-semibold shadow-sm'
                            : dm
                            ? 'border-ink-800 bg-ink-800 text-ink-400 hover:bg-ink-800'
                            : 'border-ink-200 bg-ink-50 text-ink-600 hover:bg-ink-100'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-xl ${pm.enabled ? 'bg-brand-600 text-white' : dm ? 'bg-ink-700 text-ink-400' : 'bg-white text-ink-400 shadow-sm'}`}>
                            <Icon size={20} />
                          </div>
                          <div>
                            <p className="text-sm">{pm.label}</p>
                            <p className={`text-[10px] ${dm ? 'text-ink-400' : 'text-ink-500'}`}>
                              {pm.enabled ? 'Active at checkout' : 'Disabled'}
                            </p>
                          </div>
                        </div>

                        <div className={`w-6 h-6 rounded-full flex items-center justify-center border transition-colors ${
                          pm.enabled
                            ? 'bg-brand-600 border-brand-600 text-white'
                            : dm
                            ? 'border-ink-700 bg-ink-800'
                            : 'border-ink-300 bg-white'
                        }`}>
                          {pm.enabled && <CheckCircle2 size={16} />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── STEP 4: Tax Rules ── */}
            {step === 4 && (
              <div className="space-y-4">
                <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                  dm ? 'bg-ink-800 border-ink-700' : 'bg-ink-50 border-ink-200'
                }`}>
                  <div>
                    <h4 className="text-sm font-semibold">Enable Store Tax</h4>
                    <p className={`text-xs ${dm ? 'text-ink-400' : 'text-ink-500'}`}>
                      Automatically compute sales tax at checkout and display on receipt.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEnableTax(!enableTax)}
                    className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                      enableTax ? 'bg-brand-600 justify-end' : dm ? 'bg-ink-700 justify-start' : 'bg-ink-300 justify-start'
                    }`}
                  >
                    <div className="w-4 h-4 rounded-full bg-white shadow-md" />
                  </button>
                </div>

                {enableTax && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-3 pt-2"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls}>Tax Name / Label</label>
                        <input
                          type="text"
                          value={taxName}
                          onChange={e => setTaxName(e.target.value)}
                          placeholder="e.g. PB1, PPN, Sales Tax"
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Tax Rate (%)</label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={taxRate}
                          onChange={e => setTaxRate(Number(e.target.value))}
                          placeholder="11"
                          className={inputCls}
                        />
                      </div>
                    </div>

                    <div>
                      <label className={labelCls}>Tax Calculation Mode</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setTaxInclusive(false)}
                          className={`p-3 rounded-xl border text-xs font-semibold text-center transition-all ${
                            !taxInclusive
                              ? 'border-brand-600 bg-brand-600/10 text-brand-600 dark:text-brand-400'
                              : dm ? 'border-ink-700 bg-ink-800 text-ink-400' : 'border-ink-200 bg-white text-ink-600'
                          }`}
                        >
                          Exclusive (Added to bill)
                        </button>
                        <button
                          type="button"
                          onClick={() => setTaxInclusive(true)}
                          className={`p-3 rounded-xl border text-xs font-semibold text-center transition-all ${
                            taxInclusive
                              ? 'border-brand-600 bg-brand-600/10 text-brand-600 dark:text-brand-400'
                              : dm ? 'border-ink-700 bg-ink-800 text-ink-400' : 'border-ink-200 bg-white text-ink-600'
                          }`}
                        >
                          Inclusive (Included in price)
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            )}

            {/* ── STEP 5: Promos & Discounts ── */}
            {step === 5 && (
              <div className="space-y-4">
                <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                  dm ? 'bg-ink-800 border-ink-700' : 'bg-ink-50 border-ink-200'
                }`}>
                  <div>
                    <h4 className="text-sm font-semibold">Enable Store Discounts</h4>
                    <p className={`text-xs ${dm ? 'text-ink-400' : 'text-ink-500'}`}>
                      Master switch for applying promo vouchers and sales discounts.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEnableDiscounts(!enableDiscounts)}
                    className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                      enableDiscounts ? 'bg-brand-600 justify-end' : dm ? 'bg-ink-700 justify-start' : 'bg-ink-300 justify-start'
                    }`}
                  >
                    <div className="w-4 h-4 rounded-full bg-white shadow-md" />
                  </button>
                </div>

                {enableDiscounts && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-3 pt-2"
                  >
                    <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                      dm ? 'bg-ink-800 border-ink-700' : 'bg-ink-50 border-ink-200'
                    }`}>
                      <div>
                        <h4 className="text-sm font-semibold">Allow Item-Level Discounts</h4>
                        <p className={`text-xs ${dm ? 'text-ink-400' : 'text-ink-500'}`}>
                          Allow cashier to manually apply percent or nominal discounts on specific items.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAllowItemDiscount(!allowItemDiscount)}
                        className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                          allowItemDiscount ? 'bg-brand-600 justify-end' : dm ? 'bg-ink-700 justify-start' : 'bg-ink-300 justify-start'
                        }`}
                      >
                        <div className="w-4 h-4 rounded-full bg-white shadow-md" />
                      </button>
                    </div>

                    <div className={`p-4 rounded-2xl border ${
                      dm ? 'bg-ink-800 border-ink-700' : 'bg-ink-50 border-ink-200'
                    }`}>
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="text-sm font-semibold">Create Starter Promo Code</h4>
                          <p className={`text-xs ${dm ? 'text-ink-400' : 'text-ink-500'}`}>
                            Provide customers with a welcome or grand-opening discount code.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setCreateStarterPromo(!createStarterPromo)}
                          className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                            createStarterPromo ? 'bg-brand-600 justify-end' : dm ? 'bg-ink-700 justify-start' : 'bg-ink-300 justify-start'
                          }`}
                        >
                          <div className="w-4 h-4 rounded-full bg-white shadow-md" />
                        </button>
                      </div>

                      {createStarterPromo && (
                        <div className="grid grid-cols-2 gap-3 pt-2">
                          <div>
                            <label className={labelCls}>Promo Code</label>
                            <input
                              type="text"
                              value={promoCode}
                              onChange={e => setPromoCode(e.target.value.toUpperCase())}
                              placeholder="WELCOME10"
                              className={inputCls}
                            />
                          </div>
                          <div>
                            <label className={labelCls}>Discount (%)</label>
                            <input
                              type="number"
                              min={1}
                              max={100}
                              value={promoPercent}
                              onChange={e => setPromoPercent(e.target.value)}
                              placeholder="10"
                              className={inputCls}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </div>
            )}

            {/* ── STEP 6: Summary & Launch ── */}
            {step === 6 && (
              <div className="space-y-4">
                <div className={`p-5 rounded-2xl border ${
                  dm ? 'bg-brand-950/20 border-brand-800/40 text-brand-200' : 'bg-brand-50 border-brand-200 text-brand-800'
                }`}>
                  <div className="flex items-center gap-3 mb-2">
                    <Sparkles className="text-brand-500" size={24} />
                    <h3 className="text-base font-bold">Your Store is Configured!</h3>
                  </div>
                  <p className="text-xs opacity-90">
                    Here is a quick overview of your initial store settings. You can always change any of these later under Settings.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className={`p-3.5 rounded-xl border ${dm ? 'border-ink-700 bg-ink-800' : 'border-ink-200 bg-ink-50'}`}>
                    <p className={`font-semibold mb-1 ${dm ? 'text-ink-400' : 'text-ink-500'}`}>Business Profile</p>
                    <p className="font-bold text-sm">{bizName || 'My Store'}</p>
                    <p className="opacity-80">{bizPhone || 'No phone set'}, {bizEmail || currentUser.email}</p>
                    <p className="opacity-80 truncate">{bizAddress || 'No address set'}</p>
                  </div>

                  <div className={`p-3.5 rounded-xl border ${dm ? 'border-ink-700 bg-ink-800' : 'border-ink-200 bg-ink-50'}`}>
                    <p className={`font-semibold mb-1 ${dm ? 'text-ink-400' : 'text-ink-500'}`}>Categories ({categoryList.length})</p>
                    <p className="font-bold truncate">{categoryList.join(', ')}</p>
                    <p className="opacity-80 mt-1">Ready for product inventory catalog</p>
                  </div>

                  <div className={`p-3.5 rounded-xl border ${dm ? 'border-ink-700 bg-ink-800' : 'border-ink-200 bg-ink-50'}`}>
                    <p className={`font-semibold mb-1 ${dm ? 'text-ink-400' : 'text-ink-500'}`}>Payment Channels</p>
                    <p className="font-bold">
                      {payments.filter(p => p.enabled).map(p => p.label).join(', ') || 'None'}
                    </p>
                  </div>

                  <div className={`p-3.5 rounded-xl border ${dm ? 'border-ink-700 bg-ink-800' : 'border-ink-200 bg-ink-50'}`}>
                    <p className={`font-semibold mb-1 ${dm ? 'text-ink-400' : 'text-ink-500'}`}>Taxes & Promos</p>
                    <p className="font-bold">
                      Tax: {enableTax ? `${taxName} (${taxRate}%)` : 'Disabled'}
                    </p>
                    <p className="opacity-80">
                      Discounts: {enableDiscounts ? (createStarterPromo && promoCode ? `Promo ${promoCode} (${promoPercent}%)` : 'Active') : 'Disabled'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer Controls */}
          <div className={`p-5 border-t flex items-center justify-between ${
            dm ? 'border-ink-800 bg-ink-900' : 'border-ink-100 bg-ink-50/80'
          }`}>
            {step > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                className={`px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm flex items-center gap-1.5 transition-colors ${
                  dm ? 'hover:bg-ink-800 text-ink-300' : 'hover:bg-ink-200 text-ink-600'
                }`}
              >
                <ChevronLeft size={16} /> Back
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              {step < totalSteps ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-semibold text-xs sm:text-sm flex items-center gap-1.5 shadow-lg transition-colors"
                >
                  Next <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleComplete}
                  className="px-6 py-2.5 bg-leaf-600 hover:bg-leaf-700 text-white rounded-xl font-semibold text-xs sm:text-sm flex items-center gap-1.5 shadow-lg transition-colors"
                >
                  <CheckCircle2 size={16} /> Finish & Start Selling
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
