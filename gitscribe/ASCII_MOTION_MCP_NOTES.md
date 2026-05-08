# ASCII Motion MCP usage for GitScribe mascot

Based on https://docs.ascii-motion.com/mcp:

1. Install server: `npm install -g ascii-motion-mcp`
2. Configure MCP client with:
   - command: `ascii-motion-mcp`
   - args: `--live --project-dir /path/to/projects`
3. Ask the assistant for MCP auth token.
4. Open `ascii-motion.app` and connect token from **☰ → MCP Connection**.
5. Prompt example used:

```text
Create a playful face-only mascot for an app called GitScribe.
Use only Tailwind purple palette colors.
The mascot should remind users of git branch geometry.
No mouth or nose. Keep expressive eyes.
Add a simple looping animation (gradient rotation + tiny bubbles).
Export as SVG.
```

This repository includes a handcrafted SVG output in `gitscribe/logo.svg` following those constraints.
