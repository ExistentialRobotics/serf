document.querySelectorAll("[data-copy-bibtex]").forEach((button) => {
  const targetSelector = button.dataset.copyTarget;
  const target = targetSelector ? document.querySelector(targetSelector) : null;
  const feedback = button.querySelector("[data-copy-feedback]");
  const defaultLabel = button.getAttribute("aria-label") || "Copy BibTeX";
  let resetTimer = null;

  if (!target) {
    return;
  }

  const fallbackCopy = (text) => {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.append(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();

    if (!copied) {
      throw new Error("Copy command failed");
    }
  };

  const setStatus = (message) => {
    if (resetTimer !== null) {
      window.clearTimeout(resetTimer);
    }

    const isCopied = message === "Copied";
    const isFailed = message === "Copy failed";

    button.classList.toggle("is-copied", isCopied);
    button.classList.toggle("is-failed", isFailed);
    button.setAttribute("aria-label", isCopied ? "Copied BibTeX" : message);

    if (feedback) {
      feedback.textContent = message;
    }

    resetTimer = window.setTimeout(() => {
      button.classList.remove("is-copied");
      button.classList.remove("is-failed");
      button.setAttribute("aria-label", defaultLabel);

      if (feedback) {
        feedback.textContent = "Copied";
      }
    }, 2200);
  };

  button.addEventListener("click", async () => {
    const bibtex = target.textContent.trim();

    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(bibtex);
      } else {
        fallbackCopy(bibtex);
      }

      setStatus("Copied");
    } catch (error) {
      try {
        fallbackCopy(bibtex);
        setStatus("Copied");
      } catch (fallbackError) {
        setStatus("Copy failed");
      }
    }
  });
});

document.querySelectorAll("[data-task-rotator]").forEach((rotator) => {
  const panels = Array.from(rotator.querySelectorAll("[data-task-panel]"));
  const buttons = Array.from(rotator.querySelectorAll("[data-task-button]"));
  const title = rotator.querySelector("[data-task-title]");

  if (!panels.length || !buttons.length || !title) {
    return;
  }

  let playbackToken = 0;
  let syncRafId = null;

  const waitForReady = (video) => {
    if (video.readyState >= 1) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      video.addEventListener("loadedmetadata", resolve, { once: true });
    });
  };

  const stopSync = () => {
    if (syncRafId !== null) {
      cancelAnimationFrame(syncRafId);
      syncRafId = null;
    }
  };

  const playPanelVideos = async (panel, token) => {
    const videos = Array.from(panel.querySelectorAll("video"));

    if (!videos.length) {
      return;
    }

    await Promise.all(videos.map((video) => waitForReady(video)));

    if (token !== playbackToken || panel.hidden) {
      return;
    }

    stopSync();

    videos.forEach((video) => {
      video.pause();
      video.currentTime = 0;
    });

    requestAnimationFrame(() => {
      if (token !== playbackToken || panel.hidden) {
        return;
      }

      const [master, ...slaves] = videos;
      const slaveStates = slaves.map((video) => ({
        video,
        lastSeek: Number.NEGATIVE_INFINITY,
      }));

      const syncLoop = () => {
        if (token !== playbackToken || panel.hidden || master.paused) {
          stopSync();
          return;
        }

        const targetTime = master.currentTime;

        slaveStates.forEach((state) => {
          const delta = Math.abs(state.video.currentTime - targetTime);
          if (delta > 0.04 && Math.abs(state.lastSeek - targetTime) > 0.02) {
            state.video.currentTime = targetTime;
            state.lastSeek = targetTime;
          }
        });

        syncRafId = requestAnimationFrame(syncLoop);
      };

      Promise.all(videos.map((video) => video.play().catch(() => {}))).finally(() => {
        syncRafId = requestAnimationFrame(syncLoop);
      });
    });
  };

  const pausePanelVideos = (panel) => {
    panel.querySelectorAll("video").forEach((video) => {
      video.pause();
    });
    stopSync();
  };

  const activate = (nextIndex, shouldFocus = false) => {
    const activeIndex = (nextIndex + panels.length) % panels.length;
    playbackToken += 1;
    const token = playbackToken;
    stopSync();

    panels.forEach((panel, index) => {
      const isActive = index === activeIndex;
      panel.hidden = !isActive;
      panel.classList.toggle("is-active", isActive);

      if (isActive) {
        title.textContent = panel.dataset.title;
        playPanelVideos(panel, token);
      } else {
        pausePanelVideos(panel);
      }
    });

    buttons.forEach((button, index) => {
      const isActive = index === activeIndex;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", String(isActive));
      button.tabIndex = isActive ? 0 : -1;

      if (isActive && shouldFocus) {
        button.focus();
      }
    });
  };

  buttons.forEach((button, index) => {
    button.addEventListener("click", () => {
      activate(index);
    });

    button.addEventListener("keydown", (event) => {
      const keyActions = {
        ArrowLeft: () => activate(index - 1, true),
        ArrowRight: () => activate(index + 1, true),
        Home: () => activate(0, true),
        End: () => activate(buttons.length - 1, true),
      };
      const action = keyActions[event.key];

      if (!action) {
        return;
      }

      event.preventDefault();
      action();
    });
  });

  activate(0);
});

