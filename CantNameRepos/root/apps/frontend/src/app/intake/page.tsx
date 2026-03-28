"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { IntakeRequest } from "@/lib/types/api";

export default function IntakePage() {
  const router = useRouter();

  const [form, setForm] = useState<IntakeRequest>({
    zip_code: "10001",
    age: 25,
    plan_id: "acme_hmo_basic",
    category: "acne",
    answers: {
      severity: "mild",
      duration_weeks: 4,
      first_time_visit: true,
      wants_cosmetic_treatment: false,
      facial_swelling: false,
      fever: false,
      rapidly_worsening: false,
      pregnant: false,
    },
  });

  function updateAnswer<K extends keyof IntakeRequest["answers"]>(
    key: K,
    value: IntakeRequest["answers"][K]
  ) {
    setForm((prev) => ({
      ...prev,
      answers: {
        ...prev.answers,
        [key]: value,
      },
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const encoded = encodeURIComponent(JSON.stringify(form));
    router.push(`/results?payload=${encoded}`);
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-bold">Intake</h1>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <div>
          <label className="mb-2 block font-medium">ZIP code</label>
          <input
            className="w-full rounded border px-3 py-2"
            value={form.zip_code}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, zip_code: e.target.value }))
            }
          />
        </div>

        <div>
          <label className="mb-2 block font-medium">Age</label>
          <input
            type="number"
            className="w-full rounded border px-3 py-2"
            value={form.age}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, age: Number(e.target.value) }))
            }
          />
        </div>

        <div>
          <label className="mb-2 block font-medium">Insurance plan</label>
          <select
            className="w-full rounded border px-3 py-2"
            value={form.plan_id}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, plan_id: e.target.value }))
            }
          >
            <option value="acme_hmo_basic">Acme HMO Basic</option>
            <option value="acme_ppo_plus">Acme PPO Plus</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block font-medium">Acne severity</label>
          <select
            className="w-full rounded border px-3 py-2"
            value={form.answers.severity}
            onChange={(e) =>
              updateAnswer(
                "severity",
                e.target.value as IntakeRequest["answers"]["severity"]
              )
            }
          >
            <option value="mild">Mild</option>
            <option value="moderate">Moderate</option>
            <option value="severe">Severe</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block font-medium">Duration (weeks)</label>
          <input
            type="number"
            className="w-full rounded border px-3 py-2"
            value={form.answers.duration_weeks}
            onChange={(e) =>
              updateAnswer("duration_weeks", Number(e.target.value))
            }
          />
        </div>

        <Checkbox
          label="First time seeking care for this issue"
          checked={form.answers.first_time_visit}
          onChange={(value) => updateAnswer("first_time_visit", value)}
        />

        <Checkbox
          label="Main goal is cosmetic treatment / scarring"
          checked={form.answers.wants_cosmetic_treatment}
          onChange={(value) => updateAnswer("wants_cosmetic_treatment", value)}
        />

        <Checkbox
          label="Facial swelling present"
          checked={form.answers.facial_swelling}
          onChange={(value) => updateAnswer("facial_swelling", value)}
        />

        <Checkbox
          label="Fever present"
          checked={form.answers.fever}
          onChange={(value) => updateAnswer("fever", value)}
        />

        <Checkbox
          label="Symptoms rapidly worsening"
          checked={form.answers.rapidly_worsening}
          onChange={(value) => updateAnswer("rapidly_worsening", value)}
        />

        <Checkbox
          label="Currently pregnant"
          checked={form.answers.pregnant}
          onChange={(value) => updateAnswer("pregnant", value)}
        />

        <button
          type="submit"
          className="rounded-md bg-black px-5 py-3 text-white"
        >
          See results
        </button>
      </form>
    </main>
  );
}

function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}
