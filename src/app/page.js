"use client";

import { useState, useEffect, useMemo } from "react";
import { normalizeTransactions, parseLedgerCSV, calculateMonthlyIncome } from '@/lib/ledgerUtils';
import { calculateTargetMetric } from '@/lib/forecastUtils';
import actualsData from '@/data/forecast_actuals.json';
import MetricCard from "@/components/MetricCard";
import AssetTable from "@/components/AssetTable";
import Sidebar from "@/components/Sidebar";
import TransactionLedger from "@/components/TransactionLedger";
import TransactionForm from "@/components/TransactionForm";
import RealEstateTab from "@/components/RealEstateTab";
import LiveTrackingTab from "@/components/LiveTrackingTab";
import EquityTab from "@/components/EquityTab";
import CryptoTab from "@/components/CryptoTab";
import PensionsTab from "@/components/PensionsTab";
import FixedIncomeTab from "@/components/FixedIncomeTab";
import ForecastTab from "@/components/ForecastTab";
import GeneralLedgerTab from "@/components/GeneralLedgerTab";
import DebtTab from "@/components/DebtTab";
import CurrencyPill from "@/components/CurrencyPill";
import ConfirmationModal from "@/components/ConfirmationModal";
import DashboardTab from "@/components/DashboardTab";
// fixedIncomeTransactions removed
import {
  getFixedIncomeSummary,
  getEquitySummary,
  getCryptoSummary,
  getPensionSummary,
  getRealEstateSummary,
  getDebtSummary
} from "@/lib/portfolioUtils";



import pensionMap from '@/data/pension_fund_map.json';

