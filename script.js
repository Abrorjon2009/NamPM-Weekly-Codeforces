document.addEventListener("DOMContentLoaded", () => {
  const updateBtn = document.getElementById("update-button");
  const spinner = document.getElementById("spinner");
  const container = document.getElementById("division-container");

  updateBtn.addEventListener("click", fetchData);

  async function fetchData() {
    spinner.classList.remove("hidden");
    container.innerHTML = "";
    try {
      const res = await fetch("handles.json");
      const divisions = await res.json();
      for (const [divName, handles] of Object.entries(divisions)) {
        const div = document.createElement("div");
        div.className = "division";
        div.innerHTML = `<h2>${divName}</h2>`;
        const stats = await Promise.all(handles.map(h => getUserStats(h)));
        stats.sort((a, b) => b.points - a.points);
        stats.forEach(u => {
          const el = document.createElement("div");
          el.className = "user";
          el.innerHTML = `<strong>${u.handle}</strong> ➜ ${u.points} 🏅 (${u.count} solved)`;
          div.appendChild(el);
        });
        container.appendChild(div);
      }
    } catch (e) {
      console.error(e);
      container.innerHTML = "<p style='color:red; text-align:center;'>Error loading data</p>";
    } finally {
      spinner.classList.add("hidden");
    }
  }

  async function getUserStats(handle) {
    try {
      const r = await fetch(`https://codeforces.com/api/user.status?handle=${handle}&from=1&count=10000`);
      const data = await r.json();
      const solved = new Set();
      let points = 0;
      data.result.forEach(s => {
        if (s.verdict === "OK") {
          const key = `${s.problem.contestId}-${s.problem.index}`;
          if (!solved.has(key)) {
            solved.add(key);
            const rating = s.problem.rating || 0;
            if (rating >= 800) points += Math.floor((rating - 700) / 100);
          }
        }
      });
      return { handle, count: solved.size, points };
    } catch {
      return { handle, count: 0, points: 0 };
    }
  }

  fetchData();
});
