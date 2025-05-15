"use client";
import React from "react";

import RepoForm from "./repo-form";
import RepoList from "./repo-list";

import {
  Card,
  CardFooter,
  CardHeader,
  CardContent,
  CardTitle,
} from "@/components/ui/card";

export default function Control() {
  return (
    <div className="flex flex-col gap-4 font-base">
      {/* <div className="w-full">
        <h1 className="mb-8 text-2xl font-heading sm:text-4xl">Controls</h1>
      </div> */}
      <div className="w-full"></div>
      top
      <div className="flex flex-row gap-4">
        <Card className="w-[400px] flex-shrink-0 brute-white brute-shadow grid-paper">
          left
        </Card>
        <Card className="flex-1 min-w-0 brute-white brute-shadow grid-paper">
          right
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
