export default function ContactPage() {
  return (
    <main>
      <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>Contact</h1>
      <p style={{ lineHeight: 1.6 }}>321 contact</p>
      <table className="header">
        <tr>
          <td colSpan={2} rowSpan={2} className="width-auto">
            <h1 className="title">The Monospace Web</h1>
            <span className="subtitle">A minimalist design exploration</span>
          </td>
          <th>Version</th>
          <td className="width-min">v0.1.5</td>
        </tr>
        <tr>
          <th>Updated</th>
          <td className="width-min">
            <time style={{ whiteSpace: "pre" }}>2025-01-25</time>
          </td>
        </tr>
        <tr>
          <th className="width-min">Author</th>
          <td className="width-auto">
            <a href="https://wickstrom.tech">
              <cite>Oskar Wickström</cite>
            </a>
          </td>
          <th className="width-min">License</th>
          <td>MIT</td>
        </tr>
      </table>
    </main>
  );
}
