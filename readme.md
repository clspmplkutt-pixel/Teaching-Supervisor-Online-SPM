# ระบบนิเทศการศึกษาแบบออนไลน์ (Online Educational Supervision System)
### สำนักงานเขตพื้นที่การศึกษามัธยมศึกษาพิษณุโลก อุตรดิตถ์

ระบบบริหารจัดการและนิเทศการศึกษาออนไลน์ที่พัฒนาขึ้นเพื่อเพิ่มประสิทธิภาพในการติดตาม ตรวจสอบ และประเมินผลการจัดการศึกษา ช่วยให้การทำงานระหว่างโรงเรียนและเขตพื้นที่การศึกษาเชื่อมโยงกันได้อย่างรวดเร็วและแม่นยำ

![App Screenshot](web/public/images/obec.png) 
*(คุณสามารถเพิ่มรูปภาพหน้าจอโปรแกรมที่นี่ในภายหลัง)*

## 🚀 ฟีเจอร์หลัก (Key Features)

*   **Multi-Role Authentication**: ระบบจัดการสิทธิ์ผู้ใช้งานละเอียด (ครู, หัวหน้าหมวด, ผอ., ศึกษานิเทศก์, Admin)
*   **Interactive Dashboard**: หน้าปัดสรุปข้อมูลสถิติ กราฟ และตัวชี้วัดต่างๆ แบบ Real-time
*   **Evaluation System**: ระบบประเมินผลการปฏิบัติงานและนิเทศการสอนออนไลน์
*   **Report Generation**: ออกรายงานผลการนิเทศติดตามอัตโนมัติ
*   **Responsive Design**: รองรับการใช้งานทั้งบนคอมพิวเตอร์และแท็บเล็ต

## 🛠 เทคโนโลยีที่ใช้ (Tech Stack)

*   **Frontend**: React.js (Vite), Bootstrap 4 (AdminLTE Theme)
*   **Language**: JavaScript (ES6+), PHP 7.4+
*   **Database**: PostgreSQL (via Supabase), MySQL (Legacy Support)
*   **Libraries**: React Router, Chart.js, SweetAlert2, Axios

## 📦 โครงสร้างโปรเจกต์

```
├── web/            # Source Code ส่วน frontend (React)
│   ├── src/        # หน้าจอและ Logic การทำงานหลัก
│   └── public/     # ไฟล์รูปภาพและ Assets
├── include/        # ไฟล์เชื่อมต่อฐานข้อมูล PHP (Backend)
├── api/            # API Endpoints
└── plugins/        # Library เสริมต่างๆ
```

## 👥 ทีมผู้พัฒนา

*   **เจ้าของโครงการ/แนวคิดระบบ**: ดร.อิทธิพงษ์ ตั้งสกุลเรืองไล (ศึกษานิเทศก์ชำนาญการพิเศษ)
*   **ผู้พัฒนาระบบ**: [นายไพโรจน์ เดชะรัตนางกูร](https://krupairost.com) & ทีมงานพัฒนา
