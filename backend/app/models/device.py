from datetime import datetime

from sqlalchemy import String, DateTime, JSON, Index
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


class Device(Base):
    """A device/equipment item imported from Priority's SERNUMBERS entity.

    A service call is for a device; calls link to a device by serial number
    (ServiceCall.device_sernum == Device.sernum).
    """

    __tablename__ = "devices"
    __table_args__ = (
        Index("ix_devices_customer", "customer_name"),
        Index("ix_devices_branch", "branch"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    sernum: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)  # SERNUM — מספר מכשיר
    sernum_suffix: Mapped[str | None] = mapped_column(String(120))    # SERNUMSUFFIX — סיומת מכשיר
    part_name: Mapped[str | None] = mapped_column(String(160))        # PARTNAME — מק"ט
    part_description: Mapped[str | None] = mapped_column(String(255))  # PARTDES — תיאור המכשיר
    customer_code: Mapped[str | None] = mapped_column(String(60))     # CUSTNAME
    customer_name: Mapped[str | None] = mapped_column(String(255))    # CDES — שם לקוח
    contact_name: Mapped[str | None] = mapped_column(String(255))     # NAME — איש קשר
    branch: Mapped[str | None] = mapped_column(String(120))           # (not on SERNUMBERS)
    phone: Mapped[str | None] = mapped_column(String(60))             # PHONENUM — טלפון
    site_code: Mapped[str | None] = mapped_column(String(60))         # DCODE — אתר (מספר)
    site_description: Mapped[str | None] = mapped_column(String(255))  # DCODEDES — אתר (תיאור)
    service_contract: Mapped[str | None] = mapped_column(String(80))  # CONTDOCNO — חוזה שירות
    zone_code: Mapped[str | None] = mapped_column(String(60))         # ZONECODE — קוד איזור
    zone_description: Mapped[str | None] = mapped_column(String(120))  # ZONEDES — תיאור איזור
    install_date: Mapped[str | None] = mapped_column(String(40))      # INSTDATE — תאריך התקנה
    status: Mapped[str | None] = mapped_column(String(80))            # STATUSNAME
    family_name: Mapped[str | None] = mapped_column(String(120))      # FAMILYNAME — משפחת מוצר
    family_description: Mapped[str | None] = mapped_column(String(255))  # FAMILYDES — תיאור משפחת מוצר
    facility_name: Mapped[str | None] = mapped_column(String(120))    # FACILITYNAME
    facility_description: Mapped[str | None] = mapped_column(String(255))  # FACILITYDES

    raw_payload: Mapped[dict | None] = mapped_column(JSON)
    last_synced_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
