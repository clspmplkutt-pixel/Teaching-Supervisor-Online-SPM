#!/usr/bin/env python3
"""
Generate strictly aligned SQL data for PNS2 National Presentation.
Requirements:
1. Exactly 57 teachers (1 per school).
2. Exactly 2 rounds (plans) per teacher in year 2569.
3. 51 online (with clips), 6 on-site (no clips). Total clips = 102.
4. Subject involves "Coding เชิงรุก".
5. Scores show clear improvement from Round 1 to Round 2.
"""
import random
import re
import json
import os
from datetime import datetime, timedelta

# ===== CONFIG =====
EDU_YEAR = '2568'  # Set to 2568 to match the report's main evaluation timeframe
EDU_TERM_1 = '1'
EDU_TERM_2 = '2'
BUDGET_YEAR = '2569'
START_DATE_TERM1 = datetime(2025, 5, 15)
END_DATE_TERM1 = datetime(2025, 8, 30)
START_DATE_TERM2 = datetime(2025, 11, 1)
END_DATE_TERM2 = datetime(2026, 2, 28)

SUPERVISORS = [
    '1620100176600', '3640500378842', '3650100588475', '1640100058429',
    '3660400485141', '3671000321168', '1619900108755', '3640500202060',
    '3659900090445', '3530400056402', '3460600433821', '3660100316548',
    '3650800287168', '3640500266025'
]

