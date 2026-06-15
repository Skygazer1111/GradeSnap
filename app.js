/**
 * @module app
 * @description Main entry point for GradeSnap — the AI-powered CGPA Calculator.
 * Orchestrates all modules: OCR, parsing, calculation, data table, and export.
 * Handles section navigation, image upload, API key management, processing flow,
 * result display, animations, and share link handling.
 */

import { extractGrades, getDemoData } from './modules/ocr.js';
import { parseGradesResponse, GRADING_SCALES } from './modules/parser.js';
import { calculateCGPA, getPerformanceLabel, getPerformanceBadgeClass } from './modules/calculator.js';
import DataTable from './modules/table.js';
import { copyToClipboard, exportAsPNG, generateShareLink, parseShareLink } from './modules/export.js';

// ─── App State ─────────────────────────────────────────────────────────────────

const state = {
  currentSection: 'hero-section',
  imageFile: null,
  imageBase64: null,
  imageMimeType: null,
  apiKey: localStorage.getItem('gradesnap_api_key') || null,
  scaleId: localStorage.getItem('gradesnap_scale') || '10',
  useDemo: false,
  result: null
};

let isProcessing = false;

// ─── Data Table Instance ───────────────────────────────────────────────────────

const dataTable = new DataTable('subjects-tbody', {
  scaleId: state.scaleId,
  onChange: onTableChange
});

// ═══════════════════════════════════════════════════════════════════════════════
//  SECTION NAVIGATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Navigate to a section by adding/removing the 'active' class.
 * @param {string} sectionId - The id of the section to show.
 */
function showSection(sectionId) {
  const sections = document.querySelectorAll('.section');
  sections.forEach(sec => sec.classList.remove('active'));

  const target = document.getElementById(sectionId);
  if (target) {
    target.classList.add('active');
  }

  state.currentSection = sectionId;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  TOAST NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Display a temporary toast notification.
 * @param {string} message - The message to show.
 * @param {'info'|'success'|'error'|'warning'} [type='info'] - Toast type for styling.
 * @param {number} [duration=3000] - How long the toast stays visible in ms.
 */
function showToast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  // Icon based on type
  const icons = {
    info: 'ℹ️',
    success: '✅',
    error: '❌',
    warning: '⚠️'
  };

  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.info}</span>
    <span class="toast-message">${message}</span>
    <button class="toast-close" aria-label="Dismiss">&times;</button>
  `;

  // Close on click
  const closeBtn = toast.querySelector('.toast-close');
  closeBtn.addEventListener('click', () => dismissToast(toast));

  container.appendChild(toast);

  // Trigger entrance animation
  requestAnimationFrame(() => {
    toast.classList.add('toast-enter');
  });

  // Auto-dismiss
  const timer = setTimeout(() => dismissToast(toast), duration);
  toast._timer = timer;
}

/**
 * Dismiss a toast element with exit animation.
 * @param {HTMLElement} toast
 */
function dismissToast(toast) {
  if (!toast || toast._dismissed) return;
  toast._dismissed = true;

  clearTimeout(toast._timer);
  toast.classList.remove('toast-enter');
  toast.classList.add('toast-exit');

  toast.addEventListener('animationend', () => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  });

  // Fallback removal if animation doesn't fire
  setTimeout(() => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }, 500);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  FILE SIZE FORMATTER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Format bytes into a human-readable string.
 * @param {number} bytes
 * @returns {string} e.g. "2.4 MB"
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const units = ['Bytes', 'KB', 'MB', 'GB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = parseFloat((bytes / Math.pow(k, i)).toFixed(1));
  return `${size} ${units[i]}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  IMAGE UPLOAD HANDLING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Handle a selected/dropped image file: validate, read as base64, show preview.
 * @param {File} file - The image file to process.
 */
