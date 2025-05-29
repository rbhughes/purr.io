"use client";

import React, { useId } from "react";

import { getRepos } from "../_api/dyna_client";

import { Repo } from "@/ts/repo";

export default function RepoList({ repos }) {
  //const [repos, setRepos] = React.useState<Repo[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const id = useId();

  // React.useEffect(() => {
  //   const fetchRepos = async () => {
  //     try {
  //       const fetchedRepos = await getRepos();

  //       console.log(fetchedRepos);
  //       setRepos(fetchedRepos);
  //       setLoading(false);
  //     } catch (err) {
  //       setError("Failed to fetch repos");
  //       console.log(err);
  //       setLoading(false);
  //     }
  //   };

  //   fetchRepos();
  // }, []);

  console.log("*&&&&");
  console.log(repos);
  console.log("*&&&&");

  //if (loading) return <div>Loading...</div>;
  //if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1>Repositories</h1>
      <ul>
        {repos.map((repo) => (
          <li key={repo.id}>
            <h2>{repo.name}</h2>
            <p>{repo.fs_path}</p>
          </li>
        ))}
      </ul>

      <h1>ID</h1>
      <p>{id}</p>
      <p>{process.env.NEXT_PUBLIC_UNIQUE_ID}</p>
      {/* <AsyncJobButton /> */}
    </div>
  );
}
