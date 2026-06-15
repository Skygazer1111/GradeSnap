/**
 * @module table
 * @description DataTable class for managing the editable subjects table in GradeSnap.
 * Handles rendering, inline editing, validation, row management, and change notifications.
 */

import { getGradePoints, getAvailableGrades, normalizeGradeSymbol } from '../core/grade-mapper.js';

// ─── Helper ────────────────────────────────────────────────────────────────────

/**
 * Generate a unique row ID.
 * @returns {string} A unique identifier string like 'row_a1b2c3d4e'
 */
function generateId() {
  return 'row_' + Math.random().toString(36).substr(2, 9);
}

// ─── DataTable Class ───────────────────────────────────────────────────────────

/**
 * Manages the editable subjects table — rendering, editing, validation, and events.
 */
class DataTable {
  /**
   * @param {string} tbodyId - The id of the <tbody> element to render into.
   * @param {Object} [options={}]
   * @param {string} [options.scaleId='10'] - The grading scale identifier.
   * @param {Function|null} [options.onChange=null] - Callback fired whenever data changes.
   */
  constructor(tbodyId, options = {}) {
    this.tbody = document.getElementById(tbodyId);
    /** @type {Array<{id: string, subject: string, credits: number, grade: string, flagged: boolean}>} */
    this.data = [];
    this.scaleId = options.scaleId || '10';
    this.onChange = options.onChange || null;

    // Bind event delegation once
    this._bindEvents();
  }

  // ─── Public Methods ────────────────────────────────────────────────────────

  /**
   * Replace the entire dataset and re-render.
   * @param {Array<{id: string, subject: string, credits: number, grade: string, flagged: boolean}>} subjects
   */
  setData(subjects) {
    this.data = subjects.map(s => ({ ...s }));
    this.render();
    this._notifyChange();
  }

  /**
   * Change the active grading scale, re-render all grade dropdowns and recalculate points.
   * @param {string} scaleId - New grading scale identifier.
   */
  setScale(scaleId) {
    this.scaleId = scaleId;
    this.render();
  }

  /**
   * Render the entire table from the current data array.
   * Clears tbody and rebuilds every row with inputs, selects, calculated points, and action buttons.
   */
  render() {
    if (!this.tbody) return;

    this.tbody.innerHTML = '';

    const availableGrades = getAvailableGrades(this.scaleId);

    this.data.forEach((item, index) => {
      const tr = document.createElement('tr');
      tr.setAttribute('data-row-id', item.id);

      // Flagged row styling
      if (item.flagged) {
        tr.classList.add('flagged-row');
      }

      // ── Column 1: Row Number ──
      const tdNum = document.createElement('td');
      tdNum.textContent = index + 1;
      tdNum.className = 'cell-num';

      // ── Column 2: Subject Name ──
      const tdSubject = document.createElement('td');
      const subjectInput = document.createElement('input');
      subjectInput.type = 'text';
      subjectInput.className = 'cell-input';
      subjectInput.value = item.subject;
      subjectInput.setAttribute('data-id', item.id);
      subjectInput.setAttribute('data-field', 'subject');
      subjectInput.placeholder = 'Enter subject name';
      subjectInput.setAttribute('aria-label', `Subject name for row ${index + 1}`);
      tdSubject.appendChild(subjectInput);

      // ── Column 3: Credits ──
      const tdCredits = document.createElement('td');
      const creditsInput = document.createElement('input');
      creditsInput.type = 'number';
      creditsInput.className = 'cell-input';
      creditsInput.value = item.credits;
      creditsInput.min = '0';
      creditsInput.max = '30';
      creditsInput.setAttribute('data-id', item.id);
      creditsInput.setAttribute('data-field', 'credits');
      creditsInput.setAttribute('aria-label', `Credits for row ${index + 1}`);
      tdCredits.appendChild(creditsInput);
      if (item.credits <= 0) {
        tdCredits.classList.add('error-cell');
      }

      // ── Column 4: Grade Select ──
      const tdGrade = document.createElement('td');
      const gradeSelect = document.createElement('select');
      gradeSelect.className = 'cell-select';
      gradeSelect.setAttribute('data-id', item.id);
      gradeSelect.setAttribute('data-field', 'grade');
      gradeSelect.setAttribute('aria-label', `Grade for row ${index + 1}`);

      const canonicalGrade = normalizeGradeSymbol(item.grade);
      if (canonicalGrade && canonicalGrade !== item.grade && availableGrades.includes(canonicalGrade)) {
        item.grade = canonicalGrade;
      }

      const currentGradeInScale = availableGrades.includes(item.grade);

      // If not in scale, add it as first option with warning
      if (!currentGradeInScale && item.grade) {
        const warnOption = document.createElement('option');
        warnOption.value = item.grade;
        warnOption.textContent = `⚠️ ${item.grade}`;
        warnOption.selected = true;
        gradeSelect.appendChild(warnOption);
      }

      // Add all available grades
      availableGrades.forEach(grade => {
        const option = document.createElement('option');
        option.value = grade;
        option.textContent = grade;
        if (grade === item.grade) {
          option.selected = true;
        }
        gradeSelect.appendChild(option);
      });

      tdGrade.appendChild(gradeSelect);

      // ── Column 5: Grade Points (calculated, read-only) ──
      const tdPoints = document.createElement('td');
      const pointsSpan = document.createElement('span');
      pointsSpan.className = 'cell-points';
      const gradePoints = getGradePoints(item.grade, this.scaleId);
      if (gradePoints === null || gradePoints === undefined) {
        pointsSpan.textContent = '—';
        pointsSpan.classList.add('points-error');
        tdPoints.classList.add('error-cell');
      } else {
        pointsSpan.textContent = gradePoints;
      }
      tdPoints.appendChild(pointsSpan);

      // ── Column 6: Actions ──
      const tdActions = document.createElement('td');
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn btn-icon btn-danger btn-sm delete-row-btn';
      deleteBtn.setAttribute('data-id', item.id);
      deleteBtn.setAttribute('aria-label', `Delete row ${index + 1}`);
      deleteBtn.textContent = '🗑️';
      deleteBtn.title = 'Delete this subject';
      tdActions.appendChild(deleteBtn);

      // Assemble row
      tr.append(tdNum, tdSubject, tdCredits, tdGrade, tdPoints, tdActions);
      this.tbody.appendChild(tr);
    });

    // Show/hide empty state
    this._toggleEmptyState();
  }

