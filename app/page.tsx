'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://ypfbljjrpppkdxdftjcv.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_NZrVv1hI7aTWVdeyZT27-Q_rWp_olMG";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const ADMIN_PHONES = ['+447935463970','447935463970','07935463970'];
const clean = (p:string)=> p.replace(/[^0-9]/g,'').slice(-10);
const isAdminPhone = (phone:string)=>{ if(!phone) return false; const c=phone.replace(/[^0-9+]/g,''); return ADMIN_PHONES.includes(c) || ADMIN_PHONES.includes(clean(c)) || c.includes('7935463970'); };
const PRODUCT_CATS = ['Всички','Месо','Кайма','Колбаси','Млечни','Хляб','Напитки','Консерви','Други'];

export default function ShopsFinal(){
  const [loginForm,setLoginForm]=useState({firstName:'',lastName:'',phone:'',email:''});
  const [loginTab,setLoginTab]=useState<'login'|'register'>('login');
  const [currentUser,setCurrentUser]=useState<any>(null);
  const [tab,setTab]=useState<'market'|'my_orders'|'my_shop'|'driver'|'admin'>('market');
  const [verificationStep,setVerificationStep]=useState<'form'|'verify'>('form');
  const [pendingData,setPendingData]=useState<any>(null);
  const [codeInput,setCodeInput]=useState('');
  const [codeForTest,setCodeForTest]=useState<string|null>(null);
  const [isSendingCode,setIsSendingCode]=useState(false);
  const [toastMsg,setToastMsg]=useState<string|null>(null);
  const showToast=(m:string)=>{ setToastMsg(m); setTimeout(()=>setToastMsg(null),3500); };
  const [shops,setShops]=useState<any[]>([]);
  const [shopProfiles,setShopProfiles]=useState<any[]>([]);
  const [myShopProfile,setMyShopProfile]=useState<any>(null);
  const [myShopProducts,setMyShopProducts]=useState<any[]>([]);
  const [myShopOrders,setMyShopOrders]=useState<any[]>([]);
  const [customerOrders,setCustomerOrders]=useState<any[]>([]);
  const [marketProducts,setMarketProducts]=useState<any[]>([]);
  const [selectedShop,setSelectedShop]=useState<any>(null);
  const [shopName,setShopName]=useState('');
  const [shopAddress,setShopAddress]=useState('');
  const [shopCity,setShopCity]=useState('');
  const [shopDeliveryFee,setShopDeliveryFee]=useState('4.99');
  const [ownerPhone,setOwnerPhone]=useState('');
  const [driverPhone,setDriverPhone]=useState('');
  const [editShopData,setEditShopData]=useState<any>(null);
  const [newProdName,setNewProdName]=useState('');
  const [newProdPrice,setNewProdPrice]=useState('');
  const [newProdDesc,setNewProdDesc]=useState('');
  const [newProdCat,setNewProdCat]=useState('Месо');
  const [newProdActive,setNewProdActive]=useState(true);
  const [newProdFile,setNewProdFile]=useState<File|null>(null);
  const [editingProduct,setEditingProduct]=useState<any>(null);
  const [prodSearch,setProdSearch]=useState('');
  const [prodCatFilter,setProdCatFilter]=useState('Всички');
  const [marketSearch,setMarketSearch]=useState('');
  const [marketCat,setMarketCat]=useState('Всички');
  const [cart,setCart]=useState<{product:any, qty:number}[]>([]);
  const [customerAddr,setCustomerAddr]=useState('');
  const [sortedClientOrders,setSortedClientOrders]=useState<any[]>([]);
  const [isSorting,setIsSorting]=useState(false);
  const [driverOnline,setDriverOnline]=useState(true);
  const [driverStatuses,setDriverStatuses]=useState<any[]>([]);
  const [arrivedShops,setArrivedShops]=useState<Record<string,boolean>>({});
  const [isLocating,setIsLocating]=useState(false);
  const isAdmin = currentUser && isAdminPhone(currentUser.phone);

  const openNavigation = (address:string) => {
    if(!address){ showToast('Няма адрес'); return; }
    const q = encodeURIComponent(address);
    const ua = typeof navigator!== 'undefined'? navigator.userAgent : '';
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    if(isIOS){ window.open(`http://maps.apple.com/?daddr=${q}`, '_blank'); }
    else { window.location.href = `geo:0,0?q=${q}`; setTimeout(()=>{ window.open(`https://www.google.com/maps/dir/?api=1&destination=${q}`, '_blank'); }, 600); }
  };

  const handleAuth = async ()=>{
    const cPhone = clean(loginForm.phone);
    if(!loginForm.phone || cPhone.length<9){ alert('Телефон!'); return; }
    if(loginTab==='login'){
      const {data:found} = await supabase.from('users').select('*').or(`clean_phone.eq.${cPhone},phone.eq.${loginForm.phone}`).maybeSingle();
      if(!found){ alert('Няма акаунт!'); setLoginTab('register'); return; }
      const u={id:found.id,firstName:found.first_name,lastName:found.last_name,phone:found.phone,email:found.email};
      localStorage.setItem('vozime_current',JSON.stringify(u)); setCurrentUser(u); return;
    }
    if(!loginForm.firstName ||!loginForm.lastName ||!loginForm.phone ||!loginForm.email){ alert('Попълни всичко'); return; }
    const {data:existing} = await supabase.from('users').select('*').eq('clean_phone', cPhone).maybeSingle();
    if(existing){ alert('Вече съществува!'); setLoginTab('login'); return; }
    setIsSendingCode(true);
    const code = Math.floor(100000 + Math.random()*900000).toString();
    const expires = new Date(Date.now()+10*60*1000).toISOString();
    await supabase.from('email_codes').insert({ email: loginForm.email.trim().toLowerCase(), clean_phone: cPhone, code, expires_at: expires, used: false });
    try{ const res = await fetch('/api/send-email',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:loginForm.email.trim().toLowerCase(),code,firstName:loginForm.firstName})}); const j = await res.json().catch(()=>({})); setCodeForTest(j.codeForTesting||code); }catch{ setCodeForTest(code); }
    setPendingData({firstName:loginForm.firstName,lastName:loginForm.lastName,fullPhone:loginForm.phone.trim(),cleanPhone:cPhone,email:loginForm.email.trim().toLowerCase()});
    setVerificationStep('verify'); setCodeInput(''); setIsSendingCode(false);
  };
  const handleVerifyCode = async ()=>{
    if(!codeInput || codeInput.length!==6){ alert('6 цифри'); return; } if(!pendingData) return;
    const {data:codeRow} = await supabase.from('email_codes').select('*').eq('email',pendingData.email).eq('clean_phone',pendingData.cleanPhone).eq('code',codeInput.trim()).eq('used',false).gt('expires_at', new Date().toISOString()).order('created_at',{ascending:false}).limit(1).maybeSingle();
    if(!codeRow){ alert('Грешен код'); return; }
    await supabase.from('email_codes').update({used:true}).eq('id',codeRow.id);
    const {data:newUser}=await supabase.from('users').insert({ first_name: pendingData.firstName, last_name: pendingData.lastName, phone: pendingData.fullPhone, clean_phone: pendingData.cleanPhone, email: pendingData.email, is_verified: true, email_verified: true }).select().single();
    const u={id:newUser.id,firstName:newUser.first_name,lastName:newUser.last_name,phone:newUser.phone,email:newUser.email};
    localStorage.setItem('vozime_current',JSON.stringify(u)); setCurrentUser(u); setVerificationStep('form'); setPendingData(null); setCodeInput(''); setCodeForTest(null); setLoginForm({firstName:'',lastName:'',phone:'',email:''});
  };
  const loadShops = async ()=>{ const {data}=await supabase.from('shops').select('*').order('created_at',{ascending:false}); if(data) setShops(data); const {data:profiles}=await supabase.from('shop_profiles').select('*'); if(profiles) setShopProfiles(profiles); };
  const loadDriverStatuses = async ()=>{ try{ const {data}=await supabase.from('driver_status').select('*').order('updated_at',{ascending:false}); if(data) setDriverStatuses(data); }catch{} };
  const loadMyShopProfile = async ()=>{
    if(!currentUser?.phone) return; const myC = clean(currentUser.phone);
    const {data:allProfiles}=await supabase.from('shop_profiles').select('*'); if(!allProfiles) return;
    let myProfiles:any[] = allProfiles.filter((p:any)=> clean(p.phone)===myC || p.phone===currentUser.phone);
    if(myProfiles.length===0 && isAdmin){ const {data:allDriverOrders} = await supabase.from('orders').select('*').eq('driver_requested', true).order('created_at',{ascending:false}); if(allDriverOrders?.length){ setMyShopOrders(allDriverOrders); setMyShopProfile({role:'driver', phone: currentUser.phone, shop_id: null, is_admin_view: true}); return; } setMyShopProfile(null); return; }
    if(myProfiles.length===0){ setMyShopProfile(null); setMyShopProducts([]); setMyShopOrders([]); return; }
    const ownerProfile = myProfiles.find((p:any)=>p.role==='shop_owner') || myProfiles[0]; setMyShopProfile(ownerProfile);
    const shopIds = [...new Set(myProfiles.map((p:any)=>p.shop_id))]; let allProds:any[]=[]; let allOrders:any[]=[];
    for(const sid of shopIds){ if(!sid) continue; const {data:prods}=await supabase.from('products').select('*').eq('shop_id', sid); if(prods) allProds=[...allProds,...prods]; const {data:ords}=await supabase.from('orders').select('*').eq('shop_id', sid).order('created_at',{ascending:false}); if(ords) allOrders=[...allOrders,...ords]; }
    setMyShopProducts(allProds); setMyShopOrders(allOrders);
  };
  const loadCustomerOrders = async ()=>{ if(!currentUser?.phone) return; const {data}=await supabase.from('orders').select('*').eq('customer_phone', currentUser.phone).order('created_at',{ascending:false}); if(data) setCustomerOrders(data); };
  const loadMarketProducts = async (shopId:string)=>{ const shop = shops.find(s=>s.id===shopId); if(shop && shop.vip_active===false){ showToast('🔴 Затворен'); return; } const {data}=await supabase.from('products').select('*').eq('shop_id', shopId); if(data) setMarketProducts(data.filter((p:any)=>p.active!==false)); setSelectedShop(shop); setCart([]); };
  const addShop = async ()=>{ if(!shopName ||!ownerPhone) return; if(editShopData){ await supabase.from('shops').update({ name:shopName, city:shopCity||shopAddress||'', address:shopAddress||'', phone:ownerPhone, delivery_fee: parseFloat(shopDeliveryFee)||4.99, }).eq('id',editShopData.id); await supabase.from('shop_profiles').delete().eq('shop_id',editShopData.id).eq('role','shop_owner'); await supabase.from('shop_profiles').insert([{phone:ownerPhone,role:'shop_owner',shop_id:editShopData.id}]); if(driverPhone){ await supabase.from('shop_profiles').delete().eq('shop_id',editShopData.id).eq('role','driver'); await supabase.from('shop_profiles').insert([{phone:driverPhone,role:'driver',shop_id:editShopData.id}]); } setEditShopData(null); }else{ const {data}=await supabase.from('shops').insert({ name:shopName, slug:shopName.toLowerCase().replace(/\s+/g,'-')+'-'+Date.now(), city:shopCity||shopAddress||'', address:shopAddress||'', phone:ownerPhone, delivery_fee: parseFloat(shopDeliveryFee)||4.99, vip_active:true }).select().single(); await supabase.from('shop_profiles').insert([{phone:ownerPhone,role:'shop_owner',shop_id:data.id}]); if(driverPhone) await supabase.from('shop_profiles').insert([{phone:driverPhone,role:'driver',shop_id:data.id}]); } setShopName(''); setShopAddress(''); setShopCity(''); setShopDeliveryFee('4.99'); setOwnerPhone(''); setDriverPhone(''); await loadShops(); };
  const startEditShop = (shop:any)=>{ setEditShopData(shop); setShopName(shop.name||''); setShopAddress(shop.address||''); setShopCity(shop.city||''); setShopDeliveryFee(String(shop.delivery_fee||'4.99')); setOwnerPhone(shop.phone||''); const dp = shopProfiles.find((p:any)=> p.shop_id===shop.id && p.role==='driver'); setDriverPhone(dp?.phone||''); };
  const cancelEditShop = ()=>{ setEditShopData(null); setShopName(''); setShopAddress(''); setShopCity(''); setShopDeliveryFee('4.99'); setOwnerPhone(''); setDriverPhone(''); };
  const toggleShopActive = async (shop:any)=>{ await supabase.from('shops').update({vip_active:!shop.vip_active}).eq('id',shop.id); await loadShops(); };
  const toggleMyShopOnline = async ()=>{ const myShop = shops.find(s=> s.id===myShopProfile?.shop_id); if(!myShop) return; await supabase.from('shops').update({vip_active:!myShop.vip_active}).eq('id',myShop.id); await loadShops(); };
  const deleteShop = async (id:string)=>{ if(!confirm('Изтрий?')) return; await supabase.from('shop_profiles').delete().eq('shop_id',id); await supabase.from('products').delete().eq('shop_id',id); await supabase.from('shops').delete().eq('id',id); await loadShops(); };
  const addProductWithImage = async ()=>{ const targetShopId = myShopProfile?.shop_id || shops[0]?.id; if(!targetShopId) return; if(!newProdName.trim() ||!newProdPrice.trim()) return; const priceNum=parseFloat(newProdPrice.replace(',','.')); let imageUrl=editingProduct?.image_url||null; if(newProdFile){ const fname=`${targetShopId}_${Date.now()}_${newProdFile.name}`; await supabase.storage.from('product-images').upload(fname,newProdFile); const {data:urlData}=supabase.storage.from('product-images').getPublicUrl(fname); imageUrl=urlData.publicUrl; } const desc=`[${newProdCat}] ${newProdDesc.trim()}`; if(editingProduct){ await supabase.from('products').update({name:newProdName.trim(),price:priceNum,description:desc,image_url:imageUrl,active:newProdActive}).eq('id',editingProduct.id); }else{ await supabase.from('products').insert({shop_id:targetShopId,name:newProdName.trim(),price:priceNum,description:desc,image_url:imageUrl,active:newProdActive}); } setNewProdName(''); setNewProdPrice(''); setNewProdDesc(''); setNewProdFile(null); setEditingProduct(null); await loadMyShopProfile(); };
  const startEditProduct = (p:any)=>{ setEditingProduct(p); setNewProdName(p.name); setNewProdPrice(p.price.toString()); setNewProdDesc((p.description||'').replace(/^\[.*?\]\s*/,'').trim()); const m=p.description?.match(/^\[(.*?)\]/); if(m) setNewProdCat(m[1]); setNewProdActive(p.active!==false); };
  const cancelEditProduct = ()=>{ setEditingProduct(null); setNewProdName(''); setNewProdPrice(''); setNewProdDesc(''); setNewProdFile(null); };
  const deleteProduct = async (id:string)=>{ await supabase.from('products').delete().eq('id',id); setMyShopProducts(myShopProducts.filter(p=>p.id!==id)); };
  const addToCart = (product:any)=>{ if(selectedShop?.vip_active===false) return; setCart(prev=>{ const ex=prev.find(c=>c.product.id===product.id); if(ex) return prev.map(c=> c.product.id===product.id? {...c,qty:c.qty+1}:c); return [...prev,{product,qty:1}]; }); };
  const incCart = (pid:string)=> setCart(prev=> prev.map(c=> c.product.id===pid? {...c,qty:c.qty+1}:c));
  const decCart = (pid:string)=> setCart(prev=>{ const ex=prev.find(c=>c.product.id===pid); if(!ex) return prev; if(ex.qty<=1) return prev.filter(c=>c.product.id!==pid); return prev.map(c=> c.product.id===pid? {...c,qty:c.qty-1}:c); });
  const getCartTotal = ()=> cart.reduce((s,c)=> s + parseFloat(c.product.price)*c.qty,0) + parseFloat(selectedShop?.delivery_fee||4.99);
  const geocodeAddress = async (addr:string)=>{ try{ const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addr)}&limit=1`); const data = await res.json(); if(data && data[0]) return {lat:parseFloat(data[0].lat), lon:parseFloat(data[0].lon)}; }catch{} return null; };
  const calcDistance = (a:any,b:any)=>{ const R=6371; const dLat=(b.lat-a.lat)*Math.PI/180; const dLon=(b.lon-a.lon)*Math.PI/180; const lat1=a.lat*Math.PI/180; const lat2=b.lat*Math.PI/180; const h=Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2; return R*2*Math.asin(Math.sqrt(h)); };
  const getCurrentPos = (): Promise<{lat:number,lon:number}> => new Promise((res,rej)=>{ if(!navigator.geolocation){ rej('no gps'); return; } navigator.geolocation.getCurrentPosition(p=>res({lat:p.coords.latitude,lon:p.coords.longitude}), e=>rej(e), {enableHighAccuracy:true,timeout:8000}); });

  // CALCULATIONS
  const filteredMarketShops = shops.filter(s=>!marketSearch || s.name.toLowerCase().includes(marketSearch.toLowerCase()));
  const filteredMarketProducts = marketProducts.filter(p=>{ if(marketSearch &&!(p.name.toLowerCase().includes(marketSearch.toLowerCase()))) return false; if(marketCat!=='Всички' &&!(p.description||'').includes(`[${marketCat}]`)) return false; return true; });
  const filteredMyProducts = myShopProducts.filter(p=>{ if(prodSearch &&!(p.name.toLowerCase().includes(prodSearch.toLowerCase()))) return false; if(prodCatFilter!=='Всички' &&!(p.description||'').includes(`[${prodCatFilter}]`)) return false; return true; });
  const driverSource = sortedClientOrders.length>0? [...myShopOrders.filter(o=>o.driver_phone!==currentUser?.phone), ...sortedClientOrders] : myShopOrders;
  const driverAll = driverSource.filter((o:any)=> o.driver_requested === true && o.status!== 'delivered' && o.status!== 'cancelled');
  const baseAvailable = driverAll.filter((o:any)=>(!o.driver_phone || o.driver_phone===currentUser?.phone) && o.status!== 'delivered');
  const availableDriverOrders = driverOnline? baseAvailable : baseAvailable.filter((o:any)=> o.driver_phone===currentUser?.phone);
  const myTakenOrders = availableDriverOrders.filter((o:any)=> o.driver_phone===currentUser?.phone);
  const pendingShopOrders = myTakenOrders.filter((o:any)=> ['on_the_way_to_shop','ready_for_driver'].includes(o.status));
  const pickedUpOrders = myTakenOrders.filter((o:any)=> ['picked_up','on_the_way'].includes(o.status));
  const activeDriverCount = myTakenOrders.filter((o:any)=> ['on_the_way_to_shop','picked_up','on_the_way','ready_for_driver'].includes(o.status)).length;
  const todayStr = new Date().toISOString().slice(0,10);
  const todayDeliveredOrders = myShopOrders.filter((o:any)=> o.driver_phone===currentUser?.phone && o.status==='delivered' && (o.created_at||'').slice(0,10)===todayStr);
  const todayEarnings = todayDeliveredOrders.reduce((sum:number,o:any)=>{ const shop = shops.find(s=>s.id===o.shop_id); const fee = parseFloat(shop?.delivery_fee || '4.99'); return sum+fee; },0);
  const myShopData = shops.find(s=> s.id===myShopProfile?.shop_id);
  const groupedByShop = pendingShopOrders.reduce((acc:any,o:any)=>{ if(!acc[o.shop_id]) acc[o.shop_id]=[]; acc[o.shop_id].push(o); return acc; },{});
  const shopIdsForPickup = Object.keys(groupedByShop);

  const upsertDriverStatus = async (isOnline:boolean, earnings:number, deliveries:number)=>{
    if(!currentUser?.phone) return;
    try{ await supabase.from('driver_status').upsert({ phone: currentUser.phone, clean_phone: clean(currentUser.phone), is_online: isOnline, earnings_today: earnings, deliveries_today: deliveries, updated_at: new Date().toISOString() },{onConflict:'clean_phone'}); }catch{}
  };
  const toggleDriverOnline = async ()=>{
    const newVal=!driverOnline; setDriverOnline(newVal);
    localStorage.setItem(`vozime_driver_online_${clean(currentUser.phone)}`, String(newVal));
    await upsertDriverStatus(newVal, todayEarnings, todayDeliveredOrders.length);
    showToast(newVal? '🟢 Онлайн LIVE' : '🔴 Офлайн LIVE');
  };
  const updateOrderStatus = async (orderId:string,status:string)=>{ await supabase.from('orders').update({status}).eq('id',orderId); setMyShopOrders(prev=> prev.map(o=> o.id===orderId? {...o, status} : o)); if(status==='delivered'){ setSortedClientOrders(prev=>prev.filter(o=>o.id!==orderId)); } };
  const requestDriverForOrder = async (orderId:string)=>{ await supabase.from('orders').update({driver_requested:true, status:'ready_for_driver'}).eq('id',orderId); setMyShopOrders(prev=> prev.map(o=> o.id===orderId? {...o, driver_requested:true, status:'ready_for_driver'} : o)); };
  const assignDriverToOrder = async (orderId:string)=>{
    const active = myShopOrders.filter((o:any)=> o.driver_phone===currentUser.phone && ['on_the_way_to_shop','picked_up','on_the_way','ready_for_driver'].includes(o.status));
    if(active.length>=3){ alert('Лимит 3 взети! Достави първо'); return; }
    await supabase.from('orders').update({driver_phone:currentUser.phone, status:'on_the_way_to_shop'}).eq('id',orderId);
  };
  const refuseOrder = async (orderId:string)=>{ await supabase.from('orders').update({driver_phone:null, driver_requested:false, status:'preparing'}).eq('id',orderId); };
  const sortClientsByNearest = async ()=>{
    const ordersToSort = pickedUpOrders.length>0? pickedUpOrders : myTakenOrders.filter((o:any)=> o.status==='picked_up' || o.status==='on_the_way');
    if(ordersToSort.length===0) return;
    setIsLocating(true); setIsSorting(true);
    try{
      let origin:any = null;
      try{ origin = await getCurrentPos(); }catch{}
      if(!origin){
        const firstShop = shops.find(s=>s.id===ordersToSort[0].shop_id);
        origin = await geocodeAddress(firstShop?.address || firstShop?.city || '');
      }
      if(!origin){ setSortedClientOrders(ordersToSort); setIsSorting(false); setIsLocating(false); return; }
      const withDist = await Promise.all(ordersToSort.map(async (o:any)=>{
        const custCoords = await geocodeAddress(o.address);
        const dist = custCoords? calcDistance(origin, custCoords) : 9999;
        return {...o, _dist: dist};
      }));
      withDist.sort((a,b)=>a._dist-b._dist);
      setSortedClientOrders(withDist);
      showToast(`🧭 Най-близък клиент #${withDist[0].id.slice(0,6)} - ${withDist[0]._dist.toFixed(1)}км - ${withDist[0].address}`);
    }catch{ showToast('GPS грешка'); }
    setIsSorting(false); setIsLocating(false);
  };
  const placeOrder = async ()=>{
    if(selectedShop?.vip_active===false){ alert('Затворен'); return; }
    if(!selectedShop || cart.length===0 ||!customerAddr.trim()){ alert('Адрес!'); return; }
    if(!/\d/.test(customerAddr)){ alert('⚠️ Въведи улица + НОМЕР + град! Пример: Chatsworth avenue 15, PO21 2DA'); return; }
    if(customerAddr.trim().length<10){ alert('Пълен адрес с номер и град!'); return; }
    const items=cart.map(c=>({id:c.product.id,name:c.product.name,price:c.product.price,qty:c.qty}));
    const total=getCartTotal();
    await supabase.from('orders').insert({shop_id:selectedShop.id,customer_phone:currentUser.phone,customer_name:`${currentUser.firstName} ${currentUser.lastName}`,address:customerAddr.trim(),items,total,status:'new',driver_requested:false});
    setCart([]); setCustomerAddr(''); await loadCustomerOrders();
  };

  useEffect(()=>{ const cu=localStorage.getItem('vozime_current'); if(cu) setCurrentUser(JSON.parse(cu)); loadShops(); loadDriverStatuses(); },[]);
  useEffect(()=>{ if(currentUser?.phone){ const saved=localStorage.getItem(`vozime_driver_online_${clean(currentUser.phone)}`); if(saved!==null) setDriverOnline(saved==='true'); loadMyShopProfile(); loadCustomerOrders(); } },[currentUser]);
  useEffect(()=>{ const interval = setInterval(()=>{ loadShops(); loadDriverStatuses(); }, 4000); return ()=> clearInterval(interval); },[]);
  useEffect(()=>{
    if(!currentUser?.phone) return; const myPhoneClean = clean(currentUser.phone);
    const channel = supabase.channel(`realtime-${myPhoneClean}-${Date.now()}`)
.on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        const newRow = payload.new as any; const oldRow = payload.old as any; const row = newRow || oldRow; if(!row) return;
        if(row.customer_phone && clean(row.customer_phone) === myPhoneClean){
          if(payload.eventType === 'INSERT'){ setCustomerOrders(prev => [row,...prev.filter((o:any)=>o.id!==row.id)]); }
          else if(payload.eventType === 'UPDATE'){ setCustomerOrders(prev => prev.map((o:any)=> o.id===row.id? {...o,...newRow} : o)); }
          else if(payload.eventType === 'DELETE'){ setCustomerOrders(prev => prev.filter((o:any)=>o.id!==row.id)); }
        }
        setMyShopOrders(prev => {
          const myShopIds = [...new Set(shopProfiles.filter((p:any)=> clean(p.phone)===myPhoneClean || p.phone===currentUser.phone).map((p:any)=>p.shop_id))];
          const isRelevant = myShopIds.includes(row.shop_id) || row.driver_requested === true || prev.some((o:any)=>o.id===row.id) || (myShopProfile as any)?.is_admin_view;
          if(!isRelevant) return prev;
          if(payload.eventType === 'INSERT'){ if(!prev.some((o:any)=>o.id===row.id)) return [row,...prev]; return prev; }
          if(payload.eventType === 'UPDATE'){ return prev.map((o:any)=> o.id===row.id? {...o,...newRow} : o); }
          if(payload.eventType === 'DELETE'){ return prev.filter((o:any)=>o.id!==row.id); } return prev;
        });
      })
