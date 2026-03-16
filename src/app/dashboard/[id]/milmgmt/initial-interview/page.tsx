"use client";

import { useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

export default function InterviewsPage() {
    const { id } = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const ocId = Array.isArray(id) ? id[0] : id ?? "";

    const query = new URLSearchParams(searchParams.toString());
    query.set("interview", "initial");
    const target = `/dashboard/${ocId}/milmgmt/interviews?${query.toString()}`;

    useEffect(() => {
      router.replace(target);
    }, [router, target]);

    return null;
}