function handleFile(file) {
  // Validate type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    showToast('Invalid file type. Please upload a JPG, PNG, or WebP image.', 'error', 5000);
    return;
  }

  // Validate size (max 10MB)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    showToast('File too large. Maximum size is 10 MB.', 'error', 5000);
    return;
  }

  // Read file as DataURL
  const reader = new FileReader();

  reader.onload = () => {
    const dataUrl = reader.result;
    // Extract base64 data (after the comma)
    const base64 = dataUrl.split(',')[1];

    state.imageBase64 = base64;
    state.imageMimeType = file.type;
    state.imageFile = file;

    // Show image preview
    const imagePreview = document.getElementById('image-preview');
    const uploadPreview = document.getElementById('upload-preview');
    const uploadPlaceholder = document.getElementById('upload-placeholder');
    const uploadActions = document.getElementById('upload-actions');
    const fileNameEl = document.getElementById('file-name');
    const fileSizeEl = document.getElementById('file-size');

    if (imagePreview) imagePreview.src = dataUrl;
    if (uploadPreview) uploadPreview.style.display = 'block';
    if (uploadPlaceholder) uploadPlaceholder.style.display = 'none';
    if (uploadActions) uploadActions.style.display = 'flex';
    if (fileNameEl) fileNameEl.textContent = file.name;
    if (fileSizeEl) fileSizeEl.textContent = formatFileSize(file.size);
  };

  reader.onerror = () => {
    showToast('Failed to read the file. Please try again.', 'error');
  };

  reader.readAsDataURL(file);
}

/**
 * Reset the upload state and UI to the initial placeholder view.
 */
function resetUpload() {
  state.imageFile = null;
  state.imageBase64 = null;
  state.imageMimeType = null;

  const imagePreview = document.getElementById('image-preview');
  const uploadPreview = document.getElementById('upload-preview');
  const uploadPlaceholder = document.getElementById('upload-placeholder');
  const uploadActions = document.getElementById('upload-actions');
  const fileInput = document.getElementById('file-input');

  if (imagePreview) imagePreview.src = '';
  if (uploadPreview) uploadPreview.style.display = 'none';
  if (uploadPlaceholder) uploadPlaceholder.style.display = 'flex';
  if (uploadActions) uploadActions.style.display = 'none';
  if (fileInput) fileInput.value = '';
}

/**
 * Wire up all upload-related DOM events.
 */
function initUploadEvents() {
  const uploadZone = document.getElementById('upload-zone');
  const browseBtn = document.getElementById('browse-btn');
  const fileInput = document.getElementById('file-input');
  const changeImageBtn = document.getElementById('change-image-btn');
  const removeImageBtn = document.getElementById('remove-image-btn');

  if (!uploadZone || !fileInput) return;

  // Drag-and-drop events
  uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    uploadZone.classList.add('dragover');
  });

  uploadZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    uploadZone.classList.remove('dragover');
  });

  uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    uploadZone.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  });

  // Click to browse
  uploadZone.addEventListener('click', (e) => {
    // Don't trigger if clicking on action buttons inside the zone
    if (e.target.closest('.upload-actions') || e.target.closest('.btn')) return;
    fileInput.click();
  });

  if (browseBtn) {
    browseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      fileInput.click();
    });
  }

  // File input change
  fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
      handleFile(fileInput.files[0]);
    }
  });

  // Change image
  if (changeImageBtn) {
    changeImageBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      fileInput.click();
    });
  }

  // Remove image
  if (removeImageBtn) {
    removeImageBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      resetUpload();
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  API KEY MODAL
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Open the API key modal.
 */
function openModal() {
  const modal = document.getElementById('api-key-modal');
  if (modal) {
    modal.classList.add('active');
    // Pre-fill if key already exists
    const input = document.getElementById('api-key-input');
    if (input && state.apiKey) {
      input.value = state.apiKey;
    }
  }
}

/**
 * Close the API key modal.
 */
function closeModal() {
  const modal = document.getElementById('api-key-modal');
  if (modal) {
    modal.classList.remove('active');
  }
}

/**
 * Wire up API key modal events.
 */
function initModalEvents() {
  const saveBtn = document.getElementById('save-api-key-btn');
  const skipBtn = document.getElementById('skip-api-key-btn');
  const toggleVisibility = document.getElementById('toggle-key-visibility');
  const settingsBtn = document.getElementById('settings-btn');
  const modalBackdrop = document.querySelector('.modal-backdrop');
  const modal = document.getElementById('api-key-modal');

  // Save API key
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const input = document.getElementById('api-key-input');
      const key = input ? input.value.trim() : '';

      if (!key) {
        showToast('Please enter a valid API key.', 'warning');
        return;
      }

      state.apiKey = key;
      state.useDemo = false;
      localStorage.setItem('gradesnap_api_key', key);
      closeModal();
      showToast('API key saved securely in your browser.', 'success');
      processImage();
    });
  }

  // Skip / use demo data
  if (skipBtn) {
    skipBtn.addEventListener('click', () => {
      state.useDemo = true;
      closeModal();
      showToast('Using demo data — no API key required.', 'info');
      processImage();
    });
  }

  // Toggle password visibility
  if (toggleVisibility) {
    toggleVisibility.addEventListener('click', () => {
      const input = document.getElementById('api-key-input');
      if (!input) return;
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      toggleVisibility.textContent = isPassword ? '🙈' : '👁️';
      toggleVisibility.setAttribute('aria-label', isPassword ? 'Hide API key' : 'Show API key');
    });
  }

  // Settings button opens modal
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      openModal();
    });
  }

  // Backdrop click closes modal
  if (modalBackdrop) {
    modalBackdrop.addEventListener('click', () => {
      closeModal();
    });
  }

  // Also close on clicking the modal overlay area (outside modal content)
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PROCESSING FLOW
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Update a progress step's visual status.
 * @param {number} stepNum - The step number (1-based).
 * @param {'default'|'active'|'done'} status - The new visual status.
 */
