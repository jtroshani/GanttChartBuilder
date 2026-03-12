(function () {
  var builder = window.GanttChartBuilder = window.GanttChartBuilder || {};
  var utils = builder.utils;

  function renderProject(container, project) {
    var tasks = Array.isArray(project && project.tasks) ? project.tasks : [];
    if (!container || !tasks.length) {
      return null;
    }

    var parsedTasks = tasks.map(function (task, index) {
      var startDate = utils.parseDate(task.start);
      var endDate = utils.parseDate(task.end);

      return {
        id: task.id,
        name: task.name,
        start: task.start,
        end: task.end,
        startDate: startDate,
        endDate: endDate,
        duration: utils.inclusiveDuration(startDate, endDate),
        dependencies: Array.isArray(task.dependencies) ? task.dependencies : [],
        index: index
      };
    });
    var tasksById = parsedTasks.reduce(function (result, task) {
      result[task.id] = task;
      return result;
    }, {});

    var firstDate = parsedTasks.reduce(function (result, task) {
      return !result || task.startDate.getTime() < result.getTime() ? task.startDate : result;
    }, null);
    var lastDate = parsedTasks.reduce(function (result, task) {
      return !result || task.endDate.getTime() > result.getTime() ? task.endDate : result;
    }, null);

    var monthHeaderHeight = 46;
    var intervalHeaderHeight = 44;
    var headerHeight = monthHeaderHeight + intervalHeaderHeight;
    var rowHeight = 96;
    var chartHeight = headerHeight + (parsedTasks.length * rowHeight);
    var accent = project.accent || "#0033A1";
    var labelColor = utils.pickContrastColor(accent);

    container.innerHTML = "";

    var frame = document.createElement("section");
    frame.className = "timeline-frame";

    var board = document.createElement("div");
    board.className = "gantt-board";

    var sidebar = document.createElement("aside");
    sidebar.className = "gantt-sidebar";
    sidebar.appendChild(createSidebarHeader(headerHeight));
    sidebar.appendChild(createSidebarBody(parsedTasks, rowHeight));

    var viewport = document.createElement("div");
    viewport.className = "gantt-viewport";

    var scroll = document.createElement("div");
    scroll.className = "gantt-scroll";

    board.appendChild(sidebar);
    board.appendChild(viewport);
    frame.appendChild(board);
    container.appendChild(frame);

    var availableWidth = Math.max(Math.floor(viewport.clientWidth || 0), 320);
    var scale = buildScale(firstDate, lastDate, availableWidth);
    var chartWidth = scale.chartWidth;

    var content = document.createElement("div");
    content.className = "timeline-content";
    content.style.width = chartWidth + "px";
    content.style.height = chartHeight + "px";
    content.style.setProperty("--accent-color", accent);
    content.style.setProperty("--accent-text-color", labelColor);

    content.appendChild(createGroupTrack(scale.groups, scale.cellWidth, monthHeaderHeight));
    content.appendChild(createIntervalTrack(scale.intervals, scale.cellWidth, monthHeaderHeight, intervalHeaderHeight, scale.mode));
    content.appendChild(createIntervalColumns(scale.intervals, scale.cellWidth, chartHeight, headerHeight));
    content.appendChild(createRowLanes(parsedTasks, headerHeight, rowHeight, chartWidth));

    var barsLayer = document.createElement("div");
    barsLayer.className = "task-bars-layer";

    parsedTasks.forEach(function (task) {
      barsLayer.appendChild(createTaskBar(task, scale.intervals, scale.cellWidth, rowHeight, headerHeight));
    });

    var dependencyLayer = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    dependencyLayer.setAttribute("class", "dependency-layer");
    dependencyLayer.setAttribute("width", String(chartWidth));
    dependencyLayer.setAttribute("height", String(chartHeight));

    content.appendChild(dependencyLayer);
    content.appendChild(barsLayer);
    scroll.appendChild(content);
    viewport.appendChild(scroll);

    var result = {
      metrics: {
        end: lastDate,
        scaleLabel: scale.label,
        start: firstDate,
        taskCount: parsedTasks.length,
        totalDays: utils.inclusiveDuration(firstDate, lastDate)
      },
      redrawDependencies: function () {
        drawDependencies(content, dependencyLayer, tasksById, accent);
      }
    };

    window.requestAnimationFrame(result.redrawDependencies);
    return result;
  }

  function buildScale(firstDate, lastDate, availableWidth) {
    var dayIntervals = buildDayIntervals(firstDate, lastDate);
    var weekIntervals = buildWeekIntervals(firstDate, lastDate);
    var monthIntervals = buildMonthIntervals(firstDate, lastDate);
    var candidates = [
      {
        intervals: dayIntervals,
        label: "Daily",
        minWidth: 22,
        mode: "day"
      },
      {
        intervals: weekIntervals,
        label: "Weekly",
        minWidth: 56,
        mode: "week"
      },
      {
        intervals: monthIntervals,
        label: "Monthly",
        minWidth: 72,
        mode: "month"
      }
    ];

    var selected = candidates.find(function (candidate) {
      return (availableWidth / candidate.intervals.length) >= candidate.minWidth;
    }) || candidates[candidates.length - 1];
    var cellWidth = availableWidth / selected.intervals.length;

    return {
      cellWidth: cellWidth,
      chartWidth: cellWidth * selected.intervals.length,
      groups: buildGroups(selected.intervals),
      intervals: selected.intervals,
      label: selected.label,
      mode: selected.mode
    };
  }

  function buildDayIntervals(firstDate, lastDate) {
    return utils.eachDay(firstDate, lastDate).map(function (day) {
      return {
        end: day,
        isEmphasis: day.getUTCDay() === 0 || day.getUTCDay() === 6,
        labelBottom: String(day.getUTCDate()),
        labelTop: utils.weekdayLetter(day),
        groupKey: String(day.getUTCFullYear()) + "-" + String(day.getUTCMonth()),
        groupLabel: utils.formatMonth(day),
        start: day
      };
    });
  }

  function buildWeekIntervals(firstDate, lastDate) {
    var intervals = [];
    var cursor = startOfWeek(firstDate);
    var index = 0;

    while (cursor.getTime() <= lastDate.getTime()) {
      var rawEnd = utils.addDays(cursor, 6);
      var intervalStart = maxDate(cursor, firstDate);
      var intervalEnd = minDate(rawEnd, lastDate);

      intervals.push({
        end: intervalEnd,
        isEmphasis: index % 2 === 1,
        labelBottom: utils.formatNumericDate(intervalStart),
        labelTop: "Week",
        groupKey: String(intervalStart.getUTCFullYear()) + "-" + String(intervalStart.getUTCMonth()),
        groupLabel: utils.formatMonth(intervalStart),
        start: intervalStart
      });

      cursor = utils.addDays(cursor, 7);
      index += 1;
    }

    return intervals;
  }

  function buildMonthIntervals(firstDate, lastDate) {
    var intervals = [];
    var cursor = startOfMonth(firstDate);
    var index = 0;

    while (cursor.getTime() <= lastDate.getTime()) {
      var rawEnd = endOfMonth(cursor);
      var intervalStart = maxDate(cursor, firstDate);
      var intervalEnd = minDate(rawEnd, lastDate);

      intervals.push({
        end: intervalEnd,
        isEmphasis: index % 2 === 1,
        labelBottom: utils.formatDate(intervalStart, { month: "short", timeZone: "UTC" }),
        labelTop: String(intervalStart.getUTCFullYear()).slice(-2),
        groupKey: String(intervalStart.getUTCFullYear()),
        groupLabel: String(intervalStart.getUTCFullYear()),
        start: intervalStart
      });

      cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
      index += 1;
    }

    return intervals;
  }

  function buildGroups(intervals) {
    return intervals.reduce(function (result, interval, index) {
      var previous = result[result.length - 1];

      if (!previous || previous.key !== interval.groupKey) {
        result.push({
          count: 1,
          key: interval.groupKey,
          label: interval.groupLabel,
          startIndex: index
        });
      } else {
        previous.count += 1;
      }

      return result;
    }, []);
  }

  function createSidebarHeader(headerHeight) {
    var header = document.createElement("div");
    header.className = "sidebar-header";
    header.style.height = headerHeight + "px";
    header.innerHTML = [
      '<div class="sidebar-grid sidebar-grid-header">',
      "<span>Task</span>",
      "</div>"
    ].join("");
    return header;
  }

  function createSidebarBody(tasks, rowHeight) {
    var body = document.createElement("div");
    body.className = "sidebar-body";
    var tasksById = tasks.reduce(function (result, task) {
      result[task.id] = task;
      return result;
    }, {});

    tasks.forEach(function (task) {
      var row = document.createElement("div");
      row.className = "sidebar-grid sidebar-row";
      row.style.height = rowHeight + "px";
      var dependencyChips = renderDependencyChips(task.dependencies, tasksById);
      row.innerHTML = [
        '<div class="task-label-group">',
        '<strong>' + utils.escapeHtml(task.name) + "</strong>",
        '<div class="task-inline-meta">',
        '<span class="task-meta-pill">' + String(task.duration) + (task.duration === 1 ? " day" : " days") + "</span>",
        dependencyChips ? ('<div class="dependency-chip-row">' + dependencyChips + "</div>") : "",
        "</div>",
        "</div>"
      ].join("");
      body.appendChild(row);
    });

    return body;
  }

  function createGroupTrack(groups, cellWidth, height) {
    var track = document.createElement("div");
    track.className = "month-track";
    track.style.height = height + "px";

    groups.forEach(function (group) {
      var cell = document.createElement("div");
      cell.className = "month-cell";
      cell.style.left = (group.startIndex * cellWidth) + "px";
      cell.style.width = (group.count * cellWidth) + "px";
      cell.style.height = height + "px";
      cell.textContent = group.label;
      track.appendChild(cell);
    });

    return track;
  }

  function createIntervalTrack(intervals, cellWidth, topOffset, height, mode) {
    var track = document.createElement("div");
    track.className = "day-track";
    track.style.top = topOffset + "px";
    track.style.height = height + "px";

    intervals.forEach(function (interval, index) {
      var cell = document.createElement("div");
      cell.className = "day-cell scale-" + mode + (interval.isEmphasis ? " is-emphasis" : "");
      cell.style.left = (index * cellWidth) + "px";
      cell.style.width = cellWidth + "px";
      cell.style.height = height + "px";
      cell.innerHTML = [
        "<span>" + utils.escapeHtml(interval.labelTop) + "</span>",
        "<strong>" + utils.escapeHtml(interval.labelBottom) + "</strong>"
      ].join("");
      track.appendChild(cell);
    });

    return track;
  }

  function createIntervalColumns(intervals, cellWidth, chartHeight, headerHeight) {
    var columns = document.createElement("div");
    columns.className = "day-columns";

    intervals.forEach(function (interval, index) {
      var column = document.createElement("div");
      column.className = "day-column" + (interval.isEmphasis ? " is-emphasis" : "");
      column.style.left = (index * cellWidth) + "px";
      column.style.top = headerHeight + "px";
      column.style.height = (chartHeight - headerHeight) + "px";
      column.style.width = cellWidth + "px";
      columns.appendChild(column);
    });

    return columns;
  }

  function createRowLanes(tasks, topOffset, rowHeight, width) {
    var lanes = document.createElement("div");
    lanes.className = "row-lanes";

    tasks.forEach(function (task, index) {
      var lane = document.createElement("div");
      lane.className = "row-lane" + (index % 2 === 1 ? " is-alt" : "");
      lane.style.top = (topOffset + (index * rowHeight)) + "px";
      lane.style.height = rowHeight + "px";
      lane.style.width = width + "px";
      lanes.appendChild(lane);
    });

    return lanes;
  }

  function createTaskBar(task, intervals, cellWidth, rowHeight, headerHeight) {
    var startIndex = findIntervalIndex(intervals, task.startDate);
    var endIndex = findIntervalIndex(intervals, task.endDate);
    var span = Math.max((endIndex - startIndex + 1), 1);
    var bar = document.createElement("div");
    var width = Math.max((span * cellWidth) - 8, 28);
    var left = (startIndex * cellWidth) + 4;
    var top = headerHeight + (task.index * rowHeight) + ((rowHeight - 40) / 2);

    bar.className = "task-bar";
    bar.setAttribute("data-task-id", task.id);
    bar.style.left = left + "px";
    bar.style.top = top + "px";
    bar.style.width = width + "px";
    bar.innerHTML = '<span class="task-bar-name">' + utils.escapeHtml(task.name) + "</span>";

    return bar;
  }

  function renderDependencyChips(dependencies, tasksById) {
    if (!dependencies.length) {
      return "";
    }

    return dependencies.map(function (dependency) {
      var match = tasksById && tasksById[dependency];
      return '<span class="dependency-chip">' + utils.escapeHtml(match ? match.name : dependency) + "</span>";
    }).join("");
  }

  function findIntervalIndex(intervals, date) {
    var index = intervals.findIndex(function (interval) {
      return date.getTime() >= interval.start.getTime() && date.getTime() <= interval.end.getTime();
    });

    if (index !== -1) {
      return index;
    }

    return intervals.findIndex(function (interval) {
      return date.getTime() <= interval.end.getTime();
    });
  }

  function drawDependencies(content, svg, tasksById, accentColor) {
    if (!content || !svg) {
      return;
    }

    var bars = Array.prototype.reduce.call(content.querySelectorAll(".task-bar"), function (result, element) {
      result[element.getAttribute("data-task-id")] = element;
      return result;
    }, {});
    var strokeColor = accentColor || "#0033A1";
    var tasks = content.querySelectorAll(".task-bar");

    while (svg.firstChild) {
      svg.removeChild(svg.firstChild);
    }

    Array.prototype.forEach.call(tasks, function (taskElement) {
      var taskId = taskElement.getAttribute("data-task-id");
      var taskData = tasksById[taskId];
      if (!taskData) {
        return;
      }

      taskData.dependencies.forEach(function (dependencyId) {
        var sourceBar = bars[dependencyId];
        if (!sourceBar) {
          return;
        }

        var startX = sourceBar.offsetLeft + sourceBar.offsetWidth;
        var startY = sourceBar.offsetTop + (sourceBar.offsetHeight / 2);
        var endX = taskElement.offsetLeft;
        var endY = taskElement.offsetTop + (taskElement.offsetHeight / 2);
        var bridgeX = Math.max(startX + 18, endX - 18);

        var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("class", "dependency-path");
        path.setAttribute("stroke", strokeColor);
        path.setAttribute("d", [
          "M", startX, startY,
          "L", bridgeX, startY,
          "L", bridgeX, endY,
          "L", endX - 8, endY
        ].join(" "));
        svg.appendChild(path);

        var arrow = document.createElementNS("http://www.w3.org/2000/svg", "path");
        arrow.setAttribute("class", "dependency-arrow");
        arrow.setAttribute("fill", strokeColor);
        arrow.setAttribute("d", [
          "M", endX - 8, endY - 5,
          "L", endX, endY,
          "L", endX - 8, endY + 5,
          "Z"
        ].join(" "));
        svg.appendChild(arrow);
      });
    });
  }

  function startOfWeek(date) {
    var weekday = date.getUTCDay();
    var delta = weekday === 0 ? -6 : 1 - weekday;
    return utils.addDays(date, delta);
  }

  function startOfMonth(date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  }

  function endOfMonth(date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
  }

  function minDate(left, right) {
    return left.getTime() < right.getTime() ? left : right;
  }

  function maxDate(left, right) {
    return left.getTime() > right.getTime() ? left : right;
  }

  builder.gantt = {
    renderProject: renderProject
  };
})();