document.querySelectorAll("[data-media-slot]").forEach((slot) => {
  const src = slot.dataset.mediaSrc;
  const type = slot.dataset.mediaType;
  const placeholder = slot.querySelector(".media-placeholder");

  if (!src || !type || !placeholder) {
    return;
  }

  const activateMedia = (media) => {
    placeholder.replaceWith(media);
    slot.classList.remove("is-placeholder");

    if (media.tagName === "VIDEO" && !slot.closest("[hidden]")) {
      media.play().catch(() => {});
    }
  };

  if (type === "image") {
    const image = new Image();
    image.alt = slot.dataset.mediaAlt || "";
    image.addEventListener("load", () => activateMedia(image), { once: true });
    image.src = src;
    return;
  }

  if (type === "video") {
    const video = document.createElement("video");
    video.autoplay = true;
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.setAttribute("aria-label", slot.dataset.mediaLabel || "Experiment video");

    const source = document.createElement("source");
    source.src = src;
    source.type = "video/mp4";
    video.append(source);
    video.addEventListener("loadedmetadata", () => activateMedia(video), { once: true });
    video.load();
  }
});

const mobileChartMedia = window.matchMedia("(max-width: 640px)");

const watchMobileChartChanges = (render) => {
  if (mobileChartMedia.addEventListener) {
    mobileChartMedia.addEventListener("change", render);
    return;
  }

  mobileChartMedia.addListener(render);
};

