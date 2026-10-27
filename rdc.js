(function () {
  const existing = document.getElementById("zepto-wms-light-dashboard");
  if (existing) existing.remove();

  const IMAGE_BASE_URL = "https://cdn.zeptonow.com/production/ik-seo/tr:w-400,h-400,cm-pad_resize/";

  const API_CONFIG = {
    authorization: "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJmMWMwZTQ2Zi03OTc2LTQ1NDktODU4My0yNDJjZDNhODJmNDUiLCJyb2xlSWRzIjpbXSwicm9sZUlkIjoiZjJjYzQ1ZTctZjkyNy00ZThlLWFkZTEtY2U1Y2M0ODI4MGVjIiwiaHR0cHM6Ly9oYXN1cmEuaW8vand0L2NsYWltcyI6eyJ4LWhhc3VyYS1kZWZhdWx0LXJvbGUiOiJEZWZhdWx0IiwieC1oYXN1cmEtYWxsb3dlZC1yb2xlcyI6WyJEZWZhdWx0Il19LCJyb2xlTmFtZSI6IklCICYgT0IgTWFuYWdlciIsImVtYWlsSWQiOiJleHQtaXNodmFyaS5rdW1hckB6ZXB0b25vdy5jb20iLCJhcHBsaWNhdGlvbklkIjoiZGI4YzZjYTgtNmVhOS00YTRiLWEzYjItYzZlM2Q2YzljNTFjIiwiY2F0ZWdvcnkiOiJNb3RoZXIgSHViIiwiZXhwIjoxNzkzMTg2NTg1LCJ1c2VySWQiOiJmMWMwZTQ2Zi03OTc2LTQ1NDktODU4My0yNDJjZDNhODJmNDUiLCJpYXQiOjE3OTMxMDAxODV9.hQTlNmzHeSyTcTTIhUGwjXhB7j9-ddzS6RIq0LGNms8",
    cityId: "bb5bb05a-5c71-4038-b342-4f1aab72d9a6",
    instanceId: "MH",
    locationId: "dfd4d259-b44b-42dd-82bc-1bae2e8a57d2"
  };

  let csvRecords = [];
  const skuDataCache = {};
  let lastSearchedEan = "";

  // Completed LPNs status tracking
  let processedLpns = JSON.parse(localStorage.getItem("zepto_processed_lpns") || "{}");

  function buildFullImageUrl(rawImage) {
    if (!rawImage) return null;
    if (rawImage.startsWith("http://") || rawImage.startsWith("https://")) return rawImage;
    const cleanPath = rawImage.replace(/^\/+/, "");
    return `https://cdn.zeptonow.com/${cleanPath}`;
  }

  function parseEanList(rawEan) {
    if (!rawEan) return [];
    return rawEan
      .replace(/[\[\]]/g, "")
      .split(",")
      .map(e => e.trim().replace(/^0+/, ""))
      .filter(e => e.length > 0);
  }

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  async function fetchSkuBinLotDetails(skuCode) {
    if (skuDataCache[skuCode]) return skuDataCache[skuCode];

    try {
      const res = await fetch(`https://thor.zepto.co.in/api/inventory-view/sku-bin-lot?pageNo=0&pageSize=13&skuCode=${encodeURIComponent(skuCode)}`, {
        headers: {
          "accept": "application/json",
          "accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
          "authorization": API_CONFIG.authorization,
          "priority": "u=1, i",
          "x-city-id": API_CONFIG.cityId,
          "x-instance-id": API_CONFIG.instanceId,
          "x-location-id": API_CONFIG.locationId
        },
        referrer: "https://wms-ui.zepto.co.in/",
        body: null,
        method: "GET",
        mode: "cors",
        credentials: "include"
      });

      const json = await res.json();
      if (json?.data && json.data.length > 0) {
        const item = json.data[0];
        const extracted = {
          skuCode: item.skuCode || skuCode,
          skuDescription: item.skuDescription || "",
          formattedPackSize: item.formattedPackSize || "",
          image: buildFullImageUrl(item.image),
          bin: item.bin || "-",
          mrp: item.mrp ? (item.mrp / 100).toFixed(2) : "-"
        };
        skuDataCache[skuCode] = extracted;
        return extracted;
      }
    } catch (err) {
      console.warn("sku-bin-lot API error for SKU:", skuCode, err);
    }
    return null;
  }

  const appContainer = document.createElement("div");
  appContainer.id = "zepto-wms-light-dashboard";
  appContainer.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-color: #e8eef9;
    z-index: 99999999;
    display: flex;
    flex-direction: column;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #1e293b;
    box-sizing: border-box;
    overflow: hidden;
    position: relative;
  `;

  const blobSvg = `
    <svg style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 0; opacity: 0.85;" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" viewBox="0 0 1440 900">
      <path fill="#d2e3fc" d="M1080,180 C1220,120 1380,240 1440,380 L1440,0 L960,0 C980,60 1020,150 1080,180 Z"></path>
      <path fill="#e0f2fe" d="M-60,420 C60,320 220,380 280,500 C340,620 240,780 120,840 C-20,890 -100,780 -120,680 Z"></path>
      <path fill="#ede9fe" d="M720,700 C860,620 1040,680 1160,780 C1280,880 1180,940 1020,950 C880,960 760,920 680,840 C640,790 660,730 720,700 Z"></path>
      <path fill="#ffe4e6" d="M420,110 C510,40 640,80 700,160 C760,240 700,320 610,340 C520,360 410,330 380,250 C360,190 380,140 420,110 Z" opacity="0.6"></path>
    </svg>
  `;

  appContainer.innerHTML = `
    ${blobSvg}

    <!-- Top Bar -->
    <header style="position: relative; z-index: 10; background: rgba(255, 255, 255, 0.88); backdrop-filter: blur(16px); border-bottom: 2px solid #e2e8f0; padding: 10px 24px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 15px rgba(0,0,0,0.04);">
      <div style="display: flex; align-items: center; gap: 12px;">
        <span style="background: linear-gradient(90deg, #ef4444 0%, #2563eb 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-weight: 900; font-size: 20px; letter-spacing: 0.5px;">
          ⚡ ZEPTOWMS RADAR
        </span>
        <span id="csv-status-tag" style="font-size: 12px; font-weight: 600; color: #475569; background: #ffffff; padding: 4px 12px; border-radius: 20px; border: 1px solid #cbd5e1;">
          No CSV Loaded
        </span>
        <span id="queue-status-tag" style="font-size: 12px; font-weight: 700; color: #2563eb; display: none; background: #eff6ff; padding: 4px 10px; border-radius: 12px; border: 1px solid #bfdbfe;">
          ⏳ Loading...
        </span>
      </div>

      <div style="display: flex; align-items: center; gap: 8px;">
        <input type="file" id="csv-picker-input" accept=".csv" style="display: none;" />
        <button id="btn-upload-file" style="background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #fff; border: none; padding: 7px 14px; border-radius: 7px; font-size: 12px; font-weight: 700; cursor: pointer;">
          📂 Upload CSV
        </button>
        <!-- Download Local Store Data Button -->
        <button id="btn-download-csv" style="background: linear-gradient(135deg, #059669, #10b981); color: #fff; border: none; padding: 7px 14px; border-radius: 7px; font-size: 12px; font-weight: 700; cursor: pointer; box-shadow: 0 2px 6px rgba(16,185,129,0.3);">
          📥 Export Status CSV
        </button>
        <button id="btn-clear-storage" style="background: #fff1f2; color: #e11d48; border: 1px solid #fda4af; padding: 7px 12px; border-radius: 7px; font-size: 12px; font-weight: 700; cursor: pointer;">
          🗑️ Clear CSV
        </button>
        <button id="btn-close-dash" style="background: #fee2e2; color: #ef4444; border: 1px solid #fca5a5; padding: 7px 12px; border-radius: 7px; font-weight: 800; cursor: pointer;">
          ✕ Exit
        </button>
      </div>
    </header>

    <!-- Scanner Bar -->
    <div style="position: relative; z-index: 10; background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(10px); padding: 10px 24px; border-bottom: 1px solid #e2e8f0; display: flex; gap: 12px; align-items: center;">
      <input type="text" id="scanner-input" autofocus placeholder="Scan Barcode / Type EAN and hit Enter..." 
        style="flex: 1; padding: 10px 16px; font-size: 15px; font-weight: 500; background: #ffffff; border: 2px solid #3b82f6; border-radius: 8px; color: #0f172a; outline: none;" />

      <div style="display: flex; align-items: center; gap: 6px;">
        <label for="sku-count-filter" style="font-size: 13px; font-weight: 700; color: #1e293b;">Filter:</label>
        <select id="sku-count-filter" style="padding: 9px 12px; font-size: 13px; font-weight: 700; background: #ffffff; color: #2563eb; border: 2px solid #3b82f6; border-radius: 8px; outline: none; cursor: pointer;">
          <option value="all">All LPNs</option>
          <option value="1">1 SKU Only</option>
          <option value="2">2 SKUs Only</option>
          <option value="3">3 SKUs Only</option>
          <option value="4+">4+ SKUs</option>
        </select>
      </div>

      <button id="btn-search-trigger" style="background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; padding: 10px 22px; border-radius: 8px; font-size: 14px; font-weight: 800; cursor: pointer;">
        🔍 Search
      </button>
    </div>

    <!-- Mobile Deck Stage -->
    <main id="scanner-results-area" style="position: relative; z-index: 5; flex: 1; overflow-x: auto; overflow-y: hidden; padding: 20px 24px; display: flex; gap: 24px; align-items: stretch;">
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; color: #64748b; font-size: 16px;">
        <div style="font-size: 48px; margin-bottom: 10px;">📱</div>
        Pehle <b>Upload CSV</b> karke Barcode scan ya type kijiye.
      </div>
    </main>

    <!-- Full Screen Hover Zoom Modal -->
    <div id="full-image-preview-modal" style="
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(8px);
      z-index: 100000000;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      pointer-events: none;
    ">
      <div style="background: #ffffff; padding: 16px; border-radius: 18px; box-shadow: 0 25px 70px rgba(0,0,0,0.5); max-width: 85vw; max-height: 85vh; display: flex; flex-direction: column; align-items: center;">
        <img id="preview-modal-img" src="" referrerpolicy="no-referrer" style="max-width: 75vw; max-height: 70vh; object-fit: contain; border-radius: 10px;" />
        <div id="preview-modal-title" style="margin-top: 12px; font-size: 15px; font-weight: 800; color: #0f172a; text-align: center; max-width: 650px;"></div>
      </div>
    </div>
  `;

  document.body.appendChild(appContainer);

  const barcodeInput = document.getElementById("scanner-input");
  const uploadBtn = document.getElementById("btn-upload-file");
  const downloadBtn = document.getElementById("btn-download-csv");
  const filePicker = document.getElementById("csv-picker-input");
  const closeBtn = document.getElementById("btn-close-dash");
  const searchBtn = document.getElementById("btn-search-trigger");
  const clearStorageBtn = document.getElementById("btn-clear-storage");
  const resultsArea = document.getElementById("scanner-results-area");
  const statusTag = document.getElementById("csv-status-tag");
  const queueStatusTag = document.getElementById("queue-status-tag");
  const filterSelect = document.getElementById("sku-count-filter");

  const hoverModal = document.getElementById("full-image-preview-modal");
  const modalImg = document.getElementById("preview-modal-img");
  const modalTitle = document.getElementById("preview-modal-title");

  window.showFullImageHover = function (imgSrc, title) {
    if (!imgSrc) return;
    modalImg.src = imgSrc;
    modalTitle.textContent = title || "";
    hoverModal.style.display = "flex";
  };

  window.hideFullImageHover = function () {
    hoverModal.style.display = "none";
    modalImg.src = "";
  };

  // Process / Complete LPN Handler
  window.toggleLpnProcess = function (lpn) {
    const isCompleted = processedLpns[lpn] === "COMPLETED";
    const newStatus = isCompleted ? "PENDING" : "COMPLETED";
    
    if (newStatus === "COMPLETED") {
      processedLpns[lpn] = "COMPLETED";
    } else {
      delete processedLpns[lpn];
    }
    
    localStorage.setItem("zepto_processed_lpns", JSON.stringify(processedLpns));

    const card = document.getElementById(`mobile-card-${lpn}`);
    const btn = document.getElementById(`process-btn-${lpn}`);
    const body = document.getElementById(`mobile-body-${lpn}`);

    if (card && btn && body) {
      if (newStatus === "COMPLETED") {
        card.style.borderColor = "#10b981";
        card.style.boxShadow = "0 16px 36px rgba(16, 185, 129, 0.25)";
        body.style.background = "#ecfdf5";
        btn.innerHTML = "✅ COMPLETED";
        btn.style.background = "#10b981";
        btn.style.color = "#ffffff";
      } else {
        card.style.borderColor = "#1e293b";
        card.style.boxShadow = "0 16px 36px rgba(0, 0, 0, 0.08)";
        body.style.background = "#f8fafc";
        btn.innerHTML = "⚡ Process LPN";
        btn.style.background = "#ffffff";
        btn.style.color = "#0f172a";
      }
    }
  };

  closeBtn.onclick = () => appContainer.remove();
  uploadBtn.onclick = () => filePicker.click();

  // Export updated records to CSV
  downloadBtn.onclick = () => {
    if (!csvRecords.length) {
      alert("Koi CSV data load nahi hai export karne ke liye.");
      return;
    }

    const headers = Object.keys(csvRecords[0]);
    if (!headers.includes("Status")) {
      headers.push("Status");
    }

    const csvRows = [headers.join(",")];

    csvRecords.forEach(item => {
      const row = headers.map(header => {
        let val = "";
        if (header === "Status") {
          val = processedLpns[item["lpn"]] === "COMPLETED" ? "COMPLETED" : "PENDING";
        } else {
          val = item[header] || "";
        }
        val = String(val).replace(/"/g, '""');
        return `"${val}"`;
      });
      csvRows.push(row.join(","));
    });

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `WMS_Inventory_Status_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Clear Uploaded CSV Storage
  clearStorageBtn.onclick = () => {
    if (confirm("Kya aap uploaded CSV data delete karna chahte hain?")) {
      localStorage.removeItem("zepto_csv_storage_data");
      csvRecords = [];
      lastSearchedEan = "";
      filePicker.value = "";
      statusTag.textContent = "No CSV Loaded";
      statusTag.style.color = "#475569";
      statusTag.style.borderColor = "#cbd5e1";
      statusTag.style.background = "#ffffff";
      resultsArea.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; color: #64748b; font-size: 16px;">
          <div style="font-size: 48px; margin-bottom: 10px;">🗑️</div>
          CSV data delete ho gaya hai.
        </div>`;
    }
  };

  filePicker.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      csvRecords = parseCSV(event.target.result);
      localStorage.setItem("zepto_csv_storage_data", JSON.stringify(csvRecords));
      updateStatusDisplay(csvRecords.length, file.name);
    };
    reader.readAsText(file);
  };

  const localCache = localStorage.getItem("zepto_csv_storage_data");
  if (localCache) {
    try {
      csvRecords = JSON.parse(localCache);
      updateStatusDisplay(csvRecords.length, "Saved Cache");
    } catch (e) {
      console.error(e);
    }
  }

  function updateStatusDisplay(count, source) {
    statusTag.textContent = `🟢 ${count} Rows (${source})`;
    statusTag.style.color = "#16a34a";
    statusTag.style.borderColor = "#bbf7d0";
    statusTag.style.background = "#f0fdf4";
  }

  function parseCSV(text) {
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
    if (lines.length < 2) return [];

    const headers = parseCSVTokens(lines[0]).map(h => h.trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const row = parseCSVTokens(lines[i]);
      if (row.length === headers.length) {
        const item = {};
        headers.forEach((h, idx) => {
          item[h] = row[idx].trim();
        });
        data.push(item);
      }
    }
    return data;
  }

  function parseCSVTokens(line) {
    const result = [];
    let insideQuote = false;
    let entry = "";
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' && (i === 0 || line[i - 1] !== '\\')) {
        insideQuote = !insideQuote;
      } else if (char === ',' && !insideQuote) {
        result.push(entry);
        entry = "";
      } else {
        entry += char;
      }
    }
    result.push(entry);
    return result;
  }

  filterSelect.onchange = () => {
    if (lastSearchedEan) {
      performScanSearch();
    }
  };

  async function performScanSearch() {
    const rawVal = barcodeInput.value.trim().replace(/^0+/, "");
    if (!rawVal) return;
    lastSearchedEan = rawVal;

    if (!csvRecords.length) {
      resultsArea.innerHTML = `
        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 24px; text-align: center; color: #dc2626; width: 100%;">
          ⚠️ CSV upload nahi hai. Kripya pehle CSV file upload karein.
        </div>`;
      return;
    }

    const matchedRows = csvRecords.filter(row => {
      const eans = parseEanList(row["EAN"]);
      return eans.some(ean => ean === rawVal || ean.includes(rawVal));
    });

    if (matchedRows.length === 0) {
      resultsArea.innerHTML = `
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 32px; text-align: center; width: 100%; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
          <h2 style="color: #ef4444; margin-top: 0; font-size: 20px;">❌ EAN Not Found</h2>
          <p style="color: #64748b; font-size: 15px;">Barcode <b>${barcodeInput.value}</b> CSV file ke kisi bhi LPN me nahi mila.</p>
        </div>`;
      barcodeInput.select();
      return;
    }

    let relatedLpns = [...new Set(matchedRows.map(r => r["lpn"]))];

    const selectedFilter = filterSelect.value;
    if (selectedFilter !== "all") {
      relatedLpns = relatedLpns.filter(lpn => {
        const count = csvRecords.filter(r => r["lpn"] === lpn).length;
        if (selectedFilter === "1") return count === 1;
        if (selectedFilter === "2") return count === 2;
        if (selectedFilter === "3") return count === 3;
        if (selectedFilter === "4+") return count >= 4;
        return true;
      });
    }

    if (relatedLpns.length === 0) {
      resultsArea.innerHTML = `
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 32px; text-align: center; width: 100%; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
          <h2 style="color: #d97706; margin-top: 0; font-size: 18px;">⚠️ Filter Match Empty</h2>
          <p style="color: #64748b; font-size: 14px;">EAN <b>${barcodeInput.value}</b> mila, par selected filter (<b>${selectedFilter} SKU</b>) ke mutabik koi LPN nahi hai.</p>
        </div>`;
      barcodeInput.select();
      return;
    }

    const skusToFetch = [];
    let mobileDeckHtml = "";

    for (const lpn of relatedLpns) {
      const itemsInThisLpn = csvRecords.filter(r => r["lpn"] === lpn);
      const totalUnitsInLpn = itemsInThisLpn.reduce((acc, curr) => acc + (parseInt(curr["totalQuantity"]) || 0), 0);
      const isCompleted = processedLpns[lpn] === "COMPLETED";

      mobileDeckHtml += `
        <div id="mobile-card-${lpn}" style="
          width: 380px; 
          min-width: 380px; 
          background: #ffffff; 
          border-radius: 28px; 
          border: 4px solid ${isCompleted ? '#10b981' : '#1e293b'}; 
          box-shadow: ${isCompleted ? '0 16px 36px rgba(16, 185, 129, 0.25)' : '0 16px 36px rgba(0, 0, 0, 0.08)'}; 
          display: flex; 
          flex-direction: column; 
          overflow: hidden; 
          height: calc(100vh - 180px);
          transition: all 0.3s ease;
        ">
          <!-- Notch -->
          <div style="background: #1e293b; height: 18px; display: flex; justify-content: center; align-items: center;">
            <div style="width: 45px; height: 4px; background: #475569; border-radius: 10px;"></div>
          </div>

          <!-- Header -->
          <div style="background: linear-gradient(135deg, #ef4444 0%, #2563eb 100%); color: white; padding: 12px 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <span style="font-weight: 900; font-size: 15px; letter-spacing: 0.5px;">📦 ${lpn}</span>
              <span style="background: rgba(255,255,255,0.25); font-size: 12px; font-weight: 800; padding: 2px 8px; border-radius: 12px;">
                Qty: ${totalUnitsInLpn}
              </span>
            </div>
            <div style="font-size: 12px; opacity: 0.95; display: flex; justify-content: space-between;">
              <span>Zone: <b>${itemsInThisLpn[0]["zone"] || "-"}</b></span>
              <span>Default Bin: <b style="background: #ffffff; color: #dc2626; padding: 1px 6px; border-radius: 4px;">${itemsInThisLpn[0]["bin"] || "-"}</b></span>
            </div>
          </div>

          <!-- Body (Changes to light green #ecfdf5 on process) -->
          <div id="mobile-body-${lpn}" style="flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 12px; background: ${isCompleted ? '#ecfdf5' : '#f8fafc'}; transition: background 0.3s ease;">
      `;

      for (const item of itemsInThisLpn) {
        const itemEans = parseEanList(item["EAN"]);
        const isMatchedTarget = itemEans.some(e => e === rawVal || e.includes(rawVal));
        const sku = item["skuCode"];
        const sanitizedDesc = (item["skuDescription"] || "").replace(/'/g, "\\'");

        if (sku && !skusToFetch.includes(sku)) {
          skusToFetch.push(sku);
        }

        mobileDeckHtml += `
          <div style="
            background: #ffffff; 
            border-radius: 14px; 
            border: ${isMatchedTarget ? '2px solid #ef4444' : '1px solid #e2e8f0'}; 
            padding: 10px; 
            box-shadow: ${isMatchedTarget ? '0 4px 14px rgba(239, 68, 68, 0.16)' : '0 2px 6px rgba(0,0,0,0.03)'};
            display: flex; 
            flex-direction: column; 
            gap: 8px;
          ">
            <div style="display: flex; gap: 10px; align-items: center;">
              <div class="img-box-${sku}" 
                   data-desc="${sanitizedDesc}"
                   onmouseenter="if(this.querySelector('img')) window.showFullImageHover(this.querySelector('img').src, this.getAttribute('data-desc'))"
                   onmouseleave="window.hideFullImageHover()"
                   style="width: 72px; height: 72px; min-width: 72px; border-radius: 10px; background: #ffffff; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: center; overflow: hidden; cursor: zoom-in;">
                ${skuDataCache[sku]?.image 
                  ? `<img src="${skuDataCache[sku].image}" referrerpolicy="no-referrer" style="width: 100%; height: 100%; object-fit: contain;" />` 
                  : `<span style="font-size: 11px; color: #94a3b8;">⏳ Wait...</span>`}
              </div>

              <div style="flex: 1; min-width: 0;">
                <div style="font-size: 13px; font-weight: 800; color: #0f172a; line-height: 1.3; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;" title="${item["skuDescription"]}">
                  ${item["skuDescription"] || "-"}
                </div>

                <div class="pack-size-${sku}" style="font-size: 11px; font-weight: 600; color: #475569; margin-top: 2px;">
                  Size: <span style="color: #2563eb;">${skuDataCache[sku]?.formattedPackSize || "..."}</span>
                </div>

                <div style="display: flex; align-items: center; gap: 6px; margin-top: 4px;">
                  <span class="mrp-tag-${sku}" style="background: #f1f5f9; color: #0f172a; font-size: 11px; font-weight: 800; padding: 2px 6px; border-radius: 5px; border: 1px solid #cbd5e1;">
                    MRP: ₹${skuDataCache[sku]?.mrp || "..."}
                  </span>
                  <span style="background: #fee2e2; color: #ef4444; font-size: 11px; font-weight: 900; padding: 2px 7px; border-radius: 5px;">
                    QTY: ${item["totalQuantity"] || 0}
                  </span>
                  ${isMatchedTarget ? `<span style="background: #ef4444; color: #fff; font-size: 9px; font-weight: 900; padding: 2px 5px; border-radius: 4px;">MATCHED</span>` : ''}
                </div>
              </div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; padding: 5px 8px; border-radius: 8px; font-size: 11px; border: 1px dashed #cbd5e1;">
              <span style="color: #64748b;">SKU: <b style="color: #0f172a;">${item["skuCode"] ? item["skuCode"].substring(0, 8) + '...' : '-'}</b></span>
              <span style="color: #64748b;">API Bin: <b class="live-bin-${sku}" style="color: #2563eb;">${skuDataCache[sku]?.bin || "..."}</b></span>
            </div>
          </div>
        `;
      }

      // Process Action Button Bar at Bottom of Mobile Screen
      mobileDeckHtml += `
          </div>
          <div style="padding: 10px 14px; background: #ffffff; border-top: 1px solid #e2e8f0; display: flex; justify-content: center;">
            <button id="process-btn-${lpn}" 
                    onclick="window.toggleLpnProcess('${lpn}')" 
                    style="
                      width: 100%; 
                      padding: 10px; 
                      border-radius: 10px; 
                      font-size: 13px; 
                      font-weight: 800; 
                      cursor: pointer; 
                      border: 2px solid #10b981; 
                      background: ${isCompleted ? '#10b981' : '#ffffff'}; 
                      color: ${isCompleted ? '#ffffff' : '#0f172a'}; 
                      transition: all 0.2s ease;
                      box-shadow: 0 2px 6px rgba(0,0,0,0.06);
                    ">
              ${isCompleted ? '✅ COMPLETED' : '⚡ Process LPN'}
            </button>
          </div>
        </div>
      `;
    }

    resultsArea.innerHTML = mobileDeckHtml;
    barcodeInput.select();

    // Queue for SKU data
    queueStatusTag.style.display = "inline-block";

    let completed = 0;
    for (const sku of skusToFetch) {
      queueStatusTag.textContent = `⏳ Loading (${completed + 1}/${skusToFetch.length})`;

      const data = await fetchSkuBinLotDetails(sku);

      if (data) {
        const imgBoxes = document.querySelectorAll(`.img-box-${sku}`);
        imgBoxes.forEach(el => {
          if (data.image) {
            el.innerHTML = `
              <img src="${data.image}" 
                   referrerpolicy="no-referrer"
                   style="width: 100%; height: 100%; object-fit: contain; pointer-events: none;" 
                   onerror="this.onerror=null; this.src='https://cdn.zeptonow.com/production/ik-seo/tr:w-400,h-400,cm-pad_resize/${data.image.split('zeptonow.com/')[1] || ''}';" />
            `;
          } else {
            el.innerHTML = `<span style="font-size: 10px; color: #94a3b8;">No Img</span>`;
          }
        });

        const packSizeElements = document.querySelectorAll(`.pack-size-${sku}`);
        packSizeElements.forEach(el => {
          el.innerHTML = `Size: <span style="color: #2563eb;">${data.formattedPackSize || "-"}</span>`;
        });

        const mrpElements = document.querySelectorAll(`.mrp-tag-${sku}`);
        mrpElements.forEach(el => {
          el.textContent = `MRP: ₹${data.mrp}`;
        });

        const binElements = document.querySelectorAll(`.live-bin-${sku}`);
        binElements.forEach(el => {
          el.textContent = data.bin;
        });
      }

      completed++;
      await sleep(100);
    }

    queueStatusTag.textContent = `✅ Complete (${skusToFetch.length} SKUs)`;
    queueStatusTag.style.color = "#16a34a";
    setTimeout(() => {
      queueStatusTag.style.display = "none";
    }, 3000);
  }

  barcodeInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") performScanSearch();
  });
  searchBtn.onclick = performScanSearch;
})();
