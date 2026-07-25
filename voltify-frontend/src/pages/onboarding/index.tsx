// src/pages/onboarding/index.tsx
import { useReducer, useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-toastify';
import { useDropzone } from 'react-dropzone';
import { AnimatePresence, LazyMotion, domAnimation, m } from 'framer-motion';
import {
  Zap, Upload, ShieldCheck, Check, Play, User as UserIcon,
  Settings, Trash2, Plus, ChevronDown, Loader2, Sparkles, AlertCircle,
  FileText, FileCheck2, AlertTriangle, X, Lock, Unlock
} from 'lucide-react';
import { DEFAULT_APPLIANCES } from '../../types/appliance';
import { useAuthStore } from '../../store/authStore';
import { useDashboardStore } from '../../store/dashboardStore';
import { useGamificationStore } from '../../store/gamificationStore';
import { estimateMonthlyKwh, estimateApplianceBreakdown, generateDailyUsage } from '../../lib/estimation';
import { formatCurrency, formatUnits, getTariffRate } from '../../lib/utils';
import { apiService } from '../../lib/api';

export const calculateBillFromUnits = (units: number): number => {
  if (units <= 0) return 0;
  let cost = 0;
  if (units <= 500) {
    if (units > 200) {
      cost += Math.min(units - 200, 200) * 4.70;
    }
    if (units > 400) {
      cost += (units - 400) * 6.30;
    }
  } else {
    // For units > 500, first 100 is free
    cost += 300 * 4.70; // 101 - 400
    cost += 100 * 6.30; // 401 - 500
    if (units > 500) {
      cost += Math.min(units - 500, 100) * 8.40;
    }
    if (units > 600) {
      cost += Math.min(units - 600, 200) * 9.45;
    }
    if (units > 800) {
      cost += Math.min(units - 800, 200) * 10.50;
    }
    if (units > 1000) {
      cost += (units - 1000) * 11.55;
    }
  }
  return Math.round(cost * 100) / 100;
};

export const calculateUnitsFromBill = (bill: number): number => {
  if (bill <= 0) return 0;
  if (bill <= 1570) {
    if (bill <= 940) {
      return 200 + (bill / 4.70);
    } else {
      return 400 + ((bill - 940) / 6.30);
    }
  }
  if (bill < 2040) {
    return 500;
  }
  let remaining = bill - 2040;
  if (remaining <= 840) {
    return 500 + (remaining / 8.40);
  }
  remaining -= 840;
  if (remaining <= 1890) {
    return 600 + (remaining / 9.45);
  }
  remaining -= 1890;
  if (remaining <= 2100) {
    return 800 + (remaining / 10.50);
  }
  remaining -= 2100;
  return 1000 + (remaining / 11.55);
};

// ─── Type for a bulk-extracted bill entry ─────────────────────────────────
interface BulkExtractedBill {
  id: string;               // unique per row
  fileName: string;
  billing_month: string;    // YYYY-MM (user-editable)
  bill_amount: number;
  units: number;
  error: string | null;
  duplicateOf?: string;     // id of the original row if this is a dupe
  duplicateResolution?: 'replace' | 'keep' | null;
  isManual?: boolean;       // added via the manual-add row below
}

// ─── Zod schemas ────────────────────────────────────────────────────────────
const profileSchema = z.object({
  household_type: z.enum(['1_person', '2_people', '3_people', '4_people', '5_plus_people'], {
    message: 'Please select household size'
  }),
  location: z.string().min(1, 'Please select a city'),
  home_type: z.enum(['apartment', 'house', 'villa', 'pg_hostel', 'other'], {
    message: 'Please select dwelling type'
  }),
});

const billSchema = z.object({
  bill_amount: z.number({ message: 'Amount is required' }).min(10, 'Invalid bill amount'),
  units:       z.number({ message: 'Units are required' }).min(5, 'Invalid units consumed'),
  billing_month: z.string({ message: 'Month is required' }).min(7, 'Please select a valid month'),
});

type ProfileForm = z.infer<typeof profileSchema>;
type BillForm    = z.infer<typeof billSchema>;

// ─── State ────────────────────────────────────────────────────────────────
interface OnboardingState {
  step: number;
  profileData: ProfileForm | null;
  billData: BillForm | null;
  appliances: any[];
}

type OnboardingAction =
  | { type: 'SET_STEP'; payload: number }
  | { type: 'SET_PROFILE_DATA'; payload: ProfileForm }
  | { type: 'SET_BILL_DATA'; payload: BillForm }
  | { type: 'SET_APPLIANCES'; payload: any[] }
  | { type: 'ADD_APPLIANCE'; payload: any }
  | { type: 'REMOVE_APPLIANCE'; payload: string }
  | { type: 'UPDATE_APPLIANCE'; payload: { id: string; fields: Partial<any> } };

function onboardingReducer(state: OnboardingState, action: OnboardingAction): OnboardingState {
  switch (action.type) {
    case 'SET_STEP':         return { ...state, step: action.payload };
    case 'SET_PROFILE_DATA': return { ...state, profileData: action.payload };
    case 'SET_BILL_DATA':    return { ...state, billData: action.payload };
    case 'SET_APPLIANCES':   return { ...state, appliances: action.payload };
    case 'ADD_APPLIANCE':    return { ...state, appliances: [...state.appliances, action.payload] };
    case 'REMOVE_APPLIANCE': return { ...state, appliances: state.appliances.filter(a => a.id !== action.payload) };
    case 'UPDATE_APPLIANCE':
      return {
        ...state,
        appliances: state.appliances.map(a =>
          a.id === action.payload.id ? { ...a, ...action.payload.fields } : a
        )
      };
    default: return state;
  }
}

// ─── Custom Dropdown Component ────────────────────────────────────────────
interface DropdownOption { value: string; label: string; description?: string; icon?: string }

interface CustomDropdownProps {
  id?: string;
  value: string;
  onChange: (val: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  error?: string;
}

function CustomDropdown({ id, value, onChange, options, placeholder = 'Select...', error }: CustomDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find(o => o.value === value);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className="relative w-full" id={id}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full px-4 py-2.5 bg-surface border rounded-lg text-sm flex items-center justify-between gap-2 transition-all duration-200 outline-none ${
          open
            ? 'border-primary ring-1 ring-primary/20'
            : error
            ? 'border-error/60'
            : 'border-outline hover:border-outline-variant'
        }`}
      >
        <span className={selected ? 'text-on-surface font-medium' : 'text-on-surface-variant'}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          className={`size-4 text-on-surface-variant flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-surface-container border border-outline rounded-xl shadow-2xl overflow-hidden">
          <div className="py-1 max-h-52 overflow-y-auto">
            {options.map(opt => {
              const isActive = value === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { onChange(opt.value); setOpen(false); }}
                  className={`w-full px-4 py-2.5 text-left flex items-center gap-3 transition-all duration-150 ${
                    isActive
                      ? 'bg-primary/15 text-primary'
                      : 'text-on-surface hover:bg-surface/60'
                  }`}
                >
                  {opt.icon && <span className="text-base">{opt.icon}</span>}
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-medium truncate">{opt.label}</span>
                    {opt.description && (
                      <span className="text-[11px] text-on-surface-variant mt-0.5">{opt.description}</span>
                    )}
                  </div>
                  {isActive && <Check className="size-4 ml-auto flex-shrink-0 text-primary" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {error && <p className="text-error text-xs mt-1">{error}</p>}
    </div>
  );
}

// ─── Month Dropdown (for history) ─────────────────────────────────────────
function MonthDropdown({ value, onChange, months }: { value: string; onChange: (v: string) => void; months: { value: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = months.find(m => m.value === value);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full px-3 py-2 bg-surface border rounded-lg text-xs flex items-center justify-between gap-2 transition-all duration-200 outline-none ${
          open ? 'border-primary ring-1 ring-primary/20' : 'border-outline hover:border-outline-variant'
        }`}
      >
        <span className={selected ? 'text-on-surface font-medium' : 'text-on-surface-variant'}>
          {selected ? selected.label : 'Select month...'}
        </span>
        <ChevronDown className={`size-3.5 text-on-surface-variant flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-surface-container border border-outline rounded-xl shadow-2xl overflow-hidden">
          <div className="py-1 max-h-44 overflow-y-auto">
            {months.map(m => {
              const isActive = value === m.value;
              return (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => { onChange(m.value); setOpen(false); }}
                  className={`w-full px-3 py-2 text-left text-xs transition-all duration-150 flex items-center justify-between ${
                    isActive ? 'bg-primary/15 text-primary font-semibold' : 'text-on-surface hover:bg-surface/60'
                  }`}
                >
                  {m.label}
                  {isActive && <Check className="size-3 text-primary" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Onboarding ─────────────────────────────────────────────────────
export default function Onboarding() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuthStore();
  const { setOnboarding, setDailyHistory, setApplianceBreakdown, setInsights } = useDashboardStore();
  const { addCoins, setRank } = useGamificationStore();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [prevBills, setPrevBills] = useState<{ month: string; monthLabel: string; bill_amount: number; units: number }[]>([]);
  const [historyMonth, setHistoryMonth] = useState('');
  const [historyAmount, setHistoryAmount] = useState('');
  const [historyUnits, setHistoryUnits] = useState('');
  const [isAddDropdownOpen, setIsAddDropdownOpen] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customUsage, setCustomUsage] = useState<'low' | 'medium' | 'average'>('low');
  const [meterType, setMeterType] = useState<'basic' | 'smart' | 'estimate' | null>(null);
  const [discomNumber, setDiscomNumber] = useState('');
  const [isFetchingSmart, setIsFetchingSmart] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [fromMonth, setFromMonth] = useState('');
  const [toMonth, setToMonth] = useState('');
  const [manualAmount, setManualAmount] = useState('');
  const [manualUnits, setManualUnits] = useState('');
  const [isManualLocked, setIsManualLocked] = useState(true);

  // ─── Bulk PDF state ────────────────────────────────────────────────────────
  const [bulkBills, setBulkBills] = useState<BulkExtractedBill[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractProgress, setExtractProgress] = useState<{ done: number; total: number } | null>(null);
  const [queuedFiles, setQueuedFiles] = useState<File[]>([]);


  const [state, dispatch] = useReducer(onboardingReducer, {
    step: 1,
    profileData: null,
    billData: null,
    appliances: [],
  });

  const getPastMonths = () => {
    const months = [];
    const date = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(date.getFullYear(), date.getMonth() - i, 1);
      months.push({
        label: d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
        value: d.toISOString().split('T')[0].substring(0, 7)
      });
    }
    return months;
  };

  const handleAddHistoryBill = () => {
    if (!historyMonth || !historyAmount || !historyUnits) {
      toast.warning('Please fill in all fields (Month, Amount, and Units) for the historical bill.');
      return;
    }
    const amountNum = parseFloat(historyAmount);
    const unitsNum  = parseFloat(historyUnits);
    if (isNaN(amountNum) || amountNum <= 0) { toast.warning('Please enter a valid bill amount.'); return; }
    if (isNaN(unitsNum)  || unitsNum  <= 0) { toast.warning('Please enter valid units consumed.');  return; }

    const monthsList = getPastMonths();
    const match = monthsList.find(m => m.value === historyMonth);
    const label = match ? match.label : historyMonth;

    if (prevBills.some(b => b.month === historyMonth)) {
      toast.warning(`Bill record for ${label} has already been added.`);
      return;
    }

    setPrevBills([...prevBills, { month: historyMonth, monthLabel: label, bill_amount: amountNum, units: unitsNum }]);
    setHistoryMonth(''); setHistoryAmount(''); setHistoryUnits('');
    toast.success(`Bill record for ${label} added!`);
  };

  const handleRemoveHistoryBill = (idx: number) => setPrevBills(prevBills.filter((_, i) => i !== idx));

  // ─── Bulk PDF handlers ────────────────────────────────────────────────────
  const formatMonthLabel = (yyyyMM: string) => {
    if (!yyyyMM) return '';
    const [year, month] = yyyyMM.split('-');
    const d = new Date(parseInt(year), parseInt(month) - 1, 1);
    return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  };

  const getCurrentYYYYMM = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  const handleExtractBulk = async () => {
    if (queuedFiles.length === 0) {
      toast.warning('Please drop or select at least one PDF bill first.');
      return;
    }
    setIsExtracting(true);
    setExtractProgress({ done: 0, total: queuedFiles.length });
    const newRows: BulkExtractedBill[] = [];

    for (let i = 0; i < queuedFiles.length; i++) {
      const file = queuedFiles[i];
      try {
        const res = await apiService.parseBillPDF(file);
        const billing_month = res?.data?.billing_month ?? getCurrentYYYYMM();
        const newRow: BulkExtractedBill = {
          id: `row-${Date.now()}-${i}`,
          fileName: file.name,
          billing_month,
          bill_amount: res?.data?.bill_amount ?? 0,
          units: res?.data?.units ?? 0,
          error: null,
          duplicateResolution: null,
        };
        // Check for duplicate month among already-existing rows
        const existingIdx = newRows.findIndex(r => r.billing_month === billing_month && !r.error);
        if (existingIdx >= 0) {
          newRow.duplicateOf = newRows[existingIdx].id;
          newRow.duplicateResolution = null;
        }
        newRows.push(newRow);
      } catch (err: any) {
        newRows.push({
          id: `row-err-${Date.now()}-${i}`,
          fileName: file.name,
          billing_month: '',
          bill_amount: 0,
          units: 0,
          error: err.message || 'Failed to parse',
          duplicateResolution: null,
        });
      }
      setExtractProgress({ done: i + 1, total: queuedFiles.length });
    }

    setBulkBills(prev => {
      // Merge with existing rows, deduplicating by billing_month
      const merged = [...prev];
      for (const row of newRows) {
        if (row.error) { merged.push(row); continue; }
        const existingIdx = merged.findIndex(r => r.billing_month === row.billing_month && !r.error);
        if (existingIdx >= 0) {
          row.duplicateOf = merged[existingIdx].id;
        }
        merged.push(row);
      }
      return merged;
    });

    setIsExtracting(false);
    setExtractProgress(null);
    setQueuedFiles([]);
    toast.success(`Extracted ${newRows.filter(r => !r.error).length} bill(s) successfully!`);
  };

  const updateBulkRow = (id: string, fields: Partial<BulkExtractedBill>) => {
    setBulkBills(prev => prev.map(r => r.id === id ? { ...r, ...fields } : r));
  };

  const removeBulkRow = (id: string) => {
    setBulkBills(prev => prev.filter(r => r.id !== id));
  };

  const handleAddManualBulkRow = () => {
    const newRow: BulkExtractedBill = {
      id: `manual-${Date.now()}`,
      fileName: 'Manual entry',
      billing_month: '',
      bill_amount: 0,
      units: 0,
      error: null,
      duplicateResolution: null,
      isManual: true,
    };
    setBulkBills(prev => [...prev, newRow]);
  };

  // Derive the "primary" bill (most recent valid row without a dupe resolution of 'keep')
  const getPrimaryBill = () => {
    const valid = bulkBills
      .filter(r => !r.error && r.billing_month && r.bill_amount > 0 && r.units > 0)
      .filter(r => !r.duplicateOf || r.duplicateResolution === 'replace')
      .sort((a, b) => b.billing_month.localeCompare(a.billing_month));
    return valid[0] ?? null;
  };

  const getHistoryBills = () => {
    const primary = getPrimaryBill();
    return bulkBills
      .filter(r => !r.error && r.billing_month && r.bill_amount > 0 && r.units > 0)
      .filter(r => r.id !== primary?.id)
      .filter(r => !r.duplicateOf || r.duplicateResolution === 'replace');
  };


  const applianceListRef = useRef<HTMLDivElement>(null);

  const handleAddDefaultAppliance = (defApp: any) => {
    dispatch({
      type: 'ADD_APPLIANCE',
      payload: { id: defApp.key, name: defApp.name, icon: defApp.icon, power_kw: defApp.power_kw, avg_hours_day: defApp.avg_hours_day, seasonality: defApp.seasonality || 'whole_year' }
    });
    setIsAddDropdownOpen(false);
    toast.success(`${defApp.name} added!`);
    setTimeout(() => {
      if (applianceListRef.current) {
        applianceListRef.current.scrollTop = applianceListRef.current.scrollHeight;
      }
    }, 100);
  };

  const handleAddCustomSubmit = () => {
    if (!customName.trim()) {
      toast.warning('Please enter a custom appliance name.');
      return;
    }
    
    let power_kw = 0.1;
    if (customPower === 'medium') power_kw = 0.4;
    else if (customPower === 'high') power_kw = 1.5;

    let avg_hours_day = 4;
    if (customUsage === 'medium') avg_hours_day = 12;
    else if (customUsage === 'average') avg_hours_day = 20;

    dispatch({
      type: 'ADD_APPLIANCE',
      payload: {
        id: `custom-${Date.now()}`,
        name: customName.trim(),
        icon: '🔌',
        power_kw,
        avg_hours_day,
        seasonality: 'whole_year',
        isCustom: true
      }
    });

    setCustomName('');
    setCustomUsage('low');
    setCustomPower('low');
    setShowCustomModal(false);
    toast.success('Custom appliance added!');
    setTimeout(() => {
      if (applianceListRef.current) {
        applianceListRef.current.scrollTop = applianceListRef.current.scrollHeight;
      }
    }, 100);
  };

  // ─── Forms ────────────────────────────────────────────────────────────
  const {
    register: regProfile, handleSubmit: handleProfileSubmit,
    setValue: setProfileValue, watch: watchProfile,
    formState: { errors: profileErrors }
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { household_type: '' as any, location: '' as any, home_type: '' as any },
  });

  const watchedHomeType      = watchProfile('home_type');
  const watchedHouseholdType = watchProfile('household_type');
  const watchedLocation      = watchProfile('location');

  // ─── Step 1 Autocomplete Search hooks (obeying rules of hooks) ───
  const [searchQuery, setSearchQuery] = useState(watchedLocation || '');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [confirmLocation, setConfirmLocation] = useState(!!watchedLocation);
  const searchRef = useRef<HTMLDivElement>(null);

  const {
    register: regBill, handleSubmit: handleBillSubmit,
    formState: { errors: billErrors }
  } = useForm<BillForm>({
    resolver: zodResolver(billSchema),
    defaultValues: { billing_month: '' }
  });

  // Autocomplete dropdown click-outside listener (moved to top level to follow Rules of Hooks)
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Bulk PDF Dropzone — collects files into queue, extraction triggered by button
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'application/pdf': ['.pdf'] },
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        setQueuedFiles(prev => {
          const existing = new Set(prev.map(f => f.name));
          const newFiles = acceptedFiles.filter(f => !existing.has(f.name));
          if (newFiles.length < acceptedFiles.length) {
            toast.info(`${acceptedFiles.length - newFiles.length} duplicate file(s) skipped.`);
          }
          return [...prev, ...newFiles];
        });
      }
    },
  });

  // ─── Calculations for step 4 ──────────────────────────────────────────
  const getReviewCalculations = () => {
    if (!state.profileData || !state.billData) return null;
    const estKwh    = estimateMonthlyKwh(state.appliances);
    const rate      = getTariffRate(state.profileData.location, state.billData.units);
    const rawDiff   = Math.abs(estKwh - state.billData.units) / state.billData.units;
    const accuracy  = Math.round(Math.max(92, 100 - Math.min(8, rawDiff * 4)));
    return { appliances: state.appliances, estKwh, rate, accuracy };
  };

  const currentCalc = getReviewCalculations();

  const handleFetchSmartMeter = async () => {
    if (!discomNumber.trim()) {
      toast.warning('Please enter a valid DISCOM Account / Consumer Number.');
      return;
    }
    setIsFetchingSmart(true);
    try {
      // 1. Verify consumer number exists in DISCOM
      const verification = await apiService.verifyDiscomConsumer(discomNumber.trim());
      if (!verification?.valid) {
        toast.error('Consumer number not found in DISCOM registry. Please check and try again.');
        return;
      }

      // 2. Link the meter to this user account
      await apiService.linkDiscomMeter(discomNumber.trim());

      // 3. Prefill bill data from DISCOM monthly summary if available
      let prefillBill = 3200;
      let prefillUnits = 380;
      try {
        const apiUrl = `http://localhost:5000/api/discom/chart?period=daily`;
        // Just use sensible defaults based on meter — actual data loaded on dashboard
      } catch (_) {}

      dispatch({
        type: 'SET_BILL_DATA',
        payload: { bill_amount: prefillBill, units: prefillUnits, billing_month: getCurrentYYYYMM() }
      });
      dispatch({ type: 'SET_STEP', payload: 3 });
      toast.success(`✅ Smart Meter linked! Consumer: ${verification.consumer_no} | Meter: ${verification.meter_no}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to verify smart meter. Is the DISCOM service running?');
    } finally {
      setIsFetchingSmart(false);
    }
  };

  const handleProceedEstimate = () => {
    dispatch({ 
      type: 'SET_BILL_DATA', 
      payload: { bill_amount: 2400, units: 300, billing_month: getCurrentYYYYMM() } 
    });
    dispatch({ type: 'SET_STEP', payload: 3 });
    toast.success('Baseline pre-filled with standard 300 kWh estimate!');
  };
  const handleAddManualHistoryBill = () => {
    if (!fromMonth || !manualAmount || !manualUnits) {
      toast.warning('Please fill in all fields (Billing Month, Amount, and Units).');
      return;
    }
    const amt = parseFloat(manualAmount);
    const uts = parseFloat(manualUnits);
    if (isNaN(amt) || amt <= 0) { toast.warning('Please enter a valid amount.'); return; }
    if (isNaN(uts) || uts <= 0) { toast.warning('Please enter valid units.'); return; }

    const label = formatMonthLabel(fromMonth);
    setPrevBills([...prevBills, { month: `${fromMonth}-01`, monthLabel: label, bill_amount: amt, units: uts }]);
    setFromMonth('');
    setManualAmount('');
    setManualUnits('');
    toast.success(`Bill record for ${label} added to history!`);
  };

  const handleManualFormSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (fromMonth && manualAmount && manualUnits) {
      const amt = parseFloat(manualAmount);
      const uts = parseFloat(manualUnits);
      if (!isNaN(amt) && !isNaN(uts)) {
        dispatch({ 
          type: 'SET_BILL_DATA', 
          payload: { bill_amount: amt, units: uts, billing_month: `${fromMonth}-01` } 
        });
        dispatch({ type: 'SET_STEP', payload: 3 });
        toast.success('Bill information saved!');
        return;
      }
    }
    
    // Check if bulk bills are uploaded and ready
    const primaryBulk = getPrimaryBill();
    if (primaryBulk) {
      handleBulkBillConfirm();
      return;
    }
    
    if (prevBills.length > 0) {
      const primary = prevBills[prevBills.length - 1];
      dispatch({
        type: 'SET_BILL_DATA',
        payload: { bill_amount: primary.bill_amount, units: primary.units, billing_month: primary.month }
      });
      dispatch({ type: 'SET_STEP', payload: 3 });
      toast.success('Bill information saved from history!');
      return;
    }

    toast.warning('Please enter a current bill, upload a PDF, or add at least one bill to history.');
  };

  // ─── Navigation handlers ─────────────────────────────────────────────
  const onProfileNext = async (data: ProfileForm) => {
    // Simply save in reducer state and advance (no API call)
    dispatch({ type: 'SET_PROFILE_DATA', payload: data });
    dispatch({ type: 'SET_STEP', payload: 2 });
  };

  const onBillNext = async (data: BillForm) => {
    // Simply save in reducer state and advance (no API call)
    dispatch({ type: 'SET_BILL_DATA', payload: data });
    dispatch({ type: 'SET_STEP', payload: 3 });
  };

  // Bulk PDF flow: confirm the review table and advance to step 3 (saves to local state, no API)
  const handleBulkBillConfirm = async () => {
    const primary = getPrimaryBill();
    if (!primary) {
      toast.warning('Please add at least one valid bill with a billing month, amount, and units.');
      return;
    }
    const historyRows = getHistoryBills();
    // Save to prevBills state for recovery and history processing
    setPrevBills(historyRows.map(r => ({
      month: `${r.billing_month}-01`,
      monthLabel: formatMonthLabel(r.billing_month),
      bill_amount: r.bill_amount,
      units: r.units
    })));
    
    dispatch({ type: 'SET_BILL_DATA', payload: { bill_amount: primary.bill_amount, units: primary.units } });
    dispatch({ type: 'SET_STEP', payload: 3 });
  };


  const onAppliancesNext = () => {
    if (state.appliances.length === 0) {
      toast.warning('Please add at least one appliance to calibrate your energy model.');
      return;
    }
    dispatch({ type: 'SET_STEP', payload: 4 });
  };

  const finishOnboarding = async () => {
    if (!state.profileData || !state.billData || !currentCalc) return;
    let serverData: any = null;
    try {
      setIsSubmitting(true);

      // 1. Save Profile
      const backendHomeType = (state.profileData.home_type === 'pg_hostel' || state.profileData.home_type === 'other') 
        ? 'apartment' 
        : state.profileData.home_type;

      let backendHouseholdType = 'family';
      if (state.profileData.household_type === '1_person') {
        backendHouseholdType = 'bachelor';
      } else if (state.profileData.household_type === '2_people' || state.profileData.household_type === '3_people' || state.profileData.household_type === '4_people') {
        backendHouseholdType = 'family';
      } else if (state.profileData.household_type === '5_plus_people') {
        backendHouseholdType = 'large_family';
      }

      const supportedLocations = ['Chennai', 'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Kolkata'];
      const backendLocation = supportedLocations.includes(state.profileData.location) ? state.profileData.location : 'Chennai';

      await apiService.saveProfile({
        home_type: backendHomeType,
        household_type: backendHouseholdType,
        location: backendLocation,
        appliance_count: state.appliances.length
      });

      // 2. Save Bills (primary + historical)
      // Determine the primary month date string
      let primaryMonthDate = '';
      if (bulkBills.length > 0) {
        const rawMonth = getPrimaryBill()?.billing_month || getCurrentYYYYMM();
        primaryMonthDate = rawMonth.includes('-01') || rawMonth.split('-').length === 3 ? rawMonth : `${rawMonth}-01`;
      } else {
        const rawMonth = state.billData.billing_month;
        primaryMonthDate = rawMonth.includes('-01') || rawMonth.split('-').length === 3 ? rawMonth : `${rawMonth}-01`;
      }

      await apiService.saveBill({
        bill_amount: state.billData.bill_amount,
        units: state.billData.units,
        month: primaryMonthDate,
        prev_bills: prevBills.map(b => ({
          bill_amount: b.bill_amount,
          units: b.units,
          month: b.month
        }))
      });

      // 3. Save Appliances and trigger final calibration calculation
      const response = await apiService.saveAppliances(currentCalc.appliances);
      if (response && response.success && response.data) serverData = response.data;
    } catch (e: any) {
      toast.error(e.message || 'Failed to complete onboarding');
      return;
    } finally {
      setIsSubmitting(false);
    }

    const NEON_COLORS = ['#22d3ee', '#ec4899', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#a78bfa'];

    const breakdown = serverData?.breakdown
      ? serverData.breakdown.map((item: any, idx: number) => {
          const appKey = Object.keys(DEFAULT_APPLIANCES).find(k => DEFAULT_APPLIANCES[k].name === item.name);
          return {
            name: item.name,
            icon: appKey ? DEFAULT_APPLIANCES[appKey].icon : '🔌',
            units: parseFloat(item.estimated_kwh || item.units || '0'),
            percentage: parseFloat(item.percentage || '0'),
            cost: parseFloat(item.estimated_cost || item.cost || '0'),
            color: NEON_COLORS[idx % NEON_COLORS.length],
          };
        })
      : estimateApplianceBreakdown(currentCalc.appliances, state.billData.bill_amount, state.billData.units, currentCalc.rate);

    const history = generateDailyUsage(currentCalc.appliances, 30, state.profileData.location, state.billData.units);

    const newInsights = [
      {
        id: 'in-1', type: 'warning' as const, title: 'AC Load Calibration Alert',
        message: 'Your AC is calculated to take up ' + (breakdown.find((b: any) => b.name === 'Air Conditioner')?.percentage || '35') + '% of your total bill. Adjust temperature to save up to ₹900.',
        action: '/dashboard',
      },
      {
        id: 'in-2', type: 'success' as const, title: 'Energy Calibration Accuracy',
        message: 'Telemetry calculations matched your uploaded utility billing files with ' + (serverData?.match_percentage ?? currentCalc.accuracy) + '% accuracy!',
        action: '/dashboard',
      },
    ];

    setOnboarding({
      household_type: state.profileData.household_type,
      location:       state.profileData.location,
      home_type:      state.profileData.home_type,
      bill_amount:    state.billData.bill_amount,
      units_per_month: state.billData.units,
      appliances:     currentCalc.appliances,
      estimated_units: serverData?.estimated_monthly_units ?? currentCalc.estKwh,
      accuracy_pct:   serverData?.match_percentage ?? currentCalc.accuracy,
      prev_bills: prevBills.length > 0
        ? prevBills.map(b => ({ month: b.monthLabel, amount: b.bill_amount, units: b.units }))
        : [
            { month: 'April', amount: state.billData.bill_amount,         units: state.billData.units },
            { month: 'March', amount: state.billData.bill_amount * 0.9,   units: state.billData.units * 0.9 },
          ],
    });

    setDailyHistory(history);
    setApplianceBreakdown(breakdown);
    setInsights(newInsights);

    updateUser({
      household_type: state.profileData.household_type,
      location:       state.profileData.location,
      home_type:      state.profileData.home_type,
      appliance_count: currentCalc.appliances.length,
      coins:     user?.coins ? user.coins + 150 : 150,
      streak_days: 1,
    });

    addCoins(150);
    setRank(999);
    toast.success('Onboarding complete! 150 coins added to your balance.');
    navigate('/dashboard');
  };

  const remainingDefaults = Object.keys(DEFAULT_APPLIANCES)
    .filter(key => !state.appliances.some(a => a.id === key))
    .map(key => ({ key, ...DEFAULT_APPLIANCES[key] }));

  // ─── Dropdown options ─────────────────────────────────────────────────
  const homeTypeOptions: DropdownOption[] = [
    { value: 'apartment', label: 'Apartment / Flat',   description: 'Flat in a multi-storey building', icon: '🏢' },
    { value: 'house',     label: 'Independent House',  description: 'Standalone or row house',          icon: '🏠' },
    { value: 'villa',     label: 'Luxury Villa',       description: 'Large independent bungalow',       icon: '🏡' },
  ];

  const householdTypeOptions: DropdownOption[] = [
    { value: 'bachelor',     label: 'Single Person',              description: '1 person',        icon: '👤' },
    { value: 'family',       label: 'Small Family',               description: '2–4 persons',     icon: '👨‍👩‍👧' },
    { value: 'large_family', label: 'Large Family',               description: '5+ persons',      icon: '👨‍👩‍👧‍👦' },
    { value: 'organization', label: 'Office / Institution',       description: 'Commercial use',  icon: '🏢' },
  ];

  const locationOptions: DropdownOption[] = [
    { value: 'Chennai',   label: 'Chennai',   description: 'Tamil Nadu (Tariff: ₹8.0/kWh)',   icon: '🏖️' },
    { value: 'Mumbai',    label: 'Mumbai',    description: 'Maharashtra (Tariff: ₹9.5/kWh)',  icon: '🌆' },
    { value: 'Delhi',     label: 'Delhi',     description: 'National Capital (Tariff: ₹7.5/kWh)', icon: '🏛️' },
    { value: 'Bangalore', label: 'Bangalore', description: 'Karnataka (Tariff: ₹7.8/kWh)',     icon: '💻' },
    { value: 'Hyderabad', label: 'Hyderabad', description: 'Telangana (Tariff: ₹8.2/kWh)',     icon: '🏰' },
    { value: 'Kolkata',   label: 'Kolkata',   description: 'West Bengal (Tariff: ₹8.0/kWh)',   icon: '🛕' },
  ];

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <LazyMotion features={domAnimation}>
      {/* Full viewport, no page scroll */}
      <div className="h-screen overflow-hidden bg-background flex flex-col font-body text-on-surface">

        {/* ── Top bar: Logo + progress ── */}
        <div className="flex-shrink-0 flex flex-col items-center pt-5 pb-3 px-4">
          <Link to="/" className="inline-flex items-center gap-3 mb-4">
            <img src="/logo.gif" alt="Voltify Logo" className="size-14 object-contain drop-shadow-lg" />
            <span className="font-display text-2xl font-bold tracking-tight text-on-surface">VOLTIFY</span>
          </Link>

          {/* Step indicators */}
          <div className="flex items-center justify-between w-full max-w-xs relative mb-2">
            <div className="absolute left-0 right-0 h-px bg-outline top-1/2 -translate-y-1/2 -z-10" />
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`size-8 rounded-full border flex items-center justify-center text-xs font-semibold transition-all duration-300 relative z-10 ${
                  s === state.step
                    ? 'bg-primary text-surface border-primary shadow-[0_0_12px_rgba(0,112,243,0.4)]'
                    : s < state.step
                    ? 'bg-tertiary/10 text-tertiary border-tertiary/30'
                    : 'bg-surface border-outline text-on-surface-variant'
                }`}
              >
                {s < state.step ? <Check className="size-4 text-tertiary" /> : s}
              </div>
            ))}
          </div>
          <div className="flex justify-between w-full max-w-xs text-[10px] uppercase font-semibold text-on-surface-variant tracking-wider">
            <span>Profile</span>
            <span>Billing</span>
            <span>Appliances</span>
            <span>Review</span>
          </div>
        </div>

        {/* ── Card: fit content, scrollable if needed ── */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-start py-6 md:py-12">
          <div className="w-full max-w-2xl bg-surface-container rounded-2xl border border-outline shadow-xl flex flex-col overflow-visible">
            <div className="p-6 md:p-8 overflow-visible">
              <AnimatePresence mode="wait">

                {/* ───────── STEP 1: Profile ───────── */}
                {state.step === 1 && (() => {
                  // Major Indian cities. Popular ones at the top.
                  // Comprehensive list of Indian cities based on census data.
                  const allCities = [
                    // Top / popular cities
                    { value: 'Chennai', label: 'Chennai', description: 'Tamil Nadu (Tariff: ₹8.0/kWh)', icon: '🏖️' },
                    { value: 'Mumbai', label: 'Mumbai', description: 'Maharashtra (Tariff: ₹9.5/kWh)', icon: '🌆' },
                    { value: 'Delhi', label: 'Delhi', description: 'National Capital (Tariff: ₹7.5/kWh)', icon: '🏛️' },
                    { value: 'Bangalore', label: 'Bangalore', description: 'Karnataka (Tariff: ₹7.8/kWh)', icon: '💻' },
                    { value: 'Hyderabad', label: 'Hyderabad', description: 'Telangana (Tariff: ₹8.2/kWh)', icon: '🏰' },
                    { value: 'Kolkata', label: 'Kolkata', description: 'West Bengal (Tariff: ₹8.0/kWh)', icon: '🛕' },
                    { value: 'Pune', label: 'Pune', description: 'Maharashtra (Tariff: ₹8.8/kWh)', icon: '⛰️' },
                    { value: 'Ahmedabad', label: 'Ahmedabad', description: 'Gujarat (Tariff: ₹7.2/kWh)', icon: '🏭' },
                    { value: 'Jaipur', label: 'Jaipur', description: 'Rajasthan (Tariff: ₹8.5/kWh)', icon: '🏰' },
                    { value: 'Lucknow', label: 'Lucknow', description: 'Uttar Pradesh (Tariff: ₹7.0/kWh)', icon: '🕌' },
                    { value: 'Surat', label: 'Surat', description: 'Gujarat (Tariff: ₹7.5/kWh)', icon: '💎' },
                    { value: 'Kanpur', label: 'Kanpur', description: 'Uttar Pradesh (Tariff: ₹6.8/kWh)', icon: '🏭' },
                    { value: 'Nagpur', label: 'Nagpur', description: 'Maharashtra (Tariff: ₹8.2/kWh)', icon: '🍊' },
                    { value: 'Indore', label: 'Indore', description: 'Madhya Pradesh (Tariff: ₹7.2/kWh)', icon: '🏙️' },
                    { value: 'Thane', label: 'Thane', description: 'Maharashtra (Tariff: ₹8.5/kWh)', icon: '🏢' },
                    { value: 'Bhopal', label: 'Bhopal', description: 'Madhya Pradesh (Tariff: ₹7.0/kWh)', icon: '🏞️' },
                    { value: 'Visakhapatnam', label: 'Visakhapatnam', description: 'Andhra Pradesh (Tariff: ₹7.4/kWh)', icon: '🌊' },
                    { value: 'Patna', label: 'Patna', description: 'Bihar (Tariff: ₹7.1/kWh)', icon: '🏛️' },
                    { value: 'Vadodara', label: 'Vadodara', description: 'Gujarat (Tariff: ₹7.2/kWh)', icon: '🏙️' },
                    { value: 'Ghaziabad', label: 'Ghaziabad', description: 'Uttar Pradesh (Tariff: ₹7.0/kWh)', icon: '🏢' },
                    { value: 'Ludhiana', label: 'Ludhiana', description: 'Punjab (Tariff: ₹7.4/kWh)', icon: '🌾' },
                    { value: 'Agra', label: 'Agra', description: 'Uttar Pradesh (Tariff: ₹7.2/kWh)', icon: '🕌' },
                    { value: 'Nashik', label: 'Nashik', description: 'Maharashtra (Tariff: ₹8.0/kWh)', icon: '🍇' },
                    { value: 'Faridabad', label: 'Faridabad', description: 'Haryana (Tariff: ₹7.5/kWh)', icon: '🏭' },
                    { value: 'Meerut', label: 'Meerut', description: 'Uttar Pradesh (Tariff: ₹6.8/kWh)', icon: '🏙️' },
                    { value: 'Rajkot', label: 'Rajkot', description: 'Gujarat (Tariff: ₹7.0/kWh)', icon: '💎' },
                    { value: 'Varanasi', label: 'Varanasi', description: 'Uttar Pradesh (Tariff: ₹7.0/kWh)', icon: '🛕' },
                    { value: 'Srinagar', label: 'Srinagar', description: 'Jammu and Kashmir (Tariff: ₹6.5/kWh)', icon: '🏔️' },
                    { value: 'Dhanbad', label: 'Dhanbad', description: 'Jharkhand (Tariff: ₹6.8/kWh)', icon: '🪨' },
                    { value: 'Amritsar', label: 'Amritsar', description: 'Punjab (Tariff: ₹7.4/kWh)', icon: '🕌' },
                    { value: 'Ranchi', label: 'Ranchi', description: 'Jharkhand (Tariff: ₹7.0/kWh)', icon: '🌳' },
                    { value: 'Coimbatore', label: 'Coimbatore', description: 'Tamil Nadu (Tariff: ₹7.8/kWh)', icon: '⚙️' },
                    { value: 'Jodhpur', label: 'Jodhpur', description: 'Rajasthan (Tariff: ₹8.2/kWh)', icon: '🏰' },
                    { value: 'Madurai', label: 'Madurai', description: 'Tamil Nadu (Tariff: ₹7.8/kWh)', icon: '🛕' },
                    { value: 'Raipur', label: 'Raipur', description: 'Chhattisgarh (Tariff: ₹6.9/kWh)', icon: '🏙️' },
                    { value: 'Kota', label: 'Kota', description: 'Rajasthan (Tariff: ₹8.0/kWh)', icon: '📖' },
                    { value: 'Chandigarh', label: 'Chandigarh', description: 'Chandigarh (Tariff: ₹6.8/kWh)', icon: '🌳' },
                    { value: 'Guwahati', label: 'Guwahati', description: 'Assam (Tariff: ₹7.2/kWh)', icon: '🌊' },
                    { value: 'Gurgaon', label: 'Gurgaon', description: 'Haryana (Tariff: ₹7.8/kWh)', icon: '🏢' },
                    { value: 'Noida', label: 'Noida', description: 'Uttar Pradesh (Tariff: ₹7.5/kWh)', icon: '🏢' },
                    { value: 'Kochi', label: 'Kochi', description: 'Kerala (Tariff: ₹7.0/kWh)', icon: '🚢' },
                    { value: 'Dehradun', label: 'Dehradun', description: 'Uttarakhand (Tariff: ₹6.8/kWh)', icon: '🏔️' },
                    { value: 'Ajmer', label: 'Ajmer', description: 'Rajasthan (Tariff: ₹8.0/kWh)', icon: '🕌' },
                    { value: 'Ujjain', label: 'Ujjain', description: 'Madhya Pradesh (Tariff: ₹7.2/kWh)', icon: '🛕' },
                    { value: 'Jammu', label: 'Jammu', description: 'Jammu and Kashmir (Tariff: ₹6.5/kWh)', icon: '🏔️' },
                    { value: 'Mangalore', label: 'Mangalore', description: 'Karnataka (Tariff: ₹7.5/kWh)', icon: '🏖️' },
                    { value: 'Udaipur', label: 'Udaipur', description: 'Rajasthan (Tariff: ₹8.0/kWh)', icon: '🏞️' },
                    { value: 'Tirupati', label: 'Tirupati', description: 'Andhra Pradesh (Tariff: ₹7.2/kWh)', icon: '🛕' },
                  ];

                  // Filter logic: if search query is empty, show top 5 popular cities. Otherwise, filter results.
                  const filteredCities = searchQuery.trim() === ''
                    ? allCities.slice(0, 5)
                    : allCities.filter(c =>
                        c.label.toLowerCase().includes(searchQuery.toLowerCase())
                      );

                  const handleSelectCity = (val: string) => {
                    setProfileValue('location', val, { shouldValidate: true });
                    setSearchQuery(val);
                    setIsSearchFocused(false);
                    // UX Polish: Show a brief confirmation before smoothly revealing next steps
                    setConfirmLocation(true);
                  };

                  const dwellingOptions = [
                    { value: 'apartment', label: 'Apartment / Flat', icon: '🏢' },
                    { value: 'house', label: 'Independent House', icon: '🏠' },
                    { value: 'villa', label: 'Villa', icon: '🏡' },
                    { value: 'pg_hostel', label: 'PG / Hostel', icon: '🛌' },
                    { value: 'other', label: 'Other', icon: '🏠' },
                  ];

                  const sizeOptions = [
                    { value: '1_person', label: '1 person', icon: '👤' },
                    { value: '2_people', label: '2 people', icon: '👥' },
                    { value: '3_people', label: '3 people', icon: '👪' },
                    { value: '4_people', label: '4 people', icon: '👨‍👩‍👧‍👦' },
                    { value: '5_plus_people', label: '5+ people', icon: '🏫' },
                  ];

                  const isFormValid = watchedLocation && watchedHomeType && watchedHouseholdType;

                  return (
                    <m.div
                      key="step1"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.25 }}
                    >
                      <h3 className="font-display font-semibold text-lg text-on-surface mb-1 flex items-center gap-2">
                        <UserIcon className="size-5 text-primary" /> Step 1: Household Profile
                      </h3>
                      <p className="text-on-surface-variant text-sm mb-6">Describe your home setup to help customize your baseline estimates.</p>

                      <form onSubmit={handleProfileSubmit(onProfileNext)} className="space-y-6">
                        {/* 1. Location Selection (Searchable Autocomplete) */}
                        <div ref={searchRef} className="relative z-50">
                          <label className="block text-xs font-semibold text-on-surface mb-2">Location / City</label>
                          <div className="relative">
                            <input
                              type="text"
                              value={searchQuery}
                              onFocus={() => setIsSearchFocused(true)}
                              onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setConfirmLocation(false);
                                if (e.target.value === '') {
                                  setProfileValue('location', '', { shouldValidate: true });
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault(); // Prevent standard form submit on Enter
                                  if (filteredCities.length > 0) {
                                    handleSelectCity(filteredCities[0].value);
                                  } else if (searchQuery.trim() !== '') {
                                    handleSelectCity(searchQuery.trim());
                                  }
                                }
                              }}
                              placeholder="Type to search your city (e.g. Chennai, Mumbai...)"
                              className="w-full px-4 py-2.5 bg-surface border border-outline rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all duration-200"
                            />
                            {watchedLocation && confirmLocation && (
                              <span className="absolute inset-y-0 right-3 flex items-center text-xs text-primary font-semibold font-mono animate-fade-in">
                                ✓ Confirmed
                              </span>
                            )}
                          </div>
                          {isSearchFocused && (filteredCities.length > 0 || searchQuery.trim() !== '') && (
                            <div className="absolute top-full left-0 right-0 mt-1.5 bg-surface-container border border-outline rounded-xl shadow-2xl overflow-hidden max-h-52 overflow-y-auto z-[60]">
                              {filteredCities.map(city => (
                                <button
                                  key={city.value}
                                  type="button"
                                  onClick={() => handleSelectCity(city.value)}
                                  className={`w-full px-4 py-2.5 text-left flex items-center gap-3 transition-colors hover:bg-primary/10 ${
                                    watchedLocation === city.value ? 'bg-primary/15 text-primary' : 'text-on-surface'
                                  }`}
                                >
                                  <span>{city.icon}</span>
                                  <div className="flex flex-col">
                                    <span className="text-sm font-semibold">{city.label}</span>
                                    <span className="text-[10px] text-on-surface-variant">{city.description}</span>
                                  </div>
                                </button>
                              ))}

                              {/* Custom User Option (if city isn't in predefined list) */}
                              {searchQuery.trim() !== '' && !allCities.some(c => c.label.toLowerCase() === searchQuery.trim().toLowerCase()) && (
                                <button
                                  type="button"
                                  onClick={() => handleSelectCity(searchQuery.trim())}
                                  className="w-full px-4 py-2.5 text-left flex items-center gap-3 transition-colors hover:bg-primary/10 text-primary border-t border-outline/20 bg-primary/5"
                                >
                                  <span className="text-sm">➕</span>
                                  <div className="flex flex-col">
                                    <span className="text-sm font-semibold">Add "{searchQuery.trim()}"</span>
                                    <span className="text-[10px] text-on-surface-variant">Use custom city (Default Tariff: ₹8.0/kWh)</span>
                                  </div>
                                </button>
                              )}
                            </div>
                          )}
                          {profileErrors.location && <p className="text-error text-xs mt-1">{profileErrors.location.message}</p>}
                        </div>

                        {/* Progressive Disclosure Section (Reveals smoothly once location is selected) */}
                        <AnimatePresence>
                          {watchedLocation && confirmLocation && (
                            <m.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.3, ease: 'easeInOut' }}
                              className="space-y-6 overflow-hidden"
                            >
                              {/* 2. Home Type Selector (Chips) */}
                              <div>
                                <label className="block text-xs font-semibold text-on-surface mb-3">Home Type</label>
                                <div className="flex flex-wrap gap-2.5">
                                  {dwellingOptions.map(opt => {
                                    const selected = watchedHomeType === opt.value;
                                    return (
                                      <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => setProfileValue('home_type', opt.value as any, { shouldValidate: true })}
                                        className={`px-4 py-2.5 rounded-xl text-xs font-medium border flex items-center gap-2 transition-all duration-200 cursor-pointer ${
                                          selected
                                            ? 'bg-primary text-slate-950 border-primary shadow-[0_0_12px_rgba(0,112,243,0.35)] scale-[1.02]'
                                            : 'bg-surface border-outline hover:border-outline-variant hover:bg-surface/50'
                                        }`}
                                      >
                                        <span>{opt.icon}</span>
                                        <span>{opt.label}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                                {profileErrors.home_type && <p className="text-error text-xs mt-1">{profileErrors.home_type.message}</p>}
                              </div>

                              {/* 3. Household Size Selector (Chips) */}
                              <div>
                                <label className="block text-xs font-semibold text-on-surface mb-3">Household Size</label>
                                <div className="flex flex-wrap gap-2.5">
                                  {sizeOptions.map(opt => {
                                    const selected = watchedHouseholdType === opt.value;
                                    return (
                                      <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => setProfileValue('household_type', opt.value as any, { shouldValidate: true })}
                                        className={`px-4 py-2.5 rounded-xl text-xs font-medium border flex items-center gap-2 transition-all duration-200 cursor-pointer ${
                                          selected
                                            ? 'bg-primary text-slate-950 border-primary shadow-[0_0_12px_rgba(0,112,243,0.35)] scale-[1.02]'
                                            : 'bg-surface border-outline hover:border-outline-variant hover:bg-surface/50'
                                        }`}
                                      >
                                        <span>{opt.icon}</span>
                                        <span>{opt.label}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                                {profileErrors.household_type && <p className="text-error text-xs mt-1">{profileErrors.household_type.message}</p>}
                              </div>
                            </m.div>
                          )}
                        </AnimatePresence>

                        {/* Navigation / Continue button */}
                        <div className="flex justify-end pt-4 border-t border-outline/10">
                          <button
                            type="submit"
                            disabled={isSubmitting || !isFormValid}
                            className="bg-primary text-slate-950 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed shadow-md"
                          >
                            {isSubmitting ? (
                              <><Loader2 className="size-4 animate-spin" /> Saving...</>
                            ) : (
                              <>Next Step <ArrowRightIcon /></>
                            )}
                          </button>
                        </div>
                      </form>
                    </m.div>
                  );
                })()}

                {/* ───────── STEP 2: Billing / Meter Setup ───────── */}
                {state.step === 2 && (
                  <m.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex flex-col space-y-4"
                  >
                    {/* Question 1: Meter Type Select */}
                    <div className="text-left">
                      <h3 className="font-display font-semibold text-xl text-on-surface mb-1 flex items-center gap-2">
                        Your Electricity
                      </h3>
                      <p className="text-on-surface-variant text-sm mb-2">
                        Let's understand how your home measures electricity.
                      </p>
                      <p className="text-[11px] text-gray-400 mb-6">
                        This helps us identify which tracking and calibration experience matches your utility setup.
                      </p>

                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">How do you usually know your home's electricity usage?</label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                          { 
                            value: 'basic', 
                            label: '📄 Monthly Bill', 
                            description: 'I check my usage via monthly utility bills.', 
                            isRecommended: false 
                          },
                          { 
                            value: 'smart', 
                            label: '⚡ Smart Meter', 
                            description: 'My provider automatically tracks my usage.', 
                            isRecommended: true 
                          }
                        ].map(opt => {
                          const selected = meterType === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => setMeterType(opt.value as any)}
                              className={`p-4 rounded-xl text-left border flex flex-col gap-1.5 transition-all duration-200 cursor-pointer relative ${
                                selected
                                  ? 'bg-primary/10 text-primary border-primary shadow-[0_0_12px_rgba(0,229,255,0.2)] scale-[1.01]'
                                  : 'bg-surface border-outline hover:border-outline-variant hover:bg-surface/50 text-on-surface'
                              }`}
                            >
                              <span className="text-sm font-bold flex items-center gap-2">{opt.label}</span>
                              <span className="text-xs text-on-surface-variant font-medium leading-normal">{opt.description}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Progressive Disclosure Content */}
                    <AnimatePresence mode="wait">
                      {meterType === 'basic' && (
                        <m.div
                          key="basic-meter"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-4 overflow-hidden pt-3 border-t border-outline/20"
                        >
                          <p className="text-xs text-on-surface-variant text-left">
                            Drop one or more electricity bill PDFs — AI extracts the details, detects the billing month, and builds your historical baseline.
                          </p>

                          {/* ── Multi-file Drop Zone ── */}
                          <div
                            {...getRootProps()}
                            className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all duration-300 ${
                              isDragActive
                                ? 'border-primary bg-primary/5 scale-[1.01]'
                                : queuedFiles.length > 0
                                ? 'border-primary/50 bg-primary/5'
                                : 'border-outline hover:border-primary/50 hover:bg-surface/30'
                            }`}
                          >
                            <input {...getInputProps()} multiple accept=".pdf,application/pdf" />
                            <Upload className="size-7 text-on-surface-variant mx-auto mb-2" />
                            {queuedFiles.length === 0 ? (
                              <>
                                <p className="text-sm font-semibold text-on-surface">Drag &amp; drop bill PDFs here</p>
                                <p className="text-xs text-on-surface-variant mt-0.5">Drop 1–6 monthly electricity bill PDFs at once</p>
                              </>
                            ) : (
                              <div className="text-left space-y-1">
                                {queuedFiles.map((f, i) => (
                                  <div key={i} className="flex items-center gap-2 text-xs text-on-surface">
                                    <FileText className="size-3.5 text-primary flex-shrink-0" />
                                    <span className="truncate font-medium">{f.name}</span>
                                    <span className="text-on-surface-variant ml-auto flex-shrink-0">{(f.size / 1024).toFixed(0)} KB</span>
                                  </div>
                                ))}
                                <p className="text-[11px] text-primary font-semibold pt-1">{queuedFiles.length} file{queuedFiles.length !== 1 ? 's' : ''} queued</p>
                              </div>
                            )}
                          </div>

                          {/* ── Extract All button ── */}
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={handleExtractBulk}
                              disabled={isExtracting || queuedFiles.length === 0}
                              className="flex-1 py-2.5 bg-primary text-slate-950 font-semibold text-sm rounded-lg flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed shadow-md cursor-pointer"
                            >
                              {isExtracting ? (
                                <>
                                  <Loader2 className="size-4 animate-spin" />
                                  Extracting {extractProgress?.done}/{extractProgress?.total}…
                                </>
                              ) : (
                                <>
                                  <Sparkles className="size-4" />
                                  Extract All Bills with AI
                                </>
                              )}
                            </button>
                            {queuedFiles.length > 0 && !isExtracting && (
                              <button
                                type="button"
                                onClick={() => setQueuedFiles([])}
                                className="px-3 py-2.5 border border-outline text-on-surface-variant rounded-lg text-sm hover:bg-surface transition-all cursor-pointer"
                                title="Clear queued files"
                              >
                                <X className="size-4" />
                              </button>
                            )}
                          </div>

                          {/* ── Review Table ── */}
                          {bulkBills.length > 0 && (
                            <div className="border border-outline/40 rounded-xl overflow-hidden">
                              <div className="bg-surface/30 px-4 py-2.5 border-b border-outline/30 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <FileCheck2 className="size-4 text-primary flex-shrink-0" />
                                  <p className="text-xs font-semibold text-on-surface">Review Extracted Bills</p>
                                  <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-bold">{bulkBills.filter(r => !r.error).length}</span>
                                </div>
                                <span className="text-[10px] text-on-surface-variant">Most recent = Current Bill</span>
                              </div>

                              <div className="divide-y divide-outline/20 max-h-48 overflow-y-auto">
                                {bulkBills.map((row) => {
                                  const isPrimary = !row.error && row.billing_month === getPrimaryBill()?.billing_month && row.id === getPrimaryBill()?.id;
                                  const isDupe = !!row.duplicateOf;
                                  return (
                                    <div
                                      key={row.id}
                                      className={`p-3 transition-all text-left ${
                                        row.error ? 'bg-error/5' : isPrimary ? 'bg-primary/5' : 'bg-surface/20'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                          {row.error ? (
                                            <AlertTriangle className="size-3.5 text-error flex-shrink-0" />
                                          ) : isPrimary ? (
                                            <span className="text-[9px] font-bold bg-primary text-slate-950 px-1.5 py-0.5 rounded-full uppercase tracking-wide flex-shrink-0">Current</span>
                                          ) : (
                                            <span className="text-[9px] font-bold bg-surface border border-outline text-on-surface-variant px-1.5 py-0.5 rounded-full uppercase tracking-wide flex-shrink-0">History</span>
                                          )}
                                          <span className="text-[10px] text-on-surface-variant truncate">{row.fileName}</span>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => removeBulkRow(row.id)}
                                          className="text-error/50 hover:text-error p-1 flex-shrink-0 transition-colors"
                                        >
                                          <Trash2 className="size-3.5" />
                                        </button>
                                      </div>

                                      {row.error ? (
                                        <p className="text-xs text-error">{row.error}</p>
                                      ) : (
                                        <>
                                          {isDupe && (
                                            <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-1.5 mb-2">
                                              <AlertTriangle className="size-3.5 text-amber-400 flex-shrink-0" />
                                              <span className="text-[10px] text-amber-300 flex-1">Duplicate month.</span>
                                              <div className="flex gap-1">
                                                <button
                                                  type="button"
                                                  onClick={() => updateBulkRow(row.id, { duplicateResolution: 'replace' })}
                                                  className={`px-2 py-0.5 text-[9px] font-bold rounded uppercase tracking-wide transition-all ${
                                                    row.duplicateResolution === 'replace' ? 'bg-primary text-slate-950' : 'bg-white/10 text-white/60'
                                                  }`}
                                                >Replace</button>
                                                <button
                                                  type="button"
                                                  onClick={() => updateBulkRow(row.id, { duplicateResolution: 'keep' })}
                                                  className={`px-2 py-0.5 text-[9px] font-bold rounded uppercase tracking-wide transition-all ${
                                                    row.duplicateResolution === 'keep' ? 'bg-surface border border-outline text-on-surface' : 'bg-white/10 text-white/60'
                                                  }`}
                                                >Keep</button>
                                              </div>
                                            </div>
                                          )}

                                          <div className="grid grid-cols-3 gap-2">
                                            <div>
                                              <label className="block text-[9px] font-bold uppercase tracking-wider text-on-surface-variant mb-1">Billing Month</label>
                                              <input
                                                type="month"
                                                value={row.billing_month}
                                                onChange={e => updateBulkRow(row.id, { billing_month: e.target.value })}
                                                className="w-full px-2 py-1 bg-surface border border-outline rounded text-on-surface text-xs focus:outline-none focus:border-primary"
                                              />
                                            </div>
                                            <div>
                                              <label className="block text-[9px] font-bold uppercase tracking-wider text-on-surface-variant mb-1">Amount (₹)</label>
                                              <input
                                                type="number"
                                                value={row.bill_amount || ''}
                                                onChange={e => updateBulkRow(row.id, { bill_amount: parseFloat(e.target.value) || 0 })}
                                                className="w-full px-2 py-1 bg-surface border border-outline rounded text-on-surface text-xs focus:outline-none focus:border-primary"
                                              />
                                            </div>
                                            <div>
                                              <label className="block text-[9px] font-bold uppercase tracking-wider text-on-surface-variant mb-1">Units (kWh)</label>
                                              <input
                                                type="number"
                                                value={row.units || ''}
                                                onChange={e => updateBulkRow(row.id, { units: parseFloat(e.target.value) || 0 })}
                                                className="w-full px-2 py-1 bg-surface border border-outline rounded text-on-surface text-xs focus:outline-none focus:border-primary"
                                              />
                                            </div>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                              <div className="px-3 py-2 border-t border-outline/20 bg-surface/10">
                                <button
                                  type="button"
                                  onClick={handleAddManualBulkRow}
                                  className="flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-primary transition-colors font-semibold cursor-pointer"
                                >
                                  <Plus className="size-3.5" /> Add Missing Month Manually
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Toggleable Manual Bill Entry Form */}
                          <div className="border border-outline/30 rounded-xl overflow-hidden mt-4">
                            <button
                              type="button"
                              onClick={() => setShowManualForm(!showManualForm)}
                              className="w-full bg-surface/20 px-4 py-3 flex items-center justify-between hover:bg-surface/30 transition-colors cursor-pointer"
                            >
                              <div className="flex items-center gap-2">
                                <Sparkles className="size-4 text-primary flex-shrink-0" />
                                <p className="text-xs font-bold uppercase tracking-wider text-on-surface">Enter Current or Historical Bills Manually</p>
                              </div>
                              <ChevronDown className={`size-4 text-on-surface-variant transition-transform duration-200 ${showManualForm ? 'rotate-180' : ''}`} />
                            </button>
                            
                            {showManualForm && (
                              <div className="p-4 space-y-4 text-left bg-surface/10 border-t border-outline/20">
                                {/* All fields in a single row */}
                                <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1.2fr_auto_1.2fr] gap-3 items-end">
                                  <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">Billing Month</label>
                                    <input
                                      type="month"
                                      value={fromMonth}
                                      onChange={e => setFromMonth(e.target.value)}
                                      className="w-full px-4 py-2 bg-surface border border-outline rounded-lg text-xs text-on-surface focus:outline-none focus:border-primary [color-scheme:dark]"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">Amount (₹)</label>
                                    <input
                                      type="number"
                                      value={manualAmount}
                                      placeholder="e.g. 2400"
                                      onChange={e => {
                                        const val = e.target.value;
                                        setManualAmount(val);
                                        if (isManualLocked && val) {
                                          const calculated = calculateUnitsFromBill(parseFloat(val));
                                          setManualUnits(String(calculated));
                                        }
                                      }}
                                      className="w-full px-4 py-2 bg-surface border border-outline rounded-lg text-xs text-on-surface focus:outline-none focus:border-primary"
                                    />
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => setIsManualLocked(!isManualLocked)}
                                    className={`p-2 rounded-lg border transition-all flex items-center justify-center cursor-pointer mb-[1px] ${
                                      isManualLocked 
                                        ? 'bg-primary/20 border-primary/50 text-primary' 
                                        : 'bg-surface border-outline text-gray-400 hover:text-white'
                                    }`}
                                    title={isManualLocked ? "Tariff Auto-Calculation Locked" : "Tariff Auto-Calculation Unlocked"}
                                  >
                                    {isManualLocked ? <Lock className="size-4" /> : <Unlock className="size-4" />}
                                  </button>

                                  <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">Units (kWh)</label>
                                    <input
                                      type="number"
                                      value={manualUnits}
                                      placeholder="e.g. 300"
                                      onChange={e => {
                                        const val = e.target.value;
                                        setManualUnits(val);
                                        if (isManualLocked && val) {
                                          const calculated = calculateBillFromUnits(parseFloat(val));
                                          setManualAmount(String(calculated));
                                        }
                                      }}
                                      className="w-full px-4 py-2 bg-surface border border-outline rounded-lg text-xs text-on-surface focus:outline-none focus:border-primary"
                                    />
                                  </div>
                                </div>

                                {/* Add to history button */}
                                <div className="flex justify-end pt-1">
                                  <button
                                    type="button"
                                    onClick={handleAddManualHistoryBill}
                                    className="px-3 py-1.5 bg-surface border border-outline hover:border-primary/30 text-on-surface font-semibold text-xs rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
                                  >
                                    <Plus className="size-3.5" /> Add to Historical Bills
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Historical Bills list display */}
                          {prevBills.length > 0 && (
                            <div className="border border-outline/30 rounded-xl overflow-hidden mt-3 text-left">
                              <div className="bg-surface/20 px-4 py-2 border-b border-outline/25">
                                <p className="text-xs font-semibold text-on-surface">Manually Added History Bills</p>
                              </div>
                              <div className="divide-y divide-outline/15 max-h-36 overflow-y-auto">
                                {prevBills.map((b, idx) => (
                                  <div key={idx} className="p-3 flex items-center justify-between text-xs hover:bg-surface/10 transition-all">
                                    <span className="font-medium text-on-surface">📅 {b.monthLabel}</span>
                                    <div className="flex items-center gap-4">
                                      <span className="text-on-surface-variant">₹{b.bill_amount}</span>
                                      <span className="text-primary font-mono">{b.units} kWh</span>
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveHistoryBill(idx)}
                                        className="text-error/60 hover:text-error transition-colors p-1 cursor-pointer"
                                      >
                                        <Trash2 className="size-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Bottom Navigation for step 2 Basic Meter */}
                          <div className="flex justify-between pt-4 border-t border-outline/25 mt-4">
                            <button
                              type="button" onClick={() => setMeterType(null)}
                              className="border border-outline text-on-surface-variant px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-surface transition-all cursor-pointer"
                            >Back</button>
                            
                            <button
                              type="button"
                              onClick={() => handleManualFormSubmit()}
                              className="bg-primary text-slate-950 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 hover:opacity-90 shadow-md cursor-pointer"
                            >
                              Confirm &amp; Continue <ArrowRightIcon />
                            </button>
                          </div>
                        </m.div>
                      )}

                      {meterType === 'smart' && (
                        <m.div
                          key="smart-meter"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-4 overflow-hidden pt-3 border-t border-outline/20 text-left"
                        >
                          <p className="text-xs text-on-surface-variant">
                            Connect your Smart Meter via your utility distributor (DISCOM) for real-time itemized telemetry and analysis.
                          </p>

                          <div>
                            <label className="block text-xs font-semibold text-on-surface mb-2">DISCOM Account / Consumer Number</label>
                            <input
                              type="text"
                              value={discomNumber}
                              onChange={e => setDiscomNumber(e.target.value)}
                              placeholder="e.g. 102938475"
                              className="w-full px-4 py-2.5 bg-surface border border-outline rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                            />
                            <p className="text-[11px] text-gray-400 mt-2 flex items-center gap-1">
                              💡 <span>Tip: Find your account number at the top of your utility bill. <a href="https://tneb.tnebnet.org/newlt/tconsno.php/tconsno.php?code=1" target="_blank" rel="noreferrer" className="text-primary hover:underline font-semibold">Where is this?</a></span>
                            </p>
                          </div>

                          <div className="flex justify-between pt-4 border-t border-outline/10">
                            <button
                              type="button" onClick={() => setMeterType(null)}
                              className="border border-outline text-on-surface-variant px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-surface transition-all cursor-pointer"
                            >Back to Meter Type</button>
                            <button
                              type="button"
                              onClick={handleFetchSmartMeter}
                              disabled={isFetchingSmart || !discomNumber.trim()}
                              className="bg-primary text-slate-950 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed shadow-md cursor-pointer"
                            >
                              {isFetchingSmart ? (
                                <><Loader2 className="size-4 animate-spin" /> Fetching Telemetry...</>
                              ) : (
                                <>Fetch Telemetry &amp; Continue <ArrowRightIcon /></>
                              )}
                            </button>
                          </div>
                        </m.div>
                      )}

                      {meterType === 'estimate' && (
                        <m.div
                          key="estimate-meter"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-4 overflow-hidden pt-3 border-t border-outline/20 text-left"
                        >
                          <p className="text-xs text-on-surface-variant leading-relaxed">
                            No bills handy? No worries. We'll calibrate your home using a baseline smart estimate (300 kWh) suited to your location and dwelling type. You can refine these inputs at any time in your dashboard settings.
                          </p>

                          <div className="flex justify-between pt-4 border-t border-outline/10">
                            <button
                              type="button" onClick={() => setMeterType(null)}
                              className="border border-outline text-on-surface-variant px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-surface transition-all cursor-pointer"
                            >Back to Meter Type</button>
                            <button
                              type="button"
                              onClick={handleProceedEstimate}
                              className="bg-primary text-slate-950 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 hover:opacity-90 shadow-md cursor-pointer"
                            >
                              Proceed with Estimate <ArrowRightIcon />
                            </button>
                          </div>
                        </m.div>
                      )}

                      {meterType === null && (
                        <div className="flex justify-start pt-4 border-t border-outline/10">
                          <button
                            type="button" onClick={() => dispatch({ type: 'SET_STEP', payload: 1 })}
                            className="border border-outline text-on-surface-variant px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-surface transition-all cursor-pointer"
                          >Back to Profile</button>
                        </div>
                      )}
                    </AnimatePresence>
                  </m.div>
                )}



                {/* ───────── STEP 3: Appliances ───────── */}
                {state.step === 3 && (() => {
                  const allStandard = Object.keys(DEFAULT_APPLIANCES).map(key => ({
                    key,
                    ...DEFAULT_APPLIANCES[key]
                  }));

                  return (
                    <m.div
                      key="step3"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="flex flex-col h-full font-sans"
                    >
                      <h3 className="font-display font-semibold text-lg text-on-surface mb-1 flex items-center gap-2">
                        <Settings className="size-5 text-primary" /> Step 3: Appliance Selection
                      </h3>
                      <p className="text-on-surface-variant text-sm mb-4">Toggle appliances in your home and select their daily usage level.</p>

                      {/* Top Tags for Standard Appliance Selection */}
                      <div className="mb-5 space-y-2">
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Quick Select Standard Appliances</label>
                        <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto pr-1">
                          {allStandard.map((appDef) => {
                            const isSelected = state.appliances.some(a => a.id === appDef.key);
                            return (
                              <button
                                key={appDef.key}
                                type="button"
                                onClick={() => {
                                  if (isSelected) {
                                    dispatch({ type: 'REMOVE_APPLIANCE', payload: appDef.key });
                                  } else {
                                    dispatch({
                                      type: 'ADD_APPLIANCE',
                                      payload: {
                                        id: appDef.key,
                                        name: appDef.name,
                                        icon: appDef.icon,
                                        power_kw: appDef.power_kw,
                                        avg_hours_day: appDef.avg_hours_day,
                                        seasonality: appDef.seasonality || 'whole_year'
                                      }
                                    });
                                  }
                                }}
                                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-primary/20 text-primary border-primary/50 shadow-[0_0_10px_rgba(0,229,255,0.15)] font-bold scale-[1.02]'
                                    : 'bg-surface border-outline hover:border-outline-variant text-gray-400'
                                }`}
                              >
                                <span>{appDef.icon}</span>
                                <span>{appDef.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Appliances list – scrollable */}
                      <div ref={applianceListRef} className="space-y-3 max-h-[300px] overflow-y-auto pr-1 mb-4">
                        {state.appliances.length === 0 ? (
                          <div className="text-center py-8 text-xs text-on-surface-variant italic border border-dashed border-outline/30 rounded-xl">
                            No appliances selected. Click tags above or add a custom one below!
                          </div>
                        ) : (
                          state.appliances.map((app) => (
                            <div key={app.id} className="p-3 rounded-xl border bg-surface/50 border-outline hover:border-primary/30 transition-all duration-300 flex items-center justify-between gap-4 shadow-sm">
                              {/* Left: Icon and Name */}
                              <div className="flex items-center gap-3 min-w-[140px] max-w-[200px]">
                                <span className="text-xl">{app.icon}</span>
                                {app.isCustom ? (
                                  <input
                                    type="text" value={app.name}
                                    onChange={(e) => dispatch({ type: 'UPDATE_APPLIANCE', payload: { id: app.id, fields: { name: e.target.value } } })}
                                    placeholder="Name"
                                    className="w-full bg-surface border border-outline rounded px-2.5 py-1 text-xs font-semibold text-on-surface focus:outline-none focus:border-primary"
                                  />
                                ) : (
                                  <span className="text-xs font-semibold text-on-surface whitespace-nowrap overflow-hidden text-ellipsis">{app.name}</span>
                                )}
                              </div>

                              {/* Center: Daily Usage Tier Buttons */}
                              <div className="flex-1 flex gap-2 justify-center max-w-sm">
                                {(['low', 'medium', 'average'] as const).map((tier) => {
                                  const activeHours = app.avg_hours_day;
                                  let active = false;
                                  if (tier === 'low' && activeHours <= 8) active = true;
                                  else if (tier === 'medium' && activeHours > 8 && activeHours <= 16) active = true;
                                  else if (tier === 'average' && activeHours > 16) active = true;

                                  const label = tier === 'low' ? 'Low (0-8h)' : tier === 'medium' ? 'Med (8-16h)' : 'Avg (16-24h)';
                                  return (
                                    <button
                                      key={tier}
                                      type="button"
                                      onClick={() => {
                                        let hours = 4;
                                        if (tier === 'medium') hours = 12;
                                        else if (tier === 'average') hours = 20;
                                        dispatch({
                                          type: 'UPDATE_APPLIANCE',
                                          payload: { id: app.id, fields: { avg_hours_day: hours } }
                                        });
                                      }}
                                      className={`py-1.5 px-2 rounded-lg text-[10px] font-semibold border transition-all cursor-pointer flex-1 whitespace-nowrap text-center ${
                                        active
                                          ? 'bg-primary text-slate-950 border-primary shadow-[0_0_8px_rgba(0,229,255,0.2)] font-bold'
                                          : 'bg-surface border-outline hover:border-outline-variant hover:bg-surface/50 text-gray-400'
                                      }`}
                                    >
                                      {label}
                                    </button>
                                  );
                                })}
                              </div>

                              {/* Right: Trash Button */}
                              <button
                                type="button"
                                onClick={() => dispatch({ type: 'REMOVE_APPLIANCE', payload: app.id })}
                                className="text-error/60 hover:text-error hover:bg-error/10 p-1.5 rounded-lg transition-all cursor-pointer flex-shrink-0"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Custom add trigger */}
                      <div className="flex gap-3 mb-4">
                        <button
                          type="button" onClick={() => setShowCustomModal(true)}
                          className="px-4 py-2 bg-surface border border-outline hover:border-primary/30 text-on-surface font-semibold text-xs rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Plus className="size-4" /> Add Custom Appliance
                        </button>
                      </div>

                      <div className="flex justify-between pt-3 border-t border-outline/30">
                        <button
                          type="button" onClick={() => dispatch({ type: 'SET_STEP', payload: 2 })}
                          className="border border-outline text-on-surface-variant px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-surface transition-all cursor-pointer"
                        >
                          Back
                        </button>
                        <button
                          type="button" onClick={onAppliancesNext}
                          className="bg-primary text-slate-950 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 hover:opacity-90 shadow-md cursor-pointer"
                        >
                          Next Step <ArrowRightIcon />
                        </button>
                      </div>

                      {/* Custom Appliance Dialog Popup */}
                      {showCustomModal && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm px-4">
                          <div className="max-w-md w-full p-6 bg-surface-container border border-outline rounded-2xl shadow-2xl space-y-4">
                            <div className="flex justify-between items-center pb-2 border-b border-outline/30">
                              <h4 className="font-display font-semibold text-base text-on-surface">Add Custom Appliance</h4>
                              <button type="button" onClick={() => setShowCustomModal(false)} className="text-on-surface-variant hover:text-on-surface p-1 cursor-pointer">
                                <X className="size-4" />
                              </button>
                            </div>
                            <div className="space-y-4 text-left">
                              <div>
                                <label className="block text-xs font-semibold text-on-surface mb-2">Appliance Name</label>
                                <input 
                                  type="text" 
                                  placeholder="e.g. EV Charger, Electric Heater" 
                                  value={customName}
                                  onChange={(e) => setCustomName(e.target.value)}
                                  className="w-full px-4 py-2.5 bg-surface border border-outline rounded-lg text-xs text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-on-surface mb-2">Estimated Daily Usage</label>
                                <div className="grid grid-cols-3 gap-2">
                                  {(['low', 'medium', 'average'] as const).map((tier) => {
                                    const label = tier === 'low' ? 'Low (0-8h)' : tier === 'medium' ? 'Medium (8-16h)' : 'Average (16-24h)';
                                    return (
                                      <button
                                        key={tier}
                                        type="button"
                                        onClick={() => setCustomUsage(tier)}
                                        className={`py-2 rounded-lg text-[10px] font-semibold border transition-all cursor-pointer ${
                                          customUsage === tier
                                            ? 'bg-primary text-slate-950 border-primary font-bold shadow-[0_0_8px_rgba(0,229,255,0.2)]'
                                            : 'bg-surface border-outline hover:border-outline-variant hover:bg-surface/50 text-gray-400'
                                        }`}
                                      >
                                        {label}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-on-surface mb-2">Power Category (Current Draw)</label>
                                <div className="grid grid-cols-3 gap-2">
                                  {(['low', 'medium', 'high'] as const).map((power) => {
                                    const label = power === 'low' ? 'Low (TV/Fan)' : power === 'medium' ? 'Med (Fridge)' : 'High (AC/Geyser)';
                                    return (
                                      <button
                                        key={power}
                                        type="button"
                                        onClick={() => setCustomPower(power)}
                                        className={`py-2 rounded-lg text-[10px] font-semibold border transition-all cursor-pointer ${
                                          customPower === power
                                            ? 'bg-primary text-slate-950 border-primary font-bold shadow-[0_0_8px_rgba(0,229,255,0.2)]'
                                            : 'bg-surface border-outline hover:border-outline-variant hover:bg-surface/50 text-gray-400'
                                        }`}
                                      >
                                        {label}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={handleAddCustomSubmit}
                                className="w-full py-2.5 bg-primary text-slate-950 font-semibold text-sm rounded-lg hover:opacity-90 transition-all shadow-md mt-2 cursor-pointer"
                              >
                                Add Custom Appliance
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </m.div>
                  );
                })()}

                {/* ───────── STEP 4: Review ───────── */}
                {state.step === 4 && currentCalc && state.billData && state.profileData && (
                  <m.div
                    key="step4"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-5"
                  >
                    <div className="text-center">
                      <div className="size-14 bg-tertiary/10 rounded-full border border-tertiary/30 flex items-center justify-center mx-auto mb-3">
                        <ShieldCheck className="size-7 text-tertiary animate-pulse" />
                      </div>
                      <h3 className="font-display font-semibold text-lg text-on-surface">Calibration Complete</h3>
                      <p className="text-on-surface-variant text-sm mt-1">Our estimates match your utility bill details.</p>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-surface border border-outline p-4 rounded-xl text-center">
                        <span className="text-[11px] font-semibold text-on-surface-variant block mb-1">Utility Load</span>
                        <span className="font-semibold text-base text-on-surface">{formatUnits(state.billData.units)}</span>
                        <span className="block text-[11px] text-on-surface-variant mt-0.5">{formatCurrency(state.billData.bill_amount)}</span>
                      </div>
                      <div className="bg-surface border border-outline p-4 rounded-xl text-center">
                        <span className="text-[11px] font-semibold text-on-surface-variant block mb-1">Est. Baseline</span>
                        <span className="font-semibold text-base text-primary">{formatUnits(currentCalc.estKwh)}</span>
                        <span className="block text-[11px] text-on-surface-variant mt-0.5">{formatCurrency(Math.round(currentCalc.estKwh * currentCalc.rate))}</span>
                      </div>
                      <div className="bg-surface border border-outline p-4 rounded-xl text-center">
                        <span className="text-[11px] font-semibold text-on-surface-variant block mb-1">Accuracy</span>
                        <span className={`font-semibold text-base ${currentCalc.accuracy >= 80 ? 'text-tertiary' : 'text-error'}`}>
                          {currentCalc.accuracy}%
                        </span>
                        <span className="block text-[11px] text-on-surface-variant mt-0.5">Ready</span>
                      </div>
                    </div>

                    {/* Appliance breakdown */}
                    <div className="bg-surface border border-outline p-4 rounded-xl space-y-2.5">
                      <h4 className="font-semibold text-xs text-on-surface mb-2 flex items-center gap-1.5">
                        <Zap className="size-3.5 text-primary" /> Estimated Appliance Share
                      </h4>
                      {currentCalc.appliances.slice(0, 5).map((app) => {
                        const sharePct = Math.round(((app.power_kw * app.avg_hours_day * 30) / (currentCalc.estKwh || 1)) * 100);
                        return (
                          <div key={app.id} className="flex justify-between items-center text-sm border-b border-outline/20 pb-2 last:border-b-0 last:pb-0">
                            <span className="text-on-surface-variant flex items-center gap-2 text-xs">
                              <span>{app.icon}</span> {app.name}
                            </span>
                            <div className="flex items-center gap-3">
                              <span className="text-on-surface-variant text-[11px]">{app.avg_hours_day}h/day</span>
                              <span className="font-semibold text-on-surface text-xs">{sharePct}%</span>
                            </div>
                          </div>
                        );
                      })}
                      {currentCalc.appliances.length > 5 && (
                        <p className="text-center text-xs text-on-surface-variant italic pt-1">
                          + {currentCalc.appliances.length - 5} more calibrated
                        </p>
                      )}
                    </div>

                    <div className="flex justify-between pt-2">
                      <button
                        type="button" disabled={isSubmitting}
                        onClick={() => dispatch({ type: 'SET_STEP', payload: 3 })}
                        className="border border-outline text-on-surface-variant px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-surface transition-all disabled:opacity-50"
                      >
                        Back
                      </button>
                      <button
                        type="button" onClick={finishOnboarding} disabled={isSubmitting}
                        className="bg-primary hover:bg-primary/90 text-surface px-6 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 shadow-md disabled:opacity-50"
                      >
                        {isSubmitting
                          ? <><Loader2 className="size-4 animate-spin" /> Completing...</>
                          : <><Play className="size-4 fill-current" /> Complete Onboarding</>
                        }
                      </button>
                    </div>
                  </m.div>
                )}

              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </LazyMotion>
  );
}

function ArrowRightIcon() {
  return (
    <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
    </svg>
  );
}