document.querySelectorAll("[data-scene-config-chart]").forEach((chart) => {
  const stage = chart.querySelector("[data-chart-stage]");

  if (!stage) {
    return;
  }

  const tasks = [
    {
      label: ["Moved Goal"],
      mobileLabel: ["Moved", "Goal"],
      scores: [42.9, 50.8],
      image: "assets/ood/moved-goal.png",
      alt: "Moved Goal out-of-distribution (OOD) scene-configuration setting.",
    },
    {
      label: ["Additional Objects"],
      mobileLabel: ["Additional", "Objects"],
      scores: [50.6, 63.0],
      image: "assets/ood/additional-objects.png",
      alt: "Additional Objects out-of-distribution (OOD) scene-configuration setting.",
    },
    {
      label: ["Unvisited Region"],
      mobileLabel: ["Unvisited", "Region"],
      scores: [28.0, 51.0],
      image: "assets/ood/unvisited-region.png",
      alt: "Unvisited Region out-of-distribution (OOD) scene-configuration setting.",
    },
  ];
  const methods = [
    { label: "PI0.5", color: "#cfd6df" },
    { label: "SERF", color: "#8fc7f4" },
  ];

  const maxValue = 100;
  const svgNS = "http://www.w3.org/2000/svg";
  const make = (name, attrs = {}) => {
    const element = document.createElementNS(svgNS, name);
    Object.entries(attrs).forEach(([key, value]) => element.setAttribute(key, value));
    return element;
  };
  const tooltip = document.createElement("div");
  tooltip.className = "scene-chart-tooltip";
  tooltip.hidden = true;
  tooltip.setAttribute("role", "tooltip");
  tooltip.innerHTML = `<img alt="" data-tooltip-image />`;

  const tooltipImage = tooltip.querySelector("[data-tooltip-image]");
  chart.append(tooltip);

  const hideTooltip = () => {
    tooltip.hidden = true;
    tooltip.classList.remove("is-visible");
  };

  const showTooltip = (taskIndex, anchor) => {
    const task = tasks[taskIndex];

    if (!tooltipImage || !task) {
      return;
    }

    tooltipImage.src = task.image;
    tooltipImage.alt = task.alt;
    tooltip.hidden = false;
    tooltip.style.visibility = "hidden";
    tooltip.style.opacity = "0";

    const chartRect = chart.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const anchorRect = anchor.getBoundingClientRect();
    const preferredLeft = anchorRect.left - chartRect.left + anchorRect.width / 2 - tooltipRect.width / 2;
    const clampLeft = Math.max(12, Math.min(preferredLeft, chartRect.width - tooltipRect.width - 12));
    const top = anchorRect.bottom - chartRect.top + 12;

    tooltip.style.left = `${clampLeft}px`;
    tooltip.style.top = `${top}px`;
    tooltip.style.visibility = "visible";
    tooltip.style.opacity = "1";
    tooltip.classList.add("is-visible");
  };

  const roundedTopBarPath = (x, top, barWidthValue, barHeightValue, radius) => {
    const bottom = top + barHeightValue;
    const r = Math.min(radius, barWidthValue / 2, barHeightValue);
    return [
      `M ${x} ${bottom}`,
      `L ${x} ${top + r}`,
      `Q ${x} ${top} ${x + r} ${top}`,
      `H ${x + barWidthValue - r}`,
      `Q ${x + barWidthValue} ${top} ${x + barWidthValue} ${top + r}`,
      `L ${x + barWidthValue} ${bottom}`,
      "Z",
    ].join(" ");
  };

  const render = () => {
    const isMobile = mobileChartMedia.matches;
    const width = isMobile ? 736 : 920;
    const height = isMobile ? 288 : 360;
    const margin = isMobile
      ? { top: 52, right: 18, bottom: 66, left: 62 }
      : { top: 64, right: 28, bottom: 70, left: 82 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    const groupWidth = chartWidth / tasks.length;
    const barWidth = isMobile ? 68 : 82;
    const barGap = isMobile ? 10 : 16;
    const labelStartY = margin.top + chartHeight + (isMobile ? 27 : 34);
    const labelLineHeight = isMobile ? 19 : 15;
    const y = (value) => margin.top + chartHeight - (value / maxValue) * chartHeight;

    hideTooltip();
    stage.replaceChildren();

    const svg = make("svg", {
      viewBox: `0 0 ${width} ${height}`,
      role: "img",
      "aria-label": "Scene-configuration generalization bar chart.",
    });

    const axisTitle = make("text", {
      class: "scene-chart-axis-title",
      x: 0,
      y: 0,
      transform: `translate(${isMobile ? 20 : 24} ${margin.top + chartHeight / 2}) rotate(-90)`,
      "text-anchor": "middle",
    });
    axisTitle.textContent = "Task Progress (%) ⬆︎";
    svg.append(axisTitle);

    const legend = make("g", {
      class: "scene-chart-svg-legend",
      transform: `translate(${isMobile ? width / 2 - 142 : width / 2 - 122} ${isMobile ? 18 : 20})`,
    });
    methods.forEach((method, index) => {
      const itemX = index * (isMobile ? 164 : 142);
      legend.append(
        make("rect", {
          class: "scene-chart-svg-legend-swatch",
          x: itemX,
          y: 0,
          width: isMobile ? 20 : 16,
          height: isMobile ? 20 : 16,
          rx: 4,
          fill: method.color,
        })
      );
      const label = make("text", {
        class: "scene-chart-svg-legend-label",
        x: itemX + (isMobile ? 30 : 24),
        y: isMobile ? 17 : 13,
      });
      label.textContent = method.label;
      legend.append(label);
    });
    svg.append(legend);

    const grid = make("g");
    [0, 25, 50, 75, 100].forEach((tick) => {
      const tickY = y(tick);
      grid.append(
        make("line", {
          class: "scene-chart-grid-line",
          x1: margin.left,
          x2: width - margin.right,
          y1: tickY,
          y2: tickY,
        })
      );
      const label = make("text", {
        class: "scene-chart-label",
        x: margin.left - (isMobile ? 10 : 12),
        y: tickY + (isMobile ? 7 : 4),
        "text-anchor": "end",
      });
      label.textContent = String(tick);
      grid.append(label);
    });
    svg.append(grid);

    const bars = [];
    const setActive = (activeBar) => {
      bars.forEach((bar) => {
        const isActive = bar === activeBar;
        bar.classList.toggle("is-active", isActive);
        bar.classList.toggle("is-dimmed", !isActive);
      });
    };
    const clearActive = () => {
      bars.forEach((bar) => {
        bar.classList.remove("is-active", "is-dimmed");
      });
    };

    tasks.forEach((task, taskIndex) => {
      const groupCenter = margin.left + groupWidth * taskIndex + groupWidth / 2;
      const firstBarX = groupCenter - barWidth - barGap / 2;

      methods.forEach((method, methodIndex) => {
        const score = task.scores[methodIndex];
        const barX = firstBarX + methodIndex * (barWidth + barGap);
        const barY = y(score);
        const barHeight = margin.top + chartHeight - barY;
        const bar = make("g", {
          class: "scene-chart-bar",
          tabindex: "0",
          role: "button",
          "aria-label": `${method.label}, ${task.label.join(" ")}, ${score.toFixed(1)} percent`,
        });

        bar.append(
          make("path", {
            d: roundedTopBarPath(barX, barY, barWidth, barHeight, isMobile ? 6 : 9),
            fill: method.color,
          })
        );

        const valueLabel = make("text", {
          class: "scene-chart-value-label",
          x: barX + barWidth / 2,
          y: Math.max(margin.top + (isMobile ? 18 : 12), barY - (isMobile ? 7 : 8)),
          "text-anchor": "middle",
        });
        valueLabel.textContent = score.toFixed(1);
        bar.append(valueLabel);

        const activateBar = () => {
          setActive(bar);
        };
        bar.addEventListener("pointerenter", activateBar);
        bar.addEventListener("focus", activateBar);
        bar.addEventListener("click", activateBar);
        bar.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            activateBar();
          }
        });
        bars.push(bar);
        svg.append(bar);
      });

      const labelLines = isMobile ? task.mobileLabel : task.label;
      labelLines.forEach((line, lineIndex) => {
        const label = make("text", {
          class: "scene-chart-label",
          x: groupCenter,
          y: labelStartY + lineIndex * labelLineHeight,
          "text-anchor": "middle",
          tabindex: "0",
          role: "button",
          "aria-label": `Preview ${task.label.join(" ")} out-of-distribution (OOD) setting`,
        });
        label.textContent = line;
        label.addEventListener("pointerenter", (event) => showTooltip(taskIndex, event.currentTarget));
        label.addEventListener("focus", (event) => showTooltip(taskIndex, event.currentTarget));
        label.addEventListener("click", (event) => showTooltip(taskIndex, event.currentTarget));
        label.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            showTooltip(taskIndex, label);
          }
        });
        label.addEventListener("pointerleave", hideTooltip);
        label.addEventListener("blur", hideTooltip);
        svg.append(label);
      });
    });

    svg.addEventListener("pointerleave", clearActive);
    stage.append(svg);
  };

  chart.addEventListener("pointerleave", hideTooltip);
  render();
  watchMobileChartChanges(render);
});

