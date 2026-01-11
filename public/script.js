let supabaseClient;
let currentUser = null;
let pendingData = []; // Buffer for eventual consistency
let autoSyncInterval = null;
let countdownTimer = null;
let nextSyncTime = 0;

function showError(message) {
    const errorDiv = document.getElementById('error-message');
    errorDiv.style.display = 'block';
    errorDiv.innerText = message;
    console.error(message);
}

async function init() {
    try {
        if (!window.supabase) {
            const msg = 'Library Supabase gagal dimuat. Cek koneksi internet Anda.';
            alert(msg);
            showError(msg);
            return;
        }

        const response = await fetch('/config');
        if (!response.ok) throw new Error(`Failed to fetch config: ${response.status}`);
        const config = await response.json();
        
        if (!config.supabaseUrl || !config.supabaseKey || config.supabaseUrl.includes('your-project')) {
            const msg = 'Konfigurasi .env belum benar. Pastikan SUPABASE_URL dan SUPABASE_KEY sudah diisi.';
            alert(msg);
            showError(msg);
            return;
        }

        supabaseClient = window.supabase.createClient(config.supabaseUrl, config.supabaseKey);
        console.log("Supabase initialized successfully");

        const urlParams = new URLSearchParams(window.location.search);
        const userParam = urlParams.get('user');
        if (userParam) {
            document.getElementById('username').value = userParam;
            setUser();
        }
     } catch (err) {
         const msg = 'Initialization error: ' + err.message;
         alert(msg);
         showError(msg);
     }
 }

async function setUser() {
    console.log("setUser called");
    const usernameInput = document.getElementById('username');
    if (!usernameInput.value) {
        alert("Masukkan nama Node/Server!");
        return;
    }
    
    if (!supabaseClient) {
        alert('Supabase belum siap.');
        return;
    }

    currentUser = usernameInput.value;
    console.log("Setting user to:", currentUser);
    
    document.getElementById('user-info').style.display = 'none';
    document.getElementById('current-user').style.display = 'block';
    document.getElementById('user-display').innerText = currentUser;
    document.getElementById('main-app').style.display = 'block';

    const newUrl = `${window.location.pathname}?user=${currentUser}`;
    window.history.pushState({path: newUrl}, '', newUrl);

    loadData();
    subscribeToChanges();
    
    // Start auto-sync simulation (every 30 seconds by default)
    startAutoSync(30); 
}

function logout() {
    window.location.href = window.location.pathname;
}

// --- SIMULATION HELPERS ---

function setScenario(type) {
    const nameInput = document.getElementById('item-name');
    const priceInput = document.getElementById('item-price');
    const radioStrong = document.getElementById('radio-strong');
    const radioEventual = document.getElementById('radio-eventual');
    const repSettings = document.getElementById('replication-settings');

    if (type === 'gold') {
        nameInput.value = "Emas Antam 1g";
        priceInput.value = "1150000";
        radioStrong.checked = true;
        repSettings.style.display = 'none';
        alert("Skenario 1: Harga Emas.\nMode: Strong Consistency.\nData akan langsung muncul di server lain.");
    } else if (type === 'shipping') {
        nameInput.value = "Ongkir JNE (JKT-SBY)";
        priceInput.value = "15000";
        radioEventual.checked = true;
        repSettings.style.display = 'block';
        alert("Skenario 2: Biaya Ongkir.\nMode: Eventual Consistency.\nData akan pending dulu, baru sync otomatis nanti.");
    }
}

function updateSyncInterval() {
    const val = parseInt(document.getElementById('sync-interval').value);
    if (val && val > 0) {
        startAutoSync(val);
        alert(`Interval Replikasi diubah jadi ${val} detik.`);
    }
}

// --- CORE LOGIC: Immediate vs Eventual ---

function startAutoSync(seconds) {
    if (autoSyncInterval) clearInterval(autoSyncInterval);
    if (countdownTimer) clearInterval(countdownTimer);

    // Set next sync time
    nextSyncTime = Date.now() + (seconds * 1000);

    // Update timer UI every second
    countdownTimer = setInterval(() => {
        const now = Date.now();
        const diff = Math.ceil((nextSyncTime - now) / 1000);
        
        const timerDisplay = document.getElementById('timer-display');
        if (diff > 0) {
            timerDisplay.innerText = `Auto-Sync in: ${diff}s`;
        } else {
            timerDisplay.innerText = "Syncing...";
        }
    }, 1000);

    // Actual sync trigger
    autoSyncInterval = setInterval(() => {
        if (pendingData.length > 0) {
            console.log("Auto-sync triggered");
            forceSync();
        }
        nextSyncTime = Date.now() + (seconds * 1000);
    }, seconds * 1000);
}

