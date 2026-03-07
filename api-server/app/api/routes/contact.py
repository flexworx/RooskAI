"""Contact form endpoint — receives demo requests."""

import logging
from datetime import datetime

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr, Field

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
async def submit_contact(req: ContactRequest):
    """Process a demo request / contact form submission."""
    ref_id = f"BYR-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
    logger.info(
        "Contact form submission ref=%s name=%s company=%s interest=%s",
        ref_id,
        req.name,
        req.company,
        req.interest,
    )
    # TODO: Persist to database, send notification email
    return ContactResponse(reference_id=ref_id)
