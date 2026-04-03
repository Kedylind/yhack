from typing import Any

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import select

from app.api.deps import DbDep
from app.db.tables import Provider
from app.models.api import ProviderListItem

router = APIRouter()


def _row_to_item(p: Provider) -> ProviderListItem:
    return ProviderListItem(
        id=p.npi,
        name=p.name,
        address=p.address,
        city=p.city,
        zip=p.zip,
        lat=p.lat,
        lng=p.lng,
        phone=p.phone,
        specialties=list(p.specialties or []),
        source=p.source,
        hospital=p.hospital,
    )


def _parse_bbox(bbox: str) -> tuple[float, float, float, float]:
    parts = [float(x.strip()) for x in bbox.split(",")]
    if len(parts) != 4:
        raise ValueError("bbox must have four numbers")
    return parts[0], parts[1], parts[2], parts[3]


@router.get("", response_model=list[ProviderListItem])
def list_providers(
    db: DbDep,
    bbox: str | None = Query(None, description="minLng,minLat,maxLng,maxLat"),
    zip: str | None = Query(None),
    specialty: str | None = Query(None),
    in_network_only: bool | None = Query(None),
    hospital: str | None = Query(None),
) -> list[ProviderListItem]:
    _ = in_network_only
    stmt = select(Provider).where(Provider.specialties.contains(["Gastroenterology"]))
    if hospital:
        stmt = stmt.where(Provider.hospital == hospital.strip())
    if zip:
        stmt = stmt.where(Provider.zip == zip.strip())
    if specialty and specialty.strip() and specialty.lower() not in ("all", "gastroenterology"):
        stmt = stmt.where(Provider.specialties.contains([specialty.strip()]))

    rows = list(db.scalars(stmt).all())

    if bbox:
        try:
            min_lng, min_lat, max_lng, max_lat = _parse_bbox(bbox)
        except ValueError as e:
            raise HTTPException(
                status_code=400, detail="bbox must be minLng,minLat,maxLng,maxLat"
            ) from e
        filtered: list[Provider] = []
        for p in rows:
            lng, lat = p.lng, p.lat
            if min_lng <= lng <= max_lng and min_lat <= lat <= max_lat:
                filtered.append(p)
        rows = filtered

    return [_row_to_item(p) for p in rows]


@router.get("/{provider_id}", response_model=ProviderListItem)
def get_provider(provider_id: str, db: DbDep) -> ProviderListItem:
    p = db.get(Provider, provider_id)
    if not p:
        raise HTTPException(status_code=404, detail="provider not found")
    return _row_to_item(p)
