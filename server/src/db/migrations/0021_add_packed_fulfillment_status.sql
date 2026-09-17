-- Unapplied by design. Apply only through the approved production migration process.
ALTER TYPE "fulfillment_status" ADD VALUE IF NOT EXISTS 'packed' BEFORE 'shipped';