function updateProgressStep(stepNum, status) {
  const steps = document.querySelectorAll('.progress-step');
  const step = steps[stepNum - 1];
  if (!step) return;

  step.classList.remove('active', 'done', 'default');
  step.classList.add(status);

  // Update the step icon based on status
  const icon = step.querySelector('.step-icon');
  if (icon) {
    if (status === 'done') {
      icon.textContent = '✓';
    } else if (status === 'active') {
      icon.innerHTML = '<span class="spinner-small"></span>';
    }
  }
}

/**
 * Reset all progress steps to their default state, then set step 1 as active.
 */
function resetProgressSteps() {
  const steps = document.querySelectorAll('.progress-step');
  steps.forEach((step, i) => {
    step.classList.remove('active', 'done');
    step.classList.add('default');
    const icon = step.querySelector('.step-icon');
    if (icon) {
      icon.textContent = i + 1;
    }
  });
  // Set step 1 as active
  updateProgressStep(1, 'active');
}

function setProcessingStatus(message) {
  const eta = document.querySelector('.processing-eta');
  if (eta) {
    eta.textContent = message;
  }
}

/**
 * Main processing pipeline:
 * 1. Show processing section with progress steps
 * 2. Call Gemini Vision (or use demo data)
 * 3. Parse the response
 * 4. Initialize the data table
 * 5. Navigate to the data section
 */
async function processImage() {
  if (isProcessing) return;
  isProcessing = true;

  showSection('processing-section');
  resetProgressSteps();
  setProcessingStatus('Usually takes 5–10 seconds');

  try {
    let rawText;
    let parsedData;

    // ── Step 1: Uploading / Preparing ──
    await delay(500);
    updateProgressStep(1, 'done');
    updateProgressStep(2, 'active');

    if (state.useDemo) {
      // ── Demo Mode ──
      await delay(1000);
      const demoSubjects = getDemoData();
      updateProgressStep(2, 'done');
      updateProgressStep(3, 'active');

      await delay(500);
      parsedData = demoSubjects;
      updateProgressStep(3, 'done');
      updateProgressStep(4, 'active');
    } else {
      // ── Live API Call ──
      rawText = await extractGrades(
        state.imageBase64,
        state.imageMimeType,
        state.apiKey,
        setProcessingStatus
      );
      updateProgressStep(2, 'done');
      updateProgressStep(3, 'active');

      // Parse the response
      await delay(300);
      parsedData = parseGradesResponse(rawText);
      updateProgressStep(3, 'done');
      updateProgressStep(4, 'active');
    }

    // ── Step 4: Finalizing ──
    await delay(300);
    updateProgressStep(4, 'done');

    // Validate parsed data
    if (!parsedData || !Array.isArray(parsedData) || parsedData.length === 0) {
      throw new Error('No subjects were extracted from the image. Please try a clearer photo.');
    }

    // Initialize the table with parsed data
    dataTable.setScale(state.scaleId);
    dataTable.setData(parsedData);

    // Navigate to data section
    showSection('data-section');
    showToast(`Extracted ${parsedData.length} subjects successfully!`, 'success');

  } catch (err) {
    console.error('[GradeSnap] Processing error:', err);
    showToast(err.message || 'An error occurred during processing.', 'error', 5000);
    showSection('upload-section');
  } finally {
    isProcessing = false;
  }
}

