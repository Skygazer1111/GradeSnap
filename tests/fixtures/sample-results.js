export const SAMPLE_SUBJECTS = [
  { subject: 'PROBABILITY AND QUEUEING THEORY', credits: 4, grade: 'O', flagged: false },
  { subject: 'DESIGN AND ANALYSIS OF ALGORITHMS', credits: 4, grade: 'O', flagged: false },
  { subject: 'DATABASE MANAGEMENT SYSTEMS', credits: 4, grade: 'O', flagged: false },
  { subject: 'ARTIFICIAL INTELLIGENCE', credits: 3, grade: 'O', flagged: false },
  { subject: 'DIGITAL IMAGE PROCESSING', credits: 3, grade: 'A+', flagged: false },
  { subject: 'DESIGN THINKING AND METHODOLOGY', credits: 3, grade: 'O', flagged: false },
  { subject: 'SOCIAL ENGINEERING', credits: 2, grade: 'O', flagged: false },
  { subject: 'ANALYTICAL AND LOGICAL THINKING SKILLS', credits: 0, grade: 'O', flagged: false },
  { subject: 'FINANCIAL TECHNOLOGIES FOUNDATIONS', credits: 3, grade: 'O', flagged: false },
];

export const SAMPLE_CLEAN_OCR_TEXT = `S.No. SEMESTER COURSE CODE COURSE DESCRIPTION CREDIT GRADE RESULT
May - 2026
1 4 21MAB204T PROBABILITY AND QUEUEING THEORY 4 O PASS
2 4 21CSC204J DESIGN AND ANALYSIS OF ALGORITHMS 4 O PASS
3 4 21CSC205P DATABASE MANAGEMENT SYSTEMS 4 O PASS
4 4 21CSC206T ARTIFICIAL INTELLIGENCE 3 O PASS
5 4 21CSE251T DIGITAL IMAGE PROCESSING 3 A+ PASS
6 4 21DCS201P DESIGN THINKING AND METHODOLOGY 3 O PASS
7 4 21PDH209T SOCIAL ENGINEERING 2 O PASS
8 4 21PDM301L ANALYTICAL AND LOGICAL THINKING SKILLS 0 O PASS
9 4 21HCSF007 FINANCIAL TECHNOLOGIES FOUNDATIONS 3 O PASS`;

export const SAMPLE_NOISY_OCR_TEXT = `[= = = = == =]
EE

1                4                        2IMAB204T          PROBABILITY AND QUEUEING THEORY                                                          4                                     Oo                  PASS

pa               4                       21CSC204J           DESIGN AND ANALYSIS OF ALGORITHMS                                                     4                                    Oo                 PASS

3               4                       21CSC205P          DATABASE MANAGEMENT SYSTEMS                                                           4                                    Oo                 PASS

4               4                       21CSC206T          ARTIFICIAL INTELLIGENCE                                                                          3                                    Oo                 PASS

5                  4                           21CSE251T             DIGITAL IMAGE PROCESSING                                                                                    3                                           A+                  PASS

6             4                    21DCS201P         DESIGN THINKING AND METHODOLOGY                                                3                                Oo               PASS

7               4                       21PDH209T          SOCIAL ENGINEERING                                                                                pa                                    Oo                 PASS

8               4                       21PDM301L          ANALYTICAL AND LOGICAL THINKING SKILLS                                               [o]                                    Oo                 PASS

9                  4                           palzlesizeloy)            FINANCIAL TECHNOLOGIES FOUNDATIONS                                                            3                                           Oo                    PASS`;

export const SAMPLE_PREPROCESSED_OCR_TEXT = `S.No.        SEMESTER        pose            ‘COURSE DESCRIPTION                                                                   CREDIT                       GRADE        RESULT
May - 2026
1             4                   2IMAB204T        PROBABILITY AND QUEUEING THEORY                                              4                              [e]              PASS
2            4                  21CsC204)        DESIGN AND ANALYSIS OF ALGORITHMS                                         4                            [e]             PASS
3             4                    21CSC205P         DATABASE MANAGEMENT SYSTEMS                                                   4                               [e]               PASS
4             4                    21CSC206T         ARTIFICIAL INTELLIGENCE                                                                3                               [e]               PASS
5             4                    21CSE251T          DIGITAL IMAGE PROCESSING                                                            3                               A+             PASS
6            4                  21DCS201P         DESIGN THINKING AND METHODOLOGY                                           3                             [e]              PASS
7             4                    21PDH209T        SOCIAL ENGINEERING                                                                    2                               [e]               PASS
8            4                  21PDM301L        ANALYTICAL AND LOGICAL THINKING SKILLS                                      0                             [e]              PASS
9              4                     21HCSFO07         FINANCIAL TECHNOLOGIES FOUNDATIONS                                              3                                 [e]                PASS`;

