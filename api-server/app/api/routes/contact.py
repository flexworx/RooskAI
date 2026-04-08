"""Contact form endpoint — receives demo requests and persists them."""

import logging
from datetime import datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.models import ContactRequest as ContactRequestModel

logger = logging.getLogger(__name__)

router = APIRouter(tags=["contact"])


class ContactRequest(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    email: EmailStr
    company: str = Field(min_length=1, max_length=200)
    phone: str | None = Field(default=None, max_length=30)
    interest: str = Field(min_length=1, max_length=100)
    infra_size: str | None = Field(default=None, max_length=50)
    message: str | None = Field(default=None, max_length=2000)


class ContactResponse(BaseModel):
    status: str = "received"
    message: str = "Your request has been submitted. We will respond within one business day."
    reference_id: str


@router.post("/contact", response_model=ContactResponse)
async def submit_contact(req: ContactRequest, db: AsyncSession = Depends(get_db)):
    """Process a demo request / contact form submission and persist to database."""
    ref_id = f"BYR-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"

    record = ContactRequestModel(
        reference_id=ref_id,
        name=req.name,
        email=req.email,
        company=req.company,
        phone=req.phone,
        interest=req.interest,
        infra_size=req.infra_size,
        message=req.message,
        status="new",
    )
    db.add(record)
    await db.commit()

    logger.info(
        "Contact form persisted ref=%s name=%s company=%s interest=%s",
        ref_id, req.name, req.company, req.interest,
    )
    return ContactResponse(reference_id=ref_id)
