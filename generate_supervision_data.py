#!/usr/bin/env python3
"""
Generate SQL data for 57 schools supervision system.
Creates realistic sendplan + score + log data for national presentation.
Targets Supabase PostgreSQL.
"""
import random
import re
import json
import os
from datetime import datetime, timedelta

# ===== CONFIG =====
EDU_YEAR = '2568'
EDU_TERM_1 = '1'
EDU_TERM_2 = '2'
BUDGET_YEAR = '2569'
START_DATE_TERM1 = datetime(2025, 5, 15)
END_DATE_TERM1 = datetime(2025, 10, 30)
START_DATE_TERM2 = datetime(2025, 11, 1)
END_DATE_TERM2 = datetime(2026, 3, 31)

SUPERVISORS = [
    '1620100176600', '3640500378842', '3650100588475', '1640100058429',
    '3660400485141', '3671000321168', '1619900108755', '3640500202060',
    '3659900090445', '3530400056402', '3460600433821', '3660100316548',
    '3650800287168', '3640500266025'
]

KHET_SUPERVISORS = {
    '5301': ['1620100176600'],
    '5302': ['1640100058429'],
    '5303': ['3660400485141'],
    '6501': ['3640500202060'],
    '6502': ['3640500378842'],
    '6503': ['3650100588475'],
    '6504': ['3659900090445'],
    '6505': ['3530400056402'],
    '6506': ['3460600433821']
}

SCHOOLS = {
    '1053690315': {'name': 'อุตรดิตถ์', 'khet': '5303'},
    '1053690316': {'name': 'อุตรดิตถ์ดรุณี', 'khet': '5302'},
    '1053690317': {'name': 'เตรียมอุดมศึกษาน้อมเกล้า อุตรดิตถ์', 'khet': '5302'},
    '1053690318': {'name': 'ทุ่งกะโล่วิทยา', 'khet': '5301'},
    '1053690319': {'name': 'แสนตอวิทยา', 'khet': '5303'},
    '1053690321': {'name': 'น้ำริดวิทยา', 'khet': '5303'},
    '1053690322': {'name': 'ตรอนตรีสินธุ์', 'khet': '5301'},
    '1053690323': {'name': 'ท่าปลาประชาอุทิศ', 'khet': '5303'},
    '1053690324': {'name': 'น้ำปาดชนูปถัมภ์', 'khet': '5302'},
    '1053690325': {'name': 'ฟากท่าวิทยา', 'khet': '5302'},
    '1053690326': {'name': 'บ้านโคกวิทยาคม', 'khet': '5302'},
    '1053690327': {'name': 'พิชัย', 'khet': '5301'},
    '1053690328': {'name': 'บ้านโคนพิทยา', 'khet': '5301'},
    '1053690329': {'name': 'ดาราพิทยาคม', 'khet': '5301'},
    '1053690330': {'name': 'ลับแลศรีวิทยา', 'khet': '5303'},
    '1053690331': {'name': 'ลับแลพิทยาคม', 'khet': '5302'},
    '1053690332': {'name': 'ด่านแม่คำมันพิทยาคม', 'khet': '5301'},
    '1053690333': {'name': 'ทองแสนขันวิทยา', 'khet': '5303'},
    '1065360459': {'name': 'พิษณุโลกพิทยาคม', 'khet': '6501'},
    '1065360460': {'name': 'เฉลิมขวัญสตรี', 'khet': '6505'},
    '1065360461': {'name': 'จ่านกร้อง', 'khet': '6504'},
    '1065360462': {'name': 'เตรียมอุดมศึกษาภาคเหนือ พิษณุโลก', 'khet': '6503'},
    '1065360463': {'name': 'วังน้ำคู้ศึกษา', 'khet': '6503'},
    '1065360464': {'name': 'ท่าทองพิทยาคม', 'khet': '6501'},
    '1065360465': {'name': 'ดอนทองวิทยา', 'khet': '6503'},
    '1065360466': {'name': 'บ้านกร่างวิทยาคม', 'khet': '6501'},
    '1065360467': {'name': 'พุทธชินราชพิทยา', 'khet': '6503'},
    '1065360468': {'name': 'วิทยาศาสตร์จุฬาภรณราชวิทยาลัย พิษณุโลก', 'khet': '6503'},
    '1065360470': {'name': 'นครไทย', 'khet': '6502'},
    '1065360471': {'name': 'นาบัววิทยา', 'khet': '6502'},
    '1065360472': {'name': 'นครชุมพิทยา รัชมังคลาภิเษก', 'khet': '6502'},
    '1065360473': {'name': 'นครบางยางพิทยาคม', 'khet': '6502'},
    '1065360474': {'name': 'บ่อโพธิ์วิทยา', 'khet': '6502'},
    '1065360475': {'name': 'ยางโกลนวิทยา', 'khet': '6502'},
    '1065360479': {'name': 'ชาติตระการวิทยา', 'khet': '6502'},
    '1065360480': {'name': 'สวนเมี่ยงวิทยา', 'khet': '6502'},
    '1065360481': {'name': 'บางระกำวิทยศึกษา', 'khet': '6501'},
    '1065360482': {'name': 'ชุมแสงสงคราม อุดรคณารักษ์อุปถัมภ์', 'khet': '6501'},
    '1065360483': {'name': 'ประชาสงเคราะห์วิทยา', 'khet': '6501'},
    '1065360484': {'name': 'เนินกุ่มวิทยา', 'khet': '6505'},
    '1065360485': {'name': 'บางกระทุ่มพิทยาคม', 'khet': '6505'},
    '1065360486': {'name': 'พรหมพิรามวิทยา', 'khet': '6504'},
    '1065360487': {'name': 'วังมะด่านพิทยาคม', 'khet': '6504'},
    '1065360488': {'name': 'ดงประคำพิทยาคม', 'khet': '6504'},
    '1065360489': {'name': 'วัดโบสถ์ศึกษา', 'khet': '6504'},
    '1065360490': {'name': 'คันโช้งพิทยาคม', 'khet': '6504'},
    '1065360491': {'name': 'วังทองพิทยาคม', 'khet': '6506'},
    '1065360492': {'name': 'สฤษดิ์เสนาพิทยาคม', 'khet': '6506'},
    '1065360493': {'name': 'หนองพระพิทยา', 'khet': '6506'},
    '1065360494': {'name': 'ทรัพย์ไพรวัลย์วิทยาคม', 'khet': '6506'},
    '1065360495': {'name': 'บ้านกลางพิทยาคม', 'khet': '6506'},
    '1065360496': {'name': 'เนินสะอาดวิทยาคม', 'khet': '6506'},
    '1065360497': {'name': 'น้ำรินพิทยาคม', 'khet': '6506'},
    '1065360498': {'name': 'วังพิกุลวิทยศึกษา', 'khet': '6506'},
    '1065360499': {'name': 'เนินมะปรางศึกษาวิทยา', 'khet': '6505'},
    '1065360500': {'name': 'วังโพรงพิทยาคม', 'khet': '6505'},
    '1065360501': {'name': 'ไทรย้อยพิทยาคม', 'khet': '6505'},
}

