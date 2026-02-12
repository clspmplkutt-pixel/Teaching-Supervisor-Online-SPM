# Loading States Components Guide

เอกสารนี้อธิบายวิธีการใช้ Loading และ Empty State Components ที่สร้างขึ้นเพื่อให้ UI/UX ดีขึ้น

## Components ที่มีให้ใช้งาน

### 1. LoadingSpinner Component
ใช้สำหรับแสดง loading state ขณะที่กำลัง fetch ข้อมูล

**ตำแหน่งไฟล์:** `src/components/LoadingSpinner.jsx`

**Props:**
- `message` (string, optional) - ข้อความที่แสดง (default: "กำลังโหลดข้อมูล กรุณารอสักครู่...")
- `title` (string, optional) - หัวข้อหน้า (จะแสดง page header ถ้ามีค่า)
- `fullPage` (boolean, optional) - แสดงแบบเต็มหน้าพร้อม header (default: true)
- `size` (string, optional) - ขนาด spinner: 'sm', 'md', 'lg' (default: 'lg')

**ตัวอย่างการใช้งาน:**

```jsx
import LoadingSpinner from '../components/LoadingSpinner';

// แบบเต็มหน้า (มี page header)
if (loading) {
  return (
    <LoadingSpinner 
      title="ดูคะแนนการประเมิน"
      message="กำลังโหลดข้อมูลการประเมิน กรุณารอสักครู่..."
    />
  );
}

// แบบไม่มี page header (ใช้ใน nested component)
if (loading) {
  return (
    <LoadingSpinner 
      message="กำลังโหลดข้อมูล..."
      fullPage={false}
      size="md"
    />
  );
}
```

---

### 2. EmptyState Component
ใช้สำหรับแสดง empty state, error, หรือ informational messages

**ตำแหน่งไฟล์:** `src/components/EmptyState.jsx`

**Props:**
- `message` (string, optional) - ข้อความที่แสดง (default: "ไม่พบข้อมูล")
- `icon` (string, optional) - Font Awesome icon class (default: "fa-exclamation-triangle")
- `type` (string, optional) - ประเภท alert: 'info', 'warning', 'danger', 'success' (default: 'warning')
- `title` (string, optional) - หัวข้อหน้า (จะแสดง page header ถ้ามีค่า)
- `fullPage` (boolean, optional) - แสดงแบบเต็มหน้าพร้อม header (default: true)
- `children` (ReactNode, optional) - เนื้อหาเพิ่มเติมที่แสดงด้านล่างข้อความหลัก

**ตัวอย่างการใช้งาน:**

```jsx
import EmptyState from '../components/EmptyState';

// แบบเต็มหน้า - แสดงเมื่อไม่พบข้อมูล
if (!data) {
  return (
    <EmptyState 
      title="ดูคะแนนการประเมิน"
      message="ไม่พบข้อมูลแผนการสอน"
      type="warning"
    />
  );
}

// แบบแสดง error
if (error) {
  return (
    <EmptyState 
      message="เกิดข้อผิดพลาดในการโหลดข้อมูล"
      type="danger"
      icon="fa-times-circle"
      fullPage={false}
    />
  );
}

// แบบแสดงข้อมูลพร้อม action button
if (noResults) {
  return (
    <EmptyState 
      message="ไม่พบผลลัพธ์ที่ค้นหา"
      type="info"
      icon="fa-search"
    >
      <button className="btn btn-primary mt-2" onClick={handleReset}>
        รีเซ็ตการค้นหา
      </button>
    </EmptyState>
  );
}
```

---

## วิธีการนำไปใช้กับหน้าอื่นๆ

### ขั้นตอนที่ 1: Import Components
```jsx
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
```

### ขั้นตอนที่ 2: เพิ่ม Loading State
```jsx
const [loading, setLoading] = useState(true);
const [data, setData] = useState(null);

useEffect(() => {
  const loadData = async () => {
    setLoading(true);
    try {
      const result = await fetchData();
      setData(result);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
  
  loadData();
}, []);
```

### ขั้นตอนที่ 3: ใช้ Component ใน Render
```jsx
// แสดง loading spinner
if (loading) {
  return <LoadingSpinner title="หน้าของฉัน" />;
}

// แสดง empty state เมื่อไม่มีข้อมูล
if (!data) {
  return <EmptyState title="หน้าของฉัน" message="ไม่พบข้อมูล" />;
}

// แสดงข้อมูลปกติ
return (
  <div>
    {/* เนื้อหาหน้าปกติ */}
  </div>
);
```

---

## ตัวอย่างการใช้งานจริง

### ตัวอย่างที่ 1: ViewScoring.jsx
```jsx
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';

const ViewScoring = () => {
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState(null);

  // ... data fetching logic ...

  if (loading) {
    return (
      <LoadingSpinner 
        title="ดูคะแนนการประเมิน"
        message="กำลังโหลดข้อมูลการประเมิน กรุณารอสักครู่..."
      />
    );
  }

  if (!plan) {
    return (
      <EmptyState 
        title="ดูคะแนนการประเมิน"
        message="ไม่พบข้อมูลแผนการสอน"
        type="warning"
      />
    );
  }

  return <div>{/* เนื้อหาปกติ */}</div>;
};
```

### ตัวอย่างที่ 2: Appointment.jsx (Nested Component)
```jsx
const Appointment = () => {
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState(null);

  // ... data fetching logic ...

  if (loading) {
    return (
      <LoadingSpinner 
        message="กำลังโหลดข้อมูลแผนการสอน กรุณารอสักครู่..."
        fullPage={false}  // ไม่แสดง page header
      />
    );
  }

  if (!plan) {
    return (
      <EmptyState 
        message="ไม่พบข้อมูลแผนการสอน"
        fullPage={false}  // ไม่แสดง page header
      />
    );
  }

  return <div>{/* เนื้อหาปกติ */}</div>;
};
```

---

## Best Practices

1. **ใช้ `fullPage={true}` สำหรับหน้าหลัก** - เมื่อ component เป็นหน้าหลักที่แสดงใน route
2. **ใช้ `fullPage={false}` สำหรับ nested components** - เมื่อ component เป็นส่วนหนึ่งของหน้าใหญ่
3. **กำหนด message ที่ชัดเจน** - บอกผู้ใช้ว่ากำลังโหลดอะไรอยู่
4. **เลือก alert type ให้เหมาะสม:**
   - `info` - ข้อมูลทั่วไป
   - `warning` - คำเตือนหรือไม่พบข้อมูล
   - `danger` - ข้อผิดพลาด
   - `success` - สำเร็จ
5. **ใช้ icon ที่เหมาะสม** - เลือก Font Awesome icon ที่สื่อความหมาย

---

## สรุป

Components เหล่านี้ช่วยให้:
- ✅ UI/UX สม่ำเสมอทั้งระบบ
- ✅ ลด code duplication
- ✅ ง่ายต่อการ maintain
- ✅ ปรับปรุงได้ง่ายจากจุดเดียว

หากต้องการปรับแต่งเพิ่มเติม สามารถแก้ไขไฟล์:
- `src/components/LoadingSpinner.jsx`
- `src/components/EmptyState.jsx`