async function submitData() {
    const nameInput = document.getElementById('item-name');
    const priceInput = document.getElementById('item-price');
    const consistencyMode = document.querySelector('input[name="consistency"]:checked').value;

    const itemName = nameInput.value;
    const itemPrice = priceInput.value;

    if (!itemName || !itemPrice) {
        alert("Mohon isi Nama Barang dan Harga");
        return;
    }

    const payload = {
        item: itemName,
        price: itemPrice,
        mode: consistencyMode,
        timestamp: new Date().toISOString()
    };

    // Construct the message string to match existing DB schema
    // We store JSON string in 'content' to keep it structured
    const contentString = JSON.stringify(payload);

    if (consistencyMode === 'strong') {
        // STRONG CONSISTENCY: Send directly to Cloud
        const { error } = await supabaseClient
            .from('transactions')
            .insert({
                sender: currentUser,
                content: contentString,
                sent_at: new Date().toISOString()
            });

        if (error) {
            alert('Gagal update cloud: ' + error.message);
        } else {
            // Success
            nameInput.value = '';
            priceInput.value = '';
        }
    } else {
        // EVENTUAL CONSISTENCY: Store Locally First
        const localItem = {
            id: 'local-' + Date.now(),
            sender: currentUser,
            content: contentString,
            sent_at: new Date().toISOString() // Local time
        };
        
        pendingData.push(localItem);
        renderPendingList();
        
        // Show pending section
        document.getElementById('pending-section').style.display = 'block';
        
        // Clear input
        nameInput.value = '';
        priceInput.value = '';
    }
}

async function forceSync() {
    if (pendingData.length === 0) return;

    // Send all pending items to cloud
    const itemsToPush = pendingData.map(item => ({
        sender: item.sender,
        content: item.content, // Already JSON string
        sent_at: new Date().toISOString() // Sync time
    }));

    const { error } = await supabaseClient
        .from('transactions')
        .insert(itemsToPush);

    if (error) {
        alert("Sync Gagal: " + error.message);
    } else {
        console.log("Sync Success:", itemsToPush.length, "items pushed.");
        pendingData = []; // Clear local buffer
        renderPendingList();
        document.getElementById('pending-section').style.display = 'none';
    }
}

function renderPendingList() {
    const list = document.getElementById('pending-list');
    list.innerHTML = '';
    
    pendingData.forEach(item => {
        const data = JSON.parse(item.content);
        const li = document.createElement('li');
        li.innerHTML = `
            <strong>${data.item}</strong> - Rp ${data.price} 
            <span style="color:orange; margin-left:10px;">(Pending...)</span>
        `;
        list.appendChild(li);
    });
}

// --- DISPLAY & REALTIME ---

async function loadData() {
    if (!supabaseClient) return;
    
    const { data: transactions, error } = await supabaseClient
        .from('transactions')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(50); // Limit to last 50

    if (error) {
        console.error('Error loading data:', error);
        return;
    }

    const tableBody = document.getElementById('log-body');
    tableBody.innerHTML = '';
    
    transactions.forEach(tx => {
        addTransactionToTable(tx);
    });
}

function subscribeToChanges() {
    supabaseClient
        .channel('public:transactions')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions' }, payload => {
            console.log('New update received:', payload.new);
            addTransactionToTable(payload.new);
        })
        .subscribe();
}

function addTransactionToTable(tx) {
    const tableBody = document.getElementById('log-body');
    if (document.getElementById(`row-${tx.id}`)) return;

    let item = "Unknown";
    let price = "0";
    let mode = "unknown";

    // Try parsing content
    try {
        if (tx.content.startsWith('{')) {
            const data = JSON.parse(tx.content);
            item = data.item;
            price = data.price;
            mode = data.mode === 'strong' ? 'Immediate (Strong)' : 'Delayed (Eventual)';
        } else {
            // Legacy/Plain text fallback
            item = tx.content;
            mode = "Legacy";
        }
    } catch (e) {
        item = tx.content;
    }

    const row = document.createElement('tr');
    row.id = `row-${tx.id}`;
    
    const sentTime = new Date(tx.sent_at).toLocaleTimeString();
    
    // Highlight own rows
    if (tx.sender === currentUser) {
        row.style.backgroundColor = "#e8f8f5";
    }

    row.innerHTML = `
        <td class="timestamp">${sentTime}</td>
        <td><strong>${tx.sender}</strong></td>
        <td>${item}</td>
        <td>Rp ${price}</td>
        <td>
            <span class="badge ${mode.includes('Immediate') ? 'badge-strong' : 'badge-eventual'}">
                ${mode}
            </span>
        </td>
    `;
    
    tableBody.insertBefore(row, tableBody.firstChild);
}

init();
