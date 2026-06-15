"""Priority ERP client (OData 4.0).

Talks to the Priority OData API to import service calls (DOCUMENTS_Q, TYPE='Q')
and to create new ones. Field names are mapped in one place (`_map_out` / `_map_in`)
so retargeting a different Priority entity means editing only this file.

Connection details follow the working pattern from the urbangroup project:
HTTP Basic auth + `OData-Version: 4.0` header; the service-call document entity is
`DOCUMENTS_Q`. When `settings.priority_use_mock` is True the client returns
deterministic data so the flow runs without a live Priority.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

import httpx

from ..config import settings
from ..models import ServiceCall

# Priority treats datetimes as Israel local time (UTC+2).
_ISRAEL_TZ = timezone(timedelta(hours=2))

# Priority columns we read on import — keep the $select tight for speed.
_SELECT_FIELDS = (
    "DOCNO,CDES,CUSTNAME,BRANCHNAME,BRANCHDES,SERNUM,PARTNAME,DETAILS,PHONENUM,NAME,"
    "CALLSTATUSCODE,STARTDATE,ACTIVEFLAG,"
    "CONTNUM,CONTSTATDES,EXPIRYDATE,BREAKSTART,BREAKEND"
)
# Columns read from SERNUMBERS when importing devices.
# (SERNUMBERS has no BRANCHNAME — branch lives only on the service call.)
_DEVICE_SELECT = (
    "SERNUM,SERNUMSUFFIX,PARTNAME,PARTDES,CUSTNAME,CDES,NAME,PHONENUM,STATUSNAME,"
    "FAMILYNAME,FAMILYDES,FACILITYNAME,FACILITYDES,"
    "DCODE,DCODEDES,CONTDOCNO,ZONECODE,ZONEDES,INSTDATE"
)
# Entity that holds devices/equipment in Priority.
_DEVICE_ENTITY = "SERNUMBERS"


class PriorityError(RuntimeError):
    pass


def is_configured() -> bool:
    return bool(
        settings.priority_base_url
        and settings.priority_user
        and settings.priority_password
    )


def _headers() -> dict[str, str]:
    return {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "OData-Version": "4.0",
    }


def _auth() -> tuple[str, str]:
    return (settings.priority_user, settings.priority_password)


def _entity_url() -> str:
    return f"{settings.priority_base_url.rstrip('/')}/{settings.priority_service_entity}"


def _israel_now() -> str:
    return datetime.now(_ISRAEL_TZ).strftime("%Y-%m-%dT%H:%M:%SZ")


def _odata_error(resp: httpx.Response) -> str:
    """Pull a human message out of a Priority OData error body."""
    try:
        data = resp.json()
        msg = (
            data.get("FORM", {}).get("InterfaceErrors", {}).get("text")
            or data.get("error", {}).get("message")
        )
        if msg:
            return str(msg)
    except Exception:
        pass
    return f"HTTP {resp.status_code}: {resp.text[:200]}"


# --- field mapping (DOCUMENTS_Q) ---

def _map_out(call: ServiceCall) -> dict[str, Any]:
    """ServiceCall -> Priority DOCUMENTS_Q create payload.

    Priority requires a real customer code (CUSTNAME); bot/manual calls rarely
    carry one, so we fall back to the generic walk-in customer 99999.
    """
    body: dict[str, Any] = {
        "CUSTNAME": "99999",
        "BRANCHNAME": call.site or "001",
        "STARTDATE": _israel_now(),
    }
    details = call.title or (call.description or "")[:40]
    if details:
        body["DETAILS"] = details
    if call.contact_phone:
        body["PHONENUM"] = call.contact_phone
    if call.customer_name:
        body["NAME"] = call.customer_name
    if call.description:
        body["DOCTEXT_Q_2_SUBFORM"] = {"TEXT": call.description}
    return body


def _map_in(record: dict[str, Any]) -> dict[str, Any]:
    """Priority DOCUMENTS_Q record -> normalized dict consumed by sync_service."""
    return {
        "priority_doc_number": str(record.get("DOCNO") or ""),
        "title": record.get("DETAILS") or record.get("CDES") or str(record.get("DOCNO") or ""),
        "description": record.get("DETAILS"),
        # CDES = customer display name → the company the call is for.
        "company": record.get("CDES"),
        "customer_name": record.get("NAME") or record.get("CDES"),
        "branch": record.get("BRANCHNAME"),
        "branch_description": record.get("BRANCHDES"),
        "device_sernum": record.get("SERNUM"),
        "contact_phone": record.get("PHONENUM"),
        "priority_status": record.get("CALLSTATUSCODE"),
        "contract_number": record.get("CONTNUM"),
        "contract_status": record.get("CONTSTATDES"),
        "paid_until": record.get("EXPIRYDATE"),
        "downtime_start": record.get("BREAKSTART"),
        "downtime_end": record.get("BREAKEND"),
    }


def _map_device_in(record: dict[str, Any]) -> dict[str, Any]:
    """Priority SERNUMBERS record -> normalized device dict."""
    return {
        "sernum": str(record.get("SERNUM") or ""),
        "sernum_suffix": record.get("SERNUMSUFFIX"),
        "part_name": record.get("PARTNAME"),
        "part_description": record.get("PARTDES"),
        "customer_code": record.get("CUSTNAME"),
        "customer_name": record.get("CDES"),
        "contact_name": record.get("NAME"),
        "branch": record.get("BRANCHNAME"),
        "phone": record.get("PHONENUM"),
        "site_code": record.get("DCODE"),
        "site_description": record.get("DCODEDES"),
        "service_contract": record.get("CONTDOCNO"),
        "zone_code": record.get("ZONECODE"),
        "zone_description": record.get("ZONEDES"),
        "install_date": record.get("INSTDATE"),
        "status": record.get("STATUSNAME"),
        "family_name": record.get("FAMILYNAME"),
        "family_description": record.get("FAMILYDES"),
        "facility_name": record.get("FACILITYNAME"),
        "facility_description": record.get("FACILITYDES"),
    }


# --- public API ---

def push(call: ServiceCall) -> dict[str, Any]:
    """Create the call as a DOCUMENTS_Q document in Priority. Returns the
    normalized record (includes `priority_doc_number`)."""
    if settings.priority_use_mock:
        return {"priority_doc_number": f"PRI-{call.id:06d}", "priority_status": "Open"}

    if not is_configured():
        raise PriorityError("Priority is not configured (set PRIORITY_* in .env)")

    try:
        resp = httpx.post(
            _entity_url(), json=_map_out(call), headers=_headers(), auth=_auth(), timeout=30
        )
    except httpx.HTTPError as exc:
        raise PriorityError(f"Priority push failed: {exc}") from exc
    if resp.status_code >= 400:
        raise PriorityError(_odata_error(resp))
    return _map_in(resp.json())


def pull(since: str | None = None) -> list[dict[str, Any]]:
    """Import service calls from Priority. By default only open calls
    (ACTIVEFLAG eq 'Y'). Returns normalized records."""
    if settings.priority_use_mock:
        mock_records = [
            {"DOCNO": "PRI-900001", "DETAILS": "תקלת מזגן בקומה 3", "CDES": "TACT אחזקה",
             "BRANCHNAME": "תל אביב", "CALLSTATUSCODE": "In Progress", "ACTIVEFLAG": "Y"},
            {"DOCNO": "PRI-900002", "DETAILS": "בדיקת מערכת סולארית", "CDES": "TACT אנרגיה",
             "BRANCHNAME": "מודיעין", "CALLSTATUSCODE": "Open", "ACTIVEFLAG": "Y"},
        ]
        return [_map_in(r) for r in mock_records]

    if not is_configured():
        raise PriorityError("Priority is not configured (set PRIORITY_* in .env)")

    clauses = []
    if settings.priority_active_only:
        clauses.append("ACTIVEFLAG eq 'Y'")
    if since:
        clauses.append(f"STARTDATE ge {since}")

    params: dict = {"$select": _SELECT_FIELDS, "$top": "9999"}
    if clauses:
        params["$filter"] = " and ".join(clauses)
    return [_map_in(r) for r in _get_all_pages(_entity_url(), params)]


def pull_devices() -> list[dict[str, Any]]:
    """Import devices/equipment from Priority SERNUMBERS. Returns normalized dicts.
    Devices with STATUSNAME 'Reject' (disabled equipment) are skipped."""
    if settings.priority_use_mock:
        mock = [
            {"SERNUM": "DEV-1001", "PARTNAME": "מזגן עילי", "PARTDES": "מזגן 3 כ\"ס",
             "CDES": "TACT אחזקה", "BRANCHNAME": "001", "STATUSNAME": "Active"},
            {"SERNUM": "DEV-1002", "PARTNAME": "אינוורטר סולארי", "PARTDES": "5kW",
             "CDES": "TACT אנרגיה", "BRANCHNAME": "026", "STATUSNAME": "Active"},
        ]
        return [_map_device_in(r) for r in mock]

    if not is_configured():
        raise PriorityError("Priority is not configured (set PRIORITY_* in .env)")

    url = f"{settings.priority_base_url.rstrip('/')}/{_DEVICE_ENTITY}"
    params = {"$select": _DEVICE_SELECT, "$top": "9999"}
    records = _get_all_pages(url, params)
    return [_map_device_in(r) for r in records if r.get("STATUSNAME") != "Reject"]


def _get_all_pages(url: str, params: dict) -> list[dict[str, Any]]:
    """GET an OData collection, following @odata.nextLink until exhausted."""
    out: list[dict[str, Any]] = []
    next_params: dict | None = params
    cur: str | None = url
    pages = 0
    try:
        while cur and pages < 500:  # guard against runaway pagination
            resp = httpx.get(cur, params=next_params, headers=_headers(), auth=_auth(), timeout=60)
            if resp.status_code >= 400:
                raise PriorityError(_odata_error(resp))
            payload = resp.json()
            out.extend(payload.get("value", []))
            cur = payload.get("@odata.nextLink")
            next_params = None  # nextLink already carries the query
            pages += 1
    except httpx.HTTPError as exc:
        raise PriorityError(f"Priority request failed: {exc}") from exc
    return out


def test_connection() -> tuple[bool, str]:
    """Lightweight check used by the UI: fetch one record. Returns (ok, message)."""
    if settings.priority_use_mock:
        return True, "מצב הדמיה (mock) פעיל — לא מתבצע חיבור אמיתי"
    if not is_configured():
        return False, "חסרים פרטי חיבור (PRIORITY_* ב-.env)"
    try:
        resp = httpx.get(
            _entity_url(),
            params={"$select": "DOCNO", "$top": "1"},
            headers=_headers(),
            auth=_auth(),
            timeout=30,
        )
    except httpx.HTTPError as exc:
        return False, f"החיבור נכשל: {exc}"
    if resp.status_code >= 400:
        return False, f"החיבור נכשל · {_odata_error(resp)}"
    count = len(resp.json().get("value", []))
    return True, f"החיבור תקין · entity '{settings.priority_service_entity}' הגיב ({count} רשומה לדוגמה)"
