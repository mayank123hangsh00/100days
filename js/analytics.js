// analytics.js
// Derives metrics from parsed WhatsApp chat events.
// Exported object: Analytics -> getMetrics(events)

const Analytics = (() => {
  // get exactly 7 sequential calendar days ending on the most recent message day
  function getLast7SequentialDays(allDateKeys) {
    if (allDateKeys.length === 0) return [];
    const lastDateStr = allDateKeys[allDateKeys.length - 1];
    const lastDate = new Date(lastDateStr + "T00:00:00");
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(lastDate);
      d.setDate(d.getDate() - i);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      days.push(iso);
    }
    return days;
  }

  // format YYYY-MM-DD to "Mon Apr 5"
  function formatLabel(dateKey) {
    const d = new Date(dateKey + "T00:00:00"); // keep local date stable
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }

  // compute main analytics
  function getMetrics(events) {
    // grab unique dates
    const allDateKeys = [...new Set(events.map(e => e.dateKey))].sort();

    // window selection
    const last7Days = getLast7SequentialDays(allDateKeys);
    const daySet    = new Set(last7Days);

    // track new users (joined / added) per day
    //    A user is "new" if they joined or were added.
    //    We deduplicate per person so one user joining on the same day counts once.
    const newUsersPerDay = {}; // dateKey → Set of actor/target names
    last7Days.forEach(d => { newUsersPerDay[d] = new Set(); });

    // track messaging per user per day
    //    userActivity[user][dateKey] = true  (sent at least 1 message)
    const userActivity = {}; // actor → Set of dateKeys

    // count total messages for stats card
    let totalMessages = 0;

    for (const ev of events) {
      if (!daySet.has(ev.dateKey)) continue;

      if (ev.type === "join" && ev.actor) {
        newUsersPerDay[ev.dateKey].add(ev.actor);
      }

      if (ev.type === "added" && ev.target) {
        // The target was added — count them as the "new user"
        newUsersPerDay[ev.dateKey].add(ev.target);
      }

      if (ev.type === "message" && ev.actor) {
        if (!userActivity[ev.actor]) userActivity[ev.actor] = new Set();
        userActivity[ev.actor].add(ev.dateKey);
        totalMessages++;
      }
    }

    // format aligned arrays
    const dailyNewUsers    = last7Days.map(d => newUsersPerDay[d].size);
    const dailyActiveUsers = last7Days.map(d => {
      // count users who sent ≥ 1 message on this day
      return Object.values(userActivity).filter(days => days.has(d)).length;
    });

    // identify users active >= 4 days in window
    const highlyActiveUsers = Object.entries(userActivity)
      .map(([name, days]) => {
        const activeDays = [...days].filter(d => daySet.has(d)).length;
        return { name, activeDays };
      })
      .filter(u => u.activeDays >= 4)
      .sort((a, b) => b.activeDays - a.activeDays);

    // aggregate general stats
    const totalUsers = Object.keys(userActivity).length;

    // Peak active day
    let peakCount = 0;
    let peakDay   = "";
    dailyActiveUsers.forEach((count, i) => {
      if (count > peakCount) {
        peakCount = count;
        peakDay   = last7Days[i];
      }
    });

    const labels = last7Days.map(formatLabel);

    return {
      last7Days,
      labels,
      dailyNewUsers,
      dailyActiveUsers,
      highlyActiveUsers,
      totalMessages,
      totalUsers,
      peakDay: peakDay ? formatLabel(peakDay) : "N/A",
      peakCount,
    };
  }

  return { getMetrics, formatLabel };
})();
