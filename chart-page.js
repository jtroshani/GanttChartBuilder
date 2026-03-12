(function () {
  var builder = window.GanttChartBuilder = window.GanttChartBuilder || {};
  var storage = builder.storage;
  var utils = builder.utils;

  document.addEventListener("DOMContentLoaded", function () {
    var chartShell = document.querySelector(".chart-shell");
    var chartMount = document.getElementById("chartMount");
    var projectName = document.getElementById("chartProjectName");
    var projectSummary = document.getElementById("chartProjectSummary");
    var chartMeta = document.getElementById("chartMeta");
    var downloadPngButton = document.getElementById("downloadPngButton");

    if (!chartShell || !chartMount || !projectName || !projectSummary || !chartMeta || !downloadPngButton) {
      return;
    }

    var storedProject = storage.loadProject();
    if (!storedProject) {
      renderEmptyState(chartMount, "Generate a project chart from the input page to see it here.");
      return;
    }

    var normalized = storage.normalizeProject(storedProject);
    if (normalized.errors.length) {
      renderEmptyState(chartMount, "The saved project data is incomplete. Return to the input page and generate the chart again.");
      return;
    }

    projectName.textContent = normalized.project.projectName;
    projectSummary.textContent = normalized.project.projectSummary || ("Built from the " + normalized.project.templateName + " template.");
    var resizeFrame = 0;

    function renderChart() {
      var renderer = builder.gantt.renderProject(chartMount, normalized.project);
      if (!renderer) {
        renderEmptyState(chartMount, "There was not enough task data to draw the chart.");
        return;
      }

      chartMeta.innerHTML = [
        '<span class="meta-chip">' + String(renderer.metrics.taskCount) + " tasks</span>",
        '<span class="meta-chip">' + String(renderer.metrics.totalDays) + " total days</span>",
        '<span class="meta-chip">' + utils.escapeHtml(renderer.metrics.scaleLabel) + " view</span>",
        '<span class="meta-chip">' + utils.escapeHtml(utils.formatNumericDate(renderer.metrics.start)) + " - " + utils.escapeHtml(utils.formatNumericDate(renderer.metrics.end)) + "</span>"
      ].join("");
    }

    renderChart();

    window.addEventListener("resize", function () {
      if (resizeFrame) {
        window.cancelAnimationFrame(resizeFrame);
      }

      resizeFrame = window.requestAnimationFrame(function () {
        resizeFrame = 0;
        renderChart();
      });
    });

    downloadPngButton.addEventListener("click", function () {
      exportChartAsPng(chartShell, normalized.project.projectName || "gantt-chart");
    });
  });

  function renderEmptyState(container, message) {
    container.innerHTML = [
      '<section class="empty-state">',
      "<h2>No chart available</h2>",
      "<p>" + message + "</p>",
      '<a href="index.html" class="primary-button">Go to input page</a>',
      "</section>"
    ].join("");
  }

  function exportChartAsPng(chartContainer, fileBaseName) {
    var snapshot = buildChartSvg(chartContainer);
    if (!snapshot) {
      return;
    }

    var svgBlob = new Blob([snapshot.markup], { type: "image/svg+xml;charset=utf-8" });
    var svgUrl = URL.createObjectURL(svgBlob);
    var image = new Image();
    var pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    image.onload = function () {
      var canvas = document.createElement("canvas");
      canvas.width = Math.ceil(snapshot.width * pixelRatio);
      canvas.height = Math.ceil(snapshot.height * pixelRatio);

      var context = canvas.getContext("2d");
      context.scale(pixelRatio, pixelRatio);
      context.fillStyle = snapshot.background;
      context.fillRect(0, 0, snapshot.width, snapshot.height);
      context.drawImage(image, 0, 0, snapshot.width, snapshot.height);

      URL.revokeObjectURL(svgUrl);
      downloadCanvas(canvas, toFileName(fileBaseName));
    };

    image.onerror = function () {
      URL.revokeObjectURL(svgUrl);
      window.alert("PNG export is not available in this browser. Please try Chrome, Edge, or another Chromium-based browser.");
    };

    image.src = svgUrl;
  }

  function buildChartSvg(chartContainer) {
    var shell = chartContainer;
    var topbar = shell && shell.querySelector(".topbar");
    var brand = topbar && topbar.querySelector(".brand");
    var chartDocument = shell && shell.querySelector("#chartExportArea");
    var header = shell && shell.querySelector(".chart-header");
    var frame = shell && shell.querySelector(".timeline-frame");
    var brandLogo = brand && brand.querySelector(".brand-logo");
    var brandName = brand && brand.querySelector(".brand-name");
    var brandSubtitle = brand && brand.querySelector(".brand-subtitle");
    var titleEyebrow = header && header.querySelector(".eyebrow");
    var chartPurpose = header && header.querySelector(".chart-purpose");
    var chartNoteHeading = header && header.querySelector(".hero-note h2");
    var chartNoteCopy = header && header.querySelector(".hero-note p");
    if (!shell || !topbar || !brand || !chartDocument || !header || !frame || !brandLogo || !brandName || !brandSubtitle) {
      return null;
    }

    var shellRect = shell.getBoundingClientRect();
    var documentRect = chartDocument.getBoundingClientRect();
    var exportPadding = 36;
    var footerOffset = 18;
    var footerFontSize = 13;
    var footerSpace = 28;
    var shellWidth = Math.ceil(shellRect.width);
    var contentHeight = Math.ceil(documentRect.bottom - shellRect.top);
    if (!shellWidth || !contentHeight) {
      return null;
    }

    var rootRect = {
      left: shellRect.left - exportPadding,
      top: shellRect.top - exportPadding
    };
    var frameBox = getRelativeBox(frame, rootRect);
    var frameWidth = Math.ceil(frameBox.width);
    var frameHeight = Math.ceil(frameBox.height);
    var frameStyle = window.getComputedStyle(frame);
    var width = shellWidth + (exportPadding * 2);
    var height = contentHeight + (exportPadding * 2) + footerOffset + footerSpace;
    var exportBackground = "#FFFFFF";
    var headerBandColor = "#0033A1";
    var frameBackground = frameStyle.backgroundColor || "#FFFFFF";
    var frameBorder = frameStyle.borderColor || "#D9E4F3";
    var radius = Math.max(parseRadius(frameStyle.borderRadius), 18);
    var footerText = "Downloaded " + formatExportDate(new Date());
    var footerY = exportPadding + contentHeight + footerOffset + footerFontSize;
    var parts = [
      '<svg xmlns="http://www.w3.org/2000/svg" width="' + String(width) + '" height="' + String(height) + '" viewBox="0 0 ' + String(width) + " " + String(height) + '">',
      "<defs>",
      '<clipPath id="chartFrameClip" clipPathUnits="userSpaceOnUse"><rect x="' + String(frameBox.x) + '" y="' + String(frameBox.y) + '" width="' + String(frameWidth) + '" height="' + String(frameHeight) + '" rx="' + String(radius) + '" ry="' + String(radius) + '"/></clipPath>',
      '<filter id="panelShadow" x="-12%" y="-12%" width="124%" height="140%">',
      '<feDropShadow dx="0" dy="16" stdDeviation="14" flood-color="#011949" flood-opacity="0.08"/>',
      "</filter>",
      '<filter id="taskBarShadow" x="-20%" y="-40%" width="160%" height="200%">',
      '<feDropShadow dx="0" dy="10" stdDeviation="8" flood-color="#011949" flood-opacity="0.18"/>',
      "</filter>",
      "</defs>",
      '<rect x="0" y="0" width="' + String(width) + '" height="' + String(height) + '" fill="' + exportBackground + '"/>',
      '<rect x="0" y="0" width="' + String(width) + '" height="240" fill="' + headerBandColor + '" opacity="0.08"/>'
    ];

    serializeLogoMark(parts, brandLogo, rootRect);
    serializeSimpleText(parts, brandName, rootRect, {
      anchor: "start",
      baseline: "hanging",
      containerSelector: ".brand-copy"
    });
    serializeSimpleText(parts, brandSubtitle, rootRect, {
      anchor: "start",
      baseline: "hanging",
      containerSelector: ".brand-copy"
    });

    serializeBox(parts, header, rootRect, { shadow: "url(#panelShadow)" });
    serializeBoxCollection(parts, header.querySelectorAll(".hero-note"), rootRect);
    serializeBoxCollection(parts, header.querySelectorAll(".meta-chip"), rootRect);
    serializeBoxCollection(parts, header.querySelectorAll(".eyebrow"), rootRect);

    serializeSimpleText(parts, titleEyebrow, rootRect, {
      anchor: "middle",
      baseline: "middle"
    });
    serializeWrappedText(parts, header.querySelector("#chartProjectName"), rootRect);
    serializeWrappedText(parts, chartPurpose, rootRect);
    serializeWrappedText(parts, header.querySelector("#chartProjectSummary"), rootRect);
    serializeSimpleText(parts, chartNoteHeading, rootRect, {
      anchor: "start",
      baseline: "hanging"
    });
    serializeWrappedText(parts, chartNoteCopy, rootRect);
    Array.prototype.forEach.call(header.querySelectorAll(".meta-chip"), function (chip) {
      serializeSimpleText(parts, chip, rootRect, {
        anchor: "middle",
        baseline: "middle"
      });
    });

    parts.push(
      '<rect x="' + String(frameBox.x) + '" y="' + String(frameBox.y) + '" width="' + String(frameWidth) + '" height="' + String(frameHeight) + '" rx="' + String(radius) + '" ry="' + String(radius) + '" fill="' + utils.escapeHtml(frameBackground) + '" filter="url(#panelShadow)"/>'
    );
    parts.push(
      '<rect x="' + String(frameBox.x + 0.5) + '" y="' + String(frameBox.y + 0.5) + '" width="' + String(Math.max(frameWidth - 1, 0)) + '" height="' + String(Math.max(frameHeight - 1, 0)) + '" rx="' + String(radius) + '" ry="' + String(radius) + '" fill="' + utils.escapeHtml(frameBackground) + '" stroke="' + utils.escapeHtml(frameBorder) + '"/>'
    );
    parts.push('<g clip-path="url(#chartFrameClip)">');
    serializeBox(parts, frame.querySelector(".gantt-viewport"), rootRect);
    serializeBox(parts, frame.querySelector(".gantt-sidebar"), rootRect);
    serializeBox(parts, frame.querySelector(".sidebar-header"), rootRect);
    serializeBoxCollection(parts, frame.querySelectorAll(".day-column"), rootRect);
    serializeBoxCollection(parts, frame.querySelectorAll(".row-lane"), rootRect);
    serializeBoxCollection(parts, frame.querySelectorAll(".sidebar-row"), rootRect);
    serializeBoxCollection(parts, frame.querySelectorAll(".month-cell"), rootRect);
    serializeBoxCollection(parts, frame.querySelectorAll(".day-cell"), rootRect);
    serializeDependencyLayer(parts, frame.querySelector(".dependency-layer"), rootRect);
    serializeBoxCollection(parts, frame.querySelectorAll(".task-bar"), rootRect, { shadow: "url(#taskBarShadow)" });
    serializeBoxCollection(parts, frame.querySelectorAll(".task-meta-pill"), rootRect);
    serializeBoxCollection(parts, frame.querySelectorAll(".dependency-chip"), rootRect);

    var sidebarHeaderLabel = frame.querySelector(".sidebar-grid-header span");
    serializeSimpleText(parts, sidebarHeaderLabel, rootRect, {
      anchor: "start",
      baseline: "middle",
      containerSelector: ".sidebar-grid-header"
    });

    Array.prototype.forEach.call(frame.querySelectorAll(".month-cell"), function (cell) {
      serializeCellLabel(parts, cell, rootRect, { align: "start", paddingX: 12 });
    });

    Array.prototype.forEach.call(frame.querySelectorAll(".day-cell"), function (cell) {
      var topLabel = cell.querySelector("span");
      var bottomLabel = cell.querySelector("strong");
      serializeSimpleText(parts, topLabel, rootRect, { anchor: "middle", baseline: "hanging" });
      serializeSimpleText(parts, bottomLabel, rootRect, { anchor: "middle", baseline: "hanging" });
    });

    Array.prototype.forEach.call(frame.querySelectorAll(".sidebar-row"), function (row) {
      serializeWrappedText(parts, row.querySelector("strong"), rootRect, {
        containerSelector: ".sidebar-row"
      });
    });
    Array.prototype.forEach.call(frame.querySelectorAll(".task-meta-pill, .dependency-chip"), function (chip) {
      serializeSimpleText(parts, chip, rootRect, { anchor: "middle", baseline: "middle" });
    });
    Array.prototype.forEach.call(frame.querySelectorAll(".task-bar-name"), function (label) {
      serializeTruncatedText(parts, label, rootRect, {
        containerSelector: ".task-bar"
      });
    });

    parts.push("</g>");
    parts.push(
      '<text x="' + String(width - exportPadding) + '" y="' + String(footerY) + '" fill="#688197" font-family="Avenir Next, Segoe UI, Helvetica Neue, sans-serif" font-size="' + String(footerFontSize) + '" font-weight="600" text-anchor="end" dominant-baseline="middle">' + utils.escapeHtml(footerText) + "</text>"
    );
    parts.push("</svg>");

    return {
      background: exportBackground,
      height: height,
      markup: parts.join(""),
      width: width
    };
  }

  function serializeLogoMark(parts, element, rootRect) {
    if (!element) {
      return;
    }

    var box = getRelativeBox(element, rootRect);
    if (!box.width || !box.height) {
      return;
    }

    var scaleX = box.width / 56;
    var scaleY = box.height / 56;
    parts.push(
      '<g transform="translate(' + String(roundValue(box.x)) + " " + String(roundValue(box.y)) + ") scale(" + String(roundValue(scaleX)) + " " + String(roundValue(scaleY)) + ')">',
      '<rect x="3" y="3" width="50" height="50" rx="14" fill="#0033A1"/>',
      '<rect x="12" y="14" width="16" height="7" rx="3.5" fill="#FFFFFF"/>',
      '<rect x="18" y="25" width="20" height="7" rx="3.5" fill="#FFFFFF"/>',
      '<rect x="28" y="36" width="16" height="7" rx="3.5" fill="#FFFFFF"/>',
      '<path d="M17 17.5H18.5V28.5H30V39.5H31.5" stroke="#FFB71B" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>',
      "</g>"
    );
  }

  function serializeBoxCollection(parts, elements, rootRect, options) {
    Array.prototype.forEach.call(elements || [], function (element) {
      serializeBox(parts, element, rootRect, options);
    });
  }

  function serializeBox(parts, element, rootRect, options) {
    if (!element) {
      return;
    }

    var box = getRelativeBox(element, rootRect);
    if (!box.width || !box.height) {
      return;
    }

    var computedStyle = window.getComputedStyle(element);
    var fill = computedStyle.backgroundColor;
    var radius = parseRadius(computedStyle.borderRadius);
    var x = roundValue(box.x);
    var y = roundValue(box.y);
    var width = roundValue(box.width);
    var height = roundValue(box.height);

    if (isVisibleColor(fill)) {
      parts.push(
        '<rect x="' + String(x) + '" y="' + String(y) + '" width="' + String(width) + '" height="' + String(height) + '" rx="' + String(radius) + '" ry="' + String(radius) + '" fill="' + utils.escapeHtml(fill) + '"' + (options && options.shadow ? ' filter="' + utils.escapeHtml(options.shadow) + '"' : "") + '/>'
      );
    }

    appendBorderLine(parts, x, y, x + width, y, computedStyle.borderTopWidth, computedStyle.borderTopColor);
    appendBorderLine(parts, x + width, y, x + width, y + height, computedStyle.borderRightWidth, computedStyle.borderRightColor);
    appendBorderLine(parts, x, y + height, x + width, y + height, computedStyle.borderBottomWidth, computedStyle.borderBottomColor);
    appendBorderLine(parts, x, y, x, y + height, computedStyle.borderLeftWidth, computedStyle.borderLeftColor);
  }

  function appendBorderLine(parts, x1, y1, x2, y2, width, color) {
    var strokeWidth = parseFloat(width || "0");
    if (!strokeWidth || !isVisibleColor(color)) {
      return;
    }

    parts.push(
      '<line x1="' + String(roundValue(x1)) + '" y1="' + String(roundValue(y1)) + '" x2="' + String(roundValue(x2)) + '" y2="' + String(roundValue(y2)) + '" stroke="' + utils.escapeHtml(color) + '" stroke-width="' + String(roundValue(strokeWidth)) + '" shape-rendering="crispEdges"/>'
    );
  }

  function serializeDependencyLayer(parts, svgElement, rootRect) {
    if (!svgElement) {
      return;
    }

    var box = getRelativeBox(svgElement, rootRect);
    parts.push('<g transform="translate(' + String(roundValue(box.x)) + " " + String(roundValue(box.y)) + ')">');

    Array.prototype.forEach.call(svgElement.querySelectorAll("path"), function (path) {
      var computedStyle = window.getComputedStyle(path);
      var fill = path.getAttribute("fill") || computedStyle.fill || "none";
      var stroke = path.getAttribute("stroke") || computedStyle.stroke || "none";
      var strokeWidth = path.getAttribute("stroke-width") || computedStyle.strokeWidth || "0";
      var opacity = computedStyle.opacity || path.getAttribute("opacity") || "1";

      parts.push(
        '<path d="' + utils.escapeHtml(path.getAttribute("d") || "") + '" fill="' + utils.escapeHtml(fill) + '" stroke="' + utils.escapeHtml(stroke) + '" stroke-width="' + utils.escapeHtml(strokeWidth) + '" stroke-linecap="' + utils.escapeHtml(computedStyle.strokeLinecap || "round") + '" stroke-linejoin="' + utils.escapeHtml(computedStyle.strokeLinejoin || "round") + '" opacity="' + utils.escapeHtml(opacity) + '"/>'
      );
    });

    parts.push("</g>");
  }

  function serializeCellLabel(parts, element, rootRect, options) {
    if (!element) {
      return;
    }

    var box = getRelativeBox(element, rootRect);
    var computedStyle = window.getComputedStyle(element);
    var anchor = options && options.align === "start" ? "start" : "middle";
    var x = anchor === "start" ? box.x + ((options && options.paddingX) || 0) : box.x + (box.width / 2);
    var y = box.y + (box.height / 2);

    parts.push(
      '<text x="' + String(roundValue(x)) + '" y="' + String(roundValue(y)) + '" fill="' + utils.escapeHtml(computedStyle.color) + '" font-family="' + utils.escapeHtml(computedStyle.fontFamily) + '" font-size="' + utils.escapeHtml(computedStyle.fontSize) + '" font-weight="' + utils.escapeHtml(computedStyle.fontWeight) + '" text-anchor="' + anchor + '" dominant-baseline="middle">' + utils.escapeHtml(element.textContent.trim()) + "</text>"
    );
  }

  function serializeSimpleText(parts, element, rootRect, options) {
    if (!element) {
      return;
    }

    var text = String(element.textContent || "").trim();
    if (!text) {
      return;
    }

    var box = getRelativeBox(element, rootRect);
    var computedStyle = window.getComputedStyle(element);
    var anchor = options && options.anchor ? options.anchor : "start";
    var baseline = options && options.baseline ? options.baseline : "hanging";
    var x = resolveStartX(element, rootRect, options, box.x);
    var y = box.y;

    if (anchor === "middle") {
      x += box.width / 2;
    } else if (anchor === "end") {
      x += box.width;
    }

    if (baseline === "middle") {
      y += box.height / 2;
    }

    parts.push(
      '<text x="' + String(roundValue(x)) + '" y="' + String(roundValue(y)) + '" fill="' + utils.escapeHtml(computedStyle.color) + '" font-family="' + utils.escapeHtml(computedStyle.fontFamily) + '" font-size="' + utils.escapeHtml(computedStyle.fontSize) + '" font-weight="' + utils.escapeHtml(computedStyle.fontWeight) + '" text-anchor="' + anchor + '" dominant-baseline="' + baseline + '">' + utils.escapeHtml(text) + "</text>"
    );
  }

  function serializeWrappedText(parts, element, rootRect, options) {
    if (!element) {
      return;
    }

    var text = String(element.textContent || "").trim();
    if (!text) {
      return;
    }

    var box = getRelativeBox(element, rootRect);
    var computedStyle = window.getComputedStyle(element);
    var textRegion = resolveTextRegion(element, rootRect, options, box);
    var fontSize = parseFloat(computedStyle.fontSize || "16") || 16;
    var lineHeight = Math.max(parseFloat(computedStyle.lineHeight || "0") || (fontSize * 1.28), fontSize * 1.2);
    var maxLines = Math.max(Math.floor(box.height / lineHeight), 1);
    var lines = wrapTextToLines(text, textRegion.width, fontSize, maxLines);

    lines.forEach(function (line, index) {
      parts.push(
        '<text x="' + String(roundValue(textRegion.x)) + '" y="' + String(roundValue(box.y + (index * lineHeight))) + '" fill="' + utils.escapeHtml(computedStyle.color) + '" font-family="' + utils.escapeHtml(computedStyle.fontFamily) + '" font-size="' + utils.escapeHtml(computedStyle.fontSize) + '" font-weight="' + utils.escapeHtml(computedStyle.fontWeight) + '" text-anchor="start" dominant-baseline="hanging">' + utils.escapeHtml(line) + "</text>"
      );
    });
  }

  function serializeTruncatedText(parts, element, rootRect, options) {
    if (!element) {
      return;
    }

    var box = getRelativeBox(element, rootRect);
    var computedStyle = window.getComputedStyle(element);
    var textRegion = resolveTextRegion(element, rootRect, options, box);
    var fontSize = parseFloat(computedStyle.fontSize || "14") || 14;
    var text = truncateTextToWidth(String(element.textContent || "").trim(), textRegion.width, fontSize);
    if (!text) {
      return;
    }

    parts.push(
      '<text x="' + String(roundValue(textRegion.x)) + '" y="' + String(roundValue(box.y + (box.height / 2))) + '" fill="' + utils.escapeHtml(computedStyle.color) + '" font-family="' + utils.escapeHtml(computedStyle.fontFamily) + '" font-size="' + utils.escapeHtml(computedStyle.fontSize) + '" font-weight="' + utils.escapeHtml(computedStyle.fontWeight) + '" text-anchor="start" dominant-baseline="middle">' + utils.escapeHtml(text) + "</text>"
    );
  }

  function resolveStartX(element, rootRect, options, fallbackX) {
    var textRegion = resolveTextRegion(element, rootRect, options, null);
    return textRegion.x || fallbackX || 0;
  }

  function resolveTextRegion(element, rootRect, options, fallbackBox) {
    var box = fallbackBox || getRelativeBox(element, rootRect);
    var region = {
      width: box.width,
      x: box.x
    };
    var selector = options && options.containerSelector;
    if (!selector || !element || !element.closest) {
      return region;
    }

    var container = element.closest(selector);
    if (!container) {
      return region;
    }

    var containerBox = getRelativeBox(container, rootRect);
    var containerStyle = window.getComputedStyle(container);
    var paddingLeft = parseFloat(containerStyle.paddingLeft || "0") || 0;
    var paddingRight = parseFloat(containerStyle.paddingRight || "0") || 0;
    region.x = containerBox.x + paddingLeft;
    region.width = Math.max(containerBox.width - paddingLeft - paddingRight, 1);
    return region;
  }

  function wrapTextToLines(text, width, fontSize, maxLines) {
    var words = String(text || "").split(/\s+/).filter(Boolean);
    if (!words.length) {
      return [];
    }

    var maxCharacters = Math.max(Math.floor(width / Math.max(fontSize * 0.54, 1)), 1);
    var lines = [];
    var current = "";

    words.forEach(function (word) {
      var next = current ? current + " " + word : word;
      if (next.length <= maxCharacters || !current) {
        current = next;
        return;
      }

      lines.push(current);
      current = word;
    });

    if (current) {
      lines.push(current);
    }

    if (lines.length <= maxLines) {
      return lines;
    }

    var clamped = lines.slice(0, maxLines);
    clamped[maxLines - 1] = truncateTextToCharacters(clamped[maxLines - 1], maxCharacters);
    return clamped;
  }

  function truncateTextToWidth(text, width, fontSize) {
    var maxCharacters = Math.max(Math.floor(width / Math.max(fontSize * 0.58, 1)), 1);
    return truncateTextToCharacters(text, maxCharacters);
  }

  function truncateTextToCharacters(text, maxCharacters) {
    var value = String(text || "");
    if (value.length <= maxCharacters) {
      return value;
    }

    if (maxCharacters <= 1) {
      return value.slice(0, 1);
    }

    return value.slice(0, maxCharacters - 1).replace(/\s+$/, "") + "…";
  }

  function getRelativeBox(element, rootRect) {
    var rect = element.getBoundingClientRect();
    return {
      height: rect.height,
      width: rect.width,
      x: rect.left - rootRect.left,
      y: rect.top - rootRect.top
    };
  }

  function parseRadius(value) {
    var match = /-?\d+(\.\d+)?/.exec(String(value || ""));
    return match ? roundValue(parseFloat(match[0])) : 0;
  }

  function isVisibleColor(value) {
    var color = String(value || "").trim().toLowerCase();
    return color && color !== "transparent" && color !== "rgba(0, 0, 0, 0)" && color !== "rgba(0,0,0,0)";
  }

  function roundValue(value) {
    return Math.round(Number(value || 0) * 100) / 100;
  }

  function downloadCanvas(canvas, fileName) {
    if (canvas.toBlob) {
      canvas.toBlob(function (blob) {
        if (!blob) {
          return;
        }

        triggerDownload(URL.createObjectURL(blob), fileName, true);
      }, "image/png");
      return;
    }

    triggerDownload(canvas.toDataURL("image/png"), fileName, false);
  }

  function triggerDownload(url, fileName, revokeAfter) {
    var link = document.createElement("a");
    link.download = fileName;
    link.href = url;
    link.rel = "noopener";
    link.target = "_blank";
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (revokeAfter) {
      window.setTimeout(function () {
        URL.revokeObjectURL(url);
      }, 1000);
    }
  }

  function toFileName(value) {
    var base = String(value || "gantt-chart")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    return (base || "gantt-chart") + ".png";
  }

  function formatExportDate(value) {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    }).format(value);
  }
})();
