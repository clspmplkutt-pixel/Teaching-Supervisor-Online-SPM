<?php
set_time_limit(5000);
include_once("include/config.php");
include_once("include/connect_db.php");
include_once("include/define.php");
$tbl = "tbl_school_DMCdata";

$row_area = $database->select("tbl_system_area", "Area_CODE8");
foreach ($row_area as $areaCode_r) {
    for ($year = 2565; $year <= 2566; $year++) {
        $year_short = substr($year, 2);
        for ($y = 1; $y <= 3; $y++) {

            $url = "https://portal.bopp-obec.info/obec" . $year_short . "/restpublicstat/download/area/" . $year . "-" . $y . "-schoolmis-" . $areaCode_r . ".json";
            echo $url . "<br>";
            $data_sch = file_get_contents($url);
            $data_de = json_decode($data_sch);
            if ($data_de->success) {
                $num_school = count($data_de->data);
                for ($i = 0; $i < $num_school - 1; $i++) {
                    $areaCode = $data_de->data[$i]->{'รหัสเขต'};
                    $school_id = $data_de->data[$i]->{'รหัสโรงเรียน'};
                    $a1m = $data_de->data[$i]->{'อ.1 ชาย'};
                    $a1f = $data_de->data[$i]->{'อ.1 หญิง'};
                    $a1r = $data_de->data[$i]->{'อ.1 ห้อง'};

                    $a2m = $data_de->data[$i]->{'อ.2 ชาย'};
                    $a2f = $data_de->data[$i]->{'อ.2 หญิง'};
                    $a2r = $data_de->data[$i]->{'อ.2 ห้อง'};

                    $a3m = $data_de->data[$i]->{'อ.3 ชาย'};
                    $a3f = $data_de->data[$i]->{'อ.3 หญิง'};
                    $a3r = $data_de->data[$i]->{'อ.3 ห้อง'};

                    $p1m = $data_de->data[$i]->{'ป.1 ชาย'};
                    $p1f = $data_de->data[$i]->{'ป.1 หญิง'};
                    $p1r = $data_de->data[$i]->{'ป.1 ห้อง'};

                    $p2m = $data_de->data[$i]->{'ป.2 ชาย'};
                    $p2f = $data_de->data[$i]->{'ป.2 หญิง'};
                    $p2r = $data_de->data[$i]->{'ป.2 ห้อง'};

                    $p3m = $data_de->data[$i]->{'ป.3 ชาย'};
                    $p3f = $data_de->data[$i]->{'ป.3 หญิง'};
                    $p3r = $data_de->data[$i]->{'ป.3 ห้อง'};

                    $p4m = $data_de->data[$i]->{'ป.4 ชาย'};
                    $p4f = $data_de->data[$i]->{'ป.4 หญิง'};
                    $p4r = $data_de->data[$i]->{'ป.4 ห้อง'};

                    $p5m = $data_de->data[$i]->{'ป.5 ชาย'};
                    $p5f = $data_de->data[$i]->{'ป.5 หญิง'};
                    $p5r = $data_de->data[$i]->{'ป.5 ห้อง'};

                    $p6m = $data_de->data[$i]->{'ป.6 ชาย'};
                    $p6f = $data_de->data[$i]->{'ป.6 หญิง'};
                    $p6r = $data_de->data[$i]->{'ป.6 ห้อง'};

                    $m1m = $data_de->data[$i]->{'ม.1 ชาย'};
                    $m1f = $data_de->data[$i]->{'ม.1 หญิง'};
                    $m1r = $data_de->data[$i]->{'ม.1 ห้อง'};

                    $m2m = $data_de->data[$i]->{'ม.2 ชาย'};
                    $m2f = $data_de->data[$i]->{'ม.2 หญิง'};
                    $m2r = $data_de->data[$i]->{'ม.2 ห้อง'};

                    $m3m = $data_de->data[$i]->{'ม.3 ชาย'};
                    $m3f = $data_de->data[$i]->{'ม.3 หญิง'};
                    $m3r = $data_de->data[$i]->{'ม.3 ห้อง'};

                    $m4m = $data_de->data[$i]->{'ม.4 ชาย'};
                    $m4f = $data_de->data[$i]->{'ม.4 หญิง'};
                    $m4r = $data_de->data[$i]->{'ม.4 ห้อง'};

                    $m5m = $data_de->data[$i]->{'ม.5 ชาย'};
                    $m5f = $data_de->data[$i]->{'ม.5 หญิง'};
                    $m5r = $data_de->data[$i]->{'ม.5 ห้อง'};

                    $m6m = $data_de->data[$i]->{'ม.6 ชาย'};
                    $m6f = $data_de->data[$i]->{'ม.6 หญิง'};
                    $m6r = $data_de->data[$i]->{'ม.6 ห้อง'};

                    $v1m = $data_de->data[$i]->{'ปวช.1 ชาย'};
                    $v1f = $data_de->data[$i]->{'ปวช.1 หญิง'};
                    $v1r = $data_de->data[$i]->{'ปวช.1 ห้อง'};


                    $v2m = $data_de->data[$i]->{'ปวช.2 ชาย'};
                    $v2f = $data_de->data[$i]->{'ปวช.2 หญิง'};
                    $v2r = $data_de->data[$i]->{'ปวช.2 ห้อง'};

                    $v3m = $data_de->data[$i]->{'ปวช.3 ชาย'};
                    $v3f = $data_de->data[$i]->{'ปวช.3 หญิง'};
                    $v3r = $data_de->data[$i]->{'ปวช.3 ห้อง'};
                    $has = $database->has(
                        $tbl,
                        [
                            "school_id" => $school_id,
                            "education_year" => $year,
                            "education_section" => $y
                        ]
                    );
                    if ($has) {
                        $database->update(
                            $tbl,
                            [
                                "a1m" => $a1m,
                                "a1f" => $a1f,
                                "a1r" => $a1r,
                                "a2m" => $a2m,
                                "a2f" => $a2f,
                                "a2r" => $a2r,
                                "a3m" => $a3m,
                                "a3f" => $a3f,
                                "a3r" => $a3r,
                                "p1m" => $p1m,
                                "p1f" => $p1f,
                                "p1r" => $p1r,
                                "p2m" => $p2m,
                                "p2f" => $p2f,
                                "p2r" => $p2r,
                                "p3m" => $p3m,
                                "p3f" => $p3f,
                                "p3r" => $p3r,
                                "p4m" => $p4m,
                                "p4f" => $p4f,
                                "p4r" => $p4r,
                                "p5m" => $p5m,
                                "p5f" => $p5f,
                                "p5r" => $p5r,
                                "p6m" => $p6m,
                                "p6f" => $p6f,

                                "m1m" => $m1m,
                                "m1f" => $m1f,
                                "m1r" => $m1r,
                                "m2m" => $m2m,
                                "m2f" => $m2f,
                                "m2r" => $m2r,
                                "m3m" => $m3m,
                                "m3f" => $m3f,
                                "m3r" => $m3r,
                                "m4m" => $m4m,
                                "m4f" => $m4f,
                                "m4r" => $m4r,
                                "m5m" => $m5m,
                                "m5f" => $m5f,
                                "m5r" => $m5r,
                                "m6m" => $m6m,
                                "m6f" => $m6f,

                                "p6r" => $p6r,
                                "v1m" => $v1m,
                                "v1f" => $v1f,
                                "v1r" => $v1r,
                                "v2m" => $v2m,
                                "v2f" => $v2f,
                                "v2r" => $v2r,
                                "v3m" => $v3m,
                                "v3f" => $v3f,
                                "v3r" => $v3r
                            ],
                            [
                                "school_id" => $school_id,
                                "education_year" => $year,
                                "education_section" => $y
                            ]
                        );
                    } else {
                        $database->insert(
                            $tbl,
                            [
                                "school_id" => $school_id,
                                "education_year" => $year,
                                "education_section" => $y,
                                "area_code" => $areaCode,
                                "a1m" => $a1m,
                                "a1f" => $a1f,
                                "a1r" => $a1r,
                                "a2m" => $a2m,
                                "a2f" => $a2f,
                                "a2r" => $a2r,
                                "a3m" => $a3m,
                                "a3f" => $a3f,
                                "a3r" => $a3r,
                                "p1m" => $p1m,
                                "p1f" => $p1f,
                                "p1r" => $p1r,
                                "p2m" => $p2m,
                                "p2f" => $p2f,
                                "p2r" => $p2r,
                                "p3m" => $p3m,
                                "p3f" => $p3f,
                                "p3r" => $p3r,
                                "p4m" => $p4m,
                                "p4f" => $p4f,
                                "p4r" => $p4r,
                                "p5m" => $p5m,
                                "p5f" => $p5f,
                                "p5r" => $p5r,
                                "p6m" => $p6m,
                                "p6f" => $p6f,
                                "p6r" => $p6r,

                                "m1m" => $m1m,
                                "m1f" => $m1f,
                                "m1r" => $m1r,
                                "m2m" => $m2m,
                                "m2f" => $m2f,
                                "m2r" => $m2r,
                                "m3m" => $m3m,
                                "m3f" => $m3f,
                                "m3r" => $m3r,
                                "m4m" => $m4m,
                                "m4f" => $m4f,
                                "m4r" => $m4r,
                                "m5m" => $m5m,
                                "m5f" => $m5f,
                                "m5r" => $m5r,
                                "m6m" => $m6m,
                                "m6f" => $m6f,
                                "v1m" => $v1m,
                                "v1f" => $v1f,
                                "v1r" => $v1r,
                                "v2m" => $v2m,
                                "v2f" => $v2f,
                                "v2r" => $v2r,
                                "v3m" => $v3m,
                                "v3f" => $v3f,
                                "v3r" => $v3r
                            ]
                        );
                    }
                }
            } else {
                echo "ดึงไฟล์ข้อมูลไม่สำเร็จ<br>";
            }
        }
    }
}
