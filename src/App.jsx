import React from 'react'
import { RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// استدعاء ملف الـ routes اللي عملته
// ملاحظة: تأكد إنك عامل export للـ router من ملف route.jsx
import { router } from "./route.jsx" 

// تعريف وتجهيز الـ QueryClient
const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}