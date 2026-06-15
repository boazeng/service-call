"""Sync orchestration between this app and Priority.

push_call:  one local call -> Priority document (fills priority_doc_number).
pull_all:   Priority -> here. Existing docs (matched by priority_doc_number) are
            updated; docs created directly in Priority are inserted with
            source=priority. Local bot calls without a priority_doc_number are
            never touched, so they remain "local only" until explicitly pushed.

Net effect: the list here = every Priority call + local bot calls not yet pushed.
"""
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import Device, ServiceCall, Source, Status, SyncLog, SyncStatus
from . import priority_service

# Priority status text -> our internal status. Unknown values keep priority_status
# raw and fall back to IN_PROGRESS.
_PRIORITY_STATUS_MAP = {
    "open": Status.SENT,
    "in progress": Status.IN_PROGRESS,
    "closed": Status.CLOSED,
    "cancelled": Status.CANCELLED,
    "canceled": Status.CANCELLED,
}


def _map_status(priority_status: str | None) -> str:
    if not priority_status:
        return Status.IN_PROGRESS
    return _PRIORITY_STATUS_MAP.get(priority_status.strip().lower(), Status.IN_PROGRESS)


def push_call(db: Session, call: ServiceCall) -> ServiceCall:
    """Push one local call to Priority and record the result on the row."""
    log = SyncLog(direction="push")
    db.add(log)
    try:
        record = priority_service.push(call)
        doc = record.get("priority_doc_number")
        if not doc:
            raise priority_service.PriorityError("Priority returned no document number")
        now = datetime.utcnow()
        call.priority_doc_number = doc
        call.priority_status = record.get("priority_status")
        call.sync_status = SyncStatus.SYNCED
        call.status = Status.SENT
        call.sent_to_priority_at = now
        call.last_synced_at = now
        call.sync_error = None
        log.status = "ok"
        log.items_updated = 1
    except priority_service.PriorityError as exc:
        call.sync_status = SyncStatus.SYNC_ERROR
        call.sync_error = str(exc)
        log.status = "error"
        log.items_failed = 1
        log.message = str(exc)
        log.finished_at = datetime.utcnow()
        db.commit()
        raise
    log.finished_at = datetime.utcnow()
    db.commit()
    db.refresh(call)
    return call


def pull_all(db: Session, since: str | None = None) -> SyncLog:
    """Pull the authoritative list from Priority and reconcile it into the DB."""
    log = SyncLog(direction="pull")
    db.add(log)
    db.commit()
    try:
        records = priority_service.pull(since)
    except priority_service.PriorityError as exc:
        log.status = "error"
        log.message = str(exc)
        log.finished_at = datetime.utcnow()
        db.commit()
        raise

    now = datetime.utcnow()
    created = updated = 0
    for rec in records:
        doc = rec.get("priority_doc_number")
        if not doc:
            continue
        existing = db.scalar(
            select(ServiceCall).where(ServiceCall.priority_doc_number == doc)
        )
        if existing:
            existing.title = rec.get("title") or existing.title
            existing.description = rec.get("description") or existing.description
            existing.company = rec.get("company") or existing.company
            existing.customer_name = rec.get("customer_name") or existing.customer_name
            existing.branch = rec.get("branch") or existing.branch
            existing.branch_description = rec.get("branch_description") or existing.branch_description
            existing.device_sernum = rec.get("device_sernum") or existing.device_sernum
            existing.contract_number = rec.get("contract_number") or existing.contract_number
            existing.contract_status = rec.get("contract_status") or existing.contract_status
            existing.paid_until = rec.get("paid_until") or existing.paid_until
            existing.downtime_start = rec.get("downtime_start") or existing.downtime_start
            existing.downtime_end = rec.get("downtime_end") or existing.downtime_end
            existing.open_date = rec.get("open_date") or existing.open_date
            existing.priority_status = rec.get("priority_status")
            existing.status = _map_status(rec.get("priority_status"))
            existing.sync_status = SyncStatus.SYNCED
            existing.last_synced_at = now
            updated += 1
        else:
            from .service_call_service import next_call_number

            db.add(
                ServiceCall(
                    call_number=next_call_number(db),
                    priority_doc_number=doc,
                    source=Source.PRIORITY,
                    status=_map_status(rec.get("priority_status")),
                    sync_status=SyncStatus.SYNCED,
                    priority_status=rec.get("priority_status"),
                    title=rec.get("title") or "",
                    description=rec.get("description"),
                    company=rec.get("company"),
                    customer_name=rec.get("customer_name"),
                    branch=rec.get("branch"),
                    branch_description=rec.get("branch_description"),
                    device_sernum=rec.get("device_sernum"),
                    contact_phone=rec.get("contact_phone"),
                    contract_number=rec.get("contract_number"),
                    contract_status=rec.get("contract_status"),
                    paid_until=rec.get("paid_until"),
                    downtime_start=rec.get("downtime_start"),
                    downtime_end=rec.get("downtime_end"),
                    open_date=rec.get("open_date"),
                    raw_payload=rec,
                    last_synced_at=now,
                )
            )
            created += 1
        db.commit()

    log.status = "ok"
    log.items_created = created
    log.items_updated = updated
    log.finished_at = datetime.utcnow()
    log.message = f"pulled {len(records)} record(s)"
    db.commit()
    db.refresh(log)
    return log


def pull_devices_all(db: Session) -> SyncLog:
    """Import devices from Priority SERNUMBERS, upserting by serial number."""
    log = SyncLog(direction="devices")
    db.add(log)
    db.commit()
    try:
        records = priority_service.pull_devices()
    except priority_service.PriorityError as exc:
        log.status = "error"
        log.message = str(exc)
        log.finished_at = datetime.utcnow()
        db.commit()
        raise

    now = datetime.utcnow()
    created = updated = 0
    fields = (
        "sernum_suffix", "part_name", "part_description", "customer_code", "customer_name",
        "contact_name", "branch", "phone", "site_code", "site_description",
        "service_contract", "zone_code", "zone_description", "install_date",
        "status", "family_name", "family_description",
        "facility_name", "facility_description",
    )
    for rec in records:
        sernum = rec.get("sernum")
        if not sernum:
            continue
        existing = db.scalar(select(Device).where(Device.sernum == sernum))
        if existing:
            for f in fields:
                setattr(existing, f, rec.get(f) or getattr(existing, f))
            existing.raw_payload = rec
            existing.last_synced_at = now
            updated += 1
        else:
            db.add(Device(
                sernum=sernum,
                **{f: rec.get(f) for f in fields},
                raw_payload=rec,
                last_synced_at=now,
            ))
            created += 1
        db.commit()

    log.status = "ok"
    log.items_created = created
    log.items_updated = updated
    log.finished_at = datetime.utcnow()
    log.message = f"imported {len(records)} device(s)"
    db.commit()
    db.refresh(log)
    return log
