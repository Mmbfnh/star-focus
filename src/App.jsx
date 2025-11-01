import React, { useEffect, useState, useCallback, lazy, Suspense } from 'react';
import localforage from 'localforage';
import CryptoJS from 'crypto-js';
import { initFirebase, saveDocument, getCollection, deleteDocument, getAuthInstance, isInitialized } from './firebaseService';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, sendEmailVerification } from 'firebase/auth';

const StudySession = lazy(() => import('./StudySession'));

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
      <div style={{
        background: notification.type === 'error' ? 'rgba(220,53,69,0.9)' : 
                   notification.type === 'success' ? 'rgba(40,167,69,0.9)' : 'rgba(0,0,0,0.8)',
        padding:12,
        borderRadius:8,
        color: 'white'
      }}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div>{notification.message}</div>
          <button onClick={onClose} style={{background:'none',border:'none',color:'white',fontSize:'18px'}}>×</button>
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
      {errors.map((e,i)=> <div key={i} style={{color:'salmon', marginBottom: 10}}>{e}</div>)}
      <form onSubmit={submit}>
        {!isLogin && <input placeholder="الاسم" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} />}
        <input placeholder="البريد الإلكتروني" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} />
        <input placeholder="كلمة المرور" type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} />
        {!isLogin && <input placeholder="تأكيد كلمة المرور" type="password" value={form.confirm} onChange={e=>setForm({...form,confirm:e.target.value})} />}
        <button type="submit" disabled={loading} style={{width: '100%', marginTop: 10}}>
          {loading ? 'جارٍ...' : (isLogin ? 'دخول' : 'إنشاء حساب')}
        </button>
      </form>
      <button type="button" onClick={()=>setIsLogin(!isLogin)} className="link">
        {isLogin ? 'إنشاء حساب جديد' : 'لديك حساب؟ تسجيل الدخول'}
      </button>
    </div>
  );
}

function AddChildForm({ onAdd, onClose }) {
  const [child,setChild] = useState({ name:'', birthDate:'', subjects:[], stars:0 });
  
  const addSubject = () => {
    const name = prompt('اسم المادة'); 
    const dur = prompt('المدة بالدقائق');
    if (!name || !dur) return;
    setChild(prev => ({ 
      ...prev, 
      subjects: [...prev.subjects, { 
        id: utils.generateId(), 
        name: utils.sanitize(name), 
        duration: Number(dur) 
      }] 
    }));
  };

  const removeSubject = (id) => {
    setChild(prev => ({
      ...prev,
      subjects: prev.subjects.filter(s => s.id !== id)
    }));
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.8)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 100
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.1)',
        padding: 20,
        borderRadius: 12,
        minWidth: 300,
        backdropFilter: 'blur(10px)'
      }}>
        <h3>إضافة طفل</h3>
        <input placeholder="اسم الطفل" value={child.name} onChange={e=>setChild({...child,name:e.target.value})} />
        <input type="date" value={child.birthDate} onChange={e=>setChild({...child,birthDate:e.target.value})} style={{marginTop: 10}} />
        
        <div style={{marginTop: 15}}>
          <button type="button" onClick={addSubject} style={{marginBottom: 10}}>+ إضافة مادة</button>
          <ul style={{padding: 0, listStyle: 'none', maxHeight: 200, overflowY: 'auto'}}>
            {child.subjects.map(s => (
              <li key={s.id} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px',
                margin: '5px 0',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '6px'
              }}>
                <span>{s.name} - {s.duration} دقيقة</span>
                <button 
                  type="button" 
                  onClick={() => removeSubject(s.id)}
                  style={{background: 'rgba(255,0,0,0.3)', border: 'none', color: 'white', padding: '2px 8px', borderRadius: '4px'}}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>
        
        <div style={{display: 'flex', gap: 10, marginTop: 20}}>
          <button onClick={() => onAdd(child)}>حفظ</button>
          <button onClick={onClose}>إلغاء</button>
        </div>
      </div>
    </div>
  );
}

