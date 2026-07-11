"use client";

import { useMemo, useState } from "react";
import { categoryFilters, projects, type ProjectCategory } from "@/lib/portfolio";

type ActiveFilter = "all" | ProjectCategory;

export function ProjectExplorer() {
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const visibleProjects = useMemo(
    () => projects.filter((project) => activeFilter === "all" || project.category === activeFilter),
    [activeFilter],
  );

  return (
    <div className="project-explorer">
      <div className="filter-row" role="group" aria-label="篩選作品分類">
        <div className="filters">
          {categoryFilters.map((filter) => (
            <button
              className={activeFilter === filter.id ? "filter active" : "filter"}
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              type="button"
              aria-pressed={activeFilter === filter.id}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <span className="project-count" aria-live="polite">{String(visibleProjects.length).padStart(2, "0")} projects</span>
      </div>

      <div className="project-grid">
        {visibleProjects.map((project) => (
          <article
            className={`project-card accent-${project.accent} ${project.featured && activeFilter === "all" ? "featured" : ""}`}
            key={project.id}
          >
            <div className="project-card-top">
              <span>{project.number}</span>
              <span className="status"><i />{project.status}</span>
            </div>
            <div className="project-visual" aria-hidden="true">
              <div className="visual-line" />
              <span>{project.shortTitle}</span>
              <strong>{project.result}</strong>
            </div>
            <div className="project-content">
              <p className="project-category">{project.categoryLabel}</p>
              <h3>{project.title}</h3>
              <p>{project.description}</p>
              <div className="project-tags">
                {project.tags.map((tag) => <span key={tag}>{tag}</span>)}
              </div>
            </div>
            {project.href ? (
              <a className="icon-action" href={project.href} title={`開啟 ${project.title} Live Demo`} aria-label={`開啟 ${project.title} Live Demo`}>
                ↗
              </a>
            ) : (
              <button className="icon-action" type="button" title={`開啟 ${project.title} Case Study（下一版）`} aria-label={`開啟 ${project.title} Case Study（下一版）`}>
                ↗
              </button>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
