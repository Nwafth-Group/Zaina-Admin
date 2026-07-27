import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axios.js';

// Default map center: Egypt (Cairo)
const EGYPT_CENTER = { lat: 30.0444, lng: 31.2357 };

export default function ServiceZoneFormPage() {
    const { id } = useParams();
    const isEdit = Boolean(id);
    const navigate = useNavigate();
    const { i18n } = useTranslation('common');
    const isArabic = i18n.language?.startsWith('ar');
    const queryClient = useQueryClient();

    const [form, setForm] = useState({
        name: '',
        governorate: '',
        city: '',
        status: 'active',
        polygon_coordinates: [],
    });

    const mapRef = useRef(null);
    const googleMapRef = useRef(null);
    const polygonRef = useRef(null);
    const markersRef = useRef([]);
    const hasFittedBoundsRef = useRef(false);

    const { data: zoneData, isLoading: isLoadingZone } = useQuery({
        queryKey: ['service-zone-details', id],
        queryFn: async () => (await axiosInstance.get(`/admin/service-zones/${id}`)).data,
        enabled: isEdit,
    });

    useEffect(() => {
        if (isEdit && zoneData?.data) {
            const z = zoneData.data;
            const coords = z.polygon_coordinates || [];
            setForm({
                name: z.name || '',
                governorate: z.governorate || '',
                city: z.city || '',
                status: z.status || 'active',
                polygon_coordinates: coords,
            });

            if (googleMapRef.current && coords.length > 0) {
                renderPolygonOnMap(coords, true);
                hasFittedBoundsRef.current = true;
            }
        }
    }, [isEdit, zoneData]);

    // Initialize Google Maps with Click-to-Pin Polygon Drawing
    useEffect(() => {
        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
        if (!apiKey) return;

        const loadScript = () => {
            window.initZoneMapCallback = () => {
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
                script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async&callback=initZoneMapCallback`;
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

            const coordsToUse = form.polygon_coordinates.length > 0 
                ? form.polygon_coordinates 
                : (zoneData?.data?.polygon_coordinates || []);

            const initialCenter = (coordsToUse && coordsToUse.length > 0)
                ? { lat: Number(coordsToUse[0].lat ?? coordsToUse[0][0]), lng: Number(coordsToUse[0].lng ?? coordsToUse[0][1]) }
                : EGYPT_CENTER;

            const map = new window.google.maps.Map(mapRef.current, {
                center: initialCenter,
                zoom: (coordsToUse && coordsToUse.length > 0) ? 12 : 7,
                mapTypeControl: false,
                streetViewControl: false,
            });
            googleMapRef.current = map;

            // Map click handler to add points
            map.addListener('click', (e) => {
                const newPoint = { lat: e.latLng.lat(), lng: e.latLng.lng() };
                setForm((prev) => {
                    const updated = [...prev.polygon_coordinates, newPoint];
                    return { ...prev, polygon_coordinates: updated };
                });
            });

            if (coordsToUse && coordsToUse.length > 0) {
                renderPolygonOnMap(coordsToUse, true);
                hasFittedBoundsRef.current = true;
            }
        };

        loadScript();
    }, [isLoadingZone]);

    // Re-render markers and polygon lines whenever polygon_coordinates change
    useEffect(() => {
        if (googleMapRef.current && form.polygon_coordinates) {
            const shouldFit = !hasFittedBoundsRef.current && form.polygon_coordinates.length > 0;
            renderPolygonOnMap(form.polygon_coordinates, shouldFit);
            if (shouldFit) {
                hasFittedBoundsRef.current = true;
            }
        }
    }, [form.polygon_coordinates]);

    const renderPolygonOnMap = (coords, isInitial = false) => {
        const map = googleMapRef.current;
        if (!map || !window.google?.maps) return;

        // Clear existing markers
        markersRef.current.forEach((m) => m.setMap(null));
        markersRef.current = [];

        // Clear existing polygon
        if (polygonRef.current) {
            polygonRef.current.setMap(null);
            polygonRef.current = null;
        }

        if (!coords || coords.length === 0) return;

        const path = coords.map((p) => ({
            lat: Number(p.lat ?? p[0]),
            lng: Number(p.lng ?? p[1]),
        }));

        const bounds = new window.google.maps.LatLngBounds();

        // Render point markers
        path.forEach((p, idx) => {
            bounds.extend(p);
            const marker = new window.google.maps.Marker({
                position: p,
                map,
                draggable: true,
                label: { text: String(idx + 1), color: '#ffffff', fontWeight: 'bold', fontSize: '11px' },
                icon: {
                    path: window.google.maps.SymbolPath.CIRCLE,
                    scale: 14,
                    fillColor: '#E91E63',
                    fillOpacity: 1,
                    strokeWeight: 2,
                    strokeColor: '#ffffff',
                },
            });

            marker.addListener('dragend', (e) => {
                const newLat = e.latLng.lat();
                const newLng = e.latLng.lng();
                setForm((prev) => {
                    const newCoords = [...prev.polygon_coordinates];
                    newCoords[idx] = { lat: newLat, lng: newLng };
                    return { ...prev, polygon_coordinates: newCoords };
                });
            });

            markersRef.current.push(marker);
        });

        // Render Polygon overlay
        if (path.length >= 2) {
            const poly = new window.google.maps.Polygon({
                paths: path,
                fillColor: '#E91E63',
                fillOpacity: 0.25,
                strokeColor: '#E91E63',
                strokeWeight: 2,
                map,
            });
            polygonRef.current = poly;
        }

        // Fit bounds if coords exist
        if (path.length > 0 && isInitial) {
            if (path.length === 1) {
                map.setCenter(path[0]);
                map.setZoom(13);
            } else {
                map.fitBounds(bounds);
            }
        }
    };

    const handleClearPoints = () => {
        setForm((prev) => ({ ...prev, polygon_coordinates: [] }));
    };

    const handleUndoLastPoint = () => {
        setForm((prev) => ({
            ...prev,
            polygon_coordinates: prev.polygon_coordinates.slice(0, -1),
        }));
    };

    const mutation = useMutation({
        mutationFn: async (payload) => {
            if (isEdit) {
                return (await axiosInstance.put(`/admin/service-zones/${id}`, payload)).data;
            }
            return (await axiosInstance.post('/admin/service-zones', payload)).data;
        },
        onSuccess: (res) => {
            toast.success(res?.message || (isArabic ? 'تم حفظ منطقة التغطية بنجاح' : 'Zone saved successfully'));
            queryClient.invalidateQueries({ queryKey: ['service-zones'] });
            navigate('/service-zones');
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || (isArabic ? 'حدث خطأ أثناء الحفظ' : 'Error saving zone'));
        },
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.polygon_coordinates || form.polygon_coordinates.length < 3) {
            toast.error(isArabic ? 'يرجى النقر على الخريطة لتحديد 3 نقاط على الأقل لبناء مضلع المنطقة' : 'Please click on the map to set at least 3 boundary points');
            return;
        }
        mutation.mutate(form);
    };

    if (isEdit && isLoadingZone) {
        return <div className="p-8 font-bold text-center text-gray-500">{isArabic ? 'جاري التحميل...' : 'Loading...'}</div>;
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6 font-main py-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-black text-gray-900">
                        {isEdit ? (isArabic ? 'تعديل منطقة التغطية' : 'Edit Service Zone') : (isArabic ? 'رسم منطقة تغطية جديدة' : 'Create Service Zone')}
                    </h1>
                    <p className="text-xs text-gray-500 mt-1">
                        {isArabic ? 'حدد اسم المنطقة، وانقر على الخريطة لإضافة نقاط المضلع الجغرافي (افتراضياً: مصر).' : 'Set zone name and click map to place polygon pins (Default: Egypt).'}
                    </p>
                </div>
                <button
                    onClick={() => navigate('/service-zones')}
                    className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl text-xs font-bold transition"
                >
                    {isArabic ? 'إلغاء' : 'Cancel'}
                </button>
            </div>

            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">{isArabic ? 'اسم المنطقة *' : 'Zone Name *'}</label>
                        <input
                            type="text"
                            required
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs focus:ring-1 focus:ring-[#E91E63] focus:border-[#E91E63] outline-none"
                            placeholder={isArabic ? 'مثال: منطقة القاهرة الجديدة والتجمع' : 'e.g. New Cairo Zone'}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">{isArabic ? 'المحافظة (لتجميع شفتات النقل)' : 'Governorate'}</label>
                        <input
                            type="text"
                            value={form.governorate}
                            onChange={(e) => setForm({ ...form, governorate: e.target.value })}
                            className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs focus:ring-1 focus:ring-[#E91E63] focus:border-[#E91E63] outline-none"
                            placeholder={isArabic ? 'مثال: القاهرة' : 'e.g. Cairo'}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">{isArabic ? 'المدينة الوصفية' : 'City'}</label>
                        <input
                            type="text"
                            value={form.city}
                            onChange={(e) => setForm({ ...form, city: e.target.value })}
                            className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs focus:ring-1 focus:ring-[#E91E63] focus:border-[#E91E63] outline-none"
                            placeholder={isArabic ? 'مثال: التجمع الخامس' : 'e.g. 5th Settlement'}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">{isArabic ? 'حالة المنطقة *' : 'Status *'}</label>
                        <select
                            value={form.status}
                            onChange={(e) => setForm({ ...form, status: e.target.value })}
                            className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs focus:ring-1 focus:ring-[#E91E63] focus:border-[#E91E63] outline-none bg-white"
                        >
                            <option value="active">{isArabic ? 'مفعلة (تغطي الحجوزات)' : 'Active'}</option>
                            <option value="inactive">{isArabic ? 'معطلة' : 'Inactive'}</option>
                        </select>
                    </div>
                </div>

                {/* Google Maps Pin Picker & Controls */}
                <div className="space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                            <label className="block text-xs font-bold text-gray-800">
                                📍 {isArabic ? 'تحديد حدود المنطقة بالنقر على الخريطة (Default: Egypt)' : 'Click map to place pins'}
                            </label>
                            <p className="text-[11px] text-gray-500">
                                {isArabic ? 'انقر في أي مكان على الخريطة لوضع دبابيس الزوايا، ويمكنك سحب أي دبوس لتعديل موقعه.' : 'Click anywhere on map to add vertex pins. Drag any pin to adjust.'}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={handleUndoLastPoint}
                                disabled={form.polygon_coordinates.length === 0}
                                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition disabled:opacity-40"
                            >
                                ↩️ {isArabic ? 'التراجع عن آخر نقطة' : 'Undo Last Pin'}
                            </button>
                            <button
                                type="button"
                                onClick={handleClearPoints}
                                disabled={form.polygon_coordinates.length === 0}
                                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold transition disabled:opacity-40"
                            >
                                🗑️ {isArabic ? 'مسح كل النقاط' : 'Clear All'}
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center justify-between text-xs font-bold px-1">
                        <span className="text-[#E91E63]">
                            {form.polygon_coordinates.length} {isArabic ? 'نقاط محددة' : 'Pins Set'}
                            {form.polygon_coordinates.length >= 3 ? (
                                <span className="ms-2 text-emerald-600">✓ {isArabic ? 'مضلع مكتمل' : 'Polygon Complete'}</span>
                            ) : (
                                <span className="ms-2 text-amber-600">({isArabic ? 'يلزم 3 نقاط على الأقل' : 'at least 3 pins required'})</span>
                            )}
                        </span>
                    </div>

                    <div ref={mapRef} className="w-full h-96 rounded-2xl border border-gray-200 overflow-hidden shadow-inner bg-gray-100" />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                    <button
                        type="button"
                        onClick={() => navigate('/service-zones')}
                        className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-200 transition"
                    >
                        {isArabic ? 'إلغاء' : 'Cancel'}
                    </button>
                    <button
                        type="submit"
                        disabled={mutation.isLoading}
                        className="px-6 py-2.5 bg-[#E91E63] text-white rounded-xl text-xs font-bold hover:bg-[#D81B60] transition shadow-md disabled:opacity-50"
                    >
                        {mutation.isLoading ? (isArabic ? 'جاري الحفظ...' : 'Saving...') : (isArabic ? 'حفظ منطقة التغطية' : 'Save Service Zone')}
                    </button>
                </div>
            </form>
        </div>
    );
}
