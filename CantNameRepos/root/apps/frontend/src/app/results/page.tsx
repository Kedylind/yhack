"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { evaluateAcneCase } from "@/lib/api/evaluate";
import { getProviders } from "@/lib/api/providers";
import type {
  EvaluationResponse,
  IntakeRequest,
  Recommendation,
} from "@/lib/types/api";

type ProviderMap = Record<string, Awaited<ReturnType<typeof getProviders>>["providers"]>;

export default function ResultsPage() {
  const searchParams = useSearchParams();
  const payloadParam = searchParams.get("payload");

  const intake = useMemo<IntakeRequest | null>(() => {
    if (!payloadParam) return null;
    try {
      return JSON.parse(decodeURIComponent(payloadParam)) as IntakeRequest;
    } catch {
      return null;
    }
  }, [payloadParam]);

  const [result, setResult] = useState<EvaluationResponse | null>(null);
  const [providers, setProviders] = useState<ProviderMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function run() {
      if (!intake) {
        setError("Missing or invalid intake payload.");
        setLoading(false);
        return;
      }

      try {
        const evaluation = await evaluateAcneCase(intake);
        setResult(evaluation);

        if (
          evaluation.supported &&
          !evaluation.red_flag.triggered &&
          evaluation.recommendations.length > 0
        ) {
          const providerEntries = await Promise.all(
            evaluation.recommendations.map(async (rec) => {
              const response = await getProviders(intake.plan_id, rec.care_setting);
              return [rec.care_setting, response.providers] as const;
            })
          );

          setProviders(Object.fromEntries(providerEntries));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    run();
  }, [intake]);

  if (loading) {
    return <main className="mx-auto max-w-3xl px-6 py-10">Loading results...</main>;
  }

  if (error) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10 text-red-700">
        Error: {error}
      </main>
    );
  }

  if (!result) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">No result available.</main>
    );
  }

  if (!result.supported) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-2xl font-bold">Out of scope</h1>
        <p className="mt-4">{result.red_flag.message}</p>
      </main>
    );
  }

  if (result.red_flag.triggered) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-2xl font-bold">Urgent evaluation recommended</h1>
        <p className="mt-4 text-red-700">{result.red_flag.message}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-2xl font-bold">Recommended care options</h1>

      <div className="mt-4 rounded-md border bg-gray-50 p-4">
        <h2 className="font-semibold">Assumptions</h2>
        <ul className="mt-2 list-disc pl-5 text-sm text-gray-700">
          {result.assumptions.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <div className="mt-8 space-y-6">
        {result.recommendations.map((rec) => (
          <RecommendationCard
            key={rec.care_setting}
            recommendation={rec}
            providers={providers[rec.care_setting] ?? []}
          />
        ))}
      </div>
    </main>
  );
}

function RecommendationCard({
  recommendation,
  providers,
}: {
  recommendation: Recommendation;
  providers: Awaited<ReturnType<typeof getProviders>>["providers"];
}) {
  return (
    <section className="rounded-lg border p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold capitalize">
          {recommendation.care_setting.replaceAll("_", " ")}
        </h2>
        <span className="rounded bg-black px-3 py-1 text-sm text-white">
          Rank #{recommendation.rank}
        </span>
      </div>

      <p className="mt-3 text-gray-700">{recommendation.rationale}</p>

      <div className="mt-5 space-y-4">
        {recommendation.bundles.map((bundle) => (
          <div key={bundle.id} className="rounded-md border bg-gray-50 p-4">
            <h3 className="font-semibold">{bundle.name}</h3>
            <p className="mt-1 text-sm text-gray-700">{bundle.description}</p>

            <div className="mt-3 grid grid-cols-1 gap-2 text-sm md:grid-cols-3">
              <div className="rounded border bg-white p-3">
                <div className="font-medium">Deductible met</div>
                <div>${bundle.scenario_costs.deductible_met}</div>
              </div>
              <div className="rounded border bg-white p-3">
                <div className="font-medium">Partially met</div>
                <div>${bundle.scenario_costs.deductible_partial}</div>
              </div>
              <div className="rounded border bg-white p-3">
                <div className="font-medium">Not met</div>
                <div>${bundle.scenario_costs.deductible_not_met}</div>
              </div>
            </div>

            {bundle.notes.length > 0 && (
              <ul className="mt-3 list-disc pl-5 text-sm text-gray-700">
                {bundle.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      <div className="mt-5">
        <h3 className="font-semibold">Sample in-network providers</h3>
        {providers.length === 0 ? (
          <p className="mt-2 text-sm text-gray-600">No providers found.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {providers.map((provider) => (
              <li key={provider.id} className="rounded border p-3">
                <div className="font-medium">{provider.name}</div>
                <div className="text-sm text-gray-700">{provider.specialty}</div>
                <div className="text-sm text-gray-700">
                  {provider.address}, {provider.city}, {provider.state} {provider.zip_code}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