  /**
   * Add a new blank row with sensible defaults.
   * Focuses the new subject input after rendering.
   */
  addRow() {
    const newEntry = {
      id: generateId(),
      subject: '',
      credits: 3,
      grade: 'A',
      flagged: false
    };
    this.data.push(newEntry);
    this.render();

    // Focus the newly added subject input
    const newInput = this.tbody.querySelector(`input[data-id="${newEntry.id}"][data-field="subject"]`);
    if (newInput) {
      newInput.focus();
      // Scroll the new row into view smoothly
      newInput.closest('tr').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    this._notifyChange();
  }

  /**
   * Remove a row by its unique ID.
   * @param {string} id - The row ID to delete.
   */
  deleteRow(id) {
    this.data = this.data.filter(item => item.id !== id);
    this.render();
    this._notifyChange();
  }

  /**
   * Get a deep copy of the current data.
   * @returns {Array<{id: string, subject: string, credits: number, grade: string, flagged: boolean}>}
   */
  getData() {
    return this.data.map(item => ({ ...item }));
  }

  /**
   * Validate all rows and return an array of human-readable error strings.
   * @returns {string[]} Array of validation error messages.
   */
  getValidationErrors() {
    const errors = [];

    this.data.forEach((item, index) => {
      const rowNum = index + 1;

      if (!item.subject || item.subject.trim() === '') {
        errors.push(`Subject name is required for row ${rowNum}`);
      }

      const isZeroCreditAudit = item.flagged && item.credits <= 0;

      if (item.credits <= 0 && !isZeroCreditAudit) {
        const name = item.subject.trim() || `Row ${rowNum}`;
        errors.push(`Credits must be > 0 for row ${rowNum} (${name})`);
      }

      if (!isZeroCreditAudit) {
        const points = getGradePoints(item.grade, this.scaleId);
        if (points === null || points === undefined) {
          const name = item.subject.trim() || `Row ${rowNum}`;
          errors.push(`Unrecognized grade "${item.grade}" for ${name}`);
        }
      }
    });

    return errors;
  }

  /**
   * Check if the current data passes all validation checks.
   * @returns {boolean} True if there are no validation errors.
   */
  isValid() {
    return this.data.length > 0 && this.getValidationErrors().length === 0;
  }

  // ─── Private Methods ──────────────────────────────────────────────────────

  /**
   * Set up event delegation on the tbody for input, change, and click events.
   * Called once in the constructor.
   * @private
   */
  _bindEvents() {
    if (!this.tbody) return;

    // Input events — for text and number inputs
    this.tbody.addEventListener('input', (e) => {
      const target = e.target;

      if (target.matches('.cell-input')) {
        const id = target.getAttribute('data-id');
        const field = target.getAttribute('data-field');
        const item = this.data.find(d => d.id === id);
        if (!item) return;

        if (field === 'subject') {
          item.subject = target.value;
        } else if (field === 'credits') {
          const val = parseFloat(target.value);
          item.credits = isNaN(val) ? 0 : val;

          // Update error styling on credits cell
          const td = target.closest('td');
          if (item.credits <= 0) {
            td.classList.add('error-cell');
          } else {
            td.classList.remove('error-cell');
          }
        }

        // Recalculate points for this row
        this._updateRowPoints(id);
        this._notifyChange();
      }
    });

    // Change events — for grade select dropdowns
    this.tbody.addEventListener('change', (e) => {
      const target = e.target;

      if (target.matches('.cell-select')) {
        const id = target.getAttribute('data-id');
        const field = target.getAttribute('data-field');
        const item = this.data.find(d => d.id === id);
        if (!item) return;

        if (field === 'grade') {
          item.grade = target.value;

          // Remove the warning option if user selects a valid grade
          const warnOption = target.querySelector('option[value]:first-child');
          if (warnOption && warnOption.textContent.startsWith('⚠️') && target.value !== warnOption.value) {
            warnOption.remove();
          }
        }

        // Recalculate points for this row
        this._updateRowPoints(id);
        this._notifyChange();
      }
    });

    // Click events — for delete buttons
    this.tbody.addEventListener('click', (e) => {
      const target = e.target.closest('.delete-row-btn');
      if (target) {
        const id = target.getAttribute('data-id');
        this.deleteRow(id);
      }
    });
  }

  /**
   * Update the grade points display for a specific row.
   * @param {string} id - The row ID.
   * @private
   */
  _updateRowPoints(id) {
    const item = this.data.find(d => d.id === id);
    if (!item) return;

    const row = this.tbody.querySelector(`tr[data-row-id="${id}"]`);
    if (!row) return;

    const pointsSpan = row.querySelector('.cell-points');
    const pointsTd = pointsSpan ? pointsSpan.closest('td') : null;
    if (!pointsSpan || !pointsTd) return;

    const gradePoints = getGradePoints(item.grade, this.scaleId);

    if (gradePoints === null || gradePoints === undefined) {
      pointsSpan.textContent = '—';
      pointsSpan.classList.add('points-error');
      pointsTd.classList.add('error-cell');
    } else {
      pointsSpan.textContent = gradePoints;
      pointsSpan.classList.remove('points-error');
      pointsTd.classList.remove('error-cell');
    }
  }

  /**
   * Fire the onChange callback and update preview summary elements in the DOM.
   * @private
   */
  _notifyChange() {
    const isValid = this.isValid();
    const errors = this.getValidationErrors();

    // Call the onChange callback
    if (this.onChange) {
      this.onChange({
        data: this.data,
        isValid,
        errors
      });
    }

    // Update summary preview elements
    const subjectsCountEl = document.getElementById('subjects-count-preview');
    const totalCreditsEl = document.getElementById('total-credits-preview');
    const validationStatusEl = document.getElementById('validation-status');

    if (subjectsCountEl) {
      subjectsCountEl.textContent = `${this.data.length} subject${this.data.length !== 1 ? 's' : ''}`;
    }

    if (totalCreditsEl) {
      const totalCredits = this.data.reduce((sum, item) => sum + (item.credits || 0), 0);
      totalCreditsEl.textContent = `${totalCredits} total credits`;
    }

    if (validationStatusEl) {
      if (errors.length > 0) {
        validationStatusEl.textContent = errors[0];
        validationStatusEl.className = 'validation-status validation-error';
      } else if (this.data.length === 0) {
        validationStatusEl.textContent = 'No subjects added yet';
        validationStatusEl.className = 'validation-status validation-warning';
      } else {
        validationStatusEl.textContent = '✓ Ready';
        validationStatusEl.className = 'validation-status validation-success';
      }
    }
  }

  /**
   * Show or hide the empty-state placeholder based on data length.
   * @private
   */
  _toggleEmptyState() {
    const emptyDiv = document.getElementById('table-empty');
    if (emptyDiv) {
      emptyDiv.style.display = this.data.length === 0 ? 'flex' : 'none';
    }
  }
}

export default DataTable;
