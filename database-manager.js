class DatabaseManager {
  constructor() {
    this.db = null;
    this.userId = null;
    this.userEmail = null;
    this.listeners = {};
  }

  // Inisialisasi database dengan Firebase
  async initialize(userId, userEmail) {
    if (!FirebaseManager.initializeFirebase()) {
      console.error("Firebase tidak dapat diinisialisasi");
      return false;
    }

    this.db = FirebaseManager.getDatabase();
    this.userId = userId;
    this.userEmail = userEmail;

    console.log("DatabaseManager diinisialisasi untuk user:", userId);
    return true;
  }

  // ==================== NOTES ====================
  async saveNote(note) {
    try {
      const noteId = note.id || Date.now().toString();
      const notePath = `users/${this.userId}/notes/${noteId}`;

      // Tambahkan metadata
      const noteWithMeta = {
        ...note,
        id: noteId,
        owner: this.userId,
        ownerEmail: this.userEmail,
        lastUpdated: firebase.database.ServerValue.TIMESTAMP,
        createdAt: note.createdAt || firebase.database.ServerValue.TIMESTAMP,
      };

      await this.db.ref(notePath).set(noteWithMeta);
      console.log("Note berhasil disimpan:", noteId);
      return noteId;
    } catch (error) {
      console.error("Error menyimpan note:", error);
      throw error;
    }
  }

  async getNotes() {
    try {
      const snapshot = await this.db
        .ref(`users/${this.userId}/notes`)
        .once("value");
      const notes = snapshot.val() || {};
      return Object.values(notes);
    } catch (error) {
      console.error("Error mengambil notes:", error);
      return [];
    }
  }

  async deleteNote(noteId) {
    try {
      await this.db.ref(`users/${this.userId}/notes/${noteId}`).remove();
      console.log("Note berhasil dihapus:", noteId);
      return true;
    } catch (error) {
      console.error("Error menghapus note:", error);
      throw error;
    }
  }

  // Listen untuk perubahan realtime pada notes
  listenToNotes(callback) {
    const notesRef = this.db.ref(`users/${this.userId}/notes`);

    notesRef.on("value", (snapshot) => {
      const notes = snapshot.val() || {};
      callback(Object.values(notes));
    });

    // Simpan reference untuk nanti di-unlisten
    this.listeners.notes = notesRef;
    return () => this.stopListening("notes");
  }

  // ==================== TRANSACTIONS ====================
  async saveTransaction(transaction) {
    try {
      const transactionId = transaction.id || Date.now().toString();
      const transactionPath = `users/${this.userId}/transactions/${transactionId}`;

      const transactionWithMeta = {
        ...transaction,
        id: transactionId,
        owner: this.userId,
        ownerEmail: this.userEmail,
        lastUpdated: firebase.database.ServerValue.TIMESTAMP,
        createdAt:
          transaction.createdAt || firebase.database.ServerValue.TIMESTAMP,
      };

      await this.db.ref(transactionPath).set(transactionWithMeta);
      console.log("Transaction berhasil disimpan:", transactionId);
      return transactionId;
    } catch (error) {
      console.error("Error menyimpan transaction:", error);
      throw error;
    }
  }

  async getTransactions() {
    try {
      const snapshot = await this.db
        .ref(`users/${this.userId}/transactions`)
        .once("value");
      const transactions = snapshot.val() || {};
      return Object.values(transactions);
    } catch (error) {
      console.error("Error mengambil transactions:", error);
      return [];
    }
  }

  async deleteTransaction(transactionId) {
    try {
      await this.db
        .ref(`users/${this.userId}/transactions/${transactionId}`)
        .remove();
      console.log("Transaction berhasil dihapus:", transactionId);
      return true;
    } catch (error) {
      console.error("Error menghapus transaction:", error);
      throw error;
    }
  }

  listenToTransactions(callback) {
    const transactionsRef = this.db.ref(`users/${this.userId}/transactions`);

    transactionsRef.on("value", (snapshot) => {
      const transactions = snapshot.val() || {};
      callback(Object.values(transactions));
    });

    this.listeners.transactions = transactionsRef;
    return () => this.stopListening("transactions");
  }

  // ==================== TRAVEL PLANS ====================
  async saveTravelPlan(travel) {
    try {
      const travelId = travel.id || Date.now().toString();
      const travelPath = `users/${this.userId}/travels/${travelId}`;

      const travelWithMeta = {
        ...travel,
        id: travelId,
        owner: this.userId,
        ownerEmail: this.userEmail,
        lastUpdated: firebase.database.ServerValue.TIMESTAMP,
        createdAt: travel.createdAt || firebase.database.ServerValue.TIMESTAMP,
      };

      await this.db.ref(travelPath).set(travelWithMeta);
      console.log("Travel plan berhasil disimpan:", travelId);
      return travelId;
    } catch (error) {
      console.error("Error menyimpan travel plan:", error);
      throw error;
    }
  }

  async getTravelPlans() {
    try {
      const snapshot = await this.db
        .ref(`users/${this.userId}/travels`)
        .once("value");
      const travels = snapshot.val() || {};
      return Object.values(travels);
    } catch (error) {
      console.error("Error mengambil travel plans:", error);
      return [];
    }
  }

  async deleteTravelPlan(travelId) {
    try {
      await this.db.ref(`users/${this.userId}/travels/${travelId}`).remove();
      console.log("Travel plan berhasil dihapus:", travelId);
      return true;
    } catch (error) {
      console.error("Error menghapus travel plan:", error);
      throw error;
    }
  }

  listenToTravelPlans(callback) {
    const travelsRef = this.db.ref(`users/${this.userId}/travels`);

    travelsRef.on("value", (snapshot) => {
      const travels = snapshot.val() || {};
      callback(Object.values(travels));
    });

    this.listeners.travels = travelsRef;
    return () => this.stopListening("travels");
  }

  // ==================== SHARING SYSTEM ====================
  async shareWithUser(dataType, dataId, targetUserEmail, permission = "view") {
    try {
      // Cari user ID berdasarkan email
      const usersSnapshot = await this.db.ref("users").once("value");
      const users = usersSnapshot.val() || {};

      let targetUserId = null;
      for (const [userId, userData] of Object.entries(users)) {
        if (userData.email === targetUserEmail) {
          targetUserId = userId;
          break;
        }
      }

      if (!targetUserId) {
        throw new Error("User dengan email tersebut tidak ditemukan");
      }

      // Buat sharing record
      const shareId = Date.now().toString();
      const shareData = {
        id: shareId,
        dataType: dataType, // 'note', 'transaction', 'travel'
        dataId: dataId,
        ownerId: this.userId,
        ownerEmail: this.userEmail,
        sharedWithId: targetUserId,
        sharedWithEmail: targetUserEmail,
        permission: permission, // 'view', 'edit'
        sharedAt: firebase.database.ServerValue.TIMESTAMP,
        status: "pending", // 'pending', 'accepted', 'rejected'
      };

      // Simpan di kedua user
      await this.db.ref(`shares/${shareId}`).set(shareData);
      await this.db
        .ref(`users/${targetUserId}/sharedWithMe/${shareId}`)
        .set(shareData);
      await this.db
        .ref(`users/${this.userId}/sharedByMe/${shareId}`)
        .set(shareData);

      console.log("Berhasil membagikan data:", shareId);
      return shareId;
    } catch (error) {
      console.error("Error sharing data:", error);
      throw error;
    }
  }

  async getSharedData() {
    try {
      const snapshot = await this.db
        .ref(`users/${this.userId}/sharedWithMe`)
        .once("value");
      const sharedData = snapshot.val() || {};

      // Ambil data asli untuk setiap shared item
      const sharedItems = [];

      for (const [shareId, shareInfo] of Object.entries(sharedData)) {
        if (shareInfo.status === "accepted") {
          const dataSnapshot = await this.db
            .ref(
              `users/${shareInfo.ownerId}/${shareInfo.dataType}s/${shareInfo.dataId}`
            )
            .once("value");
          const originalData = dataSnapshot.val();

          if (originalData) {
            sharedItems.push({
              ...originalData,
              shareId: shareId,
              sharedBy: shareInfo.ownerEmail,
              permission: shareInfo.permission,
              sharedAt: shareInfo.sharedAt,
            });
          }
        }
      }

      return sharedItems;
    } catch (error) {
      console.error("Error mengambil shared data:", error);
      return [];
    }
  }

  async acceptShare(shareId) {
    try {
      await this.db.ref(`shares/${shareId}/status`).set("accepted");
      await this.db
        .ref(`users/${this.userId}/sharedWithMe/${shareId}/status`)
        .set("accepted");
      await this.db
        .ref(`users/${this.userId}/sharedByMe/${shareId}/status`)
        .set("accepted");

      console.log("Share request diterima:", shareId);
      return true;
    } catch (error) {
      console.error("Error menerima share:", error);
      throw error;
    }
  }

  async rejectShare(shareId) {
    try {
      await this.db.ref(`shares/${shareId}`).remove();
      await this.db
        .ref(`users/${this.userId}/sharedWithMe/${shareId}`)
        .remove();
      await this.db.ref(`users/${this.userId}/sharedByMe/${shareId}`).remove();

      console.log("Share request ditolak:", shareId);
      return true;
    } catch (error) {
      console.error("Error menolak share:", error);
      throw error;
    }
  }

  // ==================== SYNC WITH LOCAL STORAGE ====================
  async syncLocalData() {
    try {
      console.log("Memulai sinkronisasi data...");

      // Ambil data dari Firebase
      const [firebaseNotes, firebaseTransactions, firebaseTravels, sharedData] =
        await Promise.all([
          this.getNotes(),
          this.getTransactions(),
          this.getTravelPlans(),
          this.getSharedData(),
        ]);

      // Gabungkan data lokal dan Firebase
      const localNotes = JSON.parse(
        localStorage.getItem(`notes_${this.userId}`) || "[]"
      );
      const mergedNotes = this.mergeData(localNotes, firebaseNotes, "notes");

      const localTransactions = JSON.parse(
        localStorage.getItem(`transactions_${this.userId}`) || "[]"
      );
      const mergedTransactions = this.mergeData(
        localTransactions,
        firebaseTransactions,
        "transactions"
      );

      const localTravels = JSON.parse(
        localStorage.getItem(`travels_${this.userId}`) || "[]"
      );
      const mergedTravels = this.mergeData(
        localTravels,
        firebaseTravels,
        "travels"
      );

      // Simpan ke localStorage
      localStorage.setItem(`notes_${this.userId}`, JSON.stringify(mergedNotes));
      localStorage.setItem(
        `transactions_${this.userId}`,
        JSON.stringify(mergedTransactions)
      );
      localStorage.setItem(
        `travels_${this.userId}`,
        JSON.stringify(mergedTravels)
      );

      // Simpan shared data terpisah
      localStorage.setItem(`shared_${this.userId}`, JSON.stringify(sharedData));

      console.log("Sinkronisasi selesai");
      return {
        notes: mergedNotes,
        transactions: mergedTransactions,
        travels: mergedTravels,
        shared: sharedData,
      };
    } catch (error) {
      console.error("Error sinkronisasi data:", error);
      throw error;
    }
  }

  mergeData(localData, firebaseData, dataType) {
    const merged = [...localData];
    const localMap = new Map(localData.map((item) => [item.id, item]));

    firebaseData.forEach((fbItem) => {
      if (localMap.has(fbItem.id)) {
        // Jika ada konflik, ambil yang terbaru
        const localItem = localMap.get(fbItem.id);
        if (new Date(fbItem.lastUpdated) > new Date(localItem.lastUpdated)) {
          const index = merged.findIndex((item) => item.id === fbItem.id);
          merged[index] = fbItem;
        }
      } else {
        // Tambahkan item baru dari Firebase
        merged.push(fbItem);
      }
    });

    return merged;
  }

  // ==================== UTILITY FUNCTIONS ====================
  stopListening(listenerName) {
    if (this.listeners[listenerName]) {
      this.listeners[listenerName].off();
      delete this.listeners[listenerName];
    }
  }

  stopAllListeners() {
    Object.keys(this.listeners).forEach((listenerName) => {
      this.stopListening(listenerName);
    });
  }

  // Cleanup
  cleanup() {
    this.stopAllListeners();
    this.db = null;
    this.userId = null;
    this.userEmail = null;
  }
}

// Export untuk penggunaan global
window.DatabaseManager = DatabaseManager;
