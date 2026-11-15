import React ,{Suspense} from 'react'
import { RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'

// استدعاء ملف الـ routes اللي عملته
// ملاحظة: تأكد إنك عامل export للـ router من ملف route.jsx
import { router } from "./route.jsx" 

// تعريف وتجهيز الـ QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      refetchOnWindowFocus: true,
      refetchOnMount: true,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>

      <Toaster 
        position="top-center" // بتقدر تغيرها لـ top-right أو bottom-right
        toastOptions={{
          duration: 3000, // يختفي بعد 3 ثواني
          style: {
            fontFamily: 'inherit', // عشان ياخذ نفس خط التطبيق
            borderRadius: '10px',
            background: '#333',
            color: '#fff',
          },
          // تصميم خاص لرسائل النجاح
          success: {
            style: {
              background: '#ecfdf5', // أخضر فاتح
              color: '#047857', // أخضر غامق
              border: '1px solid #a7f3d0',
            },
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          // تصميم خاص لرسائل الخطأ
          error: {
            style: {
              background: '#fef2f2',
              color: '#b91c1c',
              border: '1px solid #fecaca',
            },
          },
        }}
      />


      <Suspense fallback={<div className="h-screen flex items-center justify-center">جاري التحميل...</div>}>
        <RouterProvider router={router} />
      </Suspense>


    </QueryClientProvider>
  )
}