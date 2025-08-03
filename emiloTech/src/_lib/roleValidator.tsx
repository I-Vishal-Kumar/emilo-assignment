import { useContext } from "react";
import type { UserRoleType } from "../types/user";
import { UserContext } from "./contexts";
import { Outlet } from "react-router-dom";

export const RoleValidator: React.FC<{ role: UserRoleType }> = ({
    role
}) => {

    const { userData } = useContext(UserContext);

    if (userData?.role !== role) {
        return <h1>You are not authorized to access this page.</h1>
    }

    return <Outlet />
}