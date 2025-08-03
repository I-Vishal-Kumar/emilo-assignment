import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { utils, writeFile } from "xlsx";
import axios from "../../../_lib/axios";
import type { AxiosReturnType } from "../../../types/user";

type Settlement = {
    claim: string,
    approvedAmount: number,
    totalDeductions: number,
    approvedBy: string,
    createdAt: string,
    updatedAt: string,
    postOwnerName: string,
    approverName: string,
    logs: {
        action: string,
        by: string,
        timestamp: string,
    }[]
}

export default function Settlement() {
    const [offset, setOffset] = useState(0);
    const [postOwnerFilter, setPostOwnerFilter] = useState("");
    const [approverFilter, setApproverFilter] = useState("");

    const { data, isLoading, isError } = useQuery<AxiosReturnType<{
        settlements: Settlement[],
        pagination: {
            offset: number,
            limit: number,
            total: number,
            hasMore: boolean,
        },
    }>>({
        queryKey: ["claims", offset],
        queryFn: () => axios.get("/get-settlement", {
            params: { offset, limit: 5 },
        }),
    });

    const settlements = useMemo(() => {
        if (!data?.data?.data?.settlements) return [];
        return data.data.data.settlements.filter(settlement => {
            const matchPostOwner = postOwnerFilter ? settlement.postOwnerName.toLowerCase().includes(postOwnerFilter.toLowerCase()) : true;
            const matchApprover = approverFilter ? settlement.approverName.toLowerCase().includes(approverFilter.toLowerCase()) : true;
            return matchPostOwner && matchApprover;
        });
    }, [data, postOwnerFilter, approverFilter]);

    const handleExportToExcel = () => {
        if (!settlements.length) return;
        const worksheet = utils.json_to_sheet(settlements.map(s => ({
            "Claim ID": s.claim,
            "Post Owner": s.postOwnerName,
            "Approver": s.approverName,
            "Approved Amount": s.approvedAmount,
            "Total Deductions": s.totalDeductions,
            "Created At": new Date(s.createdAt).toLocaleString(),
            "Updated At": new Date(s.updatedAt).toLocaleString(),
        })));
        const workbook = utils.book_new();
        utils.book_append_sheet(workbook, worksheet, "Settlements");
        writeFile(workbook, "settlements.xlsx");
    };

    if (isLoading) return <div className="text-white p-4">Loading...</div>;
    if (isError) return <div className="text-red-500 p-4">Failed to load settlements</div>;

    return (
        <div className="p-4 space-y-4">
            <h2 className="text-xl font-bold text-white">Settlement Records</h2>
            <div className="flex flex-wrap gap-3">
                <input
                    type="text"
                    placeholder="Filter by Post Owner"
                    value={postOwnerFilter}
                    onChange={(e) => setPostOwnerFilter(e.target.value)}
                    className="p-2 rounded bg-gray-800 text-white"
                />
                <input
                    type="text"
                    placeholder="Filter by Approver"
                    value={approverFilter}
                    onChange={(e) => setApproverFilter(e.target.value)}
                    className="p-2 rounded bg-gray-800 text-white"
                />
                <button
                    onClick={handleExportToExcel}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
                >
                    Export to Excel
                </button>
            </div>
            <div className="flex justify-between text-white mt-6">
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
            {settlements.map(s => (
                <div key={s.claim} className="border max-w-xl mx-auto border-gray-600 bg-gray-100 rounded p-4 text-sm">
                    <div><strong>Claim ID:</strong> {s.claim}</div>
                    <div><strong>Post Owner:</strong> {s.postOwnerName}</div>
                    <div><strong>Approver:</strong> {s.approverName}</div>
                    <div><strong>Approved:</strong> ₹{s.approvedAmount}</div>
                    <div><strong>Deductions:</strong> ₹{s.totalDeductions}</div>
                    <div><strong>Created:</strong> {new Date(s.createdAt).toLocaleString()}</div>
                    <p>Logs:</p>
                    <ul className="border-l-2 border-gray-300 pl-4 space-y-4">
                        {s.logs.map((log, idx) => (
                            <li key={idx} className="relative pl-4">
                                <span className="absolute -left-2 top-1 w-3 h-3 bg-blue-500 rounded-full" />
                                <div className="text-sm flex flex-col">
                                    <span className="font-medium text-gray-800">{log.action}</span>{" "}
                                    <span className="text-gray-500 text-xs ml-2">
                                        by <span className="italic">{log.by}</span> on{" "}
                                        {new Date(log.timestamp).toDateString()}
                                    </span>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
        </div>
    );
}
