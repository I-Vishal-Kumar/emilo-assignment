import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import axios from '../../_lib/axios';
import type { AxiosError } from 'axios';
import { UserRoles, type AxiosReturnType, type UserRoleType, type UserType } from '../../types/user';

export const GettingStarted: React.FC = () => {

    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<UserRoleType>(UserRoles.PUBLIC);
    const navigate = useNavigate();

    const mutation = useMutation({
        mutationFn: async (): Promise<AxiosReturnType<UserType>> => {
            if (!username || !password) {
                throw new Error('Both fields are required');
            }

            const endpoint = isLogin ? '/login' : '/signup';
            const payload = isLogin
                ? { username, password }
                : { username, password, role };

            return await axios.post(endpoint, payload);
        },
        onSuccess: (data) => {
            if (role === UserRoles.REVIEWER) {
                navigate('/review-claims');

            } else if (role === UserRoles.ADMIN) {
                navigate('/claim-approval');

            } else if (data.data.data?.role) {
                if (data.data.data?.role === UserRoles.REVIEWER) {
                    navigate('/review-claims');

                } else if (data.data.data?.role === UserRoles.ADMIN) {
                    navigate('/claim-approval');

                } else {
                    navigate('/post');
                }
            }
        },
        onError: (err: AxiosError<AxiosReturnType>) => {
            console.log(err);
            // @ts-expect-error invalid type assertion.
            alert(err?.response?.data?.msg || err.message || 'Something went wrong');
        },
    });

    const toggleRole = (selected: UserRoleType) => {
        setRole((prev) => (prev === selected ? UserRoles.PUBLIC : selected));
    };

    return (
        <div className="flex items-center justify-center min-h-screen p-4">
            <div className="w-full max-w-sm p-6 rounded-xl shadow-md bg-slate-50">
                <h2 className="text-2xl font-bold text-center mb-4">
                    {isLogin ? 'Login' : 'Signup'}
                </h2>

                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        mutation.mutate();
                    }}
                    className="space-y-4"
                >
                    <input
                        type="text"
                        placeholder="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring focus:border-blue-500"
                    />

                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring focus:border-blue-500"
                    />

                    {!isLogin && (
                        <div className="flex items-center w-full space-x-2">
                            <label className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    checked={role === UserRoles.ADMIN}
                                    onChange={() => toggleRole(UserRoles.ADMIN)}
                                    disabled={mutation.isPending}
                                />
                                <span>Admin</span>
                            </label>
                            <label className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    checked={role === UserRoles.REVIEWER}
                                    onChange={() => toggleRole(UserRoles.REVIEWER)}
                                    disabled={mutation.isPending}
                                />
                                <span>Reviewer</span>
                            </label>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={mutation.isPending}
                        className={`w-full py-2 font-semibold text-white rounded-md ${ mutation.isPending ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                            }`}
                    >
                        {mutation.isPending
                            ? isLogin ? 'Logging in...' : 'Signing up...'
                            : isLogin ? 'Login' : 'Signup'}
                    </button>
                </form>

                <p className="mt-4 text-center text-sm text-gray-600">
                    {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
                    <button
                        onClick={() => {
                            setIsLogin(!isLogin);
                            setRole(UserRoles.PUBLIC); // reset role when switching
                        }}
                        className=" text-white bg-black py-2 px-4 rounded-md mx-2 font-medium hover:underline"
                        disabled={mutation.isPending}
                    >
                        {isLogin ? 'Signup' : 'Login'}
                    </button>
                </p>
            </div>
        </div>
    );
};
