import { useState } from "react";
import { UserContext, } from "./contexts";
import type { UserType } from "../types/user";


export const UserContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [userData, update_user_data] = useState<UserType>(null);

    return (
        <UserContext.Provider value={{ userData, update_user_data }}>
            {children}
        </UserContext.Provider>
    );
};
