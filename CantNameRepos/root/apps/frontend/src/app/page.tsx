import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold">Acne Care Navigation Assistant</h1>
      <p className="mt-4 text-gray-700">
        Compare common care options and rough costs for non-urgent adult acne
        concerns.
      </p>

      <div className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        For adult non-urgent acne concerns only. This MVP does not support
        emergency symptoms, pregnancy-related guidance, or pediatric concerns.
      </div>

      <Link
        href="/intake"
        className="mt-8 inline-block rounded-md bg-black px-5 py-3 text-white"
      >
        Start intake
      </Link>
    </main>
  );
}
