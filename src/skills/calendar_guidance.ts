export const calendarGuidance = `CLI and MCP share epoch ms, ISO with Z/offset, YYYY-MM-DD, DD.MM.YYYY,
today/yesterday/tomorrow and signed day offsets (+3d/-2d).
Date-only values keep their day with UTC boundaries; keywords use the process
local date. Read occurredOn/dueOn and review occursOn for calendar dates;
*Iso fields stay UTC. Future events warn and count as contact only when their
time and day arrive. Commitments and resolutions never reset recency/cadence.
Radar explains overdue promises and drift (gap > 1.5 times cadence).`;
