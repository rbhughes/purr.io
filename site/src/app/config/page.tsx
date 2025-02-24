"use client";

import React from "react";
//import { getRepos } from "../_utils/apiHelpers";
import { getRepos } from "../_api/dyna_client";

import { Repo } from "@/types/repo";

function RepoList() {
  const [repos, setRepos] = React.useState<Repo[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchRepos = async () => {
      try {
        const fetchedRepos = await getRepos();

        console.log(fetchedRepos);
        setRepos(fetchedRepos);
        setLoading(false);
      } catch (err) {
        setError("Failed to fetch repos");
        console.log(err);
        setLoading(false);
      }
    };

    fetchRepos();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

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
    </div>
  );
}

export default function Config() {
  return (
    <div className="font-base">
      <h1 className="mb-8 text-2xl font-heading sm:text-4xl">Configuration</h1>

      <div className="mb-10 text-base sm:text-lg">
        <p>
          Lorem ipsum dolor sit amet consectetur, adipisicing elit. Est
          consequatur, harum pariatur provident rerum placeat magni voluptas
          consectetur in exercitationem nobis aut, molestiae iure possimus
          aspernatur nesciunt laudantium ab atque.
        </p>
      </div>
      <RepoList />
    </div>
  );
}
