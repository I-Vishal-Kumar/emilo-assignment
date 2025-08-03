import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { io } from "socket.io-client";
import axios from "../../../_lib/axios";
import type { AxiosReturnType, Claim } from "../../../types/user";
import { UserContext } from "../../../_lib/contexts";


export default function ReviewClaims() {
    const [lockedClaims, setLockedClaims] = useState<Record<string, string>>({});
    const [activeClaim, setActiveClaim] = useState<null | Claim>(null);
    const [showModal, setShowModal] = useState(false);
    const { userData } = useContext(UserContext)

    const [statusFilter, setStatusFilter] = useState<string[]>(["in_review", "declined_deduction"]);
    const [dateFilter, setDateFilter] = useState<"day" | "week" | "month" | "all">("all");
    const [sortOption, setSortOption] = useState<"createdAt" | "finalEarning" | "status">("createdAt");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
    const [search, setSearch] = useState("");


    const { data, isLoading, isError, refetch } = useQuery<AxiosReturnType<Claim[]>>({
        queryKey: ["claims"],
        queryFn: () => axios.get("/get-claims-to-review"),
    });

    const socket = useMemo(() => io(import.meta.env.VITE_BASE_URL, {
        withCredentials: true,
    }), []);

    useEffect(() => {
        socket.on("claim-locked", ({ claimId, lockedById }) => {
            console.log('locked', lockedById, claimId);
            setLockedClaims(prev => ({ ...prev, [claimId]: lockedById }));
        });

        socket.on("refetch", () => {
            refetch();
        })
        socket.on("locked-claims", (lockedDetails: Record<string, string>) => {
            setLockedClaims(prev => ({
                ...prev,
                ...lockedDetails
            }))
        })
        socket.on("claim-unlocked", ({ claimId }) => {
            setLockedClaims(prev => {
                const updated = { ...prev };
                delete updated[claimId];
                return updated;
            });
        });
        const handleDisconnecting = () => {
            setShowModal(false);
            socket.emit("disconnecting-user", { userId: userData?._id }); // replace with your actual user ID
        };

        window.addEventListener("beforeunload", handleDisconnecting);
        document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "hidden") {
                setShowModal(false);
                handleDisconnecting();
            }
        });

        return () => {
            socket.off("claim-locked");
            socket.off("claim-unlocked");
            window.removeEventListener("beforeunload", handleDisconnecting);
            document.removeEventListener("visibilitychange", handleDisconnecting);

        };
    }, []);

    const handleOpenClaim = (claim: Claim) => {
        if (!userData) return;

        const claimId = claim._id;
        socket.emit("lock-claim", { claimId, userId: userData._id });
        setActiveClaim(claim);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        if (activeClaim) {
            socket.emit("unlock-claim", { claimId: activeClaim._id, userId: userData?._id });
        }
        setActiveClaim(null);
        setShowModal(false);
    };

    const mutation = useMutation({
        mutationFn: ({ id, update }: {
            id: string,
            update: {
                status: string,
                finalEarning: number;
                reason: string
            }
        }) => axios.post(`/review-claim/${ id }`, update),
        onSuccess: () => {
            refetch();
            socket.emit("refetch");
            handleCloseModal();
        },
    });

    const handleApprove = () => {
        if (!activeClaim) return alert("no active claim");

        mutation.mutate({
            id: activeClaim._id,
            update: {
                status: "confirmed",
                finalEarning: activeClaim.expectedEarnings,
                reason: "",
            },
        });
    };

    const handleDeduct = () => {
        if (!activeClaim) return alert("no active claim");

        mutation.mutate({
            id: activeClaim._id,
            update: {
                status: "deduction_added",
                finalEarning: activeClaim.finalEarning || 0,
                reason: activeClaim.reason || '',
            },
        });
    };

    const filteredClaims = useMemo(() => {
        if (!data?.data?.data) return [];

        return data.data.data
            .filter((claim) => {
                if (statusFilter.length && !statusFilter.includes(claim.status)) return false;

                if (search && !claim.username.includes(search)) return false;

                const claimDate = new Date(claim.createdAt);
                const now = new Date();
                const oneDay = 24 * 60 * 60 * 1000;

                if (dateFilter === "day" && now.getTime() - claimDate.getTime() > oneDay) return false;
                if (dateFilter === "week" && now.getTime() - claimDate.getTime() > 7 * oneDay) return false;
                if (dateFilter === "month" && now.getTime() - claimDate.getTime() > 30 * oneDay) return false;

                return true;
            })
            .sort((a, b) => {
                const fieldA = a[sortOption];
                const fieldB = b[sortOption];
                if (typeof fieldA === "number" && typeof fieldB === "number") {
                    return sortDir === "asc" ? fieldA - fieldB : fieldB - fieldA;
                }
                if (typeof fieldA === "string" && typeof fieldB === "string") {
                    return sortDir === "asc"
                        ? fieldA.localeCompare(fieldB)
                        : fieldB.localeCompare(fieldA);
                }
                return 0;
            });
    }, [data, statusFilter, dateFilter, sortOption, sortDir, search]);


    if (isLoading) return <div className="p-4 text-white">Loading claims...</div>;
    if (isError) return <div className="p-4 text-red-500">Failed to fetch claims.</div>;

    return (
        <div className="p-4 space-y-4">
            <h2 className="text-xl font-bold text-white">Claims to Review</h2>
            <div className="flex flex-wrap gap-3 mb-4 text-white">
                <select onChange={e => setDateFilter(e.target.value as any)} value={dateFilter} className="p-2 bg-gray-800 rounded">
                    <option value="all">All Time</option>
                    <option value="day">Last Day</option>
                    <option value="week">Last Week</option>
                    <option value="month">Last Month</option>
                </select>
                <select onChange={e => setSortOption(e.target.value as any)} value={sortOption} className="p-2 bg-gray-800 rounded">
                    <option value="createdAt">createdAt</option>
                    <option value="finalEarning">Final earning</option>
                </select>
                <select onChange={e => setStatusFilter(e.target.value as any)} value={sortOption} className="p-2 bg-gray-800 rounded">
                    <option value="All">All status</option>
                    <option value="in_review">in review</option>
                    <option value="declined_deduction">declined deduction</option>
                </select>
                <select onChange={e => setSortDir(e.target.value as any)} value={sortDir} className="p-2 bg-gray-800 rounded">
                    <option value="desc">Descending</option>
                    <option value="asc">Ascending</option>
                </select>
                <input
                    type="text"
                    placeholder="Search by username"
                    className="p-2 bg-gray-800 rounded"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
            </div>

            {filteredClaims.map(claim => {
                const isLocked = !!lockedClaims[claim._id];
                return (
                    <div
                        key={claim._id}
                        className={`p-4 rounded-md border ${ isLocked ? "border-red-500 bg-red-100" : "border-gray-400 bg-gray-100"
                            } flex justify-between items-center`}
                    >
                        <div>
                            <div className="font-semibold">User: {claim.username}</div>
                            <div>Status: {claim.status}</div>
                            <div>Expected: ₹{claim.expectedEarnings}</div>
                            <div>Final: ₹{claim.finalEarning || "N/A"}</div>
                            {claim.reason && <div>Reason: {claim.reason}</div>}
                        </div>
                        <div>
                            <button
                                onClick={() => handleOpenClaim(claim)}
                                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                                disabled={isLocked}
                            >
                                {isLocked ? `Locked by ${ lockedClaims[claim._id] }` : "Review"}
                            </button>
                        </div>
                    </div>
                );
            })}

            {(showModal && activeClaim) && (
                <Modal onClose={handleCloseModal}>
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Review Claim</h3>
                        <div>
                            <label className="block mb-1">Expected Earning</label>
                            <input
                                type="number"
                                value={activeClaim.expectedEarnings}
                                disabled
                                className="w-full p-2 border rounded"
                            />
                        </div>
                        <div>
                            <label className="block mb-1">Final Earning</label>
                            <input
                                type="number"
                                value={activeClaim.finalEarning || ""}
                                onChange={e =>
                                    setActiveClaim({ ...activeClaim, finalEarning: Number(e.target.value) })
                                }
                                className="w-full p-2 border rounded"
                            />
                        </div>
                        <div>
                            <label className="block mb-1">Reason (if deducted)</label>
                            <textarea
                                value={activeClaim.reason || ""}
                                onChange={e =>
                                    setActiveClaim({ ...activeClaim, reason: e.target.value })
                                }
                                className="w-full p-2 border rounded"
                            />
                        </div>
                        <div className="flex gap-4 mt-4">
                            <button
                                onClick={handleApprove}
                                className="px-4 py-2 bg-green-600 text-white rounded"
                            >
                                Approve
                            </button>
                            <button
                                onClick={handleDeduct}
                                className="px-4 py-2 bg-yellow-600 text-white rounded"
                            >
                                Add Deduction
                            </button>
                            <button
                                onClick={handleCloseModal}
                                className="px-4 py-2 bg-gray-500 text-white rounded"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}


type ModalProps = {
    children: React.ReactNode;
    onClose: React.Dispatch<React.SetStateAction<boolean>>;
};

export function Modal({ children, onClose }: ModalProps) {
    const dialogRef = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (dialog && !dialog.open) {
            dialog.showModal();
        }

        const handleCancel = () => onClose(false);
        dialog?.addEventListener("cancel", handleCancel);

        return () => {
            dialog?.removeEventListener("cancel", handleCancel);
        };
    }, [onClose]);

    const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
        const rect = (e.target as HTMLDialogElement).getBoundingClientRect();
        const clickedOutside =
            e.clientX < rect.left ||
            e.clientX > rect.right ||
            e.clientY < rect.top ||
            e.clientY > rect.bottom;

        if (clickedOutside) {
            onClose(false);
        }
    };

    return (
        <dialog
            ref={dialogRef}
            onClick={handleBackdropClick}
            className="rounded-lg p-4 w-[80%] h-[90%] mt-[5%] mx-auto max-w-md shadow-lg bg-white text-black"
        >
            <button
                onClick={() => onClose(false)}
                className="absolute top-2 right-2 text-lg font-bold"
            >
                ✕
            </button>
            {children}
        </dialog>
    );
}



