'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ypfbljjrpppkdxdftjcv.supabase.co';
const SUPABASE_ANON_KEY =
  'sb_publishable_NZrVv1hI7aTWVdeyZT27-Q_rWp_olMG';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const ADMIN_PHONES = [
  '+447935463970',
  '447935463970',
  '07935463970',
];

const CATEGORIES = [
  'Всички',
  'Месо',
  'Кайма',
  'Колбаси',
  'Млечни',
  'Хляб',
  'Напитки',
  'Консерви',
  'Други',
];

type User = {
  id?: string;
  first_name?: string;
  last_name?: string;
  phone: string;
  clean_phone?: string;
  email?: string;
  is_verified?: boolean;
  email_verified?: boolean;
};

type Shop = {
  id: string;
  name: string;
  slug?: string;
  city?: string;
  address?: string;
  phone?: string;
  delivery_fee?: number;
  vip_active?: boolean;
};

type ShopProfile = {
  id?: string;
  shop_id: string;
  phone: string;
  role: string;
};

type Product = {
  id: string;
  shop_id: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  category?: string;
  active?: boolean;
};

type OrderItem = {
  id?: string;
  name: string;
  price: number;
  qty: number;
};

type Order = {
  id: string;
  shop_id: string;
  customer_phone: string;
  customer_name?: string;
  customer_address?: string;
  items: OrderItem[] | string;
  total: number;
  status: string;
  driver_requested?: boolean;
  driver_phone?: string | null;
  created_at?: string;
};

type CartItem = {
  id: string;
  name: string;
  price: number;
  qty: number;
  image_url?: string;
};

function clean(phone: string = '') {
  return phone.replace(/\D/g, '').slice(-10);
}

function cleanFull(phone: string = '') {
  return phone.replace(/\D/g, '');
}

function isAdminPhone(phone: string = '') {
  const c = clean(phone);

  return ADMIN_PHONES.some((p) => clean(p) === c) || c === '7935463970';
}

function money(value: number) {
  return `£${Number(value || 0).toFixed(2)}`;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    new: 'Нова',
    accepted: 'Приета',
    rejected: 'Отказана',
    preparing: 'Подготвя се',
    ready_for_driver: 'Чака шофьор',
    on_the_way_to_shop: 'Шофьорът пътува към магазина',
    on_the_way: 'Поръчката е при шофьора',
    delivered: 'Доставена',
    cancelled: 'Отказана',
  };

  return labels[status] || status;
}

