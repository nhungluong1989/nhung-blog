---
title: "Same prompt, better slide: why LLMs draw nicer HTML than PPTX"
description: Why the same prompt produces a better-looking HTML/SVG slide than a .pptx file, with a worked example and the two-step workflow that borrows the win.
pubDate: 2026-07-30
tags:
  - ai engineering
  - reading notes
---

I've hit this pattern enough times now that it stopped feeling like a coincidence: ask an LLM for a slide and you get a `.pptx` back with cramped margins, a font nobody asked for, and colors that don't quite agree with each other. Ask for the *exact same content* as HTML instead, and it's suddenly composed — clear hierarchy, a real focal point, spacing that looks intentional. Same model, same prompt, same idea. Different format, different quality.

I went looking for why, because it changes how I ask for slides now. The short version: it isn't the model being lazier with one format. It's that the two formats hand the model completely different amounts of control.

## What HTML/SVG gives the model that PPTX doesn't

**It draws directly instead of describing a drawing.** In CSS and SVG, what the model writes *is* the rendered pixel. A hex color is the color. One `grid-template-columns` line is three even columns. Want the headline number three times bigger than the label under it? Change one `font-size`. There's no translation step between intent and output.

**Rendering is standardized.** Every browser paints CSS and SVG against the same spec, so the model can predict what its markup will look like with real confidence — the code-to-pixel relationship doesn't shift depending on what opens the file.

**The model has actually seen good design.** The training data for "what does a well-designed page look like" is enormous — billions of styled pages, most of them HTML/CSS. The model isn't inventing taste from nothing; it's pattern-matching against a huge corpus of layouts, palettes, and type systems that already work.

PPTX loses on all three counts. A `.pptx` is an OpenXML archive — a machine format, not a drawing surface — and the model usually reaches it through a library (`python-pptx`, `pptxgenjs`) rather than writing the drawing directly. That means every text box and shape needs an absolute X/Y position instead of a flexible layout; there's no CSS-grade gradients, shadows, or rounded-corner shorthand; the font you name might not exist on whoever opens the file and gets silently swapped; and there's simply far less "beautifully designed PPTX" in the training data than there is beautifully designed web. The output tends to read as *assembled* rather than *designed* — text blocks with no clear winner, margins that are close but not aligned, a palette that's technically applied but not composed.

## The same prompt, two outputs

Here's a prompt I've actually used, almost verbatim, while testing this:

> Create a 16:9 slide titled "Q3 2026 Revenue Highlights." Content: total revenue $4.2M, up 18% quarter over quarter; three growth drivers — Enterprise deals (+$1.1M), APAC expansion (+$400K), reduced churn (2.1% → 1.4%); one forward-looking note: "On track to hit $18M FY target." Style: dark navy background, one teal accent color, make the revenue number the visual hero, three drivers in three even columns with an icon each.

Asked for as SVG, this is the actual output — not a screenshot, the real markup rendering live in your browser right now:

