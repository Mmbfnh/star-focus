import React, { useEffect, useState, useCallback } from 'react';
import localforage from 'localforage';
import CryptoJS from 'crypto-js';
import { initFirebase, saveDocument, getCollection, deleteDocument, getAuthInstance, isInitialized } from './firebaseService';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, sendEmailVerification } from 'firebase/auth';

const FIREBASE_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const utils = {
  sanitize(str=''){ return String(str).replace(/[<>]/g,''); },
  generateId(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,8); },
  encrypt(payload, secret){ return CryptoJS.AES.encrypt(payload, secret).toString(); },
  decrypt(ciphertext, secret){ try { const bytes = CryptoJS.AES.decrypt(ciphertext, secret); return bytes.toString(CryptoJS.enc.Utf8); } catch(e){ return null; } }
};

const storage = {
  async setEncrypted(key, value) {
    const secret = import.meta.env.VITE_APP_STORAGE_SECRET || 'change_this_secret_in_prod';
    const cipher = utils.encrypt(JSON.stringify(value), secret);
    await localforage.setItem(key, cipher);
  },
  async getEncrypted(key) {
    const secret = import.meta.env.VITE_APP_STORAGE_SECRET || 'change_this_secret_in_prod';
    const cipher = await localforage.getItem(key);
    if (!cipher) return null;
    const plain = utils.decrypt(cipher, secret);
    return plain ? JSON.parse(plain) : null;
  }
};

function Notification({ notification, onClose }) {
  if (!notification) return null;
  return (
    <div style={{position:'fixed',top:10,left:10,right:10,zIndex:999}}>
      <div style={{background:'rgba(0,0,0,0.6)',padding:12,borderRadius:8}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div>{notification.message}</div>
          <button onClick={onClose}>×</button>
        </div>
      </div>
    </div>
  );
}

function AuthScreen({ onLogin, onSignUp }) {
  const [isLogin,setIsLogin] = useState(true);
  const [form,setForm] = useState({name:'',email:'',password:'',confirm:''});
  const [loading,setLoading] = useState(false);
  const [errors,setErrors] = useState([]);

  const submit = async (e) => {
    e.preventDefault();
    setErrors([]); setLoading(true);
    try {
      if (isLogin) await onLogin(form.email, form.password);
      else {
        if (form.password !== form.confirm) throw new Error('كلمات المرور غير متطابقة');
        await onSignUp(form.email, form.password, { name: utils.sanitize(form.name) });
      }
    } catch (err) { setErrors([err.message || err.toString()]); }
    finally { setLoading(false); }
  };

  return (
    <div className="auth-screen">
      <h2>{isLogin ? 'تسجيل الدخول' : 'إنشاء حساب'}</h2>
      {errors.map((e,i)=> <div key={i} style={{color:'salmon'}}>{e}</div>)}
      <form onSubmit={submit}>
        {!isLogin && <input placeholder="الاسم" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} />}
        <input placeholder="البريد الإلكتروني" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} />
        <input placeholder="كلمة المرور" type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} />
        {!isLogin && <input placeholder="تأكيد" type="password" value={form.confirm} onChange={e=>setForm({...form,confirm:e.target.value})} />}
        <button type="submit" disabled={loading}>{loading ? 'جارٍ...' : (isLogin ? 'دخول' : 'إنشاء')}</button>
      </form>
      <button type="button" onClick={()=>setIsLogin(!isLogin)} className="link">{isLogin ? 'إنشاء حساب جديد' : 'لديك حساب؟ تسجيل الدخول'}</button>
    </div>
  );
}

function AddChildForm({ onAdd, onClose }) {
  const [child,setChild] = useState({ name:'', birthDate:'', subjects:[], stars:0 });
  const addSubject = () => {
    const name = prompt('اسم المادة'); const dur = prompt('المدة بالدقائق');
    if (!name || !dur) return;
    setChild(prev => ({ ...prev, subjects: [...prev.subjects, { id: utils.generateId(), name: utils.sanitize(name), duration: Number(dur) }] }));
  };
  return (
    <div>
      <h3>إضافة طفل</h3>
      <input placeholder="الاسم" value={child.name} onChange={e=>setChild({...child,name:e.target.value})} />
      <input type="date" value={child.birthDate} onChange={e=>setChild({...child,birthDate:e.target.value})} />
      <div>
        <button onClick={addSubject}>إضافة مادة</button>
        <ul>{child.subjects.map(s => <li key={s.id}>{s.name} - {s.duration} دقيقة</li>)}</ul>
      </div>
      <div>
        <button onClick={() => onAdd(child)}>حفظ</button>
        <button onClick={onClose}>إلغاء</button>
      </div>
    </div>
  );
}

