# Invoice Ingestion And Posting Assistant

Updated: 2026-02-24

## What Is Implemented

- Upload/drag invoice images or PDFs into a queue.
- Each upload gets a `document_id` and original file blob is persisted in browser IndexedDB.
- Archive metadata is generated under date folder pattern:
  - `Invoices/YYYY-MM-DD/<archive_file_name>`
- Queue status lifecycle:
  - `uploaded -> recognized -> ready_to_sync -> synced`
  - failure states: `recognize_failed`, `sync_failed`
- Batch actions:
  - batch recognize
  - mark ready
  - batch sync to Xero
- Review drawer supports manual field correction before sync.
- Supplier directory supports alias mapping and default account/tax profile.
- Night mode helper:
  - select date folder and auto-select all pending items.

## UI Location

- Go to `Tools` page.
- Select workflow card: `Invoice Ingestion Assistant`.

## Settings

Configured in assistant modal:

- `drive_root_folder` (default: `Invoices`)
- `drive_archive_endpoint` (optional)
- `ocr_extract_endpoint` (optional)
- `xero_sync_endpoint` (optional)
- `default_currency` (default: `AUD`)
- `default_transaction_type` (default: `SPEND_MONEY`)
- `dry_run_mode` (default: `true`)
- `blob_retention_days` (default: `30`)

If optional endpoints are empty, assistant runs in local fallback mode:

- Drive archive uses synthetic local URL.
- OCR uses filename-based heuristic extraction.
- Xero sync returns mock `xero_id`.

## Endpoint Contracts

### Drive Archive Endpoint

- Method: `POST` (`multipart/form-data`)
- Fields:
  - `file`
  - `document_id`
  - `root_folder`
  - `date_folder`
  - `archive_file_name`
- Expected response JSON:
  - `drive_file_id` or `file_id`
  - `drive_url` or `url`

### OCR Extract Endpoint

- Method: `POST` (`multipart/form-data`)
- Fields:
  - `file`
  - `document_id`
  - `drive_url`
  - `currency`
- Expected response JSON fields (flat or under `data`):
  - `supplier_name`
  - `abn`
  - `invoice_number`
  - `invoice_date`
  - `due_date`
  - `currency`
  - `total`
  - `gst_amount`
  - `gst_status`
  - `tax_invoice_flag`
  - `line_items`
  - `confidence`
  - `needs_human_review`
  - `reasons`

### Xero Sync Endpoint

- Method: `POST` (`application/json`)
- Header:
  - `X-Idempotency-Key`
- Payload core:
  - `type` (`SPEND_MONEY` or `BILL`)
  - `date`
  - `contact.name`
  - `lineItems`
  - `total`
  - `currency`
  - `drive_file_id` / `drive_file_url`
  - `document_id`
- Expected response JSON:
  - `xero_id` or `id`

## Required Fields Before Sync

- `invoice_date`
- `supplier_name`
- `total`
- `currency`
- `document_image` (`drive_file_id` or `drive_url`)

## Data Storage

- State and queue metadata:
  - `localStorage` key: `invoice_ingestion_assistant_state_v1`
  - IndexedDB snapshot mirror:
    - DB: `invoice_ingestion_state_store_v1`
    - store: `assistant_state`
- Original source file blobs:
  - IndexedDB DB: `invoice_ingestion_blob_store_v1`
  - store: `documents`

## Reliability Guards

- External requests (Drive archive / OCR / Xero sync) use timeout + retry.
- Batch recognize and batch sync run with bounded concurrency.
- Queue writes use versioned patch-merge to reduce stale snapshot overwrite.
- Synced blobs older than retention policy are cleaned automatically.
