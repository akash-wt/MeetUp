import axios from 'axios';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function SessionManager() {
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await axios.get('http://localhost:5080/api/me', { withCredentials: true });
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