export default function Home() {
  const [transactions, setTransactions] = useState([]);
  const [equityTransactions, setEquityTransactions] = useState([]);
  const [cryptoTransactions, setCryptoTransactions] = useState([]);
  const [pensionTransactions, setPensionTransactions] = useState([]);
  const [debtTransactions, setDebtTransactions] = useState([]);
  const [realEstate, setRealEstate] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState(null);
  const [marketData, setMarketData] = useState({});
  const [pensionPrices, setPensionPrices] = useState({});
  const [rates, setRates] = useState({ GBP: 1, BRL: 7.10, USD: 1.28 });
  const [loadingRates, setLoadingRates] = useState(true);
  // Data States
  const [fixedIncomeTransactions, setFixedIncomeTransactions] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [historicalSnapshots, setHistoricalSnapshots] = useState([]);

  const parseDate = (dateStr) => {
    if (!dateStr) return new Date();
    // Check if ISO or DD/MM/YYYY
    if (dateStr.includes('-')) return new Date(dateStr);
    const [day, month, year] = dateStr.split('/').map(Number);
    return new Date(year, month - 1, day);
  };

  const refreshAllData = () => {
    fetch('/api/fixed-income').then(res => res.json()).then(setFixedIncomeTransactions);
    fetch('/api/pensions').then(res => res.json()).then(setPensionTransactions);
    fetch('/api/debt-transactions').then(res => res.json()).then(setDebtTransactions);
    fetch('/api/history').then(res => res.json()).then(data => setHistoricalSnapshots(data));
    fetchMarketData();
  };

  useEffect(() => {
    refreshAllData();
  }, []);

  // Synchronize with API database on mount
  const fetchRealEstate = () => {
    fetch('/api/real-estate')
      .then(res => res.json())
      .then(data => setRealEstate(data))
      .catch(err => console.error('Failed to load real estate:', err));
  };

  const fetchMarketData = async () => {
    try {
      // 1. Fetch available tickers from all APIs in parallel
      const [assetsRes, eqRes, reRes, cryptoRes] = await Promise.all([
        fetch('/api/live-assets'),
        fetch('/api/equity-transactions'),
        fetch('/api/real-estate'),
        fetch('/api/crypto-transactions')
      ]);

      const [assets, eqData, reData, cryptoData] = await Promise.all([
        assetsRes.json(),
        eqRes.json(),
        reRes.json(),
        cryptoRes.json()
      ]);

      const tickerSet = new Set(assets && assets.length > 0 ? assets.map(a => a.ticker).filter(t => t !== 'CASH') : []);

      if (Array.isArray(eqData)) {
        eqData.forEach(tr => { if (tr.ticker && tr.ticker !== 'CASH') tickerSet.add(tr.ticker); });
      }

      if (reData?.funds?.holdings) {
        reData.funds.holdings.forEach(h => { if (h.ticker) tickerSet.add(h.ticker + '.SA'); });
      }

      if (Array.isArray(cryptoData)) {
        cryptoData.forEach(tr => {
          if (tr.ticker) {
            const t = tr.ticker;
            tickerSet.add(t.endsWith('-USD') ? t : t + '-USD');
          }
        });
      }

      // 5. Auto-derive tickers from pension map (NEW)
      pensionMap.forEach(p => {
        if (p.ticker && p.type === 'market-data') {
          tickerSet.add(p.ticker);
        }
      });

      // Add currency pairs
      tickerSet.add('GBP-BRL');
      tickerSet.add('GBP-USD');

      const tickers = Array.from(tickerSet);

      // 4. Get market data for those assets
      const marketRes = await fetch('/api/market-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tickers })
      });
      const data = await marketRes.json();
      setMarketData(data);

      // Update rates if available
      if (data['GBP-BRL']?.price) {
        setRates(prev => ({ ...prev, BRL: data['GBP-BRL'].price }));
      }
      if (data['GBP-USD']?.price) {
        setRates(prev => ({ ...prev, USD: data['GBP-USD'].price }));
      }
      setLastUpdated(new Date());
      setLoadingRates(false);
      setIsInitialLoading(false);

    } catch (error) {
      console.error('Failed to fetch market data:', error);
      setLoadingRates(false);
    }
  };

  useEffect(() => {
    fetch('/api/transactions')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setTransactions(data);
      })
      .catch(err => console.error('Failed to load transactions:', err));

    fetch('/api/equity-transactions')
      .then(res => res.json())
      .then(data => setEquityTransactions(Array.isArray(data) ? data : []))
      .catch(err => console.error('Failed to load equity transactions:', err));

    fetch('/api/crypto-transactions')
      .then(res => res.json())
      .then(data => setCryptoTransactions(Array.isArray(data) ? data : []))
      .catch(err => console.error('Failed to load crypto transactions:', err));

    // api/pension-transactions fetch removed (replaced by api/pensions)

    fetch('/api/debt-transactions')
      .then(res => res.json())
      .then(data => setDebtTransactions(Array.isArray(data) ? data : []))
      .catch(err => console.error('Failed to load debt transactions:', err));

    fetch('/api/pension-prices')
      .then(res => res.json())
      .then(data => {
        setPensionPrices(data);
        // Trigger background refresh to ensure consistency with PensionsTab
        fetch('/api/pension-prices?refresh=true')
          .then(res => res.json())
          .then(newData => setPensionPrices(prev => ({ ...prev, ...newData })))
          .catch(e => console.error('Background pension refresh failed:', e));
      })
      .catch(err => console.error('Failed to load pension prices:', err));

    // Fetch Historical Snapshots
    // fetch(`/api/snapshots?t=${Date.now()}`) replaced by fetch('/api/history') above

    fetchRealEstate();
    fetchMarketData();

    // Fetch Ledger Data & FX History for Contribution Calculation
    fetch('/api/ledger-data')
      .then(res => res.json())
      .then(data => setLedgerData(data.content))
      .catch(err => console.error("Failed to load ledger csv", err));

    fetch('/api/fx-rates')
      .then(res => res.json())
      .then(data => setFxHistory(data))
      .catch(err => console.error("Failed to load FX rates", err));
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeTab]);

  const [ledgerData, setLedgerData] = useState('');
  const [fxHistory, setFxHistory] = useState({});

  // Calculate Salary Contribution for Live Row
  const calculateLiveContribution = () => {
    if (!ledgerData || !ledgerData.income) return 0;

    const historicalIncome = ledgerData.income;

    // Filter out current month from historical to match GeneralLedgerTab logic
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const filteredHistorical = historicalIncome.filter(h => h.month !== currentMonth);

    const allLive = normalizeTransactions({
      equity: equityTransactions,
      crypto: cryptoTransactions,
      pensions: pensionTransactions,
      debt: debtTransactions,
      fixedIncome: transactions, // Fixed Income transactions
      fixedIncome: transactions, // Fixed Income transactions
      realEstate: realEstate || { properties: [], funds: { transactions: [], holdings: [] }, inkCourt: null, airbnb: null }
    }, rates, fxHistory);

    const combinedIncome = calculateMonthlyIncome(allLive, realEstate, filteredHistorical, transactions);
    const currentMonthData = combinedIncome.find(d => d.month === currentMonth);

    return currentMonthData ? currentMonthData.salary : 0;
  };

  const liveSalaryContribution = calculateLiveContribution();

  const sortedTransactions = [...transactions].sort((a, b) => parseDate(b.date) - parseDate(a.date));

  const handleSaveTransaction = async (formData) => {
    try {
      if (formData.id) {
        // Edit existing
        await fetch('/api/transactions', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
      } else {
        // Add new
        await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
      }

      // Refresh relevant tabs
      fetchRealEstate();
      fetch('/api/fixed-income').then(res => res.json()).then(setFixedIncomeTransactions);
      fetch('/api/transactions').then(res => res.json()).then(setTransactions);
      fetch('/api/pensions').then(res => res.json()).then(setPensionTransactions);
      fetch('/api/debt-transactions').then(res => res.json()).then(setDebtTransactions);
      fetchMarketData();

      setIsFormOpen(false);
      setEditingTransaction(null);
    } catch (error) {
      console.error('Failed to save transaction:', error);
    }
  };

  const handleEditTransaction = (transaction) => {
    setEditingTransaction(transaction);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (id) => {
    setTransactionToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!transactionToDelete) return;
    try {
      await fetch(`/api/transactions?id=${transactionToDelete}`, { method: 'DELETE' });
      setTransactions(transactions.filter(tr => tr.id !== transactionToDelete));

      // Refresh relevant tabs
      fetchRealEstate();
      fetch('/api/transactions').then(res => res.json()).then(setTransactions);
      fetch('/api/fixed-income').then(res => res.json()).then(setFixedIncomeTransactions);
      fetch('/api/pensions').then(res => res.json()).then(setPensionTransactions);
      fetch('/api/debt-transactions').then(res => res.json()).then(setDebtTransactions);
      fetchMarketData();

      setIsDeleteModalOpen(false);
      setTransactionToDelete(null);
    } catch (error) {
      console.error('Failed to delete transaction:', error);
    }
  };

  // New Calculation Logic using aggregated summaries (MEMOIZED)
  const fixedIncomeData = useMemo(() => getFixedIncomeSummary(fixedIncomeTransactions, rates), [fixedIncomeTransactions, rates]);
  const equityData = useMemo(() => getEquitySummary(equityTransactions, marketData, rates), [equityTransactions, marketData, rates]);
  const cryptoData = useMemo(() => getCryptoSummary(cryptoTransactions, marketData, rates), [cryptoTransactions, marketData, rates]);
  const pensionData = useMemo(() => getPensionSummary(pensionTransactions, rates, pensionPrices, marketData), [pensionTransactions, rates, pensionPrices, marketData]);
  const realEstateData = useMemo(() => getRealEstateSummary(realEstate || {}, marketData, rates), [realEstate, marketData, rates]);
  const debtData = useMemo(() => getDebtSummary(debtTransactions, rates), [debtTransactions, rates]);

  const totalFixedIncomeBRL = fixedIncomeData.total.brl;
  const totalEquityBRL = equityData.total.brl;
  const totalCryptoBRL = cryptoData.total.brl;
  const totalPensionBRL = pensionData.total.brl;
  const totalRealEstateBRL = realEstateData.total.brl;
  const totalDebtBRL = debtData.total.brl;

  // Fetch Forecast Settings
  const [forecastSettings, setForecastSettings] = useState({});
  useEffect(() => {
    // Forecast Settings
    fetch('/api/forecast-settings')
      .then(res => res.json())
      .then(data => setForecastSettings(data))
      .catch(err => console.error("Failed to load settings", err));
  }, []);

  const totalNetWorthBRL = totalFixedIncomeBRL + totalEquityBRL + totalCryptoBRL + totalPensionBRL + totalRealEstateBRL - totalDebtBRL;



  // Calculate Diffs
  let diffPrevMonth = { amount: 0, percentage: 0 };
  let diffPrevMonthGBP = { amount: 0, percentage: 0 }; // New GBP Diff
  let diffTarget = { amount: 0, percentage: 0 };
  let diffTargetGBP = { amount: 0, percentage: 0 }; // New GBP Diff
  let assetDiffs = {};

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  if (historicalSnapshots.length > 0) {
    // Sort snapshots by date
    const sortedSnapshots = [...historicalSnapshots].sort((a, b) => a.month.localeCompare(b.month));

    // Find the snapshot that is strictly BEFORE the current month.
    //Ideally we want the immediate previous month, but if missing, take the latest available past snapshot.
    const pastSnapshots = sortedSnapshots.filter(s => s.month < currentMonth);
    const prevSnapshot = pastSnapshots.length > 0 ? pastSnapshots[pastSnapshots.length - 1] : null;

    if (prevSnapshot) {
      // Prev Net Worth
      const prevNetWorth = prevSnapshot.networthBRL || prevSnapshot.totalBRL || 0;

      // Calculate Prev Net Worth in GBP
      // Best effort: if snapshot has it, use it. Else convert using CURRENT rate (approx) or implied rate if available.
      // Current rate approach matches how we display "Current GBP" (Current BRL / Current Rate).
      // So to be consistent with "Current GBP vs Prev GBP", Prev GBP should probably be "Prev BRL / Current Rate" IF we want to show "Real Growth" excluding FX?
      // NO, usually we want to know if our GBP value grew. So we need the ACTUAL GBP value at that time.
      // If snapshot doesn't have it, we fallback to BRL/Rate.

      const prevNetWorthGBP = prevSnapshot.networthGBP || (prevNetWorth / rates.BRL);

      if (prevNetWorth > 0) {
        // Current vs Prev (BRL)
        diffPrevMonth.amount = totalNetWorthBRL - prevNetWorth;
        diffPrevMonth.percentage = ((totalNetWorthBRL - prevNetWorth) / prevNetWorth) * 100;

        // Current vs Prev (GBP)
        const currentNetWorthGBP = totalNetWorthBRL / rates.BRL;
        diffPrevMonthGBP.amount = currentNetWorthGBP - prevNetWorthGBP;
        diffPrevMonthGBP.percentage = ((currentNetWorthGBP - prevNetWorthGBP) / prevNetWorthGBP) * 100;
      }

      // Asset Diffs
      // Categories in Snapshot are Object: { 'Equity': val, ... }
      const snapshotCats = prevSnapshot.categories || {};

      const categories = ['FixedIncome', 'Equity', 'RealEstate', 'Crypto', 'Pensions', 'Debt'];
      categories.forEach(cat => {
        // Mapping cat names to IDs
        const catIdMap = {
          'FixedIncome': 'fixed-income',
          'Equity': 'equity',
          'RealEstate': 'real-estate',
          'Crypto': 'crypto',
          'Pensions': 'pensions',
          'Debt': 'debt'
        };
        const catId = catIdMap[cat];
        const prevAmount = snapshotCats[cat] || 0;

        // Current Amount
        let currentAmount = 0;
        if (cat === 'FixedIncome') currentAmount = totalFixedIncomeBRL;
        else if (cat === 'Equity') currentAmount = totalEquityBRL;
        else if (cat === 'RealEstate') currentAmount = totalRealEstateBRL;
        else if (cat === 'Crypto') currentAmount = totalCryptoBRL;
        else if (cat === 'Pensions') currentAmount = totalPensionBRL;
        else if (cat === 'Debt') currentAmount = totalDebtBRL;

        assetDiffs[catId] = {
          amount: currentAmount - prevAmount,
          percentage: prevAmount !== 0 ? ((currentAmount - prevAmount) / prevAmount) * 100 : 0
        };
      });
    }
  }

  // Calculate Target Diff
  const { target } = calculateTargetMetric(new Date(), forecastSettings, actualsData);
  if (target > 0) {
    diffTarget.amount = totalNetWorthBRL - target;
    diffTarget.percentage = (diffTarget.amount / target) * 100;

    // Target GBP Diff
    const targetGBP = target / rates.BRL; // Convert target (BRL) to GBP
    const currentNetWorthGBP = totalNetWorthBRL / rates.BRL;
    diffTargetGBP.amount = currentNetWorthGBP - targetGBP;
    diffTargetGBP.percentage = (diffTargetGBP.amount / targetGBP) * 100;
  }


  const dashboardData = {
    netWorth: { amount: totalNetWorthBRL, percentage: 0, currency: "BRL" },
    summaries: [
      { id: 'fixed-income', title: "Fixed Income", amount: totalFixedIncomeBRL, percentage: 0, currency: "BRL" },
      { id: 'equity', title: "Equity", amount: totalEquityBRL, percentage: 0, currency: "BRL" },
      { id: 'real-estate', title: "Real Estate", amount: totalRealEstateBRL, percentage: 0, currency: "BRL" },
      { id: 'crypto', title: "Crypto", amount: totalCryptoBRL, percentage: 0, currency: "BRL" },
      { id: 'pensions', title: "Pensions", amount: totalPensionBRL, percentage: 0, currency: "BRL" },
      { id: 'debt', title: "Debt", amount: totalDebtBRL, percentage: 0, currency: "BRL" },
    ],
    categories: [
      {
        id: 'fixed-income',
        title: 'Fixed Income',
        assets: [...fixedIncomeData.assets, fixedIncomeData.total],
        transactions: sortedTransactions
      },
      {
        id: 'equity',
        title: 'Equity',
        assets: [...equityData.assets, equityData.total]
      },
      {
        id: 'crypto',
        title: 'Crypto',
        assets: [...cryptoData.assets, cryptoData.total]
      },
      {
        id: 'real-estate',
        title: 'Real Estate',
        assets: [...realEstateData.assets, realEstateData.total]
      },
      {
        id: 'pensions',
        title: 'Pensions',
        assets: [...pensionData.assets, pensionData.total]
      },
      {
        id: 'debt',
        title: 'Debt',
        assets: [...debtData.assets, debtData.total]
      }
    ]
  };

  const activeCategory = dashboardData.categories.find(c => c.id === activeTab);

  const handleRecordSnapshot = async () => {
    try {
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

      const snapshot = {
        month: currentMonth,
        networthBRL: totalNetWorthBRL,
        networthGBP: totalNetWorthBRL / rates.BRL,
        totalminuspensionsBRL: totalNetWorthBRL - totalPensionBRL,
        totalminuspensionsGBP: (totalNetWorthBRL - totalPensionBRL) / rates.BRL,
        totalminuspensionsUSD: ((totalNetWorthBRL - totalPensionBRL) / rates.BRL) * rates.USD,
        categories: {
          FixedIncome: totalFixedIncomeBRL,
          Equity: totalEquityBRL,
          RealEstate: totalRealEstateBRL,
          Crypto: totalCryptoBRL,
          Pensions: totalPensionBRL,
          Debt: totalDebtBRL
        },
        recordedAt: new Date().toISOString()
      };

      const response = await fetch('/api/snapshots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(snapshot)
      });

      if (response.ok) {
        const savedSnapshot = await response.json();
        setHistoricalSnapshots(prev => {
          const filtered = prev.filter(s => s.month !== savedSnapshot.month);
          return [...filtered, savedSnapshot].sort((a, b) => a.month.localeCompare(b.month));
        });
        alert('Snapshot recorded successfully!');
      } else {
        alert('Failed to record snapshot.');
      }

    } catch (error) {
      console.error('Error recording snapshot:', error);
      alert('Error recording snapshot.');
    }
  };

  return (
    <div style={{ display: 'flex', gap: '32px', padding: '32px', backgroundColor: 'var(--bg-primary)', minHeight: '100vh' }}>
      <Sidebar activeItem={activeTab} onNavigate={setActiveTab} />

      <main style={{ flex: 1, position: 'relative', zIndex: 1, minWidth: 0 }}>
        <header style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="text-gradient" style={{ fontSize: '2.5rem' }}>
              {activeTab === 'dashboard' ? 'Portfolio Overview' :
                activeTab === 'fixed-income' ? 'Fixed Income' :
                  activeTab === 'live-tracking' ? 'Live Tracking' :
                    activeTab === 'equity' ? 'Equity' :
                      activeTab === 'general-ledger' ? 'General Ledger' :
                        activeCategory?.title}
            </h1>
          </div>
          <CurrencyPill rate={rates.BRL} isLoading={loadingRates} lastUpdated={lastUpdated} />

        </header>

        {activeTab === 'dashboard' ? (
          <DashboardTab
            data={dashboardData}
            rates={rates}
            historicalSnapshots={historicalSnapshots}
            onRecordSnapshot={handleRecordSnapshot}
            diffPrevMonth={diffPrevMonth}
            diffPrevMonthGBP={diffPrevMonthGBP}
            assetDiffs={assetDiffs}
            isLoading={isInitialLoading}
          />
        ) : activeTab === 'real-estate' ? (
          <RealEstateTab
            data={realEstate}
            rates={rates}
            onRefresh={fetchRealEstate}
            marketData={marketData}
          />
        ) : activeTab === 'live-tracking' ? (
          <LiveTrackingTab
            marketData={marketData}
            onRefresh={fetchMarketData}
          />
        ) : activeTab === 'equity' ? (
          <EquityTab
            marketData={marketData}
            rates={rates}
            onRefresh={fetchMarketData}
          />
        ) : activeTab === 'crypto' ? (
          <CryptoTab
            marketData={marketData}
            rates={rates}
          />
        ) : activeTab === 'pensions' ? (
          <PensionsTab
            transactions={pensionTransactions}
            rates={rates}
            onRefresh={refreshAllData}
            onEditClick={handleEditTransaction}
            onDeleteClick={handleDeleteClick}
          />
        ) : activeTab === 'debt' ? (
          <DebtTab
            transactions={debtTransactions}
            rates={rates}
            onRefresh={refreshAllData}
          />
        ) : activeTab === 'fixed-income' ? (
          <FixedIncomeTab
            transactions={fixedIncomeTransactions}
            rates={rates}
            onAddClick={() => { setEditingTransaction(null); setIsFormOpen(true); }}
            onDeleteClick={(id) => { setTransactionToDelete(id); setIsDeleteModalOpen(true); }}
            onEditClick={(tx) => { setEditingTransaction(tx); setIsFormOpen(true); }}
          />
        ) : activeTab === 'forecast' ? (
          <ForecastTab
            currentPortfolioValueBrl={totalNetWorthBRL}
            currentPortfolioValueGbp={totalNetWorthBRL / rates.BRL}
            liveContributionBrl={liveSalaryContribution * rates.BRL}
            liveContributionGbp={liveSalaryContribution}
          />
        ) : activeTab === 'general-ledger' ? (
          <GeneralLedgerTab
            equityTransactions={equityTransactions}
            cryptoTransactions={cryptoTransactions}
            pensionTransactions={pensionTransactions}
            debtTransactions={debtTransactions}
            transactions={transactions}
            realEstate={realEstate}
            rates={rates}
            historicalSnapshots={historicalSnapshots}
            dashboardData={dashboardData}
            onRecordSnapshot={handleRecordSnapshot}
          />
        ) : (
          <>
            <AssetTable
              title={activeCategory?.title}
              assets={activeCategory?.assets || []}
              rates={rates}
            />
            {activeCategory?.transactions && (
              <TransactionLedger
                transactions={activeCategory.transactions}
                rates={rates}
                onAddClick={() => {
                  setEditingTransaction(null);
                  setIsFormOpen(true);
                }}
                onDeleteClick={handleDeleteClick}
                onEditClick={handleEditTransaction}
                collapsible={true}
              />
            )}
          </>
        )}

        {isFormOpen && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div
              style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
              onClick={() => setIsFormOpen(false)}
            />
            <TransactionForm
              onAdd={handleSaveTransaction}
              onCancel={() => setIsFormOpen(false)}
              initialData={editingTransaction}
            />
          </div>
        )}

        <ConfirmationModal
          isOpen={isDeleteModalOpen}
          title="Delete Transaction"
          message="Are you sure you want to delete this transaction? This action cannot be undone."
          onConfirm={handleConfirmDelete}
          onCancel={() => setIsDeleteModalOpen(false)}
        />



      </main>
    </div>
  );
}
