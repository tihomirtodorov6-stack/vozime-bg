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

export default function ShopsOnly(){
  const [loginForm,setLoginForm]=useState({firstName:'',lastName:'',phone:''});
  const [loginTab,setLoginTab]=useState<'login'|'register'>('login');
  const [currentUser,setCurrentUser]=useState<any>(null);
  const [tab,setTab]=useState<'market'|'my_orders'|'my_shop'|'driver'|'admin'>('market');
  
  const [shops,setShops]=useState<any[]>([]);
  const [shopProfiles,setShopProfiles]=useState<any[]>([]);
  const [myShopProfile,setMyShopProfile]=useState<any>(null);
  const [myShopProducts,setMyShopProducts]=useState<any[]>([]);
  const [myShopOrders,setMyShopOrders]=useState<any[]>([]);
  const [customerOrders,setCustomerOrders]=useState<any[]>([]);
  const [marketShops,setMarketShops]=useState<any[]>([]);
  const [marketProducts,setMarketProducts]=useState<any[]>([]);
  const [selectedShop,setSelectedShop]=useState<any>(null);
  
  const [shopName,setShopName]=useState('');
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
  const [cartOpen,setCartOpen]=useState(false);
  const [customerAddr,setCustomerAddr]=useState('');
  const [debugLog,setDebugLog]=useState('');

  const isAdmin = currentUser && isAdminPhone(currentUser.phone);

  // AUTH
  const handleAuth = async ()=>{
    if(!loginForm.firstName || !loginForm.lastName || !loginForm.phone){ alert('Попълни всички полета'); return; }
    const cleanPhone = loginForm.phone.replace(/[^0-9]/g,'').slice(-10);
    if(loginTab==='register'){
      const {data:existing} = await supabase.from('users').select('*').eq('clean_phone', cleanPhone).maybeSingle();
      if(existing){ alert('Вече съществува! Влез.'); setLoginTab('login'); return; }
      const {data,error}=await supabase.from('users').insert({first_name:loginForm.firstName,last_name:loginForm.lastName,phone:loginForm.phone.trim(),clean_phone:cleanPhone,is_verified:true}).select().single();
      if(error){ alert(error.message); return; }
      const u={id:data.id,firstName:data.first_name,lastName:data.last_name,phone:data.phone}; localStorage.setItem('vozime_current',JSON.stringify(u)); setCurrentUser(u);
    }else{
      const {data:found}=await supabase.from('users').select('*').eq('clean_phone', cleanPhone).maybeSingle();
      if(!found){ alert('Няма акаунт! Регистрирай се.'); setLoginTab('register'); return; }
      const u={id:found.id,firstName:found.first_name,lastName:found.last_name,phone:found.phone}; localStorage.setItem('vozime_current',JSON.stringify(u)); setCurrentUser(u);
    }
  };

  // LOADERS
  const loadShops = async ()=>{
    const {data}=await supabase.from('shops').select('*').order('created_at',{ascending:false});
    if(data){ setShops(data); setMarketShops(data.filter((s:any)=>s.vip_active!==false)); }
    const {data:profiles}=await supabase.from('shop_profiles').select('*');
    if(profiles) setShopProfiles(profiles);
  };

  const loadMyShopProfile = async ()=>{
    if(!currentUser?.phone) return;
    const myClean10 = clean(currentUser.phone);
    const myCleanFull = cleanFull(currentUser.phone);
    const {data:allProfiles}=await supabase.from('shop_profiles').select('*');
    if(!allProfiles){ setMyShopProfile(null); return; }
    let myProfiles:any[] = [];
    if(isAdminPhone(currentUser.phone)){
      myProfiles = allProfiles.filter((p:any)=> p.phone===currentUser.phone && clean(p.phone)===myClean10 && cleanFull(p.phone)===myCleanFull);
      if(myProfiles.length===0){
        const {data:allOrders}=await supabase.from('orders').select('*').order('created_at',{ascending:false}).limit(50);
        if(allOrders) setMyShopOrders(allOrders);
        const {data:allProds}=await supabase.from('products').select('*').limit(100);
        if(allProds) setMyShopProducts(allProds);
        return;
      }
    }else{
      myProfiles = allProfiles.filter((p:any)=>{
        const p10=clean(p.phone); const pFull=cleanFull(p.phone);
        return p10===myClean10 || pFull===myCleanFull || p.phone===currentUser.phone || pFull.includes(myClean10) || myCleanFull.includes(p10);
      });
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
    if(data){ setMarketProducts(data.filter((p:any)=>p.active!==false)); }
    setSelectedShop(marketShops.find(s=>s.id===shopId) || shops.find(s=>s.id===shopId));
    setCart([]); setCartOpen(false);
  };

  // SHOP ADMIN
  const addShop = async ()=>{
    if(!shopName || !ownerPhone){ alert('Име и телефон!'); return; }
    const {data,error}=await supabase.from('shops').insert({name:shopName,slug:shopName.toLowerCase().replace(/\s+/g,'-')+'-'+Date.now(),city:'',phone:ownerPhone,delivery_fee:4.99,vip_active:true}).select().single();
    if(error){ alert(error.message); return; }
    await supabase.from('shop_profiles').insert([{phone:ownerPhone,role:'shop_owner',shop_id:data.id}]);
    if(driverPhone) await supabase.from('shop_profiles').insert([{phone:driverPhone,role:'driver',shop_id:data.id}]);
    setShopName(''); setOwnerPhone(''); setDriverPhone(''); await loadShops();
  };
  const toggleShopActive = async (shop:any)=>{
    await supabase.from('shops').update({vip_active:!shop.vip_active}).eq('id',shop.id); await loadShops();
  };
  const deleteShop = async (id:string)=>{
    if(!confirm('Изтрий магазина завинаги?')) return;
    await supabase.from('shop_profiles').delete().eq('shop_id',id);
    await supabase.from('products').delete().eq('shop_id',id);
    await supabase.from('shops').delete().eq('id',id);
    await loadShops();
  };
  const updateShopInfo = async (shop:any)=>{
    const edit=editShopData[shop.id]; if(!edit) return;
    const fee=parseFloat(edit.fee.replace(',','.'))||4.99;
    await supabase.from('shops').update({name:edit.name||shop.name,delivery_fee:fee,phone:edit.ownerPhone||shop.phone}).eq('id',shop.id);
    if(edit.ownerPhone && edit.ownerPhone!==shop.phone){
      const owner=shopProfiles.find((p:any)=>p.shop_id===shop.id && p.role==='shop_owner');
      if(owner) await supabase.from('shop_profiles').update({phone:edit.ownerPhone}).eq('id',owner.id);
      else await supabase.from('shop_profiles').insert([{phone:edit.ownerPhone,role:'shop_owner',shop_id:shop.id}]);
    }
    alert('Магазин обновен!'); await loadShops();
  };
  const addDriverToShop = async (shop:any)=>{
    const edit=editShopData[shop.id]; if(!edit?.newDriverPhone){ alert('Телефон!'); return; }
    await supabase.from('shop_profiles').insert([{phone:edit.newDriverPhone,role:'driver',shop_id:shop.id}]);
    setEditShopData({...editShopData,[shop.id]:{...edit,newDriverPhone:''}}); await loadShops();
  };
  const removeProfile = async (pid:string)=>{ await supabase.from('shop_profiles').delete().eq('id',pid); await loadShops(); };

  // PRODUCTS
  const addProductWithImage = async ()=>{
    if(!myShopProfile?.shop_id && !isAdmin){ alert('Нямаш магазин!'); return; }
    const targetShopId = myShopProfile?.shop_id || shops[0]?.id;
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
    await loadMyShopProfile(); await loadShops();
  };
  const startEditProduct = (p:any)=>{ setEditingProduct(p); setNewProdName(p.name); setNewProdPrice(p.price.toString()); setNewProdDesc((p.description||'').replace(/^\[.*?\]\s*/,'').trim()); const m=p.description?.match(/^\[(.*?)\]/); if(m) setNewProdCat(m[1]); setNewProdActive(p.active!==false); window.scrollTo({top:0,behavior:'smooth'}); };
  const cancelEditProduct = ()=>{ setEditingProduct(null); setNewProdName(''); setNewProdPrice(''); setNewProdDesc(''); setNewProdFile(null); };
  const deleteProduct = async (id:string)=>{ if(!confirm('Изтрий продукта?')) return; await supabase.from('products').delete().eq('id',id); setMyShopProducts(myShopProducts.filter(p=>p.id!==id)); };

  // CART
  const addToCart = (product:any)=>{
    setCart(prev=>{
      const ex=prev.find(c=>c.product.id===product.id);
      if(ex) return prev.map(c=> c.product.id===product.id ? {...c,qty:c.qty+1}:c);
      return [...prev,{product,qty:1}];
    }); setCartOpen(true);
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

  // ORDERS
  const placeOrder = async ()=>{
    if(!selectedShop || cart.length===0 || !customerAddr.trim()){ alert('Адрес и количка!'); return; }
    const items=cart.map(c=>({id:c.product.id,name:c.product.name,price:c.product.price,qty:c.qty,image_url:c.product.image_url}));
    const total=getCartTotal();
    try{
      const {error}=await supabase.from('orders').insert({shop_id:selectedShop.id,customer_phone:currentUser.phone,customer_name:`${currentUser.firstName} ${currentUser.lastName}`,address:customerAddr,items,total,status:'new'});
      if(error) throw error;
      alert('✅ Поръчка изпратена! Ще я видиш в Моите поръчки.');
      setCart([]); setCustomerAddr(''); setCartOpen(false); await loadCustomerOrders();
    }catch(e:any){ alert(e.message); }
  };
  const updateOrderStatus = async (orderId:string,status:string)=>{
    await supabase.from('orders').update({status}).eq('id',orderId);
    await loadMyShopProfile(); await loadCustomerOrders(); await loadShops();
  };

  // INIT + REALTIME
  useEffect(()=>{
    const cu=localStorage.getItem('vozime_current'); if(cu) setCurrentUser(JSON.parse(cu));
    loadShops();
  },[]);
  useEffect(()=>{ if(currentUser){ loadMyShopProfile(); loadCustomerOrders(); } },[currentUser]);
  useEffect(()=>{
    if(!currentUser) return;
    const ch=supabase.channel('shops-realtime-'+currentUser.phone)
      .on('postgres_changes',{event:'*',schema:'public',table:'orders'},()=>{ loadMyShopProfile(); loadCustomerOrders(); loadShops(); })
      .on('postgres_changes',{event:'*',schema:'public',table:'products'},()=>{ loadMyShopProfile(); if(selectedShop) loadMarketProducts(selectedShop.id); loadShops(); })
      .subscribe();
    const interval=setInterval(()=>{ loadShops(); loadMyShopProfile(); loadCustomerOrders(); },7000);
    return ()=>{ supabase.removeChannel(ch); clearInterval(interval); };
  },[currentUser, selectedShop?.id]);

  const logout=()=>{ localStorage.removeItem('vozime_current'); setCurrentUser(null); setTab('market'); };

  if(!currentUser){
    return (
      <main style={{position:'fixed',inset:0,display:'flex',alignItems:'center',justifyContent:'center',background:'#0F4C75',padding:'16px'}}>
        <div style={{background:'white',padding:'20px',borderRadius:'24px',width:'100%',maxWidth:'380px'}}>
          <div style={{fontWeight:'800',fontSize:'22px',color:'#0F4C75',textAlign:'center'}}>🛒 Магазини VoziMe</div>
          <div style={{textAlign:'center',fontSize:'12px',color:'#666',marginTop:'6px'}}>Само за магазини - без пътувания</div>
          <div style={{display:'flex',background:'#f1f3f4',borderRadius:'12px',padding:'3px',margin:'16px 0'}}><button onClick={()=>setLoginTab('login')} style={{flex:1,padding:'10px',borderRadius:'8px',border:'none',fontWeight:'bold',background:loginTab==='login'?'#0F4C75':'white',color:loginTab==='login'?'white':'#666'}}>Вход</button><button onClick={()=>setLoginTab('register')} style={{flex:1,padding:'10px',borderRadius:'8px',border:'none',fontWeight:'bold',background:loginTab==='register'?'#0F4C75':'white',color:loginTab==='register'?'white':'#666'}}>Регистрация</button></div>
          <input placeholder="Име" value={loginForm.firstName} onChange={e=>setLoginForm({...loginForm,firstName:e.target.value})} style={{width:'100%',padding:'14px',borderRadius:'12px',border:'1px solid #e5e7eb',background:'#f9fafb',marginBottom:'10px'}}/>
          <input placeholder="Фамилия" value={loginForm.lastName} onChange={e=>setLoginForm({...loginForm,lastName:e.target.value})} style={{width:'100%',padding:'14px',borderRadius:'12px',border:'1px solid #e5e7eb',background:'#f9fafb',marginBottom:'10px'}}/>
          <input placeholder="Телефон +447..." value={loginForm.phone} onChange={e=>setLoginForm({...loginForm,phone:e.target.value})} style={{width:'100%',padding:'14px',borderRadius:'12px',border:'1px solid #e5e7eb',background:'#f9fafb',marginBottom:'16px'}}/>
          <button onClick={handleAuth} style={{width:'100%',padding:'16px',background:'#22c55e',border:'none',borderRadius:'14px',fontWeight:'bold',color:'white',fontSize:'15px'}}>{loginTab==='login'?'Влез →':'Регистрирай се →'}</button>
          <div style={{fontSize:'10px',color:'#666',marginTop:'10px',textAlign:'center'}}>Админ: +447935463970 • Магазинер: +447511230086</div>
        </div>
      </main>
    );
  }

  const filteredMarketShops = marketShops.filter(s=>{
    if(marketSearch && !s.name.toLowerCase().includes(marketSearch.toLowerCase())) return false;
    return true;
  });
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

  return (
    <main style={{height:'100dvh',width:'100%',maxWidth:'480px',margin:'0 auto',background:'#f9fafb',display:'flex',flexDirection:'column',overflow:'hidden',fontFamily:'-apple-system, sans-serif'}}>
      <header style={{background:'#0F4C75',color:'white',padding:'10px 12px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div><b>🛒 Магазини</b><div style={{fontSize:'10px',opacity:0.8}}>{currentUser.firstName} {currentUser.lastName} • {currentUser.phone} {isAdmin?'👑':''} {myShopProfile?.role==='shop_owner'?'🏪':''} {myShopProfile?.role==='driver'?'🚚':''}</div></div>
        <div style={{display:'flex',gap:'6px',alignItems:'center'}}>
          {getCartCount()>0 && <button onClick={()=>setCartOpen(!cartOpen)} style={{background:'#22c55e',color:'white',border:'none',padding:'6px 12px',borderRadius:'20px',fontWeight:'bold',fontSize:'12px'}}>🛒 {getCartCount()} • {getCartSubtotal().toFixed(2)}€</button>}
          <button onClick={logout} style={{background:'#FF3B30',border:'none',color:'white',padding:'6px 10px',borderRadius:'12px',fontSize:'11px',fontWeight:'bold'}}>Изход</button>
        </div>
      </header>

      <div style={{display:'flex',gap:'4px',padding:'6px',background:'white',borderBottom:'1px solid #e5e7eb'}}>
        <button onClick={()=>setTab('market')} style={{flex:1,padding:'10px',borderRadius:'10px',border:'none',fontWeight:'bold',fontSize:'11px',background:tab==='market'?'#22c55e':'#f3f4f6',color:tab==='market'?'white':'#666'}}>🛒 Пазар ({filteredMarketShops.length})</button>
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
                <div style={{background:'#22c55e',color:'white',padding:'14px',borderRadius:'14px'}}>
                  <div style={{display:'flex',justifyContent:'space-between'}}><b>🛒 Пазар - Магазини (без Sofia)</b><span style={{fontSize:'10px',background:'white',color:'#22c55e',padding:'4px 8px',borderRadius:'12px',fontWeight:'800'}}>🔴 LIVE</span></div>
                  <div style={{fontSize:'11px',marginTop:'4px'}}>VoziMe 0% - доставката е при магазина. Избери магазин и виж продуктите в реално време.</div>
                  <input value={marketSearch} onChange={e=>setMarketSearch(e.target.value)} placeholder="🔍 Търси магазин - HALASTRA, Месарница..." style={{width:'100%',marginTop:'10px',padding:'10px',borderRadius:'10px',border:'none',fontSize:'13px'}}/>
                </div>
                {filteredMarketShops.map((s:any)=>(
                  <div key={s.id} onClick={()=>loadMarketProducts(s.id)} style={{background:'white',border:'2px solid #22c55e',borderRadius:'14px',padding:'14px',cursor:'pointer'}}>
                    <div style={{display:'flex',justifyContent:'space-between'}}><b style={{fontSize:'15px'}}>{s.name}</b><span style={{fontSize:'10px',background:s.vip_active===false?'#FF3B30':'#22c55e',color:'white',padding:'4px 8px',borderRadius:'10px'}}>{s.vip_active===false?'🔴 СПРЯН':'🟢 Активен'}</span></div>
                    <div style={{fontSize:'12px',color:'#666',marginTop:'4px'}}>📍 {s.city||'Без град'} • Доставка {s.delivery_fee}€ • 📞 {s.phone}</div>
                    <div style={{fontSize:'12px',color:'#22c55e',fontWeight:'800',marginTop:'8px'}}>Виж продукти →</div>
                  </div>
                ))}
              </>
            ) : (
              <>
                <button onClick={()=>{setSelectedShop(null); setMarketProducts([]); setCart([]); setCartOpen(false);}} style={{padding:'10px',borderRadius:'10px',border:'1px solid #ddd',background:'white',fontWeight:'bold'}}>← Назад към магазини</button>
                <div style={{background:'#0F4C75',color:'white',padding:'14px',borderRadius:'14px',display:'flex',justifyContent:'space-between'}}>
                  <div><b style={{fontSize:'16px'}}>{selectedShop.name}</b><div style={{fontSize:'11px'}}>Доставка {selectedShop.delivery_fee}€ • {selectedShop.phone}</div></div>
                  <span style={{fontSize:'10px',background:'#22c55e',color:'white',padding:'6px 10px',borderRadius:'12px',height:'fit-content'}}>🔴 LIVE</span>
                </div>
                <div style={{display:'flex',gap:'6px'}}>
                  <input value={marketSearch} onChange={e=>setMarketSearch(e.target.value)} placeholder="🔍 Търси продукт - кайма, хляб..." style={{flex:1,padding:'10px',borderRadius:'10px',border:'1px solid #ddd',fontSize:'12px'}}/>
                  <select value={marketCat} onChange={e=>setMarketCat(e.target.value)} style={{padding:'10px',borderRadius:'10px',border:'1px solid #22c55e',fontWeight:'bold',fontSize:'12px'}}>{PRODUCT_CATS.map(c=><option key={c} value={c}>{c}</option>)}</select>
                </div>
                {filteredMarketProducts.map((p:any)=>(
                  <div key={p.id} style={{background:'white',borderRadius:'14px',padding:'12px',display:'flex',gap:'12px',border:'1px solid #e5e7eb'}}>
                    {p.image_url && <img src={p.image_url} style={{width:'70px',height:'70px',objectFit:'cover',borderRadius:'10px'}}/>}
                    <div style={{flex:1}}><b style={{fontSize:'13px'}}>{p.name}</b><div style={{fontSize:'11px',color:'#666'}}>{(p.description||'').replace(/^\[.*?\]\s*/,'')}</div><div style={{marginTop:'4px'}}><span style={{fontSize:'10px',background:'#f3f4f6',padding:'3px 6px',borderRadius:'6px'}}>{p.description?.match(/\[(.*?)\]/)?.[1]||'Други'}</span><span style={{fontWeight:'800',color:'#22c55e',marginLeft:'8px'}}>{p.price}€</span></div></div>
                    <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
                      {cart.find(c=>c.product.id===p.id) ? (
                        <div style={{display:'flex',alignItems:'center',gap:'6px',background:'#f0fdf4',padding:'6px',borderRadius:'10px',border:'1px solid #22c55e'}}>
                          <button onClick={()=>decCart(p.id)} style={{width:'28px',height:'28px',borderRadius:'50%',border:'none',background:'white',fontWeight:'bold'}}>−</button>
                          <b style={{fontSize:'13px'}}>{cart.find(c=>c.product.id===p.id)?.qty}</b>
                          <button onClick={()=>incCart(p.id)} style={{width:'28px',height:'28px',borderRadius:'50%',border:'none',background:'#22c55e',color:'white',fontWeight:'bold'}}>+</button>
                        </div>
                      ) : <button onClick={()=>addToCart(p)} style={{background:'#22c55e',color:'white',border:'none',padding:'10px 14px',borderRadius:'10px',fontWeight:'bold',fontSize:'12px'}}>Добави</button>}
                    </div>
                  </div>
                ))}
                {cart.length>0 && (
                  <div style={{background:'white',border:'3px solid #22c55e',borderRadius:'16px',padding:'14px',position:'sticky',bottom:'0'}}>
                    <div style={{display:'flex',justifyContent:'space-between'}}><b>🛒 Количка - {getCartCount()} продукта</b><button onClick={()=>setCartOpen(!cartOpen)} style={{background:'#f3f4f6',border:'none',padding:'4px 10px',borderRadius:'8px',fontSize:'11px'}}>{cartOpen?'Скрий':'Виж'}</button></div>
                    {cartOpen && <div style={{marginTop:'10px'}}>{cart.map((c:any)=><div key={c.product.id} style={{display:'flex',justifyContent:'space-between',fontSize:'12px',padding:'6px 0',borderBottom:'1px solid #f3f4f6'}}><span>{c.product.name} x{c.qty}</span><span>{(parseFloat(c.product.price)*c.qty).toFixed(2)}€ <button onClick={()=>removeCartItem(c.product.id)} style={{marginLeft:'6px',background:'#FF3B30',color:'white',border:'none',padding:'2px 6px',borderRadius:'4px',fontSize:'10px'}}>X</button></span></div>)}</div>}
                    <div style={{display:'flex',justifyContent:'space-between',marginTop:'10px',fontSize:'12px'}}><span>Продукти:</span><span>{getCartSubtotal().toFixed(2)}€</span></div>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:'12px'}}><span>Доставка:</span><span>{selectedShop.delivery_fee}€</span></div>
                    <div style={{display:'flex',justifyContent:'space-between',fontWeight:'800',fontSize:'14px',borderTop:'2px solid #e5e7eb',paddingTop:'8px',marginTop:'8px'}}><span>Общо:</span><span style={{color:'#0F4C75'}}>{getCartTotal().toFixed(2)}€</span></div>
                    <input value={customerAddr} onChange={e=>setCustomerAddr(e.target.value)} placeholder="📍 Адрес за доставка - Вапцаров 2, вход, етаж..." style={{width:'100%',padding:'12px',marginTop:'10px',borderRadius:'10px',border:'2px solid #22c55e',fontSize:'12px'}}/>
                    <button onClick={placeOrder} style={{width:'100%',marginTop:'10px',padding:'14px',background:'#22c55e',color:'white',border:'none',borderRadius:'12px',fontWeight:'800',fontSize:'14px'}}>✅ Поръчай за {getCartTotal().toFixed(2)}€</button>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {tab==='my_orders' && (
          <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
            <div style={{background:'#0F4C75',color:'white',padding:'12px',borderRadius:'12px',display:'flex',justifyContent:'space-between'}}><b>📦 Моите поръчки като клиент - {customerOrders.length}</b><span style={{fontSize:'10px',background:'#22c55e',padding:'4px 8px',borderRadius:'10px'}}>🔴 LIVE</span></div>
            {customerOrders.map((o:any)=>{
              const color=o.status==='new'?'#FF3B30':o.status==='accepted'?'#22c55e':o.status==='preparing'?'#f59e0b':o.status==='on_the_way'?'#0F4C75':'#22c55e';
              const text=o.status==='new'?'🆕 Изпратена':o.status==='accepted'?'✅ Приета от магазина':o.status==='preparing'?'👨‍🍳 Приготвя се':o.status==='on_the_way'?'🚚 На път към теб':'✅ Доставена';
              return (
                <div key={o.id} style={{background:'white',border:`2px solid ${color}`,borderRadius:'14px',padding:'12px'}}>
                  <div style={{display:'flex',justifyContent:'space-between'}}><b style={{fontSize:'13px'}}>{shops.find(s=>s.id===o.shop_id)?.name||'Магазин'} • {o.total}€</b><span style={{fontSize:'10px',background:color,color:'white',padding:'4px 8px',borderRadius:'10px',fontWeight:'bold'}}>{text}</span></div>
                  <div style={{fontSize:'11px',color:'#666',marginTop:'4px'}}>{new Date(o.created_at).toLocaleString('bg-BG')} • #{o.id.slice(0,8)} • 📍 {o.address}</div>
                  <div style={{background:'#f9fafb',padding:'10px',borderRadius:'10px',marginTop:'8px'}}>{(o.items||[]).map((it:any,i:number)=><div key={i} style={{display:'flex',justifyContent:'space-between',fontSize:'12px',padding:'5px 0',borderBottom:i<(o.items.length-1)?'1px solid #e5e7eb':'none'}}><span>{it.name} x{it.qty||1}</span><span>{(parseFloat(it.price)*(it.qty||1)).toFixed(2)}€</span></div>)}</div>
                  <div style={{display:'flex',gap:'4px',marginTop:'8px'}}>{['new','accepted','preparing','on_the_way','delivered'].map((st,idx)=>{ const done=['new','accepted','preparing','on_the_way','delivered'].indexOf(o.status)>=idx; return <div key={st} style={{flex:1,height:'6px',borderRadius:'3px',background:done?color:'#e5e7eb'}}/> })}</div>
                </div>
              )
            })}
            {customerOrders.length===0 && <div style={{textAlign:'center',padding:'20px',color:'#666',background:'white',borderRadius:'12px'}}>Нямаш поръчки още. Отиди в Пазар и поръчай.</div>}
          </div>
        )}

        {tab==='my_shop' && (
          <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
            <div style={{background:'#22c55e',color:'white',padding:'14px',borderRadius:'14px'}}>
              <b style={{fontSize:'16px'}}>🏪 Моят магазин - {shops.find(s=>s.id===myShopProfile?.shop_id)?.name||'Магазин'}</b>
              <div style={{fontSize:'11px',marginTop:'4px'}}>Ти си собственик. Тук сменяш цени, добавяш стоки, виждаш поръчки в реално време. ID: {myShopProfile?.shop_id?.slice(0,8)}</div>
              {debugLog && <div style={{background:'white',color:'#0F4C75',padding:'6px 8px',borderRadius:'8px',marginTop:'8px',fontSize:'11px'}}>{debugLog}</div>}
            </div>

            <div style={{background:editingProduct?'#fef3c7':'white',border:`2px solid ${editingProduct?'#f59e0b':'#22c55e'}`,borderRadius:'14px',padding:'14px'}}>
              <b style={{fontSize:'13px'}}>{editingProduct?`✏️ Редактираш: ${editingProduct.name}`:'➕ Добави нова стока с всички екстри'}</b>
              <input value={newProdName} onChange={e=>setNewProdName(e.target.value)} placeholder="Име *: Кайма Варна 1кг" style={{width:'100%',padding:'12px',borderRadius:'10px',border:'1px solid #22c55e',marginTop:'10px'}}/>
              <div style={{display:'flex',gap:'8px',marginTop:'8px'}}>
                <input value={newProdPrice} onChange={e=>setNewProdPrice(e.target.value)} placeholder="Цена *: 6.25" style={{flex:1,padding:'12px',borderRadius:'10px',border:'2px solid #22c55e'}}/>
                <select value={newProdCat} onChange={e=>setNewProdCat(e.target.value)} style={{flex:1,padding:'12px',borderRadius:'10px',border:'1px solid #ddd',fontWeight:'bold'}}>{PRODUCT_CATS.filter(c=>c!=='Всички').map(c=><option key={c} value={c}>{c}</option>)}</select>
              </div>
              <input value={newProdDesc} onChange={e=>setNewProdDesc(e.target.value)} placeholder="Описание: прясно мляно, 1кг, охладено" style={{width:'100%',padding:'10px',borderRadius:'10px',border:'1px solid #ddd',marginTop:'8px'}}/>
              <div style={{display:'flex',gap:'8px',marginTop:'8px',alignItems:'center'}}>
                <label style={{display:'flex',gap:'6px',alignItems:'center',fontSize:'12px'}}><input type="checkbox" checked={newProdActive} onChange={e=>setNewProdActive(e.target.checked)}/> Активен в Пазар</label>
                <div style={{flex:1,border:'1px dashed #22c55e',padding:'6px',borderRadius:'8px',background:'#f9fafb'}}><input type="file" accept="image/*" onChange={e=>setNewProdFile(e.target.files?.[0]||null)} style={{width:'100%',fontSize:'11px'}}/></div>
              </div>
              <div style={{display:'flex',gap:'8px',marginTop:'12px'}}>
                <button onClick={addProductWithImage} style={{flex:1,padding:'14px',background:editingProduct?'#f59e0b':'#22c55e',color:'white',border:'none',borderRadius:'12px',fontWeight:'800'}}>{editingProduct?'💾 Запази промените':'➕ Добави продукт'}</button>
                {editingProduct && <button onClick={cancelEditProduct} style={{padding:'14px',background:'#e5e7eb',border:'none',borderRadius:'12px',fontWeight:'bold'}}>Откажи</button>}
              </div>
            </div>

            <div style={{background:'white',border:'1px solid #e5e7eb',borderRadius:'12px',padding:'10px'}}>
              <div style={{display:'flex',gap:'6px'}}>
                <input value={prodSearch} onChange={e=>setProdSearch(e.target.value)} placeholder="🔍 Търси моя стока..." style={{flex:1,padding:'10px',borderRadius:'8px',border:'1px solid #ddd',fontSize:'12px'}}/>
                <select value={prodCatFilter} onChange={e=>setProdCatFilter(e.target.value)} style={{padding:'10px',borderRadius:'8px',border:'1px solid #ddd',fontSize:'11px'}}>{PRODUCT_CATS.map(c=><option key={c} value={c}>{c}</option>)}</select>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',marginTop:'10px'}}><b style={{fontSize:'13px'}}>📋 Моите стоки - {filteredMyProducts.length}</b><button onClick={()=>loadMyShopProfile()} style={{background:'#0F4C75',color:'white',border:'none',padding:'6px 12px',borderRadius:'8px',fontSize:'11px'}}>🔄 Опресни</button></div>
              {filteredMyProducts.map((p:any)=>(
                <div key={p.id} style={{display:'flex',gap:'10px',alignItems:'center',border:'1px solid #e5e7eb',padding:'10px',borderRadius:'12px',marginTop:'8px',background:p.id===editingProduct?.id?'#fef3c7':'white'}}>
                  {p.image_url && <img src={p.image_url} style={{width:'60px',height:'60px',objectFit:'cover',borderRadius:'10px'}}/>}
                  <div style={{flex:1}}><b style={{fontSize:'12px'}}>{p.name}</b><div style={{fontSize:'10px',color:'#666'}}>{(p.description||'').replace(/^\[.*?\]\s*/,'')}</div><div style={{display:'flex',gap:'6px',marginTop:'2px'}}><span style={{fontSize:'9px',background:'#f3f4f6',padding:'2px 6px',borderRadius:'6px'}}>{p.description?.match(/\[(.*?)\]/)?.[1]||'Други'}</span><span style={{fontSize:'9px',background:p.active===false?'#fee2e2':'#dcfce7',color:p.active===false?'#991b1b':'#166534',padding:'2px 6px',borderRadius:'6px'}}>{p.active===false?'🔴 Скрит':'🟢 Активен'}</span></div><b style={{color:'#22c55e',fontSize:'13px'}}>{p.price}€</b></div>
                  <div style={{display:'flex',flexDirection:'column',gap:'4px'}}><button onClick={()=>startEditProduct(p)} style={{background:'#0F4C75',color:'white',border:'none',padding:'6px 10px',borderRadius:'6px',fontSize:'10px',fontWeight:'bold'}}>✏️ Цена</button><button onClick={()=>deleteProduct(p.id)} style={{background:'#FF3B30',color:'white',border:'none',padding:'6px 10px',borderRadius:'6px',fontSize:'10px'}}>🗑️ Трий</button></div>
                </div>
              ))}
            </div>

            <div style={{background:'white',border:'2px solid #22c55e',borderRadius:'14px',padding:'12px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><b style={{fontSize:'14px'}}>📦 Поръчки LIVE - {myShopOrders.length}</b><span style={{fontSize:'10px',background:'#22c55e',color:'white',padding:'4px 8px',borderRadius:'12px',fontWeight:'800'}}>🔴 LIVE</span></div>
              <div style={{display:'flex',gap:'6px',overflowX:'auto',margin:'10px 0'}}>
                {[{k:'all',l:'Всички'},{k:'new',l:'🆕 Нови'},{k:'accepted',l:'✅ Приети'},{k:'preparing',l:'👨‍🍳 Готвят'},{k:'on_the_way',l:'🚚 На път'},{k:'delivered',l:'✅ Доставени'}].map(f=><button key={f.k} onClick={()=>setOrderStatusFilter(f.k)} style={{whiteSpace:'nowrap',padding:'8px 12px',borderRadius:'20px',border:'1px solid #e5e7eb',fontSize:'11px',fontWeight:'bold',background:orderStatusFilter===f.k?'#0F4C75':'white',color:orderStatusFilter===f.k?'white':'#666'}}>{f.l} {f.k!=='all'?`(${myShopOrders.filter(o=>o.status===f.k).length})`:''}</button>)}
              </div>
              {filteredOrders.map((o:any)=>{
                const col=o.status==='new'?'#FF3B30':o.status==='accepted'?'#22c55e':o.status==='preparing'?'#f59e0b':o.status==='on_the_way'?'#0F4C75':'#22c55e';
                const txt=o.status==='new'?'🆕 НОВА':o.status==='accepted'?'✅ ПРИЕТА':o.status==='preparing'?'👨‍🍳 ГОТВИ СЕ':o.status==='on_the_way'?'🚚 НА ПЪТ':'✅ ДОСТАВЕНА';
                return (
                  <div key={o.id} style={{background:'white',border:`2px solid ${col}`,borderRadius:'14px',padding:'12px',marginBottom:'12px'}}>
                    <div style={{display:'flex',justifyContent:'space-between'}}><b style={{fontSize:'13px'}}>{o.customer_name}</b><span style={{fontSize:'10px',background:col,color:'white',padding:'4px 10px',borderRadius:'12px',fontWeight:'800'}}>{txt}</span></div>
                    <div style={{fontSize:'11px',color:'#666',marginTop:'4px'}}>📞 {o.customer_phone} • 🕒 {new Date(o.created_at).toLocaleString('bg-BG')} • #{o.id.slice(0,8)}</div>
                    <div style={{fontSize:'11px',background:'#fff3cd',padding:'6px 8px',borderRadius:'8px',marginTop:'6px',border:'1px solid #ffe69c'}}>📍 {o.address}</div>
                    <div style={{background:'#f9fafb',padding:'10px',borderRadius:'10px',marginTop:'10px'}}>
                      <div style={{fontSize:'11px',fontWeight:'800',marginBottom:'6px'}}>🛒 Поръчано (с количества):</div>
                      {(o.items||[]).map((it:any,i:number)=><div key={i} style={{display:'flex',justifyContent:'space-between',fontSize:'12px',padding:'6px 0',borderBottom:i<(o.items.length-1)?'1px solid #e5e7eb':'none'}}><span><b>{it.name}</b> x{it.qty||1}</span><span>{(parseFloat(it.price)*(it.qty||1)).toFixed(2)}€</span></div>)}
                      <div style={{display:'flex',justifyContent:'space-between',fontWeight:'800',marginTop:'8px',borderTop:'2px solid #e5e7eb',paddingTop:'8px'}}><span>Общо:</span><span style={{color:'#0F4C75',fontSize:'14px'}}>{o.total}€</span></div>
                    </div>
                    <div style={{display:'flex',gap:'8px',marginTop:'12px'}}>
                      <a href={`tel:${o.customer_phone}`} style={{flex:1,background:'#0F4C75',color:'white',padding:'12px',borderRadius:'10px',textAlign:'center',textDecoration:'none',fontWeight:'800',fontSize:'12px'}}>📞 Обади</a>
                      {o.status==='new' && <button onClick={()=>updateOrderStatus(o.id,'accepted')} style={{flex:1,background:'#22c55e',color:'white',border:'none',padding:'12px',borderRadius:'10px',fontWeight:'800'}}>✅ Приеми</button>}
                      {o.status==='accepted' && <button onClick={()=>updateOrderStatus(o.id,'preparing')} style={{flex:1,background:'#f59e0b',color:'white',border:'none',padding:'12px',borderRadius:'10px',fontWeight:'800'}}>👨‍🍳 Готвя</button>}
                      {o.status==='preparing' && <button onClick={()=>updateOrderStatus(o.id,'on_the_way')} style={{flex:1,background:'#0F4C75',color:'white',border:'none',padding:'12px',borderRadius:'10px',fontWeight:'800'}}>🚚 На път</button>}
                      {o.status==='on_the_way' && <button onClick={()=>updateOrderStatus(o.id,'delivered')} style={{flex:1,background:'#22c55e',color:'white',border:'none',padding:'12px',borderRadius:'10px',fontWeight:'800'}}>✅ Доставено</button>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {tab==='driver' && (
          <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
            <div style={{background:'#0F4C75',color:'white',padding:'12px',borderRadius:'12px',display:'flex',justifyContent:'space-between'}}><b>🚚 Моите доставки LIVE - {myShopOrders.length}</b><span style={{fontSize:'10px',background:'#22c55e',padding:'4px 8px',borderRadius:'10px'}}>🔴 LIVE</span></div>
            {myShopOrders.map((o:any)=>{
              const col=o.status==='on_the_way'?'#0F4C75':o.status==='delivered'?'#22c55e':'#f59e0b';
              return (
                <div key={o.id} style={{background:'white',border:`2px solid ${col}`,borderRadius:'14px',padding:'12px'}}>
                  <div style={{display:'flex',justifyContent:'space-between'}}><b>#{o.id.slice(0,8)} • {o.total}€</b><span style={{fontSize:'10px',background:col,color:'white',padding:'4px 8px',borderRadius:'10px'}}>{o.status}</span></div>
                  <div style={{fontSize:'12px',marginTop:'6px'}}><b>{o.customer_name}</b> • {o.customer_phone}</div>
                  <div style={{fontSize:'11px',background:'#fff3cd',padding:'6px 8px',borderRadius:'8px',marginTop:'6px'}}>📍 {o.address}</div>
                  <div style={{background:'#f9fafb',padding:'8px',borderRadius:'8px',marginTop:'8px',fontSize:'11px'}}>{(o.items||[]).map((it:any,i:number)=><div key={i} style={{display:'flex',justifyContent:'space-between'}}><span>{it.name} x{it.qty}</span><span>{(it.price*it.qty).toFixed(2)}€</span></div>)}</div>
                  <div style={{display:'flex',gap:'8px',marginTop:'10px'}}>
                    <a href={`tel:${o.customer_phone}`} style={{flex:1,background:'#0F4C75',color:'white',padding:'12px',borderRadius:'10px',textAlign:'center',textDecoration:'none',fontWeight:'800'}}>📞 Обади се</a>
                    {o.status!=='on_the_way' && o.status!=='delivered' && <button onClick={()=>updateOrderStatus(o.id,'on_the_way')} style={{flex:1,background:'#f59e0b',color:'white',border:'none',padding:'12px',borderRadius:'10px',fontWeight:'800'}}>🚚 Пътувам</button>}
                    {o.status!=='delivered' && <button onClick={()=>updateOrderStatus(o.id,'delivered')} style={{flex:1,background:'#22c55e',color:'white',border:'none',padding:'12px',borderRadius:'10px',fontWeight:'800'}}>✅ Доставено</button>}
                  </div>
                </div>
              )
            })}
            {myShopOrders.length===0 && <div style={{textAlign:'center',padding:'20px',background:'white',borderRadius:'12px',color:'#666'}}>Нямаш доставки още. Като магазинара приеме поръчка, ще се появи тук в реално време.</div>}
          </div>
        )}

        {tab==='admin' && isAdmin && (
          <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
            <div style={{background:'#FFD60A',color:'black',padding:'12px',borderRadius:'12px'}}><b>👑 Админ Магазини - само ти +447935463970</b><div style={{fontSize:'11px'}}>Тук управляваш всичко: СПРИ/ПУСНИ магазин, сменяш име/такса/телефон собственик, добавяш/махаш шофьори, виждаш всички поръчки и продукти в реално време. НЕ редактираш цени - цените са само за собственика.</div></div>
            <div style={{background:'white',border:'2px solid #22c55e',borderRadius:'12px',padding:'12px'}}>
              <b>➕ Нов магазин (без Sofia)</b>
              <input value={shopName} onChange={e=>setShopName(e.target.value)} placeholder="Име: HALASTRA Две Могили" style={{width:'100%',padding:'10px',borderRadius:'8px',border:'1px solid #ddd',marginTop:'8px'}}/>
              <input value={ownerPhone} onChange={e=>setOwnerPhone(e.target.value)} placeholder="Собственик тел: +447511230086" style={{width:'100%',padding:'10px',borderRadius:'8px',border:'1px solid #ddd',marginTop:'8px'}}/>
              <input value={driverPhone} onChange={e=>setDriverPhone(e.target.value)} placeholder="Шофьор тел (по желание)" style={{width:'100%',padding:'10px',borderRadius:'8px',border:'1px solid #ddd',marginTop:'8px'}}/>
              <button onClick={addShop} style={{width:'100%',marginTop:'10px',padding:'12px',background:'#22c55e',color:'white',border:'none',borderRadius:'10px',fontWeight:'800'}}>СЪЗДАЙ МАГАЗИН</button>
            </div>
            {shops.map((s:any)=>{
              const profiles=shopProfiles.filter((p:any)=>p.shop_id===s.id);
              const owner=profiles.find((p:any)=>p.role==='shop_owner');
              const drivers=profiles.filter((p:any)=>p.role==='driver');
              const edit=editShopData[s.id]||{name:s.name,fee:(s.delivery_fee||4.99).toString(),ownerPhone:s.phone||owner?.phone||'',newDriverPhone:''};
              const shopOrders=myShopOrders.filter((o:any)=>o.shop_id===s.id);
              return (
                <div key={s.id} style={{background:'white',padding:'12px',borderRadius:'14px',border:s.vip_active===false?'3px solid #FF3B30':'2px solid #22c55e'}}>
                  <div style={{display:'flex',justifyContent:'space-between'}}><div><b>{s.name}</b><div style={{fontSize:'11px'}}>Тел: {s.phone} • {s.vip_active===false?'🔴 СПРЯН':'🟢 Активен'} • {s.delivery_fee}€ • Поръчки: {shopOrders.length}<br/>ID: {s.id.slice(0,8)} • {s.city||'Без Sofia ✅'}</div></div><div style={{display:'flex',flexDirection:'column',gap:'4px'}}><button onClick={()=>toggleShopActive(s)} style={{background:s.vip_active===false?'#22c55e':'#FF3B30',color:'white',border:'none',padding:'8px 12px',borderRadius:'8px',fontSize:'11px',fontWeight:'bold'}}>{s.vip_active===false?'✅ ПУСНИ':'⛔ СПРИ'}</button><button onClick={()=>deleteShop(s.id)} style={{background:'black',color:'white',border:'none',padding:'6px 10px',borderRadius:'8px',fontSize:'10px'}}>🗑️ Изтрий</button></div></div>
                  <div style={{marginTop:'10px',background:'#f9fafb',padding:'10px',borderRadius:'10px',border:'1px solid #e5e7eb'}}>
                    <b style={{fontSize:'11px'}}>✏️ Редактирай:</b>
                    <input value={edit.name} onChange={e=>setEditShopData({...editShopData,[s.id]:{...edit,name:e.target.value}})} placeholder="Име" style={{width:'100%',padding:'8px',borderRadius:'6px',border:'1px solid #ddd',marginTop:'6px',fontSize:'12px'}}/>
                    <div style={{display:'flex',gap:'6px',marginTop:'6px'}}><input value={edit.fee} onChange={e=>setEditShopData({...editShopData,[s.id]:{...edit,fee:e.target.value}})} placeholder="Такса €" style={{flex:1,padding:'8px',borderRadius:'6px',border:'1px solid #ddd'}}/><input value={edit.ownerPhone} onChange={e=>setEditShopData({...editShopData,[s.id]:{...edit,ownerPhone:e.target.value}})} placeholder="Нов тел собственик" style={{flex:1,padding:'8px',borderRadius:'6px',border:'2px solid #22c55e'}}/></div>
                    <button onClick={()=>updateShopInfo(s)} style={{width:'100%',marginTop:'6px',padding:'10px',background:'#0F4C75',color:'white',border:'none',borderRadius:'8px',fontWeight:'bold',fontSize:'11px'}}>💾 Запази</button>
                  </div>
                  <div style={{marginTop:'10px'}}><b style={{fontSize:'11px'}}>👥 Профили:</b>{owner && <div style={{fontSize:'11px',background:'#e6f9ed',padding:'6px',borderRadius:'6px',marginTop:'4px',display:'flex',justifyContent:'space-between'}}><span>👑 Собственик: <b>{owner.phone}</b></span><button onClick={()=>removeProfile(owner.id)} style={{background:'#FF3B30',color:'white',border:'none',padding:'2px 6px',borderRadius:'4px'}}>X</button></div>}{drivers.map((d:any)=><div key={d.id} style={{fontSize:'11px',background:'#e0f2fe',padding:'6px',borderRadius:'6px',marginTop:'4px',display:'flex',justifyContent:'space-between'}}><span>🚚 Шофьор: <b>{d.phone}</b></span><button onClick={()=>removeProfile(d.id)} style={{background:'#FF3B30',color:'white',border:'none',padding:'4px 8px',borderRadius:'4px'}}>Премахни</button></div>)}<div style={{display:'flex',gap:'6px',marginTop:'8px'}}><input value={edit.newDriverPhone} onChange={e=>setEditShopData({...editShopData,[s.id]:{...edit,newDriverPhone:e.target.value}})} placeholder="Нов шофьор тел" style={{flex:1,padding:'8px',borderRadius:'6px',border:'1px solid #ddd',fontSize:'11px'}}/><button onClick={()=>addDriverToShop(s)} style={{background:'#0F4C75',color:'white',border:'none',padding:'8px 12px',borderRadius:'6px',fontSize:'11px'}}>➕ Добави шофьор</button></div></div>
                </div>
              )
            })}
          </div>
        )}

      </div>
    </main>
  );
}