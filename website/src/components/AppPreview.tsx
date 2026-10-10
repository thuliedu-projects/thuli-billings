import {
  ArrowLeft,
  BarChart3,
  Bell,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Download,
  FileText,
  LayoutGrid,
  MoreHorizontal,
  Package,
  Plus,
  Search,
  Settings,
  ShoppingBag,
  Store,
  Trash2,
  UserCircle,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import {
  PRODUCTS,
  STORE_NAME,
  TODAY_STATS,
  WEEK_SALES,
  formatInr,
  stockTone,
  type PreviewProduct,
} from '../data/appPreview';
import './AppPreview.css';

type AppTab = 'dashboard' | 'bills' | 'products' | 'stock' | 'more';

const TABS = [
  { id: 'dashboard' as const, label: 'Dashboard', Icon: LayoutGrid },
  { id: 'bills' as const, label: 'Bills', Icon: FileText },
  { id: 'products' as const, label: 'Products', Icon: ShoppingBag },
  { id: 'stock' as const, label: 'Stock', Icon: Package },
  { id: 'more' as const, label: 'More', Icon: MoreHorizontal },
];

export function AppPreview() {
  const [tab, setTab] = useState<AppTab>('dashboard');
  const [query, setQuery] = useState('');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const [toast, setToast] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q
      ? PRODUCTS.filter(
          (product) =>
            product.name.toLowerCase().includes(q) ||
            product.category.toLowerCase().includes(q),
        )
      : PRODUCTS;
  }, [query]);

  const itemCount = Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);
  const cartTotal = PRODUCTS.reduce(
    (sum, product) => sum + (cart[product.id] ?? 0) * product.price,
    0,
  );

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(''), 1500);
  }

  function addProduct(product: PreviewProduct) {
    setCart((current) => ({
      ...current,
      [product.id]: (current[product.id] ?? 0) + 1,
    }));
    showToast(`${product.name} added`);
  }

  function selectTab(next: AppTab) {
    setTab(next);
    setToast('');
  }

  return (
    <div className="actual-app-preview">
      <div className={`actual-app-content screen-${tab}`}>
        {tab === 'dashboard' && (
          <Dashboard
            period={period}
            onPeriod={() => setPeriod((value) => (value === 'week' ? 'month' : 'week'))}
            onNavigate={selectTab}
          />
        )}
        {tab === 'bills' && (
          <Bills
            total={cartTotal}
            itemCount={itemCount}
            onAdd={addProduct}
            onClear={() => setCart({})}
            onPay={() => {
              if (!itemCount) return showToast('Add a product first');
              showToast(`Bill saved · ${formatInr(cartTotal)}`);
              setCart({});
            }}
          />
        )}
        {tab === 'products' && (
          <Products
            query={query}
            onQuery={setQuery}
            products={filtered}
            onProduct={(product) => showToast(product.name)}
          />
        )}
        {tab === 'stock' && (
          <Stock query={query} onQuery={setQuery} products={filtered} />
        )}
        {tab === 'more' && <More onOpen={showToast} />}
        {toast && <div className="actual-app-toast">{toast}</div>}
      </div>

      <nav className="actual-tab-bar" aria-label="App preview pages">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            className={tab === id ? 'active' : undefined}
            onClick={() => selectTab(id)}
          >
            <Icon size={17} strokeWidth={tab === id ? 2.4 : 1.8} />
            <span>{label}</span>
            <i />
          </button>
        ))}
      </nav>
    </div>
  );
}

function ScreenHeader({
  title,
  subtitle,
  back = false,
  action,
}: {
  title: string;
  subtitle: string;
  back?: boolean;
  action?: React.ReactNode;
}) {
  return (
    <header className="app-screen-header">
      {back && (
        <button type="button" className="header-icon" aria-label="Go back">
          <ArrowLeft size={18} />
        </button>
      )}
      <div className={back ? 'header-copy centered' : 'header-copy'}>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
      {action && <div className="header-action">{action}</div>}
    </header>
  );
}

