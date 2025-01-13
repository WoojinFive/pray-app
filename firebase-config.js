// Firebase init
const firebaseConfig = {
  apiKey: "AIzaSyD7Az9004lQBUOV1Xy39zXGyzzkjKFMVko",
  authDomain: "pray-app-6d39c.firebaseapp.com",
  projectId: "pray-app-6d39c",
  storageBucket: "pray-app-6d39c.firebasestorage.app",
  messagingSenderId: "86338965287",
  appId: "1:86338965287:web:1d8e50108c16a741076302"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();