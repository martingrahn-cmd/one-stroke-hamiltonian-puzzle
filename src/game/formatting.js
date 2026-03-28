export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function todaySeed() {
  return new Date().toISOString().slice(0, 10);
}

export function createRunId() {
  return `run-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

export function toDisplayTime(ms) {
  if (!Number.isFinite(ms)) {
    return "--";
  }
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function toDisplayScore(value) {
  return new Intl.NumberFormat("sv-SE").format(Math.round(value));
}

export function toDisplayDecimal(value, fractionDigits = 1) {
  if (!Number.isFinite(value)) {
    return "--";
  }
  return new Intl.NumberFormat("sv-SE", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

export function toDisplayPercent(value) {
  if (!Number.isFinite(value)) {
    return "--";
  }
  return `${toDisplayDecimal(value, 1)}%`;
}

export function toMachineDecimal(value, fractionDigits = 1) {
  if (!Number.isFinite(value)) {
    return "";
  }
  return Number(value).toFixed(fractionDigits);
}

export function toDisplaySignedScoreDelta(value) {
  if (!Number.isFinite(value)) {
    return "--";
  }
  if (value === 0) {
    return "PB";
  }
  const sign = value > 0 ? "+" : "-";
  return `${sign}${toDisplayScore(Math.abs(value))} p`;
}

export function toDisplaySignedTimeDelta(ms) {
  if (!Number.isFinite(ms)) {
    return "--";
  }
  if (ms === 0) {
    return "PB";
  }
  const sign = ms > 0 ? "+" : "-";
  return `${sign}${toDisplayTime(Math.abs(ms))}`;
}

export function toDisplayPenaltySeconds(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "+0.0s";
  }
  const formatted = new Intl.NumberFormat("sv-SE", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(seconds);
  return `+${formatted}s`;
}

export function toDisplayDateTime(iso) {
  if (!iso) {
    return "--";
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "--";
  }
  return new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