TEACH_SUBJECTS = {
    '1001': {'name': 'ภาษาไทย', 'codes': ['ท21101', 'ท22101', 'ท23101', 'ท31101', 'ท32101', 'ท33101']},
    '1002': {'name': 'ศิลปะ', 'codes': ['ศ21101', 'ศ22101', 'ศ23101', 'ศ31101', 'ศ32101']},
    '1003': {'name': 'วิทยาศาสตร์และเทคโนโลยี', 'codes': ['ว21101', 'ว22101', 'ว23101', 'ว31101', 'ว31201', 'ว32101']},
    '1004': {'name': 'คณิตศาสตร์', 'codes': ['ค21101', 'ค22101', 'ค23101', 'ค31101', 'ค32101', 'ค33101']},
    '1005': {'name': 'ภาษาต่างประเทศ', 'codes': ['อ21101', 'อ22101', 'อ23101', 'อ31101', 'อ32101', 'อ33101']},
    '1006': {'name': 'สังคมศึกษา ศาสนาและวัฒนธรรม', 'codes': ['ส21101', 'ส22101', 'ส23101', 'ส31101', 'ส32101']},
    '1007': {'name': 'สุขศึกษาและพลศึกษา', 'codes': ['พ21101', 'พ22101', 'พ23101', 'พ31101', 'พ32101']},
    '1008': {'name': 'การงานอาชีพ', 'codes': ['ง21101', 'ง22101', 'ง23101', 'ง31101', 'ง32101']},
}

