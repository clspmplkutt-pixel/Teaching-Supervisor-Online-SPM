<script src="<?php echo $path_include; ?>/app.js"></script>
<?php

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
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





function score_pass($score, $score_pass)
{
    if ($score >= 80) {
        return "<i class=\"fa-regular fa-square-check\"></i> ผ่าน <i class=\"fa-regular fa-square\"></i> ไม่ผ่าน";
    } else {
        return "<i class=\"fa-regular fa-square\"></i> ผ่าน <i class=\"fa-regular fa-square-check\"></i> ไม่ผ่าน";
    }
}
// เรียกข้อมูลแผนการสอน
$data_plan = $database->get($tbl, "*", ["planid" => $planid]);

//เรียกข้อมูลผู้ใช้งาน
$get_academic = $database->get("tbl_Users", "*", ["people_id" => $data_plan['people_id']]);

if ($get_academic['academic_id'] == '15' || $get_academic['academic_id'] == '99') {
    $score_pass = 65;
} elseif ($get_academic['academic_id'] == '16') {
    $score_pass = 70;
} elseif ($get_academic['academic_id'] == '17') {
    $score_pass = 75;
} elseif ($get_academic['academic_id'] == '18') {
    $score_pass = 80;
}

//เรียกข้อมูลการประเมินด้านที่ 1 และ 2 ของแผนการสอน
$data_policy_side1 = $database->select($tbl_policy, "*", ["academic" => $get_academic['academic_id'], "side" => "1", "ORDER" => ["auto_id" => "ASC"]]);
$data_policy_side2 = $database->select($tbl_policy, "*", ["academic" => $get_academic['academic_id'], "side" => "2", "ORDER" => ["auto_id" => "ASC"]]);
?>

