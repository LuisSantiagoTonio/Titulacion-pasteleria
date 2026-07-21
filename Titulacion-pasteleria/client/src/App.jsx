import { useEffect, useMemo, useState } from 'react';
import Icon from './components/Icons.jsx';
import Modal from './components/Modal.jsx';

const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
const dateFormatter = new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
const dayFormatter = new Intl.DateTimeFormat('es-MX', { weekday: 'short' });

const statusLabels = {
  pending: 'Pendiente',
  preparing: 'En preparación',
  ready: 'Listo',
  delivered: 'Entregado',
  cancelled: 'Cancelado'
};

const statusStyles = {
  pending: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  preparing: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  ready: 'bg-violet-50 text-violet-700 ring-violet-600/20',
  delivered: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  cancelled: 'bg-rose-50 text-rose-700 ring-rose-600/20'
};

const paymentLabels = { cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia' };

const TOKEN_KEY = 'dulce_panel_token';

async function api(path, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY);
  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const error = new Error(payload.message || 'No se pudo completar la operación.');
    error.status = response.status;
    throw error;
  }

  if (response.status === 204) return null;
  return response.json();
}

function initials(name) {
  return String(name || 'Usuario').split(' ').filter(Boolean).map((word) => word[0]).slice(0, 2).join('').toUpperCase();
}

function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(onClose, 3500);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;
  return (
    <div className={`fixed bottom-5 right-5 z-[70] flex max-w-sm items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold shadow-xl ${toast.type === 'error' ? 'bg-rose-600 text-white' : 'bg-stone-900 text-white'}`}>
      <Icon name={toast.type === 'error' ? 'alert' : 'check'} size={18} />
      <span>{toast.message}</span>
    </div>
  );
}

