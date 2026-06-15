# 🎓 AI-Powered CGPA Calculator — Project Roadmap

> **Differentiator**: Unlike traditional entry-based CGPA calculators, this app lets users
> upload a photo/scan of their gradesheet, automatically extracts subject names, credits, and grades
> using AI vision, and presents an editable preview before calculating the CGPA.

---

## ✅ Tech Stack

| Layer | Technology | Reason |
|---|---|---|
| **Frontend** | HTML + Vanilla CSS + JavaScript | Lightweight, no framework overhead |
| **Styling** | Vanilla CSS (custom design system) | Full control, premium aesthetics |
| **Image OCR / Parsing** | Google Gemini 1.5 Flash API (Vision) | Best-in-class multimodal OCR, free tier available |
| **Fallback OCR** | Tesseract.js | Client-side OCR if no API key provided |
| **Fonts** | Google Fonts (Inter / Outfit) | Modern, clean typography |
| **Hosting** | GitHub Pages / Vercel (static) | Free, zero-config deployment |
| **Storage** | Browser LocalStorage | Persist user data across sessions |

> **Why Gemini Vision?**
> Gradesheet images vary wildly in layout (tables, scanned PDFs, phone photos, watermarks).
> Gemini Vision can understand context and extract structured data even from messy images,
> far better than regex-based Tesseract OCR alone.

---

## 🗺️ Phases Overview

```
Phase 1 → Project Setup & Design System
Phase 2 → Image Upload & Preview UI
Phase 3 → AI OCR Integration (Gemini Vision)
Phase 4 → Editable Data Table & Validation
Phase 5 → CGPA Calculation Engine
Phase 6 → Results UI & Export
Phase 7 → Polish, Animations & Accessibility
Phase 8 → Deployment
```

---

## Phase 1 — Project Setup & Design System

**Goal**: Establish the folder structure, design tokens, and base styles.

### Tasks
- [ ] Create `index.html` — semantic HTML skeleton with meta tags, SEO
- [ ] Create `style.css` — full design system:
  - Color palette (dark mode first, accent colors)
  - Typography scale
  - Spacing & layout tokens
  - Button, card, input component styles
  - Glassmorphism card effects
- [ ] Create `app.js` — main JS entry point
- [ ] Add Google Fonts import (`Inter` or `Outfit`)
- [ ] Set up folder structure:

```
cgpacalc/
├── index.html
├── style.css
├── app.js
├── modules/
│   ├── ocr.js          # Gemini Vision API calls
│   ├── parser.js       # Parse OCR response → structured data
│   ├── calculator.js   # CGPA logic
│   ├── table.js        # Editable table renderer
│   └── export.js       # PDF / copy result
├── assets/
│   └── icons/
└── roadmap.md
```

### Deliverable
A styled, empty shell with the design system in place. Navigation, hero section visible.

---

## Phase 2 — Image Upload & Preview UI

**Goal**: Build the drag-and-drop image upload area with live image preview.

### Tasks
- [ ] Design a full-width **drag-and-drop upload zone** with:
  - Dashed animated border on hover
  - File picker fallback (`<input type="file" accept="image/*,.pdf">`)
  - Drag-over highlight state
- [ ] Show a **thumbnail preview** of the uploaded image once selected
- [ ] Display file name, size, and type metadata
- [ ] Add a "Remove / Change Image" button
- [ ] Mobile camera capture support (`capture="environment"` attribute)
- [ ] Validate file type (JPG, PNG, WEBP, PDF) and size (max 10MB)
- [ ] Show error toast for invalid files

### Deliverable
User can drag or click to upload a gradesheet image, see a preview, and replace it.

---

## Phase 3 — AI OCR Integration (Gemini Vision)

**Goal**: Send the uploaded image to Gemini Vision API and parse the response into structured data.

### Tasks

#### 3a — API Key Setup
- [ ] Add an **API Key input modal** (shown on first use, stored in `localStorage`)
- [ ] Option to use demo/mock data without an API key (for testing)
- [ ] Key is never sent to any server — all calls are made directly from the browser