GRADE_LEVELS = ['411', '412', '413', '421', '422', '423']
LEARNING_MODELS = ['1', '3', '4', '5', '6', '7', '8', '10', '11', '12']
COMPETENCY_OPTIONS = ['CO1,CO2', 'CO2,CO3', 'CO1,CO3', 'CO1,CO2,CO3', 'CO2,CO4', 'CO1,CO4', 'CO3,CO4']
ABILITY21_OPTIONS = ['R1,R2', 'R2,R3', 'R1,C1', 'C1,C2', 'R1,R2,C1', 'C2,C3', 'R2,C4', 'C5,C6']
DESIRABLE_OPTIONS = ['D1,D2', 'D2,D3', 'D1,D3', 'D1,D2,D3', 'D1,D4', 'D2,D4']
SUBJECT_CONTENTS = ['การจัดการเรียนรู้', 'การวัดและประเมินผล', 'กระบวนการคิด', 'ทักษะการสื่อสาร', 'การแก้ปัญหา', 'การคิดวิเคราะห์', 'การสร้างสรรค์ผลงาน', 'การประยุกต์ใช้เทคโนโลยี']
SUBJECT_NAME_PLANS = ['แผนการเรียนรู้', 'การจัดกิจกรรมการเรียนรู้', 'หน่วยการเรียนรู้', 'กิจกรรมเสริมทักษะ', 'บทเรียนบูรณาการ']
DS_COMMENTS_PASS = [
    '<font style="color:green">แผนการสอนนี้สามารถนำไปใช้งานได้ดี มีเทคนิควิธีการสอนที่หลากหลาย</font>',
    '<font style="color:green">อนุมัติแผนการจัดการเรียนรู้ มีการออกแบบกิจกรรมที่ส่งเสริม Active Learning</font>',
    '<font style="color:green">แผนมีความสมบูรณ์ดี มีการวัดผลประเมินผลที่หลากหลาย</font>',
    '<font style="color:green">แผนการจัดการเรียนรู้มีคุณภาพดี สอดคล้องกับตัวชี้วัดและมาตรฐาน</font>',
]
INDICATORS_MID = ['ว 1.1 ม.4/4', 'ค 1.1 ม.4/1', 'ท 1.1 ม.4/2', 'อ 1.1 ม.4/3', 'ส 1.1 ม.4/1']
INDICATORS_FINAL = ['ว 1.1 ม.4/1', 'ค 1.1 ม.4/2', 'ท 1.1 ม.4/1', 'อ 1.1 ม.4/1', 'ส 1.1 ม.4/2']
POLICY_IDS = [25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36]
POLICY_WEIGHTS = {25: 2.5, 26: 2.5, 27: 2.5, 28: 2.5, 29: 2.5, 30: 2.5, 31: 2.5, 32: 2.5, 33: 5.0, 34: 5.0, 35: 5.0, 36: 5.0}


def extract_teachers_from_sql():
    sql_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'phetcha7_pns2-20260205.sql')
    with open(sql_path, 'r', encoding='utf-8') as f:
        content = f.read()
    start_idx = content.find("INSERT INTO `tbl_Users`")
    insert_block = content[start_idx:]
    end_idx = insert_block.find("\n\n--")
    if end_idx > 0:
        insert_block = insert_block[:end_idx]
    tuples = re.findall(r'\((\d+,\s*\'[^)]+)\)', insert_block)
    teachers_by_school = {}
    directors_by_school = {}
    for t in tuples:
        school_match = re.search(r"'([A-Za-z0-9+/=]+)',\s*'(\d{10})'", t)
        level_match = re.search(r"'(teacher|directorschool)'", t)
        people_match = re.search(r"^\d+,\s*'(\d{10,13})'", t)
        if school_match and level_match and people_match:
            school = school_match.group(2)
            level = level_match.group(1)
            people_id = people_match.group(1)
            if level == 'teacher':
                if school not in teachers_by_school:
                    teachers_by_school[school] = []
                teachers_by_school[school].append(people_id)
            elif level == 'directorschool':
                if school not in directors_by_school:
                    directors_by_school[school] = []
                directors_by_school[school].append(people_id)
    return teachers_by_school, directors_by_school


