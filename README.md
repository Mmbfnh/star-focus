# نجم التركيز - منصة تعليمية متكاملة 🌟

![نجم التركيز](https://img.shields.io/badge/Version-2.0.0-green)
![React](https://img.shields.io/badge/React-18-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)

منصة تعليمية متكاملة تساعد الأطفال على تنظيم وقتهم الدراسي وتحفيزهم من خلال نظام المكافآت والنجوم.

## ✨ المميزات

- 🧒 **إدارة الملف الشخصي**: إضافة الأطفال ومعلوماتهم الشخصية
- 📚 **المواد الدراسية**: تنظيم المواد والجدول الأسبوعي
- ⏰ **الجدول اليومي**: إنشاء جدول يومي للمهام والدراسة
- 🎯 **نظام الأهداف**: تحديد الأهداف التعليمية ومتابعة التقدم
- 📝 **إدارة الاختبارات**: تنبيهات بالاختبارات القادمة
- ⭐ **نظام المكافآت**: كسب النجوم واستبدالها بمكافآت
- 📊 **التقارير والإحصائيات**: متابعة التقدم الدراسي
- ☁️ **التخزين السحابي**: دعم Firebase (اختياري)
- 🌙 **الوضع الليلي**: واجهة مريحة للعين

## 🚀 التشغيل الفوري

[![تشغيل الآن](https://img.shields.io/badge/تشغيل-الآن-brightgreen)](https://your-username.github.io/star-focus)

### الطريقة 1: التشغيل المباشر
1. قم بتنزيل الملف `index.html`
2. افتح الملف في متصفحك

### الطريقة 2: GitHub Pages
1. انتقل إلى: `https://your-username.github.io/star-focus`

## ⚙️ الإعداد المتقدم

### تكوين Firebase (اختياري)

1. أنشئ مشروع جديد في [Firebase Console](https://console.firebase.google.com)
2. قم بتمبية Firestore Database
3. استبدل الإعدادات في الكود:

```javascript
const FIREBASE_CONFIG = {
    apiKey: "your-api-key",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "your-app-id"
};
