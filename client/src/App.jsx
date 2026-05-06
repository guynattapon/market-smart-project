import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import axios from 'axios';
import {
    PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
    AreaChart, Area, XAxis, YAxis, CartesianGrid,
    BarChart, Bar
} from 'recharts';
import './App.css';
import * as XLSX from 'xlsx';

const API_URL = 'https://market-smart-project.onrender.com';
const api = axios.create({ baseURL: API_URL });

// 🌟 1. Component สำหรับสร้าง "แผง 1 ช่อง" (ดึงจาก DB ล้วนๆ ไม่มีตัวจำลองแล้ว)
const Stall = ({ stall, onClick }) => {
    let borderColor = '#10b981'; // 🟩 เขียว (ว่าง)
    let bgColor = 'rgba(16, 185, 129, 0.15)'; 
    
    if (stall.status === 'occupied') {
        borderColor = '#ef4444'; // 🟥 แดง (ไม่ว่าง)
        bgColor = 'rgba(239, 68, 68, 0.15)'; 
    } else if (stall.status === 'pending') {
        borderColor = '#f59e0b'; // 🟨 เหลือง (รอการอนุมัติ)
        bgColor = 'rgba(245, 158, 11, 0.15)'; 
    }

    return (
        <div 
            onClick={() => onClick(stall)}
            style={{
                border: `2px solid ${borderColor}`,
                backgroundColor: bgColor,
                color: borderColor,
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '900',
                fontSize: '13px',
                height: '55px',
                cursor: 'pointer',
                transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.1)';
                e.currentTarget.style.filter = 'brightness(0.95)';
            }}
            onMouseLeave={e => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
                e.currentTarget.style.filter = 'brightness(1)';
            }}
            title={`แผง ${stall.code} - ${stall.status === 'vacant' ? 'ว่าง' : stall.status === 'occupied' ? 'มีผู้เช่าแล้ว' : 'รออนุมัติ'}`}
        >
            {stall.code}
        </div>
    );
};

