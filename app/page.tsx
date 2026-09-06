'use client';
import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://ypfbljjrpppkdxdftjcv.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_NZrVv1hI7aTWVdeyZT27-Q_rWp_olMG";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const EDGE_URL = "https://ypfbljjrpppkdxdftjcv.supabase.co/functions/v1/admin";

const ADMIN_PHONES = ['+447935463970','447935463970','07935463970'];
const clean = (p:string)=> p.replace(/[^0-9]/g,'').slice(-10);
const cleanFull = (p:string)=> p.replace(/[^0-9]/g,'');
const isAdminPhone = (phone:string)=>{ if(!phone) return false; const c=phone.replace(/[^0-9+]/g,''); return ADMIN_PHONES.includes(c) || ADMIN_PHONES.includes(clean(c)) || c.includes('7935463970'); };
const COUNTRIES = [{code:'BG',name:'🇧🇬 България',prefix:'359'},{code:'GB',name:'🇬🇧 UK',prefix:'44'},{code:'DE',name:'🇩🇪 Германия',prefix:'49'},{code:'ES',name:'🇪🇸 Испания',prefix:'34'},{code:'GR',name:'🇬🇷 Гърция',prefix:'30'},{code:'RO',name:'🇷🇴 Румъния',prefix:'40'},{code:'TR',name:'🇹🇷 Турция',prefix:'90'}];
const getCountryByPhone = (phone:string)=>{ const c = phone.replace(/[^0-9]/g,''); for(let co of COUNTRIES) if(c.startsWith(co.prefix) || c.includes(co.prefix)) return co.code; if(c.startsWith('44')) return 'GB'; if(c.startsWith('359')) return 'BG'; return 'GB'; }

const TRANSLATIONS = {
  bg: { siteFree:'Сайтът е безплатен', sharedCosts:'Пътуването е споделени разходи', exit:'Изход', find:'Намери', my:'Моите', offer:'Предложи', admin:'👑 Админ', shops:'👑 Магазини', market:'🛒 Пазар', important:'ℹ️ ВАЖНО - 2 неща:', important1:'1. Сайтът VoziMe е 100% безплатен.', important1b:'Ние не вземаме комисионна.', important2:'2. Самото пътуване НЕ е безплатно.', important2b:'Шофьор и пътник се договарят ЛИЧНО.', all:'Всички', drivers:'Шофьори', passengers:'Пътници', search:'🔍 Лондон, София...', notFree:'⚠️ Пътуването НЕ е безплатно - лична договорка.', connectDirect:'📞 СВЪРЖИ СЕ ДИРЕКТНО:', call:'📞 Обади се', offers:'🚗 ПРЕДЛАГА', seeks:'🙋 ТЪРСИ', imDriver:'🚗 Аз съм Шофьор', imPassenger:'🙋 Аз съм Пътник', from:'От', to:'До', brand:'Марка', color:'Цвят', reg:'Рег. номер', seatsNeed:'Места нужни', seatsFree:'Свободни места', note:'Бележка...', declare:'ДЕКЛАРИРАМ: Пътувам лично, само споделени разходи, БЕЗ печалба.', fillFromTo:'Попълни От и До', publishSeeks:'🙋 Публикувай че ТЪРСИШ', publish:'🚗 Публикувай', edit:'Редактирай', youSeek:'ТЪРСИШ', youOffer:'ПРЕДЛАГАШ', footerTitle:'❤️ VoziMe е безплатна', footerSub:'Сайтът не взема комисионна.', footerWarn:'Пътуванията НЕ са безплатни - лична договорка.', enableLoc:'📍 Включи локация', report:'🚩 Докладвай', banned:'⛔ БАННАТ СИ', maintenanceTitle:'🔧 Профилактика', maintenanceMsg:'Работим по подобрения.', deleteAcc:'🗑️ Изтрий акаунт', tabLogin:'Вход', tabReg:'Регистрация', loginSub:'Влез за да продължиш', loginBtn:'Влез →', regBtn:'Регистрирай се →', firstName:'Име', lastName:'Фамилия', phone:'Телефон +447...', time:'Час на тръгване', needVerify:'⚠️ Трябва верификация за да пускаш обяви!', needVerifyLong:'Отиди в Моите -> Стани Проверен със снимка.', verifyTitle:'✅ Стани Проверен - Безплатно', verifyDesc:'Направи снимка как държиш лист с текст: VoziMe + днешна дата', writeOnPaper:'На листа напиши:', step1:'1. VoziMe', step2:'2. Днешна дата: ', step3:'3. Твоето име', deleteRide:'🗑️ Трий', deleteAccKeep:'🗑️ Изтрий акаунт (пази се 6м)', photoSent:'Снимката е изпратена! Админ ще я одобри до 24ч.', pendingApproval:'⏳ Чака одобрение.', uploading:'Качва...', sendForCheck:'📸 Изпрати за проверка', verifiedOn:'Верифициран на', noRides:'Нямаш обяви', noRidesVerify:'- първо се верифицирай', seatsPlace:'места', agreementConsent:'Регистрирайки се се съгласяваш снимката да се пази 1г за сигурност.', refresh:'🔄 Опресни', about:'За Нас', terms:'Условия', privacy:'Поверителност', contact:'Контакт', back:'← Назад' },
  en: { siteFree:'Site is free', sharedCosts:'Travel is shared costs', exit:'Exit', find:'Find', my:'My rides', offer:'Offer', admin:'👑 Admin', shops:'👑 Shops', market:'🛒 Market', important:'ℹ️ IMPORTANT - 2 things:', important1:'1. VoziMe is 100% free.', important1b:'We take no commission.', important2:'2. Trip is NOT free.', important2b:'Driver and passenger agree personally.', all:'All', drivers:'Drivers', passengers:'Passengers', search:'🔍 London, Sofia...', notFree:'⚠️ Trip NOT free - personal agreement.', connectDirect:'📞 CONNECT DIRECTLY:', call:'📞 Call', offers:'🚗 OFFERS', seeks:'🙋 SEEKS', imDriver:'🚗 I am Driver', imPassenger:'🙋 I am Passenger', from:'From', to:'To', brand:'Brand', color:'Color', reg:'Reg number', seatsNeed:'Seats needed', seatsFree:'Free seats', note:'Note...', declare:'I DECLARE: Personal travel, shared costs only, NO profit.', fillFromTo:'Fill From and To', publishSeeks:'🙋 Publish SEEK', publish:'🚗 Publish', edit:'Edit', youSeek:'YOU SEEK', youOffer:'YOU OFFER', footerTitle:'❤️ VoziMe is free', footerSub:'No commission.', footerWarn:'Trips NOT free.', enableLoc:'📍 Enable location', report:'🚩 Report', banned:'⛔ BANNED', maintenanceTitle:'🔧 Maintenance', maintenanceMsg:'Working on improvements.', deleteAcc:'🗑️ Delete account', tabLogin:'Login', tabReg:'Register', loginSub:'Login to continue', loginBtn:'Login →', regBtn:'Register →', firstName:'First name', lastName:'Last name', phone:'Phone +447...', time:'Departure time', needVerify:'⚠️ Verification needed to post!', needVerifyLong:'Go to My rides -> Get Verified.', verifyTitle:'✅ Get Verified - Free', verifyDesc:'Take photo holding paper: VoziMe + today date', writeOnPaper:'On paper write:', step1:'1. VoziMe', step2:'2. Today date: ', step3:'3. Your name', deleteRide:'🗑️ Delete', deleteAccKeep:'🗑️ Delete account (kept 6m)', photoSent:'Photo sent! Admin will approve within 24h.', pendingApproval:'⏳ Waiting for approval.', uploading:'Uploading...', sendForCheck:'📸 Send for check', verifiedOn:'Verified on', noRides:'No rides', noRidesVerify:'- verify first', seatsPlace:'seats', agreementConsent:'By registering you agree your verification photo is kept 1 year for safety.', refresh:'🔄 Refresh', about:'About', terms:'Terms', privacy:'Privacy', contact:'Contact', back:'← Back' }
};

const STATIC_CONTENT = {
  bg: {
    about: `VoziMe.bg е проект на DropOffPay.co.uk

Създадена от българи в Англия за българи в UK и Европа.

Идеята: пътуваш от UK за БГ с колата си - имаш празни места. Някой търси същия маршрут.

Ние НЕ сме таксиметрова фирма. Сайтът VoziMe е 100% безплатен, без комисионна. Просто дъска за обяви. Цената си я договаряте лично - само споделени разходи за гориво/ферибот.

VoziMe е част от системата на DropOffPay.co.uk - платформа за пратки и споделени пътувания.

Сайтът се поддържа с дарения (Ko-fi).

Собственик: DropOffPay.co.uk`,
    terms: `1. Какво е VoziMe?
VoziMe.bg е проект на DropOffPay.co.uk. Информационна платформа. Не е превозвач.

2. Декларация на шофьора
Публикувайки обява декларираш:
- Пътуваш лично по маршрута
- Предлагаш места САМО за споделени разходи (гориво, тол, ферибот) БЕЗ печалба
- Имаш валидна книжка и застраховка покриваща споделено пътуване

3. Плащане
Сайтът не обработва плащания. Договаряте се лично. DropOffPay.co.uk / VoziMe не носи отговорност.

4. Отговорност
Не носим отговорност за закъснения, анулации, багаж. При проблем - докладвай обявата с бутон 🚩.

5. Верификация и архив
Снимката за верификация се пази 1 година за сигурност. Изтрит акаунт се пази 6 месеца в архив при злоупотреба, после се трие.

6. Контакт за жалби
dropoffpay.co.uk@gmail.com или през сайта DropOffPay.co.uk`,
    privacy: `Администратор на данни: DropOffPay.co.uk / VoziMe.bg
Контакт: dropoffpay.co.uk@gmail.com

Какви данни пазим?
- Име, фамилия, телефон
- Обяви (От, До, час, кола)
- Снимка за верификация - само за админ, пази се 1 година
- IP и държава

Основание по GDPR: Легитимен интерес чл.6(1)(е) - сигурност и предотвратяване на измами.

Кой вижда данните?
Телефона ти е публичен в обявите - ти го публикуваш. Снимката е само за админ.

Срок:
Активен акаунт - докато го ползваш. Изтрит - 6 месеца архив. Снимка - 1 година.

Твоите права: Достъп, корекция, изтриване, пренос. Пиши на dropoffpay.co.uk@gmail.com. Жалба до ICO (UK) или КЗЛД (БГ).

Сайтът ползва само задължителни localStorage, не ползва бисквитки за проследяване.`,
    contact: `VoziMe.bg е част от DropOffPay.co.uk

За въпроси, проблеми, доклади за злоупотреба:

📧 Имейл: dropoffpay.co.uk@gmail.com
🌐 Сайт: www.dropoffpay.co.uk
📞 Тел: +44 7935463970 (WhatsApp / Viber)

Отговаряме до 24ч.

При спешен случай (кражба, заплаха) - докладвай обявата с бутон 🚩 Докладвай.`
  },
  en: {
    about: `VoziMe.bg is a project of DropOffPay.co.uk

Created by Bulgarians in England for Bulgarians in UK and Europe.

We are NOT a taxi company. Site is 100% free, no commission. Just a notice board. Price is agreed personally - shared costs only.

Part of DropOffPay.co.uk - platform for parcels and shared trips.

Supported by donations (Ko-fi).

Owner: DropOffPay.co.uk`,
    terms: `1. What is VoziMe?
VoziMe.bg is a project of DropOffPay.co.uk. Information platform. Not a carrier.

2. Driver declaration
By posting you declare:
- You travel personally
- Offer seats ONLY for shared costs (fuel, tolls, ferry) NO profit
- Valid license, MOT, insurance covering car-sharing

3. Payment
Site does not process payments. Agreed personally. DropOffPay.co.uk / VoziMe not responsible.

4. Liability
Not responsible for delays, cancellations. Report abuse with 🚩.

5. Verification
Photo kept 1 year for security. Deleted account kept 6 months archive.

6. Contact
dropoffpay.co.uk@gmail.com or via DropOffPay.co.uk`,
    privacy: `Data Controller: DropOffPay.co.uk / VoziMe.bg
Contact: dropoffpay.co.uk@gmail.com

What we keep?
- Name, phone
- Rides
- Verification photo - admin only, kept 1 year
- IP and country

Basis GDPR: Legitimate interest Art.6(1)(f) - security.

Who sees?
Phone is public in rides. Photo is admin-only.

Retention:
Active - while you use it. Deleted - 6 months. Photo - 1 year.

Your rights: Access, correction, deletion, export. Write to dropoffpay.co.uk@gmail.com. Complaint to ICO (UK) or CPDP (BG).

Site uses only essential localStorage, no tracking cookies.`,
    contact: `VoziMe.bg is part of DropOffPay.co.uk

For questions, problems, abuse reports:

📧 Email: dropoffpay.co.uk@gmail.com
🌐 Site: www.dropoffpay.co.uk
📞 Phone: +44 7935463970 (WhatsApp / Viber)

We reply within 24h.

Urgent (theft, threat) - report ride with 🚩 button.`
  }
};

