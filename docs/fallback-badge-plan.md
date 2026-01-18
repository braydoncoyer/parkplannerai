# Fallback Prediction Badge Update

## Summary
Update the existing fallback prediction notice in the PlanWizard's "Your Plan" step to communicate that we're using estimated wait times due to system availability.

## Current Implementation
**File:** `src/components/plan-wizard/PlanWizard.tsx` (lines 1883-1895)

The notice already exists and displays when `report.predictionSource === 'hardcoded'`.

**Current copy:**
- Title: "Using estimated wait times"
- Text: "We're still collecting historical data for smarter predictions. These estimates are based on typical patterns for this time of year."

## Proposed Change

**New copy:**
- Title: "Using estimated wait times" (keep the same - it's accurate and non-alarming)
- Text: "Our systems are being slow, so we're estimating based on today's current wait times and typical patterns."

## Styling
The existing CSS (`.pw-prediction-notice` in `PlanWizard.css` lines 2710-2781) already:
- Uses warm cream/gold colors that match the app theme
- Has subtle slide-down animation
- Is non-alarming and informative

**No CSS changes needed** - the current styling fits the requirements perfectly.

## Files to Modify

| File | Change |
|------|--------|
| `src/components/plan-wizard/PlanWizard.tsx` | Update the notice text content (line 1890-1891) |

## Code Change

**Before (line 1890-1891):**
```tsx
<span className="pw-prediction-notice-text">
  We're still collecting historical data for smarter predictions. These estimates are based on typical patterns for this time of year.
</span>
```

**After:**
```tsx
<span className="pw-prediction-notice-text">
  Our systems are being slow, so we're estimating based on today's current wait times and typical patterns.
</span>
```

## Verification
1. Run the dev server: `npm run dev`
2. Navigate to `/plan` and complete the wizard to reach the "Your Plan" step
3. If Convex is slow or unavailable, verify the updated notice appears with the new copy
4. Confirm the styling remains subtle and non-alarming

## Visual Reference
The badge looks like this (warm cream background with gold accents):

```
┌────────────────────────────────────────────────────────────┐
│  🕐  Using estimated wait times                            │
│      Our systems are being slow, so we're estimating       │
│      based on today's current wait times and typical       │
│      patterns.                                             │
└────────────────────────────────────────────────────────────┘
```
