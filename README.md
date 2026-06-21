# GradeSnap

A fast, private SGPA/CGPA calculator for SRM students. Upload a screenshot of your gradesheet and GradeSnap extracts subjects, credits, and grades using **entirely local, in-browser AI** — nothing is uploaded to a server.

## Features

- **Local OCR** — [PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR) runs in the browser via ONNX Runtime Web (WebGPU with WASM fallback). Your image never leaves your device.
- **Desktop & mobile portal support** — Parses full-width desktop gradesheets and compact mobile portal screenshots, including wrapped subject names and layouts without course codes.
- **Smart parsing** — Spatial assembly from bounding boxes, with a text-based fallback for noisy or wrapped OCR output.
- **Auto-rectification** — A second pass cross-references raw OCR anchors (course codes, credit/grade columns) to fix misreads like `[o]`, `(e]`, and `O`/`0` confusion.
- **Editable review screen** — Inline-edit subjects, credits, and grades on desktop or mobile. Add, delete, and reorder rows before calculating.
- **Semester-wise CGPA** — Enter SGPA per semester to compute cumulative CGPA without a gradesheet photo.
- **SRM 10-point grading** — Built-in scale: `O` → 10, `A+` → 9, `A` → 8, `B+` → 7, `B` → 6, `C` → 5, `P` → 4, `F` → 0.
- **Results & export** — Animated celebration, insight cards, copy to clipboard, PNG export, and shareable links.
- **Image preprocessing** — Phone screenshots are upscaled before OCR for more reliable text detection on small captures.

## Quick Start

```bash
git clone https://github.com/Skygazer1111/GradeSnap.git
cd GradeSnap

npm install
npm run dev
```

Opens at [http://localhost:8080](http://localhost:8080).

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server with hot reload |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm test` | Run all tests with Vitest |
| `npm run test:sample` | Run integration tests (real OCR on sample images) |
| `npm run test:watch` | Watch mode for tests |

## Project Structure

```
├── index.html
├── sample/                          # Gradesheet images for manual & automated testing
│   ├── SampleResults.png            # Desktop layout
│   ├── SampleResults2.jpeg
│   ├── PhoneSample1.jpeg            # Mobile portal (with course codes)
│   └── SamplePhone2.jpeg            # Mobile portal (compact, no course codes)
├── src/
│   ├── app/
│   │   ├── App.tsx                  # App shell, routing between stages
│   │   ├── main.tsx
│   │   └── styles.css
│   ├── components/                  # Layout & shared UI (Header, Footer, popovers)
│   ├── domain/
│   │   ├── cgpa/                    # CGPA calculation, grade mapping, rectifier
│   │   │   ├── calculator.js
│   │   │   ├── cgpa.ts              # TypeScript adapter for UI
│   │   │   ├── grade-mapper.js
│   │   │   ├── rectifier.js
│   │   │   └── semester-cgpa.ts     # Semester-wise CGPA logic
│   │   └── ocr/
│   │       ├── orchestration/       # OCR entry points (runOcr, parser)
│   │       ├── parsing/             # Spatial & text row assembly, mobile heuristics
│   │       ├── transforms/          # Image preprocessing & text normalization
│   │       └── workers/             # PaddleOCR browser worker
│   ├── features/
│   │   ├── upload/                  # Hero, upload card, OCR progress
│   │   ├── review/                  # Editable subject table
│   │   ├── results/                 # CGPA display, celebration, export
│   │   ├── semester/                # Semester-wise calculator page
│   │   └── about/                   # Team, terms, privacy pages
│   ├── hooks/
│   └── io/                          # Clipboard, PNG export, share link
├── tests/
│   ├── domain/                      # Unit tests (CGPA, OCR parsing, rectifier)
│   ├── integration/                 # End-to-end OCR → parse → calculate
│   ├── fixtures/                    # Expected subjects & sample OCR text
│   └── helpers/                     # Node OCR runner (sharp + PaddleOCR)
├── vite.config.ts
└── vitest.config.js
```

## How It Works

1. **Upload** — User selects or drops a gradesheet image (JPEG, PNG, WebP).
2. **Preprocess** — The image is upscaled in the browser so small phone screenshots are easier to read.
3. **OCR** — PaddleOCR detects text regions and reads characters locally.
4. **Assemble** — Bounding boxes are grouped into rows; wrapped mobile lines are merged into full subject names.
5. **Parse** — Subject, credits, and grade are extracted per row. Text-based parsing is used when spatial output looks truncated.
6. **Rectify** — Course-code anchors and column structure fix common OCR mistakes.
7. **Review** — Extracted data is shown in an editable table for manual corrections.
8. **Calculate** — Credit-weighted CGPA is computed using the SRM 10-point formula.
9. **Celebrate** — Results are displayed with animations. Export or share as needed.

### Supported gradesheet layouts

| Layout | Example | Notes |
|---|---|---|
| Desktop / wide screenshot | `SampleResults.png` | Full table with S.No., course codes, columns |
| Mobile portal (with codes) | `PhoneSample1.jpeg` | Wrapped descriptions, course codes present |
| Mobile portal (compact) | `SamplePhone2.jpeg` | No course codes; credit/grade on same line as subject fragment |

## Testing

The test suite covers the full pipeline:

- **Core** — CGPA calculation, grade mapping, rectification, semester-wise CGPA.
- **OCR** — Parser, mobile portal heuristics, subject extraction, preprocessing.
- **Integration** — Real sample images → OCR → parse → calculate → assert expected CGPA.

```bash
# Run all 46 tests
npm test

# Integration tests only (requires sample/ images)
npm run test:sample
```

## Tech Stack

- **[React 19](https://react.dev/)** + **[TypeScript](https://www.typescriptlang.org/)** — UI
- **[Tailwind CSS 4](https://tailwindcss.com/)** — Styling
- **[Vite 6](https://vitejs.dev/)** — Build tool & dev server
- **[ppu-paddle-ocr](https://www.npmjs.com/package/ppu-paddle-ocr)** — In-browser OCR (PaddleOCR + ONNX Runtime Web)
- **[Vitest](https://vitest.dev/)** — Unit & integration testing
- **[sharp](https://sharp.pixelplumbing.com/)** — Image preprocessing in Node test helpers only
- **[Motion](https://motion.dev/)** — Animations

## License

Private project.
