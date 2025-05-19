const usernames = [
    // ... your handles here ...
];

function calculatePoints(rating) {
    return Math.round(Math.pow((rating - 800) / 100.0, 1.5));
}

function getLast7DaysTimestamp() {
    const now = new Date();
    return now.getTime() / 1000 - 7 * 24 * 60 * 60;
}

async function fetchSubmissions(handle) {
    const url = `https://codeforces.com/api/user.status?handle=${handle}`;
    for (let i = 0; i < 10; i++) {
        try {
            const response = await fetch(url);
            const data = await response.json();
            if (data.status === "OK") return data.result;
        } catch (e) {
            await new Promise(r => setTimeout(r, 500));
        }
    }
    return null;
}

async function loadUserData(handle) {
    const submissions = await fetchSubmissions(handle);
    if (!submissions) return null;

    const solvedSet = new Set();
    const last7Days = getLast7DaysTimestamp();

    for (const sub of submissions) {
        if (sub.verdict === "OK" && sub.creationTimeSeconds >= last7Days) {
            solvedSet.add(sub.problem.contestId + '-' + sub.problem.index);
        }
    }

    const userInfoRes = await fetch(`https://codeforces.com/api/user.info?handles=${handle}`);
    const userInfoData = await userInfoRes.json();
    const rating = userInfoData.status === "OK" ? userInfoData.result[0].rating || 800 : 800;

    const points = solvedSet.size * calculatePoints(rating);

    return {
        handle,
        solved: solvedSet.size,
        points
    };
}

async function main() {
    const usersData = await Promise.all(usernames.map(loadUserData));

    usersData.sort((a, b) => (b?.points || 0) - (a?.points || 0));

    const container = document.getElementById("standings");
    usersData.forEach(user => {
        if (!user) return;
        const div = document.createElement("div");
        div.textContent = `${user.handle} → ${user.points} 🏅 (${user.solved} solved)`;
        container.appendChild(div);
    });
}

main();