<svg viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg" font-family="Inter, 'Segoe UI', system-ui, sans-serif" style="width:100%;height:auto;border-radius:12px;">
  <rect width="1280" height="720" fill="#0d1b2a"/>
  <rect width="1280" height="6" fill="#2dd4bf"/>
  <text x="80" y="112" fill="#ffffff" font-size="40" font-weight="700">Q3 2026 Revenue Highlights</text>
  <rect x="80" y="128" width="130" height="5" rx="2.5" fill="#2dd4bf"/>
  <text x="76" y="300" fill="#ffffff" font-size="150" font-weight="800" letter-spacing="-4">$4.2M</text>
  <rect x="560" y="222" width="240" height="66" rx="33" fill="#2dd4bf"/>
  <text x="680" y="265" fill="#0d1b2a" font-size="30" font-weight="700" text-anchor="middle">&#9650; 18% QoQ</text>
  <rect x="80" y="380" width="346" height="230" rx="18" fill="#17253f"/>
  <circle cx="126" cy="436" r="26" fill="#2dd4bf" opacity="0.18"/>
  <text x="126" y="447" fill="#2dd4bf" font-size="28" font-weight="700" text-anchor="middle">&#127970;</text>
  <text x="112" y="510" fill="#8aa0c0" font-size="23" font-weight="500">Enterprise deals</text>
  <text x="112" y="560" fill="#2dd4bf" font-size="40" font-weight="800">+$1.1M</text>
  <rect x="467" y="380" width="346" height="230" rx="18" fill="#17253f"/>
  <circle cx="513" cy="436" r="26" fill="#2dd4bf" opacity="0.18"/>
  <text x="513" y="447" fill="#2dd4bf" font-size="28" font-weight="700" text-anchor="middle">&#127760;</text>
  <text x="499" y="510" fill="#8aa0c0" font-size="23" font-weight="500">APAC expansion</text>
  <text x="499" y="560" fill="#2dd4bf" font-size="40" font-weight="800">+$400K</text>
  <rect x="854" y="380" width="346" height="230" rx="18" fill="#17253f"/>
  <circle cx="900" cy="436" r="26" fill="#2dd4bf" opacity="0.18"/>
  <text x="900" y="447" fill="#2dd4bf" font-size="28" font-weight="700" text-anchor="middle">&#128201;</text>
  <text x="886" y="510" fill="#8aa0c0" font-size="23" font-weight="500">Reduced churn</text>
  <text x="886" y="560" fill="#2dd4bf" font-size="40" font-weight="800">2.1% &#8594; 1.4%</text>
  <line x1="80" y1="660" x2="1200" y2="660" stroke="#1e3252" stroke-width="1.5"/>
  <text x="80" y="695" fill="#8aa0c0" font-size="24" font-weight="500">On track to hit $18M FY target</text>
  <text x="1200" y="695" fill="#2dd4bf" font-size="24" font-weight="700" text-anchor="end">&#8594;</text>
</svg>

Notice what's doing the work: the `$4.2M` is the obvious hero because it's the only text at 150px. The growth badge is a pill, not a label, so it reads as a highlight rather than a footnote. The three drivers are identical rectangles at identical Y — the model didn't have to *reason* its way to alignment, the grid math is trivial in this format. None of this required unusual skill from the model; it required a format where "make this the biggest thing on the slide" is a single number change.

Ask the same model for the same content as a `.pptx` via `pptxgenjs` or `python-pptx`, and it now has to do all of that arithmetic itself — compute inch or EMU coordinates for every shape and text box separately, decide the column gap by hand, and pick a font hoping it's installed on whoever opens the file. Nothing stops it from getting there, but nothing helps it either. In practice the output I get from that path is flatter: the revenue number sized like a slightly-larger headline rather than a hero, three text blocks with uneven gaps, no pill, no clear "look here first."

## The workflow this justifies: prompt → HTML/SVG → PPTX

If the actual deliverable has to be an editable `.pptx` — because someone needs to present live and tweak it in PowerPoint — the fix isn't to give up on the nicer output. It's to stop asking for both the design and the packaging in one leap.

1. **Draft in HTML/SVG first.** Let the model do the part it's actually good at: layout, palette, hierarchy, focal point.
2. **Sign off on that design.** Once it looks right, treat it as the spec — the ambiguity is gone.
3. **Rebuild it in PPTX from that spec.** Now the model isn't inventing a layout from a paragraph of requirements; it's transcribing a design that already exists into shapes and text boxes. That's a much narrower, much more mechanical task, and it shows in the result.

I liked this enough that I wrote it into how I ask for decks going forward: default to the HTML draft, get a yes, only then generate the real file. The one exception is when I explicitly want to skip straight to `.pptx` — usually because I'm editing an existing deck rather than designing a new one, where there's no blank-canvas problem to solve in the first place.

It's also worth being honest about when the detour isn't worth it. If you're filling in a well-built template — a "skill" or master deck with the layout already decided — going straight to PPTX is often fine, because the model isn't inventing the design, just the content. The HTML step earns its keep specifically when there's no template: a free-form slide where hierarchy and palette have to be invented from scratch. And "prettier" isn't the same as "more useful" — an HTML mockup that only ever gets viewed on a screen or shared as a link was never actually a PowerPoint problem to begin with.
