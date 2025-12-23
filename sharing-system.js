class SharingSystem {
  constructor() {
    this.dbManager = null;
    this.modal = null;
    this.sharedItems = [];
    this.pendingShares = [];
  }

  initialize(dbManager) {
    this.dbManager = dbManager;
    this.createUI();
    this.loadSharedData();
    this.listenForShares();
  }

  createUI() {
    // Tambahkan CSS untuk sharing system
    const style = document.createElement("style");
    style.textContent = `
            .sharing-container {
                margin-top: 30px;
            }
            
            .share-button {
                margin-left: 10px;
                padding: 6px 12px;
                font-size: 0.9rem;
            }
            
            .shared-badge {
                background-color: #4cc9f0;
                color: white;
                padding: 2px 8px;
                border-radius: 12px;
                font-size: 0.8rem;
                margin-left: 8px;
            }
            
            .share-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.5);
                display: none;
                align-items: center;
                justify-content: center;
                z-index: 1001;
            }
            
            .share-modal.active {
                display: flex;
            }
            
            .share-modal-content {
                background-color: white;
                border-radius: 10px;
                padding: 30px;
                width: 90%;
                max-width: 500px;
                max-height: 90vh;
                overflow-y: auto;
            }
            
            .dark-mode .share-modal-content {
                background-color: var(--light-color);
            }
            
            .share-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 15px;
                border-bottom: 1px solid var(--light-gray);
            }
            
            .share-item:last-child {
                border-bottom: none;
            }
            
            .share-actions {
                display: flex;
                gap: 8px;
            }
            
            .notification-badge {
                position: absolute;
                top: -5px;
                right: -5px;
                background-color: var(--danger-color);
                color: white;
                border-radius: 50%;
                width: 18px;
                height: 18px;
                font-size: 0.7rem;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .shared-data-list {
                margin-top: 20px;
            }
            
            .shared-data-item {
                background-color: rgba(67, 97, 238, 0.05);
                border-radius: 8px;
                padding: 15px;
                margin-bottom: 10px;
                border-left: 4px solid var(--primary-color);
            }
        `;
    document.head.appendChild(style);

    // Buat modal untuk sharing
    this.modal = document.createElement("div");
    this.modal.className = "share-modal";
    this.modal.innerHTML = `
            <div class="share-modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">Berbagi Data</h3>
                    <button class="close-modal">&times;</button>
                </div>
                <div class="modal-body">
                    <div id="shareFormContainer"></div>
                    <div id="pendingSharesContainer"></div>
                    <div id="sharedDataContainer"></div>
                </div>
            </div>
        `;
    document.body.appendChild(this.modal);

    // Tambahkan tombol sharing di setiap table
    this.addShareButtons();

    // Event listeners untuk modal
    this.modal.querySelector(".close-modal").addEventListener("click", () => {
      this.modal.classList.remove("active");
    });

    this.modal.addEventListener("click", (e) => {
      if (e.target === this.modal) {
        this.modal.classList.remove("active");
      }
    });
  }

  addShareButtons() {
    // Tambahkan tombol sharing di header setiap section
    const sections = ["notes", "savings", "travel"];

    sections.forEach((section) => {
      const page = document.getElementById(`${section}Page`);
      if (page) {
        const cardHeader = page.querySelector(".card-header");
        if (cardHeader) {
          const shareButton = document.createElement("button");
          shareButton.className = "btn btn-primary share-button";
          shareButton.innerHTML = '<i class="fas fa-share-alt"></i> Bagikan';
          shareButton.addEventListener("click", () =>
            this.openShareModal(section)
          );
          cardHeader.appendChild(shareButton);
        }
      }
    });

    // Tambahkan tombol sharing di navbar
    const sidebarMenu = document.querySelector(".sidebar-menu");
    if (sidebarMenu) {
      const shareMenuItem = document.createElement("li");
      shareMenuItem.innerHTML = `
                <a href="#" class="nav-link" data-page="shared">
                    <i class="fas fa-share-square"></i> <span>Data Dibagikan</span>
                    <span class="notification-badge" id="shareNotification" style="display: none;">0</span>
                </a>
            `;
      sidebarMenu.appendChild(shareMenuItem);

      // Event listener untuk halaman shared
      shareMenuItem
        .querySelector(".nav-link")
        .addEventListener("click", (e) => {
          e.preventDefault();
          this.showSharedDataPage();
        });
    }
  }

  openShareModal(dataType, specificItemId = null) {
    this.modal.classList.add("active");

    let formHtml = "";

    if (specificItemId) {
      // Share item spesifik
      formHtml = `
                <div class="form-group">
                    <label class="form-label">Bagikan Item</label>
                    <div class="share-item">
                        <span>Item ID: ${specificItemId}</span>
                        <div class="share-actions">
                            <input type="email" class="form-control" id="shareEmail" placeholder="Email penerima" style="width: 200px;">
                            <select class="form-control" id="sharePermission" style="width: 100px;">
                                <option value="view">Lihat</option>
                                <option value="edit">Edit</option>
                            </select>
                            <button class="btn btn-primary" id="shareNowBtn">Bagikan</button>
                        </div>
                    </div>
                </div>
            `;
    } else {
      // Share multiple items
      formHtml = `
                <h4>Bagikan Data ${this.capitalizeFirstLetter(dataType)}</h4>
                <div id="shareItemsList"></div>
                <div class="form-group" style="margin-top: 20px;">
                    <label class="form-label">Email Penerima</label>
                    <input type="email" class="form-control" id="shareEmail" placeholder="Masukkan email penerima">
                </div>
                <div class="form-group">
                    <label class="form-label">Izin</label>
                    <select class="form-control" id="sharePermission">
                        <option value="view">Hanya Lihat</option>
                        <option value="edit">Boleh Edit</option>
                    </select>
                </div>
                <button class="btn btn-primary" id="shareSelectedBtn">Bagikan Item Terpilih</button>
            `;
    }

    document.getElementById("shareFormContainer").innerHTML = formHtml;

    if (specificItemId) {
      document.getElementById("shareNowBtn").addEventListener("click", () => {
        this.shareItem(dataType, specificItemId);
      });
    } else {
      this.populateShareItems(dataType);
      document
        .getElementById("shareSelectedBtn")
        .addEventListener("click", () => {
          this.shareSelectedItems(dataType);
        });
    }

    // Tampilkan pending shares
    this.showPendingShares();

    // Tampilkan shared data
    this.showSharedData();
  }

  populateShareItems(dataType) {
    const itemsList = document.getElementById("shareItemsList");
    itemsList.innerHTML = "";

    let items = [];
    switch (dataType) {
      case "notes":
        items = notes || [];
        break;
      case "savings":
        items = transactions || [];
        break;
      case "travel":
        items = travels || [];
        break;
    }

    items.forEach((item) => {
      const div = document.createElement("div");
      div.className = "form-check";
      div.innerHTML = `
                <input type="checkbox" class="form-check-input share-item-check" 
                       value="${item.id}" id="share_${item.id}">
                <label class="form-check-label" for="share_${item.id}">
                    ${
                      dataType === "notes"
                        ? item.title
                        : dataType === "savings"
                        ? `${item.description} (${formatCurrency(item.amount)})`
                        : item.destination
                    }
                </label>
            `;
      itemsList.appendChild(div);
    });
  }

  async shareItem(dataType, itemId) {
    const email = document.getElementById("shareEmail").value;
    const permission = document.getElementById("sharePermission").value;

    if (!email) {
      showToast("Masukkan email penerima", "danger");
      return;
    }

    try {
      await this.dbManager.shareWithUser(dataType, itemId, email, permission);
      showToast("Berhasil membagikan item", "success");
      this.modal.classList.remove("active");
    } catch (error) {
      showToast(`Gagal membagikan: ${error.message}`, "danger");
    }
  }

  async shareSelectedItems(dataType) {
    const email = document.getElementById("shareEmail").value;
    const permission = document.getElementById("sharePermission").value;
    const selectedItems = Array.from(
      document.querySelectorAll(".share-item-check:checked")
    ).map((cb) => cb.value);

    if (!email) {
      showToast("Masukkan email penerima", "danger");
      return;
    }

    if (selectedItems.length === 0) {
      showToast("Pilih setidaknya satu item", "warning");
      return;
    }

    try {
      for (const itemId of selectedItems) {
        await this.dbManager.shareWithUser(dataType, itemId, email, permission);
      }
      showToast(`Berhasil membagikan ${selectedItems.length} item`, "success");
      this.modal.classList.remove("active");
    } catch (error) {
      showToast(`Gagal membagikan: ${error.message}`, "danger");
    }
  }

  async loadSharedData() {
    if (!this.dbManager) return;

    try {
      this.sharedItems = await this.dbManager.getSharedData();
      this.updateSharedDataUI();
    } catch (error) {
      console.error("Error loading shared data:", error);
    }
  }

  async listenForShares() {
    if (!this.dbManager) return;

    // Listen untuk perubahan pada shared data
    const checkForNewShares = async () => {
      try {
        const snapshot = await this.dbManager.db
          .ref(`users/${this.dbManager.userId}/sharedWithMe`)
          .once("value");
        const sharedData = snapshot.val() || {};

        this.pendingShares = Object.values(sharedData).filter(
          (share) => share.status === "pending"
        );

        this.updateNotificationBadge();
      } catch (error) {
        console.error("Error checking for new shares:", error);
      }
    };

    // Check setiap 30 detik
    setInterval(checkForNewShares, 30000);
    checkForNewShares();
  }

  updateNotificationBadge() {
    const badge = document.getElementById("shareNotification");
    if (badge) {
      if (this.pendingShares.length > 0) {
        badge.textContent = this.pendingShares.length;
        badge.style.display = "flex";
      } else {
        badge.style.display = "none";
      }
    }
  }

  showPendingShares() {
    const container = document.getElementById("pendingSharesContainer");

    if (this.pendingShares.length === 0) {
      container.innerHTML = "";
      return;
    }

    let html = "<h4>Permintaan Berbagi</h4>";

    this.pendingShares.forEach((share) => {
      html += `
                <div class="share-item">
                    <div>
                        <strong>${share.ownerEmail}</strong> ingin berbagi
                        ${
                          share.dataType === "note"
                            ? "catatan"
                            : share.dataType === "transaction"
                            ? "transaksi"
                            : "rencana perjalanan"
                        }
                        <br>
                        <small>Izin: ${
                          share.permission === "view" ? "Lihat" : "Edit"
                        }</small>
                    </div>
                    <div class="share-actions">
                        <button class="btn btn-sm btn-success accept-share" data-id="${
                          share.id
                        }">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="btn btn-sm btn-danger reject-share" data-id="${
                          share.id
                        }">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
            `;
    });

    container.innerHTML = html;

    // Event listeners untuk tombol accept/reject
    container.querySelectorAll(".accept-share").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const shareId = e.target.closest("button").getAttribute("data-id");
        try {
          await this.dbManager.acceptShare(shareId);
          showToast("Permintaan berbagi diterima", "success");
          this.loadSharedData();
          this.showPendingShares();
        } catch (error) {
          showToast("Gagal menerima permintaan", "danger");
        }
      });
    });

    container.querySelectorAll(".reject-share").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const shareId = e.target.closest("button").getAttribute("data-id");
        try {
          await this.dbManager.rejectShare(shareId);
          showToast("Permintaan berbagi ditolak", "success");
          this.loadSharedData();
          this.showPendingShares();
        } catch (error) {
          showToast("Gagal menolak permintaan", "danger");
        }
      });
    });
  }

  showSharedData() {
    const container = document.getElementById("sharedDataContainer");

    if (this.sharedItems.length === 0) {
      container.innerHTML = "<p>Tidak ada data yang dibagikan</p>";
      return;
    }

    let html = "<h4>Data yang Dibagikan dengan Anda</h4>";

    // Kelompokkan berdasarkan tipe
    const grouped = {
      notes: this.sharedItems.filter((item) => item.dataType === "note"),
      transactions: this.sharedItems.filter(
        (item) => item.dataType === "transaction"
      ),
      travels: this.sharedItems.filter((item) => item.dataType === "travel"),
    };

    Object.entries(grouped).forEach(([type, items]) => {
      if (items.length > 0) {
        html += `<h5>${this.capitalizeFirstLetter(type)}</h5>`;
        items.forEach((item) => {
          html += `
                        <div class="shared-data-item">
                            <div>
                                <strong>
                                    ${
                                      type === "notes"
                                        ? item.title
                                        : type === "transactions"
                                        ? item.description
                                        : item.destination
                                    }
                                </strong>
                                <br>
                                <small>Dibagikan oleh: ${item.sharedBy}</small>
                                <br>
                                <small>Izin: ${
                                  item.permission === "view" ? "Lihat" : "Edit"
                                }</small>
                            </div>
                        </div>
                    `;
        });
      }
    });

    container.innerHTML = html;
  }

  showSharedDataPage() {
    // Hide all pages
    document.querySelectorAll(".page").forEach((p) => {
      p.classList.remove("active");
    });

    // Create shared data page if not exists
    let sharedPage = document.getElementById("sharedPage");
    if (!sharedPage) {
      sharedPage = document.createElement("section");
      sharedPage.className = "page";
      sharedPage.id = "sharedPage";
      sharedPage.innerHTML = `
                <h1 class="page-title"><i class="fas fa-share-square"></i> Data yang Dibagikan</h1>
                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title">Data dari Pengguna Lain</h2>
                    </div>
                    <div class="card-body">
                        <div id="fullSharedData"></div>
                    </div>
                </div>
            `;
      document.querySelector(".main-content").appendChild(sharedPage);
    }

    // Show the page
    sharedPage.classList.add("active");

    // Update active nav link
    document
      .querySelectorAll(".nav-link")
      .forEach((l) => l.classList.remove("active"));
    document.querySelector('a[data-page="shared"]').classList.add("active");

    // Load shared data
    this.loadFullSharedData();
  }

  async loadFullSharedData() {
    if (!this.dbManager) return;

    try {
      const sharedData = await this.dbManager.getSharedData();
      const container = document.getElementById("fullSharedData");

      if (sharedData.length === 0) {
        container.innerHTML =
          "<p>Tidak ada data yang dibagikan dengan Anda.</p>";
        return;
      }

      let html = "";

      // Notes
      const sharedNotes = sharedData.filter((item) => item.dataType === "note");
      if (sharedNotes.length > 0) {
        html += "<h3>Catatan</h3>";
        html +=
          '<div class="table-container"><table class="table"><thead><tr><th>Judul</th><th>Kategori</th><th>Dari</th><th>Izin</th></tr></thead><tbody>';
        sharedNotes.forEach((note) => {
          html += `
                        <tr>
                            <td>${note.title}</td>
                            <td><span class="badge badge-info">${
                              note.category
                            }</span></td>
                            <td>${note.sharedBy}</td>
                            <td><span class="badge badge-${
                              note.permission === "view" ? "info" : "warning"
                            }">${
            note.permission === "view" ? "Lihat" : "Edit"
          }</span></td>
                        </tr>
                    `;
        });
        html += "</tbody></table></div>";
      }

      // Transactions
      const sharedTransactions = sharedData.filter(
        (item) => item.dataType === "transaction"
      );
      if (sharedTransactions.length > 0) {
        html += '<h3 style="margin-top: 30px;">Transaksi</h3>';
        html +=
          '<div class="table-container"><table class="table"><thead><tr><th>Deskripsi</th><th>Jumlah</th><th>Tipe</th><th>Dari</th><th>Izin</th></tr></thead><tbody>';
        sharedTransactions.forEach((trans) => {
          html += `
                        <tr>
                            <td>${trans.description}</td>
                            <td class="${
                              trans.type === "income"
                                ? "text-success"
                                : "text-danger"
                            }">
                                ${
                                  trans.type === "income" ? "+" : "-"
                                } ${formatCurrency(trans.amount)}
                            </td>
                            <td><span class="badge badge-${
                              trans.type === "income" ? "success" : "danger"
                            }">${
            trans.type === "income" ? "Pemasukan" : "Pengeluaran"
          }</span></td>
                            <td>${trans.sharedBy}</td>
                            <td><span class="badge badge-${
                              trans.permission === "view" ? "info" : "warning"
                            }">${
            trans.permission === "view" ? "Lihat" : "Edit"
          }</span></td>
                        </tr>
                    `;
        });
        html += "</tbody></table></div>";
      }

      // Travel Plans
      const sharedTravels = sharedData.filter(
        (item) => item.dataType === "travel"
      );
      if (sharedTravels.length > 0) {
        html += '<h3 style="margin-top: 30px;">Rencana Perjalanan</h3>';
        html +=
          '<div class="table-container"><table class="table"><thead><tr><th>Tujuan</th><th>Tanggal</th><th>Dari</th><th>Izin</th><th>Maps</th></tr></thead><tbody>';
        sharedTravels.forEach((travel) => {
          html += `
                        <tr>
                            <td>${travel.destination}</td>
                            <td>${formatDate(travel.startDate)} - ${formatDate(
            travel.endDate
          )}</td>
                            <td>${travel.sharedBy}</td>
                            <td><span class="badge badge-${
                              travel.permission === "view" ? "info" : "warning"
                            }">${
            travel.permission === "view" ? "Lihat" : "Edit"
          }</span></td>
                            <td>
                                ${
                                  travel.mapsLink
                                    ? `<a href="${travel.mapsLink}" target="_blank" class="maps-link-table">
                                        <i class="fas fa-map-marker-alt"></i> Maps
                                    </a>`
                                    : '<span class="text-muted">-</span>'
                                }
                            </td>
                        </tr>
                    `;
        });
        html += "</tbody></table></div>";
      }

      container.innerHTML = html;
    } catch (error) {
      console.error("Error loading full shared data:", error);
      document.getElementById("fullSharedData").innerHTML =
        '<p class="text-danger">Gagal memuat data yang dibagikan.</p>';
    }
  }

  updateSharedDataUI() {
    // Update badge di setiap item yang dibagikan
    this.sharedItems.forEach((item) => {
      const badge = document.querySelector(
        `[data-id="${item.id}"] .shared-badge`
      );
      if (!badge) {
        // Tambahkan badge jika belum ada
        const element = document.querySelector(`[data-id="${item.id}"]`);
        if (element) {
          const badge = document.createElement("span");
          badge.className = "shared-badge";
          badge.innerHTML = '<i class="fas fa-share-alt"></i> Dibagikan';
          element.appendChild(badge);
        }
      }
    });
  }

  capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  // Tambahkan tombol share di setiap row table
  addShareButtonsToTables() {
    // Notes table
    const notesTable = document.getElementById("notesTable");
    if (notesTable) {
      notesTable.querySelectorAll("tr").forEach((row) => {
        const actionCell = row.querySelector("td:last-child");
        if (actionCell && !actionCell.querySelector(".share-item-btn")) {
          const noteId = actionCell
            .querySelector(".edit-note")
            ?.getAttribute("data-id");
          if (noteId) {
            const shareBtn = document.createElement("button");
            shareBtn.className = "btn btn-sm btn-info share-item-btn";
            shareBtn.innerHTML = '<i class="fas fa-share-alt"></i>';
            shareBtn.setAttribute("data-id", noteId);
            shareBtn.addEventListener("click", () => {
              this.openShareModal("note", noteId);
            });
            actionCell.insertBefore(shareBtn, actionCell.firstChild);
          }
        }
      });
    }

    // Transactions table
    const transTable = document.getElementById("transactionsTable");
    if (transTable) {
      transTable.querySelectorAll("tr").forEach((row) => {
        const actionCell = row.querySelector("td:last-child");
        if (actionCell && !actionCell.querySelector(".share-item-btn")) {
          const transId = actionCell
            .querySelector(".edit-transaction")
            ?.getAttribute("data-id");
          if (transId) {
            const shareBtn = document.createElement("button");
            shareBtn.className = "btn btn-sm btn-info share-item-btn";
            shareBtn.innerHTML = '<i class="fas fa-share-alt"></i>';
            shareBtn.setAttribute("data-id", transId);
            shareBtn.addEventListener("click", () => {
              this.openShareModal("transaction", transId);
            });
            actionCell.insertBefore(shareBtn, actionCell.firstChild);
          }
        }
      });
    }

    // Travel table
    const travelTable = document.getElementById("travelTable");
    if (travelTable) {
      travelTable.querySelectorAll("tr").forEach((row) => {
        const actionCell = row.querySelector("td:last-child");
        if (actionCell && !actionCell.querySelector(".share-item-btn")) {
          const travelId = actionCell
            .querySelector(".edit-travel")
            ?.getAttribute("data-id");
          if (travelId) {
            const shareBtn = document.createElement("button");
            shareBtn.className = "btn btn-sm btn-info share-item-btn";
            shareBtn.innerHTML = '<i class="fas fa-share-alt"></i>';
            shareBtn.setAttribute("data-id", travelId);
            shareBtn.addEventListener("click", () => {
              this.openShareModal("travel", travelId);
            });
            actionCell.insertBefore(shareBtn, actionCell.firstChild);
          }
        }
      });
    }
  }
}

// Export untuk penggunaan global
window.SharingSystem = SharingSystem;
