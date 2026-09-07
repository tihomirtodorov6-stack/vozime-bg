'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://ypfbljjrpppkdxdftjcv.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_NZrVv1hI7aTWVdeyZT27-Q_rWp_olMG";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const ADMIN_PHONES = ['+447935463970','447935463970','07935463970'];
const clean = (p:string)=> p.replace(/[^0-9]/g,'').slice(-10);
const cleanFull = (p:string)=> p.replace(/[^0-9]/g,'');
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
  const showToast=(m:string)=>{ setToastMsg(m); setTimeout(()=>setToastMsg(null),4000); };
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
  const [sortedOrders,setSortedOrders]=useState<any[]>([]);
  const [isSorting,setIsSorting]=useState(false);
  const [driverOnline,setDriverOnline]=useState(true);
  const [driverStatuses,setDriverStatuses]=useState<any[]>([]);
  const isAdmin = currentUser && isAdminPhone(currentUser.phone);

  const openNavigation = (address:string) => {
    if(!address){ showToast('Няма адрес'); return; }
    const q = encodeURIComponent(address);
    const ua = typeof navigator!== 'undefined'? navigator.userAgent : '';
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    if(isIOS){ window.open(`http://maps.apple.com/?daddr=${q}`, '_blank'); }
    else { window.location.href = `geo:0,0?q=${q}`; setTimeout(()=>{ window.open(`https://www.google.com/maps/dir/?api=1&destination=${q}`, '_blank'); }, 700); }
  };

  const handleAuth = async ()=>{
    const cleanPhone = clean(loginForm.phone);
    if(!loginForm.phone || cleanPhone.length<9){ alert('Въведи валиден телефон'); return; }
    if(loginTab==='login'){
      const {data:found} = await supabase.from('users').select('*').or(`clean_phone.eq.${cleanPhone},phone.eq.${loginForm.phone}`).maybeSingle();
      if(!found){ alert('Няма акаунт! Регистрирай се.'); setLoginTab('register'); return; }
      const u={id:found.id,firstName:found.first_name,lastName:found.last_name,phone:found.phone,email:found.email};
      localStorage.setItem('vozime_current',JSON.stringify(u)); setCurrentUser(u); showToast(`Добре дошъл, ${found.first_name}!`); return;
    }
    if(!loginForm.firstName ||!loginForm.lastName ||!loginForm.phone ||!loginForm.email){ alert('Попълни Име, Фамилия, Телефон и Имейл'); return; }
    const {data:existing} = await supabase.from('users').select('*').eq('clean_phone', cleanPhone).maybeSingle();
    if(existing){ alert('Вече съществува! Влез.'); setLoginTab('login'); return; }
    setIsSendingCode(true);
    const code = Math.floor(100000 + Math.random()*900000).toString();
    const expires = new Date(Date.now()+10*60*1000).toISOString();
    await supabase.from('email_codes').insert({ email: loginForm.email.trim().toLowerCase(), clean_phone: cleanPhone, code: code, expires_at: expires, used: false });
    try{ const res = await fetch('/api/send-email',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:loginForm.email.trim().toLowerCase(),code,firstName:loginForm.firstName})}); const j = await res.json().catch(()=>({})); if(j.codeForTesting) setCodeForTest(j.codeForTesting); else setCodeForTest(code); }catch{ setCodeForTest(code); }
    setPendingData({firstName:loginForm.firstName,lastName:loginForm.lastName,fullPhone:loginForm.phone.trim(),cleanPhone,email:loginForm.email.trim().toLowerCase()});
    setVerificationStep('verify'); setCodeInput(''); setIsSendingCode(false);
  };
  const handleVerifyCode = async ()=>{
    if(!codeInput || codeInput.length!==6){ alert('Въведи 6-цифрен код'); return; } if(!pendingData) return;
    const {data:codeRow} = await supabase.from('email_codes').select('*').eq('email',pendingData.email).eq('clean_phone',pendingData.cleanPhone).eq('code',codeInput.trim()).eq('used',false).gt('expires_at', new Date().toISOString()).order('created_at',{ascending:false}).limit(1).maybeSingle();
    if(!codeRow){ alert('Грешен или изтекъл код!'); return; }
    await supabase.from('email_codes').update({used:true}).eq('id',codeRow.id);
    const {data:newUser}=await supabase.from('users').insert({ first_name: pendingData.firstName, last_name: pendingData.lastName, phone: pendingData.fullPhone, clean_phone: pendingData.cleanPhone, email: pendingData.email, is_verified: true, email_verified: true }).select().single();
    const u={id:newUser.id,firstName:newUser.first_name,lastName:newUser.last_name,phone:newUser.phone,email:newUser.email};
    localStorage.setItem('vozime_current',JSON.stringify(u)); setCurrentUser(u); setVerificationStep('form'); setPendingData(null); setCodeInput(''); setCodeForTest(null); setLoginForm({firstName:'',lastName:'',phone:'',email:''});
  };
  const loadShops = async ()=>{ const {data}=await supabase.from('shops').select('*').order('created_at',{ascending:false}); if(data) setShops(data); const {data:profiles}=await supabase.from('shop_profiles').select('*'); if(profiles) setShopProfiles(profiles); };
  const loadDriverStatuses = async ()=>{ try{ const {data}=await supabase.from('driver_status').select('*').order('updated_at',{ascending:false}); if(data) setDriverStatuses(data); }catch{} };
  const loadMyShopProfile = async ()=>{
    if(!currentUser?.phone) return; const myClean10 = clean(currentUser.phone); const myCleanFull = cleanFull(currentUser.phone);
    const {data:allProfiles}=await supabase.from('shop_profiles').select('*'); if(!allProfiles){ setMyShopProfile(null); return; }
    let myProfiles:any[] = allProfiles.filter((p:any)=>{ const p10=clean(p.phone); const pFull=cleanFull(p.phone); return p10===myClean10 || pFull===myCleanFull || p.phone===currentUser.phone; });
    if(myProfiles.length===0 && isAdmin){
      const {data:allDriverOrders} = await supabase.from('orders').select('*').eq('driver_requested', true).order('created_at',{ascending:false});
      if(allDriverOrders && allDriverOrders.length>0){ setMyShopOrders(allDriverOrders); setMyShopProfile({role:'driver', phone: currentUser.phone, shop_id: null, is_admin_view: true}); setMyShopProducts([]); return; }
      setMyShopProfile(null); setMyShopProducts([]); setMyShopOrders([]); return;
    }
    if(myProfiles.length===0){ setMyShopProfile(null); setMyShopProducts([]); setMyShopOrders([]); return; }
    const ownerProfile = myProfiles.find((p:any)=>p.role==='shop_owner') || myProfiles[0]; setMyShopProfile(ownerProfile);
    const shopIds = [...new Set(myProfiles.map((p:any)=>p.shop_id))]; let allProds:any[]=[]; let allOrders:any[]=[];
    for(const sid of shopIds){ if(!sid) continue; const {data:prods}=await supabase.from('products').select('*').eq('shop_id', sid); if(prods) allProds=[...allProds,...prods]; const {data:ords}=await supabase.from('orders').select('*').eq('shop_id', sid).order('created_at',{ascending:false}); if(ords) allOrders=[...allOrders,...ords]; }
    setMyShopProducts(allProds); setMyShopOrders(allOrders);
  };
  const loadCustomerOrders = async ()=>{ if(!currentUser?.phone) return; const {data}=await supabase.from('orders').select('*').eq('customer_phone', currentUser.phone).order('created_at',{ascending:false}); if(data) setCustomerOrders(data); };
  const loadMarketProducts = async (shopId:string)=>{ const shop = shops.find(s=>s.id===shopId); if(shop && shop.vip_active===false){ showToast('🔴 Магазинът е затворен'); return; } const {data}=await supabase.from('products').select('*').eq('shop_id', shopId); if(data) setMarketProducts(data.filter((p:any)=>p.active!==false)); setSelectedShop(shop); setCart([]); };
  const addShop = async ()=>{ if(!shopName ||!ownerPhone){ alert('Име и телефон!'); return; } if(editShopData){ await supabase.from('shops').update({ name:shopName, city:shopCity||shopAddress||'', address:shopAddress||'', phone:ownerPhone, delivery_fee: parseFloat(shopDeliveryFee)||4.99, }).eq('id',editShopData.id); await supabase.from('shop_profiles').delete().eq('shop_id',editShopData.id).eq('role','shop_owner'); await supabase.from('shop_profiles').insert([{phone:ownerPhone,role:'shop_owner',shop_id:editShopData.id}]); if(driverPhone){ await supabase.from('shop_profiles').delete().eq('shop_id',editShopData.id).eq('role','driver'); await supabase.from('shop_profiles').insert([{phone:driverPhone,role:'driver',shop_id:editShopData.id}]); } setEditShopData(null); }else{ const {data}=await supabase.from('shops').insert({ name:shopName, slug:shopName.toLowerCase().replace(/\s+/g,'-')+'-'+Date.now(), city:shopCity||shopAddress||'', address:shopAddress||'', phone:ownerPhone, delivery_fee: parseFloat(shopDeliveryFee)||4.99, vip_active:true }).select().single(); await supabase.from('shop_profiles').insert([{phone:ownerPhone,role:'shop_owner',shop_id:data.id}]); if(driverPhone) await supabase.from('shop_profiles').insert([{phone:driverPhone,role:'driver',shop_id:data.id}]); } setShopName(''); setShopAddress(''); setShopCity(''); setShopDeliveryFee('4.99'); setOwnerPhone(''); setDriverPhone(''); await loadShops(); };
  const startEditShop = (shop:any)=>{ setEditShopData(shop); setShopName(shop.name||''); setShopAddress(shop.address||''); setShopCity(shop.city||''); setShopDeliveryFee(String(shop.delivery_fee||'4.99')); setOwnerPhone(shop.phone||''); const dp = shopProfiles.find((p:any)=> p.shop_id===shop.id && p.role==='driver'); setDriverPhone(dp?.phone||''); };
  const cancelEditShop = ()=>{ setEditShopData(null); setShopName(''); setShopAddress(''); setShopCity(''); setShopDeliveryFee('4.99'); setOwnerPhone(''); setDriverPhone(''); };
  const toggleShopActive = async (shop:any)=>{ await supabase.from('shops').update({vip_active:!shop.vip_active}).eq('id',shop.id); await loadShops(); };
  const toggleMyShopOnline = async ()=>{ const myShop = shops.find(s=> s.id===myShopProfile?.shop_id); if(!myShop) return; await supabase.from('shops').update({vip_active:!myShop.vip_active}).eq('id',myShop.id); await loadShops(); showToast(myShop.vip_active? '🔴 Затворен LIVE' : '🟢 Отворен LIVE'); };
  const deleteShop = async (id:string)=>{ if(!confirm('Изтрий?')) return; await supabase.from('shop_profiles').delete().eq('shop_id',id); await supabase.from('products').delete().eq('shop_id',id); await supabase.from('shops').delete().eq('id',id); await loadShops(); };
  const updateMyShop = async ()=>{ if(!myShopProfile?.shop_id) return; await supabase.from('shops').update({ name: shopName, address: shopAddress, city: shopCity||shopAddress, delivery_fee: parseFloat(shopDeliveryFee)||4.99 }).eq('id',myShopProfile.shop_id); await loadShops(); await loadMyShopProfile(); showToast('✅ Запазен'); setShopName(''); setShopAddress(''); setShopCity(''); };
  const startEditMyShop = ()=>{ const myShop = shops.find(s=> s.id===myShopProfile?.shop_id); if(!myShop) return; setShopName(myShop.name); setShopAddress(myShop.address||''); setShopCity(myShop.city||''); setShopDeliveryFee(String(myShop.delivery_fee||4.99)); };
  const addProductWithImage = async ()=>{ const targetShopId = myShopProfile?.shop_id || shops[0]?.id; if(!targetShopId) return; if(!newProdName.trim() ||!newProdPrice.trim()) return; const priceNum=parseFloat(newProdPrice.replace(',','.')); let imageUrl=editingProduct?.image_url||null; if(newProdFile){ const fname=`${targetShopId}_${Date.now()}_${newProdFile.name}`; await supabase.storage.from('product-images').upload(fname,newProdFile); const {data:urlData}=supabase.storage.from('product-images').getPublicUrl(fname); imageUrl=urlData.publicUrl; } const desc=`[${newProdCat}] ${newProdDesc.trim()}`; if(editingProduct){ await supabase.from('products').update({name:newProdName.trim(),price:priceNum,description:desc,image_url:imageUrl,active:newProdActive}).eq('id',editingProduct.id); }else{ await supabase.from('products').insert({shop_id:targetShopId,name:newProdName.trim(),price:priceNum,description:desc,image_url:imageUrl,active:newProdActive}); } setNewProdName(''); setNewProdPrice(''); setNewProdDesc(''); setNewProdFile(null); setEditingProduct(null); await loadMyShopProfile(); };
  const startEditProduct = (p:any)=>{ setEditingProduct(p); setNewProdName(p.name); setNewProdPrice(p.price.toString()); setNewProdDesc((p.description||'').replace(/^\[.*?\]\s*/,'').trim()); const m=p.description?.match(/^\[(.*?)\]/); if(m) setNewProdCat(m[1]); setNewProdActive(p.active!==false); };
  const cancelEditProduct = ()=>{ setEditingProduct(null); setNewProdName(''); setNewProdPrice(''); setNewProdDesc(''); setNewProdFile(null); };
  const deleteProduct = async (id:string)=>{ await supabase.from('products').delete().eq('id',id); setMyShopProducts(myShopProducts.filter(p=>p.id!==id)); };
  const addToCart = (product:any)=>{ if(selectedShop?.vip_active===false) return; setCart(prev=>{ const ex=prev.find(c=>c.product.id===product.id); if(ex) return prev.map(c=> c.product.id===product.id? {...c,qty:c.qty+1}:c); return [...prev,{product,qty:1}]; }); };
  const incCart = (pid:string)=> setCart(prev=> prev.map(c=> c.product.id===pid? {...c,qty:c.qty+1}:c));
  const decCart = (pid:string)=> setCart(prev=>{ const ex=prev.find(c=>c.product.id===pid); if(!ex) return prev; if(ex.qty<=1) return prev.filter(c=>c.product.id!==pid); return prev.map(c=> c.product.id===pid? {...c,qty:c.qty-1}:c); });
  const getCartCount = ()=> cart.reduce((s,c)=>s+c.qty,0);
  const getCartSubtotal = ()=> cart.reduce((s,c)=> s + parseFloat(c.product.price)*c.qty,0);
  const getCartTotal = ()=> getCartSubtotal() + parseFloat(selectedShop?.delivery_fee||4.99);
  const placeOrder = async ()=>{ if(selectedShop?.vip_active===false){ alert('Магазинът е затворен'); return; } if(!selectedShop || cart.length===0 ||!customerAddr.trim()) return; const items=cart.map(c=>({id:c.product.id,name:c.product.name,price:c.product.price,qty:c.qty})); const total=getCartTotal(); await supabase.from('orders').insert({shop_id:selectedShop.id,customer_phone:currentUser.phone,customer_name:`${currentUser.firstName} ${currentUser.lastName}`,address:customerAddr,items,total,status:'new',driver_requested:false}); setCart([]); setCustomerAddr(''); await loadCustomerOrders(); showToast('✅ Поръчка изпратена LIVE'); };
  const updateOrderStatus = async (orderId:string,status:string)=>{ await supabase.from('orders').update({status}).eq('id',orderId); setMyShopOrders(prev=> prev.map(o=> o.id===orderId? {...o, status} : o)); setCustomerOrders(prev=> prev.map(o=> o.id===orderId? {...o, status} : o)); };
  const requestDriverForOrder = async (orderId:string)=>{ setSortedOrders([]); await supabase.from('orders').update({driver_requested:true, status:'ready_for_driver'}).eq('id',orderId); setMyShopOrders(prev=> prev.map(o=> o.id===orderId? {...o, driver_requested:true, status:'ready_for_driver'} : o)); };
  const assignDriverToOrder = async (orderId:string)=>{ const active = myShopOrders.filter((o:any)=> o.driver_phone===currentUser.phone && ['on_the_way_to_shop','picked_up','on_the_way','ready_for_driver'].includes(o.status)); if(active.length>=3){ alert('Лимит 3!'); return; } await supabase.from('orders').update({driver_phone:currentUser.phone, status:'on_the_way_to_shop'}).eq('id',orderId); setSortedOrders([]); };
  const refuseOrder = async (orderId:string)=>{ await supabase.from('orders').update({driver_phone:null, driver_requested:false, status:'preparing'}).eq('id',orderId); setSortedOrders([]); };
  const geocodeAddress = async (addr:string)=>{ try{ const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addr)}&limit=1`); const data = await res.json(); if(data && data[0]) return {lat:parseFloat(data[0].lat), lon:parseFloat(data[0].lon)}; }catch{} return null; };
  const calcDistance = (a:any,b:any)=>{ const R=6371; const dLat=(b.lat-a.lat)*Math.PI/180; const dLon=(b.lon-a.lon)*Math.PI/180; const lat1=a.lat*Math.PI/180; const lat2=b.lat*Math.PI/180; const h=Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2; return R*2*Math.asin(Math.sqrt(h)); };
  const sortByDistance = async ()=>{ if(myShopOrders.length<=1) return; setIsSorting(true); const byShop: any = {}; myShopOrders.forEach((o:any)=>{ if(!byShop[o.shop_id]) byShop[o.shop_id]=[]; byShop[o.shop_id].push(o); }); let allSorted:any[]=[]; for(const shopId in byShop){ const shop = shops.find(s=>s.id===shopId); const shopCoords = await geocodeAddress(shop?.address || shop?.city || ''); if(!shopCoords){ allSorted=[...allSorted,...byShop[shopId]]; continue; } const withDist = await Promise.all(byShop[shopId].map(async (o:any)=>{ const custCoords = await geocodeAddress(o.address); const dist = custCoords? calcDistance(shopCoords,custCoords) : 9999; return {...o,_dist:dist}; })); withDist.sort((a,b)=>a._dist-b._dist); allSorted=[...allSorted,...withDist]; } setSortedOrders(allSorted); setIsSorting(false); };
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
        }); setSortedOrders([]);
      })
.on('postgres_changes', { event: '*', schema: 'public', table: 'shops' }, (payload) => {
        const newRow = payload.new as any; const oldRow = payload.old as any;
        if(payload.eventType==='INSERT'){ setShops(prev=> [newRow,...prev]); showToast(`🏪 ${newRow.name} отвори LIVE`); }
        else if(payload.eventType==='UPDATE'){ setShops(prev=> prev.map(s=> s.id===newRow.id? newRow : s)); if(selectedShop && selectedShop.id===newRow.id){ setSelectedShop(newRow); if(newRow.vip_active===false){ showToast('🔴 Магазинът затвори LIVE'); setCart([]); } else { showToast('🟢 Магазинът отвори LIVE'); } } }
        else if(payload.eventType==='DELETE'){ setShops(prev=> prev.filter(s=> s.id!==oldRow.id)); }
      })
.on('postgres_changes', { event: '*', schema: 'public', table: 'driver_status' }, (payload) => {
        const newRow = payload.new as any; const oldRow = payload.old as any;
        if(payload.eventType==='INSERT'){ setDriverStatuses(prev=> [newRow,...prev.filter(d=>d.clean_phone!==newRow.clean_phone)]); }
        else if(payload.eventType==='UPDATE'){ setDriverStatuses(prev=> prev.map(d=> d.clean_phone===newRow.clean_phone? newRow : d)); }
        else if(payload.eventType==='DELETE'){ setDriverStatuses(prev=> prev.filter(d=> d.clean_phone!==oldRow.clean_phone)); }
      })
.subscribe(); return ()=>{ supabase.removeChannel(channel); };
  }, [currentUser?.phone, shopProfiles, myShopProfile?.shop_id, selectedShop?.id]);

  const logout=()=>{ localStorage.removeItem('vozime_current'); setCurrentUser(null); setTab('market'); };

  if(!currentUser){
    return (<main style={{position:'fixed',inset:0,display:'flex',alignItems:'center',justifyContent:'center',background:'#0F4C75',padding:'16px'}}><div style={{background:'white',padding:'20px',borderRadius:'24px',width:'100%',maxWidth:'380px'}}><div style={{fontWeight:'800',fontSize:'22px',color:'#0F4C75',textAlign:'center'}}>🛒 Магазини VoziMe</div><div style={{display:'flex',background:'#f1f3f4',borderRadius:'12px',padding:'3px',margin:'16px 0'}}><button onClick={()=>setLoginTab('login')} style={{flex:1,padding:'10px',borderRadius:'8px',border:'none',fontWeight:'bold',background:loginTab==='login'?'#0F4C75':'white',color:loginTab==='login'?'white':'#666'}}>Вход</button><button onClick={()=>setLoginTab('register')} style={{flex:1,padding:'10px',borderRadius:'8px',border:'none',fontWeight:'bold',background:loginTab==='register'?'#0F4C75':'white',color:loginTab==='register'?'white':'#666'}}>Регистрация</button></div>{loginTab==='register' && (<><input placeholder="Име" value={loginForm.firstName} onChange={e=>setLoginForm({...loginForm,firstName:e.target.value})} style={{width:'100%',padding:'14px',borderRadius:'12px',border:'1px solid #e5e7eb',marginBottom:'10px'}}/><input placeholder="Фамилия" value={loginForm.lastName} onChange={e=>setLoginForm({...loginForm,lastName:e.target.value})} style={{width:'100%',padding:'14px',borderRadius:'12px',border:'1px solid #e5e7eb',marginBottom:'10px'}}/><input placeholder="Имейл" value={loginForm.email} onChange={e=>setLoginForm({...loginForm,email:e.target.value})} style={{width:'100%',padding:'14px',borderRadius:'12px',border:'1px solid #e5e7eb',marginBottom:'10px'}}/></>)}<input placeholder="Телефон" value={loginForm.phone} onChange={e=>setLoginForm({...loginForm,phone:e.target.value})} style={{width:'100%',padding:'14px',borderRadius:'12px',border:'1px solid #e5e7eb',marginBottom:'16px'}}/><button onClick={handleAuth} style={{width:'100%',padding:'16px',background:'#22c55e',border:'none',borderRadius:'14px',fontWeight:'bold',color:'white'}}>Влез / Регистрирай →</button>{toastMsg && <div style={{marginTop:'12px',background:'#0F4C75',color:'white',padding:'10px',borderRadius:'10px',fontSize:'12px',textAlign:'center'}}>{toastMsg}</div>}</div></main>);
  }

  const filteredMarketShops = shops.filter(s=>!marketSearch || s.name.toLowerCase().includes(marketSearch.toLowerCase()));
  const filteredMarketProducts = marketProducts.filter(p=>{ if(marketSearch &&!(p.name.toLowerCase().includes(marketSearch.toLowerCase()))) return false; if(marketCat!=='Всички' &&!(p.description||'').includes(`[${marketCat}]`)) return false; return true; });
  const filteredMyProducts = myShopProducts.filter(p=>{ if(prodSearch &&!(p.name.toLowerCase().includes(prodSearch.toLowerCase()))) return false; if(prodCatFilter!=='Всички' &&!(p.description||'').includes(`[${prodCatFilter}]`)) return false; return true; });
  const driverSource = sortedOrders.length>0? sortedOrders : myShopOrders;
  const driverOrders = driverSource.filter((o:any)=> o.driver_requested === true && o.status!== 'delivered' && o.status!== 'cancelled');
  const activeDriverCount = myShopOrders.filter((o:any)=> o.driver_phone===currentUser.phone && ['on_the_way_to_shop','picked_up','on_the_way','ready_for_driver'].includes(o.status)).length;
  const baseAvailable = driverOrders.filter((o:any)=>(!o.driver_phone || o.driver_phone===currentUser.phone) && o.status!== 'delivered');
  const availableDriverOrders = driverOnline? baseAvailable : baseAvailable.filter((o:any)=> o.driver_phone===currentUser.phone);
  const todayStr = new Date().toISOString().slice(0,10);
  const todayDeliveredOrders = myShopOrders.filter((o:any)=> o.driver_phone===currentUser?.phone && o.status==='delivered' && (o.created_at||'').slice(0,10)===todayStr);
  const todayEarnings = todayDeliveredOrders.reduce((sum:number,o:any)=>{ const shop = shops.find(s=>s.id===o.shop_id); const fee = parseFloat(shop?.delivery_fee || '4.99'); return sum+fee; },0);
  const myShopData = shops.find(s=> s.id===myShopProfile?.shop_id);

  useEffect(()=>{ if(currentUser?.phone && (myShopProfile?.role==='driver' || isAdmin)){ upsertDriverStatus(driverOnline, todayEarnings, todayDeliveredOrders.length); } },[todayEarnings, driverOnline]);

  return (
    <main style={{height:'100dvh',width:'100%',maxWidth:'480px',margin:'0 auto',background:'#f9fafb',display:'flex',flexDirection:'column',overflow:'hidden',fontFamily:'-apple-system, sans-serif'}}>
      <header style={{background:'#0F4C75',color:'white',padding:'10px 12px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div><b>🛒 Магазини {isAdmin?'👑 АДМИН':''}</b><div style={{fontSize:'10px',opacity:0.8}}>{currentUser.firstName} • LIVE ✅</div></div>
        <div style={{display:'flex',gap:'6px'}}><button onClick={logout} style={{background:'#FF3B30',border:'none',color:'white',padding:'6px 10px',borderRadius:'12px',fontSize:'11px',fontWeight:'bold'}}>Изход</button></div>
      </header>
      <div style={{display:'flex',gap:'4px',padding:'6px',background:'white',borderBottom:'1px solid #e5e7eb'}}>
        <button onClick={()=>setTab('market')} style={{flex:1,padding:'10px',borderRadius:'10px',border:'none',fontWeight:'bold',fontSize:'11px',background:tab==='market'?'#22c55e':'#f3f4f6',color:tab==='market'?'white':'#666'}}>🛒 Пазар</button>
        <button onClick={()=>setTab('my_orders')} style={{flex:1,padding:'10px',borderRadius:'10px',border:'none',fontWeight:'bold',fontSize:'11px',background:tab==='my_orders'?'#0F4C75':'#f3f4f6',color:tab==='my_orders'?'white':'#666'}}>📦 Мои ({customerOrders.length})</button>
        {myShopProfile?.role==='shop_owner' && <button onClick={()=>setTab('my_shop')} style={{flex:1,padding:'10px',borderRadius:'10px',border:'none',fontWeight:'bold',fontSize:'11px',background:tab==='my_shop'?'#f59e0b':'#f3f4f6',color:tab==='my_shop'?'white':'#666'}}>🏪 Моя</button>}
        {(myShopProfile?.role==='driver' || isAdmin) && <button onClick={()=>setTab('driver')} style={{flex:1,padding:'10px',borderRadius:'10px',border:'none',fontWeight:'bold',fontSize:'11px',background:tab==='driver'?'#0F4C75':'#f3f4f6',color:tab==='driver'?'white':'#666'}}>🚚 Доставки ({availableDriverOrders.length})</button>}
        {isAdmin && <button onClick={()=>setTab('admin')} style={{flex:1,padding:'10px',borderRadius:'10px',border:'none',fontWeight:'bold',fontSize:'10px',background:tab==='admin'?'#FFD60A':'#f3f4f6',color:tab==='admin'?'black':'#666'}}>👑 Админ</button>}
      </div>
      <div style={{flex:1,overflowY:'auto',padding:'10px',display:'flex',flexDirection:'column',gap:'12px'}}>
        {tab==='market' && (<>{!selectedShop? (<><div style={{background:'#22c55e',color:'white',padding:'14px',borderRadius:'14px'}}><b>🛒 Пазар LIVE - без рефреш</b><div style={{fontSize:'11px'}}>🟢 Отворен може да се поръчва • 🔴 Затворен без поръчки</div><input value={marketSearch} onChange={e=>setMarketSearch(e.target.value)} placeholder="🔍 Търси магазин..." style={{width:'100%',marginTop:'10px',padding:'10px',borderRadius:'10px',border:'none'}}/></div>{filteredMarketShops.map((s:any)=>(<div key={s.id} onClick={()=> s.vip_active===false? showToast('🔴 Затворен LIVE') : loadMarketProducts(s.id)} style={{background:'white',border: s.vip_active===false? '2px solid #FF3B30' : '2px solid #22c55e',borderRadius:'14px',padding:'14px',opacity: s.vip_active===false? 0.7 : 1}}><div style={{display:'flex',justifyContent:'space-between'}}><b>{s.name}</b><span style={{fontSize:'10px',background: s.vip_active===false? '#FF3B30' : '#22c55e',color:'white',padding:'4px 8px',borderRadius:'10px'}}>{s.vip_active===false? '🔴 Затворен LIVE' : '🟢 Отворен LIVE'}</span></div><div style={{fontSize:'12px',color:'#666',marginTop:'4px'}}>📍 {s.address||s.city} • {s.delivery_fee}€</div><div style={{fontSize:'12px',fontWeight:'800',marginTop:'8px',color: s.vip_active===false? '#FF3B30' : '#22c55e'}}>{s.vip_active===false? '❌ Затворен - LIVE' : 'Виж продукти → LIVE'}</div></div>))}</>):(<><button onClick={()=>{setSelectedShop(null); setMarketProducts([]); setCart([]);}} style={{padding:'10px',borderRadius:'10px',border:'1px solid #ddd',background:'white',fontWeight:'bold'}}>← Назад</button><div style={{background: selectedShop.vip_active===false? '#FF3B30' : '#0F4C75',color:'white',padding:'14px',borderRadius:'14px'}}><b>{selectedShop.name} {selectedShop.vip_active===false? '🔴 ЗАТВОРЕН LIVE' : '🟢 ОТВОРЕН LIVE'}</b></div>{selectedShop.vip_active===false && <div style={{background:'#fee2e2',border:'2px solid #FF3B30',padding:'14px',borderRadius:'12px',textAlign:'center'}}><b>🔴 Затворен LIVE</b><div style={{fontSize:'11px'}}>Без рефреш - собственикът го затвори</div></div>}<div style={{display:'flex',gap:'6px'}}><input value={marketSearch} onChange={e=>setMarketSearch(e.target.value)} placeholder="🔍 Търси продукт..." style={{flex:1,padding:'10px',borderRadius:'10px',border:'1px solid #ddd'}}/><select value={marketCat} onChange={e=>setMarketCat(e.target.value)} style={{padding:'10px',borderRadius:'10px'}}>{PRODUCT_CATS.map(c=><option key={c} value={c}>{c}</option>)}</select></div>{filteredMarketProducts.map((p:any)=>(<div key={p.id} style={{background:'white',borderRadius:'14px',padding:'12px',display:'flex',gap:'12px',opacity: selectedShop.vip_active===false? 0.5 : 1}}>{p.image_url && <img src={p.image_url} style={{width:'70px',height:'70px',objectFit:'cover',borderRadius:'10px'}}/>}<div style={{flex:1}}><b>{p.name}</b><div style={{fontSize:'11px',color:'#666'}}>{(p.description||'').replace(/^\[.*?\]\s*/,'')}</div><div style={{fontWeight:'800',color:'#22c55e'}}>{p.price}€</div></div><div>{selectedShop.vip_active===false? <div style={{fontSize:'10px',background:'#fee2e2',padding:'8px',borderRadius:'8px'}}>Затворен</div> : cart.find(c=>c.product.id===p.id)? (<div style={{display:'flex',gap:'6px',alignItems:'center'}}><button onClick={()=>decCart(p.id)} style={{width:'28px',height:'28px',borderRadius:'50%',border:'none'}}>−</button><b>{cart.find(c=>c.product.id===p.id)?.qty}</b><button onClick={()=>incCart(p.id)} style={{width:'28px',height:'28px',borderRadius:'50%',border:'none',background:'#22c55e',color:'white'}}>+</button></div>) : <button onClick={()=>addToCart(p)} style={{background:'#22c55e',color:'white',border:'none',padding:'10px 14px',borderRadius:'10px'}}>Добави</button>}</div></div>))}{cart.length>0 && selectedShop.vip_active!==false && (<div style={{background:'white',border:'3px solid #22c55e',borderRadius:'16px',padding:'14px',position:'sticky',bottom:'0'}}><b>🛒 Количка - {getCartCount()}</b>{cart.map((c:any)=><div key={c.product.id} style={{display:'flex',justifyContent:'space-between',fontSize:'12px'}}><span>{c.product.name} x{c.qty}</span><span>{(parseFloat(c.product.price)*c.qty).toFixed(2)}€</span></div>)}<div style={{display:'flex',justifyContent:'space-between',fontWeight:'800',marginTop:'8px'}}><span>Общо:</span><span>{getCartTotal().toFixed(2)}€</span></div><input value={customerAddr} onChange={e=>setCustomerAddr(e.target.value)} placeholder="📍 Адрес..." style={{width:'100%',padding:'12px',marginTop:'10px',borderRadius:'10px',border:'2px solid #22c55e'}}/><button onClick={placeOrder} style={{width:'100%',marginTop:'10px',padding:'14px',background:'#22c55e',color:'white',border:'none',borderRadius:'12px',fontWeight:'800'}}>✅ Поръчай за {getCartTotal().toFixed(2)}€</button></div>)}</>)} </>)}
        {tab==='my_shop' && (<div style={{display:'flex',flexDirection:'column',gap:'12px'}}><div style={{background:'#22c55e',color:'white',padding:'14px',borderRadius:'14px'}}><b>🏪 Моят магазин LIVE</b><div style={{fontSize:'11px'}}>{myShopData?.name||''} • {myShopData?.vip_active===false? '🔴 Затворен LIVE' : '🟢 Отворен LIVE'}</div></div><div style={{background: myShopData?.vip_active===false? '#fee2e2' : '#f0fdf4',border: myShopData?.vip_active===false? '2px solid #FF3B30' : '2px solid #22c55e',borderRadius:'14px',padding:'12px'}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><b>{myShopData?.vip_active===false? '🔴 ЗАТВОРЕН LIVE' : '🟢 ОТВОРЕН LIVE'}</b><button onClick={toggleMyShopOnline} style={{background: myShopData?.vip_active===false? '#22c55e' : '#FF3B30',color:'white',border:'none',padding:'12px 16px',borderRadius:'10px',fontWeight:'800'}}>{myShopData?.vip_active===false? '▶️ Отвори LIVE' : '⏸️ Затвори LIVE'}</button></div></div><div style={{background:'white',border:'2px solid #22c55e',borderRadius:'14px',padding:'12px'}}><b>⚙️ Настройки</b><div style={{display:'flex',gap:'6px',marginTop:'8px'}}><input placeholder="Име" value={shopName} onChange={e=>setShopName(e.target.value)} style={{flex:1,padding:'10px',borderRadius:'8px',border:'1px solid #ddd'}}/><button onClick={startEditMyShop} style={{background:'#0F4C75',color:'white',border:'none',padding:'10px',borderRadius:'8px'}}>✏️</button></div><input placeholder="Адрес" value={shopAddress} onChange={e=>setShopAddress(e.target.value)} style={{width:'100%',padding:'10px',marginTop:'6px',borderRadius:'8px',border:'1px solid #ddd'}}/><button onClick={updateMyShop} style={{width:'100%',marginTop:'8px',background:'#22c55e',color:'white',border:'none',padding:'12px',borderRadius:'10px'}}>💾 Запази</button></div><div style={{background:'white',border:'2px solid #f59e0b',borderRadius:'14px',padding:'12px'}}><b>{editingProduct? '✏️ Редактирай' : '➕ Нов продукт'}</b><input placeholder="Име" value={newProdName} onChange={e=>setNewProdName(e.target.value)} style={{width:'100%',padding:'10px',marginTop:'8px',borderRadius:'8px',border:'1px solid #ddd'}}/><div style={{display:'flex',gap:'6px',marginTop:'6px'}}><input placeholder="Цена" value={newProdPrice} onChange={e=>setNewProdPrice(e.target.value)} style={{flex:1,padding:'10px',borderRadius:'8px',border:'1px solid #ddd'}}/><select value={newProdCat} onChange={e=>setNewProdCat(e.target.value)} style={{flex:1,padding:'10px',borderRadius:'8px'}}>{PRODUCT_CATS.filter(c=>c!=='Всички').map(c=><option key={c} value={c}>{c}</option>)}</select></div><input placeholder="Описание" value={newProdDesc} onChange={e=>setNewProdDesc(e.target.value)} style={{width:'100%',padding:'10px',marginTop:'6px',borderRadius:'8px',border:'1px solid #ddd'}}/><input type="file" accept="image/*" onChange={e=>setNewProdFile(e.target.files?.[0]||null)} style={{width:'100%',marginTop:'6px'}}/><div style={{display:'flex',gap:'6px',marginTop:'10px'}}><button onClick={addProductWithImage} style={{flex:1,background:'#f59e0b',color:'white',border:'none',padding:'12px',borderRadius:'10px',fontWeight:'800'}}>{editingProduct? '💾 Обнови' : '✅ Добави'}</button>{editingProduct && <button onClick={cancelEditProduct} style={{flex:1,background:'#f3f4f6',border:'none',padding:'12px',borderRadius:'10px'}}>❌</button>}</div></div><div style={{background:'white',borderRadius:'14px',padding:'12px'}}><b>📦 Продукти {filteredMyProducts.length}</b>{filteredMyProducts.map((p:any)=>(<div key={p.id} style={{display:'flex',gap:'8px',alignItems:'center',background:'#f9fafb',padding:'8px',borderRadius:'10px',marginTop:'8px'}}>{p.image_url && <img src={p.image_url} style={{width:'50px',height:'50px',objectFit:'cover',borderRadius:'8px'}}/>}<div style={{flex:1}}><b style={{fontSize:'12px'}}>{p.name}</b><div style={{fontSize:'10px'}}>{p.price}€</div></div><button onClick={()=>startEditProduct(p)} style={{background:'#0F4C75',color:'white',border:'none',padding:'6px 8px',borderRadius:'6px'}}>✏️</button><button onClick={()=>deleteProduct(p.id)} style={{background:'#FF3B30',color:'white',border:'none',padding:'6px 8px',borderRadius:'6px'}}>🗑️</button></div>))}</div><div style={{background:'white',border:'2px solid #22c55e',borderRadius:'14px',padding:'12px'}}><b>📦 Поръчки LIVE {myShopOrders.length}</b>{myShopOrders.map((o:any)=>(<div key={o.id} style={{border:'2px solid #0F4C75',borderRadius:'12px',padding:'10px',marginTop:'10px'}}><div style={{display:'flex',justifyContent:'space-between'}}><b>#{o.id.slice(0,8)} • {parseFloat(o.total).toFixed(2)}€</b><span style={{fontSize:'10px',background:'#f59e0b',color:'white',padding:'4px 8px',borderRadius:'8px'}}>{o.status}</span></div><div style={{fontSize:'11px',marginTop:'4px'}}>{o.customer_name} • 📍 {o.address}</div><div style={{display:'flex',gap:'6px',marginTop:'8px'}}>{o.status==='new' && <button onClick={()=>updateOrderStatus(o.id,'accepted')} style={{flex:1,background:'#22c55e',color:'white',border:'none',padding:'10px',borderRadius:'8px'}}>✅ Приеми</button>}{o.status==='accepted' && <button onClick={()=>updateOrderStatus(o.id,'preparing')} style={{flex:1,background:'#f59e0b',color:'white',border:'none',padding:'10px',borderRadius:'8px'}}>👨‍🍳 Готвя</button>}{(o.status==='preparing' || o.status==='accepted') &&!o.driver_requested && <button onClick={()=>requestDriverForOrder(o.id)} style={{flex:1,background:'#0F4C75',color:'white',border:'none',padding:'10px',borderRadius:'8px'}}>🚚 Шофьор</button>}{o.driver_requested && <div style={{flex:1,background:'#e0f2fe',padding:'10px',borderRadius:'8px',textAlign:'center',fontSize:'11px'}}>🚚 {o.driver_phone||'чака'}</div>}<button onClick={()=>openNavigation(o.address)} style={{flex:1,background:'#22c55e',color:'white',border:'none',padding:'10px',borderRadius:'8px'}}>🧭 Клиент</button></div></div>))}</div></div>)}
        {tab==='driver' && (
          <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
            <div style={{background:'#0F4C75',color:'white',padding:'12px',borderRadius:'12px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><div><b>🚚 Доставки LIVE - без рефреш</b><div style={{fontSize:'10px'}}>{driverOnline? '🟢 Онлайн LIVE' : '🔴 Офлайн LIVE'} • {availableDriverOrders.length} активни</div></div><button onClick={toggleDriverOnline} style={{background:driverOnline?'#22c55e':'#FF3B30',color:'white',border:'none',padding:'10px 14px',borderRadius:'12px',fontWeight:'800'}}>{driverOnline? '🟢 ОНЛАЙН' : '🔴 ОФЛАЙН'}</button></div>
              <div style={{background:'white',color:'black',padding:'10px',borderRadius:'10px',marginTop:'10px'}}><div style={{display:'flex',justifyContent:'space-between'}}><b>💰 Днес: {todayDeliveredOrders.length} доставки</b><b style={{color:'#22c55e'}}>{todayEarnings.toFixed(2)}€</b></div><div style={{fontSize:'10px',color:'#666'}}>Лимит активни: {activeDriverCount}/3 • LIVE без рефреш</div><button onClick={()=>{ if(confirm(`Приключваш? ${todayEarnings.toFixed(2)}€`)){ toggleDriverOnline(); } }} style={{width:'100%',marginTop:'8px',background:'#0F4C75',color:'white',border:'none',padding:'10px',borderRadius:'8px',fontWeight:'bold'}}>🏁 Приключи деня - Офлайн LIVE</button></div>
            </div>
            {!driverOnline && <div style={{background:'#fee2e2',border:'2px solid #FF3B30',padding:'14px',borderRadius:'12px',textAlign:'center'}}><b>🔴 Офлайн LIVE</b><div style={{fontSize:'11px'}}>Не получаваш нови поръчки • Днес: {todayEarnings.toFixed(2)}€</div></div>}
            {driverOnline && availableDriverOrders.length===0 && <div style={{background:'white',padding:'20px',borderRadius:'12px',textAlign:'center',color:'#666'}}>Няма активни заявки LIVE • Днес: {todayEarnings.toFixed(2)}€</div>}
            {availableDriverOrders.map((o:any)=>{ const shop = shops.find(s=>s.id===o.shop_id); return (<div key={o.id} style={{background:'white',border:'2px solid #0F4C75',borderRadius:'14px',padding:'12px'}}><div style={{display:'flex',justifyContent:'space-between'}}><b>#{o.id.slice(0,8)} • {parseFloat(o.total).toFixed(2)}€</b><span style={{fontSize:'10px',background:'#0F4C75',color:'white',padding:'4px 8px',borderRadius:'10px'}}>{o.status}</span></div><div style={{fontSize:'11px',marginTop:'6px',background:'#e0f2fe',padding:'8px',borderRadius:'8px'}}><b>🏪 {shop?.name} {shop?.vip_active===false? '🔴 Затворен' : '🟢 Отворен'}</b><br/>📍 {shop?.address}<button onClick={()=>openNavigation(shop?.address||'')} style={{width:'100%',marginTop:'6px',background:'#0F4C75',color:'white',border:'none',padding:'10px',borderRadius:'8px'}}>🗺️ До магазина - авто</button></div><div style={{fontSize:'11px',marginTop:'6px',background:'#fff3cd',padding:'8px',borderRadius:'8px'}}><b>👤 {o.customer_name}</b> • 📞 {o.customer_phone}<br/>📍 {o.address}<button onClick={()=>openNavigation(o.address)} style={{width:'100%',marginTop:'8px',background:'#22c55e',color:'white',border:'none',padding:'12px',borderRadius:'10px',fontWeight:'900'}}>🧭 До клиента - авто</button></div><div style={{display:'flex',gap:'8px',marginTop:'10px',flexWrap:'wrap'}}>{!o.driver_phone && driverOnline && <button onClick={()=>assignDriverToOrder(o.id)} style={{flex:1,background:'#0F4C75',color:'white',border:'none',padding:'12px',borderRadius:'10px',fontWeight:'800'}}>🚚 Вземи</button>}{(o.status==='ready_for_driver' || o.status==='on_the_way_to_shop') && o.driver_phone===currentUser.phone && <button onClick={()=>refuseOrder(o.id)} style={{background:'#f3f4f6',border:'none',padding:'12px',borderRadius:'10px'}}>❌ Откажи</button>}{o.driver_phone===currentUser.phone && o.status==='on_the_way_to_shop' && <button onClick={()=>updateOrderStatus(o.id,'picked_up')} style={{flex:1,background:'#8b5cf6',color:'white',border:'none',padding:'12px',borderRadius:'10px'}}>📦 Взех от магазина</button>}{o.driver_phone===currentUser.phone && o.status==='picked_up' && <button onClick={()=>updateOrderStatus(o.id,'on_the_way')} style={{flex:1,background:'#f59e0b',color:'white',border:'none',padding:'12px',borderRadius:'10px'}}>🚚 Към клиент</button>}{o.driver_phone===currentUser.phone && o.status==='on_the_way' && <button onClick={()=>{ updateOrderStatus(o.id,'delivered'); }} style={{flex:1,background:'#22c55e',color:'white',border:'none',padding:'12px',borderRadius:'10px',fontWeight:'800'}}>✅ Доставена - изчезва LIVE +{shops.find(s=>s.id===o.shop_id)?.delivery_fee||4.99}€</button>}</div></div>)})}
          </div>
        )}
        {tab==='admin' && isAdmin && (
          <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
            <div style={{background:'#FFD60A',padding:'14px',borderRadius:'14px',border:'2px solid black'}}><b>👑 Админ LIVE</b><div style={{fontSize:'11px'}}>Магазини: {shops.length} • Отворени LIVE: {shops.filter(s=>s.vip_active!==false).length} • Шофьори LIVE: {driverStatuses.filter((d:any)=>d.is_online).length} / {driverStatuses.length}</div></div>
            <div style={{background:'white',border:'2px solid #0F4C75',borderRadius:'14px',padding:'12px'}}>
              <b>🚚 Шофьори LIVE - без рефреш {driverStatuses.length}</b>
              {driverStatuses.map((d:any)=>(
                <div key={d.clean_phone} style={{display:'flex',justifyContent:'space-between',alignItems:'center',background: d.is_online? '#f0fdf4' : '#fee2e2',padding:'10px',borderRadius:'10px',marginTop:'8px',border: d.is_online? '1px solid #22c55e' : '1px solid #FF3B30'}}>
                  <div><b>{d.phone}</b><div style={{fontSize:'10px'}}>{d.is_online? '🟢 Онлайн LIVE' : '🔴 Офлайн LIVE'} • {d.deliveries_today||0} дост. • {parseFloat(d.earnings_today||0).toFixed(2)}€ • {new Date(d.updated_at).toLocaleTimeString('bg-BG')}</div></div>
                  <span style={{fontSize:'10px',background: d.is_online? '#22c55e' : '#FF3B30',color:'white',padding:'4px 8px',borderRadius:'10px'}}>{d.is_online? 'ОНЛАЙН' : 'ОФЛАЙН'}</span>
                </div>
              ))}
              {driverStatuses.length===0 && <div style={{fontSize:'11px',color:'#666',marginTop:'8px',textAlign:'center'}}>Няма данни още - шофьор като цъкне Онлайн/Офлайн ще се появи тук LIVE без рефреш</div>}
            </div>
            <div style={{background:'white',border:'2px solid black',borderRadius:'14px',padding:'12px'}}><b>{editShopData? '✏️ Редактирай' : '➕ Нов магазин'}</b><input placeholder="Име" value={shopName} onChange={e=>setShopName(e.target.value)} style={{width:'100%',padding:'10px',marginTop:'8px',borderRadius:'8px',border:'1px solid #ddd'}}/><input placeholder="Адрес" value={shopAddress} onChange={e=>setShopAddress(e.target.value)} style={{width:'100%',padding:'10px',marginTop:'6px',borderRadius:'8px',border:'1px solid #ddd'}}/><input placeholder="Град" value={shopCity} onChange={e=>setShopCity(e.target.value)} style={{width:'100%',padding:'10px',marginTop:'6px',borderRadius:'8px',border:'1px solid #ddd'}}/><input placeholder="Такса €" value={shopDeliveryFee} onChange={e=>setShopDeliveryFee(e.target.value)} style={{width:'100%',padding:'10px',marginTop:'6px',borderRadius:'8px',border:'1px solid #ddd'}}/><input placeholder="Телефон собственик" value={ownerPhone} onChange={e=>setOwnerPhone(e.target.value)} style={{width:'100%',padding:'10px',marginTop:'6px',borderRadius:'8px',border:'2px solid #22c55e'}}/><input placeholder="Телефон шофьор" value={driverPhone} onChange={e=>setDriverPhone(e.target.value)} style={{width:'100%',padding:'10px',marginTop:'6px',borderRadius:'8px',border:'1px solid #ddd'}}/><div style={{display:'flex',gap:'6px',marginTop:'10px'}}><button onClick={addShop} style={{flex:1,background:'black',color:'#FFD60A',border:'none',padding:'12px',borderRadius:'10px',fontWeight:'800'}}>{editShopData? '💾 Обнови' : '✅ Създай'}</button>{editShopData && <button onClick={cancelEditShop} style={{flex:1,background:'#f3f4f6',border:'none',padding:'12px',borderRadius:'10px'}}>❌ Откажи</button>}</div></div>
            <div style={{background:'white',borderRadius:'14px',padding:'12px'}}><b>🏪 Магазини LIVE - {shops.length}</b>{shops.map((s:any)=>{ const driverP = shopProfiles.find((p:any)=> p.shop_id===s.id && p.role==='driver'); return (<div key={s.id} style={{background: s.vip_active===false? '#fee2e2' : '#f9fafb',padding:'12px',borderRadius:'12px',border:'1px solid #e5e7eb',marginTop:'10px'}}><div style={{display:'flex',justifyContent:'space-between'}}><div><b>{s.name} {s.vip_active===false? '🔴 Затворен LIVE' : '🟢 Отворен LIVE'}</b><div style={{fontSize:'11px',color:'#666'}}>📍 {s.address} • {s.delivery_fee}€</div><div style={{fontSize:'10px'}}>Собств: {s.phone} {driverP? `• Шофьор: ${driverP.phone}`:''}</div></div><div style={{display:'flex',flexDirection:'column',gap:'4px'}}><button onClick={()=>startEditShop(s)} style={{background:'#0F4C75',color:'white',border:'none',padding:'6px 10px',borderRadius:'8px',fontSize:'11px'}}>✏️</button><button onClick={()=>toggleShopActive(s)} style={{background:s.vip_active===false?'#22c55e':'#FF3B30',color:'white',border:'none',padding:'6px 10px',borderRadius:'8px',fontSize:'11px'}}>{s.vip_active===false?'▶️ Отвори LIVE':'⏸️ Затвори LIVE'}</button><button onClick={()=>deleteShop(s.id)} style={{background:'#FF3B30',color:'white',border:'none',padding:'6px 10px',borderRadius:'8px',fontSize:'11px'}}>🗑️</button></div></div></div>)})}</div>
          </div>
        )}
      </div>
      {toastMsg && <div style={{position:'fixed',bottom:'20px',left:'50%',transform:'translateX(-50%)',background:'black',color:'white',padding:'10px 20px',borderRadius:'20px',fontSize:'12px',zIndex:9999}}>{toastMsg}</div>}
    </main>
  );
}