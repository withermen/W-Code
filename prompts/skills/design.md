# Design Skills (integrated from AI Things)

When the agent calls `apply_design_skill`, it should follow these principles:

## Color
- Never use purple/indigo → blue gradients
- Avoid gradient text
- Use intentional, high-contrast colors
- Minimum 4.5:1 contrast for body text

## Typography
- Do not default to Inter / Roboto / Geist only
- Strong hierarchy
- Readable line length (50-75 characters)
- Avoid eyebrow labels and excessive uppercase

## Layout
- Avoid three identical feature cards
- Mix alignment, create visual flow
- Generous whitespace
- One dominant element per viewport

## Components
- No default glassmorphism on static cards
- No colored left-border stripes on everything
- Real empty states
- Consistent interactive states

## Motion
- Respect prefers-reduced-motion
- Animate only what matters
- Keep under 300ms

## Copy
- Specific, not generic
- No buzzwords (seamless, elevate, next-level)
- Real numbers and outcomes
- Clear CTAs

The agent should apply these automatically when building UI.
