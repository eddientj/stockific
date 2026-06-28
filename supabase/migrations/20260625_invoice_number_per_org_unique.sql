-- invoice_number was globally unique — should be unique per org only.
alter table invoices drop constraint if exists invoices_invoice_number_key;
create unique index if not exists invoices_invoice_number_org_idx on invoices (org_id, invoice_number);
