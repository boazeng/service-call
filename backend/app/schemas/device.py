from datetime import datetime

from pydantic import BaseModel, ConfigDict


class DeviceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    sernum: str
    sernum_suffix: str | None
    part_name: str | None
    part_description: str | None
    customer_code: str | None
    customer_name: str | None
    contact_name: str | None
    branch: str | None
    phone: str | None
    site_code: str | None
    site_description: str | None
    service_contract: str | None
    zone_code: str | None
    zone_description: str | None
    install_date: str | None
    status: str | None
    family_name: str | None
    family_description: str | None
    facility_name: str | None
    facility_description: str | None
    last_synced_at: datetime | None
    created_at: datetime


class DeviceList(BaseModel):
    items: list[DeviceOut]
    total: int
    page: int
    page_size: int
