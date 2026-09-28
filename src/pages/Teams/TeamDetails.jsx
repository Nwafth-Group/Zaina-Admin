import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axios.js';
import { hasPermission } from '../../utils/permissions.js';
import TeamActionModal from './TeamActionModal.jsx';

const STATUS_STYLES = {
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    inactive: 'bg-gray-100 text-gray-600 border-gray-200/80',
};

const StatCard = ({ icon, label, value, accent = 'text-gray-900', bg = 'bg-gray-50' }) => (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-3.5 shadow-2xs hover:shadow-xs transition-shadow">
        {icon && (
            <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center shrink-0 border border-gray-100`}>
                {icon}
            </div>
        )}
        <div className="min-w-0">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider truncate">{label}</p>
            <p className={`text-xl font-black ${accent} mt-0.5`}>{value}</p>
        </div>
    </div>
);

const InfoItem = ({ icon, label, value, highlight = false, isLink = false, onClick = null }) => (
    <div className="flex items-start gap-3 p-3.5 bg-gray-50/60 hover:bg-gray-50 border border-gray-100 rounded-2xl transition-colors">
        {icon && (
            <div className="w-8 h-8 rounded-xl bg-white border border-gray-200/60 flex items-center justify-center text-gray-500 shrink-0 shadow-2xs">
                {icon}
            </div>
        )}
        <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
            {isLink && onClick ? (
                <button
                    type="button"
                    onClick={onClick}
                    className="text-sm font-extrabold text-[#E91E63] hover:underline truncate block text-start outline-none"
                >
                    {value ?? '—'}
                </button>
            ) : (
                <p className={`text-sm ${highlight ? 'font-extrabold text-gray-900' : 'font-bold text-gray-700'} truncate`}>
                    {value ?? '—'}
                </p>
            )}
        </div>
    </div>
);

export default function TeamDetails() {
    const { id: teamId } = useParams();
    const navigate = useNavigate();
    const { i18n } = useTranslation();
    const isArabic = i18n.language?.startsWith('ar');
    const queryClient = useQueryClient();

    const [activeTab, setActiveTab] = useState('overview'); // overview | members | services
    const [editModalOpen, setEditModalOpen] = useState(false);

    // Fetch team details
    const { data: team, isLoading, isError } = useQuery({
        queryKey: ['team-details', teamId],
        queryFn: async () => {
            const res = await axiosInstance.get(`/admin/teams/${teamId}`);
            return res.data?.data;
        },
        enabled: !!teamId,
    });

    // Toggle status mutation
    const toggleStatusMutation = useMutation({
        mutationFn: async () => {
            const newStatus = team.status === 'active' ? 'inactive' : 'active';
            return axiosInstance.put(`/admin/teams/${teamId}`, {
                name_ar: team.name_ar,
                name_en: team.name_en,
                code: team.code,
                status: newStatus,
            });
        },
        onSuccess: () => {
            toast.success(isArabic ? 'تم تحديث حالة الفريق بنجاح' : 'Team status updated successfully');
            queryClient.invalidateQueries({ queryKey: ['team-details', teamId] });
            queryClient.invalidateQueries({ queryKey: ['teams'] });
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || (isArabic ? 'فشل تحديث حالة الفريق' : 'Failed to update team status'));
        },
    });

    if (isLoading) {
        return (
            <div className="py-24 flex flex-col items-center justify-center gap-3">
                <div className="w-10 h-10 border-4 border-[#E91E63] border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs font-bold text-gray-400">{isArabic ? 'جاري تحميل تفاصيل الفريق...' : 'Loading team details...'}</p>
            </div>
        );
    }

    if (isError || !team) {
        return (
            <div className="p-8 text-center bg-white rounded-3xl border border-gray-100 space-y-3">
                <p className="text-sm font-bold text-rose-500">{isArabic ? 'لم يتم العثور على الفريق المطلوب.' : 'Team not found.'}</p>
                <button
                    type="button"
                    onClick={() => navigate('/teams')}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition"
                >
                    {isArabic ? 'العودة لقائمة الفرق' : 'Back to Teams'}
                </button>
            </div>
        );
    }

    const teamName = isArabic ? (team.name_ar || team.name_en) : (team.name_en || team.name_ar);
    const workers = team.workers || [];
    const services = team.services || [];

    const sideMenuItem = (key, label, iconPath, count = null) => {
        const active = activeTab === key;
        return (
            <button
                type="button"
                onClick={() => setActiveTab(key)}
                className={`flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all text-start w-full whitespace-nowrap outline-none ${
                    active ? 'bg-[#FDF0F3] text-[#E91E63] shadow-2xs' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                }`}
            >
                <div className="flex items-center gap-2.5">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={iconPath} />
                    </svg>
                    <span>{label}</span>
                </div>
                {count !== null && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${active ? 'bg-[#E91E63] text-white' : 'bg-gray-100 text-gray-600'}`}>
                        {count}
                    </span>
                )}
            </button>
        );
    };

    return (
        <div className="space-y-6 font-main max-w-7xl mx-auto pb-12">
            {/* Top Navigation & Breadcrumbs */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-3xl border border-gray-100 shadow-2xs">
                <div>
                    <button
                        onClick={() => navigate('/teams')}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-[#E91E63] transition-colors mb-1.5 outline-none group"
                    >
                        <svg className="w-4 h-4 transition-transform group-hover:-translate-x-0.5 rtl:group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                        </svg>
                        <span>{isArabic ? 'العودة لقائمة فرق العمل' : 'Back to Teams'}</span>
                    </button>
                    <div className="flex items-center gap-3">
                        <h2 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">
                            {teamName}
                        </h2>
                        <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-pink-50 text-[#E91E63] border border-pink-100">
                            #{team.code}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${STATUS_STYLES[team.status] || 'bg-gray-100 text-gray-600'}`}>
                            {team.status === 'active' ? (isArabic ? 'نشط' : 'Active') : (isArabic ? 'معطل' : 'Inactive')}
                        </span>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2.5 shrink-0">
                    {hasPermission('teams.edit') && (
                        <>
                            <button
                                type="button"
                                onClick={() => setEditModalOpen(true)}
                                className="bg-white border border-gray-200 text-gray-700 hover:text-[#E91E63] hover:border-[#E91E63] px-4 h-10 rounded-xl text-xs font-bold shadow-2xs hover:bg-pink-50/30 active:scale-95 transition-all flex items-center gap-2 outline-none"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                                </svg>
                                <span>{isArabic ? 'تعديل الفريق' : 'Edit Team'}</span>
                            </button>

                            <button
                                type="button"
                                disabled={toggleStatusMutation.isPending}
                                onClick={() => toggleStatusMutation.mutate()}
                                className={`px-4 h-10 rounded-xl text-xs font-bold transition-all flex items-center gap-2 outline-none ${
                                    team.status === 'active'
                                        ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                }`}
                            >
                                <span>
                                    {team.status === 'active'
                                        ? (isArabic ? 'تعطيل الفريق' : 'Deactivate Team')
                                        : (isArabic ? 'تفعيل الفريق' : 'Activate Team')}
                                </span>
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Quick Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                <StatCard
                    icon={<span className="text-xl">👥</span>}
                    bg="bg-indigo-50"
                    label={isArabic ? 'قوام الفريق (ذكور)' : 'Team Members (Male)'}
                    value={isArabic ? `${workers.length} عمال` : `${workers.length} Members`}
                    accent="text-indigo-600"
                />
                <StatCard
                    icon={<span className="text-xl">🛠️</span>}
                    bg="bg-pink-50"
                    label={isArabic ? 'الخدمات المتخصصة' : 'Specialized Services'}
                    value={services.length}
                    accent="text-[#E91E63]"
                />
                <StatCard
                    icon={<span className="text-xl">📅</span>}
                    bg="bg-blue-50"
                    label={isArabic ? 'إجمالي الحجوزات' : 'Total Bookings'}
                    value={team.bookings_count || 0}
                    accent="text-blue-600"
                />
                <StatCard
                    icon={<span className="text-xl">⚡</span>}
                    bg="bg-emerald-50"
                    label={isArabic ? 'الحالة التشغيلية' : 'Operational Status'}
                    value={team.status === 'active' ? (isArabic ? 'نشط ومتاح' : 'Active') : (isArabic ? 'معطل' : 'Inactive')}
                    accent={team.status === 'active' ? 'text-emerald-600' : 'text-gray-500'}
                />
            </div>

            {/* Main Content Area */}
            <div className="flex flex-col lg:flex-row gap-6 items-start">
                {/* Side Menu */}
                <div className="w-full lg:w-72 shrink-0 space-y-4">
                    <div className="bg-white rounded-3xl p-3 border border-gray-100 shadow-2xs space-y-1">
                        {sideMenuItem(
                            'overview',
                            isArabic ? 'بيانات الفريق والقواعد' : 'Team Overview',
                            'M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21c-2.676 0-5.216-.584-7.499-1.632z'
                        )}
                        {sideMenuItem(
                            'members',
                            isArabic ? 'أعضاء الفريق (العمال)' : 'Team Members',
                            'M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z',
                            workers.length
                        )}
                        {sideMenuItem(
                            'services',
                            isArabic ? 'الخدمات المتخصصة المسندة' : 'Assigned Services',
                            'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
                            services.length
                        )}
                    </div>

                    {/* Operational Rule Info Box */}
                    <div className="bg-indigo-50/70 border border-indigo-100 rounded-3xl p-5 text-xs text-indigo-900 space-y-2">
                        <div className="flex items-center gap-2 font-bold text-indigo-950">
                            <span>📌</span>
                            <span>{isArabic ? 'تشغيل الفرق' : 'Team Operations'}</span>
                        </div>
                        <p className="text-[11px] text-indigo-800 leading-relaxed">
                            {isArabic
                                ? 'فريق العمل التشغيلي يتكون من عمال ذكور مع إمكانية إسناد الفريق لعدة خدمات تخصصية (تنظيف كنب، خزانات، مكيفات، سجاد، إلخ).'
                                : 'Daily operational team consists of male workers with multi-service capability across specialized cleaning services (sofas, water tanks, ACs, carpets, etc.).'}
                        </p>
                    </div>
                </div>

                {/* Right Content Body */}
                <div className="flex-1 w-full min-w-0 space-y-6">
                    {/* Tab 1: Overview */}
                    {activeTab === 'overview' && (
                        <>
                            {/* Team Primary Info Card */}
                            <div className="bg-white rounded-3xl shadow-2xs border border-gray-100 p-6 md:p-7">
                                <h4 className="text-sm font-extrabold text-gray-900 mb-5 pb-3 border-b border-gray-100 flex items-center gap-2">
                                    <svg className="w-4 h-4 text-[#E91E63]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                                    </svg>
                                    <span>{isArabic ? 'بيانات الفريق الأساسية' : 'Team Basic Information'}</span>
                                </h4>

                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                    <InfoItem
                                        label={isArabic ? 'اسم الفريق (عربي)' : 'Team Name (Arabic)'}
                                        value={team.name_ar}
                                        highlight
                                    />
                                    <InfoItem
                                        label={isArabic ? 'اسم الفريق (إنجليزي)' : 'Team Name (English)'}
                                        value={team.name_en}
                                    />
                                    <InfoItem
                                        label={isArabic ? 'كود الفريق' : 'Team Code'}
                                        value={team.code}
                                        highlight
                                    />
                                    <InfoItem
                                        label={isArabic ? 'عدد أعضاء الفريق' : 'Workers Count'}
                                        value={`${workers.length} ${isArabic ? 'عمال ذكور' : 'male workers'}`}
                                    />
                                    <InfoItem
                                        label={isArabic ? 'عدد الخدمات المسندة' : 'Assigned Services'}
                                        value={`${services.length} ${isArabic ? 'خدمات' : 'services'}`}
                                    />
                                    <InfoItem
                                        label={isArabic ? 'تاريخ الإنشاء' : 'Created At'}
                                        value={team.created_at?.split(' ')[0] || '—'}
                                    />
                                </div>

                                {team.notes && (
                                    <div className="mt-5 pt-4 border-t border-gray-100">
                                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                                            {isArabic ? 'ملاحظات الفريق' : 'Team Notes'}
                                        </p>
                                        <p className="text-xs text-gray-700 bg-gray-50 p-4 rounded-2xl border border-gray-100 leading-relaxed font-medium">
                                            {team.notes}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Quick Workers Preview Card */}
                            <div className="bg-white rounded-3xl shadow-2xs border border-gray-100 p-6 md:p-7">
                                <div className="flex justify-between items-center mb-5 pb-3 border-b border-gray-100">
                                    <h4 className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
                                        <svg className="w-4 h-4 text-[#E91E63]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                                        </svg>
                                        <span>{isArabic ? `أعضاء الفريق (${workers.length} عمال ذكور)` : `Team Members (${workers.length} Male Workers)`}</span>
                                    </h4>
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('members')}
                                        className="text-xs font-bold text-[#E91E63] hover:underline outline-none"
                                    >
                                        {isArabic ? 'عرض كل الأعضاء →' : 'View all members →'}
                                    </button>
                                </div>

                                {workers.length === 0 ? (
                                    <div className="py-8 text-center border border-dashed border-gray-200 rounded-2xl text-gray-400 text-xs bg-gray-50/50">
                                        {isArabic ? 'لم يتم تعيين عمال لهذا الفريق بعد.' : 'No workers assigned to this team yet.'}
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        {workers.map((w) => (
                                            <div
                                                key={w.id}
                                                onClick={() => navigate(`/workers/${w.id}`)}
                                                className="p-4 bg-gray-50/60 hover:bg-gray-50 border border-gray-100 rounded-2xl cursor-pointer transition-all hover:border-[#E91E63]/30 group"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-[#FDF0F3] border border-pink-100 text-[#E91E63] flex items-center justify-center font-bold text-sm shrink-0 group-hover:scale-105 transition-transform">
                                                        {w.name?.charAt(0) || '?'}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-xs font-extrabold text-gray-900 group-hover:text-[#E91E63] transition-colors truncate">
                                                            {w.name}
                                                        </p>
                                                        <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                                                            {w.nationality || '—'} · ⭐ {w.rating || '5.0'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {/* Tab 2: Members Full List */}
                    {activeTab === 'members' && (
                        <div className="bg-white rounded-3xl shadow-2xs border border-gray-100 p-6 md:p-7">
                            <div className="flex justify-between items-center mb-5 pb-3 border-b border-gray-100">
                                <h4 className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
                                    <svg className="w-4 h-4 text-[#E91E63]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                                    </svg>
                                    <span>{isArabic ? 'قائمة أعضاء الفريق' : 'Team Members List'}</span>
                                </h4>
                                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-pink-50 text-[#E91E63] border border-pink-200">
                                    {workers.length} {isArabic ? 'عمال' : 'Workers'}
                                </span>
                            </div>

                            {workers.length === 0 ? (
                                <div className="py-12 text-center border border-dashed border-gray-200 rounded-2xl text-gray-400 text-xs bg-gray-50/50">
                                    {isArabic ? 'لم يتم تعيين عمال لهذا الفريق.' : 'No members assigned.'}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {workers.map((w) => (
                                        <div
                                            key={w.id}
                                            onClick={() => navigate(`/workers/${w.id}`)}
                                            className="p-4 bg-gray-50/60 hover:bg-gray-50 border border-gray-100 rounded-2xl cursor-pointer transition-all hover:border-[#E91E63]/30 group space-y-3"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-full bg-[#FDF0F3] border border-pink-100 text-[#E91E63] flex items-center justify-center font-black text-base shrink-0 group-hover:scale-105 transition-transform overflow-hidden">
                                                    {w.image ? (
                                                        <img src={w.image} alt={w.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        w.name?.charAt(0) || '?'
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-extrabold text-gray-900 group-hover:text-[#E91E63] transition-colors truncate">
                                                        {w.name}
                                                    </p>
                                                    <p className="text-xs text-gray-400 font-medium truncate mt-0.5" dir="ltr">
                                                        {w.phone_number || '—'}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100 text-[11px]">
                                                <div>
                                                    <span className="text-gray-400 block">{isArabic ? 'الجنسية' : 'Nationality'}</span>
                                                    <span className="font-bold text-gray-700">{w.nationality || '—'}</span>
                                                </div>
                                                <div>
                                                    <span className="text-gray-400 block">{isArabic ? 'التقييم' : 'Rating'}</span>
                                                    <span className="font-bold text-amber-500">⭐ {w.rating || '5.0'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Tab 3: Assigned Specialized Services */}
                    {activeTab === 'services' && (
                        <div className="bg-white rounded-3xl shadow-2xs border border-gray-100 p-6 md:p-7">
                            <div className="flex justify-between items-center mb-5 pb-3 border-b border-gray-100">
                                <h4 className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
                                    <svg className="w-4 h-4 text-[#E91E63]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <span>{isArabic ? 'الخدمات المتخصصة المسندة لهذا الفريق' : 'Assigned Specialized Services'}</span>
                                </h4>
                                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-pink-50 text-[#E91E63] border border-pink-200">
                                    {services.length} {isArabic ? 'خدمات' : 'Services'}
                                </span>
                            </div>

                            {services.length === 0 ? (
                                <div className="py-12 text-center border border-dashed border-gray-200 rounded-2xl text-gray-400 text-xs bg-gray-50/50">
                                    {isArabic ? 'لا توجد خدمات مسندة لهذا الفريق حالياً.' : 'No services assigned yet.'}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {services.map((s) => (
                                        <div
                                            key={s.id}
                                            onClick={() => navigate(`/services/${s.id}`)}
                                            className="p-4 bg-gray-50/60 hover:bg-gray-50 border border-gray-100 rounded-2xl cursor-pointer transition-all hover:border-[#E91E63]/30 group flex items-center justify-between"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-10 h-10 rounded-xl bg-pink-50 border border-pink-100 text-[#E91E63] flex items-center justify-center font-bold text-sm shrink-0">
                                                    🛠️
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-extrabold text-gray-900 group-hover:text-[#E91E63] transition-colors truncate">
                                                        {isArabic ? (s.name_ar || s.name_en) : (s.name_en || s.name_ar)}
                                                    </p>
                                                    <p className="text-[11px] font-mono text-gray-400 mt-0.5 truncate">
                                                        {s.service_code || `SERVICE-${s.id}`}
                                                    </p>
                                                </div>
                                            </div>

                                            <span className="text-xs font-bold text-[#E91E63] shrink-0">
                                                →
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Edit Team Modal */}
            {editModalOpen && (
                <TeamActionModal
                    teamToEdit={team}
                    isOpen={editModalOpen}
                    onClose={() => setEditModalOpen(false)}
                />
            )}
        </div>
    );
}
