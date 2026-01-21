# Full Coaster Tracks Configuration (Saved)

This configuration has tracks crossing through the center of the hero.
Saved in case we want to revert.

## Track Paths (TSX)
\`\`\`jsx
{/* Main track path - dramatic drop into loop then helix out */}
<path
  id="track1"
  d="M-50 250
     Q100 250 180 320
     Q260 400 340 500
     Q380 560 420 560
     Q480 560 500 480
     Q520 400 500 320
     Q480 240 520 200
     Q560 160 620 200
     Q680 240 680 320
     Q680 380 640 400
     Q580 430 560 380
     Q540 320 580 280
     Q620 240 680 260
     L780 300
     Q860 330 940 280
     Q1020 230 1100 260
     Q1180 290 1260 250"
/>
{/* Second track - sweeping airtime hills */}
<path
  id="track2"
  d="M-30 450
     Q80 350 200 380
     Q320 410 400 340
     Q480 270 580 300
     Q680 330 760 260
     Q840 190 940 220
     Q1040 250 1140 180
     Q1200 140 1280 160"
/>
{/* Third track - steep initial drop with banked turn */}
<path
  id="track3"
  d="M1250 480
     Q1150 500 1050 580
     Q950 660 850 620
     Q750 580 700 500
     Q650 420 550 440
     Q450 460 350 400
     Q250 340 150 380
     Q50 420 -50 380"
/>
\`\`\`

## Animation Durations
- Track 1: 35s (offset -17s for second car)
- Track 2: 30s (offset -15s for second car)
- Track 3: 28s

## Opacity Values (Light Mode)
- track-1 .rail: 0.1
- track-2 .rail: 0.08
- track-3 .rail: 0.06
- track-1 .ties: 0.07
- track-2 .ties: 0.05
- track-3 .ties: 0.04
- supports: 0.04
- car-1 body: 0.45, wheel: 0.5
- car-1b body: 0.3, wheel: 0.35
- car-2 body: 0.35, wheel: 0.4
- car-2b body: 0.25, wheel: 0.3
- car-3 body: 0.3, wheel: 0.35
