(function () {
  var builder = window.GanttChartBuilder = window.GanttChartBuilder || {};

  builder.templates = [
    {
      id: "website-redesign",
      name: "Website Redesign",
      category: "Marketing + Product",
      accent: "#0f7f6d",
      projectName: "Atlas Website Redesign",
      projectSummary: "A full website refresh covering discovery, design, development, content migration, and launch readiness.",
      tasks: [
        { id: "audit", name: "Content and analytics audit", start: "2026-04-06", end: "2026-04-10", dependencies: [] },
        { id: "ia", name: "Information architecture", start: "2026-04-13", end: "2026-04-17", dependencies: ["audit"] },
        { id: "wireframes", name: "Wireframes and page flows", start: "2026-04-20", end: "2026-04-28", dependencies: ["ia"] },
        { id: "design", name: "Visual design system", start: "2026-04-29", end: "2026-05-08", dependencies: ["wireframes"] },
        { id: "build", name: "Frontend implementation", start: "2026-05-11", end: "2026-05-27", dependencies: ["design"] },
        { id: "content", name: "Content migration", start: "2026-05-18", end: "2026-05-28", dependencies: ["wireframes"] },
        { id: "launch", name: "QA and launch", start: "2026-05-29", end: "2026-06-04", dependencies: ["build"] }
      ]
    },
    {
      id: "product-launch",
      name: "Product Launch",
      category: "Go-to-Market",
      accent: "#d85d2f",
      projectName: "Product Launch",
      projectSummary: "A go-to-market rollout covering research, messaging, campaign production, sales enablement, and launch execution.",
      tasks: [
        { id: "research", name: "Market and customer research", start: "2026-06-01", end: "2026-06-05", dependencies: [] },
        { id: "positioning", name: "Positioning and launch messaging", start: "2026-06-08", end: "2026-06-12", dependencies: ["research"] },
        { id: "beta", name: "Beta onboarding prep", start: "2026-06-08", end: "2026-06-17", dependencies: ["research"] },
        { id: "campaign", name: "Campaign asset production", start: "2026-06-15", end: "2026-06-26", dependencies: ["positioning"] },
        { id: "sales", name: "Sales enablement", start: "2026-06-22", end: "2026-06-30", dependencies: ["positioning"] },
        { id: "launch", name: "Launch week execution", start: "2026-07-01", end: "2026-07-07", dependencies: ["sales"] }
      ]
    }
  ];
})();
