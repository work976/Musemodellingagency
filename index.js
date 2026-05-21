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

    // ONLY save credits
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

    // Seed only once
    if (ledger.length) return;

    const now = Date.now();
    const sixMonthsMs = 182 * 24 * 60 * 60 * 1000;

    const start = now - sixMonthsMs;

    const periods = Math.floor(
        (now - start) / EARN_INTERVAL_MS
    );

    for (let i = 0; i <= periods; i++) {

        const ts = start + i * EARN_INTERVAL_MS;

        ledger.push({
            id: crypto.randomUUID(),
            ts,
            type: "credit",
            amount: EARN_AMOUNT,
            desc: "Auto earnings"
        });
    }

    localStorage.setItem("lastUpdate", now.toString());

    saveState();
}

function renderHistory() {

    const list = document.getElementById("history-list");

    const data = getHistory().filter(
        tx => tx.type === "credit"
    );

    if (!data.length) {

        list.innerHTML =
            "<div style='color:var(--muted)'>No activity found.</div>";

        return;
    }

    list.innerHTML = data.map(tx => {

        const date = new Date(tx.ts).toLocaleString();

        return `
            <div class="history-item credit">
                <div class="h-left">
                    <div style="font-weight:600">${tx.desc}</div>
                    <div style="font-size:0.85rem;color:var(--muted)">
                        ${date}
                    </div>
                </div>

                <div class="h-amt">
                    +$${tx.amount.toLocaleString("en-US", {
            minimumFractionDigits: 2
        })}
                </div>
            </div>
        `;
    }).join("");
}

