import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import axios from 'axios';
import {
    PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
    AreaChart, Area, XAxis, YAxis, CartesianGrid,
    BarChart, Bar
} from 'recharts';
import './App.css';

const API_URL = 'http://localhost:3000';
const api = axios.create({ baseURL: API_URL });

const printInvoice = (inv) => {
    const printWindow = window.open('', '', 'width=800,height=600');
    printWindow.document.write(`
        <html>
            <head>
                <title>Invoice #${inv.id || inv.invoice_id || inv.booking_id}</title>
                <style>
                    body { font-family: sans-serif; padding: 40px; color: #333; }
                    .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
                    .title { font-size: 24px; font-weight: bold; color: #4f46e5; }
                    .info { display: flex; justify-content: space-between; margin-bottom: 20px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                    th { background-color: #f8f9fa; }
                    .total { text-align: right; margin-top: 20px; font-size: 20px; font-weight: bold; }
                    .stamp { position: absolute; right: 50px; bottom: 100px; border: 3px solid ${inv.status === 'paid' ? 'green' : 'red'}; color: ${inv.status === 'paid' ? 'green' : 'red'}; padding: 10px 20px; font-size: 24px; font-weight: bold; transform: rotate(-15deg); opacity: 0.5; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="title">💎 ตลาดทิพย์เกสร (Tipgaysorn Market)</div>
                    <p>ใบเสร็จรับเงิน / ใบแจ้งหนี้ (Receipt / Invoice)</p>
                </div>
                <div class="info">
                    <div>
                        <strong>ผู้เช่า:</strong> ${inv.tenant}<br>
                        <strong>แผง:</strong> ${inv.stall_code}<br>
                    </div>
                    <div style="text-align: right;">
                        <strong>เลขที่:</strong> ${inv.id || inv.invoice_id || inv.booking_id}<br>
                        <strong>รายการ:</strong> ${inv.type}
                    </div>
                </div>
                <table>
                    <thead><tr><th>รายการ (Description)</th><th style="text-align: right;">จำนวนเงิน (Amount)</th></tr></thead>
                    <tbody>
                        <tr><td>ค่าเช่าพื้นที่ / ค่าบริการ</td><td style="text-align: right;">${(inv.amount || 0).toLocaleString()} บาท</td></tr>
                    </tbody>
                </table>
                <div class="total">รวมทั้งสิ้น: ${(inv.amount || 0).toLocaleString()} บาท</div>
                <div class="stamp">${inv.status.toUpperCase()}</div>
                <div style="text-align: center; margin-top: 50px; font-size: 12px; color: #777;">ขอบคุณที่ใช้บริการ</div>
                <script>window.print();</script>
            </body>
        </html>
    `);
    printWindow.document.close();
};

