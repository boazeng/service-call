"""Devices (equipment) imported from Priority SERNUMBERS."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from ..deps import get_current_user, get_db
from ..models import Device, User
from ..schemas.device import DeviceList

router = APIRouter(prefix="/api/devices", tags=["devices"])


@router.get("", response_model=DeviceList)
def list_devices(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
    search: str | None = None,
    customer: str | None = None,
    page: int = 1,
    page_size: int = 50,
):
    conditions = []
    if customer:
        conditions.append(Device.customer_name == customer)
    if search:
        like = f"%{search.strip()}%"
        conditions.append(
            or_(
                Device.sernum.ilike(like),
                Device.part_name.ilike(like),
                Device.part_description.ilike(like),
                Device.customer_name.ilike(like),
                Device.contact_name.ilike(like),
                Device.site_description.ilike(like),
                Device.service_contract.ilike(like),
                Device.family_description.ilike(like),
            )
        )

    total = db.scalar(select(func.count()).select_from(Device).where(*conditions)) or 0
    page = max(1, page)
    page_size = max(1, min(page_size, 200))
    items = list(
        db.scalars(
            select(Device)
            .where(*conditions)
            .order_by(Device.customer_name, Device.sernum)
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    )
    return DeviceList(items=items, total=total, page=page, page_size=page_size)
