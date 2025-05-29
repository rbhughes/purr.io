"use client";
import React, { useState, useEffect } from "react";
import RepoForm from "./repo-form";
import RepoList from "./repo-list";

import { Repo } from "@/ts/repo";
import { getRepos } from "../_api/dyna_client";

import {
  Card,
  CardFooter,
  CardHeader,
  CardContent,
  CardTitle,
} from "@/components/ui/card";

export default function Control() {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Fetch repos initially
  useEffect(() => {
    // async function fetchRepos() {
    //   const fetchedRepos = await getRepos();
    //   setRepos(fetchedRepos);
    // }
    // fetchRepos();

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

  const handleRepoAdded = (payload: any) => {
    const newRepo: Repo = payload["new_repo"];

    setRepos((prevRepos) => {
      if (prevRepos.some((repo) => repo.id === newRepo.id)) {
        return prevRepos;
      }
      return [newRepo, ...prevRepos];
    });
  };

  return (
    <div className="flex flex-col gap-4 font-base">
      {/* <div className="w-full">
        <h1 className="mb-8 text-2xl font-heading sm:text-4xl">Controls</h1>
      </div> */}
      <div className="w-full"></div>
      top
      <div className="flex flex-row gap-4">
        <Card className="w-[400px] flex-shrink-0 brute-white brute-shadow grid-paper">
          <RepoForm onJobComplete={handleRepoAdded} />
        </Card>
        <Card className="flex-1 min-w-0 brute-white brute-shadow grid-paper">
          <RepoList repos={repos} />
        </Card>
      </div>
    </div>
  );

  // return (
  //   <div className="font-base">
  //     <h1 className="mb-8 text-2xl font-heading sm:text-4xl">Controls</h1>

  //     <RepoList />
  //     <RepoForm />

  //     <div className="flex gap-4 bg-red-400">

  //     </div>
  //   </div>
  // );
}
