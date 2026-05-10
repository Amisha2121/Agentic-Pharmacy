import { useOutletContext, useNavigate } from 'react-router-dom';
import { Menu, MessageSquare, PackageSearch, ClipboardList, BellRing, Clock, FlaskConical, ArrowRight, Plus, Minus, Save, TrendingUp, AlertCircle, Package, Activity } from 'lucide-react';
import { useState, useEffect } from 'react';
import { authenticatedFetch } from '../utils/api';
import { useAuth } from '../context/AuthContext';

interface ContextType {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
}

interface InventoryItem {
  doc_id: string;
  product_name: string;
  batch_number: string;
  stock: number;
}

interface RecentAction {
  id: string;
  type: 'sale' | 'inventory' | 'alert';
  text: string;
  timestamp: number;
}

export function Dashboard() {
  const { isSidebarOpen, setIsSidebarOpen } = useOutletContext<ContextType>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Quick Dispense
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // Stats
  const [stats, setStats] = useState({
    expiringThisMonth: 0,
    lowStock: 0,
    salesToday: 0,
  });
  
  // Notes
  const [note, setNote] = useState('');
  const [savedNote, setSavedNote] = useState<{ text: string; timestamp: string } | null>(null);
  
  // Recent Activity
  const [recentActions, setRecentActions] = useState<RecentAction[]>([]);

  useEffect(() => {
    fetchInventory();
    fetchStats();
    loadNote();
    loadRecentActions();
  }, []);

  const fetchInventory = async () => {
    try {
      const res = await authenticatedFetch('/api/inventory');
      const data = await res.json();
      setInventory(data.items ?? []);
    } catch { /* ignore */ }
  };

  const fetchStats = async () => {
    try {
      const [expiredRes, reorderRes, salesRes] = await Promise.all([
        authenticatedFetch('/api/expired'),
        authenticatedFetch('/api/reorder-alerts'),
        authenticatedFetch('/api/sales/today'),
      ]);
      const expiredData = await expiredRes.json();
      const reorderData = await reorderRes.json();
      const salesData = await salesRes.json();
      
      const expiringThisMonth = (expiredData.items ?? []).filter((item: any) => {
        const days = item.days_expired;
        return days < 0 && Math.abs(days) <= 30;
      }).length;
      
      setStats({
        expiringThisMonth,
        lowStock: reorderData.alerts?.length ?? 0,
        salesToday: (salesData.logs ?? []).reduce((sum: number, log: any) => sum + log.qty_sold, 0),
      });
    } catch { /* ignore */ }
  };

  const loadNote = () => {
    try {
      const saved = localStorage.getItem('pharmaai_notes');
      if (saved) setSavedNote(JSON.parse(saved));
    } catch { /* ignore */ }
  };

  const saveNote = () => {
    if (!note.trim()) return;
    const noteData = {
      text: note.trim(),
      timestamp: new Date().toLocaleString(),
    };
    localStorage.setItem('pharmaai_notes', JSON.stringify(noteData));
    setSavedNote(noteData);
    setNote('');
  };

  const clearNote = () => {
    localStorage.removeItem('pharmaai_notes');
    setSavedNote(null);
    setNote('');
  };

  const loadRecentActions = () => {
    try {
      const actions = localStorage.getItem('pharmaai_recent_actions');
      if (actions) setRecentActions(JSON.parse(actions));
    } catch { /* ignore */ }
  };

  const addRecentAction = (type: 'sale' | 'inventory' | 'alert', text: string) => {
    const action: RecentAction = {
      id: Date.now().toString(),
      type,
      text,
      timestamp: Date.now(),
    };
    const updated = [action, ...recentActions].slice(0, 5);
    setRecentActions(updated);
    localStorage.setItem('pharmaai_recent_actions', JSON.stringify(updated));
  };

  const handleQuickDispense = async () => {
    if (!selectedItem || quantity < 1) return;
    try {
      await authenticatedFetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batch_number: selectedItem.batch_number,
          product_name: selectedItem.product_name,
          qty_sold: quantity,
        }),
      });
      addRecentAction('sale', `Dispensed ${quantity}x ${selectedItem.product_name}`);
      setSelectedItem(null);
      setSearchQuery('');
      setQuantity(1);
      fetchStats();
    } catch { /* ignore */ }
  };

  const filtered = inventory.filter((i) =>
    i.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.batch_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRelativeTime = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hr ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const quickAccessCards = [
    { 
      icon: MessageSquare, 
      label: 'Assistant Chat', 
      description: 'AI-powered pharmacy assistant',
      path: '/chat',
      color: '#16a34a'
    },
    { 
      icon: PackageSearch, 
      label: 'Live Inventory', 
      description: 'View and manage stock',
      path: '/inventory',
      color: '#16a34a'
    },
    { 
      icon: ClipboardList, 
      label: 'Log Daily Sales', 
      description: 'Record dispensed medicines',
      path: '/sales',
      color: '#16a34a'
    },
    { 
      icon: BellRing, 
      label: 'Reorder Alerts', 
      description: 'Items running low',
      path: '/reorder',
      color: '#F59E0B'
    },
    { 
      icon: Clock, 
      label: 'Expirations', 
      description: 'Expiring medicines',
      path: '/expired',
      color: '#EF4444'
    },
    { 
      icon: FlaskConical, 
      label: 'Drug Interactions', 
      description: 'Check medicine safety',
      path: '/interactions',
      color: '#8B5CF6'
    },
  ];

  return (
    <div className="flex-1 flex flex-col h-screen w-full relative z-10 bg-[#F8FAFC] overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between p-4 absolute top-0 w-full z-20">
        <div className="flex items-center">
          {!isSidebarOpen && (
            <button 
              onClick={() => setIsSidebarOpen(true)} 
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white border-2 border-[#0F172A] text-[#0F172A] hover:bg-[#F0FDF4] transition-all"
            >
              <Menu className="w-5 h-5" strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>

      {/* Main Content - Scrollable */}
      <div className="flex-1 pt-20 px-8 pb-12 max-w-7xl mx-auto w-full overflow-y-auto" style={{ 
        scrollbarWidth: 'thin',
        scrollbarColor: '#CBD5E1 transparent'
      }}>
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#16a34a] to-[#15803d] flex items-center justify-center border border-[#0F172A]">
              <span className="text-white text-xl">👋</span>
            </div>
            <div>
              <h1 className="text-3xl font-black uppercase text-[#0F172A] tracking-tight" style={{ fontFamily: 'Inter, sans-serif' }}>
                WELCOME BACK
              </h1>
              <p className="text-[14px] text-[#64748B] font-semibold">
                {user?.name || 'Amisha'} • {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </p>
            </div>
          </div>
        </div>

        {/* Today's Snapshot Strip - MOVED TO TOP */}
        <div className="mb-8">
          <h2 className="text-xs font-black uppercase tracking-widest text-[#94A3B8] mb-4">
            TODAY'S OVERVIEW
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <button
              onClick={() => navigate('/expired')}
              className="group bg-gradient-to-br from-amber-50 to-orange-50 border border-[#0F172A] rounded-3xl p-6 text-left hover:shadow-lg transition-all relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400 rounded-full blur-3xl opacity-20 group-hover:opacity-30 transition-opacity" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-full bg-amber-500 border border-[#0F172A] flex items-center justify-center">
                    <Clock className="w-6 h-6 text-white" strokeWidth={2.5} />
                  </div>
                  <ArrowRight className="w-5 h-5 text-amber-600 group-hover:translate-x-1 transition-transform" strokeWidth={2.5} />
                </div>
                <p className="text-4xl font-black text-[#0F172A] mb-2">{stats.expiringThisMonth}</p>
                <p className="text-sm font-bold text-amber-700 uppercase tracking-wide">Expiring Soon</p>
                <p className="text-xs text-amber-600 mt-1">Items expiring this month</p>
              </div>
            </button>

            <button
              onClick={() => navigate('/reorder')}
              className="group bg-gradient-to-br from-red-50 to-pink-50 border border-[#0F172A] rounded-3xl p-6 text-left hover:shadow-lg transition-all relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-400 rounded-full blur-3xl opacity-20 group-hover:opacity-30 transition-opacity" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-full bg-red-500 border border-[#0F172A] flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-white" strokeWidth={2.5} />
                  </div>
                  <ArrowRight className="w-5 h-5 text-red-600 group-hover:translate-x-1 transition-transform" strokeWidth={2.5} />
                </div>
                <p className="text-4xl font-black text-[#0F172A] mb-2">{stats.lowStock}</p>
                <p className="text-sm font-bold text-red-700 uppercase tracking-wide">Low Stock</p>
                <p className="text-xs text-red-600 mt-1">Items need reordering</p>
              </div>
            </button>

            <button
              onClick={() => navigate('/sales')}
              className="group bg-gradient-to-br from-green-50 to-emerald-50 border border-[#0F172A] rounded-3xl p-6 text-left hover:shadow-lg transition-all relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-green-400 rounded-full blur-3xl opacity-20 group-hover:opacity-30 transition-opacity" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-full bg-green-500 border border-[#0F172A] flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-white" strokeWidth={2.5} />
                  </div>
                  <ArrowRight className="w-5 h-5 text-green-600 group-hover:translate-x-1 transition-transform" strokeWidth={2.5} />
                </div>
                <p className="text-4xl font-black text-[#0F172A] mb-2">{stats.salesToday}</p>
                <p className="text-sm font-bold text-green-700 uppercase tracking-wide">Sales Today</p>
                <p className="text-xs text-green-600 mt-1">Units dispensed</p>
              </div>
            </button>
          </div>
        </div>

        {/* Quick Access Section */}
        <div className="mb-8">
          <h2 className="text-xs font-black uppercase tracking-widest text-[#94A3B8] mb-4">
            QUICK ACCESS
          </h2>
          <div className="grid grid-cols-3 gap-4">
            {quickAccessCards.map((card) => (
              <button
                key={card.label}
                onClick={() => navigate(card.path)}
                className="group bg-white border border-[#0F172A] rounded-3xl p-6 text-left hover:bg-[#F0FDF4] hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div 
                    className="w-14 h-14 rounded-full flex items-center justify-center border border-[#0F172A]"
                    style={{ backgroundColor: `${card.color}15` }}
                  >
                    <card.icon className="w-7 h-7" style={{ color: card.color }} strokeWidth={2.5} />
                  </div>
                  <ArrowRight 
                    className="w-5 h-5 text-[#16a34a] group-hover:translate-x-1 transition-transform" 
                    strokeWidth={2.5}
                  />
                </div>
                <h3 className="text-base font-black text-[#0F172A] mb-2 uppercase tracking-tight">
                  {card.label}
                </h3>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  {card.description}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Quick Dispense Bar */}
        <div className="mb-8">
          <h2 className="text-xs font-black uppercase tracking-widest text-[#94A3B8] mb-4">
            QUICK DISPENSE
          </h2>
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-[#0F172A] rounded-3xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-400 rounded-full blur-3xl opacity-10" />
            <div className="relative flex gap-3 items-end">
              <div className="flex-1 relative">
                <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wide mb-2">Medicine</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setIsDropdownOpen(e.target.value.length > 0); setSelectedItem(null); }}
                  onFocus={() => setIsDropdownOpen(searchQuery.length > 0)}
                  placeholder="Search medicine..."
                  className="w-full px-4 py-3 border border-[#0F172A] rounded-full text-sm font-semibold focus:outline-none focus:border-[#16a34a] bg-white"
                />
                {isDropdownOpen && filtered.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-3xl border border-[#0F172A] overflow-hidden z-30 max-h-48 overflow-y-auto">
                    {filtered.slice(0, 5).map((item) => (
                      <button
                        key={item.doc_id}
                        disabled={item.stock <= 0}
                        className="w-full text-left px-4 py-3 hover:bg-[#F0FDF4] border-b border-[#E2E8F0] last:border-0 disabled:opacity-40 disabled:cursor-not-allowed"
                        onClick={() => {
                          if (item.stock > 0) {
                            setSelectedItem(item);
                            setSearchQuery(item.product_name);
                            setIsDropdownOpen(false);
                            setQuantity(1);
                          }
                        }}
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-[#111827]">{item.product_name}</span>
                          <span className="text-xs font-semibold text-[#64748B] bg-[#F8FAFC] px-2 py-1 rounded-full border border-[#0F172A]">{item.stock} units</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wide mb-2">Quantity</label>
                <div className="flex items-center border border-[#0F172A] rounded-full overflow-hidden bg-white">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-12 h-12 flex items-center justify-center text-[#64748B] hover:bg-[#F0FDF4] font-bold">
                    <Minus className="w-4 h-4" strokeWidth={3} />
                  </button>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-16 text-center border-x border-[#0F172A] h-12 text-sm font-black focus:outline-none"
                  />
                  <button onClick={() => setQuantity(quantity + 1)} className="w-12 h-12 flex items-center justify-center text-[#64748B] hover:bg-[#F0FDF4] font-bold">
                    <Plus className="w-4 h-4" strokeWidth={3} />
                  </button>
                </div>
              </div>
              <button
                onClick={handleQuickDispense}
                disabled={!selectedItem || selectedItem.stock <= 0}
                className="bg-[#16a34a] text-white hover:bg-[#15803d] rounded-full px-8 h-12 text-sm font-black disabled:opacity-40 disabled:cursor-not-allowed border border-[#0F172A] uppercase tracking-wide"
              >
                Dispense
              </button>
            </div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-2 gap-6">
          {/* Pinned Notes */}
          <div>
            <h2 className="text-xs font-black uppercase tracking-widest text-[#94A3B8] mb-4">
              NOTES
            </h2>
            <div className="bg-gradient-to-br from-yellow-50 to-amber-50 border border-[#0F172A] rounded-3xl p-6 min-h-[200px] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400 rounded-full blur-3xl opacity-20" />
              <div className="relative">
                {savedNote ? (
                  <div className="space-y-3">
                    <div className="bg-white border border-[#0F172A] rounded-2xl p-4">
                      <p className="text-sm font-semibold text-[#111827] mb-2">{savedNote.text}</p>
                      <p className="text-xs font-bold text-[#64748B]">{savedNote.timestamp}</p>
                    </div>
                    <button
                      onClick={clearNote}
                      className="text-xs text-red-600 hover:text-red-700 font-black uppercase tracking-wide"
                    >
                      Clear Note
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value.slice(0, 300))}
                      placeholder="Add a note for shift handover..."
                      className="w-full px-4 py-3 border border-[#0F172A] rounded-2xl text-sm resize-none focus:outline-none focus:border-[#16a34a] bg-white font-medium"
                      rows={4}
                      maxLength={300}
                    />
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-[#64748B]">{note.length}/300</span>
                      <button
                        onClick={saveNote}
                        disabled={!note.trim()}
                        className="bg-[#16a34a] text-white hover:bg-[#15803d] rounded-full px-5 py-2 text-xs font-black disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 border border-[#0F172A] uppercase tracking-wide"
                      >
                        <Save className="w-3 h-3" /> Save
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Recent Activity Feed */}
          <div>
            <h2 className="text-xs font-black uppercase tracking-widest text-[#94A3B8] mb-4">
              RECENT ACTIVITY
            </h2>
            <div className="bg-white border border-[#0F172A] rounded-3xl p-6 min-h-[200px]">
              {recentActions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-8">
                  <div className="w-16 h-16 rounded-full bg-[#F8FAFC] border border-[#0F172A] flex items-center justify-center mb-3">
                    <Activity className="w-8 h-8 text-[#94A3B8]" />
                  </div>
                  <p className="text-sm font-bold text-[#64748B]">No recent activity</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentActions.map((action) => (
                    <div key={action.id} className="flex items-start gap-3 pb-3 border-b border-[#E2E8F0] last:border-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border border-[#0F172A] ${
                        action.type === 'sale' ? 'bg-green-100' : action.type === 'inventory' ? 'bg-blue-100' : 'bg-amber-100'
                      }`}>
                        {action.type === 'sale' ? <TrendingUp className="w-5 h-5 text-green-600" strokeWidth={2.5} /> :
                         action.type === 'inventory' ? <Package className="w-5 h-5 text-blue-600" strokeWidth={2.5} /> :
                         <AlertCircle className="w-5 h-5 text-amber-600" strokeWidth={2.5} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-[#111827]">{action.text}</p>
                        <p className="text-xs font-semibold text-[#64748B] mt-1">{getRelativeTime(action.timestamp)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
