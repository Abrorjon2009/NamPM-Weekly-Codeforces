async function fetchWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Fetch failed");
      return await res.json();
    } catch (e) {
      await new Promise(res => setTimeout(res, 500));
    }
  }
  return null;
}

function getLast7DaysTimestamp() {
  const now = new Date();
  return Math.floor((now.getTime() - 7 * 24 * 60 * 60 * 1000) / 1000);
}

function calculatePoints(rating) {
  return Math.max(0, Math.round(Math.pow((rating - 800) / 100.0, 1.5)));
}

async function getUserData(handle, fromTs) {
  const submissionsUrl = `https://codeforces.com/api/user.status?handle=${handle}&from=1&count=10000`;
  const infoUrl = `https://codeforces.com/api/user.info?handles=${handle}`;

  const [subsData, infoData] = await Promise.all([
    fetchWithRetry(submissionsUrl),
    fetchWithRetry(infoUrl),
  ]);

  if (!subsData || subsData.status !== "OK") return null;

  const solvedSet = new Set();
  let totalPoints = 0;

  for (const sub of subsData.result) {
    if (sub.verdict !== "OK" || sub.creationTimeSeconds < fromTs) continue;
    const key = `${sub.problem.contestId}-${sub.problem.index}`;
    if (solvedSet.has(key)) continue;
    solvedSet.add(key);
    const rating = sub.problem.rating || 800;
    totalPoints += calculatePoints(rating);
  }

  return {
    handle,
    solved: solvedSet.size,
    points: totalPoints,
    rating: infoData?.status === "OK" ? (infoData.result[0].rating || 800) : 800
  };
}

function renderTable(data, tableId) {
  const tbody = document.querySelector(`#${tableId} tbody`);
  tbody.innerHTML = "";
  data.forEach(user => {
    const row = document.createElement("tr");
    row.innerHTML = `<td>${user.handle}</td><td>${user.solved}</td><td>${user.points}</td>`;
    tbody.appendChild(row);
  });
}

async function main() {
  const loading = document.getElementById("loading");
  loading.style.display = "block";

  const res = await fetch("handles.json");
  const handles = await res.json();

  const fromTs = getLast7DaysTimestamp();

  const [div1, div2] = await Promise.all(["division1", "division2"].map(async div => {
    const users = await Promise.all(
      handles[div].map(h => getUserData(h, fromTs))
    );
    return users.filter(Boolean).sort((a, b) => b.points - a.points);
  }));

  renderTable(div1, "div1");
  renderTable(div2, "div2");

  loading.style.display = "none";
}

main();
