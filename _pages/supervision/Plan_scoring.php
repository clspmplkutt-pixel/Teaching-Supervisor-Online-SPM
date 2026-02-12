<script src="<?php echo $path_include; ?>/app.js"></script>
<?php
$title_page = "การประเมินแผนการสอน";
$tbl = "tbl_sendplan";
$tbl_policy = "tbl_policy_number";
$tbl_policy_side = "tbl_policy_side";
$tbl_score = "tbl_sendplan_score";


if (isset($_POST['action']) && $_POST['action'] == "Plan_scoring") {
    $planid = $_POST['planid'];
    // $database->delete($tbl_score, ["planid" => $planid]);
    $data_policy = $database->select($tbl_policy, "*", ["academic" => $academic, "ORDER" => ["auto_id" => "ASC"]]);
    // echo "<pre>";
    // print_r($data_policy);
    // echo "</pre>";
    foreach ($data_policy as $key => $value) {
        $score = 0;

        $database->insert($tbl_score, [
            "planid" => $planid,
            "policy_id" => $value['auto_id'],
            "score" => $_POST[$value['auto_id']],
            "score_weight" => $_POST[$value['auto_id']] * $value['weight'],
            "supervision" => $_POST['supervision'],
            "academic" => $_POST['academic'],
            "create_at" => date("Y-m-d H:i:s"),
        ]);
    }
    $committee = $_POST['committee'];
    $committee_num = substr($committee, -1);
    $database->update($tbl, ["date_scoring" . $committee_num => date("Y-m-d")], ["planid" => $planid]);
    // exit;
    echo "<script>window.location.href='?module=Plan_Check';</script>";
}
?>

