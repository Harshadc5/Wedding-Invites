import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc,
  collection, getDocs, onSnapshot, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import {
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCD4z7v1Kq5q6VJro5mhDqnYvsqZZ9ylNI",
  authDomain: "wedding-invites-0.firebaseapp.com",
  projectId: "wedding-invites-0",
  storageBucket: "wedding-invites-0.firebasestorage.app",
  messagingSenderId: "693682931683",
  appId: "1:693682931683:web:888fb47e941d5e9dedc2d6"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

export const SECTION_LABELS = {
  hero:"Hero (Names & Gate)",
  blessing:"Blessing & Parents",
  dateToRemember:"A Date To Remember",
  meetCouple:"Meet the Bride & Groom",
  mandap:"Mandap Illustration",
  addToCalendar:"Add To Calendar / Save PDF",
  hashtag:"Hashtag",
  welcome:"Venue / Welcome",
  wishes:"Wishes & Contact",
  countdown:"Countdown Timer"
};
export const DEFAULT_ORDER = Object.keys(SECTION_LABELS);

export const DEFAULTS = {
  brideName:"Bride's Name",
  groomName:"Groom's Name",
  weddingDate:new Date().toISOString().slice(0,10),
  brideMother:"",
  brideFather:"",
  groomMother:"",
  groomFather:"",
  venueName:"",
  venueAddr:"",
  hashtag:"",
  contactName:"",
  contactRel:"Bride's Father",
  contactPhone:"",
  blessingText:"With joy and the blessings of our elders, we invite you to the wedding of our dear daughter",
  coupleMsg:"With our hearts full and smiles wide, come celebrate our love, share our joy, and help make this day a beautiful memory we will cherish forever.",
  sectionOrder: DEFAULT_ORDER.slice(),
  nameOrder:"bride",
  parentsOrder:"bride",
  currentTrackId:null
};

export const MONTHS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];

export function normalizeSectionOrder(order){
  const valid = Array.isArray(order) ? order.filter(id => DEFAULT_ORDER.includes(id)) : [];
  DEFAULT_ORDER.forEach(id => { if(!valid.includes(id)) valid.push(id); });
  return valid;
}

export function slugify(brideName, groomName){
  const base = (brideName + '-weds-' + groomName)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'invitation';
}

async function slugExists(slug){
  const snap = await getDoc(doc(db, 'invitations', slug));
  return snap.exists();
}

export async function createInvitation(brideName, groomName){
  let base = slugify(brideName, groomName);
  let slug = base;
  let n = 2;
  while(await slugExists(slug)){
    slug = base + '-' + n;
    n++;
  }
  const data = Object.assign({}, DEFAULTS, {
    brideName, groomName,
    hashtag: '#' + brideName.replace(/[^a-zA-Z]/g,'') + 'Weds' + groomName.replace(/[^a-zA-Z]/g,''),
    createdAt: Date.now()
  });
  await setDoc(doc(db, 'invitations', slug), data);
  return slug;
}

export async function loadInvitation(slug){
  const snap = await getDoc(doc(db, 'invitations', slug));
  if(!snap.exists()) return null;
  const d = Object.assign({}, DEFAULTS, snap.data());
  d.sectionOrder = normalizeSectionOrder(d.sectionOrder);
  return d;
}

export function watchInvitation(slug, cb){
  return onSnapshot(doc(db, 'invitations', slug), (snap)=>{
    if(!snap.exists()){ cb(null); return; }
    const d = Object.assign({}, DEFAULTS, snap.data());
    d.sectionOrder = normalizeSectionOrder(d.sectionOrder);
    cb(d);
  }, ()=> cb(null));
}

export async function saveInvitation(slug, data){
  const toSave = Object.assign({}, data);
  delete toSave.slug;
  delete toSave.createdAt;
  await setDoc(doc(db, 'invitations', slug), toSave, {merge:true});
}

export async function deleteInvitation(slug){
  await deleteDoc(doc(db, 'invitations', slug));
}

