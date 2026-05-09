@echo off
rem Move all dev/utility/debug scripts to the scripts\ subdirectory.
rem Run this once from the project root: move_scripts.bat

if not exist scripts mkdir scripts

for %%F in (
  debug_auth.py
  debug_firebase.py
  fix_firebase_key.py
  diagnose_and_sync.py
  demo_fuzzy_matching.py
  demo_workflow_visualization.py
  verify_setup.py
  build_ddi_dataset.py
  build_full_ddi_bulk.py
  build_full_ddi_dataset.py
  evaluation_dataset.py
  evaluation_runner.py
  example_evaluation_report.py
  sync_to_user.py
  migrate_legacy.py
  daily_audit.py
  daily_alert_job.py
  test_auth_backend.py
  test_barcode.py
  test_pdf_scan.py
  mock_data.py
) do (
  if exist %%F (
    move /Y %%F scripts\%%F
    echo Moved %%F
  )
)

echo Done! All dev scripts are now in scripts\
