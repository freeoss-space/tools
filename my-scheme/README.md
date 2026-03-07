# My Scheme

## Description

Generate your own color scheme with color picker, references, live preview, and export as CSS custom properties.

Use tools like Base16/Base24/Base46, NvChad, and Tinted Theming to create ports for your applications.

## Interface

### Left Sidebar

- Color picker
    - By default, 16 color blocks are displayed in a list-style card
    - When clicking the color, a color picker dialog opens where you can select a new color
    - On the left side of the list item, the color block
    - On the right side of the list item, the color name and hex/rgb/hsl/oklch values
    - At the bottom of the list, a "Add color" button to add a custom color
- Preview
    - Shows a live preview of the color scheme in a simulated interface
    - Simulates a code editor, a terminal, and a web page with components from Daisy UI
    - At the top, a selector to choose between different preview modes
    - In the main panel, the preview interface shows the color scheme applied to the simulated components
- Export
    - At the bottom of the page, a button to export the color scheme as multiple different formats:
        - CSS variables
        - Generate ports with Base16/Base24/Base46, NvChad or Tinted Theming
        - Export as a hash URL to be shared, and when opened, the color scheme is automatically applied
