// ─────────────────────────────
// AUTH CREDENTIALS (demo only)
// ─────────────────────────────
const VALID_EMAIL = "dorislee80789@gmail.com";
const VALID_PASS = "doris4343";

// ─────────────────────────────
// STATE
// ─────────────────────────────
let balance = parseFloat(localStorage.getItem("balance")) || 421210;
let ledger = JSON.parse(localStorage.getItem("ledger")) || [];
let ticker = null;

const EARN_AMOUNT = 30;
const EARN_INTERVAL_MS = 4 * 60 * 60 * 1000;

// ─────────────────────────────
// PERSISTENCE
// ─────────────────────────────
function saveState() {
    localStorage.setItem("balance", balance);
    localStorage.setItem("ledger", JSON.stringify(ledger));
}

function setLoggedIn(state) {
    localStorage.setItem("isLoggedIn", state ? "true" : "false");
}

// ─────────────────────────────
// LEDGER
// ─────────────────────────────
function addTransaction(type, amount, desc) {
    // Disable debit entries entirely — only credits are recorded in the ledger
    if (type === "debit") return;

    ledger.push({
        id: crypto.randomUUID(),
        ts: Date.now(),
        type,
        amount,
        desc
    });
    saveState();
}

function getHistory() {
    return [...ledger].sort((a, b) => b.ts - a.ts);
}

function seedDemoHistory() {
    // Only seed if ledger is empty (first run)
    if (ledger.length) return;

    const now = Date.now();
    const sixMonthsMs = 182 * 24 * 60 * 60 * 1000; // ~6 months
    const start = now - sixMonthsMs;

    const periods = Math.floor((now - start) / EARN_INTERVAL_MS);
    let totalCredits = 0;

    for (let i = 0; i <= periods; i++) {
        const ts = start + i * EARN_INTERVAL_MS;
        // Add a credit for each earning cycle
        ledger.push({
            id: crypto.randomUUID(),
            ts,
            type: "credit",
            amount: EARN_AMOUNT,
            desc: "Auto earnings"
        });
        totalCredits += EARN_AMOUNT;
    }

    // Do not modify the visible/current balance here —
    // keep current balance at the default (421,210). Ledger shows demo credits only.

    // Mark lastUpdate as now so ticker doesn't re-add these past earnings
    localStorage.setItem("lastUpdate", now.toString());

    saveState();
}

function renderHistory() {
    const list = document.getElementById("history-list");
    // Only show credit transactions in the history view
    const data = getHistory().filter(tx => tx.type === "credit");

    if (!data.length) {
        list.innerHTML = "<div style='color:var(--muted)'>No activity found.</div>";
        return;
    }

    list.innerHTML = data.map(tx => {
        const date = new Date(tx.ts).toLocaleString();
        const sign = tx.type === "credit" ? "+" : "-";

        return `
            <div class="history-item ${tx.type}">
                <div class="h-left">
                    <div style="font-weight:600">${tx.desc}</div>
                    <div style="font-size:0.85rem;color:var(--muted)">${date}</div>
                </div>
                <div class="h-amt">
                    ${sign}$${tx.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </div>
            </div>
        `;
    }).join("");
}

// ─────────────────────────────
// LOGIN
// ─────────────────────────────
function handleLogin() {
    const email = document.getElementById("email-input").value.trim();
    const pass = document.getElementById("password-input").value;
    const err = document.getElementById("login-error");

    if (email === VALID_EMAIL && pass === VALID_PASS) {
        err.textContent = "";

        setLoggedIn(true);

        document.getElementById("login-page").style.display = "none";
        document.getElementById("dashboard-page").style.display = "block";

        startTicker();
        updateBalanceDisplay();
        renderHistory();
    } else {
        err.textContent = "Invalid email or password.";
        document.getElementById("password-input").value = "";
    }
}

// Enter key support
document.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleLogin();
});

