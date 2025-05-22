import { useState } from 'react';
import { LogOut, Video } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const Header = () => {
    const [showProfile, setShowProfile] = useState(false);
    const nevigate = useNavigate();

    const user = localStorage.getItem("user")
    const userData = user ? JSON.parse(user) : null;


    const handleNavigate = () => {
        nevigate("/");
        console.log('Navigate to home');
    };

    const handleLogout = () => {
        localStorage.removeItem("user");
        toast.error("Logot Successfull!")
        nevigate("/login")
    }

    const ProfileModal = () => (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-xl max-w-md w-full">
                {/* Profile Header */}
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold">Profile</h3>
                        <button
                            onClick={() => setShowProfile(false)}
                            className="text-gray-400 hover:text-white text-2xl"
                        >
                            ×
                        </button>
                    </div>

                    {/* Profile Info */}
                    <div className="flex flex-col items-center text-center space-y-4">
                        <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                            <img
                                src={userData.picture}
                                alt={userData.name}
                                className="w-full h-full object-cover rounded-full"
                            />

                        </div>
                        <div>
                            <h4 className="text-xl font-semibold text-white">{userData.name}</h4>
                            <p className="text-gray-400 mt-1">{userData.email}</p>
                        </div>
                    </div>

                    {/* Logout Button */}
                    <div className="mt-8">
                        <button className="w-full flex items-center justify-center space-x-2 p-3 bg-red-800 hover:bg-red-900 rounded-lg transition-colors text-white font-medium">
                            <LogOut className="w-5 h-5" />
                            <span onClick={handleLogout}>Sign Out</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <>
            <header className="p-4 border-b border-gray-800 bg-gray-900 flex items-center justify-between">
                <div className="flex items-center">
                    <Video onClick={handleNavigate} className="w-7 h-7 text-indigo-500 mr-2 cursor-pointer" />
                    <h1 onClick={handleNavigate} className="text-xl font-semibold text-white cursor-pointer">MeetUp</h1>
                </div>

                {/* Profile Section */}
                <div className="flex items-center space-x-3">
                    <button
                        onClick={() => setShowProfile(true)}>
                        <div className="relative group inline-block">
                            <div className="w-10 h-10 rounded-full border-2 border-gray-700 overflow-hidden transition-all duration-300 shadow-sm hover:scale-105 hover:border-indigo-500">
                                <img
                                    src={userData.picture}
                                    alt={userData.name}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        </div>
                    </button>
                </div>
            </header>

            {showProfile && <ProfileModal />}
        </>
    );
};

export default Header;