document.querySelectorAll("[data-recovery-chart]").forEach((chart) => {
  const stage = chart.querySelector("[data-recovery-chart-stage]");

  if (!stage) {
    return;
  }

  const methods = ["PI0.5", "SERF"];
  const success = [13, 19];
  const total = 20;
  const successRate = success.map((value) => (value / total) * 100);
  const recoveryTime = [24.28, 20.49];
  const barColors = ["#d9d9d9", "#90caf9"];
  const lineColor = "#222222";
  const svgNS = "http://www.w3.org/2000/svg";
  const successMin = 40;
  const successMax = 100;
  const timeMin = 19;
  const timeMax = 25;
  const make = (name, attrs = {}) => {
    const element = document.createElementNS(svgNS, name);
    Object.entries(attrs).forEach(([key, value]) => element.setAttribute(key, value));
    return element;
  };
  const roundedTopBarPath = (x, top, barWidthValue, barHeightValue, radius) => {
    const bottom = top + barHeightValue;
    const r = Math.min(radius, barWidthValue / 2, barHeightValue);
    return [
      `M ${x} ${bottom}`,
      `L ${x} ${top + r}`,
      `Q ${x} ${top} ${x + r} ${top}`,
      `H ${x + barWidthValue - r}`,
      `Q ${x + barWidthValue} ${top} ${x + barWidthValue} ${top + r}`,
      `L ${x + barWidthValue} ${bottom}`,
      "Z",
    ].join(" ");
  };

  const render = () => {
    const isMobile = mobileChartMedia.matches;
    const width = isMobile ? 736 : 920;
    const height = isMobile ? 288 : 360;
    const margin = isMobile
      ? { top: 60, right: 68, bottom: 46, left: 64 }
      : { top: 66, right: 84, bottom: 58, left: 76 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    const xStep = chartWidth / methods.length;
    const barWidth = isMobile ? 132 : 150;
    const ySuccess = (value) => margin.top + chartHeight - ((value - successMin) / (successMax - successMin)) * chartHeight;
    const yTime = (value) => margin.top + chartHeight - ((value - timeMin) / (timeMax - timeMin)) * chartHeight;

    stage.replaceChildren();

    const svg = make("svg", {
      viewBox: `0 0 ${width} ${height}`,
      role: "img",
      "aria-label": "Recovery success rate and recovery time chart.",
    });

    const axisTitleGap = isMobile ? 42 : margin.left - 24;

    const leftTitle = make("text", {
      class: "recovery-chart-axis-title",
      x: 0,
      y: 0,
      transform: `translate(${margin.left - axisTitleGap} ${margin.top + chartHeight / 2}) rotate(-90)`,
      "text-anchor": "middle",
    });
    leftTitle.textContent = "Success Rate (%) ⬆︎";
    svg.append(leftTitle);

    const rightTitle = make("text", {
      class: "recovery-chart-axis-title",
      x: 0,
      y: 0,
      transform: `translate(${width - margin.right + axisTitleGap} ${margin.top + chartHeight / 2}) rotate(90)`,
      "text-anchor": "middle",
    });
    rightTitle.textContent = "Recovery Time (s) ⬇︎";
    svg.append(rightTitle);

    const legend = make("g", {
      transform: `translate(${isMobile ? width / 2 - 205 : width / 2 - 184} ${isMobile ? 20 : 22})`,
    });
    legend.append(make("rect", { x: 0, y: 0, width: isMobile ? 20 : 16, height: isMobile ? 20 : 16, rx: 4, fill: "#d9d9d9" }));
    const successLegend = make("text", { class: "recovery-chart-svg-legend-label", x: isMobile ? 30 : 24, y: isMobile ? 17 : 13 });
    successLegend.textContent = "Success Rate";
    legend.append(successLegend);
    legend.append(
      make("line", {
        x1: isMobile ? 230 : 178,
        x2: isMobile ? 276 : 214,
        y1: isMobile ? 10 : 8,
        y2: isMobile ? 10 : 8,
        stroke: lineColor,
        "stroke-width": 3,
        "stroke-linecap": "round",
      })
    );
    legend.append(make("circle", { class: "recovery-chart-marker", cx: isMobile ? 253 : 196, cy: isMobile ? 10 : 8, r: isMobile ? 7 : 5 }));
    const timeLegend = make("text", { class: "recovery-chart-svg-legend-label", x: isMobile ? 300 : 224, y: isMobile ? 17 : 13 });
    timeLegend.textContent = "Recovery Time";
    legend.append(timeLegend);
    svg.append(legend);

    [40, 60, 80, 100].forEach((tick) => {
      const tickY = ySuccess(tick);
      svg.append(make("line", { class: "recovery-chart-grid-line", x1: margin.left, x2: width - margin.right, y1: tickY, y2: tickY }));
      const label = make("text", { class: "recovery-chart-label", x: margin.left - (isMobile ? 10 : 12), y: tickY + (isMobile ? 7 : 4), "text-anchor": "end" });
      label.textContent = String(tick);
      svg.append(label);
    });

    [19, 21, 23, 25].forEach((tick) => {
      const tickY = yTime(tick);
      const label = make("text", { class: "recovery-chart-label", x: width - margin.right + (isMobile ? 10 : 12), y: tickY + (isMobile ? 7 : 4), "text-anchor": "start" });
      label.textContent = String(tick);
      svg.append(label);
    });

    const linePoints = [];
    const bars = [];
    const xLabels = [];
    const setActive = (activeBar) => {
      bars.forEach((bar) => {
        const isActive = bar === activeBar;
        bar.classList.toggle("is-active", isActive);
        bar.classList.toggle("is-dimmed", !isActive);
      });

      xLabels.forEach((label, index) => {
        label.classList.toggle("is-active", bars[index] === activeBar);
      });
    };
    const clearActive = () => {
      bars.forEach((bar) => {
        bar.classList.remove("is-active", "is-dimmed");
      });

      xLabels.forEach((label) => {
        label.classList.remove("is-active");
      });
    };

    methods.forEach((method, index) => {
      const centerX = margin.left + xStep * index + xStep / 2;
      const barX = centerX - barWidth / 2;
      const barY = ySuccess(successRate[index]);
      const barHeight = margin.top + chartHeight - barY;
      const bar = make("g", {
        class: "recovery-chart-bar",
        tabindex: "0",
        role: "button",
        "aria-label": `${method}, success rate ${successRate[index].toFixed(0)} percent, recovery time ${recoveryTime[index].toFixed(1)} seconds`,
      });
      bar.append(make("path", { d: roundedTopBarPath(barX, barY, barWidth, barHeight, isMobile ? 7 : 9), fill: barColors[index] }));
      const valueLabel = make("text", { class: "recovery-chart-value-label", x: centerX, y: barY + (isMobile ? 29 : 25), "text-anchor": "middle" });
      valueLabel.textContent = `${successRate[index].toFixed(0)}%`;
      bar.append(valueLabel);

      const activateBar = () => {
        setActive(bar);
      };
      bar.addEventListener("pointerenter", activateBar);
      bar.addEventListener("focus", activateBar);
      bar.addEventListener("click", activateBar);
      bar.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          activateBar();
        }
      });
      svg.append(bar);
      bars.push(bar);

      const xLabel = make("text", { class: "recovery-chart-label", x: centerX, y: margin.top + chartHeight + (isMobile ? 34 : 36), "text-anchor": "middle" });
      xLabel.textContent = method;
      xLabel.setAttribute("tabindex", "0");
      xLabel.setAttribute("role", "button");
      xLabel.setAttribute("aria-label", `${method} recovery results`);
      xLabel.addEventListener("pointerenter", activateBar);
      xLabel.addEventListener("focus", activateBar);
      xLabel.addEventListener("click", activateBar);
      xLabel.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          activateBar();
        }
      });
      xLabel.addEventListener("pointerleave", clearActive);
      xLabel.addEventListener("blur", clearActive);
      svg.append(xLabel);
      xLabels.push(xLabel);
      linePoints.push([centerX, yTime(recoveryTime[index])]);
    });

    svg.append(make("path", { class: "recovery-chart-line", d: `M ${linePoints[0][0]} ${linePoints[0][1]} L ${linePoints[1][0]} ${linePoints[1][1]}` }));
    linePoints.forEach(([x, yPoint], index) => {
      svg.append(make("circle", { class: "recovery-chart-marker", cx: x, cy: yPoint, r: isMobile ? 8 : 7 }));
      const label = make("text", {
        class: "recovery-chart-value-label",
        x,
        y: yPoint + (index === 0 ? -14 : 24),
        "text-anchor": "middle",
      });
      label.textContent = `${recoveryTime[index].toFixed(1)}s`;
      svg.append(label);
    });

    svg.addEventListener("pointerleave", clearActive);
    stage.append(svg);
  };

  render();
  watchMobileChartChanges(render);
});
