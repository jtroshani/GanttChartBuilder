(function () {
  var builder = window.GanttChartBuilder = window.GanttChartBuilder || {};
  var DAY_IN_MS = 24 * 60 * 60 * 1000;

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function parseDate(value) {
    if (!value || typeof value !== "string") {
      return null;
    }

    var match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
    if (!match) {
      return null;
    }

    var year = Number(match[1]);
    var month = Number(match[2]);
    var day = Number(match[3]);
    var date = new Date(Date.UTC(year, month - 1, day));

    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      return null;
    }

    return date;
  }

  function dateToIso(date) {
    if (!(date instanceof Date)) {
      return "";
    }

    return [
      date.getUTCFullYear(),
      pad(date.getUTCMonth() + 1),
      pad(date.getUTCDate())
    ].join("-");
  }

  function addDays(date, amount) {
    return new Date(date.getTime() + (amount * DAY_IN_MS));
  }

  function diffDays(start, end) {
    return Math.round((end.getTime() - start.getTime()) / DAY_IN_MS);
  }

  function inclusiveDuration(startValue, endValue) {
    var start = startValue instanceof Date ? startValue : parseDate(startValue);
    var end = endValue instanceof Date ? endValue : parseDate(endValue);

    if (!start || !end || end.getTime() < start.getTime()) {
      return null;
    }

    return diffDays(start, end) + 1;
  }

  function eachDay(startValue, endValue) {
    var start = startValue instanceof Date ? startValue : parseDate(startValue);
    var end = endValue instanceof Date ? endValue : parseDate(endValue);
    var days = [];

    if (!start || !end || end.getTime() < start.getTime()) {
      return days;
    }

    for (var cursor = start; cursor.getTime() <= end.getTime(); cursor = addDays(cursor, 1)) {
      days.push(new Date(cursor.getTime()));
    }

    return days;
  }

  function formatDate(value, options) {
    var date = value instanceof Date ? value : parseDate(value);
    if (!date) {
      return "";
    }

    return new Intl.DateTimeFormat("en-US", Object.assign({
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC"
    }, options || {})).format(date);
  }

  function formatNumericDate(value) {
    var date = value instanceof Date ? value : parseDate(value);
    if (!date) {
      return "";
    }

    return [
      pad(date.getUTCMonth() + 1),
      pad(date.getUTCDate()),
      String(date.getUTCFullYear()).slice(-2)
    ].join("/");
  }

  function formatMonth(value) {
    return formatDate(value, { month: "long", year: "numeric", timeZone: "UTC" });
  }

  function formatWeekday(value) {
    return formatDate(value, { weekday: "short", timeZone: "UTC" });
  }

  function weekdayLetter(value) {
    var formatted = formatWeekday(value);
    return formatted ? formatted.charAt(0) : "";
  }

  function slugifyTaskId(value, fallbackIndex) {
    var base = String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    if (!base) {
      return "task-" + String(fallbackIndex || 1);
    }

    return base;
  }

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function pickContrastColor(hexColor) {
    var color = String(hexColor || "").replace("#", "");
    if (color.length === 3) {
      color = color.split("").map(function (part) {
        return part + part;
      }).join("");
    }

    if (color.length !== 6) {
      return "#FFFFFF";
    }

    var red = parseInt(color.slice(0, 2), 16);
    var green = parseInt(color.slice(2, 4), 16);
    var blue = parseInt(color.slice(4, 6), 16);
    var brightness = ((red * 299) + (green * 587) + (blue * 114)) / 1000;

    return brightness > 150 ? "#011949" : "#FFFFFF";
  }

  builder.utils = {
    DAY_IN_MS: DAY_IN_MS,
    addDays: addDays,
    dateToIso: dateToIso,
    deepClone: deepClone,
    diffDays: diffDays,
    eachDay: eachDay,
    escapeHtml: escapeHtml,
    formatDate: formatDate,
    formatMonth: formatMonth,
    formatNumericDate: formatNumericDate,
    formatWeekday: formatWeekday,
    inclusiveDuration: inclusiveDuration,
    parseDate: parseDate,
    pickContrastColor: pickContrastColor,
    slugifyTaskId: slugifyTaskId,
    weekdayLetter: weekdayLetter
  };
})();
