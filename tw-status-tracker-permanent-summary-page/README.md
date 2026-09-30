# TW Status Tracker – TATA Advanced Systems

A single-file web app for Technical Writing document status management.

## Features

- **Project row:** Project Name (full width)
- **Module rows, field order:** Module Name → FW Document → DVC Review Status → Version (with search/autocomplete) → Date of Review (calendar) → Date of Testing (calendar) → TC Release
- **Add Rows** and **Save** sit side by side under each entry:
  - **Add Rows** adds another module row to that entry (Project Name is never duplicated)
  - **Save** saves that entry's current data immediately
- Entries are always labelled **Entry 1, Entry 2, Entry 3, …** in sequence, automatically renumbered whenever an entry is added or removed — no gaps or skipped numbers
- Autocomplete suggestions for Project Name, Version, and Module Name
- Save records to browser localStorage
- Summary dashboard cards show total saved projects, entries, modules, DVC review counts, TC release counts, and per-project module totals
- **Privacy on save:** the moment you click **Save** (per-entry) or **Save Records** (bottom bar), the typed-in data is written to storage and the on-screen form immediately clears back to one blank entry — nothing you typed stays visible on screen. Your data is still safely stored and is included the next time you click **Download Excel**.
- Download all project details as one Excel (.xlsx) file from the top button:
  - The workbook includes a **Summary** sheet and an **All Project Details** sheet
  - All entries and module rows are exported into one sheet named **All Project Details**
  - The sheet includes Entry No, Row No, Project Name, Module Name, FW Docs, DVC Review, Version, Date of Review, Date of Testing, and TC Release
- Use the project dropdown in the Excel Download section to select only specific projects (for example Pro1, Pro3, and Pro20) and download those records separately
- Bottom page actions include **Import Excel**, **Export All**, and **Export Selected**
- Import Excel reads project/module rows from a workbook and rebuilds the web cards automatically:
  - Uses Entry No / Row No when present
  - Groups module rows under the matching Project Name
  - Saves imported records to browser localStorage immediately
- An empty `TW_Status_Tracker.xlsx` template (with the correct column headers) sits in this folder for reference. Browsers cannot silently write to files on disk for security reasons, so use **Download Excel** to get a populated copy of your entered data at any time.

## Layout per Entry Card

```
[ Entry N ]                                                                              [Delete]
[ Project Name                                                                                  ]
[ Module Name ] [ FW Doc ] [DVC Review] [Version] [Date of Review] [Date of Testing] [TC Release]  <- row 1
[ Module Name ] [ FW Doc ] [DVC Review] [Version] [Date of Review] [Date of Testing] [TC Release]  <- row 2 (added via Add Rows)
[ + Add Rows ]                                                                          [ Save ]
```

## Project Structure

```
tw-status-tracker/
├── index.html
+-- main.py
├── style.css
├── script.js
├── TW_Status_Tracker.xlsx
├── README.md
└── assets/
    └── images/
        └── bg-watercolor-pastel.jpg   (page background image)
```
