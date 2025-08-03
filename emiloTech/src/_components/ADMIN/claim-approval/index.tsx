import { useMutation, useQuery } from "@tanstack/react-query";
import axios from "../../../_lib/axios";
import type { AxiosReturnType, Claim } from "../../../types/user";
import { useState } from "react";


export default function ClaimApproval() {
    const [offset, setOffset] = useState(0);
    const [statusFilter, setStatusFilter] = useState("");
    const [dateRange, setDateRange] = useState("all");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
    const [search, setSearch] = useState("");

    const { data, isLoading, isError, refetch } = useQuery<AxiosReturnType<{
        claims: Claim[],
        pagination: {
            offset: number,
            limit: number,
            total: number,
            hasMore: boolean,
        },
    }>>({
        queryKey: ["claims", offset],
        queryFn: () =>
            axios.get("/get-confirmed-claims", {
                params: { offset, limit: 5 },
            }),
    });

    const mutation = useMutation({
        mutationFn: ({ id, update }: {
            id: string,
            update: {
                status: string,
                finalEarning: number;
                reason: string
            }
        }) => axios.post(`/review-claim/${ id }`, update),
        onSuccess: () => refetch(),
    });

    const filterClaims = (claims: Claim[] = []) => {

        let filtered = [...claims];

        if (statusFilter) {
            filtered = filtered.filter(c => c.status === statusFilter);
        }

        if (search.trim()) {
            filtered = filtered.filter(c => c.username.includes(search.trim()));
        }

        if (dateRange !== "all") {
            const now = new Date();
            const past = new Date();
            if (dateRange === "day") past.setDate(now.getDate() - 1);
            if (dateRange === "week") past.setDate(now.getDate() - 7);
            if (dateRange === "month") past.setMonth(now.getMonth() - 1);
            filtered = filtered.filter(c => new Date(c.createdAt) >= past);
        }

        if (sortOrder === "asc") {
            filtered.sort((a, b) => (a.finalEarning ?? 0) - (b.finalEarning ?? 0));
        } else {
            filtered.sort((a, b) => (b.finalEarning ?? 0) - (a.finalEarning ?? 0));
        }

        return filtered;
    };

    const claims = data?.data ? filterClaims(data.data.data.claims) : [];

    return (
        <div className="p-4 text-white">
            <h1 className="text-xl font-bold mb-4">Claim Approval</h1>

            <div className="flex flex-wrap gap-4 mb-4">
                <select onChange={e => setStatusFilter(e.target.value)} value={statusFilter} className="p-2 border">
                    <option className="text-black" value="">All Status</option>
                    <option className="text-black" value="confirmed">Confirmed</option>
                    <option className="text-black" value="approved">Approved</option>
                    <option className="text-black" value="rejected">Rejected</option>
                </select>

                <select onChange={e => setDateRange(e.target.value)} value={dateRange} className="p-2 border">
                    <option className="text-black" value="all">All Dates</option>
                    <option className="text-black" value="day">Last 24 Hours</option>
                    <option className="text-black" value="week">Last 7 Days</option>
                    <option className="text-black" value="month">Last 30 Days</option>
                </select>

                <select onChange={e => setSortOrder(e.target.value as "asc" | "desc")} value={sortOrder} className="p-2 border">
                    <option className="text-black" value="desc">Amount Descending</option>
                    <option className="text-black" value="asc">Amount Ascending</option>
                </select>

                <input
                    type="text"
                    placeholder="Search by username"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="p-2 border"
                />
            </div>

            {isLoading ? (
                <div>Loading...</div>
            ) : isError ? (
                <div>Error loading claims.</div>
            ) : (
                <div className="flex flex-col gap-4">
                    {claims.map(claim => (
                        <div key={claim._id} className="p-4 text-black border rounded bg-white shadow-sm">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="font-semibold">User: {claim.username}</p>
                                    <p className="font-semibold">Claim ID: {claim._id}</p>
                                    <p>Status: {claim.status}</p>
                                    <p>Final Earning: ₹{claim.finalEarning}</p>
                                    <p className="text-sm text-gray-500">Created at: {new Date(claim.createdAt).toLocaleString()}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        className="px-4 py-2 bg-green-500 text-white rounded"
                                        onClick={() => mutation.mutate({
                                            id: claim._id,
                                            update: {
                                                status: "approved",
                                                finalEarning: claim.finalEarning ?? 0,
                                                reason: "",
                                            }
                                        })}
                                    >
                                        Approve
                                    </button>
                                    <button
                                        className="px-4 py-2 bg-red-500 text-white rounded"
                                        onClick={() => mutation.mutate({
                                            id: claim._id,
                                            update: {
                                                status: "rejected",
                                                finalEarning: 0,
                                                reason: "Admin rejected the claim",
                                            }
                                        })}
                                    >
                                        Reject
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="flex justify-between mt-6">
                <button
                    className="px-4 py-2 border rounded disabled:opacity-50"
                    onClick={() => setOffset(Math.max(0, offset - 5))}
                    disabled={offset === 0}
                >
                    Previous
                </button>
                <button
                    disabled={!data?.data.data.pagination.hasMore}
                    className="px-4 py-2 border rounded disabled:opacity-50"
                    onClick={() => setOffset(offset + 5)}
                >
                    Next
                </button>
            </div>
        </div>
    );
}

