// Return timestamp of exactly 7 days ago
function sevenDaysAgoTs() {
  return Math.floor(Date.now()/1000) - 7*24*3600;
}

// Build a cache‑busting URL for CF API calls
function makeApiUrl(handle) {
  return `https://codeforces.com/api/user.status?handle=${handle}&from=1&count=10000&_=${Date.now()}`;
}

document.addEventListener("DOMContentLoaded", () => {
  const btn   = document.getElementById("update-button");
  const spin  = document.getElementById("spinner");
  const  cont = document.getElementById("division-container");

  btn.addEventListener("click", fetchData);
  fetchData();

  async function fetchData() {
    spin.classList.remove("hidden");
    cont.innerHTML = "";
    const sinceTs = sevenDaysAgoTs();

    try {
      const res = await fetch("./handles.json");
      const divs = await res.json();

      for (const [name, handles] of Object.entries(divs)) {
        const box = document.createElement("div");
        box.className = "division";
        box.innerHTML = `<h2>${name}</h2>`;

        // fetch stats with retry
        const stats = await Promise.all(handles.map(h => retryFetch(h, sinceTs)));
        stats.sort((a,b) => b.points - a.points);

        stats.forEach(({handle, count, points}) => {
          const el = document.createElement("div");
          el.className = "user";
          el.innerHTML = `<strong>${handle}</strong> ➜ ${points} 🏅 (${count} solved)`;
          box.appendChild(el);
        });

        cont.appendChild(box);
      }

    } catch (e) {
      console.error(e);
      cont.innerHTML = "<p style='color:red;'>Error loading data</p>";
    } finally {
      spin.classList.add("hidden");
    }
  }

  async function retryFetch(handle, sinceTs, tries=2) {
    try {
      const r    = await fetch(makeApiUrl(handle));
      const data = await r.json();
      const seen = new Set();
      let pts    = 0;
      data.result.forEach(s => {
        if (s.verdict==="OK" && s.creationTimeSeconds>=sinceTs && s.problem.rating) {
          const id = `${s.problem.contestId}-${s.problem.index}`;
          if (!seen.has(id)) {
            seen.add(id);
            // new formula: (rating-800)/100 ^1.5
            const x = (s.problem.rating - 800)/100;
            pts += Math.round(Math.pow(x, 1.5));
          }
        }
      });
      return { handle, count: seen.size, points: pts };
    } catch (e) {
      if (tries>0) return retryFetch(handle, sinceTs, tries-1);
      return { handle, count: 0, points: 0 };
    }
  }
});
