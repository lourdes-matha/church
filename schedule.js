document.addEventListener("DOMContentLoaded", async () => {
    const sheetUrl =
        "https://docs.google.com/spreadsheets/d/e/2PACX-1vSbJkXx468_CZPB3G46WklY1cc_lmT2dyzqItejHDyiywc5k8DeJDIbmtBCHWk9C4x1jru6Nys2Dy2V/pub?gid=0&single=true&output=csv";

    const container = document.getElementById("weekly-events");
    const heading = document.getElementById("schedule-week");
    if (!container || !heading) return;

    container.textContent = "Loading the weekly schedule…";

    // Handles commas, quotation marks and line breaks inside cells.
    function parseCSV(text) {
        const rows = [];
        let row = [];
        let cell = "";
        let quoted = false;

        text = text.replace(/^\uFEFF/, "");

        for (let i = 0; i < text.length; i++) {
            const character = text[i];

            if (character === '"') {
                if (quoted && text[i + 1] === '"') {
                    cell += '"';
                    i++;
                } else {
                    quoted = !quoted;
                }
            } else if (character === "," && !quoted) {
                row.push(cell);
                cell = "";
            } else if (
                (character === "\n" || character === "\r") &&
                !quoted
            ) {
                if (character === "\r" && text[i + 1] === "\n") i++;
                row.push(cell);
                rows.push(row);
                row = [];
                cell = "";
            } else {
                cell += character;
            }
        }

        row.push(cell);
        if (row.some(value => value.trim())) rows.push(row);
        return rows;
    }

    function parseDate(value) {
        const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!match) return null;

        const date = new Date(Date.UTC(
            Number(match[1]),
            Number(match[2]) - 1,
            Number(match[3])
        ));

        return date.toISOString().slice(0, 10) === value.trim()
            ? date
            : null;
    }

    function mondayOf(date) {
        const monday = new Date(date);
        const offset = (monday.getUTCDay() + 6) % 7;
        monday.setUTCDate(monday.getUTCDate() - offset);
        return monday.toISOString().slice(0, 10);
    }

    function formatDate(date, options) {
        return new Intl.DateTimeFormat("en-CA", {
            ...options,
            timeZone: "UTC"
        }).format(date);
    }

    function formatTime(value) {
        const match = value.trim().match(
            /^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i
        );
        if (!match) return value;

        let hour = Number(match[1]);
        const minute = match[2];
        const period = match[3]?.toUpperCase();

        if (Number(minute) > 59) return value;
        if (period && (hour < 1 || hour > 12)) return value;
        if (!period && hour > 23) return value;

        if (period) hour = hour % 12 + (period === "PM" ? 12 : 0);

        return `${hour % 12 || 12}:${minute} ${hour >= 12 ? "PM" : "AM"}`;
    }

    function element(tag, className, text) {
        const node = document.createElement(tag);
        node.className = className;
        node.textContent = text;
        return node;
    }

    try {
        const response = await fetch(sheetUrl, { cache: "no-store" });
        if (!response.ok) throw new Error("Sheet could not be loaded.");

        const rows = parseCSV(await response.text());
        const headers = rows.shift()?.map(value => value.trim()) || [];
        const required = ["Date", "Time", "Event", "Details", "Responsibility"];

        if (!required.every(name => headers.includes(name))) {
            throw new Error("The sheet headings do not match.");
        }

        const events = rows.map(row => {
            const record = {};
            headers.forEach((name, index) => {
                record[name] = (row[index] || "").trim();
            });
            record.date = parseDate(record.Date || "");
            return record;
        }).filter(record => record.date && record.Event)
          .sort((a, b) => a.Date.localeCompare(b.Date));

        // Use Windsor's date, regardless of the visitor's timezone.
        const parts = new Intl.DateTimeFormat("en-CA", {
            timeZone: "America/Toronto",
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        }).formatToParts(new Date());

        const todayParts = Object.fromEntries(
            parts.map(part => [part.type, part.value])
        );

        const today = parseDate(
            `${todayParts.year}-${todayParts.month}-${todayParts.day}`
        );
        // Upcoming events can be on any row in the sheet.
const upcomingEvents = events.filter(event =>
    (event.Category || "").trim().toLowerCase() === "upcoming" &&
    event.date >= today
);

const upcomingSection = document.getElementById("upcoming-section");
const upcomingContainer = document.getElementById("upcoming-events");

if (upcomingSection && upcomingContainer) {
    upcomingContainer.replaceChildren();
    upcomingSection.hidden = upcomingEvents.length === 0;
    const upcomingJump = document.getElementById("upcoming-jump");

if (upcomingJump) {
    upcomingJump.hidden = upcomingEvents.length === 0;
}

    upcomingEvents.forEach(event => {
        const card = element("div", "weekly-day", "");
        card.style.setProperty("--day-colour", "#705080");

        const datePanel = element("div", "weekly-date", "");
        datePanel.append(
            element("span", "day-name",
                formatDate(event.date, { weekday: "long" })),
            element("span", "day-number",
                String(event.date.getUTCDate()).padStart(2, "0")),
            element("span", "day-month",
                formatDate(event.date, { month: "short", year: "numeric" }))
        );

        const content = element("div", "weekly-day-content", "");
        const item = element("div", "weekly-event", "");

        if (event.Time) {
            item.append(element(
                "div", "weekly-time", formatTime(event.Time)
            ));
        }

        const title = element("h3", "", event.Event);
let eventUrl = null;

if (event.Link) {
    try {
        const candidate = new URL(event.Link, window.location.href);

        if (["https:", "http:"].includes(candidate.protocol)) {
            eventUrl = candidate.href;
        }
    } catch {
        // Invalid links leave the event non-clickable.
    }
}

if (eventUrl) {
    const titleLink = element(
    "a", "upcoming-event-link", `${event.Event} ↗`
);
    titleLink.href = eventUrl;
    titleLink.target = "_blank";
    titleLink.rel = "noopener noreferrer";
    title.replaceChildren(titleLink);
}

item.append(title);


        if (event.Details) {
            item.append(element("p", "", event.Details));
        }

        if (event.Responsibility) {
            const paragraph = element("p", "", "");
            paragraph.append(element(
                "span",
                "weekly-responsibility",
                `Responsibility: ${event.Responsibility}`
            ));
            item.append(paragraph);
        }

        content.append(item);
        card.append(datePanel, content);
        upcomingContainer.append(card);
    });
}

// Only Weekly entries determine the weekly schedule.
const weeklyOnly = events.filter(event =>
    (event.Category || "").trim().toLowerCase() === "weekly"
);
        const currentWeek = mondayOf(today);
        const weeks = [...new Set(weeklyOnly.map(event => mondayOf(event.date)))];
        const selectedWeek = weeks.find(week => week >= currentWeek);

        if (!selectedWeek) {
            container.textContent = "The next weekly schedule will be posted soon.";
            heading.textContent = "Holy Qurbana · Prayer · Parish Life";
            return;
        }

        const weekStart = parseDate(selectedWeek);
        const weekEnd = new Date(weekStart);
        weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);

        heading.textContent =
            `${formatDate(weekStart, { month: "short", day: "numeric" })} – ` +
            formatDate(weekEnd, {
                month: "short",
                day: "numeric",
                year: "numeric"
            });

        const weeklyEvents = weeklyOnly.filter(
    event => mondayOf(event.date) === selectedWeek
);

        const grouped = new Map();
        weeklyEvents.forEach(event => {
            if (!grouped.has(event.Date)) grouped.set(event.Date, []);
            grouped.get(event.Date).push(event);
        });

        container.replaceChildren();

        grouped.forEach(dayEvents => {
            const date = dayEvents[0].date;
            const day = document.createElement("section");
            day.className = "weekly-day";

            const colours = {
                0: "#203f65",
                2: "#923c43",
                4: "#35624e"
            };

            day.style.setProperty(
                "--day-colour",
                colours[date.getUTCDay()] || "#705080"
            );

            const panel = element("div", "weekly-date", "");
            panel.append(
                element("span", "day-name",
                    formatDate(date, { weekday: "long" })),
                element("span", "day-number",
                    String(date.getUTCDate()).padStart(2, "0")),
                element("span", "day-month",
                    formatDate(date, { month: "short", year: "numeric" }))
            );

            const content = element("div", "weekly-day-content", "");

            dayEvents.forEach(event => {
                const item = element("div", "weekly-event", "");
                item.append(
                    element("div", "weekly-time", formatTime(event.Time)),
                    element("h3", "", event.Event)
                );

                if (event.Details) {
                    item.append(element("p", "", event.Details));
                }

                if (event.Responsibility) {
                    const paragraph = element("p", "", "");
                    paragraph.append(element(
                        "span",
                        "weekly-responsibility",
                        `Responsibility: ${event.Responsibility}`
                    ));
                    item.append(paragraph);
                }

                content.append(item);
            });

            day.append(panel, content);
            container.append(day);
        });
    } catch (error) {
        console.error("Weekly schedule:", error);
        container.textContent =
            "The schedule could not be loaded. Please refresh the page in a moment.";
    }
});