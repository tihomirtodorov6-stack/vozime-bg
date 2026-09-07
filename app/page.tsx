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
  const [allShopProfiles,setAllShopProfiles]=useState<any[]>([]); // всички профили за админ
  const [shopProfiles,setShopProfiles]=useState<any[]>([]); // мои профили
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

  // === НОВО ЗА АДМИН РЕДАКЦИЯ ===
  const [editingShop,setEditingShop]=useState<any>(null);
  const [editShopName,setEditShopName]=useState('');
  const [editShopAddress,setEditShopAddress]=useState('');
  const [editShopOwnerPhone,setEditShopOwnerPhone]=useState('');
  const [editShopDriverPhone,setEditShopDriverPhone]=useState('');
  const [editShopFee,setEditShopFee]=useState('');
  const [editShopCity,setEditShopCity]=useState('');
  
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
  const [debugLog,setDebugLog]=useState('');

  const [sortedOrders,setSortedOrders]=useState<any[]>([]);
  const [isSorting,setIsSorting]=useState(false);

  const isAdmin = currentUser && isAdminPhone(currentUser.phone);
  const isShopOwner = !!myShopProfile && myShopProfile.role==='shop_owner';
  const isDriver = shopProfiles.some((p:any)=> p.role==='driver');

  const handleAuth = async ()=>{
    const cleanPhone = clean(loginForm.phone);
    if(!loginForm.phone || cleanPhone.length<9){ alert('Въведи валиден телефон'); return; }
    if(loginTab==='login'){
      const {data:found} = await supabase.from('users').select('*').or(`clean_phone.eq.${cleanPhone},phone.eq.${loginForm.phone}`).maybeSingle();
      if(!found){ alert('Няма акаунт! Регистрирай се.'); setLoginTab('register'); return; }
      const u={id:found.id,firstName:found.first_name,lastName:found.last_name,phone:found.phone,email:found.email}; 
      localStorage.setItem('vozime_current',JSON.stringify(u)); setCurrentUser(u); return;
    }
    if(!loginForm.firstName || !loginForm.lastName || !loginForm.phone || !loginForm.email){ alert('Попълни всички'); return; }
    if(!loginForm.email.includes('@')){ alert('Невалиден имейл'); return; }
    const {data:existing} = await supabase.from('users').select('*').eq('clean_phone', cleanPhone).maybeSingle();
    if(existing){ alert('Вече съществува! Влез.'); setLoginTab('login'); return; }
    setIsSendingCode(true);
    const code = Math.floor(100000 + Math.random()*900000).toString();
    const expires = new Date(Date.now()+10*60*1000).toISOString();
    const {error:codeErr} = await supabase.from('email_codes').insert({email: loginForm.email.trim().toLowerCase(),clean_phone: cleanPhone,code: code,expires_at: expires,used: false});
    if(codeErr){ alert(codeErr.message); setIsSendingCode(false); return; }
    try{
      const res = await fetch('/api/send-email',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:loginForm.email.trim().toLowerCase(),code,firstName:loginForm.firstName})});
      const j = await res.json().catch(()=>({})); setCodeForTest(j.codeForTesting || code);
    }catch{ setCodeForTest(code); }
    setPendingData({firstName:loginForm.firstName,lastName:loginForm.lastName,fullPhone:loginForm.phone.trim(),cleanPhone,email:loginForm.email.trim().toLowerCase()});
    setVerificationStep('verify'); setCodeInput(''); setIsSendingCode(false);
  };

  const handleVerifyCode = async ()=>{
    if(!codeInput || codeInput.length!==6){ alert('6 цифри'); return; }
    if(!pendingData) return;
    const {data:codeRow} = await supabase.from('email_codes').select('*').eq('email',pendingData.email).eq('clean_phone',pendingData.cleanPhone).eq('code',codeInput.trim()).eq('used',false).gt('expires_at', new Date().toISOString()).order('created_at',{ascending:false}).limit(1).maybeSingle();
    if(!codeRow){ alert('Грешен код!'); return; }
    await supabase.from('email_codes').update({used:true}).eq('id',codeRow.id);
    const {data:newUser,error} = await supabase.from('users').insert({first_name: pendingData.firstName,last_name: pendingData.lastName,phone: pendingData.fullPhone,clean_phone: pendingData.cleanPhone,email: pendingData.email,is_verified: true,email_verified: true}).select().single();
    if(error){ alert(error.message); return; }
    const u={id:newUser.id,firstName:newUser.first_name,lastName:newUser.last_name,phone:newUser.phone,email:newUser.email};
    localStorage.setItem('vozime_current',JSON.stringify(u)); setCurrentUser(u);
    setVerificationStep('form'); setPendingData(null); setCodeInput(''); setCodeForTest(null);
    setLoginForm({firstName:'',lastName:'',phone:'',email:''});
  };

  const loadShops = async ()=>{
    const {data}=await supabase.from('shops').select('*').order('created_at',{ascending:false});
    if(data) setShops(data);
    const {data:profiles}=await supabase.from('shop_profiles').select('*');
    if(profiles) setAllShopProfiles(profiles);
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
    if(myProfiles.length===0){
      setMyShopProfile(null); setMyShopProducts([]); setMyShopOrders([]); setShopProfiles([]); return;
    }
    setShopProfiles(myProfiles);
    const ownerProfile = myProfiles.find((p:any)=>p.role==='shop_owner') || null;
    setMyShopProfile(ownerProfile);
    const shopIds = [...new Set(myProfiles.map((p:any)=>p.shop_id))];
    let allProds:any[]=[]; let allOrders:any[]=[];
    for(const sid of shopIds){
      const {data:prods}=await supabase.from('products').select('*').eq('shop_id', sid);
      if(prods) allProds=[...allProds,...prods];
      const {data:ords}=await supabase.from('orders').select('*').eq('shop_id', sid).order('created_at',{ascending:false});
      if(ords) allOrders=[...allOrders,...ords];
    }
    setMyShopProducts(allProds); setMyShopOrders(allOrders);
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
    const {data,error}=await supabase.from('shops').insert({name:shopName,slug:shopName.toLowerCase().replace(/\s+/g,'-')+'-'+Date.now(),city:shopAddress||'',address:shopAddress||'',phone:ownerPhone,delivery_fee:4.99,vip_active:true}).select().single();
    if(error){ alert(error.message); return; }
    await supabase.from('shop_profiles').insert([{phone:ownerPhone,role:'shop_owner',shop_id:data.id}]);
    if(driverPhone) await supabase.from('shop_profiles').insert([{phone:driverPhone,role:'driver',shop_id:data.id}]);
    setShopName(''); setShopAddress(''); setOwnerPhone(''); setDriverPhone(''); await loadShops();
  };

  // === НОВО: АДМИН РЕДАКЦИЯ НА МАГАЗИН ===
  const startEditShop = (shop:any)=>{
    const owner = allShopProfiles.find((p:any)=> p.shop_id===shop.id && p.role==='shop_owner');
    const driver = allShopProfiles.find((p:any)=> p.shop_id===shop.id && p.role==='driver');
    setEditingShop(shop);
    setEditShopName(shop.name||'');
    setEditShopAddress(shop.address||'');
    setEditShopCity(shop.city||'');
    setEditShopOwnerPhone(owner?.phone || shop.phone || '');
    setEditShopDriverPhone(driver?.phone || '');
    setEditShopFee((shop.delivery_fee||4.99).toString());
  };

  const cancelEditShop = ()=>{
    setEditingShop(null); setEditShopName(''); setEditShopAddress(''); setEditShopOwnerPhone(''); setEditShopDriverPhone(''); setEditShopFee(''); setEditShopCity('');
  };

  const saveEditShop = async ()=>{
    if(!editingShop) return;
    if(!editShopName.trim() || !editShopOwnerPhone.trim()){ alert('Име и телефон на собственик са задължителни!'); return; }
    const fee = parseFloat(editShopFee.replace(',','.')) || 4.99;

    // 1. Обновяваме shops таблицата
    const {error:shopErr} = await supabase.from('shops').update({
      name: editShopName.trim(),
      address: editShopAddress.trim(),
      city: editShopCity.trim() || editShopAddress.trim(),
      phone: editShopOwnerPhone.trim(),
      delivery_fee: fee
    }).eq('id', editingShop.id);

    if(shopErr){ alert('Грешка при магазин: '+shopErr.message); return; }

    // 2. Обновяваме собственика в shop_profiles
    const {data:existingOwner} = await supabase.from('shop_profiles').select('*').eq('shop_id', editingShop.id).eq('role','shop_owner').maybeSingle();
    if(existingOwner){
      await supabase.from('shop_profiles').update({phone: editShopOwnerPhone.trim()}).eq('id', existingOwner.id);
    }else{
      await supabase.from('shop_profiles').insert([{phone: editShopOwnerPhone.trim(), role:'shop_owner', shop_id: editingShop.id}]);
    }

    // 3. Обновяваме шофьора
    const {data:existingDriver} = await supabase.from('shop_profiles').select('*').eq('shop_id', editingShop.id).eq('role','driver').maybeSingle();
    if(editShopDriverPhone.trim()){
      if(existingDriver){
        await supabase.from('shop_profiles').update({phone: editShopDriverPhone.trim()}).eq('id', existingDriver.id);
      }else{
        await supabase.from('shop_profiles').insert([{phone: editShopDriverPhone.trim(), role:'driver', shop_id: editingShop.id}]);
      }
    }else{
      // ако е изтрит телефона на шофьора - трием профила
      if(existingDriver) await supabase.from('shop_profiles').delete().eq('id', existingDriver.id);
    }

    alert('✅ Магазин обновен!');
    cancelEditShop();
    await loadShops();
  };

  const toggleShopActive = async (shop:any)=>{ await supabase.from('shops').update({vip_active:!shop.vip_active}).eq('id',shop.id); await loadShops(); };
  const deleteShop = async (id:string)=>{ if(!confirm('Изтрий магазина? Това трие и стоките!')) return; await supabase.from('shop_profiles').delete().eq('shop_id',id); await supabase.from('products').delete().eq('shop_id',id); await supabase.from('shops').delete().eq('id',id); await loadShops(); };

  const addProductWithImage = async ()=>{
    if(!isShopOwner){ alert('Само собственик!'); return; }
    const targetShopId = myShopProfile?.shop_id;
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
      if(editingProduct){ await supabase.from('products').update({name:newProdName.trim(),price:priceNum,description:desc,image_url:imageUrl,active:newProdActive}).eq('id',editingProduct.id); }
      else{ await supabase.from('products').insert({shop_id:targetShopId,name:newProdName.trim(),price:priceNum,description:desc,image_url:imageUrl,active:newProdActive}); }
      setDebugLog(`✅ ${newProdName}`);
    }catch(e:any){ alert(e.message); return; }
    setNewProdName(''); setNewProdPrice(''); setNewProdDesc(''); setNewProdFile(null); setEditingProduct(null);
    await loadMyShopProfile();
  };

  const startEditProduct = (p:any)=>{ setEditingProduct(p); setNewProdName(p.name); setNewProdPrice(p.price.toString()); setNewProdDesc((p.description||'').replace(/^\[.*?\]\s*/,'').trim()); const m=p.description?.match(/^\[(.*?)\]/); if(m) setNewProdCat(m[1]); setNewProdActive(p.active!==false); };
  const cancelEditProduct = ()=>{ setEditingProduct(null); setNewProdName(''); setNewProdPrice(''); setNewProdDesc(''); setNewProdFile(null); };
  const deleteProduct = async (id:string)=>{ if(!confirm('Изтрий?')) return; await supabase.from('products').delete().eq('id',id); setMyShopProducts(myShopProducts.filter(p=>p.id!==id)); };

  const addToCart = (product:any)=>{ setCart(prev=>{ const ex=prev.find(c=>c.product.id===product.id); if(ex) return prev.map(c=> c.product.id===product.id ? {...c,qty:c.qty+1}:c); return [...prev,{product,qty:1}]; }); };
  const incCart = (pid:string)=> setCart(prev=> prev.map(c=> c.product.id===pid ? {...c,qty:c.qty+1}:c));
  const decCart = (pid:string)=> setCart(prev=>{ const ex=prev.find(c=>c.product.id===pid); if(!ex) return prev; if(ex.qty<=1) return prev.filter(c=>c.product.id!==pid); return prev.map(c=> c.product.id===pid ? {...c,qty:c.qty-1}:c); });
  const getCartCount = ()=> cart.reduce((s,c)=>s+c.qty,0);
  const getCartSubtotal = ()=> cart.reduce((s,c)=> s + parseFloat(c.product.price)*c.qty,0);
  const getCartTotal = ()=> getCartSubtotal() + parseFloat(selectedShop?.delivery_fee||4.99);

  const placeOrder = async ()=>{
    if(!selectedShop || cart.length===0 || !customerAddr.trim()){ alert('Адрес и количка!'); return; }
    const items=cart.map(c=>({id:c.product.id,name:c.product.name,price:c.product.price,qty:c.qty,image_url:c.product.image_url}));
    const total=getCartTotal();
    try{ const {error}=await supabase.from('orders').insert({shop_id:selectedShop.id,customer_phone:currentUser.phone,customer_name:`${currentUser.firstName} ${currentUser.lastName}`,address:customerAddr,items,total,status:'new',driver_requested:false}); if(error) throw error; alert('✅ Поръчка изпратена!'); setCart([]); setCustomerAddr(''); await loadCustomerOrders(); }catch(e:any){ alert(e.message); }
  };

  const updateOrderStatus = async (orderId:string,status:string)=>{ await supabase.from('orders').update({status}).eq('id',orderId); await loadMyShopProfile(); await loadCustomerOrders(); };
  const requestDriverForOrder = async (orderId:string)=>{ await supabase.from('orders').update({driver_requested:true, status:'ready_for_driver'}).eq('id',orderId); alert('✅ Поиска шофьор!'); await loadMyShopProfile(); };
  const assignDriverToOrder = async (orderId:string)=>{
    const active = myShopOrders.filter((o:any)=> o.driver_phone===currentUser.phone && ['on_the_way_to_shop','picked_up','on_the_way','ready_for_driver'].includes(o.status));
    if(active.length>=3){ alert('⛔ Лимит 3!'); return; }
    await supabase.from('orders').update({driver_phone:currentUser.phone, status:'on_the_way_to_shop'}).eq('id',orderId); await loadMyShopProfile();
  };
  const refuseOrder = async (orderId:string)=>{ if(!confirm('Отказваш ли?')) return; await supabase.from('orders').update({driver_phone:null, driver_requested:false, status:'preparing'}).eq('id',orderId); await loadMyShopProfile(); };

  useEffect(()=>{ const cu=localStorage.getItem('vozime_current'); if(cu) setCurrentUser(JSON.parse(cu)); loadShops(); },[]);
  useEffect(()=>{ if(currentUser){ loadMyShopProfile(); loadCustomerOrders(); if(isAdmin) setTab('admin'); } },[currentUser]);
  // ОПРАВЕНО ПОТРЕПВАНЕ: махнат setInterval, само realtime
  useEffect(()=>{
    if(!currentUser) return;
    const ch=supabase.channel('shops-live-'+currentUser.phone)
      .on('postgres_changes',{event:'*',schema:'public',table:'orders'},()=>{ loadMyShopProfile(); loadCustomerOrders(); })
      .on('postgres_changes',{event:'*',schema:'public',table:'products'},()=>{ loadMyShopProfile(); if(selectedShop) loadMarketProducts(selectedShop.id); })
      .subscribe();
    return ()=>{ supabase.removeChannel(ch); };
  },[currentUser?.phone]);

  const logout=()=>{ localStorage.removeItem('vozime_current'); setCurrentUser(null); setTab('market'); setVerificationStep('form'); };

  if(!currentUser){
    return (
      <main style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#0F4C75',padding:'16px'}}>
        <div style={{background:'white',padding:'20px',borderRadius:'24px',width:'100%',maxWidth:'380px'}}>
          <div style={{fontWeight:'800',fontSize:'22px',color:'#0F4C75',textAlign:'center'}}>🛒 Магазини VoziMe</div>
          {verificationStep==='form' ? (
            <>
              <div style={{display:'flex',background:'#f1f3f4',borderRadius:'12px',padding:'3px',margin:'16px 0'}}><button onClick={()=>setLoginTab('login')} style={{flex:1,padding:'10px',borderRadius:'8px',border:'none',fontWeight:'bold',background:loginTab==='login'?'#0F4C75':'white',color:loginTab==='login'?'white':'#666'}}>Вход</button><button onClick={()=>setLoginTab('register')} style={{flex:1,padding:'10px',borderRadius:'8px',border:'none',fontWeight:'bold',background:loginTab==='register'?'#0F4C75':'white',color:loginTab==='register'?'white':'#666'}}>Регистрация</button></div>
              {loginTab==='register' && (<><input placeholder="Име" value={loginForm.firstName} onChange={e=>setLoginForm({...loginForm,firstName:e.target.value})} style={{width:'100%',padding:'14px',borderRadius:'12px',border:'1px solid #e5e7eb',background:'#f9fafb',marginBottom:'10px'}}/><input placeholder="Фамилия" value={loginForm.lastName} onChange={e=>setLoginForm({...loginForm,lastName:e.target.value})} style={{width:'100%',padding:'14px',borderRadius:'12px',border:'1px solid #e5e7eb',background:'#f9fafb',marginBottom:'10px'}}/><input placeholder="Имейл" value={loginForm.email} onChange={e=>setLoginForm({...loginForm,email:e.target.value})} style={{width:'100%',padding:'14px',borderRadius:'12px',border:'2px solid #22c55e',background:'#f0fdf4',marginBottom:'10px'}}/></>)}
              <input placeholder="Телефон" value={loginForm.phone} onChange={e=>setLoginForm({...loginForm,phone:e.target.value})} style={{width:'100%',padding:'14px',borderRadius:'12px',border:'1px solid #e5e7eb',background:'#f9fafb',marginBottom:'16px'}}/>
              <button onClick={handleAuth} disabled={isSendingCode} style={{width:'100%',padding:'16px',background:'#22c55e',border:'none',borderRadius:'14px',fontWeight:'bold',color:'white'}}>{isSendingCode?'Пращам...':'Влез →'}</button>
            </>
          ) : (
            <>
              <div style={{fontWeight:'800',marginBottom:'10px'}}>Въведи кода</div>
              <input value={codeInput} onChange={e=>setCodeInput(e.target.value.replace(/\D/g,'').slice(0,6))} placeholder="123456" style={{width:'100%',padding:'16px',borderRadius:'12px',border:'2px solid #0F4C75',textAlign:'center',fontSize:'22px',letterSpacing:'6px',fontWeight:'800',marginBottom:'12px'}}/>
              {codeForTest && (<div style={{background:'#fef3c7',border:'2px solid #f59e0b',borderRadius:'12px',padding:'12px',textAlign:'center',marginBottom:'12px'}}><div style={{fontSize:'24px',fontWeight:'900'}}>{codeForTest}</div></div>)}
              <button onClick={handleVerifyCode} style={{width:'100%',padding:'16px',background:'#0F4C75',border:'none',borderRadius:'14px',fontWeight:'bold',color:'white'}}>Потвърди →</button>
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
  const driverOrders = (sortedOrders.length>0 ? sortedOrders : myShopOrders).filter((o:any)=> o.driver_requested);
  const availableDriverOrders = driverOrders.filter((o:any)=> !o.driver_phone || o.driver_phone===currentUser.phone);

  return (
    <main style={{minHeight:'100vh',width:'100%',maxWidth:'480px',margin:'0 auto',background:'#f9fafb',display:'flex',flexDirection:'column',fontFamily:'-apple-system, sans-serif'}}>
      <header style={{background:'#0F4C75',color:'white',padding:'10px 12px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div><b>🛒 Магазини {isAdmin ? '👑 АДМИН' : ''}</b><div style={{fontSize:'10px',opacity:0.8}}>{currentUser.firstName} • {currentUser.phone} {isAdmin?'👑':''}</div></div>
        <button onClick={logout} style={{background:'#FF3B30',border:'none',color:'white',padding:'6px 10px',borderRadius:'12px',fontSize:'11px',fontWeight:'bold'}}>Изход</button>
      </header>

      <div style={{display:'flex',gap:'4px',padding:'6px',background:'white',borderBottom:'1px solid #e5e7eb'}}>
        <button onClick={()=>setTab('market')} style={{flex:1,padding:'10px',borderRadius:'10px',border:'none',fontWeight:'bold',fontSize:'11px',background:tab==='market'?'#22c55e':'#f3f4f6',color:tab==='market'?'white':'#666'}}>🛒 Пазар</button>
        <button onClick={()=>setTab('my_orders')} style={{flex:1,padding:'10px',borderRadius:'10px',border:'none',fontWeight:'bold',fontSize:'11px',background:tab==='my_orders'?'#0F4C75':'#f3f4f6',color:tab==='my_orders'?'white':'#666'}}>📦 Мои</button>
        {isShopOwner && <button onClick={()=>setTab('my_shop')} style={{flex:1,padding:'10px',borderRadius:'10px',border:'none',fontWeight:'bold',fontSize:'11px',background:tab==='my_shop'?'#f59e0b':'#f3f4f6',color:tab==='my_shop'?'white':'#666'}}>🏪 Моя</button>}
        {isDriver && <button onClick={()=>setTab('driver')} style={{flex:1,padding:'10px',borderRadius:'10px',border:'none',fontWeight:'bold',fontSize:'11px',background:tab==='driver'?'#0F4C75':'#f3f4f6',color:tab==='driver'?'white':'#666'}}>🚚 Доставки</button>}
        {isAdmin && <button onClick={()=>setTab('admin')} style={{flex:1,padding:'10px',borderRadius:'10px',border:'none',fontWeight:'bold',fontSize:'10px',background:tab==='admin'?'#FFD60A':'#f3f4f6',color:tab==='admin'?'black':'#666'}}>👑 Админ</button>}
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'10px',display:'flex',flexDirection:'column',gap:'12px'}}>

        {tab==='market' && (
          <>
            {!selectedShop ? (
              <>
                <div style={{background:'#22c55e',color:'white',padding:'14px',borderRadius:'14px'}}><b>🛒 Пазар</b><input value={marketSearch} onChange={e=>setMarketSearch(e.target.value)} placeholder="🔍 Търси магазин..." style={{width:'100%',marginTop:'10px',padding:'10px',borderRadius:'10px',border:'none'}}/></div>
                {filteredMarketShops.map((s:any)=>(
                  <div key={s.id} onClick={()=>loadMarketProducts(s.id)} style={{background:'white',border:'2px solid #22c55e',borderRadius:'14px',padding:'14px',cursor:'pointer'}}>
                    <div style={{display:'flex',justifyContent:'space-between'}}><b>{s.name}</b><span style={{fontSize:'10px',background:'#22c55e',color:'white',padding:'4px 8px',borderRadius:'10px'}}>🟢 Активен</span></div>
                    <div style={{fontSize:'12px',color:'#666',marginTop:'4px'}}>📍 {s.address||s.city} • {s.delivery_fee}€</div>
                  </div>
                ))}
              </>
            ) : (
              <>
                <button onClick={()=>{setSelectedShop(null); setMarketProducts([]); setCart([]);}} style={{padding:'10px',borderRadius:'10px',border:'1px solid #ddd',background:'white',fontWeight:'bold'}}>← Назад</button>
                <div style={{background:'#0F4C75',color:'white',padding:'14px',borderRadius:'14px'}}><b>{selectedShop.name}</b></div>
                <div style={{display:'flex',gap:'6px'}}><input value={marketSearch} onChange={e=>setMarketSearch(e.target.value)} placeholder="🔍 Продукт..." style={{flex:1,padding:'10px',borderRadius:'10px',border:'1px solid #ddd'}}/><select value={marketCat} onChange={e=>setMarketCat(e.target.value)} style={{padding:'10px',borderRadius:'10px',border:'1px solid #22c55e'}}>{PRODUCT_CATS.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
                {filteredMarketProducts.map((p:any)=>(
                  <div key={p.id} style={{background:'white',borderRadius:'14px',padding:'12px',display:'flex',gap:'12px',border:'1px solid #e5e7eb'}}>
                    {p.image_url && <img src={p.image_url} style={{width:'70px',height:'70px',objectFit:'cover',borderRadius:'10px'}}/>}
                    <div style={{flex:1}}><b style={{fontSize:'13px'}}>{p.name}</b><div style={{fontWeight:'800',color:'#22c55e'}}>{p.price}€</div></div>
                    <button onClick={()=>addToCart(p)} style={{background:'#22c55e',color:'white',border:'none',padding:'10px 14px',borderRadius:'10px',fontWeight:'bold'}}>Добави</button>
                  </div>
                ))}
                {cart.length>0 && (<div style={{background:'white',border:'3px solid #22c55e',borderRadius:'16px',padding:'14px',position:'sticky',bottom:'0'}}><b>🛒 {getCartCount()}</b><input value={customerAddr} onChange={e=>setCustomerAddr(e.target.value)} placeholder="📍 Адрес..." style={{width:'100%',padding:'12px',marginTop:'10px',borderRadius:'10px',border:'2px solid #22c55e'}}/><button onClick={placeOrder} style={{width:'100%',marginTop:'10px',padding:'14px',background:'#22c55e',color:'white',border:'none',borderRadius:'12px',fontWeight:'800'}}>✅ Поръчай {getCartTotal().toFixed(2)}€</button></div>)}
              </>
            )}
          </>
        )}

        {tab==='my_shop' && isShopOwner && (
          <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
            <div style={{background:'#22c55e',color:'white',padding:'14px',borderRadius:'14px'}}><b>🏪 Моят магазин</b></div>
            <div style={{background:'white',border:'2px solid #22c55e',borderRadius:'14px',padding:'14px'}}>
              <b>{editingProduct?`✏️ ${editingProduct.name}`:'➕ Нова стока'}</b>
              <input value={newProdName} onChange={e=>setNewProdName(e.target.value)} placeholder="Име" style={{width:'100%',padding:'12px',borderRadius:'10px',border:'1px solid #22c55e',marginTop:'10px'}}/>
              <div style={{display:'flex',gap:'8px',marginTop:'8px'}}><input value={newProdPrice} onChange={e=>setNewProdPrice(e.target.value)} placeholder="Цена" style={{flex:1,padding:'12px',borderRadius:'10px',border:'2px solid #22c55e'}}/><select value={newProdCat} onChange={e=>setNewProdCat(e.target.value)} style={{flex:1,padding:'12px',borderRadius:'10px',border:'1px solid #ddd'}}>{PRODUCT_CATS.filter(c=>c!=='Всички').map(c=><option key={c} value={c}>{c}</option>)}</select></div>
              <div style={{display:'flex',gap:'8px',marginTop:'10px'}}><button onClick={addProductWithImage} style={{flex:1,padding:'12px',background:editingProduct?'#f59e0b':'#22c55e',color:'white',border:'none',borderRadius:'10px',fontWeight:'800'}}>{editingProduct?'💾 Запази':'➕ Добави'}</button>{editingProduct && <button onClick={cancelEditProduct} style={{padding:'12px',background:'#e5e7eb',border:'none',borderRadius:'10px'}}>Откажи</button>}</div>
            </div>
            <div style={{background:'white',borderRadius:'12px',padding:'10px'}}><b>Мои стоки - {filteredMyProducts.length}</b>{filteredMyProducts.map((p:any)=><div key={p.id} style={{display:'flex',gap:'8px',border:'1px solid #e5e7eb',padding:'8px',borderRadius:'10px',marginTop:'6px'}}><div style={{flex:1}}><b>{p.name}</b> {p.price}€</div><button onClick={()=>startEditProduct(p)} style={{background:'#0F4C75',color:'white',border:'none',padding:'6px 10px',borderRadius:'6px'}}>✏️</button><button onClick={()=>deleteProduct(p.id)} style={{background:'#FF3B30',color:'white',border:'none',padding:'6px 10px',borderRadius:'6px'}}>🗑️</button></div>)}</div>
          </div>
        )}

        {tab==='driver' && (
          <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
            <div style={{background:'#0F4C75',color:'white',padding:'12px',borderRadius:'12px'}}><b>🚚 Доставки LIVE - {driverOrders.length}</b></div>
            {availableDriverOrders.map((o:any)=>(
              <div key={o.id} style={{background:'white',border:'2px solid #0F4C75',borderRadius:'14px',padding:'12px'}}>
                <div style={{display:'flex',justifyContent:'space-between'}}><b>#{o.id.slice(0,8)} • {parseFloat(o.total).toFixed(2)}€</b><span style={{fontSize:'10px',background:'#0F4C75',color:'white',padding:'4px 8px',borderRadius:'10px'}}>{o.status}</span></div>
                <div style={{fontSize:'11px',marginTop:'6px'}}>📍 {o.address}</div>
                <button onClick={()=>assignDriverToOrder(o.id)} style={{width:'100%',marginTop:'10px',background:'#0F4C75',color:'white',border:'none',padding:'12px',borderRadius:'10px',fontWeight:'800'}}>🚚 Вземи</button>
              </div>
            ))}
          </div>
        )}

        {tab==='admin' && isAdmin && (
          <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
            <div style={{background:'#FFD60A',padding:'12px',borderRadius:'12px'}}><b>👑 Админ - редакция на собственици</b><div style={{fontSize:'11px'}}>Можеш да редактираш име, адрес, телефон на собственик, шофьор и доставка. Не пипаш стоки.</div></div>
            
            <div style={{background:'white',border:'2px solid #22c55e',borderRadius:'12px',padding:'12px'}}>
              <b>➕ Нов магазин</b>
              <input value={shopName} onChange={e=>setShopName(e.target.value)} placeholder="Име: HALASTRA" style={{width:'100%',padding:'10px',borderRadius:'8px',border:'1px solid #ddd',marginTop:'8px'}}/>
              <input value={shopAddress} onChange={e=>setShopAddress(e.target.value)} placeholder="Адрес: ул. Вапцаров 2" style={{width:'100%',padding:'10px',borderRadius:'8px',border:'2px solid #0F4C75',marginTop:'8px'}}/>
              <input value={ownerPhone} onChange={e=>setOwnerPhone(e.target.value)} placeholder="Собственик тел" style={{width:'100%',padding:'10px',borderRadius:'8px',border:'1px solid #ddd',marginTop:'8px'}}/>
              <input value={driverPhone} onChange={e=>setDriverPhone(e.target.value)} placeholder="Шофьор тел" style={{width:'100%',padding:'10px',borderRadius:'8px',border:'1px solid #ddd',marginTop:'8px'}}/>
              <button onClick={addShop} style={{width:'100%',marginTop:'10px',padding:'12px',background:'#22c55e',color:'white',border:'none',borderRadius:'10px',fontWeight:'800'}}>СЪЗДАЙ МАГАЗИН</button>
            </div>

            {shops.map((s:any)=>{
              const owner = allShopProfiles.find((p:any)=> p.shop_id===s.id && p.role==='shop_owner');
              const driver = allShopProfiles.find((p:any)=> p.shop_id===s.id && p.role==='driver');
              const isEditing = editingShop?.id===s.id;
              return (
                <div key={s.id} style={{background:'white',padding:'12px',borderRadius:'12px',border: isEditing ? '2px solid #f59e0b' : '1px solid #ddd'}}>
                  {!isEditing ? (
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                      <div style={{flex:1}}>
                        <b>{s.name}</b>
                        <div style={{fontSize:'11px',color:'#666',marginTop:'4px'}}>📍 {s.address||s.city||'Без адрес'} • 🏙️ {s.city||''}</div>
                        <div style={{fontSize:'11px',marginTop:'2px'}}>👤 Собственик: {owner?.phone || s.phone || 'няма'} • 🚚 Шофьор: {driver?.phone || 'няма'} • 💰 Доставка: {s.delivery_fee}€</div>
                      </div>
                      <div style={{display:'flex',gap:'4px',flexDirection:'column'}}>
                        <button onClick={()=>startEditShop(s)} style={{background:'#0F4C75',color:'white',border:'none',padding:'6px 10px',borderRadius:'6px',fontSize:'10px',fontWeight:'bold'}}>✏️ Редактирай</button>
                        <div style={{display:'flex',gap:'4px'}}>
                          <button onClick={()=>toggleShopActive(s)} style={{background:s.vip_active===false?'#22c55e':'#FF3B30',color:'white',border:'none',padding:'6px 8px',borderRadius:'6px',fontSize:'10px'}}>{s.vip_active===false?'ПУСНИ':'СПРИ'}</button>
                          <button onClick={()=>deleteShop(s.id)} style={{background:'black',color:'white',border:'none',padding:'6px 8px',borderRadius:'6px',fontSize:'10px'}}>🗑️</button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <b style={{color:'#f59e0b'}}>✏️ Редактираш: {s.name}</b>
                      <input value={editShopName} onChange={e=>setEditShopName(e.target.value)} placeholder="Име на магазин" style={{width:'100%',padding:'10px',borderRadius:'8px',border:'2px solid #f59e0b',marginTop:'8px'}}/>
                      <input value={editShopAddress} onChange={e=>setEditShopAddress(e.target.value)} placeholder="📍 Адрес" style={{width:'100%',padding:'10px',borderRadius:'8px',border:'1px solid #ddd',marginTop:'8px'}}/>
                      <input value={editShopCity} onChange={e=>setEditShopCity(e.target.value)} placeholder="🏙️ Град" style={{width:'100%',padding:'10px',borderRadius:'8px',border:'1px solid #ddd',marginTop:'8px'}}/>
                      <input value={editShopOwnerPhone} onChange={e=>setEditShopOwnerPhone(e.target.value)} placeholder="👤 Телефон собственик" style={{width:'100%',padding:'10px',borderRadius:'8px',border:'2px solid #22c55e',marginTop:'8px'}}/>
                      <input value={editShopDriverPhone} onChange={e=>setEditShopDriverPhone(e.target.value)} placeholder="🚚 Телефон шофьор (може празно)" style={{width:'100%',padding:'10px',borderRadius:'8px',border:'1px solid #ddd',marginTop:'8px'}}/>
                      <input value={editShopFee} onChange={e=>setEditShopFee(e.target.value)} placeholder="💰 Доставка €" style={{width:'100%',padding:'10px',borderRadius:'8px',border:'1px solid #ddd',marginTop:'8px'}}/>
                      <div style={{display:'flex',gap:'8px',marginTop:'10px'}}>
                        <button onClick={saveEditShop} style={{flex:1,padding:'12px',background:'#22c55e',color:'white',border:'none',borderRadius:'10px',fontWeight:'800'}}>💾 Запази промените</button>
                        <button onClick={cancelEditShop} style={{padding:'12px',background:'#e5e7eb',border:'none',borderRadius:'10px',fontWeight:'bold'}}>Откажи</button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

      </div>
      {toastMsg && <div style={{position:'fixed',bottom:'20px',left:'50%',transform:'translateX(-50%)',background:'black',color:'white',padding:'10px 20px',borderRadius:'20px',fontSize:'12px',zIndex:9999}}>{toastMsg}</div>}
    </main>
  );
}