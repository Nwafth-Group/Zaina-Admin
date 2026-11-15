import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axios.js';

export default function CompanyInfo() {
    const { t, i18n } = useTranslation('settings');
    const isArabic = i18n.language?.startsWith('ar');
    const queryClient = useQueryClient();

    // Form states
    const [nameAr, setNameAr] = useState('');
    const [nameEn, setNameEn] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [website, setWebsite] = useState('');
    const [vatPercentage, setVatPercentage] = useState(0);
    const [facebook, setFacebook] = useState('');
    const [instagram, setInstagram] = useState('');
    const [twitter, setTwitter] = useState('');
    const [snapchat, setSnapchat] = useState('');
    const [tiktok, setTiktok] = useState('');
    const [linkedin, setLinkedin] = useState('');
    const [googlePlay, setGooglePlay] = useState('');
    const [appStore, setAppStore] = useState('');
    
    // File upload state
    const [logoFile, setLogoFile] = useState(null);
    const [logoPreview, setLogoPreview] = useState('');

    // Fetch company info
    const { data: companyData, isLoading, refetch } = useQuery({
        queryKey: ['companyInfo'],
        queryFn: async () => {
            const res = await axiosInstance.get('/admin/company-info');
            return res.data.data;
        },
    });

    // Populate form fields on initial fetch completion
    useEffect(() => {
        if (companyData) {
            setNameAr(companyData.name_ar || '');
            setNameEn(companyData.name_en || '');
            setEmail(companyData.email || '');
            setPhone(companyData.phone || '');
            setWebsite(companyData.website || '');
            setVatPercentage(companyData.vat_percentage || 0);
            setFacebook(companyData.facebook_link || '');
            setInstagram(companyData.instagram_link || '');
            setTwitter(companyData.twitter_link || '');
            setSnapchat(companyData.snapchat_link || '');
            setTiktok(companyData.tiktok_link || '');
            setLinkedin(companyData.linkedin_link || '');
            setGooglePlay(companyData.google_play_link || '');
            setAppStore(companyData.app_store_link || '');
            setLogoPreview(companyData.logo_url || '');
        }
    }, [companyData]);

    // Handle logo file change
    const handleLogoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setLogoFile(file);
            setLogoPreview(URL.createObjectURL(file));
        }
    };

    // Update company settings mutation
    const updateMutation = useMutation({
        mutationFn: async (formData) => {
            const res = await axiosInstance.post('/admin/company-info', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            return res.data;
        },
        onSuccess: () => {
            toast.success(isArabic ? 'تم تحديث البيانات بنجاح!' : 'Company settings updated successfully!');
            queryClient.invalidateQueries({ queryKey: ['companyInfo'] });
            refetch();
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || (isArabic ? 'فشل تحديث البيانات' : 'Failed to update settings'));
        }
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        
        const formData = new FormData();
        formData.append('name_ar', nameAr);
        formData.append('name_en', nameEn);
        formData.append('email', email);
        formData.append('phone', phone);
        formData.append('website', website);
        formData.append('vat_percentage', vatPercentage);
        formData.append('facebook_link', facebook);
        formData.append('instagram_link', instagram);
        formData.append('twitter_link', twitter);
        formData.append('snapchat_link', snapchat);
        formData.append('tiktok_link', tiktok);
        formData.append('linkedin_link', linkedin);
        formData.append('google_play_link', googlePlay);
        formData.append('app_store_link', appStore);

        if (logoFile) {
            formData.append('logo', logoFile);
        }

        updateMutation.mutate(formData);
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-[50vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E91E63]"></div>
            </div>
        );
    }

    const socialLinksCount = [facebook, instagram, twitter, snapchat, tiktok, linkedin].filter(Boolean).length;

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-xl font-black text-gray-900 tracking-tight">
                        {isArabic ? 'بيانات الشركة والمعلومات الأساسية' : 'Company Profile & Settings'}
                    </h1>
                    <p className="text-xs text-gray-500 mt-1">
                        {isArabic ? 'تحديث أسماء الشركة، بيانات التواصل، نسبة الضريبة، وروابط التواصل الاجتماعي.' : 'Manage company names, contact numbers, VAT rate, and app links.'}
                    </p>
                </div>
            </div>

            {/* Overview Summary Metric Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-4 rounded-xl border border-gray-200 bg-white text-gray-700 flex items-center justify-between shadow-sm">
                    <div>
                        <p className="text-xs font-bold text-gray-400">{isArabic ? 'اسم الشركة' : 'Company Name'}</p>
                        <p className="text-sm font-black text-gray-900 mt-1 truncate max-w-[150px]">{isArabic ? (nameAr || '—') : (nameEn || '—')}</p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-pink-50 text-[#E91E63] flex items-center justify-center text-xl">🏢</div>
                </div>

                <div className="p-4 rounded-xl border border-gray-200 bg-white text-gray-700 flex items-center justify-between shadow-sm">
                    <div>
                        <p className="text-xs font-bold text-gray-400">{isArabic ? 'نسبة الضريبة (VAT)' : 'VAT Rate'}</p>
                        <p className="text-2xl font-black text-gray-900 mt-1">{vatPercentage}%</p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl">٪</div>
                </div>

                <div className="p-4 rounded-xl border border-gray-200 bg-white text-gray-700 flex items-center justify-between shadow-sm">
                    <div>
                        <p className="text-xs font-bold text-gray-400">{isArabic ? 'رقم الهاتف' : 'Contact Phone'}</p>
                        <p className="text-xs font-black text-gray-900 mt-1" dir="ltr">{phone || '—'}</p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-xl">📞</div>
                </div>

                <div className="p-4 rounded-xl border border-gray-200 bg-white text-gray-700 flex items-center justify-between shadow-sm">
                    <div>
                        <p className="text-xs font-bold text-gray-400">{isArabic ? 'منصات التواصل' : 'Social Platforms'}</p>
                        <p className="text-2xl font-black text-gray-900 mt-1">{socialLinksCount} / 6</p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center text-xl">🌐</div>
                </div>
            </div>

            {/* Form Container */}
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8 space-y-8">
                {/* General Info */}
                <div className="space-y-4">
                    <h3 className="text-sm font-extrabold text-gray-900 border-b border-gray-100 pb-3 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#E91E63]"></span>
                        {isArabic ? 'المعلومات العامة' : 'General Information'}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div>
                            <label className="block font-bold text-gray-700 mb-1">
                                {isArabic ? 'اسم الشركة (بالعربية)' : 'Company Name (Arabic)'}
                            </label>
                            <input
                                type="text"
                                value={nameAr}
                                onChange={(e) => setNameAr(e.target.value)}
                                className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-xs font-bold text-gray-900 focus:border-[#E91E63] focus:ring-1 focus:ring-[#E91E63] outline-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="block font-bold text-gray-700 mb-1">
                                {isArabic ? 'اسم الشركة (بالإنجليزية)' : 'Company Name (English)'}
                            </label>
                            <input
                                type="text"
                                value={nameEn}
                                onChange={(e) => setNameEn(e.target.value)}
                                className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-xs font-bold text-gray-900 focus:border-[#E91E63] focus:ring-1 focus:ring-[#E91E63] outline-none"
                                required
                            />
                        </div>
                    </div>
                </div>

                {/* Contact and Pricing Info */}
                <div className="space-y-4">
                    <h3 className="text-sm font-extrabold text-gray-900 border-b border-gray-100 pb-3 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        {isArabic ? 'معلومات الاتصال والضريبة' : 'Contact & Tax Settings'}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                        <div>
                            <label className="block font-bold text-gray-700 mb-1">
                                {isArabic ? 'البريد الإلكتروني' : 'Email Address'}
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-xs font-medium text-gray-900 focus:border-[#E91E63] focus:ring-1 focus:ring-[#E91E63] outline-none"
                            />
                        </div>
                        <div>
                            <label className="block font-bold text-gray-700 mb-1">
                                {isArabic ? 'رقم الهاتف' : 'Phone Number'}
                            </label>
                            <input
                                type="text"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-xs font-medium text-gray-900 focus:border-[#E91E63] focus:ring-1 focus:ring-[#E91E63] outline-none"
                            />
                        </div>
                        <div>
                            <label className="block font-bold text-gray-700 mb-1">
                                {isArabic ? 'نسبة ضريبة القيمة المضافة (%)' : 'VAT Percentage (%)'}
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                max="100"
                                value={vatPercentage}
                                onChange={(e) => setVatPercentage(parseFloat(e.target.value) || 0)}
                                className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-xs font-bold text-gray-900 focus:border-[#E91E63] focus:ring-1 focus:ring-[#E91E63] outline-none"
                                required
                            />
                        </div>
                    </div>
                </div>

                {/* Social Media Links */}
                <div className="space-y-4">
                    <h3 className="text-sm font-extrabold text-gray-900 border-b border-gray-100 pb-3 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                        {isArabic ? 'روابط مواقع التواصل الاجتماعي والموقع الإلكتروني' : 'Social Links & Website'}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div>
                            <label className="block font-bold text-gray-700 mb-1">
                                {isArabic ? 'الموقع الإلكتروني' : 'Website URL'}
                            </label>
                            <input
                                type="url"
                                value={website}
                                onChange={(e) => setWebsite(e.target.value)}
                                placeholder="https://example.com"
                                className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-xs focus:border-[#E91E63] focus:ring-1 focus:ring-[#E91E63] outline-none"
                            />
                        </div>
                        <div>
                            <label className="block font-bold text-gray-700 mb-1">
                                Facebook Link
                            </label>
                            <input
                                type="url"
                                value={facebook}
                                onChange={(e) => setFacebook(e.target.value)}
                                placeholder="https://facebook.com/username"
                                className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-xs focus:border-[#E91E63] focus:ring-1 focus:ring-[#E91E63] outline-none"
                            />
                        </div>
                        <div>
                            <label className="block font-bold text-gray-700 mb-1">
                                Instagram Link
                            </label>
                            <input
                                type="url"
                                value={instagram}
                                onChange={(e) => setInstagram(e.target.value)}
                                placeholder="https://instagram.com/username"
                                className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-xs focus:border-[#E91E63] focus:ring-1 focus:ring-[#E91E63] outline-none"
                            />
                        </div>
                        <div>
                            <label className="block font-bold text-gray-700 mb-1">
                                Twitter / X Link
                            </label>
                            <input
                                type="url"
                                value={twitter}
                                onChange={(e) => setTwitter(e.target.value)}
                                placeholder="https://twitter.com/username"
                                className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-xs focus:border-[#E91E63] focus:ring-1 focus:ring-[#E91E63] outline-none"
                            />
                        </div>
                        <div>
                            <label className="block font-bold text-gray-700 mb-1">
                                Snapchat Link
                            </label>
                            <input
                                type="url"
                                value={snapchat}
                                onChange={(e) => setSnapchat(e.target.value)}
                                placeholder="https://snapchat.com/add/username"
                                className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-xs focus:border-[#E91E63] focus:ring-1 focus:ring-[#E91E63] outline-none"
                            />
                        </div>
                        <div>
                            <label className="block font-bold text-gray-700 mb-1">
                                TikTok Link
                            </label>
                            <input
                                type="url"
                                value={tiktok}
                                onChange={(e) => setTiktok(e.target.value)}
                                placeholder="https://tiktok.com/@username"
                                className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-xs focus:border-[#E91E63] focus:ring-1 focus:ring-[#E91E63] outline-none"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block font-bold text-gray-700 mb-1">
                                LinkedIn Link
                            </label>
                            <input
                                type="url"
                                value={linkedin}
                                onChange={(e) => setLinkedin(e.target.value)}
                                placeholder="https://linkedin.com/company/username"
                                className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-xs focus:border-[#E91E63] focus:ring-1 focus:ring-[#E91E63] outline-none"
                            />
                        </div>
                        <div>
                            <label className="block font-bold text-gray-700 mb-1">
                                Google Play Link (Android)
                            </label>
                            <input
                                type="url"
                                value={googlePlay}
                                onChange={(e) => setGooglePlay(e.target.value)}
                                placeholder="https://play.google.com/store/apps/details?id=..."
                                className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-xs focus:border-[#E91E63] focus:ring-1 focus:ring-[#E91E63] outline-none"
                            />
                        </div>
                        <div>
                            <label className="block font-bold text-gray-700 mb-1">
                                App Store Link (iOS)
                            </label>
                            <input
                                type="url"
                                value={appStore}
                                onChange={(e) => setAppStore(e.target.value)}
                                placeholder="https://apps.apple.com/app/..."
                                className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-xs focus:border-[#E91E63] focus:ring-1 focus:ring-[#E91E63] outline-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Branding / Logo */}
                <div className="space-y-4">
                    <h3 className="text-sm font-extrabold text-gray-900 border-b border-gray-100 pb-3 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        {isArabic ? 'شعار الشركة' : 'Company Logo'}
                    </h3>
                    <div className="flex flex-col md:flex-row items-center gap-6">
                        <div className="w-28 h-28 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50 shrink-0">
                            {logoPreview ? (
                                <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" />
                            ) : (
                                <span className="text-xs text-gray-400 font-bold">No Logo</span>
                            )}
                        </div>
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-gray-700 mb-2">
                                {isArabic ? 'تغيير الشعار' : 'Upload New Logo'}
                            </label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleLogoChange}
                                className="text-xs file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#FDF0F3] file:text-[#E91E63] hover:file:bg-[#FBE3E8]"
                            />
                            <p className="text-[11px] text-gray-400 mt-2 font-medium">
                                {isArabic ? 'الحد الأقصى للملف: 2 ميجابايت (PNG, JPG, SVG)' : 'Max file size: 2MB (PNG, JPG, SVG)'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="border-t border-gray-100 pt-4 flex justify-end">
                    <button
                        type="submit"
                        disabled={updateMutation.isPending}
                        className="px-5 py-2.5 rounded-lg bg-[#E91E63] hover:bg-[#D81B60] active:bg-[#C2185B] text-white font-bold text-xs transition shadow-sm disabled:opacity-50"
                    >
                        {updateMutation.isPending 
                            ? (isArabic ? 'جاري الحفظ...' : 'Saving...') 
                            : (isArabic ? 'حفظ التعديلات' : 'Save Changes')
                        }
                    </button>
                </div>
            </form>
        </div>
    );
}
