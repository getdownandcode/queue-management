import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { getToken } from './api';
import Login from './pages/Login';
import Queues from './pages/Queues';
import QueueDetail from './pages/QueueDetail';
import Dashboard from './pages/Dashboard';
import './styles.css';
function Protected({ children }) { return getToken() ? children : <Navigate to="/login" replace />; }
createRoot(document.getElementById('root')).render(<React.StrictMode><BrowserRouter><Routes><Route path="/login" element={<Login />} /><Route path="/" element={<Navigate to="/queues" replace />} /><Route path="/queues" element={<Protected><Queues /></Protected>} /><Route path="/queues/:id" element={<Protected><QueueDetail /></Protected>} /><Route path="/dashboard" element={<Protected><Dashboard /></Protected>} /><Route path="*" element={<Navigate to="/queues" replace />} /></Routes></BrowserRouter></React.StrictMode>);
