// ============================================================
// firebase-init.js — Firebase SDK (Frontend Auth)
// ============================================================

const firebaseConfig = {
  apiKey:            "AIzaSyCXMWOZZ9zbmNcQc2LEhtaBWPv3yYJA7sA",
  authDomain:        "project-7b7f1c13-3404-4ad7-b7d.firebaseapp.com",
  projectId:         "project-7b7f1c13-3404-4ad7-b7d",
  storageBucket:     "project-7b7f1c13-3404-4ad7-b7d.firebasestorage.app",
  messagingSenderId: "316597665743",
  appId:             "1:316597665743:web:287da2874a911295125cba",
  measurementId:     "G-LQ5Z19QN77"
};

// Inicializar Firebase (compat mode — vanilla JS)
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const googleProvider = new firebase.auth.GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
