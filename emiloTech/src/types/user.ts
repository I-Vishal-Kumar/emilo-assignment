import type { AxiosResponse } from "axios";

export type UserType = {
    _id: string;
    username: string;
    role: UserRoleType;
} | null;

export type AxiosReturnType<T = undefined> = AxiosResponse<{
    success: boolean;
    data: T;
    msg?: string;
}>;

export const UserRoles = {
    ADMIN: "ADMIN",
    PUBLIC: "PUBLIC",
    REVIEWER: "REVIEWER",
} as const;

export type UserRoleType = (typeof UserRoles)[keyof typeof UserRoles];

export type PostType = {
    _id: string;
    caption: string;
    fileURL?: string;
    createdAt: string;
    updatedAt: string;
};

export type ClaimLog = {
    action: string;
    by: string; // user ID
    _id: string;
    timestamp: string; // ISO string
};

export type ClaimStatus =
    | "in_review"
    | "deduction_added"
    | "declined_deduction"
    | "confirmed"
    | "approved"
    | "rejected";

export type Claim = {
    _id: string;
    username: string;
    post: string;
    status: ClaimStatus;
    expectedEarnings: number;
    finalEarning?: number;
    reason?: string;
    logs: ClaimLog[];
    createdAt: string;
    updatedAt: string;
    __v: number;
};