function ParentDashboard({ user, children, onAdd, onDelete, onLogout }) {
  const [showAdd,setShowAdd] = useState(false);
  return (
    <div className="dashboard">
      <header style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <h1>لوحة الوالدين</h1>
        <div>
          <span>{user?.name || user?.email}</span>
          <button onClick={onLogout}>تسجيل الخروج</button>
        </div>
      </header>
      <main>
        <button onClick={() => setShowAdd(true)}>+ إضافة طفل</button>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:12,marginTop:12}}>
          {children.length === 0 ? <div>لا يوجد أطفال</div> : children.map(c => (
            <div key={c.id} style={{background:'rgba(255,255,255,0.02)',padding:12,borderRadius:8}}>
              <div style={{fontSize:28}}>👦</div>
              <div>{c.name}</div>
              <div>النجوم: {c.stars || 0}</div>
              <button onClick={() => onDelete(c.id)}>حذف</button>
            </div>
          ))}
        </div>
      </main>
      {showAdd && <AddChildForm onAdd={(data)=>{ onAdd(data); setShowAdd(false); }} onClose={()=>setShowAdd(false)} />}
    </div>
  );
}

export default function App() {
  const [initialized, setInitialized] = useState(false);
  const [user,setUser] = useState(null);
  const [children,setChildren] = useState([]);
  const [notification,setNotification] = useState(null);

  useEffect(() => {
    const ok = initFirebase(FIREBASE_CONFIG);
    setInitialized(ok);
    (async () => {
      const localChildren = await storage.getEncrypted('children');
      if (localChildren) setChildren(localChildren);
    })();
    if (ok) {
      onAuthStateChanged(getAuthInstance(), async (u) => {
        if (u) {
          try {
            const parents = await getCollection('parents');
            const p = parents.find(x => x.id === u.uid) || { id: u.uid, name: u.email, email: u.email, createdAt: new Date().toISOString() };
            setUser(p);
            const ch = await getCollection('children', u.uid);
            setChildren(ch);
            await storage.setEncrypted('children', ch);
            setNotification({ type: 'success', message: `مرحباً ${p.name || p.email}` });
          } catch(e) {
            console.error(e);
            setNotification({ type:'error', message: 'تعذر تحميل البيانات من السحابة' });
          }
        } else setUser(null);
      });
    }
  }, []);

  const showNotification = useCallback((msg,type='info')=> {
    setNotification({ message: msg, type }); setTimeout(()=>setNotification(null),4000);
  }, []);

  const handleSignUp = async (email,password,parentData) => {
    if (!isInitialized()) throw new Error('Firebase not initialized');
    const auth = getAuth();
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await sendEmailVerification(cred.user);
    await saveDocument('parents', { id: cred.user.uid, ...parentData }, cred.user.uid);
  };

  const handleLogin = async (email,password) => {
    if (!isInitialized()) throw new Error('Firebase not initialized');
    const auth = getAuth();
    const cred = await signInWithEmailAndPassword(auth, email, password);
    if (!cred.user.emailVerified) {
      await signOut(auth);
      throw new Error('يرجى تفعيل البريد الإلكتروني قبل المتابعة');
    }
  };

  const handleLogout = async () => {
    if (!isInitialized()) { setUser(null); setChildren([]); return; }
    await signOut(getAuth());
    setUser(null); setChildren([]); showNotification('تم تسجيل الخروج','info');
  };

  const addChild = async (childData) => {
    const c = { ...childData, id: utils.generateId(), name: utils.sanitize(childData.name), createdAt: new Date().toISOString() };
    if (user && isInitialized()) {
      try { await saveDocument('children', c, user.id); } catch(e) { console.warn(e); showNotification('تعذر الحفظ للسحابة — تم حفظ محلياً','error'); }
    }
    const updated = [...children, c]; setChildren(updated); await storage.setEncrypted('children', updated); showNotification('تمت إضافة الطفل','success');
  };

  const deleteChild = async (id) => {
    if (!window.confirm('هل أنت متأكد؟')) return;
    if (user && isInitialized()) {
      try { await deleteDocument('children', id); } catch(e) { console.warn(e); showNotification('تعذر الحذف من السحابة — تم الحذف محلياً','error'); }
    }
    const updated = children.filter(c => c.id !== id); setChildren(updated); await storage.setEncrypted('children', updated); showNotification('تم الحذف','info');
  };

  if (!user) return (<div className="app-root"><Notification notification={notification} onClose={()=>setNotification(null)} /><AuthScreen onLogin={handleLogin} onSignUp={handleSignUp} /></div>);

  return (<div className="app-root"><Notification notification={notification} onClose={()=>setNotification(null)} /><ParentDashboard user={user} children={children} onAdd={addChild} onDelete={deleteChild} onLogout={handleLogout} /></div>);
}
