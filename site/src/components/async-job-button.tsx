import React, { useState } from "react";
import { useInterval } from "@/hooks/use-interval";
import { Button } from "@/components/ui/button";
import { createJob, getJobById } from "@/app/_api/dyna_client";
//import { Job } from "@/ts/job";
//import { v4 as uuidv4 } from "uuid";

const getTTL = () => {
  const now = Math.floor(Date.now() / 1000);
  return now + 1 * 60;
};

const POLL_SEC = 2;

type AsyncJobButtonProps = {
  icon?: React.ElementType;
  title: string;
  directive: string;
  payloadItems: any[];
  onJobComplete: (result: any) => void;
};

export const AsyncJobButton = ({
  icon: Icon,
  title,
  directive,
  payloadItems,
  onJobComplete,
}: AsyncJobButtonProps) => {
  const [isPending, setIsPending] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [pollCount, setPollCount] = useState(0);

  // Start the async job by calling the API
  const startAsyncJob = async () => {
    setIsPending(true);
    try {
      const payload = {
        ttl: getTTL(),
        items: payloadItems,
        directive: directive,
        status: "pending",
      };

      const response = await createJob(payload);
      const jobId = response.data.id || "___fake_job_id___";
      setJobId(jobId);
    } catch (error) {
      console.error("Failed to create job:", error);
      setIsPending(false);
    }
  };

  const pollJobStatus = async () => {
    if (!jobId) return;
    try {
      const response = await getJobById(jobId);
      const job = response.data;
      if (job.status === "completed" || job.status === "failed") {
        setIsPending(false);
        onJobComplete(job);
      }

      setPollCount((c) => c + 1);

      if (pollCount * POLL_SEC > 60) {
        console.error("JOB TOOK TOO LONG!");
        console.error(job);
        setIsPending(false);
        onJobComplete(job);
      }
    } catch (error) {
      console.error("Polling failed:", error);
      setIsPending(false);
    }
  };

  useInterval(pollJobStatus, isPending && jobId ? POLL_SEC * 1000 : null);

  return (
    <Button
      className="brute-shadow"
      onClick={startAsyncJob}
      disabled={isPending || payloadItems.length === 0}
    >
      {Icon && <Icon className="mr-2 h-4 w-4" />}
      {isPending ? "Pending..." : title}
    </Button>
  );
};