// 🌟 2. Component สำหรับโซนรายเดือน (A, B, C, D)
const MarketZone = ({ title, zoneCode, stalls, onClickStall }) => {
    // กรองเอาเฉพาะแผงที่มีในระบบจริง และเรียงลำดับตัวเลข
    const zoneStalls = stalls.filter(s => s.zone === zoneCode || s.subZone === zoneCode).sort((a, b) => {
        const numA = parseInt(a.code.replace(/\D/g, '')) || 0;
        const numB = parseInt(b.code.replace(/\D/g, '')) || 0;
        return numA - numB;
    });

    return (
        <div style={{ flex: '1 1 45%', backgroundColor: '#ffffff', padding: '25px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }}>
            <h3 style={{ textAlign: 'center', margin: '0 0 20px 0', color: '#1e293b', fontSize: '1.25rem', paddingBottom: '10px', borderBottom: '2px dashed #cbd5e1' }}>
                {title}
            </h3>
            {/* แสดงผล Grid 5 คอลัมน์ แผงไหลต่อกันอัตโนมัติ ลบแล้วแหว่งไปเลย */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
                {zoneStalls.map((stall, idx) => (
                    <Stall key={idx} stall={stall} onClick={onClickStall} />
                ))}
                {zoneStalls.length === 0 && (
                    <div style={{ gridColumn: 'span 5', textAlign: 'center', color: '#94a3b8', padding: '20px' }}>
                        ยังไม่มีข้อมูลแผงในโซนนี้
                    </div>
                )}
            </div>
        </div>
    );
};

// 🌟 3. Component สำหรับโซนรายวัน (E - N) - แสดงผล 15 แผงต่อแถว
const DailyMarketZone = ({ title, zoneCode, stalls, onClickStall }) => {
    const zoneStalls = stalls.filter(s => s.zone === zoneCode || s.subZone === zoneCode).sort((a, b) => {
        const numA = parseInt(a.code.replace(/\D/g, '')) || 0;
        const numB = parseInt(b.code.replace(/\D/g, '')) || 0;
        return numA - numB;
    });

    return (
        <div style={{ backgroundColor: '#ffffff', padding: '15px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '15px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px', fontWeight: 'bold', color: '#475569', fontSize: '1rem' }}>
                <span style={{ marginRight: '8px', fontSize: '1.2rem' }}>🎪</span> {title}
            </div>
            {/* 🌟 เปลี่ยนเป็นแสดงแถวละ 15 คอลัมน์ */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(15, 1fr)', gap: '10px' }}>
                {zoneStalls.map((stall, idx) => (
                    <Stall key={idx} stall={stall} onClick={onClickStall} />
                ))}
                {zoneStalls.length === 0 && (
                    <div style={{ gridColumn: 'span 15', color: '#94a3b8', padding: '10px' }}>
                        ยังไม่มีแผงในโซนนี้
                    </div>
                )}
            </div>
        </div>
    );
};

// ==========================================
// ส่วนฟังก์ชันหลักของระบบ (Main Application)
// ==========================================

const printInvoice = (inv) => {
    const printWindow = window.open('', '', 'width=800,height=800');
    const dateObj = new Date();
    const formattedDate = dateObj.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
    const formattedTime = dateObj.toLocaleTimeString('th-TH');

    printWindow.document.write(`
        <html>
            <head>
                <title>ใบเสร็จรับเงิน #${inv.id || inv.invoice_id || inv.booking_id}</title>
                <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;600;700&display=swap" rel="stylesheet">
                <style>
                    body { font-family: 'Sarabun', sans-serif; padding: 40px; color: #1e293b; background: #f1f5f9; display: flex; justify-content: center; }
                    .invoice-box { background: #fff; width: 100%; max-width: 600px; padding: 40px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); border-top: 8px solid #4f46e5; position: relative; overflow: hidden; }
                    .header { text-align: center; border-bottom: 2px dashed #cbd5e1; padding-bottom: 20px; margin-bottom: 25px; }
                    .logo { font-size: 40px; margin-bottom: 10px; }
                    .title { font-size: 26px; font-weight: 700; color: #0f172a; margin: 0; }
                    .subtitle { font-size: 14px; color: #64748b; margin-top: 5px; }
                    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; font-size: 15px; }
                    .info-box { background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; }
                    .info-label { color: #64748b; font-size: 13px; margin-bottom: 4px; }
                    .info-value { font-weight: 600; color: #0f172a; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                    th { border-bottom: 2px solid #cbd5e1; padding: 12px 8px; text-align: left; color: #475569; font-size: 14px; }
                    td { border-bottom: 1px solid #e2e8f0; padding: 15px 8px; font-size: 15px; }
                    .text-right { text-align: right; }
                    .total-section { margin-top: 20px; padding-top: 20px; border-top: 2px dashed #cbd5e1; text-align: right; }
                    .total-row { display: flex; justify-content: flex-end; margin-bottom: 10px; font-size: 16px; }
                    .total-row span:first-child { margin-right: 40px; color: #64748b; }
                    .grand-total { font-size: 24px; font-weight: 700; color: #4f46e5; margin-top: 10px; }
                    .stamp { position: absolute; right: 50px; top: 200px; border: 4px solid ${inv.status === 'paid' ? '#10b981' : inv.status === 'unpaid' ? '#ef4444' : '#f59e0b'}; color: ${inv.status === 'paid' ? '#10b981' : inv.status === 'unpaid' ? '#ef4444' : '#f59e0b'}; padding: 10px 25px; font-size: 28px; font-weight: 700; text-transform: uppercase; transform: rotate(-15deg); opacity: 0.15; border-radius: 8px; letter-spacing: 2px; pointer-events: none; }
                    .footer { text-align: center; margin-top: 50px; color: #94a3b8; font-size: 13px; }
                    @media print { body { background: #fff; padding: 0; } .invoice-box { box-shadow: none; border-top: none; } }
                </style>
            </head>
            <body>
                <div class="invoice-box">
                    <div class="stamp">${inv.status === 'paid' ? 'ชำระเงินแล้ว' : inv.status === 'unpaid' ? 'ค้างชำระ' : 'รอตรวจสอบ'}</div>
                    <div class="header">
                        <div class="logo">💎</div>
                        <h1 class="title">ตลาดทิพย์เกสร</h1>
                        <div class="subtitle">Tipgaysorn Market Smart Management</div>
                        <div style="margin-top: 15px; font-size: 18px; font-weight: 600; color: #334155;">ใบเสร็จรับเงิน / ใบแจ้งหนี้</div>
                    </div>
                    <div class="info-grid">
                        <div class="info-box">
                            <div class="info-label">ข้อมูลผู้เช่า (Customer)</div>
                            <div class="info-value">คุณ ${inv.tenant}</div>
                            <div class="info-label" style="margin-top: 10px;">รหัสแผง (Stall No.)</div>
                            <div class="info-value" style="font-size: 18px; color: #4f46e5;">${inv.stall_code}</div>
                        </div>
                        <div class="info-box">
                            <div class="info-label">เลขที่เอกสาร (Invoice No.)</div>
                            <div class="info-value">#${inv.id || inv.invoice_id || inv.booking_id}</div>
                            <div class="info-label" style="margin-top: 10px;">วันที่ทำรายการ (Date)</div>
                            <div class="info-value">${formattedDate} ${formattedTime}</div>
                        </div>
                    </div>
                    <table>
                        <thead>
                            <tr><th>ลำดับ</th><th>รายการ (Description)</th><th class="text-right">จำนวนเงิน (Amount)</th></tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style="text-align: center; color: #64748b;">1</td>
                                <td><div style="font-weight: 600;">ค่าเช่าพื้นที่และค่าบริการ</div><div style="font-size: 13px; color: #64748b; margin-top: 4px;">ประเภท: ${inv.type}</div></td>
                                <td class="text-right" style="font-weight: 600;">${(inv.amount || 0).toLocaleString()} ฿</td>
                            </tr>
                        </tbody>
                    </table>
                    <div class="total-section">
                        <div class="total-row"><span>ยอดรวมก่อนภาษี:</span><span style="min-width: 100px;">${(inv.amount || 0).toLocaleString()} ฿</span></div>
                        <div class="total-row grand-total"><span style="color: #0f172a;">ยอดสุทธิ (Net Total):</span><span style="min-width: 100px;">${(inv.amount || 0).toLocaleString()} ฿</span></div>
                    </div>
                    <div class="footer"><p>ขอบคุณที่ไว้วางใจใช้บริการตลาดทิพย์เกสร</p><p style="margin-top: 5px; font-size: 11px;">เอกสารฉบับนี้ถูกสร้างขึ้นโดยระบบคอมพิวเตอร์</p></div>
                </div>
                <script>setTimeout(() => { window.print(); }, 500);</script>
            </body>
        </html>
    `);
    printWindow.document.close();
};

function App() {
    const [currentUser, setCurrentUser] = useState(() => {
        const savedUser = localStorage.getItem('marketUser');
        return savedUser ? JSON.parse(savedUser) : null;
    });
    
    const [isRegistering, setIsRegistering] = useState(false);
    const [activeMenu, setActiveMenu] = useState('dashboard');
    const [activeTab, setActiveTab] = useState('monthly');

    const [loginForm, setLoginForm] = useState({ username: '', password: '' });
    const [regForm, setRegForm] = useState({ username: '', password: '', confirmPassword: '', fullName: '', phone: '', idCard: '' });

    const [stalls, setStalls] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [dashboardStats, setDashboardStats] = useState({ finance: { total_revenue: 0, total_unpaid: 0 }, zones: [], stalls: [] });
    
    const [usersList, setUsersList] = useState([]);
    const [searchTx, setSearchTx] = useState('');
    const [searchUser, setSearchUser] = useState('');
    const [showNotif, setShowNotif] = useState(false);

    const validateThaiID = (id) => {
        if (!id || id.length !== 13 || !/^\d{13}$/.test(id)) return false;
        let sum = 0;
        for (let i = 0; i < 12; i++) { sum += parseInt(id.charAt(i)) * (13 - i); }
        return (11 - (sum % 11)) % 10 === parseInt(id.charAt(12));
    };

    const fetchData = async () => {
        try {
            const [stallsRes, statsRes] = await Promise.all([
                api.get('/stalls'),
                currentUser?.role !== 'tenant' && currentUser ? api.get('/dashboard/stats').catch(() => ({ data: { finance: { total_revenue: 0, total_unpaid: 0 }, zones: [], stalls: [] } })) : { data: { finance: { total_revenue: 0, total_unpaid: 0 }, zones: [], stalls: [] } }
            ]);

            const mappedStalls = stallsRes.data.reduce((acc, s) => {
                if (!acc.some(item => item.id === s.stall_id)) {
                    let imagesArray = [];
                    if (s.stall_image_url) imagesArray = s.stall_image_url.split(',').map(url => `${API_URL}${url}`);

                    acc.push({
                        ...s,
                        id: s.stall_id,
                        code: s.stall_code,
                        zoneName: s.zone,
                        subZone: s.zone,
                        rentType: s.rent_type,
                        price: s.price,
                        status: s.status === 'reserved' ? 'pending' : s.status,
                        tenant_name: s.customer_name || '',
                        images: imagesArray
                    });
                }
                return acc;
            }, []);
            
            setStalls(mappedStalls);

            const sortTransactions = (a, b) => {
                const priority = { 'pending': 1, 'unpaid': 2, 'paid': 3, 'approved': 3, 'rejected': 4 };
                const priorityA = priority[a.status] || 99;
                const priorityB = priority[b.status] || 99;
                if (priorityA !== priorityB) return priorityA - priorityB;
                return parseInt(b.id.split('-')[1]) - parseInt(a.id.split('-')[1]);
            };

            if (currentUser) {
                if (currentUser.role !== 'tenant') {
                    setDashboardStats(statsRes.data);
                    const [bAll, iAll, uAll] = await Promise.all([
                        api.get('/bookings/all').catch(() => ({ data: [] })),
                        api.get('/invoices/all').catch(() => ({ data: [] })),
                        api.get('/users').catch(() => ({ data: [] }))
                    ]);
                    
                    setUsersList(uAll.data || []);
                    
                    let trans = [];
                    (bAll.data || []).forEach(b => trans.push({
                        id: `B-${b.booking_id}`, booking_id: b.booking_id, stall_code: b.stall_code, tenant: b.customer_name, amount: mappedStalls.find(s => s.id === b.stall_id)?.price || 0, status: b.status, type: 'Booking', cardUrl: b.id_card_image_url ? `${API_URL}${b.id_card_image_url}` : null, slipUrl: b.slip_image_url ? `${API_URL}${b.slip_image_url}` : null, isBooking: true, reason: b.rejection_reason
                    }));
                    
                    (iAll.data || []).forEach(i => {
                        let displayStatus = i.payment_status === 'pending_check' ? 'pending' : i.payment_status;

                        let wAmt = parseFloat(i.water_amount) || 0;
                        let eAmt = parseFloat(i.electric_amount) || 0;
                        
                        if (wAmt === 0 && i.water_meter_current !== undefined && i.water_meter_current !== null) {
                            const diffW = parseFloat(i.water_meter_current || 0) - parseFloat(i.water_meter_last || 0);
                            wAmt = diffW * parseFloat(i.water_unit_price || 18);
                        }
                        if (eAmt === 0 && i.electric_meter_current !== undefined && i.electric_meter_current !== null) {
                            const diffE = parseFloat(i.electric_meter_current || 0) - parseFloat(i.electric_meter_last || 0);
                            eAmt = diffE * parseFloat(i.electric_unit_price || 8);
                        }

                        trans.push({
                            id: `I-${i.invoice_id}`, invoice_id: i.invoice_id, stall_code: i.stall_code, tenant: i.customer_name || i.full_name, amount: i.total_amount, status: displayStatus, type: 'Invoice', slipUrl: i.payment_slip_url ? `${API_URL}${i.payment_slip_url}` : null, isBooking: false,
                            water_amount: Math.max(0, wAmt), electric_amount: Math.max(0, eAmt), reason: i.rejection_reason
                        });
                    });
                    
                    trans.sort(sortTransactions);
                    setTransactions(trans);
                } else {
                    const [myInvRes, myBookingsRes] = await Promise.all([
                        api.get(`/my-invoices/${currentUser.user_id}`).catch(() => ({ data: [] })),
                        api.get(`/my-bookings/${currentUser.user_id}`).catch(() => ({ data: [] }))
                    ]);
                    
                    let trans = [];

                    myInvRes.data.forEach(i => {
                        let wAmt = parseFloat(i.water_amount) || 0;
                        let eAmt = parseFloat(i.electric_amount) || 0;
                        if (wAmt === 0 && i.water_meter_current !== undefined && i.water_meter_current !== null) {
                            wAmt = (parseFloat(i.water_meter_current || 0) - parseFloat(i.water_meter_last || 0)) * parseFloat(i.water_unit_price || 18);
                        }
                        if (eAmt === 0 && i.electric_meter_current !== undefined && i.electric_meter_current !== null) {
                            eAmt = (parseFloat(i.electric_meter_current || 0) - parseFloat(i.electric_meter_last || 0)) * parseFloat(i.electric_unit_price || 8);
                        }
                        trans.push({
                            id: `I-${i.invoice_id}`, invoice_id: i.invoice_id, stall_code: i.stall_code, tenant: currentUser.name, amount: i.total_amount, status: i.payment_status === 'pending_check' ? 'pending' : (i.payment_status || 'unpaid'), type: 'Invoice', slipUrl: i.payment_slip_url ? `${API_URL}${i.payment_slip_url}` : null, isBooking: false, water_amount: Math.max(0, wAmt), electric_amount: Math.max(0, eAmt), reason: i.rejection_reason
                        })
                    });

                    myBookingsRes.data.forEach(b => trans.push({
                        id: `B-${b.booking_id}`, booking_id: b.booking_id, stall_code: b.stall_code, tenant: b.customer_name, amount: mappedStalls.find(s => s.id === b.stall_id)?.price || 0, status: b.status, type: 'Booking', cardUrl: b.id_card_image_url ? `${API_URL}${b.id_card_image_url}` : null, slipUrl: b.slip_image_url ? `${API_URL}${b.slip_image_url}` : null, isBooking: true, reason: b.rejection_reason
                    }));
                    
                    trans.sort(sortTransactions);
                    setTransactions(trans);
                }
            }
        } catch (err) { console.error(err); }
    };

    useEffect(() => { fetchData(); }, [currentUser]);

    const getStats = () => {
        const { finance, zones, stalls: stallStats } = dashboardStats;
        const paid = finance?.total_revenue || 0;
        const unpaid = finance?.total_unpaid || 0;
        
        const waterTotal = transactions.filter(t => t.type === 'Invoice' && t.status === 'paid').reduce((sum, t) => sum + (t.water_amount || 0), 0); 
        const electricTotal = transactions.filter(t => t.type === 'Invoice' && t.status === 'paid').reduce((sum, t) => sum + (t.electric_amount || 0), 0);

        const utilityChartData = [
            { name: 'ค่าน้ำ', value: waterTotal, color: '#3b82f6' },
            { name: 'ค่าไฟ', value: electricTotal, color: '#f59e0b' }
        ];

        const monthlyTenants = stalls.filter(s => s.rentType === 'monthly' && s.status === 'occupied').length;
        const dailyTenants = stalls.filter(s => s.rentType === 'daily' && s.status === 'occupied').length;
        const tenantChartData = [
            { name: 'รายเดือน', value: monthlyTenants },
            { name: 'รายวัน', value: dailyTenants }
        ];

        const occRate = stalls.length ? Math.round((stalls.filter(s => s.status === 'occupied').length / stalls.length) * 100) : 0;

        const sc = { vacant: 0, occupied: 0, pending: 0 };
        (stallStats || []).forEach(s => {
            if (s.status === 'vacant') sc.vacant += s.count;
            if (s.status === 'occupied') sc.occupied += s.count;
            if (s.status === 'reserved' || s.status === 'pending') sc.pending += s.count;
        });
        const pieData = [
            { name: 'ว่าง', value: sc.vacant, color: '#10b981' },
            { name: 'ไม่ว่าง', value: sc.occupied, color: '#ef4444' },
            { name: 'รออนุมัติ', value: sc.pending, color: '#f59e0b' }
        ].filter(d => d.value > 0);

        const barData = (zones || []).map(z => ({ name: z.zone || 'Unknown', value: z.revenue }));
        const revenueData = [{ name: 'ยอดรับแล้ว', value: paid }, { name: 'รอเก็บ', value: unpaid }];

        return { paid, unpaid, occRate, pieData, barData, revenueData, utilityChartData, tenantChartData };
    };
    const stats = getStats();

    const filteredTransactions = transactions.filter(t => 
        (t.tenant || '').toLowerCase().includes(searchTx.toLowerCase()) || 
        (t.stall_code || '').toLowerCase().includes(searchTx.toLowerCase()) ||
        (t.id || '').toLowerCase().includes(searchTx.toLowerCase())
    );

    const filteredUsers = usersList.filter(u => 
        (u.full_name || '').toLowerCase().includes(searchUser.toLowerCase()) ||
        (u.phone_number || '').toLowerCase().includes(searchUser.toLowerCase()) ||
        (u.username || '').toLowerCase().includes(searchUser.toLowerCase())
    );

    const handleExportExcel = () => {
        if (transactions.length === 0) return Swal.fire('ไม่มีข้อมูล', 'ยังไม่มีรายการธุรกรรมให้ดาวน์โหลดครับ', 'warning');
        const excelData = transactions.map(t => ({
            'รหัสอ้างอิง (ID)': t.id, 'รหัสแผง (Stall)': t.stall_code, 'ชื่อลูกค้า (Tenant)': t.tenant,
            'รายการ (Type)': t.type, 'ยอดเงิน (Amount)': t.amount,
            'สถานะ (Status)': t.status === 'paid' ? 'ชำระแล้ว (Paid)' : t.status === 'unpaid' ? 'รอชำระ (Unpaid)' : t.status === 'pending' ? 'รอตรวจสอบสลิป' : t.status === 'approved' ? 'อนุมัติแล้ว (Approved)' : t.status === 'rejected' ? 'ถูกปฏิเสธ (Rejected)' : t.status
        }));
        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "รายงานธุรกรรม");
        XLSX.writeFile(workbook, `Tipgaysorn_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        if (!regForm.username || !regForm.password || !regForm.confirmPassword || !regForm.fullName || !regForm.phone || !regForm.idCard) return Swal.fire('ข้อมูลไม่ครบ', 'กรุณากรอกข้อมูลให้ครบทุกช่อง', 'warning');
        if (regForm.password !== regForm.confirmPassword) return Swal.fire('รหัสผ่านไม่ตรงกัน', 'กรุณาตรวจสอบรหัสผ่านอีกครั้ง', 'error');
        if (!validateThaiID(regForm.idCard)) return Swal.fire('ข้อมูลไม่ถูกต้อง', 'เลขบัตรประชาชนไม่ถูกต้อง', 'error');
        try {
            await api.post('/register', { username: regForm.username, password: regForm.password, full_name: regForm.fullName, phone_number: regForm.phone, id_card_number: regForm.idCard });
            Swal.fire('สมัครสำเร็จ!', 'เข้าสู่ระบบได้เลยครับ', 'success'); setIsRegistering(false); setRegForm({ username: '', password: '', confirmPassword: '', fullName: '', phone: '', idCard: '' });
        } catch (err) { Swal.fire('Error', err.response?.data?.message || err.message, 'error'); }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const res = await api.post('/login', { username: loginForm.username, password: loginForm.password });
            const userData = { ...res.data, name: res.data.full_name };
            setCurrentUser(userData);
            localStorage.setItem('marketUser', JSON.stringify(userData));
        } catch (err) { Swal.fire('Error', err.response?.data?.message || err.message, 'error'); }
    };

    // 🌟 ฟังก์ชันพิเศษสำหรับยิงเพิ่มแผงแบบกลุ่ม (อัปเกรดความฉลาด: ยิงแบบ Parallel รวดเร็วปรู๊ดปร๊าด!)
// 🌟 ฟังก์ชันพิเศษสร้างแผง (อัปเกรด: แบ่งยิงทีละชุด + โชว์ Progress ไม่ให้เว็บค้าง)
    // 🌟 ฟังก์ชันพิเศษสร้างแผง (อัปเกรด 3.0: ระบบหาช่องโหว่และอุดรอยรั่วอัตโนมัติ!)
    const handleBulkCreateStalls = async () => {
        const { value: form } = await Swal.fire({
            title: '⚡ สร้างแผงแบบกลุ่ม (Bulk Create)',
            html: `
            <div style="text-align: left;">
                <label style="font-size:0.9rem; font-weight:600; color:var(--dark); display:block; margin-bottom:5px;">เลือกโซนที่ต้องการสร้าง:</label>
                <select id="bulk-zone" class="swal2-select" style="width:100%; box-sizing:border-box; margin:0;">
                    <optgroup label="รายเดือน (Monthly)">
                        <option value="A">Zone A (อาหารสด)</option>
                        <option value="B">Zone B (ผักผลไม้)</option>
                        <option value="C">Zone C (อาหารปรุงสำเร็จ)</option>
                        <option value="D">Zone D (ของแห้ง/ชำ)</option>
                    </optgroup>
                    <optgroup label="รายวัน (Daily)">
                        <option value="E">Zone E (แผงรายวัน)</option>
                        <option value="F">Zone F (แผงรายวัน)</option>
                        <option value="G">Zone G (แผงรายวัน)</option>
                        <option value="H">Zone H (แผงรายวัน)</option>
                        <option value="I">Zone I (แผงรายวัน)</option>
                        <option value="J">Zone J (แผงรายวัน)</option>
                        <option value="K">Zone K (แผงรายวัน)</option>
                        <option value="L">Zone L (แผงรายวัน)</option>
                        <option value="M">Zone M (แผงรายวัน)</option>
                        <option value="N">Zone N (แผงรายวัน)</option>
                    </optgroup>
                </select>
                
                <label style="font-size:0.9rem; font-weight:600; color:var(--dark); display:block; margin-top:15px; margin-bottom:5px;">จำนวนแผงที่ต้องการอุดรอยรั่ว (เช่น 5, 10, 25):</label>
                <input id="bulk-amount" type="number" min="1" max="25" class="swal2-input" style="width:100%; box-sizing:border-box; margin:0;" placeholder="ระบุตัวเลขจำนวนแผง">
            </div>
            `,
            showCancelButton: true,
            confirmButtonText: '🚀 เริ่มสร้างแผง',
            cancelButtonText: 'ยกเลิก',
            preConfirm: () => {
                const zone = document.getElementById('bulk-zone').value;
                const amount = parseInt(document.getElementById('bulk-amount').value);
                if (!amount || amount <= 0) {
                    Swal.showValidationMessage('กรุณาระบุจำนวนแผงให้ถูกต้องครับ!');
                    return false;
                }
                return { zone, amount };
            }
        });

        if (form) {
            try {
                const z = form.zone;
                const amount = form.amount;
                const isDaily = ['E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N'].includes(z);
                const rentType = isDaily ? 'daily' : 'monthly';
                const defaultPrice = isDaily ? '150' : '3000'; 
                
                // 🌟 กำหนดเพดานสูงสุด (รายเดือนห้ามเกิน 25 แผง, รายวันห้ามเกิน 15 แผง)
                const maxStalls = isDaily ? 15 : 25; 
                
                // 1. เตรียมข้อมูลใส่ตะกร้า โดยสแกนหา "ช่องโหว่" ตั้งแต่เบอร์ 01
                const stallsToCreate = [];
                let addedCount = 0;

                for (let i = 1; i <= maxStalls; i++) {
                    if (addedCount >= amount) break; // สร้างครบโควต้าตามที่ User ขอแล้วก็เบรกเลย

                    const code = `${z}${String(i).padStart(2, '0')}`;
                    const exists = stalls.some(s => s.code === code);
                    
                    // ถ้าแผงเบอร์นี้แหว่งไป (หาไม่เจอ) ให้เตรียมสร้างใหม่มาอุดรู
                    if (!exists) {
                        const formData = new FormData();
                        formData.append('stall_code', code);
                        formData.append('zone', z);
                        formData.append('rent_type', rentType);
                        formData.append('price', defaultPrice);
                        formData.append('size', '3x3');
                        stallsToCreate.push(formData);
                        addedCount++; // บวกนับว่าอุดรูไป 1 แผงแล้ว
                    }
                }

                if (stallsToCreate.length === 0) {
                    return Swal.fire('แจ้งเตือน', `แผงโซน ${z} เต็มความจุที่ออกแบบไว้แล้ว (รายเดือน 25 / รายวัน 15) ไม่สามารถเพิ่มได้อีกครับ`, 'info');
                }

                // เปิดหน้าต่างโหลด
                Swal.fire({
                    title: 'กำลังสร้างแผง...',
                    html: `กำลังอุดช่องโหว่และเพิ่มข้อมูลลงระบบ<br><b>0 / ${stallsToCreate.length}</b> แผง ⏳`,
                    allowOutsideClick: false,
                    didOpen: () => Swal.showLoading()
                });

                // 2. ทยอยยิงข้อมูลเข้า Database ทีละชุด
                const chunkSize = 5; 
                let successCount = 0;

                for (let i = 0; i < stallsToCreate.length; i += chunkSize) {
                    const chunk = stallsToCreate.slice(i, i + chunkSize);
                    await Promise.all(chunk.map(data => api.post('/stalls', data)));
                    
                    successCount += chunk.length;
                    
                    Swal.update({
                        html: `กำลังอุดช่องโหว่และเพิ่มข้อมูลลงระบบ<br><b style="color: #4f46e5;">${successCount} / ${stallsToCreate.length}</b> แผง ⚡`
                    });
                }
                
                Swal.fire('สำเร็จ!', `สร้างแผงใหม่ลงโซน ${z} เพื่ออุดรอยรั่วจำนวน ${successCount} แผง เรียบร้อย!`, 'success');
                fetchData();

            } catch (err) {
                Swal.fire('เกิดข้อผิดพลาด', err.response?.data?.message || err.message, 'error');
            }
        }
    };
    const handleAddStall = async () => {
        const { value: form } = await Swal.fire({
            title: '➕ เพิ่มแผงใหม่',
            html: `
            <div style="text-align: left;">
                <label style="font-size:0.9rem; font-weight:600; color:var(--dark);">รหัสแผง (เช่น A01, E15):</label>
                <input id="new-code" class="swal2-input" style="margin-top:5px; width:100%; box-sizing:border-box;">
                <label style="font-size:0.9rem; font-weight:600; color:var(--dark); display:block; margin-top:15px;">ประเภท:</label>
                <select id="new-type" class="swal2-select" style="margin-top:5px; width:100%; box-sizing:border-box;"><option value="monthly">รายเดือน</option><option value="daily">รายวัน</option></select>
                <label style="font-size:0.9rem; font-weight:600; color:var(--dark); display:block; margin-top:15px;">โซน / แถว:</label>
                <select id="new-zone" class="swal2-select" style="margin-top:5px; width:100%; box-sizing:border-box;">
                    <option value="A">Zone A</option><option value="B">Zone B</option><option value="C">Zone C</option><option value="D">Zone D</option>
                </select>
                <label style="font-size:0.9rem; font-weight:600; color:var(--dark); display:block; margin-top:15px;">ราคา (บาท):</label>
                <input id="new-price" type="number" class="swal2-input" style="margin-top:5px; width:100%; box-sizing:border-box;">
                <label style="font-size:0.9rem; font-weight:600; color:var(--dark); display:block; margin-top:15px;">🖼️ รูปภาพแผง (เลือกได้หลายรูป):</label>
                <input id="new-images" type="file" class="swal2-file" multiple accept="image/*" style="width:100%; box-sizing:border-box; padding:10px;">
            </div>`,
            focusConfirm: false, showCancelButton: true, confirmButtonText: 'บันทึก',
            didOpen: () => {
                const typeSelect = document.getElementById('new-type');
                const zoneSelect = document.getElementById('new-zone');
                typeSelect.addEventListener('change', (e) => {
                    if (e.target.value === 'monthly') {
                        zoneSelect.innerHTML = `<option value="A">Zone A</option><option value="B">Zone B</option><option value="C">Zone C</option><option value="D">Zone D</option>`;
                    } else {
                        zoneSelect.innerHTML = `<option value="E">Zone E</option><option value="F">Zone F</option><option value="G">Zone G</option><option value="H">Zone H</option><option value="I">Zone I</option><option value="J">Zone J</option><option value="K">Zone K</option><option value="L">Zone L</option><option value="M">Zone M</option><option value="N">Zone N</option>`;
                    }
                });
            },
            preConfirm: () => {
                const code = document.getElementById('new-code').value;
                const priceStr = document.getElementById('new-price').value;
                if (!code || !priceStr) { Swal.showValidationMessage('กรุณากรอก "รหัสแผง" และ "ราคา" ให้ครบถ้วนครับ'); return false; }
                return { code, rentType: document.getElementById('new-type').value, zone: document.getElementById('new-zone').value, price: parseInt(priceStr), imageFiles: document.getElementById('new-images').files };
            }
        });

        if (form) {
            try {
                const formData = new FormData();
                formData.append('stall_code', form.code); formData.append('zone', form.zone); formData.append('rent_type', form.rentType); formData.append('price', form.price); formData.append('size', '3x3'); 
                if(form.imageFiles) { for (let i = 0; i < form.imageFiles.length; i++) formData.append('stallImages', form.imageFiles[i]); }
                await api.post('/stalls', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                Swal.fire('สำเร็จ!', 'เพิ่มแผงใหม่ลงระบบเรียบร้อยแล้ว', 'success'); fetchData(); 
            } catch (err) { Swal.fire('เพิ่มแผงไม่สำเร็จ', err.response?.data?.message || err.message, 'error'); }
        }
    };

    const handleAdminMenu = (stall) => {
        if (stall.status === 'pending') {
            const trans = transactions.find(i => i.stall_code === stall.code && i.status === 'pending' && i.isBooking);
            if (trans) return handleAdminVerify(trans);
        }
        Swal.fire({
            title: `จัดการแผง ${stall.code}`,
            html: `
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                <button id="btn-walkin" class="swal2-confirm swal2-styled" style="background:#27ae60; width:100%;">📝 จอง (Walk-in)</button>
                <button id="btn-meter" class="swal2-confirm swal2-styled" style="background:#f39c12; width:100%;">⚡ ออกบิลรวมมิเตอร์</button>
                <button id="btn-edit" class="swal2-confirm swal2-styled" style="background:#64748b; width:100%;">✏️ แก้ไข</button>
                <button id="btn-reset" class="swal2-confirm swal2-styled" style="background:#10b981; width:100%;">♻️ รีเซ็ตเป็นว่าง</button>
                <button id="btn-delete" class="swal2-confirm swal2-styled" style="background:#e74c3c; width:100%; grid-column: span 2;">🗑️ ลบแผง</button>
            </div>`,
            showConfirmButton: false, showCancelButton: true, cancelButtonText: 'ปิด',
            didOpen: () => {
                document.getElementById('btn-walkin').onclick = () => { Swal.clickConfirm(); handleWalkIn(stall); };
                document.getElementById('btn-meter').onclick = () => { Swal.clickConfirm(); handleMeterRecording(stall); };
                document.getElementById('btn-edit').onclick = () => { Swal.clickConfirm(); handleEditStall(stall); };
                document.getElementById('btn-reset').onclick = () => { Swal.clickConfirm(); handleResetStall(stall); };
                document.getElementById('btn-delete').onclick = () => { Swal.clickConfirm(); handleDeleteStall(stall); };
            }
        });
    };

    const handleWalkIn = async (stall) => {
        if (stall.status === 'occupied') return Swal.fire('ไม่ว่าง', 'แผงนี้มีผู้เช่าแล้ว', 'error');
        const today = new Date(); const minDate = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
        const { value: form } = await Swal.fire({
            title: `📝 Walk-in: ${stall.code}`,
            html: `
            <div style="text-align:left; font-size:0.9rem;">
                <p>โซน: <b>${stall.zoneName || stall.subZone || 'Daily'}</b></p>
                <div style="background:#f0fdf4; padding:10px; border:1px solid #bbf7d0; border-radius:8px; margin-bottom:15px; color:#166534;">💡 ระบบสร้าง User ให้อัตโนมัติ (Login: เบอร์โทร)</div>
                <label>ชื่อ-นามสกุล</label><input id="wk-name" class="swal2-input" style="width:100%; box-sizing:border-box;">
                <label>เบอร์โทร</label><input id="wk-phone" class="swal2-input" type="tel" style="width:100%; box-sizing:border-box;">
                <label>บัตรประชาชน</label><input id="wk-id" class="swal2-input" type="text" maxlength="13" oninput="this.value = this.value.replace(/[^0-9]/g, '')" style="width:100%; box-sizing:border-box;">
                <label>วันที่</label><input id="wk-date" type="date" min="${minDate}" class="swal2-input" style="width:100%; box-sizing:border-box;">
            </div>`,
            width: 500, showCancelButton: true, confirmButtonText: 'ยืนยัน',
            preConfirm: () => {
                const name = document.getElementById('wk-name').value; const phone = document.getElementById('wk-phone').value; const idcard = document.getElementById('wk-id').value; const date = document.getElementById('wk-date').value;
                if (!name || !phone || !idcard || !date) return Swal.showValidationMessage('กรอกให้ครบ');
                if (!validateThaiID(idcard)) { Swal.showValidationMessage('เลขบัตรประชาชนไม่ถูกต้อง!'); return false; }
                return { name, phone, idcard, date };
            }
        });
        if (form) {
            try {
                const formData = new FormData();
                formData.append('stall_id', stall.id); formData.append('full_name', form.name); formData.append('phone_number', form.phone); formData.append('id_card_number', form.idcard); formData.append('start_date', form.date);
                await api.post('/bookings/walk-in', formData);
                Swal.fire('สำเร็จ', `บันทึก Walk-in สำเร็จ`, 'success'); fetchData();
            } catch (err) { Swal.fire('Error', err.message, 'error'); }
        }
    };

    const handleMeterRecording = async (stall) => {
        if (stall.status !== 'occupied') return Swal.fire('ยังไม่มีคนเช่า', 'แผงนี้ยังไม่มีข้อมูลผู้เช่า ไม่สามารถออกบิลได้ครับ', 'warning');
        if (!stall.booking_id) return Swal.fire('Error', 'ไม่พบข้อมูลผู้เช่า (Booking ID)', 'error');
        const isDaily = stall.rentType === 'daily';
        const { value: form } = await Swal.fire({
            title: isDaily ? '💰 ออกบิล (แบบเหมาจ่ายรายวัน)' : '⚡ ออกบิลรวมมิเตอร์',
            html: isDaily ? `
                <div style="text-align:left; font-size: 0.9rem;">
                    <label style="font-weight:bold;">ค่าเช่าพื้นที่ (บาท)</label><input id="rent" type="number" value="${stall.price}" class="swal2-input" style="width:100%; box-sizing:border-box; margin-top:5px;">
                    <label style="font-weight:bold; display:block; margin-top:15px;">💧 ค่าน้ำเหมาจ่าย (บาท)</label><input id="flat-w" type="number" value="0" placeholder="ถ้าไม่เก็บใส่ 0" class="swal2-input" style="width:100%; box-sizing:border-box; margin-top:5px;">
                    <label style="font-weight:bold; display:block; margin-top:15px;">⚡ ค่าไฟเหมาจ่าย (บาท) *เช่น 20 บาท</label><input id="flat-e" type="number" value="20" class="swal2-input" style="width:100%; box-sizing:border-box; margin-top:5px;">
                </div>` : `
                <div style="text-align:left; font-size: 0.9rem;">
                    <div style="background:#fff7ed; padding:10px; border:1px solid #fed7aa; border-radius:8px; margin-bottom:15px; color:#c2410c;">⚠️ <b>คำเตือน:</b> กรุณากรอกเลขมิเตอร์ให้ถูกต้อง (เลขต้องไม่น้อยกว่าเดือนที่แล้ว)</div>
                    <label style="font-weight:bold;">ค่าเช่าพื้นที่ (บาท)</label><input id="rent" type="number" value="${stall.price}" class="swal2-input" style="width:100%; box-sizing:border-box; margin-top:5px;">
                    <label style="font-weight:bold; display:block; margin-top:15px;">💧 เลขมิเตอร์น้ำ ปัจจุบัน</label><input id="w" type="number" placeholder="ระบุเลขมิเตอร์น้ำ" class="swal2-input" style="width:100%; box-sizing:border-box; margin-top:5px;">
                    <label style="font-weight:bold; display:block; margin-top:15px;">⚡ เลขมิเตอร์ไฟ ปัจจุบัน</label><input id="e" type="number" placeholder="ระบุเลขมิเตอร์ไฟ" class="swal2-input" style="width:100%; box-sizing:border-box; margin-top:5px;">
                </div>`,
            showCancelButton: true, confirmButtonText: 'ออกบิลแจ้งหนี้', cancelButtonText: 'ยกเลิก',
            preConfirm: () => {
                if (isDaily) {
                    return { is_flat_rate: true, rent_price: document.getElementById('rent').value, flat_water: document.getElementById('flat-w').value, flat_electric: document.getElementById('flat-e').value };
                } else {
                    const w = document.getElementById('w').value; const e = document.getElementById('e').value;
                    if (!w || !e) { Swal.showValidationMessage('กรุณากรอกเลขมิเตอร์น้ำและไฟให้ครบถ้วน!'); return false; }
                    return { is_flat_rate: false, rent_price: document.getElementById('rent').value, water_current: w, electric_current: e };
                }
            }
        });
        if (form) {
            try {
                const payload = { booking_id: stall.booking_id, ...form };
                const res = await api.post('/invoices/create', payload);
                Swal.fire('สำเร็จ', `ออกบิลเรียบร้อย! ยอดรวม <b>${res.data.total.toLocaleString()}</b> บาท`, 'success'); fetchData();
            } catch (err) { Swal.fire('เกิดข้อผิดพลาด', err.response?.data?.message || err.message, 'error'); }
        }
    };

    const handleAdminVerify = (inv) => {
        Swal.fire({
            title: 'ตรวจสอบหลักฐาน',
            html: `
            <div style="text-align:left; font-size:0.9rem;">
                <p><b>ผู้เช่า:</b> ${inv.tenant}</p><p><b>ยอด:</b> ${inv.amount?.toLocaleString()} ฿</p><p><b>รายการ:</b> ${inv.type}</p><hr>
                <div style="display:flex; gap:10px; justify-content:center;">
                    ${inv.cardUrl ? `<div style="text-align:center;">บัตร ปชช.<br><img src="${inv.cardUrl}" style="width:150px;height:100px;object-fit:cover;border:1px solid #ccc;cursor:pointer;" onclick="const w=window.open(); w.document.write('<img src=\\'${inv.cardUrl}\\' style=\\'width:100%\\'>')"></div>` : ''}
                    <div style="text-align:center;">สลิปโอน<br>${inv.slipUrl ? `<img src="${inv.slipUrl}" style="width:150px;height:200px;object-fit:cover;border:1px solid #ccc;cursor:pointer;" onclick="const w=window.open(); w.document.write('<img src=\\'${inv.slipUrl}\\' style=\\'width:100%\\'>')">` : 'ไม่มี'}</div>
                </div>
            </div>`,
            width: 500, showDenyButton: true, confirmButtonText: '✅ อนุมัติ', denyButtonText: '❌ ปฏิเสธ', confirmButtonColor: '#10b981', denyButtonColor: '#ef4444'
        }).then(async (res) => {
            try {
                if (res.isConfirmed) {
                    if (inv.isBooking) await api.put(`/bookings/approve/${inv.booking_id}`); else await api.put(`/invoices/approve/${inv.invoice_id}`);
                    Swal.fire('อนุมัติแล้ว', 'ยอดเงินเข้าระบบเรียบร้อย', 'success'); fetchData();
                } else if (res.isDenied) {
                    const { value: rejectReason } = await Swal.fire({
                        title: 'ระบุเหตุผลที่ปฏิเสธ', input: 'textarea', inputPlaceholder: 'เช่น รูปสลิปไม่ชัดเจน, โอนเงินไม่ครบ...', showCancelButton: true, confirmButtonText: 'ยืนยันการปฏิเสธ', cancelButtonText: 'ยกเลิก',
                        inputValidator: (value) => { if (!value) return 'กรุณาระบุเหตุผลให้ผู้เช่าทราบด้วยครับ!' }
                    });
                    if (rejectReason) {
                        if (inv.isBooking) {
                            await api.put(`/bookings/reject/${inv.booking_id}`, { reason: rejectReason });
                            Swal.fire('ปฏิเสธการจอง', 'แจ้งเหตุผลและคืนสถานะแผงเรียบร้อย', 'info'); fetchData();
                        } else { Swal.fire('ปฏิเสธสลิป', 'ระบบยังไม่รองรับการปฏิเสธสลิป ฝั่ง Backend', 'info'); }
                    }
                }
            } catch (err) { Swal.fire('Error', err.message, 'error'); }
        });
    };

    const handleEditStall = async (stall) => {
        const isDaily = stall.rentType === 'daily';
        let initialZoneOptions = '';
        if (isDaily) {
            ['E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N'].forEach(z => { initialZoneOptions += `<option value="${z}" ${stall.zone === z ? 'selected' : ''}>Zone ${z}</option>`; });
        } else {
            ['A', 'B', 'C', 'D'].forEach(z => { initialZoneOptions += `<option value="${z}" ${stall.zone === z ? 'selected' : ''}>Zone ${z}</option>`; });
        }

        const { value: form } = await Swal.fire({
            title: `✏️ แก้ไขแผง ${stall.code}`,
            html: `
            <div style="text-align: left;">
                <label style="font-size:0.9rem; font-weight:600; color:var(--dark);">รหัสแผง:</label>
                <input id="edit-code" class="swal2-input" style="margin-top:5px; width:100%; box-sizing:border-box;" value="${stall.code}">
                
                <label style="font-size:0.9rem; font-weight:600; color:var(--dark); display:block; margin-top:15px;">ประเภท:</label>
                <select id="edit-type" class="swal2-select" style="margin-top:5px; width:100%; box-sizing:border-box;">
                    <option value="monthly" ${!isDaily ? 'selected' : ''}>รายเดือน</option>
                    <option value="daily" ${isDaily ? 'selected' : ''}>รายวัน</option>
                </select>
                
                <label style="font-size:0.9rem; font-weight:600; color:var(--dark); display:block; margin-top:15px;">โซน / แถว:</label>
                <select id="edit-zone" class="swal2-select" style="margin-top:5px; width:100%; box-sizing:border-box;">
                    ${initialZoneOptions}
                </select>
                
                <label style="font-size:0.9rem; font-weight:600; color:var(--dark); display:block; margin-top:15px;">ราคาเช่า (บาท):</label>
                <input id="edit-price" type="number" class="swal2-input" style="margin-top:5px; width:100%; box-sizing:border-box;" value="${stall.price}">

                <label style="font-size:0.9rem; font-weight:600; color:var(--dark); display:block; margin-top:15px;">🖼️ อัปโหลดรูปใหม่ (ถ้าไม่เลือกจะใช้รูปเดิม):</label>
                <input id="edit-images" type="file" class="swal2-file" multiple accept="image/*" style="width:100%; box-sizing:border-box; padding:10px;">
            </div>`,
            focusConfirm: false, showCancelButton: true, confirmButtonText: '💾 บันทึกการแก้ไข', cancelButtonText: 'ยกเลิก',
            didOpen: () => {
                const typeSelect = document.getElementById('edit-type');
                const zoneSelect = document.getElementById('edit-zone');
                typeSelect.addEventListener('change', (e) => {
                    if (e.target.value === 'monthly') {
                        zoneSelect.innerHTML = `<option value="A">Zone A</option><option value="B">Zone B</option><option value="C">Zone C</option><option value="D">Zone D</option>`;
                    } else {
                        zoneSelect.innerHTML = `<option value="E">Zone E</option><option value="F">Zone F</option><option value="G">Zone G</option><option value="H">Zone H</option><option value="I">Zone I</option><option value="J">Zone J</option><option value="K">Zone K</option><option value="L">Zone L</option><option value="M">Zone M</option><option value="N">Zone N</option>`;
                    }
                });
            },
            preConfirm: () => {
                const code = document.getElementById('edit-code').value; const priceStr = document.getElementById('edit-price').value; const zone = document.getElementById('edit-zone').value; const rentType = document.getElementById('edit-type').value;
                if (!code || !priceStr || !zone) { Swal.showValidationMessage('กรุณากรอกข้อมูลให้ครบทุกช่องครับ'); return false; }
                return { code, rentType, zone, price: parseInt(priceStr), imageFiles: document.getElementById('edit-images').files };
            }
        });
        if (form) {
            try {
                const formData = new FormData(); formData.append('stall_code', form.code); formData.append('zone', form.zone); formData.append('rent_type', form.rentType); formData.append('price', form.price); formData.append('size', stall.size || '3x3');
                if(form.imageFiles && form.imageFiles.length > 0) { for (let i = 0; i < form.imageFiles.length; i++) formData.append('stallImages', form.imageFiles[i]); }
                await api.put(`/stalls/${stall.id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                Swal.fire('สำเร็จ!', 'แก้ไขข้อมูลแผงเรียบร้อยแล้ว', 'success'); fetchData(); 
            } catch (err) { Swal.fire('แก้ไขไม่สำเร็จ', err.response?.data?.message || err.message, 'error'); }
        }
    };

    const handleResetStall = async (stall) => {
        try { await api.put(`/stalls/reset/${stall.id}`); fetchData(); Swal.fire('Reset', 'แผงเปลี่ยนสถานะเป็นว่าง', 'success'); } catch (err) { Swal.fire('Error', err.response?.data?.message || err.message, 'error'); }
    }

    const handleDeleteStall = (stall) => {
        Swal.fire({ title: 'ลบแผง?', icon: 'warning', showCancelButton: true }).then(async r => {
            if (r.isConfirmed) { try { await api.delete(`/stalls/${stall.id}`); fetchData(); Swal.fire('Deleted', '', 'success'); } catch (err) { Swal.fire('Error', err.response?.data?.message || err.message, 'error'); } }
        });
    };

    const handleEditUser = (user) => {
        Swal.fire({
            title: 'แก้ไขข้อมูลผู้ใช้งาน',
            html: `
                <div style="text-align: left; margin-bottom: 5px;">เบอร์โทรศัพท์ (Phone)</div><input id="edit-phone" class="swal2-input" value="${user.phone_number || ''}" placeholder="กรอกเบอร์โทรศัพท์" style="width: 100%; box-sizing: border-box;">
                <div style="text-align: left; margin-top: 15px; margin-bottom: 5px;">เลขบัตร ปชช. (ID Card)</div><input id="edit-idcard" class="swal2-input" type="text" maxlength="13" oninput="this.value = this.value.replace(/[^0-9]/g, '')" value="${user.id_card_number || ''}" placeholder="กรอกเลขบัตรประชาชน" style="width: 100%; box-sizing: border-box;">
            `,
            showCancelButton: true, confirmButtonText: 'บันทึกข้อมูล', cancelButtonText: 'ยกเลิก', confirmButtonColor: '#4f46e5',
            preConfirm: () => {
                const phone = document.getElementById('edit-phone').value; const idCard = document.getElementById('edit-idcard').value;
                if (!phone || !idCard) { Swal.showValidationMessage('กรุณากรอกข้อมูลให้ครบถ้วน'); return false; }
                if (!validateThaiID(idCard)) { Swal.showValidationMessage('เลขบัตรประชาชนไม่ถูกต้อง!'); return false; }
                return { phone_number: phone, id_card_number: idCard };
            }
        }).then(async (result) => {
            if (result.isConfirmed) { try { await api.put(`/users/${user.user_id}`, result.value); Swal.fire('สำเร็จ!', 'อัปเดตข้อมูลผู้ใช้งานเรียบร้อยแล้ว', 'success'); fetchData(); } catch (error) { Swal.fire('เกิดข้อผิดพลาด!', error.response?.data?.message || error.message, 'error'); } }
        });
    };

    const handleStallClick = (stall) => {
        if (['admin', 'owner'].includes(currentUser.role)) {
            handleAdminMenu(stall);
        } else {
            handleBooking(stall);
        }
    };

    const handleBooking = async (stall) => {
        if (stall.status !== 'vacant') return;
        const today = new Date(); const minDate = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
        const imgHtml = (stall.images && stall.images.length > 0)
            ? `<div style="display:flex; overflow-x:auto; gap:15px; padding-bottom:15px; scroll-snap-type: x mandatory; scrollbar-width: none;">${stall.images.map((img, idx) => `<div style="flex: 0 0 90%; scroll-snap-align: center; position: relative; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);"><img src="${img}" style="width:100%; height:220px; object-fit:cover; display:block;"><div style="position: absolute; bottom: 10px; right: 10px; background: rgba(0,0,0,0.6); color: white; padding: 3px 10px; border-radius: 12px; font-size: 0.8rem; font-weight: bold;">${idx + 1}/${stall.images.length}</div></div>`).join('')}</div>`
            : `<div style="height:200px; background:#f1f5f9; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#94a3b8; border-radius:16px; border: 2px dashed #cbd5e1; margin-bottom: 15px;"><span style="font-size: 2.5rem; margin-bottom: 5px;">🖼️</span><span style="font-weight: 500;">ยังไม่มีรูปภาพแผงนี้</span></div>`;

        const r1 = await Swal.fire({ 
            title: `<strong style="font-size: 1.8rem; color: #1e293b;">แผง ${stall.code}</strong>`, 
            html: `${imgHtml}<div style="background: #f8fafc; padding: 15px; border-radius: 12px; border: 1px solid #e2e8f0; margin-top: 10px;"><h3 style="color:#0f172a; margin:0 0 5px 0; font-size: 1.5rem;">${stall.price.toLocaleString()} ฿</h3><p style="color:#64748b; margin:0; font-size: 0.95rem;">โซน: ${stall.zoneName || stall.subZone}</p></div>`, 
            showCancelButton: true, confirmButtonText: '✅ สนใจจองแผงนี้', cancelButtonText: 'ปิด'
        });
        if (!r1.isConfirmed) return;

        const { value: bk } = await Swal.fire({
            title: '📝 ยืนยันการจอง',
            html: `
            <div style="text-align:left; font-size:0.9rem;">
                <label>สินค้าที่ขาย (เช่น ข้าวแกง)</label><input id="bk-prod" class="swal2-input" style="width:100%; box-sizing:border-box;">
                <label>วันที่เริ่มเช่า</label><input id="bk-date" type="date" min="${minDate}" class="swal2-input" style="width:100%; box-sizing:border-box;">
                <div style="background:#f0f9ff; padding:10px; text-align:center; border:1px dashed #bae6fd; margin:10px 0;"><p style="margin:0; color:#0369a1;">โอนมัดจำ: ${stall.price.toLocaleString()} ฿</p><img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=PromptPay" style="width:80px;"></div>
                <label>1. รูปบัตร ปชช.</label><input id="bk-card" type="file" class="swal2-file" style="width:100%;">
                <label>2. สลิปโอน</label><input id="bk-slip" type="file" class="swal2-file" style="width:100%;">
            </div>`,
            width: 500, showCancelButton: true, confirmButtonText: 'ยืนยัน',
            preConfirm: async () => {
                const date = document.getElementById('bk-date').value; const prod = document.getElementById('bk-prod').value; const cardFile = document.getElementById('bk-card').files[0]; const slipFile = document.getElementById('bk-slip').files[0];
                if (!date || !cardFile || !slipFile) return Swal.showValidationMessage('กรอกให้ครบ');
                return { date, prod, cardFile, slipFile };
            }
        });

        if (bk) {
            try {
                const formData = new FormData(); formData.append('user_id', currentUser.user_id); formData.append('stall_id', stall.id); formData.append('start_date', bk.date); formData.append('product_details', bk.prod); formData.append('customer_name', currentUser.name); formData.append('customer_phone', currentUser.phone_number || currentUser.username); formData.append('idCardImage', bk.cardFile); formData.append('slipImage', bk.slipFile);
                await api.post('/bookings', formData); Swal.fire('สำเร็จ', 'รอตรวจสอบ', 'success'); fetchData();
            } catch (err) { Swal.fire('Error', err.response?.data?.message || err.message, 'error'); }
        }
    };

    const handleTenantPay = async (inv) => {
        const { value: form } = await Swal.fire({
            title: 'ชำระเงิน / แจ้งโอน',
            html: `
            <div style="background:#f0f9ff; padding:10px; text-align:center; border:1px dashed #bae6fd; margin-bottom:15px;">
                <p style="margin:0; color:#0369a1; font-weight:bold;">ยอดชำระ: ${inv.amount.toLocaleString()} บาท</p><img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=PromptPay" style="width:120px; margin-top:10px;">
            </div>
            <label style="display:block; text-align:left; font-size:0.9rem; margin-bottom:5px;">อัปโหลดสลิปการโอน</label><input id="pay-slip" type="file" class="swal2-file" style="width:100%; font-size:0.9rem;">
          `,
            showCancelButton: true, confirmButtonText: 'ยืนยันการแจ้งโอน',
            preConfirm: async () => { const slipFile = document.getElementById('pay-slip').files[0]; if (!slipFile) return Swal.showValidationMessage('กรุณาอัปโหลดสลิป'); return { slipFile }; }
        });
        if (form) {
            try { const formData = new FormData(); formData.append('invoice_id', inv.invoice_id); formData.append('slipImage', form.slipFile); await api.post('/invoices/pay', formData); Swal.fire('สำเร็จ', 'แจ้งโอนเรียบร้อย รอแอดมินตรวจสอบ', 'success'); fetchData(); } catch (err) { Swal.fire('Error', err.response?.data?.message || err.message, 'error'); }
        }
    };

    const notifItems = transactions.filter(i => {
        if (!currentUser) return false;
        if (['admin', 'owner'].includes(currentUser.role)) return i.status === 'pending';
        else return i.status === 'unpaid' || (i.status === 'rejected' && i.reason);
    });

    if (!currentUser) return (
        <div className="login-wrapper">
            <div className="login-banner">
                <img src="https://images.unsplash.com/photo-1533900298318-6b8da08a523e?q=80&w=2070&auto=format&fit=crop" className="banner-img" alt="Market Banner" />
                <div className="banner-overlay"><h1>Tipgaysorn<br/>Market</h1><p>เว็บแอปพลิเคชันสำหรับการบริหารจัดการตลาด กรณีศึกษาตลาดทิพย์เกสร</p></div>
            </div>
            <div className="login-form-section">
                <div className="form-box">
                    <h2>{isRegistering ? 'สมัครสมาชิกใหม่' : 'เข้าสู่ระบบ'}</h2>
                    <form onSubmit={isRegistering ? handleRegister : handleLogin}>
                        <div className="input-group"><input type="text" placeholder="Username (ไอดี)" value={isRegistering ? regForm.username : loginForm.username} onChange={e => isRegistering ? setRegForm({ ...regForm, username: e.target.value }) : setLoginForm({ ...loginForm, username: e.target.value })} /></div>
                        <div className="input-group"><input type="password" placeholder="Password (รหัสผ่าน)" value={isRegistering ? regForm.password : loginForm.password} onChange={e => isRegistering ? setRegForm({ ...regForm, password: e.target.value }) : setLoginForm({ ...loginForm, password: e.target.value })} /></div>
                        {isRegistering && (
                            <>
                                <div className="input-group"><input type="password" placeholder="ยืนยัน Password" onChange={e => setRegForm({ ...regForm, confirmPassword: e.target.value })} /></div>
                                <hr style={{ margin: '15px 0', border: '0.5px solid #eee' }} />
                                <div className="input-group"><input type="text" placeholder="ชื่อ-นามสกุล (ต้องระบุ)" onChange={e => setRegForm({ ...regForm, fullName: e.target.value })} /></div>
                                <div className="input-group"><input type="text" placeholder="เบอร์โทรศัพท์ (ต้องระบุ)" maxLength="10" onInput={(e) => e.target.value = e.target.value.replace(/[^0-9]/g, '')} onChange={e => setRegForm({ ...regForm, phone: e.target.value })} /></div>
                                <div className="input-group"><input type="text" placeholder="เลขบัตรประชาชน 13 หลัก (ต้องระบุ)" maxLength="13" onInput={(e) => e.target.value = e.target.value.replace(/[^0-9]/g, '')} onChange={e => setRegForm({ ...regForm, idCard: e.target.value })} /></div>
                            </>
                        )}
                        <button className="btn-submit">{isRegistering ? 'ยืนยันการสมัคร' : 'เข้าใช้งาน'}</button>
                    </form>
                    <div className="toggle-auth" onClick={() => { setIsRegistering(!isRegistering); setRegForm({ username: '', password: '', confirmPassword: '', fullName: '', phone: '', idCard: '' }); }}>{isRegistering ? '← กลับไปหน้าล็อคอิน' : 'ยังไม่มีบัญชี? สมัครสมาชิกใหม่'}</div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="app-container">
            <aside className="sidebar">
                <div className="sidebar-header"><div className="logo-icon">💎</div> Tipgaysorn</div>
                <nav className="sidebar-nav">
                    <div className={`nav-item ${activeMenu === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveMenu('dashboard')}>📊 Dashboard</div>
                    {['admin', 'owner'].includes(currentUser.role) && (
                        <>
                            <div className={`nav-item ${activeMenu === 'users' ? 'active' : ''}`} onClick={() => setActiveMenu('users')}>👥 จัดการผู้เช่า</div>
                            <div className="nav-item" onClick={handleAddStall} style={{ color: 'var(--success)' }}>➕ เพิ่มแผง</div>
                            <div className="nav-item" onClick={handleBulkCreateStalls} style={{ color: '#8b5cf6', fontWeight: 'bold' }}>⚡ สร้างอัตโนมัติ 100 แผง</div>
                        </>
                    )}
                    <div className="nav-item danger" onClick={() => { setCurrentUser(null); setLoginForm({ username: '', password: '' }); localStorage.removeItem('marketUser'); setActiveMenu('dashboard'); }}>🚪 Logout</div>
                </nav>
                <div className="user-profile"><div className="avatar">{currentUser.name?.[0] || 'U'}</div><div className="name">{currentUser.name}</div></div>
            </aside>

            <main className="content-area">
                <header className="top-bar">
                    <h2>{activeMenu === 'users' ? 'User Management (จัดการผู้เช่า)' : currentUser.role === 'owner' ? 'Business Intelligence' : 'Market Management'}</h2>
                    <div className="notif-wrapper" style={{ position: 'relative' }}>
                        <div className="notif-btn" onClick={() => { setShowNotif(!showNotif); fetchData(); }}>🔔<span className="badge">{notifItems.length}</span></div>
                        {showNotif && (
                            <div className="notif-dropdown" style={{ position: 'absolute', right: 0, top: '45px', background: 'white', width: '300px', boxShadow: '0 4px 15px rgba(0,0,0,0.15)', borderRadius: '12px', zIndex: 1000, padding: '10px' }}>
                                <h4 style={{ margin: '0 0 10px 0', paddingBottom: '10px', borderBottom: '1px solid #eee', fontSize: '1rem', color: '#0f172a' }}>รายการแจ้งเตือน</h4>
                                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                    {notifItems.length > 0 ? (
                                        notifItems.map(item => (
                                            <div key={item.id} className="notif-item" style={{ padding: '10px', borderBottom: '1px solid #f8f9fa', fontSize: '0.85rem', cursor: 'pointer', textAlign: 'left' }} onClick={() => { setShowNotif(false); if (item.status === 'pending' && ['admin', 'owner'].includes(currentUser.role)) handleAdminVerify(item); if (item.status === 'unpaid' && currentUser.role === 'tenant') handleTenantPay(item); if (item.status === 'rejected') Swal.fire('ถูกปฏิเสธเนื่องจาก', item.reason, 'info'); }}>
                                                <strong style={{ color: item.status === 'rejected' ? '#ef4444' : '#4f46e5' }}>{item.type === 'Booking' ? '📥 การจองแผง' : '💰 บิลค่าเช่า'}</strong>
                                                <div style={{ color: '#64748b', marginTop: '3px' }}>{currentUser.role !== 'tenant' ? `แผง ${item.stall_code}: จากคุณ ${item.tenant}` : item.status === 'rejected' ? `แผง ${item.stall_code} ถูกปฏิเสธ (คลิกดูเหตุผล)` : `แผง ${item.stall_code}: กรุณาชำระเงิน`}</div>
                                            </div>
                                        ))
                                    ) : (<div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '0.9rem' }}>ไม่มีรายการใหม่</div>)}
                                </div>
                            </div>
                        )}
                    </div>
                </header>

                {activeMenu === 'dashboard' ? (
                    <div className="dashboard-content">
                        {currentUser.role !== 'tenant' && (
                            <div className="stats-section">
                                <div className="stats-grid">
                                    <div className="stat-card blue"><div className="stat-label">รายได้รวม (Paid)</div><div className="stat-value">{stats.paid.toLocaleString()} ฿</div></div>
                                    <div className="stat-card red"><div className="stat-label">รอเก็บเงิน (Pending)</div><div className="stat-value">{stats.unpaid.toLocaleString()} ฿</div></div>
                                    <div className="stat-card green"><div className="stat-label">อัตราการเช่า</div><div className="stat-value">{stats.occRate}%</div></div>
                                </div>
                                {currentUser.role === 'owner' && (
                                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '20px', marginBottom: '30px' }}>
                                        <div className="chart-box"><h3>📈 แนวโน้มรายได้</h3><ResponsiveContainer width="100%" height={200}><AreaChart data={stats.revenueData}><defs><linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#4f46e5" stopOpacity={0.8} /><stop offset="95%" stopColor="#4f46e5" stopOpacity={0} /></linearGradient></defs><XAxis dataKey="name" /><YAxis /><Tooltip /><Area type="monotone" dataKey="value" stroke="#4f46e5" fill="url(#colorVal)" /></AreaChart></ResponsiveContainer></div>
                                        <div className="chart-box"><h3>💧⚡ สรุปรายรับน้ำ-ไฟ</h3><ResponsiveContainer width="100%" height={200}><BarChart data={stats.utilityChartData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" fontSize={12} /><YAxis /><Tooltip formatter={(value) => [`${value.toLocaleString()} ฿`, 'ยอดรวม']} /><Bar dataKey="value" radius={[5, 5, 0, 0]}>{stats.utilityChartData && stats.utilityChartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}</Bar></BarChart></ResponsiveContainer></div>
                                        <div className="chart-box"><h3>🍕 สถานะการจอง</h3><ResponsiveContainer width="100%" height={200}><PieChart><Pie data={stats.pieData} dataKey="value" cx="50%" cy="50%" outerRadius={60}>{stats.pieData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}</Pie><Tooltip /></PieChart></ResponsiveContainer></div>
                                        <div className="chart-box"><h3>📊 โซนที่เช่า</h3><ResponsiveContainer width="100%" height={200}><BarChart data={stats.barData}><XAxis dataKey="name" /><Tooltip /><Bar dataKey="value" fill="#8884d8" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></div>
                                        
                                        <div className="chart-box" style={{ gridColumn: 'span 2' }}>
                                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>👥 จำนวนผู้เช่า (รายเดือน vs รายวัน)</h3>
                                            <ResponsiveContainer width="100%" height={200}>
                                                <BarChart data={stats.tenantChartData} layout="vertical" margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                                    <XAxis type="number" allowDecimals={false} />
                                                    <YAxis dataKey="name" type="category" width={80} style={{ fontWeight: 'bold', fontSize: '13px' }} />
                                                    <Tooltip formatter={(value) => [`${value} แผง`, 'จำนวนผู้เช่า']} cursor={{fill: 'rgba(0,0,0,0.05)'}} />
                                                    <Bar dataKey="value" radius={[0, 5, 5, 0]} barSize={35}>
                                                        {stats.tenantChartData && stats.tenantChartData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={index === 0 ? '#6366f1' : '#f43f5e'} />
                                                        ))}
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 🏁 TABS ควบคุมการเปลี่ยนหน้า (รายเดือน / รายวัน) */}
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                            <button 
                                onClick={() => setActiveTab('monthly')} 
                                style={{ flex: 1, padding: '15px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', transition: 'all 0.2s', background: activeTab === 'monthly' ? '#0f172a' : '#e2e8f0', color: activeTab === 'monthly' ? '#fff' : '#64748b', boxShadow: activeTab === 'monthly' ? '0 4px 6px rgba(0,0,0,0.1)' : 'none' }}
                            >
                                🏢 แผงรายเดือน (Zone A - D)
                            </button>
                            <button 
                                onClick={() => setActiveTab('daily')} 
                                style={{ flex: 1, padding: '15px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', transition: 'all 0.2s', background: activeTab === 'daily' ? '#0f172a' : '#e2e8f0', color: activeTab === 'daily' ? '#fff' : '#64748b', boxShadow: activeTab === 'daily' ? '0 4px 6px rgba(0,0,0,0.1)' : 'none' }}
                            >
                                🎪 แผงรายวัน (Zone E - N)
                            </button>
                        </div>

                        {/* 🏁 พื้นที่แสดงผลแผนผัง (ดึงของจริงจาก DB ล้วนๆ) */}
                        <div className="section-container" style={{ padding: '25px', background: '#f8fafc', marginBottom: '20px', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                            <div style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '15px', textAlign: 'center', fontWeight: 'bold', color: '#64748b', marginBottom: '25px' }}>
                                🏢 จุดจัดการกลาง (Office / WC)
                            </div>

                            {activeTab === 'monthly' ? (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
                                    <MarketZone title="🟥 ZONE A (อาหารสด)" zoneCode="A" stalls={stalls} onClickStall={handleStallClick} />
                                    <MarketZone title="🟩 ZONE B (ผักผลไม้)" zoneCode="B" stalls={stalls} onClickStall={handleStallClick} />
                                    <MarketZone title="🟪 ZONE C (อาหารปรุงสำเร็จ)" zoneCode="C" stalls={stalls} onClickStall={handleStallClick} />
                                    <MarketZone title="🟦 ZONE D (ของแห้ง/ชำ)" zoneCode="D" stalls={stalls} onClickStall={handleStallClick} />
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '15px' }}>
                                    {['E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N'].map(zone => (
                                        <DailyMarketZone 
                                            key={zone} 
                                            title={`ZONE ${zone} (แผงรายวัน)`} 
                                            zoneCode={zone} 
                                            stalls={stalls} 
                                            onClickStall={handleStallClick} 
                                        />
                                    ))}
                                </div>
                            )}

                            {/* ตัวอธิบายสี */}
                            <div style={{ textAlign: 'center', padding: '15px', background: '#e2e8f0', fontSize: '14px', fontWeight: 'bold', color: '#475569', borderRadius: '8px', marginTop: '25px' }}>
                                <span style={{ display: 'inline-block', width: '16px', height: '16px', background: 'rgba(16, 185, 129, 0.15)', border: '2px solid #10b981', marginRight: '5px', verticalAlign: 'middle', borderRadius: '4px' }}></span> ว่าง (แผงเขียว)
                                <span style={{ display: 'inline-block', width: '16px', height: '16px', background: 'rgba(239, 68, 68, 0.15)', border: '2px solid #ef4444', marginRight: '5px', marginLeft: '20px', verticalAlign: 'middle', borderRadius: '4px' }}></span> ไม่ว่าง (แผงแดง)
                                <span style={{ display: 'inline-block', width: '16px', height: '16px', background: 'rgba(245, 158, 11, 0.15)', border: '2px solid #f59e0b', marginRight: '5px', marginLeft: '20px', verticalAlign: 'middle', borderRadius: '4px' }}></span> รออนุมัติ (แผงเหลือง)
                            </div>
                        </div>

                        {/* 📊 ตาราง Transactions */}
                        <div className="section-container">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
                                <h3 style={{ margin: 0 }}>รายการธุรกรรม (Transactions)</h3>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    <input type="text" placeholder="🔍 ค้นหาชื่อ, รหัสแผง, บิล..." value={searchTx} onChange={(e) => setSearchTx(e.target.value)} style={{ padding: '8px 15px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', width: '250px' }} />
                                    {['admin', 'owner'].includes(currentUser.role) && (<button onClick={handleExportExcel} style={{ background: '#10b981', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>📥 ดาวน์โหลด Excel</button>)}
                                </div>
                            </div>
                            
                            <div style={{ maxHeight: '450px', overflowY: 'auto', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                <table className="biz-table" style={{ margin: 0 }}>
                                    <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f8fafc' }}><tr><th>ID</th><th>Stall</th><th>Tenant</th><th>Amt</th><th>Status</th><th>Action</th></tr></thead>
                                    <tbody>
                                        {filteredTransactions.length > 0 ? (
                                            filteredTransactions.map(inv => (
                                                <tr key={inv.id} style={{ background: inv.status === 'pending' ? '#fffbeb' : 'inherit' }}>
                                                    <td>#{inv.id}</td><td style={{ fontWeight: 'bold', color: '#334155' }}>{inv.stall_code}</td><td>{inv.tenant}</td><td style={{ fontWeight: '600' }}>{inv.amount.toLocaleString()} ฿</td><td><span className={`badge ${inv.status}`}>{inv.status}</span></td>
                                                    <td>
                                                        <button className="btn-sm" onClick={() => printInvoice(inv)} style={{ background: '#64748b', marginRight: '5px' }}>🖨️ พิมพ์</button>
                                                        {['admin', 'owner'].includes(currentUser.role) && inv.status === 'pending' && <button className="btn-sm" onClick={() => handleAdminVerify(inv)} style={{ background: '#4f46e5', marginRight: '5px' }}>ตรวจสอบ</button>}
                                                        {currentUser.role === 'tenant' && inv.status === 'unpaid' && <button className="btn-sm" onClick={() => handleTenantPay(inv)} style={{ background: '#10b981', marginRight: '5px' }}>แจ้งโอน</button>}
                                                        {inv.status === 'rejected' && inv.reason && (<button className="btn-sm" onClick={() => Swal.fire('ถูกปฏิเสธเนื่องจาก', inv.reason, 'error')} style={{ background: '#ef4444' }}>💬 ดูเหตุผล</button>)}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (<tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}><div style={{ fontSize: '3rem', marginBottom: '10px' }}>📭</div><div style={{ fontSize: '1.1rem', fontWeight: '500' }}>ไม่พบข้อมูลที่คุณค้นหา</div></td></tr>)}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="dashboard-content">
                        <div className="section-container">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                                <h3 style={{ margin: 0, color: '#1e293b' }}>👥 รายชื่อผู้เช่าทั้งหมดในระบบ (Tenant Management)</h3>
                                <input type="text" placeholder="🔍 ค้นหาชื่อ, เบอร์โทร..." value={searchUser} onChange={(e) => setSearchUser(e.target.value)} style={{ padding: '8px 15px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', width: '250px' }} />
                            </div>

                            <div style={{ maxHeight: '450px', overflowY: 'auto', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                <table className="biz-table" style={{ margin: 0 }}>
                                    <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f8fafc' }}>
                                        <tr><th>รหัสอ้างอิง</th><th>ชื่อ-นามสกุล (Name)</th><th>เบอร์โทรศัพท์ (Phone)</th><th>เลขบัตร ปชช. (ID Card)</th><th>ประวัติการเช่า</th><th>ระดับสิทธิ์ (Role)</th><th>จัดการ</th></tr>
                                    </thead>
                                    <tbody>
                                        {filteredUsers.length > 0 ? (
                                            filteredUsers.map(u => (
                                                <tr key={u.user_id}>
                                                    <td style={{ color: '#64748b' }}>U-{u.user_id.toString().padStart(4, '0')}</td><td style={{ fontWeight: 'bold', color: '#0f172a' }}>{u.full_name}</td><td>{u.phone_number}</td><td>{u.id_card_number}</td><td>{u.created_at}</td>
                                                    <td><span className="badge" style={{ background: '#e0f2fe', color: '#0284c7', border: '1px solid #bae6fd' }}>{u.total_bookings} ครั้ง</span></td>
                                                    <td><span className={`badge`} style={{ background: u.role === 'admin' ? '#fce7f3' : u.role === 'owner' ? '#fef08a' : '#f1f5f9', color: u.role === 'admin' ? '#be185d' : u.role === 'owner' ? '#b45309' : '#475569' }}>{u.role.toUpperCase()}</span></td>
                                                    <td><button onClick={() => handleEditUser(u)} style={{ background: '#4f46e5', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>✏️ แก้ไข</button></td>
                                                </tr>
                                            ))
                                        ) : (<tr><td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}><div style={{ fontSize: '3rem', marginBottom: '10px' }}>👥</div><div style={{ fontSize: '1.1rem', fontWeight: '500' }}>ไม่พบรายชื่อผู้ใช้งาน</div></td></tr>)}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

export default App;