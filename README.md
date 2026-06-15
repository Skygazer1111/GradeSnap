# 📸 GradeSnap — CGPA Calculator

Upload a photo of your university gradesheet, let local OCR read it, review the extracted data, and get your CGPA — all inside the browser. **No server, no uploads, 100 % private.**

## ✨ Features

- **Local OCR** — Tesseract.js runs entirely in the browser; your image never leaves your device.
- **Smart Parsing** — Regex + heuristic pipeline handles noisy OCR output, bracket artifacts (`[o]`, `(e]`), and PASS-bleed tokens.
- **Auto-Rectification** — A second-pass rectifier cross-references raw OCR text to fix misread credits and grades.
- **Editable Data Table** — Inline-edit subjects, credits, and grades before calculating. Add or delete rows freely.
- **SRM 10-Point Grading** — Built-in support for the SRM University grading scale (O → 10, A+ → 9, …, U/RA → 0).
- **Result Celebration** — Animated confetti and mood banners based on your CGPA performance level.
- **Export & Share** — Copy results to clipboard, export as PNG, or generate a shareable link.
- **Image Preprocessing** — Upscaling, grayscale conversion, Otsu binarization, and contrast stretching for better OCR accuracy.

## 🚀 Quick Start

```bash
# Clone
git clone https://github.com/Skygazer1111/EasyCgpaCalculator.git
cd EasyCgpaCalculator

# Install dependencies
npm install

# Start dev server (opens http://localhost:8080)
npm run dev
```

## 📜 Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server with hot reload |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm test` | Run all tests with Vitest |
| `npm run test:sample` | Run only integration tests (real OCR on sample images) |
| `npm run test:watch` | Watch mode for tests |

## 🏗️ Project Structure

```
├── index.html                  # Entry point
├── src/
│   ├── app.js                  # Main orchestrator (UI flow, event wiring)
│   ├── style.css               # Global styles & design tokens
│   ├── core/
│   │   ├── calculator.js       # CGPA calculation & performance levels
│   │   ├── grade-mapper.js     # Grade symbol → grade point mapping
│   │   └── rectifier.js        # Post-parse credit & grade correction
│   ├── ocr/
│   │   ├── worker.js           # Tesseract.js worker lifecycle
│   │   ├── preprocess.js       # Image upscaling, binarization, contrast
│   │   ├── normalize.js        # OCR text cleanup & noise removal
│   │   └── parser.js           # Structured subject extraction from OCR text
│   ├── ui/
│   │   └── table.js            # Editable data table component
│   └── services/
│       └── exporter.js         # Clipboard, PNG export, share link
├── tests/
│   ├── core/                   # Unit tests for calculator, grade-mapper, rectifier
│   ├── ocr/                    # Unit tests for parser, preprocess
│   ├── integration/            # End-to-end OCR → parse → calculate tests
│   ├── fixtures/               # Shared test data (sample subjects, OCR text)
│   └── helpers/                # Test utilities (Node OCR runner with sharp)
├── sample/                     # Sample gradesheet images for testing
├── vite.config.js              # Vite build configuration
└── vitest.config.js            # Vitest test configuration
```

## 🧪 Testing

The test suite covers the full pipeline:

- **Core tests** — CGPA calculation, grade mapping, noisy grade normalization, rectification logic.
- **OCR tests** — Parser accuracy against clean, noisy, and preprocessed OCR text. Image preprocessing unit tests.
- **Integration tests** — End-to-end: load a real sample image → run Tesseract OCR → parse → calculate CGPA → assert expected result.

```bash
# Run all 33 tests
npm test

# Run only the integration suite (requires sample images in sample/)
npm run test:sample
```

## 🔧 Tech Stack

- **[Vite](https://vitejs.dev/)** — Build tool & dev server
- **[Tesseract.js](https://tesseract.projectnaptha.com/)** v6 — Client-side OCR engine
- **[Vitest](https://vitest.dev/)** — Unit & integration testing
- **[sharp](https://sharp.pixelplumbing.com/)** — Server-side image preprocessing (test helper only)
- **Vanilla JS + CSS** — No framework, no dependencies beyond Tesseract

## 📝 How It Works

1. **Upload** — User drops or selects a gradesheet image (JPEG, PNG, WebP).
2. **Preprocess** — The image is upscaled, flattened to grayscale, and binarized for cleaner OCR.
3. **OCR** — Tesseract.js extracts raw text from the preprocessed image.
4. **Normalize** — OCR noise is cleaned: bracket artifacts, stray characters, and encoding glitches are removed.
5. **Parse** — Regex patterns extract structured rows: subject name, credits, grade, pass/fail status.
6. **Rectify** — A second pass cross-references raw OCR anchors (course codes, credit columns) to fix misreads.
7. **Review** — The extracted data is shown in an editable table. Users can correct any remaining errors.
8. **Calculate** — Credit-weighted CGPA is computed using the SRM 10-point formula.
9. **Celebrate** — Results are displayed with animations and mood banners. Export as PNG or share via link.

## 📄 License

Private project.
