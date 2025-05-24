import axios from 'axios';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BACKEND_URL } from '../config';

function SessionManager() {
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await axios.get(`${BACKEND_URL}/api/me`, { withCredentials: true });
                localStorage.setItem('user', JSON.stringify(res.data));
            } catch (err) {
                localStorage.removeItem('user');
                navigate('/login');
            }
        };

        fetchUser();
    }, []);

    return null;
}

export default SessionManager;
