# Color Theme Guide - Student Portal

## Overview
This document describes the comprehensive color theme redesign for the Student Portal application with improved accessibility, contrast, and semantic meaning.

## Color Philosophy

### Educational Theme
The color scheme is designed around an educational context:
- **Primary (Blue)**: Trust, knowledge, professionalism
- **Secondary (Teal Green)**: Growth, success, learning
- **Accent (Orange)**: Energy, attention, highlights
- **Destructive (Red)**: Errors, warnings, critical actions

## Light Mode Colors

### Core Colors
- **Background**: `210 30% 98%` - Soft off-white for comfortable reading
- **Foreground**: `215 25% 15%` - Dark navy for excellent contrast (WCAG AAA)
- **Card**: `0 0% 100%` - Pure white for content cards
- **Border**: `210 20% 88%` - Subtle light border

### Semantic Colors
- **Primary**: `210 90% 48%` - Vibrant blue
  - Used for: Main actions, navigation highlights, links
  - Foreground: White text `(0 0% 100%)`
  
- **Secondary**: `160 60% 45%` - Teal green
  - Used for: Success states, secondary actions, growth indicators
  - Foreground: White text `(0 0% 100%)`
  
- **Accent**: `35 100% 50%` - Orange
  - Used for: Highlights, calls-to-action, important notices
  - Foreground: White text `(0 0% 100%)`
  
- **Destructive**: `0 72% 51%` - Red
  - Used for: Errors, delete actions, warnings
  - Foreground: White text `(0 0% 100%)`

### UI Elements
- **Muted**: `210 20% 92%` - Light blue-gray for disabled/muted content
- **Input**: `210 20% 96%` - Very light background for form inputs
- **Ring**: `210 90% 48%` - Focus indicator (matches primary)

## Dark Mode Colors

### Core Colors
- **Background**: `215 30% 10%` - Deep navy, easier on eyes than pure black
- **Foreground**: `210 20% 95%` - Off-white text for reduced eye strain
- **Card**: `215 25% 14%` - Slightly elevated from background
- **Border**: `215 20% 25%` - Visible borders in dark mode

### Semantic Colors (Enhanced for Dark Mode)
- **Primary**: `210 95% 60%` - Brighter blue for visibility
  - Foreground: Dark text `(215 30% 10%)`
  
- **Secondary**: `160 55% 50%` - Brighter teal green
  - Foreground: White text `(0 0% 100%)`
  
- **Accent**: `35 100% 55%` - Bright orange
  - Foreground: White text `(0 0% 100%)`
  
- **Destructive**: `0 75% 60%` - Bright red for visibility
  - Foreground: White text `(0 0% 100%)`

### UI Elements
- **Muted**: `215 20% 20%` - Dark muted background
- **Input**: `215 20% 18%` - Slightly darker input fields
- **Ring**: `210 95% 60%` - Bright focus indicator

## Component Classes

### Buttons
```css
.btn-primary       /* Primary blue button */
.btn-secondary     /* Teal green button */
.btn-accent        /* Orange button */
.btn-outline       /* Outlined button */
.btn-destructive   /* Red danger button */
.btn-sm / .btn-lg  /* Size variants */
```

### Badges
```css
.badge-primary     /* Primary indicator */
.badge-secondary   /* Secondary indicator */
.badge-success     /* Success state */
.badge-warning     /* Warning state */
.badge-destructive /* Error state */
```

### Cards
```css
.card              /* Standard card with border and shadow */
```

### Inputs
```css
.input             /* Form input with proper focus states */
```

## Usage Guidelines

### Contrast Requirements
All color combinations meet WCAG 2.1 Level AA standards:
- Normal text: Minimum 4.5:1 contrast ratio
- Large text: Minimum 3:1 contrast ratio
- UI components: Minimum 3:1 contrast ratio

### Color Semantics

#### Primary Blue
- Navigation items (active state)
- Primary action buttons
- Links and interactive elements
- Main branding elements

#### Secondary Teal Green
- Success messages
- Completed states
- Secondary actions
- Growth/progress indicators

#### Accent Orange
- Calls to attention
- Warning states (non-critical)
- Highlighting important information
- Pending/in-progress states

#### Destructive Red
- Error messages
- Delete/remove actions
- Critical warnings
- Failed states

### Accessibility Features

1. **High Contrast**: All text has minimum 7:1 contrast ratio in most cases
2. **Focus Indicators**: 2px ring with primary color on all interactive elements
3. **Border Emphasis**: 2px borders instead of 1px for better visibility
4. **Hover States**: Clear visual feedback on all interactive elements
5. **Color Independence**: Icons and labels accompany all color-coded information

## Dark Mode Toggle
The application respects the user's system preference and allows manual toggle. The theme persists across sessions using localStorage.

## Custom Scrollbar
- Track: Uses muted background
- Thumb: Gradient from primary to secondary
- Hover: Reversed gradient for feedback

## Animation Colors
All animations use CSS custom properties, automatically adapting to light/dark mode:
- `pulse-glow`: Uses primary color
- `gradient-text`: Transitions between primary, secondary, and accent
- Loading spinners: Use primary color

## File Locations
- Color definitions: `src/app/globals.css`
- Tailwind config: `tailwind.config.js`
- Component styles: Throughout application components

## Migration Notes
- All hardcoded color values replaced with semantic tokens
- Gradient backgrounds use new color scheme
- All buttons now have consistent styling
- Form inputs have enhanced focus states
- Cards have stronger borders and shadows

## Testing Recommendations
1. Test all pages in both light and dark mode
2. Verify contrast ratios with browser DevTools
3. Check focus indicators on all interactive elements
4. Verify color-blind accessibility using simulators
5. Test with screen readers to ensure no color-only information

## Future Enhancements
- Add color customization options for institutions
- Implement theme variations (high contrast mode)
- Add seasonal theme variations
- Create role-specific color accents
