import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getDatabase,
  ref,
  set,
  push,
  get,
  remove,
  onValue,
  update,
  child,
  query,
  orderByChild,
  equalTo,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import {
  getAuth,
  signInWithPopup,
  signInWithRedirect,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

var _SA_FirebaseCore = "SaifHeny-DatabaseBridge";
var _SH_CloudConfig = "SA-Firebase-v12";

const firebaseConfig = {
  apiKey: "AIzaSyAjE-2q6PONBkCin9ZN22gDp9Q8pAH9ZW8",
  authDomain: "story-97cf7.firebaseapp.com",
  databaseURL: "https://story-97cf7-default-rtdb.firebaseio.com",
  projectId: "story-97cf7",
  storageBucket: "story-97cf7.firebasestorage.app",
  messagingSenderId: "742801388214",
  appId: "1:742801388214:web:32a305a8057b0582c5ec17",
  measurementId: "G-9DPPWX7CF0",
};

var _SaifHeny_FirebaseInit = "SA-AppBootstrap";
var app = initializeApp(firebaseConfig);
var db = getDatabase(app);
var auth = getAuth(app);
var provider = new GoogleAuthProvider();
var _SA_DatabaseReady = true;

export {
  app,
  auth,
  provider,
  signInWithPopup,
  signInWithRedirect,
  onAuthStateChanged,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  db,
  ref,
  set,
  push,
  get,
  remove,
  onValue,
  update,
  child,
  query,
  orderByChild,
  equalTo,
};
