import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Monitor, Package, Users, Settings, ChevronRight, ChevronLeft, CheckCircle2, Sparkles, X } from 'lucide-react';
import { VPosLogo } from './VPosLogo';

interface OnboardingWalkthroughModalProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode: boolean;
  merchantName?: string;
}

const STEPS = [
  {
    icon: Monitor,
    color: 'from-blue-600 to-indigo-600',
    title: '1. Modern POS Terminal',
    subtitle: 'Lightning-fast Checkout & Barcode Scanner',
    description: 'Easily select products or use scanner mode for fast checkout. Supports item discounts, custom promo codes, order notes, and multiple payment methods (Cash, QRIS, Card).',
    bulletPoints: [
      'Instant barcode & SKU scanning',
      'Flexible order types (Dine-in, Takeaway, Delivery)',
      'Split payments & auto-calculated tax'
    ]
  },
  {
    icon: Package,
    color: 'from-indigo-600 to-violet-600',
    title: '2. Real-Time Inventory Control',
    subtitle: 'Stock Tracking & Low-Stock Alerts',
    description: 'Add products, categories, cost prices, and variants. Set minimum stock thresholds to get automatic low-stock alerts before items run out.',
    bulletPoints: [
      'Track stock levels & cost margins',
      'Custom variants & price modifiers',
      'Automated low-stock warning alerts'
    ]
  },
  {
    icon: Users,
    color: 'from-violet-600 to-purple-600',
    title: '3. Staff Management & PIN Access',
    subtitle: 'Role Security & Cashier Sign In',
    description: 'Register managers and cashiers under Settings > Staff & Roles. Assign 4-digit PINs so your staff can quickly log in via PIN Code on any tablet or POS terminal.',
    bulletPoints: [
      'Role-based access control (Owner, Manager, Cashier)',
      '4-Digit PIN Code for instant staff login',
      'Restrict owner-only settings and financial reports'
    ]
  },
  {
    icon: Settings,
    color: 'from-blue-600 to-cyan-600',
    title: '4. Cloud Database & Store Settings',
    subtitle: 'Automatic Supabase Cloud Synchronization',
    description: 'All your store orders, products, and customer records are safely saved locally and synchronized in real time with your Supabase cloud database.',
    bulletPoints: [
      'Real-time multi-device cloud synchronization',
      'Custom receipt headers & PB1/PPN tax rules',
      'Purge and reset controls protected by Owner PIN'
    ]
  }
];

export function OnboardingWalkthroughModal({
  isOpen,
  onClose,
  darkMode,
  merchantName = 'Merchant'
}: OnboardingWalkthroughModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const dm = darkMode;

  const step = STEPS[currentStep] || STEPS[0];
  const IconComponent = step.icon;
  const isLastStep = currentStep === STEPS.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onClose();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/65 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className={`relative w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl ${
            dm ? 'bg-slate-900 border border-slate-800 text-slate-100' : 'bg-white text-slate-800'
          }`}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className={`absolute top-4 right-4 z-10 p-2 rounded-full transition-colors ${
              dm ? 'hover:bg-slate-800 text-slate-400 hover:text-slate-200' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'
            }`}
          >
            <X size={18} />
          </button>

          {/* Hero Banner Header */}
          <div className={`p-6 bg-gradient-to-r ${step.color} text-white relative overflow-hidden`}>
            <div className="absolute right-0 bottom-0 opacity-15 translate-x-4 translate-y-4">
              <IconComponent size={140} />
            </div>
            
            <div className="flex items-center gap-3 mb-4">
              <VPosLogo size={36} />
              <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md">
                Quick Tour · {currentStep + 1} of {STEPS.length}
              </span>
            </div>

            <h2 className="text-2xl font-bold mb-1">Welcome to VPos, {merchantName}! 🎉</h2>
            <p className="text-white/80 text-xs sm:text-sm">Let's quickly take a look at how to get your store up and running.</p>

            {/* Progress indicators */}
            <div className="flex gap-1.5 mt-5">
              {STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentStep(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === currentStep ? 'w-8 bg-white' : i < currentStep ? 'w-3 bg-white/70' : 'w-3 bg-white/30'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Content Body */}
          <div className="p-6 space-y-4">
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                dm ? 'bg-slate-800 text-blue-400 border border-slate-700' : 'bg-blue-50 text-blue-600'
              }`}>
                <IconComponent size={24} />
              </div>
              <div>
                <h3 className={`text-lg font-bold ${dm ? 'text-white' : 'text-slate-900'}`}>
                  {step.title}
                </h3>
                <p className={`text-xs font-semibold ${dm ? 'text-blue-400' : 'text-blue-600'}`}>
                  {step.subtitle}
                </p>
              </div>
            </div>

            <p className={`text-sm leading-relaxed ${dm ? 'text-slate-300' : 'text-slate-600'}`}>
              {step.description}
            </p>

            <div className={`p-4 rounded-2xl border space-y-2 ${
              dm ? 'bg-slate-800/60 border-slate-800' : 'bg-slate-50 border-slate-100'
            }`}>
              {step.bulletPoints.map((bp, i) => (
                <div key={i} className="flex items-center gap-2.5 text-xs font-medium">
                  <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                  <span className={dm ? 'text-slate-200' : 'text-slate-700'}>{bp}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Controls */}
          <div className={`px-6 py-4 border-t flex items-center justify-between ${
            dm ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50/50'
          }`}>
            <button
              onClick={handleBack}
              disabled={currentStep === 0}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors ${
                currentStep === 0
                  ? 'opacity-0 pointer-events-none'
                  : dm ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ChevronLeft size={16} />
              Back
            </button>

            <button
              onClick={handleNext}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-lg shadow-blue-500/25 transition-all flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
            >
              {isLastStep ? (
                <>
                  <Sparkles size={16} />
                  Get Started with VPos
                </>
              ) : (
                <>
                  Next
                  <ChevronRight size={16} />
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
}