<div class="row">
    <div class="col-sm-12 col-md-12 col-lg-12 col-xl-12">
        <div class="card card-success">
            <div class="card-header">
                <h3 class="card-title"><i class="fa-solid fa-list-check"></i> <?php echo $title_page; ?></h3>
            </div>
            <div class="card-body">
                <form id="form1" name="form1" method="post">

                    <?php
                    $data_plan = $database->get($tbl, "*", ["planid" => $planid]);
                    $get_academic = $database->get("tbl_Users", ["academic_id"], ["people_id" => $data_plan['people_id']]);
                    $data_policy_side1 = $database->select($tbl_policy, "*", ["academic" => $get_academic['academic_id'], "side" => "1", "ORDER" => ["auto_id" => "ASC"]]);
                    $data_policy_side2 = $database->select($tbl_policy, "*", ["academic" => $get_academic['academic_id'], "side" => "2", "ORDER" => ["auto_id" => "ASC"]]);

                    $data_score = $database->select($tbl_score, "*", ["planid" => $planid]);
                    ?>
                    <div class="table-responsive">
                        <table class="table table-bordered table-striped">
                            <thead>
                                <tr>
                                    <th>ข้อมูลการสอน</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr class="bg-success">
                                    <td>
                                        <strong>
                                            <h5>ด้านที่ 1 ด้านทักษะการจัดการเรียนรู้และการจัดการชั้นเรียน</h5>
                                        </strong>
                                    </td>
                                </tr>
                                <tr class="bg-danger">
                                    <td>
                                        เกณฑ์การให้คะแนนด้านที่ 1 (Scoring Rubric)<br>
                                        1 คะแนน เมื่อปรากฏชัดเจนว่าสามารถปฏิบัติตามข้อ 1 ถึง ข้อ 3 ได้ 1 ข้อ<br>
                                        2 คะแนน เมื่อปรากฏชัดเจนว่าสามารถปฏิบัติตามข้อ 1 ถึง ข้อ 3 ได้ 2 ข้อ<br>
                                        3 คะแนน เมื่อปรากฏชัดเจนว่าสามารถปฏิบัติตามข้อ 1 ถึง ข้อ 3 ได้ทั้ง 3 ข้อ<br>
                                        4 คะแนน เมื่อปรากฏชัดเจนว่าสามารถปฏิบัติตามข้อ 1 ถึง ข้อ 3 ได้ทั้ง 3 ข้อ และปรากฏชัดเจนว่าสามารถปฏิบัติตามข้อ 4 หรือ ข้อ 5 ได้ 1 ข้อ<br>
                                        5 คะแนน เมื่อปรากฏชัดเจนว่าสามารถปฏิบัติตามข้อ 1 ถึง ข้อ 3 ได้ทั้ง 3 ข้อ และปรากฏชัดเจนว่าสามารถปฏิบัติตามข้อ 4 และ ข้อ 5 ได้ทั้ง 2 ข้อ


                                    </td>
                                </tr>
                                <?php for ($i = 0; $i < count($data_policy_side1); $i++) { ?>
                                    <tr>
                                        <td>
                                            <div class="row">
                                                <div class="col-12">
                                                    <div class="row">
                                                        <div class="col-12">
                                                            <h5><?php echo $data_policy_side1[$i]['text']; ?></h5>
                                                        </div>
                                                    </div>
                                                    <div class="row">
                                                        <div class="col-12">
                                                            <strong>ตัวชี้วัด</strong><br>
                                                            <?php
                                                            $data_policy_item = $database->select(
                                                                "tbl_policy_items",
                                                                "*",
                                                                [
                                                                    "policy_id" => $data_policy_side1[$i]['auto_id'],
                                                                    "ORDER" => ["no_order" => "ASC"]
                                                                ]
                                                            );
                                                            foreach ($data_policy_item as $key => $value) {
                                                                echo $value['no_order'] . ". " . $value['text'] . "<br>\n";
                                                            }
                                                            for ($x = 1; $x <= 5; $x++) {
                                                                echo "<label class=\"radio-inline\"><input type=\"radio\" name=\"" . $data_policy_side1[$i]['auto_id'] . "\" value=\"$x\" required=\"required\"> $x คะแนน</label>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\n";
                                                            }
                                                            ?>

                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>

                                <?php } ?>

                                <tr class="bg-success">
                                    <td>
                                        <strong>
                                            <h5>ด้านที่ 2 ด้านผลลัพธ์การเรียนรู้ของผู้เรียน</h5>
                                        </strong>
                                    </td>
                                </tr>
                                <tr class="bg-danger">
                                    <td>
                                        เกณฑ์การให้คะแนนด้านที่ 2 (Scoring Rubric)<br>
                                        1 คะแนน เมื่อปฏิบัติได้หรือปรากฏผลชัดเจน 1 ข้อ จาก 5 ข้อ<br>
                                        2 คะแนน เมื่อปฏิบัติได้หรือปรากฏผลชัดเจน 2 ข้อ จาก 5 ข้อ<br>
                                        3 คะแนน เมื่อปฏิบัติได้หรือปรากฏผลชัดเจน 3 ข้อ จาก 5 ข้อ<br>
                                        4 คะแนน เมื่อปฏิบัติได้หรือปรากฏผลชัดเจน 4 ข้อ จาก 5 ข้อ<br>
                                        5 คะแนน เมื่อปฏิบัติได้หรือปรากฏผลชัดเจนทั้ง 5 ข้อ



                                    </td>
                                </tr>
                                <tr>
                                    <?php for ($i = 0; $i < count($data_policy_side2); $i++) { ?>
                                        <td>
                                            <div class="row">
                                                <div class="col-12">
                                                    <div class="row">
                                                        <div class="col-12">
                                                            <h5><?php echo $data_policy_side2[$i]['text']; ?></h5>
                                                        </div>
                                                    </div>
                                                    <div class="row">
                                                        <div class="col-12">
                                                            <strong>ตัวชี้วัด</strong><br>
                                                            <?php
                                                            $data_policy_item = $database->select("tbl_policy_items", "*", [
                                                                "policy_id" => $data_policy_side2[$i]['auto_id'],
                                                                "ORDER" => ["no_order" => "ASC"]
                                                            ]);
                                                            foreach ($data_policy_item as $key => $value) {
                                                                echo $value['no_order'] . ". " . $value['text'] . "<br>\n";
                                                            }
                                                            for ($x = 1; $x <= 5; $x++) {
                                                                echo "<label class=\"radio-inline\"><input type=\"radio\" name=\"" . $data_policy_side2[$i]['auto_id'] . "\" value=\"$x\" required=\"required\"> $x คะแนน</label>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\n";
                                                            }
                                                            ?>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                </tr>

                            <?php } ?>
                            </tbody>
                        </table>
                    </div>

                    <div class="row">
                        <div class="col-12 text-center">
                            <input type="hidden" name="planid" value="<?php echo $planid; ?>">
                            <input type="hidden" name="module" value="<?php echo $module; ?>">
                            <input type="hidden" name="academic" value="<?php echo $get_academic['academic_id']; ?>">
                            <input type="hidden" name="supervision" value="<?php echo $_SESSION['user']; ?>">
                            <input type="hidden" name="committee" value="<?php echo $committee; ?>">
                            <input type="hidden" name="action" value="Plan_scoring">
                            <button type="submit" class="btn btn-success btn-xl"> <i class="fa-regular fa-floppy-disk"></i> บันทึกคะแนน</button>
                            <a href="?module=Plan_Check" class="btn btn-danger btn-xl"><i class="fa-solid fa-xmark"></i> ยกเลิก</a>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    </div>