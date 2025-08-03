import { createContext } from "react";
import type { UserType } from "../types/user";



export const UserContext = createContext<{
    update_user_data: React.Dispatch<UserType> | VoidFunction,
    userData: UserType
}>({ update_user_data: () => { }, userData: null });
