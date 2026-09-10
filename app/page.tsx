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

export default function FinalAllPanels(){
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
  const [driverOnline,setDriverOnline]=useState(true);
  const [driverStatuses,setDriverStatuses]=useState<any[]>([]);
  const [arrivedShops,setArrivedShops]=useState<Record<string,boolean>>({});
  const [arrivedClients,setArrivedClients]=useState<Record<string,boolean>>({});
  const isAdmin = currentUser && isAdminPhone(currentUser.phone);

  const openNavigation = (address:string) => {
    if(!address){ showToast('Няма адрес'); return; }
    const q = encodeURIComponent(address);
    const ua = typeof navigator!== 'undefined'? navigator.userAgent : '';
    if(/iPad|iPhone|iPod/.test(ua)){ window.open(`http://maps.apple.com/?daddr=${q}`, '_blank'); }
    else { window.location.href = `geo:0,0?q=${q}`; setTimeout(()=>{ window.open(`https://www.google.com/maps/dir/?api=1&destination=${q}`, '_blank'); }, 600); }
  };

  // СИГУРНО - ПОЛЗВА API-та /api/send-email и /api/verify-code
  const handleAuth = async ()=>{
    const cPhone = clean(loginForm.phone);
    if(!loginForm.phone || cPhone.length<9){ alert('Телефон!'); return; }

    if(loginTab==='login'){
      const {data, error} = await supabase.from('users').select('*').eq('clean_phone', cPhone).limit(1);
      if(error){ alert('Грешка: '+error.message); return; }
      const found = data?.[0];
      if(!found){ alert('Няма акаунт! Натисни Регистрация.'); setLoginTab('register'); return; }
      const u={id:found.id,firstName:found.first_name,lastName:found.last_name,phone:found.phone,email:found.email};
      localStorage.setItem('vozime_current',JSON.stringify(u)); setCurrentUser(u); return;
    }

    // Регистрация > пращаме през API-то
    if(!loginForm.firstName ||!loginForm.lastName ||!loginForm.phone ||!loginForm.email){ alert('Попълни всичко - име, фамилия, телефон, имейл'); return; }
    const {data:existing} = await supabase.from('users').select('id').eq('clean_phone', cPhone).limit(1);
    if(existing && existing.length>0){ alert('Вече съществува! Натисни Вход.'); setLoginTab('login'); return; }

    setIsSendingCode(true);
    const code = Math.floor(100000 + Math.random()*900000).toString();
    const emailLow = loginForm.email.trim().toLowerCase();

    try{
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ 
          email: emailLow, 
          code, 
          firstName: loginForm.firstName,
          phone: loginForm.phone.trim(),
          cleanPhone: cPhone
        })
      });
      const json = await res.json();
      if(!res.ok) throw new Error(json.error || 'Грешка при пращане');
      
      // ако е тест режим - показваме кода, ако е имейл - не
      if(json.codeForTesting) setCodeForTest(json.codeForTesting);
      else setCodeForTest(null);
      
      setPendingData({firstName:loginForm.firstName,lastName:loginForm.lastName,fullPhone:loginForm.phone.trim(),cleanPhone:cPhone,email:emailLow});
      setVerificationStep('verify'); setCodeInput('');
      showToast(json.mode==='email_sent' ? '📧 Код изпратен на имейл!' : '🔑 Код генериран');
    }catch(e:any){
      alert('Грешка: '+e.message);
    }
    setIsSendingCode(false);
  };

  const handleVerifyCode = async ()=>{
    if(!codeInput || codeInput.length!==6){ alert('6 цифри'); return; } if(!pendingData) return;
    try{
      const res = await fetch('/api/verify-code', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          email: pendingData.email,
          code: codeInput.trim(),
          firstName: pendingData.firstName,
          lastName: pendingData.lastName,
          phone: pendingData.fullPhone,
          cleanPhone: pendingData.cleanPhone
        })
      });
      const json = await res.json();
      if(!res.ok) throw new Error(json.error || 'Грешен код');

      const newUser = json.user;
      const u={id:newUser.id,firstName:newUser.first_name,lastName:newUser.last_name,phone:newUser.phone,email:newUser.email};
      localStorage.setItem('vozime_current',JSON.stringify(u)); setCurrentUser(u); 
      setVerificationStep('form'); setPendingData(null); setCodeInput(''); setCodeForTest(null); setLoginForm({firstName:'',lastName:'',phone:'',email:''});
      showToast('✅ Регистрация успешна!');
    }catch(e:any){
      alert('Грешка: '+e.message);
    }
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

  const filteredMarketShops = shops.filter(s=>!marketSearch || s.name.toLowerCase().includes(marketSearch.toLowerCase()));
  const filteredMarketProducts = marketProducts.filter(p=>{ if(marketSearch &&!(p.name.toLowerCase().includes(marketSearch.toLowerCase()))) return false; if(marketCat!=='Всички' &&!(p.description||'').includes(`[${marketCat}]`)) return false; return true; });
  const filteredMyProducts = myShopProducts.filter(p=>{ if(prodSearch &&!(p.name.toLowerCase().includes(prodSearch.toLowerCase()))) return false; if(prodCatFilter!=='Всички' &&!(p.description||'').includes(`[${prodCatFilter}]`)) return false; return true; });
  const driverSource = sortedClientOrders.length>0? [...myShopOrders.filter(o=>o.driver_requested === true && o.status!== 'delivered' && o.status!== 'cancelled'),...sortedClientOrders] : myShopOrders;
  const driverAll = driverSource.filter((o:any)=> o.driver_requested === true && o.status!== 'delivered' && o.status!== 'cancelled');
  const availableFree = driverAll.filter((o:any)=>!o.driver_phone);
  const baseAvailable = driverAll.filter((o:any)=>(!o.driver_phone || o.driver_phone===currentUser?.phone) && o.status!== 'delivered');
  const availableDriverOrders = driverOnline? baseAvailable : baseAvailable.filter((o:any)=> o.driver_phone===currentUser?.phone);
  const myTakenOrders = availableDriverOrders.filter((o:any)=> o.driver_phone===currentUser?.phone);
  const pendingShopOrders = myTakenOrders.filter((o:any)=> ['on_the_way_to_shop','ready_for_driver'].includes(o.status));
  const pickedUpOrders = myTakenOrders.filter((o:any)=> ['picked_up','on_the_way'].includes(o.status));
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
    if(active.length>=3){ alert('Лимит 3 взети!'); return; }
    await supabase.from('orders').update({driver_phone:currentUser.phone, status:'on_the_way_to_shop'}).eq('id',orderId);
    setMyShopOrders(prev=> prev.map(o=> o.id===orderId? {...o, driver_phone:currentUser.phone, status:'on_the_way_to_shop'} : o));
    showToast(`✅ Взе #${orderId.slice(0,6)} - ${active.length+1}/3`);
  };
  const refuseOrder = async (orderId:string)=>{ await supabase.from('orders').update({driver_phone:null, driver_requested:false, status:'preparing'}).eq('id',orderId); };
  const sortClientsByNearest = async ()=>{
    const ordersToSort = pickedUpOrders.length>0? pickedUpOrders : myTakenOrders.filter((o:any)=> o.status==='picked_up' || o.status==='on_the_way');
    if(ordersToSort.length===0) return;
    try{
      showToast('📍 Търся GPS за най-близък клиент...');
      let origin:any = null;
      try{ origin = await getCurrentPos(); }catch{}
      if(!origin){
        const firstShop = shops.find(s=>s.id===ordersToSort[0].shop_id);
        origin = await geocodeAddress(firstShop?.address || firstShop?.city || 'Portsmouth');
      }
      if(!origin){
        const withDist = ordersToSort.map((o:any, idx:number)=>({...o, _dist: idx*1.0 }));
        setSortedClientOrders(withDist);
        showToast('⚠️ Без GPS - позволи локация за точно най-близък');
        return;
      }
      const withDist = await Promise.all(ordersToSort.map(async (o:any)=>{
        const custCoords = await geocodeAddress(o.address);
        const dist = custCoords? calcDistance(origin, custCoords) : 9999;
        return {...o, _dist: dist, _coords: custCoords};
      }));
      withDist.sort((a,b)=> (a._dist||9999) - (b._dist||9999));
      setSortedClientOrders(withDist);
      if(withDist[0]._dist < 9000){
        showToast(`🧭 Авто: най-близък #${withDist[0].id.slice(0,6)} - ${withDist[0]._dist.toFixed(1)}км - ${withDist[0].address}`);
      } else {
        showToast(`🧭 Сортирани ${withDist.length} - позволи GPS за точно разстояние`);
      }
    }catch(e){
      showToast('GPS грешка - позволи локация');
      setSortedClientOrders(ordersToSort.map((o:any, i:number)=>({...o, _dist: i})));
    }
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
  useEffect(()=>{
    if(pendingShopOrders.length===0 && pickedUpOrders.length>0){
      if(sortedClientOrders.length===0 || sortedClientOrders.length!== pickedUpOrders.length){
        sortClientsByNearest();
      }
    }
  }, [pendingShopOrders.length, pickedUpOrders.length]);

  const logout=()=>{ localStorage.removeItem('vozime_current'); setCurrentUser(null); setTab('market'); };

  if(!currentUser){
    if(verificationStep==='verify'){
      return (<main style={{position:'fixed',inset:0,display:'flex',alignItems:'center',justifyContent:'center',background:'#0F4C75',padding:'16px'}}><div style={{background:'white',padding:'24px',borderRadius:'24px',width:'100%',maxWidth:'380px',textAlign:'center'}}><div style={{fontSize:'32px'}}>📧</div><b style={{fontSize:'18px'}}>Въведи кода</b><div style={{fontSize:'13px', marginTop:'8px', color:'#444', lineHeight:'1.4'}}>Код за <b>{pendingData?.email}</b>{codeForTest && <><br/><div style={{marginTop:'10px', background:'#f0fdf4', border:'2px dashed #22c55e', padding:'12px', borderRadius:'12px'}}><div style={{fontSize:'11px', color:'#666'}}>ТВОЯТ КОД:</div><div style={{fontSize:'32px', fontWeight:'900', letterSpacing:'8px', color:'#0F4C75', marginTop:'4px'}}>{codeForTest}</div></div></>}<br/><span style={{fontSize:'11px', color:'#888'}}>Валиден 10 мин.</span></div><input value={codeInput} onChange={e=>setCodeInput(e.target.value)} placeholder="000000" maxLength={6} style={{width:'100%',padding:'16px',borderRadius:'14px',border:'2px solid #0F4C75',marginTop:'16px',textAlign:'center',fontSize:'24px',letterSpacing:'6px',fontWeight:'800'}}/><button onClick={handleVerifyCode} style={{width:'100%',padding:'16px',background:'#22c55e',color:'white',border:'none',borderRadius:'14px',marginTop:'12px',fontWeight:'900',fontSize:'16px'}}>✅ Потвърди и влез</button><button onClick={()=>{setVerificationStep('form'); setPendingData(null); setCodeInput('');}} style={{width:'100%',padding:'12px',background:'white',color:'#666',border:'1px solid #ddd',borderRadius:'12px',marginTop:'8px',fontSize:'13px'}}>← Назад</button></div></main>);
    }
    return (<main style={{position:'fixed',inset:0,display:'flex',alignItems:'center',justifyContent:'center',background:'#0F4C75',padding:'16px'}}><div style={{background:'white',padding:'20px',borderRadius:'24px',width:'100%',maxWidth:'380px'}}><div style={{fontWeight:'800',fontSize:'22px',color:'#0F4C75',textAlign:'center'}}>🛒 VoziMe</div><div style={{fontSize:'11px',textAlign:'center',color:'#22c55e',fontWeight:'800',marginTop:'4px'}}>РЕГИСТРАЦИЯ > КОД > ВЪВЕЖДАНЕ > ВХОД</div><div style={{display:'flex',background:'#f1f3f4',borderRadius:'12px',padding:'3px',margin:'16px 0'}}><button onClick={()=>setLoginTab('login')} style={{flex:1,padding:'10px',borderRadius:'8px',border:'none',fontWeight:'bold',background:loginTab==='login'?'#0F4C75':'white',color:loginTab==='login'?'white':'#666'}}>Вход</button><button onClick={()=>setLoginTab('register')} style={{flex:1,padding:'10px',borderRadius:'8px',border:'none',fontWeight:'bold',background:loginTab==='register'?'#0F4C75':'white',color:loginTab==='register'?'white':'#666'}}>Регистрация</button></div>{loginTab==='register' && (<><input placeholder="Име" value={loginForm.firstName} onChange={e=>setLoginForm({...loginForm,firstName:e.target.value})} style={{width:'100%',padding:'14px',borderRadius:'12px',border:'1px solid #e5e7eb',marginBottom:'10px'}}/><input placeholder="Фамилия" value={loginForm.lastName} onChange={e=>setLoginForm({...loginForm,lastName:e.target.value})} style={{width:'100%',padding:'14px',borderRadius:'12px',border:'1px solid #e5e7eb',marginBottom:'10px'}}/><input placeholder="Имейл" value={loginForm.email} onChange={e=>setLoginForm({...loginForm,email:e.target.value})} style={{width:'100%',padding:'14px',borderRadius:'12px',border:'1px solid #e5e7eb',marginBottom:'10px'}}/></>)}<input placeholder="Телефон +447..." value={loginForm.phone} onChange={e=>setLoginForm({...loginForm,phone:e.target.value})} style={{width:'100%',padding:'14px',borderRadius:'12px',border:'1px solid #e5e7eb',marginBottom:'16px'}}/><button onClick={handleAuth} disabled={isSendingCode} style={{width:'100%',padding:'16px',background:'#22c55e',border:'none',borderRadius:'14px',fontWeight:'bold',color:'white',fontSize:'16px'}}>{isSendingCode? 'Пращам код...' : loginTab==='login' ? '🔑 Влез' : '📧 Изпрати код'}</button></div></main>);
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
        {(myShopProfile?.role==='driver' || isAdmin) && <button onClick={()=>setTab('driver')} style={{flex:1,padding:'10px',borderRadius:'10px',border:'none',fontWeight:'bold',fontSize:'11px',background:tab==='driver'?'#0F4C75':'#f3f4f6',color:tab==='driver'?'white':'#666'}}>🚚 Доставки ({myTakenOrders.length}/{availableFree.length})</button>}
        {isAdmin && <button onClick={()=>setTab('admin')} style={{flex:1,padding:'10px',borderRadius:'10px',border:'none',fontWeight:'bold',fontSize:'10px',background:tab==='admin'?'#FFD60A':'#f3f4f6',color:tab==='admin'?'black':'#666'}}>👑 Админ</button>}
      </div>
      <div style={{flex:1,overflowY:'auto',padding:'10px',display:'flex',flexDirection:'column',gap:'12px'}}>
        {tab==='market' && (<>{!selectedShop? (<><div style={{background:'#22c55e',color:'white',padding:'14px',borderRadius:'14px'}}><b>🛒 Пазар LIVE</b><input value={marketSearch} onChange={e=>setMarketSearch(e.target.value)} placeholder="🔍 Магазин или продукт..." style={{width:'100%',marginTop:'10px',padding:'10px',borderRadius:'10px',border:'none'}}/><div style={{display:'flex',gap:'4px',marginTop:'8px',overflowX:'auto'}}>{PRODUCT_CATS.map(c=><button key={c} onClick={()=>setMarketCat(c)} style={{padding:'6px 10px',borderRadius:'20px',border:'none',background:marketCat===c?'black':'white',color:marketCat===c?'white':'black',fontSize:'11px',fontWeight:'bold'}}>{c}</button>)}</div></div>{filteredMarketShops.map((s:any)=>(<div key={s.id} onClick={()=> s.vip_active===false? showToast('🔴 Затворен') : loadMarketProducts(s.id)} style={{background:'white',border: s.vip_active===false? '2px solid #FF3B30' : '2px solid #22c55e',borderRadius:'14px',padding:'14px'}}><div style={{display:'flex',justifyContent:'space-between'}}><b>{s.name}</b><span style={{fontSize:'10px',background: s.vip_active===false? '#FF3B30' : '#22c55e',color:'white',padding:'4px 8px',borderRadius:'10px'}}>{s.vip_active===false? '🔴 Затворен' : '🟢 Отворен LIVE'}</span></div><div style={{fontSize:'12px',color:'#666',marginTop:'4px'}}>📍 {s.address||s.city} • {s.delivery_fee}€</div></div>))}</>):(<><button onClick={()=>{setSelectedShop(null); setMarketProducts([]); setCart([]);}} style={{padding:'10px',borderRadius:'10px',border:'1px solid #ddd',background:'white',fontWeight:'bold'}}>← Назад към магазини</button><div style={{background:'#0F4C75',color:'white',padding:'12px',borderRadius:'12px'}}><b>🏪 {selectedShop?.name} • {selectedShop?.delivery_fee}€ доставка</b><div style={{fontSize:'11px'}}>📍 {selectedShop?.address} • {selectedShop?.city}</div></div>{filteredMarketProducts.map((p:any)=>(<div key={p.id} style={{background:'white',borderRadius:'14px',padding:'12px',display:'flex',gap:'12px',border:'1px solid #e5e7eb'}}>{p.image_url && <img src={p.image_url} style={{width:'70px',height:'70px',objectFit:'cover',borderRadius:'10px'}}/>}<div style={{flex:1}}><b>{p.name}</b><div style={{fontSize:'11px',color:'#666'}}>{(p.description||'').replace(/^\[.*?\]\s*/,'')} • [{(p.description?.match(/^\[(.*?)\]/)||[])[1]||'Други'}]</div><div style={{fontWeight:'800',color:'#22c55e'}}>{p.price}€</div></div><div>{cart.find(c=>c.product.id===p.id)? (<div style={{display:'flex',gap:'6px',alignItems:'center'}}><button onClick={()=>decCart(p.id)} style={{width:'28px',height:'28px',borderRadius:'50%',border:'none'}}>−</button><b>{cart.find(c=>c.product.id===p.id)?.qty}</b><button onClick={()=>incCart(p.id)} style={{width:'28px',height:'28px',borderRadius:'50%',border:'none',background:'#22c55e',color:'white'}}>+</button></div>) : <button onClick={()=>addToCart(p)} style={{background:'#22c55e',color:'white',border:'none',padding:'10px 14px',borderRadius:'10px'}}>Добави</button>}</div></div>))}{cart.length>0 && (<div style={{background:'white',border:'3px solid #22c55e',borderRadius:'16px',padding:'14px',position:'sticky',bottom:'0'}}><b>🛒 {cart.reduce((s,c)=>s+c.qty,0)} продукта</b><div style={{fontWeight:'800',marginTop:'8px'}}>{getCartTotal().toFixed(2)}€ с доставка</div><input value={customerAddr} onChange={e=>setCustomerAddr(e.target.value)} placeholder="📍 Улица + НОМЕР + град + код! Пример: Chatsworth avenue 15, PO21 2DA" style={{width:'100%',padding:'12px',marginTop:'10px',borderRadius:'10px',border:'2px solid #22c55e'}}/><button onClick={placeOrder} style={{width:'100%',marginTop:'10px',padding:'14px',background:'#22c55e',color:'white',border:'none',borderRadius:'12px',fontWeight:'800'}}>✅ Поръчай за {getCartTotal().toFixed(2)}€</button></div>)}</>)} </>)}
        {tab==='my_orders' && (<div style={{display:'flex',flexDirection:'column',gap:'10px'}}><div style={{background:'#0F4C75',color:'white',padding:'12px',borderRadius:'12px'}}><b>📦 Мои поръчки - {customerOrders.length}</b></div>{customerOrders.map((o:any)=>{ const isArrived = o.status==='arrived_at_client'; return (<div key={o.id} style={{background:'white',border: isArrived? '3px solid #f59e0b' : '2px solid #0F4C75',borderRadius:'12px',padding:'12px'}}><div style={{display:'flex',justifyContent:'space-between'}}><b>#{o.id.slice(0,8)} • {parseFloat(o.total).toFixed(2)}€</b><span style={{fontSize:'10px',background: isArrived? '#f59e0b' : '#22c55e',color:'white',padding:'6px 10px',borderRadius:'20px',fontWeight:'900'}}>{isArrived? '📍 На вратата!' : o.status}</span></div>{isArrived && <div style={{marginTop:'8px',background:'#f59e0b',color:'white',padding:'12px',borderRadius:'10px',textAlign:'center',fontWeight:'900',fontSize:'16px',border:'3px solid black',animation:'pulse 1s infinite'}}>🔔 ШОФЬОРЪТ Е НА ВРАТАТА ТИ! 🔔<br/><span style={{fontSize:'12px',background:'white',color:'black',padding:'4px 8px',borderRadius:'6px',marginTop:'6px',display:'inline-block'}}>Излез да си вземеш поръчката!</span></div>}<div style={{fontSize:'11px',marginTop:'6px',background:'#fff3cd',padding:'8px',borderRadius:'8px'}}>📍 {o.address}</div><div style={{fontSize:'12px',marginTop:'6px',background:'#f0fdf4',padding:'8px',borderRadius:'8px'}}><b>🛒 Поръчка:</b><br/>{o.items?.map((i:any)=><div key={i.id} style={{display:'flex',justifyContent:'space-between'}}><span>• {i.name} x{i.qty}</span><span>{(i.price*i.qty).toFixed(2)}€</span></div>)}</div>{o.driver_phone && <div style={{fontSize:'11px',marginTop:'6px',background:'#e0f2fe',padding:'8px',borderRadius:'8px'}}>🚚 Шофьор: {o.driver_phone}</div>}</div>);})}</div>)}
        {tab==='my_shop' && (<div style={{display:'flex',flexDirection:'column',gap:'12px'}}><div style={{background: myShopData?.vip_active===false? '#fee2e2' : '#f0fdf4',border: myShopData?.vip_active===false? '2px solid #FF3B30' : '2px solid #22c55e',borderRadius:'14px',padding:'12px'}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><div><b>🏪 Моя магазин</b><div style={{fontSize:'11px'}}>{myShopData?.name} • {myShopData?.vip_active===false? '🔴 Затворен' : '🟢 Отворен'} • {myShopProducts.length} продукта</div></div><button onClick={toggleMyShopOnline} style={{background: myShopData?.vip_active===false? '#22c55e' : '#FF3B30',color:'white',border:'none',padding:'12px 16px',borderRadius:'10px',fontWeight:'800'}}>{myShopData?.vip_active===false? '▶️ Отвори' : '⏸️ Затвори'}</button></div></div><div style={{background:'white',border:'2px solid #f59e0b',borderRadius:'14px',padding:'12px'}}><b>➕ {editingProduct? 'Редактирай' : 'Нов'} продукт</b><input value={newProdName} onChange={e=>setNewProdName(e.target.value)} placeholder="Име" style={{width:'100%',padding:'10px',marginTop:'8px',borderRadius:'8px',border:'1px solid #ddd'}}/><input value={newProdPrice} onChange={e=>setNewProdPrice(e.target.value)} placeholder="Цена €" style={{width:'100%',padding:'10px',marginTop:'6px',borderRadius:'8px',border:'1px solid #ddd'}}/><input value={newProdDesc} onChange={e=>setNewProdDesc(e.target.value)} placeholder="Описание" style={{width:'100%',padding:'10px',marginTop:'6px',borderRadius:'8px',border:'1px solid #ddd'}}/><div style={{display:'flex',gap:'6px',marginTop:'6px'}}><select value={newProdCat} onChange={e=>setNewProdCat(e.target.value)} style={{flex:1,padding:'10px',borderRadius:'8px'}}>{PRODUCT_CATS.filter(c=>c!=='Всички').map(c=><option key={c}>{c}</option>)}</select><label style={{display:'flex',alignItems:'center',gap:'4px',fontSize:'12px'}}><input type="checkbox" checked={newProdActive} onChange={e=>setNewProdActive(e.target.checked)}/>Активен</label></div><input type="file" onChange={e=>setNewProdFile(e.target.files?.[0]||null)} style={{marginTop:'6px'}}/><div style={{display:'flex',gap:'6px',marginTop:'8px'}}><button onClick={addProductWithImage} style={{flex:1,background:'#22c55e',color:'white',border:'none',padding:'12px',borderRadius:'10px',fontWeight:'800'}}>{editingProduct? '💾 Запази' : '➕ Добави'}</button>{editingProduct && <button onClick={cancelEditProduct} style={{background:'#fee2e2',border:'none',padding:'12px',borderRadius:'10px'}}>Отказ</button>}</div></div><div style={{background:'white',border:'1px solid #e5e7eb',borderRadius:'14px',padding:'12px'}}><div style={{display:'flex',justifyContent:'space-between'}}><b>📦 Мои продукти - {filteredMyProducts.length}</b><input value={prodSearch} onChange={e=>setProdSearch(e.target.value)} placeholder="🔍" style={{padding:'6px 10px',borderRadius:'20px',border:'1px solid #ddd',fontSize:'11px'}}/></div><div style={{display:'flex',gap:'4px',marginTop:'8px',overflowX:'auto'}}>{PRODUCT_CATS.map(c=><button key={c} onClick={()=>setProdCatFilter(c)} style={{padding:'4px 8px',borderRadius:'20px',border:'none',background:prodCatFilter===c?'black':'#f3f4f6',color:prodCatFilter===c?'white':'#666',fontSize:'10px'}}>{c}</button>)}</div>{filteredMyProducts.map((p:any)=>(<div key={p.id} style={{border:'1px solid #e5e7eb',borderRadius:'10px',padding:'10px',marginTop:'8px',display:'flex',gap:'10px'}}>{p.image_url && <img src={p.image_url} style={{width:'50px',height:'50px',objectFit:'cover',borderRadius:'8px'}}/>}<div style={{flex:1}}><b>{p.name}</b><div style={{fontSize:'11px'}}>{p.price}€</div></div><button onClick={()=>startEditProduct(p)} style={{background:'#0F4C75',color:'white',border:'none',padding:'6px 10px',borderRadius:'8px'}}>✏️</button><button onClick={()=>deleteProduct(p.id)} style={{background:'#FF3B30',color:'white',border:'none',padding:'6px 10px',borderRadius:'8px'}}>🗑️</button></div>))}</div><div style={{background:'white',border:'2px solid #22c55e',borderRadius:'14px',padding:'12px'}}><b>📦 Поръчки към моя магазин - {myShopOrders.length}</b>{myShopOrders.map((o:any)=>(<div key={o.id} style={{border:'2px solid #0F4C75',borderRadius:'12px',padding:'10px',marginTop:'10px'}}><div style={{display:'flex',justifyContent:'space-between'}}><b>#{o.id.slice(0,8)} • {o.customer_name} • {parseFloat(o.total).toFixed(2)}€</b><span style={{fontSize:'10px',background:'#f59e0b',padding:'4px 8px',borderRadius:'8px'}}>{o.status}</span></div><div style={{fontSize:'11px',marginTop:'4px',background:'#fff3cd',padding:'8px',borderRadius:'8px'}}>📍 {o.address}</div><div style={{fontSize:'12px',marginTop:'6px',background:'#f0fdf4',padding:'10px',borderRadius:'8px',border:'2px solid #22c55e'}}><div style={{fontWeight:'900',marginBottom:'6px'}}>🛒 ЗА ПРИГОТВЯНЕ:</div>{o.items?.map((it:any)=><div key={it.id} style={{display:'flex',justifyContent:'space-between',padding:'4px 0',borderBottom:'1px solid #dcfce7'}}><span>• {it.name} <b>x{it.qty}</b></span><span style={{fontWeight:'800'}}>{(it.price*it.qty).toFixed(2)}€</span></div>)}<div style={{textAlign:'right',marginTop:'6px',fontWeight:'900'}}>Общо: {parseFloat(o.total).toFixed(2)}€</div></div><div style={{display:'flex',gap:'6px',marginTop:'8px',flexWrap:'wrap'}}>{o.status==='new' && <button onClick={()=>updateOrderStatus(o.id,'accepted')} style={{flex:1,background:'#22c55e',color:'white',border:'none',padding:'10px',borderRadius:'8px',fontWeight:'800'}}>✅ Приеми</button>}{o.status==='accepted' && <button onClick={()=>updateOrderStatus(o.id,'preparing')} style={{flex:1,background:'#f59e0b',color:'white',border:'none',padding:'10px',borderRadius:'8px',fontWeight:'800'}}>👨‍🍳 Готвя</button>}{(o.status==='preparing' || o.status==='accepted') &&!o.driver_requested && <button onClick={()=>requestDriverForOrder(o.id)} style={{flex:1,background:'#0F4C75',color:'white',border:'none',padding:'10px',borderRadius:'8px',fontWeight:'800'}}>🚚 Искай шофьор</button>}{o.driver_requested && <div style={{background:'#e0f2fe',padding:'8px',borderRadius:'8px',fontSize:'11px',flex:1}}>🚚 {o.driver_phone||'чака се...'}</div>}<button onClick={()=>openNavigation(o.address)} style={{background:'#22c55e',color:'white',border:'none',padding:'10px',borderRadius:'8px'}}>🧭</button></div></div>))}</div></div>)}
        {tab==='driver' && (
          <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
            <div style={{background:'#0F4C75',color:'white',padding:'12px',borderRadius:'12px'}}>
              <div style={{display:'flex',justifyContent:'space-between'}}><div><b>🚚 Доставки</b><div style={{fontSize:'10px'}}>{driverOnline? '🟢 Онлайн' : '🔴 Офлайн'} • Взети: {myTakenOrders.length}/3 • Свободни: {availableFree.length} • Днес: {todayEarnings.toFixed(2)}€</div></div><button onClick={toggleDriverOnline} style={{background:driverOnline?'#22c55e':'#FF3B30',color:'white',border:'none',padding:'10px 14px',borderRadius:'12px',fontWeight:'800'}}>{driverOnline? '🟢' : '🔴'}</button></div>
            </div>
            {availableFree.length>0 && (
              <div style={{background:'white',border:'3px solid #FFD60A',borderRadius:'14px',padding:'12px'}}>
                <b>📥 Свободни - {availableFree.length}</b>
                {availableFree.map((o:any)=>{
                  const shop = shops.find(s=>s.id===o.shop_id);
                  const sameShop = myTakenOrders.some((t:any)=>t.shop_id===o.shop_id);
                  const prodTotal = o.items?.reduce((s:any,it:any)=> s + (parseFloat(it.price||0)*(it.qty||1)),0) || 0;
                  return (
                    <div key={o.id} style={{border: sameShop? '3px solid #22c55e' : '2px solid #0F4C75',borderRadius:'12px',padding:'10px',marginTop:'10px',background: sameShop? '#f0fdf4' : 'white'}}>
                      {sameShop && <div style={{fontSize:'10px',background:'#22c55e',color:'white',padding:'4px 8px',borderRadius:'6px',fontWeight:'900',marginBottom:'6px'}}>⭐ СЪЩИЯ МАГАЗИН</div>}
                      <div style={{display:'flex',justifyContent:'space-between'}}><b>#{o.id.slice(0,8)} • {o.customer_name||''}</b><span style={{fontSize:'10px',background:'#f59e0b',padding:'4px 8px',borderRadius:'8px'}}>{o.status}</span></div>
                      <div style={{fontSize:'11px',marginTop:'6px',background:'#e0f2fe',padding:'8px',borderRadius:'8px'}}><b>🏪 {shop?.name}</b><br/>{shop?.address}</div>
                      <div style={{fontSize:'11px',marginTop:'6px',background:'#f0fdf4',padding:'8px',borderRadius:'8px'}}><b>🛒 {o.items?.length||0} продукта:</b> {o.items?.map((i:any)=>`${i.name} x${i.qty}`).join(', ')}<br/><span style={{fontWeight:'800'}}>Стока: {prodTotal.toFixed(2)}€ + Доставка {shop?.delivery_fee||'4.99'}€ = <b>{parseFloat(o.total).toFixed(2)}€ КЕШ</b></span></div>
                      <div style={{fontSize:'11px',marginTop:'6px',background:'#fff3cd',padding:'8px',borderRadius:'8px',fontWeight:'800'}}>📍 {o.address}</div>
                      <button onClick={()=>assignDriverToOrder(o.id)} style={{width:'100%',marginTop:'8px',background: sameShop? '#22c55e' : '#0F4C75',color:'white',border:'none',padding:'12px',borderRadius:'10px',fontWeight:'900'}}>✅ Приеми • {parseFloat(o.total).toFixed(2)}€</button>
                    </div>
                  )
                })}
              </div>
            )}
            {pendingShopOrders.length>0 && (
              <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
                <div style={{background:'black',color:'#FFD60A',padding:'12px',borderRadius:'12px',border:'2px solid #FFD60A'}}><b>🏪 КЪМ МАГАЗИНА - {pendingShopOrders.length}</b></div>
                {shopIdsForPickup.map((shopId:string)=>{
                  const shopOrders = groupedByShop[shopId];
                  const shop = shops.find(s=>s.id===shopId);
                  const isArrived = arrivedShops[shopId];
                  return (
                    <div key={shopId} style={{background:'white',border:'4px solid black',borderRadius:'16px',padding:'14px'}}>
                      <div style={{display:'flex',justifyContent:'space-between'}}><b>🏪 {shop?.name}</b><span style={{fontSize:'11px',background:'black',color:'#FFD60A',padding:'6px 10px',borderRadius:'20px'}}>{shopOrders.length}</span></div>
                      <div style={{marginTop:'8px',background:'#e0f2fe',border:'3px solid #0F4C75',padding:'12px',borderRadius:'10px'}}>
                        <div style={{fontSize:'10px',fontWeight:'900'}}>📍 МАГАЗИН:</div>
                        <div style={{fontSize:'15px',fontWeight:'900',marginTop:'4px',background:'white',padding:'8px',borderRadius:'8px',border:'2px solid black'}}>{shop?.address} • {shop?.city}</div>
                      </div>
                      {!isArrived? (
                        <>
                          <button onClick={()=>openNavigation(shop?.address||'')} style={{width:'100%',marginTop:'12px',background:'black',color:'#FFD60A',border:'none',padding:'16px',borderRadius:'12px',fontWeight:'900',fontSize:'16px'}}>🧭 КЪМ МАГАЗИНА</button>
                          <button onClick={()=>setArrivedShops(prev=>({...prev,[shopId]:true}))} style={{width:'100%',marginTop:'8px',background:'white',border:'3px solid black',padding:'14px',borderRadius:'12px',fontWeight:'900'}}>📍 ПРИСТИГНАХ</button>
                        </>
                      ) : (
                        <div style={{marginTop:'10px'}}>
                          <div style={{background:'#FFD60A',color:'black',padding:'10px',borderRadius:'10px',border:'2px solid black',fontWeight:'900',textAlign:'center'}}>📱 ПОКАЖИ #{shopOrders.map((o:any)=>o.id.slice(0,6)).join(', #')}</div>
                          {shopOrders.map((o:any)=>(
                            <div key={o.id} style={{border:'3px solid black',borderRadius:'12px',padding:'12px',marginTop:'10px',background:'#f9fafb'}}>
                              <div style={{display:'flex',justifyContent:'space-between'}}><b>#{o.id.slice(0,8)} • {o.customer_name||''} • {parseFloat(o.total).toFixed(2)}€ КЕШ</b><span style={{fontSize:'10px',background:'#fff3cd',padding:'4px 8px',borderRadius:'6px'}}>{o.address.slice(0,30)}</span></div>
                              <div style={{fontSize:'11px',marginTop:'6px',background:'#f0fdf4',padding:'8px',borderRadius:'8px',border:'1px solid #22c55e'}}><b>🛒 {o.items?.length||0} бр:</b> {o.items?.map((i:any)=>`${i.name} x${i.qty}`).join(', ')}<br/><b>Общо: {parseFloat(o.total).toFixed(2)}€</b></div>
                              <div style={{display:'flex',gap:'6px',marginTop:'10px'}}>
                                <button onClick={()=>updateOrderStatus(o.id,'picked_up')} style={{flex:1,background:'#22c55e',color:'white',border:'none',padding:'14px',borderRadius:'10px',fontWeight:'900'}}>✅ ВЗЕХ {parseFloat(o.total).toFixed(2)}€</button>
                                <button onClick={()=>refuseOrder(o.id)} style={{background:'#fee2e2',border:'2px solid #FF3B30',padding:'14px',borderRadius:'10px'}}>❌</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {pendingShopOrders.length===0 && pickedUpOrders.length>0 && (
              <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
                <div style={{background:'black',color:'#FFD60A',padding:'12px',borderRadius:'12px',border:'2px solid #FFD60A',display:'flex',justifyContent:'space-between'}}>
                  <b>👤 КЪМ КЛИЕНТИ - {pickedUpOrders.length}</b>
                  <button onClick={sortClientsByNearest} style={{background:'#FFD60A',color:'black',border:'none',padding:'6px 10px',borderRadius:'8px',fontWeight:'900',fontSize:'10px'}}>🤖 Подреди</button>
                </div>
                {(() => {
                  const activeClient = sortedClientOrders.length>0? sortedClientOrders[0] : pickedUpOrders[0];
                  const queue = sortedClientOrders.length>0? sortedClientOrders.slice(1) : pickedUpOrders.slice(1);
                  if(!activeClient) return null;
                  const shop = shops.find(s=>s.id===activeClient.shop_id);
                  const productsTotal = activeClient.items?.reduce((s:any,it:any)=> s + (parseFloat(it.price||0)*(it.qty||1)),0) || 0;
                  const deliveryFee = shop ? parseFloat(shop.delivery_fee||'4.99') : (parseFloat(activeClient.total)-productsTotal>0? parseFloat(activeClient.total)-productsTotal : 4.99);
                  const hasArrived = arrivedClients[activeClient.id] || activeClient.status==='arrived_at_client';
                  return (
                    <>
                      <div style={{background:'white',border:'4px solid #22c55e',borderRadius:'16px',padding:'14px'}}>
                        <div style={{display:'flex',justifyContent:'space-between'}}><b>#{activeClient.id.slice(0,8)} • {activeClient.customer_name||''}</b><span style={{fontSize:'11px',background:hasArrived?'#f59e0b':'#22c55e',color:'white',padding:'6px 10px',borderRadius:'20px'}}>{hasArrived? '📍 На вратата' : (activeClient._dist!==undefined? `${activeClient._dist.toFixed(1)}км` : activeClient.status)}</span></div>
                        <div style={{marginTop:'10px',background:'#fff3cd',border:'2px solid black',padding:'10px',borderRadius:'10px'}}>
                          <div style={{fontSize:'10px',fontWeight:'900'}}>📍 КЛИЕНТ + ТЕЛЕФОН:</div>
                          <div style={{fontSize:'14px',fontWeight:'800',marginTop:'4px'}}>{activeClient.customer_name||''} • {activeClient.customer_phone||''}</div>
                          <div style={{fontSize:'16px',fontWeight:'900',marginTop:'6px',background:'white',padding:'8px',borderRadius:'8px',border:'2px solid black'}}>{activeClient.address}</div>
                        </div>
                        <div style={{marginTop:'10px',background:'#f0fdf4',border:'2px solid #22c55e',padding:'10px',borderRadius:'10px'}}>
                          <div style={{fontSize:'11px',fontWeight:'900',marginBottom:'6px'}}>🛒 КАКВО НОСИШ:</div>
                          {activeClient.items?.map((it:any)=><div key={it.id} style={{display:'flex',justifyContent:'space-between',fontSize:'12px',padding:'4px 0',borderBottom:'1px solid #dcfce7'}}><span>• {it.name} x{it.qty}</span><span style={{fontWeight:'800'}}>{(parseFloat(it.price)*it.qty).toFixed(2)}€</span></div>)}
                          <div style={{marginTop:'8px',borderTop:'2px solid #22c55e',paddingTop:'8px',fontSize:'12px'}}>
                            <div style={{display:'flex',justifyContent:'space-between'}}><span>Стока:</span><span style={{fontWeight:'800'}}>{productsTotal.toFixed(2)}€</span></div>
                            <div style={{display:'flex',justifyContent:'space-between'}}><span>Доставка:</span><span style={{fontWeight:'800'}}>{deliveryFee.toFixed(2)}€</span></div>
                            <div style={{display:'flex',justifyContent:'space-between',marginTop:'4px',background:'black',color:'#FFD60A',padding:'6px 8px',borderRadius:'8px',fontWeight:'900',fontSize:'14px'}}><span>ОБЩО КЕШ:</span><span>{parseFloat(activeClient.total).toFixed(2)}€</span></div>
                          </div>
                        </div>
                        <button onClick={()=>openNavigation(activeClient.address)} style={{width:'100%',marginTop:'12px',background:'black',color:'#FFD60A',border:'none',padding:'14px',borderRadius:'12px',fontWeight:'900',fontSize:'14px'}}>🧭 НАВИГИРАЙ КЪМ КЛИЕНТА</button>
                        {!hasArrived ? (
                          <button onClick={async()=>{
                            setArrivedClients(prev=>({...prev,[activeClient.id]:true}));
                            await updateOrderStatus(activeClient.id,'arrived_at_client');
                            showToast('📍 Изпратено: Шофьорът е на вратата!');
                          }} style={{width:'100%',marginTop:'8px',background:'#f59e0b',color:'white',border:'none',padding:'18px',borderRadius:'14px',fontWeight:'900',fontSize:'16px'}}>📍 ПРИСТИГНАХ ПРИ КЛИЕНТА</button>
                        ) : (
                          <>
                            <div style={{marginTop:'10px',background:'#fff3cd',border:'3px solid #f59e0b',padding:'10px',borderRadius:'10px',textAlign:'center',fontWeight:'900'}}>⏳ Клиентът е уведомен че си на вратата!</div>
                            <button onClick={async()=>{
                              await updateOrderStatus(activeClient.id,'delivered');
                              await upsertDriverStatus(driverOnline, todayEarnings + deliveryFee, todayDeliveredOrders.length+1);
                              setArrivedClients(prev=>{const n={...prev}; delete n[activeClient.id]; return n;});
                              showToast(queue.length>0? `✅ Завършена! Към #${queue[0].id.slice(0,6)}` : `🏁 Всички доставени!`);
                              if(queue.length>0){ setTimeout(()=>openNavigation(queue[0].address), 600); } else setSortedClientOrders([]);
                            }} style={{width:'100%',marginTop:'8px',background:'#22c55e',color:'white',border:'none',padding:'18px',borderRadius:'14px',fontWeight:'900',fontSize:'18px'}}>✅ ВЗЕХ КЕШ {parseFloat(activeClient.total).toFixed(2)}€ И ЗАВЪРШИ</button>
                          </>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        )}
        {tab==='admin' && isAdmin && (
          <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
            <div style={{background:'#FFD60A',padding:'14px',borderRadius:'14px',border:'2px solid black'}}><b>👑 Админ панел - ПЪЛЕН ✅</b><div style={{fontSize:'11px'}}>Магазини: {shops.length} • Шофьори LIVE: {driverStatuses.filter((d:any)=>d.is_online).length} • САМО 1 ФАЙЛ</div></div>
            <div style={{background:'white',border:'2px solid #0F4C75',borderRadius:'14px',padding:'12px'}}>
              <b>{editShopData? '✏️ Редактирай магазин' : '➕ Нов магазин'}</b>
              <input value={shopName} onChange={e=>setShopName(e.target.value)} placeholder="Име магазин" style={{width:'100%',padding:'10px',marginTop:'8px',borderRadius:'8px',border:'1px solid #ddd'}}/>
              <input value={shopAddress} onChange={e=>setShopAddress(e.target.value)} placeholder="Адрес с номер" style={{width:'100%',padding:'10px',marginTop:'6px',borderRadius:'8px',border:'1px solid #ddd'}}/>
              <input value={shopCity} onChange={e=>setShopCity(e.target.value)} placeholder="Град" style={{width:'100%',padding:'10px',marginTop:'6px',borderRadius:'8px',border:'1px solid #ddd'}}/>
              <input value={shopDeliveryFee} onChange={e=>setShopDeliveryFee(e.target.value)} placeholder="Доставка €" style={{width:'100%',padding:'10px',marginTop:'6px',borderRadius:'8px',border:'1px solid #ddd'}}/>
              <input value={ownerPhone} onChange={e=>setOwnerPhone(e.target.value)} placeholder="Собственик тел" style={{width:'100%',padding:'10px',marginTop:'6px',borderRadius:'8px',border:'1px solid #ddd'}}/>
              <input value={driverPhone} onChange={e=>setDriverPhone(e.target.value)} placeholder="Шофьор тел" style={{width:'100%',padding:'10px',marginTop:'6px',borderRadius:'8px',border:'1px solid #ddd'}}/>
              <div style={{display:'flex',gap:'6px',marginTop:'8px'}}><button onClick={addShop} style={{flex:1,background:'#0F4C75',color:'white',border:'none',padding:'12px',borderRadius:'10px',fontWeight:'800'}}>{editShopData? '💾 Запази' : '➕ Създай'}</button>{editShopData && <button onClick={cancelEditShop} style={{background:'#fee2e2',border:'none',padding:'12px',borderRadius:'10px'}}>Отказ</button>}</div>
            </div>
            <div style={{background:'white',borderRadius:'14px',padding:'12px',border:'2px solid black'}}>
              <b>📋 Всички магазини - {shops.length}</b>
              {shops.map((s:any)=>{
                const owner = shopProfiles.find((p:any)=> p.shop_id===s.id && p.role==='shop_owner');
                const driver = shopProfiles.find((p:any)=> p.shop_id===s.id && p.role==='driver');
                return (
                  <div key={s.id} style={{border: s.vip_active===false? '3px solid #FF3B30' : '2px solid #22c55e', borderRadius:'12px', padding:'12px', marginTop:'10px', background: s.vip_active===false? '#fee2e2' : 'white'}}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                      <b style={{fontSize:'14px'}}>🏪 {s.name} {s.vip_active===false? '🔴' : '🟢'}</b>
                      <span style={{fontSize:'10px', background: s.vip_active===false? '#FF3B30' : '#22c55e', color:'white', padding:'4px 8px', borderRadius:'8px'}}>{s.delivery_fee}€</span>
                    </div>
                    <div style={{fontSize:'11px', marginTop:'6px', background:'#f3f4f6', padding:'8px', borderRadius:'8px'}}>
                      📍 {s.address} • {s.city}<br/>👤 {owner?.phone || s.phone} • 🚚 {driver?.phone || 'няма'}
                    </div>
                    <div style={{display:'flex', gap:'6px', marginTop:'10px'}}>
                      <button onClick={()=>startEditShop(s)} style={{flex:1, background:'#0F4C75', color:'white', border:'none', padding:'10px', borderRadius:'8px', fontWeight:'800', fontSize:'11px'}}>✏️ Редактирай</button>
                      <button onClick={()=>toggleShopActive(s)} style={{flex:1, background: s.vip_active===false? '#22c55e' : '#f59e0b', color:'white', border:'none', padding:'10px', borderRadius:'8px', fontWeight:'800', fontSize:'11px'}}>{s.vip_active===false? '▶️ Пусни' : '⏸️ Спри'}</button>
                      <button onClick={()=>deleteShop(s.id)} style={{background:'#FF3B30', color:'white', border:'none', padding:'10px 12px', borderRadius:'8px', fontWeight:'800', fontSize:'11px'}}>🗑️</button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
      {toastMsg && <div style={{position:'fixed',bottom:'20px',left:'50%',transform:'translateX(-50%)',background:'black',color:'white',padding:'10px 20px',borderRadius:'20px',fontSize:'12px',zIndex:9999}}>{toastMsg}</div>}
    </main>
  );
}