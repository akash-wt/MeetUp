import { GoogleLogin } from '@react-oauth/google';
import { useState } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import axios from "axios";
import { BACKEND_URL } from '../config';

function Login() {
    const nevigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);

    const handleSuccess = async (credentialResponse: any) => {
        setIsLoading(true);
        try {

            await axios.post(`${BACKEND_URL}/api/auth/google`, {
                id_token: credentialResponse.credential
            }, { withCredentials: true });


            const res = await axios.get(`${BACKEND_URL}/api/me`, { withCredentials: true });
            localStorage.setItem('user', JSON.stringify(res.data));

            toast.info("Login Successfull!")

            setTimeout(() => {
                setIsLoading(false);
                nevigate("/");
            }, 1000);


        } catch (error) {
            console.error('Error decoding token:', error);
            toast.error("Failed to Login!");

            setIsLoading(false);
        }
    };

    const handleError = () => {
        console.log('Login Failed');
        setIsLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900">
            <div className="max-w-md w-full mx-4">
                {/* Main Card */}
                <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-700">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-gray-700 rounded-full mx-auto mb-6 flex items-center justify-center">
                            <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                            </svg>
                        </div>
                        <h1 className="text-3xl font-bold text-white mb-2">Create Account</h1>
                        <p className="text-gray-400">Sign up with Google to get started</p>
                    </div>

                    {/* Google Signup */}
                    <div className="space-y-6">
                        <div className="flex justify-center">
                            {isLoading ? (
                                <div className="flex items-center justify-center py-3 px-8 bg-gray-700 rounded-lg border border-gray-600 w-full">
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                    <span className="ml-3 text-gray-300">Creating your account...</span>
                                </div>
                            ) : (
                                <div className="w-full">
                                    <GoogleLogin
                                        onSuccess={handleSuccess}
                                        onError={handleError}
                                        theme="filled_black"
                                        size="large"
                                        text="continue_with"
                                        shape="rectangular"
                                        width="100%"

                                    />
                                </div>
                            )}
                        </div>

                        {/* Features */}
                        <div className="space-y-4 mt-8">
                            <div className="flex items-center text-gray-300">
                                <svg className="w-5 h-5 text-green-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <span>Secure authentication with Google</span>
                            </div>
                            <div className="flex items-center text-gray-300">
                                <svg className="w-5 h-5 text-green-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <span>No password required</span>
                            </div>
                            <div className="flex items-center text-gray-300">
                                <svg className="w-5 h-5 text-green-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <span>Quick and easy setup</span>
                            </div>
                        </div>
                    </div>


                </div>

                {/* Bottom Text */}
                <div className="text-center mt-6">
                    <p className="text-gray-500 text-sm">
                        By signing up, you agree to our{' '}
                        <a href="#" className="text-blue-400 hover:text-blue-300">Terms of Service</a>
                        {' '}and{' '}
                        <a href="#" className="text-blue-400 hover:text-blue-300">Privacy Policy</a>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default Login;