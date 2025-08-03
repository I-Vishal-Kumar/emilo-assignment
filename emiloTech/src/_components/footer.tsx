import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { HiHome, HiClipboardList } from "react-icons/hi";

export default function Footer({ admin = false }: { admin?: boolean }) {
    const navigate = useNavigate();
    const location = useLocation();

    const isActive = (path: string) => location.pathname.startsWith(path);

    return (
        <div>
            <Outlet />
            <footer className="fixed bottom-0 left-0 w-full bg-white shadow-md border-t border-gray-200">
                <div className="flex justify-around py-2 text-sm text-gray-600">
                    {
                        admin ? (
                            <>
                                <button
                                    onClick={() => navigate("/claim-approval")}
                                    className={`flex flex-col items-center gap-1 ${ isActive("/claim-approval") ? "text-blue-600 font-semibold" : "" }`}
                                >
                                    <HiHome size={20} />
                                    <span>approvals</span>
                                </button>

                                <button
                                    onClick={() => navigate("/settlement")}
                                    className={`flex flex-col items-center gap-1 ${ isActive("/settlement") ? "text-blue-600 font-semibold" : "" }`}
                                >
                                    <HiClipboardList size={20} />
                                    <span>settlement</span>
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={() => navigate("/post")}
                                    className={`flex flex-col items-center gap-1 ${ isActive("/post") ? "text-blue-600 font-semibold" : "" }`}
                                >
                                    <HiHome size={20} />
                                    <span>Posts</span>
                                </button>

                                <button
                                    onClick={() => navigate("/my-claims")}
                                    className={`flex flex-col items-center gap-1 ${ isActive("/my-claims") ? "text-blue-600 font-semibold" : "" }`}
                                >
                                    <HiClipboardList size={20} />
                                    <span>My Claims</span>
                                </button>
                            </>

                        )
                    }
                </div>
            </footer>
        </div>
    );
}
