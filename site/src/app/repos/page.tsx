// export default function ReposPage() {
//   return (
//     <main>
//       <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>Contact</h1>
//       <p style={{ lineHeight: 1.6 }}>repos</p>
//       <table className="header">
//         <tr>
//           <td colSpan={2} rowSpan={2} className="width-auto">
//             <h1 className="title">The Monospace Web</h1>
//             <span className="subtitle">A minimalist design exploration</span>
//           </td>
//           <th>Version</th>
//           <td className="width-min">v0.1.5</td>
//         </tr>
//         <tr>
//           <th>Updated</th>
//           <td className="width-min">
//             <time style={{ whiteSpace: "pre" }}>2025-01-25</time>
//           </td>
//         </tr>
//         <tr>
//           <th className="width-min">Author</th>
//           <td className="width-auto">
//             <a href="https://wickstrom.tech">
//               <cite>Oskar Wickström</cite>
//             </a>
//           </td>
//           <th className="width-min">License</th>
//           <td>MIT</td>
//         </tr>
//       </table>
//     </main>
//   );
// }

"use client";

import React, { useState, useEffect } from "react";

const base_url = "https://g7iag6pkj2.execute-api.us-east-2.amazonaws.com/prod/";

interface Repo {
  pk: string;
  sk: string;
  conn: object;
  fs_path: string;
  id: string;
  name: string;
  priority: number;
  display_epsg: number;
  storage_epsg: number;
  suite: string;
  type: string;
  created_at: string;
  updated_at: string;
}

function ItemList() {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRepos = async () => {
      try {
        const response = await fetch(base_url + "repos", {
          headers: {
            Authorization: "valid_thing",
          },
        });

        if (!response.ok) throw new Error("Failed to fetch");

        const res = await response.json();
        if (res["data"]) {
          setRepos(res["data"]);
        } else {
          console.log(res);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchRepos();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  console.log(repos);

  return (
    <ul>
      {repos.map((repo) => (
        <li key={repo.sk}>{repo.fs_path}</li>
      ))}
    </ul>
  );
}

export default ItemList;

/*
curl -X OPTIONS -H "Origin: http://localhost:3000" \
-H "Access-Control-Request-Headers: token" \
-v https://g7iag6pkj2.execute-api.us-east-2.amazonaws.com/prod/repos

curl -H "Origin: http://localhost:3000" \
-v https://g7iag6pkj2.execute-api.us-east-2.amazonaws.com/prod/repos

curl -H "Authorization: Bearer your-token" \
     -H "Origin: http://localhost:3000" \
     -v https://g7iag6pkj2.execute-api.us-east-2.amazonaws.com/prod/repos

curl -s -D - -o /dev/null -H "Origin: http://localhost:3000" \
-H "Authorization: Bearer your-token" \
https://g7iag6pkj2.execute-api.us-east-2.amazonaws.com/prod/repos


aws apigateway get-rest-api --rest-api-id g7iag6pkj2
*/
