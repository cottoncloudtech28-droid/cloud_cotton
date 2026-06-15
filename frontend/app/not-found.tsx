import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <div className="text-8xl">🌸</div>
      <h1 className="text-4xl font-bold">404 — Page not found</h1>
      <p className="text-muted-foreground">Oops! This page floated away into the clouds.</p>
      <Link href="/" className="text-primary hover:underline font-medium">← Back home</Link>
    </div>
  );
}