function Dashboard({
  period,
  onPeriod,
  onNavigate,
}: {
  period: 'week' | 'month';
  onPeriod: () => void;
  onNavigate: (tab: AppTab) => void;
}) {
  const lowStock = PRODUCTS.filter((product) => stockTone(product.stock) !== 'in');
  const max = Math.max(...WEEK_SALES);
  const total = WEEK_SALES.reduce((sum, value) => sum + value, 0);

  return (
    <main className="app-screen dashboard-screen">
      <ScreenHeader
        title="Dashboard"
        subtitle={STORE_NAME}
        action={
          <div className="header-actions">
            <button type="button" className="header-icon" aria-label="Analytics">
              <BarChart3 size={17} />
            </button>
            <button type="button" className="header-icon" aria-label="Stores">
              <Store size={17} />
            </button>
          </div>
        }
      />

      <div className="dashboard-stats">
        <button type="button" onClick={() => onNavigate('bills')}>
          <span className="stat-icon purple"><ShoppingBag size={15} /></span>
          <small>Today&apos;s Sales</small>
          <strong className="purple-text">{formatInr(TODAY_STATS.sales)}</strong>
          <em>{TODAY_STATS.bills} Bills</em>
        </button>
        <button type="button" onClick={() => onNavigate('bills')}>
          <span className="stat-icon green"><ShoppingBag size={15} /></span>
          <small>Today&apos;s Orders</small>
          <strong className="green-text">3</strong>
          <em>0 Pending</em>
        </button>
        <button type="button" onClick={() => onNavigate('products')}>
          <span className="stat-icon orange"><Package size={15} /></span>
          <small>Total Products</small>
          <strong className="orange-text">{PRODUCTS.length}</strong>
          <em>{lowStock.length} Low Stock</em>
        </button>
      </div>

      <section className="app-card sales-card">
        <div className="card-heading">
          <strong>Sales Overview</strong>
          <div>
            <button type="button" className="text-action">Details</button>
            <button type="button" className="period-button" onClick={onPeriod}>
              {period === 'week' ? 'This Week' : 'This Month'} <ChevronDown size={11} />
            </button>
          </div>
        </div>
        <small>Total Sales</small>
        <b>{formatInr(total)}</b>
        <div className="sales-body">
          <div className="sales-change"><strong>↑ 12.5%</strong><span>vs last week</span></div>
          <div className="sales-chart">
            {WEEK_SALES.map((value, index) => (
              <i key={index} style={{ height: `${Math.max(20, (value / max) * 100)}%` }} />
            ))}
          </div>
        </div>
      </section>

      <section className="app-card">
        <div className="card-heading">
          <strong>Low Stock Alert</strong>
          <button type="button" className="text-action" onClick={() => onNavigate('stock')}>View All</button>
        </div>
        {lowStock.slice(0, 3).map((product) => (
          <button className="dashboard-list-row" type="button" key={product.id} onClick={() => onNavigate('stock')}>
            <span className="product-thumb"><Package size={16} /></span>
            <span><strong>{product.name}</strong><small>{product.category}</small></span>
            <em>{product.stock} pcs</em>
          </button>
        ))}
      </section>
    </main>
  );
}

function Bills({
  total,
  itemCount,
  onAdd,
  onClear,
  onPay,
}: {
  total: number;
  itemCount: number;
  onAdd: (product: PreviewProduct) => void;
  onClear: () => void;
  onPay: () => void;
}) {
  return (
    <main className="app-screen bills-screen">
      <ScreenHeader
        back
        title="New Bill"
        subtitle={STORE_NAME}
        action={
          <button type="button" className="clear-button" onClick={onClear}>
            <ShoppingBag size={15} /> <span>Clear</span>
          </button>
        }
      />
      <SearchField value="" placeholder="Search products" readOnly />
      <div className="pane-heading"><strong>All Products</strong><Settings size={15} /></div>
      <div className="catalog-list">
        {PRODUCTS.map((product) => (
          <button type="button" className="catalog-card" key={product.id} onClick={() => onAdd(product)}>
            <span className="product-thumb"><Package size={16} /></span>
            <span className="catalog-copy">
              <strong>{product.name}</strong>
              <em>{formatInr(product.price)}</em>
            </span>
            <span className="add-circle"><Plus size={14} /></span>
          </button>
        ))}
      </div>
      <section className="current-bill">
        <div>
          <strong>Current Bill{itemCount ? ` (${itemCount})` : ''}</strong>
          <small>{itemCount ? `${itemCount} item${itemCount === 1 ? '' : 's'} selected` : 'Tap a product to add it'}</small>
        </div>
        <div className="bill-total"><span>{formatInr(total)}</span><button type="button" onClick={onPay}>Pay</button></div>
      </section>
    </main>
  );
}

function Products({
  query,
  onQuery,
  products,
  onProduct,
}: {
  query: string;
  onQuery: (value: string) => void;
  products: PreviewProduct[];
  onProduct: (product: PreviewProduct) => void;
}) {
  return (
    <main className="app-screen">
      <ScreenHeader
        back
        title="Products"
        subtitle="Add, edit and organize your catalog"
        action={<button type="button" className="import-button"><Download size={15} /><span>Import</span></button>}
      />
      <div className="segmented"><button type="button" className="active">Products</button><button type="button">Categories</button></div>
      <SearchField value={query} onChange={onQuery} placeholder="Search products by name or barcode" />
      <div className="product-list">
        {products.map((product) => (
          <button type="button" className="product-row" key={product.id} onClick={() => onProduct(product)}>
            <span className="product-thumb"><Package size={17} /></span>
            <span className="row-copy"><strong>{product.name}</strong><small>{product.category}</small></span>
            <span className="row-meta"><strong>{formatInr(product.price)}</strong><small>{product.stock} {product.unit}</small></span>
            <ChevronRight size={14} />
          </button>
        ))}
      </div>
      <button type="button" className="floating-add" aria-label="Add product"><Plus size={20} /></button>
    </main>
  );
}

