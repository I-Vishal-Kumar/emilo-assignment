import { useContext, useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { UserContext } from './contexts';
import { queryOptions, useQuery } from '@tanstack/react-query';
import { type AxiosReturnType, type UserType } from '../types/user';
import { GettingStarted } from '../_components/getting-started';
import axios from './axios';

export const Persistence: React.FC = () => {

    const { userData, update_user_data } = useContext(UserContext);
    const naviagate = useNavigate();

    const { data, isPending, isSuccess, isError } = useQuery(
        queryOptions<AxiosReturnType<UserType>>({
            queryKey: ['UserInfo'],
            queryFn: () => axios.get('/user-info')
        })
    );

    useEffect(() => {
        if (isError) {
            naviagate('/public/getting-started');
            return;
        }

        if (!isPending && isSuccess && data?.data?.success) {
            const user = data.data.data;

            update_user_data(user);

        } else if (!isPending && isSuccess && !data?.data?.success) {
            naviagate('/public/getting-started');
        }
    }, [isSuccess, isPending, data, update_user_data, isError, naviagate]);


    if (isPending) {
        return <h3 className='text-white'>Loading...</h3>
    }
    return userData ? <Outlet /> : <GettingStarted />
}