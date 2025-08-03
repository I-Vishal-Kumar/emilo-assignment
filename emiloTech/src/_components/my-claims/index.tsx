import { useMutation, useQuery } from "@tanstack/react-query"
import axios from "../../_lib/axios";
import type { AxiosReturnType } from "../../types/user";

const getMyClaims = async (): Promise<AxiosReturnType<unknown[]>> => {
    const res = await axios.get("/my-claims");
    return res;
};

const CLAIM_STATUS_COLOR: Record<string, string> = {
    in_review: "bg-yellow-400",
    deduction_added: "bg-orange-500",
    declined_deduction: "bg-red-500",
    confirmed: "bg-blue-500",
    approved: "bg-green-500",
    rejected: "bg-gray-400",
};

export default function MyClaims() {

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ["my-claims"],
        queryFn: getMyClaims,
    });

    const deductionMutation = useMutation({
        mutationFn: async (formData: { postID: string, type: 'approve' | 'reject' }) => {
            return axios.post("/claim-deduction-acknowledgement", formData);
        },
        onSuccess: () => {
            refetch();
        },
    });

    if (isLoading) return <div className="p-4 text-gray-300">Loading claims...</div>;
    if (isError || !data?.data.success) return <div className="p-4 text-red-500">Error loading claims.</div>;
    if (!data.data.data.length) return <div className="p-4 text-white">No claims found.</div>;

    return (
        <div className="p-4 flex flex-col items-center gap-4">
            {data.data.data.map((claim: any) => (
                <div
                    key={claim._id}
                    className="bg-gray-900 w-full max-w-xl text-white rounded-lg shadow-lg p-4 border border-gray-700"
                >
                    <div className="flex justify-between items-center mb-2">
                        <div className="font-semibold text-sm text-gray-300">
                            {new Date(claim.createdAt).toDateString()}
                        </div>
                        <div className="flex items-center gap-2">
                            <span
                                className={`w-3 h-3 rounded-full ${ CLAIM_STATUS_COLOR[claim.status] }`}
                            ></span>
                            <span className="capitalize text-sm font-medium">
                                {claim.status.replaceAll("_", " ")}
                            </span>
                        </div>
                    </div>

                    <div className="text-sm">
                        <p>
                            <span className="font-medium">Expected Earning:</span>{" "}
                            ₹{claim.expectedEarnings}
                        </p>
                        {claim.finalEarning && (
                            <p>
                                <span className="font-medium">Final Earning:</span>{" "}
                                ₹{claim.finalEarning}
                            </p>
                        )}
                        {claim.reason && (
                            <p>
                                <span className="font-medium">Reason:</span> {claim.reason}
                            </p>
                        )}
                    </div>
                    {
                        claim.status === 'deduction_added' ? (
                            <div className="flex justify-between items-center mt-4 text-sm">
                                <button
                                    disabled={deductionMutation.isPending}
                                    onClick={() => deductionMutation.mutate({ postID: claim.post, type: 'approve' })}
                                    className="bg-lime-500 rounded-md py-1 px-2">
                                    Approve deduction
                                </button>
                                <button
                                    disabled={deductionMutation.isPending}
                                    onClick={() => deductionMutation.mutate({ postID: claim.post, type: 'reject' })}
                                    className="bg-red-400 rounded-md py-1 px-2">
                                    Reject deduction
                                </button>
                            </div>
                        ) : null
                    }
                </div>
            ))}
        </div>
    );
}