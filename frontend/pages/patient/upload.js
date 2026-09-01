import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { UploadDropzone } from "@/components/patient/UploadDropzone";
import { LoadingReading } from "@/components/shared/LoadingReading";
import { ErrorState } from "@/components/shared/ErrorState";
import { Button } from "@/components/ui/button";
import { analyzePrescription, ApiError } from "@/lib/api";
import { loadAllergies } from "@/lib/allergies";

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState(null);
  const [diagnosis, setDiagnosis] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [allergies, setAllergies] = useState([]);

  useEffect(() => {
    setAllergies(loadAllergies());
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const record = await analyzePrescription({ imageFile: file, diagnosis, source: "patient", allergies });
      router.push(`/patient/results/${record.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  if (loading) return <LoadingReading />;

  return (
    <div className="flex flex-col gap-6 py-4">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">Upload your prescription</h1>
        <p className="mt-1 text-sm text-ink-muted">We&apos;ll read it and explain it in plain language.</p>
      </div>

      {error && <ErrorState message={error} onRetry={() => setError(null)} />}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <UploadDropzone file={file} onFileChange={setFile} />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="diagnosis" className="text-sm font-medium text-ink">
            What did your doctor say this is for? <span className="font-normal text-ink-faint">(optional)</span>
          </label>
          <textarea
            id="diagnosis"
            placeholder="e.g. &ldquo;type 2 diabetes&rdquo; or &ldquo;high blood pressure&rdquo;"
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
            rows={3}
            className="rounded-DEFAULT border border-border bg-surface-raised px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
          <p className="text-xs text-ink-faint">This helps us double-check the reading matches what you&apos;re being treated for.</p>
        </div>

        <div className="flex items-center gap-2 rounded-DEFAULT bg-surface-sunken px-3.5 py-2.5 text-xs text-ink-muted">
          <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-brand" />
          {allergies.length > 0 ? (
            <span>Checking against {allergies.length} saved {allergies.length === 1 ? "allergy" : "allergies"}.</span>
          ) : (
            <span>
              No allergies on file —{" "}
              <Link href="/patient/allergies" className="font-medium text-brand hover:underline">
                add them
              </Link>{" "}
              so we can cross-check this.
            </span>
          )}
        </div>

        <Button type="submit" size="lg" disabled={!file}>
          Read my prescription
        </Button>
      </form>
    </div>
  );
}
