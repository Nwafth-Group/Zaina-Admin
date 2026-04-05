import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const queryClient = useQueryClient();

    // الطريقة الصحيحة لـ useMutation في الإصدار الخامس
    const loginMutation = useMutation({
        mutationFn: (credentials) => {
            return axios.post('/api/login', credentials);
        },
        onSuccess: (data) => {
            // سنقوم بتخزين التوكن وتوجيه المستخدم في خطوة لاحقة
            queryClient.invalidateQueries({ queryKey: ['user'] });
            console.log('Login successful', data);
        },
        onError: (error) => {
            console.error('Login error', error);
        }
    });

    const handleLogin = (e) => {
        e.preventDefault();
        loginMutation.mutate({ email, password });
    };

    return (
        <div className="min-h-screen bg-[#FDF0F3] flex items-center justify-center font-main" dir="rtl"> 
            <div className="bg-white p-12 rounded-[24px] shadow-lg w-[450px]">
                {/* <img src={logo} alt="Zaina Logo" className="mx-auto h-24 mb-6" /> */}
                <h1 className="text-3xl font-bold text-center text-[#212121] mb-2">بوابة المشرف العام</h1>
                <p className="text-center text-[#616161] mb-10">Zaina Admin Services Login</p>
                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <input
                            type="email"
                            value={email}
                            // تم التعديل هنا
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="البريد الإلكتروني"
                            className="w-full px-6 py-4 border border-[#F4A9BC] rounded-full text-[#212121] placeholder:text-[#9E9E9E] focus:ring-2 focus:ring-[#E91E63] outline-none"
                        />
                    </div>
                    <div>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="كلمة المرور"
                            className="w-full px-6 py-4 border border-[#F4A9BC] rounded-full text-[#212121] placeholder:text-[#9E9E9E] focus:ring-2 focus:ring-[#E91E63] outline-none"
                        />
                    </div>
                    <div className="text-right">
                        <a href="#" className="text-sm text-[#E91E63] hover:underline">نسيت كلمة المرور؟</a>
                    </div>
                    <div>
                        <button type="submit" className="w-full py-4 bg-[#E91E63] text-white rounded-full text-lg font-medium hover:bg-[#D81B60] transition-colors">
                            تسجيل الدخول
                        </button>
                    </div>
                </form>
                <p className="text-center text-xs text-[#9E9E9E] mt-12">بوابة زينة لخدمات المشرفين v1.0</p>
            </div>
        </div>
    );
}