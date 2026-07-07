// ============================================
// FIREBASE — КОНФИГУРАЦИЯ
// ============================================

const firebaseConfig = {
    apiKey: "AIzaSyC6VMW6YoLo8zneb72nxy9zod6bg4eCSGg",
    authDomain: "cveti-shop-db.firebaseapp.com",
    projectId: "cveti-shop-db",
    storageBucket: "cveti-shop-db.firebasestorage.app",
    messagingSenderId: "1038486274286",
    appId: "1:1038486274286:web:503a1ef795209c8a9fb3ff",
    measurementId: "G-T8ZG6S1K67"
};

// Инициализация Firebase
firebase.initializeApp(firebaseConfig);

// ✅ ДОБАВЬТЕ ЭТУ СТРОЧКУ:
const db = firebase.firestore();

console.log('🌿 Firebase подключен!');