function ParentDashboard({ user, children, onAdd, onDelete, onLogout, onAddStar }) {
  const [showAdd,setShowAdd] = useState(false);
  const [activeSession, setActiveSession] = useState(null);

  const startSession = (childId, subject) => {
    setActiveSession({ childId, subject });
  };

  const endSession = (childId) => {
    onAddStar(childId);
    setActiveSession(null);
  };

  const cancelSession = () => {
    setActiveSession(null);
  };

  if (activeSession) {
    const child = children.find(c => c.id === activeSession.childId);
    return (
      <Suspense fallback={<div style={{textAlign: 'center', padding: 50}}>تحميل جلسة الدراسة...</div>}>
        <StudySession
          child={child}
          subject={activeSession.subject}
          onComplete={() => endSession(activeSession.childId)}
          onCancel={cancelSession}
        />
      </Suspense>
    );
  }

  return (
    <div className="dashboard">
      <header style={{display:'flex',justifyContent:'space-between',alignItems:'center', marginBottom: 20}}>
        <h1>لوحة الوالدين</h1>
        <div style={{display: 'flex', alignItems: 'center', gap: 15}}>
          <span>مرحباً، {user?.name || user?.email}</span>
          <button onClick={onLogout}>تسجيل الخروج</button>
        </div>
      </header>
      
      <main>
        <button onClick={() => setShowAdd(true)}>+ إضافة طفل</button>
        
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:16,marginTop:16}}>
          {children.length === 0 ? (
            <div style={{textAlign: 'center', padding: 40, gridColumn: '1/-1'}}>
              لا يوجد أطفال مسجلين بعد
            </div>
          ) : children.map(c => (
            <div key={c.id} style={{
              background:'rgba(255,255,255,0.05)',
              padding:16,
              borderRadius:12,
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              <div style={{fontSize:32, textAlign: 'center'}}>👦</div>
              <div style={{fontSize: '1.3em', fontWeight: 'bold', textAlign: 'center', margin: '10px 0'}}>{c.name}</div>
              <div style={{textAlign: 'center', marginBottom: 15}}>
                <span style={{fontSize: '1.1em'}}>النجوم: {c.stars || 0} </span>
                <span style={{color: 'gold'}}>⭐</span>
              </div>
              
              <div style={{marginTop: 15}}>
                <h4 style={{marginBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: 5}}>المواد:</h4>
                {c.subjects && c.subjects.length > 0 ? (
                  <ul style={{padding: 0, listStyle: 'none', margin: 0}}>
                    {c.subjects.map(s => (
                      <li key={s.id} style={{
                        margin: '8px 0',
                        padding: '8px',
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: '6px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div>
                          <div style={{fontWeight: 'bold'}}>{s.name}</div>
                          <div style={{fontSize: '0.9em', opacity: 0.8}}>المدة: {s.duration} دقيقة</div>
                        </div>
                        <button 
                          onClick={() => startSession(c.id, s)}
                          style={{
                            padding: '6px 12px',
                            fontSize: '0.8em',
                            background: 'rgba(76,175,80,0.3)',
                            border: '1px solid rgba(76,175,80,0.5)'
                          }}
                        >
                          بدء جلسة
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div style={{textAlign: 'center', opacity: 0.7, padding: 10}}>لا توجد مواد مسجلة</div>
                )}
              </div>
              
              <button 
                onClick={() => onDelete(c.id)}
                style={{
                  width: '100%',
                  marginTop: 15,
                  background: 'rgba(220,53,69,0.2)',
                  border: '1px solid rgba(220,53,69,0.3)'
                }}
              >
                حذف الطفل
              </button>
            </div>
          ))}
        </div>
      </main>
      
      {showAdd && (
        <AddChildForm 
          onAdd={(data)=>{ onAdd(data); setShowAdd(false); }} 
          onClose={()=>setShowAdd(false)} 
        />
      )}
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
    setNotification({ message: msg, type }); 
    setTimeout(()=>setNotification(null),4000);
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
    setUser(null); setChildren([]); 
    showNotification('تم تسجيل الخروج','info');
  };

  const addChild = async (childData) => {
    const c = { 
      ...childData, 
      id: utils.generateId(), 
      name: utils.sanitize(childData.name), 
      createdAt: new Date().toISOString() 
    };
    if (user && isInitialized()) {
      try { 
        await saveDocument('children', c, user.id); 
      } catch(e) { 
        console.warn(e); 
        showNotification('تعذر الحفظ للسحابة — تم حفظ محلياً','error'); 
      }
    }
    const updated = [...children, c]; 
    setChildren(updated); 
    await storage.setEncrypted('children', updated); 
    showNotification('تمت إضافة الطفل','success');
  };

  const deleteChild = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الطفل؟')) return;
    if (user && isInitialized()) {
      try { 
        await deleteDocument('children', id); 
      } catch(e) { 
        console.warn(e); 
        showNotification('تعذر الحذف من السحابة — تم الحذف محلياً','error'); 
      }
    }
    const updated = children.filter(c => c.id !== id); 
    setChildren(updated); 
    await storage.setEncrypted('children', updated); 
    showNotification('تم حذف الطفل','info');
  };

  const addStar = async (childId) => {
    const updatedChildren = children.map(c => {
      if (c.id === childId) {
        return { ...c, stars: (c.stars || 0) + 1 };
      }
      return c;
    });
    setChildren(updatedChildren);
    await storage.setEncrypted('children', updatedChildren);

    if (user && isInitialized()) {
      try {
        const child = updatedChildren.find(c => c.id === childId);
        await saveDocument('children', child, user.id);
      } catch (e) {
        console.warn(e);
        showNotification('تعذر تحديث النجوم في السحابة — تم التحديث محلياً', 'error');
      }
    }

    showNotification('مبروك! تم منح نجمة للطفل! 🌟', 'success');
  };

  if (!user) return (
    <div className="app-root">
      <Notification notification={notification} onClose={()=>setNotification(null)} />
      <AuthScreen onLogin={handleLogin} onSignUp={handleSignUp} />
    </div>
  );

  return (
    <div className="app-root">
      <Notification notification={notification} onClose={()=>setNotification(null)} />
      <ParentDashboard 
        user={user} 
        children={children} 
        onAdd={addChild} 
        onDelete={deleteChild} 
        onLogout={handleLogout} 
        onAddStar={addStar} 
      />
    </div>
  );
}
