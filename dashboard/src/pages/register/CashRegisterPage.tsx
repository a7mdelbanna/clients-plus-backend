import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Tab,
  Tabs,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  InputAdornment,
} from '@mui/material';
import {
  PointOfSale,
  PlayArrow,
  Stop,
  AttachMoney,
  RemoveCircleOutline,
  AddCircleOutline,
  ArrowDownward,
  ArrowUpward,
  Timer,
  Person,
  SwapHoriz,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useBranch } from '../../contexts/BranchContext';
import { registerService } from '../../services/register.service';
import { financeService } from '../../services/finance.service';
import type { ShiftSession, DenominationCount, RegisterTransaction, AccountBalance, AccountMovement } from '../../types/register.types';
import type { FinancialAccount } from '../../types/finance.types';
import { format } from 'date-fns';
import { toDateSafe } from '../../utils/dateUtils';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`register-tabpanel-${index}`}
      aria-labelledby={`register-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const CashRegisterPage: React.FC = () => {
  const { currentUser, company } = useAuth();
  const { currentBranch } = useBranch();
  const isArabic = true; // Force Arabic for now
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentShift, setCurrentShift] = useState<ShiftSession | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<RegisterTransaction[]>([]);
  const [cashAccounts, setCashAccounts] = useState<FinancialAccount[]>([]);
  const [digitalWalletAccounts, setDigitalWalletAccounts] = useState<FinancialAccount[]>([]);
  const [bankAccounts, setBankAccounts] = useState<FinancialAccount[]>([]);
  const [allAccounts, setAllAccounts] = useState<FinancialAccount[]>([]);
  
  // Dialog states
  const [openShiftDialog, setOpenShiftDialog] = useState(false);
  const [closeShiftDialog, setCloseShiftDialog] = useState(false);
  const [cashDropDialog, setCashDropDialog] = useState(false);
  const [adjustmentDialog, setAdjustmentDialog] = useState(false);
  const [transferDialog, setTransferDialog] = useState(false);
  
  // Form states
  const [openingCash, setOpeningCash] = useState<DenominationCount>({
    bills: { 200: 0, 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 1: 0 },
    coins: { 1: 0, 0.5: 0, 0.25: 0 },
    total: 0,
  });
  
  // Track opening balances for each account
  const [accountOpeningBalances, setAccountOpeningBalances] = useState<Record<string, number>>({});
  const [accountActualBalances, setAccountActualBalances] = useState<Record<string, number>>({});
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set());
  const [activeAccountTab, setActiveAccountTab] = useState(0);
  
  // Closing balances tracking
  const [accountClosingBalances, setAccountClosingBalances] = useState<Record<string, number>>({});
  const [activeClosingTab, setActiveClosingTab] = useState(0);
  
  // Show other accounts toggle
  const [showOtherAccounts, setShowOtherAccounts] = useState(false);
  
  // Helper function to get company ID with fallbacks
  const getCompanyId = async (): Promise<string | null> => {
    if (company?.id) return company.id;
    
    if (!currentUser) return null;
    
    if (currentUser?.companyId) return currentUser.companyId;
    
    return null;
  };
  
  const [closingCash, setClosingCash] = useState<DenominationCount>({
    bills: { 200: 0, 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 1: 0 },
    coins: { 1: 0, 0.5: 0, 0.25: 0 },
    total: 0,
  });

  const [shiftNotes, setShiftNotes] = useState('');
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [adjustmentType, setAdjustmentType] = useState<'pay_in' | 'pay_out'>('pay_in');
  
  // Transfer form states
  const [transferFromAccount, setTransferFromAccount] = useState('');
  const [transferToAccount, setTransferToAccount] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferDescription, setTransferDescription] = useState('');
  
  // Account movements tracking
  const [accountMovements, setAccountMovements] = useState<AccountMovement[]>([]);

  const registerId = 'main-register'; // TODO: Support multiple registers
  const branchId = currentBranch?.id || 'main'; // Use current branch or default to 'main'

  useEffect(() => {
    if (company?.id && currentUser?.id) {
      loadInitialData();
    }
  }, [company?.id, currentUser?.id]);

  useEffect(() => {
    if (currentShift?.id) {
      const setupSubscription = async () => {
        const companyId = await getCompanyId();
        if (!companyId) {
          console.error('No company ID for shift subscription');
          return;
        }
        
        // Subscribe to shift updates
        const unsubscribe = registerService.subscribeToShift(
          companyId,
          currentShift.id,
          (shift) => {
            if (shift) {
              setCurrentShift(shift);
            }
          }
        );
        
        // Load transactions and movements
        loadShiftTransactions();
        loadAccountMovements();
        
        return unsubscribe;
      };
      
      let unsubscribeFn: (() => void) | undefined;
      setupSubscription().then(fn => {
        unsubscribeFn = fn;
      });
      
      return () => {
        if (unsubscribeFn) {
          unsubscribeFn();
        }
      };
    }
  }, [currentShift?.id]);

  const loadInitialData = async () => {
    console.log('Loading initial data...', { 
      company, 
      companyId: company?.id,
      currentUser,
      userId: currentUser?.id 
    });
    
    if (!currentUser?.id) {
      console.log('No user, skipping load');
      setError('User information not available');
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      // Get company ID using helper
      const companyId = await getCompanyId();
      if (!companyId) {
        throw new Error('No company ID found. Please logout and login again.');
      }
      console.log('Using company ID:', companyId);
      
      // Check for active shifts
      console.log('Checking for active shifts...');
      const activeShifts = await registerService.getActiveShiftsForEmployee(
        companyId,
        currentUser?.id
      );
      
      console.log('Active shifts found:', activeShifts);
      if (activeShifts.length > 0) {
        setCurrentShift(activeShifts[0]);
      }
      
      // Load all active financial accounts
      console.log('Loading all active financial accounts for company:', companyId);
      
      // First try to get all accounts to see what we have
      const allAccountsDebug = await financeService.getAccounts(companyId);
      console.log('All accounts (no filter):', allAccountsDebug);
      console.log('Account statuses:', allAccountsDebug.map(a => ({ 
        id: a.id, 
        name: a.name, 
        type: a.type, 
        status: a.status,
        currentBalance: a.currentBalance 
      })));
      
      // Filter for active accounts or accounts without status (backward compatibility)
      const accounts = allAccountsDebug.filter(acc => 
        !acc.status || acc.status === 'active'
      );
      console.log('Filtered active accounts:', accounts);
      console.log('Filtered account details:', accounts.map(a => ({ id: a.id, name: a.name, type: a.type, status: a.status })));
      
      // Group accounts by type
      const cashAccs = accounts.filter(acc => acc.type === 'cash');
      const digitalWalletAccs = accounts.filter(acc => acc.type === 'digital_wallet');
      const bankAccs = accounts.filter(acc => acc.type === 'bank');
      
      setCashAccounts(cashAccs);
      setDigitalWalletAccounts(digitalWalletAccs);
      setBankAccounts(bankAccs);
      setAllAccounts(accounts);
      
      console.log('Grouped accounts:', {
        cash: cashAccs.length,
        digitalWallets: digitalWalletAccs.length,
        bank: bankAccs.length,
        total: accounts.length
      });
      
      // Initialize opening balances with current balances
      const expectedBalances: Record<string, number> = {};
      const actualBalances: Record<string, number> = {};
      accounts.forEach(acc => {
        if (acc.id) {
          expectedBalances[acc.id] = acc.currentBalance || 0;
          actualBalances[acc.id] = acc.currentBalance || 0; // Default actual to expected
        }
      });
      setAccountOpeningBalances(expectedBalances);
      setAccountActualBalances(actualBalances);
      console.log('Initialized balances:', { expected: expectedBalances, actual: actualBalances });
    } catch (error: any) {
      console.error('Error loading initial data:', error);
      setError(error?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadShiftTransactions = async () => {
    if (!currentShift?.id) return;
    
    const companyId = await getCompanyId();
    if (!companyId) {
      console.error('No company ID available for loading transactions');
      return;
    }
    
    try {
      const transactions = await registerService.getShiftTransactions(
        companyId,
        currentShift.id
      );
      setRecentTransactions(transactions.slice(0, 10));
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };
  
  const loadAccountMovements = async () => {
    if (!currentShift?.id) return;
    
    const companyId = await getCompanyId();
    if (!companyId) {
      console.error('No company ID available for loading movements');
      return;
    }
    
    try {
      const movements = await registerService.getShiftAccountMovements(
        companyId,
        currentShift.id
      );
      setAccountMovements(movements);
    } catch (error) {
      console.error('Error loading account movements:', error);
    }
  };

  const calculateDenominationTotal = (denominations: DenominationCount): number => {
    let total = 0;
    
    // Bills
    Object.entries(denominations.bills).forEach(([denom, count]) => {
      total += parseFloat(denom) * count;
    });
    
    // Coins
    Object.entries(denominations.coins).forEach(([denom, count]) => {
      total += parseFloat(denom) * count;
    });
    
    return total;
  };

  const handleDenominationChange = (
    type: 'opening' | 'closing',
    category: 'bills' | 'coins',
    denomination: string,
    value: string
  ) => {
    const count = parseInt(value) || 0;
    const denominations = type === 'opening' ? { ...openingCash } : { ...closingCash };
    
    denominations[category][parseFloat(denomination)] = count;
    denominations.total = calculateDenominationTotal(denominations);
    
    if (type === 'opening') {
      setOpeningCash(denominations);
    } else {
      setClosingCash(denominations);
    }
  };

  const handleOpenShift = async () => {
    if (!currentUser?.id || !currentUser?.displayName) {
      alert('User information not available');
      return;
    }
    
    // Check if there's already an active shift
    if (currentShift?.status === 'active') {
      alert('There is already an active shift. Please close it before opening a new one.');
      setOpenShiftDialog(false);
      return;
    }
    
    try {
      // Get company ID using helper
      const companyId = await getCompanyId();
      if (!companyId) {
        alert('No company ID found. Please logout and login again.');
        return;
      }
      
      // Prepare account balances including physical cash
      const accountBalances: Record<string, AccountBalance> = {};
      
      // Add physical cash as an account
      accountBalances['physical_cash'] = {
        accountId: 'physical_cash',
        accountName: 'Physical Cash',
        accountType: 'cash',
        openingExpected: openingCash.total,
        openingActual: accountActualBalances['physical_cash'] || openingCash.total,
        openingVariance: (accountActualBalances['physical_cash'] || openingCash.total) - openingCash.total,
        currentBalance: accountActualBalances['physical_cash'] || openingCash.total,
      };
      
      // Add all financial accounts
      allAccounts.forEach(account => {
        if (account.id) {
          const actualBalance = accountActualBalances[account.id] || account.currentBalance || 0;
          const expectedBalance = account.currentBalance || 0;
          
          accountBalances[account.id] = {
            accountId: account.id,
            accountName: account.name,
            accountType: account.type,
            openingExpected: expectedBalance,
            openingActual: actualBalance,
            openingVariance: actualBalance - expectedBalance,
            currentBalance: actualBalance,
          };
        }
      });
      
      // Get linked account IDs
      const linkedAccounts = ['physical_cash', ...allAccounts.map(a => a.id).filter(Boolean)];
      
      const shiftId = await registerService.openShift(
        companyId,
        branchId,
        registerId,
        currentUser?.id,
        currentUser.displayName,
        openingCash,
        shiftNotes,
        accountBalances,
        linkedAccounts
      );
      
      const shift = await registerService.getShift(companyId, shiftId);
      setCurrentShift(shift);
      setOpenShiftDialog(false);
      setShiftNotes('');
      setAccountActualBalances({});
      setShowOtherAccounts(false);
      
      // Reset opening cash
      setOpeningCash({
        bills: { 200: 0, 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 1: 0 },
        coins: { 1: 0, 0.5: 0, 0.25: 0 },
        total: 0,
      });
      
      // Reset account opening balances
      setAccountOpeningBalances({});
      setSelectedAccounts(new Set());
      
      // Reload initial data to get the new shift
      await loadInitialData();
    } catch (error: any) {
      console.error('Error opening shift:', error);
      alert(error.message || 'Failed to open shift');
    }
  };

  const handleCloseShift = async () => {
    if (!currentShift?.id || !currentUser?.id) {
      alert('Shift or user information not available');
      return;
    }
    
    try {
      // Get company ID using helper
      const companyId = await getCompanyId();
      if (!companyId) {
        alert('No company ID found. Please logout and login again.');
        return;
      }
      
      // Prepare closing account balances
      const closingAccountBalances: Record<string, AccountBalance> = {};
      
      // Add physical cash closing data
      const expectedCash = currentShift.netCashFlow || 0;
      closingAccountBalances['physical_cash'] = {
        accountId: 'physical_cash',
        accountName: 'Physical Cash',
        accountType: 'cash',
        openingExpected: currentShift.accountBalances?.['physical_cash']?.openingExpected || currentShift.openingCashTotal || 0,
        openingActual: currentShift.accountBalances?.['physical_cash']?.openingActual || currentShift.openingCashTotal || 0,
        openingVariance: currentShift.accountBalances?.['physical_cash']?.openingVariance || 0,
        currentBalance: closingCash.total,
        closingExpected: expectedCash,
        closingActual: closingCash.total,
        closingVariance: closingCash.total - expectedCash,
        lastUpdated: new Date().toISOString(),
      };
      
      // Add all financial accounts closing data
      allAccounts.forEach(account => {
        if (account.id) {
          const openingData = currentShift.accountBalances?.[account.id];
          const expectedBalance = openingData?.currentBalance || account.currentBalance || 0;
          const actualBalance = accountClosingBalances[account.id] || expectedBalance;
          
          closingAccountBalances[account.id] = {
            accountId: account.id,
            accountName: account.name,
            accountType: account.type,
            openingExpected: openingData?.openingExpected || expectedBalance,
            openingActual: openingData?.openingActual || expectedBalance,
            openingVariance: openingData?.openingVariance || 0,
            currentBalance: actualBalance,
            closingExpected: expectedBalance,
            closingActual: actualBalance,
            closingVariance: actualBalance - expectedBalance,
            lastUpdated: new Date().toISOString(),
          };
        }
      });
      
      await registerService.closeShift(
        companyId,
        currentShift.id,
        closingCash,
        shiftNotes,
        undefined, // approvedBy - can be added later
        closingAccountBalances
      );
      
      setCurrentShift(null);
      setCloseShiftDialog(false);
      setShiftNotes('');
      setAccountClosingBalances({});
      
      // Reset closing cash
      setClosingCash({
        bills: { 200: 0, 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 1: 0 },
        coins: { 1: 0, 0.5: 0, 0.25: 0 },
        total: 0,
      });
    } catch (error: any) {
      console.error('Error closing shift:', error);
      alert(error.message || 'Failed to close shift');
    }
  };

  const handleCashDrop = async () => {
    if (!currentShift?.id || !currentUser?.id) {
      alert('Shift or user information not available');
      return;
    }
    
    const amount = parseFloat(adjustmentAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    
    try {
      const companyId = await getCompanyId();
      if (!companyId) {
        alert('No company ID found. Please logout and login again.');
        return;
      }
      
      await registerService.performCashDrop(
        companyId,
        currentShift.id,
        amount,
        {
          bills: { 200: 0, 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 1: 0 },
          coins: { 1: 0, 0.5: 0, 0.25: 0 },
          total: amount,
        },
        currentUser?.id,
        undefined,
        adjustmentReason
      );
      
      setCashDropDialog(false);
      setAdjustmentAmount('');
      setAdjustmentReason('');
      
      // Reload shift data
      const updatedShift = await registerService.getShift(companyId, currentShift.id);
      setCurrentShift(updatedShift);
    } catch (error: any) {
      console.error('Error performing cash drop:', error);
      alert(error.message || 'Failed to perform cash drop');
    }
  };

  const handleAdjustment = async () => {
    if (!currentShift?.id || !currentUser?.id) {
      alert('Shift or user information not available');
      return;
    }
    
    const amount = parseFloat(adjustmentAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    
    try {
      const companyId = await getCompanyId();
      if (!companyId) {
        alert('No company ID found. Please logout and login again.');
        return;
      }
      
      await registerService.recordCashAdjustment(
        companyId,
        currentShift.id,
        {
          type: adjustmentType,
          amount,
          reason: adjustmentReason,
          authorizedBy: currentUser?.id,
          performedBy: currentUser?.id,
        }
      );
      
      setAdjustmentDialog(false);
      setAdjustmentAmount('');
      setAdjustmentReason('');
      
      // Reload shift data
      const updatedShift = await registerService.getShift(companyId, currentShift.id);
      setCurrentShift(updatedShift);
    } catch (error: any) {
      console.error('Error recording adjustment:', error);
      alert(error.message || 'Failed to record adjustment');
    }
  };

  const handleTransfer = async () => {
    if (!currentShift?.id || !currentUser?.id) {
      alert('Shift or user information not available');
      return;
    }
    
    const amount = parseFloat(transferAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    
    if (!transferFromAccount || !transferToAccount) {
      alert('Please select both source and destination accounts');
      return;
    }
    
    if (transferFromAccount === transferToAccount) {
      alert('Source and destination accounts must be different');
      return;
    }
    
    try {
      const companyId = await getCompanyId();
      if (!companyId) {
        alert('No company ID found. Please logout and login again.');
        return;
      }
      
      // Get account details
      const fromAccount = allAccounts.find(acc => acc.id === transferFromAccount);
      const toAccount = allAccounts.find(acc => acc.id === transferToAccount);
      
      if (!fromAccount || !toAccount) {
        alert('Invalid account selection');
        return;
      }
      
      // Check if source account has sufficient balance
      const currentFromBalance = currentShift.accountBalances?.[transferFromAccount]?.currentBalance || fromAccount.currentBalance || 0;
      const currentToBalance = currentShift.accountBalances?.[transferToAccount]?.currentBalance || toAccount.currentBalance || 0;
      
      if (currentFromBalance < amount) {
        alert(`Insufficient balance in ${fromAccount.name}. Available: ${formatCurrency(currentFromBalance)}`);
        return;
      }
      
      // Record movement for source account (debit)
      await registerService.recordAccountMovement(
        companyId,
        currentShift.id,
        {
          accountId: transferFromAccount,
          accountName: fromAccount.name,
          movementType: 'transfer',
          amount: -amount, // negative for debit
          balanceBefore: currentFromBalance,
          balanceAfter: currentFromBalance - amount,
          reference: `Transfer to ${toAccount.name}`,
          description: transferDescription || `Transfer to ${toAccount.name}`,
          performedBy: currentUser?.id,
        }
      );
      
      // Record movement for destination account (credit)
      await registerService.recordAccountMovement(
        companyId,
        currentShift.id,
        {
          accountId: transferToAccount,
          accountName: toAccount.name,
          movementType: 'transfer',
          amount: amount, // positive for credit
          balanceBefore: currentToBalance,
          balanceAfter: currentToBalance + amount,
          reference: `Transfer from ${fromAccount.name}`,
          description: transferDescription || `Transfer from ${fromAccount.name}`,
          performedBy: currentUser?.id,
        }
      );
      
      // Also update through finance service for consistency
      await financeService.createTransfer(
        companyId,
        transferFromAccount,
        transferToAccount,
        amount,
        transferDescription || 'Cash register transfer',
        currentUser?.id,
        branchId
      );
      
      setTransferDialog(false);
      setTransferFromAccount('');
      setTransferToAccount('');
      setTransferAmount('');
      setTransferDescription('');
      
      // Reload shift data and movements
      const updatedShift = await registerService.getShift(companyId, currentShift.id);
      setCurrentShift(updatedShift);
      loadAccountMovements();
      
      alert(`Successfully transferred ${formatCurrency(amount)} from ${fromAccount.name} to ${toAccount.name}`);
    } catch (error: any) {
      console.error('Error performing transfer:', error);
      alert(error.message || 'Failed to perform transfer');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-EG', {
      style: 'currency',
      currency: 'EGP',
    }).format(amount);
  };

  const getVarianceColor = (variance: number) => {
    if (Math.abs(variance) < 0.01) return 'success';
    if (Math.abs(variance) < 10) return 'warning';
    return 'error';
  };

  const calculateVariance = (expected: number, actual: number) => {
    return actual - expected;
  };

  const getVarianceDisplay = (variance: number) => {
    const color = getVarianceColor(variance);
    const prefix = variance > 0 ? '+' : '';
    return (
      <Typography 
        component="span" 
        sx={{ 
          color: `${color}.main`,
          fontWeight: 'bold' 
        }}
      >
        {prefix}{formatCurrency(variance)}
      </Typography>
    );
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {isArabic ? 'حدث خطأ: ' : 'Error: '}{error}
        </Alert>
        <Button 
          variant="contained" 
          onClick={() => {
            setError(null);
            loadInitialData();
          }}
        >
          {isArabic ? 'إعادة المحاولة' : 'Retry'}
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          الوردية النقدية
        </Typography>
        <Typography variant="body2" color="text.secondary">
          إدارة الورديات والمعاملات النقدية
        </Typography>
      </Box>

      {/* Shift Status Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center" gap={2}>
              <PointOfSale fontSize="large" color={currentShift ? 'success' : 'disabled'} />
              <Box>
                <Typography variant="h6">
                  {currentShift ? 'الوردية نشطة' : 'لا توجد وردية نشطة'}
                </Typography>
                {currentShift && (
                  <>
                    <Typography variant="body2" color="text.secondary">
                      <Person fontSize="small" sx={{ verticalAlign: 'middle', mr: isArabic ? 0 : 0.5, ml: isArabic ? 0.5 : 0 }} />
                      {currentShift.employeeName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      <Timer fontSize="small" sx={{ verticalAlign: 'middle', mr: isArabic ? 0 : 0.5, ml: isArabic ? 0.5 : 0 }} />
                      بدأت {format(toDateSafe(currentShift.openedAt), 'h:mm a')}
                    </Typography>
                  </>
                )}
              </Box>
            </Box>
            
            <Box display="flex" gap={1}>
              {!currentShift ? (
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={isArabic ? null : <PlayArrow />}
                  endIcon={isArabic ? <PlayArrow /> : null}
                  onClick={async () => {
                    setOpenShiftDialog(true);
                    await loadInitialData(); // Reload accounts when opening dialog
                  }}
                >
                  فتح وردية
                </Button>
              ) : (
                <>
                  <Button
                    variant="outlined"
                    color="warning"
                    startIcon={isArabic ? null : <ArrowDownward />}
                    endIcon={isArabic ? <ArrowDownward /> : null}
                    onClick={() => setCashDropDialog(true)}
                  >
                    إيداع نقدي
                  </Button>
                  <Button
                    variant="outlined"
                    color="info"
                    startIcon={isArabic ? null : <SwapHoriz />}
                    endIcon={isArabic ? <SwapHoriz /> : null}
                    onClick={() => setTransferDialog(true)}
                  >
                    {isArabic ? 'تحويل بين الحسابات' : 'Transfer'}
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={isArabic ? null : <AttachMoney />}
                    endIcon={isArabic ? <AttachMoney /> : null}
                    onClick={() => setAdjustmentDialog(true)}
                  >
                    تعديل
                  </Button>
                  <Button
                    variant="contained"
                    color="error"
                    startIcon={isArabic ? null : <Stop />}
                    endIcon={isArabic ? <Stop /> : null}
                    onClick={() => setCloseShiftDialog(true)}
                  >
                    إغلاق الوردية
                  </Button>
                </>
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>

      {currentShift && (
        <>
          {/* Summary Cards */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 3 }}>
            <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 12px)', md: '1 1 calc(25% - 18px)' } }}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    {isArabic ? 'النقد الافتتاحي' : 'Opening Cash'}
                  </Typography>
                  <Typography variant="h5">
                    {formatCurrency(currentShift.openingCashTotal)}
                  </Typography>
                </CardContent>
              </Card>
            </Box>
            
            <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 12px)', md: '1 1 calc(25% - 18px)' } }}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    {isArabic ? 'إجمالي المبيعات' : 'Total Sales'}
                  </Typography>
                  <Typography variant="h5" color="success.main">
                    {formatCurrency(currentShift.totalSales)}
                  </Typography>
                </CardContent>
              </Card>
            </Box>
            
            <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 12px)', md: '1 1 calc(25% - 18px)' } }}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    {isArabic ? 'الإيداعات النقدية' : 'Cash Drops'}
                  </Typography>
                  <Typography variant="h5" color="warning.main">
                    {formatCurrency(currentShift.totalCashDrops)}
                  </Typography>
                </CardContent>
              </Card>
            </Box>
            
            <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 12px)', md: '1 1 calc(25% - 18px)' } }}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    {isArabic ? 'النقد الحالي' : 'Current Cash'}
                  </Typography>
                  <Typography variant="h5" color="primary.main">
                    {formatCurrency(currentShift.netCashFlow)}
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          </Box>

          {/* Tabs */}
          <Paper sx={{ width: '100%' }}>
            <Tabs
              value={activeTab}
              onChange={(e, newValue) => setActiveTab(newValue)}
              indicatorColor="primary"
              textColor="primary"
            >
              <Tab label={isArabic ? 'المعاملات الأخيرة' : 'Recent Transactions'} />
              <Tab label={isArabic ? 'تفاصيل الوردية' : 'Shift Details'} />
              <Tab label={isArabic ? 'حركات النقد' : 'Cash Movements'} />
              <Tab label={isArabic ? 'حركات الحسابات' : 'Account Movements'} />
            </Tabs>

            <TabPanel value={activeTab} index={0}>
              <List>
                {recentTransactions.length === 0 ? (
                  <ListItem>
                    <ListItemText 
                      primary="No transactions yet"
                      secondary="Transactions will appear here as they are processed"
                    />
                  </ListItem>
                ) : (
                  recentTransactions.map((transaction) => (
                    <React.Fragment key={transaction.id}>
                      <ListItem>
                        <ListItemText
                          primary={
                            <Box display="flex" alignItems="center" gap={1}>
                              {transaction.type === 'sale' && <AddCircleOutline color="success" />}
                              {transaction.type === 'refund' && <RemoveCircleOutline color="error" />}
                              {transaction.type === 'pay_in' && <ArrowUpward color="primary" />}
                              {transaction.type === 'pay_out' && <ArrowDownward color="warning" />}
                              <Typography>
                                {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                              </Typography>
                              {transaction.isVoided && (
                                <Chip label="VOID" size="small" color="error" />
                              )}
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                {format(toDateSafe(transaction.timestamp), 'h:mm a')}
                                {transaction.customerName && ` • ${transaction.customerName}`}
                              </Typography>
                              {transaction.notes && (
                                <Typography variant="body2" color="text.secondary">
                                  {transaction.notes}
                                </Typography>
                              )}
                            </Box>
                          }
                        />
                        <ListItemSecondaryAction>
                          <Typography variant="h6" color={transaction.type === 'refund' || transaction.type === 'pay_out' ? 'error' : 'success'}>
                            {transaction.type === 'refund' || transaction.type === 'pay_out' ? '-' : '+'}
                            {formatCurrency(transaction.totalAmount)}
                          </Typography>
                        </ListItemSecondaryAction>
                      </ListItem>
                      <Divider />
                    </React.Fragment>
                  ))
                )}
              </List>
            </TabPanel>

            <TabPanel value={activeTab} index={1}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(50% - 8px)' } }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Shift Information
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography>Register: {currentShift.registerId}</Typography>
                    <Typography>Employee: {currentShift.employeeName}</Typography>
                    <Typography>
                      Started: {format(toDateSafe(currentShift.openedAt), 'PPp')}
                    </Typography>
                    {currentShift.openingNotes && (
                      <Typography>Notes: {currentShift.openingNotes}</Typography>
                    )}
                  </Box>
                </Box>
                
                <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(50% - 8px)' } }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Financial Summary
                  </Typography>
                  <Box>
                    <Typography>Opening Cash: {formatCurrency(currentShift.openingCashTotal)}</Typography>
                    <Typography>+ Sales: {formatCurrency(currentShift.totalSales)}</Typography>
                    <Typography>- Refunds: {formatCurrency(currentShift.totalRefunds)}</Typography>
                    <Typography>+ Pay Ins: {formatCurrency(currentShift.totalPayIns)}</Typography>
                    <Typography>- Pay Outs: {formatCurrency(currentShift.totalPayOuts)}</Typography>
                    <Typography>- Cash Drops: {formatCurrency(currentShift.totalCashDrops)}</Typography>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="h6">
                      Expected Cash: {formatCurrency(currentShift.netCashFlow)}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </TabPanel>

            <TabPanel value={activeTab} index={2}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Cash Movement History
              </Typography>
              <List>
                <ListItem>
                  <ListItemText
                    primary="Opening Balance"
                    secondary={format(toDateSafe(currentShift.openedAt), 'h:mm a')}
                  />
                  <ListItemSecondaryAction>
                    <Typography variant="h6">
                      {formatCurrency(currentShift.openingCashTotal)}
                    </Typography>
                  </ListItemSecondaryAction>
                </ListItem>
                {/* TODO: Load and display cash drops and adjustments */}
              </List>
            </TabPanel>

            <TabPanel value={activeTab} index={3}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                {isArabic ? 'حركات الحسابات المالية' : 'Financial Account Movements'}
              </Typography>
              {accountMovements.length === 0 ? (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                  <Typography color="text.secondary">
                    {isArabic ? 'لا توجد حركات حسابات بعد' : 'No account movements yet'}
                  </Typography>
                </Box>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>{isArabic ? 'الوقت' : 'Time'}</TableCell>
                        <TableCell>{isArabic ? 'الحساب' : 'Account'}</TableCell>
                        <TableCell>{isArabic ? 'النوع' : 'Type'}</TableCell>
                        <TableCell>{isArabic ? 'المبلغ' : 'Amount'}</TableCell>
                        <TableCell>{isArabic ? 'الرصيد' : 'Balance'}</TableCell>
                        <TableCell>{isArabic ? 'الوصف' : 'Description'}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {accountMovements.map((movement) => (
                        <TableRow key={movement.id}>
                          <TableCell>
                            {format(toDateSafe(movement.timestamp), 'h:mm a')}
                          </TableCell>
                          <TableCell>{movement.accountName}</TableCell>
                          <TableCell>
                            <Chip
                              label={movement.movementType}
                              size="small"
                              color={movement.amount > 0 ? 'success' : 'error'}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography
                              variant="body2"
                              color={movement.amount > 0 ? 'success.main' : 'error.main'}
                            >
                              {movement.amount > 0 ? '+' : ''}{formatCurrency(movement.amount)}
                            </Typography>
                          </TableCell>
                          <TableCell>{formatCurrency(movement.balanceAfter)}</TableCell>
                          <TableCell>{movement.description}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </TabPanel>
          </Paper>
        </>
      )}

      {/* Open Shift Dialog */}
      <Dialog open={openShiftDialog} onClose={() => setOpenShiftDialog(false)} maxWidth="lg" fullWidth>
        <DialogTitle>{isArabic ? 'فتح وردية جديدة' : 'Open New Shift'}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {/* Debug info */}
            {loading && (
              <Alert severity="info" sx={{ mb: 2 }}>
                {isArabic ? 'جاري تحميل الحسابات...' : 'Loading accounts...'}
              </Alert>
            )}
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            {!loading && !error && allAccounts.length === 0 && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                {isArabic ? 'لم يتم العثور على أي حسابات مالية. يرجى إضافة حسابات من صفحة الحسابات المالية.' : 'No financial accounts found. Please add accounts from the Finance Accounts page.'}
              </Alert>
            )}
            {/* Account Tabs */}
            <Tabs 
              value={activeAccountTab} 
              onChange={(e, newValue) => setActiveAccountTab(newValue)}
              sx={{ mb: 3 }}
            >
              <Tab label={isArabic ? 'النقد' : 'Cash'} />
              <Tab label={isArabic ? 'المحافظ الرقمية' : 'Digital Wallets'} />
              <Tab label={isArabic ? 'الحسابات البنكية' : 'Bank Accounts'} />
              <Tab label={isArabic ? 'ملخص' : 'Summary'} />
            </Tabs>

            {/* Cash Tab */}
            {activeAccountTab === 0 && (
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  {isArabic ? 'عد النقد الافتتاحي' : 'Count Opening Cash'}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {isArabic ? 'من فضلك قم بعد جميع النقود في الصندوق وأدخل الكميات أدناه' : 'Please count all cash in the register and enter the quantities below'}
                </Typography>
            
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" gutterBottom>{isArabic ? 'الأوراق النقدية' : 'Bills'}</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                {Object.keys(openingCash.bills).map((denom) => (
                  <Box key={denom} sx={{ width: { xs: 'calc(50% - 8px)', sm: 'calc(33.333% - 10.667px)', md: 'calc(25% - 12px)' } }}>
                    <TextField
                      fullWidth
                      label={`${denom} ${isArabic ? 'جنيه' : 'EGP'}`}
                      type="number"
                      value={openingCash.bills[parseFloat(denom)] || ''}
                      onChange={(e) => handleDenominationChange('opening', 'bills', denom, e.target.value)}
                      InputProps={{ inputProps: { min: 0 } }}
                    />
                  </Box>
                ))}
              </Box>
              
              <Typography variant="subtitle2" gutterBottom sx={{ mt: 3 }}>
                {isArabic ? 'العملات المعدنية' : 'Coins'}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                {Object.keys(openingCash.coins).map((denom) => (
                  <Box key={denom} sx={{ width: { xs: 'calc(50% - 8px)', sm: 'calc(33.333% - 10.667px)', md: 'calc(25% - 12px)' } }}>
                    <TextField
                      fullWidth
                      label={`${denom} ${isArabic ? 'جنيه' : 'EGP'}`}
                      type="number"
                      value={openingCash.coins[parseFloat(denom)] || ''}
                      onChange={(e) => handleDenominationChange('opening', 'coins', denom, e.target.value)}
                      InputProps={{ inputProps: { min: 0 } }}
                    />
                  </Box>
                ))}
              </Box>
              
              <Box sx={{ mt: 3, p: 2, bgcolor: 'primary.main', color: 'white', borderRadius: 1 }}>
                <Typography variant="h6">
                  {isArabic ? 'إجمالي النقد: ' : 'Cash Total: '}{formatCurrency(openingCash.total)}
                </Typography>
              </Box>

              {/* Cash Accounts Table */}
              {cashAccounts.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    {isArabic ? 'حسابات النقد الأخرى' : 'Other Cash Accounts'}
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>{isArabic ? 'الحساب' : 'Account'}</TableCell>
                          <TableCell align="right">{isArabic ? 'الرصيد المتوقع' : 'Expected'}</TableCell>
                          <TableCell align="right">{isArabic ? 'الرصيد الفعلي' : 'Actual'}</TableCell>
                          <TableCell align="right">{isArabic ? 'الفرق' : 'Variance'}</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {cashAccounts.map((account) => {
                          const expected = accountOpeningBalances[account.id!] || 0;
                          const actual = accountActualBalances[account.id!] || expected;
                          const variance = calculateVariance(expected, actual);
                          return (
                            <TableRow key={account.id}>
                              <TableCell>{isArabic ? account.nameAr || account.name : account.name}</TableCell>
                              <TableCell align="right">{formatCurrency(expected)}</TableCell>
                              <TableCell align="right">
                                <TextField
                                  type="number"
                                  size="small"
                                  value={actual}
                                  onChange={(e) => setAccountActualBalances({
                                    ...accountActualBalances,
                                    [account.id!]: parseFloat(e.target.value) || 0
                                  })}
                                  InputProps={{
                                    startAdornment: <InputAdornment position="start">ج.م</InputAdornment>,
                                    inputProps: { min: 0, step: 0.01 }
                                  }}
                                  sx={{ width: 150 }}
                                />
                              </TableCell>
                              <TableCell align="right">{getVarianceDisplay(variance)}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}
            </Box>
            </Box>
            )}

            {/* Digital Wallets Tab */}
            {activeAccountTab === 1 && (
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  {isArabic ? 'المحافظ الرقمية' : 'Digital Wallets'}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {isArabic ? 'تحقق من أرصدة المحافظ الرقمية وأدخل الأرصدة الفعلية' : 'Verify digital wallet balances and enter actual amounts'}
                </Typography>
                
                {digitalWalletAccounts.length === 0 ? (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    {isArabic ? 'لا توجد محافظ رقمية نشطة' : 'No active digital wallets found'}
                  </Alert>
                ) : (
                  <TableContainer component={Paper} variant="outlined" sx={{ mt: 2 }}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>{isArabic ? 'المحفظة' : 'Wallet'}</TableCell>
                          <TableCell align="right">{isArabic ? 'الرصيد المتوقع' : 'Expected Balance'}</TableCell>
                          <TableCell align="right">{isArabic ? 'الرصيد الفعلي' : 'Actual Balance'}</TableCell>
                          <TableCell align="right">{isArabic ? 'الفرق' : 'Variance'}</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {digitalWalletAccounts.map((account) => {
                          const expected = accountOpeningBalances[account.id!] || 0;
                          const actual = accountActualBalances[account.id!] || expected;
                          const variance = calculateVariance(expected, actual);
                          return (
                            <TableRow key={account.id}>
                              <TableCell>
                                <Box>
                                  <Typography>{isArabic ? account.nameAr || account.name : account.name}</Typography>
                                  {account.digitalWalletDetails?.phoneNumber && (
                                    <Typography variant="caption" color="text.secondary">
                                      {account.digitalWalletDetails.phoneNumber}
                                    </Typography>
                                  )}
                                </Box>
                              </TableCell>
                              <TableCell align="right">{formatCurrency(expected)}</TableCell>
                              <TableCell align="right">
                                <TextField
                                  type="number"
                                  size="small"
                                  value={actual}
                                  onChange={(e) => setAccountActualBalances({
                                    ...accountActualBalances,
                                    [account.id!]: parseFloat(e.target.value) || 0
                                  })}
                                  InputProps={{
                                    startAdornment: <InputAdornment position="start">ج.م</InputAdornment>,
                                    inputProps: { min: 0, step: 0.01 }
                                  }}
                                  sx={{ width: 150 }}
                                />
                              </TableCell>
                              <TableCell align="right">{getVarianceDisplay(variance)}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            )}

            {/* Bank Accounts Tab */}
            {activeAccountTab === 2 && (
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  {isArabic ? 'الحسابات البنكية' : 'Bank Accounts'}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {isArabic ? 'تحقق من أرصدة الحسابات البنكية' : 'Verify bank account balances'}
                </Typography>
                
                {bankAccounts.length === 0 ? (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    {isArabic ? 'لا توجد حسابات بنكية نشطة' : 'No active bank accounts found'}
                  </Alert>
                ) : (
                  <TableContainer component={Paper} variant="outlined" sx={{ mt: 2 }}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>{isArabic ? 'البنك' : 'Bank'}</TableCell>
                          <TableCell align="right">{isArabic ? 'الرصيد المتوقع' : 'Expected Balance'}</TableCell>
                          <TableCell align="right">{isArabic ? 'الرصيد الفعلي' : 'Actual Balance'}</TableCell>
                          <TableCell align="right">{isArabic ? 'الفرق' : 'Variance'}</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {bankAccounts.map((account) => {
                          const expected = accountOpeningBalances[account.id!] || 0;
                          const actual = accountActualBalances[account.id!] || expected;
                          const variance = calculateVariance(expected, actual);
                          return (
                            <TableRow key={account.id}>
                              <TableCell>
                                <Box>
                                  <Typography>{isArabic ? account.nameAr || account.name : account.name}</Typography>
                                  {account.bankDetails?.accountNumber && (
                                    <Typography variant="caption" color="text.secondary">
                                      {isArabic ? 'رقم الحساب: ' : 'Account: '}{account.bankDetails.accountNumber}
                                    </Typography>
                                  )}
                                </Box>
                              </TableCell>
                              <TableCell align="right">{formatCurrency(expected)}</TableCell>
                              <TableCell align="right">
                                <TextField
                                  type="number"
                                  size="small"
                                  value={actual}
                                  onChange={(e) => setAccountActualBalances({
                                    ...accountActualBalances,
                                    [account.id!]: parseFloat(e.target.value) || 0
                                  })}
                                  InputProps={{
                                    startAdornment: <InputAdornment position="start">ج.م</InputAdornment>,
                                    inputProps: { min: 0, step: 0.01 }
                                  }}
                                  sx={{ width: 150 }}
                                />
                              </TableCell>
                              <TableCell align="right">{getVarianceDisplay(variance)}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            )}

            {/* Summary Tab */}
            {activeAccountTab === 3 && (
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  {isArabic ? 'ملخص الافتتاح' : 'Opening Summary'}
                </Typography>
                
                <TableContainer component={Paper} variant="outlined" sx={{ mt: 2 }}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>{isArabic ? 'نوع الحساب' : 'Account Type'}</TableCell>
                        <TableCell align="right">{isArabic ? 'المتوقع' : 'Expected'}</TableCell>
                        <TableCell align="right">{isArabic ? 'الفعلي' : 'Actual'}</TableCell>
                        <TableCell align="right">{isArabic ? 'الفرق' : 'Variance'}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {/* Physical Cash */}
                      <TableRow>
                        <TableCell>{isArabic ? 'النقد في الصندوق' : 'Cash in Register'}</TableCell>
                        <TableCell align="right">{formatCurrency(0)}</TableCell>
                        <TableCell align="right">{formatCurrency(openingCash.total)}</TableCell>
                        <TableCell align="right">{getVarianceDisplay(openingCash.total)}</TableCell>
                      </TableRow>
                      
                      {/* Cash Accounts */}
                      {cashAccounts.length > 0 && (
                        <TableRow>
                          <TableCell>{isArabic ? 'حسابات نقدية أخرى' : 'Other Cash Accounts'}</TableCell>
                          <TableCell align="right">
                            {formatCurrency(cashAccounts.reduce((sum, acc) => sum + (accountOpeningBalances[acc.id!] || 0), 0))}
                          </TableCell>
                          <TableCell align="right">
                            {formatCurrency(cashAccounts.reduce((sum, acc) => sum + (accountActualBalances[acc.id!] || 0), 0))}
                          </TableCell>
                          <TableCell align="right">
                            {getVarianceDisplay(
                              cashAccounts.reduce((sum, acc) => sum + (accountActualBalances[acc.id!] || 0), 0) -
                              cashAccounts.reduce((sum, acc) => sum + (accountOpeningBalances[acc.id!] || 0), 0)
                            )}
                          </TableCell>
                        </TableRow>
                      )}
                      
                      {/* Digital Wallets */}
                      {digitalWalletAccounts.length > 0 && (
                        <TableRow>
                          <TableCell>{isArabic ? 'المحافظ الرقمية' : 'Digital Wallets'}</TableCell>
                          <TableCell align="right">
                            {formatCurrency(digitalWalletAccounts.reduce((sum, acc) => sum + (accountOpeningBalances[acc.id!] || 0), 0))}
                          </TableCell>
                          <TableCell align="right">
                            {formatCurrency(digitalWalletAccounts.reduce((sum, acc) => sum + (accountActualBalances[acc.id!] || 0), 0))}
                          </TableCell>
                          <TableCell align="right">
                            {getVarianceDisplay(
                              digitalWalletAccounts.reduce((sum, acc) => sum + (accountActualBalances[acc.id!] || 0), 0) -
                              digitalWalletAccounts.reduce((sum, acc) => sum + (accountOpeningBalances[acc.id!] || 0), 0)
                            )}
                          </TableCell>
                        </TableRow>
                      )}
                      
                      {/* Bank Accounts */}
                      {bankAccounts.length > 0 && (
                        <TableRow>
                          <TableCell>{isArabic ? 'الحسابات البنكية' : 'Bank Accounts'}</TableCell>
                          <TableCell align="right">
                            {formatCurrency(bankAccounts.reduce((sum, acc) => sum + (accountOpeningBalances[acc.id!] || 0), 0))}
                          </TableCell>
                          <TableCell align="right">
                            {formatCurrency(bankAccounts.reduce((sum, acc) => sum + (accountActualBalances[acc.id!] || 0), 0))}
                          </TableCell>
                          <TableCell align="right">
                            {getVarianceDisplay(
                              bankAccounts.reduce((sum, acc) => sum + (accountActualBalances[acc.id!] || 0), 0) -
                              bankAccounts.reduce((sum, acc) => sum + (accountOpeningBalances[acc.id!] || 0), 0)
                            )}
                          </TableCell>
                        </TableRow>
                      )}
                      
                      {/* Total */}
                      <TableRow sx={{ bgcolor: 'grey.100' }}>
                        <TableCell sx={{ fontWeight: 'bold' }}>
                          {isArabic ? 'الإجمالي' : 'Total'}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                          {formatCurrency(
                            allAccounts.reduce((sum, acc) => sum + (accountOpeningBalances[acc.id!] || 0), 0)
                          )}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                          {formatCurrency(
                            openingCash.total + 
                            allAccounts.reduce((sum, acc) => sum + (accountActualBalances[acc.id!] || 0), 0)
                          )}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                          {getVarianceDisplay(
                            openingCash.total +
                            allAccounts.reduce((sum, acc) => sum + (accountActualBalances[acc.id!] || 0), 0) -
                            allAccounts.reduce((sum, acc) => sum + (accountOpeningBalances[acc.id!] || 0), 0)
                          )}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Variance Alert */}
                {(() => {
                  const totalVariance = openingCash.total +
                    allAccounts.reduce((sum, acc) => sum + (accountActualBalances[acc.id!] || 0), 0) -
                    allAccounts.reduce((sum, acc) => sum + (accountOpeningBalances[acc.id!] || 0), 0);
                  
                  if (Math.abs(totalVariance) > 0.01) {
                    return (
                      <Alert severity={Math.abs(totalVariance) > 10 ? 'warning' : 'info'} sx={{ mt: 2 }}>
                        {isArabic 
                          ? `يوجد فرق قدره ${formatCurrency(Math.abs(totalVariance))} ${totalVariance > 0 ? 'زيادة' : 'نقص'}`
                          : `There is a variance of ${formatCurrency(Math.abs(totalVariance))} ${totalVariance > 0 ? 'over' : 'short'}`}
                      </Alert>
                    );
                  }
                  return null;
                })()}
              </Box>
            )}
            
            {/* Notes field - appears on all tabs */}
            <TextField
              fullWidth
              label={isArabic ? 'ملاحظات (اختياري)' : 'Notes (Optional)'}
              multiline
              rows={2}
              value={shiftNotes}
              onChange={(e) => setShiftNotes(e.target.value)}
              sx={{ mt: 3 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenShiftDialog(false)}>{isArabic ? 'إلغاء' : 'Cancel'}</Button>
          <Button 
            onClick={handleOpenShift} 
            variant="contained" 
            disabled={
              openingCash.total <= 0 && 
              Object.entries(accountOpeningBalances).reduce((sum, [id, val]) => {
                return sum + (val || allAccounts.find(a => a.id === id)?.currentBalance || 0);
              }, 0) <= 0
            }
          >
            {isArabic ? 'فتح الوردية' : 'Open Shift'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Close Shift Dialog */}
      <Dialog open={closeShiftDialog} onClose={() => setCloseShiftDialog(false)} maxWidth="lg" fullWidth>
        <DialogTitle>{isArabic ? 'إغلاق الوردية' : 'Close Shift'}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {currentShift && (
              <Alert severity="info" sx={{ mb: 2 }}>
                {isArabic 
                  ? `وقت فتح الوردية: ${toDateSafe(currentShift.openedAt).toLocaleString('ar-EG')}`
                  : `Shift opened at: ${toDateSafe(currentShift.openedAt).toLocaleString()}`}
              </Alert>
            )}
            
            <Typography variant="subtitle1" gutterBottom>
              {isArabic ? 'تسوية الحسابات عند الإغلاق' : 'End of Shift Account Reconciliation'}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {isArabic 
                ? 'قم بعد النقد وتسجيل الأرصدة الفعلية لجميع الحسابات'
                : 'Count cash and record actual balances for all accounts'}
            </Typography>
            
            {/* Account Type Tabs */}
            <Tabs 
              value={activeClosingTab} 
              onChange={(_, newValue) => setActiveClosingTab(newValue)}
              sx={{ borderBottom: 1, borderColor: 'divider', mt: 2 }}
            >
              <Tab label={isArabic ? 'النقد' : 'Cash'} />
              {digitalWalletAccounts.length > 0 && (
                <Tab label={isArabic ? 'المحافظ الإلكترونية' : 'Digital Wallets'} />
              )}
              {bankAccounts.length > 0 && (
                <Tab label={isArabic ? 'الحسابات البنكية' : 'Bank Accounts'} />
              )}
              <Tab label={isArabic ? 'الملخص' : 'Summary'} />
            </Tabs>
            
            {/* Cash Tab */}
            {activeClosingTab === 0 && (
              <Box sx={{ mt: 3 }}>
                <Alert severity="info" sx={{ mb: 2 }}>
                  {currentShift && (
                    <>{isArabic ? 'النقد المتوقع: ' : 'Expected Cash: '}{formatCurrency(currentShift.netCashFlow)}</>
                  )}
                </Alert>
                
                <Typography variant="subtitle2" gutterBottom>{isArabic ? 'الأوراق النقدية' : 'Bills'}</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                  {Object.keys(closingCash.bills).map((denom) => (
                    <Box key={denom} sx={{ width: { xs: 'calc(50% - 8px)', sm: 'calc(33.333% - 10.667px)', md: 'calc(25% - 12px)' } }}>
                      <TextField
                        fullWidth
                        label={`${denom} ${isArabic ? 'جنيه' : 'EGP'}`}
                        type="number"
                        value={closingCash.bills[parseFloat(denom)] || ''}
                        onChange={(e) => handleDenominationChange('closing', 'bills', denom, e.target.value)}
                        InputProps={{ inputProps: { min: 0 } }}
                      />
                    </Box>
                  ))}
                </Box>
                
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 3 }}>
                  {isArabic ? 'العملات المعدنية' : 'Coins'}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                  {Object.keys(closingCash.coins).map((denom) => (
                    <Box key={denom} sx={{ width: { xs: 'calc(50% - 8px)', sm: 'calc(33.333% - 10.667px)', md: 'calc(25% - 12px)' } }}>
                      <TextField
                        fullWidth
                        label={`${denom} ${isArabic ? 'جنيه' : 'EGP'}`}
                        type="number"
                        value={closingCash.coins[parseFloat(denom)] || ''}
                        onChange={(e) => handleDenominationChange('closing', 'coins', denom, e.target.value)}
                        InputProps={{ inputProps: { min: 0 } }}
                      />
                    </Box>
                  ))}
                </Box>
                
                <Box sx={{ mt: 3, p: 2, bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 1 }}>
                  <Typography variant="h6">
                    {isArabic ? 'الفعلي: ' : 'Actual: '}{formatCurrency(closingCash.total)}
                  </Typography>
                  {currentShift && (
                    <>
                      <Typography>
                        {isArabic ? 'المتوقع: ' : 'Expected: '}{formatCurrency(currentShift.netCashFlow)}
                      </Typography>
                      <Typography sx={{ color: getVarianceColor(closingCash.total - currentShift.netCashFlow) + '.main', fontWeight: 'bold' }}>
                        {isArabic ? 'الفرق: ' : 'Variance: '}{formatCurrency(closingCash.total - currentShift.netCashFlow)}
                      </Typography>
                    </>
                  )}
                </Box>
              </Box>
            )}
            
            {/* Digital Wallets Tab */}
            {activeClosingTab === 1 && digitalWalletAccounts.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>{isArabic ? 'المحفظة' : 'Wallet'}</TableCell>
                        <TableCell align="right">{isArabic ? 'المتوقع' : 'Expected'}</TableCell>
                        <TableCell align="right">{isArabic ? 'الفعلي' : 'Actual'}</TableCell>
                        <TableCell align="right">{isArabic ? 'الفرق' : 'Variance'}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {digitalWalletAccounts.map(account => {
                        const expected = currentShift?.accountBalances?.[account.id!]?.currentBalance || account.currentBalance || 0;
                        const actual = accountClosingBalances[account.id!] || expected;
                        const variance = actual - expected;
                        
                        return (
                          <TableRow key={account.id}>
                            <TableCell>{account.name}</TableCell>
                            <TableCell align="right">{formatCurrency(expected)}</TableCell>
                            <TableCell align="right">
                              <TextField
                                size="small"
                                type="number"
                                value={accountClosingBalances[account.id!] || ''}
                                onChange={(e) => setAccountClosingBalances(prev => ({
                                  ...prev,
                                  [account.id!]: parseFloat(e.target.value) || 0
                                }))}
                                placeholder={expected.toString()}
                                InputProps={{ 
                                  inputProps: { min: 0, step: 0.01 },
                                  sx: { width: 120 }
                                }}
                              />
                            </TableCell>
                            <TableCell align="right">
                              {getVarianceDisplay(variance)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
            
            {/* Bank Accounts Tab */}
            {activeClosingTab === (digitalWalletAccounts.length > 0 ? 2 : 1) && bankAccounts.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>{isArabic ? 'الحساب البنكي' : 'Bank Account'}</TableCell>
                        <TableCell align="right">{isArabic ? 'المتوقع' : 'Expected'}</TableCell>
                        <TableCell align="right">{isArabic ? 'الفعلي' : 'Actual'}</TableCell>
                        <TableCell align="right">{isArabic ? 'الفرق' : 'Variance'}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {bankAccounts.map(account => {
                        const expected = currentShift?.accountBalances?.[account.id!]?.currentBalance || account.currentBalance || 0;
                        const actual = accountClosingBalances[account.id!] || expected;
                        const variance = actual - expected;
                        
                        return (
                          <TableRow key={account.id}>
                            <TableCell>{account.name}</TableCell>
                            <TableCell align="right">{formatCurrency(expected)}</TableCell>
                            <TableCell align="right">
                              <TextField
                                size="small"
                                type="number"
                                value={accountClosingBalances[account.id!] || ''}
                                onChange={(e) => setAccountClosingBalances(prev => ({
                                  ...prev,
                                  [account.id!]: parseFloat(e.target.value) || 0
                                }))}
                                placeholder={expected.toString()}
                                InputProps={{ 
                                  inputProps: { min: 0, step: 0.01 },
                                  sx: { width: 120 }
                                }}
                              />
                            </TableCell>
                            <TableCell align="right">
                              {getVarianceDisplay(variance)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
            
            {/* Summary Tab */}
            {activeClosingTab === (digitalWalletAccounts.length > 0 && bankAccounts.length > 0 ? 3 : 
                                   digitalWalletAccounts.length > 0 || bankAccounts.length > 0 ? 2 : 1) && (
              <Box sx={{ mt: 3 }}>
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>{isArabic ? 'نوع الحساب' : 'Account Type'}</TableCell>
                        <TableCell align="right">{isArabic ? 'المتوقع' : 'Expected'}</TableCell>
                        <TableCell align="right">{isArabic ? 'الفعلي' : 'Actual'}</TableCell>
                        <TableCell align="right">{isArabic ? 'الفرق' : 'Variance'}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {/* Physical Cash */}
                      <TableRow>
                        <TableCell>{isArabic ? 'النقد' : 'Physical Cash'}</TableCell>
                        <TableCell align="right">
                          {formatCurrency(currentShift?.netCashFlow || 0)}
                        </TableCell>
                        <TableCell align="right">
                          {formatCurrency(closingCash.total)}
                        </TableCell>
                        <TableCell align="right">
                          {getVarianceDisplay(closingCash.total - (currentShift?.netCashFlow || 0))}
                        </TableCell>
                      </TableRow>
                      
                      {/* Digital Wallets Summary */}
                      {digitalWalletAccounts.length > 0 && (
                        <TableRow>
                          <TableCell>{isArabic ? 'المحافظ الإلكترونية' : 'Digital Wallets'}</TableCell>
                          <TableCell align="right">
                            {formatCurrency(digitalWalletAccounts.reduce((sum, acc) => 
                              sum + (currentShift?.accountBalances?.[acc.id!]?.currentBalance || acc.currentBalance || 0), 0))}
                          </TableCell>
                          <TableCell align="right">
                            {formatCurrency(digitalWalletAccounts.reduce((sum, acc) => 
                              sum + (accountClosingBalances[acc.id!] || currentShift?.accountBalances?.[acc.id!]?.currentBalance || acc.currentBalance || 0), 0))}
                          </TableCell>
                          <TableCell align="right">
                            {getVarianceDisplay(
                              digitalWalletAccounts.reduce((sum, acc) => {
                                const expected = currentShift?.accountBalances?.[acc.id!]?.currentBalance || acc.currentBalance || 0;
                                const actual = accountClosingBalances[acc.id!] || expected;
                                return sum + (actual - expected);
                              }, 0)
                            )}
                          </TableCell>
                        </TableRow>
                      )}
                      
                      {/* Bank Accounts Summary */}
                      {bankAccounts.length > 0 && (
                        <TableRow>
                          <TableCell>{isArabic ? 'الحسابات البنكية' : 'Bank Accounts'}</TableCell>
                          <TableCell align="right">
                            {formatCurrency(bankAccounts.reduce((sum, acc) => 
                              sum + (currentShift?.accountBalances?.[acc.id!]?.currentBalance || acc.currentBalance || 0), 0))}
                          </TableCell>
                          <TableCell align="right">
                            {formatCurrency(bankAccounts.reduce((sum, acc) => 
                              sum + (accountClosingBalances[acc.id!] || currentShift?.accountBalances?.[acc.id!]?.currentBalance || acc.currentBalance || 0), 0))}
                          </TableCell>
                          <TableCell align="right">
                            {getVarianceDisplay(
                              bankAccounts.reduce((sum, acc) => {
                                const expected = currentShift?.accountBalances?.[acc.id!]?.currentBalance || acc.currentBalance || 0;
                                const actual = accountClosingBalances[acc.id!] || expected;
                                return sum + (actual - expected);
                              }, 0)
                            )}
                          </TableCell>
                        </TableRow>
                      )}
                      
                      {/* Total */}
                      <TableRow sx={{ bgcolor: 'grey.100' }}>
                        <TableCell sx={{ fontWeight: 'bold' }}>
                          {isArabic ? 'الإجمالي' : 'Total'}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                          {formatCurrency(
                            (currentShift?.netCashFlow || 0) +
                            allAccounts.reduce((sum, acc) => 
                              sum + (currentShift?.accountBalances?.[acc.id!]?.currentBalance || acc.currentBalance || 0), 0)
                          )}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                          {formatCurrency(
                            closingCash.total +
                            allAccounts.reduce((sum, acc) => 
                              sum + (accountClosingBalances[acc.id!] || currentShift?.accountBalances?.[acc.id!]?.currentBalance || acc.currentBalance || 0), 0)
                          )}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                          {(() => {
                            const totalExpected = (currentShift?.netCashFlow || 0) +
                              allAccounts.reduce((sum, acc) => 
                                sum + (currentShift?.accountBalances?.[acc.id!]?.currentBalance || acc.currentBalance || 0), 0);
                            const totalActual = closingCash.total +
                              allAccounts.reduce((sum, acc) => 
                                sum + (accountClosingBalances[acc.id!] || currentShift?.accountBalances?.[acc.id!]?.currentBalance || acc.currentBalance || 0), 0);
                            return getVarianceDisplay(totalActual - totalExpected);
                          })()}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
                
                {/* Variance Alert */}
                {(() => {
                  const totalExpected = (currentShift?.netCashFlow || 0) +
                    allAccounts.reduce((sum, acc) => 
                      sum + (currentShift?.accountBalances?.[acc.id!]?.currentBalance || acc.currentBalance || 0), 0);
                  const totalActual = closingCash.total +
                    allAccounts.reduce((sum, acc) => 
                      sum + (accountClosingBalances[acc.id!] || currentShift?.accountBalances?.[acc.id!]?.currentBalance || acc.currentBalance || 0), 0);
                  const totalVariance = totalActual - totalExpected;
                  
                  if (Math.abs(totalVariance) > 0.01) {
                    return (
                      <Alert severity={Math.abs(totalVariance) > 10 ? 'warning' : 'info'} sx={{ mt: 2 }}>
                        {isArabic 
                          ? `يوجد فرق قدره ${formatCurrency(Math.abs(totalVariance))} ${totalVariance > 0 ? 'زيادة' : 'نقص'}`
                          : `There is a variance of ${formatCurrency(Math.abs(totalVariance))} ${totalVariance > 0 ? 'over' : 'short'}`}
                      </Alert>
                    );
                  }
                  return null;
                })()}
              </Box>
            )}
            
            {/* Notes field - appears on all tabs */}
            <TextField
              fullWidth
              label={isArabic ? 'ملاحظات الإغلاق (اختياري)' : 'Closing Notes (Optional)'}
              multiline
              rows={2}
              value={shiftNotes}
              onChange={(e) => setShiftNotes(e.target.value)}
              sx={{ mt: 3 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCloseShiftDialog(false)}>{isArabic ? 'إلغاء' : 'Cancel'}</Button>
          <Button onClick={handleCloseShift} variant="contained" color="error">
            {isArabic ? 'إغلاق الوردية' : 'Close Shift'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Cash Drop Dialog */}
      <Dialog open={cashDropDialog} onClose={() => setCashDropDialog(false)}>
        <DialogTitle>{isArabic ? 'إيداع نقدي' : 'Cash Drop'}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {isArabic ? 'نقل النقود الزائدة من الصندوق إلى الخزنة' : 'Move excess cash from register to safe'}
            </Typography>
            
            <TextField
              fullWidth
              label={isArabic ? 'المبلغ' : 'Amount'}
              type="number"
              value={adjustmentAmount}
              onChange={(e) => setAdjustmentAmount(e.target.value)}
              InputProps={{ 
                startAdornment: isArabic ? 'جنيه' : 'EGP',
                inputProps: { min: 0, step: 0.01 }
              }}
              sx={{ mt: 2 }}
            />
            
            <TextField
              fullWidth
              label={isArabic ? 'ملاحظات (اختياري)' : 'Notes (Optional)'}
              multiline
              rows={2}
              value={adjustmentReason}
              onChange={(e) => setAdjustmentReason(e.target.value)}
              sx={{ mt: 2 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCashDropDialog(false)}>{isArabic ? 'إلغاء' : 'Cancel'}</Button>
          <Button onClick={handleCashDrop} variant="contained" color="warning">
            {isArabic ? 'تنفيذ الإيداع' : 'Perform Drop'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Adjustment Dialog */}
      <Dialog open={adjustmentDialog} onClose={() => setAdjustmentDialog(false)}>
        <DialogTitle>{isArabic ? 'تعديل النقد' : 'Cash Adjustment'}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Button
                  fullWidth
                  variant={adjustmentType === 'pay_in' ? 'contained' : 'outlined'}
                  color="success"
                  onClick={() => setAdjustmentType('pay_in')}
                  startIcon={isArabic ? null : <AddCircleOutline />}
                  endIcon={isArabic ? <AddCircleOutline /> : null}
                >
                  {isArabic ? 'إضافة نقد' : 'Pay In'}
                </Button>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Button
                  fullWidth
                  variant={adjustmentType === 'pay_out' ? 'contained' : 'outlined'}
                  color="error"
                  onClick={() => setAdjustmentType('pay_out')}
                  startIcon={isArabic ? null : <RemoveCircleOutline />}
                  endIcon={isArabic ? <RemoveCircleOutline /> : null}
                >
                  {isArabic ? 'سحب نقد' : 'Pay Out'}
                </Button>
              </Box>
            </Box>
            
            <TextField
              fullWidth
              label={isArabic ? 'المبلغ' : 'Amount'}
              type="number"
              value={adjustmentAmount}
              onChange={(e) => setAdjustmentAmount(e.target.value)}
              InputProps={{ 
                startAdornment: isArabic ? 'جنيه' : 'EGP',
                inputProps: { min: 0, step: 0.01 }
              }}
              sx={{ mt: 2 }}
            />
            
            <TextField
              fullWidth
              label={isArabic ? 'السبب' : 'Reason'}
              value={adjustmentReason}
              onChange={(e) => setAdjustmentReason(e.target.value)}
              sx={{ mt: 2 }}
              required
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAdjustmentDialog(false)}>{isArabic ? 'إلغاء' : 'Cancel'}</Button>
          <Button 
            onClick={handleAdjustment} 
            variant="contained" 
            color={adjustmentType === 'pay_in' ? 'success' : 'error'}
            disabled={!adjustmentAmount || !adjustmentReason}
          >
            {isArabic 
              ? (adjustmentType === 'pay_in' ? 'تسجيل الإضافة' : 'تسجيل السحب')
              : `Record ${adjustmentType === 'pay_in' ? 'Pay In' : 'Pay Out'}`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Transfer Dialog */}
      <Dialog open={transferDialog} onClose={() => setTransferDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{isArabic ? 'تحويل بين الحسابات' : 'Transfer Between Accounts'}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {isArabic ? 'تحويل الأموال بين الحسابات المختلفة' : 'Transfer funds between different accounts'}
            </Typography>
            
            <TextField
              select
              fullWidth
              label={isArabic ? 'من حساب' : 'From Account'}
              value={transferFromAccount}
              onChange={(e) => setTransferFromAccount(e.target.value)}
              margin="normal"
              SelectProps={{
                native: true,
              }}
            >
              <option value=""></option>
              {allAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} - {formatCurrency(currentShift?.accountBalances?.[account.id!]?.currentBalance || account.currentBalance || 0)}
                </option>
              ))}
            </TextField>
            
            <TextField
              select
              fullWidth
              label={isArabic ? 'إلى حساب' : 'To Account'}
              value={transferToAccount}
              onChange={(e) => setTransferToAccount(e.target.value)}
              margin="normal"
              SelectProps={{
                native: true,
              }}
            >
              <option value=""></option>
              {allAccounts
                .filter(account => account.id !== transferFromAccount)
                .map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
              ))}
            </TextField>
            
            <TextField
              fullWidth
              label={isArabic ? 'المبلغ' : 'Amount'}
              type="number"
              value={transferAmount}
              onChange={(e) => setTransferAmount(e.target.value)}
              margin="normal"
              InputProps={{
                startAdornment: <InputAdornment position="start">EGP</InputAdornment>,
              }}
              inputProps={{ min: 0, step: 0.01 }}
            />
            
            <TextField
              fullWidth
              label={isArabic ? 'الوصف (اختياري)' : 'Description (optional)'}
              value={transferDescription}
              onChange={(e) => setTransferDescription(e.target.value)}
              margin="normal"
              multiline
              rows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setTransferDialog(false);
            setTransferFromAccount('');
            setTransferToAccount('');
            setTransferAmount('');
            setTransferDescription('');
          }}>
            {isArabic ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button onClick={handleTransfer} variant="contained" color="primary">
            {isArabic ? 'تنفيذ التحويل' : 'Perform Transfer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default CashRegisterPage;