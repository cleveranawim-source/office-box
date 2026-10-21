---
name: 교무자동화도구 박스
description: 학교 교무 계획을 교실 시간표판처럼 칸으로 읽게 하는 네 도구 모음
colors:
  rail: "#1f4d3a"
  rail-deep: "#163a2b"
  rail-ink: "#eef4ef"
  rail-mute: "#b3cbbc"
  board: "#fafaf7"
  paper: "#ffffff"
  ink: "#1a1d1a"
  ink-2: "#3f4a42"
  mute: "#5b6b60"
  line: "#d6d9d0"
  line-2: "#e8eae3"
  wash: "#f2f4ee"
  t1-violet: "#6d3fc0"
  t1-wash: "#f1ebfb"
  t2-blue: "#2563c9"
  t2-wash: "#e9f0fc"
  t3-green: "#1e7f3a"
  t3-wash: "#e7f4ea"
  t4-yellow: "#f2a900"
  t4-wash: "#fdf4dc"
  rubric: "#c8102e"
  rubric-wash: "#fdeef0"
  ok: "#1f6b3f"
  short-wash: "#e6e8e2"
  hol-ink: "#1f4d3a"
  excluded: "#9aa39b"
typography:
  display:
    fontFamily: "Pretendard Variable, Pretendard, -apple-system, Apple SD Gothic Neo, Malgun Gothic, sans-serif"
    fontSize: "30px"
    fontWeight: 800
    lineHeight: 1.5
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Pretendard Variable, Pretendard, sans-serif"
    fontSize: "26px"
    fontWeight: 800
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Pretendard Variable, Pretendard, sans-serif"
    fontSize: "22px"
    fontWeight: 800
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  title-sm:
    fontFamily: "Pretendard Variable, Pretendard, sans-serif"
    fontSize: "16px"
    fontWeight: 800
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Pretendard Variable, Pretendard, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: "Pretendard Variable, Pretendard, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Pretendard Variable, Pretendard, sans-serif"
    fontSize: "12.5px"
    fontWeight: 700
    lineHeight: 1.5
  numeric:
    fontFamily: "Pretendard Variable, Pretendard, sans-serif"
    fontSize: "13px"
    fontWeight: 700
    fontFeature: "tnum"
rounded:
  hair: "2px"
  chip: "4px"
  base: "6px"
  board: "10px"
spacing:
  gap-grid: "2px"
  xs: "6px"
  sm: "8px"
  md: "14px"
  lg: "20px"
  xl: "28px"
  home: "44px"
components:
  button:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.base}"
    padding: "8px 14px"
    typography: "{typography.label}"
  button-hover:
    backgroundColor: "{colors.wash}"
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.base}"
    padding: "8px 14px"
  button-primary-hover:
    backgroundColor: "#2e332e"
  button-sm:
    padding: "5px 10px"
    rounded: "{rounded.base}"
  button-danger-hover:
    backgroundColor: "{colors.rubric-wash}"
    textColor: "{colors.rubric}"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.base}"
    padding: "7px 10px"
    height: "36px"
  chip-need:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.rubric}"
    rounded: "{rounded.chip}"
    padding: "2px 8px"
  chip-ok:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ok}"
    rounded: "{rounded.chip}"
    padding: "2px 8px"
  chip-quiet:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.mute}"
    rounded: "{rounded.chip}"
    padding: "2px 8px"
  chip-warn:
    backgroundColor: "{colors.short-wash}"
    textColor: "{colors.ink}"
    rounded: "{rounded.chip}"
    padding: "2px 8px"
  rail-nav-item:
    textColor: "{colors.rail-ink}"
    rounded: "{rounded.base}"
    padding: "8px 10px"
  rail-nav-item-active:
    backgroundColor: "{colors.board}"
    textColor: "{colors.ink}"
  tool-band:
    textColor: "{colors.paper}"
    padding: "9px 28px"
    typography: "{typography.label}"
  period-bar-cell:
    backgroundColor: "{colors.line-2}"
    rounded: "{rounded.hair}"
    height: "12px"
  period-bar-cell-large:
    height: "22px"
---

# Design System: 교무자동화도구 박스

## Overview

**Creative North Star: "교실 시간표판 (The Classroom Timetable Board)"**

The app is a felt-green bulletin rail holding a white board, and everything on the board is read the way a teacher reads a timetable: day columns, period cells, ink-ruled grids. Schedules, hours and class lists sit in cells separated by 2px ink rules; each of the four tools owns one subject-paper color that appears only on its header band and in its data. Density is Operate-mode: 13-14px body, tabular numerals, tables and calendars that fill the board, no decoration between the user and the data.

State is carried by line shape before color: a solid line means confirmed, a dashed rubric line means a person must decide, a strike line means excluded. Computed shortfalls get their own tool-neutral mark (grey wash, ink text, ink underline) so the rubric red never means two things. The board is flat; depth comes from the green rail framing a pale board and from ink borders, not from shadows. The rejected default is the grey SaaS sidebar over a card grid.

