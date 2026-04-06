// Parses raw WhatsApp group chat export text into structured event objects.
// Supported formats: regular messages, standard system updates (joins, adds, group creations).

const Parser = (() => {
  // groups: [1]=date string  [2]=time string  [3]=rest of line
  const LINE_REGEX = /^(\d{1,2}\/\d{1,2}\/\d{2,4}),\s+(\d{1,2}:\d{2}\s*[APM]{2})\s+-\s+(.+)$/;

  // patterns for identifying events
  const JOIN_REGEX    = /^(.+?)\s+joined using this group(?:'|')s invite link$/i;
  const ADDED_REGEX   = /^(.+?)\s+added\s+(.+)$/i;
  const CREATED_REGEX = /^(.+?)\s+created group\s+"(.+)"$/i;
  const SYSTEM_KEYWORDS = [
    "end-to-end encrypted",
    "security code",
    "messages and calls are",
    "this message was deleted",
    "you were removed",
    "tap to learn more",
    "<media omitted>",
  ];

  // normalizes standard date strings into YYYY-MM-DD
  function parseDateKey(dateStr) {
    const parts = dateStr.split("/");
    const month = parseInt(parts[0], 10);
    const day   = parseInt(parts[1], 10);
    let   year  = parseInt(parts[2], 10);
    if (year < 100) year += 2000;
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  // checks if the line is just a typical whatsapp system message
  function isSystemText(text) {
    const lower = text.toLowerCase();
    return SYSTEM_KEYWORDS.some(kw => lower.includes(kw));
  }

  // classifies event from a single line and extracts relevant data
  function classifyEvent(dateKey, rest) {
    // join events
    const joinMatch = JOIN_REGEX.exec(rest);
    if (joinMatch) {
      return { type: "join", actor: joinMatch[1].trim(), dateKey };
    }

    // someone added a member
    const addedMatch = ADDED_REGEX.exec(rest);
    if (addedMatch) {
      return {
        type: "added",
        actor: addedMatch[1].trim(),
        target: addedMatch[2].trim(),
        dateKey,
      };
    }

    // group creations
    const createdMatch = CREATED_REGEX.exec(rest);
    if (createdMatch) {
      return { type: "created", actor: createdMatch[1].trim(), dateKey };
    }

    // fallback for pure system messages
    if (isSystemText(rest)) {
      return { type: "system", actor: "", dateKey };
    }

    // normal messages
    const colonIdx = rest.indexOf(": ");
    if (colonIdx !== -1) {
      const sender  = rest.substring(0, colonIdx).trim();
      const message = rest.substring(colonIdx + 2).trim();

      // filter out typical dropped/deleted messages
      if (isSystemText(message)) {
        return { type: "deleted", actor: sender, dateKey };
      }
      return { type: "message", actor: sender, message, dateKey };
    }

    // completely unrecognized system message
    return { type: "system", actor: "", dateKey };
  }

  function parse(rawText) {
    const lines  = rawText.split(/\r?\n/);
    const events = [];
    let   currentEvent = null;

    for (const line of lines) {
      const lineMatch = LINE_REGEX.exec(line);

      if (lineMatch) {
        // flush last multiline if needed
        if (currentEvent) events.push(currentEvent);

        const dateKey = parseDateKey(lineMatch[1]);
        const rest    = lineMatch[3].trim();
        currentEvent  = classifyEvent(dateKey, rest);
      } else if (currentEvent && line.trim()) {
        // multi-line message append
        if (currentEvent.type === "message") {
          currentEvent.message = (currentEvent.message || "") + "\n" + line.trim();
        }
      }
    }

    // flush any remaining event
    if (currentEvent) events.push(currentEvent);

    return events;
  }

  return { parse };
})();
