<script src="<?php echo $path_include; ?>/app.js"></script>
<?php
$title_page = "ดึงข้อมูลจาก DMC";
$tbl = "tbl_school_DMCdata";
$update_count = 0;
$insert_count = 0;

if ($operation == $module . "_save") {
    $year_short = substr($year_edu, 2);
    $dmc_round = $_POST['dmc_round'];

    $url = "https://portal.bopp-obec.info/obec" . $year_short . "/restpublicstat/download/area/" . $year_edu . "-" . $dmc_round . "-schoolmis-00650001.json";
    UR_exists($url);
    $data_sch = file_get_contents($url);
    $data_de = json_decode($data_sch);
    if (!DEBUG) {
        echo "<pre>";
        print_r($data_de);
        echo "</pre>";
        // exit;
    }
    if ($data_de->success) {
        $num_school = count($data_de->data);
        // echo $num_school;
        // exit;
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
            $sum_all_student = $data_de->data[$i]->{'รวมทั้งหมด'};
            $school_size = school_size($sum_all_student);
            $has = $database->has(
                $tbl,
                [
                    "school_code8" => $school_id,
                    "education_year" => $year_edu,
                    "education_section" => $dmc_round,
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
                        "v3r" => $v3r,
                    ],
                    [
                        "school_code8" => $school_id,
                        "education_year" => $year_edu,
                        "education_section" => $dmc_round,
                    ]
                );
                $update_count++;
            } else {
                $database->insert(
                    $tbl,
                    [
                        "school_code8" => $school_id,
                        "education_year" => $year_edu,
                        "education_section" => $dmc_round,
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
                        "v3r" => $v3r,
                    ]
                );

                
                $insert_count++;
            }
            $database->update("tbl_school",
                    [
                        "school_size" => $school_size,
                    ],
                    [
                        "school_code8" => $school_id,
                    ]
                );
        }
?>
        <script>
            alert("นำเข้าข้อมูลสำเร็จ\nข้อมูลนำเข้า <?php echo $num_school - 1; ?> โรงเรียน\nเพิ่มเข้า <?php echo $insert_count; ?> โรงเรียน\nUpdate <?php echo $update_count; ?> โรงเรียน");
            window.location.href = '/?module=importDMC';
        </script>
    <?php } else { ?>
        <script>
            alert("Error! ไม่สามารถดึงข้อมูลได้");
            window.location.href = '/?module=importDMC';
        </script>
<?php
        echo "ดึงไฟล์ข้อมูลไม่สำเร็จ<br>";
    }
}
if ($operation == $module . "_remove") {
    $data = $database->delete($tbl,[
        "education_year" => $edu_year,
        "education_section" => $edu_sec
    ]);
    if($data->rowCount()!=0){
        echo "<h3 class=\"text-success\">ลบข้อมูลปีการศึกษา $edu_year รอบที่ $edu_sec เรียบร้อย</h3>";
        location_to("/?module=importDMC",3);
    }else{
        echo "<h3 class=\"text-danger\">ไม่สามารถลบข้อมูลปีการศึกษา $edu_year รอบที่ $edu_sec ได้</h3>";
        location_to("/?module=importDMC",3);
    }
    exit;
}

?>


<div class="row">
    <div class="col-sm-12 col-md-12 col-lg-8 col-xl-8">
        <div class="card card-success">
            <div class="card-header">
                <h3 class="card-title"><i class="fa-solid fa-school-circle-check"></i> <?php echo $title_page; ?></h3>
            </div>
            <div class="card-body">
                <form action="?module=<?php echo $module; ?>" method="POST" onsubmit="return chk_khet_code();">
                    <div class="row">
                        <div class="mb-3 col-6">
                            <label for="year_edu">ปีการศึกษา:</label>
                            <input type="number" class="form-control form-select-lg" name="year_edu" id="year_edu" value="<?php echo EDUYEAR; ?>" autofocus required>

                        </div>
                        <div class="mb-3 col-6">
                            <?php
                            $sel1 = "";
                            $sel2 = "";
                            $sel3 = "";
                            if (EDUROUND == 1) {
                                $sel1 = " selected";
                            }
                            if (EDUROUND == 2) {
                                $sel2 = " selected";
                            }
                            if (EDUROUND == 3) {
                                $sel3 = " selected";
                            }

                            ?>
                            <label for="dmc_round">รอบการรายงาน:</label>
                            <select class="form-control form-select-lg" name="dmc_round" id="dmc_round" required>

                                <option value="">รอบการรายงาน</option>
                                <option value="1" <?php echo $sel1; ?>>10 มิถุนายน (รอบที่ 1)</option>
                                <option value="2" <?php echo $sel2; ?>>10 พฤศจิกายน (รอบที่ 2)</option>
                                <option value="3" <?php echo $sel3; ?>>30 เมษายน (รอบที่ 3)</option>

                            </select>
                        </div>
                    </div>
                    <div class="mb-3">
                        <input type="hidden" name="module" value="<?php echo $module; ?>">
                        <input type="hidden" name="operation" value="<?php echo $module; ?>_save">
                        <button type="submit" class="btn btn-primary mt-3">Import</button>
                        <a href="./" class="btn btn-danger mt-3">ยกเลิก</a>
                    </div>
                </form>
            </div>
        </div>
    </div>
</div>
<div class="row">
    <div class="col-sm-12 col-md-12 col-lg-8 col-xl-8">
        <div class="card card-success">
            <div class="card-header">
                <h3 class="card-title"><i class="fa-solid fa-school-circle-check"></i> ข้อมูลที่มีในระบบแล้ว</h3>
            </div>
            <div class="card-body">
                <div class="table-reponsive">
                    <table class="table table-bordered table-hover table-striped">
                        <?php
                        $i = 1;
                        $sql = "SELECT DISTINCT education_year FROM tbl_school_DMCdata ORDER BY education_year DESC";
                        $row_year = $database->query($sql)->fetchAll();
                        foreach ($row_year as $data_year) {
                            $sql_y = "SELECT DISTINCT education_section FROM tbl_school_DMCdata WHERE education_year = " . $data_year['education_year'] . " ORDER BY education_section DESC";
                            $row_section = $database->query($sql_y)->fetchAll();
                            foreach ($row_section as $data_section) {
                                echo "<tr>";
                                echo "<td class=\"text-center\">$i</td>";
                                echo "<td>";
                                echo "<div>ปีการศึกษา " . $data_year['education_year'] . " รอบที่ " . $data_section['education_section'] . "</div>";
                                echo "</td>";
                                echo "<td>";
                                echo "<a href=\"?module=importDMC&operation=" . $module . "_remove&edu_year=" . $data_year['education_year'] . "&edu_sec=" . $data_section['education_section'] . "\" class=\"btn btn-sm btn-danger\" onclick=\"return confirm_del(".$data_year['education_year'].",".$data_section['education_section'].");\"> <i class=\"fa-solid fa-trash-can\"></i> ลบข้อมูล</a>";
                                echo "</td>";
                                echo "</tr>";
                                $i++;
                            }
                        }
                        ?>
                    </table>
                </div>

            </div>
        </div>
    </div>
</div>
<script>
function confirm_del(edu_y,edu_t){
    return confirm("ต้องการลบข้อมูล ปีการศึกษา " + edu_y + " ภาคเรียน " + edu_t + " ใช่หรือไม่ ?");
}
</script>