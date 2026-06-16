# OCR Pipeline Architecture & Methods

This document details the architecture, methods, and algorithms used in the GradeSnap OCR system to parse university gradesheets into structured data.

## 1. Overview

The OCR system runs entirely in the browser using **PaddleOCR** (PP-OCRv5) via the `ppu-paddle-ocr` library, powered by **ONNX Runtime Web** with **WebGPU** hardware acceleration (automatic WASM fallback on older browsers).

Unlike the legacy Tesseract.js approach which outputs a single block of plain text, PaddleOCR outputs **spatially-annotated bounding boxes** — each detected text region has its exact pixel coordinates and the recognized text. This enables coordinate-based row assembly instead of fragile regex parsing.

The pipeline consists of three phases:
1. **AI-Powered OCR:** Detecting and reading text using neural networks.
2. **Spatial Assembly:** Grouping bounding boxes into rows using coordinates.
3. **Validation:** Fuzzy-matching and rectification for final accuracy.

---

## 2. OCR Engine (`src/ocr/paddle-worker.js`)

### Technology: PaddleOCR PP-OCRv5 (Mobile)

* **Detection Network (DBNet):** A Differentiable Binarization neural network that locates text regions in the image. It draws tight bounding boxes around every piece of text it finds.
* **Recognition Network (CRNN):** A Convolutional Recurrent neural network that reads the text inside each detected box.
* **Runtime:** ONNX Runtime Web runs these models via WebGPU (GPU-accelerated) or WebAssembly (CPU fallback).
* **Model Size:** ~15MB total (downloaded once, cached in IndexedDB).
* **Processing Engine:** `canvas-native` — uses HTML Canvas directly for preprocessing, no OpenCV dependency.

### Why Neural Networks Beat Tesseract

| Aspect | Tesseract (Old) | PaddleOCR (Current) |
|--------|----------------|---------------------|
| Architecture | 2010s C++ engine via WASM | 2025 deep learning via WebGPU |
| Output | Plain text blob | Bounding boxes with coordinates |
| Noisy images | Requires manual preprocessing | Trained on millions of noisy photos |
| Table parsing | Guesses reading order | Knows exact position of each cell |
| Speed | ~3.8s per image | ~1.5s per image |

### No More Heavy Preprocessing

The old pipeline required extensive image preprocessing (unsharp masking, auto-contrast, midtone boosting) to compensate for Tesseract's limitations. PaddleOCR's neural networks are **trained on real-world noisy images**, so aggressive preprocessing can actually *hurt* accuracy. We only do basic resolution scaling via `getOcrTargetSize()`.

---

## 3. Spatial Assembly (`src/ocr/modules/spatial-assembler.js`)

This is the core architectural innovation. Instead of parsing `"PROBABILITY AND QUEUEING THEORY 4 O PASS"` as a string, we use **coordinates**.

### Algorithm: Y-Tolerance Grouping + X-Sorting

PaddleOCR returns results like:
```
{ text: "PROBABILITY AND QUEUEING THEORY", box: { x: 200, y: 150, width: 400, height: 20 }, confidence: 0.98 }
{ text: "4",                               box: { x: 650, y: 152, width: 15,  height: 18 }, confidence: 0.99 }
{ text: "O",                               box: { x: 750, y: 151, width: 12,  height: 19 }, confidence: 0.97 }
{ text: "PASS",                            box: { x: 850, y: 150, width: 40,  height: 20 }, confidence: 0.99 }
```

**Step 1: Y-Tolerance Grouping**
All boxes whose vertical center (`y + height/2`) is within 20 pixels of each other are grouped into a single "Row". This clusters items that belong to the same table row.

**Step 2: X-Coordinate Sorting**
Within each row, items are sorted left-to-right by their horizontal center (`x + width/2`).

**Step 3: Right-to-Left Column Assignment**
Walking from the rightmost item:
1. Skip `PASS`/`FAIL` tokens.
2. Match the next token as a **Grade** using the fuzzy grade matcher.
3. Match the next token to the left as **Credits** using the credit matcher.
4. Everything remaining to the left is the **Subject Name**.

This is dramatically more reliable than regex because we know *exactly* which column each piece of text belongs to based on its physical position.

---

## 4. Fuzzy Validation Modules (`src/ocr/modules/`)

### Grade Matcher (`grade-matcher.js`)
* **Levenshtein Distance:** Calculates the edit distance between the OCR token and all valid grades. If the distance is ≤1 for single-character grades or ≤2 for compound grades, it's considered a match.
* **Example:** If OCR reads `8` instead of `B`, the Levenshtein distance is 1, so it's corrected to `B`.

### Credit Matcher (`credit-matcher.js`)
* Validates that the token is a number in the range 0-5.
* Handles bracket noise: `[0]`, `(0)`, `o]`, `©` → 0.

### Subject Extractor (`subject-extractor.js`)
* Removes course codes (e.g., `21CSC201J`).
* Finds the longest contiguous uppercase phrase (≥6 chars) as the subject name.

---

## 5. Text-Based Fallback (`src/ocr/modules/row-assembler.js`)

For backward compatibility and edge cases where bounding boxes fail, the system falls back to text-based row assembly using the `PASS`/`FAIL` line-splitting strategy from the original parser.

---

## 6. Post-Processing (`src/core/rectifier.js`)

The rectifier performs final validation:
* **Credit inference** for audit courses (0 credits).
* **Duplicate removal** via subject name similarity.
* **Anchor recovery** from raw OCR text for subjects the parser missed.