function Sidebar({ activeView, setActiveView, open, setOpen, currentUser, onSwitchAccount }) {
  const items = [
    ['dashboard', 'dashboard', 'Resumen'],
    ['products', 'cake', 'Productos'],
    ['orders', 'orders', 'Pedidos'],
    ['customers', 'users', 'Clientes'],
    ...(currentUser?.role === 'admin' ? [['users', 'users', 'Usuarios']] : [])
  ];

  return (
    <>
      {open && <button className="fixed inset-0 z-30 bg-stone-950/30 lg:hidden" onClick={() => setOpen(false)} aria-label="Cerrar menú" />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-white/10 bg-[#2d211b] text-white transition-transform duration-300 lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-24 items-center gap-3 px-7">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#f4b8c4] text-2xl shadow-lg shadow-black/10">🧁</div>
          <div>
            <p className="text-lg font-black tracking-tight">Dulce Panel</p>
            <p className="text-xs text-stone-400">Pastelería artesanal</p>
          </div>
          <button onClick={() => setOpen(false)} className="ml-auto rounded-xl p-2 text-stone-400 hover:bg-white/10 lg:hidden" aria-label="Cerrar menú">
            <Icon name="close" />
          </button>
        </div>

        <nav className="flex-1 space-y-2 px-4 py-5">
          <p className="px-4 pb-2 text-[10px] font-bold uppercase tracking-[0.24em] text-stone-500">Administración</p>
          {items.map(([view, icon, label]) => (
            <button
              key={view}
              onClick={() => { setActiveView(view); setOpen(false); }}
              className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-semibold transition ${activeView === view ? 'bg-[#f4b8c4] text-[#2d211b] shadow-lg shadow-black/10' : 'text-stone-300 hover:bg-white/8 hover:text-white'}`}
            >
              <Icon name={icon} size={20} />
              {label}
            </button>
          ))}
        </nav>

        <div className="m-4 rounded-3xl bg-white/7 p-4">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#8b5e3c] font-bold">{initials(currentUser?.name)}</div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{currentUser?.name}</p>
              <p className="truncate text-xs text-stone-400">{currentUser?.role === 'admin' ? 'Administrador' : 'Empleado'}</p>
            </div>
          </div>
          <button onClick={onSwitchAccount} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-stone-300 transition hover:bg-white/10 hover:text-white">
            <Icon name="logout" size={16} /> Cambiar de cuenta
          </button>
        </div>
      </aside>
    </>
  );
}

function Header({ title, subtitle, setSidebarOpen, onRefresh, loading }) {
  return (
    <header className="sticky top-0 z-20 border-b border-stone-200/80 bg-[#f8f5f1]/90 backdrop-blur-xl">
      <div className="flex min-h-20 items-center gap-4 px-4 sm:px-6 lg:px-8">
        <button onClick={() => setSidebarOpen(true)} className="rounded-xl border border-stone-200 bg-white p-2.5 text-stone-700 lg:hidden" aria-label="Abrir menú">
          <Icon name="menu" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-black tracking-tight text-stone-900 sm:text-2xl">{title}</h1>
          <p className="hidden text-sm text-stone-500 sm:block">{subtitle}</p>
        </div>
        <button onClick={onRefresh} disabled={loading} className="rounded-xl border border-stone-200 bg-white p-2.5 text-stone-600 transition hover:border-stone-300 hover:text-stone-900 disabled:opacity-50" title="Actualizar">
          <Icon name="refresh" className={loading ? 'animate-spin' : ''} />
        </button>
        <button className="relative rounded-xl border border-stone-200 bg-white p-2.5 text-stone-600 transition hover:border-stone-300 hover:text-stone-900" title="Notificaciones">
          <Icon name="bell" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
        </button>
      </div>
    </header>
  );
}

function StatCard({ title, value, note, icon, tone }) {
  const tones = {
    rose: 'bg-rose-50 text-rose-600',
    amber: 'bg-amber-50 text-amber-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    violet: 'bg-violet-50 text-violet-600'
  };

  return (
    <div className="rounded-3xl border border-stone-200/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-stone-500">{title}</p>
          <p className="mt-2 text-2xl font-black tracking-tight text-stone-900">{value}</p>
          <p className="mt-2 text-xs text-stone-400">{note}</p>
        </div>
        <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${tones[tone]}`}>
          <Icon name={icon} size={22} />
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${statusStyles[status] || statusStyles.pending}`}>{statusLabels[status] || status}</span>;
}

function SectionCard({ title, subtitle, action, children, className = '' }) {
  return (
    <section className={`rounded-3xl border border-stone-200/80 bg-white shadow-sm ${className}`}>
      <div className="flex items-start justify-between gap-4 border-b border-stone-100 px-5 py-5 sm:px-6">
        <div>
          <h2 className="font-black text-stone-900">{title}</h2>
          {subtitle && <p className="mt-1 text-xs text-stone-500">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Dashboard({ data, loading, onNavigate }) {
  if (loading && !data) return <LoadingState />;
  if (!data) return <EmptyState text="No fue posible cargar el dashboard." />;

  const maxSale = Math.max(...data.weeklySales.map((item) => Number(item.total)), 1);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Ventas del mes" value={currency.format(data.summary.monthlySales)} note="Ingresos sin pedidos cancelados" icon="dollar" tone="rose" />
        <StatCard title="Pedidos de hoy" value={data.summary.ordersToday} note={`${data.summary.activeOrders} pedidos activos`} icon="orders" tone="amber" />
        <StatCard title="Clientes registrados" value={data.summary.customers} note="Base de clientes actual" icon="users" tone="emerald" />
        <StatCard title="Inventario bajo" value={data.summary.lowStock} note={`${data.summary.products} productos en catálogo`} icon="alert" tone="violet" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.55fr_1fr]">
        <SectionCard title="Ventas de la semana" subtitle="Ingresos de los últimos siete días" action={<div className="flex items-center gap-2 text-xs font-bold text-emerald-600"><Icon name="trend" size={16} /> Actividad reciente</div>}>
          <div className="h-80 px-4 pb-5 pt-8 sm:px-6">
            <div className="flex h-full items-end gap-3 sm:gap-5">
              {data.weeklySales.map((item) => {
                const height = Math.max((Number(item.total) / maxSale) * 100, 5);
                return (
                  <div key={item.date} className="group flex h-full flex-1 flex-col items-center justify-end gap-3">
                    <div className="relative flex w-full flex-1 items-end justify-center">
                      <div className="absolute bottom-[calc(var(--bar-height)+8px)] hidden whitespace-nowrap rounded-lg bg-stone-900 px-2 py-1 text-[10px] font-bold text-white shadow-lg group-hover:block" style={{ '--bar-height': `${height}%` }}>{currency.format(item.total)}</div>
                      <div className="w-full max-w-12 rounded-t-xl bg-gradient-to-t from-[#8b5e3c] to-[#f4b8c4] transition-all duration-500 group-hover:opacity-80" style={{ height: `${height}%` }} />
                    </div>
                    <span className="text-[11px] font-bold capitalize text-stone-500">{dayFormatter.format(new Date(`${item.date}T12:00:00`))}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Productos más vendidos" subtitle="Unidades acumuladas" action={<button onClick={() => onNavigate('products')} className="text-xs font-bold text-[#8b5e3c] hover:underline">Ver catálogo</button>}>
          <div className="divide-y divide-stone-100 px-5 sm:px-6">
            {data.topProducts.map((product, index) => (
              <div key={product.id} className="flex items-center gap-4 py-4">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-stone-100 text-sm font-black text-stone-500">{index + 1}</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-stone-800">{product.name}</p>
                  <p className="text-xs text-stone-400">{product.category}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-stone-800">{product.units_sold}</p>
                  <p className="text-[10px] text-stone-400">unidades</p>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.55fr_1fr]">
        <SectionCard title="Pedidos recientes" subtitle="Últimos movimientos registrados" action={<button onClick={() => onNavigate('orders')} className="text-xs font-bold text-[#8b5e3c] hover:underline">Ver todos</button>}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-400">
                <tr><th className="px-6 py-3">Pedido</th><th className="px-4 py-3">Cliente</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3">Total</th></tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {data.recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-stone-50/80">
                    <td className="px-6 py-4"><p className="font-black text-stone-800">{order.order_number}</p><p className="text-xs text-stone-400">{dateFormatter.format(new Date(order.created_at))}</p></td>
                    <td className="px-4 py-4 font-semibold text-stone-600">{order.customer_name}</td>
                    <td className="px-4 py-4"><StatusBadge status={order.status} /></td>
                    <td className="px-4 py-4 font-black text-stone-800">{currency.format(order.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard title="Inventario por atender" subtitle="Productos con 5 unidades o menos">
          <div className="divide-y divide-stone-100 px-5 sm:px-6">
            {data.lowStockProducts.length ? data.lowStockProducts.map((product) => (
              <div key={product.id} className="flex items-center gap-4 py-4">
                <div className={`grid h-10 w-10 place-items-center rounded-xl font-black ${product.stock <= 2 ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>{product.stock}</div>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-stone-800">{product.name}</p><p className="text-xs text-stone-400">{product.category}</p></div>
                <button onClick={() => onNavigate('products')} className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-bold text-stone-600 hover:bg-stone-50">Gestionar</button>
              </div>
            )) : <div className="py-12 text-center text-sm text-stone-400">Todo el inventario tiene buenas existencias.</div>}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function ProductsPage({ products, loading, onCreate, onUpdate, onDelete }) {
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);

  const filtered = useMemo(() => products.filter((product) => `${product.name} ${product.category}`.toLowerCase().includes(search.toLowerCase())), [products, search]);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Icon name="search" size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar producto o categoría" className="w-full rounded-2xl border border-stone-200 bg-white py-3 pl-11 pr-4 text-sm outline-none transition focus:border-[#8b5e3c] focus:ring-4 focus:ring-[#8b5e3c]/10" />
        </div>
        <button onClick={() => setModal({ mode: 'create' })} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#8b5e3c] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[#8b5e3c]/20 transition hover:bg-[#72482c]">
          <Icon name="plus" size={18} /> Nuevo producto
        </button>
      </div>

      <SectionCard title="Catálogo de productos" subtitle={`${filtered.length} productos encontrados`}>
        {loading ? <LoadingState compact /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-left text-sm">
              <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-400">
                <tr><th className="px-6 py-4">Producto</th><th className="px-4 py-4">Categoría</th><th className="px-4 py-4">Precio</th><th className="px-4 py-4">Existencias</th><th className="px-4 py-4">Estado</th><th className="px-6 py-4 text-right">Acciones</th></tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filtered.map((product) => (
                  <tr key={product.id} className="hover:bg-stone-50/70">
                    <td className="px-6 py-4"><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-rose-50 text-xl">🍰</div><div><p className="font-black text-stone-800">{product.name}</p><p className="max-w-xs truncate text-xs text-stone-400">{product.description || 'Sin descripción'}</p></div></div></td>
                    <td className="px-4 py-4 font-semibold text-stone-600">{product.category}</td>
                    <td className="px-4 py-4 font-black text-stone-800">{currency.format(product.price)}</td>
                    <td className="px-4 py-4"><span className={`font-black ${product.stock <= 5 ? 'text-rose-600' : 'text-stone-700'}`}>{product.stock}</span></td>
                    <td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${product.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-500'}`}>{product.status === 'active' ? 'Activo' : 'Inactivo'}</span></td>
                    <td className="px-6 py-4"><div className="flex justify-end gap-2"><button onClick={() => setModal({ mode: 'edit', product })} className="rounded-xl border border-stone-200 p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-900" title="Editar"><Icon name="edit" size={17} /></button><button onClick={() => onDelete(product)} className="rounded-xl border border-rose-100 p-2 text-rose-500 hover:bg-rose-50" title="Eliminar"><Icon name="trash" size={17} /></button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filtered.length && <EmptyState text="No se encontraron productos." />}
          </div>
        )}
      </SectionCard>

      {modal && <ProductModal product={modal.product} onClose={() => setModal(null)} onSave={async (values) => { modal.mode === 'edit' ? await onUpdate(modal.product.id, values) : await onCreate(values); setModal(null); }} />}
    </div>
  );
}

function ProductModal({ product, onClose, onSave }) {
  const [form, setForm] = useState({ name: product?.name || '', category: product?.category || '', description: product?.description || '', price: product?.price ?? '', stock: product?.stock ?? '', status: product?.status || 'active' });
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try { await onSave({ ...form, price: Number(form.price), stock: Number(form.stock) }); } finally { setSaving(false); }
  };

  return (
    <Modal title={product ? 'Editar producto' : 'Nuevo producto'} subtitle="Completa la información del artículo" onClose={onClose}>
      <form onSubmit={submit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre"><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" placeholder="Ej. Pastel de chocolate" /></Field>
          <Field label="Categoría"><input required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input" placeholder="Ej. Pasteles" /></Field>
          <Field label="Precio"><input required min="0" step="0.01" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="input" placeholder="0.00" /></Field>
          <Field label="Existencias"><input required min="0" step="1" type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className="input" placeholder="0" /></Field>
        </div>
        <Field label="Descripción"><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input min-h-24 resize-none" placeholder="Descripción breve del producto" /></Field>
        <Field label="Estado"><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="input"><option value="active">Activo</option><option value="inactive">Inactivo</option></select></Field>
        <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={onClose} className="rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-bold text-stone-600 hover:bg-stone-50">Cancelar</button><button disabled={saving} className="rounded-xl bg-[#8b5e3c] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">{saving ? 'Guardando...' : 'Guardar producto'}</button></div>
      </form>
    </Modal>
  );
}

function OrdersPage({ orders, products, customers, loading, onCreate, onStatusChange, onDelete }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const filtered = filter === 'all' ? orders : orders.filter((order) => order.status === filter);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[['all', 'Todos'], ...Object.entries(statusLabels)].map(([value, label]) => <button key={value} onClick={() => setFilter(value)} className={`whitespace-nowrap rounded-xl px-4 py-2 text-xs font-bold transition ${filter === value ? 'bg-stone-900 text-white' : 'border border-stone-200 bg-white text-stone-500 hover:bg-stone-50'}`}>{label}</button>)}
        </div>
        <button onClick={() => setModalOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#8b5e3c] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[#8b5e3c]/20"><Icon name="plus" size={18} /> Nuevo pedido</button>
      </div>

      <SectionCard title="Gestión de pedidos" subtitle={`${filtered.length} pedidos mostrados`}>
        {loading ? <LoadingState compact /> : <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-400"><tr><th className="px-6 py-4">Pedido</th><th className="px-4 py-4">Cliente</th><th className="px-4 py-4">Productos</th><th className="px-4 py-4">Pago</th><th className="px-4 py-4">Total</th><th className="px-6 py-4">Estado</th><th className="px-6 py-4 text-right">Acciones</th></tr></thead><tbody className="divide-y divide-stone-100">{filtered.map((order) => <tr key={order.id} className="hover:bg-stone-50/70"><td className="px-6 py-4"><p className="font-black text-stone-800">{order.order_number}</p><p className="text-xs text-stone-400">{dateFormatter.format(new Date(order.created_at))}</p></td><td className="px-4 py-4 font-semibold text-stone-600">{order.customer_name}</td><td className="px-4 py-4 text-stone-600">{order.items_count} unidades</td><td className="px-4 py-4 text-stone-600">{paymentLabels[order.payment_method]}</td><td className="px-4 py-4 font-black text-stone-800">{currency.format(order.total)}</td><td className="px-6 py-4"><select disabled={order.status === 'cancelled'} value={order.status} onChange={(e) => onStatusChange(order.id, e.target.value)} className={`rounded-xl border-0 px-3 py-2 text-xs font-bold outline-none ring-1 ring-inset ${statusStyles[order.status]} disabled:opacity-70`}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></td><td className="px-6 py-4 text-right"><button onClick={() => onDelete(order)} className="rounded-xl border border-rose-100 p-2 text-rose-500 hover:bg-rose-50" title="Eliminar pedido" aria-label={`Eliminar ${order.order_number}`}><Icon name="trash" size={17} /></button></td></tr>)}</tbody></table>{!filtered.length && <EmptyState text="No hay pedidos con este estado." />}</div>}
      </SectionCard>

      {modalOpen && <OrderModal products={products} customers={customers} onClose={() => setModalOpen(false)} onSave={async (values) => { await onCreate(values); setModalOpen(false); }} />}
    </div>
  );
}

function OrderModal({ products, customers, onClose, onSave }) {
  const availableProducts = products.filter((product) => product.status === 'active' && product.stock > 0);
  const [form, setForm] = useState({ customer_id: '', payment_method: 'cash', notes: '', items: [{ product_id: availableProducts[0]?.id || '', quantity: 1 }] });
  const [saving, setSaving] = useState(false);

  const total = form.items.reduce((sum, item) => {
    const product = products.find((entry) => Number(entry.id) === Number(item.product_id));
    return sum + (product ? Number(product.price) * Number(item.quantity || 0) : 0);
  }, 0);

  const updateItem = (index, key, value) => setForm((current) => ({ ...current, items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item) }));
  const removeItem = (index) => setForm((current) => ({ ...current, items: current.items.filter((_, itemIndex) => itemIndex !== index) }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try { await onSave({ ...form, customer_id: form.customer_id || null, items: form.items.map((item) => ({ product_id: Number(item.product_id), quantity: Number(item.quantity) })) }); } finally { setSaving(false); }
  };

  return (
    <Modal title="Registrar pedido" subtitle="Selecciona cliente, productos y forma de pago" onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Cliente"><select value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })} className="input"><option value="">Cliente general</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></Field>
          <Field label="Método de pago"><select value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })} className="input"><option value="cash">Efectivo</option><option value="card">Tarjeta</option><option value="transfer">Transferencia</option></select></Field>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between"><label className="text-sm font-bold text-stone-700">Productos</label><button type="button" onClick={() => setForm({ ...form, items: [...form.items, { product_id: availableProducts[0]?.id || '', quantity: 1 }] })} className="inline-flex items-center gap-1 text-xs font-bold text-[#8b5e3c]"><Icon name="plus" size={15} /> Agregar línea</button></div>
          <div className="space-y-3">
            {form.items.map((item, index) => {
              const selected = products.find((product) => Number(product.id) === Number(item.product_id));
              return <div key={index} className="grid gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-3 sm:grid-cols-[1fr_110px_44px]"><select required value={item.product_id} onChange={(e) => updateItem(index, 'product_id', e.target.value)} className="input bg-white">{availableProducts.map((product) => <option key={product.id} value={product.id}>{product.name} — {currency.format(product.price)} ({product.stock} disp.)</option>)}</select><input required type="number" min="1" max={selected?.stock || 1} value={item.quantity} onChange={(e) => updateItem(index, 'quantity', e.target.value)} className="input bg-white" /><button type="button" disabled={form.items.length === 1} onClick={() => removeItem(index)} className="grid h-11 place-items-center rounded-xl text-rose-500 hover:bg-rose-50 disabled:opacity-30"><Icon name="trash" size={18} /></button></div>;
            })}
          </div>
        </div>

        <Field label="Notas"><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input min-h-20 resize-none" placeholder="Dedicatoria, horario de entrega, alergias, etc." /></Field>

        <div className="flex flex-col gap-4 rounded-2xl bg-[#2d211b] p-5 text-white sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-stone-400">Total estimado</p><p className="mt-1 text-3xl font-black">{currency.format(total)}</p></div><div className="flex gap-3"><button type="button" onClick={onClose} className="rounded-xl border border-white/20 px-4 py-2.5 text-sm font-bold hover:bg-white/10">Cancelar</button><button disabled={saving || !availableProducts.length} className="rounded-xl bg-[#f4b8c4] px-5 py-2.5 text-sm font-black text-[#2d211b] disabled:opacity-50">{saving ? 'Registrando...' : 'Crear pedido'}</button></div></div>
      </form>
    </Modal>
  );
}

function CustomersPage({ customers, loading, onCreate, onUpdate, onDelete }) {
  const [modal, setModal] = useState(null);
  const closeModal = () => setModal(null);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex justify-end">
        <button onClick={() => setModal({ mode: 'create' })} className="inline-flex items-center gap-2 rounded-2xl bg-[#8b5e3c] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[#8b5e3c]/20">
          <Icon name="plus" size={18} /> Nuevo cliente
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {loading ? <div className="sm:col-span-2 xl:col-span-3"><LoadingState compact /></div> : customers.map((customer) => (
          <article key={customer.id} className="rounded-3xl border border-stone-200/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-start gap-4">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-rose-100 to-amber-100 text-lg font-black text-[#8b5e3c]">
                {customer.name.split(' ').map((word) => word[0]).slice(0, 2).join('').toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-black text-stone-900">{customer.name}</h3>
                <p className="text-xs text-stone-400">Cliente desde {dateFormatter.format(new Date(customer.created_at))}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={() => setModal({ mode: 'edit', customer })}
                  className="grid h-10 w-10 place-items-center rounded-xl border border-stone-200 text-stone-500 transition hover:border-[#8b5e3c]/30 hover:bg-[#8b5e3c]/5 hover:text-[#8b5e3c]"
                  title="Editar cliente"
                  aria-label={`Editar a ${customer.name}`}
                >
                  <Icon name="edit" size={17} />
                </button>
                <button
                  onClick={() => onDelete(customer)}
                  className="grid h-10 w-10 place-items-center rounded-xl border border-rose-100 text-rose-500 transition hover:bg-rose-50"
                  title="Eliminar cliente"
                  aria-label={`Eliminar a ${customer.name}`}
                >
                  <Icon name="trash" size={17} />
                </button>
              </div>
            </div>
            <div className="mt-5 space-y-2 text-sm text-stone-500"><p className="flex items-center gap-2"><Icon name="phone" size={16} /> {customer.phone || 'Sin teléfono'}</p><p className="flex items-center gap-2 truncate"><Icon name="mail" size={16} /> {customer.email || 'Sin correo'}</p></div>
            <div className="mt-5 grid grid-cols-2 gap-3 border-t border-stone-100 pt-4"><div><p className="text-xs text-stone-400">Pedidos</p><p className="mt-1 font-black text-stone-800">{customer.orders_count}</p></div><div><p className="text-xs text-stone-400">Consumo</p><p className="mt-1 font-black text-stone-800">{currency.format(customer.total_spent)}</p></div></div>
          </article>
        ))}
      </div>

      {!loading && !customers.length && <EmptyState text="Todavía no hay clientes registrados." />}

      {modal && (
        <CustomerModal
          customer={modal.customer}
          onClose={closeModal}
          onSave={async (values) => {
            if (modal.mode === 'edit') await onUpdate(modal.customer.id, values);
            else await onCreate(values);
            closeModal();
          }}
        />
      )}
    </div>
  );
}

function CustomerModal({ customer, onClose, onSave }) {
  const editing = Boolean(customer);
  const [form, setForm] = useState({
    name: customer?.name || '',
    phone: customer?.phone || '',
    email: customer?.email || ''
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  };

  return (
    <Modal
      title={editing ? 'Editar cliente' : 'Nuevo cliente'}
      subtitle={editing ? 'Actualiza los datos del cliente' : 'Registra los datos de contacto'}
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Nombre completo"><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" placeholder="Nombre del cliente" /></Field>
        <Field label="Teléfono"><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input" placeholder="55 0000 0000" /></Field>
        <Field label="Correo electrónico"><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" placeholder="cliente@correo.com" /></Field>
        <div className="flex justify-end gap-3 pt-3">
          <button type="button" onClick={onClose} className="rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-bold text-stone-600">Cancelar</button>
          <button disabled={saving} className="rounded-xl bg-[#8b5e3c] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">{saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Guardar cliente'}</button>
        </div>
      </form>
    </Modal>
  );
}

function LoginPage({ onLogin }) {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await onLogin(form);
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen bg-[#f8f5f1] lg:grid-cols-[1.05fr_.95fr]">
      <section className="hidden bg-[#2d211b] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3"><div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#f4b8c4] text-3xl">🧁</div><div><p className="text-2xl font-black">Dulce Panel</p><p className="text-sm text-stone-400">Administración de pastelería</p></div></div>
        <div className="max-w-xl"><p className="text-sm font-bold uppercase tracking-[.25em] text-[#f4b8c4]">Acceso seguro</p><h1 className="mt-5 text-5xl font-black leading-tight">Toda tu pastelería en un solo lugar.</h1><p className="mt-5 text-lg leading-8 text-stone-300">Las cuentas, nombres y permisos ahora se obtienen directamente desde MySQL.</p></div>
        <p className="text-xs text-stone-500">Dulce Panel · Sistema administrativo</p>
      </section>
      <section className="grid place-items-center p-5 sm:p-10">
        <form onSubmit={submit} className="w-full max-w-md rounded-[2rem] border border-stone-200 bg-white p-7 shadow-xl shadow-stone-900/5 sm:p-9">
          <div className="mb-8 lg:hidden"><div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#f4b8c4] text-3xl">🧁</div></div>
          <p className="text-sm font-bold text-[#8b5e3c]">BIENVENIDO</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-stone-900">Iniciar sesión</h2>
          <p className="mt-2 text-sm text-stone-500">Ingresa con una cuenta registrada en la base de datos.</p>
          {error && <div className="mt-5 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div>}
          <div className="mt-7 space-y-5">
            <Field label="Correo electrónico"><input type="email" required autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" placeholder="usuario@correo.com" /></Field>
            <Field label="Contraseña"><input type="password" required autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="input" placeholder="Tu contraseña" /></Field>
          </div>
          <button disabled={loading} className="mt-7 w-full rounded-2xl bg-[#8b5e3c] px-5 py-3.5 text-sm font-black text-white shadow-lg shadow-[#8b5e3c]/20 transition hover:bg-[#72482c] disabled:opacity-60">{loading ? 'Ingresando...' : 'Entrar al dashboard'}</button>
          <div className="mt-6 rounded-2xl bg-stone-50 p-4 text-xs leading-6 text-stone-500"><strong>Prueba inicial:</strong><br />admin@dulcepanel.com / Admin123!<br />empleado@dulcepanel.com / Empleado123!</div>
        </form>
      </section>
    </div>
  );
}

function UsersPage({ users, loading, currentUser, onCreate, onUpdate, onDelete }) {
  const [modal, setModal] = useState(null);
  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex justify-end"><button onClick={() => setModal({ mode: 'create' })} className="inline-flex items-center gap-2 rounded-2xl bg-[#8b5e3c] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[#8b5e3c]/20"><Icon name="plus" size={18} /> Nueva cuenta</button></div>
      <SectionCard title="Cuentas del sistema" subtitle="Los datos mostrados en el menú se cargan desde MySQL">
        {loading ? <LoadingState compact /> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-400"><tr><th className="px-6 py-4">Usuario</th><th className="px-4 py-4">Correo</th><th className="px-4 py-4">Rol</th><th className="px-4 py-4">Estado</th><th className="px-6 py-4 text-right">Acciones</th></tr></thead><tbody className="divide-y divide-stone-100">{users.map((user) => <tr key={user.id} className="hover:bg-stone-50/70"><td className="px-6 py-4"><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-rose-100 to-amber-100 font-black text-[#8b5e3c]">{initials(user.name)}</div><div><p className="font-black text-stone-800">{user.name}</p>{user.id === currentUser.id && <p className="text-xs font-bold text-emerald-600">Sesión actual</p>}</div></div></td><td className="px-4 py-4 font-semibold text-stone-600">{user.email}</td><td className="px-4 py-4"><span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-bold text-violet-700">{user.role === 'admin' ? 'Administrador' : 'Empleado'}</span></td><td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${user.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-500'}`}>{user.status === 'active' ? 'Activo' : 'Inactivo'}</span></td><td className="px-6 py-4"><div className="flex justify-end gap-2"><button onClick={() => setModal({ mode: 'edit', user })} className="rounded-xl border border-stone-200 p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-900" title="Editar cuenta"><Icon name="edit" size={17} /></button><button onClick={() => onDelete(user)} disabled={user.id === currentUser.id} className="rounded-xl border border-rose-100 p-2 text-rose-500 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-30" title={user.id === currentUser.id ? 'No puedes eliminar tu sesión actual' : 'Eliminar cuenta'}><Icon name="trash" size={17} /></button></div></td></tr>)}</tbody></table>{!users.length && <EmptyState text="No hay usuarios registrados." />}</div>}
      </SectionCard>
      {modal && <UserModal user={modal.user} onClose={() => setModal(null)} onSave={async (values) => { modal.mode === 'edit' ? await onUpdate(modal.user.id, values) : await onCreate(values); setModal(null); }} />}
    </div>
  );
}

function UserModal({ user, onClose, onSave }) {
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '', password: '', role: user?.role || 'employee', status: user?.status || 'active' });
  const [saving, setSaving] = useState(false);
  const submit = async (event) => { event.preventDefault(); setSaving(true); try { await onSave(form); } finally { setSaving(false); } };
  return <Modal title={user ? 'Editar cuenta' : 'Nueva cuenta'} subtitle="La información se guardará en MySQL" onClose={onClose}><form onSubmit={submit} className="space-y-4"><Field label="Nombre completo"><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" placeholder="Nombre del usuario" /></Field><Field label="Correo electrónico"><input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" placeholder="usuario@correo.com" /></Field><Field label={user ? 'Nueva contraseña (opcional)' : 'Contraseña'}><input type="password" required={!user} minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="input" placeholder={user ? 'Déjala vacía para conservarla' : 'Mínimo 8 caracteres'} /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Rol"><select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="input"><option value="employee">Empleado</option><option value="admin">Administrador</option></select></Field><Field label="Estado"><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="input"><option value="active">Activo</option><option value="inactive">Inactivo</option></select></Field></div><div className="flex justify-end gap-3 pt-3"><button type="button" onClick={onClose} className="rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-bold text-stone-600">Cancelar</button><button disabled={saving} className="rounded-xl bg-[#8b5e3c] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">{saving ? 'Guardando...' : 'Guardar cuenta'}</button></div></form></Modal>;
}

function Field({ label, children }) {
  return <label className="block"><span className="mb-2 block text-sm font-bold text-stone-700">{label}</span>{children}</label>;
}

function LoadingState({ compact = false }) {
  return <div className={`grid place-items-center ${compact ? 'min-h-48' : 'min-h-[55vh]'}`}><div className="flex items-center gap-3 text-sm font-bold text-stone-500"><span className="h-5 w-5 animate-spin rounded-full border-2 border-stone-300 border-t-[#8b5e3c]" /> Cargando información...</div></div>;
}

function EmptyState({ text }) {
  return <div className="grid min-h-44 place-items-center p-8 text-center"><div><div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-stone-100 text-stone-400"><Icon name="package" /></div><p className="mt-3 text-sm font-semibold text-stone-400">{text}</p></div></div>;
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [activeView, setActiveView] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dashboard, setDashboard] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const notify = (message, type = 'success') => setToast({ message, type });

  const clearSession = () => {
    localStorage.removeItem(TOKEN_KEY);
    setCurrentUser(null);
    setDashboard(null);
    setProducts([]);
    setOrders([]);
    setCustomers([]);
    setUsers([]);
    setActiveView('dashboard');
  };

  useEffect(() => {
    const restoreSession = async () => {
      if (!localStorage.getItem(TOKEN_KEY)) { setCheckingSession(false); return; }
      try {
        const data = await api('/api/auth/me');
        setCurrentUser(data.user);
      } catch {
        clearSession();
      } finally {
        setCheckingSession(false);
      }
    };
    restoreSession();
  }, []);

  const loadAll = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const [dashboardData, productData, orderData, customerData, userData] = await Promise.all([
        api('/api/dashboard'),
        api('/api/products'),
        api('/api/orders'),
        api('/api/customers'),
        currentUser.role === 'admin' ? api('/api/users') : Promise.resolve([])
      ]);
      setDashboard(dashboardData);
      setProducts(productData);
      setOrders(orderData);
      setCustomers(customerData);
      setUsers(userData);
    } catch (error) {
      if (error.status === 401) { clearSession(); return; }
      notify(`${error.message} Revisa que Node.js y MySQL estén encendidos.`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (currentUser) loadAll(); }, [currentUser]);

  const handleLogin = async (credentials) => {
    const data = await api('/api/auth/login', { method: 'POST', body: JSON.stringify(credentials) });
    localStorage.setItem(TOKEN_KEY, data.token);
    setCurrentUser(data.user);
  };

  const handleSwitchAccount = async () => {
    try { await api('/api/auth/logout', { method: 'POST' }); } catch { /* La sesión local se elimina aunque el servidor no responda. */ }
    clearSession();
  };

  const refreshAfterMutation = async (message) => {
    await loadAll();
    notify(message);
  };

  const actions = {
    createProduct: async (values) => { try { await api('/api/products', { method: 'POST', body: JSON.stringify(values) }); await refreshAfterMutation('Producto creado correctamente.'); } catch (error) { notify(error.message, 'error'); throw error; } },
    updateProduct: async (id, values) => { try { await api(`/api/products/${id}`, { method: 'PUT', body: JSON.stringify(values) }); await refreshAfterMutation('Producto actualizado correctamente.'); } catch (error) { notify(error.message, 'error'); throw error; } },
    deleteProduct: async (product) => {
      const confirmed = window.confirm(
        `¿Eliminar “${product.name}”?\n\nTambién se eliminarán permanentemente todos los pedidos que contengan este producto y sus detalles. Esta acción no se puede deshacer.`
      );
      if (!confirmed) return;
      try {
        const result = await api(`/api/products/${product.id}`, { method: 'DELETE' });
        await refreshAfterMutation(result?.message || 'Producto y pedidos relacionados eliminados.');
      } catch (error) {
        notify(error.message, 'error');
      }
    },
    createOrder: async (values) => { try { await api('/api/orders', { method: 'POST', body: JSON.stringify(values) }); await refreshAfterMutation('Pedido registrado correctamente.'); } catch (error) { notify(error.message, 'error'); throw error; } },
    updateOrderStatus: async (id, status) => { try { await api(`/api/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }); await refreshAfterMutation('Estado del pedido actualizado.'); } catch (error) { notify(error.message, 'error'); } },
    createCustomer: async (values) => { try { await api('/api/customers', { method: 'POST', body: JSON.stringify(values) }); await refreshAfterMutation('Cliente registrado correctamente.'); } catch (error) { notify(error.message, 'error'); throw error; } },
    updateCustomer: async (id, values) => { try { await api(`/api/customers/${id}`, { method: 'PUT', body: JSON.stringify(values) }); await refreshAfterMutation('Cliente actualizado correctamente.'); } catch (error) { notify(error.message, 'error'); throw error; } },
    deleteCustomer: async (customer) => { if (!window.confirm(`¿Eliminar al cliente “${customer.name}”? Sus pedidos conservarán el historial como Cliente general.`)) return; try { await api(`/api/customers/${customer.id}`, { method: 'DELETE' }); await refreshAfterMutation('Cliente eliminado correctamente.'); } catch (error) { notify(error.message, 'error'); } },
    createUser: async (values) => { try { await api('/api/users', { method: 'POST', body: JSON.stringify(values) }); await refreshAfterMutation('Cuenta creada correctamente.'); } catch (error) { notify(error.message, 'error'); throw error; } },
    updateUser: async (id, values) => { try { await api(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify(values) }); await refreshAfterMutation('Cuenta actualizada correctamente.'); if (id === currentUser.id) { const me = await api('/api/auth/me'); setCurrentUser(me.user); } } catch (error) { notify(error.message, 'error'); throw error; } },
    deleteUser: async (user) => { if (user.id === currentUser.id) { notify('No puedes eliminar la cuenta con la sesión actual.', 'error'); return; } if (!window.confirm(`¿Eliminar la cuenta de “${user.name}”? Esta acción cerrará sus sesiones activas.`)) return; try { await api(`/api/users/${user.id}`, { method: 'DELETE' }); await refreshAfterMutation('Usuario eliminado correctamente.'); } catch (error) { notify(error.message, 'error'); } },
    deleteOrder: async (order) => { if (!window.confirm(`¿Eliminar el pedido “${order.order_number}”? Si no estaba cancelado, se devolverán sus productos al inventario.`)) return; try { await api(`/api/orders/${order.id}`, { method: 'DELETE' }); await refreshAfterMutation('Pedido eliminado correctamente.'); } catch (error) { notify(error.message, 'error'); } }
  };

  const pageMeta = {
    dashboard: ['Resumen general', 'Consulta el desempeño y la operación de tu pastelería.'],
    products: ['Productos', 'Administra el catálogo, precios y existencias.'],
    orders: ['Pedidos', 'Registra pedidos y da seguimiento a su preparación.'],
    customers: ['Clientes', 'Consulta la información y compras de tus clientes.'],
    users: ['Usuarios', 'Crea cuentas, cambia nombres, roles y contraseñas.']
  };

  if (checkingSession) return <div className="grid min-h-screen place-items-center bg-[#f8f5f1]"><LoadingState /></div>;
  if (!currentUser) return <><LoginPage onLogin={handleLogin} /><style>{`.input{width:100%;border:1px solid #e7e5e4;border-radius:.85rem;padding:.72rem .9rem;font-size:.875rem;outline:none;transition:.18s;background-color:#fff}.input:focus{border-color:#8b5e3c;box-shadow:0 0 0 4px rgba(139,94,60,.10)}`}</style></>;

  return (
    <div className="min-h-screen">
      <Sidebar activeView={activeView} setActiveView={setActiveView} open={sidebarOpen} setOpen={setSidebarOpen} currentUser={currentUser} onSwitchAccount={handleSwitchAccount} />
      <div className="lg:pl-72">
        <Header title={pageMeta[activeView][0]} subtitle={pageMeta[activeView][1]} setSidebarOpen={setSidebarOpen} onRefresh={loadAll} loading={loading} />
        <main className="p-4 sm:p-6 lg:p-8">
          {activeView === 'dashboard' && <Dashboard data={dashboard} loading={loading} onNavigate={setActiveView} />}
          {activeView === 'products' && <ProductsPage products={products} loading={loading} onCreate={actions.createProduct} onUpdate={actions.updateProduct} onDelete={actions.deleteProduct} />}
          {activeView === 'orders' && <OrdersPage orders={orders} products={products} customers={customers} loading={loading} onCreate={actions.createOrder} onStatusChange={actions.updateOrderStatus} onDelete={actions.deleteOrder} />}
          {activeView === 'customers' && <CustomersPage customers={customers} loading={loading} onCreate={actions.createCustomer} onUpdate={actions.updateCustomer} onDelete={actions.deleteCustomer} />}
          {activeView === 'users' && currentUser.role === 'admin' && <UsersPage users={users} loading={loading} currentUser={currentUser} onCreate={actions.createUser} onUpdate={actions.updateUser} onDelete={actions.deleteUser} />}
        </main>
      </div>
      <Toast toast={toast} onClose={() => setToast(null)} />
      <style>{`.input{width:100%;border:1px solid #e7e5e4;border-radius:.85rem;padding:.72rem .9rem;font-size:.875rem;outline:none;transition:.18s;background-color:#fff}.input:focus{border-color:#8b5e3c;box-shadow:0 0 0 4px rgba(139,94,60,.10)}`}</style>
    </div>
  );
}