KHET_SUPERVISORS = {
    '5301': ['1620100176600'], '5302': ['1640100058429'], '5303': ['3660400485141'],
    '6501': ['3640500202060'], '6502': ['3640500378842'], '6503': ['3650100588475'],
    '6504': ['3659900090445'], '6505': ['3530400056402'], '6506': ['3460600433821']
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

# The 5 Learner Competencies
COMPETENCIES = [
    'ความสามารถในการสื่อสาร', 
    'ความสามารถในการคิด', 
    'ความสามารถในการแก้ปัญหา', 
    'ความสามารถในการใช้ทักษะชีวิต', 
    'ความสามารถในการใช้เทคโนโลยี'
]

# Policy weights based on academic_id. Here we use 16 (ครูชำนาญการ) as default which uses items 25-36
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
    academic_by_teacher = {}
    for t in tuples:
        school_match = re.search(r"'([A-Za-z0-9+/=]+)',\s*'(\d{10})'", t)
        level_match = re.search(r"'(teacher|directorschool)'", t)
        people_match = re.search(r"^\d+,\s*'(\d{10,13})'", t)
        academic_match = re.search(r"^\d+,\s*'\d{10,13}',\s*'[^']*',\s*'[^']*',\s*'[^']*',\s*'\d+',\s*'\d+',\s*'(\d+)'", t)
        
        if school_match and level_match and people_match:
            school = school_match.group(2)
            level = level_match.group(1)
            people_id = people_match.group(1)
            acad_id = academic_match.group(1) if academic_match else '16'
            
            if level == 'teacher':
                if school not in teachers_by_school:
                    teachers_by_school[school] = []
                teachers_by_school[school].append(people_id)
                academic_by_teacher[people_id] = acad_id
            elif level == 'directorschool':
                if school not in directors_by_school:
                    directors_by_school[school] = []
                directors_by_school[school].append(people_id)
    return teachers_by_school, directors_by_school, academic_by_teacher


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
    random.seed(1234) # Stable seed for exactly 57 teachers
    
    print("Extracting teacher data from SQL dump...")
    teachers_by_school, directors_by_school, acad_by_teacher = extract_teachers_from_sql()
    
    # 1. Pick exactly 1 teacher per school (57 total)
    selected_teachers = {}
    for scode in SCHOOLS:
        if scode in teachers_by_school and teachers_by_school[scode]:
            # Always pick the first teacher for consistency
            selected_teachers[scode] = teachers_by_school[scode][0]
            
    print(f"Selected exactly {len(selected_teachers)} teachers for the presentation.")
    
    # 2. Select 51 schools for Online (Clips) and 6 for Onsite
    school_codes = list(selected_teachers.keys())
    online_schools = set(school_codes[:51])
    onsite_schools = set(school_codes[51:])
    
    plans = []
    scores = []
    plan_id = 1000 # Start from 1000 to be completely separate
    
    # Generate 2 rounds for each teacher
    for school_code, teacher_pid in selected_teachers.items():
        khet = SCHOOLS[school_code]['khet']
        director = directors_by_school.get(school_code, [''])[0]
        khet_sups = KHET_SUPERVISORS.get(khet, SUPERVISORS[:2])
        acad_id = acad_by_teacher.get(teacher_pid, '16')
        
        is_online = school_code in online_schools
        
        # Round 1
        plan_id += 1
        teach_date_1 = random_date_in_range(START_DATE_TERM1, END_DATE_TERM1)
        send_date_1 = teach_date_1 - timedelta(days=5)
        score_date_1 = teach_date_1 + timedelta(days=7)
        
        plan_1 = {
            'planid': plan_id, 'people_id': teacher_pid, 'school_code': school_code,
            'teach_subject_id': '1003', # วิทยาศาสตร์และเทคโนโลยี
            'grade_level_id': '411', # ม.1
            'edu_year': EDU_YEAR, 'edu_term': EDU_TERM_1, 'budget_year': BUDGET_YEAR,
            'subject_code': 'ว21104', 'subject_name': 'การออกแบบและเทคโนโลยี',
            'subject_content': 'วิทยาการคำนวณและ Coding เชิงรุก',
            'subject_name_plan': 'แผนการจัดการเรียนรู้แบบ Active Coding',
            'teach_date': teach_date_1.strftime('%Y-%m-%d'),
            'teach_timestart': '09:00:00', 'teach_timeend': '10:00:00', 'teach_minute': 60,
            'learning_model': '6', # Project-Based
            'competency': 'CO1,CO2,CO3,CO4,CO5', # All 5 competencies
            'ability21': 'R1,C1,C2',
            'desirable': 'D1,D2,D3',
            'learning_outcomes': 'นักเรียนสามารถเขียนโปรแกรมแก้ปัญหาด้วยแนวคิดเชิงคำนวณ',
            'learning_content': 'การเขียนโปรแกรมด้วย Scratch / Python',
            'learning_activities': 'กิจกรรมการเรียนรู้ 6 ขั้นตอนตามแนวทาง Active Coding',
            'instructional_media': 'สื่อวิดีทัศน์ ใบกิจกรรม เครื่องคอมพิวเตอร์',
            'indicators_mid': 'ว 4.2 ม.1/1', 'indicators_final': 'ว 4.2 ม.1/2',
            'plan_file': f'fileupload/{EDU_YEAR}_{EDU_TERM_1}/{teacher_pid}_plan1.pdf',
            'plan_senddate': send_date_1.strftime('%Y-%m-%d 08:30:00'),
            'plan_status': '7', # ประเมินเสร็จ
            'plan_approve': '1', 
            'plan_ds_comment': '<font style="color:green">อนุมัติแผนการจัดการเรียนรู้ มีการออกแบบกิจกรรมที่ส่งเสริม Active Learning อย่างชัดเจน</font>',
            'plan_after_teaching': '<p>ผลการสอน: นักเรียนสามารถออกแบบโครงงานที่เชื่อมโยงกับทักษะชีวิตและการแก้ปัญหาได้อย่างยอดเยี่ยม</p>', 
            'plan_clip': 'v=J4-7Z0yUvI4' if is_online else '',
            'committee1': khet_sups[0], 'date_scoring1': score_date_1.strftime('%Y-%m-%d'),
            'committee2': SUPERVISORS[1], 'date_scoring2': score_date_1.strftime('%Y-%m-%d'),
            'committee3': '', 'date_scoring3': None,
            'committee4': '', 'date_scoring4': None,
            'committee5': '', 'date_scoring5': None,
            'director': director,
        }
        plans.append(plan_1)
        
        # Round 1 Scores (Lower scores, avg 3-4)
        for pid in POLICY_IDS:
            score_val = random.choice([3, 3, 4, 4]) 
            weight = POLICY_WEIGHTS[pid]
            score_weight = score_val * weight / 5
            scores.append({
                'planid': str(plan_id), 'policy_id': str(pid), 'score': score_val, 'score_weight': score_weight,
                'supervision': khet_sups[0], 'academic': acad_id, 'create_at': score_date_1.strftime('%Y-%m-%d 10:00:00'),
            })

        # Round 2
        plan_id += 1
        teach_date_2 = random_date_in_range(START_DATE_TERM2, END_DATE_TERM2)
        send_date_2 = teach_date_2 - timedelta(days=4)
        score_date_2 = teach_date_2 + timedelta(days=6)
        
        plan_2 = plan_1.copy()
        plan_2.update({
            'planid': plan_id,
            'edu_term': EDU_TERM_2,
            'teach_date': teach_date_2.strftime('%Y-%m-%d'),
            'plan_senddate': send_date_2.strftime('%Y-%m-%d 08:30:00'),
            'date_scoring1': score_date_2.strftime('%Y-%m-%d'),
            'date_scoring2': score_date_2.strftime('%Y-%m-%d'),
            'plan_after_teaching': '<p>ผลการสอน: นำ feedback จากรอบที่ 1 มาปรับปรุง นักเรียนสามารถเชื่อมโยงแนวคิด Coding สู่การแก้ปัญหาชีวิตประจำวันได้ดียิ่งขึ้น</p>', 
            'plan_ds_comment': '<font style="color:green">แผนการสอนมีการพัฒนาขึ้นอย่างชัดเจน นักเรียนได้ลงมือปฏิบัติและสร้างสรรค์นวัตกรรม</font>',
        })
        plans.append(plan_2)
        
        # Round 2 Scores (Higher scores, avg 4-5 to show development)
        for pid in POLICY_IDS:
            score_val = random.choice([4, 5, 5]) 
            weight = POLICY_WEIGHTS[pid]
            score_weight = score_val * weight / 5
            scores.append({
                'planid': str(plan_id), 'policy_id': str(pid), 'score': score_val, 'score_weight': score_weight,
                'supervision': khet_sups[0], 'academic': acad_id, 'create_at': score_date_2.strftime('%Y-%m-%d 10:00:00'),
            })

    # Write SQL
    sql_lines = []
    sql_lines.append(f"-- ===================================================================")
    sql_lines.append(f"-- PNS2 Strict Alignment Data for National Presentation")
    sql_lines.append(f"-- Teachers: {len(selected_teachers)}, Online Schools: {len(online_schools)}, On-site: {len(onsite_schools)}")
    sql_lines.append(f"-- Total Plans: {len(plans)}, Total Clips: {len(online_schools) * 2}")
    sql_lines.append(f"-- ===================================================================")
    
    # Use INSERT IGNORE or just standard INSERT since we use planid >= 1000 which shouldn't conflict
    # sql_lines.append("DELETE FROM \"tbl_sendplan\" WHERE planid >= 1000;")
    # sql_lines.append("DELETE FROM \"tbl_sendplan_score\" WHERE planid >= '1000';\n")

    fields = ['planid','people_id','school_code','teach_subject_id','grade_level_id','edu_year','edu_term','budget_year','subject_code','subject_name','subject_content','subject_name_plan','teach_date','teach_timestart','teach_timeend','teach_minute','learning_model','competency','ability21','desirable','learning_outcomes','learning_content','learning_activities','instructional_media','indicators_mid','indicators_final','plan_file','plan_senddate','plan_status','plan_approve','plan_ds_comment','plan_after_teaching','plan_clip','committee1','date_scoring1','committee2','date_scoring2','committee3','date_scoring3','committee4','date_scoring4','committee5','date_scoring5','director']
    int_fields = {'planid', 'teach_minute'}

    for p in plans:
        cols = ', '.join(fields)
        vals = []
        for f in fields:
            v = p[f]
            if f in int_fields: vals.append(str(v))
            elif v is None: vals.append('NULL')
            else: vals.append(f"'{escape_sql(v)}'")
        sql_lines.append(f'INSERT INTO "tbl_sendplan" ({cols}) VALUES ({", ".join(vals)});')

    sql_lines.append("")
    score_auto_id = 5000
    for s in scores:
        score_auto_id += 1
        sql_lines.append(f'INSERT INTO "tbl_sendplan_score" (auto_id, planid, policy_id, score, score_weight, supervision, academic, create_at) VALUES ({score_auto_id}, \'{s["planid"]}\', \'{s["policy_id"]}\', {s["score"]}, {s["score_weight"]:.1f}, \'{s["supervision"]}\', \'{s["academic"]}\', \'{s["create_at"]}\');')

    output_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'pns2_national_presentation_data.sql')
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(sql_lines))
    print(f"\n✅ SQL file: {output_path}")
    
    # Save demo accounts
    demo_accounts = {
        'Teacher': list(selected_teachers.values())[0],
        'Director': directors_by_school[list(selected_teachers.keys())[0]][0],
        'Supervisor': SUPERVISORS[0]
    }
    print(f"\nDemo Accounts to use (Password is default set in the system, typically same as username or placeholder):")
    for k,v in demo_accounts.items():
        print(f" - {k}: {v}")

if __name__ == '__main__':
    generate_sql()
