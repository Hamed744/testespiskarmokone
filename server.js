const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// لیست سفید دامنه‌های مجاز برای پراکسی
const whitelist = [
    'https://black-forest-labs-flux-1-dev.hf.space',
    'https://hamed744-translate-tts-aloha.hf.space'
];

// فعال کردن CORS برای همه درخواست‌ها
app.use(cors());

// --- بخش پراکسی ---
// این میدلور درخواست‌های /proxy را به هاگینگ فیس ارسال می‌کند
app.use('/proxy', createProxyMiddleware({
    // تابع router مشخص می‌کند که هر درخواست به کدام دامنه از لیست سفید ارسال شود
    router: (req) => {
        const targetUrl = req.query.target_url;
        // بررسی امنیتی: فقط اگر URL هدف در لیست سفید بود، آن را برگردان
        if (targetUrl && whitelist.some(domain => targetUrl.startsWith(domain))) {
            return new URL(targetUrl).origin; // فقط دامنه اصلی را برمی‌گرداند
        }
        return null; // در غیر این صورت، درخواست را مسدود کن
    },
    // مسیر درخواست را بازنویسی می‌کند تا /proxy و کوئری استرینگ حذف شود
    pathRewrite: (path, req) => {
        const targetUrl = new URL(req.query.target_url);
        return targetUrl.pathname + targetUrl.search; // مسیر و پارامترهای اصلی را برمی‌گرداند
    },
    changeOrigin: true, // برای جلوگیری از مشکلات CORS و هدرها
    // **مهم:** IP واقعی کاربر را به سرور هدف ارسال می‌کند
    onProxyReq: (proxyReq, req, res) => {
        const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        proxyReq.setHeader('X-Forwarded-For', clientIp);
        proxyReq.setHeader('X-Real-IP', clientIp);
    },
    // فعال کردن لاگ برای دیباگ (می‌توانید بعدا غیرفعال کنید)
    logLevel: 'debug'
}));

// --- بخش میزبانی فایل استاتیک ---
// هر فایلی که در پوشه public باشد را سرو می‌کند
app.use(express.static(path.join(__dirname, 'public')));

// یک روت اصلی که فایل index.html را برمی‌گرداند
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// اجرای سرور
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
