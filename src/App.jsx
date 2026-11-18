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
        position="top-center"
        toastOptions={{
          duration: 3500,
          style: {
            fontFamily: 'inherit',
            borderRadius: '12px',
            background: '#1F2937',
            color: '#fff',
            maxWidth: '540px',
            fontSize: '13px',
            lineHeight: '1.5',
            padding: '12px 16px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          },
          // تصميم خاص لرسائل النجاح
          success: {
            style: {
              background: '#ecfdf5',
              color: '#047857',
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