export async function listInvitations(){
  const q = query(collection(db, 'invitations'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => Object.assign({slug: d.id}, d.data()));
}

export async function setCurrentTrack(slug, trackId){
  await updateDoc(doc(db, 'invitations', slug), {currentTrackId: trackId});
}

/* ---------- Tracks subcollection ---------- */
export function genTrackId(){
  return 't_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,8);
}

export async function listTracks(slug){
  const snap = await getDocs(collection(db, 'invitations', slug, 'tracks'));
  return snap.docs.map(d => Object.assign({id: d.id}, d.data()));
}

export function watchTracks(slug, cb){
  return onSnapshot(collection(db, 'invitations', slug, 'tracks'), (snap)=>{
    cb(snap.docs.map(d => Object.assign({id: d.id}, d.data())));
  }, ()=> cb([]));
}

export async function addTrack(slug, track){
  const id = genTrackId();
  await setDoc(doc(db, 'invitations', slug, 'tracks', id), Object.assign({}, track, {addedAt: Date.now()}));
  return id;
}

export async function deleteTrack(slug, trackId){
  await deleteDoc(doc(db, 'invitations', slug, 'tracks', trackId));
}

/* ---------- YouTube helpers ---------- */
export function extractYouTubeId(url){
  try{
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '').replace(/^m\./, '');
    if(host === 'youtu.be'){
      return u.pathname.slice(1).split('/')[0] || null;
    }
    if(host === 'youtube.com' || host === 'music.youtube.com'){
      if(u.pathname === '/watch'){
        return u.searchParams.get('v');
      }
      if(u.pathname.startsWith('/shorts/')){
        return u.pathname.split('/')[2] || null;
      }
      if(u.pathname.startsWith('/embed/')){
        return u.pathname.split('/')[2] || null;
      }
    }
  }catch(e){}
  return null;
}

export function parseYouTubeStart(url){
  try{
    const u = new URL(url);
    const t = u.searchParams.get('t') || u.searchParams.get('start');
    if(!t) return 0;
    if(/^\d+$/.test(t)) return parseInt(t, 10);
    const m = t.match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/);
    if(!m) return 0;
    const h = parseInt(m[1]||'0',10), mi = parseInt(m[2]||'0',10), s = parseInt(m[3]||'0',10);
    return h*3600 + mi*60 + s;
  }catch(e){ return 0; }
}

export async function fetchYouTubeMeta(videoId){
  try{
    const res = await fetch('https://www.youtube.com/oembed?url=' + encodeURIComponent('https://www.youtube.com/watch?v=' + videoId) + '&format=json');
    if(!res.ok) throw new Error('bad response');
    const data = await res.json();
    return {title: data.title || 'YouTube Track', artist: data.author_name || ''};
  }catch(e){
    return {title: 'YouTube Track', artist: ''};
  }
}

export function fallbackTitleFromUrl(url){
  try{
    const u = new URL(url);
    const last = u.pathname.split('/').filter(Boolean).pop() || 'Audio Link';
    return decodeURIComponent(last).replace(/\.[^.]+$/, '');
  }catch(e){
    return 'Audio Link';
  }
}

/* ---------- Auth ---------- */
export function loginAdmin(email, password){
  return signInWithEmailAndPassword(auth, email, password);
}
export function logoutAdmin(){
  return signOut(auth);
}
export function watchAuth(cb){
  return onAuthStateChanged(auth, cb);
}

/* ---------- URL slug helper ---------- */
export function getSlugFromLocation(basePath){
  const params = new URLSearchParams(location.search);
  if(params.get('slug')) return params.get('slug');
  const path = location.pathname;
  const idx = path.indexOf(basePath);
  if(idx === -1) return '';
  let rest = path.slice(idx + basePath.length);
  rest = rest.replace(/index\.html$/, '');
  rest = rest.replace(/^\/+|\/+$/g, '');
  return decodeURIComponent(rest);
}