.on('postgres_changes', { event: '*', schema: 'public', table: 'shops' }, (payload) => {
        const newRow = payload.new as any; const oldRow = payload.old as any;
        if(payload.eventType==='INSERT'){ setShops(prev=> [newRow,...prev]); }
        else if(payload.eventType==='UPDATE'){ setShops(prev=> prev.map(s=> s.id===newRow.id? newRow : s)); if(selectedShop && selectedShop.id===newRow.id){ setSelectedShop(newRow); if(newRow.vip_active===false) setCart([]); } }
        else if(payload.eventType==='DELETE'){ setShops(prev=> prev.filter(s=> s.id!==oldRow.id)); }
      })
.on('postgres_changes', { event: '*', schema: 'public', table: 'driver_status' }, (payload) => {
        const newRow = payload.new as any;
        if(payload.eventType==='INSERT' || payload.eventType==='UPDATE'){ setDriverStatuses(prev=> [newRow,...prev.filter(d=>d.clean_phone!==newRow.clean_phone)]); }
      })
.subscribe(); return ()=>{ supabase.removeChannel(channel); };
  }, [currentUser?.phone, shopProfiles, myShopProfile?.shop_id, selectedShop?.id]);
  useEffect(()=>{ if(currentUser?.phone && (myShopProfile?.role==='driver' || isAdmin)){ upsertDriverStatus(driverOnline, todayEarnings, todayDeliveredOrders.length); } },[todayEarnings, driverOnline]);

  const logout=()=>{ localStorage.removeItem('vozime_current'); setCurrentUser(null); setTab('market'); };

  if(!currentUser){
    if(verificationStep==='verify'){
      return (<main style={{position:'fixed',inset:0,display:'flex',alignItems:'center',justifyContent:'center',background:'#0F4C75',padding:'16px'}}><div style={{background:'white',padding:'20px',borderRadius:'24px',width:'100%',maxWidth:'380px',textAlign:'center'}}><b>Код от имейл</b><div style={{fontSize:'11px'}}>Тест код: {codeForTest}</div><input value={codeInput} onChange={e=>setCodeInput(e.target.value)} placeholder="6 цифри" style={{width:'100%',padding:'14px',borderRadius:'12px',border:'2px solid #0F4C75',marginTop:'12px',textAlign:'center',fontSize:'20px',letterSpacing:'4px'}}/><button onClick={handleVerifyCode} style={{width:'100%',padding:'14px',background:'#22c55e',color:'white',border:'none',borderRadius:'12px',marginTop:'12px',fontWeight:'800'}}>Потвърди</button></div></main>);
    }
    return (<main style={{position:'fixed',inset:0,display:'flex',alignItems:'center',justifyContent:'center',background:'#0F4C75',padding:'16px'}}><div style={{background:'white',padding:'20px',borderRadius:'24px',width:'100%',maxWidth:'380px'}}><div style={{fontWeight:'800',fontSize:'22px',color:'#0F4C75',textAlign:'center'}}>🛒 VoziMe</div><div style={{display:'flex',background:'#f1f3f4',borderRadius:'12px',padding:'3px',margin:'16px 0'}}><button onClick={()=>setLoginTab('login')} style={{flex:1,padding:'10px',borderRadius:'8px',border:'none',fontWeight:'bold',background:loginTab==='login'?'#0F4C75':'white',color:loginTab==='login'?'white':'#666'}}>Вход</button><button onClick={()=>setLoginTab('register')} style={{flex:1,padding:'10px',borderRadius:'8px',border:'none',fontWeight:'bold',background:loginTab==='register'?'#0F4C75':'white',color:loginTab==='register'?'white':'#666'}}>Регистрация</button></div>{loginTab==='register' && (<><input placeholder="Име" value={loginForm.firstName} onChange={e=>setLoginForm({...loginForm,firstName:e.target.value})} style={{width:'100%',padding:'14px',borderRadius:'12px',border:'1px solid #e5e7eb',marginBottom:'10px'}}/><input placeholder="Фамилия" value={loginForm.lastName} onChange={e=>setLoginForm({...loginForm,lastName:e.target.value})} style={{width:'100%',padding:'14px',borderRadius:'12px',border:'1px solid #e5e7eb',marginBottom:'10px'}}/><input placeholder="Имейл" value={loginForm.email} onChange={e=>setLoginForm({...loginForm,email:e.target.value})} style={{width:'100%',padding:'14px',borderRadius:'12px',border:'1px solid #e5e7eb',marginBottom:'10px'}}/></>)}<input placeholder="Телефон" value={loginForm.phone} onChange={e=>setLoginForm({...loginForm,phone:e.target.value})} style={{width:'100%',padding:'14px',borderRadius:'12px',border:'1px solid #e5e7eb',marginBottom:'16px'}}/><button onClick={handleAuth} disabled={isSendingCode} style={{width:'100%',padding:'16px',background:'#22c55e',border:'none',borderRadius:'14px',fontWeight:'bold',color:'white'}}>{isSendingCode? 'Пращам...' : 'Влез / Регистрирай'}</button></div></main>);
  }

  return (
    <main style={{height:'100dvh',width:'100%',maxWidth:'480px',margin:'0 auto',background:'#f9fafb',display:'flex',flexDirection:'column',overflow:'hidden',fontFamily:'-apple-system, sans-serif'}}>
      <header style={{background:'#0F4C75',color:'white',padding:'10px 12px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div><b>🛒 Магазини {isAdmin?'👑':''}</b><div style={{fontSize:'10px',opacity:0.8}}>{currentUser.firstName} • LIVE ✅ • {todayEarnings.toFixed(2)}€ днес</div></div>
        <button onClick={logout} style={{background:'#FF3B30',border:'none',color:'white',padding:'6px 10px',borderRadius:'12px',fontSize:'11px',fontWeight:'bold'}}>Изход</button>
      </header>
      <div style={{display:'flex',gap:'4px',padding:'6px',background:'white',borderBottom:'1px solid #e5e7eb'}}>
        <button onClick={()=>setTab('market')} style={{flex:1,padding:'10px',borderRadius:'10px',border:'none',fontWeight:'bold',fontSize:'11px',background:tab==='market'?'#22c55e':'#f3f4f6',color:tab==='market'?'white':'#666'}}>🛒 Пазар</button>
        <button onClick={()=>setTab('my_orders')} style={{flex:1,padding:'10px',borderRadius:'10px',border:'none',fontWeight:'bold',fontSize:'11px',background:tab==='my_orders'?'#0F4C75':'#f3f4f6',color:tab==='my_orders'?'white':'#666'}}>📦 Мои ({customerOrders.length})</button>
        {myShopProfile?.role==='shop_owner' && <button onClick={()=>setTab('my_shop')} style={{flex:1,padding:'10px',borderRadius:'10px',border:'none',fontWeight:'bold',fontSize:'11px',background:tab==='my_shop'?'#f59e0b':'#f3f4f6',color:tab==='my_shop'?'white':'#666'}}>🏪 Моя</button>}
        {(myShopProfile?.role==='driver' || isAdmin) && <button onClick={()=>setTab('driver')} style={{flex:1,padding:'10px',borderRadius:'10px',border:'none',fontWeight:'bold',fontSize:'11px',background:tab==='driver'?'#0F4C75':'#f3f4f6',color:tab==='driver'?'white':'#666'}}>🚚 Доставки ({myTakenOrders.length}/{availableDriverOrders.length})</button>}
        {isAdmin && <button onClick={()=>setTab('admin')} style={{flex:1,padding:'10px',borderRadius:'10px',border:'none',fontWeight:'bold',fontSize:'10px',background:tab==='admin'?'#FFD60A':'#f3f4f6',color:tab==='admin'?'black':'#666'}}>👑 Админ</button>}
      </div>
      <div style={{flex:1,overflowY:'auto',padding:'10px',display:'flex',flexDirection:'column',gap:'12px'}}>
        {tab==='market' && (<>{!selectedShop? (<><div style={{background:'#22c55e',color:'white',padding:'14px',borderRadius:'14px'}}><b>🛒 Пазар LIVE</b><input value={marketSearch} onChange={e=>setMarketSearch(e.target.value)} placeholder="🔍 Магазин..." style={{width:'100%',marginTop:'10px',padding:'10px',borderRadius:'10px',border:'none'}}/></div>{filteredMarketShops.map((s:any)=>(<div key={s.id} onClick={()=> s.vip_active===false? showToast('🔴 Затворен') : loadMarketProducts(s.id)} style={{background:'white',border: s.vip_active===false? '2px solid #FF3B30' : '2px solid #22c55e',borderRadius:'14px',padding:'14px'}}><div style={{display:'flex',justifyContent:'space-between'}}><b>{s.name}</b><span style={{fontSize:'10px',background: s.vip_active===false? '#FF3B30' : '#22c55e',color:'white',padding:'4px 8px',borderRadius:'10px'}}>{s.vip_active===false? '🔴 Затворен' : '🟢 Отворен'}</span></div><div style={{fontSize:'12px',color:'#666',marginTop:'4px'}}>📍 {s.address||s.city} • {s.delivery_fee}€ - с номер</div></div>))}</>):(<><button onClick={()=>{setSelectedShop(null); setMarketProducts([]); setCart([]);}} style={{padding:'10px',borderRadius:'10px',border:'1px solid #ddd',background:'white',fontWeight:'bold'}}>← Назад</button>{filteredMarketProducts.map((p:any)=>(<div key={p.id} style={{background:'white',borderRadius:'14px',padding:'12px',display:'flex',gap:'12px'}}>{p.image_url && <img src={p.image_url} style={{width:'70px',height:'70px',objectFit:'cover',borderRadius:'10px'}}/>}<div style={{flex:1}}><b>{p.name}</b><div style={{fontSize:'11px'}}>{(p.description||'').replace(/^\[.*?\]\s*/,'')}</div><div style={{fontWeight:'800',color:'#22c55e'}}>{p.price}€</div></div><div>{cart.find(c=>c.product.id===p.id)? (<div style={{display:'flex',gap:'6px',alignItems:'center'}}><button onClick={()=>decCart(p.id)} style={{width:'28px',height:'28px',borderRadius:'50%',border:'none'}}>−</button><b>{cart.find(c=>c.product.id===p.id)?.qty}</b><button onClick={()=>incCart(p.id)} style={{width:'28px',height:'28px',borderRadius:'50%',border:'none',background:'#22c55e',color:'white'}}>+</button></div>) : <button onClick={()=>addToCart(p)} style={{background:'#22c55e',color:'white',border:'none',padding:'10px 14px',borderRadius:'10px'}}>Добави</button>}</div></div>))}{cart.length>0 && (<div style={{background:'white',border:'3px solid #22c55e',borderRadius:'16px',padding:'14px',position:'sticky',bottom:'0'}}><b>🛒 {cart.reduce((s,c)=>s+c.qty,0)} продукта</b><div style={{fontWeight:'800',marginTop:'8px'}}>{getCartTotal().toFixed(2)}€</div><input value={customerAddr} onChange={e=>setCustomerAddr(e.target.value)} placeholder="📍 Улица + НОМЕР + град + код! Пример: Chatsworth avenue 15, PO21 2DA" style={{width:'100%',padding:'12px',marginTop:'10px',borderRadius:'10px',border:'2px solid #22c55e'}}/><div style={{fontSize:'10px',color:'#666',marginTop:'4px'}}>⚠️ Задължително с НОМЕР като при магазина! Иначе шофьора няма да те намери</div><button onClick={placeOrder} style={{width:'100%',marginTop:'10px',padding:'14px',background:'#22c55e',color:'white',border:'none',borderRadius:'12px',fontWeight:'800'}}>✅ Поръчай</button></div>)}</>)} </>)}
        {tab==='my_orders' && (<div style={{display:'flex',flexDirection:'column',gap:'10px'}}>{customerOrders.map((o:any)=>(<div key={o.id} style={{background:'white',border:'2px solid #0F4C75',borderRadius:'12px',padding:'12px'}}><b>#{o.id.slice(0,8)} • {parseFloat(o.total).toFixed(2)}€ • {o.status}</b><div style={{fontSize:'11px',marginTop:'6px',background:'#fff3cd',padding:'8px',borderRadius:'8px',border:'2px solid #f59e0b'}}>📍 {o.address} - С НОМЕР КАТО ПРИ МАГАЗИНА</div></div>))}</div>)}
        {tab==='my_shop' && (<div style={{display:'flex',flexDirection:'column',gap:'12px'}}><div style={{background: myShopData?.vip_active===false? '#fee2e2' : '#f0fdf4',border: myShopData?.vip_active===false? '2px solid #FF3B30' : '2px solid #22c55e',borderRadius:'14px',padding:'12px'}}><div style={{display:'flex',justifyContent:'space-between'}}><b>{myShopData?.vip_active===false? '🔴 Затворен' : '🟢 Отворен'}</b><button onClick={toggleMyShopOnline} style={{background: myShopData?.vip_active===false? '#22c55e' : '#FF3B30',color:'white',border:'none',padding:'12px 16px',borderRadius:'10px',fontWeight:'800'}}>{myShopData?.vip_active===false? '▶️ Отвори' : '⏸️ Затвори'}</button></div></div><div style={{background:'white',border:'2px solid #22c55e',borderRadius:'14px',padding:'12px'}}><b>📦 Поръчки {myShopOrders.length}</b>{myShopOrders.map((o:any)=>(<div key={o.id} style={{border:'2px solid #0F4C75',borderRadius:'12px',padding:'10px',marginTop:'10px'}}><b>#{o.id.slice(0,8)} • {o.customer_name} • {parseFloat(o.total).toFixed(2)}€ • {o.status}</b><div style={{fontSize:'11px',marginTop:'4px',background:'#fff3cd',padding:'8px',borderRadius:'8px',border:'2px solid #f59e0b'}}>📍 ПЪЛЕН АДРЕС С НОМЕР: {o.address}</div><div style={{display:'flex',gap:'6px',marginTop:'8px',flexWrap:'wrap'}}>{o.status==='new' && <button onClick={()=>updateOrderStatus(o.id,'accepted')} style={{flex:1,background:'#22c55e',color:'white',border:'none',padding:'10px',borderRadius:'8px'}}>✅ Приеми</button>}{o.status==='accepted' && <button onClick={()=>updateOrderStatus(o.id,'preparing')} style={{flex:1,background:'#f59e0b',color:'white',border:'none',padding:'10px',borderRadius:'8px'}}>👨‍🍳 Готвя</button>}{(o.status==='preparing' || o.status==='accepted') &&!o.driver_requested && <button onClick={()=>requestDriverForOrder(o.id)} style={{flex:1,background:'#0F4C75',color:'white',border:'none',padding:'10px',borderRadius:'8px',fontWeight:'800'}}>🚚 Искай шофьор - с бутона</button>}{o.driver_requested && <div style={{background:'#e0f2fe',padding:'8px',borderRadius:'8px',fontSize:'11px'}}>🚚 Шофьор: {o.driver_phone||'чака'}</div>}<button onClick={()=>openNavigation(o.address)} style={{background:'#22c55e',color:'white',border:'none',padding:'10px',borderRadius:'8px'}}>🧭 До клиента - {o.address.slice(0,25)}</button></div></div>))}</div></div>)}

        {tab==='driver' && (
          <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
            <div style={{background:'#0F4C75',color:'white',padding:'12px',borderRadius:'12px'}}>
              <div style={{display:'flex',justifyContent:'space-between'}}><div><b>🚚 Доставки - Точния флоу</b><div style={{fontSize:'10px'}}>{driverOnline? '🟢 Онлайн' : '🔴 Офлайн'} • Взети: {myTakenOrders.length}/3 • Днес: {todayEarnings.toFixed(2)}€ от {todayDeliveredOrders.length}</div></div><button onClick={toggleDriverOnline} style={{background:driverOnline?'#22c55e':'#FF3B30',color:'white',border:'none',padding:'10px 14px',borderRadius:'12px',fontWeight:'800'}}>{driverOnline? '🟢' : '🔴'}</button></div>
            </div>

            {/* 1. СВОБОДНИ ЗАЯВКИ - ПРИЕМАНЕ */}
            {myTakenOrders.length===0 && availableDriverOrders.length>0 && (
              <div style={{background:'white',border:'2px solid black',borderRadius:'14px',padding:'12px'}}>
                <b>📥 Нови заявки за шофьор - {availableDriverOrders.length}</b>
                {availableDriverOrders.filter(o=>!o.driver_phone).map((o:any)=>{
                  const shop = shops.find(s=>s.id===o.shop_id);
                  return (<div key={o.id} style={{border:'2px solid #0F4C75',borderRadius:'12px',padding:'10px',marginTop:'10px'}}>
                    <div style={{display:'flex',justifyContent:'space-between'}}><b>#{o.id.slice(0,8)} • {parseFloat(o.total).toFixed(2)}€</b><span style={{fontSize:'10px',background:'#f59e0b',padding:'4px 8px',borderRadius:'8px'}}>{o.status}</span></div>
                    <div style={{fontSize:'11px',marginTop:'6px',background:'#e0f2fe',padding:'8px',borderRadius:'8px',border:'2px solid #0F4C75'}}><b>🏪 {shop?.name}</b><br/><span style={{fontWeight:'800',background:'white',padding:'4px',borderRadius:'4px',border:'1px solid black'}}>📍 {shop?.address} • {shop?.city} - С НОМЕР КАТО ПРИ КЛИЕНТА</span></div>
                    <div style={{fontSize:'11px',marginTop:'6px',background:'#fff3cd',padding:'8px',borderRadius:'8px',border:'2px solid #f59e0b'}}><b>👤 {o.customer_name}</b><br/><span style={{fontWeight:'800',background:'white',padding:'6px',borderRadius:'6px',border:'2px solid black',display:'block',marginTop:'4px'}}>📍 ПЪЛЕН АДРЕС С НОМЕР: {o.address}</span></div>
                    <button onClick={()=>assignDriverToOrder(o.id)} style={{width:'100%',marginTop:'8px',background:'#0F4C75',color:'white',border:'none',padding:'12px',borderRadius:'10px',fontWeight:'800'}}>✅ Приеми заявка #{o.id.slice(0,6)}</button>
                  </div>)
                })}
              </div>
            )}

            {/* 2. ФАЗА МАГАЗИН - БУТОН КЪМ МАГАЗИНА АКО Е САМО ЕДИН */}
            {pendingShopOrders.length>0 && (
              <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
                <div style={{background:'black',color:'#FFD60A',padding:'12px',borderRadius:'12px',border:'2px solid #FFD60A'}}><b>🏪 ФАЗА 1: КЪМ МАГАЗИНА - имаш {pendingShopOrders.length} за взимане от {shopIdsForPickup.length} магазин{shopIdsForPickup.length>1?'а':''}</b></div>
                {shopIdsForPickup.map((shopId:string)=>{
                  const shopOrders = groupedByShop[shopId];
                  const shop = shops.find(s=>s.id===shopId);
                  const isArrived = arrivedShops[shopId];
                  return (
                    <div key={shopId} style={{background:'white',border:'4px solid black',borderRadius:'16px',padding:'14px'}}>
                      <div style={{display:'flex',justifyContent:'space-between'}}><b style={{fontSize:'16px'}}>🏪 {shop?.name}</b><span style={{fontSize:'11px',background:'black',color:'#FFD60A',padding:'6px 10px',borderRadius:'20px',fontWeight:'900'}}>{shopOrders.length} поръчки</span></div>
                      <div style={{marginTop:'8px',background:'#e0f2fe',border:'3px solid #0F4C75',padding:'12px',borderRadius:'10px'}}>
                        <div style={{fontSize:'10px',fontWeight:'900'}}>📍 АДРЕС НА МАГАЗИНА - УЛИЦА + НОМЕР КАТО ПРИ КЛИЕНТА:</div>
                        <div style={{fontSize:'15px',fontWeight:'900',marginTop:'4px',background:'white',padding:'8px',borderRadius:'8px',border:'2px solid black'}}>{shop?.address} • {shop?.city}</div>
                      </div>
                      {!isArrived ? (
                        <>
                          <button onClick={()=>openNavigation(shop?.address||'')} style={{width:'100%',marginTop:'12px',background:'black',color:'#FFD60A',border:'none',padding:'16px',borderRadius:'12px',fontWeight:'900',fontSize:'16px'}}>
                            🧭 КЪМ МАГАЗИНА {shop?.name} {shopIdsForPickup.length===1? `- ${shopOrders.length} поръчки` : ''}<br/><span style={{fontSize:'11px'}}>{shop?.address} - {shopOrders.map((o:any)=>`#${o.id.slice(0,6)}`).join(', ')}</span>
                          </button>
                          <button onClick={()=>setArrivedShops(prev=>({...prev,[shopId]:true}))} style={{width:'100%',marginTop:'8px',background:'white',border:'3px solid black',padding:'14px',borderRadius:'12px',fontWeight:'900'}}>
                            📍 ПРИСТИГНАХ ДО МАГАЗИНА - виждам номерата на телефона си
                          </button>
                        </>
                      ) : (
                        <div style={{marginTop:'10px'}}>
                          <div style={{background:'#FFD60A',color:'black',padding:'10px',borderRadius:'10px',border:'2px solid black',fontWeight:'900',textAlign:'center'}}>📱 ПОКАЖИ НОМЕРАТА НА МАГАЗИНЕРА - ВИЖДАШ ГИ НА ТЕЛЕФОНА СИ</div>
                          {shopOrders.map((o:any)=>(
                            <div key={o.id} style={{border:'3px solid black',borderRadius:'12px',padding:'12px',marginTop:'10px',background:'#f9fafb'}}>
                              <div style={{display:'flex',justifyContent:'space-between'}}><b style={{fontSize:'18px'}}>#{o.id.slice(0,8)} • {parseFloat(o.total).toFixed(2)}€</b><span style={{fontSize:'10px',background:'#fff3cd',padding:'4px 8px',borderRadius:'6px',border:'1px solid #f59e0b'}}>📍 {o.address}</span></div>
                              <div style={{fontSize:'11px',marginTop:'6px'}}>{o.customer_name} • {o.customer_phone} • 📍 ПЪЛЕН АДРЕС С НОМЕР: {o.address}</div>
                              <div style={{display:'flex',gap:'6px',marginTop:'10px'}}>
                                <button onClick={()=>updateOrderStatus(o.id,'picked_up')} style={{flex:1,background:'#22c55e',color:'white',border:'none',padding:'14px',borderRadius:'10px',fontWeight:'900'}}>✅ ВЗЕХ ПОРЪЧКА #{o.id.slice(0,6)} - отделен клик</button>
                                <button onClick={()=>refuseOrder(o.id)} style={{background:'#fee2e2',border:'2px solid #FF3B30',padding:'14px',borderRadius:'10px',fontWeight:'800'}}>❌ Отказана</button>
                              </div>
                            </div>
                          ))}
                          {shopOrders.every((o:any)=> o.status!=='on_the_way_to_shop' && o.status!=='ready_for_driver') && <div style={{marginTop:'10px',background:'#22c55e',color:'white',padding:'10px',borderRadius:'10px',textAlign:'center',fontWeight:'800'}}>✅ Всички от този магазин взети</div>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* 3. ФАЗА КЛИЕНТИ - НАЙ-БЛИЗКИЯ АВТОМАТИЧНО */}
            {pendingShopOrders.length===0 && pickedUpOrders.length>0 && (
              <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
                <div style={{background:'black',color:'#FFD60A',padding:'12px',borderRadius:'12px',border:'2px solid #FFD60A',display:'flex',justifyContent:'space-between'}}>
                  <b>👤 ФАЗА 2: КЪМ КЛИЕНТИ - {pickedUpOrders.length} взети - най-близкия автоматично</b>
                  <button onClick={sortClientsByNearest} style={{background:'#FFD60A',color:'black',border:'none',padding:'6px 10px',borderRadius:'8px',fontWeight:'900',fontSize:'10px'}}>{isLocating? '📍 GPS...' : '🤖 Подреди по близост'}</button>
                </div>
                {(() => {
                  const activeClient = sortedClientOrders.length>0? sortedClientOrders[0] : pickedUpOrders[0];
                  const queue = sortedClientOrders.length>0? sortedClientOrders.slice(1) : pickedUpOrders.slice(1);
                  if(!activeClient) return null;
                  return (
                    <>
                      <div style={{background:'white',border:'4px solid #22c55e',borderRadius:'16px',padding:'14px'}}>
                        <div style={{display:'flex',justifyContent:'space-between'}}><b style={{fontSize:'18px'}}>#{activeClient.id.slice(0,8)} • {parseFloat(activeClient.total).toFixed(2)}€ • {activeClient.customer_name}</b><span style={{fontSize:'11px',background:'#22c55e',color:'white',padding:'6px 10px',borderRadius:'20px'}}>{activeClient._dist!==undefined? `${activeClient._dist.toFixed(1)}км - най-близък` : activeClient.status}</span></div>
                        <div style={{marginTop:'10px',background:'white',border:'3px solid #22c55e',padding:'12px',borderRadius:'10px'}}>
                          <div style={{fontSize:'10px',fontWeight:'900'}}>📍 ПЪЛЕН АДРЕС НА КЛИЕНТА С НОМЕР - КАТО ПРИ МАГАЗИНА:</div>
                          <div style={{fontSize:'18px',fontWeight:'900',marginTop:'4px',background:'#fff3cd',padding:'10px',borderRadius:'8px',border:'3px solid black'}}>{activeClient.address}</div>
                          <div style={{fontSize:'10px',color:'#666',marginTop:'4px'}}>Точно както показва магазина улица + номер за да знае човека къде отива</div>
                        </div>
                        {activeClient.status==='picked_up' && (
                          <button onClick={async()=>{ await updateOrderStatus(activeClient.id,'on_the_way'); openNavigation(activeClient.address); }} style={{width:'100%',marginTop:'12px',background:'black',color:'#FFD60A',border:'none',padding:'18px',borderRadius:'14px',fontWeight:'900',fontSize:'16px'}}>
                            🧭 НАВИГИРАЙ КЪМ КЛИЕНТА - избира най-близкия автоматично<br/><span style={{fontSize:'13px',background:'white',color:'black',padding:'6px 10px',borderRadius:'8px',marginTop:'6px',display:'inline-block'}}>{activeClient.address} - #{activeClient.id.slice(0,6)}</span>
                          </button>
                        )}
                        {activeClient.status==='on_the_way' && (
                          <>
                            <button onClick={()=>showToast('📍 Пристигнал при клиента')} style={{width:'100%',marginTop:'12px',background:'white',border:'3px solid black',padding:'14px',borderRadius:'12px',fontWeight:'900'}}>📍 ПРИСТИГНАХ ПРИ КЛИЕНТА - {activeClient.address}</button>
                            <button onClick={async()=>{
                              await updateOrderStatus(activeClient.id,'delivered');
                              await upsertDriverStatus(driverOnline, todayEarnings + parseFloat(shops.find(s=>s.id===activeClient.shop_id)?.delivery_fee||'4.99'), todayDeliveredOrders.length+1);
                              if(queue.length>0){
                                showToast(`✅ Завършена! Продължи към следваща доставка #${queue[0].id.slice(0,6)} - ${queue[0].address}`);
                                setTimeout(()=>{ sortClientsByNearest(); openNavigation(queue[0].address); }, 600);
                              } else {
                                showToast(`🏁 Всички доставени! Заработи: ${(todayEarnings + parseFloat(shops.find(s=>s.id===activeClient.shop_id)?.delivery_fee||'4.99')).toFixed(2)}€`); setSortedClientOrders([]);
                              }
                            }} style={{width:'100%',marginTop:'8px',background:'#22c55e',color:'white',border:'none',padding:'18px',borderRadius:'14px',fontWeight:'900',fontSize:'16px'}}>
                              ✅ ЗАВЪРШИ ДОСТАВЯНЕТО #{activeClient.id.slice(0,6)} - {activeClient.address}<br/><span style={{fontSize:'11px'}}>Парите отчетени - {parseFloat(shops.find(s=>s.id===activeClient.shop_id)?.delivery_fee||'4.99').toFixed(2)}€</span>
                            </button>
                          </>
                        )}
                        <div style={{display:'flex',gap:'6px',marginTop:'8px'}}>
                          <button onClick={()=>openNavigation(activeClient.address)} style={{flex:1,background:'white',border:'2px solid black',padding:'12px',borderRadius:'10px',fontWeight:'800'}}>🧭 До клиента - {activeClient.address.slice(0,30)} - с номер</button>
                          <a href={`tel:${activeClient.customer_phone}`} style={{background:'black',color:'#FFD60A',padding:'12px 14px',borderRadius:'10px',textDecoration:'none',fontWeight:'900'}}>📞</a>
                        </div>
                      </div>
                      {queue.length>0 && (
                        <div style={{background:'#f9fafb',border:'2px dashed #666',borderRadius:'12px',padding:'10px'}}>
                          <b>📋 Опашка - остават {queue.length} - автоматично по близост с пълен адрес</b>
                          {queue.map((o:any,i:number)=>(
                            <div key={o.id} style={{background:'white',padding:'10px',borderRadius:'8px',marginTop:'6px',border:'2px solid #f59e0b'}}>
                              <div style={{display:'flex',justifyContent:'space-between'}}><b>{i+2}. #{o.id.slice(0,6)} • {o.customer_name} • {parseFloat(o.total).toFixed(2)}€</b><span>{o._dist!==undefined? `${o._dist.toFixed(1)}км` : ''}</span></div>
                              <div style={{fontSize:'12px',fontWeight:'800',marginTop:'4px',background:'#fff3cd',padding:'6px',borderRadius:'6px',border:'2px solid black'}}>📍 {o.address} - С НОМЕР КАТО ПРИ МАГАЗИНА</div>
                            </div>
                          ))}
                          <div style={{background:'black',color:'#FFD60A',padding:'8px',borderRadius:'8px',marginTop:'8px',textAlign:'center',fontSize:'11px',fontWeight:'800'}}>След завършване излиза бутон: Продължи към следваща доставка - парите отчетени при него - вижда колко е заработил</div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}

            {myTakenOrders.length===0 && availableDriverOrders.length===0 && (
              <div style={{background:'white',padding:'20px',borderRadius:'12px',textAlign:'center'}}>
                <b>Няма активни</b><div style={{fontSize:'11px',marginTop:'6px'}}>Днес: {todayEarnings.toFixed(2)}€ от {todayDeliveredOrders.length} доставки - отчетени при него</div>
                <div style={{marginTop:'10px',background:'#f0fdf4',padding:'10px',borderRadius:'10px',border:'2px solid #22c55e',textAlign:'left',fontSize:'11px'}}>
                  <b>Точния флоу:</b><br/>1. Магазин приема 2 поръчки → Иска шофьор<br/>2. Ти приемаш 2 заявки → Бутон към магазина (1 магазин)<br/>3. Пристигнах до магазина → Виждаш номерата #... на телефона<br/>4. Взех поръчка отделен клик за всяка<br/>5. Навигирай към клиента - най-близкия автоматично<br/>6. Пристигнах → Завърши → Продължи към следваща<br/>7. Парите отчетени - виждаш колко си заработил
                </div>
              </div>
            )}
          </div>
        )}
        {tab==='admin' && isAdmin && (
          <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
            <div style={{background:'#FFD60A',padding:'14px',borderRadius:'14px',border:'2px solid black'}}><b>👑 Админ - ВСИЧКИ ЕКСТРИ + ПЪЛЕН ФЛОУ</b><div style={{fontSize:'11px'}}>Магазини: {shops.length} • Шофьори LIVE: {driverStatuses.filter((d:any)=>d.is_online).length} • Днес доставки: {todayDeliveredOrders.length} • {todayEarnings.toFixed(2)}€</div></div>
            <div style={{background:'white',border:'2px solid #0F4C75',borderRadius:'14px',padding:'12px'}}><b>🚚 Шофьори LIVE</b>{driverStatuses.map((d:any)=>(<div key={d.clean_phone} style={{display:'flex',justifyContent:'space-between',padding:'10px',borderRadius:'10px',marginTop:'8px',background: d.is_online? '#f0fdf4' : '#fee2e2'}}><div><b>{d.phone}</b><div style={{fontSize:'10px'}}>{d.is_online? '🟢' : '🔴'} • {d.deliveries_today||0} • {parseFloat(d.earnings_today||0).toFixed(2)}€</div></div><span style={{fontSize:'10px',background: d.is_online? '#22c55e' : '#FF3B30',color:'white',padding:'4px 8px',borderRadius:'10px'}}>{d.is_online? 'ОНЛАЙН' : 'ОФЛАЙН'}</span></div>))}</div>
            <div style={{background:'white',borderRadius:'14px',padding:'12px'}}><b>🏪 Магазини</b>{shops.map((s:any)=>(<div key={s.id} style={{padding:'10px',border:'1px solid #e5e7eb',borderRadius:'10px',marginTop:'8px'}}><b>{s.name} {s.vip_active===false? '🔴' : '🟢'}</b><div style={{fontSize:'11px'}}>📍 {s.address} • {s.city} - с номер</div><div style={{display:'flex',gap:'4px',marginTop:'6px'}}><button onClick={()=>startEditShop(s)} style={{background:'#0F4C75',color:'white',border:'none',padding:'6px 10px',borderRadius:'8px'}}>✏️</button><button onClick={()=>toggleShopActive(s)} style={{background:s.vip_active===false?'#22c55e':'#FF3B30',color:'white',border:'none',padding:'6px 10px',borderRadius:'8px'}}>{s.vip_active===false?'▶️':'⏸️'}</button><button onClick={()=>deleteShop(s.id)} style={{background:'#FF3B30',color:'white',border:'none',padding:'6px 10px',borderRadius:'8px'}}>🗑️</button></div></div>))}</div>
          </div>
        )}
      </div>
      {toastMsg && <div style={{position:'fixed',bottom:'20px',left:'50%',transform:'translateX(-50%)',background:'black',color:'white',padding:'10px 20px',borderRadius:'20px',fontSize:'12px',zIndex:9999}}>{toastMsg}</div>}
    </main>
  );
}