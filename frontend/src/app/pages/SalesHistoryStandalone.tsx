import { useState, useEffect } from 'react';
import { Download, RefreshCw, Calendar, TrendingUp, Package, DollarSign, ChevronDown, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { authenticatedFetch } from '../utils/api';

interface SaleLog {
  log_id: string;
  product_name: string;
  batch_number: string;
  qty_sold: number;
  logged_at: string;
}

export function SalesHistoryStandalone() {
  const navigate = useNavigate();
  const [history, setHistory] = useState<Record<string, SaleLog[]>>({});
  const [loading, setLoading] = useState(true);
  const [expandedDays, setExpandedDays] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState(30);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await authenticatedFetch(`/api/sales/history?days=${dateRange}`);
      const data = await res.json();
      setHistory(data.history ?? {});
    } catch {
      // Ignore errors
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [dateRange]);

  const toggleDay = (date: string) => {
    setExpandedDays((prev) =>
      prev.includes(date) ? prev.filter((d) => d !== date) : [...prev, date]
    );
  };

  const toggleAll = () => {
    if (expandedDays.length > 0) {
      setExpandedDays([]);
    } else {
      setExpandedDays(Object.keys(history));
    }
  };

  // Download single day CSV
  const downloadDayCSV = (date: string, logs: SaleLog[]) => {
    const rows: string[][] = [['Product', 'Batch', 'Qty Sold', 'Logged At']];
    
    logs.forEach((log) => {
      rows.push([
        log.product_name,
        log.batch_number,
        log.qty_sold.toString(),
        log.logged_at,
      ]);
    });

    const csv = rows.map((r) => r.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales_${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Download all days CSV
  const downloadAllCSV = () => {
    const rows: string[][] = [['Date', 'Product', 'Batch', 'Qty Sold', 'Logged At']];
    
    Object.entries(history)
      .sort(([a], [b]) => b.localeCompare(a))
      .forEach(([date, logs]) => {
        logs.forEach((log) => {
          rows.push([
            date,
            log.product_name,
            log.batch_number,
            log.qty_sold.toString(),
            log.logged_at,
          ]);
        });
      });

    const csv = rows.map((r) => r.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales_history_${dateRange}days_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Calculate statistics
  const totalDays = Object.keys(history).length;
  const totalItems = Object.values(history).reduce((sum, logs) => sum + logs.length, 0);
  const totalUnits = Object.values(history).reduce(
    (sum, logs) => sum + logs.reduce((s, log) => s + log.qty_sold, 0),
    0
  );
  const avgUnitsPerDay = totalDays > 0 ? (totalUnits / totalDays).toFixed(1) : '0';

  return (
    <div className="flex flex-col h-screen bg-[#F8FAFC]">
      {/* Header */}
      <div className="bg-white border-b-2 border-[#0F172A] flex-shrink-0">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-white border-2 border-[#0F172A] text-[#0F172A] hover:bg-[#F0FDF4] transition-all"
              >
                <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
              </button>
              <div>
                <h1 className="text-2xl font-black uppercase text-[#0F172A] tracking-tight">
                  Sales History Report
                </h1>
                <p className="text-sm text-[#64748B] mt-1">
                  Complete sales records for the past {dateRange} days
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchHistory}
                disabled={loading}
                className="px-5 py-2.5 text-sm font-bold text-[#0F172A] border-2 border-[#0F172A] bg-white hover:bg-[#F0FDF4] transition-all flex items-center gap-2"
                style={{ borderRadius: '999px' }}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} strokeWidth={2.5} />
                Refresh
              </button>
              <button
                onClick={downloadAllCSV}
                disabled={Object.keys(history).length === 0}
                className="px-6 py-2.5 text-sm font-black text-white bg-[#16a34a] hover:bg-[#15803d] transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ borderRadius: '999px' }}
              >
                <Download className="w-4 h-4" strokeWidth={3} />
                Download All
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-8 py-8 pb-20">
          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-6 mb-8">
          <div className="bg-white border-2 border-[#0F172A] rounded-3xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full bg-[#DBEAFE] border-2 border-[#0F172A] flex items-center justify-center">
                <Calendar className="w-6 h-6 text-[#2563EB]" strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-[10px] font-black text-[#94A3B8] uppercase tracking-widest">
                  Days Tracked
                </p>
                <p className="text-3xl font-black text-[#0F172A]">{totalDays}</p>
              </div>
            </div>
          </div>

          <div className="bg-white border-2 border-[#0F172A] rounded-3xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full bg-[#FEF3C7] border-2 border-[#0F172A] flex items-center justify-center">
                <Package className="w-6 h-6 text-[#D97706]" strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-[10px] font-black text-[#94A3B8] uppercase tracking-widest">
                  Total Items
                </p>
                <p className="text-3xl font-black text-[#0F172A]">{totalItems}</p>
              </div>
            </div>
          </div>

          <div className="bg-white border-2 border-[#0F172A] rounded-3xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full bg-[#DCFCE7] border-2 border-[#0F172A] flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-[#16a34a]" strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-[10px] font-black text-[#94A3B8] uppercase tracking-widest">
                  Total Units
                </p>
                <p className="text-3xl font-black text-[#0F172A]">{totalUnits}</p>
              </div>
            </div>
          </div>

          <div className="bg-white border-2 border-[#0F172A] rounded-3xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full bg-[#FCE7F3] border-2 border-[#0F172A] flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-[#EC4899]" strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-[10px] font-black text-[#94A3B8] uppercase tracking-widest">
                  Avg/Day
                </p>
                <p className="text-3xl font-black text-[#0F172A]">{avgUnitsPerDay}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Date Range Selector */}
        <div className="bg-white border-2 border-[#0F172A] rounded-3xl p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-[10px] font-black text-[#94A3B8] uppercase tracking-widest mb-3">
                Select Date Range
              </label>
              <div className="flex gap-2">
                {[7, 14, 30].map((days) => (
                  <button
                    key={days}
                    onClick={() => setDateRange(days)}
                    className={`px-5 py-2.5 text-sm font-bold border-2 border-[#0F172A] transition-all ${
                      dateRange === days
                        ? 'bg-[#16a34a] text-white'
                        : 'bg-white text-[#0F172A] hover:bg-[#F0FDF4]'
                    }`}
                    style={{ borderRadius: '999px' }}
                  >
                    {days} days
                  </button>
                ))}
              </div>
            </div>

            {Object.keys(history).length > 0 && (
              <button
                onClick={toggleAll}
                className="px-5 py-2.5 text-sm font-bold text-[#0F172A] border-2 border-[#0F172A] bg-white hover:bg-[#F0FDF4] transition-all"
                style={{ borderRadius: '999px' }}
              >
                {expandedDays.length > 0 ? 'Collapse All' : 'Expand All'}
              </button>
            )}
          </div>
        </div>

        {/* Daily Records */}
        <div className="bg-white border-2 border-[#0F172A] rounded-3xl p-8">
          <h2 className="text-xl font-black uppercase text-[#0F172A] mb-6 tracking-tight">
            Daily Sales Records
          </h2>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="w-8 h-8 text-[#94A3B8] animate-spin" />
            </div>
          ) : Object.keys(history).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Calendar className="w-16 h-16 text-[#E2E8F0] mb-4" strokeWidth={1.5} />
              <p className="text-[#94A3B8] text-sm font-medium">
                No sales history available for the selected period
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(history)
                .sort(([a], [b]) => b.localeCompare(a))
                .map(([date, logs]) => {
                  const isExpanded = expandedDays.includes(date);
                  const totalQty = logs.reduce((sum, log) => sum + log.qty_sold, 0);
                  const dateObj = new Date(date);
                  const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
                  const formattedDate = dateObj.toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  });

                  return (
                    <div
                      key={date}
                      className="bg-[#F8FAFC] border-2 border-[#E2E8F0] rounded-2xl overflow-hidden"
                    >
                      <div className="flex items-center justify-between p-6">
                        <button
                          onClick={() => toggleDay(date)}
                          className="flex items-center gap-4 flex-1 text-left hover:opacity-80 transition-opacity"
                        >
                          <ChevronDown
                            className={`w-6 h-6 text-[#0F172A] transition-transform ${
                              isExpanded ? 'rotate-180' : ''
                            }`}
                            strokeWidth={2.5}
                          />
                          <div>
                            <p className="text-lg font-black text-[#0F172A]">
                              {formattedDate}
                            </p>
                            <p className="text-sm text-[#64748B] mt-1 font-medium">
                              {dayName} · {logs.length} transaction{logs.length !== 1 ? 's' : ''} · {totalQty} units sold
                            </p>
                          </div>
                        </button>
                        <div className="flex items-center gap-3">
                          <span
                            className="px-5 py-2 bg-[#16a34a] text-white text-sm font-black border-2 border-[#0F172A]"
                            style={{ borderRadius: '999px' }}
                          >
                            {totalQty} UNITS
                          </span>
                          <button
                            onClick={() => downloadDayCSV(date, logs)}
                            className="px-5 py-2 bg-white text-[#0F172A] text-sm font-bold border-2 border-[#0F172A] hover:bg-[#F0FDF4] transition-all flex items-center gap-2"
                            style={{ borderRadius: '999px' }}
                          >
                            <Download className="w-4 h-4" strokeWidth={2.5} />
                            Download
                          </button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="border-t-2 border-[#E2E8F0] bg-white">
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead>
                                <tr className="border-b-2 border-[#E2E8F0]">
                                  <th className="px-6 py-4 text-left text-[10px] font-black text-[#94A3B8] uppercase tracking-widest">
                                    Product Name
                                  </th>
                                  <th className="px-6 py-4 text-left text-[10px] font-black text-[#94A3B8] uppercase tracking-widest">
                                    Batch Number
                                  </th>
                                  <th className="px-6 py-4 text-left text-[10px] font-black text-[#94A3B8] uppercase tracking-widest">
                                    Quantity
                                  </th>
                                  <th className="px-6 py-4 text-left text-[10px] font-black text-[#94A3B8] uppercase tracking-widest">
                                    Time
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {logs.map((log, idx) => (
                                  <tr
                                    key={log.log_id}
                                    className={`border-b border-[#F3F4F6] last:border-0 hover:bg-[#F8FAFC] transition-colors ${
                                      idx % 2 === 0 ? 'bg-white' : 'bg-[#FAFBFC]'
                                    }`}
                                  >
                                    <td className="px-6 py-4 text-sm font-bold text-[#0F172A]">
                                      {log.product_name}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-[#64748B] font-mono">
                                      {log.batch_number}
                                    </td>
                                    <td className="px-6 py-4">
                                      <span
                                        className="inline-flex px-3 py-1 bg-[#DCFCE7] text-[#16a34a] text-xs font-black border border-[#16a34a]"
                                        style={{ borderRadius: '999px' }}
                                      >
                                        {log.qty_sold}
                                      </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-[#94A3B8] font-medium">
                                      {log.logged_at}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>
    </div>
    </div>
  );
}