export const SAMPLE_BROWSER_LIKE_OCR_TEXT = `S.No.       SEMESTER      pe          COURSE DESCRIPTION                                                        CREDIT                   GRADE       RESULT
May - 2026
1             4                   21MAB204T        PROBABILITY AND QUEUEING THEORY                                               4                              O              PASS
2            4                  21CSC204)        DESIGN AND ANALYSIS OF ALGORITHMS                                          4                            O              PASS
3           4                21CSC205P        DATABASE MANAGEMENT SYSTEMS                                           4                          oO            PASS
4           4                 21CSC206T       ARTIFICIAL INTELLIGENCE                                                      3                          O            PASS
5           4                21CSE251T        DIGITAL IMAGE PROCESSING                                                   3                          A+           PASS
6            4                 21DCS201P        DESIGN THINKING AND METHODOLOGY                                          3                            O             PASS
7           4                21PDH209T       SOCIAL ENGINEERING                                                          2                          oO            PASS
8             4                   21PDM301L         ANALYTICAL AND LOGICAL THINKING SKILLS                                         [0]                               O               PASS
9           4                21HCSFOO7       FINANCIAL TECHNOLOGIES FOUNDATIONS                                    3                          oO            PASS`;

export const EXPECTED_CGPA_10_POINT = 9.88;
export const EXPECTED_MOOD = 'celebration';

/** SampleResults2.jpeg — May 2026 semester (ERP, mixed A+/O grades). */
export const SAMPLE2_SUBJECTS = [
  { subject: 'PROBABILITY AND QUEUEING THEORY', credits: 4, grade: 'O', flagged: false },
  { subject: 'DESIGN AND ANALYSIS OF ALGORITHMS', credits: 4, grade: 'A+', flagged: false },
  { subject: 'DATABASE MANAGEMENT SYSTEMS', credits: 4, grade: 'A+', flagged: false },
  { subject: 'ARTIFICIAL INTELLIGENCE', credits: 3, grade: 'O', flagged: false },
  { subject: 'ERP SOLUTION FOR DIGITAL ENTERPRISES', credits: 3, grade: 'A+', flagged: false },
  { subject: 'DESIGN THINKING AND METHODOLOGY', credits: 3, grade: 'O', flagged: false },
  { subject: 'SOCIAL ENGINEERING', credits: 2, grade: 'O', flagged: false },
  { subject: 'ANALYTICAL AND LOGICAL THINKING SKILLS', credits: 0, grade: 'O', flagged: false },
  { subject: 'FINANCIAL TECHNOLOGIES FOUNDATIONS', credits: 3, grade: 'A+', flagged: false },
];

export const SAMPLE2_CLEAN_OCR_TEXT = `S.No. SEMESTER COURSE CODE COURSE DESCRIPTION CREDIT GRADE RESULT
May - 2026
1 4 21MAB204T PROBABILITY AND QUEUEING THEORY 4 O PASS
2 4 21CSC204J DESIGN AND ANALYSIS OF ALGORITHMS 4 A+ PASS
3 4 21CSC205P DATABASE MANAGEMENT SYSTEMS 4 A+ PASS
4 4 21CSC206T ARTIFICIAL INTELLIGENCE 3 O PASS
5 4 21IPE312P ERP SOLUTION FOR DIGITAL ENTERPRISES 3 A+ PASS
6 4 21DCS201P DESIGN THINKING AND METHODOLOGY 3 O PASS
7 4 21PDH209T SOCIAL ENGINEERING 2 O PASS
8 4 21PDM301L ANALYTICAL AND LOGICAL THINKING SKILLS 0 O PASS
9 4 21HCSF007 FINANCIAL TECHNOLOGIES FOUNDATIONS 3 A+ PASS`;

/** Browser-Tesseract noisy OCR text for SampleResults2 — simulates real-world browser pipeline noise. */
export const SAMPLE2_NOISY_BROWSER_OCR_TEXT = `S.No.       SEMESTER      code          COURSE DESCRIPTION                                                        CREDIT                   GRADE       RESULT
May - 2026
1             4                   21MAB204T        PROBABILITY AND QUEUEING THEORY                                               4                              O              PASS
2            4                  21CSC204)        DESiGN AND ANALYSIS oF ALGORITHMS                                          4                            A+              PASS
3           4                21CSC205P        DATABASE MANAGEMENT SYSTEMS                                           4                          A+            PASS
4           4                 21CSC206T       ARTIFICIAL INTELLIGENCE                                                      3                          O            PASS
5           4                21IPE312P        ERP SOLUTION FOR DIGITAL ENTERPRISES                                                   3                          A+           PASS
6            4                 21DCS201P        DESIGN THINKING AND METHODOLOGY                                          3                            O             PASS
7           4                21PDH209T       SOCIAL ENGINEERING                                                          2                          O            PASS
8             4                   21PDM301L         ANALYTICAL AND LOGICAL THINKING SKILLS                                         [0]                               O               PASS
9           4                21HCSF007       FINANCIAL TECHNOLOGIES FOUNDATIONS                                    3                          A+            PASS`;

export const EXPECTED_SAMPLE2_CGPA = 9.46;
export const EXPECTED_SAMPLE2_MOOD = 'celebration';

/** @deprecated Use SAMPLE2_SUBJECTS */
export const SRM_USER_SUBJECTS = SAMPLE2_SUBJECTS;
export const SRM_USER_EXPECTED_CGPA = EXPECTED_SAMPLE2_CGPA;
export const SRM_USER_TOTAL_QUALITY_POINTS = 246;
export const SRM_USER_TOTAL_CREDITS = 26;