function App() {
    const [currentUser, setCurrentUser] = useState(null);
    const [isRegistering, setIsRegistering] = useState(false);
    const [activeTab, setActiveTab] = useState('monthly');

    const [loginForm, setLoginForm] = useState({ username: '', password: '' });
    const [regForm, setRegForm] = useState({ username: '', password: '', confirmPassword: '', fullName: '', phone: '', idCard: '' });

    const [stalls, setStalls] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [dashboardStats, setDashboardStats] = useState({ finance: { total_revenue: 0, total_unpaid: 0 }, zones: [], stalls: [] });

    // --- 📊 Fetch & Initialization ---
    const fetchData = async () => {
        try {
            const [stallsRes, statsRes] = await Promise.all([
                api.get('/stalls'),
                currentUser?.role !== 'tenant' && currentUser ? api.get('/dashboard/stats').catch(() => ({ data: { finance: { total_revenue: 0, total_unpaid: 0 }, zones: [], stalls: [] } })) : { data: { finance: { total_revenue: 0, total_unpaid: 0 }, zones: [], stalls: [] } }
            ]);

            const mappedStalls = stallsRes.data.map(s => {
                let zName = '';
                if (s.zone === 'A') zName = 'โซนอาหารสด';
                else if (s.zone === 'B') zName = 'โซนผักผลไม้';
                else if (s.zone === 'C') zName = 'โซนอาหารสำเร็จรูป';
                else if (s.zone === 'D') zName = 'โซนของแห้ง';
                return {
                    ...s,
                    id: s.stall_id,
                    code: s.stall_code,
                    zoneName: zName || s.zone,
                    subZone: s.zone,
                    rentType: s.rent_type,
                    price: s.price,
                    status: s.status === 'reserved' ? 'pending' : s.status,
                    tenant_name: s.customer_name || '',
                    images: s.stall_image_url ? [`${API_URL}${s.stall_image_url}`] : []
                };
            });
            setStalls(mappedStalls);

            if (currentUser) {
                if (currentUser.role !== 'tenant') {
                    setDashboardStats(statsRes.data);
                    const [bPending, iUnpaid, iPending] = await Promise.all([
                        api.get('/bookings/pending').catch(() => ({ data: [] })),
                        api.get('/invoices/unpaid').catch(() => ({ data: [] })),
                        api.get('/invoices/pending').catch(() => ({ data: [] })),
                    ]);
                    let trans = [];
                    (bPending.data || []).forEach(b => trans.push({
                        id: `B-${b.booking_id}`, booking_id: b.booking_id, stall_code: b.stall_code, tenant: b.customer_name, amount: mappedStalls.find(s => s.id === b.stall_id)?.price || 0, status: 'pending', type: 'Booking', cardUrl: b.id_card_image_url ? `${API_URL}${b.id_card_image_url}` : null, slipUrl: b.slip_image_url ? `${API_URL}${b.slip_image_url}` : null, isBooking: true
                    }));
                    (iUnpaid.data || []).forEach(i => trans.push({
                        id: `I-${i.invoice_id}`, invoice_id: i.invoice_id, stall_code: i.stall_code, tenant: i.customer_name || i.full_name, amount: i.total_amount, status: 'unpaid', type: 'Invoice', slipUrl: i.payment_slip_url ? `${API_URL}${i.payment_slip_url}` : null, isBooking: false
                    }));
                    (iPending.data || []).forEach(i => trans.push({
                        id: `I-${i.invoice_id}`, invoice_id: i.invoice_id, stall_code: i.stall_code, tenant: i.customer_name || i.full_name, amount: i.total_amount, status: 'pending', type: 'Invoice (ชำระแล้วรอตรวจ)', slipUrl: i.payment_slip_url ? `${API_URL}${i.payment_slip_url}` : null, isBooking: false
                    }));
                    setTransactions(trans);
                } else {
                    const myInv = await api.get(`/my-invoices/${currentUser.user_id}`);
                    let trans = [];
                    myInv.data.forEach(i => trans.push({
                        id: `I-${i.invoice_id}`, invoice_id: i.invoice_id, stall_code: i.stall_code, tenant: currentUser.name, amount: i.total_amount, status: i.payment_status === 'pending_check' ? 'pending' : (i.payment_status || 'unpaid'), type: 'Invoice', slipUrl: i.payment_slip_url ? `${API_URL}${i.payment_slip_url}` : null, isBooking: false
                    }));
                    setTransactions(trans);
                }
            }
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line
    }, [currentUser]);

    const getStats = () => {
        const { finance, zones, stalls: stallStats } = dashboardStats;
        const paid = finance?.total_revenue || 0;
        const unpaid = finance?.total_unpaid || 0;

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

        return { paid, unpaid, occRate, pieData, barData, revenueData };
    };
    const stats = getStats();

    // --- 🔐 Actions ---
    const handleRegister = async (e) => {
        e.preventDefault();
        if (!regForm.username || !regForm.password || !regForm.confirmPassword || !regForm.fullName || !regForm.phone || !regForm.idCard) {
            return Swal.fire('ข้อมูลไม่ครบ', 'กรุณากรอกข้อมูลให้ครบทุกช่อง (ชื่อ, เบอร์, เลขบัตรประชาชน)', 'warning');
        }
        if (regForm.password !== regForm.confirmPassword) {
            return Swal.fire('รหัสผ่านไม่ตรงกัน', 'กรุณาตรวจสอบรหัสผ่านอีกครั้ง', 'error');
        }
        try {
            await api.post('/register', {
                username: regForm.username,
                password: regForm.password,
                full_name: regForm.fullName,
                phone_number: regForm.phone,
                id_card_number: regForm.idCard
            });
            Swal.fire('สมัครสำเร็จ!', 'เข้าสู่ระบบได้เลยครับ', 'success'); setIsRegistering(false); setRegForm({ username: '', password: '', confirmPassword: '', fullName: '', phone: '', idCard: '' });
        } catch (err) {
            Swal.fire('Error', err.response?.data?.message || err.message, 'error');
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const res = await api.post('/login', { username: loginForm.username, password: loginForm.password });
            setCurrentUser({ ...res.data, name: res.data.full_name });
        } catch (err) {
            Swal.fire('Error', err.response?.data?.message || err.message, 'error');
        }
    };

    // --- 🏢 Admin Functions ---
    const handleAddStall = async () => {
        const { value: form } = await Swal.fire({
            title: '➕ เพิ่มแผงใหม่',
            html: `
            <input id="new-code" class="swal2-input" placeholder="รหัสแผง (เช่น K99)">
            <select id="new-type" class="swal2-select"><option value="Monthly">รายเดือน</option><option value="Daily">รายวัน</option></select>
            <select id="new-zone" class="swal2-select"><option value="A">Zone A</option><option value="B">Zone B</option><option value="C">Zone C</option><option value="D">Zone D</option><option value="Daily">Zone รายวัน</option></select>
            <input id="new-subzone" class="swal2-input" placeholder="แถว (เช่น E,F,G,H) *เฉพาะรายวัน">
            <input id="new-price" type="number" class="swal2-input" placeholder="ราคา">
        `,
            focusConfirm: false, showCancelButton: true, confirmButtonText: 'บันทึก',
            preConfirm: () => ({
                code: document.getElementById('new-code').value, rentType: document.getElementById('new-type').value,
                zone: document.getElementById('new-type').value === 'Daily' ? document.getElementById('new-subzone').value : document.getElementById('new-zone').value,
                price: parseInt(document.getElementById('new-price').value)
            })
        });
        if (form) {
            try {
                const formData = new FormData();
                formData.append('stall_code', form.code);
                formData.append('zone', form.zone);
                formData.append('rent_type', form.rentType);
                formData.append('price', form.price);
                formData.append('size', '3x3');

                await api.post('/stalls', formData);
                Swal.fire('Success', 'เพิ่มแผงเรียบร้อย', 'success');
                fetchData();
            } catch (err) {
                Swal.fire('Error', err.message, 'error');
            }
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
            </div>
        `,
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
        const { value: form } = await Swal.fire({
            title: `📝 Walk-in: ${stall.code}`,
            html: `
            <div style="text-align:left; font-size:0.9rem;">
                <p>โซน: <b>${stall.zoneName || stall.subZone || 'Daily'}</b></p>
                <div style="background:#f0fdf4; padding:10px; border:1px solid #bbf7d0; border-radius:8px; margin-bottom:15px; color:#166534;">💡 ระบบสร้าง User ให้อัตโนมัติ (Login: เบอร์โทร)</div>
                <label>ชื่อ-นามสกุล</label><input id="wk-name" class="swal2-input" style="width:100%; box-sizing:border-box;">
                <label>เบอร์โทร</label><input id="wk-phone" class="swal2-input" style="width:100%; box-sizing:border-box;">
                <label>วันที่</label><input id="wk-date" type="date" class="swal2-input" style="width:100%; box-sizing:border-box;">
            </div>
          `,
            width: 500, showCancelButton: true, confirmButtonText: 'ยืนยัน',
            preConfirm: () => {
                const name = document.getElementById('wk-name').value;
                const phone = document.getElementById('wk-phone').value;
                const date = document.getElementById('wk-date').value;
                if (!name || !phone || !date) return Swal.showValidationMessage('กรอกให้ครบ');
                return { name, phone, date };
            }
        });
        if (form) {
            try {
                const formData = new FormData();
                formData.append('stall_id', stall.id);
                formData.append('full_name', form.name);
                formData.append('phone_number', form.phone);
                formData.append('start_date', form.date);
                await api.post('/bookings/walk-in', formData);
                Swal.fire('สำเร็จ', `บันทึก Walk-in สำเร็จ`, 'success');
                fetchData();
            } catch (err) {
                Swal.fire('Error', err.message, 'error');
            }
        }
    };

    const handleMeterRecording = async (stall) => {
        if (stall.status !== 'occupied') return Swal.fire('ยังไม่มีคนเช่า', '', 'warning');
        if (!stall.booking_id) return Swal.fire('Error', 'ไม่พบข้อมูลผู้เช่า (Booking ID)', 'error');
        const { value: v } = await Swal.fire({
            title: 'ออกบิลรวมมิเตอร์',
            html: `<input id="rent" type="number" value="${stall.price}" placeholder="ค่าเช่า (บาท)" class="swal2-input">
                   <input id="w" type="number" placeholder="เลขมิเตอร์น้ำล่าสุด" class="swal2-input">
                   <input id="e" type="number" placeholder="เลขมิเตอร์ไฟล่าสุด" class="swal2-input">`,
            preConfirm: () => [document.getElementById('rent').value, document.getElementById('w').value, document.getElementById('e').value]
        });
        if (v) {
            try {
                const res = await api.post('/invoices/create', {
                    booking_id: stall.booking_id,
                    rent_price: v[0],
                    water_current: v[1] || 0,
                    electric_current: v[2] || 0
                });
                Swal.fire('Success', `รวมยอด ${res.data.total} บาท`, 'success');
                fetchData();
            } catch (err) { Swal.fire('Error', err.response?.data?.message || err.message, 'error'); }
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
            </div>
          `,
            width: 500, showDenyButton: true, confirmButtonText: '✅ อนุมัติ', denyButtonText: '❌ ปฏิเสธ', confirmButtonColor: '#10b981', denyButtonColor: '#ef4444'
        }).then(async (res) => {
            try {
                if (res.isConfirmed) {
                    if (inv.isBooking) {
                        await api.put(`/bookings/approve/${inv.booking_id}`);
                    } else {
                        await api.put(`/invoices/approve/${inv.invoice_id}`);
                    }
                    Swal.fire('อนุมัติแล้ว', 'ยอดเงินเข้าระบบเรียบร้อย', 'success');
                    fetchData();
                } else if (res.isDenied) {
                    if (inv.isBooking) {
                        await api.put(`/bookings/reject/${inv.booking_id}`);
                        Swal.fire('ปฏิเสธการจอง', 'คืนสถานะแผงเป็น "ว่าง" เรียบร้อย', 'info');
                        fetchData();
                    } else {
                        Swal.fire('ปฏิเสธสลิป', 'ระบบยังไม่รองรับการปฏิเสธสลิป ฝั่ง Backend', 'info');
                    }
                }
            } catch (err) { Swal.fire('Error', err.message, 'error'); }
        });
    };

    const handleEditStall = async (stall) => {
        // Mock edit behavior since there is no PUT /stalls/:id endpoint
        Swal.fire('Info', 'ยังไม่รองรับการแก้ไขข้อมูลแผงใน Backend', 'info');
    };

    const handleResetStall = async (stall) => {
        try {
            await api.put(`/stalls/reset/${stall.id}`);
            fetchData();
            Swal.fire('Reset', 'แผงเปลี่ยนสถานะเป็นว่าง', 'success');
        } catch (err) { Swal.fire('Error', err.response?.data?.message || err.message, 'error'); }
    }

    const handleDeleteStall = (stall) => {
        Swal.fire({ title: 'ลบแผง?', icon: 'warning', showCancelButton: true }).then(async r => {
            if (r.isConfirmed) {
                try {
                    await api.delete(`/stalls/${stall.id}`);
                    fetchData();
                    Swal.fire('Deleted', '', 'success');
                } catch (err) { Swal.fire('Error', err.response?.data?.message || err.message, 'error'); }
            }
        });
    };

    // --- 🛒 USER MENU ---
    const handleBooking = async (stall) => {
        if (stall.status !== 'vacant') return;

        const imgHtml = (stall.images && stall.images.length > 0)
            ? `<div style="display:flex; overflow-x:auto; gap:10px; padding-bottom:10px;">${stall.images.map(img => `<img src="${img}" style="width:100%; height:150px; object-fit:cover; border-radius:10px; flex-shrink:0;">`).join('')}</div>`
            : `<div style="height:150px; background:#eee; display:flex; align-items:center; justify-content:center; color:#999; border-radius:10px;">ไม่มีรูปภาพ</div>`;

        const r1 = await Swal.fire({ title: `<strong>${stall.code}</strong>`, html: `${imgHtml}<h3 style="color:#1e293b;">${stall.price.toLocaleString()} ฿</h3><p style="color:#666">${stall.zoneName || stall.subZone}</p>`, showCancelButton: true, confirmButtonText: 'สนใจจอง' });
        if (!r1.isConfirmed) return;

        const { value: bk } = await Swal.fire({
            title: '📝 ยืนยันการจอง',
            html: `
            <div style="text-align:left; font-size:0.9rem;">
                <label>สินค้าที่ขาย (เช่น ข้าวแกง)</label><input id="bk-prod" class="swal2-input" style="width:100%; box-sizing:border-box;">
                <label>วันที่เริ่มเช่า</label><input id="bk-date" type="date" class="swal2-input" style="width:100%; box-sizing:border-box;">
                <div style="background:#f0f9ff; padding:10px; text-align:center; border:1px dashed #bae6fd; margin:10px 0;">
                    <p style="margin:0; color:#0369a1;">โอนมัดจำ: ${stall.price.toLocaleString()} ฿</p>
                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=PromptPay" style="width:80px;">
                </div>
                <label>1. รูปบัตร ปชช.</label><input id="bk-card" type="file" class="swal2-file" style="width:100%;">
                <label>2. สลิปโอน</label><input id="bk-slip" type="file" class="swal2-file" style="width:100%;">
            </div>
          `,
            width: 500, showCancelButton: true, confirmButtonText: 'ยืนยัน',
            preConfirm: async () => {
                const date = document.getElementById('bk-date').value;
                const prod = document.getElementById('bk-prod').value;
                const cardFile = document.getElementById('bk-card').files[0];
                const slipFile = document.getElementById('bk-slip').files[0];
                if (!date || !cardFile || !slipFile) return Swal.showValidationMessage('กรอกให้ครบ');
                return { date, prod, cardFile, slipFile };
            }
        });

        if (bk) {
            try {
                const formData = new FormData();
                formData.append('user_id', currentUser.user_id);
                formData.append('stall_id', stall.id);
                formData.append('start_date', bk.date);
                formData.append('product_details', bk.prod);
                formData.append('customer_name', currentUser.name);
                formData.append('customer_phone', currentUser.phone_number || currentUser.username);
                formData.append('idCardImage', bk.cardFile);
                formData.append('slipImage', bk.slipFile);

                await api.post('/bookings', formData);
                Swal.fire('สำเร็จ', 'รอตรวจสอบ', 'success');
                fetchData();
            } catch (err) {
                Swal.fire('Error', err.response?.data?.message || err.message, 'error');
            }
        }
    };

    const handleTenantPay = async (inv) => {
        const { value: form } = await Swal.fire({
            title: 'ชำระเงิน / แจ้งโอน',
            html: `
            <div style="background:#f0f9ff; padding:10px; text-align:center; border:1px dashed #bae6fd; margin-bottom:15px;">
                <p style="margin:0; color:#0369a1; font-weight:bold;">ยอดชำระ: ${inv.amount.toLocaleString()} บาท</p>
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=PromptPay" style="width:120px; margin-top:10px;">
            </div>
            <label style="display:block; text-align:left; font-size:0.9rem; margin-bottom:5px;">อัปโหลดสลิปการโอน</label>
            <input id="pay-slip" type="file" class="swal2-file" style="width:100%; font-size:0.9rem;">
          `,
            showCancelButton: true,
            confirmButtonText: 'ยืนยันการแจ้งโอน',
            preConfirm: async () => {
                const slipFile = document.getElementById('pay-slip').files[0];
                if (!slipFile) return Swal.showValidationMessage('กรุณาอัปโหลดสลิป');
                return { slipFile };
            }
        });

        if (form) {
            try {
                const formData = new FormData();
                formData.append('invoice_id', inv.invoice_id);
                formData.append('slipImage', form.slipFile);
                await api.post('/invoices/pay', formData);
                Swal.fire('สำเร็จ', 'แจ้งโอนเรียบร้อย รอแอดมินตรวจสอบ', 'success');
                fetchData();
            } catch (err) { Swal.fire('Error', err.response?.data?.message || err.message, 'error'); }
        }
    };

    if (!currentUser) return (
        <div className="login-wrapper">
            <div className="login-banner"><img src="/market.jpg" className="banner-img" /></div>
            <div className="login-form-section">
                <div className="form-box">
                    <h2>{isRegistering ? 'สมัครสมาชิกใหม่' : 'เข้าสู่ระบบ'}</h2>
                    <form onSubmit={isRegistering ? handleRegister : handleLogin}>
                        <div className="input-group">
                            <input type="text" placeholder="Username (ไอดี)" value={isRegistering ? regForm.username : loginForm.username}
                                onChange={e => isRegistering ? setRegForm({ ...regForm, username: e.target.value }) : setLoginForm({ ...loginForm, username: e.target.value })} />
                        </div>
                        <div className="input-group">
                            <input type="password" placeholder="Password (รหัสผ่าน)" value={isRegistering ? regForm.password : loginForm.password}
                                onChange={e => isRegistering ? setRegForm({ ...regForm, password: e.target.value }) : setLoginForm({ ...loginForm, password: e.target.value })} />
                        </div>
                        {isRegistering && (
                            <>
                                <div className="input-group">
                                    <input type="password" placeholder="ยืนยัน Password" onChange={e => setRegForm({ ...regForm, confirmPassword: e.target.value })} />
                                </div>
                                <hr style={{ margin: '15px 0', border: '0.5px solid #eee' }} />
                                <div className="input-group">
                                    <input type="text" placeholder="ชื่อ-นามสกุล (ต้องระบุ)" onChange={e => setRegForm({ ...regForm, fullName: e.target.value })} />
                                </div>
                                <div className="input-group">
                                    <input type="text" placeholder="เบอร์โทรศัพท์ (ต้องระบุ)" onChange={e => setRegForm({ ...regForm, phone: e.target.value })} />
                                </div>
                                <div className="input-group">
                                    <input type="text" placeholder="เลขบัตรประชาชน (ต้องระบุ)" onChange={e => setRegForm({ ...regForm, idCard: e.target.value })} />
                                </div>
                            </>
                        )}
                        <button className="btn-submit">{isRegistering ? 'ยืนยันการสมัคร' : 'เข้าใช้งาน'}</button>
                    </form>
                    <div className="toggle-auth" onClick={() => { setIsRegistering(!isRegistering); setRegForm({ username: '', password: '', confirmPassword: '', fullName: '', phone: '', idCard: '' }); }}>
                        {isRegistering ? '← กลับไปหน้าล็อคอิน' : 'ยังไม่มีบัญชี? สมัครสมาชิกใหม่'}
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="app-container">
            <aside className="sidebar">
                <div className="sidebar-header"><div className="logo-icon">💎</div> Tipgaysorn</div>
                <nav className="sidebar-nav">
                    <div className="nav-item active">📊 Dashboard</div>
                    {['admin', 'owner'].includes(currentUser.role) && <div className="nav-item" onClick={handleAddStall} style={{ color: 'var(--success)' }}>➕ เพิ่มแผง</div>}
                    <div className="nav-item danger" onClick={() => { setCurrentUser(null); setLoginForm({ username: '', password: '' }) }}>🚪 Logout</div>
                </nav>
                <div className="user-profile"><div className="avatar">{currentUser.name?.[0] || 'U'}</div><div className="name">{currentUser.name}</div></div>
            </aside>

            <main className="content-area">
                <header className="top-bar">
                    <h2>{currentUser.role === 'owner' ? 'Business Intelligence' : 'Market Management'}</h2>
                    <div className="notif-btn" onClick={fetchData}>🔔<span className="badge">{transactions.filter(i => i.status !== 'paid').length}</span></div>
                </header>

                <div className="dashboard-content">
                    {/* 📈 STATS */}
                    {currentUser.role !== 'tenant' && (
                        <div className="stats-section">
                            <div className="stats-grid">
                                <div className="stat-card blue"><div className="stat-label">รายได้รวม (Paid)</div><div className="stat-value">{stats.paid.toLocaleString()} ฿</div></div>
                                <div className="stat-card red"><div className="stat-label">รอเก็บเงิน (Pending)</div><div className="stat-value">{stats.unpaid.toLocaleString()} ฿</div></div>
                                <div className="stat-card green"><div className="stat-label">อัตราการเช่า</div><div className="stat-value">{stats.occRate}%</div></div>
                            </div>
                            {currentUser.role === 'owner' && (
                                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '20px', marginBottom: '30px' }}>
                                    <div className="chart-box"><h3>📈 Revenue Trend</h3><ResponsiveContainer width="100%" height={200}><AreaChart data={stats.revenueData}><defs><linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#4f46e5" stopOpacity={0.8} /><stop offset="95%" stopColor="#4f46e5" stopOpacity={0} /></linearGradient></defs><XAxis dataKey="name" /><YAxis /><Tooltip /><Area type="monotone" dataKey="value" stroke="#4f46e5" fill="url(#colorVal)" /></AreaChart></ResponsiveContainer></div>
                                    <div className="chart-box"><h3>🍕 Status</h3><ResponsiveContainer width="100%" height={200}><PieChart><Pie data={stats.pieData} dataKey="value" cx="50%" cy="50%" outerRadius={60}><Cell fill="#10b981" /><Cell fill="#ef4444" /><Cell fill="#f59e0b" /></Pie><Tooltip /></PieChart></ResponsiveContainer></div>
                                    <div className="chart-box"><h3>📊 By Zone</h3><ResponsiveContainer width="100%" height={200}><BarChart data={stats.barData}><XAxis dataKey="name" /><Tooltip /><Bar dataKey="value" fill="#8884d8" /></BarChart></ResponsiveContainer></div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* 🏁 TABS & MAP */}
                    <div className="tabs-container">
                        <button className={`tab-btn ${activeTab === 'monthly' ? 'active' : ''}`} onClick={() => setActiveTab('monthly')}>🏢 รายเดือน (Monthly)</button>
                        <button className={`tab-btn ${activeTab === 'daily' ? 'active' : ''}`} onClick={() => setActiveTab('daily')}>🎪 รายวัน (Daily)</button>
                    </div>

                    <div className="section-container">
                        <div className="master-plan-container">
                            {activeTab === 'monthly' ? (
                                <div className="blueprint-grid">
                                    <div className="zone-facility">Office / WC</div>
                                    <div className="market-column">
                                        <div className="island-cluster">
                                            <div className="cluster-label" style={{ color: '#ef4444' }}>🥩 Zone A: อาหารสด</div>
                                            <div className="stalls-grid-layout">
                                                {stalls.filter(s => s.zone === 'A').map(s => <div key={s.id} className={`mini-stall zone-a ${s.status}`} onClick={() => ['admin', 'owner'].includes(currentUser.role) ? handleAdminMenu(s) : handleBooking(s)}>{s.code}</div>)}
                                            </div>
                                        </div>
                                        <div className="island-cluster">
                                            <div className="cluster-label" style={{ color: '#10b981' }}>🥬 Zone B: ผักผลไม้</div>
                                            <div className="stalls-grid-layout">{stalls.filter(s => s.zone === 'B').map(s => <div key={s.id} className={`mini-stall zone-b ${s.status}`} onClick={() => ['admin', 'owner'].includes(currentUser.role) ? handleAdminMenu(s) : handleBooking(s)}>{s.code}</div>)}</div>
                                        </div>
                                    </div>
                                    <div className="market-column">
                                        <div className="island-cluster">
                                            <div className="cluster-label" style={{ color: '#e02b77' }}>🍛 Zone C: อาหารปรุงสำเร็จ</div>
                                            <div className="stalls-grid-layout">{stalls.filter(s => s.zone === 'C').map(s => <div key={s.id} className={`mini-stall zone-c ${s.status}`} onClick={() => ['admin', 'owner'].includes(currentUser.role) ? handleAdminMenu(s) : handleBooking(s)}>{s.code}</div>)}</div>
                                        </div>
                                        <div className="island-cluster">
                                            <div className="cluster-label" style={{ color: '#3b82f6' }}>🥫 Zone D: ของแห้ง/ชำ</div>
                                            <div className="stalls-grid-layout">{stalls.filter(s => s.zone === 'D').map(s => <div key={s.id} className={`mini-stall zone-d ${s.status}`} onClick={() => ['admin', 'owner'].includes(currentUser.role) ? handleAdminMenu(s) : handleBooking(s)}>{s.code}</div>)}</div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="daily-market-layout">
                                    {['E', 'F', 'G', 'H'].map(z => (
                                        <div key={z} className="daily-column">
                                            <div className="daily-header">Daily {z}</div>
                                            {stalls.filter(s => s.zone === z || s.subZone === z).map(s => (
                                                <div key={s.id} className={`daily-stall ${s.status}`} onClick={() => ['admin', 'owner'].includes(currentUser.role) ? handleAdminMenu(s) : handleBooking(s)}>
                                                    {s.code}
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 📊 TABLE */}
                    <div className="section-container">
                        <h3>รายการธุรกรรม (Transactions)</h3>
                        <table className="biz-table">
                            <thead><tr><th>ID</th><th>Stall</th><th>Tenant</th><th>Amt</th><th>Status</th><th>Action</th></tr></thead>
                            <tbody>
                                {transactions.map(inv => (
                                    <tr key={inv.id}>
                                        <td>#{inv.id}</td><td>{inv.stall_code}</td><td>{inv.tenant}</td><td>{inv.amount.toLocaleString()}</td>
                                        <td><span className={`badge ${inv.status}`}>{inv.status}</span></td>
                                        <td>
                                            <button className="btn-sm" onClick={() => printInvoice(inv)} style={{ background: '#64748b', marginRight: '5px' }}>🖨️</button>
                                            {['admin', 'owner'].includes(currentUser.role) && inv.status === 'pending' && <button className="btn-sm" onClick={() => handleAdminVerify(inv)}>Verify</button>}
                                            {currentUser.role === 'tenant' && inv.status === 'unpaid' && <button className="btn-sm" onClick={() => handleTenantPay(inv)}>Pay</button>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default App;