// ─────────────────────────────
// LOGIN
// ─────────────────────────────
function handleLogin() {

    const email =
        document.getElementById("email-input").value.trim();

    const pass =
        document.getElementById("password-input").value;

    const err =
        document.getElementById("login-error");

    if (
        email === VALID_EMAIL &&
        pass === VALID_PASS
    ) {

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

// ENTER KEY LOGIN
document.addEventListener("keydown", (e) => {

    if (e.key === "Enter") {
        handleLogin();
    }
});

// ─────────────────────────────
// LOGOUT
// ─────────────────────────────
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

    // ─────────────────────────────
    // ONE-TIME BALANCE RESET
    // ─────────────────────────────
    const hasReset =
        localStorage.getItem("balanceResetDone");

    if (!hasReset) {

        // RESET ONLY BALANCE
        balance = 421210;

        localStorage.setItem(
            "balance",
            balance
        );

        // Restart timer from current time
        localStorage.setItem(
            "lastUpdate",
            Date.now().toString()
        );

        // Prevent future resets
        localStorage.setItem(
            "balanceResetDone",
            "true"
        );
    }

    // ─────────────────────────────
    // LOGIN RESTORE
    // ─────────────────────────────
    const loggedIn =
        localStorage.getItem("isLoggedIn") === "true";

    // Seed history once
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

    const lastUpdate =
        parseInt(localStorage.getItem("lastUpdate")) ||
        Date.now();

    const now = Date.now();

    const elapsed = now - lastUpdate;

    const periods = Math.floor(
        elapsed / EARN_INTERVAL_MS
    );

    // OFFLINE EARNINGS
    if (periods > 0) {

        const earned = periods * EARN_AMOUNT;

        balance += earned;

        addTransaction(
            "credit",
            earned,
            `Auto earnings (${periods} cycles)`
        );

        localStorage.setItem(
            "lastUpdate",
            (
                lastUpdate +
                periods * EARN_INTERVAL_MS
            ).toString()
        );

        saveState();

        renderHistory();
    }

    updateBalanceDisplay();

    clearInterval(ticker);

    // LIVE EARNINGS
    ticker = setInterval(() => {

        balance += EARN_AMOUNT;

        addTransaction(
            "credit",
            EARN_AMOUNT,
            "Scheduled earnings"
        );

        localStorage.setItem(
            "lastUpdate",
            Date.now().toString()
        );

        updateBalanceDisplay(true);

        renderHistory();

    }, EARN_INTERVAL_MS);
}

// ─────────────────────────────
// BALANCE DISPLAY
// ─────────────────────────────
function updateBalanceDisplay(animate = false) {

    const intPart = Math.floor(balance);

    const decPart = Math.round(
        (balance - intPart) * 100
    )
        .toString()
        .padStart(2, "0");

    const intEl =
        document.getElementById("balance-int");

    const decEl =
        document.getElementById("balance-dec");

    if (intEl) {
        intEl.textContent =
            intPart.toLocaleString("en-US");
    }

    if (decEl) {
        decEl.textContent = decPart;
    }

    if (animate) {

        const el =
            document.getElementById("balance-display");

        if (el) {

            el.classList.add("flash");

            setTimeout(() => {
                el.classList.remove("flash");
            }, 800);
        }
    }
}

// ─────────────────────────────
// WITHDRAW
// ─────────────────────────────
function openWithdraw() {

    const modal =
        document.getElementById("modal-overlay");

    const amtEl =
        document.getElementById("withdraw-amount");

    if (!modal) return;

    if (amtEl) amtEl.value = "";

    modal.style.display = "flex";
}

function confirmWithdraw() {

    const amtEl =
        document.getElementById("withdraw-amount");

    const btn =
        document.getElementById("confirm-btn");

    if (!amtEl) return;

    const raw =
        (amtEl.value || "")
            .toString()
            .replace(/,/g, "")
            .trim();

    const amount = parseFloat(raw);

    if (!amount || amount <= 0) return;

    if (amount > balance) {

        alert("Insufficient balance");

        return;
    }

    if (btn) {

        btn.disabled = true;

        btn.textContent = "Processing...";
    }

    setTimeout(() => {

        // DO NOT DEDUCT BALANCE

        updateBalanceDisplay(false);

        renderHistory();

        closeWithdraw();

        const infoOverlay =
            document.getElementById("info-overlay");

        const infoText =
            document.getElementById("info-text");

        if (infoText) {

            infoText.innerHTML = `
                Hey — you must pay the documents fee
                <strong>$4,000</strong>
                to purchase and withdraw your money.

                <br/><br/>

                Email:
                <strong>
                    musemodelingagencies@gmail.com
                </strong>

                <br/>

                Phone:
                <strong>
                    701 246 8423
                </strong>
            `;
        }

        if (infoOverlay) {
            infoOverlay.style.display = "flex";
        }

        if (btn) {

            btn.disabled = false;

            btn.textContent =
                "Confirm Withdrawal";
        }

    }, 900);
}

// ─────────────────────────────
// CLOSE MODALS
// ─────────────────────────────
function closeWithdraw() {

    const modal =
        document.getElementById("modal-overlay");

    const amtEl =
        document.getElementById("withdraw-amount");

    if (amtEl) amtEl.value = "";

    if (modal) modal.style.display = "none";
}

function closeInfo() {

    const infoOverlay =
        document.getElementById("info-overlay");

    if (infoOverlay) {
        infoOverlay.style.display = "none";
    }
}

// ─────────────────────────────
// HISTORY MODAL
// ─────────────────────────────
function openHistory() {

    const overlay =
        document.getElementById("history-overlay");

    if (overlay) {
        overlay.style.display = "flex";
    }

    renderHistory();
}

function closeHistory() {

    const overlay =
        document.getElementById("history-overlay");

    if (overlay) {
        overlay.style.display = "none";
    }
}

// Enforce withdraw input to accept only digits and commas
(function attachWithdrawInputFilter() {
    const init = () => {
        const el = document.getElementById("withdraw-amount");
        if (!el) return;

        const sanitize = (val) => {
            // keep only digits and commas
            let v = (val || "").toString().replace(/[^0-9,]/g, "");
            // collapse consecutive commas to a single comma
            v = v.replace(/,{2,}/g, ",");
            // remove leading commas
            v = v.replace(/^,+/g, "");
            return v;
        };

        el.addEventListener("input", (e) => {
            const cleaned = sanitize(e.target.value);
            if (cleaned !== e.target.value) e.target.value = cleaned;
        });

        el.addEventListener("paste", (e) => {
            e.preventDefault();
            const text = (e.clipboardData || window.clipboardData).getData("text") || "";
            e.target.value = sanitize(text);
        });
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
