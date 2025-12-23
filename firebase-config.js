// Konfigurasi Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCILTIK4Yr4bh8aOJqIQlXvrT20WE48j_Y",
  authDomain: "catatan-mull.firebaseapp.com",
  databaseURL: "https://catatan-mull.firebaseio.com",
  projectId: "catatan-mull",
  storageBucket: "catatan-mull.appspot.com",
  messagingSenderId: "your-messaging-sender-id",
  appId: "your-app-id",
  measurementId: "your-measurement-id",
};

// Inisialisasi Firebase
let app, database, auth;

// Fungsi untuk inisialisasi Firebase
function initializeFirebase() {
  try {
    // Cek apakah Firebase sudah diinisialisasi
    if (typeof firebase !== "undefined" && firebase.apps.length === 0) {
      app = firebase.initializeApp(firebaseConfig);
      database = firebase.database();
      auth = firebase.auth();
      console.log("Firebase berhasil diinisialisasi");
      return true;
    } else if (typeof firebase !== "undefined" && firebase.apps.length > 0) {
      app = firebase.app();
      database = firebase.database();
      auth = firebase.auth();
      console.log("Firebase sudah diinisialisasi");
      return true;
    } else {
      console.error("Firebase SDK tidak ditemukan");
      return false;
    }
  } catch (error) {
    console.error("Error inisialisasi Firebase:", error);
    return false;
  }
}

// Export untuk penggunaan global
window.FirebaseManager = {
  initializeFirebase,
  getDatabase: () => database,
  getAuth: () => auth,
  getApp: () => app,
};

