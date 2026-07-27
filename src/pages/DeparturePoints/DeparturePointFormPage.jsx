import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axios.js';

// Default center: Egypt (Cairo)
const EGYPT_CENTER = { lat: 30.0444, lng: 31.2357 };

export default function DeparturePointFormPage() {
    const { id } = useParams();
    const isEdit = Boolean(id);
    const navigate = useNavigate();
    const { i18n } = useTranslation('common');
    const isArabic = i18n.language?.startsWith('ar');
    const queryClient = useQueryClient();

    const [form, setForm] = useState({
        name: '',
        address: '',
        latitude: EGYPT_CENTER.lat,
        longitude: EGYPT_CENTER.lng,
    });

    const mapRef = useRef(null);
    const googleMapRef = useRef(null);
    const markerRef = useRef(null);

    const { data: pointData, isLoading } = useQuery({
        queryKey: ['departure-point-details', id],
        queryFn: async () => (await axiosInstance.get(`/admin/departure-points/${id}`)).data,
        enabled: isEdit,
    });

    useEffect(() => {
        if (isEdit && pointData?.data) {
            const p = pointData.data;
            setForm({
                name: p.name || '',
                address: p.address || '',
                latitude: p.latitude || EGYPT_CENTER.lat,
                longitude: p.longitude || EGYPT_CENTER.lng,
            });
        }
    }, [isEdit, pointData]);

    // Google Maps Initialization
    useEffect(() => {
        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
        if (!apiKey) return;

        const loadScript = () => {
            window.initDepartureMapCallback = () => {
                if (window.google?.maps?.Map) {
                    initMap();
                }
            };

            if (window.google?.maps?.Map) {
                initMap();
                return;
            }

            const existingScript = document.getElementById('google-maps-script');
            if (!existingScript) {
                const script = document.createElement('script');
                script.id = 'google-maps-script';
                script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async&callback=initDepartureMapCallback`;
                script.async = true;
                script.defer = true;
                document.head.appendChild(script);
            } else {
                if (window.google?.maps?.Map) {
                    initMap();
                } else {
                    existingScript.addEventListener('load', () => {
                        setTimeout(() => {
                            if (window.google?.maps?.Map) initMap();
                        }, 200);
                    });
                }
            }
        };

        const initMap = () => {
            if (!mapRef.current) return;
            const center = { lat: Number(form.latitude), lng: Number(form.longitude) };

            const map = new window.google.maps.Map(mapRef.current, {
                center,
                zoom: 12,
                mapTypeControl: false,
                streetViewControl: false,
            });
            googleMapRef.current = map;

            const marker = new window.google.maps.Marker({
                position: center,
                map,
                draggable: true,
                title: isArabic ? 'موقع نقطة الانطلاق' : 'Departure Point Location',
            });
            markerRef.current = marker;

            marker.addListener('dragend', (e) => {
                const lat = e.latLng.lat();
                const lng = e.latLng.lng();
                setForm((prev) => ({ ...prev, latitude: lat, longitude: lng }));
            });

            map.addListener('click', (e) => {
                const lat = e.latLng.lat();
                const lng = e.latLng.lng();
                marker.setPosition({ lat, lng });
                setForm((prev) => ({ ...prev, latitude: lat, longitude: lng }));
            });
        };

        loadScript();
    }, [form.latitude, form.longitude]);

    const mutation = useMutation({
        mutationFn: async (payload) => {
            if (isEdit) {
                return (await axiosInstance.put(`/admin/departure-points/${id}`, payload)).data;
            }
            return (await axiosInstance.post('/admin/departure-points', payload)).data;
        },
        onSuccess: (res) => {
            toast.success(res?.message || (isArabic ? 'تم حفظ نقطة الانطلاق بنجاح' : 'Saved successfully'));
            queryClient.invalidateQueries({ queryKey: ['departure-points'] });
            navigate('/departure-points');
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || (isArabic ? 'حدث خطأ أثناء الحفظ' : 'Error saving departure point'));
        },
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        mutation.mutate(form);
    };

    if (isEdit && isLoading) {
        return <div className="p-8 font-bold text-center text-gray-500">{isArabic ? 'جاري التحميل...' : 'Loading...'}</div>;
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 font-main py-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-black text-gray-900">
                        {isEdit ? (isArabic ? 'تعديل نقطة الانطلاق' : 'Edit Departure Point') : (isArabic ? 'إضافة نقطة انطلاق جديدة' : 'Add Departure Point')}
                    </h1>
                    <p className="text-xs text-gray-500 mt-1">
                        {isArabic ? 'حدد اسم النقطة وموقعها الدقيق على Google Maps (افتراضياً: مصر).' : 'Set point name and click or drag map pin (Default: Egypt).'}
                    </p>
                </div>
                <button
                    onClick={() => navigate('/departure-points')}
                    className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl text-xs font-bold transition"
                >
                    {isArabic ? 'إلغاء' : 'Cancel'}
                </button>
            </div>

            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">{isArabic ? 'اسم النقطة *' : 'Point Name *'}</label>
                        <input
                            type="text"
                            required
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs focus:ring-1 focus:ring-[#E91E63] focus:border-[#E91E63] outline-none"
                            placeholder={isArabic ? 'مثال: سكن العاملات - القاهرة' : 'e.g. Workers Housing - Cairo'}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">{isArabic ? 'العنوان الوصفي' : 'Address Description'}</label>
                        <input
                            type="text"
                            value={form.address}
                            onChange={(e) => setForm({ ...form, address: e.target.value })}
                            className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs focus:ring-1 focus:ring-[#E91E63] focus:border-[#E91E63] outline-none"
                            placeholder={isArabic ? 'شارع التسعين - التجمع' : '90th St'}
                        />
                    </div>
                </div>

                {/* Google Maps Pin Picker */}
                <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center justify-between">
                        <span>{isArabic ? 'تحديد الموقع بالنقر أو السحب (Default: Egypt)' : 'Click map or drag pin to select location'}</span>
                        <span className="font-mono text-[11px] text-gray-500 font-normal">
                            Lat: {form.latitude.toFixed(5)}, Lng: {form.longitude.toFixed(5)}
                        </span>
                    </label>
                    <div ref={mapRef} className="w-full h-80 rounded-2xl border border-gray-200 overflow-hidden shadow-inner bg-gray-100" />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                    <button
                        type="button"
                        onClick={() => navigate('/departure-points')}
                        className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-200 transition"
                    >
                        {isArabic ? 'إلغاء' : 'Cancel'}
                    </button>
                    <button
                        type="submit"
                        disabled={mutation.isLoading}
                        className="px-6 py-2.5 bg-[#E91E63] text-white rounded-xl text-xs font-bold hover:bg-[#D81B60] transition shadow-md disabled:opacity-50"
                    >
                        {mutation.isLoading ? (isArabic ? 'جاري الحفظ...' : 'Saving...') : (isArabic ? 'حفظ نقطة الانطلاق' : 'Save Point')}
                    </button>
                </div>
            </form>
        </div>
    );
}
