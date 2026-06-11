# SERF Project Page

Static project page for SERF: Spatiotemporal Environment and Robot Feature Map for Long-Horizon Mobile Manipulation.

## Preview

Open `index.html` directly in a browser, or serve the folder locally:

```bash
uv run python -m http.server 8000 --directory project-page
```

Then visit `http://127.0.0.1:8000`.

## Content

- `index.html` contains the page copy, author links, paper links, and video sections.
- `styles.css` contains all layout and responsive styling.
- `scripts.js` controls the BEHAVIOR-1K task video tabs.
- `assets/` contains the framework figure and videos used by the page.

## Experiment Assets

The BEHAVIOR-1K qualitative rollout comparison loads task videos from `assets/experiments/`:

- `assets/experiments/task-0021_pi0.5.mp4`
- `assets/experiments/task-0021_ours.mp4`
- `assets/experiments/task-0022_pi0.5.mp4`
- `assets/experiments/task-0022_ours.mp4`
- `assets/experiments/task-0026_pi0.5.mp4`
- `assets/experiments/task-0026_ours.mp4`

Other experiment media:

- `assets/ood_configurations/goal_ood.png`
- `assets/ood_configurations/task_ood.png`
- `assets/ood_configurations/region_ood.png`
- `assets/recovery/image_ft_recovery_result_x4.mp4`
- `assets/recovery/ours_recovery_result_x4.mp4`

The OOD configuration PNGs were rendered from the corresponding PDFs in `assets/ood_configurations/` and are shown through the reactive scene-configuration preview card.
The scene-configuration graph is rendered directly from the data in `scripts.js`.
The recovery graph is rendered directly from the data in `assets/temp.py`.

This folder is intentionally framework-free so the page can be deployed as static files.