export default function Home(){
  const [lang,setLang]=useState<'bg'|'en'>('bg');
  const [loginTab,setLoginTab]=useState<'login'|'register'>('login');
  const [loginForm,setLoginForm]=useState({firstName:'',lastName:'',phone:''});
  const [currentUser,setCurrentUser]=useState<any>(null);
  const [tab,setTab]=useState<'find'|'my'|'offer'|'admin'|'shops'|'market'>('find');
  const [staticPage,setStaticPage]=useState<'about'|'terms'|'privacy'|'contact'|null>(null);
  const [rides,setRides]=useState<any[]>([]);
  const [editingRide,setEditingRide]=useState<string|null>(null);
  const [offerForm,setOfferForm]=useState({type:'offer',from:'',to:'',fromCountry:'GB',toCountry:'BG',time:'09:30',returnTime:'12:30',date:'Днес',seats:'4',message:'',isDriver:false,carBrand:'',carColor:'',carReg:''});
  const [filterType,setFilterType]=useState(''); const [filterText,setFilterText]=useState('');
  const [myLocation,setMyLocation]=useState<any>(null); const [locLoading,setLocLoading]=useState(false); const [locDenied,setLocDenied]=useState(false);
  const [maintenance,setMaintenance]=useState<{enabled:boolean,msg:string}>({enabled:false,msg:''});
  const [bans,setBans]=useState<any[]>([]); const [reports,setReports]=useState<any[]>([]);
  const [banPhoneInput,setBanPhoneInput]=useState(''); const [banReasonInput,setBanReasonInput]=useState(''); const [banDuration,setBanDuration]=useState('forever');
  const [allUsers,setAllUsers]=useState<any[]>([]); const [userSearch,setUserSearch]=useState('');
  const [verifyFile,setVerifyFile]=useState<File|null>(null); const [uploadingVerify,setUploadingVerify]=useState(false);
  const [shops,setShops]=useState<any[]>([]);
  const [shopName,setShopName]=useState('');
  const [ownerPhoneInput,setOwnerPhoneInput]=useState('');
  const [driverPhoneInput,setDriverPhoneInput]=useState('');
  const [shopProfiles,setShopProfiles]=useState<any[]>([]);
  const [editShopData,setEditShopData]=useState<{[key:string]: {name:string, fee:string, ownerPhone:string, newDriverPhone:string}}>({});
  const [myShopProfile,setMyShopProfile]=useState<any>(null);
  const [myShopProducts,setMyShopProducts]=useState<any[]>([]);
  const [myShopOrders,setMyShopOrders]=useState<any[]>([]);
  const [newProdName,setNewProdName]=useState('');
  const [newProdPrice,setNewProdPrice]=useState('');
  const [newProdDesc,setNewProdDesc]=useState('');
  const [newProdFile,setNewProdFile]=useState<File|null>(null);
  const [editingProduct,setEditingProduct]=useState<any>(null);
  const [marketShops,setMarketShops]=useState<any[]>([]);
  const [marketProducts,setMarketProducts]=useState<any[]>([]);
  const [selectedMarketShop,setSelectedMarketShop]=useState<any>(null);
  const [cart,setCart]=useState<any[]>([]);
  const [customerAddr,setCustomerAddr]=useState('');
  const [debugMsg,setDebugMsg]=useState('');
  const ridesContainerRef = useRef<HTMLDivElement>(null);
  const t = TRANSLATIONS[lang];
  const isAdmin = currentUser && isAdminPhone(currentUser.phone);

  const callAdmin = async (action:string, data:any={})=>{
    const res = await fetch(EDGE_URL, { method: 'POST', headers: { 'Content-Type':'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'apikey': SUPABASE_ANON_KEY }, body: JSON.stringify({action,...data, adminPhone: currentUser?.phone, phone: currentUser?.phone}) });
    if(!res.ok) throw new Error(await res.text()); return res.json();
  };
  const syncCurrentUser = async ()=>{
    try{
      const cuStr = localStorage.getItem('vozime_current');
      if(!cuStr) return;
      const cu = JSON.parse(cuStr);
      if(!cu?.id) return;
      const {data} = await supabase.from('users').select('*').eq('id', cu.id).single();
      if(data){
        const updated = {...cu, firstName: data.first_name||cu.firstName, lastName: data.last_name||cu.lastName, phone: data.phone||cu.phone, is_verified: data.is_verified, verification_photo_url: data.verification_photo_url, verified_at: data.verified_at, country_code: data.country_code, deleted_at: data.deleted_at };
        localStorage.setItem('vozime_current', JSON.stringify(updated));
        setCurrentUser(updated);
      }
    }catch{}
  };
  const fetchLocation = async ()=>{
    setLocLoading(true); setLocDenied(false);
    if(navigator.geolocation){
      navigator.geolocation.getCurrentPosition(async (pos)=>{
        try{ const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&accept-language=en`); const data = await res.json(); setMyLocation({country: data.address?.country_code?.toUpperCase()||'GB', city: data.address?.city||data.address?.town||'Portsmouth'}); }catch{ tryIPLocation(); } finally{ setLocLoading(false); }
      }, ()=>{ tryIPLocation(); }, {enableHighAccuracy:true, timeout:8000});
    } else { tryIPLocation(); }
  };
  const tryIPLocation = async ()=>{ try{ const res = await fetch('https://ipapi.co/json/'); const data = await res.json(); if(data.city) setMyLocation({country: data.country_code||'GB', city: data.city}); else {setMyLocation(null); setLocDenied(true);} }catch{ setMyLocation(null); setLocDenied(true); } finally{ setLocLoading(false); } };
  const loadMaintenance = async ()=>{ const {data} = await supabase.from('site_settings').select('*').eq('id',1).single(); if(data) setMaintenance({enabled:data.maintenance_enabled, msg:data.maintenance_msg||''}); };
  const loadBans = async ()=>{ const {data} = await supabase.from('bans').select('*').order('created_at',{ascending:false}); if(data) setBans(data.map((b:any)=>({id:b.id, phone:b.phone, originalPhone:b.original_phone, reason:b.reason, until:b.until, bannedBy:b.banned_by, createdAt:b.created_at}))); };
  const loadReports = async ()=>{ const {data} = await supabase.from('reports').select('*').eq('status','open').order('created_at',{ascending:false}); if(data) setReports(data.map((r:any)=>({id:r.id, rideId:r.ride_id, reportedPhone:r.reported_phone, reportedName:r.reported_name, from:r.from_city, to:r.to_city, reason:r.reason, reporterPhone:r.reporter_phone, reporterName:r.reporter_name, createdAt:r.created_at}))); };
  const loadRides = async ()=>{ const cutoff = Date.now() - 48*60*60*1000; const {data} = await supabase.from('rides').select('*').gt('created_at', cutoff).order('created_at',{ascending:true}); if(data) setRides(data.map((d:any)=>({id:d.id, driverName:d.driver_name, driverPhone:d.driver_phone, driverId:d.driver_id, from:d.from_city, to:d.to_city, fromCountry:d.from_country||'BG', toCountry:d.to_country||'BG', time:d.time, date:d.date, seats:d.seats, message:d.message, createdAt:d.created_at, type:d.type||'offer', carInfo:d.car_info, isDriverVerified:d.is_driver}))); };
  const loadAllUsers = async ()=>{ const {data} = await supabase.from('users').select('*').order('first_name',{ascending:true}).limit(1000); if(data) setAllUsers(data); }
  const loadShops = async ()=>{
    const {data}=await supabase.from('shops').select('*').order('created_at',{ascending:false});
    if(data){ setShops(data); setMarketShops(data.filter((s:any)=>s.vip_active!==false)); }
    const {data:profiles}=await supabase.from('shop_profiles').select('*');
    if(profiles) setShopProfiles(profiles);
  };
  const loadMyShopProfile = async ()=>{
    if(!currentUser?.phone) return;
    if(isAdminPhone(currentUser.phone)){
      const myClean10 = clean(currentUser.phone);
      const myCleanFull = cleanFull(currentUser.phone);
      const {data:allProfiles}=await supabase.from('shop_profiles').select('*');
      if(!allProfiles) { setMyShopProfile(null); return; }
      const myProfiles = allProfiles.filter((p:any)=>{
        const pClean10 = clean(p.phone);
        const pCleanFull = cleanFull(p.phone);
        return (pClean10===myClean10 && pCleanFull===myCleanFull && p.phone===currentUser.phone);
      });
      if(myProfiles.length===0){
        setMyShopProfile(null);
        setMyShopProducts([]);
        setMyShopOrders([]);
        return;
      }
      const ownerProfile = myProfiles.find((p:any)=>p.role==='shop_owner') || myProfiles[0];
      setMyShopProfile(ownerProfile);
      const shopIds = [...new Set(myProfiles.map((p:any)=>p.shop_id))];
      let allProds:any[] = []; let allOrders:any[] = [];
      for(const sid of shopIds){
        const {data:prods}=await supabase.from('products').select('*').eq('shop_id', sid);
        if(prods) allProds = [...allProds, ...prods];
        const {data:ords}=await supabase.from('orders').select('*').eq('shop_id', sid).order('created_at',{ascending:false});
        if(ords) allOrders = [...allOrders, ...ords];
      }
      setMyShopProducts(allProds);
      setMyShopOrders(allOrders);
      return;
    }
    const myClean10 = clean(currentUser.phone);
    const myCleanFull = cleanFull(currentUser.phone);
    const {data:allProfiles}=await supabase.from('shop_profiles').select('*');
    if(!allProfiles || allProfiles.length===0){ setMyShopProfile(null); return; }
    const myProfiles = allProfiles.filter((p:any)=>{
      const pClean10 = clean(p.phone);
      const pCleanFull = cleanFull(p.phone);
      return (pClean10===myClean10 || pCleanFull===myCleanFull || p.phone===currentUser.phone || pCleanFull.endsWith(myClean10) || myCleanFull.endsWith(pClean10) || pCleanFull.includes(myClean10) || myCleanFull.includes(pClean10));
    });
    if(myProfiles.length===0){ setMyShopProfile(null); setMyShopProducts([]); setMyShopOrders([]); return; }
    const ownerProfile = myProfiles.find((p:any)=>p.role==='shop_owner') || myProfiles[0];
    setMyShopProfile(ownerProfile);
    const shopIds = [...new Set(myProfiles.map((p:any)=>p.shop_id))];
    let allProds:any[] = []; let allOrders:any[] = [];
    for(const sid of shopIds){
      const {data:prods}=await supabase.from('products').select('*').eq('shop_id', sid);
      if(prods) allProds = [...allProds, ...prods];
      const {data:ords}=await supabase.from('orders').select('*').eq('shop_id', sid).order('created_at',{ascending:false});
      if(ords) allOrders = [...allOrders, ...ords];
    }
    if(allProds.length===0){
      const {data:allProducts}=await supabase.from('products').select('*');
      if(allProducts){
        const filtered = allProducts.filter((p:any)=> shopIds.includes(p.shop_id));
        if(filtered.length>0) allProds = filtered;
      }
    }
    setMyShopProducts(allProds);
    setMyShopOrders(allOrders);
  };
  const addShop = async ()=>{
    if(!shopName ||!ownerPhoneInput){ alert('Име и телефон!'); return; }
    // МАХНАТО Sofia - оставяме city празно, не се показва никъде
    const {data,error}=await supabase.from('shops').insert({name:shopName, slug:shopName.toLowerCase().replace(/\s+/g,'-')+'-'+Date.now(), city:'', phone:ownerPhoneInput, delivery_fee:4.99, vip_active:true}).select().single();
    if(error){ alert(error.message); return; }
    await supabase.from('shop_profiles').insert([{phone:ownerPhoneInput, role:'shop_owner', shop_id:data.id}]);
    if(driverPhoneInput) await supabase.from('shop_profiles').insert([{phone:driverPhoneInput, role:'driver', shop_id:data.id}]);
    setShopName(''); setOwnerPhoneInput(''); setDriverPhoneInput(''); await loadShops();
  };
  const toggleShopActive = async (shop:any)=>{
    const newVal = !shop.vip_active;
    const {error} = await supabase.from('shops').update({vip_active:newVal}).eq('id', shop.id);
    if(error){ alert(error.message); return; }
    await loadShops();
  };
  const deleteShop = async (shopId:string)=>{
    if(!confirm('Изтрий магазина завинаги?')) return;
    await supabase.from('shop_profiles').delete().eq('shop_id', shopId);
    await supabase.from('products').delete().eq('shop_id', shopId);
    await supabase.from('shops').delete().eq('id', shopId);
    await loadShops();
  };
  const updateShopInfo = async (shop:any)=>{
    const edit = editShopData[shop.id];
    if(!edit) return;
    const feeNum = parseFloat(edit.fee.replace(',','.')) || 4.99;
    const {error} = await supabase.from('shops').update({name:edit.name || shop.name, delivery_fee:feeNum, phone:edit.ownerPhone || shop.phone}).eq('id', shop.id);
    if(error){ alert(error.message); return; }
    if(edit.ownerPhone && edit.ownerPhone !== shop.phone){
      const ownerProfile = shopProfiles.find((p:any)=>p.shop_id===shop.id && p.role==='shop_owner');
      if(ownerProfile){ await supabase.from('shop_profiles').update({phone:edit.ownerPhone}).eq('id', ownerProfile.id); }
      else { await supabase.from('shop_profiles').insert([{phone:edit.ownerPhone, role:'shop_owner', shop_id:shop.id}]); }
    }
    alert('Магазин обновен!');
    await loadShops();
  };
  const addDriverToShop = async (shop:any)=>{
    const edit = editShopData[shop.id];
    if(!edit?.newDriverPhone){ alert('Телефон!'); return; }
    await supabase.from('shop_profiles').insert([{phone:edit.newDriverPhone, role:'driver', shop_id:shop.id}]);
    setEditShopData({...editShopData, [shop.id]: {...edit, newDriverPhone:''}});
    await loadShops();
  };
  const removeProfile = async (profileId:string)=>{ await supabase.from('shop_profiles').delete().eq('id', profileId); await loadShops(); };
  const addProductWithImage = async ()=>{
    if(!myShopProfile?.shop_id){ alert('Нямаш магазин!'); return; }
    if(myShopProfile.role!=='shop_owner'){ alert('Само собственика може да сменя цени!'); return; }
    if(!newProdName.trim() || !newProdPrice.trim()){ alert('Име и цена €!'); return; }
    const cleanedPrice = newProdPrice.replace(',', '.').replace(/[^\d.]/g, '');
    const priceNum = parseFloat(cleanedPrice);
    if(isNaN(priceNum) || priceNum<=0){ alert('Грешна цена!'); return; }
    let imageUrl = editingProduct?.image_url || null;
    if(newProdFile){
      const fileName = `${myShopProfile.shop_id}_${Date.now()}_${newProdFile.name}`;
      const {error:upErr}=await supabase.storage.from('product-images').upload(fileName, newProdFile);
      if(upErr){ alert(upErr.message); return; }
      const {data:urlData}=supabase.storage.from('product-images').getPublicUrl(fileName);
      imageUrl = urlData.publicUrl;
    }
    if(editingProduct){
      await supabase.from('products').update({name:newProdName.trim(), price:priceNum, description:newProdDesc.trim(), image_url:imageUrl}).eq('id', editingProduct.id);
    } else {
      await supabase.from('products').insert({shop_id:myShopProfile.shop_id, name:newProdName.trim(), price:priceNum, description:newProdDesc.trim(), image_url:imageUrl, active:true});
    }
    setNewProdName(''); setNewProdPrice(''); setNewProdDesc(''); setNewProdFile(null); setEditingProduct(null);
    await loadMyShopProfile();
  };
  const startEditProduct = (p:any)=>{ 
    if(myShopProfile?.role!=='shop_owner'){ alert('Само собственика!'); return; }
    setEditingProduct(p); setNewProdName(p.name); setNewProdPrice(p.price.toString()); setNewProdDesc(p.description||''); window.scrollTo({top:0, behavior:'smooth'}); 
  };
  const cancelEditProduct = ()=>{ setEditingProduct(null); setNewProdName(''); setNewProdPrice(''); setNewProdDesc(''); setNewProdFile(null); };
  const deleteProduct = async (id:string)=>{ 
    if(myShopProfile?.role!=='shop_owner'){ alert('Само собственика!'); return; }
    if(!confirm('Изтрий?')) return; 
    await supabase.from('products').delete().eq('id',id); 
    setMyShopProducts(myShopProducts.filter(p=>p.id!==id)); 
  };
  const loadMarketProducts = async (shopId:string)=>{ const {data}=await supabase.from('products').select('*').eq('shop_id', shopId).eq('active', true); if(data) setMarketProducts(data); setSelectedMarketShop(marketShops.find(s=>s.id===shopId)); };
  const placeOrder = async ()=>{
    if(!selectedMarketShop || cart.length===0 ||!customerAddr){ alert('Адрес и количка!'); return; }
    const total = cart.reduce((sum:any,i:any)=>sum+parseFloat(i.price),0) + parseFloat(selectedMarketShop.delivery_fee||4.99);
    await supabase.from('orders').insert({shop_id:selectedMarketShop.id, customer_phone:currentUser.phone, customer_name:`${currentUser.firstName} ${currentUser.lastName}`, address:customerAddr, items:cart, total, status:'new'});
    alert('Поръчка изпратена!'); setCart([]); setCustomerAddr('');
  };
  const updateOrderStatus = async (orderId:string, status:string)=>{ await supabase.from('orders').update({status}).eq('id',orderId); await loadMyShopProfile(); };

  useEffect(()=>{ const savedLang = localStorage.getItem('vozime_lang') as 'bg'|'en'; if(savedLang) setLang(savedLang); const cu=localStorage.getItem('vozime_current'); if(cu) setCurrentUser(JSON.parse(cu)); syncCurrentUser(); loadRides(); loadMaintenance(); loadBans(); loadReports(); loadShops(); fetchLocation(); const interval = setInterval(()=>{ loadMaintenance(); loadBans(); loadReports(); loadRides(); loadShops(); syncCurrentUser(); if(isAdminPhone(JSON.parse(localStorage.getItem('vozime_current')||'{}').phone||'')) loadAllUsers(); }, 5000); return ()=> clearInterval(interval); },[]);
  useEffect(()=>{ if(currentUser && isAdmin) loadAllUsers(); if(currentUser) loadMyShopProfile(); },[currentUser]);
  useEffect(()=>{ localStorage.setItem('vozime_lang', lang); },[lang]);
  const handleAuth = async ()=>{
    if(!loginForm.firstName ||!loginForm.lastName ||!loginForm.phone){ alert(lang==='bg'?'Попълни всички полета':'Fill all fields'); return; }
    const cleanPhoneVal = loginForm.phone.replace(/[^0-9]/g,'').slice(-10);
    const countryCode = getCountryByPhone(loginForm.phone);
    if(loginTab==='register'){
      const {data:existing} = await supabase.from('users').select('*').eq('clean_phone', cleanPhoneVal).maybeSingle();
      if(existing){
        if(existing.deleted_at){ await supabase.from('users').update({deleted_at:null, first_name:loginForm.firstName.trim(), last_name:loginForm.lastName.trim(), phone:loginForm.phone.trim()}).eq('id',existing.id); const appUser = {id:existing.id, firstName:loginForm.firstName.trim(), lastName:loginForm.lastName.trim(), phone:loginForm.phone.trim(), is_verified:existing.is_verified, verification_photo_url:existing.verification_photo_url}; localStorage.setItem('vozime_current', JSON.stringify(appUser)); setCurrentUser(appUser); return; }
        alert(lang==='bg'?'Вече съществува! Влез.':'Already exists! Login.'); setLoginTab('login'); return;
      }
      const {data:inserted, error} = await supabase.from('users').insert({ first_name: loginForm.firstName.trim(), last_name: loginForm.lastName.trim(), phone: loginForm.phone.trim(), clean_phone: cleanPhoneVal, country_code: countryCode, is_verified: false, deleted_at: null }).select().single();
      if(error){ alert(error.message); return; }
      const appUser = {id:inserted.id, firstName:inserted.first_name, lastName:inserted.last_name, phone:inserted.phone, is_verified:false, country_code:countryCode};
      localStorage.setItem('vozime_current', JSON.stringify(appUser)); setCurrentUser(appUser);
    } else {
      const {data:found} = await supabase.from('users').select('*').eq('clean_phone', cleanPhoneVal).maybeSingle();
      if(!found){ alert(lang==='bg'?'Няма акаунт! Регистрирай се.':'No account! Register.'); setLoginTab('register'); return; }
      if(found.deleted_at && (Date.now() - Number(found.deleted_at) > 6*30*24*60*60*1000)){ alert(lang==='bg'?'Акаунтът е изтрит преди повече от 6 месеца. Регистрирай се наново.':'Account deleted over 6 months ago. Register again.'); await supabase.from('users').delete().eq('id',found.id); setLoginTab('register'); return; }
      if(found.deleted_at){ await supabase.from('users').update({deleted_at:null}).eq('id',found.id); }
      const appUser = {id:found.id, firstName:found.first_name, lastName:found.last_name, phone:found.phone, is_verified:found.is_verified, verification_photo_url:found.verification_photo_url, country_code:found.country_code, verified_at:found.verified_at};
      localStorage.setItem('vozime_current', JSON.stringify(appUser)); setCurrentUser(appUser);
    }
  };
  const handleVerificationUpload = async ()=>{
    if(!verifyFile ||!currentUser) return;
    setUploadingVerify(true);
    try{
      const fileName = `${currentUser.id}_${Date.now()}.jpg`;
      const {error:upErr} = await supabase.storage.from('verifications').upload(fileName, verifyFile);
      if(upErr) throw upErr;
      const {data:urlData} = supabase.storage.from('verifications').getPublicUrl(fileName);
      await supabase.from('users').update({verification_photo_url:urlData.publicUrl, is_verified:false, verification_status:'pending'}).eq('id',currentUser.id);
      alert(t.photoSent); setVerifyFile(null);
      await syncCurrentUser();
    }catch(e:any){ alert(e.message); } finally{ setUploadingVerify(false); }
  }
  const handleDeleteAccount = async ()=>{
    if(!confirm(lang==='bg'?'Сигурен ли си? Акаунтът ще се пази 6 месеца за сигурност и после ще се изтрие завинаги.':'Are you sure? Account will be kept 6 months for safety then deleted forever.')) return;
    try{ await supabase.from('users').update({deleted_at: Date.now()}).eq('id', currentUser.id); }catch{}
    localStorage.removeItem('vozime_current'); setCurrentUser(null);
  };
  const logout=()=>{localStorage.removeItem('vozime_current');setCurrentUser(null); setTab('find'); setStaticPage(null);};
  const isBanned = (phone:string)=>{ const now=Date.now(); return bans.find(b=> b.phone===clean(phone) && (b.until==='forever' || Number(b.until)>now)); };
  const currentBanned = currentUser? isBanned(currentUser.phone) : null;
  const carFilled = offerForm.carBrand.trim() && offerForm.carColor.trim() && offerForm.carReg.trim();
  const seatsFilled = offerForm.seats.trim() && parseInt(offerForm.seats)>0;
  const isVerified = currentUser?.is_verified || isAdmin;
  const canPublish = offerForm.from.trim() && offerForm.to.trim() && seatsFilled && (offerForm.type==='request' || (carFilled && offerForm.isDriver)) &&!currentBanned && isVerified;
  const toggleMaintenance = async ()=>{ const ne=!maintenance.enabled; try{ await callAdmin('maintenance',{enabled:ne, msg:maintenance.msg}); setMaintenance({...maintenance,enabled:ne}); }catch(e:any){ alert(e.message); } };
  const updateMaintenanceMsg = async (msg:string)=>{ setMaintenance({...maintenance,msg}); try{ await callAdmin('maintenance',{enabled:maintenance.enabled, msg}); }catch{} };
  const publishRide= async ()=>{
    if(!isVerified){ alert(t.needVerify); setTab('my'); return; }
    if(currentBanned){ alert(`${t.banned}: ${currentBanned.reason}`); return; }
    if(!canPublish){alert(lang==='bg'?'Попълни всички * и трябва да си верифициран!':'Fill all * and you must be verified!');return;}
    const id = editingRide||Date.now().toString();
    const existingCreated = editingRide? (rides.find(r=>r.id===editingRide)?.createdAt || Date.now()) : Date.now();
    const row:any = {id, driver_name:`${currentUser.firstName} ${currentUser.lastName}`, driver_phone:currentUser.phone, driver_id:currentUser.id, from_city:offerForm.from, to_city:offerForm.to, time:offerForm.time, return_time:offerForm.returnTime, date:lang==='bg'?'Днес':'Today', seats:parseInt(offerForm.seats)||1, message:offerForm.message, created_at:existingCreated, type:offerForm.type, is_driver:offerForm.isDriver, car_brand:offerForm.carBrand, car_color:offerForm.carColor, car_reg:offerForm.carReg.toUpperCase(), car_info:`${offerForm.carBrand} ${offerForm.carColor} ${offerForm.carReg.toUpperCase()}`, from_country:offerForm.fromCountry, to_country:offerForm.toCountry};
    try{ if(editingRide){ await callAdmin('update_ride',{ride_id:editingRide, newData:row}); } else { await supabase.from('rides').insert(row); } setEditingRide(null); await loadRides(); setTab('find'); }catch(e:any){ alert('Грешка: '+e.message); }
  };
  const deleteRide = async (id:string)=>{
    try{
      const ride = rides.find(r=>r.id===id);
      const isOwner = ride && (ride.driverId===currentUser.id || ride.driverPhone===currentUser.phone || clean(ride.driverPhone)===clean(currentUser.phone));
      if(isOwner || isAdmin){
        if(isOwner){ const {error} = await supabase.from('rides').delete().eq('id', id); if(error) throw error; } else { await callAdmin('delete_ride',{ride_id:id}); }
      } else { alert(lang==='bg'?'Нямаш право!':'No permission!'); return; }
      await loadRides();
    }catch(e:any){ alert(e.message); }
  }
  const approveUser = async (uid:string)=>{
    await supabase.from('users').update({is_verified:true, verification_status:'verified', verified_at: Date.now()}).eq('id',uid);
    await loadAllUsers();
    if(uid===currentUser?.id){ await syncCurrentUser(); }
  }
  const getFlag = (c:string)=>COUNTRIES.find(x=>x.code===c)?.name.split(' ')[0]||'🏳️';
  const cleanPhone = (p:string)=> p.replace(/[^0-9+]/g,''); const waPhone = (p:string)=> p.replace(/[^0-9]/g,'');
  const handleReport = async (ride:any)=>{
    const reason = prompt(lang==='bg'?'Причина:':'Reason:'); if(!reason) return;
    const newReport = {id:Date.now().toString(), ride_id:ride.id, reported_phone:ride.driverPhone, reported_name:ride.driverName, from_city:ride.from, to_city:ride.to, reason, reporter_phone:currentUser?.phone||'anon', reporter_name:currentUser?`${currentUser.firstName} ${currentUser.lastName}`:'Anon', created_at:Date.now(), status:'open'};
    await supabase.from('reports').insert(newReport);
    setReports([ {...newReport, reportedPhone:newReport.reported_phone, reportedName:newReport.reported_name, from:newReport.from_city, to:newReport.to_city, reporterPhone:newReport.reporter_phone, reporterName:newReport.reporter_name, createdAt:newReport.created_at} as any,...reports]); alert(lang==='bg'?'Доклад изпратен!':'Report sent!');
  };
  const handleBan = async (phone:string, reason:string, duration:string)=>{ try{ await callAdmin('ban',{original_phone:phone, reason, duration}); await loadBans(); setBanPhoneInput(''); setBanReasonInput(''); }catch(e:any){ alert(e.message); } };
  const unban = async (id:string)=>{ try{ await callAdmin('unban',{ban_id:id}); setBans(bans.filter(b=>b.id!==id)); }catch(e:any){ alert(e.message); } };
  const dismissReport = async (id:string)=>{ try{ await callAdmin('dismiss_report',{report_id:id, status:'dismissed'}); setReports(reports.filter(r=>r.id!==id)); }catch(e:any){ alert(e.message); } };
  const banFromReport = async (rep:any, dur:string)=>{ await handleBan(rep.reportedPhone||rep.reported_phone, `Репорт: ${rep.reason}`, dur); try{ await callAdmin('dismiss_report',{report_id:rep.id, status:'banned'}); setReports(reports.filter(r=>r.id!==rep.id)); }catch{} };
  const filteredRides = rides.filter(r=>{ if(filterText &&!(r.from.toLowerCase().includes(filterText.toLowerCase())||r.to.toLowerCase().includes(filterText.toLowerCase()))) return false; if(filterType && r.type!==filterType) return false; return true;});
  const filteredUsers = allUsers.filter(u=>{ if(!userSearch) return true; const s = userSearch.toLowerCase(); return (u.first_name?.toLowerCase().includes(s) || u.last_name?.toLowerCase().includes(s) || u.phone?.includes(s) || u.clean_phone?.includes(s)); }).sort((a,b)=>{ const ca = a.country_code||getCountryByPhone(a.phone||''); const cb = b.country_code||getCountryByPhone(b.phone||''); if(ca!==cb) return ca.localeCompare(cb); return (a.first_name||'').localeCompare(b.first_name||''); })

  if(maintenance.enabled &&!isAdmin){ return (<main style={{height:'100dvh',display:'flex',alignItems:'center',justifyContent:'center',background:'#0F4C75',color:'white',padding:'20px',textAlign:'center'}}><div><div style={{fontSize:'60px'}}>🔧</div><div style={{fontSize:'24px',fontWeight:'bold',marginTop:'10px'}}>{t.maintenanceTitle}</div><div style={{fontSize:'14px',marginTop:'10px'}}>{maintenance.msg||t.maintenanceMsg}</div></div></main>); }
  if(!currentUser){
    return (
      <main style={{position:'fixed',inset:0,display:'flex',alignItems:'center',justifyContent:'center',background:'#0F4C75',padding:'16px',boxSizing:'border-box'}}>
        <div style={{background:'white',padding:'20px',borderRadius:'24px',width:'100%',maxWidth:'380px',boxSizing:'border-box'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><div style={{fontWeight:'800',fontSize:'22px',color:'#16486B'}}>🌍 VoziMe.bg</div><div style={{display:'flex',background:'#f1f3f4',borderRadius:'12px',padding:'2px',gap:'2px'}}><button onClick={()=>setLang('bg')} style={{background:lang==='bg'?'white':'transparent',color:lang==='bg'?'#0F4C75':'#666',border:'none',padding:'6px 10px',borderRadius:'8px',fontWeight:'bold',fontSize:'12px'}}>🇧🇬 BG</button><button onClick={()=>setLang('en')} style={{background:lang==='en'?'white':'transparent',color:lang==='en'?'#0F4C75':'#666',border:'none',padding:'6px 10px',borderRadius:'8px',fontWeight:'bold',fontSize:'12px'}}>🇬🇧 EN</button></div></div>
          <div style={{textAlign:'center',fontSize:'13px',color:'#666',marginTop:'8px',marginBottom:'14px'}}>{t.loginSub}</div>
          <div style={{display:'flex',background:'#f1f3f4',borderRadius:'12px',padding:'3px',marginBottom:'16px'}}><button onClick={()=>setLoginTab('login')} style={{flex:1,padding:'10px',borderRadius:'8px',border:'none',fontWeight:'bold',background:loginTab==='login'?'#0F4C75':'white',color:loginTab==='login'?'white':'#666'}}>{t.tabLogin}</button><button onClick={()=>setLoginTab('register')} style={{flex:1,padding:'10px',borderRadius:'8px',border:'none',fontWeight:'bold',background:loginTab==='register'?'#0F4C75':'white',color:loginTab==='register'?'white':'#666'}}>{t.tabReg}</button></div>
          <input placeholder={t.firstName} value={loginForm.firstName} onChange={e=>setLoginForm({...loginForm,firstName:e.target.value})} style={{width:'100%',padding:'14px 16px',borderRadius:'12px',border:'1px solid #e5e7eb',background:'#f9fafb',boxSizing:'border-box',marginBottom:'10px'}}/>
          <input placeholder={t.lastName} value={loginForm.lastName} onChange={e=>setLoginForm({...loginForm,lastName:e.target.value})} style={{width:'100%',padding:'14px 16px',borderRadius:'12px',border:'1px solid #e5e7eb',background:'#f9fafb',boxSizing:'border-box',marginBottom:'10px'}}/>
          <input placeholder={t.phone} value={loginForm.phone} onChange={e=>setLoginForm({...loginForm,phone:e.target.value})} style={{width:'100%',padding:'14px 16px',borderRadius:'12px',border:'1px solid #e5e7eb',background:'#f9fafb',boxSizing:'border-box',marginBottom:'16px'}}/>
          <button onClick={handleAuth} style={{width:'100%',padding:'16px',background:'#3DD68C',border:'none',borderRadius:'14px',fontWeight:'bold',color:'#0F62FE',fontSize:'15px'}}>{loginTab==='login'?t.loginBtn:t.regBtn}</button>
          <div style={{fontSize:'10px',color:'#666',marginTop:'10px',textAlign:'center'}}>{t.agreementConsent}</div>
        </div>
      </main>
    );
  }
  if(staticPage){
    const content = STATIC_CONTENT[lang][staticPage];
    return (
      <main style={{height:'100dvh',width:'100%',maxWidth:'480px',margin:'0 auto',background:'white',display:'flex',flexDirection:'column',fontFamily:'-apple-system, sans-serif'}}>
        <header style={{height:'56px',background:'#0F4C75',color:'white',display:'flex',alignItems:'center',padding:'0 12px',gap:'10px'}}><button onClick={()=>setStaticPage(null)} style={{background:'white',color:'#0F4C75',border:'none',padding:'8px 14px',borderRadius:'8px',fontWeight:'bold'}}>{t.back}</button><div style={{fontWeight:'bold'}}>{t[staticPage]}</div></header>
        <div style={{flex:1,overflowY:'auto',padding:'16px',fontSize:'13px',lineHeight:'1.6',whiteSpace:'pre-wrap'}}>{content}</div>
        <div style={{padding:'10px',borderTop:'1px solid #eee',textAlign:'center',fontSize:'11px'}}>Contact: dropoffpay.co.uk@gmail.com • www.dropoffpay.co.uk</div>
      </main>
    )
  }
  return (
    <main style={{height:'100dvh',width:'100%',maxWidth:'480px',margin:'0 auto',background:'white',display:'flex',flexDirection:'column',overflow:'hidden',fontFamily:'-apple-system, sans-serif'}}>
      <div style={{flexShrink:0}}>
        <div style={{background:maintenance.enabled?'#FF3B30':'#0F4C75',color:'white',padding:'6px',textAlign:'center',fontSize:'10px'}}>{maintenance.enabled?'🔴 MAINTENANCE - Сайтът е спрян!':'🌍 VoziMe • Част от DropOffPay.co.uk • Сигурна ✅'}</div>
        <header style={{height:'56px',minHeight:'56px',background:'#0F4C75',color:'white',display:'flex',alignItems:'center',padding:'0 8px',gap:'6px'}}>
          <div style={{width:'32px',height:'32px',background:isAdmin?'#FFD60A':'#2ECC71',borderRadius:'8px',display:'flex',alignItems:'center',justifyContent:'center'}}>{isAdmin?'👑':'🌍'}</div>
          <div style={{flex:1,overflow:'hidden'}}>{myLocation? <><div style={{fontWeight:'bold',fontSize:'13px'}}>{getFlag(myLocation.country)} {myLocation.city} {isAdmin&&'👑'} {currentUser.is_verified&&'✅'}</div><div style={{fontSize:'9px',opacity:0.9}}>{t.siteFree} • {t.sharedCosts}</div></> : <><div style={{fontWeight:'bold',fontSize:'12px'}}>🌍 VoziMe {isAdmin&&'👑 ADMIN'} {currentUser.is_verified&&'✅'}</div><div style={{fontSize:'9px',opacity:0.9}}>{t.siteFree}</div></>}</div>
          <div style={{display:'flex',background:'rgba(255,255,255,0.15)',borderRadius:'12px',padding:'2px',gap:'2px'}}><button onClick={()=>setLang('bg')} style={{background:lang==='bg'?'white':'transparent',color:lang==='bg'?'#0F4C75':'white',border:'none',padding:'4px 8px',borderRadius:'8px',fontWeight:'bold',fontSize:'11px'}}>🇧🇬</button><button onClick={()=>setLang('en')} style={{background:lang==='en'?'white':'transparent',color:lang==='en'?'#0F4C75':'white',border:'none',padding:'4px 8px',borderRadius:'8px',fontWeight:'bold',fontSize:'11px'}}>🇬🇧</button></div>
          {locDenied && <button onClick={()=>fetchLocation()} style={{fontSize:'9px',background:'#2ECC71',border:'none',color:'#0F4C75',padding:'5px 8px',borderRadius:'12px',fontWeight:'bold'}}>{t.enableLoc}</button>}
          <button onClick={logout} style={{fontSize:'10px',background:'#FF3B30',border:'none',color:'white',padding:'5px 10px',borderRadius:'12px',fontWeight:'bold'}}>{t.exit}</button>
        </header>
        <div style={{height:'52px',display:'flex',gap:'4px',padding:'6px',background:'#f1f3f4'}}>
          <button onClick={()=>setTab('find')} style={{flex:1,borderRadius:'10px',border:'none',fontWeight:'bold',background:tab==='find'?'#0F4C75':'white',color:tab==='find'?'white':'#666',fontSize:'11px'}}>{t.find} ({filteredRides.length})</button>
          <button onClick={()=>setTab('market')} style={{flex:1,borderRadius:'10px',border:'none',fontWeight:'bold',background:tab==='market'?'#22c55e':'white',color:tab==='market'?'white':'#666',fontSize:'10px'}}>🛒 Пазар</button>
          <button onClick={()=>setTab('my')} style={{flex:1,borderRadius:'10px',border:'none',fontWeight:'bold',background:tab==='my'?'#0F4C75':'white',color:tab==='my'?'white':'#666',fontSize:'11px'}}>{t.my}</button>
          <button onClick={()=>setTab('offer')} style={{flex:1,borderRadius:'10px',border:'none',fontWeight:'bold',background:tab==='offer'?'#2ECC71':'white',color:tab==='offer'?'#0F4C75':'#666',fontSize:'11px'}}>{t.offer}</button>
          {isAdmin && <button onClick={()=>setTab('shops')} style={{flex:1,borderRadius:'10px',border:'none',fontWeight:'bold',background:tab==='shops'?'#22c55e':'#22c55e',color:'white',fontSize:'9px'}}>👑 Магазини</button>}
          {isAdmin && <button onClick={()=>setTab('admin')} style={{flex:1,borderRadius:'10px',border:'none',fontWeight:'bold',background:tab==='admin'?'#FFD60A':'#FF3B30',color:tab==='admin'?'black':'white',fontSize:'11px'}}>{t.admin} ({reports.length}/{bans.length})</button>}
        </div>
      </div>
      {currentUser && isBanned(currentUser.phone) && <div style={{background:'#FF3B30',color:'white',padding:'10px',textAlign:'center',fontSize:'12px',fontWeight:'bold',flexShrink:0}}>⛔ {t.banned}: {isBanned(currentUser.phone)?.reason}</div>}
      {!isVerified && <div style={{background:'#FFD60A',color:'black',padding:'8px',textAlign:'center',fontSize:'11px',fontWeight:'bold',flexShrink:0}}>{t.needVerify} - <button onClick={syncCurrentUser} style={{background:'black',color:'white',border:'none',padding:'2px 8px',borderRadius:'6px',marginLeft:'6px'}}>{t.refresh}</button></div>}
      {tab==='find' && (<div style={{flexShrink:0,background:'white',padding:'8px 10px',borderBottom:'1px solid #e5e7eb',display:'flex',flexDirection:'column',gap:'8px'}}><div style={{background:'#e3f2fd',padding:'10px',borderRadius:'12px',border:'1px solid #90caf9'}}><div style={{fontSize:'11px',fontWeight:'800',color:'#0F4C75'}}>{t.important}</div><div style={{fontSize:'11px',marginTop:'4px'}}><b>{t.important1}</b> {t.important1b}<br/><b>{t.important2}</b> {t.important2b}</div></div><div style={{display:'flex',gap:'6px'}}><button onClick={()=>setFilterType('')} style={{flex:1,padding:'8px',borderRadius:'8px',border:'none',fontWeight:'bold',fontSize:'11px',background:filterType===''?'#0F4C75':'white',color:filterType===''?'white':'#666'}}>{t.all}</button><button onClick={()=>setFilterType('offer')} style={{flex:1,padding:'8px',borderRadius:'8px',border:'none',fontWeight:'bold',fontSize:'10px',background:filterType==='offer'?'#2ECC71':'white'}}>🚗 {t.drivers}</button><button onClick={()=>setFilterType('request')} style={{flex:1,padding:'8px',borderRadius:'8px',border:'none',fontWeight:'bold',fontSize:'10px',background:filterType==='request'?'#FFD60A':'white'}}>🙋 {t.passengers}</button></div><input placeholder={t.search} value={filterText} onChange={e=>setFilterText(e.target.value)} style={{padding:'10px',borderRadius:'10px',border:'1px solid #ddd',fontSize:'13px',width:'100%'}}/></div>)}
      <div style={{flex:1,overflowY:'auto',background:'#f9fafb'}} ref={ridesContainerRef}>
        {tab==='find' && (<div style={{padding:'10px',display:'flex',flexDirection:'column',gap:'10px'}}>{filteredRides.map((r:any)=>{ const banned = isBanned(r.driverPhone); const isReq = r.type==='request'; return (<div key={r.id} style={{border: banned?'2px solid #FF3B30':isReq?'2px solid #FFD60A':'2px solid #2ECC71',borderRadius:'14px',padding:'12px',background: banned?'#ffeaea':isReq?'#fffbe6':'#f0fdf4',opacity:banned?0.6:1}}>{banned && <div style={{background:'#FF3B30',color:'white',fontSize:'10px',padding:'4px 8px',borderRadius:'6px',marginBottom:'6px',fontWeight:'bold'}}>⛔ БАННАТ: {banned.reason}</div>}<div style={{display:'flex',justifyContent:'space-between'}}><b style={{fontSize:'14px'}}>{getFlag(r.fromCountry)} {r.from} → {getFlag(r.toCountry)} {r.to}</b><span style={{background:isReq?'#FFD60A':'#2ECC71',color:isReq?'black':'white',fontSize:'9px',padding:'3px 8px',borderRadius:'12px',fontWeight:'bold'}}>{isReq?`🙋 ${t.seeks}`:`🚗 ${t.offers}`}</span></div><div style={{fontSize:'11px',marginTop:'4px'}}>{r.driverName} • {r.seats} {t.seatsPlace} • {r.carInfo} • {r.time} {r.driverId && allUsers.find(u=>u.id===r.driverId)?.is_verified && '✅'}</div><div style={{fontSize:'10px',background:'#fff3cd',padding:'6px 8px',borderRadius:'8px',marginTop:'6px',border:'1px solid #ffe69c'}}>{t.notFree}</div>{r.message && <div style={{fontSize:'11px',marginTop:'6px',background:'white',padding:'6px',borderRadius:'6px'}}>💬 {r.message}</div>}<div style={{marginTop:'10px',background:'white',borderRadius:'10px',padding:'8px',border:'1px solid #ddd'}}><div style={{fontSize:'10px',fontWeight:'bold',color:'#0F4C75',marginBottom:'6px'}}>{t.connectDirect}</div><div style={{fontSize:'12px',fontWeight:'bold',marginBottom:'8px'}}>{r.driverName} • {r.driverPhone}</div><div style={{display:'flex',gap:'5px',marginBottom:'6px'}}><a href={`tel:${cleanPhone(r.driverPhone)}`} style={{flex:1,background:'#0F4C75',color:'white',padding:'10px',borderRadius:'8px',textAlign:'center',fontWeight:'bold',textDecoration:'none',fontSize:'11px'}}>{t.call}</a><a href={`https://wa.me/${waPhone(r.driverPhone)}`} target="_blank" style={{flex:1,background:'#25D366',color:'white',padding:'10px',borderRadius:'8px',textAlign:'center',fontWeight:'bold',textDecoration:'none',fontSize:'11px'}}>WhatsApp</a><a href={`viber://chat?number=${encodeURIComponent(cleanPhone(r.driverPhone))}`} style={{flex:1,background:'#7360F2',color:'white',padding:'10px',borderRadius:'8px',textAlign:'center',fontWeight:'bold',textDecoration:'none',fontSize:'11px'}}>Viber</a></div><div style={{display:'flex',gap:'5px'}}><button onClick={()=>handleReport(r)} style={{flex:1,background:'#fff3cd',border:'1px solid #ffe69c',padding:'6px',borderRadius:'6px',fontSize:'10px',fontWeight:'bold'}}>{t.report}</button>{isAdmin && <button onClick={()=>deleteRide(r.id)} style={{background:'#FF3B30',color:'white',border:'none',padding:'6px 12px',borderRadius:'6px',fontSize:'10px'}}>🗑️</button>}{isAdmin && <button onClick={()=>{const reason=prompt(lang==='bg'?'Причина:':'Reason:'); if(reason) handleBan(r.driverPhone, reason, '24h');}} style={{background:'black',color:'white',border:'none',padding:'6px 12px',borderRadius:'6px',fontSize:'10px'}}>⛔ BAN</button>}</div></div></div>)})}</div>)}
        {tab==='admin' && isAdmin && (<div style={{padding:'10px',display:'flex',flexDirection:'column',gap:'12px'}}><div style={{background:'#0F4C75',color:'white',padding:'12px',borderRadius:'12px'}}><div style={{fontWeight:'bold',fontSize:'14px'}}>👑 ADMIN • DropOffPay.co.uk</div><div style={{fontSize:'11px',opacity:0.8}}>All users kept 6 months • Verification required</div><button onClick={syncCurrentUser} style={{marginTop:'8px',background:'#2ECC71',border:'none',padding:'6px 12px',borderRadius:'8px',fontSize:'11px',fontWeight:'bold'}}>{t.refresh}</button></div><div style={{background:'white',border:'2px solid #2ECC71',borderRadius:'12px',padding:'12px'}}><div style={{fontWeight:'bold',fontSize:'13px'}}>👥 ALL USERS - {filteredUsers.length} (sorted by country + name)</div><input placeholder={lang==='bg'?'Търси по телефон или име...':'Search by phone or name...'} value={userSearch} onChange={e=>setUserSearch(e.target.value)} style={{width:'100%',marginTop:'8px',padding:'10px',borderRadius:'8px',border:'1px solid #ddd',fontSize:'12px'}}/><div style={{marginTop:'10px',display:'flex',flexDirection:'column',gap:'6px',maxHeight:'400px',overflowY:'auto'}}>{filteredUsers.map(u=>{ const country = u.country_code||getCountryByPhone(u.phone||''); const isDeleted =!!u.deleted_at; const deletedAgo = isDeleted? Math.floor((Date.now()-Number(u.deleted_at))/(24*60*60*1000)) : 0; return (<div key={u.id} style={{background:isDeleted?'#ffeaea':u.is_verified?'#e6f9ed':'#fffbe6',border:`1px solid ${isDeleted?'#FF3B30':u.is_verified?'#2ECC71':'#FFD60A'}`,padding:'8px',borderRadius:'8px'}}><div style={{display:'flex',justifyContent:'space-between'}}><div style={{fontWeight:'bold',fontSize:'12px'}}>{getFlag(country)} {country} • {u.first_name} {u.last_name} {u.is_verified?'✅':''} {isDeleted&&`🔴 DELETED ${deletedAgo}d ago`}</div><div style={{fontSize:'10px'}}>{u.phone}</div></div><div style={{fontSize:'10px',marginTop:'2px'}}>ID: {u.id.slice(0,8)}... • {u.clean_phone} • Reg: {new Date(u.created_at||Date.now()).toLocaleDateString()} {isDeleted && `• Deleted: ${new Date(Number(u.deleted_at)).toLocaleString()}`}</div>{u.verification_photo_url && <div style={{marginTop:'4px',display:'flex',gap:'6px'}}><a href={u.verification_photo_url} target="_blank" style={{fontSize:'10px',background:'#0F4C75',color:'white',padding:'4px 8px',borderRadius:'6px',textDecoration:'none'}}>📸 View photo</a>{!u.is_verified && <button onClick={()=>approveUser(u.id)} style={{fontSize:'10px',background:'#2ECC71',border:'none',padding:'4px 8px',borderRadius:'6px',fontWeight:'bold'}}>✅ Approve</button>}</div>}</div>)})}</div></div><div style={{background:'white',border:'2px solid #FF3B30',borderRadius:'12px',padding:'12px'}}><div style={{fontWeight:'bold',fontSize:'13px',color:'#FF3B30'}}>🔧 STOP SITE</div><div style={{display:'flex',gap:'8px',marginTop:'10px',alignItems:'center'}}><button onClick={toggleMaintenance} style={{background:maintenance.enabled?'#2ECC71':'#FF3B30',color:'white',border:'none',padding:'10px 16px',borderRadius:'8px',fontWeight:'bold',fontSize:'12px'}}>{maintenance.enabled?'✅ STOPPED - START':'🔴 STOP SITE NOW'}</button><span style={{fontSize:'11px',fontWeight:'bold',color:maintenance.enabled?'#FF3B30':'#2ECC71'}}>{maintenance.enabled?'🔴 STOPPED':'🟢 Running'}</span></div><input placeholder={lang==='bg'?'Съобщение...':'Message...'} value={maintenance.msg} onChange={e=>updateMaintenanceMsg(e.target.value)} style={{width:'100%',marginTop:'8px',padding:'8px',borderRadius:'8px',border:'1px solid #ddd',fontSize:'11px'}}/></div><div style={{background:'white',border:'2px solid black',borderRadius:'12px',padding:'12px'}}><div style={{fontWeight:'bold',fontSize:'13px'}}>⛔ BAN - {bans.length}</div><div style={{display:'flex',gap:'6px',marginTop:'8px'}}><input placeholder="Phone" value={banPhoneInput} onChange={e=>setBanPhoneInput(e.target.value)} style={{flex:1,padding:'8px',borderRadius:'8px',border:'1px solid #ddd',fontSize:'11px'}}/><select value={banDuration} onChange={e=>setBanDuration(e.target.value)} style={{padding:'8px',borderRadius:'8px',border:'1px solid #ddd',fontSize:'11px'}}><option value="1h">1h</option><option value="24h">24h</option><option value="7d">7d</option><option value="forever">Forever</option></select></div><input placeholder={lang==='bg'?'Причина':'Reason'} value={banReasonInput} onChange={e=>setBanReasonInput(e.target.value)} style={{width:'100%',marginTop:'6px',padding:'8px',borderRadius:'8px',border:'1px solid #ddd',fontSize:'11px'}}/><button onClick={()=>{if(!banPhoneInput) return; handleBan(banPhoneInput, banReasonInput||'Bad', banDuration);}} style={{width:'100%',marginTop:'6px',background:'black',color:'white',padding:'10px',borderRadius:'8px',fontWeight:'bold',border:'none'}}>⛔ BAN GLOBALLY</button><div style={{marginTop:'10px',display:'flex',flexDirection:'column',gap:'6px',maxHeight:'200px',overflowY:'auto'}}>{bans.map(b=><div key={b.id} style={{background:'#ffeaea',padding:'8px',borderRadius:'8px',display:'flex',justifyContent:'space-between'}}><div><div style={{fontWeight:'bold',fontSize:'11px'}}>{b.originalPhone||b.original_phone} ({b.phone})</div><div style={{fontSize:'10px'}}>{b.reason} • {b.until==='forever'?'forever':new Date(Number(b.until)).toLocaleString()}</div></div><button onClick={()=>unban(b.id)} style={{background:'#2ECC71',border:'none',padding:'6px 10px',borderRadius:'6px',fontSize:'10px'}}>UNBAN</button></div>)}</div></div><div style={{background:'white',border:'2px solid #FFD60A',borderRadius:'12px',padding:'12px'}}><div style={{fontWeight:'bold',fontSize:'13px'}}>🚩 REPORTS - {reports.length}</div><div style={{marginTop:'10px',display:'flex',flexDirection:'column',gap:'8px',maxHeight:'400px',overflowY:'auto'}}>{reports.map(rep=><div key={rep.id} style={{background:'#fffbe6',border:'1px solid #FFD60A',padding:'10px',borderRadius:'10px'}}><div style={{fontSize:'11px',fontWeight:'bold'}}>🚩 {rep.reportedName||rep.reported_name} • {rep.reportedPhone||rep.reported_phone} • {rep.from||rep.from_city}→{rep.to||rep.to_city}</div><div style={{fontSize:'10px',marginTop:'2px'}}>{lang==='bg'?'Причина':'Reason'}: <b>{rep.reason}</b></div><div style={{fontSize:'10px',color:'#666'}}>{lang==='bg'?'От':'From'}: {rep.reporterName||rep.reporter_name} ({rep.reporterPhone||rep.reporter_phone})</div><div style={{display:'flex',gap:'6px',marginTop:'6px'}}><button onClick={()=>banFromReport(rep,'24h')} style={{flex:1,background:'#FF3B30',color:'white',border:'none',padding:'6px',borderRadius:'6px',fontSize:'10px',fontWeight:'bold'}}>⛔ BAN 24h</button><button onClick={()=>banFromReport(rep,'forever')} style={{flex:1,background:'black',color:'white',border:'none',padding:'6px',borderRadius:'6px',fontSize:'10px',fontWeight:'bold'}}>⛔ Forever</button><button onClick={()=>dismissReport(rep.id)} style={{padding:'6px 10px',borderRadius:'6px',border:'1px solid #ddd',background:'white',fontSize:'10px'}}>❌</button></div></div>)}{reports.length===0 && <div style={{fontSize:'11px',textAlign:'center',color:'#666'}}>{lang==='bg'?'Няма доклади':'No reports'}</div>}</div></div></div>)}
        {tab==='shops' && isAdmin && (
          <div style={{padding:'10px',display:'flex',flexDirection:'column',gap:'12px'}}>
            <div style={{background:'#22c55e',color:'white',padding:'12px',borderRadius:'12px'}}><b>👑 Админ Магазини - само ти +447935463970</b><div style={{fontSize:'11px'}}>СПРИ бутон, редакция име/такса/телефон собственик, шофьори. НЕ виждаш и НЕ редактираш цени - цените са само за собственика.</div></div>
            <div style={{background:'white',border:'2px solid #22c55e',borderRadius:'12px',padding:'12px'}}>
              <div style={{fontWeight:'bold'}}>➕ Нов магазин</div>
              <input value={shopName} onChange={e=>setShopName(e.target.value)} placeholder="Име: Месарница Иван" style={{width:'100%',padding:'10px',borderRadius:'8px',border:'1px solid #ddd',marginTop:'8px'}}/>
              <input value={ownerPhoneInput} onChange={e=>setOwnerPhoneInput(e.target.value)} placeholder="Собственик тел: +447511230086" style={{width:'100%',padding:'10px',borderRadius:'8px',border:'1px solid #ddd',marginTop:'8px'}}/>
              <input value={driverPhoneInput} onChange={e=>setDriverPhoneInput(e.target.value)} placeholder="Шофьор тел (по желание)" style={{width:'100%',padding:'10px',borderRadius:'8px',border:'1px solid #ddd',marginTop:'8px'}}/>
              <button onClick={addShop} style={{width:'100%',marginTop:'10px',padding:'12px',background:'#22c55e',color:'white',border:'none',borderRadius:'8px',fontWeight:'bold'}}>СЪЗДАЙ МАГАЗИН</button>
            </div>
            {shops.map((s:any)=>{
              const profilesForShop = shopProfiles.filter((p:any)=>p.shop_id===s.id);
              const owner = profilesForShop.find((p:any)=>p.role==='shop_owner');
              const drivers = profilesForShop.filter((p:any)=>p.role==='driver');
              const edit = editShopData[s.id] || {name:s.name, fee:(s.delivery_fee||4.99).toString(), ownerPhone:s.phone||owner?.phone||'', newDriverPhone:''};
              return (
                <div key={s.id} style={{background:'white',padding:'12px',borderRadius:'12px',border:s.vip_active===false?'3px solid red':'2px solid #22c55e'}}>
                  <div style={{display:'flex',justifyContent:'space-between'}}><div><b>{s.name}</b><div style={{fontSize:'11px'}}>Тел: {s.phone} • {s.vip_active===false?'🔴 СПРЯН':'🟢 Активен'} • {s.delivery_fee}€<br/>ID: {s.id.slice(0,8)}</div></div><div style={{display:'flex',flexDirection:'column',gap:'4px'}}><button onClick={()=>toggleShopActive(s)} style={{background:s.vip_active===false?'#22c55e':'#FF3B30',color:'white',border:'none',padding:'8px 12px',borderRadius:'8px',fontSize:'11px',fontWeight:'bold'}}>{s.vip_active===false?'✅ ПУСНИ':'⛔ СПРИ'}</button><button onClick={()=>deleteShop(s.id)} style={{background:'black',color:'white',border:'none',padding:'6px 10px',borderRadius:'8px',fontSize:'10px'}}>🗑️ Изтрий</button></div></div>
                  <div style={{marginTop:'10px',background:'#f9fafb',padding:'10px',borderRadius:'8px',border:'1px solid #e5e7eb'}}>
                    <div style={{fontWeight:'bold',fontSize:'11px'}}>✏️ Редактирай магазин (име, такса, телефон собственик):</div>
                    <input value={edit.name} onChange={e=>setEditShopData({...editShopData, [s.id]: {...edit, name:e.target.value}})} placeholder="Име" style={{width:'100%',padding:'8px',borderRadius:'6px',border:'1px solid #ddd',marginTop:'6px',fontSize:'12px'}}/>
                    <div style={{display:'flex',gap:'6px',marginTop:'6px'}}><input value={edit.fee} onChange={e=>setEditShopData({...editShopData, [s.id]: {...edit, fee:e.target.value}})} placeholder="Такса €" style={{flex:1,padding:'8px',borderRadius:'6px',border:'1px solid #ddd',fontSize:'12px'}}/><input value={edit.ownerPhone} onChange={e=>setEditShopData({...editShopData, [s.id]: {...edit, ownerPhone:e.target.value}})} placeholder="Нов тел собственик" style={{flex:1,padding:'8px',borderRadius:'6px',border:'2px solid #22c55e',fontSize:'12px'}}/></div>
                    <button onClick={()=>updateShopInfo(s)} style={{width:'100%',marginTop:'6px',padding:'10px',background:'#0F4C75',color:'white',border:'none',borderRadius:'6px',fontSize:'11px',fontWeight:'bold'}}>💾 Запази</button>
                  </div>
                  <div style={{marginTop:'10px'}}><div style={{fontWeight:'bold',fontSize:'11px'}}>👥 Профили:</div>{owner && <div style={{fontSize:'11px',background:'#e6f9ed',padding:'6px',borderRadius:'6px',marginTop:'4px',display:'flex',justifyContent:'space-between'}}><span>👑 Собственик: <b>{owner.phone}</b></span><button onClick={()=>removeProfile(owner.id)} style={{background:'#FF3B30',color:'white',border:'none',padding:'2px 6px',borderRadius:'4px',fontSize:'9px'}}>X</button></div>}{drivers.map((d:any)=><div key={d.id} style={{fontSize:'11px',background:'#e0f2fe',padding:'6px',borderRadius:'6px',marginTop:'4px',display:'flex',justifyContent:'space-between'}}><span>🚚 Шофьор: <b>{d.phone}</b></span><button onClick={()=>removeProfile(d.id)} style={{background:'#FF3B30',color:'white',border:'none',padding:'4px 8px',borderRadius:'4px',fontSize:'10px'}}>Премахни</button></div>)}<div style={{display:'flex',gap:'6px',marginTop:'8px'}}><input value={edit.newDriverPhone} onChange={e=>setEditShopData({...editShopData, [s.id]: {...edit, newDriverPhone:e.target.value}})} placeholder="Нов шофьор тел" style={{flex:1,padding:'8px',borderRadius:'6px',border:'1px solid #ddd',fontSize:'11px'}}/><button onClick={()=>addDriverToShop(s)} style={{background:'#0F4C75',color:'white',border:'none',padding:'8px 12px',borderRadius:'6px',fontSize:'11px'}}>➕ Добави шофьор</button></div></div>
                </div>
              )
            })}
          </div>
        )}
        {tab==='market' && (
          <div style={{padding:'10px',display:'flex',flexDirection:'column',gap:'10px'}}>
            {!selectedMarketShop? (
              <>
                <div style={{background:'#22c55e',color:'white',padding:'12px',borderRadius:'12px'}}><b>🛒 Пазар - Магазини</b><div style={{fontSize:'11px'}}>VoziMe 0% - доставката е при магазина.</div></div>
                {marketShops.map((s:any)=><div key={s.id} onClick={()=>loadMarketProducts(s.id)} style={{background:'white',border:'2px solid #22c55e',borderRadius:'12px',padding:'12px',cursor:'pointer'}}><b>{s.name}</b><br/><span style={{fontSize:'11px'}}>Доставка {s.delivery_fee}€</span><div style={{fontSize:'11px',color:'#22c55e',fontWeight:'bold'}}>Виж продукти →</div></div>)}
              </>
            ) : (
              <>
                <button onClick={()=>{setSelectedMarketShop(null); setMarketProducts([]); setCart([]);}} style={{padding:'8px',borderRadius:'8px',border:'1px solid #ddd',background:'white'}}>← Назад</button>
                <div style={{background:'#0F4C75',color:'white',padding:'12px',borderRadius:'12px'}}><b>{selectedMarketShop.name}</b><br/><span style={{fontSize:'11px'}}>Доставка {selectedMarketShop.delivery_fee}€</span></div>
                {marketProducts.map((p:any)=><div key={p.id} style={{background:'white',borderRadius:'12px',padding:'10px',display:'flex',gap:'10px',border:'1px solid #eee'}}>{p.image_url && <img src={p.image_url} style={{width:'60px',height:'60px',objectFit:'cover',borderRadius:'8px'}}/>}<div style={{flex:1}}><b>{p.name}</b><br/><span style={{fontSize:'11px'}}>{p.description||''}</span><br/><b>{p.price}€</b></div><button onClick={()=>setCart([...cart,p])} style={{background:'#22c55e',color:'white',border:'none',padding:'8px 12px',borderRadius:'8px'}}>Добави</button></div>)}
                {cart.length>0 && <div style={{background:'white',border:'2px solid #22c55e',borderRadius:'12px',padding:'12px'}}><b>🛒 Количка - {cart.length}</b>{cart.map((c:any,i:any)=><div key={i} style={{fontSize:'12px',display:'flex',justifyContent:'space-between'}}><span>{c.name}</span><span>{c.price}€</span></div>)}<div style={{borderTop:'1px solid #eee',marginTop:'8px',paddingTop:'8px',fontWeight:'bold'}}>Общо: {(cart.reduce((s:any,x:any)=>s+parseFloat(x.price),0)+parseFloat(selectedMarketShop.delivery_fee)).toFixed(2)}€</div><input value={customerAddr} onChange={e=>setCustomerAddr(e.target.value)} placeholder="Адрес" style={{width:'100%',padding:'10px',marginTop:'8px',borderRadius:'8px',border:'1px solid #ddd'}}/><button onClick={placeOrder} style={{width:'100%',marginTop:'8px',padding:'12px',background:'#22c55e',color:'white',border:'none',borderRadius:'8px',fontWeight:'bold'}}>Поръчай</button></div>}
              </>
            )}
          </div>
        )}
        {tab==='offer' && (<div style={{padding:'12px',display:'flex',flexDirection:'column',gap:'10px'}}>{!isVerified && <div style={{background:'#FF3B30',color:'white',padding:'12px',borderRadius:'10px',fontWeight:'bold',fontSize:'13px',textAlign:'center'}}>⛔ {t.needVerify}<br/><span style={{fontSize:'11px',fontWeight:'normal'}}>{t.needVerifyLong}</span></div>}{currentUser && isBanned(currentUser.phone) && <div style={{background:'#FF3B30',color:'white',padding:'10px',borderRadius:'10px',fontWeight:'bold',fontSize:'12px'}}>⛔ {t.banned}: {isBanned(currentUser.phone)?.reason}</div>}<div style={{display:'flex',gap:'6px',background:'#f1f3f4',padding:'3px',borderRadius:'12px'}}><button onClick={()=>setOfferForm({...offerForm,type:'offer'})} style={{flex:1,padding:'10px',borderRadius:'8px',border:'none',fontWeight:'bold',fontSize:'11px',background:offerForm.type==='offer'?'#0F4C75':'white',color:offerForm.type==='offer'?'white':'#666'}}>{t.imDriver}</button><button onClick={()=>setOfferForm({...offerForm,type:'request'})} style={{flex:1,padding:'10px',borderRadius:'8px',border:'none',fontWeight:'bold',fontSize:'11px',background:offerForm.type==='request'?'#FFD60A':'white',color:offerForm.type==='request'?'black':'#666'}}>{t.imPassenger}</button></div><div style={{display:'flex',gap:'6px'}}><select value={offerForm.fromCountry} onChange={e=>setOfferForm({...offerForm,fromCountry:e.target.value})} style={{padding:'10px',borderRadius:'10px',border:'2px solid #2ECC71',background:'#e6f9ed',fontWeight:'bold',fontSize:'12px'}}>{COUNTRIES.map(c=><option key={c.code} value={c.code}>{c.name}</option>)}</select><input placeholder={`${t.from} - London`} value={offerForm.from} onChange={e=>setOfferForm({...offerForm,from:e.target.value})} style={{flex:1,padding:'10px',borderRadius:'10px',border:offerForm.from?'2px solid #2ECC71':'2px solid #FF3B30'}}/></div><div style={{display:'flex',gap:'6px'}}><select value={offerForm.toCountry} onChange={e=>setOfferForm({...offerForm,toCountry:e.target.value})} style={{padding:'10px',borderRadius:'10px',border:'2px solid #2ECC71',background:'#e6f9ed',fontWeight:'bold',fontSize:'12px'}}>{COUNTRIES.map(c=><option key={c.code} value={c.code}>{c.name}</option>)}</select><input placeholder={`${t.to} - Sofia`} value={offerForm.to} onChange={e=>setOfferForm({...offerForm,to:e.target.value})} style={{flex:1,padding:'10px',borderRadius:'10px',border:offerForm.to?'2px solid #2ECC71':'2px solid #FF3B30'}}/></div><div style={{display:'flex',gap:'6px'}}><input type="time" value={offerForm.time} onChange={e=>setOfferForm({...offerForm,time:e.target.value})} style={{flex:1,padding:'10px',borderRadius:'10px',border:'2px solid #2ECC71',background:'white',fontWeight:'bold'}}/><input placeholder={offerForm.type==='request'?`${t.seatsNeed} - 2`:`${t.seatsFree} - 4`} value={offerForm.seats} onChange={e=>setOfferForm({...offerForm,seats:e.target.value})} style={{flex:1,padding:'10px',borderRadius:'10px',border:offerForm.seats?'2px solid #2ECC71':'2px solid #FF3B30'}}/></div>{offerForm.type==='offer' && <><div style={{display:'flex',gap:'6px'}}><input placeholder={`${t.brand} *`} value={offerForm.carBrand} onChange={e=>setOfferForm({...offerForm,carBrand:e.target.value})} style={{flex:1,padding:'10px',borderRadius:'10px',border:offerForm.carBrand?'2px solid #2ECC71':'2px solid #FF3B30'}}/><input placeholder={`${t.color} *`} value={offerForm.carColor} onChange={e=>setOfferForm({...offerForm,carColor:e.target.value})} style={{flex:1,padding:'10px',borderRadius:'10px',border:offerForm.carColor?'2px solid #2ECC71':'2px solid #FF3B30'}}/></div><input placeholder={`${t.reg} *`} value={offerForm.carReg} onChange={e=>setOfferForm({...offerForm,carReg:e.target.value.toUpperCase()})} style={{width:'100%',padding:'10px',borderRadius:'10px',border:offerForm.carReg?'2px solid #2ECC71':'2px solid #FF3B30'}}/></>}<textarea placeholder={t.note} value={offerForm.message} onChange={e=>setOfferForm({...offerForm,message:e.target.value})} style={{padding:'10px',borderRadius:'10px',border:'1px solid #ddd',minHeight:'50px'}}/>{offerForm.type==='offer' && <label style={{display:'flex',gap:'8px',background:offerForm.isDriver?'#e6f9ed':'#fff8e1',padding:'10px',borderRadius:'10px',border:`2px solid ${offerForm.isDriver?'#2ECC71':'#FFD60A'}`,fontSize:'11px'}}><input type="checkbox" checked={offerForm.isDriver} onChange={e=>setOfferForm({...offerForm,isDriver:e.target.checked})}/>{t.declare}</label>}<button onClick={publishRide} disabled={!canPublish} style={{background:canPublish?'#2ECC71':'#ccc',padding:'14px',borderRadius:'10px',fontWeight:'bold',border:'none'}}>{!isVerified? t.needVerify : canPublish? (editingRide? `${t.edit} ${offerForm.from}→${offerForm.to} ${offerForm.time}` : (offerForm.type==='request'?`${t.publishSeeks} ${offerForm.from}→${offerForm.to} ${offerForm.time}`:`${t.publish} ${offerForm.from}→${offerForm.to} ${offerForm.time}`)):`${t.fillFromTo} *`}</button></div>)}
        {tab==='my' && <div style={{padding:'10px',display:'flex',flexDirection:'column',gap:'10px'}}>
          {myShopProfile && myShopProfile.role==='shop_owner' && !isAdmin && (
            <div style={{background:'white',border:'3px solid #22c55e',borderRadius:'14px',padding:'14px'}}>
              <div style={{background:'#22c55e',color:'white',padding:'10px',borderRadius:'10px',margin:'-14px -14px 12px -14px'}}>
                <div style={{fontWeight:'800',fontSize:'14px'}}>🛒 Моят магазин - {shops.find(s=>s.id===myShopProfile.shop_id)?.name||'Магазин'} - ти си собственик</div>
                <div style={{fontSize:'10px'}}>Тук променяш цените - само ти имаш достъп. ID: {myShopProfile.shop_id?.slice(0,8)}</div>
              </div>
              <div style={{background:editingProduct?'#fef3c7':'#f0fdf4',border:`2px solid ${editingProduct?'#f59e0b':'#22c55e'}`,borderRadius:'12px',padding:'12px'}}>
                <div style={{fontWeight:'bold',fontSize:'12px'}}>{editingProduct?`✏️ Редактираш: ${editingProduct.name}`:'➕ Добави нова стока'}</div>
                <input value={newProdName} onChange={e=>setNewProdName(e.target.value)} placeholder="Име *: Кайма Варна" style={{width:'100%',padding:'10px',borderRadius:'8px',border:'1px solid #22c55e',marginTop:'8px',background:'white'}}/>
                <input value={newProdPrice} onChange={e=>setNewProdPrice(e.target.value)} placeholder="Цена *: 6.25€ (пишеш 6.25 или 6,25)" style={{width:'100%',padding:'10px',borderRadius:'8px',border:'2px solid #22c55e',marginTop:'8px',background:'white'}}/>
                <input value={newProdDesc} onChange={e=>setNewProdDesc(e.target.value)} placeholder="Описание: прясно мляно 1кг" style={{width:'100%',padding:'8px',borderRadius:'8px',border:'1px solid #ddd',marginTop:'8px'}}/>
                <div style={{marginTop:'8px',border:'1px dashed #22c55e',padding:'6px',borderRadius:'8px',background:'white'}}>
                  <input type="file" accept="image/*" onChange={e=>setNewProdFile(e.target.files?.[0]||null)} style={{width:'100%'}}/>
                  {editingProduct?.image_url && !newProdFile && <img src={editingProduct.image_url} style={{width:'40px',height:'40px',objectFit:'cover',borderRadius:'6px',marginTop:'4px'}}/>}
                </div>
                <div style={{display:'flex',gap:'8px',marginTop:'10px'}}>
                  <button onClick={addProductWithImage} style={{flex:1,padding:'12px',background:editingProduct?'#f59e0b':'#22c55e',color:'white',border:'none',borderRadius:'10px',fontWeight:'bold'}}>{editingProduct?'💾 Запази промените':'➕ Добави продукт с цена €'}</button>
                  {editingProduct && <button onClick={cancelEditProduct} style={{padding:'12px',background:'#e5e7eb',border:'none',borderRadius:'10px'}}>Откажи</button>}
                </div>
              </div>
              <div style={{marginTop:'14px'}}>
                <div style={{fontWeight:'800',fontSize:'13px',display:'flex',justifyContent:'space-between'}}><span>📋 Моите стоки - {myShopProducts.length}</span><button onClick={()=>loadMyShopProfile()} style={{background:'#0F4C75',color:'white',border:'none',padding:'6px 12px',borderRadius:'8px',fontSize:'11px'}}>🔄 Опресни</button></div>
                {myShopProducts.map((p:any)=><div key={p.id} style={{display:'flex',gap:'10px',alignItems:'center',border:'1px solid #e5e7eb',padding:'10px',borderRadius:'10px',marginTop:'8px',background:p.id===editingProduct?.id?'#fef3c7':'white'}}>{p.image_url && <img src={p.image_url} style={{width:'55px',height:'55px',objectFit:'cover',borderRadius:'8px'}}/>}<div style={{flex:1}}><b>{p.name}</b><br/><span style={{fontSize:'11px'}}>{p.description||''}</span><br/><b style={{color:'#22c55e'}}>{p.price}€</b></div><div style={{display:'flex',flexDirection:'column',gap:'4px'}}><button onClick={()=>startEditProduct(p)} style={{background:'#0F4C75',color:'white',border:'none',padding:'6px 10px',borderRadius:'6px',fontSize:'10px'}}>✏️ Промени цена</button><button onClick={()=>deleteProduct(p.id)} style={{background:'#FF3B30',color:'white',border:'none',padding:'4px 8px',borderRadius:'6px',fontSize:'10px'}}>🗑️ Трий</button></div></div>)}
              </div>
              <div style={{marginTop:'12px',background:'#e6f9ed',padding:'10px',borderRadius:'8px'}}><b>Поръчки - {myShopOrders.length}</b>{myShopOrders.map((o:any)=><div key={o.id} style={{background:'white',padding:'8px',borderRadius:'6px',marginTop:'6px',fontSize:'11px'}}><b>{o.customer_name} - {o.customer_phone}</b><br/>{o.address}<br/>Тотал: {o.total}€ - {o.status}</div>)}</div>
            </div>
          )}
          {myShopProfile && myShopProfile.role==='driver' && !isAdmin && (
            <div style={{background:'white',border:'2px solid #0F4C75',borderRadius:'12px',padding:'12px'}}><b>🚚 Моите доставки - {myShopOrders.length}</b>{myShopOrders.map((o:any)=><div key={o.id} style={{background:'#f9fafb',border:'1px solid #0F4C75',padding:'10px',borderRadius:'8px',marginBottom:'8px',fontSize:'12px'}}><b>{o.id.slice(0,8)}</b> - {o.status}<br/>{o.customer_name} - {o.customer_phone}<br/>📍 {o.address}<br/><b>{o.total}€</b><div style={{display:'flex',gap:'6px',marginTop:'8px'}}><a href={`tel:${o.customer_phone}`} style={{flex:1,background:'#0F4C75',color:'white',padding:'8px',borderRadius:'6px',textAlign:'center',textDecoration:'none'}}>Обади се</a><button onClick={()=>updateOrderStatus(o.id,'on_the_way')} style={{flex:1,background:'#FFD60A',border:'none',padding:'8px',borderRadius:'6px'}}>Пътувам</button><button onClick={()=>updateOrderStatus(o.id,'delivered')} style={{flex:1,background:'#22c55e',color:'white',border:'none',padding:'8px',borderRadius:'6px'}}>Доставено</button></div></div>)}</div>
          )}
          {isAdmin && <div style={{background:'white',border:'2px solid #0F4C75',borderRadius:'12px',padding:'12px',textAlign:'center',fontSize:'12px'}}><b>👑 Ти си админ</b><br/>Не виждаш цени на магазини - цените са само за собственика.<br/>Отиди в <b>👑 Магазини</b> за да управляваш магазините - СПРИ/ПУСНИ, сменяш телефон, име, такса, шофьори.<div style={{fontSize:'10px',marginTop:'6px',color:'#666'}}>Собственика +447511230086 вижда магазина си в Моите и си сменя цените.</div></div>}
          <div style={{background:isVerified?'#e6f9ed':'#fff3cd',border:`2px solid ${isVerified?'#2ECC71':'#FFD60A'}`,borderRadius:'12px',padding:'12px'}}><div style={{fontWeight:'bold',fontSize:'14px'}}>{isVerified? (lang==='bg'?'✅ Верифициран си! Можеш да пускаш обяви.':'✅ Verified! You can post rides.') : t.verifyTitle}</div><div style={{fontSize:'11px',marginTop:'4px'}}>{isVerified?`${t.verifiedOn} ${currentUser.verified_at? new Date(currentUser.verified_at).toLocaleDateString(lang==='bg'?'bg-BG':'en-GB'):''}`:t.verifyDesc}</div>{!isVerified && <div style={{marginTop:'10px'}}><div style={{background:'white',padding:'8px',borderRadius:'8px',fontSize:'11px',border:'1px solid #ddd',marginBottom:'8px'}}>{t.writeOnPaper}<br/>{t.step1}<br/>{t.step2}{new Date().toLocaleDateString(lang==='bg'?'bg-BG':'en-GB')}<br/>{t.step3}</div><input type="file" accept="image/*" capture="user" onChange={e=>setVerifyFile(e.target.files?.[0]||null)} style={{width:'100%',fontSize:'12px'}}/>{verifyFile && <div style={{fontSize:'11px',marginTop:'4px'}}>{verifyFile.name}</div>}{verifyFile && <button onClick={handleVerificationUpload} disabled={uploadingVerify} style={{width:'100%',marginTop:'8px',background:'#0F4C75',color:'white',padding:'12px',borderRadius:'8px',fontWeight:'bold',border:'none'}}>{uploadingVerify?t.uploading:t.sendForCheck}</button>}{currentUser.verification_photo_url &&!currentUser.is_verified && <div style={{fontSize:'11px',marginTop:'6px',color:'#b45309'}}>{t.pendingApproval}</div>}</div>}{isVerified && <button onClick={syncCurrentUser} style={{marginTop:'8px',background:'#0F4C75',color:'white',border:'none',padding:'8px 12px',borderRadius:'8px',fontSize:'11px'}}>{t.refresh}</button>}</div>{rides.filter(r=> r.driverId===currentUser?.id || r.driverPhone===currentUser?.phone || clean(r.driverPhone)===clean(currentUser?.phone)).map((r:any)=><div key={r.id} style={{border:'2px solid #0F4C75',borderRadius:'12px',padding:'12px'}}><b>{r.from} → {r.to} • {r.time}</b> <span style={{background:r.type==='request'?'#FFD60A':'#2ECC71',padding:'2px 6px',borderRadius:'6px',fontSize:'10px'}}>{r.type==='request'?t.youSeek:t.youOffer}</span><div style={{fontSize:'11px',marginTop:'4px'}}>{r.carInfo} • {r.seats} {t.seatsPlace}</div><div style={{display:'flex',gap:'6px',marginTop:'10px'}}><button onClick={()=>{setOfferForm({type:r.type,from:r.from,to:r.to,fromCountry:r.fromCountry,toCountry:r.toCountry,time:r.time||'09:30',returnTime:'',date:r.date,seats:r.seats.toString(),message:r.message,isDriver:r.isDriverVerified,carBrand:'',carColor:'',carReg:''}); setEditingRide(r.id); setTab('offer');}} style={{flex:1,background:'#0F4C75',color:'white',border:'none',padding:'10px',borderRadius:'8px',fontSize:'12px',fontWeight:'bold'}}>{t.edit}</button><button onClick={()=>deleteRide(r.id)} style={{background:'#FF3B30',color:'white',border:'none',padding:'10px 16px',borderRadius:'8px',fontSize:'12px',fontWeight:'bold'}}>{t.deleteRide}</button></div></div>)}{rides.filter(r=> r.driverId===currentUser?.id || r.driverPhone===currentUser?.phone || clean(r.driverPhone)===clean(currentUser?.phone)).length===0 && <div style={{textAlign:'center',padding:'10px',color:'#666',fontSize:'12px'}}>{t.noRides} {isVerified?'':t.noRidesVerify}</div>}<div style={{marginTop:'10px'}}><button onClick={handleDeleteAccount} style={{width:'100%',background:'black',color:'white',padding:'14px',borderRadius:'10px',fontWeight:'bold',border:'none'}}>{t.deleteAccKeep}</button></div></div>}
      </div>
      <div style={{flexShrink:0,background:'white',borderTop:'1px solid #e5e7eb',padding:'8px 12px'}}>
        <div style={{display:'flex',gap:'12px',justifyContent:'center',marginBottom:'8px',flexWrap:'wrap'}}>
          <button onClick={()=>setStaticPage('about')} style={{background:'none',border:'none',fontSize:'11px',color:'#0F4C75',textDecoration:'underline',fontWeight:'bold'}}>{t.about}</button>
          <button onClick={()=>setStaticPage('terms')} style={{background:'none',border:'none',fontSize:'11px',color:'#0F4C75',textDecoration:'underline',fontWeight:'bold'}}>{t.terms}</button>
          <button onClick={()=>setStaticPage('privacy')} style={{background:'none',border:'none',fontSize:'11px',color:'#0F4C75',textDecoration:'underline',fontWeight:'bold'}}>{t.privacy}</button>
          <button onClick={()=>setStaticPage('contact')} style={{background:'none',border:'none',fontSize:'11px',color:'#0F4C75',textDecoration:'underline',fontWeight:'bold'}}>{t.contact}</button>
          <a href="https://www.dropoffpay.co.uk" target="_blank" style={{fontSize:'11px',color:'#0F4C75',fontWeight:'bold'}}>DropOffPay.co.uk</a>
        </div>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:'8px'}}>
          <div style={{flex:1}}><div style={{fontSize:'12px',fontWeight:'800',color:'#0F4C75'}}>{t.footerTitle} • DropOffPay.co.uk</div><div style={{fontSize:'10px',color:'#333',marginTop:'2px'}}>{t.footerSub}<br/><span style={{color:'#b45309',fontWeight:'700'}}>{t.footerWarn}</span><br/><span style={{fontSize:'9px'}}>📧 dropoffpay.co.uk@gmail.com</span></div></div>
          <a href="https://ko-fi.com/dropoffpay" target="_blank" style={{background:'#72A9ED',color:'white',padding:'10px 16px',borderRadius:'20px',fontWeight:'bold',textDecoration:'none',fontSize:'12px'}}>☕ Ko-fi</a>
        </div>
      </div>
    </main>
  );
}