#### 3b — Gemini Vision Call (`modules/ocr.js`)
- [ ] Convert the image to base64
- [ ] Construct a prompt instructing Gemini to extract:
  ```
  Extract all subjects from this gradesheet.
  Return a JSON array with objects:
  { "subject": string, "credits": number, "grade": string }
  Only return valid JSON, nothing else.
  ```
- [ ] Call `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`
- [ ] Handle API errors gracefully (rate limit, invalid key, unreadable image)

#### 3c — Response Parser (`modules/parser.js`)
- [ ] Strip markdown code fences from Gemini's response if present
- [ ] `JSON.parse()` the response
- [ ] Validate each entry has `subject`, `credits`, `grade`
- [ ] Fill in missing `credits` with a default (e.g. 3) and flag for user review
- [ ] Normalize grade strings (e.g. `"A+"`, `"O"`, `"10"`) to the college's grading system

#### 3d — Loading States
- [ ] Show animated **skeleton loader** while OCR is running
- [ ] Show a step indicator: `Uploading → Analyzing → Extracting → Done`
- [ ] Estimated time display ("Usually takes 5–10 seconds")

### Deliverable
App extracts a structured JSON list of subjects from a gradesheet image.

---

## Phase 4 — Editable Data Table & Validation

**Goal**: Display extracted data in a beautiful, editable table so users can fix OCR errors.

### Tasks

#### 4a — Table Renderer (`modules/table.js`)
- [ ] Render a table with columns: `#`, `Subject Name`, `Credits`, `Grade`, `Grade Points`, `Actions`
- [ ] Each row is **inline-editable** (click cell → becomes an `<input>` or `<select>`)
- [ ] `Grade` column uses a `<select>` dropdown pre-filled with the college's grading scale
- [ ] `Grade Points` column auto-updates when grade is changed
- [ ] Highlight rows that were **flagged** by the parser (e.g. missing credits)

#### 4b — Row Management
- [ ] **Add Row** button at the bottom to manually add a subject
- [ ] **Delete Row** button (trash icon) per row with confirmation
- [ ] **Duplicate Row** option
- [ ] Drag-to-reorder rows (HTML5 drag API)

#### 4c — Grading Scale Configuration
- [ ] Dropdown/toggle to select grading system:
  - **10-point scale** (O=10, A+=9, A=8, B+=7, B=6, C=5, F=0) — common in Indian universities
  - **4-point scale** (A=4, B=3, C=2, D=1, F=0)
  - **Custom** — let user define their own scale
- [ ] Persist selected scale in `localStorage`

#### 4d — Validation
- [ ] Show inline error if `credits` is 0, negative, or non-numeric
- [ ] Show inline error if `grade` is unrecognized
- [ ] Disable "Calculate" button if any row has errors
- [ ] "Fix All" button that removes flagged rows with missing data

### Deliverable
A fully editable, validated table showing all extracted subjects and grades.

---

## Phase 5 — CGPA Calculation Engine

**Goal**: Implement the CGPA formula and display the result.

### Tasks (`modules/calculator.js`)

- [ ] Implement the weighted average formula:

  CGPA = Sum(Credits_i * GradePoints_i) / Sum(Credits_i)

- [ ] Calculate:
  - **CGPA** (overall)
  - **Total Credits Earned**
  - **Total Grade Points**
  - **Semester-wise breakdown** (if multi-semester data detected)
- [ ] Handle edge cases: all F grades, zero credits, single subject
- [ ] Support **"What-if" mode**: let users simulate changing a grade and see updated CGPA in real time

### Deliverable
Accurate CGPA calculated from the table data with live recalculation on edit.

---

## Phase 6 — Results UI & Export

**Goal**: Display the CGPA result in a visually stunning way and allow export.

### Tasks

#### 6a — Results Card
- [ ] Large animated **CGPA display** (number counter animation from 0 → result)
- [ ] Color-coded result badge:
  - `>= 9.0` → Distinction (Purple)
  - `>= 8.0` → First Class (Blue)
  - `>= 6.5` → Second Class (Green)
  - `< 6.5`  → Pass (Yellow)
  - Any F    → Fail (Red)
