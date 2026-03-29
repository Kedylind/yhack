from typing import Any

from fastapi import APIRouter, HTTPException, Query

from app.api.deps import DbDep
from app.models.api import ProviderListItem

router = APIRouter()


def _doc_to_item(doc: dict[str, Any]) -> ProviderListItem:
    lng, lat = doc["location"]["coordinates"]
    return ProviderListItem(
        id=doc["npi"],
        name=doc["name"],
        address=doc["address"],
        city=doc["city"],
        zip=doc["zip"],
        lat=lat,
        lng=lng,
        phone=doc.get("phone"),
        specialties=doc.get("specialties", []),
        source=doc.get("source"),
        hospital=doc.get("hospital"),
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
    q: dict[str, Any] = {"specialties": "Gastroenterology"}
    if hospital:
        q["hospital"] = hospital.strip()
    if zip:
        q["zip"] = zip.strip()
    if specialty and specialty.strip() and specialty.lower() not in ("all", "gastroenterology"):
        q["specialties"] = specialty.strip()

    docs = list(db["providers"].find(q))

    if bbox:
        try:
            min_lng, min_lat, max_lng, max_lat = _parse_bbox(bbox)
        except ValueError as e:
            raise HTTPException(
                status_code=400, detail="bbox must be minLng,minLat,maxLng,maxLat"
            ) from e
        filtered: list[dict[str, Any]] = []
        for d in docs:
            lng, lat = d["location"]["coordinates"]
            if min_lng <= lng <= max_lng and min_lat <= lat <= max_lat:
                filtered.append(d)
        docs = filtered

    return [_doc_to_item(d) for d in docs]


@router.get("/{provider_id}", response_model=ProviderListItem)
def get_provider(provider_id: str, db: DbDep) -> ProviderListItem:
    doc = db["providers"].find_one({"npi": provider_id})
    if not doc:
        raise HTTPException(status_code=404, detail="provider not found")
    return _doc_to_item(doc)
