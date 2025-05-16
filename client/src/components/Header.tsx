import { Flame } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Header = () => {
    const nevigate = useNavigate()
    const hanleNevigate = () => {
        nevigate('/')
    }
    return (
        <header className="p-4 border-b border-gray-800 bg-gray-900 flex items-center">
            <div className="flex items-center">
                <Flame onClick={hanleNevigate} className="w-6 h-6 text-indigo-500 mr-2 cursor-pointer" />
                <h1 onClick={hanleNevigate} className="text-xl font-semibold text-white cursor-pointer">MeetUp</h1>
            </div>
        </header>
    );
};

export default Header;
