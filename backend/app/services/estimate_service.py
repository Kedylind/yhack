"""Assemble estimate responses from Mongo price + provider data."""

from __future__ import annotations

from collections import defaultdict
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
from app.services.payer_mapping import insurance_carrier_to_payer
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

    # Find providers matching the specialty from intake (defaults to all if unspecified)
    specialty = merged.get("specialty") or merged.get("care_focus") or "Gastroenterology"
    provider_docs = list(db["providers"].find({"specialties": {"$in": [specialty]}}))

    providers_out = [_provider_to_api_dict(p) for p in provider_docs]
    estimates: list[ProviderEstimate] = []

    ded_cents = merged.get("deductible_cents")
    oop_max_c = merged.get("oop_max_cents")
    coinsurance = merged.get("coinsurance_pct")
    copay = merged.get("copay_cents")
    ded_unknown = deductible_remaining_unknown_from_intake(merged)

    wanted_payer = insurance_carrier_to_payer(merged.get("insurance_carrier"))

    def _oop_tuple(amin: int, amax: int) -> tuple[int, int, list[str]]:
        o_min, o_max, oop_asm = compute_oop_range_cents(
            amin,
            amax,
            int(ded_cents) if ded_cents is not None else None,
            int(oop_max_c) if oop_max_c is not None else None,
            int(coinsurance) if coinsurance is not None else None,
            int(copay) if copay is not None else None,
            ded_unknown,
        )
        return o_min, o_max, list(oop_asm)

    # Batch price lookup: one query instead of N round-trips
    all_npis = [p["npi"] for p in provider_docs]
    batch_price_docs = list(
        db["prices"].find({"provider_id": {"$in": all_npis}, "bundle_id": bundle_id})
    )
    prices_by_npi: dict[str, list[dict[str, Any]]] = {}
    for pd in batch_price_docs:
        prices_by_npi.setdefault(pd["provider_id"], []).append(pd)

    for p in provider_docs:
        npi = p["npi"]
        all_price_docs = prices_by_npi.get(npi, [])

        selected_docs = [x for x in all_price_docs if x.get("payer") == wanted_payer]
        if not selected_docs:
            selected_docs = [x for x in all_price_docs if x.get("payer") == "BCBS_MA"]
        if not selected_docs and all_price_docs:
            first_payer = sorted({str(x.get("payer", "")) for x in all_price_docs})[0]
            selected_docs = [x for x in all_price_docs if x.get("payer") == first_payer]

        payer_used = selected_docs[0].get("payer") if selected_docs else wanted_payer

        amin, amax = min_max_allowed_for_provider_prices(selected_docs)
        src = pick_primary_source(selected_docs) if selected_docs else "none"
        conf = avg_confidence(selected_docs) if selected_docs else 0.0

        prov_items: list[ProvenanceItem] = [
            ProvenanceItem(
                field="allowed_amount_max",
                source=src,
                confidence=conf,
                kind="FACT" if selected_docs else "ASSUMED",
            )
        ]
        if not selected_docs:
            prov_items.append(
                ProvenanceItem(
                    field="allowed_amount_range",
                    source="no_price_row",
                    confidence=0.0,
                    kind="ASSUMED",
                )
            )

        oop_min, oop_max_val, oop_assumptions = _oop_tuple(amin, amax)
        assumptions = list(oop_assumptions)
        if not selected_docs:
            assumptions.append("No price row for this payer/bundle — demo placeholder (ASSUMED).")

        other_insurers: OopRange | None = None
        by_payer: dict[str, list[dict[str, Any]]] = defaultdict(list)
        for row in all_price_docs:
            py = str(row.get("payer", ""))
            if py and py != payer_used:
                by_payer[py].append(row)

        other_mins: list[int] = []
        other_maxs: list[int] = []
        for docs in by_payer.values():
            a1, a2 = min_max_allowed_for_provider_prices(docs)
            om1, om2, _ = _oop_tuple(a1, a2)
            other_mins.append(om1)
            other_maxs.append(om2)
        if other_mins:
            other_insurers = OopRange(min=min(other_mins), max=max(other_maxs))

        estimates.append(
            ProviderEstimate(
                provider_id=str(npi),
                allowed_amount_range=AllowedAmountRange(min=amin, max=amax),
                oop_range=OopRange(min=oop_min, max=oop_max_val),
                provenance=prov_items,
                assumptions=assumptions,
                other_insurers_oop_range=other_insurers,
                payer_used=str(payer_used) if payer_used else None,
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
