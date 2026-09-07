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

  // === НОВО ЗА ИМЕЙЛ ВЕРИФИКАЦИЯ БЕЗПЛАТНО - СТАРИТЕ 2 ТЕЛЕФОНА СЕ ПАЗЯТ ===
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
  const [ownerPhone,setOwnerPhone]=useState('');
  const [driverPhone,setDriverPhone]=useState('');
  const [editShopData,setEditShopData]=useState<{[k:string]: any}>({});
  
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
  const [orderStatusFilter,setOrderStatusFilter]=useState('all');
  
  const [cart,setCart]=useState<{product:any, qty:number}[]>([]);
  const [customerAddr,setCustomerAddr]=useState('');
  const [debugLog,setDebugLog]=useState('');

  const [sortedOrders,setSortedOrders]=useState<any[]>([]);
  const [isSorting,setIsSorting]=useState(false);

  const isAdmin = currentUser && isAdminPhone(currentUser.phone);

  // === НОВА ЛОГИКА ЗА ВХОД СЪС ЗАПАЗВАНЕ НА СТАРИТЕ 2 ТЕЛЕФОНА ===
  const handleAuth = async ()=>{
    const cleanPhone = clean(loginForm.phone);
    if(!loginForm.phone || cleanPhone.length<9){ alert('Въведи валиден телефон'); return; }

    if(loginTab==='login'){
      const {data:found} = await supabase.from('users').select('*').or(`clean_phone.eq.${cleanPhone},phone.eq.${loginForm.phone}`).maybeSingle();
      if(!found){ alert('Няма акаунт! Регистрирай се.'); setLoginTab('register'); return; }
      // СТАРИТЕ 2 ТЕЛЕФОНА СА is_verified=true - ВЛИЗАТ ДИРЕКТНО БЕЗ КОД - ЗАПАЗВАТ СЕ
      const u={id:found.id,firstName:found.first_name,lastName:found.last_name,phone:found.phone,email:found.email}; 
      localStorage.setItem('vozime_current',JSON.stringify(u)); 
      setCurrentUser(u);
      showToast(`Добре дошъл, ${found.first_name}!`);
      return;
    }

    // РЕГИСТРАЦИЯ С ИМЕЙЛ КОД БЕЗПЛАТНО
    if(!loginForm.firstName || !loginForm.lastName || !loginForm.phone || !loginForm.email){ alert('Попълни Име, Фамилия, Телефон и Имейл'); return; }
    if(!loginForm.email.includes('@')){ alert('Невалиден имейл'); return; }

    const {data:existing} = await supabase.from('users').select('*').eq('clean_phone', cleanPhone).maybeSingle();
    if(existing){ alert('Вече съществува! Влез.'); setLoginTab('login'); return; }

    setIsSendingCode(true);
    const code = Math.floor(100000 + Math.random()*900000).toString();
    const expires = new Date(Date.now()+10*60*1000).toISOString();

    const {error:codeErr} = await supabase.from('email_codes').insert({
      email: loginForm.email.trim().toLowerCase(),
      clean_phone: cleanPhone,
      code: code,
      expires_at: expires,
      used: false
    });
    if(codeErr){ alert('Грешка при код: '+codeErr.message); setIsSendingCode(false); return; }

    // Опитваме да пратим имейл през API-то ако го има, ако не - показваме кода безплатно на екрана
    try{
      const res = await fetch('/api/send-email',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:loginForm.email.trim().toLowerCase(),code,firstName:loginForm.firstName})});
      const j = await res.json().catch(()=>({}));
      if(j.codeForTesting) setCodeForTest(j.codeForTesting);
      else setCodeForTest(code); // тест режим - показваме кода безплатно
    }catch{
      setCodeForTest(code); // ако няма API route - пак показваме кода безплатно за тест
    }

    setPendingData({firstName:loginForm.firstName,lastName:loginForm.lastName,fullPhone:loginForm.phone.trim(),cleanPhone,email:loginForm.email.trim().toLowerCase()});
    setVerificationStep('verify');
    setCodeInput('');
    setIsSendingCode(false);
    showToast(`Код изпратен на ${loginForm.email} (безплатно)`);
  };

  const handleVerifyCode = async ()=>{
    if(!codeInput || codeInput.length!==6){ alert('Въведи 6-цифрен код'); return; }
    if(!pendingData) return;

    const {data:codeRow} = await supabase.from('email_codes')
      .select('*')
      .eq('email',pendingData.email)
      .eq('clean_phone',pendingData.cleanPhone)
      .eq('code',codeInput.trim())
      .eq('used',false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at',{ascending:false})
      .limit(1)
      .maybeSingle();

    if(!codeRow){ alert('Грешен или изтекъл код!'); return; }

    await supabase.from('email_codes').update({used:true}).eq('id',codeRow.id);

    const {data:newUser,error} = await supabase.from('users').insert({
      first_name: pendingData.firstName,
      last_name: pendingData.lastName,
      phone: pendingData.fullPhone,
      clean_phone: pendingData.cleanPhone,
      email: pendingData.email,
      is_verified: true,
      email_verified: true
    }).select().single();

    if(error){ alert(error.message); return; }

    const u={id:newUser.id,firstName:newUser.first_name,lastName:newUser.last_name,phone:newUser.phone,email:newUser.email};
    localStorage.setItem('vozime_current',JSON.stringify(u));
    setCurrentUser(u);
    setVerificationStep('form');
    setPendingData(null);
    setCodeInput('');
    setCodeForTest(null);
    setLoginForm({firstName:'',lastName:'',phone:'',email:''});
    showToast(`Успешна регистрация, ${newUser.first_name}! Вече влизаш само с телефон.`);
  };

  const loadShops = async ()=>{
    const {data}=await supabase.from('shops').select('*').order('created_at',{ascending:false});
    if(data) setShops(data);
    const {data:profiles}=await supabase.from('shop_profiles').select('*');
    if(profiles) setShopProfiles(profiles);
  };

  const loadMyShopProfile = async ()=>{
    if(!currentUser?.phone) return;
    const myClean10 = clean(currentUser.phone);
    const myCleanFull = cleanFull(currentUser.phone);
    const {data:allProfiles}=await supabase.from('shop_profiles').select('*');
    if(!allProfiles){ setMyShopProfile(null); return; }
    let myProfiles:any[] = allProfiles.filter((p:any)=>{
      const p10=clean(p.phone); const pFull=cleanFull(p.phone);
      return p10===myClean10 || pFull===myCleanFull || p.phone===currentUser.phone;
    });
    if(myProfiles.length===0 && isAdmin){
      const {data:allOrders}=await supabase.from('orders').select('*').order('created_at',{ascending:false}).limit(100);
      if(allOrders) setMyShopOrders(allOrders);
      const {data:allProds}=await supabase.from('products').select('*').limit(100);
      if(allProds) setMyShopProducts(allProds);
      return;
    }
    if(myProfiles.length===0){ setMyShopProfile(null); setMyShopProducts([]); setMyShopOrders([]); return; }
    const ownerProfile = myProfiles.find((p:any)=>p.role==='shop_owner') || myProfiles[0];
    setMyShopProfile(ownerProfile);
    const shopIds = [...new Set(myProfiles.map((p:any)=>p.shop_id))];
    let allProds:any[]=[]; let allOrders:any[]=[];
    for(const sid of shopIds){
      const {data:prods}=await supabase.from('products').select('*').eq('shop_id', sid);
      if(prods) allProds=[...allProds,...prods];
      const {data:ords}=await supabase.from('orders').select('*').eq('shop_id', sid).order('created_at',{ascending:false});
      if(ords) allOrders=[...allOrders,...ords];
    }
    setMyShopProducts(allProds);
    setMyShopOrders(allOrders);
  };

  const loadCustomerOrders = async ()=>{
    if(!currentUser?.phone) return;
    const {data}=await supabase.from('orders').select('*').eq('customer_phone', currentUser.phone).order('created_at',{ascending:false});
    if(data) setCustomerOrders(data);
  };

  const loadMarketProducts = async (shopId:string)=>{
    const {data}=await supabase.from('products').select('*').eq('shop_id', shopId);
    if(data) setMarketProducts(data.filter((p:any)=>p.active!==false));
    setSelectedShop(shops.find(s=>s.id===shopId));
    setCart([]);
  };

  const addShop = async ()=>{
    if(!shopName || !ownerPhone){ alert('Име и телефон!'); return; }
    const {data,error}=await supabase.from('shops').insert({
      name:shopName,
      slug:shopName.toLowerCase().replace(/\s+/g,'-')+'-'+Date.now(),
      city:shopAddress||'',
      address:shopAddress||'',
      phone:ownerPhone,
      delivery_fee:4.99,
      vip_active:true
    }).select().single();
    if(error){ alert(error.message); return; }
    await supabase.from('shop_profiles').insert([{phone:ownerPhone,role:'shop_owner',shop_id:data.id}]);
    if(driverPhone) await supabase.from('shop_profiles').insert([{phone:driverPhone,role:'driver',shop_id:data.id}]);
    setShopName(''); setShopAddress(''); setOwnerPhone(''); setDriverPhone(''); await loadShops();
  };

  const toggleShopActive = async (shop:any)=>{
    await supabase.from('shops').update({vip_active:!shop.vip_active}).eq('id',shop.id); await loadShops();
  };

  const deleteShop = async (id:string)=>{
    if(!confirm('Изтрий магазина?')) return;
    await supabase.from('shop_profiles').delete().eq('shop_id',id);
    await supabase.from('products').delete().eq('shop_id',id);
    await supabase.from('shops').delete().eq('id',id);
    await loadShops();
  };

  const addProductWithImage = async ()=>{
    const targetShopId = myShopProfile?.shop_id || shops[0]?.id;
    if(!targetShopId){ alert('Нямаш магазин!'); return; }
    if(!newProdName.trim() || !newProdPrice.trim()){ alert('Име и цена!'); return; }
    const priceNum=parseFloat(newProdPrice.replace(',','.').replace(/[^\d.]/g,''));
    if(isNaN(priceNum)||priceNum<=0){ alert('Грешна цена!'); return; }
    let imageUrl=editingProduct?.image_url||null;
    if(newProdFile){
      const fname=`${targetShopId}_${Date.now()}_${newProdFile.name}`;
      const {error}=await supabase.storage.from('product-images').upload(fname,newProdFile);
      if(error){ alert(error.message); return; }
      const {data:urlData}=supabase.storage.from('product-images').getPublicUrl(fname);
      imageUrl=urlData.publicUrl;
    }
    const desc=`[${newProdCat}] ${newProdDesc.trim()}`;
    try{
      if(editingProduct){
        await supabase.from('products').update({name:newProdName.trim(),price:priceNum,description:desc,image_url:imageUrl,active:newProdActive}).eq('id',editingProduct.id);
      }else{
        await supabase.from('products').insert({shop_id:targetShopId,name:newProdName.trim(),price:priceNum,description:desc,image_url:imageUrl,active:newProdActive});
      }
      setDebugLog(`✅ ${newProdName} запазен`);
    }catch(e:any){ alert(e.message); return; }
    setNewProdName(''); setNewProdPrice(''); setNewProdDesc(''); setNewProdFile(null); setEditingProduct(null);
    await loadMyShopProfile();
  };

  const startEditProduct = (p:any)=>{ setEditingProduct(p); setNewProdName(p.name); setNewProdPrice(p.price.toString()); setNewProdDesc((p.description||'').replace(/^\[.*?\]\s*/,'').trim()); const m=p.description?.match(/^\[(.*?)\]/); if(m) setNewProdCat(m[1]); setNewProdActive(p.active!==false); window.scrollTo({top:0,behavior:'smooth'}); };
  const cancelEditProduct = ()=>{ setEditingProduct(null); setNewProdName(''); setNewProdPrice(''); setNewProdDesc(''); setNewProdFile(null); };
  const deleteProduct = async (id:string)=>{ if(!confirm('Изтрий?')) return; await supabase.from('products').delete().eq('id',id); setMyShopProducts(myShopProducts.filter(p=>p.id!==id)); };

  const addToCart = (product:any)=>{
    setCart(prev=>{
      const ex=prev.find(c=>c.product.id===product.id);
      if(ex) return prev.map(c=> c.product.id===product.id ? {...c,qty:c.qty+1}:c);
      return [...prev,{product,qty:1}];
    });
  };
  const incCart = (pid:string)=> setCart(prev=> prev.map(c=> c.product.id===pid ? {...c,qty:c.qty+1}:c));
  const decCart = (pid:string)=> setCart(prev=>{
    const ex=prev.find(c=>c.product.id===pid); if(!ex) return prev;
    if(ex.qty<=1) return prev.filter(c=>c.product.id!==pid);
    return prev.map(c=> c.product.id===pid ? {...c,qty:c.qty-1}:c);
  });
  const removeCartItem = (pid:string)=> setCart(prev=> prev.filter(c=>c.product.id!==pid));
  const getCartCount = ()=> cart.reduce((s,c)=>s+c.qty,0);
  const getCartSubtotal = ()=> cart.reduce((s,c)=> s + parseFloat(c.product.price)*c.qty,0);
  const getCartTotal = ()=> getCartSubtotal() + parseFloat(selectedShop?.delivery_fee||4.99);

  const placeOrder = async ()=>{
    if(!selectedShop || cart.length===0 || !customerAddr.trim()){ alert('Адрес и количка!'); return; }
    const items=cart.map(c=>({id:c.product.id,name:c.product.name,price:c.product.price,qty:c.qty,image_url:c.product.image_url}));
    const total=getCartTotal();
    try{
      const {error}=await supabase.from('orders').insert({shop_id:selectedShop.id,customer_phone:currentUser.phone,customer_name:`${currentUser.firstName} ${currentUser.lastName}`,address:customerAddr,items,total,status:'new',driver_requested:false});
      if(error) throw error;
      alert('✅ Поръчка изпратена! Магазинара трябва да поиска шофьор за да дойде при теб.');
      setCart([]); setCustomerAddr(''); await loadCustomerOrders();
    }catch(e:any){ alert(e.message); }
  };

  const updateOrderStatus = async (orderId:string,status:string)=>{
    await supabase.from('orders').update({status}).eq('id',orderId);
    await loadMyShopProfile(); await loadCustomerOrders();
  };

  const requestDriverForOrder = async (orderId:string)=>{
    await supabase.from('orders').update({driver_requested:true, status:'ready_for_driver'}).eq('id',orderId);
    alert('✅ Поиска шофьор! Отиде при шофьорите.');
    await loadMyShopProfile();
  };

  const assignDriverToOrder = async (orderId:string)=>{
    const active = myShopOrders.filter((o:any)=> o.driver_phone===currentUser.phone && ['on_the_way_to_shop','picked_up','on_the_way','ready_for_driver'].includes(o.status));
    if(active.length>=3){ alert('⛔ Лимит 3! Завърши една за да вземеш нова. Активни: '+active.length); return; }
    await supabase.from('orders').update({driver_phone:currentUser.phone, status:'on_the_way_to_shop'}).eq('id',orderId);
    await loadMyShopProfile();
  };

  const refuseOrder = async (orderId:string)=>{
    if(!confirm('Отказваш ли?')) return;
    await supabase.from('orders').update({driver_phone:null, driver_requested:false, status:'preparing'}).eq('id',orderId);
    await loadMyShopProfile();
  };

  const geocodeAddress = async (addr:string)=>{
    try{
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addr)}&limit=1`);
      const data = await res.json();
      if(data && data[0]) return {lat:parseFloat(data[0].lat), lon:parseFloat(data[0].lon)};
    }catch{}
    return null;
  };
  const calcDistance = (a:any,b:any)=>{
    const R=6371; const dLat=(b.lat-a.lat)*Math.PI/180; const dLon=(b.lon-a.lon)*Math.PI/180;
    const lat1=a.lat*Math.PI/180; const lat2=b.lat*Math.PI/180;
    const h=Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;
    return R*2*Math.asin(Math.sqrt(h));
  };
  const sortByDistance = async ()=>{
    if(myShopOrders.length<=1) return;
    setIsSorting(true);
    try{
      const byShop: any = {};
      myShopOrders.forEach((o:any)=>{ if(!byShop[o.shop_id]) byShop[o.shop_id]=[]; byShop[o.shop_id].push(o); });
      let allSorted:any[]=[];
      for(const shopId in byShop){
        const shop = shops.find(s=>s.id===shopId);
        const shopAddr = shop?.address || shop?.city || '';
        const shopCoords = await geocodeAddress(shopAddr);
        if(!shopCoords){ allSorted=[...allSorted,...byShop[shopId]]; continue; }
        const withDist = await Promise.all(byShop[shopId].map(async (o:any)=>{
          const custCoords = await geocodeAddress(o.address);
          const dist = custCoords ? calcDistance(shopCoords,custCoords) : 9999;
          return {...o,_dist:dist};
        }));
        withDist.sort((a,b)=>a._dist-b._dist);
        allSorted=[...allSorted,...withDist];
      }
      setSortedOrders(allSorted);
    }catch{ setSortedOrders(myShopOrders); }
    setIsSorting(false);
  };

  useEffect(()=>{
    const cu=localStorage.getItem('vozime_current'); if(cu) setCurrentUser(JSON.parse(cu));
    loadShops();
  },[]);
  useEffect(()=>{ if(currentUser){ loadMyShopProfile(); loadCustomerOrders(); } },[currentUser]);
  useEffect(()=>{
    if(!currentUser) return;
    const ch=supabase.channel('shops-live-'+currentUser.phone)
      .on('postgres_changes',{event:'*',schema:'public',table:'orders'},()=>{ loadMyShopProfile(); loadCustomerOrders(); })
      .on('postgres_changes',{event:'*',schema:'public',table:'products'},()=>{ loadMyShopProfile(); if(selectedShop) loadMarketProducts(selectedShop.id); })
      .subscribe();
    const interval=setInterval(()=>{ loadShops(); loadMyShopProfile(); loadCustomerOrders(); },8000);
    return ()=>{ supabase.removeChannel(ch); clearInterval(interval); };
  },[currentUser, selectedShop?.id]);

  const logout=()=>{ localStorage.removeItem('vozime_current'); setCurrentUser(null); setTab('market'); setVerificationStep('form'); };

  if(!currentUser){
    return (
      <main style={{position:'fixed',inset:0,display:'flex',alignItems:'center',justifyContent:'center',background:'#0F4C75',padding:'16px'}}>
        <div style={{background:'white',padding:'20px',borderRadius:'24px',width:'100%',maxWidth:'380px'}}>
          <div style={{fontWeight:'800',fontSize:'22px',color:'#0F4C75',textAlign:'center'}}>🛒 Магазини VoziMe</div>
          <div style={{textAlign:'center',fontSize:'12px',color:'#666',marginTop:'6px'}}>Безплатна имейл верификация • Старите телефони запазени</div>

          {verificationStep==='form' ? (
            <>
              <div style={{display:'flex',background:'#f1f3f4',borderRadius:'12px',padding:'3px',margin:'16px 0'}}><button onClick={()=>setLoginTab('login')} style={{flex:1,padding:'10px',borderRadius:'8px',border:'none',fontWeight:'bold',background:loginTab==='login'?'#0F4C75':'white',color:loginTab==='login'?'white':'#666'}}>Вход</button><button onClick={()=>setLoginTab('register')} style={{flex:1,padding:'10px',borderRadius:'8px',border:'none',fontWeight:'bold',background:loginTab==='register'?'#0F4C75':'white',color:loginTab==='register'?'white':'#666'}}>Регистрация</button></div>
              
              {loginTab==='register' && (
                <>
                  <input placeholder="Име" value={loginForm.firstName} onChange={e=>setLoginForm({...loginForm,firstName:e.target.value})} style={{width:'100%',padding:'14px',borderRadius:'12px',border:'1px solid #e5e7eb',background:'#f9fafb',marginBottom:'10px'}}/>
                  <input placeholder="Фамилия" value={loginForm.lastName} onChange={e=>setLoginForm({...loginForm,lastName:e.target.value})} style={{width:'100%',padding:'14px',borderRadius:'12px',border:'1px solid #e5e7eb',background:'#f9fafb',marginBottom:'10px'}}/>
                  <input placeholder="Имейл за безплатен код" value={loginForm.email} onChange={e=>setLoginForm({...loginForm,email:e.target.value})} style={{width:'100%',padding:'14px',borderRadius:'12px',border:'2px solid #22c55e',background:'#f0fdf4',marginBottom:'10px'}}/>
                  <div style={{fontSize:'10px',color:'#22c55e',marginBottom:'10px'}}>✅ Безплатно на имейл - старите 2 номера влизат директно без код</div>
                </>
              )}
              
              <input placeholder="Телефон +359..." value={loginForm.phone} onChange={e=>setLoginForm({...loginForm,phone:e.target.value})} style={{width:'100%',padding:'14px',borderRadius:'12px',border:'1px solid #e5e7eb',background:'#f9fafb',marginBottom:'16px'}}/>
              <button onClick={handleAuth} disabled={isSendingCode} style={{width:'100%',padding:'16px',background: isSendingCode?'#9ca3af':'#22c55e',border:'none',borderRadius:'14px',fontWeight:'bold',color:'white'}}>
                {isSendingCode ? '⏳ Пращам код...' : loginTab==='register' ? '📧 Изпрати код на имейл →' : 'Влез →'}
              </button>
              {loginTab==='login' && <div style={{fontSize:'10px',color:'#666',textAlign:'center',marginTop:'8px'}}>Старите регистрирани телефони влизат директно без код</div>}
            </>
          ) : (
            <>
              <div style={{fontWeight:'800',marginBottom:'10px'}}>📧 Въведи кода от имейла</div>
              <div style={{fontSize:'12px',color:'#666',marginBottom:'12px'}}>Изпратихме код на <b>{pendingData?.email}</b> (безплатно)</div>
              <input value={codeInput} onChange={e=>setCodeInput(e.target.value.replace(/\D/g,'').slice(0,6))} placeholder="123456" style={{width:'100%',padding:'16px',borderRadius:'12px',border:'2px solid #0F4C75',textAlign:'center',fontSize:'22px',letterSpacing:'6px',fontWeight:'800',marginBottom:'12px'}}/>
              {codeForTest && (
                <div style={{background:'#fef3c7',border:'2px solid #f59e0b',borderRadius:'12px',padding:'12px',textAlign:'center',marginBottom:'12px'}}>
                  <div style={{fontSize:'10px',color:'#92400e'}}>ТЕСТ РЕЖИМ (безплатно) - Твоят код е:</div>
                  <div style={{fontSize:'24px',fontWeight:'900',letterSpacing:'4px'}}>{codeForTest}</div>
                  <div style={{fontSize:'9px',color:'#666',marginTop:'4px'}}>Добави RESEND_API_KEY в Vercel за истински имейли, иначе кода се показва тук</div>
                </div>
              )}
              <button onClick={handleVerifyCode} style={{width:'100%',padding:'16px',background:'#0F4C75',border:'none',borderRadius:'14px',fontWeight:'bold',color:'white'}}>✅ Потвърди кода →</button>
              <button onClick={()=>{setVerificationStep('form'); setCodeForTest(null); setPendingData(null);}} style={{width:'100%',marginTop:'8px',padding:'10px',background:'#f3f4f6',border:'none',borderRadius:'10px',fontSize:'12px'}}>← Назад</button>
            </>
          )}

          {toastMsg && <div style={{marginTop:'12px',background:'#0F4C75',color:'white',padding:'10px',borderRadius:'10px',fontSize:'12px',textAlign:'center'}}>{toastMsg}</div>}
        </div>
      </main>
    );
  }

  const marketShops = shops.filter(s=> s.vip_active!==false);
  const filteredMarketShops = marketShops.filter(s=> !marketSearch || s.name.toLowerCase().includes(marketSearch.toLowerCase()));
  const filteredMarketProducts = marketProducts.filter(p=>{
    if(marketSearch && !(p.name.toLowerCase().includes(marketSearch.toLowerCase()) || (p.description||'').toLowerCase().includes(marketSearch.toLowerCase()))) return false;
    if(marketCat!=='Всички' && !(p.description||'').includes(`[${marketCat}]`)) return false;
    return true;
  });
  const filteredMyProducts = myShopProducts.filter(p=>{
    if(prodSearch && !(p.name.toLowerCase().includes(prodSearch.toLowerCase()) || (p.description||'').toLowerCase().includes(prodSearch.toLowerCase()))) return false;
    if(prodCatFilter!=='Всички' && !(p.description||'').includes(`[${prodCatFilter}]`)) return false;
    return true;
  });
  const filteredOrders = myShopOrders.filter(o=> orderStatusFilter==='all' || o.status===orderStatusFilter);
  const driverOrders = (sortedOrders.length>0 ? sortedOrders : myShopOrders).filter((o:any)=> o.driver_requested);
  const activeDriverCount = myShopOrders.filter((o:any)=> o.driver_phone===currentUser.phone && ['on_the_way_to_shop','picked_up','on_the_way','ready_for_driver'].includes(o.status)).length;
  const availableDriverOrders = driverOrders.filter((o:any)=> !o.driver_phone || o.driver_phone===currentUser.phone);

  return (
    <main style={{height:'100dvh',width:'100%',maxWidth:'480px',margin:'0 auto',background:'#f9fafb',display:'flex',flexDirection:'column',overflow:'hidden',fontFamily:'-apple-system, sans-serif'}}>
      <header style={{background:'#0F4C75',color:'white',padding:'10px 12px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div><b>🛒 Магазини</b><div style={{fontSize:'10px',opacity:0.8}}>{currentUser.firstName} • {currentUser.phone} {isAdmin?'👑':''}</div></div>
        <div style={{display:'flex',gap:'6px'}}>{cart.length>0 && <div style={{background:'#22c55e',color:'white',padding:'6px 12px',borderRadius:'20px',fontWeight:'bold',fontSize:'12px'}}>🛒 {cart.reduce((s,c)=>s+c.qty,0)} • {cart.reduce((s,c)=>s+parseFloat(c.product.price)*c.qty,0).toFixed(2)}€</div>}<button onClick={logout} style={{background:'#FF3B30',border:'none',color:'white',padding:'6px 10px',borderRadius:'12px',fontSize:'11px',fontWeight:'bold'}}>Изход</button></div>
      </header>

      <div style={{display:'flex',gap:'4px',padding:'6px',background:'white',borderBottom:'1px solid #e5e7eb'}}>
        <button onClick={()=>setTab('market')} style={{flex:1,padding:'10px',borderRadius:'10px',border:'none',fontWeight:'bold',fontSize:'11px',background:tab==='market'?'#22c55e':'#f3f4f6',color:tab==='market'?'white':'#666'}}>🛒 Пазар</button>
        <button onClick={()=>setTab('my_orders')} style={{flex:1,padding:'10px',borderRadius:'10px',border:'none',fontWeight:'bold',fontSize:'11px',background:tab==='my_orders'?'#0F4C75':'#f3f4f6',color:tab==='my_orders'?'white':'#666'}}>📦 Мои ({customerOrders.length})</button>
        {(myShopProfile?.role==='shop_owner' || isAdmin) && <button onClick={()=>setTab('my_shop')} style={{flex:1,padding:'10px',borderRadius:'10px',border:'none',fontWeight:'bold',fontSize:'11px',background:tab==='my_shop'?'#f59e0b':'#f3f4f6',color:tab==='my_shop'?'white':'#666'}}>🏪 Моя</button>}
        {(myShopProfile?.role==='driver' || isAdmin) && <button onClick={()=>setTab('driver')} style={{flex:1,padding:'10px',borderRadius:'10px',border:'none',fontWeight:'bold',fontSize:'11px',background:tab==='driver'?'#0F4C75':'#f3f4f6',color:tab==='driver'?'white':'#666'}}>🚚 Доставки</button>}
        {isAdmin && <button onClick={()=>setTab('admin')} style={{flex:1,padding:'10px',borderRadius:'10px',border:'none',fontWeight:'bold',fontSize:'10px',background:tab==='admin'?'#FFD60A':'#f3f4f6',color:tab==='admin'?'black':'#666'}}>👑 Админ</button>}
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'10px',display:'flex',flexDirection:'column',gap:'12px'}}>

        {tab==='market' && (
          <>
            {!selectedShop ? (
              <>
                <div style={{background:'#22c55e',color:'white',padding:'14px',borderRadius:'14px'}}><b>🛒 Пазар - Магазини (без Sofia)</b><div style={{fontSize:'11px',marginTop:'4px'}}>VoziMe 0% - доставката е при магазина</div><input value={marketSearch} onChange={e=>setMarketSearch(e.target.value)} placeholder="🔍 Търси магазин..." style={{width:'100%',marginTop:'10px',padding:'10px',borderRadius:'10px',border:'none'}}/></div>
                {filteredMarketShops.map((s:any)=>(
                  <div key={s.id} onClick={()=>loadMarketProducts(s.id)} style={{background:'white',border:'2px solid #22c55e',borderRadius:'14px',padding:'14px',cursor:'pointer'}}>
                    <div style={{display:'flex',justifyContent:'space-between'}}><b>{s.name}</b><span style={{fontSize:'10px',background:'#22c55e',color:'white',padding:'4px 8px',borderRadius:'10px'}}>🟢 Активен</span></div>
                    <div style={{fontSize:'12px',color:'#666',marginTop:'4px'}}>📍 {s.address||s.city||'Без адрес'} • Доставка {s.delivery_fee}€ • 📞 {s.phone}</div>
                    <div style={{fontSize:'12px',color:'#22c55e',fontWeight:'800',marginTop:'8px'}}>Виж продукти →</div>
                  </div>
                ))}
              </>
            ) : (
              <>
                <button onClick={()=>{setSelectedShop(null); setMarketProducts([]); setCart([]);}} style={{padding:'10px',borderRadius:'10px',border:'1px solid #ddd',background:'white',fontWeight:'bold'}}>← Назад</button>
                <div style={{background:'#0F4C75',color:'white',padding:'14px',borderRadius:'14px'}}><b>{selectedShop.name}</b><div style={{fontSize:'11px'}}>Доставка {selectedShop.delivery_fee}€ • {selectedShop.phone} • {selectedShop.address}</div></div>
                <div style={{display:'flex',gap:'6px'}}><input value={marketSearch} onChange={e=>setMarketSearch(e.target.value)} placeholder="🔍 Търси продукт..." style={{flex:1,padding:'10px',borderRadius:'10px',border:'1px solid #ddd'}}/><select value={marketCat} onChange={e=>setMarketCat(e.target.value)} style={{padding:'10px',borderRadius:'10px',border:'1px solid #22c55e'}}>{PRODUCT_CATS.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
                {filteredMarketProducts.map((p:any)=>(
                  <div key={p.id} style={{background:'white',borderRadius:'14px',padding:'12px',display:'flex',gap:'12px',border:'1px solid #e5e7eb'}}>
                    {p.image_url && <img src={p.image_url} style={{width:'70px',height:'70px',objectFit:'cover',borderRadius:'10px'}}/>}
                    <div style={{flex:1}}><b style={{fontSize:'13px'}}>{p.name}</b><div style={{fontSize:'11px',color:'#666'}}>{(p.description||'').replace(/^\[.*?\]\s*/,'')}</div><div style={{fontWeight:'800',color:'#22c55e',marginTop:'4px'}}>{p.price}€</div></div>
                    <div>{cart.find(c=>c.product.id===p.id) ? (<div style={{display:'flex',alignItems:'center',gap:'6px',background:'#f0fdf4',padding:'6px',borderRadius:'10px',border:'1px solid #22c55e'}}><button onClick={()=>decCart(p.id)} style={{width:'28px',height:'28px',borderRadius:'50%',border:'none',background:'white',fontWeight:'bold'}}>−</button><b>{cart.find(c=>c.product.id===p.id)?.qty}</b><button onClick={()=>incCart(p.id)} style={{width:'28px',height:'28px',borderRadius:'50%',border:'none',background:'#22c55e',color:'white',fontWeight:'bold'}}>+</button></div>) : <button onClick={()=>addToCart(p)} style={{background:'#22c55e',color:'white',border:'none',padding:'10px 14px',borderRadius:'10px',fontWeight:'bold'}}>Добави</button>}</div>
                  </div>
                ))}
                {cart.length>0 && (
                  <div style={{background:'white',border:'3px solid #22c55e',borderRadius:'16px',padding:'14px',position:'sticky',bottom:'0'}}>
                    <b>🛒 Количка - {getCartCount()} продукта</b>
                    <div style={{marginTop:'8px'}}>{cart.map((c:any)=><div key={c.product.id} style={{display:'flex',justifyContent:'space-between',fontSize:'12px',padding:'4px 0'}}><span>{c.product.name} x{c.qty}</span><span>{(parseFloat(c.product.price)*c.qty).toFixed(2)}€</span></div>)}</div>
                    <div style={{display:'flex',justifyContent:'space-between',marginTop:'10px',fontSize:'12px'}}><span>Продукти:</span><span>{getCartSubtotal().toFixed(2)}€</span></div>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:'12px'}}><span>Доставка:</span><span>{selectedShop.delivery_fee}€</span></div>
                    <div style={{display:'flex',justifyContent:'space-between',fontWeight:'800',fontSize:'14px',borderTop:'2px solid #e5e7eb',paddingTop:'8px',marginTop:'8px'}}><span>Общо:</span><span>{getCartTotal().toFixed(2)}€</span></div>
                    <input value={customerAddr} onChange={e=>setCustomerAddr(e.target.value)} placeholder="📍 Адрес за доставка..." style={{width:'100%',padding:'12px',marginTop:'10px',borderRadius:'10px',border:'2px solid #22c55e'}}/>
                    <button onClick={placeOrder} style={{width:'100%',marginTop:'10px',padding:'14px',background:'#22c55e',color:'white',border:'none',borderRadius:'12px',fontWeight:'800'}}>✅ Поръчай за {getCartTotal().toFixed(2)}€</button>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {tab==='my_orders' && (
          <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
            <div style={{background:'#0F4C75',color:'white',padding:'12px',borderRadius:'12px'}}><b>📦 Моите поръчки - {customerOrders.length}</b></div>
            {customerOrders.map((o:any)=>(
              <div key={o.id} style={{background:'white',border:'2px solid #0F4C75',borderRadius:'14px',padding:'12px'}}>
                <div style={{display:'flex',justifyContent:'space-between'}}><b>#{o.id.slice(0,8)} • {parseFloat(o.total).toFixed(2)}€</b><span style={{fontSize:'10px',background:'#22c55e',color:'white',padding:'4px 8px',borderRadius:'10px'}}>{o.status}</span></div>
                <div style={{fontSize:'11px',color:'#666',marginTop:'4px'}}>{new Date(o.created_at).toLocaleString('bg-BG')} • 📍 {o.address}</div>
                <div style={{background:'#f9fafb',padding:'8px',borderRadius:'8px',marginTop:'8px',fontSize:'12px'}}>{(o.items||[]).map((it:any,i:number)=><div key={i} style={{display:'flex',justifyContent:'space-between'}}><span>{it.name} x{it.qty}</span><span>{(parseFloat(it.price)*(it.qty||1)).toFixed(2)}€</span></div>)}</div>
                {o.driver_requested && <div style={{fontSize:'11px',background:'#e0f2fe',padding:'6px',borderRadius:'8px',marginTop:'6px'}}>🚚 Шофьор поискан: {o.driver_phone||'чака шофьор'}</div>}
              </div>
            ))}
          </div>
        )}

        {tab==='my_shop' && (
          <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
            <div style={{background:'#22c55e',color:'white',padding:'14px',borderRadius:'14px'}}><b>🏪 Моят магазин - {shops.find(s=>s.id===myShopProfile?.shop_id)?.name||''}</b><div style={{fontSize:'11px'}}>{debugLog||'Добави продукти, виж поръчки, поискай шофьор'}</div></div>
            <div style={{background:editingProduct?'#fef3c7':'white',border:`2px solid ${editingProduct?'#f59e0b':'#22c55e'}`,borderRadius:'14px',padding:'14px'}}>
              <b>{editingProduct?`✏️ ${editingProduct.name}`:'➕ Нова стока'}</b>
              <input value={newProdName} onChange={e=>setNewProdName(e.target.value)} placeholder="Име: Кайма Варна 1кг" style={{width:'100%',padding:'12px',borderRadius:'10px',border:'1px solid #22c55e',marginTop:'10px'}}/>
              <div style={{display:'flex',gap:'8px',marginTop:'8px'}}><input value={newProdPrice} onChange={e=>setNewProdPrice(e.target.value)} placeholder="Цена 6.25" style={{flex:1,padding:'12px',borderRadius:'10px',border:'2px solid #22c55e'}}/><select value={newProdCat} onChange={e=>setNewProdCat(e.target.value)} style={{flex:1,padding:'12px',borderRadius:'10px',border:'1px solid #ddd'}}>{PRODUCT_CATS.filter(c=>c!=='Всички').map(c=><option key={c} value={c}>{c}</option>)}</select></div>
              <input value={newProdDesc} onChange={e=>setNewProdDesc(e.target.value)} placeholder="Описание" style={{width:'100%',padding:'10px',borderRadius:'10px',border:'1px solid #ddd',marginTop:'8px'}}/>
              <div style={{display:'flex',gap:'8px',marginTop:'8px'}}><label style={{fontSize:'12px'}}><input type="checkbox" checked={newProdActive} onChange={e=>setNewProdActive(e.target.checked)}/> Активен</label><input type="file" accept="image/*" onChange={e=>setNewProdFile(e.target.files?.[0]||null)} style={{flex:1,fontSize:'11px'}}/></div>
              <div style={{display:'flex',gap:'8px',marginTop:'10px'}}><button onClick={addProductWithImage} style={{flex:1,padding:'12px',background:editingProduct?'#f59e0b':'#22c55e',color:'white',border:'none',borderRadius:'10px',fontWeight:'800'}}>{editingProduct?'💾 Запази':'➕ Добави'}</button>{editingProduct && <button onClick={cancelEditProduct} style={{padding:'12px',background:'#e5e7eb',border:'none',borderRadius:'10px'}}>Откажи</button>}</div>
            </div>
            <div style={{background:'white',borderRadius:'12px',padding:'10px'}}><input value={prodSearch} onChange={e=>setProdSearch(e.target.value)} placeholder="🔍 Търси моя стока..." style={{width:'100%',padding:'10px',borderRadius:'8px',border:'1px solid #ddd'}}/><div style={{marginTop:'8px'}}><b>Мои стоки - {filteredMyProducts.length}</b>{filteredMyProducts.map((p:any)=><div key={p.id} style={{display:'flex',gap:'8px',border:'1px solid #e5e7eb',padding:'8px',borderRadius:'10px',marginTop:'6px'}}><div style={{flex:1}}><b style={{fontSize:'12px'}}>{p.name}</b><div style={{fontSize:'10px',color:'#666'}}>{p.description}</div><b style={{color:'#22c55e'}}>{p.price}€</b></div><button onClick={()=>startEditProduct(p)} style={{background:'#0F4C75',color:'white',border:'none',padding:'6px 10px',borderRadius:'6px',fontSize:'10px'}}>✏️</button><button onClick={()=>deleteProduct(p.id)} style={{background:'#FF3B30',color:'white',border:'none',padding:'6px 10px',borderRadius:'6px',fontSize:'10px'}}>🗑️</button></div>)}</div></div>
            <div style={{background:'white',border:'2px solid #22c55e',borderRadius:'14px',padding:'12px'}}>
              <b>📦 Поръчки LIVE - {myShopOrders.length}</b>
              {filteredOrders.map((o:any)=>(
                <div key={o.id} style={{border:'2px solid #0F4C75',borderRadius:'12px',padding:'10px',marginTop:'10px'}}>
                  <div style={{display:'flex',justifyContent:'space-between'}}><b>#{o.id.slice(0,8)} • {parseFloat(o.total).toFixed(2)}€</b><span style={{fontSize:'10px',background:'#f59e0b',color:'white',padding:'4px 8px',borderRadius:'8px'}}>{o.status}</span></div>
                  <div style={{fontSize:'11px',marginTop:'4px'}}>{o.customer_name} • {o.customer_phone} • 📍 {o.address}</div>
                  <div style={{background:'#f9fafb',padding:'6px',borderRadius:'8px',marginTop:'6px',fontSize:'11px'}}>{(o.items||[]).map((it:any)=><div key={it.id}>{it.name} x{it.qty} - {it.price}€</div>)}</div>
                  <div style={{display:'flex',gap:'6px',marginTop:'8px'}}>
                    {o.status==='new' && <button onClick={()=>updateOrderStatus(o.id,'accepted')} style={{flex:1,background:'#22c55e',color:'white',border:'none',padding:'10px',borderRadius:'8px',fontWeight:'bold'}}>✅ Приеми</button>}
                    {o.status==='accepted' && <button onClick={()=>updateOrderStatus(o.id,'preparing')} style={{flex:1,background:'#f59e0b',color:'white',border:'none',padding:'10px',borderRadius:'8px',fontWeight:'bold'}}>👨‍🍳 Готвя</button>}
                    {(o.status==='preparing' || o.status==='accepted') && !o.driver_requested && <button onClick={()=>requestDriverForOrder(o.id)} style={{flex:1,background:'#0F4C75',color:'white',border:'none',padding:'10px',borderRadius:'8px',fontWeight:'bold',fontSize:'11px'}}>🚚 Поискай шофьор</button>}
                    {o.driver_requested && <div style={{flex:1,background:'#e0f2fe',padding:'10px',borderRadius:'8px',textAlign:'center',fontSize:'11px',fontWeight:'bold'}}>🚚 Шофьор поискан: {o.driver_phone||'чака...'}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab==='driver' && (
          <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
            <div style={{background:'#0F4C75',color:'white',padding:'12px',borderRadius:'12px'}}>
              <div style={{display:'flex',justifyContent:'space-between'}}><b>🚚 Доставки LIVE - {driverOrders.length}</b><span style={{fontSize:'10px',background:'#22c55e',padding:'4px 8px',borderRadius:'10px'}}>LIVE</span></div>
              <div style={{background:activeDriverCount>=3?'#fee2e2':'#f0fdf4',border:'1px solid #fff',padding:'8px',borderRadius:'8px',marginTop:'8px',color:activeDriverCount>=3?'#991b1b':'#166534'}}>
                <b style={{fontSize:'12px',color:activeDriverCount>=3?'#991b1b':'#0F4C75'}}>📦 Лимит: {activeDriverCount}/3 активни</b>
                <div style={{fontSize:'10px'}}>{activeDriverCount>=3?'⛔ Лимит достигнат! Завърши поръчка.':`Можеш още ${3-activeDriverCount} поръчки. Само с поискан шофьор.`}</div>
              </div>
              {myShopOrders.length>1 && <button onClick={sortByDistance} disabled={isSorting} style={{width:'100%',marginTop:'8px',background:'#22c55e',color:'white',border:'none',padding:'10px',borderRadius:'10px',fontWeight:'bold'}}>{isSorting?'⏳ Сортирам...':'📍 Сортирай по близост до магазина'}</button>}
            </div>

            {availableDriverOrders.map((o:any)=>{
              const shop = shops.find(s=>s.id===o.shop_id);
              const shopAddr = shop?.address || shop?.city || '';
              return (
                <div key={o.id} style={{background:'white',border:'2px solid #0F4C75',borderRadius:'14px',padding:'12px'}}>
                  <div style={{display:'flex',justifyContent:'space-between'}}><b>#{o.id.slice(0,8)} • {parseFloat(o.total).toFixed(2)}€ {(o as any)._dist && `• ${(o as any)._dist.toFixed(1)}km`}</b><span style={{fontSize:'10px',background:'#0F4C75',color:'white',padding:'4px 8px',borderRadius:'10px'}}>{o.status}</span></div>
                  <div style={{fontSize:'11px',marginTop:'6px',background:'#e0f2fe',padding:'8px',borderRadius:'8px'}}><b>🏪 {shop?.name}</b><br/>📍 {shopAddr}<br/>📞 {shop?.phone}<br/><a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shopAddr)}`} target="_blank" style={{color:'#0F4C75',fontWeight:'bold'}}>🗺️ Навигация до магазина</a></div>
                  <div style={{fontSize:'11px',marginTop:'6px',background:'#fff3cd',padding:'8px',borderRadius:'8px'}}><b>👤 {o.customer_name}</b><br/>📍 {o.address}<br/><a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(o.address)}`} target="_blank" style={{color:'#b45309',fontWeight:'bold'}}>🗺️ Навигация до клиента</a></div>
                  <div style={{background:'#f9fafb',padding:'6px',borderRadius:'8px',marginTop:'6px',fontSize:'11px'}}>{(o.items||[]).map((it:any)=><div key={it.id}>{it.name} x{it.qty} - {(parseFloat(it.price)*(it.qty||1)).toFixed(2)}€</div>)}</div>
                  <div style={{display:'flex',gap:'8px',marginTop:'10px'}}>
                    {!o.driver_phone && <><button onClick={()=>assignDriverToOrder(o.id)} style={{flex:1,background:activeDriverCount>=3?'#9ca3af':'#0F4C75',color:'white',border:'none',padding:'12px',borderRadius:'10px',fontWeight:'800'}} disabled={activeDriverCount>=3}>🚚 Вземи</button><button onClick={()=>refuseOrder(o.id)} style={{background:'#f3f4f6',border:'1px solid #ddd',padding:'12px',borderRadius:'10px'}}>❌ Откажи</button></>}
                    {o.driver_phone===currentUser.phone && o.status==='on_the_way_to_shop' && <button onClick={()=>updateOrderStatus(o.id,'picked_up')} style={{flex:1,background:'#8b5cf6',color:'white',border:'none',padding:'12px',borderRadius:'10px',fontWeight:'800'}}>📦 Взех поръчката</button>}
                    {o.driver_phone===currentUser.phone && o.status==='picked_up' && <button onClick={()=>updateOrderStatus(o.id,'on_the_way')} style={{flex:1,background:'#f59e0b',color:'white',border:'none',padding:'12px',borderRadius:'10px',fontWeight:'800'}}>🚚 Пътувам към клиента</button>}
                    {o.driver_phone===currentUser.phone && (o.status==='on_the_way' || o.status==='picked_up') && <button onClick={()=>updateOrderStatus(o.id,'delivered')} style={{flex:1,background:'#22c55e',color:'white',border:'none',padding:'12px',borderRadius:'10px',fontWeight:'800'}}>✅ Завършена поръчка</button>}
                  </div>
                  {o.status==='delivered' && (
                    <div style={{marginTop:'10px'}}>
                      <div style={{background:'#dcfce7',padding:'10px',borderRadius:'8px',textAlign:'center',fontWeight:'800',color:'#166534'}}>✅ Завършена поръчка</div>
                      {(()=>{
                        const remaining = availableDriverOrders.filter((r:any)=> r.id!==o.id && ['on_the_way','picked_up','on_the_way_to_shop'].includes(r.status));
                        if(remaining.length>0){
                          const next = remaining[0];
                          return <div style={{background:'#0F4C75',color:'white',padding:'10px',borderRadius:'10px',marginTop:'8px'}}><b>➡️ Следваща спирка: {next.address}</b><br/><a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(next.address)}`} target="_blank" style={{display:'block',marginTop:'6px',background:'#22c55e',color:'white',padding:'8px',borderRadius:'8px',textAlign:'center',textDecoration:'none',fontWeight:'bold'}}>🗺️ Навигирай до следващия</a></div>
                        }
                        return <div style={{background:'#f0fdf4',padding:'8px',borderRadius:'8px',textAlign:'center',fontSize:'11px',marginTop:'8px'}}>🎉 Всички доставени!</div>
                      })()}
                    </div>
                  )}
                </div>
              )
            })}
            {availableDriverOrders.length===0 && <div style={{textAlign:'center',padding:'20px',background:'white',borderRadius:'12px',color:'#666'}}>Няма поръчки с поискан шофьор. Чакай магазинара да натисне "Поискай шофьор".</div>}
          </div>
        )}

        {tab==='admin' && isAdmin && (
          <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
            <div style={{background:'#FFD60A',padding:'12px',borderRadius:'12px'}}><b>👑 Админ</b><div style={{fontSize:'11px'}}>Добави магазин с адрес за шофьора</div></div>
            <div style={{background:'white',border:'2px solid #22c55e',borderRadius:'12px',padding:'12px'}}>
              <b>➕ Нов магазин</b>
              <input value={shopName} onChange={e=>setShopName(e.target.value)} placeholder="Име: HALASTRA" style={{width:'100%',padding:'10px',borderRadius:'8px',border:'1px solid #ddd',marginTop:'8px'}}/>
              <input value={shopAddress} onChange={e=>setShopAddress(e.target.value)} placeholder="📍 Адрес: ул. Вапцаров 2, Две Могили" style={{width:'100%',padding:'10px',borderRadius:'8px',border:'2px solid #0F4C75',marginTop:'8px'}}/>
              <input value={ownerPhone} onChange={e=>setOwnerPhone(e.target.value)} placeholder="Собственик тел" style={{width:'100%',padding:'10px',borderRadius:'8px',border:'1px solid #ddd',marginTop:'8px'}}/>
              <input value={driverPhone} onChange={e=>setDriverPhone(e.target.value)} placeholder="Шофьор тел (по желание)" style={{width:'100%',padding:'10px',borderRadius:'8px',border:'1px solid #ddd',marginTop:'8px'}}/>
              <button onClick={addShop} style={{width:'100%',marginTop:'10px',padding:'12px',background:'#22c55e',color:'white',border:'none',borderRadius:'10px',fontWeight:'800'}}>СЪЗДАЙ</button>
            </div>
            {shops.map((s:any)=>(
              <div key={s.id} style={{background:'white',padding:'12px',borderRadius:'12px',border:'1px solid #ddd'}}>
                <div style={{display:'flex',justifyContent:'space-between'}}><div><b>{s.name}</b><div style={{fontSize:'11px'}}>{s.address||s.city} • {s.phone} • {s.delivery_fee}€</div></div><div style={{display:'flex',gap:'4px'}}><button onClick={()=>toggleShopActive(s)} style={{background:s.vip_active===false?'#22c55e':'#FF3B30',color:'white',border:'none',padding:'6px 10px',borderRadius:'6px',fontSize:'10px'}}>{s.vip_active===false?'ПУСНИ':'СПРИ'}</button><button onClick={()=>deleteShop(s.id)} style={{background:'black',color:'white',border:'none',padding:'6px 10px',borderRadius:'6px',fontSize:'10px'}}>🗑️</button></div></div>
              </div>
            ))}
          </div>
        )}

      </div>

      {toastMsg && <div style={{position:'fixed',bottom:'20px',left:'50%',transform:'translateX(-50%)',background:'black',color:'white',padding:'10px 20px',borderRadius:'20px',fontSize:'12px',zIndex:9999}}>{toastMsg}</div>}
    </main>
  );
}