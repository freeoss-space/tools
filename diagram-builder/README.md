# Diagram Builder

Build visual diagrams of anything — a home network, infrastructure, org charts —
where every node can have a **custom uploaded image** (or a built-in icon), the
node name is displayed **below the image**, and connections between nodes can be
**named** (e.g. "ethernet", "wifi", "fiber").

## Built on Mermaid

Rather than reinventing graph layout and rendering, this tool delegates all of
that to [Mermaid](https://mermaid.js.org) (loaded from CDN, no build step):

- Layout/rendering: Mermaid flowcharts (`flowchart TD` / `flowchart LR`)
- Image nodes: Mermaid's native [image shape](https://mermaid.js.org/syntax/flowchart.html#image-shape)
  (`node@{ img: "...", label: "...", pos: "b" }`, available since Mermaid v11.3),
  which renders an image with the label underneath — exactly the behavior this
  tool needs
- Named connections: Mermaid edge labels (`A -- "ethernet" --> B`)

Related standalone projects that do similar things (heavier, canvas-based):
[draw.io / diagrams.net](https://www.drawio.com) and
[Excalidraw](https://excalidraw.com). This tool intentionally stays tiny and
form-based, and gives you the portable Mermaid source as an export.

## Features

- Add nodes with a name; pick from built-in stroke-style icons (router, switch,
  access point, firewall, server, NAS, desktop, laptop, phone, printer, camera,
  TV, internet, cloud) or upload any image (downscaled and stored locally)
- Name each connection and choose its style (arrow, dashed, plain line)
- Vertical or horizontal layout
- Zoomable, scrollable preview; mobile layout with Edit/Diagram tabs
- Everything persists in `localStorage` — nothing leaves your browser
- Export as PNG, SVG, project JSON (re-importable), or copy the raw Mermaid
  source to paste into anything that speaks Mermaid (GitHub, Obsidian, Notion…)
