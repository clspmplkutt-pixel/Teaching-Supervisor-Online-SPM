<script src="<?php echo $path_include; ?>/app.js"></script>
<?php
$title_page = "การประเมินแผนการสอน";
$tbl = "tbl_sendplan";
$tbl_policy = "tbl_policy_number";
$tbl_policy_side = "tbl_policy_side";
$tbl_score = "tbl_sendplan_score";
$score_sum1 = 0;
$score_sum2 = 0;


function explan_score($score)
{
    if ($score >= 90) {
        return "ดีเด่น";
    } elseif ($score >= 80) {
        return "ดีมาก";
    } elseif ($score >= 70) {
        return "ดี";
    } elseif ($score >= 60) {
        return "พอใช้";
    } else {
        return "ต้องปรับปรุง";
    }
}

function score_pass($score,$score_pass)
{
    if ($score >= $score_pass) {
        return "<i class=\"fa-regular fa-square-check\"></i> ผ่าน <i class=\"fa-regular fa-square\"></i> ไม่ผ่าน";
    } else {
        return "<i class=\"fa-regular fa-square\"></i> ผ่าน <i class=\"fa-regular fa-square-check\"></i> ไม่ผ่าน";
    }
}
?>

<div class="row">
    <div class="col-sm-12 col-md-12 col-lg-12 col-xl-12">
        <div class="card card-success">
            <div class="card-header">
                <h3 class="card-title"><i class="fa-solid fa-list-check"></i> <?php echo $title_page; ?></h3>
            </div>
            <div class="card-body">
                <?php
                $data_plan = $database->get($tbl, "*", ["planid" => $planid]);



                $get_academic = $database->get("tbl_Users", "*", ["people_id" => $data_plan['people_id']]);
                $data_policy_side1 = $database->select($tbl_policy, "*", ["academic" => $get_academic['academic_id'], "side" => "1", "ORDER" => ["auto_id" => "ASC"]]);
                $data_policy_side2 = $database->select($tbl_policy, "*", ["academic" => $get_academic['academic_id'], "side" => "2", "ORDER" => ["auto_id" => "ASC"]]);

                if ($get_academic['academic_id'] == '15' || $get_academic['academic_id'] == '99') {
                    $score_pass = 65;
                } elseif ($get_academic['academic_id'] == '16') {
                    $score_pass = 70;
                } elseif ($get_academic['academic_id'] == '17') {
                    $score_pass = 75;
                } elseif ($get_academic['academic_id'] == '18') {
                    $score_pass = 80;
                }

                $count_committe = 0;
                for ($com = 1; $com <= 5; $com++) {
                    if ($data_plan['committee' . $com] != "" || $data_plan['committee' . $com] != null) {
                        $data_scoring . $i = $database->select($tbl_score, "*", ["planid" => $planid, "supervision" => $data_plan['committee' . $com]]);
                        $count_committe++;
                        // print_r($data_scoring . $i);
                    }
                }

                if ($data_plan["committee1"] != "") {
                }
                if ($data_plan["committee2"] == $_SESSION['user']) {
                    $committee = "committee2";
                    $date_scoring = $data_plan["date_scoring2"];
                }
                if ($data_plan["committee3"] == $_SESSION['user']) {
                    $committee = "committee3";
                    $date_scoring = $data_plan["date_scoring3"];
                }
                if ($data_plan["committee4"] == $_SESSION['user']) {
                    $committee = "committee4";
                    $date_scoring = $data_plan["date_scoring4"];
                }
                if ($data_plan["committee5"] == $_SESSION['user']) {
                    $committee = "committee5";
                    $date_scoring = $data_plan["date_scoring5"];
                }

                // echo $committee;
                ?>
                <div class="table-responsive">
                    <table class="table table-bordered">
                        <thead>
                            <tr>
                                <th colspan="3">
                                    แบบสรุปผลการประเมินตำแหน่งและวิทยฐานะ ด้านที่ 1 และ ด้านที่ 2<br>
                                    ผู้ขอรับการประเมิน
                                    ชื่อ-สกุล : <?php echo $database->get("tbl_Users", "name", ["people_id" => $data_plan['people_id']]); ?> <?php echo $database->get("tbl_Users", "lastname", ["people_id" => $data_plan['people_id']]); ?>
                                    วิทยฐานะ : <strong><?php echo $arrayAcademic_Standing[$get_academic['academic_id']] ?></strong><br>
                                    สถานศึกษา : โรงเรียน<?php echo $database->get("tbl_school", "school_name", ["school_id" => $data_plan['school_code']]); ?>
                                    สังกัด : สำนักงานเขตพื้นที่การศึกษามัธยมศึกษาพิษณุโลก อุตรดิตถ์<br>
                                    กลุ่มสาระการเรียนรู้/รายวิชาที่ขอรับการประเมิน : <?php echo $arrayTeach_Subject[$data_plan['teach_subject_id']]; ?><br>


                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr class="bg-success">
                                <td colspan="3">
                                    <strong>
                                        <h5>ด้านที่ 1 ด้านทักษะการจัดการเรียนรู้และการจัดการชั้นเรียน</h5>
                                    </strong>
                                </td>
                            </tr>
                            <tr class="text-center">
                                <th>
                                    <h5><strong>ตัวชี้วัด</strong></h5>
                                </th>
                                <th>
                                    <h5><strong>คะแนน</strong></h5>
                                </th>
                                <th>
                                    <h5><strong>คะแนนถ่วงน้ำหนัก<br>(คะแนน x 2.5)</strong></h5>
                                </th>
                            </tr>
                            <?php for ($i = 0; $i < count($data_policy_side1); $i++) { ?>
                                <tr>
                                    <td>
                                        <h5><?php echo $data_policy_side1[$i]['text']; ?></h5>
                                    </td>
                                    <td class="text-center">
                                        <?php
                                        echo $database->get($tbl_score, "score", ["planid" => $planid, "policy_id" => $data_policy_side1[$i]['auto_id']]);
                                        ?>
                                    </td>
                                    <td class="text-center">
                                        <?php
                                        $score = $database->get($tbl_score, "score_weight", ["planid" => $planid, "policy_id" => $data_policy_side1[$i]['auto_id']]);
                                        $score_sum1 += $score;
                                        echo $score;
                                        ?>
                                    </td>
                                </tr>
                            <?php } ?>
                            <tr>
                                <td colspan="2" class="text-center">
                                    <h5>รวม</h5>
                                </td>
                                <td class="text-center">
                                    <h5><?php echo $score_sum1; ?></h5>
                                </td>
                            </tr>
                            <tr>
                                <td colspan="3">
                                    ได้คะแนนร้อยละ <strong><?php echo $score_sum1; ?></strong> อยู่ในระดับ <strong><?php echo explan_score($score_sum1); ?></strong>
                                    ผลการพิจารณา <?php echo score_pass($score_sum1,$score_pass); ?> (ผ่านเกณฑ์ร้อยละ <?php echo $score_pass; ?>)
                                </td>
                            </tr>
                            <tr class="bg-success">
                                <td colspan="3">
                                    <strong>
                                        <h5>ด้านที่ 2 ด้านผลลัพธ์การเรียนรู้ของผู้เรียน</h5>
                                    </strong>
                                </td>
                            </tr>

                            <tr class="text-center">
                                <th>
                                    <h5><strong>ตัวชี้วัด</strong></h5>
                                </th>
                                <th>
                                    <h5><strong>คะแนน</strong></h5>
                                </th>
                                <th>
                                    <h5><strong>คะแนนถ่วงน้ำหนัก<br>(คะแนน x 5)</strong></h5>
                                </th>
                            </tr>
                            <?php for ($i = 0; $i < count($data_policy_side2); $i++) { ?>
                                <tr>
                                    <td>
                                        <h5><?php echo $data_policy_side1[$i]['text']; ?></h5>
                                    </td>
                                    <td class="text-center">
                                        <?php
                                        echo $database->get($tbl_score, "score", ["planid" => $planid, "policy_id" => $data_policy_side2[$i]['auto_id']]);
                                        ?>
                                    </td>
                                    <td class="text-center">
                                        <?php
                                        $score = $database->get($tbl_score, "score_weight", ["planid" => $planid, "policy_id" => $data_policy_side2[$i]['auto_id']]);
                                        $score_sum2 += $score;
                                        echo $score;
                                        ?>
                                    </td>
                                </tr>
                            <?php } ?>
                            <tr>
                                <td colspan="2" class="text-center">
                                    <h5>รวม</h5>
                                </td>
                                <td class="text-center">
                                    <h5><?php echo $score_sum2; ?></h5>
                                </td>
                            </tr>
                            <tr>
                                <td colspan="3">
                                    ได้คะแนนร้อยละ <strong><?php echo $score_sum2; ?></strong> อยู่ในระดับ <strong><?php echo explan_score($score_sum2); ?></strong>
                                    ผลการพิจารณา <?php echo score_pass($score_sum2,$score_pass); ?> (ผ่านเกณฑ์ร้อยละ <?php echo $score_pass; ?>)
                                </td>
                            </tr>
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colspan="3" class="text-center pt-5">
                                    <h5>(ลงชื่อ).................................................................. กรรมการผู้ประเมิน</h5>
                                    <h5><?php echo $_SESSION['name']; ?></h5>
                                    <h5>วันที่ <?php echo thai_date_full($date_scoring);  ?></h5>
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    </div>