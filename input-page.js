(function () {
  var builder = window.GanttChartBuilder = window.GanttChartBuilder || {};
  var utils = builder.utils;
  var storage = builder.storage;
  var DEFAULT_ACCENT = "#1f4fd7";
  var DEFAULT_PRODUCT_SUMMARY = "A go-to-market rollout covering research, messaging, campaign production, sales enablement, and launch execution.";

  document.addEventListener("DOMContentLoaded", function () {
    var templateGrid = document.getElementById("templateGrid");
    var tasksBody = document.getElementById("tasksBody");
    var form = document.getElementById("builderForm");
    var formAlert = document.getElementById("formAlert");
    var projectNameInput = document.getElementById("projectNameInput");
    var projectSummaryInput = document.getElementById("projectSummaryInput");
    var addTaskButton = document.getElementById("addTaskButton");
    var resetTemplateButton = document.getElementById("resetTemplateButton");

    if (!templateGrid || !tasksBody || !form) {
      return;
    }

    var templates = builder.templates || [];
    var savedProject = storage.loadProject();
    var defaultTemplate = templates[0];
    var matchedTemplate = templates.find(function (template) {
      return savedProject && savedProject.templateId === template.id;
    }) || null;

    var state = {
      activeTemplate: savedProject ? matchedTemplate : defaultTemplate,
      draftProject: savedProject
        ? applyTemplateDefaults(utils.deepClone(savedProject), matchedTemplate)
        : applyTemplateDefaults(defaultTemplate ? utils.deepClone(defaultTemplate) : createEmptyProject(), defaultTemplate)
    };

    renderTemplateCards();
    renderProjectForm(state.draftProject);

    templateGrid.addEventListener("click", function (event) {
      var card = event.target.closest("[data-template-id]");
      if (!card) {
        return;
      }

      var template = templates.find(function (item) {
        return item.id === card.getAttribute("data-template-id");
      });

      if (!template) {
        return;
      }

      hideAlert();
      state.activeTemplate = template;
      state.draftProject = applyTemplateDefaults(utils.deepClone(template), template);
      renderTemplateCards();
      renderProjectForm(state.draftProject);
    });

    addTaskButton.addEventListener("click", function () {
      tasksBody.appendChild(createTaskRow({
        id: "",
        name: "",
        start: "",
        end: "",
        dependencies: []
      }, tasksBody.children.length));
      refreshTaskRows();
    });

    resetTemplateButton.addEventListener("click", function () {
      hideAlert();
      storage.clearProject();
      state.activeTemplate = null;
      state.draftProject = createEmptyProject();
      renderTemplateCards();
      renderProjectForm(state.draftProject);
      projectNameInput.focus();
    });

    tasksBody.addEventListener("input", function (event) {
      var row = event.target.closest("tr");
      if (!row) {
        return;
      }

      if (
        event.target.classList.contains("task-name-input") ||
        event.target.classList.contains("task-start-input") ||
        event.target.classList.contains("task-end-input")
      ) {
        updateDuration(row);
      }
    });

    tasksBody.addEventListener("click", function (event) {
      var removeButton = event.target.closest(".remove-row-button");
      if (!removeButton) {
        return;
      }

      if (tasksBody.children.length === 1) {
        return;
      }

      removeButton.closest("tr").remove();
      refreshTaskRows();
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var rawProject = collectProjectData();
      var normalized = storage.normalizeProject(rawProject);

      if (normalized.errors.length) {
        showAlert(normalized.errors);
        return;
      }

      storage.saveProject(normalized.project);
      window.location.href = "chart.html";
    });

    function renderTemplateCards() {
      templateGrid.innerHTML = templates.map(function (template) {
        var meta = getTemplateMeta(template);
        var selected = state.activeTemplate && state.activeTemplate.id === template.id;

        return [
          '<button type="button" class="template-card' + (selected ? " is-selected" : "") + '" data-template-id="' + utils.escapeHtml(template.id) + '">',
          '<span class="template-category">' + utils.escapeHtml(template.category) + "</span>",
          "<h3>" + utils.escapeHtml(template.name) + "</h3>",
          '<p class="template-summary">' + utils.escapeHtml(template.projectSummary) + "</p>",
          '<div class="template-stats">',
          '<span class="stat-pill">' + String(meta.taskCount) + " tasks</span>",
          '<span class="stat-pill">' + String(meta.duration) + " days</span>",
          '<span class="stat-pill">' + String(meta.dependencyCount) + " dependencies</span>",
          "</div>",
          '<ul class="template-preview">',
          template.tasks.slice(0, 3).map(function (task) {
            return "<li>" + utils.escapeHtml(task.name) + "</li>";
          }).join(""),
          "</ul>",
          "</button>"
        ].join("");
      }).join("");
    }

    function renderProjectForm(project) {
      var currentProject = applyTemplateDefaults(project || createEmptyProject(), state.activeTemplate);
      state.draftProject = currentProject;

      projectNameInput.value = currentProject.projectName || "";
      projectSummaryInput.value = currentProject.projectSummary || "";

      tasksBody.innerHTML = "";
      (currentProject.tasks || []).forEach(function (task, index) {
        tasksBody.appendChild(createTaskRow(task, index, currentProject.tasks || []));
      });

      if (!currentProject.tasks || !currentProject.tasks.length) {
        tasksBody.appendChild(createTaskRow({
          id: "",
          name: "",
          start: "",
          end: "",
          dependencies: []
        }, 0, currentProject.tasks || []));
      }

      refreshTaskRows();
    }

    function createTaskRow(task, index, allTasks) {
      var row = document.createElement("tr");
      var dependencyValue = formatDependencyValue(task, allTasks || []);
      row.innerHTML = [
        '<td><input class="task-name-input" type="text" maxlength="80" value="' + utils.escapeHtml(task.name || "") + '" placeholder="Task name"></td>',
        '<td><input class="task-start-input" type="date" value="' + utils.escapeHtml(task.start || "") + '"></td>',
        '<td><input class="task-end-input" type="date" value="' + utils.escapeHtml(task.end || "") + '"></td>',
        '<td><input class="task-dependencies-input" type="text" maxlength="120" value="' + utils.escapeHtml(dependencyValue) + '" placeholder="Design, QA"></td>',
        '<td><span class="duration-pill">-</span></td>',
        '<td class="row-action-cell"><button type="button" class="remove-row-button">Delete</button></td>'
      ].join("");

      return row;
    }

    function refreshTaskRows() {
      Array.prototype.forEach.call(tasksBody.querySelectorAll("tr"), function (row) {
        updateDuration(row);
      });

      Array.prototype.forEach.call(tasksBody.querySelectorAll(".remove-row-button"), function (button) {
        button.disabled = tasksBody.children.length === 1;
      });
    }

    function updateDuration(row) {
      var startInput = row.querySelector(".task-start-input");
      var endInput = row.querySelector(".task-end-input");
      var durationElement = row.querySelector(".duration-pill");
      var duration = utils.inclusiveDuration(startInput.value, endInput.value);

      durationElement.textContent = duration ? duration + (duration === 1 ? " day" : " days") : "-";
    }

    function collectProjectData() {
      return {
        templateId: state.activeTemplate ? state.activeTemplate.id : "",
        templateName: state.activeTemplate ? state.activeTemplate.name : "Custom project",
        accent: state.activeTemplate ? state.activeTemplate.accent : (state.draftProject.accent || DEFAULT_ACCENT),
        projectName: projectNameInput.value,
        projectSummary: projectSummaryInput.value,
        tasks: Array.prototype.map.call(tasksBody.querySelectorAll("tr"), function (row, index) {
          var nameValue = row.querySelector(".task-name-input").value.trim();

          return {
            name: nameValue,
            start: row.querySelector(".task-start-input").value,
            end: row.querySelector(".task-end-input").value,
            dependencies: row.querySelector(".task-dependencies-input").value
          };
        })
      };
    }

    function formatDependencyValue(task, allTasks) {
      return (task.dependencies || []).map(function (dependency) {
        var match = (allTasks || []).find(function (candidate) {
          return candidate.id === dependency;
        });

        return match ? match.name : dependency;
      }).join(", ");
    }

    function applyTemplateDefaults(project, template) {
      var nextProject = utils.deepClone(project || createEmptyProject());

      if (template && template.id === "product-launch" && !String(nextProject.projectSummary || "").trim()) {
        nextProject.projectSummary = DEFAULT_PRODUCT_SUMMARY;
      }

      return nextProject;
    }

    function createEmptyProject() {
      return {
        templateId: "",
        templateName: "",
        accent: DEFAULT_ACCENT,
        projectName: "",
        projectSummary: "",
        tasks: [
          {
            id: "",
            name: "",
            start: "",
            end: "",
            dependencies: []
          }
        ]
      };
    }

    function getTemplateMeta(template) {
      var taskCount = template.tasks.length;
      var dependencyCount = template.tasks.reduce(function (count, task) {
        return count + (task.dependencies || []).length;
      }, 0);
      var startDates = template.tasks.map(function (task) {
        return utils.parseDate(task.start);
      }).filter(Boolean);
      var endDates = template.tasks.map(function (task) {
        return utils.parseDate(task.end);
      }).filter(Boolean);
      var duration = 0;

      if (startDates.length && endDates.length) {
        var earliest = startDates.reduce(function (result, date) {
          return date.getTime() < result.getTime() ? date : result;
        });
        var latest = endDates.reduce(function (result, date) {
          return date.getTime() > result.getTime() ? date : result;
        });
        duration = utils.inclusiveDuration(earliest, latest);
      }

      return {
        dependencyCount: dependencyCount,
        duration: duration,
        taskCount: taskCount
      };
    }

    function showAlert(errors) {
      formAlert.hidden = false;
      formAlert.innerHTML = errors.map(function (message) {
        return "<p>" + utils.escapeHtml(message) + "</p>";
      }).join("");
    }

    function hideAlert() {
      formAlert.hidden = true;
      formAlert.innerHTML = "";
    }
  });
})();