def random_time_pair():
    start_hours = [8, 9, 10, 11, 13, 14, 15]
    start_h = random.choice(start_hours)
    start_m = random.choice([0, 20, 30, 40])
    duration = random.choice([50, 100, 150])
    end_h = start_h + (start_m + duration) // 60
    end_m = (start_m + duration) % 60
    return f"{start_h:02d}:{start_m:02d}:00", f"{end_h:02d}:{end_m:02d}:00", duration


def random_date_in_range(start, end):
    delta = (end - start).days
    for _ in range(100):
        d = start + timedelta(days=random.randint(0, delta))
        if d.weekday() < 5:
            return d
    return start + timedelta(days=1)


def escape_sql(val):
    if val is None:
        return 'NULL'
    return str(val).replace("'", "''")


def generate_sql():
    random.seed(42)
    print("Extracting teacher data from SQL dump...")
    teachers_by_school, directors_by_school = extract_teachers_from_sql()
    print(f"Found teachers in {len(teachers_by_school)} schools")

    plans = []
    scores = []
    plan_id = 10

    for school_code, school_info in SCHOOLS.items():
        khet = school_info['khet']
        teachers = teachers_by_school.get(school_code, [])
        directors = directors_by_school.get(school_code, [])
        if not teachers:
            continue
        khet_sups = KHET_SUPERVISORS.get(khet, SUPERVISORS[:2])
        director = directors[0] if directors else ''
        num_plans = min(random.randint(2, 4), len(teachers))
        selected_teachers = random.sample(teachers, num_plans)

        for teacher_pid in selected_teachers:
            for _ in range(random.randint(1, 2)):
                plan_id += 1
                subj_id = random.choice(list(TEACH_SUBJECTS.keys()))
                subj_info = TEACH_SUBJECTS[subj_id]
                subj_code = random.choice(subj_info['codes'])
                if random.random() < 0.6:
                    edu_term = EDU_TERM_1
                    teach_date = random_date_in_range(START_DATE_TERM1, END_DATE_TERM1)
                else:
                    edu_term = EDU_TERM_2
                    teach_date = random_date_in_range(START_DATE_TERM2, END_DATE_TERM2)
                time_start, time_end, minutes = random_time_pair()
                status_roll = random.random()
                if status_roll < 0.35:
                    plan_status = '7'
                elif status_roll < 0.60:
                    plan_status = '5'
                elif status_roll < 0.80:
                    plan_status = '2'
                elif status_roll < 0.90:
                    plan_status = '6'
                else:
                    plan_status = '1'
                plan_approve = '1' if plan_status in ('2', '5', '6', '7') else '0'
                ds_comment = random.choice(DS_COMMENTS_PASS) if plan_approve == '1' else ''
                send_date = teach_date - timedelta(days=random.randint(1, 7))
                send_datetime = send_date.strftime('%Y-%m-%d') + f' {random.randint(8,21):02d}:{random.randint(0,59):02d}:{random.randint(0,59):02d}'
                committee1 = random.choice(khet_sups) if plan_status in ('5', '6', '7') else ''
                committee2 = random.choice(SUPERVISORS) if plan_status in ('6', '7') else ''
                score_date1 = (teach_date + timedelta(days=random.randint(3, 14))).strftime('%Y-%m-%d') if committee1 else '0000-00-00'
                score_date2 = (teach_date + timedelta(days=random.randint(3, 14))).strftime('%Y-%m-%d') if committee2 else '0000-00-00'
                clip = 'dQw4w9WgXcQ' if plan_status in ('5', '6', '7') else ''
                after_teaching = '<p>ผลการสอน: นักเรียนสามารถเข้าใจเนื้อหาได้ดี</p>' if plan_status in ('5', '6', '7') else ''

                plan = {
                    'planid': plan_id, 'people_id': teacher_pid, 'school_code': school_code,
                    'teach_subject_id': subj_id, 'grade_level_id': random.choice(GRADE_LEVELS),
                    'edu_year': EDU_YEAR, 'edu_term': edu_term, 'budget_year': BUDGET_YEAR,
                    'subject_code': subj_code, 'subject_name': subj_info['name'],
                    'subject_content': random.choice(SUBJECT_CONTENTS),
                    'subject_name_plan': random.choice(SUBJECT_NAME_PLANS),
                    'teach_date': teach_date.strftime('%Y-%m-%d'),
                    'teach_timestart': time_start, 'teach_timeend': time_end, 'teach_minute': minutes,
                    'learning_model': random.choice(LEARNING_MODELS),
                    'competency': random.choice(COMPETENCY_OPTIONS),
                    'ability21': random.choice(ABILITY21_OPTIONS),
                    'desirable': random.choice(DESIRABLE_OPTIONS),
                    'learning_outcomes': 'นักเรียนสามารถอธิบายและประยุกต์ใช้ความรู้ที่เรียนได้',
                    'learning_content': 'เนื้อหาตามหลักสูตรแกนกลางการศึกษาขั้นพื้นฐาน',
                    'learning_activities': 'กิจกรรมการเรียนรู้แบบ Active Learning',
                    'assessment': 'การประเมินตามสภาพจริง ใบงาน แบบทดสอบ',
                    'instructional_media': 'สื่อมัลติมีเดีย ใบงาน PowerPoint',
                    'indicators_mid': random.choice(INDICATORS_MID),
                    'indicators_final': random.choice(INDICATORS_FINAL),
                    'plan_file': f'fileupload/{EDU_YEAR}_{edu_term}/{teacher_pid}_{teach_date.strftime("%d%m%Y%H%M%S")}.pdf',
                    'plan_senddate': send_datetime, 'plan_status': plan_status,
                    'plan_approve': plan_approve, 'plan_ds_comment': ds_comment,
                    'plan_after_teaching': after_teaching, 'plan_clip': clip,
                    'committee1': committee1, 'date_scoring1': score_date1,
                    'committee2': committee2, 'date_scoring2': score_date2,
                    'committee3': '', 'date_scoring3': '0000-00-00',
                    'committee4': '', 'date_scoring4': '0000-00-00',
                    'committee5': '', 'date_scoring5': '0000-00-00',
                    'director': director,
                }
                plans.append(plan)

                if plan_status in ('6', '7'):
                    for pid in POLICY_IDS:
                        score_val = random.choice([3, 4, 4, 4, 5, 5, 5, 5])
                        weight = POLICY_WEIGHTS[pid]
                        score_weight = score_val * weight / 5
                        score_datetime = (teach_date + timedelta(days=random.randint(5, 20))).strftime('%Y-%m-%d') + f' {random.randint(9,17):02d}:{random.randint(0,59):02d}:{random.randint(0,59):02d}'
                        scores.append({
                            'planid': str(plan_id), 'policy_id': str(pid),
                            'score': score_val, 'score_weight': score_weight,
                            'supervision': committee1 if committee1 else khet_sups[0],
                            'academic': '16', 'create_at': score_datetime,
                        })

    # Generate logs
    logs = []
    log_id = 1000
    ip_ranges = ['223.207.234.', '159.192.105.', '49.230.248.', '223.24.170.']
    browsers = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) AppleWebKit/605.1.15 Mobile Safari/604.1',
        'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36',
    ]
    for school_code in SCHOOLS:
        teachers = teachers_by_school.get(school_code, [])
        directors = directors_by_school.get(school_code, [])
        for d in directors[:1]:
            for _ in range(random.randint(3, 8)):
                log_id += 1
                log_date = random_date_in_range(START_DATE_TERM1, END_DATE_TERM2)
                logs.append({'id': log_id, 'user': d, 'ipaddress': random.choice(ip_ranges) + str(random.randint(1, 254)),
                    'datetimein': log_date.strftime('%Y-%m-%d') + f' {random.randint(7,18):02d}:{random.randint(0,59):02d}:{random.randint(0,59):02d}',
                    'level': 'directorschool', 'screenresolution': random.choice(['1920*1080', '1366*768', '*']), 'browser': random.choice(browsers)})
        for t in teachers[:min(5, len(teachers))]:
            for _ in range(random.randint(2, 6)):
                log_id += 1
                log_date = random_date_in_range(START_DATE_TERM1, END_DATE_TERM2)
                logs.append({'id': log_id, 'user': t, 'ipaddress': random.choice(ip_ranges) + str(random.randint(1, 254)),
                    'datetimein': log_date.strftime('%Y-%m-%d') + f' {random.randint(7,21):02d}:{random.randint(0,59):02d}:{random.randint(0,59):02d}',
                    'level': 'teacher', 'screenresolution': random.choice(['1920*1080', '1366*768', '*']), 'browser': random.choice(browsers)})
    for s in SUPERVISORS:
        for _ in range(random.randint(10, 25)):
            log_id += 1
            log_date = random_date_in_range(START_DATE_TERM1, END_DATE_TERM2)
            logs.append({'id': log_id, 'user': s, 'ipaddress': random.choice(ip_ranges) + str(random.randint(1, 254)),
                'datetimein': log_date.strftime('%Y-%m-%d') + f' {random.randint(7,18):02d}:{random.randint(0,59):02d}:{random.randint(0,59):02d}',
                'level': 'supervisor', 'screenresolution': '1920*1080', 'browser': random.choice(browsers)})

    # Statistics
    status_counts = {}
    school_counts = {}
    for p in plans:
        status_counts[p['plan_status']] = status_counts.get(p['plan_status'], 0) + 1
        school_counts[p['school_code']] = school_counts.get(p['school_code'], 0) + 1

    status_names = {'1': 'รอผอ.อนุมัติ', '2': 'อนุมัติแล้ว', '5': 'ส่งคลิปแล้ว', '6': 'กำลังประเมิน', '7': 'ประเมินเสร็จ'}
    print(f"\nTotal Plans: {len(plans)}, Scores: {len(scores)}, Logs: {len(logs)}")
    print(f"Schools covered: {len(school_counts)}")
    for k, v in sorted(status_counts.items()):
        print(f"  Status {k} ({status_names.get(k, '?')}): {v}")

    # Write SQL
    sql_lines = []
    sql_lines.append(f"-- Supervision Data for 57 Schools - Generated {datetime.now().strftime('%Y-%m-%d')}")
    sql_lines.append(f"-- Plans: {len(plans)}, Scores: {len(scores)}, Logs: {len(logs)}\n")

    fields = ['planid','people_id','school_code','teach_subject_id','grade_level_id','edu_year','edu_term','budget_year','subject_code','subject_name','subject_content','subject_name_plan','teach_date','teach_timestart','teach_timeend','teach_minute','learning_model','competency','ability21','desirable','learning_outcomes','learning_content','learning_activities','assessment','instructional_media','indicators_mid','indicators_final','plan_file','plan_senddate','plan_status','plan_approve','plan_ds_comment','plan_after_teaching','plan_clip','committee1','date_scoring1','committee2','date_scoring2','committee3','date_scoring3','committee4','date_scoring4','committee5','date_scoring5','director']
    int_fields = {'planid', 'teach_minute'}

    for p in plans:
        cols = ', '.join(fields)
        vals = []
        for f in fields:
            v = p[f]
            if f in int_fields:
                vals.append(str(v))
            else:
                vals.append(f"'{escape_sql(v)}'")
        sql_lines.append(f'INSERT INTO "tbl_sendplan" ({cols}) VALUES ({", ".join(vals)});')

    sql_lines.append("")
    score_auto_id = 100
    for s in scores:
        score_auto_id += 1
        sql_lines.append(f'INSERT INTO "tbl_sendplan_score" (auto_id, planid, policy_id, score, score_weight, supervision, academic, create_at) VALUES ({score_auto_id}, \'{s["planid"]}\', \'{s["policy_id"]}\', {s["score"]}, {s["score_weight"]:.1f}, \'{s["supervision"]}\', \'{s["academic"]}\', \'{s["create_at"]}\');')

    sql_lines.append("")
    for l in logs:
        sql_lines.append(f'INSERT INTO "tbl_log" (id, "user", ipaddress, datetimein, level, screenresolution, browser_name_regex) VALUES ({l["id"]}, \'{escape_sql(l["user"])}\', \'{l["ipaddress"]}\', \'{l["datetimein"]}\', \'{l["level"]}\', \'{l["screenresolution"]}\', \'{escape_sql(l["browser"])}\');')

    output_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'supervision_data_57schools.sql')
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(sql_lines))
    print(f"\n✅ SQL file: {output_path}")

    summary = {'total_plans': len(plans), 'total_scores': len(scores), 'total_logs': len(logs),
        'schools_covered': len(school_counts), 'status_distribution': status_counts,
        'plans_per_school': {sc: cnt for sc, cnt in sorted(school_counts.items())}}
    summary_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'supervision_data_summary.json')
    with open(summary_path, 'w', encoding='utf-8') as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    print(f"   Summary: {summary_path}")


if __name__ == '__main__':
    generate_sql()
