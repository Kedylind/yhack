"""Assemble estimate responses from Mongo price + provider data."""

from __future__ import annotations

from typing import Any

from pymongo.database import Database

from app.models.api import (
    AllowedAmountRange,
    EstimateResponse,
    ProviderEstimate,
    ProvenanceItem,
    OopRange,
)
from app.services.intake import missing_required_fields, normalize_intake
from app.services.oop import compute_oop_range_cents, deductible_remaining_unknown_from_intake
from app.services.pricing import (
    avg_confidence,
    min_max_allowed_for_provider_prices,
    pick_primary_source,
)
from app.services.scenario_to_bundle import infer_scenario_id, scenario_to_bundle_id


def _provider_to_api_dict(doc: dict[str, Any]) -> dict[str, Any]:
    lng, lat = doc["location"]["coordinates"]
    return {
        "id": doc["npi"],
        "name": doc["name"],
        "address": doc["address"],
        "city": doc["city"],
        "zip": doc["zip"],
        "lat": lat,
        "lng": lng,
        "phone": doc.get("phone"),
        "specialties": doc.get("specialties", []),
        "source": doc.get("source"),
    }


def build_estimate_response(
    db: Database,
    intake_raw: dict[str, Any],
    confirmed: dict[str, Any] | None,
    explicit_bundle_id: str | None,
    explicit_scenario_id: str | None,
) -> EstimateResponse:
    intake = normalize_intake(intake_raw)
    merged = {**intake, **(confirmed or {})}
    scenario_id = explicit_scenario_id or infer_scenario_id(intake, confirmed)
    bundle_id = explicit_bundle_id or scenario_to_bundle_id(scenario_id)

    # City-wide GI providers for comparison; ZIP is logistics only for v1 demo
    provider_docs = list(db["providers"].find({"specialties": {"$in": ["Gastroenterology"]}}))

    providers_out = [_provider_to_api_dict(p) for p in provider_docs]
    estimates: list[ProviderEstimate] = []

    ded_cents = merged.get("deductible_cents")
    oop_max = merged.get("oop_max_cents")
    coinsurance = merged.get("coinsurance_pct")
    copay = merged.get("copay_cents")
    ded_unknown = deductible_remaining_unknown_from_intake(merged)

    # Batch price lookup: one query instead of N round-trips
    all_npis = [p["npi"] for p in provider_docs]
    all_price_docs = list(
        db["prices"].find({"provider_id": {"$in": all_npis}, "bundle_id": bundle_id})
    )
    prices_by_npi: dict[str, list[dict[str, Any]]] = {}
    for pd in all_price_docs:
        prices_by_npi.setdefault(pd["provider_id"], []).append(pd)

    for p in provider_docs:
        npi = p["npi"]
        price_docs = prices_by_npi.get(npi, [])
        amin, amax = min_max_allowed_for_provider_prices(price_docs)
        src = pick_primary_source(price_docs) if price_docs else "none"
        conf = avg_confidence(price_docs) if price_docs else 0.0

        prov_items: list[ProvenanceItem] = [
            ProvenanceItem(
                field="allowed_amount_max",
                source=src,
                confidence=conf,
                kind="FACT" if price_docs else "ASSUMED",
            )
        ]
        if not price_docs:
            prov_items.append(
                ProvenanceItem(
                    field="allowed_amount_range",
                    source="no_price_row",
                    confidence=0.0,
                    kind="ASSUMED",
                )
            )

        oop_min, oop_max_val, oop_assumptions = compute_oop_range_cents(
            amin,
            amax,
            int(ded_cents) if ded_cents is not None else None,
            int(oop_max) if oop_max is not None else None,
            int(coinsurance) if coinsurance is not None else None,
            int(copay) if copay is not None else None,
            ded_unknown,
        )
        assumptions = list(oop_assumptions)
        if not price_docs:
            assumptions.append("No BCBS MA price row for this bundle — demo placeholder (ASSUMED).")

        estimates.append(
            ProviderEstimate(
                provider_id=npi,
                allowed_amount_range=AllowedAmountRange(min=amin, max=amax),
                oop_range=OopRange(min=oop_min, max=oop_max_val),
                provenance=prov_items,
                assumptions=assumptions,
            )
        )

    return EstimateResponse(
        bundle_id=bundle_id,
        scenario_id=scenario_id,
        providers=providers_out,
        estimates=estimates,
    )


def intake_ready_for_estimate(intake_raw: dict[str, Any], confirmed: dict[str, Any] | None) -> bool:
    merged = normalize_intake({**intake_raw, **(confirmed or {})})
    return len(missing_required_fields(merged)) == 0