- [ ] Breakdown: Total Credits, Total Grade Points, Subjects Count
- [ ] Mini bar chart showing grade distribution (pure CSS or Canvas)

#### 6b — Export Options (`modules/export.js`)
- [ ] **Copy to Clipboard** — formatted text summary
- [ ] **Download as PNG** — screenshot of the result card (using `html2canvas`)
- [ ] **Download as PDF** — print-friendly version
- [ ] **Share Link** — encode data in URL hash (base64) for shareable links with no backend

### Deliverable
Beautiful, shareable CGPA result with multiple export formats.

---

## Phase 7 — Polish, Animations & Accessibility

**Goal**: Make the app feel premium, fast, and accessible.

### Tasks

#### 7a — Animations & Micro-interactions
- [ ] Page load fade-in
- [ ] Upload zone pulse animation
- [ ] OCR step indicator with smooth transitions
- [ ] Table row slide-in animation on render
- [ ] CGPA number count-up animation
- [ ] Hover glow effects on cards

#### 7b — Responsive Design
- [ ] Mobile-first layout
- [ ] Touch-friendly table editing on mobile
- [ ] Stack table to card layout on small screens

#### 7c — Accessibility
- [ ] Keyboard navigation through the table
- [ ] ARIA labels on all interactive elements
- [ ] Focus-visible outlines
- [ ] Screen reader support for results

#### 7d — Progressive Enhancement
- [ ] Works without JavaScript for basic info (graceful degradation)
- [ ] Offline support with Service Worker (cache static assets)
- [ ] Add to Home Screen (PWA manifest)

#### 7e — Error & Empty States
- [ ] "No subjects found" illustration when OCR extracts nothing
- [ ] Network error state with retry button
- [ ] Unsupported file format state

### Deliverable
Polished, production-ready UI with animations and full mobile support.

---

## Phase 8 — Deployment

**Goal**: Deploy the app publicly and set up version control.

### Tasks
- [ ] Initialize Git repository: `git init`
- [ ] Create `.gitignore`
- [ ] Push to GitHub
- [ ] Enable **GitHub Pages** (from `main` branch root)
  - OR deploy to **Vercel** (drag and drop the folder)
- [ ] Add custom domain (optional)
- [ ] Write `README.md` with:
  - App description
  - How to get a free Gemini API key
  - Screenshots / demo GIF
  - Local development instructions

### Deliverable
Live public URL. App accessible from any device.

---

## 🔮 Future Enhancements (Post-MVP)

| Feature | Description |
|---|---|
| **Multi-Semester Tracking** | Upload gradesheets semester by semester, track cumulative CGPA over time |
| **SGPA → CGPA Conversion** | Input individual semester SGPAs and weights to get overall CGPA |
| **PDF Parsing** | Use PDF.js to extract text from native PDF gradesheets without OCR |
| **College Profiles** | Pre-loaded grading scales for popular Indian universities (VTU, Anna, JNTU, etc.) |
| **Dark / Light Mode Toggle** | System preference + manual toggle |
| **Supabase Backend** | Optional cloud save with Google login for history across devices |
| **Backlogs Detection** | Automatically flag failed subjects and compute backlogs count |

---

## 📅 Estimated Timeline

| Phase | Effort |
|---|---|
| Phase 1 — Setup & Design | ~1–2 hours |
| Phase 2 — Upload UI | ~1–2 hours |
| Phase 3 — OCR Integration | ~2–3 hours |
| Phase 4 — Editable Table | ~2–3 hours |
| Phase 5 — Calculator | ~1 hour |
| Phase 6 — Results & Export | ~2 hours |
| Phase 7 — Polish | ~2–3 hours |
| Phase 8 — Deployment | ~30 mins |
| **Total** | **~12–17 hours** |

---

## 🚀 Getting Started

1. Get a free **Gemini API key** at [aistudio.google.com](https://aistudio.google.com)
2. Clone this repo or open the folder in your editor
3. Open `index.html` in a browser (no build step needed!)
4. Enter your API key in the app when prompted
5. Upload a gradesheet image and watch the magic happen ✨

---

*Roadmap version 1.0 — Created June 2026*