<div class="row">
    <div class="col-sm-12 col-md-12 col-lg-12 col-xl-12">
        <div class="card card-success">
            <div class="card-header">
                <h3 class="card-title"><i class="fa-solid fa-list-check"></i> <?php echo $title_page; ?></h3>
            </div>
            <div class="card-body">
                <?php
                $count_committe = 0;
                // นับจำนวนกรรมการที่ได้ดำเนินการแต่งตั้ง
                for ($com = 1; $com <= 5; $com++) {
                    $committe = "committee" . $com;
                    if ($data_plan[$committe] != "" || $data_plan[$committe] != null) {
                        $count_committe++;
                    }
                }
                ?>
                <div class="table-responsive">
                    <table class="table table-bordered">
                        <thead>
                            <tr>
                                <th colspan="6">
                                    แบบสรุปผลการประเมินตำแหน่งและวิทยฐานะ ด้านที่ 1 และ ด้านที่ 2<br>
                                    ผู้ขอรับการประเมิน
                                    ชื่อ-สกุล : <?php echo $database->get("tbl_Users", "name", ["people_id" => $data_plan['people_id']]); ?> <?php echo $database->get("tbl_Users", "lastname", ["people_id" => $data_plan['people_id']]); ?>
                                    วิทยฐานะ : <strong><?php echo $arrayAcademic_Standing[$get_academic['academic_id']] ?></strong><br>
                                    สถานศึกษา : โรงเรียน<?php echo $database->get("tbl_school", "school_name", ["school_id" => $data_plan['school_code']]); ?>
                                    สังกัด : สำนักงานเขตพื้นที่การศึกษามัธยมศึกษาพิษณุโลก อุตรดิตถ์<br>

                                </th>
                            </tr>
                            <tr>
                                <td colspan="6">

                                    กลุ่มสาระการเรียนรู้/รายวิชาที่ขอรับการประเมิน : <?php echo $arrayTeach_Subject[$data_plan['teach_subject_id']]; ?> &nbsp;&nbsp;&nbsp;&nbsp;ระดับชั้น : <?php echo $arrayGradeLevel[$data_plan['grade_level_id']]; ?><br>
                                    ชื่อวิชา : <?php echo $data_plan['subject_name']; ?> (<?php echo $data_plan['subject_code']; ?>) &nbsp;&nbsp;&nbsp;&nbsp;ชื่อหน่วย : <?php echo $data_plan['subject_name']; ?> &nbsp;&nbsp;&nbsp;&nbsp; ชื่อแผนการสอน : <?php echo $data_plan['subject_content']; ?> &nbsp;&nbsp;&nbsp;&nbsp;
                                    ปีการศึกษา : <?php echo $data_plan['edu_year']; ?> &nbsp;&nbsp;&nbsp;&nbsp;ภาคเรียนที่ : <?php echo $data_plan['edu_term']; ?> &nbsp;&nbsp;&nbsp;&nbsp;วันที่ : <?php echo thai_date_full($data_plan['teach_date'], 1); ?> [เวลา <?php echo $data_plan['teach_timestart']; ?> - <?php echo $data_plan['teach_timeend']; ?> (<?php echo $data_plan['teach_minute']; ?> นาที)]<br>
                                    วิธีการสอน : <?php echo $data_plan['learning_model']; ?> &nbsp;&nbsp;&nbsp;&nbsp;
                                    <?php
                                    $competency = explode(",", $data_plan['competency']);
                                    $ability21 = explode(",", $data_plan['ability21']);
                                    $desirable = explode(",", $data_plan['desirable']);


                                    $competency = array_filter($competency);
                                    $ability21 = array_filter($ability21);
                                    $desirable = array_filter($desirable);
                                    // echo $competency;
                                    // $competency = implode(", ", $competency);
                                    $ability21 = implode(", ", $ability21);
                                    $desirable = implode(", ", $desirable);

                                    ?>
                                    สมรรถนะ : <?php
                                                $i = 1;
                                                if (count($competency) == 1) {
                                                    echo "<span class=\"text-success\">" . $database->get("tbl_system_Competency", "competency_name", ["competency_id" => $competency]) . "</span>";
                                                } else {
                                                    foreach ($competency as $co) {
                                                        echo "<span class=\"text-success\">" . $i . ". " . $database->get("tbl_system_Competency", "competency_name", ["competency_id" => $co]) . "</span><br>";
                                                        $i++;
                                                    }
                                                }

                                                ?> &nbsp;&nbsp;&nbsp;&nbsp; <br>
                                    ทักษะในศตวรรษที่ 21 : <?php echo $ability21; ?> &nbsp;&nbsp;&nbsp;&nbsp;
                                    คุณลักษณะอันพึงประสงค์ : : <?php echo $desirable; ?><br>


                                </td>
                            </tr>
                            <tr class="bg-success">
                                <td colspan="<?php echo 3 + $count_committe; ?>">
                                    <strong>
                                        <h5>ด้านที่ 1 ด้านทักษะการจัดการเรียนรู้และการจัดการชั้นเรียน</h5>
                                    </strong>
                                </td>
                            </tr>
                            <tr class="text-center">
                                <th rowspan="2">
                                    <h5><strong>ตัวชี้วัด</strong></h5>
                                </th>
                                <th colspan="<?php echo $count_committe; ?>">
                                    <h5><strong>คะแนน</strong></h5>
                                </th>
                                <th rowspan="2">
                                    <h5><strong>คะแนนเฉลี่ย</strong></h5>
                                </th>
                            </tr>
                            <tr>
                                <?php
                                for ($com = 1; $com <= $count_committe; $com++) {
                                    echo "<th class=\"text-center\">กรรมการคนที่ " . $com . "</th>";
                                }
                                ?>
                            </tr>
                        </thead>
                        <tbody>


                            <?php
                            $policy_side1 = [];
                            $policy_side2 = [];
                            for ($i = 0; $i < count($data_policy_side1); $i++) {
                            ?>
                                <tr>
                                    <td>
                                        <h5><?php echo $data_policy_side1[$i]['text']; ?></h5>
                                    </td>
                                    <?php for ($y = 1; $y <= $count_committe; $y++) { ?>
                                        <td class="text-center">
                                            <?php
                                            $score = $database->get($tbl_score, "score_weight", ["planid" => $planid, "policy_id" => $data_policy_side1[$i]['auto_id'], "supervision" => $data_plan["committee" . $y]]);
                                            // echo $score;
                                            if ($score == null) {
                                                $score = 0;
                                            } else {
                                                $score = $score;
                                            }
                                            echo number_format($score, 2);
                                            ?>
                                        </td>
                                    <?php } ?>
                                    <td class="text-center">
                                        <?php
                                        $score = $database->avg($tbl_score, "score_weight", ["planid" => $planid, "policy_id" => $data_policy_side1[$i]['auto_id']]);
                                        echo number_format($score, 2);
                                        $score_sum1 += $score;
                                        $policy_side1[] = $data_policy_side1[$i]['auto_id'];
                                        ?>
                                    </td>
                                </tr>
                            <?php } ?>
                            <tr>
                                <td class="text-center">
                                    <h5>รวม</h5>
                                </td>
                                <?php for ($y = 1; $y <= $count_committe; $y++) { ?>
                                    <td class="text-center">
                                        <?php
                                        $score = $database->sum($tbl_score, "score_weight", ["planid" => $planid, "supervision" => $data_plan["committee" . $y], "policy_id" => $policy_side1]);

                                        if ($score == null) {
                                            $score = 0;
                                        } else {
                                            $score = $score;
                                        }
                                        echo number_format($score, 2);
                                        ?>
                                    </td>
                                <?php } ?>
                                <td class="text-center">
                                    <h5><?php echo $score_sum1; ?></h5>
                                </td>
                            </tr>
                            <tr>
                                <td colspan="<?php echo 2 + $count_committe; ?>">
                                    ได้คะแนนร้อยละ <strong><?php echo $score_sum1; ?></strong> อยู่ในระดับ <strong><?php echo explan_score($score_sum1); ?></strong>
                                    ผลการพิจารณา <?php echo score_pass($score_sum1, $score_pass); ?> (ผ่านเกณฑ์ร้อยละ <?php echo $score_pass; ?>)
                                </td>
                            </tr>
                            <tr class="bg-success">
                                <td colspan="<?php echo 2 + $count_committe; ?>">
                                    <strong>
                                        <h5>ด้านที่ 2 ด้านผลลัพธ์การเรียนรู้ของผู้เรียน</h5>
                                    </strong>
                                </td>
                            </tr>

                            <tr class="text-center">
                                <th>
                                    <h5><strong>ตัวชี้วัด</strong></h5>
                                </th>
                                <?php
                                for ($com = 1; $com <= $count_committe; $com++) {
                                    echo "<th class=\"text-center\">กรรมการคนที่ " . $com . "</th>";
                                }
                                ?>
                                <th>
                                    <h5><strong>คะแนนเฉลี่ย</strong></h5>
                                </th>
                            </tr>
                            <?php for ($i = 0; $i < count($data_policy_side2); $i++) { ?>
                                <tr>
                                    <td>
                                        <h5><?php echo $data_policy_side1[$i]['text']; ?></h5>
                                    </td>

                                    <?php for ($y = 1; $y <= $count_committe; $y++) { ?>
                                        <td class="text-center">
                                            <?php
                                            $score = $database->get($tbl_score, "score_weight", ["planid" => $planid, "policy_id" => $data_policy_side2[$i]['auto_id'], "supervision" => $data_plan["committee" . $y]]);
                                            if ($score == null) {
                                                $score = 0;
                                            } else {
                                                $score = $score;
                                            }
                                            echo number_format($score, 2);
                                            ?>
                                        </td>
                                    <?php } ?>
                                    <td class="text-center">
                                        <?php
                                        $score = $database->avg($tbl_score, "score_weight", ["planid" => $planid, "policy_id" => $data_policy_side2[$i]['auto_id']]);
                                        if ($score == null) {
                                            $score = 0;
                                        } else {
                                            $score = $score;
                                        }
                                        $score_sum2 += $score;
                                        echo number_format($score, 2);
                                        $policy_side2[] = $data_policy_side2[$i]['auto_id'];
                                        ?>
                                    </td>
                                </tr>
                            <?php } ?>
                            <tr>
                                <td class="text-center">
                                    <h5>รวม</h5>
                                </td>
                                <?php for ($y = 1; $y <= $count_committe; $y++) { ?>
                                    <td class="text-center">
                                        <?php
                                        $score = $database->sum($tbl_score, "score_weight", ["planid" => $planid, "supervision" => $data_plan["committee" . $y], "policy_id" => $policy_side2]);
                                        if ($score == null) {
                                            $score = 0;
                                        } else {
                                            $score = $score;
                                        }
                                        echo number_format($score, 2);
                                        ?>
                                    </td>
                                <?php } ?>
                                <td class="text-center">
                                    <h5><?php echo number_format($score_sum2, 2); ?></h5>
                                </td>
                            </tr>
                            <tr>
                                <td colspan="<?php echo 2 + $count_committe; ?>">
                                    ได้คะแนนร้อยละ <strong><?php echo number_format($score_sum2, 2); ?></strong> อยู่ในระดับ <strong><?php echo explan_score($score_sum2); ?></strong>
                                    ผลการพิจารณา <?php echo score_pass($score_sum2, $score_pass); ?> (ผ่านเกณฑ์ร้อยละ <?php echo $score_pass; ?>)
                                </td>
                            </tr>
                        </tbody>

                    </table>
                </div>
            </div>
        </div>
    </div>