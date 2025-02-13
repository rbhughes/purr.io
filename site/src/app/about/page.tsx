// app/about/page.tsx
//import Link from 'next/link'

export default function AboutPage() {
  return (
    <main>
      <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>About Us</h1>
      <p style={{ lineHeight: 1.6 }}>
        Learn more about our company and mission.
      </p>
      <p>
        Lovely. We can hide stuff in the <code>&lt;details</code>&gt; element:
      </p>
      <details>
        <summary>A short summary of the contents</summary>
        <p>Hidden gems.</p>
      </details>
    </main>
  );
}