**Key Characteristics:**
- Green rail (232px) framing a pale board with a 10px corner; board content on white paper cells.
- Grids drawn as 2px gaps over an ink background inside a 2px ink border.
- Four tool colors used only for header bands, period-bar fills and tool data highlights.
- One rubric red, dashed, reserved for human decisions, unresolved notations and rule violations.
- The 7-cell period bar is the shared signature across every tool.
- Pretendard throughout, tabular numerals wherever numbers align.

## Colors

A deep felt green and an ink-black on near-white paper, with four saturated subject colors and one rubric red held in strict reserve.

### Primary
- **Felt Rail Green** (rail): the page ground and left rail; the frame every board sits in. Its deeper step (rail-deep) is the rail hover and the working-year plate.
- **Timetable Ink** (ink): text, all grid rules and outer borders, the primary button fill, selected segment and selected student fill.

### Secondary
- **Tool 01 Violet** (t1-violet): 학사일정. Violet, not red, so rubric red stays exclusive.
- **Tool 02 Blue** (t2-blue): 시수계산. Also the focus-ring and link color.
- **Tool 03 Green** (t3-green): 범교과 편성.
- **Tool 04 Yellow** (t4-yellow): 반배정. The only tool color that carries ink text instead of white.
- Each tool color has a pale wash (t1-wash … t4-wash) used for hover and selected rows inside that tool.

### Tertiary
- **Rubric Red** (rubric): dashed borders and text for 사람이 정할 것, unresolved notations and rule violations; its wash (rubric-wash) is only the hover of those items and of the danger button.
- **Confirmed Green** (ok): solid chips, completed step numbers and loaded-state text.

### Neutral
- **Board** (board): the board surface and the active rail item.
- **Paper** (paper): cell, table, panel and input backgrounds.
- **Ink 2** (ink-2) and **Mute** (mute): secondary text and labels, hints, meta.
- **Line** (line) and **Line 2** (line-2): inner table rules, separators, empty period cells.
- **Wash** (wash): table headers, notes, hover of neutral buttons.
- **Shortfall Grey** (short-wash): background of computed shortfalls.
- **Excluded Grey** (excluded): strike lines and excluded chips.
- **Holiday Hatch**: a 135deg repeating stripe of #e2ede6 / #f3f8f4 (5px bands) with hol-ink text, marking holidays on the calendar.

### Named Rules
**The One Rubric Rule.** Rubric red, always dashed, marks only what a person must decide, unresolved notations, and rule violations. Nothing computed, decorative or branded uses it.

**The Shortfall Is Not a Decision Rule.** A computed shortfall uses Shortfall Grey with ink text and a 2px ink underline (cells) or a 1.5px ink border (chips). It is tool-neutral and never red or yellow.

**The Subject Paper Rule.** Tool colors appear only on that tool's header band, rail tab, period-bar fills and in-tool data highlights; never on generic buttons, text or chrome.

## Typography

**Display Font:** Pretendard Variable (with Pretendard, -apple-system, Apple SD Gothic Neo, Malgun Gothic)
**Body Font:** same family
**Label/Mono Font:** same family with tabular numerals

**Character:** One Korean grotesque at heavy weights for headings and plain weights for working text; it reads like a printed school form, not a brand site.

### Hierarchy
- **Display** (800, 30px): the home question only.
- **Headline** (800, 26px): tool page titles.
- **Title** (800, 22px, 1.25): timetable column titles; 16px/800 for step and panel titles (15px in the panel).
- **Body** (400, 14px, 1.5): default; ledes at 15px, descriptions capped near 70-72ch.
- **Body small** (13-13.5px, 1.6): table cells, cell descriptions, field labels (600).
- **Label** (700, 12-12.5px): chips, header bands, calendar day numbers, hints at 400.

### Named Rules
**The Tabular Rule.** Every number that can sit above another number (counts, hours, dates, period numbers) uses tabular numerals.

**The Keep-All Rule.** Korean text wraps with word-break keep-all; headings balance, paragraphs wrap pretty.

## Layout

A two-part shell: a sticky 232px green rail and a flexible board inset 14px from the top, right and bottom with a 10px corner. Home pads 36px 44px; tool screens stack a full-width color band (9px 28px), a head (22px 28px, ink 2px bottom rule) and a body (22px 28px 40px, 20px gaps).

Grids (home timetable, input steps, class columns) are CSS grids with a 2px gap over an ink background inside a 2px ink border, so the dividers are the ink showing through. The home timetable is four equal columns; steps default to two; class columns are at least 170px. The schedule tool splits into calendar plus a 300px sticky panel. Spacing steps observed: 2, 6, 8, 12-14, 18-20, 24-28px.

