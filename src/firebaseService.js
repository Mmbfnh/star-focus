import { initializeApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence, collection, addDoc, doc, getDocs, setDoc, deleteDoc, query, where } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

let app = null;
let db = null;
let auth = null;
let initialized = false;

export function initFirebase(config) {
  if (!config || !config.apiKey) {
    console.warn('Firebase config missing');
    return false;
  }
  app = initializeApp(config);
  db = getFirestore(app);
  auth = getAuth(app);
  enableIndexedDbPersistence(db).catch((e)=> console.warn('persistence:', e.message));
  initialized = true;
  return true;
}

export async function saveDocument(collectionName, document, userId=null) {
  if (!initialized) throw new Error('Firebase not initialized');
  document = { ...document };
  if (userId) document.userId = userId;
  if (document.id) {
    await setDoc(doc(db, collectionName, document.id), document, { merge: true });
    return document.id;
  } else {
    const ref = await addDoc(collection(db, collectionName), document);
    return ref.id;
  }
}

export async function getCollection(collectionName, userId=null) {
  if (!initialized) throw new Error('Firebase not initialized');
  let q = collection(db, collectionName);
  if (userId) {
    q = query(collection(db, collectionName), where('userId', '==', userId));
  }
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function deleteDocument(collectionName, id) {
  if (!initialized) throw new Error('Firebase not initialized');
  await deleteDoc(doc(db, collectionName, id));
  return true;
}

export function getAuthInstance() { return auth; }
export function isInitialized() { return initialized; }
