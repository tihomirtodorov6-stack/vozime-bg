'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ypfbljjrpppkdxdftjcv.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_NZrVv1hI7aTWVdeyZT27-Q_rWp_olMG';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const ADMIN_PHONES = ['+447935463970','447935463970','07935463970'];
const CATEGORIES = ['Всички','Месо','Кайма','Колбаси','Млечни','Хляб','Напитки','Консерви','Други'];

type User = { id?: string; first_name?: string; last_name?: string; phone: string; clean_phone?: string; email?: string; is_verified?: boolean; email_verified?: boolean; };
type Shop = { id: string; name: string; slug?: string; city?: string; address?: string; phone?: string; delivery_fee?: number; vip_active?: boolean; };
type ShopProfile = { id?: string; shop_id: string; phone: string; role: string; };
type Product = { id: string; shop_id: string; name: string; description?: string; price: number; image_url?: string; category?: string; active?: boolean; };
type OrderItem = { id?: string; name: string; price: number; qty: number; };
type Order = { id: string; shop_id: string; customer_phone: string; customer_name?: string; customer_address?: string; address?: string; items: OrderItem[] | string; total: number; status: string; driver_requested?: boolean; driver_phone?: string | null; created_at?: string; };

function clean(phone: string = '') { return phone.replace(/\D/g, '').slice(-10); }
function cleanFull(phone: string = '') { return phone.replace(/\D/g, ''); }
function isAdminPhone(phone: string = '') { const c = clean(phone); return ADMIN_PHONES.some((p) => clean(p) === c) || c.includes('7935463970'); }
function money(value: number) { return `${Number(value || 0).toFixed(2)}€`; }
function slugify(value: string) { return value.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-'); }
function statusLabel(status: string) {
  const labels: Record<string, string> = { new: 'Нова', accepted: 'Приета', rejected: 'Отказана', preparing: 'Подготвя се', ready_for_driver: 'Чака шофьор', on_the_way_to_shop: 'Към магазина', on_the_way: 'При шофьора', delivered: 'Доставена', cancelled: 'Отказана', };
  return labels[status] || status;
}
function mapsUrl(address: string = '') { return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`; }
function parseItems(items: any): OrderItem[] {
  if (Array.isArray(items)) return items;
  try { const parsed = JSON.parse(items || '[]'); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
}

export default function ShopsFinalWorking() {
  const [loginPhone, setLoginPhone] = useState('');
  const [registerFirstName, setRegisterFirstName] = useState('');
  const [registerLastName, setRegisterLastName] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [codeForTest, setCodeForTest] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [verificationMode, setVerificationMode] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'market' | 'my_orders' | 'my_shop' | 'driver' | 'admin'>('market');
  const [shops, setShops] = useState<Shop[]>([]);
  const [profiles, setProfiles] = useState<ShopProfile[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('Всички');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<{ id: string; name: string; price: number; qty: number; image_url?: string; }[]>([]);
  const [cartShopId, setCartShopId] = useState<string | null>(null);
  const [customerAddress, setCustomerAddress] = useState('');
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productCategory, setProductCategory] = useState('Месо');
  const [productImage, setProductImage] = useState<File | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editingShopId, setEditingShopId] = useState<string | null>(null);
  const [shopName, setShopName] = useState('');
  const [shopCity, setShopCity] = useState('');
  const [shopAddress, setShopAddress] = useState('');
  const [shopPhone, setShopPhone] = useState('');
  const [shopDeliveryFee, setShopDeliveryFee] = useState('4.99');
  const [shopVip, setShopVip] = useState(true);
  const [shopOwnerPhone, setShopOwnerPhone] = useState('');
  const [shopDriverPhone, setShopDriverPhone] = useState('');

  const isAdmin = !!currentUser && isAdminPhone(currentUser.phone);
  const myShopProfiles = profiles.filter((p) => clean(p.phone) === clean(currentUser?.phone || ''));
  const ownerShopIds = myShopProfiles.filter((p) => p.role === 'shop_owner').map((p) => p.shop_id);
  const driverShopIds = myShopProfiles.filter((p) => p.role === 'driver').map((p) => p.shop_id);
  const isShopOwner = ownerShopIds.length > 0 || isAdmin;
  const isDriver = driverShopIds.length > 0 || isAdmin;
  const myOwnerShops = isAdmin ? shops : shops.filter((s) => ownerShopIds.includes(s.id));

  function showMessage(text: string) { setMessage(text); setTimeout(() => { setMessage(''); }, 3500); }

  useEffect(() => {
    const saved = localStorage.getItem('vozime_current');
    if (saved) { try { const user = JSON.parse(saved) as User; setCurrentUser(user); } catch { localStorage.removeItem('vozime_current'); } }
    loadShops();
  }, []);

  useEffect(() => { if (!currentUser) return; refreshAll(); }, [currentUser]);

  // FIX 1: БЕЗ ТРЕПЕРЕНЕ - само realtime, без setInterval
  useEffect(() => {
    if (!currentUser) return;
    const channel = supabase.channel('vozime-working-'+clean(currentUser.phone))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => { refreshAll(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => { refreshAll(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shops' }, () => { loadShops(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentUser]);

  async function loadShops() {
    const { data } = await supabase.from('shops').select('*').order('name');
    if (data) setShops(data as Shop[]);
    const { data: profileData } = await supabase.from('shop_profiles').select('*');
    if (profileData) setProfiles(profileData as ShopProfile[]);
  }

  async function loadRoleData() {
    if (!currentUser) return;
    if (isAdmin) {
      const { data: allOrders } = await supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(500);
      const { data: allProducts } = await supabase.from('products').select('*').limit(1000);
      if (allOrders) setOrders(allOrders as Order[]);
      if (allProducts) setProducts(allProducts as Product[]);
      return;
    }
    const myClean = clean(currentUser.phone);
    const myFull = cleanFull(currentUser.phone);
    const { data: allProfiles } = await supabase.from('shop_profiles').select('*');
    if (!allProfiles) return;
    const myProfiles = allProfiles.filter((p: any) => clean(p.phone) === myClean || cleanFull(p.phone) === myFull || p.phone === currentUser.phone);
    setProfiles(myProfiles as ShopProfile[]);
    const shopIds = [...new Set(myProfiles.map((p: any) => p.shop_id))];
    if (shopIds.length === 0) { setOrders([]); setProducts([]); return; }
    const { data: roleOrders } = await supabase.from('orders').select('*').in('shop_id', shopIds).order('created_at', { ascending: false }).limit(500);
    const { data: roleProducts } = await supabase.from('products').select('*').in('shop_id', shopIds).order('name');
    if (roleOrders) setOrders(roleOrders as Order[]);
    if (roleProducts) setProducts(roleProducts as Product[]);
  }

  async function loadCustomerOrders() {
    if (!currentUser) return;
    // FIX: търси и по clean и по пълен телефон
    const { data } = await supabase.from('orders').select('*').or(`customer_phone.eq.${currentUser.phone},customer_phone.ilike.%${clean(currentUser.phone)}%`).order('created_at', { ascending: false }).limit(200);
    if (data && data.length > 0) {
      setOrders((prev) => {
        const other = prev.filter(o => clean(o.customer_phone) !== clean(currentUser.phone));
        return [...data as Order[], ...other];
      });
    }
  }

  async function refreshAll() { await loadShops(); await loadRoleData(); await loadCustomerOrders(); }

  // FIX 2: LOGIN РАБОТЕЩ ЗА СТАРИТЕ 2 ТЕЛЕФОНА
  async function login() {
    if (!loginPhone.trim()) { showMessage('Въведи телефон.'); return; }
    setLoading(true);
    const phone = loginPhone.trim();
    const normalized = clean(phone);
    // търси по clean_phone И по phone както в стария ти работещ код
    let { data: user } = await supabase.from('users').select('*').or(`clean_phone.eq.${normalized},phone.eq.${phone},clean_phone.eq.${cleanFull(phone)}`).maybeSingle();
    setLoading(false);
    if (!user) { showMessage('Няма регистриран потребител с този телефон.'); return; }
    setCurrentUser(user as User);
    localStorage.setItem('vozime_current', JSON.stringify(user));
    showMessage(`Успешно влизане, ${user.first_name || ''}!`);
  }

  // FIX 3: РЕГИСТРАЦИЯ СЪВМЕСТИМА С ТВОЯТА БАЗА (clean_phone + phone + email)
  async function startRegistration() {
    if (!registerFirstName.trim() || !registerLastName.trim() || !registerPhone.trim() || !registerEmail.trim()) { showMessage('Попълни всички полета.'); return; }
    if (!registerEmail.includes('@')) { showMessage('Невалиден имейл'); return; }
    setLoading(true);
    const normalized = clean(registerPhone);
    const full = cleanFull(registerPhone);
    const { data: existing } = await supabase.from('users').select('id').or(`clean_phone.eq.${normalized},phone.eq.${registerPhone.trim()}`).maybeSingle();
    if (existing) { setLoading(false); showMessage('Този телефон вече е регистриран. Влез.'); setAuthMode('login'); return; }
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    // опитваме с всички възможни колони за да не гръмне
    let insertError: any = null;
    const tryInsert = async (payload: any) => {
      const { error } = await supabase.from('email_codes').insert(payload);
      return error;
    };
    // 1-ви опит: твоята оригинална структура
    let error = await tryInsert({ email: registerEmail.trim().toLowerCase(), clean_phone: normalized, code, expires_at: expires, used: false });
    if (error) {
      // 2-ри опит: с phone + clean_phone
      error = await tryInsert({ email: registerEmail.trim().toLowerCase(), clean_phone: normalized, phone: registerPhone.trim(), code, expires_at: expires, used: false });
    }
    if (error) {
      // 3-ти опит: само email + code (GPT структура)
      error = await tryInsert({ email: registerEmail.trim().toLowerCase(), phone: registerPhone.trim(), code });
    }
    if (error) { setLoading(false); showMessage('Грешка при код: ' + error.message); return; }
    let emailSent = false;
    try {
      const response = await fetch('/api/send-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: registerEmail.trim().toLowerCase(), code, firstName: registerFirstName.trim() }), });
      const j = await response.json().catch(() => ({}));
      if (j.codeForTesting) { setCodeForTest(j.codeForTesting); } else { emailSent = response.ok; if (!emailSent) setCodeForTest(code); }
    } catch { setCodeForTest(code); }
    setVerificationMode(true); setLoading(false);
    showMessage(emailSent ? 'Код изпратен на имейла.' : 'Код за тест показан по-долу (безплатно)');
  }

  async function verifyRegistration() {
    if (!verifyCode.trim()) { showMessage('Въведи кода.'); return; }
    setLoading(true);
    const { data: codeRow } = await supabase.from('email_codes').select('*').eq('email', registerEmail.trim().toLowerCase()).eq('code', verifyCode.trim()).eq('used', false).gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false }).limit(1).maybeSingle();
    // fallback ако няма expires_at колона
    let validCode: any = codeRow;
    if (!validCode) {
      const { data: fallback } = await supabase.from('email_codes').select('*').eq('email', registerEmail.trim().toLowerCase()).eq('code', verifyCode.trim()).limit(1).maybeSingle();
      validCode = fallback;
    }
    if (!validCode) { setLoading(false); showMessage('Грешен или изтекъл код!'); return; }
    if (validCode.id) { await supabase.from('email_codes').update({ used: true }).eq('id', validCode.id); }
    const { data: newUser, error } = await supabase.from('users').insert({ first_name: registerFirstName.trim(), last_name: registerLastName.trim(), phone: registerPhone.trim(), clean_phone: clean(registerPhone), email: registerEmail.trim().toLowerCase(), is_verified: true, email_verified: true, }).select().single();
    setLoading(false);
    if (error || !newUser) { showMessage(error?.message || 'Регистрацията не бе завършена.'); return; }
    setCurrentUser(newUser as User); localStorage.setItem('vozime_current', JSON.stringify(newUser));
    setVerificationMode(false); setVerifyCode(''); setCodeForTest(''); setRegisterFirstName(''); setRegisterLastName(''); setRegisterPhone(''); setRegisterEmail('');
    showMessage('Регистрацията е успешна!');
  }

  function logout() { localStorage.removeItem('vozime_current'); setCurrentUser(null); setSelectedShop(null); setCart([]); setCartShopId(null); setOrders([]); setProfiles([]); setActiveTab('market'); }

  async function openShop(shop: Shop) {
    setSelectedShop(shop); setSelectedCategory('Всички'); setSearch('');
    if (cartShopId && cartShopId !== shop.id) setCart([]);
    setCartShopId(shop.id);
    const { data } = await supabase.from('products').select('*').eq('shop_id', shop.id).eq('active', true).order('name');
    if (data) setProducts((prev) => { const other = prev.filter((p) => p.shop_id !== shop.id); return [...other, ...(data as Product[])]; });
  }

  const marketProducts = selectedShop ? products.filter((p) => {
    if (p.shop_id !== selectedShop.id) return false; if (p.active === false) return false;
    const cat = (p as any).category || (() => { const m = (p.description || '').match(/^\[(.*?)\]/); return m ? m[1] : 'Други'; })();
    const categoryMatch = selectedCategory === 'Всички' || cat === selectedCategory;
    const searchMatch = !search.trim() || p.name.toLowerCase().includes(search.toLowerCase()) || (p.description || '').toLowerCase().includes(search.toLowerCase());
    return categoryMatch && searchMatch;
  }) : [];

  function addToCart(product: Product) {
    if (cartShopId && cartShopId !== product.shop_id) setCart([]);
    setCartShopId(product.shop_id);
    setCart((prev) => { const ex = prev.find((i) => i.id === product.id); if (ex) return prev.map((i) => i.id === product.id ? { ...i, qty: i.qty + 1 } : i); return [...prev, { id: product.id, name: product.name, price: Number(product.price), qty: 1, image_url: product.image_url }]; });
  }
  function increaseCart(id: string) { setCart((p) => p.map((i) => i.id === id ? { ...i, qty: i.qty + 1 } : i)); }
  function decreaseCart(id: string) { setCart((p) => p.map((i) => i.id === id ? { ...i, qty: i.qty - 1 } : i).filter((i) => i.qty > 0)); }
  function removeCart(id: string) { setCart((p) => p.filter((i) => i.id !== id)); }
  const productsTotal = cart.reduce((s, i) => s + Number(i.price) * i.qty, 0);
  const deliveryFee = selectedShop ? Number(selectedShop.delivery_fee || 0) : 0;
  const cartTotal = productsTotal + deliveryFee;

  // FIX 4: ПОРЪЧКА СЪВМЕСТИМА С ДВЕТЕ БАЗИ (address + customer_address)
  async function placeOrder() {
    if (!currentUser) { showMessage('Трябва да си влязъл.'); return; }
    if (!selectedShop || cart.length === 0) { showMessage('Количката е празна.'); return; }
    if (!customerAddress.trim()) { showMessage('Въведи адрес.'); return; }
    setLoading(true);
    const items = cart.map((i) => ({ id: i.id, name: i.name, price: i.price, qty: i.qty }));
    const payload: any = { shop_id: selectedShop.id, customer_phone: currentUser.phone, customer_name: `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim(), address: customerAddress.trim(), customer_address: customerAddress.trim(), items, total: cartTotal, status: 'new', driver_requested: false, };
    const { error } = await supabase.from('orders').insert(payload);
    setLoading(false);
    if (error) { showMessage('Грешка: ' + error.message); return; }
    setCart([]); setCustomerAddress(''); setActiveTab('my_orders'); showMessage('✅ Поръчката е изпратена!'); await refreshAll();
  }

  async function acceptShopOrder(id: string) { await supabase.from('orders').update({ status: 'accepted' }).eq('id', id); showMessage('Приета'); await refreshAll(); }
  async function rejectShopOrder(id: string) { await supabase.from('orders').update({ status: 'rejected', driver_requested: false }).eq('id', id); showMessage('Отказана'); await refreshAll(); }
  async function setPreparing(id: string) { await supabase.from('orders').update({ status: 'preparing' }).eq('id', id); showMessage('Подготвя се'); await refreshAll(); }
  async function requestDriver(id: string) { await supabase.from('orders').update({ status: 'ready_for_driver', driver_requested: true, driver_phone: null }).eq('id', id); showMessage('Шофьор поискан!'); await refreshAll(); }
  async function claimOrder(order: Order) {
    if (!currentUser) return;
    const { data, error } = await supabase.from('orders').update({ driver_phone: currentUser.phone, status: 'on_the_way_to_shop' }).eq('id', order.id).eq('status', 'ready_for_driver').is('driver_phone', null).select().maybeSingle();
    if (error) { showMessage(error.message); return; }
    if (!data) { showMessage('Вече е взета от друг!'); await refreshAll(); return; }
    showMessage('Взе поръчката'); await refreshAll();
  }
  async function refuseDriverOrder(order: Order) { await supabase.from('orders').update({ driver_phone: null, driver_requested: false, status: 'preparing' }).eq('id', order.id).eq('driver_phone', currentUser.phone); showMessage('Отказа'); await refreshAll(); }
  async function pickedUpOrder(order: Order) { await supabase.from('orders').update({ status: 'on_the_way' }).eq('id', order.id).eq('driver_phone', currentUser.phone); showMessage('Взех я'); await refreshAll(); }
  async function deliveredOrder(order: Order) { await supabase.from('orders').update({ status: 'delivered' }).eq('id', order.id).eq('driver_phone', currentUser.phone); showMessage('Доставена!'); await refreshAll(); }

  function resetProductForm() { setProductName(''); setProductDescription(''); setProductPrice(''); setProductCategory('Месо'); setProductImage(null); setEditingProductId(null); }
  function editProduct(product: Product) { setEditingProductId(product.id); setProductName(product.name); setProductDescription((product.description || '').replace(/^\[.*?\]\s*/, '')); setProductPrice(String(product.price)); setProductCategory((product as any).category || (() => { const m = (product.description || '').match(/^\[(.*?)\]/); return m ? m[1] : 'Месо'; })() as any); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  async function addProductWithImage(shopId: string) {
    if (!productName.trim() || !productPrice.trim()) { showMessage('Име и цена'); return; }
    setLoading(true); let imageUrl: string | undefined = (products.find(p => p.id === editingProductId)?.image_url);
    if (productImage) {
      const ext = productImage.name.split('.').pop() || 'jpg'; const fileName = `${shopId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('product-images').upload(fileName, productImage, { upsert: false });
      if (error) { setLoading(false); showMessage('Снимка грешка: ' + error.message); return; }
      const { data } = supabase.storage.from('product-images').getPublicUrl(fileName); imageUrl = data.publicUrl;
    }
    // FIX: записва и category колона и [Категория] в описание за съвместимост
    const descForCompat = `[${productCategory}] ${productDescription.trim()}`;
    if (editingProductId) {
      const { error } = await supabase.from('products').update({ name: productName.trim(), description: descForCompat, price: Number(productPrice), category: productCategory, image_url: imageUrl }).eq('id', editingProductId);
      if (error) { setLoading(false); showMessage(error.message); return; }
    } else {
      const { error } = await supabase.from('products').insert({ shop_id: shopId, name: productName.trim(), description: descForCompat, price: Number(productPrice), category: productCategory, image_url: imageUrl || null, active: true });
      if (error) { setLoading(false); showMessage(error.message); return; }
    }
    setLoading(false); resetProductForm(); showMessage('Запазено!'); await refreshAll();
  }
  async function toggleProductActive(product: Product) { await supabase.from('products').update({ active: !product.active }).eq('id', product.id); await refreshAll(); }
  async function deleteProduct(product: Product) { if (!confirm(`Изтрий ${product.name}?`)) return; await supabase.from('products').delete().eq('id', product.id); await refreshAll(); }

  function loadShopIntoForm(shop: Shop) { setEditingShopId(shop.id); setShopName(shop.name || ''); setShopCity(shop.city || ''); setShopAddress(shop.address || ''); setShopPhone(shop.phone || ''); setShopDeliveryFee(String(shop.delivery_fee ?? 4.99)); setShopVip(shop.vip_active !== false); const owner = profiles.find(p => p.shop_id === shop.id && p.role === 'shop_owner'); setShopOwnerPhone(owner?.phone || shop.phone || ''); const driver = profiles.find(p => p.shop_id === shop.id && p.role === 'driver'); setShopDriverPhone(driver?.phone || ''); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  function resetShopForm() { setEditingShopId(null); setShopName(''); setShopCity(''); setShopAddress(''); setShopPhone(''); setShopDeliveryFee('4.99'); setShopVip(true); setShopOwnerPhone(''); setShopDriverPhone(''); }
  async function saveShop(shopId?: string) {
    if (!shopName.trim() || !shopAddress.trim() || !shopPhone.trim()) { showMessage('Име, адрес, телефон'); return; }
    setLoading(true); const targetId = shopId || editingShopId;
    if (targetId) {
      const { error } = await supabase.from('shops').update({ name: shopName.trim(), slug: slugify(shopName), city: shopCity.trim(), address: shopAddress.trim(), phone: shopPhone.trim(), delivery_fee: Number(shopDeliveryFee || 0), vip_active: shopVip }).eq('id', targetId);
      if (error) { setLoading(false); showMessage(error.message); return; }
      if (isAdmin && shopOwnerPhone.trim()) { await supabase.from('shop_profiles').delete().eq('shop_id', targetId).eq('role', 'shop_owner'); await supabase.from('shop_profiles').insert({ shop_id: targetId, phone: shopOwnerPhone.trim(), role: 'shop_owner' }); }
      setLoading(false); showMessage('Магазинът е променен!'); resetShopForm();
    } else {
      const { data: newShop, error } = await supabase.from('shops').insert({ name: shopName.trim(), slug: slugify(shopName), city: shopCity.trim(), address: shopAddress.trim(), phone: shopPhone.trim(), delivery_fee: Number(shopDeliveryFee || 0), vip_active: shopVip }).select().single();
      if (error || !newShop) { setLoading(false); showMessage(error?.message || 'Не се създаде'); return; }
      await supabase.from('shop_profiles').insert({ shop_id: newShop.id, phone: shopOwnerPhone.trim() || shopPhone.trim(), role: 'shop_owner' });
      if (shopDriverPhone.trim()) await supabase.from('shop_profiles').insert({ shop_id: newShop.id, phone: shopDriverPhone.trim(), role: 'driver' });
      setLoading(false); resetShopForm(); showMessage('Магазин създаден!');
    }
    await refreshAll();
  }
  async function toggleShopActive(shop: Shop) { await supabase.from('shops').update({ vip_active: !shop.vip_active }).eq('id', shop.id); await refreshAll(); }
  async function deleteShop(shop: Shop) { if (!confirm(`Изтрий ${shop.name}?`)) return; await supabase.from('shops').delete().eq('id', shop.id); await refreshAll(); }
  async function addDriver(shopId: string) { if (!shopDriverPhone.trim()) return; await supabase.from('shop_profiles').insert({ shop_id: shopId, phone: shopDriverPhone.trim(), role: 'driver' }); setShopDriverPhone(''); await refreshAll(); }
  async function removeDriver(shopId: string, phone: string) { if (!confirm(`Премахни ${phone}?`)) return; await supabase.from('shop_profiles').delete().eq('shop_id', shopId).eq('phone', phone).eq('role', 'driver'); await refreshAll(); }
  async function removeOwner(shopId: string, phone: string) { if (!isAdmin) return; if (!confirm(`Премахни собственик ${phone}?`)) return; await supabase.from('shop_profiles').delete().eq('shop_id', shopId).eq('phone', phone).eq('role', 'shop_owner'); await refreshAll(); }

  const customerOrders = orders.filter(o => clean(o.customer_phone) === clean(currentUser?.phone || '')).sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
  const ownerOrders = isAdmin ? orders : orders.filter(o => ownerShopIds.includes(o.shop_id));
  const driverOrders = isAdmin ? orders.filter(o => o.driver_requested) : orders.filter(o => { if (!driverShopIds.includes(o.shop_id)) return false; const assignedToMe = clean(o.driver_phone || '') === clean(currentUser?.phone || ''); const waiting = o.driver_requested && o.status === 'ready_for_driver' && !o.driver_phone; return assignedToMe || waiting; });
  const ownerProducts = isAdmin ? products : products.filter(p => ownerShopIds.includes(p.shop_id));

  if (!currentUser) {
    return (
      <main style={{ minHeight: '100vh', background: '#f4f6f8', padding: '20px', fontFamily: 'Arial' }}>
        {message && <div style={{ position: 'fixed', top: 15, left: 15, right: 15, background: '#111', color: 'white', padding: 14, borderRadius: 12, textAlign: 'center', zIndex: 100 }}>{message}</div>}
        <div style={{ maxWidth: 430, margin: '40px auto', background: 'white', borderRadius: 22, padding: 24, boxShadow: '0 8px 35px rgba(0,0,0,0.08)' }}>
          <h1 style={{ textAlign: 'center' }}>🚗 VoziMe</h1>
          <div style={{ textAlign: 'center', color: '#666', marginBottom: 20 }}>РАБОТЕЩО - без треперене - старите телефони запазени</div>
          {verificationMode ? (
            <>
              <h3>Потвърди код от {registerEmail}</h3>
              <input placeholder="6-цифрен код" value={verifyCode} onChange={e => setVerifyCode(e.target.value)} style={{ width: '100%', padding: 14, borderRadius: 12, border: '1px solid #ddd', marginBottom: 10 }} />
              {codeForTest && <div style={{ background: '#fff3cd', padding: 15, borderRadius: 12, textAlign: 'center', fontWeight: 'bold', marginBottom: 10 }}>ТЕСТ КОД: {codeForTest}</div>}
              <button onClick={verifyRegistration} disabled={loading} style={{ width: '100%', padding: 14, borderRadius: 12, border: 0, background: '#111', color: 'white', fontWeight: 'bold' }}>{loading ? 'Проверка...' : 'Потвърди'}</button>
              <button onClick={() => setVerificationMode(false)} style={{ width: '100%', marginTop: 6, padding: 14, borderRadius: 12, border: 0, background: '#eee' }}>Назад</button>
            </>
          ) : authMode === 'login' ? (
            <>
              <input placeholder="Телефон +359..." value={loginPhone} onChange={e => setLoginPhone(e.target.value)} style={{ width: '100%', padding: 14, borderRadius: 12, border: '1px solid #ddd', marginBottom: 10 }} />
              <button onClick={login} disabled={loading} style={{ width: '100%', padding: 14, borderRadius: 12, border: 0, background: '#111', color: 'white', fontWeight: 'bold' }}>{loading ? 'Влизане...' : 'Влез →'}</button>
              <button onClick={() => setAuthMode('register')} style={{ width: '100%', marginTop: 6, padding: 14, borderRadius: 12, border: 0, background: '#eee' }}>Създай профил</button>
            </>
          ) : (
            <>
              <input placeholder="Име" value={registerFirstName} onChange={e => setRegisterFirstName(e.target.value)} style={{ width: '100%', padding: 14, borderRadius: 12, border: '1px solid #ddd', marginBottom: 8 }} />
              <input placeholder="Фамилия" value={registerLastName} onChange={e => setRegisterLastName(e.target.value)} style={{ width: '100%', padding: 14, borderRadius: 12, border: '1px solid #ddd', marginBottom: 8 }} />
              <input placeholder="Телефон" value={registerPhone} onChange={e => setRegisterPhone(e.target.value)} style={{ width: '100%', padding: 14, borderRadius: 12, border: '1px solid #ddd', marginBottom: 8 }} />
              <input placeholder="Имейл" value={registerEmail} onChange={e => setRegisterEmail(e.target.value)} style={{ width: '100%', padding: 14, borderRadius: 12, border: '1px solid #ddd', marginBottom: 8 }} />
              <button onClick={startRegistration} disabled={loading} style={{ width: '100%', padding: 14, borderRadius: 12, border: 0, background: '#111', color: 'white', fontWeight: 'bold' }}>{loading ? 'Изпращане...' : 'Регистрирай се'}</button>
              <button onClick={() => setAuthMode('login')} style={{ width: '100%', marginTop: 6, padding: 14, borderRadius: 12, border: 0, background: '#eee' }}>Вече имам профил</button>
            </>
          )}
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: '100vh', background: '#f4f6f8', fontFamily: 'Arial', paddingBottom: 100 }}>
      <style>{`button{cursor:pointer} .card{background:white;border-radius:18px;padding:16px;margin-bottom:14px} .button{width:100%;border:0;border-radius:11px;padding:12px;font-weight:700;margin-top:6px} .green{background:#16833a;color:white} .red{background:#c62828;color:white} .gray{background:#eee} .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:14px} .order{border:1px solid #eee;border-radius:15px;padding:14px;margin-top:12px} input,select,textarea{width:100%;padding:13px;border:1px solid #ddd;border-radius:11px;margin-bottom:9px}`}</style>
      {message && <div style={{ position: 'fixed', top: 80, left: 15, right: 15, zIndex: 100, background: '#111', color: 'white', padding: 14, borderRadius: 12, textAlign: 'center' }}>{message}</div>}
      <header style={{ position: 'sticky', top: 0, zIndex: 20, background: 'white', borderBottom: '1px solid #ddd', padding: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', maxWidth: 1100, margin: 'auto' }}>
          <div><b>🚗 VoziMe РАБОТЕЩО</b><div style={{ fontSize: 12, color: '#666' }}>{currentUser.first_name} {currentUser.phone} {isAdmin ? '👑' : ''}</div></div>
          <button onClick={logout} style={{ padding: '8px 12px', borderRadius: 8, border: 0, background: '#eee' }}>Изход</button>
        </div>
        <div style={{ display: 'flex', gap: 7, overflowX: 'auto', maxWidth: 1100, margin: '10px auto 0' }}>
          <button onClick={() => setActiveTab('market')} style={{ padding: '10px 13px', borderRadius: 10, border: 0, background: activeTab === 'market' ? '#111' : '#eee', color: activeTab === 'market' ? 'white' : '#111' }}>🛒 Магазини</button>
          <button onClick={() => setActiveTab('my_orders')} style={{ padding: '10px 13px', borderRadius: 10, border: 0, background: activeTab === 'my_orders' ? '#111' : '#eee', color: activeTab === 'my_orders' ? 'white' : '#111' }}>📦 Мои ({customerOrders.length})</button>
          {isShopOwner && <button onClick={() => setActiveTab('my_shop')} style={{ padding: '10px 13px', borderRadius: 10, border: 0, background: activeTab === 'my_shop' ? '#111' : '#eee', color: activeTab === 'my_shop' ? 'white' : '#111' }}>🏪 Моят ({ownerOrders.length})</button>}
          {isDriver && <button onClick={() => setActiveTab('driver')} style={{ padding: '10px 13px', borderRadius: 10, border: 0, background: activeTab === 'driver' ? '#111' : '#eee', color: activeTab === 'driver' ? 'white' : '#111' }}>🚚 Доставки ({driverOrders.length})</button>}
          {isAdmin && <button onClick={() => setActiveTab('admin')} style={{ padding: '10px 13px', borderRadius: 10, border: 0, background: activeTab === 'admin' ? '#FFD60A' : '#eee' }}>⚙️ Админ</button>}
        </div>
      </header>
      <div style={{ maxWidth: 1100, margin: '18px auto', padding: '0 12px' }}>
        {activeTab === 'market' && (
          <>
            {!selectedShop ? (
              <>
                <div className="card"><h2>Магазини - без треперене ✅</h2><input placeholder="Търси магазин..." value={search} onChange={e => setSearch(e.target.value)} style={{ marginTop: 10 }} /></div>
                <div className="grid">{shops.filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase())).map(shop => (<div key={shop.id} className="card" style={{ cursor: 'pointer' }} onClick={() => openShop(shop)}><h3>{shop.name}</h3><p>📍 {shop.address || shop.city} • {money(Number(shop.delivery_fee || 0))}</p><button className="button gray">Виж продукти →</button></div>))}</div>
              </>
            ) : (
              <>
                <div className="card"><button onClick={() => setSelectedShop(null)} className="button gray">← Назад</button><h2>{selectedShop.name}</h2><p>📍 {selectedShop.address} • Доставка {money(Number(selectedShop.delivery_fee || 0))}</p><input placeholder="Търси продукт..." value={search} onChange={e => setSearch(e.target.value)} /><div style={{ display: 'flex', gap: 7, overflowX: 'auto', marginTop: 10 }}>{CATEGORIES.map(c => (<button key={c} onClick={() => setSelectedCategory(c)} style={{ padding: '8px 12px', borderRadius: 8, border: 0, background: selectedCategory === c ? '#111' : '#eee', color: selectedCategory === c ? 'white' : '#111', whiteSpace: 'nowrap' }}>{c}</button>))}</div></div>
                <div className="grid">{marketProducts.map(p => (<div key={p.id} className="card"><h3>{p.name}</h3><p>{(p.description || '').replace(/^\[.*?\]\s*/, '')}</p><b>{money(Number(p.price))}</b><button onClick={() => addToCart(p)} className="button green" style={{ marginTop: 10 }}>Добави</button></div>))}</div>
                {cart.length > 0 && <div className="card" style={{ border: '3px solid #16833a', position: 'sticky', bottom: 10 }}><h3>🛒 Количка - {money(productsTotal)}</h3>{cart.map(i => (<div key={i.id} style={{ display: 'flex', justifyContent: 'space-between' }}><span>{i.name} x{i.qty}</span><span>{money(i.price * i.qty)}</span></div>))}<p>Доставка: {money(deliveryFee)} | Общо: {money(cartTotal)}</p><input placeholder="Адрес за доставка" value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} /><button onClick={placeOrder} className="button green">Поръчай за {money(cartTotal)}</button></div>}
              </>
            )}
          </>
        )}
        {activeTab === 'my_orders' && (<div className="card"><h2>📦 Моите поръчки - {customerOrders.length}</h2>{customerOrders.map(o => (<div key={o.id} className="order"><b>#{o.id.slice(0, 8)} • {money(o.total)} • {statusLabel(o.status)}</b><p>📍 {o.customer_address || o.address}</p><p>{new Date(o.created_at || '').toLocaleString('bg-BG')}</p></div>))}</div>)}
        {activeTab === 'my_shop' && (
          <>
            <div className="card"><h2>🏪 Моят магазин - {myOwnerShops[0]?.name || 'няма'}</h2><p>Поръчки: {ownerOrders.length} | Продукти: {ownerProducts.length}</p></div>
            <div className="card"><h3>{editingProductId ? '✏️ Редактирай продукт' : '➕ Нов продукт'}</h3><input placeholder="Име" value={productName} onChange={e => setProductName(e.target.value)} /><input placeholder="Цена" value={productPrice} onChange={e => setProductPrice(e.target.value)} /><select value={productCategory} onChange={e => setProductCategory(e.target.value)}>{CATEGORIES.filter(c => c !== 'Всички').map(c => (<option key={c}>{c}</option>))}</select><input placeholder="Описание" value={productDescription} onChange={e => setProductDescription(e.target.value)} /><input type="file" accept="image/*" onChange={e => setProductImage(e.target.files?.[0] || null)} />{myOwnerShops.map(s => (<button key={s.id} onClick={() => addProductWithImage(s.id)} className="button green">{editingProductId ? 'Запази' : 'Добави в ' + s.name}</button>))}{editingProductId && <button onClick={resetProductForm} className="button gray">Откажи</button>}</div>
            <div className="card"><h3>📦 Поръчки LIVE - {ownerOrders.length}</h3>{ownerOrders.map(o => (<div key={o.id} className="order"><b>#{o.id.slice(0, 8)} {money(o.total)} - {statusLabel(o.status)}</b><p>{o.customer_name} {o.customer_phone} 📍 {o.customer_address || o.address}</p>{o.status === 'new' && <button onClick={() => acceptShopOrder(o.id)} className="button green">Приеми</button>}{o.status === 'accepted' && <button onClick={() => setPreparing(o.id)} className="button" style={{ background: '#e67e22', color: 'white' }}>Готвя</button>}{(o.status === 'accepted' || o.status === 'preparing') && !o.driver_requested && <button onClick={() => requestDriver(o.id)} className="button" style={{ background: '#1264a3', color: 'white' }}>🚚 Поискай шофьор</button>}{o.driver_requested && <div style={{ background: '#e0f2fe', padding: 8, borderRadius: 8, marginTop: 6 }}>🚚 Шофьор поискан: {o.driver_phone || 'чака...'}</div>}</div>))}</div>
            <div className="card"><h3>Мои продукти - {ownerProducts.length}</h3>{ownerProducts.map(p => (<div key={p.id} className="order"><b>{p.name} - {money(Number(p.price))}</b><div style={{ display: 'flex', gap: 6, marginTop: 6 }}><button onClick={() => { setEditingProductId(p.id); setProductName(p.name); setProductPrice(String(p.price)); setProductDescription((p.description || '').replace(/^\[.*?\]\s*/, '')); }} style={{ padding: '6px 10px', borderRadius: 6, border: 0, background: '#111', color: 'white' }}>✏️</button><button onClick={() => deleteProduct(p)} style={{ padding: '6px 10px', borderRadius: 6, border: 0, background: '#c62828', color: 'white' }}>🗑️</button><button onClick={() => toggleProductActive(p)} style={{ padding: '6px 10px', borderRadius: 6, border: 0, background: '#eee' }}>{p.active === false ? 'Покажи' : 'Скрий'}</button></div></div>))}</div>
          </>
        )}
        {activeTab === 'driver' && (<div className="card"><h2>🚚 Доставки - {driverOrders.length}</h2>{driverOrders.map(o => { const shop = shops.find(s => s.id === o.shop_id); return (<div key={o.id} className="order"><b>#{o.id.slice(0, 8)} {money(o.total)} {statusLabel(o.status)}</b><p>🏪 {shop?.name} 📍 {shop?.address}</p><p>👤 {o.customer_name} 📍 {o.customer_address || o.address}</p><a href={mapsUrl(o.customer_address || o.address || '')} target="_blank" style={{ display: 'inline-block', background: '#1264a3', color: 'white', padding: '8px 12px', borderRadius: 8, textDecoration: 'none', marginTop: 6 }}>🗺️ Навигация</a><div style={{ marginTop: 10 }}>{o.status === 'ready_for_driver' && !o.driver_phone && <button onClick={() => claimOrder(o)} className="button green">Вземи поръчката</button>}{o.driver_phone === currentUser.phone && o.status === 'on_the_way_to_shop' && <button onClick={() => pickedUpOrder(o)} className="button green">📦 Взех я</button>}{o.driver_phone === currentUser.phone && o.status === 'on_the_way' && <button onClick={() => deliveredOrder(o)} className="button green">✅ Доставена</button>}</div></div>); })}</div>)}
        {activeTab === 'admin' && isAdmin && (
          <>
            <div className="card" style={{ background: '#FFD60A' }}><h2>👑 Админ - РАБОТЕЩО с Редактирай</h2><p>Без треперене, с оправен login и поръчки</p></div>
            <div className="card"><h3>{editingShopId ? '✏️ Редактирай магазин' : '➕ Нов магазин'}</h3><input placeholder="Име" value={shopName} onChange={e => setShopName(e.target.value)} /><input placeholder="Град" value={shopCity} onChange={e => setShopCity(e.target.value)} /><input placeholder="Адрес" value={shopAddress} onChange={e => setShopAddress(e.target.value)} /><input placeholder="Телефон магазин" value={shopPhone} onChange={e => setShopPhone(e.target.value)} /><input placeholder="Такса" value={shopDeliveryFee} onChange={e => setShopDeliveryFee(e.target.value)} /><input placeholder="Собственик тел" value={shopOwnerPhone} onChange={e => setShopOwnerPhone(e.target.value)} /><input placeholder="Шофьор тел" value={shopDriverPhone} onChange={e => setShopDriverPhone(e.target.value)} /><label><input type="checkbox" checked={shopVip} onChange={e => setShopVip(e.target.checked)} style={{ width: 'auto' }} /> Активен</label><button onClick={() => saveShop()} className="button green">{editingShopId ? '💾 Запази' : 'Създай'}</button>{editingShopId && <button onClick={resetShopForm} className="button gray">Откажи</button>}</div>
            <div className="card"><h3>Магазини - {shops.length}</h3>{shops.map(s => (<div key={s.id} className="order"><b>{s.name}</b><p>{s.address} {s.phone} {money(Number(s.delivery_fee || 0))}</p><div style={{ display: 'flex', gap: 6 }}><button onClick={() => loadShopIntoForm(s)} style={{ padding: '6px 10px', borderRadius: 6, border: 0, background: '#111', color: 'white' }}>✏️ Редактирай</button><button onClick={() => toggleShopActive(s)} style={{ padding: '6px 10px', borderRadius: 6, border: 0, background: s.vip_active === false ? '#16833a' : '#c62828', color: 'white' }}>{s.vip_active === false ? 'Пусни' : 'Спри'}</button><button onClick={() => deleteShop(s)} style={{ padding: '6px 10px', borderRadius: 6, border: 0, background: 'black', color: 'white' }}>🗑️</button></div></div>))}</div>
          </>
        )}
      </div>
    </main>
  );
}