Responsive: at 1100px the timetable drops to two columns and the split panel stacks under the calendar; at 760px the rail becomes a top band with wrapped nav, storage status hides, the board loses its side margins, and all grids go to one column.

## Elevation & Depth

Flat. Depth comes from the green rail around the pale board and from ink borders; surfaces do not float. The only shadow is the transient toast.

### Shadow Vocabulary
- **Toast** (`box-shadow: 0 1px 2px rgb(26 29 26 / 0.06), 0 6px 18px -6px rgb(26 29 26 / 0.14)`): the bottom-center confirmation toast only.

### Named Rules
**The Ink Not Shadow Rule.** Separate and contain with ink borders (1.5-2px) and 2px ink-gap grids, not with shadows or tinted cards.

## Shapes

Small, even corners: 6px for buttons, inputs, panels, tables and grids; 4px for chips, count badges and step numbers; 2-3px for period-bar cells, tabs and calendar events; 10px only for the board and the top of the tool band. Borders are the form language: 2px ink for outer grids and calendars, 1.5px ink for buttons, segments, panels and tables, 1px line for inner rules.

## Components

### Buttons
- **Shape:** 6px corners, 1.5px ink border.
- **Default:** paper with ink text, 700 weight, 8px 14px; hover to wash; press nudges down 1px.
- **Primary:** ink fill, white text; hover #2e332e. On home only the next-step CTA in the timetable is primary; tool screens use primary for the one run action of a setup step (배치하기, 계산하기, 나누기) and for the export action in the tool head.
- **Small / Ghost / Danger:** small at 5px 10px and 13px; ghost has no border or fill until hover; danger is line-bordered and turns rubric only on hover. The irreversible 데이터 지우기 lives isolated at the bottom of the rail with a two-step confirm.

### Chips
- **Style:** 4px corners, 1.5px border, 12.5px/700, paper background.
- **Variants:** need (rubric dashed), ok (confirmed-green solid), quiet (line border, mute text), warn (ink border on Shortfall Grey), off (excluded grey with strike-through).

### Count Badges
- Small 4px badges (11px/800, tabular) beside segment labels and step titles: rubric dashed when the count is items a person must decide; the neutral variant (1.5px solid ink border, ink text) for plain counts.

### Cards / Containers
- **Grid cells:** white paper inside ink-gap grids, 18-20px padding, header bands in tool color with tabular summaries on the right.
- **Panel:** paper, 1.5px ink border, 6px, 14px 16px, sticky on wide screens.
- **Note:** wash fill, mute 12.5px text, no border.

### Inputs / Fields
- **Style:** paper, 1.5px line border, 6px, min-height 36px (30px small).
- **Focus:** border goes ink plus a 3px blue ring at 18% opacity; global focus-visible is a 2px blue outline offset 2px.
- **Error:** rubric text at 13px/600 with a leading alert icon.

### Navigation
- Rail links at 14px rail-ink with a tabular tool number and an 8x20px tool-color tab; hover to rail-deep; current page becomes a board-colored pill with ink text at 700.

### Segmented Control
- 1.5px ink outline with ink dividers; pressed segment fills ink with white text.

### Tables and Calendar
- Sticky wash header with a 1.5px ink bottom rule; 1px line-2 inner rules; tabular cells; row hover #f7f8f4; selected row in the tool wash.
- Calendar: 2px ink frame, week number column in wash, holidays in the hatch, events as 12px rows with a hairline underline and a mini period bar; selected event fills the tool color; events needing a decision get a rubric dashed outline.

### Period Bar (signature)
- A row of n (default 7) cells with 2px gaps; empty cells line-2 with small numerals, occupied cells filled with the tool color and white numerals. Three sizes: 12px inline, 22px large on home, 5px numeral-less inside calendar events. Used in every tool for periods an event, loss or allocation occupies.

### Line-Shape Legend
- 26px samples: 2px solid ink (확정), 2px dashed rubric (사람이 정할 것), 2px solid excluded grey (제외), plus the warn chip for computed shortfalls.

## Do's and Don'ts

### Do:
- **Do** draw every grid as 2px gaps over ink inside a 2px ink border.
- **Do** pair every status color with a line shape (solid, dashed, strike) or a border style; color alone never carries state.
- **Do** reuse the 7-cell period bar whenever periods are shown, filled with the owning tool's color.
- **Do** keep a single primary button per decision area; on home it marks only the next step.
- **Do** use tabular numerals for all aligned numbers.
- **Do** keep the destructive data reset isolated in the rail behind a confirm.

### Don't:
- **Don't** use rubric red for computed results, branding, or a tool color.
- **Don't** mark computed shortfalls in red or yellow; use Shortfall Grey with an ink underline or border.
- **Don't** spread tool colors onto generic buttons, links or chrome.
- **Don't** separate content with drop shadows or floating cards.
- **Don't** fall back to a grey SaaS sidebar with a card grid.