/**
 * Simple delay helper for visual progress transitions.
 * @param {number} ms - Milliseconds to wait.
 * @returns {Promise<void>}
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ═══════════════════════════════════════════════════════════════════════════════
//  DATA TABLE EVENTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Callback fired whenever the data table changes.
 * Enables/disables the calculate button based on validation.
 * @param {{ data: Array, isValid: boolean, errors: string[] }} changeEvent
 */
function onTableChange({ data, isValid, errors }) {
  const calculateBtn = document.getElementById('calculate-btn');
  if (calculateBtn) {
    calculateBtn.disabled = !isValid;
    if (isValid) {
      calculateBtn.classList.remove('btn-disabled');
    } else {
      calculateBtn.classList.add('btn-disabled');
    }
  }
}

/**
 * Wire up data table section events.
 */
function initTableEvents() {
  // Grading scale selector
  const scaleSelect = document.getElementById('grading-scale-select');
  if (scaleSelect) {
    scaleSelect.value = state.scaleId;

    scaleSelect.addEventListener('change', () => {
      state.scaleId = scaleSelect.value;
      localStorage.setItem('gradesnap_scale', state.scaleId);
      dataTable.setScale(state.scaleId);
    });
  }

  // Add row button
  const addRowBtn = document.getElementById('add-row-btn');
  if (addRowBtn) {
    addRowBtn.addEventListener('click', () => {
      dataTable.addRow();
    });
  }

  // Back to upload
  const backBtn = document.getElementById('back-to-upload-btn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      showSection('upload-section');
    });
  }

  // Calculate button
  const calculateBtn = document.getElementById('calculate-btn');
  if (calculateBtn) {
    calculateBtn.addEventListener('click', () => {
      calculateAndShowResult();
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  EXTRACT BUTTON & FLOW TRIGGER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Wire up the extract button.
 */
function initExtractButton() {
  const extractBtn = document.getElementById('extract-btn');
  if (extractBtn) {
    extractBtn.addEventListener('click', () => {
      // Validate that an image is selected (unless we plan to use demo)
      if (!state.imageBase64 && !state.useDemo) {
        // Check if API key exists
        if (!state.apiKey) {
          openModal();
          return;
        }
        showToast('Please upload an image first.', 'warning');
        return;
      }

      // Check API key
      if (!state.apiKey) {
        openModal();
        return;
      }

      processImage();
    });
  }

  // Demo button (if present in the upload section)
  const demoBtn = document.getElementById('demo-btn');
  if (demoBtn) {
    demoBtn.addEventListener('click', () => {
      state.useDemo = true;
      processImage();
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  RESULTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate CGPA from table data and display the results section.
 */
function calculateAndShowResult() {
  const subjects = dataTable.getData();

  if (subjects.length === 0) {
    showToast('No subjects to calculate.', 'warning');
    return;
  }

  const result = calculateCGPA(subjects, state.scaleId);
  state.result = result;

  showSection('results-section');

  // ── Animate CGPA Value ──
  const cgpaEl = document.getElementById('cgpa-value');
  if (cgpaEl) {
    animateValue(cgpaEl, 0, result.cgpa, 1500);

    // Color based on performance
    const performanceColors = {
      distinction: '#a78bfa',
      'first-class': '#60a5fa',
      'second-class': '#34d399',
      pass: '#fbbf24',
      fail: '#f87171'
    };
    cgpaEl.style.color = performanceColors[result.performanceLevel] || '#e2e8f0';
  }

  // ── Max Points ──
  const cgpaMaxEl = document.getElementById('cgpa-max');
  if (cgpaMaxEl) {
    cgpaMaxEl.textContent = `/ ${result.maxPoints}`;
  }

  // ── Performance Badge ──
  const badgeEl = document.getElementById('result-badge');
  if (badgeEl) {
    badgeEl.textContent = getPerformanceLabel(result.performanceLevel);
    // Remove existing badge classes
    badgeEl.className = 'result-badge';
    badgeEl.classList.add(getPerformanceBadgeClass(result.performanceLevel));
  }

  // ── Stats ──
  const totalCreditsEl = document.getElementById('total-credits');
  const totalGradePointsEl = document.getElementById('total-grade-points');
  const subjectsCountEl = document.getElementById('result-subjects-count');

  if (totalCreditsEl) totalCreditsEl.textContent = result.totalCredits;
  if (totalGradePointsEl) totalGradePointsEl.textContent = result.totalCreditPoints.toFixed(2);
  if (subjectsCountEl) subjectsCountEl.textContent = result.subjectsCount;

  // ── Grade Distribution Chart ──
  if (result.gradeDistribution) {
    renderGradeChart(result.gradeDistribution, state.scaleId);
  }
}

/**
 * Animate a numeric value from start to end with ease-out cubic easing.
 * @param {HTMLElement} element - The element whose textContent to update.
 * @param {number} start - Starting value.
 * @param {number} end - Ending value.
 * @param {number} duration - Animation duration in ms.
 */
function animateValue(element, start, end, duration) {
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Ease-out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = start + (end - start) * eased;
    element.textContent = current.toFixed(2);
    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}

/**
 * Render a bar chart visualizing grade distribution.
 * @param {Object<string, number>} distribution - Mapping of grade → count.
 * @param {string} scaleId - The grading scale identifier (used for sorting).
 */
function renderGradeChart(distribution, scaleId) {
  const chart = document.getElementById('grade-chart');
  if (!chart) return;

  chart.innerHTML = '';

  const maxCount = Math.max(...Object.values(distribution), 1);

  const gradeColors = {
    'O': '#7c3aed',
    'A+': '#6d28d9',
    'A': '#2563eb',
    'A-': '#3b82f6',
    'B+': '#06b6d4',
    'B': '#0891b2',
    'B-': '#0e7490',
    'C+': '#10b981',
    'C': '#059669',
    'C-': '#047857',
    'D+': '#f59e0b',
    'D': '#d97706',
    'D-': '#b45309',
    'P': '#f59e0b',
    'S': '#7c3aed',
    'E': '#ef4444',
    'F': '#ef4444'
  };

  // Grade point values for sorting (descending by value)
  const gradeOrder = {
    'O': 100, 'A+': 95, 'A': 90, 'A-': 85,
    'B+': 80, 'B': 75, 'B-': 70,
    'C+': 65, 'C': 60, 'C-': 55,
    'D+': 50, 'D': 45, 'D-': 40,
    'P': 35, 'S': 30, 'E': 10, 'F': 0
  };

  // Sort grades by grade point value (descending)
  const sorted = Object.entries(distribution).sort((a, b) => {
    const orderA = gradeOrder[a[0]] !== undefined ? gradeOrder[a[0]] : -1;
    const orderB = gradeOrder[b[0]] !== undefined ? gradeOrder[b[0]] : -1;
    return orderB - orderA;
  });

  sorted.forEach(([grade, count], index) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'chart-bar-wrapper';

    const countLabel = document.createElement('span');
    countLabel.className = 'chart-count';
    countLabel.textContent = count;

    const bar = document.createElement('div');
    bar.className = 'chart-bar';
    const height = (count / maxCount) * 80;
    bar.style.height = '0px';
    bar.style.backgroundColor = gradeColors[grade] || '#94a3b8';
    bar.style.transition = 'height 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';

    // Staggered animation
    setTimeout(() => {
      bar.style.height = height + 'px';
    }, 100 + index * 60);

    const label = document.createElement('span');
    label.className = 'chart-label';
    label.textContent = grade;

    wrapper.append(countLabel, bar, label);
    chart.appendChild(wrapper);
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  EXPORT BUTTON HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Wire up all export-related buttons in the results section.
 */
function initExportEvents() {
  // Copy to clipboard
  const copyBtn = document.getElementById('copy-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      if (!state.result) return;
      const subjects = dataTable.getData();
      const success = await copyToClipboard(state.result, subjects);
      if (success) {
        showToast('Result copied to clipboard!', 'success');
      } else {
        showToast('Failed to copy to clipboard.', 'error');
      }
    });
  }

  // Export as PNG
  const exportPngBtn = document.getElementById('export-png-btn');
  if (exportPngBtn) {
    exportPngBtn.addEventListener('click', async () => {
      showToast('Generating PNG…', 'info', 2000);
      const success = await exportAsPNG('result-card');
      if (success) {
        showToast('PNG downloaded successfully!', 'success');
      } else {
        showToast('Failed to export as PNG.', 'error');
      }
    });
  }

  // Share link
  const shareBtn = document.getElementById('share-btn');
  if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
      const subjects = dataTable.getData();
      const shareUrl = generateShareLink(subjects, state.scaleId);
      try {
        await navigator.clipboard.writeText(shareUrl);
        showToast('Share link copied to clipboard!', 'success');
      } catch (err) {
        // Fallback: show the URL in a prompt
        window.prompt('Copy this share link:', shareUrl);
        showToast('Share link generated.', 'info');
      }
    });
  }

  // Edit data (go back to table)
  const editDataBtn = document.getElementById('edit-data-btn');
  if (editDataBtn) {
    editDataBtn.addEventListener('click', () => {
      showSection('data-section');
    });
  }

  // New calculation
  const newCalcBtn = document.getElementById('new-calc-btn');
  if (newCalcBtn) {
    newCalcBtn.addEventListener('click', () => {
      // Reset all state
      state.imageFile = null;
      state.imageBase64 = null;
      state.imageMimeType = null;
      state.useDemo = false;
      state.result = null;

      resetUpload();
      dataTable.setData([]);
      showSection('hero-section');
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SHARE LINK HANDLING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check the current URL for a #share= fragment. If found, parse and load the shared data.
 * @returns {boolean} True if a share link was loaded.
 */
function checkShareLink() {
  const url = window.location.href;
  const shareData = parseShareLink(url);

  if (shareData && shareData.subjects && shareData.subjects.length > 0) {
    // Update scale
    state.scaleId = shareData.scaleId || '10';
    localStorage.setItem('gradesnap_scale', state.scaleId);

    // Update the grading scale selector
    const scaleSelect = document.getElementById('grading-scale-select');
    if (scaleSelect) {
      scaleSelect.value = state.scaleId;
    }

    // Load data into table
    dataTable.setScale(state.scaleId);
    dataTable.setData(shareData.subjects);

    // Navigate to data section
    showSection('data-section');
    showToast('Loaded shared data!', 'info');

    // Clean the hash from URL so it doesn't re-trigger
    if (window.history.replaceState) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }

    return true;
  }

  return false;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  HERO SECTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Wire up hero section events.
 */
function initHeroEvents() {
  const getStartedBtn = document.getElementById('get-started-btn');
  if (getStartedBtn) {
    getStartedBtn.addEventListener('click', () => {
      showSection('upload-section');
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PRELOAD html2canvas
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Preload the html2canvas script so PNG export is faster later.
 */
function preloadHtml2Canvas() {
  if (window.html2canvas) return;

  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'script';
  link.href = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
  document.head.appendChild(link);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  // Set grading scale selector to saved value
  const scaleSelect = document.getElementById('grading-scale-select');
  if (scaleSelect) {
    scaleSelect.value = state.scaleId;
  }

  // Initialize all event handlers
  initHeroEvents();
  initUploadEvents();
  initModalEvents();
  initExtractButton();
  initTableEvents();
  initExportEvents();

  // Check for share link in URL
  const loaded = checkShareLink();

  // If no share link, start at hero section
  if (!loaded) {
    showSection('hero-section');
  }

  // Preload html2canvas for faster PNG export
  preloadHtml2Canvas();

  console.log('%c🎓 GradeSnap', 'font-size: 20px; font-weight: bold; color: #7c3aed;');
  console.log('%cAI-Powered CGPA Calculator', 'font-size: 12px; color: #94a3b8;');
});