function mapsUrl(address: string = '') {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    address
  )}`;
}

function parseItems(items: OrderItem[] | string): OrderItem[] {
  if (Array.isArray(items)) return items;

  try {
    const parsed = JSON.parse(items || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function distanceKm(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number }
) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;

  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;

  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) *
      Math.sin(dLon / 2) *
      Math.cos(lat1) *
      Math.cos(lat2);

  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export default function ShopsFinal() {
  /* =========================
     AUTH
  ========================= */

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

  /* =========================
     GENERAL
  ========================= */

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const [activeTab, setActiveTab] = useState<
    'market' | 'my_orders' | 'my_shop' | 'driver' | 'admin'
  >('market');

  /* =========================
     DATA
  ========================= */

  const [shops, setShops] = useState<Shop[]>([]);
  const [profiles, setProfiles] = useState<ShopProfile[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  /* =========================
     MARKET
  ========================= */

  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('Всички');
  const [search, setSearch] = useState('');
  const [sortByDistance, setSortByDistance] = useState(false);

  /* =========================
     CART
  ========================= */

  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartShopId, setCartShopId] = useState<string | null>(null);
  const [customerAddress, setCustomerAddress] = useState('');

  /* =========================
     PRODUCT FORM
  ========================= */

  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productCategory, setProductCategory] = useState('Други');
  const [productImage, setProductImage] = useState<File | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(
    null
  );

  /* =========================
     SHOP FORM
  ========================= */

  const [editingShopId, setEditingShopId] = useState<string | null>(null);

  const [shopName, setShopName] = useState('');
  const [shopCity, setShopCity] = useState('');
  const [shopAddress, setShopAddress] = useState('');
  const [shopPhone, setShopPhone] = useState('');
  const [shopDeliveryFee, setShopDeliveryFee] = useState('4.99');
  const [shopVip, setShopVip] = useState(true);
  const [shopOwnerPhone, setShopOwnerPhone] = useState('');
  const [shopDriverPhone, setShopDriverPhone] = useState('');

  /* =========================
     USER ROLE DATA
  ========================= */

  const isAdmin = !!currentUser && isAdminPhone(currentUser.phone);

  const myShopProfiles = profiles.filter(
    (p) => clean(p.phone) === clean(currentUser?.phone || '')
  );

  const ownerShopIds = myShopProfiles
    .filter((p) => p.role === 'shop_owner')
    .map((p) => p.shop_id);

  const driverShopIds = myShopProfiles
    .filter((p) => p.role === 'driver')
    .map((p) => p.shop_id);

  const isShopOwner = ownerShopIds.length > 0;
  const isDriver = driverShopIds.length > 0;

  const myOwnerShops = shops.filter((s) => ownerShopIds.includes(s.id));

  /* =========================
     TOAST
  ========================= */

  function showMessage(text: string) {
    setMessage(text);

    setTimeout(() => {
      setMessage('');
    }, 3500);
  }

  /* =========================
     AUTH LOAD
  ========================= */

  useEffect(() => {
    const saved = localStorage.getItem('vozime_current');

    if (saved) {
      try {
        const user = JSON.parse(saved) as User;
        setCurrentUser(user);
      } catch {
        localStorage.removeItem('vozime_current');
      }
    }

    loadShops();
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    refreshAll();
  }, [currentUser]);

  /* =========================
     REALTIME
  ========================= */

  useEffect(() => {
    const channel = supabase
      .channel('vozime-shops-live')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        () => {
          refreshAll();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products',
        },
        () => {
          refreshAll();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shops',
        },
        () => {
          loadShops();
        }
      )
      .subscribe();

    const timer = setInterval(() => {
      refreshAll();
    }, 8000);

    return () => {
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [currentUser]);

  /* =========================
     LOAD SHOPS
  ========================= */

  async function loadShops() {
    const { data, error } = await supabase
      .from('shops')
      .select('*')
      .order('name');

    if (!error && data) {
      setShops(data as Shop[]);
    }

    const { data: profileData } = await supabase
      .from('shop_profiles')
      .select('*');

    if (profileData) {
      setProfiles(profileData as ShopProfile[]);
    }
  }

  /* =========================
     LOAD ROLE DATA
  ========================= */

  async function loadRoleData() {
    if (!currentUser) return;

    let shopIds: string[] = [];

    if (isAdminPhone(currentUser.phone)) {
      const { data: allOrders } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      const { data: allProducts } = await supabase
        .from('products')
        .select('*')
        .limit(1000);

      if (allOrders) setOrders(allOrders as Order[]);
      if (allProducts) setProducts(allProducts as Product[]);

      return;
    }

    const { data: profileData } = await supabase
      .from('shop_profiles')
      .select('*')
      .eq('phone', currentUser.phone);

    if (profileData) {
      setProfiles(profileData as ShopProfile[]);

      shopIds = profileData
        .map((p: ShopProfile) => p.shop_id)
        .filter(Boolean);
    }

    if (shopIds.length === 0) {
      setOrders([]);
      setProducts([]);
      return;
    }

    const { data: roleOrders } = await supabase
      .from('orders')
      .select('*')
      .in('shop_id', shopIds)
      .order('created_at', { ascending: false })
      .limit(500);

    const { data: roleProducts } = await supabase
      .from('products')
      .select('*')
      .in('shop_id', shopIds)
      .order('name');

    if (roleOrders) setOrders(roleOrders as Order[]);
    if (roleProducts) setProducts(roleProducts as Product[]);
  }

  /* =========================
     CUSTOMER ORDERS
  ========================= */

  async function loadCustomerOrders() {
    if (!currentUser) return;

    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('customer_phone', currentUser.phone)
      .order('created_at', { ascending: false })
      .limit(200);

    if (data) {
      setOrders((previous) => {
        const roleOrders = previous.filter(
          (o) =>
            !(
              o.customer_phone &&
              clean(o.customer_phone) === clean(currentUser.phone)
            )
        );

        return [...(data as Order[]), ...roleOrders];
      });
    }
  }

  async function refreshAll() {
    await loadShops();
    await loadRoleData();
    await loadCustomerOrders();
  }

  /* =========================
     LOGIN
  ========================= */

  async function login() {
    if (!loginPhone.trim()) {
      showMessage('Въведи телефон.');
      return;
    }

    setLoading(true);

    const phone = loginPhone.trim();
    const normalized = clean(phone);

    let { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('clean_phone', normalized)
      .maybeSingle();

    if (!user && !error) {
      const result = await supabase
        .from('users')
        .select('*')
        .eq('phone', phone)
        .maybeSingle();

      user = result.data;
      error = result.error;
    }

    setLoading(false);

    if (error || !user) {
      showMessage('Няма регистриран потребител с този телефон.');
      return;
    }

    setCurrentUser(user as User);
    localStorage.setItem('vozime_current', JSON.stringify(user));

    showMessage('Успешно влизане.');
  }

  /* =========================
     REGISTER
  ========================= */

  async function startRegistration() {
    if (
      !registerFirstName.trim() ||
      !registerLastName.trim() ||
      !registerPhone.trim() ||
      !registerEmail.trim()
    ) {
      showMessage('Попълни всички полета.');
      return;
    }

    setLoading(true);

    const normalized = clean(registerPhone);

    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('clean_phone', normalized)
      .maybeSingle();

    if (existing) {
      setLoading(false);
      showMessage('Този телефон вече е регистриран.');
      return;
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));

    const { error } = await supabase.from('email_codes').insert({
      email: registerEmail.trim(),
      phone: registerPhone.trim(),
      code,
    });

    if (error) {
      setLoading(false);
      showMessage('Неуспешно създаване на код.');
      return;
    }

    let emailSent = false;

    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: registerEmail.trim(),
          code,
        }),
      });

      emailSent = response.ok;
    } catch {
      emailSent = false;
    }

    setCodeForTest(emailSent ? '' : code);
    setVerificationMode(true);
    setLoading(false);

    showMessage(
      emailSent
        ? 'Кодът е изпратен на имейла.'
        : 'Имейл изпращането не е налично. Кодът е показан за тест.'
    );
  }

  /* =========================
     VERIFY
  ========================= */

  async function verifyRegistration() {
    if (!verifyCode.trim()) {
      showMessage('Въведи кода.');
      return;
    }

    setLoading(true);

    const { data: codes, error } = await supabase
      .from('email_codes')
      .select('*')
      .eq('email', registerEmail.trim())
      .eq('code', verifyCode.trim())
      .limit(10);

    if (error || !codes || codes.length === 0) {
      setLoading(false);
      showMessage('Грешен код.');
      return;
    }

    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert({
        first_name: registerFirstName.trim(),
        last_name: registerLastName.trim(),
        phone: registerPhone.trim(),
        clean_phone: clean(registerPhone),
        email: registerEmail.trim(),
        is_verified: true,
        email_verified: true,
      })
      .select()
      .single();

    setLoading(false);

    if (userError || !newUser) {
      showMessage(userError?.message || 'Регистрацията не бе завършена.');
      return;
    }

    setCurrentUser(newUser as User);
    localStorage.setItem('vozime_current', JSON.stringify(newUser));

    setVerificationMode(false);
    setVerifyCode('');
    setCodeForTest('');

    showMessage('Регистрацията е успешна.');
  }

  function logout() {
    localStorage.removeItem('vozime_current');
    setCurrentUser(null);
    setSelectedShop(null);
    setCart([]);
    setCartShopId(null);
    setOrders([]);
    setProfiles([]);
  }

  /* =========================
     MARKET
  ========================= */

  async function openShop(shop: Shop) {
    setSelectedShop(shop);
    setSelectedCategory('Всички');
    setSearch('');

    if (cartShopId && cartShopId !== shop.id) {
      setCart([]);
    }

    setCartShopId(shop.id);

    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('shop_id', shop.id)
      .eq('active', true)
      .order('name');

    if (data) setProducts((previous) => {
      const otherProducts = previous.filter((p) => p.shop_id !== shop.id);
      return [...otherProducts, ...(data as Product[])];
    });
  }

  const marketProducts = selectedShop
    ? products.filter((p) => {
        if (p.shop_id !== selectedShop.id) return false;
        if (p.active === false) return false;

        const categoryMatch =
          selectedCategory === 'Всички' ||
          (p.category || 'Други') === selectedCategory;

        const searchMatch =
          !search.trim() ||
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          (p.description || '')
            .toLowerCase()
            .includes(search.toLowerCase());

        return categoryMatch && searchMatch;
      })
    : [];

  /* =========================
     CART
  ========================= */

  function addToCart(product: Product) {
    if (cartShopId && cartShopId !== product.shop_id) {
      setCart([]);
    }

    setCartShopId(product.shop_id);

    setCart((previous) => {
      const existing = previous.find((item) => item.id === product.id);

      if (existing) {
        return previous.map((item) =>
          item.id === product.id
            ? { ...item, qty: item.qty + 1 }
            : item
        );
      }

      return [
        ...previous,
        {
          id: product.id,
          name: product.name,
          price: Number(product.price),
          qty: 1,
          image_url: product.image_url,
        },
      ];
    });

    showMessage(`${product.name} е добавен в количката.`);
  }

  function increaseCart(id: string) {
    setCart((previous) =>
      previous.map((item) =>
        item.id === id ? { ...item, qty: item.qty + 1 } : item
      )
    );
  }

  function decreaseCart(id: string) {
    setCart((previous) =>
      previous
        .map((item) =>
          item.id === id ? { ...item, qty: item.qty - 1 } : item
        )
        .filter((item) => item.qty > 0)
    );
  }

  function removeCart(id: string) {
    setCart((previous) => previous.filter((item) => item.id !== id));
  }

  const productsTotal = cart.reduce(
    (sum, item) => sum + Number(item.price) * item.qty,
    0
  );

  const deliveryFee = selectedShop
    ? Number(selectedShop.delivery_fee || 0)
    : 0;

  const cartTotal = productsTotal + deliveryFee;

  /* =========================
     PLACE ORDER
  ========================= */

  async function placeOrder() {
    if (!currentUser) {
      showMessage('Трябва да си влязъл в профила.');
      return;
    }

    if (!selectedShop || cart.length === 0) {
      showMessage('Количката е празна.');
      return;
    }

    if (!customerAddress.trim()) {
      showMessage('Въведи адрес за доставка.');
      return;
    }

    setLoading(true);

    const items = cart.map((item) => ({
      id: item.id,
      name: item.name,
      price: item.price,
      qty: item.qty,
    }));

    const { error } = await supabase.from('orders').insert({
      shop_id: selectedShop.id,
      customer_phone: currentUser.phone,
      customer_name:
        `${currentUser.first_name || ''} ${
          currentUser.last_name || ''
        }`.trim(),
      customer_address: customerAddress.trim(),
      items,
      total: cartTotal,
      status: 'new',
      driver_requested: false,
    });

    setLoading(false);

    if (error) {
      showMessage(error.message || 'Поръчката не бе изпратена.');
      return;
    }

    setCart([]);
    setCustomerAddress('');
    setActiveTab('my_orders');

    showMessage('Поръчката е изпратена към магазина.');
    await refreshAll();
  }

  /* =========================
     SHOP ORDER ACTIONS
  ========================= */

  async function acceptShopOrder(id: string) {
    const { error } = await supabase
      .from('orders')
      .update({
        status: 'accepted',
      })
      .eq('id', id)
      .eq('status', 'new');

    if (error) {
      showMessage(error.message);
      return;
    }

    showMessage('Поръчката е приета.');
    await refreshAll();
  }

  async function rejectShopOrder(id: string) {
    const { error } = await supabase
      .from('orders')
      .update({
        status: 'rejected',
        driver_requested: false,
      })
      .eq('id', id)
      .eq('status', 'new');

    if (error) {
      showMessage(error.message);
      return;
    }

    showMessage('Поръчката е отказана.');
    await refreshAll();
  }

  async function setPreparing(id: string) {
    const { error } = await supabase
      .from('orders')
      .update({
        status: 'preparing',
      })
      .eq('id', id)
      .eq('status', 'accepted');

    if (error) {
      showMessage(error.message);
      return;
    }

    showMessage('Поръчката е маркирана като подготвяща се.');
    await refreshAll();
  }

  async function requestDriver(id: string) {
    const { error } = await supabase
      .from('orders')
      .update({
        status: 'ready_for_driver',
        driver_requested: true,
        driver_phone: null,
      })
      .eq('id', id)
      .in('status', ['accepted', 'preparing']);

    if (error) {
      showMessage(error.message);
      return;
    }

    showMessage('Изпратено е искане към шофьорите.');
    await refreshAll();
  }

  /* =========================
     DRIVER
  ========================= */

  async function claimOrder(order: Order) {
    if (!currentUser) return;

    const { data, error } = await supabase
      .from('orders')
      .update({
        driver_phone: currentUser.phone,
        status: 'on_the_way_to_shop',
      })
      .eq('id', order.id)
      .eq('status', 'ready_for_driver')
      .eq('driver_requested', true)
      .is('driver_phone', null)
      .select()
      .maybeSingle();

    if (error) {
      showMessage(error.message);
      return;
    }

    if (!data) {
      showMessage('Тази поръчка вече е поета от друг шофьор.');
      await refreshAll();
      return;
    }

    showMessage('Поръчката е приета.');
    await refreshAll();
  }

  async function refuseDriverOrder(order: Order) {
    if (!currentUser) return;

    if (clean(order.driver_phone || '') !== clean(currentUser.phone)) {
      return;
    }

    const { error } = await supabase
      .from('orders')
      .update({
        driver_phone: null,
        driver_requested: false,
        status: 'preparing',
      })
      .eq('id', order.id)
      .eq('driver_phone', currentUser.phone);

    if (error) {
      showMessage(error.message);
      return;
    }

    showMessage('Отказа поръчката.');
    await refreshAll();
  }

  async function pickedUpOrder(order: Order) {
    if (!currentUser) return;

    const { error } = await supabase
      .from('orders')
      .update({
        status: 'on_the_way',
      })
      .eq('id', order.id)
      .eq('driver_phone', currentUser.phone)
      .eq('status', 'on_the_way_to_shop');

    if (error) {
      showMessage(error.message);
      return;
    }

    showMessage('Поръчката е взета от магазина.');
    await refreshAll();
  }

  async function deliveredOrder(order: Order) {
    if (!currentUser) return;

    const { error } = await supabase
      .from('orders')
      .update({
        status: 'delivered',
      })
      .eq('id', order.id)
      .eq('driver_phone', currentUser.phone)
      .eq('status', 'on_the_way');

    if (error) {
      showMessage(error.message);
      return;
    }

    showMessage('Поръчката е доставена.');
    await refreshAll();
  }

  /* =========================
     PRODUCT MANAGEMENT
  ========================= */

  function resetProductForm() {
    setProductName('');
    setProductDescription('');
    setProductPrice('');
    setProductCategory('Други');
    setProductImage(null);
    setEditingProductId(null);
  }

  function editProduct(product: Product) {
    setEditingProductId(product.id);
    setProductName(product.name);
    setProductDescription(product.description || '');
    setProductPrice(String(product.price));
    setProductCategory(product.category || 'Други');
    setProductImage(null);

    window.scrollTo({
      top: document.body.scrollHeight,
      behavior: 'smooth',
    });
  }

  async function addProductWithImage(shopId: string) {
    if (!productName.trim() || !productPrice.trim()) {
      showMessage('Въведи име и цена.');
      return;
    }

    setLoading(true);

    let imageUrl: string | undefined;

    if (productImage) {
      const extension =
        productImage.name.split('.').pop()?.toLowerCase() || 'jpg';

      const fileName = `${shopId}/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, productImage, {
          upsert: false,
        });

      if (uploadError) {
        setLoading(false);
        showMessage(`Снимката не бе качена: ${uploadError.message}`);
        return;
      }

      const { data } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      imageUrl = data.publicUrl;
    }

    let error;

    if (editingProductId) {
      const updateData: Record<string, unknown> = {
        name: productName.trim(),
        description: productDescription.trim(),
        price: Number(productPrice),
        category: productCategory,
      };

      if (imageUrl) {
        updateData.image_url = imageUrl;
      }

      const result = await supabase
        .from('products')
        .update(updateData)
        .eq('id', editingProductId)
        .eq('shop_id', shopId);

      error = result.error;
    } else {
      const result = await supabase.from('products').insert({
        shop_id: shopId,
        name: productName.trim(),
        description: productDescription.trim(),
        price: Number(productPrice),
        category: productCategory,
        image_url: imageUrl || null,
        active: true,
      });

      error = result.error;
    }

    setLoading(false);

    if (error) {
      showMessage(error.message);
      return;
    }

    resetProductForm();

    showMessage(
      editingProductId
        ? 'Продуктът е променен.'
        : 'Продуктът е добавен.'
    );

    await refreshAll();
  }

  async function toggleProductActive(product: Product) {
    const { error } = await supabase
      .from('products')
      .update({
        active: product.active === false,
      })
      .eq('id', product.id);

    if (error) {
      showMessage(error.message);
      return;
    }

    await refreshAll();
  }

  async function deleteProduct(product: Product) {
    if (!confirm(`Да изтрия ли "${product.name}"?`)) return;

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', product.id);

    if (error) {
      showMessage(error.message);
      return;
    }

    showMessage('Продуктът е изтрит.');
    await refreshAll();
  }

  /* =========================
     SHOP MANAGEMENT
  ========================= */

  function loadShopIntoForm(shop: Shop) {
    setEditingShopId(shop.id);
    setShopName(shop.name || '');
    setShopCity(shop.city || '');
    setShopAddress(shop.address || '');
    setShopPhone(shop.phone || '');
    setShopDeliveryFee(String(shop.delivery_fee ?? 4.99));
    setShopVip(shop.vip_active !== false);

    const owner = profiles.find(
      (p) => p.shop_id === shop.id && p.role === 'shop_owner'
    );

    setShopOwnerPhone(owner?.phone || shop.phone || '');

    const driver = profiles.find(
      (p) => p.shop_id === shop.id && p.role === 'driver'
    );

    setShopDriverPhone(driver?.phone || '');
  }

  function resetShopForm() {
    setEditingShopId(null);
    setShopName('');
    setShopCity('');
    setShopAddress('');
    setShopPhone('');
    setShopDeliveryFee('4.99');
    setShopVip(true);
    setShopOwnerPhone('');
    setShopDriverPhone('');
  }

  async function saveShop(shopId?: string) {
    if (
      !shopName.trim() ||
      !shopAddress.trim() ||
      !shopPhone.trim()
    ) {
      showMessage('Име, адрес и телефон са задължителни.');
      return;
    }

    setLoading(true);

    const targetId = shopId || editingShopId;

    if (targetId) {
      const oldOwnerProfiles = profiles.filter(
        (p) =>
          p.shop_id === targetId &&
          p.role === 'shop_owner'
      );

      const { error: shopError } = await supabase
        .from('shops')
        .update({
          name: shopName.trim(),
          slug: slugify(shopName),
          city: shopCity.trim(),
          address: shopAddress.trim(),
          phone: shopPhone.trim(),
          delivery_fee: Number(shopDeliveryFee || 0),
          vip_active: shopVip,
        })
        .eq('id', targetId);

      if (shopError) {
        setLoading(false);
        showMessage(shopError.message);
        return;
      }

      if (isAdmin) {
        await supabase
          .from('shop_profiles')
          .delete()
          .eq('shop_id', targetId)
          .eq('role', 'shop_owner');

        if (shopOwnerPhone.trim()) {
          const { error: ownerError } = await supabase
            .from('shop_profiles')
            .insert({
              shop_id: targetId,
              phone: shopOwnerPhone.trim(),
              role: 'shop_owner',
            });

          if (ownerError) {
            setLoading(false);
            showMessage(
              `Магазинът е запазен, но собственикът не бе добавен: ${ownerError.message}`
            );
            await refreshAll();
            return;
          }
        }
      } else if (oldOwnerProfiles.length > 0) {
        const oldOwnerPhone = oldOwnerProfiles[0].phone;

        if (clean(oldOwnerPhone) !== clean(shopPhone)) {
          await supabase
            .from('shop_profiles')
            .delete()
            .eq('shop_id', targetId)
            .eq('role', 'shop_owner');

          await supabase.from('shop_profiles').insert({
            shop_id: targetId,
            phone: shopPhone.trim(),
            role: 'shop_owner',
          });
        }
      }

      setLoading(false);
      showMessage('Магазинът е променен.');
    } else {
      const { data: newShop, error: shopError } = await supabase
        .from('shops')
        .insert({
          name: shopName.trim(),
          slug: slugify(shopName),
          city: shopCity.trim(),
          address: shopAddress.trim(),
          phone: shopPhone.trim(),
          delivery_fee: Number(shopDeliveryFee || 0),
          vip_active: shopVip,
        })
        .select()
        .single();

      if (shopError || !newShop) {
        setLoading(false);
        showMessage(shopError?.message || 'Магазинът не бе създаден.');
        return;
      }

      const { error: ownerError } = await supabase
        .from('shop_profiles')
        .insert({
          shop_id: newShop.id,
          phone: shopOwnerPhone.trim() || shopPhone.trim(),
          role: 'shop_owner',
        });

      if (ownerError) {
        await supabase.from('shops').delete().eq('id', newShop.id);

        setLoading(false);
        showMessage(`Собственикът не бе добавен: ${ownerError.message}`);
        return;
      }

      if (shopDriverPhone.trim()) {
        await supabase.from('shop_profiles').insert({
          shop_id: newShop.id,
          phone: shopDriverPhone.trim(),
          role: 'driver',
        });
      }

      setLoading(false);
      resetShopForm();

      showMessage('Магазинът е създаден.');
    }

    await refreshAll();
  }

  async function toggleShopActive(shop: Shop) {
    const { error } = await supabase
      .from('shops')
      .update({
        vip_active: shop.vip_active === false,
      })
      .eq('id', shop.id);

    if (error) {
      showMessage(error.message);
      return;
    }

    showMessage(
      shop.vip_active === false
        ? 'Магазинът е активиран.'
        : 'Магазинът е деактивиран.'
    );

    await refreshAll();
  }

  async function deleteShop(shop: Shop) {
    if (
      !confirm(
        `Да изтрия ли магазин "${shop.name}"?`
      )
    ) {
      return;
    }

    const { error } = await supabase
      .from('shops')
      .delete()
      .eq('id', shop.id);

    if (error) {
      showMessage(error.message);
      return;
    }

    if (selectedShop?.id === shop.id) {
      setSelectedShop(null);
    }

    showMessage('Магазинът е изтрит.');
    await refreshAll();
  }

  /* =========================
     DRIVER MANAGEMENT
  ========================= */

  async function addDriver(shopId: string) {
    if (!shopDriverPhone.trim()) {
      showMessage('Въведи телефон на шофьора.');
      return;
    }

    const phone = shopDriverPhone.trim();

    const { data: existing } = await supabase
      .from('shop_profiles')
      .select('id')
      .eq('shop_id', shopId)
      .eq('phone', phone)
      .eq('role', 'driver')
      .maybeSingle();

    if (existing) {
      showMessage('Този шофьор вече е добавен.');
      return;
    }

    const { error } = await supabase
      .from('shop_profiles')
      .insert({
        shop_id: shopId,
        phone,
        role: 'driver',
      });

    if (error) {
      showMessage(error.message);
      return;
    }

    setShopDriverPhone('');
    showMessage('Шофьорът е добавен.');
    await refreshAll();
  }

  async function removeDriver(shopId: string, phone: string) {
    if (!confirm(`Да премахна ли шофьор ${phone}?`)) return;

    const { error } = await supabase
      .from('shop_profiles')
      .delete()
      .eq('shop_id', shopId)
      .eq('phone', phone)
      .eq('role', 'driver');

    if (error) {
      showMessage(error.message);
      return;
    }

    showMessage('Шофьорът е премахнат.');
    await refreshAll();
  }

  async function removeOwner(shopId: string, phone: string) {
    if (!isAdmin) return;

    if (!confirm(`Да премахна ли собственика ${phone}?`)) return;

    const { error } = await supabase
      .from('shop_profiles')
      .delete()
      .eq('shop_id', shopId)
      .eq('phone', phone)
      .eq('role', 'shop_owner');

    if (error) {
      showMessage(error.message);
      return;
    }

    showMessage('Собственикът е премахнат.');
    await refreshAll();
  }

  /* =========================
     GEOCODING
  ========================= */

  async function geocodeAddress(address: string) {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
          address
        )}`,
        {
          headers: {
            Accept: 'application/json',
          },
        }
      );

      const data = await response.json();

      if (!data?.[0]) return null;

      return {
        lat: Number(data[0].lat),
        lon: Number(data[0].lon),
      };
    } catch {
      return null;
    }
  }

  async function sortShopsByDistance() {
    if (!sortByDistance) return;

    if (!navigator.geolocation) {
      showMessage('Този телефон не поддържа геолокация.');
      return;
    }

    setLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const current = {
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        };

        const result: {
          shop: Shop;
          distance: number;
        }[] = [];

        for (const shop of shops) {
          const location = await geocodeAddress(
            `${shop.address || ''}, ${shop.city || ''}`
          );

          if (location) {
            result.push({
              shop,
              distance: distanceKm(current, location),
            });
          }
        }

        result.sort((a, b) => a.distance - b.distance);

        if (result.length > 0) {
          setShops(result.map((x) => x.shop));
        }

        setLoading(false);
      },
      () => {
        setLoading(false);
        showMessage('Не успях да получа местоположението.');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    );
  }

  useEffect(() => {
    if (sortByDistance) {
      sortShopsByDistance();
    }
  }, [sortByDistance]);

  /* =========================
     RENDER AUTH
  ========================= */

  if (!currentUser) {
    return (
      <main className="page">
        <style jsx>{`
          * {
            box-sizing: border-box;
          }

          .page {
            min-height: 100vh;
            background: #f4f6f8;
            padding: 20px;
            font-family: Arial, sans-serif;
          }

          .auth {
            max-width: 430px;
            margin: 40px auto;
            background: white;
            border-radius: 22px;
            padding: 24px;
            box-shadow: 0 8px 35px rgba(0, 0, 0, 0.08);
          }

          h1 {
            margin: 0 0 8px;
            text-align: center;
          }

          .subtitle {
            text-align: center;
            color: #666;
            margin-bottom: 25px;
          }

          input,
          select {
            width: 100%;
            padding: 14px;
            border: 1px solid #ddd;
            border-radius: 12px;
            margin-bottom: 10px;
            font-size: 16px;
          }

          button {
            width: 100%;
            border: 0;
            border-radius: 12px;
            padding: 14px;
            font-size: 16px;
            font-weight: 700;
            cursor: pointer;
            background: #111;
            color: white;
            margin-top: 6px;
          }

          .secondary {
            background: #eee;
            color: #111;
          }

          .testCode {
            margin-top: 15px;
            background: #fff3cd;
            padding: 15px;
            border-radius: 12px;
            text-align: center;
            font-weight: bold;
          }

          .message {
            position: fixed;
            top: 15px;
            left: 15px;
            right: 15px;
            z-index: 100;
            background: #111;
            color: white;
            padding: 14px;
            border-radius: 12px;
            text-align: center;
          }
        `}</style>

        {message && <div className="message">{message}</div>}

        <section className="auth">
          <h1>VoziMe</h1>
          <div className="subtitle">Магазини и доставки</div>

          {verificationMode ? (
            <>
              <h2>Потвърждение</h2>

              <p>
                Изпратихме 6-цифрен код на:
                <br />
                <b>{registerEmail}</b>
              </p>

              <input
                placeholder="6-цифрен код"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value)}
                inputMode="numeric"
              />

              {codeForTest && (
                <div className="testCode">
                  ТЕСТОВ КОД: {codeForTest}
                </div>
              )}

              <button
                onClick={verifyRegistration}
                disabled={loading}
              >
                {loading ? 'Проверка...' : 'Потвърди'}
              </button>

              <button
                className="secondary"
                onClick={() => {
                  setVerificationMode(false);
                  setVerifyCode('');
                }}
              >
                Назад
              </button>
            </>
          ) : authMode === 'login' ? (
            <>
              <h2>Вход</h2>

              <input
                placeholder="Телефон"
                value={loginPhone}
                onChange={(e) => setLoginPhone(e.target.value)}
                inputMode="tel"
              />

              <button
                onClick={login}
                disabled={loading}
              >
                {loading ? 'Влизане...' : 'Влез'}
              </button>

              <button
                className="secondary"
                onClick={() => setAuthMode('register')}
              >
                Създай профил
              </button>
            </>
          ) : (
            <>
              <h2>Регистрация</h2>

              <input
                placeholder="Име"
                value={registerFirstName}
                onChange={(e) =>
                  setRegisterFirstName(e.target.value)
                }
              />

              <input
                placeholder="Фамилия"
                value={registerLastName}
                onChange={(e) =>
                  setRegisterLastName(e.target.value)
                }
              />

              <input
                placeholder="Телефон"
                value={registerPhone}
                onChange={(e) =>
                  setRegisterPhone(e.target.value)
                }
                inputMode="tel"
              />

              <input
                placeholder="Имейл"
                value={registerEmail}
                onChange={(e) =>
                  setRegisterEmail(e.target.value)
                }
                type="email"
              />

              <button
                onClick={startRegistration}
                disabled={loading}
              >
                {loading ? 'Изпращане...' : 'Регистрирай се'}
              </button>

              <button
                className="secondary"
                onClick={() => setAuthMode('login')}
              >
                Вече имам профил
              </button>
            </>
          )}
        </section>
      </main>
    );
  }

  /* =========================
     CUSTOMER ORDERS
  ========================= */

  const customerOrders = orders
    .filter(
      (o) =>
        clean(o.customer_phone) === clean(currentUser.phone)
    )
    .sort((a, b) =>
      String(b.created_at || '').localeCompare(
        String(a.created_at || '')
      )
    );

  /* =========================
     OWNER ORDERS
  ========================= */

  const ownerOrders = orders
    .filter((o) => ownerShopIds.includes(o.shop_id))
    .sort((a, b) =>
      String(b.created_at || '').localeCompare(
        String(a.created_at || '')
      )
    );

  /* =========================
     DRIVER ORDERS
  ========================= */

  const driverOrders = orders
    .filter((o) => {
      if (!driverShopIds.includes(o.shop_id)) return false;

      const assignedToMe =
        clean(o.driver_phone || '') ===
        clean(currentUser.phone);

      const waiting =
        o.driver_requested === true &&
        o.status === 'ready_for_driver' &&
        !o.driver_phone;

      return assignedToMe || waiting;
    })
    .sort((a, b) =>
      String(b.created_at || '').localeCompare(
        String(a.created_at || '')
      )
    );

  /* =========================
     OWNER PRODUCTS
  ========================= */

  const ownerProducts = products.filter((p) =>
    ownerShopIds.includes(p.shop_id)
  );

  /* =========================
     ADMIN PRODUCTS
  ========================= */

  const adminProducts = products;

  return (
    <main className="page">
      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;
          background: #f4f6f8;
          color: #111;
          font-family: Arial, sans-serif;
          padding-bottom: 100px;
        }

        .header {
          position: sticky;
          top: 0;
          z-index: 20;
          background: white;
          border-bottom: 1px solid #ddd;
          padding: 12px;
        }

        .headerTop {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          max-width: 1100px;
          margin: auto;
        }

        .logo {
          font-size: 22px;
          font-weight: 900;
        }

        .user {
          font-size: 13px;
          color: #666;
          text-align: right;
        }

        .logout {
          width: auto;
          padding: 8px 12px;
          margin: 0;
          background: #eee;
          color: #111;
        }

        .nav {
          max-width: 1100px;
          margin: 10px auto 0;
          display: flex;
          gap: 7px;
          overflow-x: auto;
        }

        .nav button {
          width: auto;
          white-space: nowrap;
          padding: 10px 13px;
          margin: 0;
          background: #eee;
          color: #111;
        }

        .nav button.active {
          background: #111;
          color: white;
        }

        .container {
          max-width: 1100px;
          margin: 18px auto;
          padding: 0 12px;
        }

        .message {
          position: fixed;
          top: 80px;
          left: 15px;
          right: 15px;
          z-index: 100;
          background: #111;
          color: white;
          padding: 14px;
          border-radius: 12px;
          text-align: center;
        }

        .card {
          background: white;
          border-radius: 18px;
          padding: 16px;
          margin-bottom: 14px;
          box-shadow: 0 4px 18px rgba(0, 0, 0, 0.05);
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(
            auto-fit,
            minmax(250px, 1fr)
          );
          gap: 14px;
        }

        .shopCard {
          background: white;
          border-radius: 18px;
          padding: 16px;
          box-shadow: 0 4px 18px rgba(0, 0, 0, 0.06);
          cursor: pointer;
        }

        .shopCard h3 {
          margin-top: 0;
        }

        .product {
          background: white;
          border-radius: 18px;
          overflow: hidden;
          box-shadow: 0 4px 18px rgba(0, 0, 0, 0.06);
        }

        .productImage {
          width: 100%;
          height: 190px;
          object-fit: cover;
          background: #eee;
        }

        .productBody {
          padding: 14px;
        }

        .price {
          font-size: 20px;
          font-weight: 900;
          margin: 8px 0;
        }

        .button {
          width: 100%;
          background: #111;
          color: white;
          border: 0;
          border-radius: 11px;
          padding: 12px;
          font-weight: 700;
          cursor: pointer;
          margin-top: 6px;
        }

        .green {
          background: #16833a;
        }

        .red {
          background: #c62828;
        }

        .orange {
          background: #e67e22;
        }

        .gray {
          background: #eee;
          color: #111;
        }

        .blue {
          background: #1264a3;
        }

        .small {
          width: auto;
          display: inline-block;
          padding: 9px 12px;
          margin-right: 6px;
        }

        input,
        select,
        textarea {
          width: 100%;
          padding: 13px;
          border: 1px solid #ddd;
          border-radius: 11px;
          margin-bottom: 9px;
          font-size: 16px;
          font-family: inherit;
        }

        textarea {
          min-height: 90px;
          resize: vertical;
        }

        .formGrid {
          display: grid;
          grid-template-columns: repeat(
            auto-fit,
            minmax(200px, 1fr)
          );
          gap: 10px;
        }

        .categories {
          display: flex;
          overflow-x: auto;
          gap: 7px;
          margin: 12px 0;
        }

        .categories button {
          width: auto;
          white-space: nowrap;
          background: #eee;
          color: #111;
          padding: 9px 12px;
          margin: 0;
        }

        .categories button.active {
          background: #111;
          color: white;
        }

        .order {
          border: 1px solid #eee;
          border-radius: 15px;
          padding: 14px;
          margin-top: 12px;
        }

        .orderHeader {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
        }

        .status {
          display: inline-block;
          padding: 7px 10px;
          border-radius: 20px;
          background: #eee;
          font-weight: 700;
          font-size: 13px;
        }

        .items {
          margin: 10px 0;
          padding-left: 20px;
        }

        .cart {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: white;
          border-top: 1px solid #ddd;
          padding: 10px;
          z-index: 30;
          box-shadow: 0 -5px 20px rgba(0, 0, 0, 0.08);
        }

        .cartInner {
          max-width: 1100px;
          margin: auto;
        }

        .cartRow {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 8px;
        }

        .qty {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .qty button {
          width: 34px;
          height: 34px;
          padding: 0;
          margin: 0;
          border-radius: 8px;
        }

        .call {
          display: inline-block;
          text-decoration: none;
          background: #16833a;
          color: white;
          padding: 10px 13px;
          border-radius: 10px;
          font-weight: bold;
          margin-top: 7px;
        }

        .map {
          display: inline-block;
          text-decoration: none;
          background: #1264a3;
          color: white;
          padding: 10px 13px;
          border-radius: 10px;
          font-weight: bold;
          margin-top: 7px;
        }

        .dangerText {
          color: #c62828;
          font-weight: bold;
        }

        .successText {
          color: #16833a;
          font-weight: bold;
        }

        @media (max-width: 600px) {
          .headerTop {
            align-items: flex-start;
          }

          .user {
            max-width: 130px;
          }

          .productImage {
            height: 160px;
          }
        }
      `}</style>

      {message && <div className="message">{message}</div>}

      <header className="header">
        <div className="headerTop">
          <div>
            <div className="logo">🚗 VoziMe</div>
            <div className="user">
              {currentUser.first_name} {currentUser.last_name}
              <br />
              {currentUser.phone}
            </div>
          </div>

          <button
            className="logout"
            onClick={logout}
          >
            Изход
          </button>
        </div>

        <nav className="nav">
          <button
            className={activeTab === 'market' ? 'active' : ''}
            onClick={() => setActiveTab('market')}
          >
            🛒 Магазини
          </button>

          <button
            className={activeTab === 'my_orders' ? 'active' : ''}
            onClick={() => setActiveTab('my_orders')}
          >
            📦 Моите поръчки
          </button>

          {isShopOwner && (
            <button
              className={activeTab === 'my_shop' ? 'active' : ''}
              onClick={() => setActiveTab('my_shop')}
            >
              🏪 Моят магазин
            </button>
          )}

          {isDriver && (
            <button
              className={activeTab === 'driver' ? 'active' : ''}
              onClick={() => setActiveTab('driver')}
            >
              🚗 Шофьор
            </button>
          )}

          {isAdmin && (
            <button
              className={activeTab === 'admin' ? 'active' : ''}
              onClick={() => setActiveTab('admin')}
            >
              ⚙️ Админ
            </button>
          )}
        </nav>
      </header>

      <div className="container">
        {/* =========================
            MARKET
        ========================= */}

        {activeTab === 'market' && (
          <>
            {!selectedShop ? (
              <>
                <div className="card">
                  <h2>Магазини</h2>

                  <button
                    className="button gray"
                    onClick={() =>
                      setSortByDistance((v) => !v)
                    }
                  >
                    {sortByDistance
                      ? '📍 По разстояние: включено'
                      : '📍 Сортирай по разстояние'}
                  </button>
                </div>

                <div className="grid">
                  {shops.map((shop) => (
                    <div
                      className="shopCard"
                      key={shop.id}
                      onClick={() => openShop(shop)}
                    >
                      <h3>{shop.name}</h3>

                      <p>
                        📍 {shop.address}
                        {shop.city
                          ? `, ${shop.city}`
                          : ''}
                      </p>

                      <p>
                        🚚 Доставка:{' '}
                        {money(
                          Number(shop.delivery_fee || 0)
                        )}
                      </p>

                      {shop.phone && (
                        <a
                          className="call"
                          href={`tel:${shop.phone}`}
                          onClick={(e) =>
                            e.stopPropagation()
                          }
                        >
                          📞 Обади се
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="card">
                  <button
                    className="button gray"
                    onClick={() => setSelectedShop(null)}
                  >
                    ← Назад към магазините
                  </button>

                  <h2>{selectedShop.name}</h2>

                  <p>
                    📍 {selectedShop.address}
                    {selectedShop.city
                      ? `, ${selectedShop.city}`
                      : ''}
                  </p>

                  <p>
                    🚚 Доставка:{' '}
                    {money(
                      Number(
                        selectedShop.delivery_fee || 0
                      )
                    )}
                  </p>

                  <input
                    placeholder="🔎 Търси продукт..."
                    value={search}
                    onChange={(e) =>
                      setSearch(e.target.value)
                    }
                  />

                  <div className="categories">
                    {CATEGORIES.map((category) => (
                      <button
                        key={category}
                        className={
                          selectedCategory === category
                            ? 'active'
                            : ''
                        }
                        onClick={() =>
                          setSelectedCategory(category)
                        }
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid">
                  {marketProducts.length === 0 ? (
                    <div className="card">
                      Няма намерени продукти.
                    </div>
                  ) : (
                    marketProducts.map((product) => (
                      <div
                        className="product"
                        key={product.id}
                      >
                        {product.image_url ? (
                          <img
                            className="productImage"
                            src={product.image_url}
                            alt={product.name}
                          />
                        ) : (
                          <div className="productImage" />
                        )}

                        <div className="productBody">
                          <h3>{product.name}</h3>

                          {product.description && (
                            <p>{product.description}</p>
                          )}

                          <div className="price">
                            {money(
                              Number(product.price)
                            )}
                          </div>

                          <button
                            className="button"
                            onClick={() =>
                              addToCart(product)
                            }
                          >
                            Добави в количката
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </>
        )}

        {/* =========================
            CUSTOMER ORDERS
        ========================= */}

        {activeTab === 'my_orders' && (
          <>
            <div className="card">
              <h2>📦 Моите поръчки</h2>
            </div>

            {customerOrders.length === 0 ? (
              <div className="card">
                Все още нямаш поръчки.
              </div>
            ) : (
              customerOrders.map((order) => {
                const shop = shops.find(
                  (s) => s.id === order.shop_id
                );

                const items = parseItems(order.items);

                return (
                  <div
                    className="card"
                    key={order.id}
                  >
                    <div className="orderHeader">
                      <div>
                        <b>
                          {shop?.name ||
                            'Магазин'}
                        </b>
                        <br />
                        {order.created_at
                          ? new Date(
                              order.created_at
                            ).toLocaleString('bg-BG')
                          : ''}
                      </div>

                      <span className="status">
                        {statusLabel(order.status)}
                      </span>
                    </div>

                    <ul className="items">
                      {items.map((item, index) => (
                        <li key={index}>
                          {item.name} × {item.qty} —{' '}
                          {money(
                            Number(item.price) *
                              item.qty
                          )}
                        </li>
                      ))}
                    </ul>

                    <p>
                      <b>Адрес:</b>{' '}
                      {order.customer_address}
                    </p>

                    <h3>
                      Общо: {money(order.total)}
                    </h3>
                  </div>
                );
              })
            )}
          </>
        )}

        {/* =========================
            OWNER
        ========================= */}

        {activeTab === 'my_shop' && isShopOwner && (
          <>
            <div className="card">
              <h2>🏪 Управление на магазина</h2>

              {myOwnerShops.map((shop) => (
                <div
                  className="order"
                  key={shop.id}
                >
                  <h3>{shop.name}</h3>

                  <p>{shop.address}</p>

                  <button
                    className="button gray"
                    onClick={() =>
                      loadShopIntoForm(shop)
                    }
                  >
                    ✏️ Редактирай магазина
                  </button>
                </div>
              ))}
            </div>

            {editingShopId && (
              <div className="card">
                <h2>Редактиране на магазин</h2>

                <input
                  placeholder="Име на магазин"
                  value={shopName}
                  onChange={(e) =>
                    setShopName(e.target.value)
                  }
                />

                <input
                  placeholder="Град"
                  value={shopCity}
                  onChange={(e) =>
                    setShopCity(e.target.value)
                  }
                />

                <input
                  placeholder="Адрес"
                  value={shopAddress}
                  onChange={(e) =>
                    setShopAddress(e.target.value)
                  }
                />

                <input
                  placeholder="Телефон"
                  value={shopPhone}
                  onChange={(e) =>
                    setShopPhone(e.target.value)
                  }
                />

                <input
                  placeholder="Такса доставка"
                  value={shopDeliveryFee}
                  onChange={(e) =>
                    setShopDeliveryFee(e.target.value)
                  }
                  inputMode="decimal"
                />

                <label>
                  <input
                    type="checkbox"
                    checked={shopVip}
                    onChange={(e) =>
                      setShopVip(e.target.checked)
                    }
                    style={{
                      width: 'auto',
                      marginRight: 8,
                    }}
                  />
                  Магазинът е активен
                </label>

                <button
                  className="button green"
                  onClick={() =>
                    saveShop(editingShopId)
                  }
                >
                  💾 Запази
                </button>

                <button
                  className="button gray"
                  onClick={resetShopForm}
                >
                  Отказ
                </button>
              </div>
            )}

            {myOwnerShops.map((shop) => {
              const shopDrivers = profiles.filter(
                (p) =>
                  p.shop_id === shop.id &&
                  p.role === 'driver'
              );

              return (
                <div
                  className="card"
                  key={`drivers-${shop.id}`}
                >
                  <h2>🚗 Шофьори</h2>

                  {shopDrivers.length === 0 && (
                    <p>Няма добавени шофьори.</p>
                  )}

                  {shopDrivers.map((driver) => (
                    <div
                      className="order"
                      key={`${driver.shop_id}-${driver.phone}`}
                    >
                      <b>{driver.phone}</b>

                      <br />

                      <a
                        className="call"
                        href={`tel:${driver.phone}`}
                      >
                        📞 Обади се
                      </a>

                      <button
                        className="button red"
                        onClick={() =>
                          removeDriver(
                            shop.id,
                            driver.phone
                          )
                        }
                      >
                        Премахни шофьора
                      </button>
                    </div>
                  ))}

                  <h3>Добави шофьор</h3>

                  <input
                    placeholder="Телефон на шофьора"
                    value={shopDriverPhone}
                    onChange={(e) =>
                      setShopDriverPhone(
                        e.target.value
                      )
                    }
                    inputMode="tel"
                  />

                  <button
                    className="button green"
                    onClick={() =>
                      addDriver(shop.id)
                    }
                  >
                    + Добави шофьор
                  </button>
                </div>
              );
            })}

            <div className="card">
              <h2>📦 Поръчки към магазина</h2>

              {ownerOrders.length === 0 ? (
                <p>Няма поръчки.</p>
              ) : (
                ownerOrders.map((order) => {
                  const shop = shops.find(
                    (s) => s.id === order.shop_id
                  );

                  const items = parseItems(
                    order.items
                  );

                  return (
                    <div
                      className="order"
                      key={order.id}
                    >
                      <div className="orderHeader">
                        <b>
                          {shop?.name ||
                            'Магазин'}
                        </b>

                        <span className="status">
                          {statusLabel(
                            order.status
                          )}
                        </span>
                      </div>

                      <p>
                        <b>Клиент:</b>{' '}
                        {order.customer_name ||
                          order.customer_phone}
                      </p>

                      <p>
                        📞 {order.customer_phone}
                      </p>

                      <p>
                        📍{' '}
                        {order.customer_address}
                      </p>

                      <ul className="items">
                        {items.map(
                          (item, index) => (
                            <li key={index}>
                              {item.name} ×{' '}
                              {item.qty}{' '}
                              —{' '}
                              {money(
                                Number(
                                  item.price
                                ) *
                                  item.qty
                              )}
                            </li>
                          )
                        )}
                      </ul>

                      <h3>
                        Общо:{' '}
                        {money(order.total)}
                      </h3>

                      {order.status === 'new' && (
                        <>
                          <button
                            className="button green"
                            onClick={() =>
                              acceptShopOrder(
                                order.id
                              )
                            }
                          >
                            ✓ Приеми поръчката
                          </button>

                          <button
                            className="button red"
                            onClick={() =>
                              rejectShopOrder(
                                order.id
                              )
                            }
                          >
                            ✕ Откажи поръчката
                          </button>
                        </>
                      )}

                      {order.status === 'accepted' && (
                        <button
                          className="button orange"
                          onClick={() =>
                            setPreparing(
                              order.id
                            )
                          }
                        >
                          👨‍🍳 Започни подготовка
                        </button>
                      )}

                      {[
                        'accepted',
                        'preparing',
                      ].includes(
                        order.status
                      ) &&
                        !order.driver_requested && (
                          <button
                            className="button blue"
                            onClick={() =>
                              requestDriver(
                                order.id
                              )
                            }
                          >
                            🚗 Извикай шофьор
                          </button>
                        )}

                      {order.driver_phone && (
                        <a
                          className="call"
                          href={`tel:${order.driver_phone}`}
                        >
                          📞 Обади се на шофьора
                        </a>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="card">
              <h2>➕ Добави продукт</h2>

              <input
                placeholder="Име на продукт"
                value={productName}
                onChange={(e) =>
                  setProductName(e.target.value)
                }
              />

              <textarea
                placeholder="Описание"
                value={productDescription}
                onChange={(e) =>
                  setProductDescription(
                    e.target.value
                  )
                }
              />

              <input
                placeholder="Цена"
                value={productPrice}
                onChange={(e) =>
                  setProductPrice(e.target.value)
                }
                inputMode="decimal"
              />

              <select
                value={productCategory}
                onChange={(e) =>
                  setProductCategory(
                    e.target.value
                  )
                }
              >
                {CATEGORIES.filter(
                  (c) => c !== 'Всички'
                ).map((category) => (
                  <option
                    key={category}
                    value={category}
                  >
                    {category}
                  </option>
                ))}
              </select>

              <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setProductImage(
                    e.target.files?.[0] ||
                      null
                  )
                }
              />

              {myOwnerShops.map((shop) => (
                <button
                  key={shop.id}
                  className="button green"
                  onClick={() =>
                    addProductWithImage(
                      shop.id
                    )
                  }
                >
                  {editingProductId
                    ? '💾 Запази промените'
                    : '➕ Добави продукт'}
                </button>
              ))}

              {editingProductId && (
                <button
                  className="button gray"
                  onClick={resetProductForm}
                >
                  Откажи редактирането
                </button>
              )}
            </div>

            <div className="card">
              <h2>🛍️ Моите продукти</h2>

              {ownerProducts.map((product) => (
                <div
                  className="order"
                  key={product.id}
                >
                  <div className="orderHeader">
                    <div>
                      <b>{product.name}</b>
                      <br />
                      {money(
                        Number(product.price)
                      )}
                    </div>

                    <span className="status">
                      {product.active === false
                        ? 'Скрит'
                        : 'Активен'}
                    </span>
                  </div>

                  <button
                    className="button gray"
                    onClick={() =>
                      editProduct(product)
                    }
                  >
                    ✏️ Редактирай
                  </button>

                  <button
                    className="button orange"
                    onClick={() =>
                      toggleProductActive(
                        product
                      )
                    }
                  >
                    {product.active === false
                      ? 'Покажи'
                      : 'Скрий'}
                  </button>

                  <button
                    className="button red"
                    onClick={() =>
                      deleteProduct(product)
                    }
                  >
                    🗑️ Изтрий
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* =========================
            DRIVER
        ========================= */}

        {activeTab === 'driver' && isDriver && (
          <>
            <div className="card">
              <h2>🚗 Панел на шофьора</h2>
              <p>
                Тук виждаш поръчките за магазините,
                към които си назначен.
              </p>
            </div>

            {driverOrders.length === 0 ? (
              <div className="card">
                Няма нови поръчки за теб.
              </div>
            ) : (
              driverOrders.map((order) => {
                const shop = shops.find(
                  (s) => s.id === order.shop_id
                );

                const assignedToMe =
                  clean(
                    order.driver_phone || ''
                  ) ===
                  clean(currentUser.phone);

                const items = parseItems(
                  order.items
                );

                return (
                  <div
                    className="card"
                    key={order.id}
                  >
                    <div className="orderHeader">
                      <h3>
                        {shop?.name ||
                          'Магазин'}
                      </h3>

                      <span className="status">
                        {statusLabel(
                          order.status
                        )}
                      </span>
                    </div>

                    <ul className="items">
                      {items.map(
                        (item, index) => (
                          <li key={index}>
                            {item.name} ×{' '}
                            {item.qty}
                          </li>
                        )
                      )}
                    </ul>

                    {shop?.address && (
                      <>
                        <p>
                          <b>
                            📍 Магазин:
                          </b>
                          <br />
                          {shop.address}
                          {shop.city
                            ? `, ${shop.city}`
                            : ''}
                        </p>

                        <a
                          className="map"
                          href={mapsUrl(
                            `${shop.address || ''}, ${
                              shop.city || ''
                            }`
                          )}
                          target="_blank"
                          rel="noreferrer"
                        >
                          🗺️ Навигация към магазина
                        </a>
                      </>
                    )}

                    <p>
                      <b>
                        👤 Клиент:
                      </b>{' '}
                      {order.customer_name ||
                        order.customer_phone}
                    </p>

                    <p>
                      📍{' '}
                      {order.customer_address}
                    </p>

                    <a
                      className="map"
                      href={mapsUrl(
                        order.customer_address ||
                          ''
                      )}
                      target="_blank"
                      rel="noreferrer"
                    >
                      🗺️ Навигация към клиента
                    </a>

                    <br />

                    {order.customer_phone && (
                      <a
                        className="call"
                        href={`tel:${order.customer_phone}`}
                      >
                        📞 Обади се на клиента
                      </a>
                    )}

                    {!assignedToMe &&
                      order.status ===
                        'ready_for_driver' && (
                        <button
                          className="button green"
                          onClick={() =>
                            claimOrder(order)
                          }
                        >
                          ✓ Приеми поръчката
                        </button>
                      )}

                    {assignedToMe &&
                      order.status ===
                        'on_the_way_to_shop' && (
                        <>
                          <button
                            className="button red"
                            onClick={() =>
                              refuseDriverOrder(
                                order
                              )
                            }
                          >
                            ✕ Откажи поръчката
                          </button>

                          <button
                            className="button green"
                            onClick={() =>
                              pickedUpOrder(
                                order
                              )
                            }
                          >
                            📦 Взех поръчката
                          </button>
                        </>
                      )}

                    {assignedToMe &&
                      order.status ===
                        'on_the_way' && (
                        <button
                          className="button green"
                          onClick={() =>
                            deliveredOrder(
                              order
                            )
                          }
                        >
                          ✓ Доставено
                        </button>
                      )}

                    {assignedToMe && (
                      <p className="successText">
                        Ти си шофьорът за тази
                        поръчка.
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </>
        )}

        {/* =========================
            ADMIN
        ========================= */}

        {activeTab === 'admin' && isAdmin && (
          <>
            <div className="card">
              <h2>⚙️ Администрация</h2>
              <p>
                Управление на магазини, собственици,
                шофьори и продукти.
              </p>
            </div>

            <div className="card">
              <h2>
                {editingShopId
                  ? '✏️ Редактиране на магазин'
                  : '➕ Нов магазин'}
              </h2>

              <input
                placeholder="Име на магазин"
                value={shopName}
                onChange={(e) =>
                  setShopName(e.target.value)
                }
              />

              <input
                placeholder="Град"
                value={shopCity}
                onChange={(e) =>
                  setShopCity(e.target.value)
                }
              />

              <input
                placeholder="Адрес"
                value={shopAddress}
                onChange={(e) =>
                  setShopAddress(e.target.value)
                }
              />

              <input
                placeholder="Телефон на магазина"
                value={shopPhone}
                onChange={(e) =>
                  setShopPhone(e.target.value)
                }
                inputMode="tel"
              />

              <input
                placeholder="Такса доставка"
                value={shopDeliveryFee}
                onChange={(e) =>
                  setShopDeliveryFee(
                    e.target.value
                  )
                }
                inputMode="decimal"
              />

              <input
                placeholder="Телефон на собственика"
                value={shopOwnerPhone}
                onChange={(e) =>
                  setShopOwnerPhone(
                    e.target.value
                  )
                }
                inputMode="tel"
              />

              <input
                placeholder="Телефон на шофьора (по желание)"
                value={shopDriverPhone}
                onChange={(e) =>
                  setShopDriverPhone(
                    e.target.value
                  )
                }
                inputMode="tel"
              />

              <label>
                <input
                  type="checkbox"
                  checked={shopVip}
                  onChange={(e) =>
                    setShopVip(e.target.checked)
                  }
                  style={{
                    width: 'auto',
                    marginRight: 8,
                  }}
                />
                Магазинът е активен
              </label>

              <button
                className="button green"
                onClick={() =>
                  saveShop(editingShopId || undefined)
                }
              >
                {editingShopId
                  ? '💾 Запази магазина'
                  : '➕ Създай магазин'}
              </button>

              {editingShopId && (
                <button
                  className="button gray"
                  onClick={resetShopForm}
                >
                  Откажи
                </button>
              )}
            </div>

            <div className="card">
              <h2>🏪 Всички магазини</h2>

              {shops.map((shop) => {
                const owners = profiles.filter(
                  (p) =>
                    p.shop_id === shop.id &&
                    p.role === 'shop_owner'
                );

                const drivers = profiles.filter(
                  (p) =>
                    p.shop_id === shop.id &&
                    p.role === 'driver'
                );

                return (
                  <div
                    className="order"
                    key={shop.id}
                  >
                    <div className="orderHeader">
                      <div>
                        <h3>{shop.name}</h3>

                        <p>
                          {shop.address}
                          {shop.city
                            ? `, ${shop.city}`
                            : ''}
                        </p>

                        <p>
                          📞 {shop.phone}
                        </p>
                      </div>

                      <span className="status">
                        {shop.vip_active === false
                          ? 'Неактивен'
                          : 'Активен'}
                      </span>
                    </div>

                    <h4>👤 Собственици</h4>

                    {owners.length === 0 ? (
                      <p className="dangerText">
                        Няма собственик
                      </p>
                    ) : (
                      owners.map((owner) => (
                        <div
                          key={owner.phone}
                        >
                          {owner.phone}
                          <br />

                          <button
                            className="button red"
                            onClick={() =>
                              removeOwner(
                                shop.id,
                                owner.phone
                              )
                            }
                          >
                            Премахни собственик
                          </button>
                        </div>
                      ))
                    )}

                    <h4>🚗 Шофьори</h4>

                    {drivers.length === 0 ? (
                      <p>Няма шофьори.</p>
                    ) : (
                      drivers.map((driver) => (
                        <div
                          key={driver.phone}
                        >
                          {driver.phone}
                          <br />

                          <a
                            className="call"
                            href={`tel:${driver.phone}`}
                          >
                            📞 Обади се
                          </a>

                          <button
                            className="button red"
                            onClick={() =>
                              removeDriver(
                                shop.id,
                                driver.phone
                              )
                            }
                          >
                            Премахни
                          </button>
                        </div>
                      ))
                    )}

                    <button
                      className="button gray"
                      onClick={() =>
                        loadShopIntoForm(shop)
                      }
                    >
                      ✏️ Редактирай
                    </button>

                    <button
                      className="button orange"
                      onClick={() =>
                        toggleShopActive(shop)
                      }
                    >
                      {shop.vip_active === false
                        ? 'Активирай'
                        : 'Деактивирай'}
                    </button>

                    <button
                      className="button red"
                      onClick={() =>
                        deleteShop(shop)
                      }
                    >
                      🗑️ Изтрий магазин
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="card">
              <h2>📦 Всички поръчки</h2>

              {orders.length === 0 ? (
                <p>Няма поръчки.</p>
              ) : (
                orders.map((order) => {
                  const shop = shops.find(
                    (s) => s.id === order.shop_id
                  );

                  return (
                    <div
                      className="order"
                      key={order.id}
                    >
                      <div className="orderHeader">
                        <b>
                          {shop?.name ||
                            'Магазин'}
                        </b>

                        <span className="status">
                          {statusLabel(
                            order.status
                          )}
                        </span>
                      </div>

                      <p>
                        Клиент:{' '}
                        {order.customer_phone}
                      </p>

                      <p>
                        Шофьор:{' '}
                        {order.driver_phone ||
                          'Няма'}
                      </p>

                      <p>
                        Общо:{' '}
                        {money(order.total)}
                      </p>
                    </div>
                  );
                })
              )}
            </div>

            <div className="card">
              <h2>🛍️ Всички продукти</h2>

              {adminProducts.map((product) => {
                const shop = shops.find(
                  (s) => s.id === product.shop_id
                );

                return (
                  <div
                    className="order"
                    key={product.id}
                  >
                    <b>{product.name}</b>

                    <p>
                      Магазин:{' '}
                      {shop?.name || '—'}
                    </p>

                    <p>
                      Цена:{' '}
                      {money(
                        Number(product.price)
                      )}
                    </p>

                    <button
                      className="button gray"
                      onClick={() =>
                        editProduct(product)
                      }
                    >
                      ✏️ Редактирай
                    </button>

                    <button
                      className="button red"
                      onClick={() =>
                        deleteProduct(product)
                      }
                    >
                      🗑️ Изтрий
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* =========================
          CART
      ========================= */}

      {cart.length > 0 &&
        activeTab === 'market' &&
        selectedShop && (
          <div className="cart">
            <div className="cartInner">
              <div className="cartRow">
                <b>
                  🛒 Количка —{' '}
                  {money(productsTotal)}
                </b>

                <b>
                  Общо: {money(cartTotal)}
                </b>
              </div>

              {cart.map((item) => (
                <div
                  className="cartRow"
                  key={item.id}
                >
                  <span>
                    {item.name}
                    <br />
                    {money(item.price)}
                  </span>

                  <div className="qty">
                    <button
                      className="gray"
                      onClick={() =>
                        decreaseCart(item.id)
                      }
                    >
                      −
                    </button>

                    <b>{item.qty}</b>

                    <button
                      className="gray"
                      onClick={() =>
                        increaseCart(item.id)
                      }
                    >
                      +
                    </button>

                    <button
                      className="red"
                      onClick={() =>
                        removeCart(item.id)
                      }
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}

              <input
                placeholder="📍 Адрес за доставка"
                value={customerAddress}
                onChange={(e) =>
                  setCustomerAddress(
                    e.target.value
                  )
                }
              />

              <button
                className="button green"
                onClick={placeOrder}
                disabled={loading}
              >
                {loading
                  ? 'Изпращане...'
                  : `Изпрати поръчката — ${money(
                      cartTotal
                    )}`}
              </button>
            </div>
          </div>
        )}
    </main>
  );
}