// LocalStorage keys
const STORAGE_KEY = "cf_handles";

function getHandles() {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
        try {
            return JSON.parse(data);
        } catch {
            return { division1: [], division2: [] };
        }
    } else {
        return { division1: [], division2: [] };
    }
}

function saveHandles(handles) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(handles));
}

function getStartOfWeekTimestamp() {
    const now = new Date();
    const day = now.getUTCDay(); // 0 (Sun) to 6
    const diff = (day + 6) % 7; // days since Monday
    const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - diff));
    monday.setUTCHours(0, 0, 0, 0);
    return Math.floor(monday.getTime() / 1000);
}

async function fetchSolved(handles) {
    const startTs = getStartOfWeekTimestamp();
    const stats = [];
    for (const h of handles) {
        try {
            const res = await fetch(`https://codeforces.com/api/user.status?handle=${h}&from=1&count=10000`);
            const data = await res.json();
            if (data.status !== "OK") { stats.push([h, 0]); continue; }
            const solvedSet = new Set();
            for (const s of data.result) {
                if (s.verdict === "OK" && s.creationTimeSeconds >= startTs) {
                    solvedSet.add(`${s.problem.contestId}-${s.problem.index}`);
                }
            }
            stats.push([h, solvedSet.size]);
        } catch {
            stats.push([h, 0]);
        }
    }
    return stats.sort((a, b) => b[1] - a[1]);
}

function renderTable(bodyId, stats, division) {
    const tbody = document.getElementById(bodyId);
    tbody.innerHTML = "";
    if (stats.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3">No handles</td></tr>`;
    } else {
        for (const [h, cnt] of stats) {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${h}</td>
                <td>${cnt}</td>
                <td><button class="remove-btn" data-handle="${h}" data-division="${division}">❌ Remove</button></td>
            `;
            tbody.appendChild(row);
        }
    }
    // Attach remove listeners
    document.querySelectorAll(`#${bodyId} .remove-btn`).forEach(btn => {
        btn.addEventListener("click", () => {
            const handle = btn.getAttribute("data-handle");
            const division = btn.getAttribute("data-division");
            const handles = getHandles();
            handles[division] = handles[division].filter(h => h !== handle);
            saveHandles(handles);
            loadData();
        });
    });
}

async function loadData() {
    const handlesObj = getHandles();
    const [div1Stats, div2Stats] = await Promise.all([
        fetchSolved(handlesObj.division1),
        fetchSolved(handlesObj.division2)
    ]);
    renderTable("div1-body", div1Stats, "division1");
    renderTable("div2-body", div2Stats, "division2");
}

window.onload = () => {
    // Initial load
    loadData();

    // Add handle form
    document.getElementById("add-form").addEventListener("submit", (e) => {
        e.preventDefault();
        const handle = document.getElementById("handle-input").value.trim();
        const division = document.getElementById("division-select").value;
        if (!handle) return;
        const handles = getHandles();
        if (!handles[division].includes(handle)) {
            handles[division].push(handle);
            saveHandles(handles);
            loadData();
        }
        document.getElementById("handle-input").value = "";
    });

    // Update stats button
    document.getElementById("update-button").addEventListener("click", () => {
        loadData();
    });
};