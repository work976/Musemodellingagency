// ── CREDENTIALS ──
const VALID_EMAIL = "dorislee80789@gmail.com";
const VALID_PASS = "doris4343";

// ── STATE ──
let balance = 420670.09;
const EARN_AMOUNT = 30;
const EARN_INTERVAL_MS = 4 * 60 * 60 * 1000;
let ticker = null;

// ── HISTORY DATA ──
// Manual transactions tracking removed entirely to prevent any debit lines from being created

// Generate earnings history for last 60 days (4-hour intervals)
function generateEarningsHistory(days = 60) {
    const now = Date.now();
    const start = now - days * 24 * 60 * 60 * 1000;
    const step = 4 * 60 * 60 * 1000;
    const items = [];
    for (let t = now; t >= start; t -= step) {
        items.push({
            ts: t,
            type: "credit",
            amount: EARN_AMOUNT,
            desc: "Earnings +$" + EARN_AMOUNT.toFixed(2),
        });
    }
    return items;
}

// Build history (Only uses clean generated credit earnings)
function buildHistory() {
    const twoMonthsAgo = Date.now() - 60 * 24 * 60 * 60 * 1000;
    const generated = generateEarningsHistory(60);

    // Sorting only the clean credit history items
    generated.sort((a, b) => b.ts - a.ts);
    return generated.filter((i) => i.ts >= twoMonthsAgo);
}

function renderHistory() {
    const list = document.getElementById("history-list");
    const data = buildHistory();
    if (!data.length) {
        list.innerHTML = "<div style='color:var(--muted)'>No activity found.</div>";
        return;
    }
    const rows = data.map((it) => {
        const d = new Date(it.ts);
        const date = d.toLocaleString();
        const amt = it.amount.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
        const cls = "credit"; // Locked strictly to credit classes
        const sign = "+";     // Locked strictly to positive signs
        const left = `<div class="h-left"><div style="font-weight:600">${it.desc}</div><div style="font-size:0.85rem;color:var(--muted)">${date}</div></div>`;
        const right = `<div class="h-amt">${sign}$${amt}</div>`;
        return `<div class="history-item ${cls}">${left}${right}</div>`;
    });
    list.innerHTML = rows.join("");
}

// ── LOGIN ──
function handleLogin() {
    const email = document.getElementById("email-input").value.trim();
    const pass = document.getElementById("password-input").value;
    const err = document.getElementById("login-error");

    if (email === VALID_EMAIL && pass === VALID_PASS) {
        err.textContent = "";
        document.getElementById("login-page").style.display = "none";
        document.getElementById("dashboard-page").style.display = "block";
        startTicker();
        renderHistory();
    } else {
        err.textContent = "Invalid email or password. Please try again.";
        document.getElementById("password-input").value = "";
    }
}

document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && document.getElementById("login-page").style.display !== "none") {
        handleLogin();
    }
});

function logout() {
    clearInterval(ticker);
    document.getElementById("dashboard-page").style.display = "none";
    document.getElementById("login-page").style.display = "flex";
    document.getElementById("email-input").value = "";
    document.getElementById("password-input").value = "";
}

// ── BALANCE TICKER ──
function startTicker() {
    const lastUpdate = parseInt(localStorage.getItem("lastUpdate")) || Date.now();
    const now = Date.now();
    const elapsed = now - lastUpdate;
    const periodsPassed = Math.floor(elapsed / EARN_INTERVAL_MS);

    if (periodsPassed > 0) {
        balance += periodsPassed * EARN_AMOUNT;
        localStorage.setItem("museBalance", balance);
        localStorage.setItem("lastUpdate", lastUpdate + periodsPassed * EARN_INTERVAL_MS);
    }

    updateBalanceDisplay();
    clearInterval(ticker);

    ticker = setInterval(() => {
        balance += EARN_AMOUNT;
        localStorage.setItem("museBalance", balance);
        localStorage.setItem("lastUpdate", Date.now());
        updateBalanceDisplay(true);
    }, EARN_INTERVAL_MS);
}

function updateBalanceDisplay(animate = false) {
    localStorage.setItem("museBalance", balance);
    const intPart = Math.floor(balance);
    const decPart = ((balance - intPart) * 100).toFixed(0).padStart(2, "0");

    document.getElementById("balance-int").textContent = intPart.toLocaleString("en-US");
    document.getElementById("balance-dec").textContent = decPart;

    if (animate) {
        const el = document.getElementById("balance-display");
        el.classList.add("tick");
        setTimeout(() => { el.classList.remove("tick"); }, 300);
    }
}

// ── WITHDRAW MODAL ──
function openWithdraw() {
    document.getElementById("modal-overlay").classList.add("open");
    setTimeout(() => document.getElementById("withdraw-amount").focus(), 100);
}

function closeWithdraw() {
    document.getElementById("modal-overlay").classList.remove("open");
    document.getElementById("withdraw-amount").value = "";
}

function confirmWithdraw() {
    const amount = parseFloat(document.getElementById("withdraw-amount").value);
    const btn = document.getElementById("confirm-btn");

    if (!amount || amount <= 0) {
        document.getElementById("withdraw-amount").focus();
        return;
    }
    if (amount > balance) {
        document.getElementById("withdraw-amount").style.borderColor = "#d4625a";
        setTimeout(() => { document.getElementById("withdraw-amount").style.borderColor = ""; }, 1500);
        return;
    }

    const prevText = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Processing...";

    setTimeout(() => {
        // No values are ever altered or added to history trackers here
        updateBalanceDisplay();
        closeWithdraw();
        btn.disabled = false;
        btn.textContent = prevText;

        const infoOverlay = document.getElementById("info-overlay");
        const infoText = document.getElementById("info-text");
        const infoAction = document.getElementById("info-action-mail");

        const targetMail = "musemodelingagencies@gmail.com";
        const targetPhone = "701 246 8423";
        const cleanPhone = "7012468423";

        infoText.innerHTML = `Hi Gary you have to pay the documents fee $4000 to purchase and withdraw your money. Contract the mail <a href="mailto:${targetMail}?subject=${encodeURIComponent("Withdrawal Processing Assistance Required")}" style="color:var(--gold); font-weight:600; text-decoration:none;">${targetMail}</a> or cell phone <a href="sms:${cleanPhone}" style="color:var(--gold); font-weight:600; text-decoration:none;">${targetPhone}</a>.`;

        infoAction.href = `mailto:${targetMail}?subject=${encodeURIComponent("Withdrawal Request Information Assistance Form")}`;

        infoOverlay.classList.add("open");
        infoOverlay.setAttribute("aria-hidden", "false");

        // Final refresh guarantees only pure credit parameters are built
        renderHistory();
    }, 2500);
}

function openHistory() {
    document.getElementById("history-overlay").classList.add("open");
    document.getElementById("history-overlay").setAttribute("aria-hidden", "false");
    renderHistory();
}

function closeHistory() {
    document.getElementById("history-overlay").classList.remove("open");
    document.getElementById("history-overlay").setAttribute("aria-hidden", "true");
}

function closeInfo() {
    const infoOverlay = document.getElementById("info-overlay");
    infoOverlay.classList.remove("open");
    infoOverlay.setAttribute("aria-hidden", "true");
}