function logout() {
    clearInterval(ticker);
    setLoggedIn(false);

    document.getElementById("dashboard-page").style.display = "none";
    document.getElementById("login-page").style.display = "flex";

    document.getElementById("email-input").value = "";
    document.getElementById("password-input").value = "";
}

// ─────────────────────────────
// AUTO RESTORE SESSION
// ─────────────────────────────
window.addEventListener("load", () => {
    const loggedIn = localStorage.getItem("isLoggedIn") === "true";

    // Seed demo 6 month history on first run (only if ledger empty)
    seedDemoHistory();

    if (loggedIn) {
        document.getElementById("login-page").style.display = "none";
        document.getElementById("dashboard-page").style.display = "block";

        startTicker();
        updateBalanceDisplay();
        renderHistory();
    } else {
        document.getElementById("login-page").style.display = "flex";
        document.getElementById("dashboard-page").style.display = "none";
    }
});

// ─────────────────────────────
// BALANCE + EARNINGS
// ─────────────────────────────
function startTicker() {
    const lastUpdate = parseInt(localStorage.getItem("lastUpdate")) || Date.now();
    const now = Date.now();

    const elapsed = now - lastUpdate;
    const periods = Math.floor(elapsed / EARN_INTERVAL_MS);

    if (periods > 0) {
        const earned = periods * EARN_AMOUNT;

        balance += earned;

        addTransaction(
            "credit",
            earned,
            `Auto earnings (${periods} cycles)`
        );

        localStorage.setItem("lastUpdate", lastUpdate + periods * EARN_INTERVAL_MS);
        saveState();

        // Ensure history UI reflects these added earnings
        renderHistory();
    }

    updateBalanceDisplay();

    clearInterval(ticker);

    ticker = setInterval(() => {
        balance += EARN_AMOUNT;

        addTransaction(
            "credit",
            EARN_AMOUNT,
            "Scheduled earnings"
        );

        localStorage.setItem("lastUpdate", Date.now());
        updateBalanceDisplay(true);

        // Update history UI as money is added over time
        renderHistory();
    }, EARN_INTERVAL_MS);
}

function updateBalanceDisplay(animate = false) {
    const intPart = Math.floor(balance);
    const decPart = ((balance - intPart) * 100).toFixed(0).padStart(2, "0");

    document.getElementById("balance-int").textContent =
        intPart.toLocaleString("en-US");

    document.getElementById("balance-dec").textContent = decPart;

    if (animate) {
        const el = document.getElementById("balance-display");
        el.classList.add("tick");
        setTimeout(() => el.classList.remove("tick"), 300);
    }
}

// ─────────────────────────────
// WITHDRAW
// ─────────────────────────────
function confirmWithdraw() {
    const amount = parseFloat(document.getElementById("withdraw-amount").value);
    const btn = document.getElementById("confirm-btn");

    if (!amount || amount <= 0) return;

    if (amount > balance) {
        alert("Insufficient balance");
        return;
    }

    btn.disabled = true;
    btn.textContent = "Processing...";

    setTimeout(() => {
        balance -= amount;

        // Debit entries are disabled — do not add a ledger transaction for withdrawals
        // addTransaction("debit", amount, "Withdrawal");

        saveState();
        updateBalanceDisplay();
        renderHistory();

        closeWithdraw();

        btn.disabled = false;
        btn.textContent = "Confirm Withdrawal";
    }, 1200);
}

// ─────────────────────────────
// MODALS
// ─────────────────────────────
function openWithdraw() {
    document.getElementById("modal-overlay").classList.add("open");
}

function closeWithdraw() {
    document.getElementById("modal-overlay").classList.remove("open");
    document.getElementById("withdraw-amount").value = "";
}

function openHistory() {
    document.getElementById("history-overlay").classList.add("open");
    renderHistory();
}

function closeHistory() {
    document.getElementById("history-overlay").classList.remove("open");
}