function Stock({
  query,
  onQuery,
  products,
}: {
  query: string;
  onQuery: (value: string) => void;
  products: PreviewProduct[];
}) {
  const low = PRODUCTS.filter((product) => stockTone(product.stock) === 'low').length;
  const out = PRODUCTS.filter((product) => stockTone(product.stock) === 'out').length;
  const inStock = PRODUCTS.filter((product) => stockTone(product.stock) === 'in').length;

  return (
    <main className="app-screen">
      <ScreenHeader title="Stock" subtitle="Manage your store inventory" action={<button type="button" className="adjust-button"><Settings size={15} /><span>Adjust Stock</span></button>} />
      <SearchField value={query} onChange={onQuery} placeholder="Search products" />
      <div className="stock-stats">
        <span><strong>{PRODUCTS.length}</strong><small>Total Products</small></span>
        <span><strong className="orange-text">{low}</strong><small>Low Stock</small></span>
        <span><strong className="red-text">{out}</strong><small>Out of Stock</small></span>
        <span><strong className="green-text">{inStock}</strong><small>In Stock</small></span>
      </div>
      <div className="product-list">
        {products.map((product) => {
          const status = stockTone(product.stock);
          return (
            <div className="product-row" key={product.id}>
              <span className="product-thumb"><Package size={17} /></span>
              <span className="row-copy"><strong>{product.name}</strong><small>{product.category}</small></span>
              <span className="stock-quantity">{product.stock} {product.unit === 'Nos' ? 'pcs' : product.unit}</span>
              <span className={`stock-badge ${status}`}>{status === 'in' ? 'In Stock' : status === 'low' ? 'Low Stock' : 'Out'}</span>
              <ChevronRight size={13} />
            </div>
          );
        })}
      </div>
      <button type="button" className="floating-add" aria-label="Adjust stock"><Plus size={20} /></button>
    </main>
  );
}

function More({ onOpen }: { onOpen: (label: string) => void }) {
  const sections = [
    { title: 'Stores', rows: [{ label: 'Your stores', sub: 'Switch, add, or edit stores', Icon: Store }] },
    { title: 'Account', rows: [{ label: 'Account settings', sub: 'Phone, profile & security', Icon: UserCircle }] },
    { title: 'Preferences', rows: [
      { label: 'Notifications', sub: 'Alerts for low stock & bills', Icon: Bell },
      { label: 'Billing preferences', sub: 'Defaults for new bills', Icon: FileText },
    ] },
    { title: 'Support', rows: [{ label: 'Help & support', sub: 'FAQs and contact', Icon: CircleHelp }] },
  ];

  return (
    <main className="app-screen more-screen">
      <ScreenHeader title="More" subtitle={STORE_NAME} />
      <section className="profile-card">
        <span className="avatar">T</span>
        <span><strong>{STORE_NAME}</strong><small>No location set</small></span>
        <button type="button" onClick={() => onOpen('Edit store')}>Edit</button>
      </section>
      {sections.map((section) => (
        <section className="settings-section" key={section.title}>
          <h3>{section.title}</h3>
          <div className="settings-card">
            {section.rows.map(({ label, sub, Icon }) => (
              <button type="button" key={label} onClick={() => onOpen(label)}>
                <span className="settings-icon"><Icon size={15} /></span>
                <span><strong>{label}</strong><small>{sub}</small></span>
                <ChevronRight size={14} />
              </button>
            ))}
          </div>
        </section>
      ))}
      <section className="settings-section">
        <h3>Danger zone</h3>
        <div className="settings-card danger">
          <button type="button" onClick={() => onOpen('Delete store disabled in preview')}>
            <span className="settings-icon"><Trash2 size={15} /></span>
            <span><strong>Delete store</strong><small>Remove this store and its data</small></span>
            <ChevronRight size={14} />
          </button>
        </div>
      </section>
    </main>
  );
}

function SearchField({
  value,
  onChange,
  placeholder,
  readOnly = false,
}: {
  value: string;
  onChange?: (value: string) => void;
  placeholder: string;
  readOnly?: boolean;
}) {
  return (
    <label className="app-search">
      <Search size={15} />
      <input
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
      />
    </label>
  );
}
