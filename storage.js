(function () {
  var builder = window.GanttChartBuilder = window.GanttChartBuilder || {};
  var utils = builder.utils;
  var STORAGE_KEY = "gantt-chart-builder.project";
  var DEFAULT_ACCENT = "#0033A1";
  var REMOVED_PRODUCT_SUMMARY = "A coordinated launch sequence for beta readiness, campaign development, and market rollout.";
  var REMOVED_PRODUCT_NAME = "Pulse App Launch Plan";
  var REPLACEMENT_PRODUCT_NAME = "Product Launch";
  var DEFAULT_PRODUCT_SUMMARY = "A go-to-market rollout covering research, messaging, campaign production, sales enablement, and launch execution.";

  function parseDependencies(value) {
    if (Array.isArray(value)) {
      return value.map(function (item) {
        return normalizeReferenceId(item);
      }).filter(Boolean);
    }

    return String(value || "")
      .split(",")
      .map(function (item) {
        return normalizeReferenceId(item);
      })
      .filter(Boolean);
  }

  function normalizeReferenceId(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function nextAvailableId(baseId, usedIds) {
    var candidate = baseId;
    var counter = 2;

    while (usedIds.has(candidate)) {
      candidate = baseId + "-" + counter;
      counter += 1;
    }

    return candidate;
  }

  function normalizeProject(rawProject) {
    var errors = [];
    var projectName = String(rawProject && rawProject.projectName || "").trim();
    var projectSummary = String(rawProject && rawProject.projectSummary || "").trim();
    var rawTasks = Array.isArray(rawProject && rawProject.tasks) ? rawProject.tasks : [];

    if (!projectName) {
      errors.push("Project name is required.");
    }

    if (!rawTasks.length) {
      errors.push("Add at least one task before generating the chart.");
    }

    var normalizedTasks = [];
    var usedIds = new Set();

    rawTasks.forEach(function (task, index) {
      var name = String(task && task.name || "").trim();
      var rawId = String(task && task.id || "").trim();
      var suggestedId = utils.slugifyTaskId(rawId || name, index + 1);
      var id = suggestedId;

      if (!name) {
        errors.push("Task " + String(index + 1) + " needs a name.");
      }

      if (rawId && usedIds.has(id)) {
        errors.push("Two tasks share the same internal reference. Update the task names and try again.");
      }

      if (!rawId && usedIds.has(id)) {
        id = nextAvailableId(id, usedIds);
      }

      usedIds.add(id);

      normalizedTasks.push({
        id: id,
        name: name,
        nameReference: normalizeReferenceId(name),
        start: String(task && task.start || "").trim(),
        end: String(task && task.end || "").trim(),
        dependencies: parseDependencies(task && task.dependencies),
        index: index
      });
    });

    var taskIds = new Set(normalizedTasks.map(function (task) {
      return task.id;
    }));
    var taskNames = normalizedTasks.reduce(function (result, task) {
      if (!task.nameReference) {
        return result;
      }

      if (!result[task.nameReference]) {
        result[task.nameReference] = [];
      }

      result[task.nameReference].push(task.id);
      return result;
    }, {});

    normalizedTasks.forEach(function (task) {
      var startDate = utils.parseDate(task.start);
      var endDate = utils.parseDate(task.end);
      var taskLabel = task.name || ("Task " + String(task.index + 1));

      if (!startDate) {
        errors.push("Task '" + taskLabel + "' needs a valid start date.");
      }

      if (!endDate) {
        errors.push("Task '" + taskLabel + "' needs a valid end date.");
      }

      if (startDate && endDate && endDate.getTime() < startDate.getTime()) {
        errors.push("Task '" + taskLabel + "' ends before it starts.");
      }

      task.dependencies = task.dependencies.reduce(function (result, dependency) {
        var resolvedDependency = null;
        var nameMatches = taskNames[dependency];

        if (taskIds.has(dependency)) {
          resolvedDependency = dependency;
        } else if (nameMatches && nameMatches.length === 1) {
          resolvedDependency = nameMatches[0];
        } else if (nameMatches && nameMatches.length > 1) {
          errors.push("Task '" + taskLabel + "' references a duplicate task name in dependencies. Use unique task names.");
          return result;
        } else {
          errors.push("Task '" + taskLabel + "' references unknown dependency '" + dependency + "'.");
          return result;
        }

        if (resolvedDependency === task.id) {
          errors.push("Task '" + taskLabel + "' cannot depend on itself.");
          return result;
        }

        if (result.indexOf(resolvedDependency) === -1) {
          result.push(resolvedDependency);
        }

        return result;
      }, []);
    });

    return {
      errors: errors,
      project: {
        templateId: String(rawProject && rawProject.templateId || "").trim(),
        templateName: String(rawProject && rawProject.templateName || "").trim(),
        accent: String(rawProject && rawProject.accent || DEFAULT_ACCENT).trim(),
        projectName: projectName,
        projectSummary: projectSummary,
        tasks: normalizedTasks.map(function (task) {
          return {
            id: task.id,
            name: task.name,
            start: task.start,
            end: task.end,
            dependencies: task.dependencies
          };
        })
      }
    };
  }

  function saveProject(project) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
      return true;
    } catch (error) {
      return false;
    }
  }

  function loadProject() {
    try {
      var rawValue = window.localStorage.getItem(STORAGE_KEY);
      if (!rawValue) {
        return null;
      }

      var project = JSON.parse(rawValue);
      if (project && project.templateId === "product-launch" && project.projectSummary === REMOVED_PRODUCT_SUMMARY) {
        project.projectSummary = DEFAULT_PRODUCT_SUMMARY;
      }
      if (project && project.templateId === "product-launch" && project.projectName === REMOVED_PRODUCT_NAME) {
        project.projectName = REPLACEMENT_PRODUCT_NAME;
      }
      if (project && project.templateId === "product-launch" && !String(project.projectSummary || "").trim()) {
        project.projectSummary = DEFAULT_PRODUCT_SUMMARY;
      }

      return project;
    } catch (error) {
      return null;
    }
  }

  function clearProject() {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      return true;
    } catch (error) {
      return false;
    }
  }

  builder.storage = {
    clearProject: clearProject,
    loadProject: loadProject,
    normalizeProject: normalizeProject,
    saveProject: saveProject,
    storageKey: STORAGE_KEY
  };
})();
